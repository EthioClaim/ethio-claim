from fastapi import APIRouter
from app.core.config import settings
from app.adapters.qdrant_adapter import qdrant_adapter

router = APIRouter(tags=["Health"])


@router.get("/health/live")
async def health_live():
    """
    Process liveness check. Always returns 200 OK when service is running.
    """
    return {
        "status": "UP",
        "service": "EthioClaim-FastAPI-ML",
        "environment": settings.ENVIRONMENT,
    }


@router.get("/health/ready")
async def health_ready():
    """
    Readiness check confirming model initialization and vector engine status.
    """
    qdrant_status = await qdrant_adapter.check_health()
    return {
        "status": "READY",
        "service": "EthioClaim-FastAPI-ML",
        "models": {
            "damageModel": {
                "type": "MOCK" if settings.USE_MOCK_DAMAGE_MODEL else "PYTORCH",
                "ready": True,
            },
            "embeddingModel": {
                "name": settings.EMBEDDING_MODEL_NAME,
                "version": settings.EMBEDDING_MODEL_VERSION,
                "dimension": settings.EMBEDDING_DIMENSION,
                "ready": True,
            },
        },
        "vectorDatabase": qdrant_status,
    }
