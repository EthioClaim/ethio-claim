import os
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    ENVIRONMENT: str = "development"
    INTERNAL_SERVICE_TOKEN: str = "ethio_claim_internal_secret_key_2026"
    PORT: int = 8000
    HOST: str = "0.0.0.0"

    # Qdrant Vector DB
    QDRANT_URL: str = "http://localhost:6333"
    QDRANT_STORAGE_PATH: str = "./qdrant_storage"
    QDRANT_API_KEY: str = ""
    QDRANT_COLLECTION: str = "ethio_claim_evidence_v1"

    # Vision Embedding Model
    EMBEDDING_MODEL_NAME: str = "ethio-vision-encoder"
    EMBEDDING_MODEL_VERSION: str = "v1"
    EMBEDDING_DIMENSION: int = 128
    USE_MOCK_EMBEDDING_MODEL: bool = True

    # Damage Detection Model
    DAMAGE_MODEL_PATH: str = "/models/damage-model.pt"
    USE_MOCK_DAMAGE_MODEL: bool = True

    # Image Processing Limits
    MAX_IMAGE_BYTES: int = 10 * 1024 * 1024  # 10 MB
    MAX_IMAGE_DIMENSION: int = 6000
    ANALYSIS_TIMEOUT_SECONDS: int = 30
    TOP_K_DEFAULT: int = 5

    # Thresholds for Screening & Risk Flags
    EXACT_HASH_SIMILARITY_THRESHOLD: float = 1.0
    PERCEPTUAL_HASH_DISTANCE_THRESHOLD: int = 8
    VECTOR_SIMILARITY_FRAUD_THRESHOLD: float = 0.88
    VECTOR_SIMILARITY_SUSPICIOUS_THRESHOLD: float = 0.78
    RULE_VERSION: str = "rules-v1"

    # Local fallback storage dir (for resolving NestJS local uploads)
    LOCAL_UPLOADS_DIR: str = "../ethioclaim-backend/uploads"

    model_config = SettingsConfigDict(
        env_file=str(Path(__file__).resolve().parent.parent.parent / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()
