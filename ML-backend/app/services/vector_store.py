import uuid
from datetime import datetime
from typing import List, Optional, Dict, Any
from app.adapters.qdrant_adapter import qdrant_adapter
from app.core.config import settings
from app.schemas.analysis import VisualMatch, EmbeddingResult


def to_valid_uuid(id_str: str) -> str:
    """
    Ensures the ID is a valid RFC-4122 UUID format required by Qdrant.
    If already a valid UUID string, returns as-is; otherwise derives deterministically.
    """
    try:
        uuid_obj = uuid.UUID(id_str)
        return str(uuid_obj)
    except Exception:
        return str(uuid.uuid5(uuid.NAMESPACE_DNS, id_str))


class VectorStoreService:
    def __init__(self):
        self.adapter = qdrant_adapter

    async def store_embedding(
        self,
        evidence_id: str,
        claim_id: str,
        vector: List[float],
        tenant_id: str = "default",
        sha256: Optional[str] = None,
        phash: Optional[str] = None,
    ) -> EmbeddingResult:
        """
        Stores the vision vector into the vector database under a stable point ID.
        """
        point_id = to_valid_uuid(evidence_id)
        payload = {
            "evidence_id": evidence_id,
            "claim_id": claim_id,
            "tenant_id": tenant_id,
            "embedding_model": settings.EMBEDDING_MODEL_NAME,
            "model_version": settings.EMBEDDING_MODEL_VERSION,
            "created_at": datetime.utcnow().isoformat() + "Z",
            "sha256": sha256,
            "phash": phash,
        }

        stored = await self.adapter.upsert(point_id, vector, payload)
        return EmbeddingResult(
            stored=stored,
            pointId=point_id,
            model=settings.EMBEDDING_MODEL_NAME,
            version=settings.EMBEDDING_MODEL_VERSION,
            dimension=len(vector),
        )

    async def search_similar(
        self,
        query_vector: List[float],
        tenant_id: str = "default",
        exclude_evidence_id: Optional[str] = None,
        top_k: int = 5,
        min_similarity: float = 0.0,
    ) -> List[VisualMatch]:
        """
        Searches visually similar historical evidence in vector store.
        """
        hits = await self.adapter.search(
            query_vector=query_vector,
            top_k=top_k,
            tenant_id=tenant_id,
            exclude_evidence_id=exclude_evidence_id,
            min_similarity=min_similarity,
        )

        matches: List[VisualMatch] = []
        for hit in hits:
            payload = hit.get("payload", {})
            ev_id = payload.get("evidence_id")
            if not ev_id:
                continue

            matches.append(
                VisualMatch(
                    evidenceId=ev_id,
                    claimId=payload.get("claim_id"),
                    similarity=round(hit.get("similarity", 0.0), 4),
                )
            )

        return matches


vector_store_service = VectorStoreService()
