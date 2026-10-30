# Phase 4: Regulatory Scheduler Engine & Background Worker Guide

## 1. Architecture & Execution Model

The FDR Surveillance Scheduler is an autonomous, idempotent background execution engine built using **APScheduler (Advanced Python Scheduler)** with AsyncIO executor support.

The scheduler executes a 4-phase cycle at configurable cadences to ensure that all government deposits maintain active bank standing without requiring manual oversight.

```
                 ┌──────────────────────────────────────────────────┐
                 │       Regulatory Surveillance Scheduler          │
                 │   (APScheduler Background Service / CLI Runner)   │
                 └────────────────────────┬─────────────────────────┘
                                          │
            ┌─────────────────────────────┼─────────────────────────────┐
            │                             │                             │
            ▼                             ▼                             ▼
   ┌──────────────────┐          ┌──────────────────┐          ┌──────────────────┐
   │ Phase A: Freshness│          │ Phase B: Timeouts│          │ Phase C: Dispatch│
   │      Audit       │          │    & Retries     │          │ Scheduled Checks │
   │ (Alive -> Stale) │          │ (Req -> Unresp)  │          │(Next Due <= Now) │
   └──────────────────┘          └──────────────────┘          └──────────────────┘
                                          │
                                          ▼
                                 ┌──────────────────┐
                                 │ Phase D: Maturity│
                                 │    Reminders     │
                                 │ (90, 60, 30.. d) │
                                 └──────────────────┘
```

---

## 2. Idempotent Cycle Breakdown

The engine executes four distinct, sequential audit sweeps during each run:

### Sweep 1: Freshness Audit (`evaluate_heartbeat_freshness`)
- Identifies all deposits in `alive` status.
- Computes elapsed time since `last_heartbeat_at`.
- Compares with the applicable policy threshold (`stale_after_days` / `stale_threshold_days`).
- If exceeded:
  - Transitions `fdr.heartbeat_status = 'stale'`.
  - Emits High-Severity Alert `heartbeat_stale`.
  - Records `heartbeat_marked_stale` in FDR append-only audit trail.

### Sweep 2: Timeout & Retry Processor (`process_timeouts_and_retries`)
- Queries all checks in `requested` status where `response_due_at < NOW()`.
- If `retry_count < policy.max_retries`:
  - Increments `retry_count += 1`.
  - Extends response deadline: `response_due_at = NOW() + policy.retry_interval_hours`.
  - Appends `heartbeat_retry_scheduled` audit entry.
- If `retry_count >= policy.max_retries`:
  - Marks check `check_status = 'timed_out'`.
  - Sets deposit `heartbeat_status = 'unresponsive'`.
  - Increments `fdr.heartbeat_failure_count`.
  - Emits Critical Regulatory Alert `heartbeat_unresponsive`.
  - Appends `heartbeat_timed_out` audit entry.

### Sweep 3: Scheduled Check Dispatcher (`process_heartbeat_schedules`)
- Scans all active and pending deposits where `next_heartbeat_at <= NOW()` (or unassigned).
- Verifies that no check is currently outstanding (`scheduled` or `requested`).
- Dynamically selects verification method based on bank trust tier:
  - **Tier 3 (Digital Ed25519)** for banks with registered cryptographic public keys.
  - **Tier 2 (Bank Confirmation Token)** generating single-use cryptographic verification token and secure link.
- Appends `heartbeat_check_requested` audit entry.

### Sweep 4: Maturity Date Reminders (`process_maturity_monitoring`)
- Evaluates statutory maturity dates for all unreleased deposits.
- Compares date differences against configured milestones (`90, 60, 30, 7, 1, 0, overdue`).
- Emits deduplicated alerts ensuring compliance desks receive immediate warnings without alert flooding.

---

## 3. Running the Scheduler Service

The scheduler can run as a standalone system daemon, a containerized worker, or a one-shot synchronizer.

### 3.1 One-Shot Execution (CLI / Cron Job)
To execute a single complete surveillance sweep and cleanly exit:
```bash
cd backend
python run_scheduler.py --once
```
**Sample Output**:
```
2026-10-30 14:40:00 INFO [fdr_chain.scheduler] Initializing FDR Chain Surveillance Scheduler Runner...
2026-10-30 14:40:01 INFO [fdr_chain.scheduler] Running single one-shot surveillance cycle...
2026-10-30 14:40:02 INFO [fdr_chain.scheduler] Surveillance Cycle Result:
{
  "status": "success",
  "timestamp": "2026-10-30T09:10:02.128472+00:00",
  "freshness_updated": 0,
  "timed_out": 0,
  "retried": 0,
  "checks_dispatched": 1,
  "maturity_alerts": 2
}
```

### 3.2 Continuous Background Service
To run as a continuous background daemon executing every $N$ seconds:
```bash
cd backend
python run_scheduler.py --interval 300
```
*(Runs an automated surveillance sweep every 300 seconds / 5 minutes).*

### 3.3 Linux Systemd Service Configuration
For production deployments, install as a persistent systemd unit:
```ini
[Unit]
Description=FDR Chain Regulatory Surveillance Scheduler
After=network.target

[Service]
Type=simple
User=fdrchain
WorkingDirectory=/opt/fdrchain/backend
ExecStart=/opt/fdrchain/venv/bin/python run_scheduler.py --interval 600
Restart=always
RestartSec=10
Environment="ENVIRONMENT=production"

[Install]
WantedBy=multi-user.target
```

---

## 4. Manual Cycle Trigger via API
Administrators and compliance officers can trigger an immediate cycle on-demand via authenticated REST API:

```http
POST /api/v1/heartbeat/scheduler/run-cycle
Authorization: Bearer <system_admin_token>
```

**Response (HTTP 200 OK)**:
```json
{
  "status": "success",
  "message": "Full surveillance cycle executed successfully.",
  "cycle_stats": {
    "timestamp": "2026-10-30T09:12:00.000000+00:00",
    "freshness_updated": 0,
    "timed_out": 0,
    "retried": 0,
    "checks_dispatched": 0,
    "maturity_alerts": 0,
    "freshness": { "marked_stale": 0, "evaluated_at": "2026-10-30T09:12:00.000000+00:00" },
    "timeouts_and_retries": { "retried": 0, "timed_out": 0, "processed_at": "2026-10-30T09:12:00.000000+00:00" }
  }
}
```
