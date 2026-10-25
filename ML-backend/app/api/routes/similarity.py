from fastapi import APIRouter, Depends, status
from app.core.security import verify_internal_token
from app.schemas.similarity import (
    SimilaritySearchRequest,
    SimilaritySearchResponse,
    SimilaritySearchItem,
    ReindexRequest,
    ReindexResponse,
)
from app.adapters.qdrant_adapter import qdrant_adapter
from app.core.config import settings

router = APIRouter(prefix="/internal/v1", tags=["Similarity"])


@router.post(
    "/similarity/search",
    response_model=SimilaritySearchResponse,
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(verify_internal_token)],
    summary="Vector similarity search across historical evidence",
)
async def search_similarity(request: SimilaritySearchRequest) -> SimilaritySearchResponse:
    if not request.vector:
        # If no vector provided, return empty
        return SimilaritySearchResponse(totalMatches=0, matches=[])

    hits = await qdrant_adapter.search(
        query_vector=request.vector,
        top_k=request.topK,
        tenant_id=request.tenantId,
        exclude_evidence_id=request.evidenceId,
        min_similarity=request.minSimilarity,
    )

    matches = []
    for hit in hits:
        payload = hit.get("payload", {})
        # If claimId is specified, optionally filter out same claim
        if request.claimId and payload.get("claim_id") == request.claimId:
            continue

        matches.append(
            SimilaritySearchItem(
                evidenceId=payload.get("evidence_id", ""),
                claimId=payload.get("claim_id"),
                similarity=round(hit.get("similarity", 0.0), 4),
                score=hit.get("similarity"),
            )
        )

    return SimilaritySearchResponse(
        totalMatches=len(matches),
        matches=matches,
    )


@router.post(
    "/embeddings/reindex",
    response_model=ReindexResponse,
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(verify_internal_token)],
    summary="Reindex or recreate vector collection",
)
async def reindex_collection(request: ReindexRequest) -> ReindexResponse:
    if request.forceRecreateCollection:
        await qdrant_adapter.clear_all()
        await qdrant_adapter.ensure_collection()

    return ReindexResponse(
        status="SUCCESS",
        totalIndexed=len(qdrant_adapter._memory_points),
        collectionName=settings.QDRANT_COLLECTION,
        message="Vector collection reindexed successfully",
    )
