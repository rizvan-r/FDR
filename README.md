# FDR-Chain — Institutional Fixed Deposit Receipt (FDR) Management Portal

**Smart India Hackathon 2026**  
**Phase 1 Release: Authentication, Role-Based Access Control (RBAC) & Institutional Master-Data Foundation**

---

## 🏛️ Project Overview

**FDR-Chain** is an enterprise-grade, government-standard digital portal designed to centralize and automate the lifecycle of institutional security deposit Fixed Deposit Receipts (FDRs). 

In Phase 1, the core architectural foundation is established:
- **Supabase PostgreSQL Database**: Schemas, foreign keys, triggers, constraints, and Row Level Security (RLS).
- **Dual-Factor Authentication & RBAC**: Implementation of the 6 canonical roles with database-verified permissions.
- **FastAPI Backend Gateway**: Secure server-side administrative user provisioning and token validation.
- **Government Institutional Design System**: High-contrast, institutional palette with accessibility and responsiveness.
- **Master Data Subsystems**: Comprehensive CRUD for Institutions, Regions/Jurisdictions, Scheduled Banks, and Bank Branches with standard Indian IFSC validation.

---

## 🛠️ Technology Stack

| Layer | Technology |
|---|---|
| **Frontend Framework** | React 19 + Vite + TypeScript |
| **Styling & Design System** | Tailwind CSS (Official Government Palette) |
| **Icons** | Lucide React |
| **Client Routing** | React Router DOM v7 (ProtectedRoute & RoleRoute guards) |
| **Server State Management** | TanStack Query v5 |
| **Database & Auth** | Supabase PostgreSQL + Supabase Auth + RLS |
| **Administrative Backend** | Python 3.11 + FastAPI + Uvicorn + Pydantic v2 |
| **Token Verification** | PyJWT / Supabase Auth API Bearer Token Handshake |

---

## 👥 Canonical Roles Matrix

| Role Identifier | Display Name | Permissions & Scope |
|---|---|---|
| `system_admin` | System Administrator | Full portal oversight, CRUD on all master records, user provisioning, status activation. |
| `bureau_officer` | Central Bureau Officer | National oversight, cross-regional monitoring, master directory audit. |
| `finance_officer` | Finance Officer | Master bank and institution directories, financial treasury reconciliations. |
| `regional_officer` | Regional Officer | Jurisdictional isolation restricted to assigned territorial regions. |
| `bank_nodal_officer`| Bank Nodal Officer | Scheduled bank branch management and institutional lien records. |
| `institution_user` | Institutional Depositor | Entity profile and designated security deposit agency workflows. |

---

## 🚀 Windows Setup & Quick Start Guide

### 1. Database Setup (Supabase)
1. Open your [Supabase Dashboard](https://supabase.com/dashboard).
2. Navigate to **SQL Editor**.
3. Run the scripts located in `database/` in sequential order:
   - [`database/01_phase1_schema.sql`](file:///i:/Richu/Projects/SIH/FDR/database/01_phase1_schema.sql): Creates all 8 tables, custom enums, and timestamp triggers.
   - [`database/02_rls_policies.sql`](file:///i:/Richu/Projects/SIH/FDR/database/02_rls_policies.sql): Configures strict RLS and helper functions (`has_role`, `is_admin`, `is_user_active`).
   - [`database/03_seed_data.sql`](file:///i:/Richu/Projects/SIH/FDR/database/03_seed_data.sql): Seeds national regions, major scheduled banks, branches, and sample institutions.
4. To provision your administrator user in Supabase, execute:
   ```sql
   CALL public.bootstrap_system_admin('your-registered-email@example.com');
   ```

### 2. Backend Gateway (FastAPI)
Open PowerShell in `backend/`:
```powershell
# 1. Install dependencies
python -m pip install -r requirements.txt

# 2. Configure environment (copy .env.example to .env)
# Set your SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
Copy-Item .env.example .env

# 3. Launch backend API server
python run.py
```
*Backend runs on `http://127.0.0.1:8000` (API Docs available at `http://127.0.0.1:8000/docs`).*

### 3. Frontend Web Application (React + Vite)
Open PowerShell in `frontend/`:
```powershell
# 1. Install dependencies
npm.cmd install

# 2. Configure environment (copy .env.example to .env)
Copy-Item .env.example .env

# 3. Launch Vite dev server
npm.cmd run dev
```
*Frontend runs on `http://127.0.0.1:5173`.*

---

## 🧪 Evaluator & Testing Instructions

The application contains built-in demo credentials on the Login screen and a **Role Verification Switcher** in the top navigation bar.

1. **Testing Authentication**:
   - Open `http://127.0.0.1:5173/login`.
   - Click any of the quick-fill buttons (e.g. `System Admin`, `Regional Officer`, `Bank Nodal`) to test authentication.
2. **Testing Role-Based Access Control**:
   - As `system_admin`: Access User Management, create new institutions, and edit regions.
   - Switch role to `institution_user`: Notice User Management and Region Editing are hidden and blocked. Direct URL access to `/users` redirects to `/access-denied` (HTTP 403 Forbidden).
3. **Testing Master Data CRUD**:
   - **Institutions**: Search, filter by region and type, add new institution, toggle active/inactive status.
   - **Banks & Branches**: Add bank, view branches, add branch with real-time Indian IFSC format validation (must match `^[A-Z]{4}0[A-Z0-9]{6}$`).
   - **Regions**: View state coverage badges, search by state (e.g. "Delhi", "Maharashtra").
4. **Phase 2 Boundary Markers**:
   - Notice clean placeholders on the Dashboard and Sidebar for future modules (FDR Registration, Bank E-Verification, Lien Monitoring) ensuring strict Phase 1 compliance.

---

## 📁 Repository Directory Structure

```
FDR/
├── backend/                  # FastAPI Administrative Gateway
│   ├── app/
│   │   ├── auth/             # JWT & Bearer Token Validator, RBAC dependencies
│   │   ├── routers/          # /api/health, /api/users
│   │   ├── schemas/          # Pydantic v2 validation models
│   │   ├── services/         # Server-side Supabase admin service
│   │   ├── config.py         # Application settings
│   │   └── main.py           # FastAPI entrypoint with CORS & logging
│   ├── requirements.txt      # Python dependencies
│   └── run.py                # Server runner
├── database/                 # PostgreSQL / Supabase Migrations
│   ├── 01_phase1_schema.sql  # DDL schemas, constraints & indexes
│   ├── 02_rls_policies.sql   # Row Level Security policies
│   ├── 03_seed_data.sql      # Seed roles, regions, banks & institutions
│   └── README.md             # Migration guide
├── frontend/                 # React 19 + TypeScript Application
│   ├── src/
│   │   ├── components/       # Layout, UI & Auth Route Guards
│   │   ├── contexts/         # AuthContext & Session Management
│   │   ├── lib/              # Supabase client & Data API
│   │   ├── pages/            # Login, Dashboard, Institutions, Regions, Banks, Users, Profile
│   │   └── types/            # TypeScript definitions
│   └── package.json
└── docs/
    └── Phase1.md             # SIH 2026 Phase 1 Specification Prompt
```
