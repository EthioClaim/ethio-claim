import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.core.config import settings


@pytest.mark.asyncio
async def test_unauthorized_when_missing_token():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        payload = {
            "analysisId": "a1",
            "evidenceId": "e1",
            "claimId": "c1",
        }
        res = await client.post("/internal/v1/analyze", json=payload)
        assert res.status_code == 401


@pytest.mark.asyncio
async def test_forbidden_when_invalid_token():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        payload = {
            "analysisId": "a1",
            "evidenceId": "e1",
            "claimId": "c1",
        }
        headers = {"X-Internal-Service-Token": "wrong-token"}
        res = await client.post("/internal/v1/analyze", json=payload, headers=headers)
        assert res.status_code == 403


@pytest.mark.asyncio
async def test_authorized_with_valid_header():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        payload = {
            "analysisId": "a1",
            "evidenceId": "e1",
            "claimId": "c1",
        }
        headers = {"X-Internal-Service-Token": settings.INTERNAL_SERVICE_TOKEN}
        res = await client.post("/internal/v1/analyze", json=payload, headers=headers)
        assert res.status_code == 200
