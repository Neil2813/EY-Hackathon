from io import BytesIO
from uuid import uuid4

from fastapi import APIRouter, HTTPException, status, UploadFile, File

from app.core.logging_config import get_logger
from app.agents.main_agent import MultiAgentController
from app.schemas.workflow import (
    FinalRFPResponse,
    WorkflowProgress,
    WorkflowStep,
    SalesAgentOutput,
    TechnicalAgentOutput,
    PricingAgentOutput,
)

logger = get_logger(__name__)
router = APIRouter(prefix="/api/v1", tags=["Workflow"])

_controller = MultiAgentController()
# In-memory store for workflow progress (use Redis/DB in production)
_workflow_store: dict[str, WorkflowProgress] = {}
_workflow_intermediates: dict[str, dict] = {}


@router.post(
    "/rfp/auto-bid",
    response_model=FinalRFPResponse,
    status_code=status.HTTP_200_OK,
    summary="Run full multi-agent RFP pipeline (prefetched RFPs)",
)
async def run_auto_bid() -> FinalRFPResponse:
    """
    Flow 1: Prefetched RFPs

    1. Sales Agent:
       - Reads rfp_listings.json
       - Filters by due date
       - Picks the best RFP
       - Opens the corresponding PDF and parses it (Gemini)
    2. Technical Agent:
       - Matches RFP specs to OEM SKUs
    3. Pricing Agent:
       - Computes material + test costs
    4. Main Agent:
       - Consolidates data
       - Calls Gemini for narrative summary
    """
    try:
        result = await _controller.run()
        return result
    except Exception as exc:  # noqa: BLE001
        logger.exception("Failed to run auto-bid pipeline: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to run RFP auto-bid pipeline.",
        )


@router.post(
    "/rfp/auto-bid-upload",
    response_model=FinalRFPResponse,
    status_code=status.HTTP_200_OK,
    summary="Run full multi-agent RFP pipeline for an uploaded PDF",
)
async def run_auto_bid_for_upload(
    file: UploadFile = File(..., description="RFP PDF to run through the full agentic pipeline"),
    rfp_id: str | None = None,
    title: str | None = None,
    due_date: str | None = None,
) -> FinalRFPResponse:
    """
    Flow 2: Uploaded PDF

    - You upload a PDF.
    - Backend parses it via RFPUnderstandingService (Gemini).
    - That parsed output is treated as the SalesAgentOutput.
    - Technical + Pricing + Main Agent run as usual.
    """
    if file.content_type not in ("application/pdf", "application/x-pdf"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only PDF files are supported.",
        )

    try:
        file_bytes = await file.read()
        buffer = BytesIO(file_bytes)

        # Use filename as synthetic ID/title if not provided
        effective_id = rfp_id or (file.filename or "RFP-UPLOAD")
        effective_title = title or (file.filename or "Uploaded RFP")
        effective_due = due_date or ""

        result = await _controller.run_for_pdf(
            file_obj=buffer,
            rfp_id=effective_id,
            title=effective_title,
            due_date=effective_due,
        )
        return result
    except HTTPException:
        raise
    except Exception as exc:  # noqa: BLE001
        logger.exception("Failed to run auto-bid pipeline for uploaded PDF: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to run RFP auto-bid pipeline for uploaded PDF.",
        )


@router.post(
    "/rfp/workflow/start",
    response_model=WorkflowProgress,
    status_code=status.HTTP_200_OK,
    summary="Start step-by-step workflow execution",
)
async def start_workflow() -> WorkflowProgress:
    """
    Start a new workflow execution.
    Returns workflow ID and initial progress.
    """
    workflow_id = str(uuid4())

    steps = [
        WorkflowStep(
            step_name="Sales Agent - RFP Discovery",
            agent_name="Sales Agent",
            status="pending",
        ),
        WorkflowStep(
            step_name="Sales Agent - RFP Parsing",
            agent_name="Sales Agent",
            status="pending",
        ),
        WorkflowStep(
            step_name="Main Agent - Prepare Summaries",
            agent_name="Main Agent",
            status="pending",
        ),
        WorkflowStep(
            step_name="Technical Agent - Product Matching",
            agent_name="Technical Agent",
            status="pending",
        ),
        WorkflowStep(
            step_name="Pricing Agent - Cost Calculation",
            agent_name="Pricing Agent",
            status="pending",
        ),
        WorkflowStep(
            step_name="Main Agent - Final Consolidation",
            agent_name="Main Agent",
            status="pending",
        ),
    ]

    progress = WorkflowProgress(
        workflow_id=workflow_id,
        current_step=0,
        total_steps=len(steps),
        steps=steps,
    )

    _workflow_store[workflow_id] = progress
    _workflow_intermediates[workflow_id] = {}
    logger.info("Started workflow %s", workflow_id)

    return progress


@router.get(
    "/rfp/workflow/{workflow_id}",
    response_model=WorkflowProgress,
    status_code=status.HTTP_200_OK,
    summary="Get workflow progress",
)
async def get_workflow_progress(workflow_id: str) -> WorkflowProgress:
    """Get current progress of a workflow."""
    if workflow_id not in _workflow_store:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Workflow {workflow_id} not found",
        )
    return _workflow_store[workflow_id]


