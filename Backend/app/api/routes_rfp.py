from io import BytesIO

from fastapi import APIRouter, UploadFile, File, HTTPException, status

from app.core.logging_config import get_logger
from app.schemas.rfp import RFPParseResponse, HealthResponse
from app.services.rfp_understanding import RFPUnderstandingService
from app.core.config import get_settings

logger = get_logger(__name__)
router = APIRouter(prefix="/api/v1", tags=["RFP"])

_service = RFPUnderstandingService()


@router.get("/health", response_model=HealthResponse)
def health_check() -> HealthResponse:
    settings = get_settings()
    return HealthResponse(
        status="ok",
        service=settings.app_name,
        version=settings.app_version,
    )


@router.post(
    "/rfp/parse",
    response_model=RFPParseResponse,
    status_code=status.HTTP_200_OK,
)
async def parse_rfp_pdf(
    file: UploadFile = File(..., description="RFP PDF file"),
) -> RFPParseResponse:
    if file.content_type not in ("application/pdf", "application/x-pdf"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only PDF files are supported.",
        )

    try:
        file_bytes = await file.read()
        resp = _service.parse_rfp_pdf(BytesIO(file_bytes))
        return resp
    except Exception as exc:  # noqa: BLE001
        logger.exception("Failed to parse RFP PDF: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to parse RFP. Check server logs.",
        )
