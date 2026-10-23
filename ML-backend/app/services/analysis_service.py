import logging
from datetime import datetime
from typing import List, Optional
from app.core.config import settings
from app.schemas.analysis import (
    AnalysisRequest,
    AnalysisResponse,
    DamageDetection,
    EmbeddingResult,
    VisualMatch,
    OcrResult,
    RiskAssessment,
)
from app.services.image_loader import image_loader_service
from app.services.damage_detector import damage_detector_service
from app.services.embedding_service import embedding_service
from app.services.vector_store import vector_store_service
from app.services.risk_assessor import risk_assessor_service
from app.services.ocr_service import ocr_service

logger = logging.getLogger("analysis_service")


class AnalysisService:
    async def process_analysis(self, request: AnalysisRequest) -> AnalysisResponse:
        logger.info(f"Starting analysis {request.analysisId} for evidence {request.evidenceId} (claim {request.claimId})")

        warnings = ["Similarity is a review signal, not proof of fraud"]
        damage_detections: List[DamageDetection] = []
        visual_matches: List[VisualMatch] = []
        ocr_result: Optional[OcrResult] = None
        embedding_res = EmbeddingResult(
            stored=False,
            pointId=None,
            model=settings.EMBEDDING_MODEL_NAME,
            version=settings.EMBEDDING_MODEL_VERSION,
        )

        try:
            # 1. Load and validate image
            img, img_meta = await image_loader_service.load_image(
                image_ref=request.imageRef,
                image_url=request.imageUrl,
                image_base64=request.imageBase64,
                fallback_seed=request.evidenceId,
            )

            # 2. Damage Detection
            if not request.options or request.options.damageDetection:
                damage_detections = await damage_detector_service.detect(
                    image=img,
                    seed_key=request.evidenceId,
                )

            # 3. Embedding Generation & Vector Search
            if not request.options or request.options.embeddingSimilarity:
                vector = embedding_service.generate_embedding(
                    image=img,
                    sha256=request.sha256,
                    phash=request.phash,
                )

                # Upsert into vector store
                embedding_res = await vector_store_service.store_embedding(
                    evidence_id=request.evidenceId,
                    claim_id=request.claimId,
                    vector=vector,
                    tenant_id=request.tenantId or "default",
                    sha256=request.sha256,
                    phash=request.phash,
                )

                # Search top-K similar historical vectors
                top_k = request.options.topK if request.options else settings.TOP_K_DEFAULT
                visual_matches = await vector_store_service.search_similar(
                    query_vector=vector,
                    tenant_id=request.tenantId or "default",
                    exclude_evidence_id=request.evidenceId,
                    top_k=top_k,
                )

            # 4. OCR Extraction (optional)
            if request.options and request.options.ocrExtraction:
                ocr_result = ocr_service.extract_for_analysis(img, seed=request.evidenceId)

            # 5. Risk Assessment (Section 6 & 8)
            risk_assessment = risk_assessor_service.evaluate_risk(
                claim_id=request.claimId,
                evidence_id=request.evidenceId,
                hash_matches=request.hashMatches,
                visual_matches=visual_matches,
                is_corrupt_or_failed=False,
            )

            return AnalysisResponse(
                analysisId=request.analysisId,
                evidenceId=request.evidenceId,
                claimId=request.claimId,
                status="COMPLETED",
                damageDetections=damage_detections,
                embedding=embedding_res,
                visualMatches=visual_matches,
                riskAssessment=risk_assessment,
                ocrResult=ocr_result,
                warnings=warnings,
                createdAt=datetime.utcnow().isoformat() + "Z",
            )

        except Exception as e:
            logger.error(f"Analysis failed for {request.analysisId}: {str(e)}", exc_info=True)
            fallback_risk = risk_assessor_service.evaluate_risk(
                claim_id=request.claimId,
                evidence_id=request.evidenceId,
                is_corrupt_or_failed=True,
            )
            return AnalysisResponse(
                analysisId=request.analysisId,
                evidenceId=request.evidenceId,
                claimId=request.claimId,
                status="FAILED",
                damageDetections=[],
                embedding=embedding_res,
                visualMatches=[],
                riskAssessment=fallback_risk,
                warnings=warnings,
                createdAt=datetime.utcnow().isoformat() + "Z",
                errorCode="PROCESSING_ERROR",
                errorMessage=str(e),
            )


analysis_service = AnalysisService()
