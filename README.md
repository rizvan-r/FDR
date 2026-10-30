# FDR-Chain — Institutional Fixed Deposit Receipt (FDR) Management Portal

**Smart India Hackathon 2026**  
**Phase 6 Release: Officer Dashboard, Priority Queue, Heuristic Scoring Engine & Supervisory Escalations**

---

## 🏛️ Project Overview

**FDR-Chain** is an enterprise-grade, government-standard digital portal designed to centralize and automate the lifecycle of institutional security deposit Fixed Deposit Receipts (FDRs). 

- **Phase 1**: Authentication, Role-Based Access Control (RBAC) across 6 canonical roles, and Institutional Master-Data Foundation.
- **Phase 2**: FDR Repository, Document Vault with SHA-256 integrity, and Immutable Event Audit Trail.
- **Phase 3**: Multi-Tier Trust Engine (Tier 1 Declared → Tier 2 Bank Confirmed → Tier 3 Digitally Signed), RFC 8785 Canonical JSON Serialization, Ed25519 Digital Signatures, 48-Hour Single-Use Verification Tokens with Snapshot Protection, Public Key Registry, and Mock Bank Testing Sandbox.
- **Phase 4**: Continuous Heartbeat Surveillance, Configurable Cadence Policies, Autonomous Background Scheduler (APScheduler), Broken Lien Quarantine Protection, Retry & Timeout Escalation, Milestone Maturity Reminders, and Officer Regulatory Alert Desk.
- **Phase 5**: Governed Renewal Management, 6-Signal Deterministic Candidate Matching Engine, Independent Replacement FDR Trust Tier $\ge 2$ Enforcement, Strict Directed Acyclic Graph (DAG) Lineage with Cycle Detection, and End-to-End Visual Provenance Explorer.
- **Phase 6**: Role-Aware Officer Dashboard, Centralized Priority Queue, 9-Signal Non-Destructive Priority Calculation Engine, Idempotent Task Synchronization across Phases 3–5, Task Lifecycle State Machine, Assignment & Comment Trails, Supervisory Multi-Stage Escalations, Staff Workload Dashboard, and In-App Officer Notifications.

---

## 📋 Officer Operations & Unified Priority Queue (Phase 6)

Phase 6 unifies operational review responsibilities across previous phases into a role-scoped, intelligent command center:

```
                    ┌─────────────────────────┐
                    │    UPSTREAM MODULES     │
                    │ (Phases 3, 4, 5 Events) │
                    └────────────┬────────────┘
                                 │ Idempotent Task Synchronization (dedup_key)
                                 ▼
                    ┌─────────────────────────┐
                    │      OFFICER TASK       │
                    │ Status: OPEN / IN_PROG  │
                    └────────────┬────────────┘
                                 │
         ┌───────────────────────┼───────────────────────┐
         │                       │                       │
         ▼                       ▼                       ▼
┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐
│ PRIORITY ENGINE  │    │  COLLABORATION   │    │   ESCALATIONS    │
│ 9-Signal Scoring │    │ Assignment Audit │    │ Multi-Tier SLA   │
│ Tiers: Crit/High │    │ Internal Comments│    │ Ack & Resolution │
└──────────────────┘    └──────────────────┘    └──────────────────┘
```

### Key Phase 6 Architectural Guarantees:
1. **Dynamic Priority Scoring Invariant**: Scoring is an ordering heuristic that surfaces urgent matters without human latency. Priority scoring **never** executes financial state changes, lien releases, or renewal approvals.
2. **Review vs Business Separation**: Completing an officer task records operational review completion. It **does not** automatically alter the status of the underlying FDR or renewal case.
3. **Idempotent Synchronization**: Deduplication key `source_type:source_id:task_type` ensures zero duplicate tasks while safely updating scores as deadlines approach.
4. **Supervisory Escalation Invariant**: Prevents duplicate active escalations at the same tier and mandates formal written justification to resolve.

Phase 5 addresses deposit rollovers and replacements through a governed supervisory workflow:

