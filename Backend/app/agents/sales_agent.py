import json
from dataclasses import dataclass
from datetime import date, datetime, timedelta
from pathlib import Path
from typing import List, Optional, Tuple, BinaryIO

from app.core.config import get_settings
from app.core.logging_config import get_logger
from app.schemas.workflow import RFPListing, SalesAgentOutput
from app.services.rfp_understanding import RFPUnderstandingService
from app.services.web_scraper import WebScraper

logger = get_logger(__name__)


@dataclass
class SalesAgentConfig:
    listings_path: Optional[Path] = None
    pdf_base_dir: Path = None
    rfp_urls: List[str] = None
    due_within_months: int = 3

    def __post_init__(self):
        if self.rfp_urls is None:
            self.rfp_urls = []
        if self.pdf_base_dir is None:
            self.pdf_base_dir = Path("data/rfps")


class SalesAgent:
    """
    STEP 1: Sales Agent

    - Reads RFP listings from JSON.
    - Filters to due within N months.
    - Picks best (nearest due date or latest).
    - Downloads/opens PDF.
    - Calls RFP parser (Gemini+LangChain).
    """

    def __init__(self, config: SalesAgentConfig) -> None:
        self._config = config
        self._rfp_service = RFPUnderstandingService()
        self._web_scraper = WebScraper()

    def _load_listings(self) -> List[RFPListing]:
        """Load RFP listings from JSON file and/or scrape from URLs."""
        listings: List[RFPListing] = []

        # Load from JSON file if provided
        if self._config.listings_path and self._config.listings_path.exists():
            logger.info("Loading RFP listings from %s", self._config.listings_path)
            try:
                with self._config.listings_path.open("r", encoding="utf-8") as f:
                    data = json.load(f)
                listings.extend([RFPListing(**item) for item in data])
                logger.info("Loaded %d RFP listings from file", len(listings))
            except Exception as e:
                logger.warning("Failed to load listings from file: %s", e)

        # Scrape from URLs if provided
        if self._config.rfp_urls:
            logger.info("Scraping RFPs from %d URLs", len(self._config.rfp_urls))
            scraped = self._web_scraper.scrape_rfp_listings(
                self._config.rfp_urls, self._config.due_within_months
            )
            listings.extend(scraped)
            logger.info("Scraped %d RFP listings from URLs", len(scraped))

        logger.info("Total RFP listings: %d", len(listings))
        return listings

    @staticmethod
    def _parse_due(due_str: str) -> Optional[date]:
        try:
            return datetime.strptime(due_str, "%Y-%m-%d").date()
        except ValueError:
            return None

    def _filter_by_due(
        self, listings: List[RFPListing]
    ) -> Tuple[List[RFPListing], List[RFPListing]]:
        today = date.today()
        window_end = today + timedelta(days=30 * self._config.due_within_months)

        in_window: List[RFPListing] = []
        out_window: List[RFPListing] = []

        for l in listings:
            d = self._parse_due(l.due_date)
            if not d:
                out_window.append(l)
                continue
            if today <= d <= window_end:
                in_window.append(l)
            else:
                out_window.append(l)

        logger.info(
            "Due-date filter: %d in-window, %d out-of-window",
            len(in_window),
            len(out_window),
        )
        return in_window, out_window

    @staticmethod
    def _pick_best(listings: List[RFPListing]) -> Optional[RFPListing]:
        if not listings:
            return None

        today = date.today()
        with_dates: List[Tuple[RFPListing, Optional[date]]] = [
            (l, SalesAgent._parse_due(l.due_date)) for l in listings
        ]

        future = [(l, d) for (l, d) in with_dates if d and d >= today]
        if future:
            # smallest due date (nearest deadline)
            best = min(future, key=lambda t: t[1])
            return best[0]

        valid = [(l, d) for (l, d) in with_dates if d]
        if valid:
            # if all past, pick most recent
            best = max(valid, key=lambda t: t[1])
            return best[0]

        return listings[0]

    def _open_pdf(self, listing: RFPListing) -> Tuple[BinaryIO, str]:
        """Open PDF from local path or download from URL."""
        import requests
        from io import BytesIO

        # Check if it's a URL
        if listing.url.startswith("http://") or listing.url.startswith("https://"):
            logger.info("Downloading RFP PDF from %s", listing.url)
            try:
                response = requests.get(listing.url, timeout=30)
                response.raise_for_status()
                return BytesIO(response.content), listing.url
            except Exception as e:
                logger.error("Failed to download PDF from URL: %s", e)
                raise FileNotFoundError(f"Failed to download PDF from {listing.url}")

        # Otherwise, treat as local path
        pdf_path = self._config.pdf_base_dir / listing.url
        if not pdf_path.exists():
            raise FileNotFoundError(f"RFP PDF not found at {pdf_path}")
        logger.info("Opening RFP PDF at %s", pdf_path)
        return pdf_path.open("rb"), str(pdf_path)

    def run(self) -> SalesAgentOutput:
        listings = self._load_listings()
        in_window, _ = self._filter_by_due(listings)
        pool = in_window if in_window else listings

        chosen = self._pick_best(pool)
        if not chosen:
            raise RuntimeError("No RFP listing available for SalesAgent to process.")

        logger.info("SalesAgent picked RFP %s - %s", chosen.rfp_id, chosen.title)

        pdf_file, pdf_path = self._open_pdf(chosen)
        try:
            parsed = self._rfp_service.parse_rfp_pdf(pdf_file)
        finally:
            pdf_file.close()

        return SalesAgentOutput(
            rfp_id=chosen.rfp_id,
            title=chosen.title,
            pdf_path=pdf_path,
            scope_of_supply=parsed.scope_of_supply,
            technical_specifications=parsed.technical_specifications,
            testing_requirements=parsed.testing_requirements,
            due_date=chosen.due_date,
        )


def build_sales_agent_from_env() -> SalesAgent:
    settings = get_settings()
    
    # Get RFP URLs from environment (comma-separated)
    rfp_urls_env = settings.rfp_urls or ""
    rfp_urls = [url.strip() for url in rfp_urls_env.split(",") if url.strip()] if rfp_urls_env else []
    
    config = SalesAgentConfig(
        listings_path=Path(settings.rfp_listings_path),
        pdf_base_dir=Path(settings.rfp_pdf_base_dir),
        rfp_urls=rfp_urls,
        due_within_months=3,
    )
    return SalesAgent(config)
