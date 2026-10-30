# Phase 4: Database Schema & Row Level Security (RLS) Documentation

## 1. Overview & Migration Scripts
Phase 4 database components are partitioned into three reproducible SQL migrations executed in Supabase:
- `database/10_phase4_schema.sql`: Core surveillance tables, columns, indexes, and triggers.
- `database/11_phase4_rls_policies.sql`: Row-Level Security policies enforcing institutional isolation and role segregation.
- `database/12_phase4_seed_data.sql`: Seed heartbeat policies, active surveillance checks, and sample alerts.

---

## 2. Table Specifications

### 2.1 `heartbeat_policies` Table
Defines cadences, SLA response limits, retry behavior, and maturity alert schedules.

| Column Name | Data Type | Nullable | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `UUID` | No | `gen_random_uuid()` | Primary key. |
| `name` | `VARCHAR(100)` | No | - | Policy name (e.g. Standard Regulatory Cadence). |
| `description` | `TEXT` | Yes | `NULL` | Purpose and scope of policy. |
| `heartbeat_interval_days` | `INTEGER` | No | `30` | Cadence in days between scheduled checks. |
| `stale_after_days` | `INTEGER` | No | `45` | Days without verification before marked Stale. |
| `response_timeout_hours` | `INTEGER` | No | `48` | Window for bank officer response. |
| `max_retries` | `INTEGER` | No | `3` | Maximum retry attempts before Unresponsive. |
| `retry_interval_hours` | `INTEGER` | No | `24` | Interval in hours between retry reminders. |
| `maturity_alert_days` | `INTEGER[]` | No | `'{90, 60, 30, 7, 1, 0}'` | Days before maturity to emit reminders. |
| `min_amount` | `NUMERIC(15, 2)` | Yes | `NULL` | Applicable deposit amount lower bound. |
| `max_amount` | `NUMERIC(15, 2)` | Yes | `NULL` | Applicable deposit amount upper bound. |
| `is_active` | `BOOLEAN` | No | `true` | Whether policy is enabled. |
| `is_default` | `BOOLEAN` | No | `false` | Global fallback policy flag. |
| `institution_id` | `UUID` | Yes | `NULL` | FK -> `institutions.id` for institutional overrides. |
| `bank_id` | `UUID` | Yes | `NULL` | FK -> `banks.id` for bank-specific overrides. |
| `created_by` | `UUID` | Yes | `NULL` | FK -> `users.id`. |
| `created_at` | `TIMESTAMPTZ` | No | `NOW()` | Audit creation timestamp. |
| `updated_at` | `TIMESTAMPTZ` | No | `NOW()` | Audit modification timestamp. |

**Constraints**:
- `chk_policy_stale_gte_interval`: `CHECK (stale_after_days >= heartbeat_interval_days)`
- `chk_policy_retries`: `CHECK (max_retries >= 0 AND response_timeout_hours > 0)`

---

### 2.2 `heartbeat_checks` Table
Immutable historical ledger recording every heartbeat confirmation attempt.

| Column Name | Data Type | Nullable | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `UUID` | No | `gen_random_uuid()` | Primary key. |
| `fdr_id` | `UUID` | No | - | FK -> `fdrs.id` ON DELETE CASCADE. |
| `bank_id` | `UUID` | No | - | FK -> `banks.id`. |
| `check_number` | `INTEGER` | No | - | Monotonically increasing sequential check index. |
| `check_status` | `VARCHAR(20)` | No | `'requested'` | Status: `scheduled`, `requested`, `confirmed`, `rejected`, `timed_out`, `cancelled`. |
| `verification_method` | `VARCHAR(40)` | No | `'tier2_bank_confirmation'` | Method: `tier2_bank_confirmation` or `tier3_digital_signature`. |
| `requested_at` | `TIMESTAMPTZ` | No | `NOW()` | Timestamp when check was initiated. |
| `response_due_at` | `TIMESTAMPTZ` | No | - | SLA deadline for response. |
| `completed_at` | `TIMESTAMPTZ` | Yes | `NULL` | Completion timestamp. |
| `retry_count` | `INTEGER` | No | `0` | Number of retry notifications dispatched. |
| `notes` | `TEXT` | Yes | `NULL` | Justification notes for manual or scheduled check. |
| `request_snapshot` | `JSONB` | No | `'{}'::jsonb` | Cryptographic/parameter snapshot of deposit at dispatch. |
| `attestation_id` | `UUID` | Yes | `NULL` | FK -> `bank_attestations.id` on confirmed attestation. |
| `verification_request_id` | `UUID` | Yes | `NULL` | FK -> `verification_requests.id` for Tier 2 token integration. |
| `failure_reason` | `TEXT` | Yes | `NULL` | Recorded rejection or timeout reason. |
| `created_at` | `TIMESTAMPTZ` | No | `NOW()` | Created timestamp. |
| `updated_at` | `TIMESTAMPTZ` | No | `NOW()` | Updated timestamp. |

