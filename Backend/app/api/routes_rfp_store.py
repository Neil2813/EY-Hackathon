# app/api/routes_rfp_store.py

import os
from datetime import date
from typing import List, Optional

from fastapi import (
    APIRouter,
    Depends,
    File,
    Form,
    HTTPException,
    UploadFile,
    status,
)
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.database import SessionLocal
from app.db import crud
from app.schemas import rfp_store as schemas

router = APIRouter(prefix="/api/v1/rfps", tags=["rfps"])


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# Ensure upload directory exists
os.makedirs(settings.rfp_upload_dir, exist_ok=True)


@router.post(
    "",
    response_model=schemas.RFP,
    status_code=status.HTTP_201_CREATED,
)
async def create_rfp_endpoint(
    title: str = Form(...),
    customer_name: Optional[str] = Form(None),
    due_date: Optional[str] = Form(None),  # "YYYY-MM-DD"
    external_id: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
):
    # Parse due_date
    parsed_due_date: Optional[date] = None
    if due_date:
        try:
            parsed_due_date = date.fromisoformat(due_date)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid due_date format. Use YYYY-MM-DD.",
            )

    # Save file if provided
    pdf_path: Optional[str] = None
    if file is not None:
        if not file.filename.lower().endswith(".pdf"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Only PDF files are supported.",
            )
        safe_name = file.filename.replace(" ", "_")
        pdf_path = os.path.join(settings.rfp_upload_dir, safe_name)

        # If file exists, add a suffix
        base, ext = os.path.splitext(pdf_path)
        counter = 1
        while os.path.exists(pdf_path):
            pdf_path = f"{base}_{counter}{ext}"
            counter += 1

        content = await file.read()
        with open(pdf_path, "wb") as f:
            f.write(content)

    rfp_in = schemas.RFPCreate(
        title=title,
        customer_name=customer_name,
        due_date=parsed_due_date,
        external_id=external_id,
    )
    db_obj = crud.create_rfp(db, rfp_in=rfp_in, pdf_path=pdf_path)
    return db_obj


@router.get("", response_model=List[schemas.RFPListItem])
def list_rfps(db: Session = Depends(get_db)):
    rfps = crud.get_rfps(db)
    return rfps


@router.get("/{rfp_id}", response_model=schemas.RFP)
def get_rfp_endpoint(rfp_id: int, db: Session = Depends(get_db)):
    db_obj = crud.get_rfp(db, rfp_id)
    if not db_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="RFP not found"
        )
    return db_obj
