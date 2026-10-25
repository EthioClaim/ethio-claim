from fastapi import APIRouter, Depends, status
from app.core.security import verify_internal_token
from app.schemas.ocr import OcrExtractRequest, OcrExtractResponse
from app.services.image_loader import image_loader_service
from app.services.ocr_service import ocr_service

router = APIRouter(prefix="/internal/v1", tags=["OCR"])


@router.post(
    "/ocr/extract",
    response_model=OcrExtractResponse,
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(verify_internal_token)],
    summary="Extract text and entity fields from vehicle document or plate photo",
)
async def extract_ocr(request: OcrExtractRequest) -> OcrExtractResponse:
    img, _ = await image_loader_service.load_image(
        image_ref=request.imageRef,
        image_url=request.imageUrl,
        image_base64=request.imageBase64,
        fallback_seed=request.imageRef or "ocr-sample",
    )
    return ocr_service.extract_document(
        image=img,
        document_type=request.documentType or "AUTO",
        seed=request.imageRef or "ocr-sample",
    )
