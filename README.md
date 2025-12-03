# Phoenix RFP Xcelerator - Agentic AI Solution for B2B RFP Response Automation

## 📋 Table of Contents

- [Project Overview](#project-overview)
- [Business Context](#business-context)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Agentic AI Workflow](#agentic-ai-workflow)
- [Project Structure](#project-structure)
- [Setup Instructions](#setup-instructions)
- [API Documentation](#api-documentation)
- [Usage Guide](#usage-guide)
- [Configuration](#configuration)
- [Data Requirements](#data-requirements)

---

## 🎯 Project Overview

**Phoenix RFP Xcelerator** is an end-to-end Agentic AI solution designed to automate and scale B2B RFP (Request for Proposal) response processes for large-scale projects, particularly in the wires and cables industry. The system uses multiple AI agents working in coordination to:

1. **Discover and identify RFPs** from various sources (websites, listings)
2. **Parse and understand RFP documents** using LLM-powered extraction
3. **Match technical specifications** to OEM product SKUs
4. **Calculate pricing** including material costs and testing requirements
5. **Generate comprehensive bid responses** ready for submission

### Key Features

- 🤖 **Multi-Agent Architecture**: Sales, Technical, Pricing, and Main Orchestrator agents
- 📄 **PDF Processing**: Automated RFP PDF parsing using Google Gemini AI
- 🔍 **Web Scraping**: Automated RFP discovery from predefined URLs
- 🎯 **Intelligent Matching**: Technical specification matching with similarity scoring
- 💰 **Automated Pricing**: Material and testing cost calculations
- 📊 **Real-time Workflow**: Step-by-step execution with progress tracking
- 💾 **Result Storage**: Automatic storage of workflow results and PDFs

---

## 🏢 Business Context

### Problem Statement

Large projects (government/PSU) are executed by LSTK (Lumpsum Turnkey) project executors who raise RFPs for material supplies. OEM vendors bid for these tenders, with the lowest-priced tender typically winning. The client, a large wires and cables OEM in India, faces bottlenecks in their RFP response process:

- **90% of wins** correlate to RFPs received and actioned on time
- **60% of wins** correlate to adequate time for technical team matching
- **Manual processes** cause delays and reduce winning chances
- **Technical SKU matching** takes the most time in the process

### Solution Benefits

- ⚡ **Faster Response Times**: Automated RFP identification and processing
- 🎯 **Improved Match Quality**: AI-powered technical specification matching
- 📈 **Scalability**: Handle multiple RFPs concurrently
- 💡 **Consistency**: Standardized response generation process
- 📊 **Visibility**: Real-time tracking of workflow progress

---

## 🛠 Tech Stack

### Backend

| Technology | Version | Purpose |
|------------|---------|---------|
| **Python** | 3.11+ | Core programming language |
| **FastAPI** | 0.115.0 | High-performance web framework |
| **Uvicorn** | 0.30.5 | ASGI server |
| **LangChain** | 0.3.7 | LLM orchestration framework |
| **LangChain Google GenAI** | 2.0.1 | Google Gemini integration |
| **Pydantic** | 2.9.2 | Data validation and settings |
| **pypdf** | 5.1.0 | PDF text extraction |
| **SQLAlchemy** | - | ORM for database operations |
| **BeautifulSoup4** | 4.12.3 | Web scraping |
| **Requests** | 2.31.0 | HTTP client for web scraping |
| **lxml** | 5.3.0 | XML/HTML parser |

### Frontend

| Technology | Version | Purpose |
|------------|---------|---------|
| **React** | 18.3.1 | UI framework |
| **TypeScript** | 5.8.3 | Type-safe JavaScript |
| **Vite** | 5.4.19 | Build tool and dev server |
| **React Router** | 6.30.1 | Client-side routing |
| **TanStack Query** | 5.83.0 | Data fetching and caching |
| **Tailwind CSS** | 3.4.17 | Utility-first CSS framework |
| **shadcn/ui** | - | Component library |
| **Radix UI** | - | Accessible component primitives |
| **Framer Motion** | 12.23.24 | Animation library |
| **Sonner** | 1.7.4 | Toast notifications |
| **date-fns** | 3.6.0 | Date formatting |

### AI/ML

| Technology | Purpose |
|------------|---------|
| **Google Gemini 2.5 Flash** | LLM for RFP parsing and summarization |
| **LangChain** | Agent orchestration and prompt management |

### Database

| Technology | Purpose |
|------------|---------|
| **SQLite** | Local database for RFP storage (development) |
| **SQLAlchemy ORM** | Database abstraction layer |

---

## 🏗 Architecture

### System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Frontend (React)                       │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │Dashboard │  │ Workflow │  │  Profile │  │   Auth   │  │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘  │
└──────────────────────┬──────────────────────────────────────┘
                       │ HTTP/REST API
┌──────────────────────▼──────────────────────────────────────┐
│              Backend API (FastAPI)                          │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              Main Orchestrator Agent                 │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌────────────┐ │  │
│  │  │ Sales Agent  │  │Technical Agent│  │Pricing Agent│ │  │
│  │  └──────────────┘  └──────────────┘  └────────────┘ │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │         Services Layer                                │  │
│  │  • RFP Understanding (Gemini)                        │  │
│  │  • PDF Extractor                                     │  │
│  │  • Web Scraper                                       │  │
│  │  • Gemini Client                                     │  │
│  └──────────────────────────────────────────────────────┘  │
└──────────────────────┬──────────────────────────────────────┘
                       │
        ┌──────────────┼──────────────┐
        │              │              │
┌───────▼────┐  ┌─────▼─────┐  ┌─────▼─────┐
│  SQLite DB │  │ CSV Files  │  │  PDF Files│
│            │  │ (Products, │  │  Storage  │
│            │  │  Pricing)  │  │           │
└────────────┘  └────────────┘  └───────────┘
```

### Agent Architecture

```
Main Orchestrator Agent
    │
    ├─── Sales Agent
    │    ├─── Web Scraping (RFP Discovery)
    │    ├─── PDF Parsing (Gemini)
    │    └─── RFP Qualification
    │
    ├─── Technical Agent
    │    ├─── Product Specification Matching
    │    ├─── SKU Recommendation (Top 3)
    │    ├─── Match Percentage Calculation
    │    └─── Comparison Table Generation
    │
    ├─── Pricing Agent
    │    ├─── Unit Price Lookup
    │    ├─── Material Cost Calculation
    │    ├─── Test Cost Calculation
    │    └─── Total Bid Value Aggregation
    │
    └─── Final Consolidation
         ├─── Response Assembly
         ├─── Narrative Summary (Gemini)
         └─── JSON Response Generation
```

---

## 🤖 Agentic AI Workflow

### Workflow Overview

The system implements a **6-step agentic workflow** that automates the entire RFP response process:

```
┌─────────────────────────────────────────────────────────────┐
│ Step 1: Sales Agent - RFP Discovery                        │
│ • Scans predefined URLs for RFPs                           │
│ • Filters RFPs due within next 3 months                   │
│ • Selects best RFP (nearest due date)                      │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│ Step 2: Sales Agent - RFP Parsing                          │
│ • Downloads/Opens RFP PDF                                   │
│ • Extracts text using pypdf                                │
│ • Parses with Gemini LLM to extract:                       │
│   - Scope of Supply                                         │
│   - Technical Specifications                                │
│   - Testing Requirements                                    │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│ Step 3: Main Agent - Prepare Summaries                     │
│ • Creates contextual summary for Technical Agent           │
│ • Creates contextual summary for Pricing Agent             │
│ • Focuses on relevant information per agent role           │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│ Step 4: Technical Agent - Product Matching                 │
│ • Parses scope items into RFPItem objects                  │
│ • Loads OEM product catalog (CSV)                          │
│ • For each RFP item:                                        │
│   - Computes spec match % (equal-weighted attributes)      │
│   - Recommends Top 3 matching SKUs                          │
│   - Creates comparison table                                │
│   - Selects best matching SKU                               │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│ Step 5: Pricing Agent - Cost Calculation                  │
│ • Loads product pricing table (CSV)                          │
│ • Loads test pricing table (CSV)                            │
│ • For each selected SKU:                                    │
│   - Calculates material cost (unit_price × quantity)       │
│   - Identifies required tests                               │
│   - Calculates test costs                                   │
│   - Computes total cost per item                            │
│ • Aggregates total bid value                                │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│ Step 6: Main Agent - Final Consolidation                  │
│ • Assembles FinalRFPResponse                                │
│ • Generates narrative summary using Gemini                  │
│ • Returns complete JSON response                            │
└─────────────────────────────────────────────────────────────┘
```

### Agent Responsibilities

#### 1. Sales Agent (`sales_agent.py`)
- **Purpose**: RFP discovery and initial parsing
- **Key Functions**:
  - Scans predefined URLs for RFP listings
  - Filters RFPs by due date (next 3 months)
  - Downloads and opens RFP PDFs
  - Calls RFP Understanding Service for parsing
- **Output**: `SalesAgentOutput` with parsed RFP sections

#### 2. Technical Agent (`technical_agent.py`)
- **Purpose**: Match RFP requirements to OEM products
- **Key Functions**:
  - Parses scope of supply into structured items
  - Loads OEM product catalog
  - Computes specification match percentages
  - Recommends top 3 matching SKUs per item
  - Generates comparison tables
- **Output**: `TechnicalAgentOutput` with matched SKUs

#### 3. Pricing Agent (`pricing_agent.py`)
- **Purpose**: Calculate costs and pricing
- **Key Functions**:
  - Loads product and test pricing tables
  - Calculates material costs
  - Calculates test costs
  - Aggregates total bid value
- **Output**: `PricingAgentOutput` with pricing details

#### 4. Main Orchestrator Agent (`main_agent.py`)
- **Purpose**: Coordinate all agents and generate final response
- **Key Functions**:
  - Orchestrates agent execution sequence
  - Prepares contextual summaries for agents
  - Consolidates agent outputs
  - Generates narrative summary using Gemini
- **Output**: `FinalRFPResponse` with complete bid

---

## 📁 Project Structure

```
EY/
├── Backend/
│   ├── app/
│   │   ├── agents/              # AI Agent implementations
│   │   │   ├── main_agent.py    # Main orchestrator
│   │   │   ├── sales_agent.py   # Sales agent
│   │   │   ├── technical_agent.py  # Technical matching agent
│   │   │   └── pricing_agent.py    # Pricing agent
│   │   ├── api/                 # API routes
│   │   │   ├── routes_rfp.py    # RFP parsing endpoints
│   │   │   ├── routes_workflow.py  # Workflow endpoints
│   │   │   └── routes_rfp_store.py  # RFP storage endpoints
│   │   ├── core/                # Core configuration
│   │   │   ├── config.py        # Settings management
│   │   │   └── logging_config.py   # Logging setup
│   │   ├── db/                  # Database layer
│   │   │   ├── database.py      # DB connection
│   │   │   ├── models.py        # SQLAlchemy models
│   │   │   └── crud.py          # CRUD operations
│   │   ├── models/              # Pydantic models
│   │   ├── schemas/             # API schemas
│   │   │   ├── rfp.py           # RFP parsing schemas
│   │   │   ├── workflow.py      # Workflow schemas
│   │   │   └── rfp_store.py     # Storage schemas
│   │   ├── services/            # Business logic services
│   │   │   ├── gemini_client.py    # Gemini LLM client
│   │   │   ├── pdf_extractor.py    # PDF text extraction
│   │   │   ├── rfp_understanding.py # RFP parsing service
│   │   │   └── web_scraper.py      # Web scraping service
│   │   └── main.py              # FastAPI application entry
│   ├── data/                    # Data files
│   │   ├── rfp_listings.json    # RFP listings
│   │   ├── oem_products.csv     # OEM product catalog
│   │   ├── product_prices.csv    # Product pricing
│   │   ├── test_prices.csv      # Test pricing
│   │   └── rfps/                # RFP PDF storage
│   ├── requirements.txt         # Python dependencies
│   ├── rfp_engine.db            # SQLite database
│   └── README.md                # Backend README
│
└── Frontend/
    ├── src/
    │   ├── components/          # React components
    │   │   ├── ui/              # shadcn/ui components
    │   │   ├── Navbar.tsx       # Navigation bar
    │   │   └── ...
    │   ├── contexts/            # React contexts
    │   │   ├── AuthContext.tsx
    │   │   ├── RFPContext.tsx
    │   │   └── ...
    │   ├── pages/               # Page components
    │   │   ├── Dashboard.tsx
    │   │   ├── Workflow.tsx     # Main workflow page
    │   │   ├── Login.tsx
    │   │   └── ...
    │   ├── App.tsx              # Main app component
    │   └── main.tsx             # Entry point
    ├── package.json             # Node dependencies
    └── README.md                # Frontend README
```

---

## 🚀 Setup Instructions

### Prerequisites

- **Python 3.11+**
- **Node.js 18+** and npm
- **Google Gemini API Key** ([Get one here](https://makersuite.google.com/app/apikey))

### Backend Setup

1. **Navigate to Backend directory**
   ```bash
   cd Backend
   ```

2. **Create virtual environment**
   ```bash
   python -m venv .venv
   
   # Windows
   .venv\Scripts\activate
   
   # Linux/Mac
   source .venv/bin/activate
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Set up environment variables**
   Create a `.env` file in the `Backend` directory:
   ```env
   GOOGLE_API_KEY=your_gemini_api_key_here
   GEMINI_MODEL=gemini-2.5-flash
   RFP_MAX_PAGES=30
   RFP_LISTINGS_PATH=data/rfp_listings.json
   RFP_PDF_BASE_DIR=data/rfps
   OEM_PRODUCTS_PATH=data/oem_products.csv
   PRODUCT_PRICES_PATH=data/product_prices.csv
   TEST_PRICES_PATH=data/test_prices.csv
   RFP_URLS=https://example.com/rfps,https://another-site.com/tenders
   ```

5. **Initialize database** (if needed)
   ```bash
   # Database will be created automatically on first run
   ```

6. **Run the backend server**
   ```bash
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```

   The API will be available at `http://localhost:8000`
   API documentation at `http://localhost:8000/docs`

### Frontend Setup

1. **Navigate to Frontend directory**
   ```bash
   cd Frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   Create a `.env` file in the `Frontend` directory:
   ```env
   VITE_API_BASE_URL=http://localhost:8000
   ```

4. **Run the development server**
   ```bash
   npm run dev
   ```

   The frontend will be available at `http://localhost:5173`

### Verify Installation

1. **Check backend health**
   ```bash
   curl http://localhost:8000/api/v1/health
   ```

2. **Access API documentation**
   Open `http://localhost:8000/docs` in your browser

3. **Access frontend**
   Open `http://localhost:5173` in your browser

---

## 📡 API Documentation

### Base URL
```
http://localhost:8000/api/v1
```

### Endpoints

#### Health Check
```http
GET /health
```
Returns service health status.

#### RFP Parsing
```http
POST /rfp/parse
Content-Type: multipart/form-data

Body:
  file: <PDF file>
```
Parses an RFP PDF and returns structured JSON.

**Response:**
```json
{
  "scope_of_supply": "...",
  "technical_specifications": "...",
  "testing_requirements": "...",
  "raw_model_response": {...}
}
```

#### Auto-Bid (Full Pipeline)
```http
POST /rfp/auto-bid
```
Runs the complete agentic pipeline with auto-discovery.

**Response:**
```json
{
  "rfp_id": "RFP-2025-001",
  "rfp_title": "...",
  "total_bid_value": 123456.78,
  "technical_items": [...],
  "pricing": {...},
  "narrative_summary": "..."
}
```

#### Auto-Bid Upload
```http
POST /rfp/auto-bid-upload
Content-Type: multipart/form-data

Body:
  file: <PDF file>
  rfp_id: (optional)
  title: (optional)
  due_date: (optional)
```
Runs the complete pipeline for an uploaded PDF.

#### Workflow Management

**Start Workflow**
```http
POST /rfp/workflow/start
```
Creates a new workflow instance.

**Get Workflow Progress**
```http
GET /rfp/workflow/{workflow_id}
```
Returns current workflow progress.

**Execute Workflow Step**
```http
POST /rfp/workflow/{workflow_id}/execute
```
Executes the next step in the workflow.

#### RFP Storage

**Create RFP**
```http
POST /rfps
Content-Type: multipart/form-data

Body:
  title: string
  customer_name: string (optional)
  due_date: YYYY-MM-DD (optional)
  external_id: string (optional)
  file: <PDF file> (optional)
```

**List RFPs**
```http
GET /rfps
```

**Get RFP**
```http
GET /rfps/{rfp_id}
```

---

## 📖 Usage Guide

### Workflow Page - Auto-Discovery Mode

1. Navigate to **Workflow** page (`/workflow`)
2. Select **"Auto-Discovery (Sales Agent)"** tab
3. Click **"Start Workflow"**
4. Click **"Execute Next Step"** for each step:
   - Step 1: Sales Agent discovers RFPs
   - Step 2: RFP PDF is parsed
   - Step 3: Summaries are prepared
   - Step 4: Technical matching occurs
   - Step 5: Pricing is calculated
   - Step 6: Final response is generated
5. View results in the **Final RFP Response** section

### Workflow Page - Upload PDF Mode

1. Navigate to **Workflow** page (`/workflow`)
2. Select **"Upload PDF"** tab
3. Click **"Choose PDF"** and select an RFP PDF
4. Optionally fill in:
   - RFP ID
   - Title
   - Due Date
5. Click **"Upload & Run Workflow"**
6. Wait for processing (all agents run automatically)
7. View results in tabs:
   - **Overview**: Basic RFP info and scope
   - **Technical Matching**: SKU matches and comparison tables
   - **Pricing**: Cost breakdown per item
   - **Summary**: Narrative summary

### Viewing Results

Results are automatically saved to browser localStorage and can be viewed:
- In the **Final RFP Response** section after workflow completion
- Results include:
  - RFP metadata (ID, title, due date)
  - Scope of supply
  - Technical specifications
  - Testing requirements
  - Matched SKUs with match percentages
  - Pricing breakdown
  - Total bid value
  - Narrative summary

---

## ⚙️ Configuration

### Backend Configuration

All configuration is done via environment variables (`.env` file):

| Variable | Description | Default |
|----------|-------------|---------|
| `GOOGLE_API_KEY` | Google Gemini API key | Required |
| `GEMINI_MODEL` | Gemini model name | `gemini-2.5-flash` |
| `RFP_MAX_PAGES` | Max pages to parse from PDF | `30` |
| `RFP_LISTINGS_PATH` | Path to RFP listings JSON | `data/rfp_listings.json` |
| `RFP_PDF_BASE_DIR` | Directory for RFP PDFs | `data/rfps` |
| `OEM_PRODUCTS_PATH` | Path to OEM products CSV | `data/oem_products.csv` |
| `PRODUCT_PRICES_PATH` | Path to product prices CSV | `data/product_prices.csv` |
| `TEST_PRICES_PATH` | Path to test prices CSV | `data/test_prices.csv` |
| `RFP_URLS` | Comma-separated URLs to scan | Empty |

### Frontend Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_API_BASE_URL` | Backend API URL | `http://localhost:8000` |

---

## 📊 Data Requirements

### RFP Listings JSON (`data/rfp_listings.json`)

```json
[
  {
    "rfp_id": "RFP-2025-001",
    "title": "Supply of LT XLPE Power Cables",
    "url": "synthetic_rfp_1.pdf",
    "due_date": "2025-02-15"
  }
]
```

### OEM Products CSV (`data/oem_products.csv`)

```csv
sku,conductor_size_sqmm,cores,conductor_material,insulation,voltage_rating,armour_type
SKU-001,25,3,copper,XLPE,1100,steel armour
SKU-002,50,4,copper,XLPE,1100,aluminium armour
```

### Product Prices CSV (`data/product_prices.csv`)

```csv
sku,unit_price
SKU-001,1500.00
SKU-002,2500.00
```

### Test Prices CSV (`data/test_prices.csv`)

```csv
test_name,test_price
Insulation Resistance Test,500.00
Voltage Withstand Test,800.00
```

---

## 🔧 Development

### Running Tests

```bash
# Backend tests (if available)
cd Backend
pytest

# Frontend tests (if available)
cd Frontend
npm test
```

### Code Structure

- **Backend**: Follows FastAPI best practices with clear separation of concerns
- **Frontend**: React functional components with TypeScript
- **Agents**: Each agent is a self-contained class with clear responsibilities
- **Services**: Reusable business logic services

### Adding New Agents

1. Create new agent class in `Backend/app/agents/`
2. Implement required methods
3. Add to `MainAgent` orchestration
4. Update workflow schemas if needed
5. Add frontend UI components

---

## 🎯 Future Enhancements

- [ ] Database persistence for workflow results
- [ ] Multi-user support with authentication
- [ ] Advanced matching algorithms
- [ ] Integration with external RFP portals
- [ ] Email notifications for RFP deadlines
- [ ] Historical analytics and reporting
- [ ] Export to PDF/Excel formats
- [ ] Custom pricing rules engine

---

**Last Updated**: 2025-01-XX

