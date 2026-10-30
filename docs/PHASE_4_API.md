# Phase 4: REST API Reference — Heartbeat Monitoring & Regulatory Alerts

## 1. Monitoring & Surveillance Endpoints

### 1.1 `GET /api/v1/heartbeat/dashboard`
Returns real-time aggregated metrics across all monitored deposits.

**Access**: `system_admin`, `bureau_officer`, `finance_officer`, `regional_officer`, `institution_user` (scoped).

**Response (HTTP 200 OK)**:
```json
{
  "total_monitored_fdrs": 4,
  "total_monitored": 4,
  "alive_count": 2,
  "stale_count": 1,
  "broken_count": 0,
  "unresponsive_count": 1,
  "not_started_count": 0,
  "upcoming_checks_count": 1,
  "overdue_checks_count": 0,
  "upcoming_maturities_count": 1,
  "upcoming_maturities_30d": 1,
  "active_alerts_count": 2,
  "critical_alerts_count": 1,
  "compliance_rate_percent": 50.0,
  "recent_activity": [
    {
      "id": "check-001",
      "fdr_id": "fdr-001",
      "fdr_number": "FDR-2026-NHAI-84920",
      "bank_name": "State Bank of India",
      "check_number": 1,
      "status": "confirmed",
      "method": "tier3_digital_signature",
      "timestamp": "2026-10-25T12:30:00Z"
    }
  ]
}
```

---

### 1.2 `GET /api/v1/heartbeat/fdrs`
Paginated surveillance registry of all active deposits with health metrics.

**Query Parameters**:
- `search` (string, optional): Search by FDR number, bank name, or institution.
- `heartbeat_status` (string, optional): Filter by `alive`, `stale`, `broken`, `unresponsive`, `not_started`.
- `trust_tier` (int, optional): Filter by `1`, `2`, `3`.
- `page` (int, default: 1).
- `page_size` (int, default: 15, max: 100).

**Response (HTTP 200 OK)**:
```json
{
  "items": [
    {
      "id": "fdr-001",
      "fdr_number": "FDR-2026-NHAI-84920",
      "amount": "25000000.00",
      "currency": "INR",
      "bank_name": "State Bank of India",
      "institution_name": "National Highways Authority of India",
      "heartbeat_status": "alive",
      "last_heartbeat_at": "2026-10-28T14:00:00Z",
      "next_heartbeat_at": "2026-11-11T14:00:00Z",
      "heartbeat_failure_count": 0,
      "applicable_policy_name": "Standard Regulatory Cadence",
      "heartbeat_interval_days": 14,
      "stale_after_days": 21
    }
  ],
  "total": 1,
  "page": 1,
  "page_size": 15,
  "total_pages": 1
}
```

---

### 1.3 `GET /api/v1/fdrs/{fdr_id}/heartbeat`
Fetches detailed surveillance telemetry, active check, and policy for a single FDR.

**Response (HTTP 200 OK)**:
```json
{
  "fdr_id": "fdr-001",
  "fdr_number": "FDR-2026-NHAI-84920",
  "heartbeat_status": "alive",
  "last_heartbeat_at": "2026-10-28T14:00:00Z",
  "next_heartbeat_at": "2026-11-11T14:00:00Z",
  "heartbeat_failure_count": 0,
  "policy": {
    "id": "policy-default-01",
    "name": "Standard Regulatory Cadence",
    "heartbeat_interval_days": 14,
    "stale_after_days": 21
  },
  "active_check": null,
  "total_checks_count": 3
}
```

---

### 1.4 `GET /api/v1/fdrs/{fdr_id}/heartbeat/history`
Returns chronological append-only ledger of all heartbeat checks conducted for an FDR.

**Response (HTTP 200 OK)**:
```json
[
  {
    "id": "check-001",
    "fdr_id": "fdr-001",
    "fdr_number": "FDR-2026-NHAI-84920",
    "bank_id": "bank-01",
    "bank_name": "State Bank of India",
    "check_number": 1,
    "check_status": "confirmed",
    "verification_method": "tier3_digital_signature",
    "requested_at": "2026-10-25T12:00:00Z",
    "response_due_at": "2026-10-27T12:00:00Z",
    "completed_at": "2026-10-25T12:30:00Z",
    "retry_count": 0,
    "notes": "Automated regulatory cadence verification",
    "attestation_id": "attest-t3-sbi-01"
  }
]
```