**Constraints & Indexes**:
- Unique constraint: Exactly one check in `('scheduled', 'requested')` per FDR:
  `CREATE UNIQUE INDEX idx_unique_active_check_per_fdr ON heartbeat_checks(fdr_id) WHERE check_status IN ('scheduled', 'requested');`
- `idx_checks_fdr_lookup`: `CREATE INDEX idx_checks_fdr_lookup ON heartbeat_checks(fdr_id, check_number DESC);`
- `idx_checks_due_status`: `CREATE INDEX idx_checks_due_status ON heartbeat_checks(response_due_at, check_status) WHERE check_status = 'requested';`

---

### 2.3 `fdr_alerts` Table
Centralized compliance desk repository for regulatory notifications and actionable warnings.

| Column Name | Data Type | Nullable | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `UUID` | No | `gen_random_uuid()` | Primary key. |
| `fdr_id` | `UUID` | No | - | FK -> `fdrs.id` ON DELETE CASCADE. |
| `institution_id` | `UUID` | No | - | FK -> `institutions.id`. |
| `alert_type` | `VARCHAR(50)` | No | - | Type: `heartbeat_stale`, `heartbeat_unresponsive`, `heartbeat_broken`, `maturity_30_days`, etc. |
| `severity` | `VARCHAR(20)` | No | `'medium'` | Severity: `low`, `medium`, `high`, `critical`. |
| `title` | `VARCHAR(200)` | No | - | Alert headline. |
| `description` | `TEXT` | No | - | Detailed description and required action. |
| `due_at` | `TIMESTAMPTZ` | Yes | `NULL` | Relevant due date or milestone timestamp. |
| `metadata` | `JSONB` | No | `'{}'::jsonb` | Arbitrary diagnostic or discrepancy details. |
| `is_read` | `BOOLEAN` | No | `false` | Read status. |
| `is_resolved` | `BOOLEAN` | No | `false` | Resolution standing. |
| `assigned_to` | `UUID` | Yes | `NULL` | FK -> `users.id` for assigned compliance officer. |
| `resolution_note` | `TEXT` | Yes | `NULL` | Documented remediation rationale. |
| `resolved_at` | `TIMESTAMPTZ` | Yes | `NULL` | Resolution timestamp. |
| `created_at` | `TIMESTAMPTZ` | No | `NOW()` | Creation timestamp. |
| `updated_at` | `TIMESTAMPTZ` | No | `NOW()` | Modification timestamp. |

**Deduplication Constraint**:
- Unique index: Exactly one unresolved alert per FDR per alert type:
  `CREATE UNIQUE INDEX idx_unique_active_alert ON fdr_alerts(fdr_id, alert_type) WHERE is_resolved = false;`

---

### 2.4 Modifications to `fdrs` Table
The core `fdrs` table is enriched with real-time surveillance health columns:
```sql
ALTER TABLE fdrs
ADD COLUMN IF NOT EXISTS heartbeat_status VARCHAR(20) DEFAULT 'not_started',
ADD COLUMN IF NOT EXISTS last_heartbeat_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS next_heartbeat_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS heartbeat_failure_count INTEGER DEFAULT 0;

ALTER TABLE fdrs
ADD CONSTRAINT chk_fdr_heartbeat_status
CHECK (heartbeat_status IN ('not_started', 'alive', 'stale', 'broken', 'unresponsive'));
```

---

## 3. Row-Level Security (RLS) Policies
Row-level security ensures strict administrative boundary separation and institutional confidentiality:

1. **`heartbeat_policies`**:
   - `SELECT`: All authenticated government and bank officers can read active policies.
   - `INSERT / UPDATE / DELETE`: Restricted strictly to `system_admin`.
2. **`heartbeat_checks`**:
   - `SELECT`: System admins, bureau officers, finance officers have global visibility. Institutional users are constrained to deposits owned by their assigned `institution_id`. Bank nodal officers are constrained to checks targeting their `bank_id`.
   - `INSERT`: Authorized government officers (`system_admin`, `bureau_officer`, `finance_officer`, `regional_officer`) and automated scheduler service.
   - `UPDATE`: Bank officers (completing or rejecting) and system administrators.
3. **`fdr_alerts`**:
   - `SELECT`: Scoped by user institution/region scope. Administrators and bureau officers see all alerts.
   - `PATCH / UPDATE`: Authorized compliance officers can assign and document resolutions. Deletions are disabled to preserve audit integrity.
