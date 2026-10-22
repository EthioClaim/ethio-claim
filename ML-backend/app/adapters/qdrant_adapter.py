import logging
import math
import uuid
from typing import Dict, Any, List, Optional
import httpx
from app.core.config import settings

logger = logging.getLogger("qdrant_adapter")


class QdrantAdapter:
    """
    Adapter communicating with Qdrant Vector Engine via REST API,
    with automatic resilient in-memory fallback when Qdrant is unavailable.
    """

    def __init__(self):
        self.base_url = settings.QDRANT_URL.rstrip("/")
        self.api_key = settings.QDRANT_API_KEY
        self.collection_name = settings.QDRANT_COLLECTION
        self.dimension = settings.EMBEDDING_DIMENSION
        # In-memory store fallback: point_id -> {"vector": [...], "payload": {...}}
        self._memory_points: Dict[str, Dict[str, Any]] = {}
        self._is_qdrant_healthy = False

    def _get_headers(self) -> Dict[str, str]:
        headers = {"Content-Type": "application/json"}
        if self.api_key:
            headers["api-key"] = self.api_key
        return headers

    async def check_health(self) -> Dict[str, Any]:
        """
        Pings Qdrant to check readiness.
        """
        try:
            async with httpx.AsyncClient(timeout=3.0) as client:
                res = await client.get(f"{self.base_url}/healthz", headers=self._get_headers())
                if res.status_code == 200:
                    self._is_qdrant_healthy = True
                    return {"connected": True, "mode": "qdrant_server", "url": self.base_url}
        except Exception:
            self._is_qdrant_healthy = False

        return {
            "connected": False,
            "mode": "in_memory_fallback",
            "indexedPoints": len(self._memory_points),
        }

    async def ensure_collection(self) -> bool:
        """
        Ensures the target collection exists with Cosine distance.
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
            logger.warning(f"Could not reach Qdrant server ({str(e)}). Using in-memory vector store.")
            self._is_qdrant_healthy = False

        return False

    async def upsert(
        self,
        point_id: str,
        vector: List[float],
        payload: Dict[str, Any],
    ) -> bool:
        """
        Upserts a vector point with its metadata payload.
        Ensures idempotency by writing to point_id.
        """
        # Always store in memory for resilience
        self._memory_points[point_id] = {
            "id": point_id,
            "vector": vector,
            "payload": payload,
        }

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
            logger.warning(f"Failed upsert to remote Qdrant ({str(e)}), persisted to memory fallback.")
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
        Searches nearest neighbors, filtering by tenant and excluding the target evidence.
        """
        # Try remote Qdrant first
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
                logger.warning(f"Remote Qdrant search failed ({str(e)}), falling back to memory.")

        # In-memory search fallback
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
        """Used in test fixtures"""
        self._memory_points.clear()


qdrant_adapter = QdrantAdapter()
