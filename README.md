# FDR-Chain — Institutional Fixed Deposit Receipt (FDR) Management Portal

**Smart India Hackathon 2026**  
**Phase 4 Release: Continuous Heartbeat Surveillance, Automated Scheduler & Regulatory Alert Desk**

---

## 🏛️ Project Overview

**FDR-Chain** is an enterprise-grade, government-standard digital portal designed to centralize and automate the lifecycle of institutional security deposit Fixed Deposit Receipts (FDRs). 

- **Phase 1**: Authentication, Role-Based Access Control (RBAC) across 6 canonical roles, and Institutional Master-Data Foundation.
- **Phase 2**: FDR Repository, Document Vault with SHA-256 integrity, and Immutable Event Audit Trail.
- **Phase 3**: Multi-Tier Trust Engine (Tier 1 Declared → Tier 2 Bank Confirmed → Tier 3 Digitally Signed), RFC 8785 Canonical JSON Serialization, Ed25519 Digital Signatures, 48-Hour Single-Use Verification Tokens with Snapshot Protection, Public Key Registry, and Mock Bank Testing Sandbox.
- **Phase 4**: Continuous Heartbeat Surveillance, Configurable Cadence Policies, Autonomous Background Scheduler (APScheduler), Broken Lien Quarantine Protection, Retry & Timeout Escalation, Milestone Maturity Reminders, and Officer Regulatory Alert Desk.

---

## 💓 Continuous Heartbeat Surveillance & State Machine (Phase 4)

Pledged government FDRs are protected against silent liquidation, account closures, and court attachments via periodic re-attestation:

```
                    ┌─────────────────────────┐
                    │       NOT_STARTED       │
                    │  (Initial FDR State)    │
                    └────────────┬────────────┘
                                 │ Initial Verification
                                 ▼
                    ┌─────────────────────────┐
       ┌───────────>│          ALIVE          │<────────────────────────┐
       │            │ (Bank Attested Standing)│                         │
       │            └──────┬───────────┬──────┘                         │
       │                   │           │                                │
       │ Stale Attestation │           │ Bank Rejection                 │
       │ Confirmed         ▼           ▼ (Lien Breach/Closed)           │
       │            ┌─────────────┐ ┌─────────────┐                     │
       │            │    STALE    │ │   BROKEN    │                     │
       │            │(Window Exp) │ │ (CRITICAL)  │                     │
       │            └──────┬──────┘ └──────┬──────┘                     │
       │                   │               │                            │
       │                   │ Retries       │ Resolution with documented │
       │                   │ Exhausted     │ remediation audit note     │
       │                   ▼               ▼                            │
       │            ┌─────────────┐ ┌─────────────┐                     │
       │            │UNRESPONSIVE │ │   CLEARED   │─────────────────────┘
       │            │ (SLA Breach)│ │ (FOR RE-AUD)│
       │            └─────────────┘ └─────────────┘
       │                   │
       └───────────────────┘ (Re-attestation Confirmed)
```

| State | Badge Color | Meaning & Governance Rule |
| :--- | :--- | :--- |
| **`not_started`** | Slate | Deposit registered, scheduled for initial baseline verification. |
| **`alive`** | Emerald | Depository bank confirmed deposit existence and active lien standing within policy window. |
| **`stale`** | Amber | Elapsed time exceeded freshness threshold (`stale_after_days`). Fresh check in flight. |
| **`broken`** | Rose (Critical) | Bank explicitly reported lien discharged, account closed, or decree attachment. **Strict Invariant**: Cannot silently revert to `alive` without documented review in the alert desk. |
| **`unresponsive`** | Orange (Critical) | Depository branch failed to acknowledge or respond after maximum retry attempts. |

---

## 🛡️ Multi-Tier Trust Architecture (Phase 3)

| Tier | Level Name | Verification Method | Evidentiary Strength (Evidence Act 65B) |
|---|---|---|---|
| **Tier 1** | **Institution Declared** | Self-declaration by depositor institution with scanned receipt & SHA-256 fingerprint. | Basic custodial assertion; subject to mandatory bank attestation. |
| **Tier 2** | **Bank Confirmed** | Depository branch nodal officer verification via 48-hour single-use token or authenticated portal. Snapshot integrity verified. | Confirmed deposit existence & statutory lien marking on bank records. |
| **Tier 3** | **Digitally Signed** | Asymmetric Ed25519 digital signature over RFC 8785 canonical JSON payload, verified against public key registry. | Non-repudiable legal standing; tamper-evident cryptographic proof. |

---

## 🛠️ Technology Stack

