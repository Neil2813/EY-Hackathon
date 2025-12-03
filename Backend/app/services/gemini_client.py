import json
from typing import Any, Dict, List, Optional

from langchain_google_genai import ChatGoogleGenerativeAI

from app.core.config import get_settings
from app.core.logging_config import get_logger

logger = get_logger(__name__)


class GeminiClient:
    """
    LangChain-based Gemini client.

    - JSON mode for structured RFP extraction (scope/specs/tests)
    - Text mode for narrative / summaries
    """

    def __init__(self) -> None:
        settings = get_settings()
        self._model_name = settings.gemini_model

        # JSON-mode chat for structured outputs
        # response_mime_type forces JSON from Gemini 2.5 Flash
        self._json_chat = ChatGoogleGenerativeAI(
            model=self._model_name,
            temperature=0.0,
            model_kwargs={"response_mime_type": "application/json"},
        )

        # Text-mode chat for narratives
        self._text_chat = ChatGoogleGenerativeAI(
            model=self._model_name,
            temperature=0.2,
        )

        logger.info("GeminiClient initialized with model: %s", self._model_name)

    # -------------------------------------------------------------------------
    # Internal helpers
    # -------------------------------------------------------------------------

    @staticmethod
    def _normalize_content(content: Any) -> str:
        """
        LangChain + Gemini can return:
        - plain str
        - list[dict] with {"type": "text", "text": "..."}
        - list[objects]
        We flatten into a single string.
        """
        # Plain string
        if isinstance(content, str):
            return content

        # List of parts (common for Google models)
        if isinstance(content, list):
            parts: List[str] = []
            for part in content:
                # Newer message format: {"type": "text", "text": "..."}
                if isinstance(part, dict) and "text" in part:
                    parts.append(str(part["text"]))
                else:
                    parts.append(str(part))
            return "".join(parts)

        # Fallback: just stringify
        return str(content)

    @staticmethod
    def _strip_code_fences(text: str) -> str:
        """
        If model wraps JSON in ``` or ```json fences, strip them.
        """
        t = text.strip()

        if t.startswith("```"):
            # Remove first fence line
            lines = t.splitlines()
            if not lines:
                return t

            # Drop first line (``` or ```json)
            lines = lines[1:]

            # Drop trailing ``` if present
            if lines and lines[-1].strip().startswith("```"):
                lines = lines[:-1]

            return "\n".join(lines).strip()

        return t

    @staticmethod
    def _try_parse_json(raw_text: str) -> Optional[Dict[str, Any]]:
        """
        Try to parse JSON with a couple of fallbacks:
        - direct json.loads
        - strip code fences
        - extract substring between first '{' and last '}'
        """
        text = raw_text.strip()

        # 1) Direct attempt
        try:
            return json.loads(text)
        except json.JSONDecodeError:
            pass

        # 2) Strip ``` fences and retry
        stripped = GeminiClient._strip_code_fences(text)
        if stripped != text:
            try:
                return json.loads(stripped)
            except json.JSONDecodeError:
                pass

        # 3) Extract substring between first '{' and last '}' and retry
        first = text.find("{")
        last = text.rfind("}")
        if first != -1 and last != -1 and last > first:
            candidate = text[first : last + 1]
            try:
                return json.loads(candidate)
            except json.JSONDecodeError:
                pass

        return None

    # -------------------------------------------------------------------------
    # Public methods
    # -------------------------------------------------------------------------

    def extract_rfp_sections(self, rfp_text: str) -> Dict[str, Any]:
        """
        Force Gemini 2.5 Flash to return STRICT JSON for RFP extraction.

        Target schema:
        {
          "scope_of_supply": "string",
          "technical_specifications": "string",
          "testing_requirements": "string"
        }
        """

        system_prompt = (
            "You are an enterprise RFP parsing engine.\n\n"
            "Your ONLY job is to read RFP text and return a STRICT JSON object "
            "with exactly these keys:\n"
            "{\n"
            '  \"scope_of_supply\": \"string\",\n'
            '  \"technical_specifications\": \"string\",\n'
            '  \"testing_requirements\": \"string\"\n'
            "}\n\n"
            "Hard rules:\n"
            "- DO NOT include any other keys.\n"
            "- DO NOT include comments, explanations, or markdown.\n"
            "- DO NOT wrap the JSON in code fences.\n"
            "- If a section does not exist in the RFP, set that field to \"\" (empty string).\n"
        )

        user_prompt = (
            "Here is the raw RFP text. Extract the three sections according to the schema.\n"
            "RFP_TEXT_START\n"
            f"{rfp_text}\n"
            "RFP_TEXT_END\n"
        )

        logger.info("Calling Gemini JSON mode for RFP extraction")

        # Use explicit system + user messages
        result = self._json_chat.invoke(
            [
                ("system", system_prompt),
                ("user", user_prompt),
            ]
        )

        raw_content = result.content if result is not None else ""
        raw_text = self._normalize_content(raw_content)

        logger.debug("Raw JSON-mode response (truncated): %s", raw_text[:500])

        parsed = self._try_parse_json(raw_text)

        if parsed is None:
            logger.error("Failed to parse JSON from model after multiple attempts.")
            # Fallback structure so rest of pipeline does not blow up
            return {
                "scope_of_supply": "",
                "technical_specifications": "",
                "testing_requirements": "",
                "_raw_text": raw_text,
            }

        # Ensure keys exist and are strings
        scope = str(parsed.get("scope_of_supply", "") or "").strip()
        tech = str(parsed.get("technical_specifications", "") or "").strip()
        tests = str(parsed.get("testing_requirements", "") or "").strip()

        clean = {
            "scope_of_supply": scope,
            "technical_specifications": tech,
            "testing_requirements": tests,
        }

        # Keep raw if you want debugging
        if "_raw_text" not in parsed:
            clean["_raw_text"] = raw_text

        return clean

    def generate_narrative_summary(self, context: str) -> str:
        """
        Use text-mode Gemini to generate a short narrative summary.
        """
        system_prompt = (
            "You are a senior bids & proposals manager. "
            "Write concise internal summaries of RFP responses."
        )

        user_prompt = (
            "Using the following structured context, write a concise summary "
            "of the bid in under 300 words. Focus on scope, technical fit, "
            "tests, and pricing highlights.\n\n"
            "CONTEXT:\n"
            f"{context}\n"
        )

        logger.info("Calling Gemini text mode for narrative summary")

        result = self._text_chat.invoke(
            [
                ("system", system_prompt),
                ("user", user_prompt),
            ]
        )

        raw_content = result.content if result is not None else ""
        return self._normalize_content(raw_content).strip()
