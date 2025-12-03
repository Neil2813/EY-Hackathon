from io import BytesIO
from typing import BinaryIO

from pypdf import PdfReader

from app.core.config import get_settings
from app.core.logging_config import get_logger

logger = get_logger(__name__)


def extract_text_from_pdf(file_obj: BinaryIO) -> str:
    """
    Extract text from a PDF, up to RFP_MAX_PAGES.
    """
    settings = get_settings()
    file_bytes = file_obj.read()
    buffer = BytesIO(file_bytes)

    reader = PdfReader(buffer)
    total_pages = len(reader.pages)
    max_pages = min(settings.rfp_max_pages, total_pages)

    logger.info("PDF has %d pages; processing first %d", total_pages, max_pages)

    chunks: list[str] = []
    for i in range(max_pages):
        page = reader.pages[i]
        text = page.extract_text() or ""
        header = f"\n\n===== PAGE {i + 1} / {total_pages} =====\n"
        chunks.append(header + text)

    full_text = "\n".join(chunks)
    logger.info("Extracted %d characters from PDF", len(full_text))
    return full_text
