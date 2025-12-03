from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, Field


class RFPBase(BaseModel):
    title: str = Field(..., description="Internal RFP title (can default to filename)")
    customer_name: Optional[str] = None
    due_date: Optional[date] = None
    external_id: Optional[str] = None


class RFPCreate(RFPBase):
    """Used when creating a new RFP record (meta + file)."""
    pass


class RFPUpdate(BaseModel):
    title: Optional[str] = None
    customer_name: Optional[str] = None
    due_date: Optional[date] = None
    status: Optional[str] = None


class RFPInDBBase(RFPBase):
    id: int
    status: str
    pdf_path: Optional[str]
    scope_of_supply: Optional[str] = None
    technical_specifications: Optional[str] = None
    testing_requirements: Optional[str] = None
    total_bid_value: Optional[float] = None
    narrative_summary: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    last_run_at: Optional[datetime] = None
    last_run_status: Optional[str] = None

    class Config:
        from_attributes = True


class RFP(RFPInDBBase):
    """What we send back to the frontend."""


class RFPListItem(BaseModel):
    id: int
    title: str
    customer_name: Optional[str] = None
    due_date: Optional[date] = None
    status: str
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True
