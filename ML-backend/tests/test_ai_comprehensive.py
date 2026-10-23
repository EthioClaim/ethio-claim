import pytest
import base64
import io
import math
from PIL import Image, ImageDraw
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.core.config import settings
from app.services.embedding_service import embedding_service
from app.services.risk_assessor import risk_assessor_service
from app.schemas.analysis import (
    VisualMatch,
    HashMatchesInput,
    ExactMatchInput,
    PerceptualMatchInput,
    DamageDetection,
)


def make_b64_image(color=(100, 100, 100), draw_dent: bool = False) -> str:
    img = Image.new("RGB", (300, 300), color=color)
    if draw_dent:
        draw = ImageDraw.Draw(img)
        draw.ellipse([80, 80, 220, 220], outline=(20, 20, 20), fill=(40, 40, 40), width=4)
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=85)
    return base64.b64encode(buf.getvalue()).decode()


@pytest.mark.asyncio
async def test_no_damage_image_classified_appropriately():
    """An image with no damage is flagged for review without fraudulent label."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        payload = {
            "analysisId": "a-no-damage-1",
            "evidenceId": "e-no-damage-1",
            "claimId": "c-no-damage-1",
            "imageBase64": make_b64_image(color=(120, 140, 160), draw_dent=False),
            "options": {"damageDetection": True, "embeddingSimilarity": False},
        }
        headers = {"X-Internal-Service-Token": settings.INTERNAL_SERVICE_TOKEN}
        res = await client.post("/internal/v1/analyze", json=payload, headers=headers)
        assert res.status_code == 200
        data = res.json()

        assert data["status"] == "COMPLETED"
        assert len(data["damageDetections"]) == 0
        assert data["riskAssessment"]["label"] == "NO_DAMAGE_DETECTED"
        assert data["riskAssessment"]["requiresExaminerReview"] is True
        assert data["riskAssessment"]["score"] is not None
        assert 0.0 <= data["riskAssessment"]["score"] < 0.5


@pytest.mark.asyncio
async def test_exact_duplicate_detection_contract():
    """Exact duplicate returns POTENTIAL_FRAUD with non-empty matchedClaimIds and matchedEvidenceIds."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        payload = {
            "analysisId": "a-dup-1",
            "evidenceId": "e-dup-new",
            "claimId": "c-dup-new",
            "sha256": "abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
            "hashMatches": {
                "exactMatches": [
                    {"evidenceId": "e-prior-1", "claimId": "c-prior-1"}
                ],
                "perceptualMatches": [],
            },
            "imageBase64": make_b64_image(),
            "options": {"damageDetection": False, "embeddingSimilarity": False},
        }
        headers = {"X-Internal-Service-Token": settings.INTERNAL_SERVICE_TOKEN}
        res = await client.post("/internal/v1/analyze", json=payload, headers=headers)
        assert res.status_code == 200
        data = res.json()

        ra = data["riskAssessment"]
        assert ra["label"] == "POTENTIAL_FRAUD"
        assert ra["score"] >= 0.90
        assert "c-prior-1" in ra["matchedClaimIds"]
        assert "e-prior-1" in ra["matchedEvidenceIds"]
        assert ra["requiresExaminerReview"] is True


@pytest.mark.asyncio
async def test_perceptual_hash_near_duplicate_contract():
    """pHash match returns POTENTIAL_FRAUD with populated match IDs."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        payload = {
            "analysisId": "a-phash-1",
            "evidenceId": "e-phash-new",
            "claimId": "c-phash-new",
            "phash": "1234567890abcdef",
            "hashMatches": {
                "exactMatches": [],
                "perceptualMatches": [
                    {"evidenceId": "e-prior-2", "claimId": "c-prior-2", "distance": 4}
                ],
            },
            "imageBase64": make_b64_image(),
            "options": {"damageDetection": False, "embeddingSimilarity": False},
        }
        headers = {"X-Internal-Service-Token": settings.INTERNAL_SERVICE_TOKEN}
        res = await client.post("/internal/v1/analyze", json=payload, headers=headers)
        assert res.status_code == 200
        data = res.json()

        ra = data["riskAssessment"]
        assert ra["label"] == "POTENTIAL_FRAUD"
        assert ra["score"] >= 0.85
        assert "c-prior-2" in ra["matchedClaimIds"]
        assert "e-prior-2" in ra["matchedEvidenceIds"]


@pytest.mark.asyncio
async def test_different_images_produce_different_embeddings():
    """Different images have distinct embeddings and moderate/low cosine similarity."""
    img_red = Image.new("RGB", (200, 200), color=(220, 30, 30))
    img_blue = Image.new("RGB", (200, 200), color=(30, 30, 220))

    vec_red = embedding_service.generate_embedding(img_red)
    vec_blue = embedding_service.generate_embedding(img_blue)

    assert len(vec_red) == settings.EMBEDDING_DIMENSION
    assert len(vec_blue) == settings.EMBEDDING_DIMENSION

    # Verify L2 normalization
    norm_red = math.sqrt(sum(x * x for x in vec_red))
    assert math.isclose(norm_red, 1.0, rel_tol=1e-3)

    sim = embedding_service.cosine_similarity(vec_red, vec_blue)
    # Cosine similarity between red and blue must not be suspiciously high
    assert sim < settings.VECTOR_SIMILARITY_FRAUD_THRESHOLD


@pytest.mark.asyncio
async def test_corrupt_image_returns_error():
    """Invalid or corrupt image bytes return an explicit error and failure risk status."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        payload = {
            "analysisId": "a-corrupt-1",
            "evidenceId": "e-corrupt-1",
            "claimId": "c-corrupt-1",
            "imageBase64": "NOT_A_VALID_IMAGE_BASE64_DATA!!!",
        }
        headers = {"X-Internal-Service-Token": settings.INTERNAL_SERVICE_TOKEN}
        res = await client.post("/internal/v1/analyze", json=payload, headers=headers)
        # Should either return 400 or a graceful FAILED response with explicit error details
        if res.status_code == 200:
            data = res.json()
            assert data["status"] == "FAILED"
            assert data["riskAssessment"]["label"] == "FAILED"
            assert data["errorCode"] is not None
        else:
            assert res.status_code in [400, 422]


def test_cross_insurer_isolation_in_risk_evaluation():
    """Same claim or same evidence matches are ignored; valid cross-claim matches populate IDs."""
    matches = [
        VisualMatch(evidenceId="same-ev", claimId="current-claim", similarity=1.0),
        VisualMatch(evidenceId="other-ev", claimId="other-claim", similarity=0.94),
    ]
    res = risk_assessor_service.evaluate_risk(
        claim_id="current-claim",
        evidence_id="same-ev",
        visual_matches=matches,
        damage_detections=[DamageDetection(label="dent", confidence=0.88, severity="MODERATE", box=[0.1, 0.1, 0.3, 0.3])],
    )
    assert res.label == "POTENTIAL_FRAUD"
    assert "current-claim" not in res.matchedClaimIds
    assert "other-claim" in res.matchedClaimIds
    assert "same-ev" not in res.matchedEvidenceIds
    assert "other-ev" in res.matchedEvidenceIds
