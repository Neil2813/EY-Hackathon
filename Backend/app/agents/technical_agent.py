import csv
import os
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, List, Optional, Tuple

from app.core.config import get_settings
from app.core.logging_config import get_logger
from app.schemas.workflow import (
    RFPItem,
    SKUMatch,
    TechnicalAgentItemResult,
    TechnicalAgentOutput,
    SalesAgentOutput,
)

logger = get_logger(__name__)


@dataclass
class OEMProduct:
    sku: str
    conductor_size_sqmm: Optional[int]
    cores: Optional[int]
    conductor_material: Optional[str]
    insulation: Optional[str]
    voltage_rating: Optional[int]
    armour_type: Optional[str]


class TechnicalAgent:
    """
    STEP 2: Technical Agent

    - Load OEM spec repo (CSV).
    - Parse scope lines into RFPItems.
    - Compute equal-weighted similarity per attribute.
    - Return Top 3 SKUs + comparison tables + chosen SKU.
    """

    def __init__(self, products_path: Path) -> None:
        self._products_path = products_path
        self._products: List[OEMProduct] = self._load_products()

    def _load_products(self) -> List[OEMProduct]:
        logger.info("Loading OEM products from %s", self._products_path)
        products: List[OEMProduct] = []

        with self._products_path.open("r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                products.append(
                    OEMProduct(
                        sku=row.get("sku") or row.get("product_sku") or "",
                        conductor_size_sqmm=_try_int(row.get("conductor_size_sqmm")),
                        cores=_try_int(row.get("cores")),
                        conductor_material=_norm_str(row.get("conductor_material")),
                        insulation=_norm_str(row.get("insulation")),
                        voltage_rating=_try_int(row.get("voltage_rating")),
                        armour_type=_norm_str(row.get("armour_type")),
                    )
                )

        logger.info("Loaded %d OEM SKUs", len(products))
        return products

    @staticmethod
    def _parse_scope_items(scope_text: str) -> List[RFPItem]:
        items: List[RFPItem] = []

        for raw_line in scope_text.splitlines():
            line = raw_line.strip()
            if not line:
                continue
            if line.startswith("-"):
                line = line.lstrip("-").strip()
            else:
                continue  # only handle bullet lines for now

            size = _search_int(line, r"(\d+)\s*sqmm")
            cores = _search_int(line, r"(\d+)\s*core")
            voltage = _search_int(line, r"(\d+)\s*V")
            material = _search_choice(line, ["copper", "aluminium", "aluminum"])
            insulation = _search_choice(line, ["XLPE", "PVC"])
            armour = _search_choice(line, ["steel armour", "aluminium armour", "armour"])
            quantity = _search_int(line, r"^(\d+)\s*(m|meter|metre|meters|metres)\b") or 1

            items.append(
                RFPItem(
                    description=line,
                    conductor_size_sqmm=size,
                    cores=cores,
                    conductor_material=material,
                    insulation=insulation,
                    voltage_rating=voltage,
                    armour_type=armour,
                    quantity=quantity,
                )
            )

        logger.info("Parsed %d scope items from RFP scope text", len(items))
        return items

    def _compute_match(
        self, rfp_item: RFPItem, sku: OEMProduct
    ) -> Tuple[float, Dict[str, Dict[str, Optional[str]]]]:
        attributes = [
            "conductor_size_sqmm",
            "cores",
            "conductor_material",
            "insulation",
            "voltage_rating",
            "armour_type",
        ]

        matches = 0
        total = 0
        diffs: Dict[str, Dict[str, Optional[str]]] = {}

        for attr in attributes:
            r_val = getattr(rfp_item, attr)
            s_val = getattr(sku, attr)

            if r_val is None and s_val is None:
                continue

            total += 1
            if _equal_norm(r_val, s_val):
                matches += 1
            else:
                diffs[attr] = {"rfp": _to_str(r_val), "sku": _to_str(s_val)}

        score = (matches / total) * 100.0 if total > 0 else 0.0
        return score, diffs

    def _top_matches_for_item(
        self, rfp_item: RFPItem, top_n: int = 3
    ) -> List[SKUMatch]:
        scored: List[Tuple[OEMProduct, float, Dict[str, Dict[str, Optional[str]]]]] = []

        for sku in self._products:
            score, diffs = self._compute_match(rfp_item, sku)
            scored.append((sku, score, diffs))

        scored.sort(key=lambda t: t[1], reverse=True)
        top = scored[:top_n]

        return [
            SKUMatch(sku=prod.sku, match_percent=round(score, 2), differences=diffs)
            for (prod, score, diffs) in top
        ]

    @staticmethod
    def _build_comparison_table(
        rfp_item: RFPItem,
        matches: List[SKUMatch],
        sku_lookup: Dict[str, OEMProduct],
    ) -> List[Dict[str, Optional[str]]]:
        attrs = [
            "conductor_size_sqmm",
            "cores",
            "conductor_material",
            "insulation",
            "voltage_rating",
            "armour_type",
        ]

        rows: List[Dict[str, Optional[str]]] = []

        for attr in attrs:
            row: Dict[str, Optional[str]] = {"parameter": attr}
            row["rfp"] = _to_str(getattr(rfp_item, attr))

            for idx, match in enumerate(matches):
                key = f"sku{idx + 1}"
                prod = sku_lookup.get(match.sku)
                row[key] = _to_str(getattr(prod, attr) if prod else None)

            rows.append(row)

        return rows

    def run(self, sales_output: SalesAgentOutput) -> TechnicalAgentOutput:
        items = self._parse_scope_items(sales_output.scope_of_supply)
        sku_lookup: Dict[str, OEMProduct] = {p.sku: p for p in self._products}

        results: List[TechnicalAgentItemResult] = []

        for item in items:
            matches = self._top_matches_for_item(item)
            chosen_sku = matches[0].sku if matches else None
            comparison_table = self._build_comparison_table(item, matches, sku_lookup)

            results.append(
                TechnicalAgentItemResult(
                    rfp_item=item,
                    top_matches=matches,
                    chosen_sku=chosen_sku,
                    comparison_table=comparison_table,
                )
            )

        return TechnicalAgentOutput(items=results)


def _try_int(v: Optional[str]) -> Optional[int]:
    if v is None:
        return None
    v = v.strip()
    if not v:
        return None
    try:
        return int(v)
    except ValueError:
        return None


def _norm_str(v: Optional[str]) -> Optional[str]:
    if v is None:
        return None
    v = v.strip()
    return v or None


def _to_str(v: Optional[object]) -> Optional[str]:
    if v is None:
        return None
    return str(v)


def _search_int(text: str, pattern: str) -> Optional[int]:
    m = re.search(pattern, text, flags=re.IGNORECASE)
    if not m:
        return None
    try:
        return int(m.group(1))
    except (IndexError, ValueError):
        return None


def _search_choice(text: str, choices: List[str]) -> Optional[str]:
    lower = text.lower()
    for c in choices:
        if c.lower() in lower:
            return c
    return None


def _equal_norm(a: Optional[object], b: Optional[object]) -> bool:
    if a is None or b is None:
        return False
    if isinstance(a, int) and isinstance(b, int):
        return a == b
    return str(a).strip().lower() == str(b).strip().lower()


def build_technical_agent_from_env() -> TechnicalAgent:
    settings = get_settings()
    return TechnicalAgent(Path(settings.oem_products_path))
