from typing import Optional, Dict, Any
from pydantic import BaseModel, Field


class OcrExtractRequest(BaseModel):
    imageRef: Optional[str] = Field(None, description="Storage key or file path")
    imageUrl: Optional[str] = Field(None, description="Public or signed image URL")
    imageBase64: Optional[str] = Field(None, description="Base64 encoded image string")
    documentType: Optional[str] = Field("AUTO", description="AUTO, LICENSE_PLATE, DRIVING_LICENSE, INSURANCE_CARD, POLICE_REPORT")


class OcrExtractResponse(BaseModel):
    documentType: str
    detectedText: str
    confidence: float
    fields: Dict[str, Any] = Field(default_factory=dict)
