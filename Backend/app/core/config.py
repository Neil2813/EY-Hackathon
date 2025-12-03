import os
from functools import lru_cache

from dotenv import load_dotenv, find_dotenv


# Locate and load .env
dotenv_path = find_dotenv()
if dotenv_path:
    print(f"[config] Loading .env from: {dotenv_path}")
    load_dotenv(dotenv_path)
else:
    print("[config] WARNING: .env file not found")


class Settings:
    """
    Central config object.
    """

    def __init__(self) -> None:
        # Prefer GOOGLE_API_KEY (LangChain), fallback to GEMINI_API_KEY
        api_key = os.getenv("GOOGLE_API_KEY") or os.getenv("GEMINI_API_KEY")
        self.gemini_api_key: str | None = api_key

        # Make sure LangChain can see GOOGLE_API_KEY
        if api_key and "GOOGLE_API_KEY" not in os.environ:
            os.environ["GOOGLE_API_KEY"] = api_key

        # Model name for Gemini
        self.gemini_model: str = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")

        # Max pages to parse from PDFs
        max_pages_env = os.getenv("RFP_MAX_PAGES", "30")
        try:
            self.rfp_max_pages: int = int(max_pages_env)
        except ValueError:
            self.rfp_max_pages = 30

        # Data paths
        self.rfp_listings_path: str = os.getenv("RFP_LISTINGS_PATH", "data/rfp_listings.json")
        self.rfp_pdf_base_dir: str = os.getenv("RFP_PDF_BASE_DIR", "data/rfps")
        self.oem_products_path: str = os.getenv("OEM_PRODUCTS_PATH", "data/oem_products.csv")
        self.product_prices_path: str = os.getenv("PRODUCT_PRICES_PATH", "data/product_prices.csv")
        self.test_prices_path: str = os.getenv("TEST_PRICES_PATH", "data/test_prices.csv")
        
        # RFP URLs to scan (comma-separated)
        self.rfp_urls: str = os.getenv("RFP_URLS", "")

        # Metadata
        self.app_name: str = "RFP Multi-Agent Engine (Gemini + LangChain)"
        self.app_version: str = "1.0.0"

    def validate(self) -> None:
        if not self.gemini_api_key:
            raise RuntimeError(
                "Gemini API key is not set. "
                "Set GOOGLE_API_KEY or GEMINI_API_KEY in your environment / .env."
            )


@lru_cache
def get_settings() -> Settings:
    settings = Settings()
    settings.validate()
    return settings