```
                    ┌─────────────────────────┐
                    │       DRAFT CASE        │
                    │ (Institution Initiated) │
                    └────────────┬────────────┘
                                 │ Attach Evidence & Run Advisory Match
                                 ▼
                    ┌─────────────────────────┐
                    │        SUBMITTED        │
                    │   (Ready for Review)    │
                    └────────────┬────────────┘
                                 │
             ┌───────────────────┴───────────────────┐
             │ Missing Confirmation                  │
             ▼                                       ▼
┌─────────────────────────┐             ┌─────────────────────────┐
│AWAITING BANK CONFIRM    │             │   SUPERVISORY REVIEW    │
│(Needs Tier 2 / Bank Att)│             │ (Officer Queue / Match) │
└────────────┬────────────┘             └──────┬───────────┬──────┘
             │ Bank Confirmed                  │           │
             └───────────────────┐             │ Approved  │ Rejected
                                 ▼             ▼           ▼
                                ┌─────────────────┐   ┌─────────────────┐
                                │    APPROVED     │   │    REJECTED     │
                                │ (Atomic Commit) │   │ (With Justific) │
                                └────────┬────────┘   └─────────────────┘
                                         │
        ┌────────────────────────────────┴────────────────────────────────┐
        │ Atomic State Transitions:                                       │
        │ 1. Renewal Case status -> 'approved'                            │
        │ 2. Lineage edge created: Parent FDR -> Child Replacement FDR    │
        │ 3. Parent FDR lifecycle status -> 'renewed'                     │
        │ 4. Child FDR remains 'active' with verified Trust Tier >= 2     │
        └─────────────────────────────────────────────────────────────────┘
```

### Key Phase 5 Architectural Guarantees:
1. **Advisory Matching Engine**: Evaluates 6 weighted signals (Bank 25%, Branch 15%, Amount 25%, Chronology 15%, Lien 10%, Reference 10%). Generates confidence rating and discrepancy tags without automatic approval execution.
2. **Independent Verification**: A replacement deposit cannot inherit trust or signatures from its predecessor. It must independently attain Trust Tier $\ge 2$ or official bank confirmation.
3. **Directed Acyclic Graph (DAG) Lineage**:
   - Single Predecessor Invariant: `child_fdr_id UNIQUE` constraint guarantees an FDR has at most one predecessor.
   - Anti-Reflexivity: Prohibits self-linking (`CHECK parent_fdr_id <> child_fdr_id`).
   - Acyclicity: Enforced via recursive search in both application service and database trigger (`prevent_lineage_cycle()`).
4. **Interactive Multi-Generation Visualization**: Fullscreen and tab-integrated SVG tree displaying origin root deposits, intermediate generational rollovers, and active leaf deposits.

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
| **`broken`** | Rose (Critical) | Bank explicitly reported lien discharged, account closed, or decree attachment. Cannot silently revert to `alive`. |
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
- Phase 5: `13_phase5_schema.sql`, `14_phase5_rls_policies.sql`, `15_phase5_seed_data.sql`
- Phase 6: `16_phase6_schema.sql`, `17_phase6_rls_policies.sql`, `18_phase6_seed_data.sql`

### 2. Backend Gateway (FastAPI)
```powershell
cd backend
python -m pip install -r requirements.txt
python run.py
```
*Backend runs at `http://127.0.0.1:8000` (Swagger UI at `http://127.0.0.1:8000/docs`).*

### 3. Background Surveillance Scheduler (APScheduler)
Run a single one-shot surveillance cycle:
```powershell
cd backend
python run_scheduler.py --once
```

### 4. Frontend Web Portal (React + Vite)
```powershell
cd frontend
npm.cmd install
npm.cmd run dev
```
*Frontend runs at `http://127.0.0.1:5173`.*

---

## 🧪 Comprehensive Automated Test Suites (67/67 Passed)

Execute all 67 automated unit and integration tests across Phase 2, Phase 3, Phase 4, Phase 5, and Phase 6 from PowerShell:
```powershell
cd backend
python -m pytest test_phase2.py test_phase3.py test_phase4.py test_phase5.py test_phase6.py -v
```

