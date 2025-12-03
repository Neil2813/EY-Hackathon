from typing import Optional, Any
from pydantic import BaseModel, Field


class RFPParseResponse(BaseModel):
    scope_of_supply: str = Field(..., description="RFP scope of supply.")
    technical_specifications: str = Field(..., description="RFP technical specifications.")
    testing_requirements: str = Field(..., description="RFP testing / QA requirements.")
    raw_model_response: Optional[Any] = Field(
        None,
        description="Raw JSON payload returned by the LLM for debugging.",
    )


class HealthResponse(BaseModel):
    status: str
    service: str
    version: str
