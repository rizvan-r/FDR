# Phase 8: FDR Release, Refund & Closure Management

## 1. Overview & Statutory Scope
Phase 8 implements the complete regulatory lifecycle for the release, lien revocation, refund reconciliation, and permanent archival closure of Fixed Deposit Receipts (FDRs) pledged as statutory collateral under the AICTE Approval Process Handbook (APH).

This phase establishes a strictly governed, decoupled workflow where:
1. **Release Request Initiation**: Institutions or authorized officers submit formal release requests with statutory grounds.
2. **Policy Versioning**: Configurable release policies (e.g., `RPV-2026.1`) dictate mandatory checklist criteria and delegation stages.
3. **Multi-Stage Regulatory Review**: 4-tier delegation review across Regional Office, Approval Bureau, Finance Bureau, and Competent Authority with strict separation-of-duties and self-approval prevention.
4. **Decoupled FDR Lifecycle Invariant**: Request approval sanctions release, but **never** directly alters the underlying FDR's lifecycle status.
5. **Bank Release Tracking**: Dispatches formal release instructions and validates depository bank lien discharge confirmations (`'released'`), which then updates the FDR lifecycle status to `'released'`.
6. **Refund & Treasury Reconciliation**: Multi-currency ledger tracking expected refund, installments, payment modes (RTGS, NEFT, Treasury Transfer), and UTR references until final reconciliation.
7. **Statutory Case Closure**: Permanent closure order verifying bank discharge and refund reconciliation, formally transitioning the FDR's lifecycle status to `'closed'` while preserving trust tiers, heartbeat records, and renewal lineage intact.

---

## 2. Invariants & Security Guardrails
- **Self-Approval Prohibition**: An officer or applicant who submitted a release request cannot review, audit, recommend, or approve their own submission (`HTTP 403 Forbidden`).
- **Conflict Prevention**: An FDR cannot have multiple active release requests simultaneously. Only one non-terminal request (`status NOT IN ('closed', 'rejected', 'cancelled')`) is permitted per FDR.
- **Decoupled Confirmation vs Approval**: Approval of a release request does not discharge the deposit or alter its lifecycle standing. Only validated depository bank confirmation transitions the deposit to `'released'`.
- **Sandbox Disclaimer**: All banking actions and lien discharges operate in a sovereign simulation sandbox with mandatory banner disclaimers:
  `"SIMULATED DEMO — NOT AN ACTUAL BANK MONEY TRANSFER"`.
- **Integrity Preservation**: Trust Tier (1, 2, or 3), cryptographic attestation history, periodic heartbeat surveillance logs, and renewal lineage graphs remain completely intact.

---

## 3. Database Architecture
- `database/22_phase8_schema.sql`:
  - `release_policy_versions`: Versioned statutory checklists, approval configurations, and effective dates.
  - `release_requests`: Primary release dossiers with request numbers, statuses, review tracking, and timestamps.
  - `release_checklist_items`: Individual policy requirement items with verification statuses (`satisfied`, `not_satisfied`, `needs_clarification`, `pending`).
  - `release_reviews`: Audit history of supervisory remarks, delegation stages, and sanction orders.
  - `bank_releases`: Commercial depository bank instruction tracking, confirmation references, and simulation tags.
  - `refund_records`: Treasury ledger recording expected sum, received sum, and reconciliation standing.
  - `refund_transactions`: Detailed transaction credits with UTR numbers, payment modes, and amounts.
  - `release_closures`: Final closure orders with reconciliation certifications and closure remarks.
  - Constraints: Check constraints ensuring only valid enum states; unique index preventing multiple active release requests for the same FDR; updated `check_fdr_lifecycle_phase8` constraint supporting `'closed'`.
- `database/23_phase8_rls_policies.sql`: Row-Level Security for multi-tenant isolation, restricting institutional users to their own entity's dossiers while providing cross-jurisdiction access to regulatory officers and system admins.
- `database/24_phase8_seed_data.sql`: Seed release policy version `RPV-2026.1`, sample release cases across multiple stages (`REL-2026-0001`, `REL-2026-0002`, `REL-2026-0003`), checklist items, and reconciled refund transactions.

---

## 4. Frontend User Experience
- **Release Command Center** (`/releases`): High-level operational command displaying real-time metrics, quick navigation cards, status filters, and global dossier registry.
- **Release Initiation Workbench** (`/releases/new`): Guided 4-step workflow for selecting vault FDRs, applicable policy version, statutory grounds, and previewing mandatory checklist items.
- **Dossier Detail Cockpit** (`/releases/:id`): Tabbed workspace providing full visibility into:
  - Deposit Profile & Vault Standing
  - Statutory Eligibility Checklist with inline officer audit actions
  - Multi-tier Review & Supervisory Decisions
  - Bank Release Tracking with simulated bank confirmation modal
  - Financial Refund & Treasury Reconciliation Ledger with credit recording
  - Final Case Closure with pre-requisite verification modal
- **Actionable Review Queue** (`/releases/queue`): Filtered inbox for regulatory officers to process cases across delegation stages.
- **Financial Treasury Ledger** (`/refunds`): Dedicated refund ledger monitoring institutional remittances, balance outstanding, and reconciliation statuses.
- **Bank Release Surveillance** (`/releases/bank-tracking`): Surveillance dashboard tracking depository bank lien discharges with sandbox disclaimers.
- **Policy Engine Administration** (`/admin/release-policies`): Administration portal to configure release checklists, delegation tiers, and active policy version switches.