### Test Coverage Highlights:
- **Phase 2 Tests (7/7 Passed)**: Date order validation, Tier 1 immutability on creation, prohibited field update prevention, stats calculation, detail inspection.
- **Phase 3 Tests (13/13 Passed)**: Tier 1 initial standing, Tier 2 single-use token lifecycle, duplicate request prevention, token consumption & replay protection, bank rejection, Tier 3 Ed25519 cryptographic signatures, tampered payload detection, corrupted signature rejection, unknown key rejection, nonce replay prevention, admin bank key registry CRUD.
- **Phase 4 Tests (13/13 Passed)**: Heartbeat dashboard metrics, monitored registry status tabs, manual interim check dispatch, heartbeat policy administration CRUD, freshness audit elapsed threshold transition (`alive -> stale`), bank rejection transition to `broken`, state machine quarantine invariant, retry & timeout lifecycle, milestone maturity reminders, alert desk lifecycle.
- **Phase 5 Tests (18/18 Passed)**: Renewal draft creation (`REN-YYYY-XXXX`), draft case editing, state immutability, cross-institution reference rejection, 6-signal candidate matching scoring & advisory guarantee verification, evidence upload and MIME type check, non-supervisory approval prevention, duplicate approval prevention, mandatory rejection justification, recursive DAG graph traversal, anti-reflexivity constraint, single predecessor invariant, cycle detection, isolated FDR handling, and dashboard metrics.
- **Phase 6 Tests (16/16 Passed)**: Officer dashboard KPI aggregation, priority queue listing & dynamic multi-criteria filtering, full task detail hydration, 9-signal non-destructive priority scoring engine, idempotent task synchronization from Phases 3–5 with deduplication keying, task lifecycle state transitions (`open` $\to$ `in_progress` $\to$ `waiting` $\to$ `completed`), invariant separating review completion from underlying FDR approval, officer assignment and reassignment audit logging, invalid assignee rejection, collaborative comment threading, supervisory multi-stage escalation lifecycle (trigger $\to$ acknowledge $\to$ resolve with justification), officer notifications, staff workload metrics, admin queue policy CRUD, unauthorized policy update rejection, and cross-institution data isolation.

---

## 📚 Technical Documentation Index

Detailed architectural and developer guides are available in the [`docs/`](file:///i:/Richu/Projects/SIH/FDR/docs) directory:
- [Phase 6 Officer Dashboard Architecture](file:///i:/Richu/Projects/SIH/FDR/docs/PHASE_6_OFFICER_DASHBOARD.md)
- [Phase 6 Priority Engine & Scoring Rules](file:///i:/Richu/Projects/SIH/FDR/docs/PHASE_6_PRIORITY_ENGINE.md)
- [Phase 6 Task Lifecycle & Synchronization](file:///i:/Richu/Projects/SIH/FDR/docs/PHASE_6_TASK_MANAGEMENT.md)
- [Phase 6 Supervisory Escalations & Workload](file:///i:/Richu/Projects/SIH/FDR/docs/PHASE_6_ESCALATION.md)
- [Phase 6 REST API Specification](file:///i:/Richu/Projects/SIH/FDR/docs/PHASE_6_API.md)
- [Phase 6 Test Execution & Quality Assurance Report](file:///i:/Richu/Projects/SIH/FDR/docs/PHASE_6_TESTING.md)
- [Phase 5 Renewal Architecture](file:///i:/Richu/Projects/SIH/FDR/docs/PHASE_5_RENEWAL_ARCHITECTURE.md)
- [Phase 5 Database Schema & RLS](file:///i:/Richu/Projects/SIH/FDR/docs/PHASE_5_DATABASE.md)
- [Phase 5 6-Signal Matching Engine](file:///i:/Richu/Projects/SIH/FDR/docs/PHASE_5_MATCHING.md)
- [Phase 5 Lineage Graph & DAG Integrity](file:///i:/Richu/Projects/SIH/FDR/docs/PHASE_5_LINEAGE.md)
- [Phase 5 REST API Reference](file:///i:/Richu/Projects/SIH/FDR/docs/PHASE_5_API.md)
- [Phase 5 Testing & Quality Assurance Report](file:///i:/Richu/Projects/SIH/FDR/docs/PHASE_5_TESTING.md)
- [Phase 4 Heartbeat Architecture](file:///i:/Richu/Projects/SIH/FDR/docs/PHASE_4_HEARTBEAT_ARCHITECTURE.md)
- [Phase 4 Scheduler Engine & Worker Guide](file:///i:/Richu/Projects/SIH/FDR/docs/PHASE_4_SCHEDULER.md)

