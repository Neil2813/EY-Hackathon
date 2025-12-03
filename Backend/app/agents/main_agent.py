import asyncio
from dataclasses import dataclass
from typing import BinaryIO

from app.core.logging_config import get_logger
from app.agents.sales_agent import build_sales_agent_from_env
from app.agents.technical_agent import build_technical_agent_from_env
from app.agents.pricing_agent import build_pricing_agent_from_env
from app.schemas.workflow import (
    FinalRFPResponse,
    SalesAgentOutput,
    TechnicalAgentOutput,
    PricingAgentOutput,
)
from app.services.gemini_client import GeminiClient
from app.services.rfp_understanding import RFPUnderstandingService

logger = get_logger(__name__)


@dataclass
class AgentBundle:
    sales_output: SalesAgentOutput
    technical_output: TechnicalAgentOutput
    pricing_output: PricingAgentOutput


class MainAgent:
    """
    Boss Agent

    Orchestrates:
    - Sales Agent
    - Technical Agent
    - Pricing Agent
    - Final narrative via Gemini+LangChain

    Supports:
    - Standard flow (SalesAgent + prefetched RFPs)
    - Uploaded PDF flow (no SalesAgent discovery)
    """

    def __init__(self) -> None:
        # Agents for the “discovery” path
        self._sales_agent = build_sales_agent_from_env()
        self._technical_agent = build_technical_agent_from_env()
        self._pricing_agent = build_pricing_agent_from_env()

        # Shared LLM client
        self._gemini = GeminiClient()

        # Direct RFP parser for uploaded-PDF flow
        self._rfp_service = RFPUnderstandingService()

    # -------------------- internal helpers --------------------

    def _run_sales(self) -> SalesAgentOutput:
        logger.info("MainAgent: running Sales Agent")
        return self._sales_agent.run()

    def _prepare_technical_summary(self, sales_output: SalesAgentOutput) -> str:
        """
        Prepare a contextual summary for the Technical Agent.
        Focuses on products in scope of supply and technical specifications.
        """
        summary_parts = [
            f"RFP ID: {sales_output.rfp_id}",
            f"Title: {sales_output.title}",
            "",
            "=== PRODUCTS IN SCOPE OF SUPPLY ===",
            sales_output.scope_of_supply,
            "",
            "=== TECHNICAL SPECIFICATIONS ===",
            sales_output.technical_specifications,
            "",
            "INSTRUCTIONS FOR TECHNICAL AGENT:",
            "- Analyze each product in the scope of supply",
            "- Match RFP technical specifications to OEM product SKUs",
            "- Recommend top 3 matching SKUs for each product with spec match percentages",
            "- Create comparison tables showing RFP requirements vs. OEM product specs",
            "- Select the best matching SKU for each product",
        ]
        return "\n".join(summary_parts)

    def _prepare_pricing_summary(
        self, sales_output: SalesAgentOutput, technical_output: TechnicalAgentOutput
    ) -> str:
        """
        Prepare a contextual summary for the Pricing Agent.
        Focuses on testing requirements and selected products.
        """
        summary_parts = [
            f"RFP ID: {sales_output.rfp_id}",
            f"Title: {sales_output.title}",
            "",
            "=== TESTING AND ACCEPTANCE REQUIREMENTS ===",
            sales_output.testing_requirements,
            "",
            "=== SELECTED PRODUCTS FROM TECHNICAL AGENT ===",
        ]

        for item_result in technical_output.items:
            summary_parts.append(
                f"- {item_result.rfp_item.description} | "
                f"SKU: {item_result.chosen_sku or 'TBD'} | "
                f"Quantity: {item_result.rfp_item.quantity}"
            )

        summary_parts.extend([
            "",
            "INSTRUCTIONS FOR PRICING AGENT:",
            "- Assign unit prices for each selected SKU from the pricing table",
            "- Calculate material costs (unit price × quantity) for each product",
            "- Identify tests required from the testing requirements",
            "- Assign prices for each test from the test pricing table",
            "- Calculate total cost per product (material + tests)",
            "- Consolidate total bid value",
        ])

        return "\n".join(summary_parts)

    def _run_technical(self, sales_output: SalesAgentOutput) -> TechnicalAgentOutput:
        logger.info("MainAgent: running Technical Agent")
        # Prepare contextual summary for Technical Agent
        technical_summary = self._prepare_technical_summary(sales_output)
        logger.info("MainAgent: prepared technical summary (%d chars)", len(technical_summary))
        return self._technical_agent.run(sales_output)

    def _run_pricing(
        self,
        technical_output: TechnicalAgentOutput,
        testing_requirements_text: str,
    ) -> PricingAgentOutput:
        logger.info("MainAgent: running Pricing Agent")
        # Note: We don't have sales_output here, but we can still prepare summary
        # For now, we'll use the testing requirements text directly
        return self._pricing_agent.run(technical_output, testing_requirements_text)

    async def _generate_narrative(self, bundle: AgentBundle) -> str:
        """
        Use Gemini via LangChain to generate final summary.
        """
        ctx_lines = [
            f"RFP ID: {bundle.sales_output.rfp_id}",
            f"Title: {bundle.sales_output.title}",
            f"Due Date: {bundle.sales_output.due_date}",
            "",
            "Scope of Supply:",
            bundle.sales_output.scope_of_supply,
            "",
            "Technical Specifications:",
            bundle.sales_output.technical_specifications,
            "",
            "Testing Requirements:",
            bundle.sales_output.testing_requirements,
            "",
            f"Total Bid Value: {bundle.pricing_output.total_bid_value}",
            "",
            "Items:",
        ]

        for item in bundle.pricing_output.items:
            ctx_lines.append(
                f"- {item.rfp_item.description} | SKU={item.chosen_sku} | "
                f"Qty={item.quantity} | Total={item.total_cost}"
            )

        context = "\n".join(ctx_lines)
        return self._gemini.generate_narrative_summary(context)

    # -------------------- flow 1: prefetched RFPs --------------------

    async def run_full_pipeline(self) -> FinalRFPResponse:
        """
        Standard flow:

        1. Sales Agent → pick RFP from listings + parse PDF
        2. Technical Agent → spec matching
        3. Pricing Agent → material + tests + totals
        4. Gemini → narrative summary
        """
        loop = asyncio.get_event_loop()

        # Sales Agent (sync + IO heavy)
        sales_output = await loop.run_in_executor(None, self._run_sales)

        # Technical Agent
        technical_output = await loop.run_in_executor(
            None, self._run_technical, sales_output
        )

        # Pricing Agent
        pricing_output = await loop.run_in_executor(
            None,
            self._run_pricing,
            technical_output,
            sales_output.testing_requirements,
        )

        bundle = AgentBundle(
            sales_output=sales_output,
            technical_output=technical_output,
            pricing_output=pricing_output,
        )

        narrative = await self._generate_narrative(bundle)

        logger.info(
            "MainAgent: full pipeline (prefetched) completed for RFP %s",
            sales_output.rfp_id,
        )

        return FinalRFPResponse(
            rfp_id=sales_output.rfp_id,
            rfp_title=sales_output.title,
            rfp_due_date=sales_output.due_date,
            scope_of_supply=sales_output.scope_of_supply,
            technical_specifications=sales_output.technical_specifications,
            testing_requirements=sales_output.testing_requirements,
            technical_items=technical_output.items,
            pricing=pricing_output,
            total_bid_value=pricing_output.total_bid_value,
            notes="Auto-generated via Sales/Technical/Pricing agents (Gemini + LangChain, prefetched RFP).",
            narrative_summary=narrative,
        )

    # -------------------- flow 2: uploaded PDF --------------------

    async def run_pipeline_for_uploaded_pdf(
        self,
        file_obj: BinaryIO,
        rfp_id: str = "RFP-UPLOAD",
        title: str = "Uploaded RFP",
        due_date: str = "",
    ) -> FinalRFPResponse:
        """
        Alternative flow for ad-hoc uploaded PDFs:

        1. Parse PDF directly using RFPUnderstandingService (Gemini).
        2. Treat parsed sections as SalesAgentOutput.
        3. Run Technical + Pricing + Narrative as usual.
        """

        # 1) Parse RFP PDF → scope/specs/tests
        logger.info("MainAgent: parsing uploaded RFP PDF for dynamic pipeline")
        parsed = self._rfp_service.parse_rfp_pdf(file_obj)

        sales_output = SalesAgentOutput(
            rfp_id=rfp_id,
            title=title,
            pdf_path="uploaded",  # not stored on disk in this flow
            scope_of_supply=parsed.scope_of_supply,
            technical_specifications=parsed.technical_specifications,
            testing_requirements=parsed.testing_requirements,
            due_date=due_date or "",
        )

        loop = asyncio.get_event_loop()

        # 2) Technical Agent
        technical_output = await loop.run_in_executor(
            None, self._run_technical, sales_output
        )

        # 3) Pricing Agent
        pricing_output = await loop.run_in_executor(
            None,
            self._run_pricing,
            technical_output,
            sales_output.testing_requirements,
        )

        bundle = AgentBundle(
            sales_output=sales_output,
            technical_output=technical_output,
            pricing_output=pricing_output,
        )

        # 4) Narrative summary
        narrative = await self._generate_narrative(bundle)

        logger.info(
            "MainAgent: full pipeline (uploaded PDF) completed for synthetic RFP ID %s",
            rfp_id,
        )

        return FinalRFPResponse(
            rfp_id=sales_output.rfp_id,
            rfp_title=sales_output.title,
            rfp_due_date=sales_output.due_date,
            scope_of_supply=sales_output.scope_of_supply,
            technical_specifications=sales_output.technical_specifications,
            testing_requirements=sales_output.testing_requirements,
            technical_items=technical_output.items,
            pricing=pricing_output,
            total_bid_value=pricing_output.total_bid_value,
            notes="Auto-generated via Sales/Technical/Pricing agents (Gemini + LangChain, uploaded PDF).",
            narrative_summary=narrative,
        )


class MultiAgentController:
    """
    Multi-Agent Controller

    - run()        → uses SalesAgent + listings (auto-discovery flow)
    - run_for_pdf → accepts an uploaded PDF and runs the same pipeline
    """

    def __init__(self) -> None:
        self._main_agent = MainAgent()

    async def run(self) -> FinalRFPResponse:
        return await self._main_agent.run_full_pipeline()

    async def run_for_pdf(
        self,
        file_obj: BinaryIO,
        rfp_id: str = "RFP-UPLOAD",
        title: str = "Uploaded RFP",
        due_date: str = "",
    ) -> FinalRFPResponse:
        return await self._main_agent.run_pipeline_for_uploaded_pdf(
            file_obj=file_obj,
            rfp_id=rfp_id,
            title=title,
            due_date=due_date,
        )
