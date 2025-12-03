from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes_rfp import router as rfp_router
from app.api.routes_workflow import router as workflow_router
from app.core.config import get_settings
from app.core.logging_config import configure_logging, get_logger

configure_logging()
logger = get_logger(__name__)
settings = get_settings()

app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description=(
        "Backend service that:\n"
        "- Parses RFP PDFs into Scope/Specs/Testing using Gemini + LangChain.\n"
        "- Runs Sales / Technical / Pricing agents.\n"
        "- Generates a final RFP response JSON for auto-bidding.\n"
    ),
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def on_startup() -> None:
    logger.info("Starting %s v%s", settings.app_name, settings.app_version)
    logger.info("Using Gemini model: %s", settings.gemini_model)


# RFP parser endpoints
app.include_router(rfp_router)

# Multi-agent workflow endpoints
app.include_router(workflow_router)
