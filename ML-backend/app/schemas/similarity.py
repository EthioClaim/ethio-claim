from typing import List, Optional
from pydantic import BaseModel, Field


class SimilaritySearchRequest(BaseModel):
    evidenceId: Optional[str] = Field(None, description="Exclude this evidence from search results")
    claimId: Optional[str] = Field(None, description="Exclude matches belonging to this claim if specified")
    tenantId: Optional[str] = Field("default", description="Tenant or insurer isolation filter")
    vector: Optional[List[float]] = Field(None, description="Pre-generated vector embedding to query")
    topK: int = Field(5, ge=1, le=50, description="Max nearest neighbors to retrieve")
    minSimilarity: float = Field(0.0, ge=0.0, le=1.0, description="Minimum similarity threshold")


class SimilaritySearchItem(BaseModel):
    evidenceId: str
    claimId: Optional[str] = None
    similarity: float
    score: Optional[float] = None


class SimilaritySearchResponse(BaseModel):
    totalMatches: int
    matches: List[SimilaritySearchItem] = Field(default_factory=list)


class ReindexRequest(BaseModel):
    tenantId: Optional[str] = "default"
    batchSize: int = Field(50, ge=1, le=500)
    forceRecreateCollection: bool = False


class ReindexResponse(BaseModel):
    status: str
    totalIndexed: int
    collectionName: str
    message: str
