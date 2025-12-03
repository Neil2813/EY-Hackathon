"""
Web scraping service for Sales Agent to scan RFP URLs.
"""
import re
from datetime import datetime, timedelta
from typing import List, Optional
from urllib.parse import urljoin, urlparse

import requests
from bs4 import BeautifulSoup

from app.core.logging_config import get_logger
from app.schemas.workflow import RFPListing

logger = get_logger(__name__)


class WebScraper:
    """
    Scrapes RFP listings from predefined URLs.
    Extracts RFP information including title, due date, and PDF links.
    """

    def __init__(self, timeout: int = 10):
        self.timeout = timeout
        self.session = requests.Session()
        self.session.headers.update({
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        })

    def scrape_rfp_listings(
        self, base_urls: List[str], due_within_months: int = 3
    ) -> List[RFPListing]:
        """
        Scrape RFP listings from multiple URLs.
        Filters to RFPs due within the specified months.
        """
        all_listings: List[RFPListing] = []

        for url in base_urls:
            try:
                listings = self._scrape_single_url(url, due_within_months)
                all_listings.extend(listings)
                logger.info("Scraped %d RFPs from %s", len(listings), url)
            except Exception as e:
                logger.warning("Failed to scrape %s: %s", url, e)

        logger.info("Total RFPs scraped: %d", len(all_listings))
        return all_listings

    def _scrape_single_url(
        self, url: str, due_within_months: int
    ) -> List[RFPListing]:
        """Scrape a single URL for RFP listings."""
        try:
            response = self.session.get(url, timeout=self.timeout)
            response.raise_for_status()
        except requests.RequestException as e:
            logger.error("Failed to fetch %s: %s", url, e)
            return []

        soup = BeautifulSoup(response.content, "lxml")
        listings: List[RFPListing] = []

        # Try to find RFP listings in common table/list structures
        # Look for links that might be RFPs
        links = soup.find_all("a", href=True)

        for link in links:
            text = link.get_text(strip=True)
            href = link.get("href", "")

            # Check if this looks like an RFP link
            if not self._looks_like_rfp(text, href):
                continue

            # Extract RFP ID, title, and due date
            rfp_id = self._extract_rfp_id(text, href)
            title = self._extract_title(text)
            due_date = self._extract_due_date(text, link)

            if not rfp_id or not title:
                continue

            # Filter by due date
            if due_date and not self._is_within_window(due_date, due_within_months):
                continue

            # Resolve PDF URL
            pdf_url = self._resolve_pdf_url(href, url)

            listings.append(
                RFPListing(
                    rfp_id=rfp_id,
                    title=title,
                    url=pdf_url,
                    due_date=due_date or "",
                )
            )

        return listings

    @staticmethod
    def _looks_like_rfp(text: str, href: str) -> bool:
        """Check if a link looks like an RFP."""
        text_lower = text.lower()
        href_lower = href.lower()

        # Keywords that suggest an RFP
        rfp_keywords = [
            "rfp",
            "tender",
            "bid",
            "procurement",
            "supply",
            "cable",
            "wire",
            "material",
        ]

        # Check if text or URL contains RFP keywords
        if any(keyword in text_lower for keyword in rfp_keywords):
            return True

        # Check if URL ends with .pdf
        if href_lower.endswith(".pdf"):
            return True

        return False

    @staticmethod
    def _extract_rfp_id(text: str, href: str) -> Optional[str]:
        """Extract RFP ID from text or URL."""
        # Try to find patterns like RFP-2025-001, TENDER/2025/001, etc.
        patterns = [
            r"RFP[-\s]?(\d{4}[-\s]?\d{3,})",
            r"TENDER[-\s]?(\d{4}[-\s]?\d{3,})",
            r"RFQ[-\s]?(\d{4}[-\s]?\d{3,})",
            r"(\d{4}[-\s]?RF[P|Q][-\s]?\d{3,})",
        ]

        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                return match.group(0).replace(" ", "-").upper()

        # Fallback: use first part of URL or text
        if href:
            parts = href.split("/")
            for part in reversed(parts):
                if part and part != "pdf" and len(part) > 5:
                    return part[:20]

        # Last resort: generate from text hash
        if text:
            return f"RFP-{abs(hash(text[:30])) % 10000:04d}"

        return None

    @staticmethod
    def _extract_title(text: str) -> str:
        """Extract RFP title from text."""
        # Clean up the text
        title = text.strip()
        # Remove extra whitespace
        title = re.sub(r"\s+", " ", title)
        # Limit length
        if len(title) > 100:
            title = title[:97] + "..."
        return title or "Untitled RFP"

    @staticmethod
    def _extract_due_date(text: str, element) -> Optional[str]:
        """Extract due date from text or nearby elements."""
        # Look for date patterns
        date_patterns = [
            r"(\d{4}[-/]\d{2}[-/]\d{2})",  # YYYY-MM-DD
            r"(\d{2}[-/]\d{2}[-/]\d{4})",  # DD-MM-YYYY
            r"(\d{1,2}\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4})",
        ]

        # Check text
        for pattern in date_patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                date_str = match.group(1)
                parsed = WebScraper._parse_date(date_str)
                if parsed:
                    return parsed.strftime("%Y-%m-%d")

        # Check parent/sibling elements
        if element:
            parent = element.parent
            if parent:
                parent_text = parent.get_text()
                for pattern in date_patterns:
                    match = re.search(pattern, parent_text, re.IGNORECASE)
                    if match:
                        date_str = match.group(1)
                        parsed = WebScraper._parse_date(date_str)
                        if parsed:
                            return parsed.strftime("%Y-%m-%d")

        return None

    @staticmethod
    def _parse_date(date_str: str) -> Optional[datetime]:
        """Parse a date string into a datetime object."""
        formats = [
            "%Y-%m-%d",
            "%Y/%m/%d",
            "%d-%m-%Y",
            "%d/%m/%Y",
            "%d %b %Y",
            "%d %B %Y",
        ]

        for fmt in formats:
            try:
                return datetime.strptime(date_str.strip(), fmt)
            except ValueError:
                continue

        return None

    @staticmethod
    def _resolve_pdf_url(href: str, base_url: str) -> str:
        """Resolve a relative or absolute PDF URL."""
        if not href:
            return ""

        # If already absolute, return as is
        if href.startswith("http://") or href.startswith("https://"):
            return href

        # If it's a PDF file, resolve relative to base
        if href.endswith(".pdf"):
            return urljoin(base_url, href)

        # Otherwise, assume it's a relative path
        return urljoin(base_url, href)

    @staticmethod
    def _is_within_window(due_date_str: str, months: int) -> bool:
        """Check if a due date is within the specified window."""
        try:
            due_date = datetime.strptime(due_date_str, "%Y-%m-%d").date()
            today = datetime.now().date()
            window_end = today + timedelta(days=30 * months)

            return today <= due_date <= window_end
        except (ValueError, TypeError):
            return True  # Include if we can't parse

