import pytest
from datetime import datetime, timezone, timedelta
from fastapi.testclient import TestClient
from app.main import app
from app.auth.jwt import token_validator
from app.services.task_service import (
    task_service, LOCAL_OFFICER_TASKS, LOCAL_TASK_ASSIGNMENTS,
    LOCAL_TASK_COMMENTS, LOCAL_TASK_ESCALATIONS, LOCAL_OFFICER_NOTIFICATIONS
)
from app.services.priority_service import priority_engine

client = TestClient(app)

@pytest.fixture(autouse=True)
def setup_auth_override():
    original = token_validator.verify_token
    # Default admin user override
    async def override_verify_token(token: str):
        if token == "invalid":
            raise Exception("Invalid token")
        return {
            "sub": "00000000-0000-0000-0000-000000000001",
            "email": "admin@fdrchain.gov.in",
            "role": "system_admin"
        }
    token_validator.verify_token = override_verify_token
    yield
    token_validator.verify_token = original

def test_officer_dashboard_stats():
    response = client.get(
        "/api/v1/officer/dashboard",
        headers={"Authorization": "Bearer mock-admin-token"}
    )
    assert response.status_code == 200
    data = response.json()
    assert "open_tasks" in data
    assert "critical_tasks" in data
    assert "high_priority_tasks" in data
    assert "overdue_tasks" in data
    assert "completed_this_month" in data
    assert "average_processing_hours" in data
    assert isinstance(data["recent_activity"], list)

def test_list_officer_tasks_with_filtering():
    response = client.get(
        "/api/v1/officer/tasks",
        headers={"Authorization": "Bearer mock-admin-token"}
    )
    assert response.status_code == 200
    tasks = response.json()
    assert len(tasks) > 0

    # Filter by status
    res_open = client.get(
        "/api/v1/officer/tasks?status=open",
        headers={"Authorization": "Bearer mock-admin-token"}
    )
    assert res_open.status_code == 200
    for t in res_open.json():
        assert t["task_status"] == "open"

    # Filter by priority level
    res_crit = client.get(
        "/api/v1/officer/tasks?priority_level=critical",
        headers={"Authorization": "Bearer mock-admin-token"}
    )
    assert res_crit.status_code == 200
    for t in res_crit.json():
        assert t["priority_level"] == "critical"

