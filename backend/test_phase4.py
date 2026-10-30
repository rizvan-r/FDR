import pytest
from datetime import datetime, timezone, timedelta
from decimal import Decimal
from fastapi.testclient import TestClient
from app.main import app
from app.services.fdr_service import fdr_service, LOCAL_FDR_STORE
from app.services.heartbeat_service import (
    heartbeat_service,
    LOCAL_HEARTBEAT_POLICIES,
    LOCAL_HEARTBEAT_CHECKS,
    LOCAL_FDR_ALERTS,
)

client = TestClient(app)

# Helper authentication headers
INST_USER_HEADERS = {"Authorization": "Bearer dev-institution_user-token"}
BANK_NODAL_HEADERS = {"Authorization": "Bearer dev-bank_nodal_officer-token"}
ADMIN_HEADERS = {"Authorization": "Bearer dev-system_admin-token"}
REGIONAL_HEADERS = {"Authorization": "Bearer dev-regional_officer-token"}

@pytest.fixture(autouse=True)
def reset_phase4_state():
    """Reset FDR, checks, alerts, and policies test fixtures between test runs."""
    now = datetime.now(timezone.utc)
    for f in LOCAL_FDR_STORE:
        if f["id"] == "fdr-001":
            f["trust_tier"] = 2
            f["verification_status"] = "bank_confirmed"
            f["heartbeat_status"] = "alive"
            f["last_heartbeat_at"] = now - timedelta(days=2)
            f["next_heartbeat_at"] = now + timedelta(days=12)
            f["heartbeat_failure_count"] = 0
            f["maturity_date"] = (now + timedelta(days=180)).date()
        elif f["id"] == "fdr-002":
            f["trust_tier"] = 1
            f["verification_status"] = "institution_declared"
            f["heartbeat_status"] = "not_started"
            f["last_heartbeat_at"] = None
            f["next_heartbeat_at"] = now + timedelta(days=7)
            f["heartbeat_failure_count"] = 0
            f["maturity_date"] = (now + timedelta(days=25)).date()

    # Clear volatile checks and alerts
    LOCAL_HEARTBEAT_CHECKS.clear()
    LOCAL_FDR_ALERTS.clear()
    from app.services.verification_service import LOCAL_VERIFICATION_REQUESTS
    LOCAL_VERIFICATION_REQUESTS.clear()
    yield


def test_heartbeat_dashboard_stats():
    """Verify GET /api/v1/heartbeat/dashboard returns aggregated surveillance metrics."""
    res = client.get("/api/v1/heartbeat/dashboard", headers=ADMIN_HEADERS)
    assert res.status_code == 200
    data = res.json()
    assert "total_monitored_fdrs" in data
    assert "alive_count" in data
    assert "stale_count" in data
    assert "broken_count" in data
    assert "unresponsive_count" in data
    assert "compliance_rate_percent" in data
    assert data["total_monitored_fdrs"] >= 2


def test_fetch_monitored_fdrs():
    """Verify GET /api/v1/heartbeat/fdrs returns paginated registry and filters by status."""
    res = client.get("/api/v1/heartbeat/fdrs?heartbeat_status=alive", headers=INST_USER_HEADERS)
    assert res.status_code == 200
    data = res.json()
    assert "items" in data
    assert "total" in data
    for item in data["items"]:
        assert item["heartbeat_status"] == "alive"


def test_manual_check_dispatch():
    """Test manual heartbeat check dispatch creates a requested check and updates next_heartbeat_at."""
    res = client.post(
        "/api/v1/fdrs/fdr-001/heartbeat/request",
        json={"notes": "Manual interim audit for Q3 balance sheet verification."},
        headers=ADMIN_HEADERS,
    )
    assert res.status_code == 201
    data = res.json()
    assert data["fdr_id"] == "fdr-001"
    assert data["check_status"] == "requested"
    assert "Manual interim audit" in data["notes"]

    # Verify FDR next_heartbeat_at was refreshed
    fdr_res = client.get("/api/v1/fdrs/fdr-001", headers=ADMIN_HEADERS)
    assert fdr_res.status_code == 200
    assert fdr_res.json()["next_heartbeat_at"] is not None


def test_duplicate_active_check_prevented():
    """Invariant: Exactly one active check (scheduled/requested) permitted per FDR."""
    res1 = client.post(
        "/api/v1/fdrs/fdr-001/heartbeat/request",
        json={"notes": "First check"},
        headers=ADMIN_HEADERS,
    )
    assert res1.status_code == 201

    # Second check while first is still requested should return 400
    res2 = client.post(
        "/api/v1/fdrs/fdr-001/heartbeat/request",
        json={"notes": "Duplicate check"},
        headers=ADMIN_HEADERS,
    )
    assert res2.status_code == 400
    assert "already outstanding" in res2.json()["detail"].lower()


