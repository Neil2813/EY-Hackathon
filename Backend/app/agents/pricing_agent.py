import csv
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, List

from app.core.config import get_settings
from app.core.logging_config import get_logger
from app.schemas.workflow import (
    TechnicalAgentOutput,
    PricingAgentOutput,
    ItemPricing,
)

logger = get_logger(__name__)


@dataclass
class PricingTables:
    unit_prices: Dict[str, float]
    test_prices: Dict[str, float]


class PricingAgent:
    """
    STEP 3: Pricing Agent
    """

    def __init__(self, tables: PricingTables) -> None:
        self._tables = tables

    def _price_item(
        self,
        chosen_sku: str,
        quantity: int,
        tests: List[str],
        rfp_item,
    ) -> ItemPricing:
        unit_price = self._tables.unit_prices.get(chosen_sku, 0.0)
        material_cost = unit_price * quantity

        tests_cost = 0.0
        applied_tests: List[str] = []
        for test_name in tests:
            name = test_name.strip()
            if not name:
                continue
            price = self._tables.test_prices.get(name, 0.0)
            if price > 0:
                applied_tests.append(name)
            tests_cost += price

        total_cost = material_cost + tests_cost

        return ItemPricing(
            rfp_item=rfp_item,
            chosen_sku=chosen_sku,
            unit_price=unit_price,
            quantity=quantity,
            material_cost=material_cost,
            tests_cost=tests_cost,
            total_cost=total_cost,
            tests_applied=applied_tests,
        )

    def run(
        self,
        technical_output: TechnicalAgentOutput,
        testing_requirements_text: str,
    ) -> PricingAgentOutput:
        tests = [
            line.lstrip("-").strip()
            for line in testing_requirements_text.splitlines()
            if line.strip()
        ]

        priced_items: List[ItemPricing] = []
        total_bid_value = 0.0

        for item_result in technical_output.items:
            chosen_sku = item_result.chosen_sku
            if not chosen_sku:
                logger.warning(
                    "No chosen SKU for item '%s'; skipping pricing.",
                    item_result.rfp_item.description,
                )
                continue

            qty = item_result.rfp_item.quantity or 1
            pricing = self._price_item(chosen_sku, qty, tests, item_result.rfp_item)
            priced_items.append(pricing)
            total_bid_value += pricing.total_cost

        return PricingAgentOutput(
            items=priced_items,
            total_bid_value=round(total_bid_value, 2),
        )


def _load_unit_prices(path: Path) -> Dict[str, float]:
    logger.info("Loading product prices from %s", path)
    prices: Dict[str, float] = {}
    with path.open("r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            sku = row.get("sku") or row.get("product_sku")
            if not sku:
                continue
            try:
                price = float(row.get("unit_price", "0") or 0)
            except ValueError:
                price = 0.0
            prices[sku] = price
    return prices


def _load_test_prices(path: Path) -> Dict[str, float]:
    logger.info("Loading test prices from %s", path)
    prices: Dict[str, float] = {}
    with path.open("r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            name = row.get("test_name")
            if not name:
                continue
            try:
                price = float(row.get("test_price", "0") or 0)
            except ValueError:
                price = 0.0
            prices[name.strip()] = price
    return prices


def build_pricing_agent_from_env() -> PricingAgent:
    settings = get_settings()
    tables = PricingTables(
        unit_prices=_load_unit_prices(Path(settings.product_prices_path)),
        test_prices=_load_test_prices(Path(settings.test_prices_path)),
    )
    return PricingAgent(tables)