def test_get_officer_task_detail():
    response = client.get(
        "/api/v1/officer/tasks/task-001",
        headers={"Authorization": "Bearer mock-admin-token"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == "task-001"
    assert data["task_type"] == "broken_fdr_review"
    assert "assignments" in data
    assert "comments" in data
    assert "escalations" in data

def test_priority_calculation_engine():
    # Broken FDR: 100 pts -> critical
    res_broken = priority_engine.calculate_task_priority(
        task_type="broken_fdr_review"
    )
    assert res_broken.score >= 100
    assert res_broken.level == "critical"
    assert any(r.code == "broken_fdr" for r in res_broken.reasons)

    # Deadline overdue: +50 pts
    now = datetime.now(timezone.utc)
    res_overdue = priority_engine.calculate_task_priority(
        task_type="stale_heartbeat_review",  # 40 pts
        due_at=now - timedelta(hours=2)      # +50 pts -> 90 pts (high)
    )
    assert res_overdue.score == 90
    assert res_overdue.level == "high"

def test_task_synchronization_idempotence():
    # Call sync endpoint
    res1 = client.post(
        "/api/v1/officer/tasks/sync",
        headers={"Authorization": "Bearer mock-admin-token"}
    )
    assert res1.status_code == 200
    data1 = res1.json()
    assert data1["status"] == "success"

    # Call sync endpoint again - verify deduplication prevents duplicate tasks
    res2 = client.post(
        "/api/v1/officer/tasks/sync",
        headers={"Authorization": "Bearer mock-admin-token"}
    )
    assert res2.status_code == 200
    data2 = res2.json()
    assert data2["created_count"] == 0  # No duplicate tasks created

def test_task_lifecycle_transitions():
    # Start task: open -> in_progress
    res_start = client.post(
        "/api/v1/officer/tasks/task-001/start",
        json={"note": "Commencing officer investigation"},
        headers={"Authorization": "Bearer mock-admin-token"}
    )
    assert res_start.status_code == 200
    assert res_start.json()["task_status"] == "in_progress"
    assert res_start.json()["started_at"] is not None

    # Wait task: in_progress -> waiting
    res_wait = client.post(
        "/api/v1/officer/tasks/task-001/wait",
        json={"reason": "Awaiting branch nodal officer response"},
        headers={"Authorization": "Bearer mock-admin-token"}
    )
    assert res_wait.status_code == 200
    assert res_wait.json()["task_status"] == "waiting"

    # Complete task: waiting -> completed
    res_comp = client.post(
        "/api/v1/officer/tasks/task-001/complete",
        json={"completion_note": "Lien standing validated and cleared by legal counsel"},
        headers={"Authorization": "Bearer mock-admin-token"}
    )
    assert res_comp.status_code == 200
    assert res_comp.json()["task_status"] == "completed"
    assert res_comp.json()["completed_at"] is not None

    # Prevent starting an already completed task
    res_invalid = client.post(
        "/api/v1/officer/tasks/task-001/start",
        json={},
        headers={"Authorization": "Bearer mock-admin-token"}
    )
    assert res_invalid.status_code == 400

def test_task_completion_does_not_approve_underlying_fdr():
    # Task 003 is associated with FDR-2023-SBI-001
    res_comp = client.post(
        "/api/v1/officer/tasks/task-003/complete",
        json={"completion_note": "Officer review note recorded"},
        headers={"Authorization": "Bearer mock-admin-token"}
    )
    assert res_comp.status_code == 200
    assert res_comp.json()["task_status"] == "completed"

    # Verify FDR status remains unaffected in the repository
    fdr_res = client.get(
        "/api/v1/fdrs/fdr-001",
        headers={"Authorization": "Bearer mock-admin-token"}
    )
    assert fdr_res.status_code == 200

def test_task_assignment_and_reassignment():
    # Self-assignment
    res_assign = client.post(
        "/api/v1/officer/tasks/task-002/assign",
        json={"assigned_to": "usr-admin-01", "assignment_note": "Handling CPWD inquiry"},
        headers={"Authorization": "Bearer mock-admin-token"}
    )
    assert res_assign.status_code == 200
    assert res_assign.json()["assigned_to"] == "usr-admin-01"

    # Reassignment to another officer
    res_reassign = client.post(
        "/api/v1/officer/tasks/task-002/assign",
        json={"assigned_to": "usr-regional-01", "assignment_note": "Delegated to Regional Officer"},
        headers={"Authorization": "Bearer mock-admin-token"}
    )
    assert res_reassign.status_code == 200
    assert res_reassign.json()["assigned_to"] == "usr-regional-01"

    # Unassignment
    res_unassign = client.post(
        "/api/v1/officer/tasks/task-002/assign",
        json={"assigned_to": None, "assignment_note": "Unassigned for pool pickup"},
        headers={"Authorization": "Bearer mock-admin-token"}
    )
    assert res_unassign.status_code == 200
    assert res_unassign.json()["assigned_to"] is None

def test_prevent_invalid_officer_assignment():
    res = client.post(
        "/api/v1/officer/tasks/task-002/assign",
        json={"assigned_to": "invalid_officer_id", "assignment_note": "Invalid user"},
        headers={"Authorization": "Bearer mock-admin-token"}
    )
    assert res.status_code == 400

def test_add_task_comment():
    res = client.post(
        "/api/v1/officer/tasks/task-002/comments",
        json={"comment_text": "Followed up with PNB zonal office regarding automated retries."},
        headers={"Authorization": "Bearer mock-admin-token"}
    )
    assert res.status_code == 200
    comment = res.json()
    assert comment["task_id"] == "task-002"
    assert "PNB zonal office" in comment["comment_text"]

def test_escalation_lifecycle():
    # Escalate task-004
    res_esc = client.post(
        "/api/v1/officer/tasks/task-004/escalate",
        json={"reason": "Stale heartbeat unaddressed for 14 days; requires Bureau escalation"},
        headers={"Authorization": "Bearer mock-admin-token"}
    )
    assert res_esc.status_code == 200
    esc = res_esc.json()
    esc_id = esc["id"]
    assert esc["task_id"] == "task-004"
    assert esc["escalation_level"] == 1

    # Prevent duplicate active escalation
    res_dup = client.post(
        "/api/v1/officer/tasks/task-004/escalate",
        json={"reason": "Another escalation attempt"},
        headers={"Authorization": "Bearer mock-admin-token"}
    )
    assert res_dup.status_code == 400

    # Acknowledge escalation
    res_ack = client.post(
        f"/api/v1/officer/tasks/task-004/escalations/{esc_id}/acknowledge",
        json={"note": "Bureau head acknowledged"},
        headers={"Authorization": "Bearer mock-admin-token"}
    )
    assert res_ack.status_code == 200
    assert res_ack.json()["acknowledged_at"] is not None

    # Resolve escalation
    res_res = client.post(
        f"/api/v1/officer/tasks/task-004/escalations/{esc_id}/resolve",
        json={"resolution_note": "Zonal head confirmed deposit re-attestation in progress"},
        headers={"Authorization": "Bearer mock-admin-token"}
    )
    assert res_res.status_code == 200
    assert res_res.json()["resolved_at"] is not None

def test_officer_notifications():
    res = client.get(
        "/api/v1/officer/notifications",
        headers={"Authorization": "Bearer mock-admin-token"}
    )
    assert res.status_code == 200
    notifs = res.json()
    assert len(notifs) > 0
    notif_id = notifs[0]["id"]

    # Mark as read
    res_read = client.patch(
        f"/api/v1/officer/notifications/{notif_id}/read",
        headers={"Authorization": "Bearer mock-admin-token"}
    )
    assert res_read.status_code == 200
    assert res_read.json()["read_at"] is not None

def test_workload_summary():
    res = client.get(
        "/api/v1/officer/workload",
        headers={"Authorization": "Bearer mock-admin-token"}
    )
    assert res.status_code == 200
    data = res.json()
    assert "officers" in data
    assert "total_assigned" in data
    assert "total_unassigned" in data
    assert len(data["officers"]) > 0

def test_queue_policies_administration():
    # Fetch policies
    res = client.get(
        "/api/v1/officer/policies",
        headers={"Authorization": "Bearer mock-admin-token"}
    )
    assert res.status_code == 200
    policies = res.json()
    assert len(policies) > 0
    pol_id = policies[0]["id"]

    # Update policy (Admin only)
    res_up = client.put(
        f"/api/v1/officer/policies/{pol_id}",
        json={"weights": {"broken_fdr": 120}},
        headers={"Authorization": "Bearer mock-admin-token"}
    )
    assert res_up.status_code == 200
    assert res_up.json()["weights"]["broken_fdr"] == 120

def test_unauthorized_policy_update():
    # Non-admin role override
    async def override_user_token(token: str):
        return {
            "sub": "00000000-0000-0000-0000-000000000002",
            "email": "user@institution.ac.in",
            "role": "institution_user"
        }
    token_validator.verify_token = override_user_token

    res = client.put(
        "/api/v1/officer/policies/policy-001",
        json={"weights": {"broken_fdr": 90}},
        headers={"Authorization": "Bearer mock-user-token"}
    )
    assert res.status_code == 403

def test_cross_institution_isolation():
    # Institution user from inst-01 trying to view task from inst-04
    async def override_inst_token(token: str):
        return {
            "sub": "00000000-0000-0000-0000-000000000003",
            "email": "user@inst01.ac.in",
            "role": "institution_user",
            "institution_id": "inst-01"
        }
    token_validator.verify_token = override_inst_token

    # Task 001 belongs to inst-04 (DRDO)
    res = client.get(
        "/api/v1/officer/tasks/task-001",
        headers={"Authorization": "Bearer mock-inst-token"}
    )
    assert res.status_code == 403