| Layer | Technology |
|---|---|
| **Frontend Framework** | React 19 + Vite + TypeScript |
| **Styling & Design System** | Tailwind CSS (Official Government Enterprise Palette `#12345A`, `#1D5F91`, `#F4F6F9`) |
| **Icons & Badges** | Lucide React |
| **Client Routing** | React Router DOM v7 (ProtectedRoute & RoleRoute guards) |
| **Server State Management** | TanStack Query v5 |
| **Database & Auth** | Supabase PostgreSQL + Supabase Auth + RLS |
| **Administrative Backend** | Python 3.11 + FastAPI + Uvicorn + Pydantic v2 |
| **Background Scheduler** | APScheduler 3.10 + AsyncIO Runner |
| **Cryptographic Engine** | `cryptography` (Ed25519, SHA-256) + RFC 8785 Canonical JSON |

---

## 🚀 Setup & Execution Guide

### 1. Database Migrations (Supabase)
Execute migrations sequentially in your [Supabase SQL Editor](https://supabase.com/dashboard):
- Phase 1: `01_phase1_schema.sql`, `02_rls_policies.sql`, `03_seed_data.sql`
- Phase 2: `04_phase2_schema.sql`, `05_phase2_rls_policies.sql`, `06_phase2_seed_data.sql`
- Phase 3: `07_phase3_schema.sql`, `08_phase3_rls_policies.sql`, `09_phase3_seed_data.sql`
- Phase 4: `10_phase4_schema.sql`, `11_phase4_rls_policies.sql`, `12_phase4_seed_data.sql`

### 2. Backend Gateway (FastAPI)
```powershell
cd backend
python -m pip install -r requirements.txt
python run.py
```
*Backend runs at `http://127.0.0.1:8000` (API documentation at `http://127.0.0.1:8000/docs`).*

### 3. Background Surveillance Scheduler (APScheduler)
Run a single one-shot surveillance cycle:
```powershell
cd backend
python run_scheduler.py --once
```
Run as a continuous background daemon (e.g. every 5 minutes):
```powershell
cd backend
python run_scheduler.py --interval 300
```

### 4. Frontend Web Portal (React + Vite)
```powershell
cd frontend
npm.cmd install
npm.cmd run dev
```
*Frontend runs at `http://127.0.0.1:5173`.*

---

## 🧪 Comprehensive Automated Test Suites (33/33 Passed)

Execute all automated unit and integration tests across Phase 2, Phase 3, and Phase 4 from PowerShell:
```powershell
cd backend
python -m pytest test_phase2.py test_phase3.py test_phase4.py -v
```

### Test Coverage Highlights:
- **Phase 2 Tests (7/7 Passed)**: Date order validation, Tier 1 immutability on creation, prohibited field update prevention, stats calculation, detail inspection.
- **Phase 3 Tests (13/13 Passed)**: Tier 1 initial standing, Tier 2 single-use token lifecycle, duplicate request prevention, token consumption & replay protection, bank rejection, Tier 3 Ed25519 cryptographic signatures, tampered payload detection, corrupted signature rejection, unknown key rejection, nonce replay prevention, admin bank key registry CRUD.
- **Phase 4 Tests (13/13 Passed)**:
  - Surveillance metrics dashboard aggregation (`total_monitored_fdrs`, compliance %).
  - Monitored registry status tabs & policy intervals decoration.
  - Manual interim check dispatch & active check uniqueness invariant (400 on duplicate).
  - Heartbeat policy administration CRUD & non-admin RBAC protection (403 Forbidden).
  - Freshness audit elapsed threshold transition (`alive -> stale`).
  - Explicit bank rejection negative evidence transition to `broken` with Critical alert.
  - State machine quarantine invariant: `broken` cannot silently revert to `alive`.
  - Retry & timeout lifecycle: retry increments, deadline extension, exhaustion to `unresponsive`.
  - Maturity milestone reminders (90, 60, 30, 7, 1, 0, overdue) and deduplication guarantee.
  - Regulatory Alert Desk: read toggle, officer assignment, documented resolution, 400 on duplicate resolve.
  - Scheduler composite cycle execution and statistics API.

---

## 📚 Technical Documentation Index

Detailed architectural and developer guides are available in the [`docs/`](file:///i:/Richu/Projects/SIH/FDR/docs) directory:
- [Phase 4 Heartbeat Architecture](file:///i:/Richu/Projects/SIH/FDR/docs/PHASE_4_HEARTBEAT_ARCHITECTURE.md)
- [Phase 4 Database Schema & RLS](file:///i:/Richu/Projects/SIH/FDR/docs/PHASE_4_DATABASE.md)
- [Phase 4 Scheduler Engine & Worker Guide](file:///i:/Richu/Projects/SIH/FDR/docs/PHASE_4_SCHEDULER.md)
- [Phase 4 REST API Reference](file:///i:/Richu/Projects/SIH/FDR/docs/PHASE_4_API.md)
- [Phase 4 Testing & Verification Report](file:///i:/Richu/Projects/SIH/FDR/docs/PHASE_4_TESTING.md)
