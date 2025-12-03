from typing import BinaryIO

from app.core.logging_config import get_logger
from app.models.rfp import RFPSections
from app.schemas.rfp import RFPParseResponse
from app.services.pdf_extractor import extract_text_from_pdf
from app.services.gemini_client import GeminiClient

logger = get_logger(__name__)


class RFPUnderstandingService:
    """
    Orchestrates PDF text extraction + Gemini structured parsing.
    """

    def __init__(self) -> None:
        self._gemini = GeminiClient()

    def parse_rfp_pdf(self, file_obj: BinaryIO) -> RFPParseResponse:
        raw_text = extract_text_from_pdf(file_obj)

        if not raw_text.strip():
            logger.warning("No text extracted from PDF.")
            return RFPParseResponse(
                scope_of_supply="",
                technical_specifications="",
                testing_requirements="",
                raw_model_response={"error": "No text extracted from PDF."},
            )

        model_json = self._gemini.extract_rfp_sections(raw_text)

        scope = str(model_json.get("scope_of_supply", "")).strip()
        tech = str(model_json.get("technical_specifications", "")).strip()
        tests = str(model_json.get("testing_requirements", "")).strip()

        sections = RFPSections(
            scope_of_supply=scope,
            technical_specifications=tech,
            testing_requirements=tests,
            raw_model_json=model_json,
        )

        logger.info("Successfully parsed RFP sections via Gemini.")

        return RFPParseResponse(
            scope_of_supply=sections.scope_of_supply,
            technical_specifications=sections.technical_specifications,
            testing_requirements=sections.testing_requirements,
            raw_model_response=sections.raw_model_json,
        )
