from typing import List, Optional

from sqlalchemy.orm import Session

from app.db import models
from app.schemas import rfp_store as schemas


def create_rfp(db: Session, rfp_in: schemas.RFPCreate, pdf_path: Optional[str]) -> models.RFP:
    db_obj = models.RFP(
        external_id=rfp_in.external_id,
        title=rfp_in.title,
        customer_name=rfp_in.customer_name,
        due_date=rfp_in.due_date,
        pdf_path=pdf_path,
        status="new",
    )
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj


def get_rfps(db: Session, skip: int = 0, limit: int = 100) -> List[models.RFP]:
    return (
        db.query(models.RFP)
        .order_by(models.RFP.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )


def get_rfp(db: Session, rfp_id: int) -> Optional[models.RFP]:
    return db.query(models.RFP).filter(models.RFP.id == rfp_id).first()


def update_rfp(db: Session, rfp_id: int, rfp_update: schemas.RFPUpdate) -> Optional[models.RFP]:
    db_obj = get_rfp(db, rfp_id)
    if not db_obj:
        return None

    for field, value in rfp_update.model_dump(exclude_unset=True).items():
        setattr(db_obj, field, value)

    db.commit()
    db.refresh(db_obj)
    return db_obj


def update_rfp_after_run(
    db: Session,
    rfp_id: int,
    *,
    scope_of_supply: Optional[str],
    technical_specifications: Optional[str],
    testing_requirements: Optional[str],
    total_bid_value: Optional[float],
    narrative_summary: Optional[str],
    status: str,
    last_run_status: str,
):
    db_obj = get_rfp(db, rfp_id)
    if not db_obj:
        return None

    db_obj.scope_of_supply = scope_of_supply
    db_obj.technical_specifications = technical_specifications
    db_obj.testing_requirements = testing_requirements
    db_obj.total_bid_value = total_bid_value
    db_obj.narrative_summary = narrative_summary
    db_obj.status = status
    db_obj.last_run_status = last_run_status
    from datetime import datetime, timezone

    db_obj.last_run_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(db_obj)
    return db_obj
