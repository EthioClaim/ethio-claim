import math
import hashlib
from typing import List, Optional
from PIL import Image
import numpy as np
from app.core.config import settings


class EmbeddingService:
    def __init__(self):
        self.dimension = settings.EMBEDDING_DIMENSION
        self.model_name = settings.EMBEDDING_MODEL_NAME
        self.version = settings.EMBEDDING_MODEL_VERSION

    def generate_embedding(
        self,
        image: Image.Image,
        sha256: Optional[str] = None,
        phash: Optional[str] = None,
    ) -> List[float]:
        """
        Generates a deterministic L2-normalized float embedding vector from an image.
        Uses deterministic spatial/color decomposition so identical or near-identical
        images yield high cosine similarity.
        """
        # Downsample image to 16x8 grayscale grid (128 values)
        grid_w = 16
        grid_h = self.dimension // grid_w  # e.g. 128 // 16 = 8
        small = image.resize((grid_w, grid_h)).convert("L")
        pixels = list(small.tobytes())

        vector = [float(p) / 255.0 for p in pixels]

        # Incase dimension doesn't match grid, adjust
        if len(vector) < self.dimension:
            vector.extend([0.0] * (self.dimension - len(vector)))
        elif len(vector) > self.dimension:
            vector = vector[: self.dimension]

        # Blend slight feature from sha256 or phash if provided for uniqueness
        if sha256:
            hash_ints = [int(sha256[i : i + 2], 16) / 255.0 for i in range(0, min(len(sha256), 32), 2)]
            for i, val in enumerate(hash_ints):
                if i < len(vector):
                    vector[i] = 0.85 * vector[i] + 0.15 * val

        # L2-normalize vector so cosine similarity is simply dot product
        norm = math.sqrt(sum(x * x for x in vector))
        if norm > 1e-9:
            vector = [x / norm for x in vector]
        else:
            vector = [1.0 / math.sqrt(self.dimension)] * self.dimension

        return vector

    def cosine_similarity(self, v1: List[float], v2: List[float]) -> float:
        """
        Computes cosine similarity between two unit vectors.
        """
        if len(v1) != len(v2):
            return 0.0
        dot = sum(a * b for a, b in zip(v1, v2))
        return max(0.0, min(1.0, float(dot)))


embedding_service = EmbeddingService()
