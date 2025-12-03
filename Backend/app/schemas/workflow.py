from typing import List, Dict, Optional
from pydantic import BaseModel, Field


class RFPListing(BaseModel):
    rfp_id: str
    title: str
    url: str = Field(..., description="Relative PDF path or URL")
    due_date: str = Field(..., description="YYYY-MM-DD")


class SalesAgentOutput(BaseModel):
    rfp_id: str
    title: str
    pdf_path: str
    scope_of_supply: str
    technical_specifications: str
    testing_requirements: str
    due_date: str


class RFPItem(BaseModel):
    description: str
    conductor_size_sqmm: Optional[int] = None
    cores: Optional[int] = None
    conductor_material: Optional[str] = None
    insulation: Optional[str] = None
    voltage_rating: Optional[int] = None
    armour_type: Optional[str] = None
    quantity: int = 1


class SKUMatch(BaseModel):
    sku: str
    match_percent: float
    differences: Dict[str, Dict[str, Optional[str]]] = Field(
        default_factory=dict,
        description="Per-attribute differences: {param: {rfp:..., sku:...}}",
    )


class TechnicalAgentItemResult(BaseModel):
    rfp_item: RFPItem
    top_matches: List[SKUMatch]
    chosen_sku: Optional[str]
    comparison_table: List[Dict[str, Optional[str]]]


class TechnicalAgentOutput(BaseModel):
    items: List[TechnicalAgentItemResult]


class ItemPricing(BaseModel):
    rfp_item: RFPItem
    chosen_sku: str
    unit_price: float
    quantity: int
    material_cost: float
    tests_cost: float
    total_cost: float
    tests_applied: List[str]


class PricingAgentOutput(BaseModel):
    items: List[ItemPricing]
    total_bid_value: float


class FinalRFPResponse(BaseModel):
    rfp_id: str
    rfp_title: str
    rfp_due_date: str

    scope_of_supply: str
    technical_specifications: str
    testing_requirements: str

    technical_items: List[TechnicalAgentItemResult]
    pricing: PricingAgentOutput

    total_bid_value: float
    notes: Optional[str] = None
    narrative_summary: Optional[str] = None


class WorkflowStep(BaseModel):
    step_name: str
    agent_name: str
    status: str  # "pending", "running", "completed", "error"
    output: Optional[dict] = None
    summary: Optional[str] = None
    error: Optional[str] = None


class WorkflowProgress(BaseModel):
    workflow_id: str
    current_step: int
    total_steps: int
    steps: List[WorkflowStep]
    final_response: Optional[FinalRFPResponse] = None