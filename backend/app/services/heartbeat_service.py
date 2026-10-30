import logging
from typing import Dict, Any, List, Optional, Tuple, Union
from uuid import uuid4
from datetime import datetime, timezone, timedelta, date
from decimal import Decimal
from fastapi import HTTPException, status

from app.services.supabase_admin import supabase_admin
from app.services.fdr_service import fdr_service, LOCAL_FDR_STORE
from app.services.verification_service import verification_service, LOCAL_VERIFICATION_REQUESTS, LOCAL_BANK_ATTESTATIONS

logger = logging.getLogger("fdr_chain.heartbeat_service")

# ==============================================================================
# IN-MEMORY STORES FOR LOCAL TESTING & EVALUATION FALLBACK
# ==============================================================================

LOCAL_HEARTBEAT_POLICIES: List[Dict[str, Any]] = [
    {
        "id": "policy-default-01",
        "name": "Standard Regulatory Cadence (30-Day Interval)",
        "heartbeat_interval_days": 14,
        "frequency_days": 14,
        "stale_after_days": 21,
        "stale_threshold_days": 21,
        "response_timeout_hours": 48,
        "max_retries": 3,
        "retry_interval_hours": 24,
        "maturity_alert_days": [90, 60, 30, 7, 1, 0],
        "is_active": True,
        "is_default": True,
        "institution_id": None,
        "bank_id": None,
        "created_by": "usr-admin-01",
        "created_at": datetime.now(timezone.utc) - timedelta(days=60),
        "updated_at": datetime.now(timezone.utc) - timedelta(days=60),
    },
    {
        "id": "policy-accelerated-02",
        "name": "High-Value Deposit Accelerated Cadence (14-Day Interval)",
        "heartbeat_interval_days": 14,
        "frequency_days": 14,
        "stale_after_days": 21,
        "stale_threshold_days": 21,
        "response_timeout_hours": 24,
        "max_retries": 2,
        "retry_interval_hours": 12,
        "maturity_alert_days": [90, 60, 30, 14, 7, 1, 0],
        "is_active": True,
        "is_default": False,
        "institution_id": None,
        "bank_id": None,
        "created_by": "usr-admin-01",
        "created_at": datetime.now(timezone.utc) - timedelta(days=60),
        "updated_at": datetime.now(timezone.utc) - timedelta(days=60),
    },
]

LOCAL_HEARTBEAT_CHECKS: List[Dict[str, Any]] = [
    {
        "id": "check-001",
        "fdr_id": "fdr-001",
        "fdr_number": "FDR-2026-NHAI-84920",
        "bank_id": "bank-01",
        "bank_name": "State Bank of India",
        "institution_id": "inst-01",
        "institution_name": "National Highways Authority of India",
        "check_number": 1,
        "check_status": "confirmed",
        "verification_method": "tier3_digital_signature",
        "requested_at": datetime.now(timezone.utc) - timedelta(days=5, hours=2),
        "response_due_at": datetime.now(timezone.utc) - timedelta(days=3),
        "completed_at": datetime.now(timezone.utc) - timedelta(days=5),
        "retry_count": 0,
        "request_snapshot": {
            "fdr_number": "FDR-2026-NHAI-84920",
            "amount": "25000000.00",
            "currency": "INR",
            "issue_date": "2026-01-15",
            "maturity_date": "2027-01-15",
            "lien_in_favour": "Chairman, National Highways Authority of India",
        },
        "attestation_id": "attest-t3-sbi-01",
        "verification_request_id": None,
        "failure_reason": None,
        "created_at": datetime.now(timezone.utc) - timedelta(days=5, hours=2),
        "updated_at": datetime.now(timezone.utc) - timedelta(days=5),
    },
    {
        "id": "check-002",
        "fdr_id": "fdr-002",
        "fdr_number": "FDR-2026-CPWD-10294",
        "bank_id": "bank-02",
        "bank_name": "Punjab National Bank",
        "institution_id": "inst-02",
        "institution_name": "Central Public Works Department",
        "check_number": 1,
        "check_status": "confirmed",
        "verification_method": "tier2_bank_confirmation",
        "requested_at": datetime.now(timezone.utc) - timedelta(days=12, hours=4),
        "response_due_at": datetime.now(timezone.utc) - timedelta(days=10),
        "completed_at": datetime.now(timezone.utc) - timedelta(days=12),
        "retry_count": 0,
        "request_snapshot": {
            "fdr_number": "FDR-2026-CPWD-10294",
            "amount": "12000000.00",
            "currency": "INR",
            "issue_date": "2025-11-20",
            "maturity_date": "2026-11-20",
            "lien_in_favour": "Director General, CPWD",
        },
        "attestation_id": "attest-t2-pnb-01",
        "verification_request_id": None,
        "failure_reason": None,
        "created_at": datetime.now(timezone.utc) - timedelta(days=12, hours=4),
        "updated_at": datetime.now(timezone.utc) - timedelta(days=12),
    },
]

LOCAL_FDR_ALERTS: List[Dict[str, Any]] = [
    {
        "id": "alert-001",
        "fdr_id": "fdr-003",
        "fdr_number": "FDR-2025-AICTE-55912",
        "institution_id": "inst-03",
        "institution_name": "All India Council for Technical Education",
        "alert_type": "heartbeat_stale",
        "severity": "high",
        "title": "Heartbeat Overdue - Freshness Threshold Exceeded",
        "description": "Deposit has not received verified bank re-attestation for over 45 days. Fresh check requested.",
        "due_at": datetime.now(timezone.utc) - timedelta(days=3),
        "is_read": False,
        "is_resolved": False,
        "assigned_to": None,
        "assigned_to_name": None,
        "resolution_note": None,
        "resolved_at": None,
        "created_at": datetime.now(timezone.utc) - timedelta(days=3),
        "updated_at": datetime.now(timezone.utc) - timedelta(days=3),
    },
    {
        "id": "alert-002",
        "fdr_id": "fdr-004",
        "fdr_number": "FDR-2025-DRDO-77291",
        "institution_id": "inst-04",
        "institution_name": "Defence Research and Development Organisation",
        "alert_type": "heartbeat_unresponsive",
        "severity": "critical",
        "title": "Bank Unresponsive - Exhausted Maximum Retry Limit",
        "description": "Depository branch failed to respond to 3 consecutive heartbeat confirmation attempts. Escalate to Bank Nodal Officer.",
        "due_at": datetime.now(timezone.utc) - timedelta(days=10),
        "is_read": False,
        "is_resolved": False,
        "assigned_to": "usr-admin-01",
        "assigned_to_name": "System Administrator",
        "resolution_note": None,
        "resolved_at": None,
        "created_at": datetime.now(timezone.utc) - timedelta(days=10),
        "updated_at": datetime.now(timezone.utc) - timedelta(days=10),
    },
    {
        "id": "alert-003",
        "fdr_id": "fdr-002",
        "fdr_number": "FDR-2026-CPWD-10294",
        "institution_id": "inst-02",
        "institution_name": "Central Public Works Department",
        "alert_type": "maturity_30_days",
        "severity": "medium",
        "title": "Maturity Approaching Within 30 Days",
        "description": "Deposit reaches statutory maturity within 30 days. Action required: initiate renewal verification or lien discharge audit.",
        "due_at": datetime.now(timezone.utc) + timedelta(days=22),
        "is_read": True,
        "is_resolved": False,
        "assigned_to": None,
        "assigned_to_name": None,
        "resolution_note": None,
        "resolved_at": None,
        "created_at": datetime.now(timezone.utc) - timedelta(days=2),
        "updated_at": datetime.now(timezone.utc) - timedelta(days=1),
    },
]


