# RFP Understanding Engine

Backend-only service that reads **RFP PDFs** and extracts:

- `scope_of_supply`
- `technical_specifications`
- `testing_requirements`

It uses:

- **FastAPI** for HTTP APIs
- **pypdf** for PDF text extraction
- **Google Gemini** (via `google-genai` SDK) for LLM-based understanding

---

## 1. Features

- `POST /api/v1/rfp/parse`
  - Accepts a PDF file (multipart/form-data).
  - Extracts first N pages (configurable via `RFP_MAX_PAGES`).
  - Sends text to Gemini in **JSON mode**.
  - Returns structured JSON with three core sections.
- `GET /api/v1/health`
  - Simple liveness check for monitoring.

---

## 2. Tech Stack

- Python 3.11+ (recommended)
- FastAPI
- Uvicorn
- pypdf
- Google GenAI SDK (`google-genai`) for Gemini API

---

## 3. Setup

### 3.1. Clone & create virtualenv

```bash
git clone <your-repo-url> rfp-understanding-engine
cd rfp-understanding-engine

python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
