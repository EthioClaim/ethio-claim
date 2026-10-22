import pytest
from app.services.vector_store import vector_store_service


@pytest.mark.asyncio
async def test_store_and_search_vector():
    v1 = [0.1] * 128
    # Store embedding
    res = await vector_store_service.store_embedding(
        evidence_id="ev-test-1",
        claim_id="claim-test-1",
        vector=v1,
        tenant_id="tenant-alpha",
    )
    assert res.stored is True
    assert res.pointId is not None

    # Search for similar vector
    hits = await vector_store_service.search_similar(
        query_vector=v1,
        tenant_id="tenant-alpha",
        exclude_evidence_id="ev-different",
        top_k=5,
    )
    assert len(hits) > 0
    assert hits[0].evidenceId == "ev-test-1"
    assert hits[0].similarity > 0.99

    # Tenant isolation check: searching with different tenant should return nothing
    isolated_hits = await vector_store_service.search_similar(
        query_vector=v1,
        tenant_id="tenant-beta",
        top_k=5,
    )
    assert len(isolated_hits) == 0
