from datetime import date, datetime

from sqlalchemy import Column, Integer, String, Date, DateTime, Text, Float
from sqlalchemy.sql import func

from app.db.database import Base


class RFP(Base):
    __tablename__ = "rfps"

    id = Column(Integer, primary_key=True, index=True)
    # Optional external identifier from customer portal etc.
    external_id = Column(String, index=True, nullable=True)

    title = Column(String, nullable=False)
    customer_name = Column(String, nullable=True)
    due_date = Column(Date, nullable=True)

    status = Column(String, nullable=False, default="new")  # new | parsed | bid_completed | error

    # Where the uploaded PDF is stored on disk (relative to project root)
    pdf_path = Column(String, nullable=True)

    # Parsed content from Gemini
    scope_of_supply = Column(Text, nullable=True)
    technical_specifications = Column(Text, nullable=True)
    testing_requirements = Column(Text, nullable=True)

    # Bid results
    total_bid_value = Column(Float, nullable=True)
    narrative_summary = Column(Text, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    last_run_at = Column(DateTime(timezone=True), nullable=True)
    last_run_status = Column(String, nullable=True)  # success | failed | partial