@router.post(
    "/rfp/workflow/{workflow_id}/execute",
    response_model=WorkflowProgress,
    status_code=status.HTTP_200_OK,
    summary="Execute workflow step-by-step",
)
async def execute_workflow(workflow_id: str) -> WorkflowProgress:
    """
    Execute the workflow step by step.
    Updates progress after each step.
    """
    if workflow_id not in _workflow_store:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Workflow {workflow_id} not found",
        )

    progress = _workflow_store[workflow_id]
    intermediates = _workflow_intermediates[workflow_id]

    try:
        import asyncio

        loop = asyncio.get_event_loop()

        # Step 1: Sales Agent - RFP Discovery
        if progress.current_step == 0:
            progress.steps[0].status = "running"
            _workflow_store[workflow_id] = progress

            sales_output = await loop.run_in_executor(
                None, _controller._main_agent._run_sales
            )
            intermediates["sales_output"] = sales_output

            progress.steps[0].status = "completed"
            progress.steps[0].output = {
                "rfp_id": sales_output.rfp_id,
                "title": sales_output.title,
                "due_date": sales_output.due_date,
            }
            progress.steps[0].summary = (
                f"Found RFP: {sales_output.title} (Due: {sales_output.due_date})"
            )
            progress.current_step = 1
            _workflow_store[workflow_id] = progress

        # Step 2: Sales Agent - RFP Parsing (already done in step 1)
        if progress.current_step == 1:
            sales_output = intermediates["sales_output"]
            progress.steps[1].status = "completed"
            progress.steps[1].summary = "RFP PDF parsed successfully"
            progress.steps[1].output = {
                "scope_of_supply": sales_output.scope_of_supply[:200] + "...",
                "technical_specifications": sales_output.technical_specifications[:200]
                + "...",
            }
            progress.current_step = 2
            _workflow_store[workflow_id] = progress

        # Step 3: Main Agent - Prepare Summaries
        if progress.current_step == 2:
            progress.steps[2].status = "running"
            _workflow_store[workflow_id] = progress

            sales_output = intermediates["sales_output"]
            technical_summary = (
                _controller._main_agent._prepare_technical_summary(sales_output)
            )

            progress.steps[2].status = "completed"
            progress.steps[2].summary = (
                "Prepared contextual summaries for Technical and Pricing agents"
            )
            progress.steps[2].output = {"summary_length": len(technical_summary)}
            progress.current_step = 3
            _workflow_store[workflow_id] = progress

        # Step 4: Technical Agent
        if progress.current_step == 3:
            progress.steps[3].status = "running"
            _workflow_store[workflow_id] = progress

            sales_output = intermediates["sales_output"]
            technical_output = await loop.run_in_executor(
                None, _controller._main_agent._run_technical, sales_output
            )
            intermediates["technical_output"] = technical_output

            progress.steps[3].status = "completed"
            progress.steps[3].summary = (
                f"Matched {len(technical_output.items)} products to OEM SKUs"
            )
            progress.steps[3].output = {
                "items_count": len(technical_output.items),
                "items": [
                    {
                        "description": item.rfp_item.description,
                        "chosen_sku": item.chosen_sku,
                        "top_match_percent": (
                            item.top_matches[0].match_percent
                            if item.top_matches
                            else 0
                        ),
                    }
                    for item in technical_output.items
                ],
            }
            progress.current_step = 4
            _workflow_store[workflow_id] = progress

        # Step 5: Pricing Agent
        if progress.current_step == 4:
            progress.steps[4].status = "running"
            _workflow_store[workflow_id] = progress

            sales_output = intermediates["sales_output"]
            technical_output = intermediates["technical_output"]
            pricing_output = await loop.run_in_executor(
                None,
                _controller._main_agent._run_pricing,
                technical_output,
                sales_output.testing_requirements,
            )
            intermediates["pricing_output"] = pricing_output

            progress.steps[4].status = "completed"
            progress.steps[4].summary = (
                f"Calculated total bid value: ₹{pricing_output.total_bid_value:,.2f}"
            )
            progress.steps[4].output = {
                "total_bid_value": pricing_output.total_bid_value,
                "items_count": len(pricing_output.items),
            }
            progress.current_step = 5
            _workflow_store[workflow_id] = progress

        # Step 6: Main Agent - Final Consolidation
        if progress.current_step == 5:
            progress.steps[5].status = "running"
            _workflow_store[workflow_id] = progress

            sales_output = intermediates["sales_output"]
            technical_output = intermediates["technical_output"]
            pricing_output = intermediates["pricing_output"]

            from app.agents.main_agent import AgentBundle

            bundle = AgentBundle(
                sales_output=sales_output,
                technical_output=technical_output,
                pricing_output=pricing_output,
            )

            narrative = await _controller._main_agent._generate_narrative(bundle)

            final_response = FinalRFPResponse(
                rfp_id=sales_output.rfp_id,
                rfp_title=sales_output.title,
                rfp_due_date=sales_output.due_date,
                scope_of_supply=sales_output.scope_of_supply,
                technical_specifications=sales_output.technical_specifications,
                testing_requirements=sales_output.testing_requirements,
                technical_items=technical_output.items,
                pricing=pricing_output,
                total_bid_value=pricing_output.total_bid_value,
                notes="Auto-generated via Sales/Technical/Pricing agents",
                narrative_summary=narrative,
            )

            progress.steps[5].status = "completed"
            progress.steps[5].summary = "Final RFP response consolidated"
            progress.final_response = final_response
            progress.current_step = 6
            _workflow_store[workflow_id] = progress

        return progress

    except Exception as e:
        logger.exception("Workflow execution error: %s", e)
        if progress.current_step < len(progress.steps):
            progress.steps[progress.current_step].status = "error"
            progress.steps[progress.current_step].error = str(e)
        _workflow_store[workflow_id] = progress
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Workflow execution failed: {str(e)}",
        )