---

## 2. Check Dispatch Endpoint

### 2.1 `POST /api/v1/fdrs/{fdr_id}/heartbeat/request`
Dispatches an immediate ad-hoc heartbeat check. Enforces active check uniqueness.

**Access**: `system_admin`, `bureau_officer`, `finance_officer`, `regional_officer`.

**Request Body**:
```json
{
  "verification_method": "tier2_bank_confirmation",
  "notes": "Interim audit requested by Auditor General"
}
```

**Response (HTTP 201 Created)**:
```json
{
  "id": "check-abc12345",
  "fdr_id": "fdr-001",
  "fdr_number": "FDR-2026-NHAI-84920",
  "bank_id": "bank-01",
  "check_number": 2,
  "check_status": "requested",
  "verification_method": "tier2_bank_confirmation",
  "requested_at": "2026-10-30T14:40:00Z",
  "response_due_at": "2026-11-01T14:40:00Z",
  "retry_count": 0,
  "notes": "Interim audit requested by Auditor General",
  "verification_url": "/verify/req-789xyz"
}
```

**Error (HTTP 400 Bad Request)**:
```json
{
  "detail": "An active heartbeat check (Check #2) is already outstanding for this FDR."
}
```

---

## 3. Heartbeat Policy Administration

### 3.1 `GET /api/v1/admin/heartbeat-policies`
Lists all registered surveillance cadences.

### 3.2 `POST /api/v1/admin/heartbeat-policies`
**Access**: `system_admin` only.

**Request Body**:
```json
{
  "name": "Accelerated Weekly Surveillance",
  "description": "High-value deposits exceeding 50 Crore",
  "frequency_days": 7,
  "stale_threshold_days": 10,
  "response_timeout_hours": 24,
  "max_retries": 2,
  "retry_interval_hours": 12,
  "maturity_alert_days": [90, 60, 30, 14, 7, 1, 0],
  "is_default": false,
  "is_active": true
}
```

**Response (HTTP 201 Created)**: Returns created `HeartbeatPolicyResponse`.

### 3.3 `PUT /api/v1/admin/heartbeat-policies/{policy_id}`
Updates existing policy parameters. Enforces constraint: `stale_after_days >= heartbeat_interval_days`.

---

## 4. Regulatory Alert Desk Endpoints

### 4.1 `GET /api/v1/alerts`
Returns paginated compliance desk alerts.

**Query Parameters**:
- `fdr_id` (string, optional): Filter by deposit ID.
- `alert_type` (string, optional): e.g. `heartbeat_stale`, `heartbeat_broken`, `maturity_warning_30d`.
- `severity` (string, optional): `low`, `medium`, `high`, `critical`.
- `is_resolved` (bool, optional): `false` for active alerts.
- `search` (string, optional): Keyword query.
- `page`, `page_size`.

### 4.2 `PATCH /api/v1/alerts/{alert_id}/read`
Marks an alert as read by compliance officer.

### 4.3 `PATCH /api/v1/alerts/{alert_id}/assign`
Assigns an alert to a designated compliance officer.

**Request Body**:
```json
{
  "user_id": "usr-admin-01"
}
```

### 4.4 `PATCH /api/v1/alerts/{alert_id}/resolve`
Resolves an active alert with documented audit explanation. If resolving a `heartbeat_broken` alert, clears the deposit quarantine status to `stale` for re-attestation.

**Request Body**:
```json
{
  "resolution_notes": "Bilateral branch consultation confirmed deposit reinstated with correct lien."
}
```

---

## 5. Scheduler Synchronization Endpoint

### 5.1 `POST /api/v1/heartbeat/scheduler/run-cycle`
Triggers an immediate idempotent surveillance cycle.

**Access**: `system_admin`, `bureau_officer`.

**Response (HTTP 200 OK)**:
```json
{
  "status": "success",
  "message": "Full surveillance cycle executed successfully.",
  "cycle_stats": {
    "timestamp": "2026-10-30T09:40:00Z",
    "freshness_updated": 0,
    "timed_out": 0,
    "retried": 0,
    "checks_dispatched": 1,
    "maturity_alerts": 1
  }
}
```
