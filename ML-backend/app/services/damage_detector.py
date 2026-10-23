import hashlib
from abc import ABC, abstractmethod
from typing import List
from PIL import Image
from app.core.config import settings
from app.schemas.analysis import DamageDetection


class BaseDamageDetector(ABC):
    @abstractmethod
    async def detect_damage(self, image: Image.Image, seed_key: str = "") -> List[DamageDetection]:
        pass


class MockDamageDetector(BaseDamageDetector):
    """
    Deterministic mock / heuristic damage detector simulating a vision AI model.
    Produces realistic bounding boxes, classes, and confidence scores based on image seed.
    """

    CANDIDATE_DAMAGES = [
        {"label": "front_bumper_dent", "severity": "MODERATE", "box": [0.42, 0.18, 0.78, 0.58], "area": 14.4},
        {"label": "scratch", "severity": "MINOR", "box": [0.25, 0.45, 0.38, 0.72], "area": 3.5},
        {"label": "headlight_crack", "severity": "MINOR", "box": [0.35, 0.65, 0.48, 0.85], "area": 2.6},
        {"label": "hood_crumple", "severity": "SEVERE", "box": [0.15, 0.22, 0.45, 0.78], "area": 16.8},
        {"label": "side_door_dent", "severity": "MODERATE", "box": [0.38, 0.30, 0.65, 0.70], "area": 10.8},
        {"label": "broken_windshield", "severity": "SEVERE", "box": [0.18, 0.25, 0.42, 0.75], "area": 12.0},
        {"label": "rear_bumper_scrape", "severity": "MINOR", "box": [0.55, 0.20, 0.82, 0.60], "area": 7.2},
    ]

    async def detect_damage(self, image: Image.Image, seed_key: str = "") -> List[DamageDetection]:
        # Hash the seed key to get deterministic pseudorandom selection
        h = hashlib.sha256((seed_key or "default-damage-seed").encode()).hexdigest()
        val = int(h[:8], 16)

        # Decide number of damage regions: 1 to 3
        count = (val % 3) + 1
        detections: List[DamageDetection] = []

        for i in range(count):
            idx = (val + i * 3) % len(self.CANDIDATE_DAMAGES)
            cand = self.CANDIDATE_DAMAGES[idx]

            # Deterministic confidence between 0.82 and 0.97
            conf_int = (val >> (i * 4)) % 16
            confidence = round(0.82 + (conf_int / 100.0), 2)

            detections.append(
                DamageDetection(
                    label=cand["label"],
                    confidence=confidence,
                    severity=cand["severity"],
                    box=cand["box"],
                    areaPercentage=cand["area"],
                )
            )

        return detections


class DamageDetectorService:
    def __init__(self):
        if settings.USE_MOCK_DAMAGE_MODEL:
            self.detector: BaseDamageDetector = MockDamageDetector()
        else:
            # Placeholder for actual YOLO / PyTorch model when weights exist
            self.detector = MockDamageDetector()

    async def detect(self, image: Image.Image, seed_key: str = "") -> List[DamageDetection]:
        return await self.detector.detect_damage(image, seed_key)


damage_detector_service = DamageDetectorService()
