import re
import hashlib
from typing import Optional, Dict, Any
from PIL import Image
from app.schemas.ocr import OcrExtractResponse
from app.schemas.analysis import OcrResult


class OcrService:
    """
    OCR and document entity extraction service.
    Provides realistic heuristic/simulated extraction for vehicle plates,
    driver licenses, insurance certificates, and accident police reports.
    """

    SAMPLE_PLATES = ["3-B12345-AA", "2-A98765-ET", "4-C54321-OR", "3-A11223-AA"]
    SAMPLE_INSURERS = ["Nyala Insurance S.C.", "Awash Insurance Company", "United Insurance S.C.", "Ethiopian Insurance Corporation"]

    def extract_document(
        self,
        image: Image.Image,
        document_type: str = "AUTO",
        seed: str = "",
    ) -> OcrExtractResponse:
        h = hashlib.sha256((seed or "ocr-default").encode()).hexdigest()
        val = int(h[:8], 16)

        plate = self.SAMPLE_PLATES[val % len(self.SAMPLE_PLATES)]
        insurer = self.SAMPLE_INSURERS[(val // 4) % len(self.SAMPLE_INSURERS)]
        policy_num = f"POL-ETH-{2024 + (val % 3)}-{10000 + (val % 89999)}"

        if document_type == "LICENSE_PLATE":
            detected_text = f"ETHIOPIA [ {plate} ]"
            fields = {
                "plateNumber": plate,
                "region": "Addis Ababa" if "AA" in plate else "Oromia",
                "confidence": 0.96,
            }
        elif document_type == "INSURANCE_CARD":
            detected_text = f"{insurer}\nCERTIFICATE OF MOTOR VEHICLE INSURANCE\nPolicy: {policy_num}\nPlate: {plate}\nValid: 2026-01-01 to 2027-01-01"
            fields = {
                "insurer": insurer,
                "policyNumber": policy_num,
                "plateNumber": plate,
                "expiryDate": "2027-01-01",
                "coverageType": "COMPREHENSIVE",
            }
        else:
            # AUTO or general vehicle photo OCR
            detected_text = f"Vehicle Identification Plate: {plate}\nInsurer: {insurer}"
            fields = {
                "plateNumber": plate,
                "confidence": 0.92,
            }

        return OcrExtractResponse(
            documentType=document_type,
            detectedText=detected_text,
            confidence=0.94,
            fields=fields,
        )

    def extract_for_analysis(
        self,
        image: Image.Image,
        seed: str = "",
    ) -> OcrResult:
        res = self.extract_document(image, document_type="AUTO", seed=seed)
        return OcrResult(
            detectedText=res.detectedText,
            documentType=res.documentType,
            extractedFields=res.fields,
        )


ocr_service = OcrService()
