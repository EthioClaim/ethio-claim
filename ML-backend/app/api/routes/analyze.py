from fastapi import APIRouter, Depends, status
from app.core.security import verify_internal_token
from app.schemas.analysis import AnalysisRequest, AnalysisResponse
from app.services.analysis_service import analysis_service

router = APIRouter(prefix="/internal/v1", tags=["Analysis"])


@router.post(
    "/analyze",
    response_model=AnalysisResponse,
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(verify_internal_token)],
    summary="Primary MVP Damage Analysis & Fraud Risk Screening Endpoint",
)
async def analyze_evidence(request: AnalysisRequest) -> AnalysisResponse:
    """
    Executes damage detection inference, embedding upsert into Qdrant,
    historical visual similarity retrieval, and fraud screening risk assessment.
    """
    return await analysis_service.process_analysis(request)
