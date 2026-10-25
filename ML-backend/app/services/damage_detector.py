import logging
from abc import ABC, abstractmethod
from pathlib import Path
from typing import List
from PIL import Image
from app.core.config import settings
from app.schemas.analysis import DamageDetection

logger = logging.getLogger("damage_detector")


class BaseDamageDetector(ABC):
    @abstractmethod
    async def detect_damage(self, image: Image.Image, seed_key: str = "") -> List[DamageDetection]:
        pass


class YoloDamageDetector(BaseDamageDetector):
    """
    Real vision AI detector using YOLO trained weights (damage_best.pt).
    Detects real vehicle damages: dent, scratch, crack, shattered_glass, broken_lamp, flat_tire.
    """

    SEVERITY_MAP = {
        "dent": "MODERATE",
        "scratch": "MINOR",
        "crack": "MINOR",
        "shattered_glass": "SEVERE",
        "broken_lamp": "MODERATE",
        "flat_tire": "MINOR",
    }

    def __init__(self, model_path: str):
        self.model = None
        resolved_path = Path(model_path)
        if not resolved_path.is_absolute():
            backend_root = Path(__file__).resolve().parent.parent.parent
            resolved_path = (backend_root / model_path).resolve()

        if not resolved_path.exists():
            # Also check models directory directly
            alt_path = Path(__file__).resolve().parent.parent.parent / "models" / "damage_best.pt"
            if alt_path.exists():
                resolved_path = alt_path

        try:
            from ultralytics import YOLO
            self.model = YOLO(str(resolved_path))
            logger.info(f"Loaded YOLO damage model from {resolved_path} with classes: {self.model.names}")
        except Exception as e:
            logger.error(f"Failed to load YOLO model from {resolved_path}: {e}")
            self.model = None

    async def detect_damage(self, image: Image.Image, seed_key: str = "") -> List[DamageDetection]:
        if self.model is None:
            logger.warning("YOLO model not loaded; returning empty detections.")
            return []

        # Run inference on PIL Image
        try:
            results = self.model.predict(image, conf=0.25, verbose=False)
            detections: List[DamageDetection] = []
            if not results:
                return detections

            res = results[0]
            if res.boxes is None or len(res.boxes) == 0:
                return detections

            for b in res.boxes:
                cls_id = int(b.cls[0].item())
                raw_label = self.model.names.get(cls_id, f"damage_{cls_id}")
                conf = round(float(b.conf[0].item()), 4)
                xyxyn = b.xyxyn[0].tolist()  # [xmin, ymin, xmax, ymax] normalized

                # Normalize box as [ymin, xmin, ymax, xmax] according to DamageDetection schema
                xmin, ymin, xmax, ymax = xyxyn[0], xyxyn[1], xyxyn[2], xyxyn[3]
                box = [round(ymin, 4), round(xmin, 4), round(ymax, 4), round(xmax, 4)]
                area = round(max(0.0, (xmax - xmin) * (ymax - ymin) * 100.0), 2)
                severity = self.SEVERITY_MAP.get(raw_label.lower(), "MODERATE")

                detections.append(
                    DamageDetection(
                        label=raw_label,
                        confidence=conf,
                        severity=severity,
                        box=box,
                        areaPercentage=area,
                    )
                )

            return detections
        except Exception as e:
            logger.error(f"Error running YOLO damage detection: {e}", exc_info=True)
            return []


class MockDamageDetector(BaseDamageDetector):
    """
    Fallback deterministic mock damage detector for test scenarios where weights are unavailable.
    """

    CANDIDATE_DAMAGES = [
        {"label": "front_bumper_dent", "severity": "MODERATE", "box": [0.42, 0.18, 0.78, 0.58], "area": 14.4},
        {"label": "scratch", "severity": "MINOR", "box": [0.25, 0.45, 0.38, 0.72], "area": 3.5},
        {"label": "headlight_crack", "severity": "MINOR", "box": [0.35, 0.65, 0.48, 0.85], "area": 2.6},
        {"label": "hood_crumple", "severity": "SEVERE", "box": [0.15, 0.22, 0.45, 0.78], "area": 16.8},
        {"label": "side_door_dent", "severity": "MODERATE", "box": [0.38, 0.30, 0.65, 0.70], "area": 10.8},
    ]

    async def detect_damage(self, image: Image.Image, seed_key: str = "") -> List[DamageDetection]:
        return []


class DamageDetectorService:
    def __init__(self):
        if settings.USE_MOCK_DAMAGE_MODEL:
            self.detector: BaseDamageDetector = MockDamageDetector()
        else:
            self.detector = YoloDamageDetector(settings.DAMAGE_MODEL_PATH)
            # If YOLO failed to load, fallback to mock
            if isinstance(self.detector, YoloDamageDetector) and self.detector.model is None:
                logger.warning("Falling back to MockDamageDetector because YOLO model is unavailable")
                self.detector = MockDamageDetector()

    async def detect(self, image: Image.Image, seed_key: str = "") -> List[DamageDetection]:
        return await self.detector.detect_damage(image, seed_key)


damage_detector_service = DamageDetectorService()
