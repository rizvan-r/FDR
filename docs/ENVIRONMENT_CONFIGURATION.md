# FDR-Chain: Environment Configuration Guide

## 1. Overview

**FDR-Chain** is designed for secure deployment across national institutional datacenters, NIC infrastructure, and hybrid cloud environments (Supabase / PostgreSQL). The system supports two operational modes:

1. **Development / Mock Mode (`USE_MOCK_SUPABASE=True`)**: Self-contained, zero-external-dependency environment with in-memory persistence and deterministic test fixtures. Recommended for rapid evaluation, continuous integration (CI), and offline demonstrations.
2. **Production / Live Cloud Mode (`USE_MOCK_SUPABASE=False`)**: Fully connected to Supabase PostgreSQL with active Row-Level Security (RLS), Supabase Auth JWT validation, and Supabase Storage buckets.

---

## 2. Backend Configuration (`backend/.env`)

Create or update the configuration file in [`backend/.env`](file:///i:/Richu/Projects/SIH/FDR/backend/.env):

```ini
# ==============================================================================
# FDR-CHAIN BACKEND ENVIRONMENT CONFIGURATION
# ==============================================================================

# Server Environment
ENVIRONMENT=development
PORT=8000
HOST=0.0.0.0
CORS_ORIGINS=["http://localhost:5173", "http://127.0.0.1:5173"]

# Operational Mode
# Set to 'True' for standalone in-memory execution and testing
# Set to 'False' to connect to live Supabase project
USE_MOCK_SUPABASE=True

# Supabase Connectivity (Required when USE_MOCK_SUPABASE=False)
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_JWT_SECRET=your-supabase-jwt-secret-here

# Cryptographic Keys (Ed25519 Digital Attestation for Bank CBS)
# In mock mode, pre-generated deterministic demo keys are used automatically
BANK_ED25519_KEY_ID=key-sbi-delhi-01
BANK_ED25519_PUBLIC_KEY=94b7f8c0e123...

# Storage Bucket Names
SUPABASE_STORAGE_BUCKET_DOCUMENTS=fdr-documents
SUPABASE_STORAGE_BUCKET_CERTIFICATES=compliance-certificates
```

> [!CAUTION]
> **Security Policy**: The `SUPABASE_SERVICE_ROLE_KEY` bypasses all Row-Level Security policies. It must **NEVER** be committed to public version control or copied into the frontend `.env`.

---

## 3. Frontend Configuration (`frontend/.env`)

Create or update the configuration file in [`frontend/.env`](file:///i:/Richu/Projects/SIH/FDR/frontend/.env):

```ini
# ==============================================================================
# FDR-CHAIN FRONTEND ENVIRONMENT CONFIGURATION
# ==============================================================================

# Backend REST API Base URL
VITE_API_URL=http://localhost:8000/api/v1

# Supabase Client Configuration (Public Anon Key ONLY)
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Application Metadata
VITE_APP_TITLE=FDR-Chain Institutional Portal
VITE_PORTAL_VERSION=1.0.0
```

---

## 4. Local Installation & Startup Instructions

### Prerequisites
- **Python**: Version 3.10, 3.11, or 3.12
- **Node.js**: Version 18.x, 20.x, or 22.x (with npm)
- **PowerShell** (Windows) or **Bash** (macOS/Linux)

---

### Step 1: Start Backend Server

Open a terminal and navigate to the backend folder:

```powershell
# Navigate to backend directory
cd backend

# Create virtual environment (optional if already using system/venv)
python -m venv venv
.\venv\Scripts\Activate.ps1

# Install dependencies
pip install -r requirements.txt

# Launch FastAPI application
uvicorn app.main:app --reload --port 8000
```

The backend API documentation is now accessible at:
- **Swagger UI**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **ReDoc**: [http://localhost:8000/redoc](http://localhost:8000/redoc)

---

### Step 2: Start Frontend Application

Open a second terminal and navigate to the frontend folder:

```powershell
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Launch Vite development server
npm run dev
```

The portal is now running at:
- **Application Portal**: [http://localhost:5173](http://localhost:5173)

---

## 5. Verification Commands

To verify that both stacks are healthy and bug-free:

```powershell
# In backend/ directory:
pytest -v

# In frontend/ directory:
npm run test
npm run build
```
