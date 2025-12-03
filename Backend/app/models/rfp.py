from dataclasses import dataclass
from typing import Optional, Dict, Any


@dataclass
class RFPSections:
    """
    Domain model for parsed RFP.
    """

    scope_of_supply: str
    technical_specifications: str
    testing_requirements: str
    raw_model_json: Optional[Dict[str, Any]] = None
