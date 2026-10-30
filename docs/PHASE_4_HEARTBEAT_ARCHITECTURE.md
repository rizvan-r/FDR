# Phase 4: Continuous Heartbeat Surveillance & Regulatory Alert Architecture

## 1. Executive Summary & Regulatory Purpose
Government fixed deposit receipts (FDRs) pledged as performance securities or earnest money deposits are historically subject to "silent dormancy" — deposits could be liquidated, prematurely closed, or encumbered by third-party decrees without the beneficiary department's knowledge until contract default. 

**Phase 4: Continuous Heartbeat Surveillance** introduces an autonomous, tamper-evident verification heartbeat mechanism. Every pledged FDR is periodically audited through automated bank re-attestation according to configurable institutional and bank-specific cadences.

---

## 2. Heartbeat State Machine & Lifecycle Transitions

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

### 2.1 State Definitions
| State | Severity | Meaning | SLA Action Required |
| :--- | :--- | :--- | :--- |
| **`not_started`** | Neutral | Deposit registered in system, awaiting initial attestation verification. | First check automatically scheduled based on policy. |
| **`alive`** | Healthy | Depository bank confirmed deposit existence, verified amount, and lien standing within active window. | Periodic monitoring on scheduled cadence. |
| **`stale`** | Warning | Attestation window expired without bank re-verification. Fresh check dispatched. | Nodal branch officer notified. Fresh verification request active. |
| **`broken`** | Critical | Bank actively rejected verification or reported lien discharge, account closure, or court attachment. | **STRICT INVARIANT**: Cannot revert to `alive` automatically. Requires manual supervisory clearance and investigation. |
| **`unresponsive`** | Critical | Depository branch failed to acknowledge or respond to heartbeat requests after maximum retry attempts. | Compliance desk escalation to Bank Regional Head. |

### 2.2 Core Invariant Rules
1. **Broken State Quarantine**: If an FDR enters `broken`, a routine incoming bank confirmation cannot silently transition it back to `alive`. It must remain quarantined until an authorized compliance officer (`system_admin` or `bureau_officer`) documents a formal audit resolution in the Regulatory Alert Desk.
2. **Active Check Uniqueness**: Exactly **one** active check in status `requested` or `scheduled` is permitted per FDR at any time. Any duplicate check requests return `400 Bad Request`.
3. **Immutable Check Ledger**: Every check is sequentially numbered (`Check #1`, `Check #2`, etc.) and permanently recorded with immutable snapshots of deposit parameters, timestamp, and resulting attestation ID.

---

## 3. Configurable Policy Engine

Surveillance frequencies are governed by `heartbeat_policies` evaluated in hierarchical precedence:
1. **Bank Specific Policy Override** (e.g., heightened surveillance for distressed banks).
2. **Institution Specific Policy Override** (e.g., custom cadences for NHAI or DRDO high-value projects).
3. **System Default Active Policy** (Standard 14/30-day cadence, 48h timeout, 3 retries, 24h interval).
4. **Resilient Fallback Policy** (guarantees safe defaults if database connection is disrupted).

### 3.1 Policy Parameters
- `heartbeat_interval_days` (`frequency_days`): Cadence between scheduled checks.
- `stale_after_days` (`stale_threshold_days`): Days without verification before marked `stale`. Must be $\ge$ `heartbeat_interval_days`.
- `response_timeout_hours`: SLA window for bank officer verification response (default: 48h).
- `max_retries`: Number of retry notifications dispatched before transitioning to `unresponsive` (default: 3).
- `retry_interval_hours`: Waiting period between retry reminders (default: 24h).
- `maturity_alert_days`: Milestone thresholds in days prior to maturity to trigger regulatory alerts (`[90, 60, 30, 7, 1, 0]`).

---

## 4. Timeout & Retry Lifecycle Engine

When a check is dispatched to a bank officer via Tier 2 (single-use cryptographic token) or Tier 3 (Ed25519 digital signature):
1. **Initial Dispatch**: Check created with `check_status = 'requested'`, `retry_count = 0`, `response_due_at = NOW() + policy.response_timeout_hours`.
2. **First Timeout Sweep**: If `NOW() > response_due_at` and `retry_count < max_retries`:
   - Increments `retry_count` by 1.
   - Extends deadline: `response_due_at = NOW() + policy.retry_interval_hours`.
   - Records `heartbeat_retry_scheduled` audit event.
3. **Exhaustion Sweep**: If `retry_count >= max_retries` and deadline expires:
   - Sets `check_status = 'timed_out'`.
   - Transitions FDR `heartbeat_status = 'unresponsive'`.
   - Increments `fdr.heartbeat_failure_count`.
   - Emits Critical Regulatory Alert (`heartbeat_unresponsive`).

---

## 5. Maturity Countdown & Reminder Engine

The scheduler performs daily maturity audits across all active and pending deposits against statutory maturity dates:
- **Milestone Windows**:
  - `90 Days`: Early planning reminder for renewal or lien discharge preparation.
  - `60 Days`: Institutional reminder to seek project extension or initiate replacement FDR.
  - `30 Days`: Urgent compliance reminder.
  - `7 Days`: Critical escalation.
  - `1 Day / 24 Hours`: High-urgency alert.
  - `0 Days (Today)`: Immediate action required.
  - `Overdue (< 0 Days)`: Critical alert for expired deposit security.
- **Idempotency & Deduplication**: Ensures duplicate alerts are not generated for the same deposit within the same maturity milestone while an active alert remains unresolved.

---

## 6. Regulatory Alert Desk & Remediation Workflow

The Alert Desk (`/alerts`) provides compliance officers with a centralized supervisory workflow:
1. **Unread Indicator**: Dynamic badge in global header and sidebar indicating active actionable alerts.
2. **Assignment**: Alerts can be assigned to designated compliance officers (`bureau_officer`, `finance_officer`, `regional_officer`).
3. **Resolution with Remediation Notes**: Alerts cannot be closed without documented rationale (e.g., bilateral branch confirmation, court order review).
4. **Broken Clearing Hook**: When resolving a `heartbeat_broken` alert, the system transitions FDR status from `broken` to `stale`, enabling immediate clean re-attestation while preserving the negative audit event.
