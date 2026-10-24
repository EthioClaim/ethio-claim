import pytest
import base64
import io
from PIL import Image
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.core.config import settings


from app.adapters.qdrant_adapter import qdrant_adapter


@pytest.fixture(autouse=True)
def isolate_qdrant_store():
    # Save original in-memory points
    original = dict(qdrant_adapter._memory_points)
    yield
    # Restore original points so test fixture points are never persisted
    qdrant_adapter._memory_points = original
    qdrant_adapter._save_to_disk()


def create_dummy_base64_image() -> str:
    img = Image.new("RGB", (200, 200), color=(200, 50, 50))
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    return base64.b64encode(buf.getvalue()).decode()


@pytest.mark.asyncio
async def test_full_analyze_pipeline_success():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        payload = {
            "analysisId": "a100-test-id",
            "evidenceId": "e100-test-id",
            "claimId": "c100-test-id",
            "sha256": "abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
            "phash": "1234567890abcdef",
            "imageBase64": create_dummy_base64_image(),
            "options": {
                "damageDetection": True,
                "embeddingSimilarity": True,
                "topK": 5,
            },
        }
        headers = {"X-Internal-Service-Token": settings.INTERNAL_SERVICE_TOKEN}
        res = await client.post("/internal/v1/analyze", json=payload, headers=headers)
        assert res.status_code == 200
        data = res.json()

        assert data["status"] == "COMPLETED"
        assert data["analysisId"] == "a100-test-id"
        assert data["evidenceId"] == "e100-test-id"
        assert isinstance(data["damageDetections"], list)
        if len(data["damageDetections"]) > 0:
            assert data["damageDetections"][0]["confidence"] > 0
            assert len(data["damageDetections"][0]["box"]) == 4

        # Embedding verification
        assert data["embedding"]["stored"] is True
        assert data["embedding"]["model"] == settings.EMBEDDING_MODEL_NAME

        # Risk assessment verification
        assert "riskAssessment" in data
        assert data["riskAssessment"]["label"] in ["NO_FRAUD_INDICATORS_FOUND", "POTENTIAL_FRAUD", "NO_DAMAGE_DETECTED"]
        assert len(data["warnings"]) > 0


@pytest.mark.asyncio
async def test_fraud_flagged_on_exact_hash_match():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        payload = {
            "analysisId": "a200-test-id",
            "evidenceId": "e200-test-id",
            "claimId": "c200-test-id",
            "hashMatches": {
                "exactMatches": [
                    {"evidenceId": "prior-ev-id", "claimId": "different-prior-claim-id"}
                ],
                "perceptualMatches": [],
            },
        }
        headers = {"X-Internal-Service-Token": settings.INTERNAL_SERVICE_TOKEN}
        res = await client.post("/internal/v1/analyze", json=payload, headers=headers)
        assert res.status_code == 200
        data = res.json()

        assert data["riskAssessment"]["label"] == "POTENTIAL_FRAUD"
        assert data["riskAssessment"]["requiresExaminerReview"] is True
        assert any("Exact SHA-256 match" in r for r in data["riskAssessment"]["reasons"])