def test_heartbeat_policy_crud():
    """Verify Admin can list, create, and update heartbeat policies."""
    # List policies
    res_list = client.get("/api/v1/admin/heartbeat-policies", headers=ADMIN_HEADERS)
    assert res_list.status_code == 200
    assert len(res_list.json()) >= 1

    # Create new policy
    new_pol = {
        "name": "Treasury Special High-Frequency Policy",
        "description": "Weekly surveillance for deposits exceeding 50 Crore.",
        "is_default": False,
        "min_amount": 500000000,
        "max_amount": None,
        "frequency_days": 7,
        "response_timeout_hours": 24,
        "max_retries": 2,
        "retry_interval_hours": 12,
        "stale_threshold_days": 10,
        "is_active": True,
    }
    res_create = client.post(
        "/api/v1/admin/heartbeat-policies",
        json=new_pol,
        headers=ADMIN_HEADERS,
    )
    assert res_create.status_code == 201
    created = res_create.json()
    pol_id = created["id"]
    assert created["name"] == "Treasury Special High-Frequency Policy"

    # Update policy
    res_update = client.put(
        f"/api/v1/admin/heartbeat-policies/{pol_id}",
        json={"frequency_days": 5, "response_timeout_hours": 18},
        headers=ADMIN_HEADERS,
    )
    assert res_update.status_code == 200
    assert res_update.json()["frequency_days"] == 5


def test_non_admin_cannot_create_policy():
    """RBAC check: Only system_admin may create or update heartbeat policies."""
    res = client.post(
        "/api/v1/admin/heartbeat-policies",
        json={"name": "Unauthorized Policy", "frequency_days": 10},
        headers=INST_USER_HEADERS,
    )
    assert res.status_code in (401, 403)


def test_freshness_audit_transitions_to_stale():
    """Verify that an FDR whose last heartbeat exceeds policy threshold transitions to 'stale'."""
    now = datetime.now(timezone.utc)
    for f in LOCAL_FDR_STORE:
        if f["id"] == "fdr-001":
            # Set last heartbeat to 35 days ago (policy default stale threshold is 21 days)
            f["last_heartbeat_at"] = now - timedelta(days=35)
            f["heartbeat_status"] = "alive"

    # Run freshness audit
    updated_count = heartbeat_service.check_and_update_freshness()
    assert updated_count >= 1

    # Verify FDR status is now stale
    res = client.get("/api/v1/fdrs/fdr-001", headers=ADMIN_HEADERS)
    assert res.json()["heartbeat_status"] == "stale"

    # Verify alert created
    alert_res = client.get("/api/v1/alerts?fdr_id=fdr-001&alert_type=heartbeat_stale", headers=ADMIN_HEADERS)
    assert alert_res.status_code == 200
    assert alert_res.json()["total"] >= 1


def test_explicit_rejection_transitions_to_broken():
    """When a verification is rejected due to discrepancy, status transitions to 'broken'."""
    heartbeat_service.handle_heartbeat_rejection(
        fdr_id="fdr-001",
        reason="Bank reported lien invoked by third-party decree",
        discrepancy_details={"error_code": "LIEN_BREACH"},
    )

    res = client.get("/api/v1/fdrs/fdr-001", headers=ADMIN_HEADERS)
    assert res.json()["heartbeat_status"] == "broken"

    # Verify critical alert was generated
    alert_res = client.get("/api/v1/alerts?fdr_id=fdr-001&alert_type=heartbeat_broken", headers=ADMIN_HEADERS)
    assert alert_res.json()["total"] >= 1
    assert alert_res.json()["items"][0]["severity"] == "critical"


def test_broken_status_cannot_silently_revert_to_alive():
    """Surveillance Rule #4.3: An FDR marked 'broken' cannot silently transition back to 'alive'."""
    # Mark as broken
    heartbeat_service.handle_heartbeat_rejection(
        fdr_id="fdr-001",
        reason="Lien discrepancy flagged",
    )
    fdr_before = client.get("/api/v1/fdrs/fdr-001", headers=ADMIN_HEADERS).json()
    assert fdr_before["heartbeat_status"] == "broken"

    # Simulate routine heartbeat confirmation hook
    heartbeat_service.handle_heartbeat_confirmation(
        fdr_id="fdr-001",
        attestation_id="attest-test-999",
    )

    # Invariant: Must STILL be broken because no documented authorized review resolved the alert
    fdr_after = client.get("/api/v1/fdrs/fdr-001", headers=ADMIN_HEADERS).json()
    assert fdr_after["heartbeat_status"] == "broken"


