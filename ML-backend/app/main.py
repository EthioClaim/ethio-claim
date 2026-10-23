import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.adapters.qdrant_adapter import qdrant_adapter
from app.api.routes import health, analyze, similarity, ocr

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("ethio_ml_service")


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initializing EthioClaim AI Service...")
    logger.info(f"Environment: {settings.ENVIRONMENT}")
    logger.info(f"Embedding Model: {settings.EMBEDDING_MODEL_NAME} ({settings.EMBEDDING_MODEL_VERSION})")
    # Initialize Qdrant collection or in-memory fallback
    await qdrant_adapter.ensure_collection()
    yield
    logger.info("Shutting down EthioClaim AI Service...")


app = FastAPI(
    title="EthioClaim AI & Vector Search Service",
    description="Internal FastAPI AI service for damage detection, vision embeddings, Qdrant vector similarity, and rules-based fraud screening.",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS Middleware (restricted to localhost and internal clients)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register Route Handlers
app.include_router(health.router)
app.include_router(analyze.router)
app.include_router(similarity.router)
app.include_router(ocr.router)


@app.get("/")
async def root():
    return {
        "service": "EthioClaim FastAPI AI Service",
        "version": "1.0.0",
        "status": "ONLINE",
        "docs": "/docs",
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host=settings.HOST, port=settings.PORT, reload=True)
