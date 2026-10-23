import asyncio
import json
import logging
from pathlib import Path
from typing import Dict, Any, List, Optional
import httpx
from app.core.config import settings

logger = logging.getLogger("qdrant_adapter")


class QdrantAdapter:
    """
    Adapter communicating with Qdrant Vector Engine via REST API,
    with automatic resilient Embedded Local Disk Storage fallback
    when Qdrant server is unavailable.
    """

    def __init__(self):
        self.storage_path = settings.QDRANT_STORAGE_PATH
        self.base_url = settings.QDRANT_URL.rstrip("/")
        self.api_key = settings.QDRANT_API_KEY
        self.collection_name = settings.QDRANT_COLLECTION
        self.dimension = settings.EMBEDDING_DIMENSION

        # Resolve embedded local disk storage directory and file path
        raw_path = Path(self.storage_path)
        if raw_path.is_absolute():
            self.storage_dir = raw_path
        else:
            # Resolve relative to ML-backend root (parent of app)
            project_root = Path(__file__).resolve().parent.parent.parent
            self.storage_dir = (project_root / raw_path).resolve()

        self.storage_file = self.storage_dir / f"{self.collection_name}.json"
        self._lock = asyncio.Lock()

        # In-memory points cache loaded from / synced to embedded local disk storage
        self._memory_points: Dict[str, Dict[str, Any]] = {}
        self._is_qdrant_healthy = False
        self._warned_fallback = False

        # Load persisted points from local disk on initialization
        self._load_from_disk()

    def _get_headers(self) -> Dict[str, str]:
        headers = {"Content-Type": "application/json"}
        if self.api_key:
            headers["api-key"] = self.api_key
        return headers

    def _load_from_disk(self):
        """
        Loads persisted vector points from embedded local disk storage.
        """
        try:
            self.storage_dir.mkdir(parents=True, exist_ok=True)
            if self.storage_file.exists():
                with open(self.storage_file, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    points = data.get("points", {})
                    if isinstance(points, dict):
                        self._memory_points = points
                        logger.info(
                            f"Loaded {len(self._memory_points)} vector points from embedded local disk storage at {self.storage_file}"
                        )
        except Exception as e:
            logger.warning(
                f"Could not load embedded disk storage file {self.storage_file} ({str(e)}). Starting with empty store."
            )

    def _save_to_disk(self):
        """
        Safely and atomically writes vector points to embedded local disk storage.
        """
        try:
            self.storage_dir.mkdir(parents=True, exist_ok=True)
            temp_file = self.storage_file.with_suffix(".tmp")
            payload = {
                "collection": self.collection_name,
                "dimension": self.dimension,
                "pointsCount": len(self._memory_points),
                "points": self._memory_points,
            }
            with open(temp_file, "w", encoding="utf-8") as f:
                json.dump(payload, f, indent=2)
            temp_file.replace(self.storage_file)
        except Exception as e:
            logger.error(f"Failed to persist to embedded local disk storage ({str(e)})")

    async def check_health(self) -> Dict[str, Any]:
        """
        Pings remote Qdrant to check readiness, falling back to embedded local disk storage.
        """
        try:
            async with httpx.AsyncClient(timeout=3.0) as client:
                res = await client.get(f"{self.base_url}/healthz", headers=self._get_headers())
                if res.status_code == 200:
                    self._is_qdrant_healthy = True
                    return {
                        "connected": True,
                        "mode": "qdrant_server",
                        "url": self.base_url,
                        "storagePath": str(self.storage_file),
                        "indexedPoints": len(self._memory_points),
                    }
        except Exception:
            self._is_qdrant_healthy = False

        return {
            "connected": False,
            "mode": "embedded_disk_storage",
            "storagePath": str(self.storage_file),
            "indexedPoints": len(self._memory_points),
        }

    async def ensure_collection(self) -> bool:
        """
        Ensures the target collection exists on remote Qdrant or local disk storage.
        """
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                res = await client.get(
                    f"{self.base_url}/collections/{self.collection_name}",
                    headers=self._get_headers(),
                )
                if res.status_code == 200:
                    self._is_qdrant_healthy = True
                    return True

                # Create collection if not found
                create_payload = {
                    "vectors": {
                        "size": self.dimension,
                        "distance": "Cosine",
                    }
                }
                res = await client.put(
                    f"{self.base_url}/collections/{self.collection_name}",
                    headers=self._get_headers(),
                    json=create_payload,
                )
                if res.status_code in (200, 201):
                    self._is_qdrant_healthy = True
                    logger.info(f"Created Qdrant collection: {self.collection_name}")
                    return True
        except Exception as e:
            if not self._warned_fallback:
                logger.warning(
                    f"Could not reach Qdrant server ({str(e)}). Using embedded local disk storage at {self.storage_file}."
                )
                self._warned_fallback = True
            self._is_qdrant_healthy = False
            # Ensure local disk storage is initialized
            self.storage_dir.mkdir(parents=True, exist_ok=True)
            if not self.storage_file.exists():
                self._save_to_disk()
            return True

        return False

    async def upsert(
        self,
        point_id: str,
        vector: List[float],
        payload: Dict[str, Any],
    ) -> bool:
        """
        Upserts a vector point with its metadata payload.
        Ensures durability by persisting to embedded local disk storage,
        and synchronizes to remote Qdrant when reachable.
        """
        # Always store and persist to embedded local disk storage for resilience
        async with self._lock:
            self._memory_points[point_id] = {
                "id": point_id,
                "vector": vector,
                "payload": payload,
            }
            self._save_to_disk()

        # Attempt to upsert to real Qdrant
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                await self.ensure_collection()
                body = {
                    "points": [
                        {
                            "id": point_id,
                            "vector": vector,
                            "payload": payload,
                        }
                    ]
                }
                res = await client.put(
                    f"{self.base_url}/collections/{self.collection_name}/points?wait=true",
                    headers=self._get_headers(),
                    json=body,
                )
                if res.status_code == 200:
                    self._is_qdrant_healthy = True
                    return True
        except Exception as e:
            logger.warning(
                f"Remote Qdrant unreachable ({str(e)}). Safely persisted point {point_id} to embedded local disk storage."
            )
            self._is_qdrant_healthy = False

        return True

    async def search(
        self,
        query_vector: List[float],
        top_k: int = 5,
        tenant_id: Optional[str] = "default",
        exclude_evidence_id: Optional[str] = None,
        min_similarity: float = 0.0,
    ) -> List[Dict[str, Any]]:
        """
        Searches nearest neighbors, filtering by tenant and excluding target evidence.
        Uses remote Qdrant when healthy, otherwise searches embedded local disk storage.
        """
        # Try remote Qdrant first if healthy
        if self._is_qdrant_healthy:
            try:
                must_filters: List[Dict[str, Any]] = []
                must_not_filters: List[Dict[str, Any]] = []

                if tenant_id:
                    must_filters.append({"key": "tenant_id", "match": {"value": tenant_id}})
                if exclude_evidence_id:
                    must_not_filters.append({"key": "evidence_id", "match": {"value": exclude_evidence_id}})

                search_filter: Dict[str, Any] = {}
                if must_filters:
                    search_filter["must"] = must_filters
                if must_not_filters:
                    search_filter["must_not"] = must_not_filters

                body = {
                    "vector": query_vector,
                    "limit": top_k,
                    "with_payload": True,
                    "score_threshold": min_similarity if min_similarity > 0 else None,
                }
                if search_filter:
                    body["filter"] = search_filter

                async with httpx.AsyncClient(timeout=5.0) as client:
                    res = await client.post(
                        f"{self.base_url}/collections/{self.collection_name}/points/search",
                        headers=self._get_headers(),
                        json=body,
                    )
                    if res.status_code == 200:
                        data = res.json().get("result", [])
                        results = []
                        for hit in data:
                            results.append(
                                {
                                    "pointId": hit.get("id"),
                                    "similarity": max(0.0, min(1.0, float(hit.get("score", 0.0)))),
                                    "payload": hit.get("payload", {}),
                                }
                            )
                        return results
            except Exception as e:
                logger.warning(
                    f"Remote Qdrant search failed ({str(e)}), falling back to embedded local disk storage."
                )
                self._is_qdrant_healthy = False

        # Embedded local disk storage search fallback
        results = []
        for pid, pt in self._memory_points.items():
            payload = pt["payload"]
            # Tenant filter
            if tenant_id and payload.get("tenant_id") != tenant_id:
                continue
            # Exclude evidence filter
            if exclude_evidence_id and payload.get("evidence_id") == exclude_evidence_id:
                continue

            sim = self._cosine_sim(query_vector, pt["vector"])
            if sim >= min_similarity:
                results.append(
                    {
                        "pointId": pid,
                        "similarity": sim,
                        "payload": payload,
                    }
                )

        # Sort descending by similarity
        results.sort(key=lambda x: x["similarity"], reverse=True)
        return results[:top_k]

    def _cosine_sim(self, v1: List[float], v2: List[float]) -> float:
        if len(v1) != len(v2):
            return 0.0
        dot = sum(a * b for a, b in zip(v1, v2))
        return max(0.0, min(1.0, float(dot)))

    async def clear_all(self):
        """Used in test fixtures and cleanups"""
        async with self._lock:
            self._memory_points.clear()
            self._save_to_disk()


qdrant_adapter = QdrantAdapter()