def test_retry_and_timeout_engine():
    """Verify timeout and retry lifecycle: retry interval, max retries, transition to unresponsive."""
    now = datetime.now(timezone.utc)

    # Create an expired check with retry_count = 0
    expired_check = {
        "id": "chk-timeout-01",
        "fdr_id": "fdr-001",
        "policy_id": "pol-01",
        "scheduled_at": now - timedelta(hours=50),
        "requested_at": now - timedelta(hours=50),
        "responded_at": None,
        "check_status": "requested",
        "retry_count": 0,
        "created_at": now - timedelta(hours=50),
        "updated_at": now - timedelta(hours=50),
    }
    LOCAL_HEARTBEAT_CHECKS.append(expired_check)

    # First pass: should retry (retry_count 0 -> 1)
    res_1 = heartbeat_service.process_timeouts_and_retries()
    retried_1 = res_1.get("retried", 0)
    timed_out_1 = res_1.get("timed_out", 0)
    assert retried_1 == 1
    assert timed_out_1 == 0
    assert expired_check["retry_count"] == 1
    assert expired_check["check_status"] == "requested"

    # Simulate 2 more retries reaching max retries (3)
    expired_check["retry_count"] = 3
    expired_check["next_retry_at"] = now - timedelta(hours=1)
    expired_check["requested_at"] = now - timedelta(hours=50)

    res_2 = heartbeat_service.process_timeouts_and_retries()
    retried_2 = res_2.get("retried", 0)
    timed_out_2 = res_2.get("timed_out", 0)
    assert timed_out_2 == 1
    assert expired_check["check_status"] == "timed_out"

    # FDR should now be 'unresponsive' with critical alert
    fdr_res = client.get("/api/v1/fdrs/fdr-001", headers=ADMIN_HEADERS)
    assert fdr_res.json()["heartbeat_status"] == "unresponsive"

    alert_res = client.get("/api/v1/alerts?fdr_id=fdr-001&alert_type=heartbeat_unresponsive", headers=ADMIN_HEADERS)
    assert alert_res.json()["total"] >= 1


def test_maturity_reminders_and_deduplication():
    """Verify maturity reminders generate appropriate alerts and prevent duplicate alerts."""
    now = datetime.now(timezone.utc)
    for f in LOCAL_FDR_STORE:
        if f["id"] == "fdr-001":
            # Set maturity to exactly 28 days ahead (matches 30d window)
            f["maturity_date"] = (now + timedelta(days=28)).date()

    alerts_created_1 = heartbeat_service.generate_maturity_reminders()
    assert alerts_created_1 >= 1

    # Verify alert exists
    alert_res = client.get("/api/v1/alerts?fdr_id=fdr-001&alert_type=maturity_warning_30d", headers=ADMIN_HEADERS)
    assert alert_res.json()["total"] == 1

    # Second pass: Invariant deduplication — must not recreate
    alerts_created_2 = heartbeat_service.generate_maturity_reminders()
    assert alerts_created_2 == 0
    alert_res_after = client.get("/api/v1/alerts?fdr_id=fdr-001&alert_type=maturity_warning_30d", headers=ADMIN_HEADERS)
    assert alert_res_after.json()["total"] == 1


def test_regulatory_alert_desk_lifecycle():
    """Verify Alert Desk actions: read, assign, and resolve with remediation notes."""
    # Create an alert
    alert = heartbeat_service.create_alert(
        fdr_id="fdr-001",
        alert_type="heartbeat_stale",
        severity="warning",
        title="Test Stale Check Alert",
        message="Deposit has not responded within stale SLA.",
    )
    alert_id = alert["id"]

    # 1. Mark as read
    res_read = client.patch(f"/api/v1/alerts/{alert_id}/read", headers=ADMIN_HEADERS)
    assert res_read.status_code == 200
    assert res_read.json()["is_read"] is True

    # 2. Assign to officer
    res_assign = client.patch(
        f"/api/v1/alerts/{alert_id}/assign",
        json={"user_id": "usr-admin-01"},
        headers=ADMIN_HEADERS,
    )
    assert res_assign.status_code == 200
    assert res_assign.json()["assigned_to"] == "usr-admin-01"

    # 3. Resolve with notes
    res_resolve = client.patch(
        f"/api/v1/alerts/{alert_id}/resolve",
        json={"resolution_notes": "Bilateral confirmation with Branch Manager verified deposit in order."},
        headers=ADMIN_HEADERS,
    )
    assert res_resolve.status_code == 200
    data = res_resolve.json()
    assert data["is_resolved"] is True
    assert "Bilateral confirmation" in data["resolution_notes"]

    # 4. Invariant: Cannot resolve already resolved alert
    res_resolve_dup = client.patch(
        f"/api/v1/alerts/{alert_id}/resolve",
        json={"resolution_notes": "Second attempt"},
        headers=ADMIN_HEADERS,
    )
    assert res_resolve_dup.status_code == 400


def test_scheduler_cycle_trigger_endpoint():
    """Test POST /api/v1/heartbeat/scheduler/run-cycle executes full cycle via API."""
    res = client.post("/api/v1/heartbeat/scheduler/run-cycle", headers=ADMIN_HEADERS)
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "success"
    assert "cycle_stats" in data
    stats = data["cycle_stats"]
    assert "freshness_updated" in stats
    assert "timed_out" in stats
    assert "checks_dispatched" in stats
    assert "maturity_alerts" in stats