class HeartbeatMonitoringService:
    """
    Core engine managing heartbeat policies, checks execution, bank re-attestation,
    timeout handling, and maturity warning generation.
    """

    # ==========================================================================
    # 1. POLICY ADMINISTRATION
    # ==========================================================================

    def get_policies(self, active_only: bool = False) -> List[Dict[str, Any]]:
        """Returns all registered heartbeat policies."""
        policies = list(LOCAL_HEARTBEAT_POLICIES)
        if supabase_admin.client:
            try:
                q = supabase_admin.client.table("heartbeat_policies").select("*")
                if active_only:
                    q = q.eq("is_active", True)
                res = q.order("created_at", desc=False).execute()
                if res.data:
                    policies = res.data
            except Exception as e:
                logger.error(f"Error querying live heartbeat policies: {e}")

        # Decorate policies with aliases
        res = []
        for p in policies:
            if active_only and not p.get("is_active"):
                continue
            item = dict(p)
            hb_int = item.get("heartbeat_interval_days") or item.get("frequency_days") or 30
            st_aft = item.get("stale_after_days") or item.get("stale_threshold_days") or 45
            item["heartbeat_interval_days"] = hb_int
            item["frequency_days"] = hb_int
            item["stale_after_days"] = st_aft
            item["stale_threshold_days"] = st_aft
            res.append(item)
        return res

    def get_policy_by_id(self, policy_id: str) -> Optional[Dict[str, Any]]:
        """Fetch policy by ID."""
        for p in self.get_policies():
            if str(p.get("id")) == str(policy_id):
                return p
        return None

    def get_applicable_policy(self, fdr: Dict[str, Any]) -> Dict[str, Any]:
        """
        Determines the applicable policy for an FDR based on:
        1. Bank specific override
        2. Institution specific override
        3. Default active policy
        4. Standard fallback
        """
        policies = self.get_policies(active_only=True)
        bank_id = str(fdr.get("bank_id")) if fdr.get("bank_id") else None
        inst_id = str(fdr.get("institution_id")) if fdr.get("institution_id") else None

        # 1. Check Bank override
        if bank_id:
            for p in policies:
                if p.get("bank_id") and str(p["bank_id"]) == bank_id:
                    return p

        # 2. Check Institution override
        if inst_id:
            for p in policies:
                if p.get("institution_id") and str(p["institution_id"]) == inst_id:
                    return p

        # 3. Default active policy
        for p in policies:
            if p.get("is_default"):
                return p

        # 4. Standard fallback
        if policies:
            return policies[0]

        return {
            "id": "policy-fallback",
            "name": "Standard Fallback Cadence",
            "heartbeat_interval_days": 14,
            "frequency_days": 14,
            "stale_after_days": 21,
            "stale_threshold_days": 21,
            "response_timeout_hours": 48,
            "max_retries": 3,
            "retry_interval_hours": 24,
            "maturity_alert_days": [90, 60, 30, 7, 1, 0],
            "is_active": True,
            "is_default": True,
        }

    def create_policy(self, data: Dict[str, Any], current_user: Dict[str, Any]) -> Dict[str, Any]:
        """Admin creates a new heartbeat policy."""
        # Validation
        interval = data.get("heartbeat_interval_days") or data.get("frequency_days") or 30
        stale = data.get("stale_after_days") or data.get("stale_threshold_days") or 45
        if stale < interval:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="stale_after_days must be greater than or equal to heartbeat_interval_days.",
            )

        name = data.get("name", "").strip()
        for p in LOCAL_HEARTBEAT_POLICIES:
            if p.get("name", "").lower() == name.lower():
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Policy name '{name}' already exists.",
                )

        now = datetime.now(timezone.utc)
        is_def = bool(data.get("is_default", False))

        if is_def:
            for p in LOCAL_HEARTBEAT_POLICIES:
                p["is_default"] = False

        new_policy = {
            "id": f"policy-{uuid4().hex[:8]}",
            "name": name,
            "description": data.get("description"),
            "heartbeat_interval_days": interval,
            "frequency_days": interval,
            "stale_after_days": stale,
            "stale_threshold_days": stale,
            "response_timeout_hours": data.get("response_timeout_hours", 48),
            "max_retries": data.get("max_retries", 3),
            "retry_interval_hours": data.get("retry_interval_hours", 24),
            "maturity_alert_days": data.get("maturity_alert_days", [90, 60, 30, 7, 1, 0]),
            "min_amount": data.get("min_amount"),
            "max_amount": data.get("max_amount"),
            "is_active": data.get("is_active", True),
            "is_default": is_def,
            "institution_id": data.get("institution_id"),
            "bank_id": data.get("bank_id"),
            "created_by": current_user.get("id"),
            "created_at": now,
            "updated_at": now,
        }

        LOCAL_HEARTBEAT_POLICIES.append(new_policy)
        return new_policy

    def update_policy(self, policy_id: str, data: Dict[str, Any], current_user: Dict[str, Any]) -> Dict[str, Any]:
        """Admin updates an existing policy."""
        target = None
        for p in LOCAL_HEARTBEAT_POLICIES:
            if str(p.get("id")) == str(policy_id):
                target = p
                break

        if not target:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Heartbeat policy '{policy_id}' not found.",
            )

        interval = data.get("heartbeat_interval_days") or data.get("frequency_days") or target.get("heartbeat_interval_days") or target.get("frequency_days") or 30
        stale = data.get("stale_after_days") or data.get("stale_threshold_days") or target.get("stale_after_days") or target.get("stale_threshold_days") or 45
        if stale < interval:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="stale_after_days must be greater than or equal to heartbeat_interval_days.",
            )

        if data.get("is_default"):
            for p in LOCAL_HEARTBEAT_POLICIES:
                p["is_default"] = False

        for k, v in data.items():
            if v is not None:
                target[k] = v

        target["heartbeat_interval_days"] = interval
        target["frequency_days"] = interval
        target["stale_after_days"] = stale
        target["stale_threshold_days"] = stale
        target["updated_at"] = datetime.now(timezone.utc)
        return target

    # ==========================================================================
    # 2. HEARTBEAT CHECK GENERATION & MANAGEMENT
    # ==========================================================================

    def get_fdr_checks(self, fdr_id: str) -> List[Dict[str, Any]]:
        """Returns all historical heartbeat checks for a specific FDR."""
        checks = [c for c in LOCAL_HEARTBEAT_CHECKS if str(c.get("fdr_id")) == str(fdr_id)]
        return sorted(checks, key=lambda x: x.get("check_number", 0), reverse=True)

    def get_active_check_for_fdr(self, fdr_id: str) -> Optional[Dict[str, Any]]:
        """Finds any check currently in scheduled or requested status."""
        for c in LOCAL_HEARTBEAT_CHECKS:
            if str(c.get("fdr_id")) == str(fdr_id) and c.get("check_status") in ("scheduled", "requested"):
                return c
        return None

    def create_heartbeat_check(
        self,
        fdr_id: str,
        verification_method: str = "tier2_bank_confirmation",
        notes: Optional[str] = None,
        actor_profile: Optional[Dict[str, Any]] = None,
        is_manual: bool = False,
    ) -> Dict[str, Any]:
        """
        Creates a new heartbeat check for an FDR.
        Enforces:
        - FDR existence and active/pending status.
        - Exactly ONE active check per FDR (prevents duplicates).
        - Auto-derives sequential check_number.
        - Captures immutable deposit snapshot.
        - Initiates Tier 2 single-use token or prepares Tier 3 attestation record.
        """
        fdr = fdr_service.get_fdr_by_id(fdr_id)
        if not fdr:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"FDR record '{fdr_id}' not found.",
            )

        # Check for outstanding active check
        active_check = self.get_active_check_for_fdr(fdr_id)
        if active_check:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"An active heartbeat check (Check #{active_check.get('check_number')}) is already outstanding for this FDR.",
            )

        policy = self.get_applicable_policy(fdr)
        now = datetime.now(timezone.utc)
        due_at = now + timedelta(hours=policy.get("response_timeout_hours", 48))

        # Calculate next check number
        existing_checks = [c for c in LOCAL_HEARTBEAT_CHECKS if str(c.get("fdr_id")) == str(fdr_id)]
        check_number = len(existing_checks) + 1

        # Capture snapshot
        snapshot = {
            "fdr_number": str(fdr.get("fdr_number")),
            "amount": f"{float(fdr.get('amount')):.2f}",
            "currency": str(fdr.get("currency", "INR")),
            "issue_date": str(fdr.get("issue_date")),
            "maturity_date": str(fdr.get("maturity_date")),
            "lien_in_favour": str(fdr.get("lien_in_favour")),
            "bank_name": str(fdr.get("bank_name")),
            "institution_name": str(fdr.get("institution_name")),
            "branch_ifsc": str(fdr.get("ifsc_code")),
        }

        check_id = f"check-{uuid4().hex[:8]}"

        # Phase 3 Single-Use Token integration for Tier 2
        raw_token = None
        verify_url = None
        verification_request_id = None

        if verification_method == "tier2_bank_confirmation":
            try:
                # Generate Phase 3 verification token
                v_req = verification_service.create_verification_request(
                    fdr_id=str(fdr_id),
                    user_profile=actor_profile or {"id": "system-scheduler", "email": "scheduler@fdrchain.gov.in"},
                )
                raw_token = v_req.get("raw_token")
                verify_url = v_req.get("verification_url")
                verification_request_id = v_req.get("id")
            except HTTPException as he:
                if he.status_code == 400 and "already outstanding" in str(he.detail).lower():
                    for r in LOCAL_VERIFICATION_REQUESTS:
                        if str(r.get("fdr_id")) == str(fdr_id) and r.get("status") == "pending":
                            verification_request_id = r.get("id")
                            verify_url = f"/verify/{r.get('id')}"
                            break
                else:
                    raise he

        new_check = {
            "id": check_id,
            "fdr_id": str(fdr_id),
            "fdr_number": str(fdr.get("fdr_number")),
            "bank_id": str(fdr.get("bank_id")),
            "bank_name": str(fdr.get("bank_name")),
            "institution_id": str(fdr.get("institution_id")),
            "institution_name": str(fdr.get("institution_name")),
            "check_number": check_number,
            "check_status": "requested",
            "verification_method": verification_method,
            "requested_at": now,
            "response_due_at": due_at,
            "completed_at": None,
            "retry_count": 0,
            "notes": notes,
            "request_snapshot": snapshot,
            "attestation_id": None,
            "verification_request_id": verification_request_id,
            "raw_token": raw_token,
            "verification_url": verify_url,
            "failure_reason": None,
            "created_at": now,
            "updated_at": now,
        }

        LOCAL_HEARTBEAT_CHECKS.append(new_check)

        # Update FDR next_heartbeat_at
        fdr["next_heartbeat_at"] = due_at
        fdr["updated_at"] = now

        # Append FDR audit trail event
        actor_name = actor_profile.get("full_name") if actor_profile else ("Manual Check Officer" if is_manual else "Automated Regulatory Scheduler")
        fdr_service.append_fdr_event(
            fdr_id=str(fdr_id),
            institution_id=str(fdr.get("institution_id")),
            actor_profile=actor_profile or {"id": "scheduler", "full_name": actor_name, "email": "system@fdrchain.gov.in"},
            event_type="heartbeat_check_requested",
            description=f"Heartbeat Check #{check_number} initiated via {verification_method.replace('_', ' ').title()}. Response due by {due_at.strftime('%Y-%m-%d %H:%M UTC')}.",
            metadata={
                "check_id": check_id,
                "check_number": check_number,
                "verification_method": verification_method,
                "due_at": due_at.isoformat(),
                "is_manual": is_manual,
                "notes": notes,
            },
        )

        return new_check

    # ==========================================================================
    # 3. HEARTBEAT CONFIRMATION & REJECTION HANDLING
    # ==========================================================================

    def record_heartbeat_confirmation(
        self,
        fdr_id: str,
        attestation_id: Optional[str] = None,
        method: str = "tier2_bank_confirmation",
        verification_method: Optional[str] = None,
        check_id: Optional[str] = None,
        officer_notes: Optional[str] = None,
        actor_profile: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Invoked when a bank attestation confirms deposit existence & lien pledge:
        - Marks check 'confirmed'.
        - Updates FDR heartbeat_status -> 'alive' (unless previously 'broken').
        - Sets last_heartbeat_at = NOW().
        - Schedules next_heartbeat_at based on policy.
        - Resets heartbeat_failure_count = 0.
        - Resolves any active heartbeat alerts for this FDR.
        """
        fdr = fdr_service.get_fdr_by_id(fdr_id)
        if not fdr:
            raise HTTPException(status_code=404, detail="FDR not found")

        policy = self.get_applicable_policy(fdr)
        now = datetime.now(timezone.utc)
        next_due = now + timedelta(days=policy.get("heartbeat_interval_days", 30))

        # Find active check for this FDR
        active_check = None
        if check_id:
            for c in LOCAL_HEARTBEAT_CHECKS:
                if str(c.get("id")) == str(check_id):
                    active_check = c
                    break
        if not active_check:
            active_check = self.get_active_check_for_fdr(fdr_id)

        if active_check:
            active_check["check_status"] = "confirmed"
            active_check["completed_at"] = now
            active_check["attestation_id"] = attestation_id
            active_check["updated_at"] = now

        # Update FDR metrics
        prev_status = fdr.get("heartbeat_status", "not_started")
        
        # Section 7 Rule: If previously broken, cannot silently return to alive without documented review
        if prev_status == "broken":
            logger.warning(f"FDR {fdr_id} was previously Broken. Confirmation received under attestation {attestation_id}. Retaining BROKEN standing until authorized resolution.")
            # Retain broken status unless explicitly resolved in alert center
        else:
            fdr["heartbeat_status"] = "alive"

        fdr["last_heartbeat_at"] = now
        fdr["next_heartbeat_at"] = next_due
        fdr["heartbeat_failure_count"] = 0
        fdr["updated_at"] = now

        # Resolve existing heartbeat alerts (stale, unresponsive, due)
        for a in LOCAL_FDR_ALERTS:
            if str(a.get("fdr_id")) == str(fdr_id) and a.get("alert_type") in ("heartbeat_stale", "heartbeat_unresponsive", "heartbeat_due"):
                if not a.get("is_resolved"):
                    a["is_resolved"] = True
                    a["resolved_at"] = now
                    a["resolution_note"] = f"Resolved automatically via verified bank attestation ({attestation_id})."
                    a["resolution_notes"] = a["resolution_note"]
                    a["updated_at"] = now

        # Append audit event
        ver_method = verification_method or method
        fdr_service.append_fdr_event(
            fdr_id=str(fdr_id),
            institution_id=str(fdr.get("institution_id")),
            actor_profile=actor_profile or {"id": "bank-officer", "full_name": "Bank Nodal Officer", "email": "bank@nodal.gov.in"},
            event_type="heartbeat_confirmed",
            description=f"Heartbeat confirmed by depository bank. Health status: {fdr.get('heartbeat_status', 'ALIVE').upper()}. Next heartbeat scheduled for {next_due.strftime('%Y-%m-%d')}.",
            metadata={
                "attestation_id": attestation_id,
                "verification_method": ver_method,
                "heartbeat_status": fdr.get("heartbeat_status"),
                "next_heartbeat_at": next_due.isoformat(),
            },
        )

        return {
            "success": True,
            "fdr_id": str(fdr_id),
            "heartbeat_status": fdr.get("heartbeat_status"),
            "last_heartbeat_at": now.isoformat(),
            "next_heartbeat_at": next_due.isoformat(),
        }

    def record_heartbeat_rejection(
        self,
        fdr_id: str,
        reason: Optional[str] = None,
        rejection_reason: Optional[str] = None,
        discrepancy_details: Optional[Dict[str, Any]] = None,
        check_id: Optional[str] = None,
        actor_profile: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Invoked when bank explicitly reports a problem with the FDR (e.g. closed, lien released, not found):
        - Marks check 'rejected'.
        - Sets FDR heartbeat_status -> 'broken'.
        - Generates CRITICAL alert 'heartbeat_broken'.
        - Does NOT erase historical records.
        """
        actual_reason = reason or rejection_reason or "Depository discrepancy"
        fdr = fdr_service.get_fdr_by_id(fdr_id)
        if not fdr:
            raise HTTPException(status_code=404, detail="FDR not found")

        now = datetime.now(timezone.utc)

        active_check = None
        if check_id:
            for c in LOCAL_HEARTBEAT_CHECKS:
                if str(c.get("id")) == str(check_id):
                    active_check = c
                    break
        if not active_check:
            active_check = self.get_active_check_for_fdr(fdr_id)

        if active_check:
            active_check["check_status"] = "rejected"
            active_check["completed_at"] = now
            active_check["failure_reason"] = actual_reason
            active_check["updated_at"] = now

        fdr["heartbeat_status"] = "broken"
        fdr["heartbeat_failure_count"] = fdr.get("heartbeat_failure_count", 0) + 1
        fdr["updated_at"] = now

        # Generate Critical Broken Alert
        self.emit_alert(
            fdr_id=str(fdr_id),
            institution_id=str(fdr.get("institution_id")),
            alert_type="heartbeat_broken",
            severity="critical",
            title="CRITICAL: Depository Bank Reported Broken FDR Lien",
            description=f"Bank explicitly rejected deposit confirmation. Bank stated reason: '{actual_reason}'. Immediate regulatory inspection required.",
            metadata=discrepancy_details or {},
        )

        # Audit event
        fdr_service.append_fdr_event(
            fdr_id=str(fdr_id),
            institution_id=str(fdr.get("institution_id")),
            actor_profile=actor_profile or {"id": "bank-officer", "full_name": "Bank Nodal Officer", "email": "bank@nodal.gov.in"},
            event_type="heartbeat_broken_reported",
            description=f"CRITICAL: Depository bank rejected deposit standing. Heartbeat transitioned to BROKEN. Reason: {actual_reason}.",
            metadata={
                "rejection_reason": actual_reason,
                "heartbeat_status": "broken",
                "discrepancy_details": discrepancy_details,
            },
        )

        return {
            "success": True,
            "fdr_id": str(fdr_id),
            "heartbeat_status": "broken",
            "reason": actual_reason,
        }

    # ==========================================================================
    # 4. TIMEOUTS, RETRIES & FRESHNESS ENGINE
    # ==========================================================================

    def process_timeouts_and_retries(self) -> Dict[str, Any]:
        """
        Scans all outstanding checks where response_due_at < NOW():
        - If retries remain: increments retry_count and extends deadline by retry_interval_hours.
        - If retries exhausted: marks check 'timed_out', increments failure count, transitions to 'unresponsive'.
        """
        now = datetime.now(timezone.utc)
        retried_count = 0
        timed_out_count = 0

        for c in LOCAL_HEARTBEAT_CHECKS:
            if c.get("check_status") == "requested":
                due = c.get("response_due_at")
                if due is None:
                    req_at = c.get("requested_at") or c.get("scheduled_at") or c.get("created_at") or now
                    if isinstance(req_at, str):
                        req_at = datetime.fromisoformat(req_at.replace("Z", "+00:00"))
                    due = req_at + timedelta(hours=48)
                elif isinstance(due, str):
                    due = datetime.fromisoformat(due.replace("Z", "+00:00"))

                next_ret = c.get("next_retry_at")
                if isinstance(next_ret, str):
                    next_ret = datetime.fromisoformat(next_ret.replace("Z", "+00:00"))

                is_expired = (due and now > due) or (next_ret and now > next_ret)

                if is_expired:
                    fdr = fdr_service.get_fdr_by_id(c.get("fdr_id"))
                    policy = self.get_applicable_policy(fdr) if fdr else {"max_retries": 3, "retry_interval_hours": 24}
                    max_retries = policy.get("max_retries", 3)
                    curr_retries = c.get("retry_count", 0)

                    if curr_retries < max_retries:
                        # Schedule Retry
                        c["retry_count"] = curr_retries + 1
                        ext_hours = policy.get("retry_interval_hours", 24)
                        c["response_due_at"] = now + timedelta(hours=ext_hours)
                        c["next_retry_at"] = now + timedelta(hours=ext_hours)
                        c["updated_at"] = now
                        retried_count += 1

                        if fdr:
                            fdr_service.append_fdr_event(
                                fdr_id=str(fdr["id"]),
                                institution_id=str(fdr["institution_id"]),
                                actor_profile={"id": "scheduler", "full_name": "Regulatory Scheduler", "email": "scheduler@fdrchain.gov.in"},
                                event_type="heartbeat_retry_scheduled",
                                description=f"Response deadline exceeded. Retry #{c['retry_count']} of {max_retries} dispatched. Extended by {ext_hours} hours.",
                                metadata={"check_id": c["id"], "retry_count": c["retry_count"]},
                            )
                    else:
                        # Mark Timed Out & Unresponsive
                        c["check_status"] = "timed_out"
                        c["completed_at"] = now
                        c["failure_reason"] = f"Response timeout after {max_retries} retry attempts."
                        c["updated_at"] = now
                        timed_out_count += 1

                        if fdr:
                            fdr["heartbeat_failure_count"] = fdr.get("heartbeat_failure_count", 0) + 1
                            if fdr.get("heartbeat_status") != "broken":
                                fdr["heartbeat_status"] = "unresponsive"
                            fdr["updated_at"] = now

                            # Emit alert
                            self.emit_alert(
                                fdr_id=str(fdr["id"]),
                                institution_id=str(fdr["institution_id"]),
                                alert_type="heartbeat_unresponsive",
                                severity="critical",
                                title="Depository Bank Unresponsive to Heartbeat Verification",
                                description=f"Depository bank failed to acknowledge Heartbeat Check #{c.get('check_number')} after {max_retries} retries.",
                            )

                            fdr_service.append_fdr_event(
                                fdr_id=str(fdr["id"]),
                                institution_id=str(fdr["institution_id"]),
                                actor_profile={"id": "scheduler", "full_name": "Regulatory Scheduler", "email": "scheduler@fdrchain.gov.in"},
                                event_type="heartbeat_timed_out",
                                description=f"Heartbeat check timed out. Depository transitioned to UNRESPONSIVE. Escalated to regulatory compliance desk.",
                                metadata={"check_id": c["id"], "max_retries": max_retries},
                            )

        return {
            "retried": retried_count,
            "timed_out": timed_out_count,
            "retried_checks": retried_count,
            "timed_out_checks": timed_out_count,
            "processed_at": now.isoformat(),
        }

    def evaluate_heartbeat_freshness(self) -> Dict[str, Any]:
        """
        Evaluates elapsed freshness for all alive FDRs:
        If last_heartbeat_at exceeds policy stale_after_days / stale_threshold_days,
        transitions to 'stale' and emits high-severity alert.
        """
        now = datetime.now(timezone.utc)
        marked_stale_count = 0

        for fdr in LOCAL_FDR_STORE:
            if fdr.get("lifecycle_status") in ("active", "pending") and fdr.get("heartbeat_status") == "alive":
                policy = self.get_applicable_policy(fdr)
                stale_days = policy.get("stale_threshold_days") or policy.get("stale_after_days") or 21
                last_hb = fdr.get("last_heartbeat_at")

                if last_hb:
                    if isinstance(last_hb, str):
                        last_hb = datetime.fromisoformat(last_hb.replace("Z", "+00:00"))
                    diff_days = (now - last_hb).total_seconds() / (24 * 3600)

                    if diff_days >= stale_days:
                        fdr["heartbeat_status"] = "stale"
                        fdr["updated_at"] = now
                        marked_stale_count += 1

                        self.emit_alert(
                            fdr_id=str(fdr["id"]),
                            institution_id=str(fdr["institution_id"]),
                            alert_type="heartbeat_stale",
                            severity="high",
                            title="Heartbeat Freshness Lapsed (STALE)",
                            description=f"No verified bank attestation for {int(diff_days)} days (Threshold: {stale_days} days). Dispatching fresh verification check.",
                        )

                        fdr_service.append_fdr_event(
                            fdr_id=str(fdr["id"]),
                            institution_id=str(fdr["institution_id"]),
                            actor_profile={"id": "scheduler", "full_name": "Regulatory Scheduler", "email": "scheduler@fdrchain.gov.in"},
                            event_type="heartbeat_marked_stale",
                            description=f"Deposit attestation freshness exceeded {stale_days} days. Status transitioned to STALE.",
                            metadata={"last_heartbeat_at": last_hb.isoformat(), "elapsed_days": diff_days},
                        )

        return {
            "marked_stale": marked_stale_count,
            "updated_stale": marked_stale_count,
            "evaluated_at": now.isoformat(),
        }

    # ==========================================================================
    # 5. AUTOMATIC SCHEDULING DISPATCHER
    # ==========================================================================

    def process_heartbeat_schedules(self) -> Dict[str, Any]:
        """
        Finds eligible active/pending FDRs where next_heartbeat_at <= NOW()
        and automatically dispatches a fresh heartbeat check if none is active.
        """
        now = datetime.now(timezone.utc)
        dispatched_count = 0

        for fdr in LOCAL_FDR_STORE:
            if fdr.get("lifecycle_status") in ("active", "pending"):
                next_hb = fdr.get("next_heartbeat_at")
                if next_hb:
                    if isinstance(next_hb, str):
                        next_hb = datetime.fromisoformat(next_hb.replace("Z", "+00:00"))
                    is_due = now >= next_hb
                else:
                    is_due = True  # Never had a heartbeat scheduled

                if is_due:
                    # Check if check already in flight
                    active = self.get_active_check_for_fdr(fdr["id"])
                    if not active:
                        method = "tier3_digital_signature" if fdr.get("trust_tier") == 3 else "tier2_bank_confirmation"
                        self.create_heartbeat_check(
                            fdr_id=str(fdr["id"]),
                            verification_method=method,
                            is_manual=False,
                        )
                        dispatched_count += 1

        return {
            "dispatched_checks": dispatched_count,
            "dispatched_at": now.isoformat(),
        }

    # ==========================================================================
    # 6. MATURITY MONITORING & ALERT GENERATION
    # ==========================================================================

    def process_maturity_monitoring(self) -> Dict[str, Any]:
        """
        Compares each FDR's maturity_date against today's date and emits
        deduplicated regulatory reminders for configured thresholds
        (90, 60, 30, 7, 1, 0, overdue).
        """
        today = date.today()
        alerts_generated = 0

        for fdr in LOCAL_FDR_STORE:
            if fdr.get("lifecycle_status") not in ("released", "invoked"):
                mat_date = fdr.get("maturity_date")
                if isinstance(mat_date, str):
                    mat_date = datetime.strptime(mat_date, "%Y-%m-%d").date()

                days_diff = (mat_date - today).days

                alert_type = None
                severity = "low"
                title = ""

                if days_diff < 0:
                    alert_type = "maturity_overdue"
                    severity = "critical"
                    title = f"CRITICAL: FDR #{fdr.get('fdr_number')} Overdue by {abs(days_diff)} Days"
                elif days_diff == 0:
                    alert_type = "maturity_today"
                    severity = "high"
                    title = f"URGENT: FDR #{fdr.get('fdr_number')} Reaches Maturity Today"
                elif days_diff <= 1:
                    alert_type = "maturity_1_day"
                    severity = "high"
                    title = f"FDR #{fdr.get('fdr_number')} Matures in 24 Hours"
                elif days_diff <= 7:
                    alert_type = "maturity_7_days"
                    severity = "medium"
                    title = f"FDR #{fdr.get('fdr_number')} Matures within 7 Days"
                elif days_diff <= 30:
                    alert_type = "maturity_30_days"
                    severity = "medium"
                    title = f"FDR #{fdr.get('fdr_number')} Matures within 30 Days"
                elif days_diff <= 60:
                    alert_type = "maturity_60_days"
                    severity = "low"
                    title = f"FDR #{fdr.get('fdr_number')} Matures within 60 Days"
                elif days_diff <= 90:
                    alert_type = "maturity_90_days"
                    severity = "low"
                    title = f"FDR #{fdr.get('fdr_number')} Matures within 90 Days"

                if alert_type:
                    norm_type = self._normalize_alert_type(alert_type)
                    already_active = any(
                        str(a.get("fdr_id")) == str(fdr["id"]) and not a.get("is_resolved")
                        and (a.get("alert_type") == alert_type or self._normalize_alert_type(a.get("alert_type")) == norm_type)
                        for a in LOCAL_FDR_ALERTS
                    )
                    if not already_active:
                        self.emit_alert(
                            fdr_id=str(fdr["id"]),
                            institution_id=str(fdr["institution_id"]),
                            alert_type=alert_type,
                            severity=severity,
                            title=title,
                            description=f"Fixed deposit of INR ₹{float(fdr['amount']):,.2f} matures on {mat_date.strftime('%d-%b-%Y')}. Action required: initiate formal renewal audit or prepare lien invocation.",
                            due_at=datetime.combine(mat_date, datetime.min.time(), tzinfo=timezone.utc),
                        )
                        alerts_generated += 1

        return {
            "alerts_generated": alerts_generated,
            "evaluated_date": today.isoformat(),
        }

    # ==========================================================================
    # 7. ALERT DESK & RESOLUTION LIFECYCLE
    # ==========================================================================

    @staticmethod
    def _normalize_alert_type(t: Optional[str]) -> Optional[str]:
        if not t:
            return None
        mapping = {
            "maturity_warning_30d": "maturity_30_days",
            "maturity_30_days": "maturity_30_days",
            "maturity_warning_90d": "maturity_90_days",
            "maturity_90_days": "maturity_90_days",
            "maturity_warning_60d": "maturity_60_days",
            "maturity_60_days": "maturity_60_days",
            "maturity_warning_7d": "maturity_7_days",
            "maturity_7_days": "maturity_7_days",
            "maturity_warning_1d": "maturity_1_day",
            "maturity_1_day": "maturity_1_day",
            "maturity_today": "maturity_today",
            "maturity_overdue": "maturity_overdue",
        }
        return mapping.get(t, t)

    def emit_alert(
        self,
        fdr_id: str,
        alert_type: str,
        severity: str,
        title: str,
        description: Optional[str] = None,
        institution_id: Optional[str] = None,
        due_at: Optional[datetime] = None,
        message: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Emits an alert if not already active (deduplication guarantee).
        Returns the alert dictionary.
        """
        desc = description or message or title
        msg = message or desc
        meta = metadata or {}

        # Normalize alert_type for deduplication
        norm_type = self._normalize_alert_type(alert_type)

        for a in LOCAL_FDR_ALERTS:
            if str(a.get("fdr_id")) == str(fdr_id) and not a.get("is_resolved"):
                if a.get("alert_type") == alert_type or self._normalize_alert_type(a.get("alert_type")) == norm_type:
                    return a  # Deduplicated existing active alert

        fdr = fdr_service.get_fdr_by_id(fdr_id)
        inst_id = institution_id or (fdr.get("institution_id") if fdr else None) or "inst-01"
        now = datetime.now(timezone.utc)
        new_alert = {
            "id": f"alert-{uuid4().hex[:8]}",
            "fdr_id": str(fdr_id),
            "fdr_number": str(fdr.get("fdr_number")) if fdr else None,
            "institution_id": str(inst_id),
            "institution_name": str(fdr.get("institution_name")) if fdr else None,
            "alert_type": alert_type,
            "severity": severity,
            "title": title,
            "description": desc,
            "message": msg,
            "metadata": meta,
            "due_at": due_at,
            "is_read": False,
            "is_resolved": False,
            "assigned_to": None,
            "assigned_to_name": None,
            "resolution_note": None,
            "resolution_notes": None,
            "resolved_at": None,
            "created_at": now,
            "updated_at": now,
        }

        LOCAL_FDR_ALERTS.append(new_alert)
        return new_alert

    def get_alerts(
        self,
        current_user: Dict[str, Any],
        fdr_id: Optional[str] = None,
        is_resolved: Optional[bool] = None,
        alert_type: Optional[str] = None,
        severity: Optional[str] = None,
        search: Optional[str] = None,
        page: int = 1,
        page_size: int = 20,
    ) -> Dict[str, Any]:
        """Returns paginated alerts scoped to current user's role and jurisdiction."""
        roles = current_user.get("roles", [])
        is_admin = "system_admin" in roles
        is_bureau = "bureau_officer" in roles
        is_finance = "finance_officer" in roles
        is_regional = "regional_officer" in roles
        is_inst = "institution_user" in roles

        items = list(LOCAL_FDR_ALERTS)

        # Scope filter
        if is_inst and not is_admin:
            u_inst = current_user.get("institution_id") or "inst-01"
            items = [a for a in items if str(a.get("institution_id")) == str(u_inst)]
        elif is_regional and not is_admin:
            u_regs = current_user.get("region_scopes") or ["reg-01"]
            fdr_map = {f["id"]: f.get("region_id") for f in LOCAL_FDR_STORE}
            items = [a for a in items if fdr_map.get(a.get("fdr_id")) in u_regs]

        # Filters
        if fdr_id:
            items = [a for a in items if str(a.get("fdr_id")) == str(fdr_id)]
        if is_resolved is not None:
            items = [a for a in items if a.get("is_resolved") == is_resolved]
        if alert_type:
            norm_q = self._normalize_alert_type(alert_type)
            items = [
                a for a in items
                if a.get("alert_type") == alert_type or self._normalize_alert_type(a.get("alert_type")) == norm_q
            ]
        if severity:
            items = [a for a in items if a.get("severity") == severity]
        if search:
            s = search.lower()
            items = [
                a for a in items
                if s in a.get("title", "").lower()
                or s in a.get("description", "").lower()
                or s in str(a.get("fdr_number", "")).lower()
                or s in str(a.get("institution_name", "")).lower()
            ]

        # Sort: unresolved first, critical first, newest first
        sev_rank = {"critical": 4, "high": 3, "medium": 2, "low": 1}
        items = sorted(
            items,
            key=lambda x: (
                0 if not x.get("is_resolved") else 1,
                -sev_rank.get(x.get("severity", "low"), 0),
                x.get("created_at"),
            ),
            reverse=False,
        )

        total = len(items)
        paginated = items[(page - 1) * page_size : page * page_size]
        return {
            "items": paginated,
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": (total + page_size - 1) // page_size if total > 0 else 1,
        }

    def mark_alert_read(self, alert_id: str, current_user: Dict[str, Any]) -> Dict[str, Any]:
        """Marks alert as read."""
        for a in LOCAL_FDR_ALERTS:
            if str(a.get("id")) == str(alert_id):
                a["is_read"] = True
                a["updated_at"] = datetime.now(timezone.utc)
                return a
        raise HTTPException(status_code=404, detail="Alert not found")

    def assign_alert(self, alert_id: str, assigned_to: str, current_user: Dict[str, Any]) -> Dict[str, Any]:
        """Assigns an alert to a compliance officer."""
        for a in LOCAL_FDR_ALERTS:
            if str(a.get("id")) == str(alert_id):
                a["assigned_to"] = assigned_to
                a["assigned_to_name"] = "Assigned Compliance Officer"
                a["updated_at"] = datetime.now(timezone.utc)
                return a
        raise HTTPException(status_code=404, detail="Alert not found")

    def resolve_alert(self, alert_id: str, resolution_note: str, current_user: Dict[str, Any]) -> Dict[str, Any]:
        """
        Resolves an alert with documented audit explanation.
        If resolving a broken heartbeat alert, updates audit trail.
        """
        for a in LOCAL_FDR_ALERTS:
            if str(a.get("id")) == str(alert_id):
                if a.get("is_resolved"):
                    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Alert is already resolved.")
                now = datetime.now(timezone.utc)
                a["is_resolved"] = True
                a["resolved_at"] = now
                a["resolution_note"] = resolution_note
                a["resolution_notes"] = resolution_note
                a["updated_at"] = now

                # If this was a broken alert, check if FDR status should recover after authorized review
                if a.get("alert_type") == "heartbeat_broken":
                    fdr = fdr_service.get_fdr_by_id(a.get("fdr_id"))
                    if fdr and fdr.get("heartbeat_status") == "broken":
                        fdr["heartbeat_status"] = "stale"  # Ready for immediate re-verification
                        fdr_service.append_fdr_event(
                            fdr_id=str(fdr["id"]),
                            institution_id=str(fdr["institution_id"]),
                            actor_profile=current_user,
                            event_type="heartbeat_broken_cleared",
                            description=f"Authorized officer reviewed and resolved Broken alert. Resolution: '{resolution_note}'. Ready for re-attestation.",
                            metadata={"alert_id": alert_id, "resolution_note": resolution_note},
                        )

                return a
        raise HTTPException(status_code=404, detail="Alert not found")

    # ==========================================================================
    # 8. DASHBOARD STATISTICS
    # ==========================================================================

    def get_dashboard_stats(self, current_user: Dict[str, Any]) -> Dict[str, Any]:
        """Aggregates real-time heartbeat monitoring statistics."""
        roles = current_user.get("roles", [])
        is_admin = "system_admin" in roles
        is_inst = "institution_user" in roles

        fdrs = list(LOCAL_FDR_STORE)
        if is_inst and not is_admin:
            u_inst = current_user.get("institution_id") or "inst-01"
            fdrs = [f for f in fdrs if str(f.get("institution_id")) == str(u_inst)]

        alive_cnt = sum(1 for f in fdrs if f.get("heartbeat_status") == "alive")
        stale_cnt = sum(1 for f in fdrs if f.get("heartbeat_status") == "stale")
        broken_cnt = sum(1 for f in fdrs if f.get("heartbeat_status") == "broken")
        unresp_cnt = sum(1 for f in fdrs if f.get("heartbeat_status") == "unresponsive")
        not_started_cnt = sum(1 for f in fdrs if f.get("heartbeat_status") in ("not_started", None))

        now = datetime.now(timezone.utc)
        upcoming_checks = sum(
            1 for c in LOCAL_HEARTBEAT_CHECKS
            if c.get("check_status") == "requested" and (
                isinstance(c.get("response_due_at"), datetime) and c.get("response_due_at") > now
            )
        )
        overdue_checks = sum(
            1 for c in LOCAL_HEARTBEAT_CHECKS
            if c.get("check_status") == "requested" and (
                isinstance(c.get("response_due_at"), datetime) and c.get("response_due_at") <= now
            )
        )

        today = date.today()
        upcoming_maturities = 0
        for f in fdrs:
            m_date = f.get("maturity_date")
            if isinstance(m_date, str):
                m_date = datetime.strptime(m_date, "%Y-%m-%d").date()
            if m_date and 0 <= (m_date - today).days <= 30:
                upcoming_maturities += 1

        active_alerts = sum(1 for a in LOCAL_FDR_ALERTS if not a.get("is_resolved"))
        critical_alerts = sum(1 for a in LOCAL_FDR_ALERTS if not a.get("is_resolved") and a.get("severity") == "critical")

        # Recent activities from checks
        recent_activity = []
        sorted_checks = sorted(LOCAL_HEARTBEAT_CHECKS, key=lambda x: x.get("updated_at") or x.get("created_at"), reverse=True)[:8]
        for c in sorted_checks:
            recent_activity.append({
                "id": c.get("id"),
                "fdr_id": c.get("fdr_id"),
                "fdr_number": c.get("fdr_number"),
                "bank_name": c.get("bank_name"),
                "check_number": c.get("check_number"),
                "status": c.get("check_status"),
                "method": c.get("verification_method"),
                "timestamp": c.get("updated_at") or c.get("created_at"),
            })

        total_count = len(fdrs)
        compliance_pct = round((alive_cnt / total_count * 100), 1) if total_count > 0 else 100.0

        return {
            "total_monitored_fdrs": total_count,
            "total_monitored": total_count,
            "alive_count": alive_cnt,
            "stale_count": stale_cnt,
            "broken_count": broken_cnt,
            "unresponsive_count": unresp_cnt,
            "not_started_count": not_started_cnt,
            "upcoming_checks_count": upcoming_checks,
            "overdue_checks_count": overdue_checks,
            "upcoming_maturities_count": upcoming_maturities,
            "upcoming_maturities_30d": upcoming_maturities,
            "active_alerts_count": active_alerts,
            "critical_alerts_count": critical_alerts,
            "compliance_rate_percent": compliance_pct,
            "recent_activity": recent_activity,
        }

    # ==========================================================================
    # 9. COMPOSITE SCHEDULER CYCLE EXECUTION (IDEMPOTENT)
    # ==========================================================================

    def run_full_scheduler_cycle(self) -> Dict[str, Any]:
        """
        Executes a complete, idempotent scheduler sweep:
        1. Evaluate freshness on alive FDRs (lapsed -> stale).
        2. Process timeouts & retries on outstanding checks.
        3. Dispatch scheduled checks for due FDRs.
        4. Run maturity date reminders.
        """
        freshness_res = self.evaluate_heartbeat_freshness()
        timeout_res = self.process_timeouts_and_retries()
        dispatch_res = self.process_heartbeat_schedules()
        maturity_res = self.process_maturity_monitoring()

        return {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "freshness": freshness_res,
            "freshness_updated": freshness_res.get("marked_stale", 0),
            "timeouts_and_retries": timeout_res,
            "timed_out": timeout_res.get("timed_out", 0),
            "retried": timeout_res.get("retried", 0),
            "dispatched": dispatch_res,
            "checks_dispatched": dispatch_res.get("dispatched_checks", 0),
            "maturity_alerts": maturity_res.get("alerts_generated", 0),
            "maturity_details": maturity_res,
        }

    def check_and_update_freshness(self) -> int:
        res = self.evaluate_heartbeat_freshness()
        return res.get("marked_stale", 0)

    def handle_heartbeat_rejection(
        self,
        fdr_id: str,
        reason: Optional[str] = None,
        rejection_reason: Optional[str] = None,
        discrepancy_details: Optional[Dict[str, Any]] = None,
        check_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        return self.record_heartbeat_rejection(
            fdr_id=fdr_id,
            reason=reason,
            rejection_reason=rejection_reason,
            discrepancy_details=discrepancy_details,
            check_id=check_id,
        )

    def handle_heartbeat_confirmation(
        self,
        fdr_id: str,
        attestation_id: Optional[str] = None,
        check_id: Optional[str] = None,
        officer_notes: Optional[str] = None,
        method: str = "tier2_bank_confirmation",
    ) -> Dict[str, Any]:
        return self.record_heartbeat_confirmation(
            fdr_id=fdr_id,
            attestation_id=attestation_id,
            check_id=check_id,
            officer_notes=officer_notes,
            method=method,
        )

    def generate_maturity_reminders(self) -> int:
        res = self.process_maturity_monitoring()
        return res.get("alerts_generated", 0)

    def create_alert(
        self,
        fdr_id: str,
        alert_type: str,
        severity: str,
        title: str,
        message: str,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        return self.emit_alert(
            fdr_id=fdr_id,
            alert_type=alert_type,
            severity=severity,
            title=title,
            message=message,
            metadata=metadata,
        )


heartbeat_service = HeartbeatMonitoringService()
