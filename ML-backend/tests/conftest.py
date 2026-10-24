import pytest
from app.adapters.qdrant_adapter import qdrant_adapter


@pytest.fixture(autouse=True)
def isolate_qdrant_storage_for_all_tests():
    """
    Ensures that test vector insertions or modifications are never persisted
    into development or production storage.
    """
    original_points = dict(qdrant_adapter._memory_points)
    yield
    qdrant_adapter._memory_points = original_points
    qdrant_adapter._save_to_disk()
