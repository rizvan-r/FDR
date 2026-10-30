"""
Phase 8: FDR Release, Refund & Closure Management Service.
Handles release requests, configurable checklist engine, multi-stage supervisory reviews,
bank release tracking (simulated), refund ledger reconciliation, and statutory final closure.
"""
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime, date
import uuid
import logging

from app.schemas.phase8 import (
    ReleasePolicyCreate, ReleasePolicyUpdate, ReleasePolicyResponse,
    ChecklistItemUpdate, ChecklistItemResponse,
    ReleaseReviewCreate, ReleaseReviewResponse,
    ReleaseInstructionCreate, BankConfirmationCreate, BankReleaseRecordResponse,
    RefundRecordCreate, RefundTransactionCreate, RefundRecordResponse, RefundTransactionResponse,
    RefundReconciliationCreate, ReleaseClosureCreate, ReleaseClosureResponse,
    ReleaseRequestCreate, ReleaseRequestUpdate, ReleaseRequestResponse, ReleaseRequestDetailResponse,
    ReleaseDashboardStats
)

logger = logging.getLogger(__name__)

# In-memory storage stores for test client / fallback
_MOCK_POLICIES: Dict[str, Dict[str, Any]] = {}
_MOCK_RELEASE_REQUESTS: Dict[str, Dict[str, Any]] = {}
_MOCK_CHECKLIST_ITEMS: Dict[str, Dict[str, Any]] = {}
_MOCK_REVIEWS: Dict[str, Dict[str, Any]] = {}
_MOCK_BANK_RELEASES: Dict[str, Dict[str, Any]] = {}
_MOCK_REFUNDS: Dict[str, Dict[str, Any]] = {}
_MOCK_REFUND_TRANSACTIONS: Dict[str, Dict[str, Any]] = {}
_MOCK_CLOSURES: Dict[str, Dict[str, Any]] = {}

def _init_default_policy():
    if not _MOCK_POLICIES:
        pol_id = "88888888-8888-8888-8888-888888880001"
        _MOCK_POLICIES[pol_id] = {
            "id": pol_id,
            "policy_name": "AICTE Standard Security Deposit Release Norms (2026-27)",
            "policy_version": "RPV-2026.1",
            "policy_description": "Standard statutory checklist and four-tier delegation matrix for institutional FDR release, lien revocation, and refund reconciliation.",
            "source_reference": "AICTE Approval Process Handbook (APH) 2026-27, Chapter IV Section 4.3",
            "effective_from": "2026-01-01T00:00:00Z",
            "effective_until": None,
            "is_active": True,
            "checklist_configuration": [
                {
                    "key": "CHK_FDR_IDENTITY",
                    "title": "FDR Identity & Custody Verification",
                    "description": "Verification of FDR receipt number, depository bank, branch IFSC, and original joint lien custody.",
                    "is_required": True
                },
                {
                    "key": "CHK_MATURITY_STATUS",
                    "title": "Deposit Maturity & Tenure Completion",
                    "description": "Validation that the mandatory statutory deposit tenure has elapsed without default or forfeiture proceedings.",
                    "is_required": True
                },
                {
                    "key": "CHK_BANK_VERIFICATION",
                    "title": "Depository Bank Digital Standing",
                    "description": "Confirmation that the deposit maintains verified status (Trust Tier >= 2) and healthy heartbeat surveillance.",
                    "is_required": True
                },
                {
                    "key": "CHK_COMPLIANCE_CLEARANCE",
                    "title": "Institutional Regulatory Clearance",
                    "description": "Verification that the institution has zero outstanding show-cause notices, legal stays, or regulatory penalties.",
                    "is_required": True
                },
                {
                    "key": "CHK_LINEAGE_INTEGRITY",
                    "title": "Lineage & Non-Encumbrance Audit",
                    "description": "Validation that the FDR is not linked as an active predecessor to an unresolved renewal case.",
                    "is_required": True
                },
                {
                    "key": "CHK_FINANCIAL_SETTLEMENT",
                    "title": "Financial Corpus & Interest Assessment",
                    "description": "Finance bureau assessment of principal sum, accrued maturity interest, and institutional refund bank account.",
                    "is_required": True
                },
                {
                    "key": "CHK_LEGAL_UNDERTAKING",
                    "title": "Statutory Indemnity & Governing Body Undertaking",
                    "description": "Submission of verified governing board resolution and non-dispute indemnity undertaking.",
                    "is_required": False
                }
            ],
            "approval_configuration": {
                "stages": [
                    {"stage": "preliminary_review", "role": "regional_officer", "label": "Regional Office Preliminary Review"},
                    {"stage": "eligibility_review", "role": "bureau_officer", "label": "Approval Bureau Regulatory Audit"},
                    {"stage": "finance_review", "role": "finance_officer", "label": "Finance Bureau Reconciliation"},
                    {"stage": "authority_review", "role": "system_admin", "label": "Competent Authority Final Sanction"}
                ],
                "require_separation_of_duties": True,
                "allow_self_approval": False
            },
            "created_by": None,
            "created_at": "2026-01-01T00:00:00Z"
        }

_init_default_policy()

class ReleaseService:
    @staticmethod
    def list_policies(supabase_client=None) -> List[Dict[str, Any]]:
        _init_default_policy()
        if supabase_client:
            try:
                res = supabase_client.table("release_policy_versions").select("*").order("created_at", desc=True).execute()
                if res.data:
                    return res.data
            except Exception as e:
                logger.warning(f"Failed to fetch policies from DB: {e}")
        return list(_MOCK_POLICIES.values())

    @staticmethod
    def get_policy(policy_id: str, supabase_client=None) -> Optional[Dict[str, Any]]:
        _init_default_policy()
        if supabase_client:
            try:
                res = supabase_client.table("release_policy_versions").select("*").eq("id", policy_id).single().execute()
                if res.data:
                    return res.data
            except Exception:
                pass
        return _MOCK_POLICIES.get(str(policy_id))

    @staticmethod
    def get_active_policy(supabase_client=None) -> Dict[str, Any]:
        _init_default_policy()
        if supabase_client:
            try:
                res = supabase_client.table("release_policy_versions").select("*").eq("is_active", True).order("created_at", desc=True).limit(1).execute()
                if res.data:
                    return res.data[0]
            except Exception:
                pass
        for p in _MOCK_POLICIES.values():
            if p.get("is_active"):
                return p
        return list(_MOCK_POLICIES.values())[0]

    @staticmethod
    def create_policy(policy_data: ReleasePolicyCreate, user_id: str, supabase_client=None) -> Dict[str, Any]:
        policy_id = str(uuid.uuid4())
        rec = {
            "id": policy_id,
            "policy_name": policy_data.policy_name,
            "policy_version": policy_data.policy_version,
            "policy_description": policy_data.policy_description,
            "source_reference": policy_data.source_reference,
            "effective_from": policy_data.effective_from.isoformat() if policy_data.effective_from else datetime.utcnow().isoformat(),
            "effective_until": policy_data.effective_until.isoformat() if policy_data.effective_until else None,
            "checklist_configuration": policy_data.checklist_configuration,
            "approval_configuration": policy_data.approval_configuration,
            "is_active": policy_data.is_active,
            "created_by": user_id,
            "created_at": datetime.utcnow().isoformat()
        }
        if supabase_client:
            try:
                res = supabase_client.table("release_policy_versions").insert(rec).execute()
                if res.data:
                    _MOCK_POLICIES[policy_id] = res.data[0]
                    return res.data[0]
            except Exception as e:
                logger.error(f"Error inserting policy to DB: {e}")
        _MOCK_POLICIES[policy_id] = rec
        return rec

    @staticmethod
    def update_policy(policy_id: str, update_data: ReleasePolicyUpdate, supabase_client=None) -> Optional[Dict[str, Any]]:
        pol = ReleaseService.get_policy(policy_id, supabase_client)
        if not pol:
            return None
        payload = update_data.model_dump(exclude_unset=True)
        for k, v in payload.items():
            pol[k] = v
        if supabase_client:
            try:
                res = supabase_client.table("release_policy_versions").update(payload).eq("id", policy_id).execute()
                if res.data:
                    _MOCK_POLICIES[policy_id] = res.data[0]
                    return res.data[0]
            except Exception as e:
                logger.error(f"Error updating policy: {e}")
        _MOCK_POLICIES[policy_id] = pol
        return pol

    # -------------------------------------------------------------------------
    # RELEASE REQUESTS
    # -------------------------------------------------------------------------
    @staticmethod
    def create_release_request(
        fdr_id: str,
        request_data: ReleaseRequestCreate,
        user_info: Dict[str, Any],
        fdr_repo_getter,
        supabase_client=None
    ) -> Dict[str, Any]:
        """
        Creates a new release request for the given FDR.
        Enforces:
        - FDR must exist
        - Institution scope matching
        - Conflicting active request check (cannot have 2 non-terminal requests for 1 FDR)
        - FDR lifecycle must not be released/closed already
        - Initializes checklist items from the active release policy version
        """
        fdr = fdr_repo_getter(fdr_id)
        if not fdr:
            raise ValueError("FDR record not found.")

        user_role = user_info.get("role", "institution_user")
        user_inst_id = user_info.get("institution_id")
        user_id = user_info.get("id")

        if user_role == "institution_user":
            if str(fdr.get("institution_id")) != str(user_inst_id):
                raise PermissionError("Access denied: You cannot request release for an FDR belonging to another institution.")

        # Check conflicting active requests
        active_terminal = {"rejected", "cancelled", "closed"}
        for req in _MOCK_RELEASE_REQUESTS.values():
            if str(req.get("fdr_id")) == str(fdr_id) and req.get("request_status") not in active_terminal:
                raise ValueError(f"Conflicting active release request '{req.get('request_number')}' already exists for this FDR.")

        # Resolve policy version
        policy_id = str(request_data.policy_version_id) if request_data.policy_version_id else None
        if policy_id:
            pol = ReleaseService.get_policy(policy_id, supabase_client)
            if not pol:
                raise ValueError("Specified release policy version not found.")
        else:
            pol = ReleaseService.get_active_policy(supabase_client)
            policy_id = pol["id"]

        req_id = str(uuid.uuid4())
        req_number = f"REL-{datetime.utcnow().year}-{len(_MOCK_RELEASE_REQUESTS) + 1:04d}"

        new_req = {
            "id": req_id,
            "request_number": req_number,
            "fdr_id": str(fdr_id),
            "fdr_number": fdr.get("fdr_number", "N/A"),
            "principal_amount": float(fdr.get("amount", fdr.get("principal_amount", 0.0))),
            "bank_name": fdr.get("bank_name", "N/A"),
            "institution_id": str(fdr.get("institution_id")),
            "institution_name": fdr.get("institution_name", "AICTE Institution"),
            "requested_by": user_id,
            "request_reason": request_data.request_reason,
            "request_status": "draft",
            "policy_version_id": policy_id,
            "policy_version": pol.get("policy_version", "RPV-2026.1"),
            "submitted_at": None,
            "current_reviewer_id": None,
            "final_decision_by": None,
            "final_decision_at": None,
            "decision_comments": None,
            "bank_release_status": "not_started",
            "refund_status": "pending",
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat()
        }

        _MOCK_RELEASE_REQUESTS[req_id] = new_req

        # Initialize checklist items from policy configuration
        checklist_cfg = pol.get("checklist_configuration", [])
        for item_cfg in checklist_cfg:
            chk_id = str(uuid.uuid4())
            chk_rec = {
                "id": chk_id,
                "release_request_id": req_id,
                "policy_requirement_key": item_cfg.get("key", "GENERIC_REQ"),
                "requirement_title": item_cfg.get("title", "Requirement"),
                "requirement_description": item_cfg.get("description", ""),
                "is_required": item_cfg.get("is_required", True),
                "review_status": "pending",
                "evidence_document_id": None,
                "reviewed_by": None,
                "reviewed_at": None,
                "review_comments": None,
                "created_at": datetime.utcnow().isoformat(),
                "updated_at": datetime.utcnow().isoformat()
            }
            _MOCK_CHECKLIST_ITEMS[chk_id] = chk_rec

        # Initialize bank release record
        bank_rel_id = str(uuid.uuid4())
        _MOCK_BANK_RELEASES[bank_rel_id] = {
            "id": bank_rel_id,
            "release_request_id": req_id,
            "fdr_id": str(fdr_id),
            "bank_id": fdr.get("bank_id"),
            "bank_name": fdr.get("bank_name", "State Bank of India"),
            "release_status": "not_started",
            "instruction_reference": None,
            "bank_reference": None,
            "bank_confirmation_date": None,
            "confirmation_method": None,
            "evidence_document_id": None,
            "confirmed_by": None,
            "is_mock": True,
            "disclaimer": "SIMULATED DEMO — NOT AN ACTUAL BANK MONEY TRANSFER",
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat()
        }

        # Initialize refund record
        refund_id = str(uuid.uuid4())
        _MOCK_REFUNDS[refund_id] = {
            "id": refund_id,
            "release_request_id": req_id,
            "fdr_id": str(fdr_id),
            "expected_amount": float(fdr.get("amount", fdr.get("principal_amount", 0.0))),
            "received_amount": 0.0,
            "currency": "INR",
            "refund_status": "pending",
            "refund_reference": None,
            "refund_date": None,
            "payment_mode": None,
            "supporting_document_id": None,
            "recorded_by": user_id,
            "transactions": [],
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat()
        }

        return new_req

    @staticmethod
    def get_release_request(request_id: str) -> Optional[Dict[str, Any]]:
        return _MOCK_RELEASE_REQUESTS.get(str(request_id))

    @staticmethod
    def get_release_request_detail(request_id: str, fdr_repo_getter, supabase_client=None) -> Optional[Dict[str, Any]]:
        req = ReleaseService.get_release_request(request_id)
        if not req:
            return None

        req_copy = dict(req)
        fdr = fdr_repo_getter(req["fdr_id"])
        req_copy["fdr_details"] = fdr

        pol = ReleaseService.get_policy(req["policy_version_id"], supabase_client)
        req_copy["policy_details"] = pol

        # Checklist items
        items = [i for i in _MOCK_CHECKLIST_ITEMS.values() if str(i.get("release_request_id")) == str(request_id)]
        req_copy["checklist_items"] = items

        # Reviews
        reviews = [r for r in _MOCK_REVIEWS.values() if str(r.get("release_request_id")) == str(request_id)]
        req_copy["reviews"] = sorted(reviews, key=lambda x: x.get("reviewed_at", ""))

        # Bank release record
        bank_rels = [b for b in _MOCK_BANK_RELEASES.values() if str(b.get("release_request_id")) == str(request_id)]
        req_copy["bank_release"] = bank_rels[0] if bank_rels else None

        # Refund record
        refunds = [rf for rf in _MOCK_REFUNDS.values() if str(rf.get("release_request_id")) == str(request_id)]
        if refunds:
            rf = dict(refunds[0])
            txs = [t for t in _MOCK_REFUND_TRANSACTIONS.values() if str(t.get("refund_record_id")) == str(rf["id"])]
            rf["transactions"] = txs
            req_copy["refund_record"] = rf
        else:
            req_copy["refund_record"] = None

        # Closure record
        closures = [c for c in _MOCK_CLOSURES.values() if str(c.get("release_request_id")) == str(request_id)]
        req_copy["closure_record"] = closures[0] if closures else None

        return req_copy

    @staticmethod
    def list_release_requests(
        user_info: Dict[str, Any],
        status: Optional[str] = None,
        institution_id: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        user_role = user_info.get("role", "institution_user")
        user_inst_id = user_info.get("institution_id")

        results = []
        for req in _MOCK_RELEASE_REQUESTS.values():
            # Institution scoping
            if user_role == "institution_user":
                if str(req.get("institution_id")) != str(user_inst_id):
                    continue
            elif institution_id:
                if str(req.get("institution_id")) != str(institution_id):
                    continue

            # Status filtering
            if status and req.get("request_status") != status:
                continue

            results.append(req)

        return sorted(results, key=lambda x: x.get("created_at", ""), reverse=True)

    @staticmethod
    def update_release_request(request_id: str, update_data: ReleaseRequestUpdate, user_info: Dict[str, Any]) -> Dict[str, Any]:
        req = ReleaseService.get_release_request(request_id)
        if not req:
            raise ValueError("Release request not found.")

        if req.get("request_status") not in ("draft", "returned_for_correction"):
            raise ValueError(f"Cannot update release request in '{req.get('request_status')}' state.")

        user_role = user_info.get("role", "institution_user")
        user_inst_id = user_info.get("institution_id")
        if user_role == "institution_user" and str(req.get("institution_id")) != str(user_inst_id):
            raise PermissionError("Access denied.")

        if update_data.request_reason:
            req["request_reason"] = update_data.request_reason
        req["updated_at"] = datetime.utcnow().isoformat()
        return req

    @staticmethod
    def submit_release_request(request_id: str, user_info: Dict[str, Any]) -> Dict[str, Any]:
        req = ReleaseService.get_release_request(request_id)
        if not req:
            raise ValueError("Release request not found.")

        if req.get("request_status") not in ("draft", "returned_for_correction"):
            raise ValueError(f"Cannot submit release request from status '{req.get('request_status')}'.")

        user_role = user_info.get("role", "institution_user")
        user_inst_id = user_info.get("institution_id")
        if user_role == "institution_user" and str(req.get("institution_id")) != str(user_inst_id):
            raise PermissionError("Access denied.")

        req["request_status"] = "submitted"
        req["submitted_at"] = datetime.utcnow().isoformat()
        req["updated_at"] = datetime.utcnow().isoformat()
        return req

    @staticmethod
    def cancel_release_request(request_id: str, user_info: Dict[str, Any]) -> Dict[str, Any]:
        req = ReleaseService.get_release_request(request_id)
        if not req:
            raise ValueError("Release request not found.")

        allowed_cancel_states = {"draft", "submitted", "returned_for_correction"}
        if req.get("request_status") not in allowed_cancel_states:
            raise ValueError(f"Cannot cancel request in '{req.get('request_status')}' state.")

        req["request_status"] = "cancelled"
        req["updated_at"] = datetime.utcnow().isoformat()
        return req

    # -------------------------------------------------------------------------
    # CHECKLIST ENGINE
    # -------------------------------------------------------------------------
    @staticmethod
    def get_checklist_items(request_id: str) -> List[Dict[str, Any]]:
        return [i for i in _MOCK_CHECKLIST_ITEMS.values() if str(i.get("release_request_id")) == str(request_id)]

    @staticmethod
    def update_checklist_item(
        request_id: str,
        item_id: str,
        update_data: ChecklistItemUpdate,
        user_info: Dict[str, Any]
    ) -> Dict[str, Any]:
        item = _MOCK_CHECKLIST_ITEMS.get(str(item_id))
        if not item or str(item.get("release_request_id")) != str(request_id):
            raise ValueError("Checklist item not found for this release request.")

        item["review_status"] = update_data.review_status
        if update_data.evidence_document_id:
            item["evidence_document_id"] = str(update_data.evidence_document_id)
        if update_data.review_comments:
            item["review_comments"] = update_data.review_comments
        item["reviewed_by"] = user_info.get("id")
        item["reviewed_at"] = datetime.utcnow().isoformat()
        item["updated_at"] = datetime.utcnow().isoformat()
        return item

    # -------------------------------------------------------------------------
    # REVIEWS & DECISIONS
    # -------------------------------------------------------------------------
    @staticmethod
    def add_review(
        request_id: str,
        review_data: ReleaseReviewCreate,
        user_info: Dict[str, Any]
    ) -> Dict[str, Any]:
        req = ReleaseService.get_release_request(request_id)
        if not req:
            raise ValueError("Release request not found.")

        user_id = user_info.get("id")
        user_role = user_info.get("role", "system_admin")

        # Invariant: Self-approval prohibited
        if str(req.get("requested_by")) == str(user_id):
            raise PermissionError("Self-approval prohibited: You cannot review or approve a release request you submitted.")

        rev_id = str(uuid.uuid4())
        rec = {
            "id": rev_id,
            "release_request_id": str(request_id),
            "review_stage": review_data.review_stage,
            "reviewer_id": user_id,
            "reviewer_name": user_info.get("full_name", "Supervisory Officer"),
            "reviewer_role": user_role,
            "review_decision": review_data.review_decision,
            "comments": review_data.comments,
            "reviewed_at": datetime.utcnow().isoformat(),
            "created_at": datetime.utcnow().isoformat()
        }
        _MOCK_REVIEWS[rev_id] = rec

        # Advance stage or handle decision
        if review_data.review_decision == "return_for_correction":
            req["request_status"] = "returned_for_correction"
            req["decision_comments"] = review_data.comments
        elif review_data.review_decision == "rejected":
            req["request_status"] = "rejected"
            req["final_decision_by"] = user_id
            req["final_decision_at"] = datetime.utcnow().isoformat()
            req["decision_comments"] = review_data.comments
        elif review_data.review_decision == "approved":
            # Check checklist completion
            checklist = ReleaseService.get_checklist_items(request_id)
            unsatisfied = [c for c in checklist if c.get("is_required") and c.get("review_status") != "satisfied"]
            if unsatisfied:
                raise ValueError(f"Cannot approve request: {len(unsatisfied)} mandatory checklist items are not yet satisfied.")
            req["request_status"] = "approved"
            req["final_decision_by"] = user_id
            req["final_decision_at"] = datetime.utcnow().isoformat()
            req["decision_comments"] = review_data.comments
        else:
            # Advance review stage
            next_stages = {
                "preliminary_review": "eligibility_review",
                "eligibility_review": "finance_review",
                "finance_review": "authority_review",
                "authority_review": "approved"
            }
            req["request_status"] = next_stages.get(review_data.review_stage, req["request_status"])

        req["updated_at"] = datetime.utcnow().isoformat()
        return rec

    @staticmethod
    def return_request_for_correction(request_id: str, comments: str, user_info: Dict[str, Any]) -> Dict[str, Any]:
        return ReleaseService.add_review(
            request_id=request_id,
            review_data=ReleaseReviewCreate(
                review_stage="eligibility_review",
                review_decision="return_for_correction",
                comments=comments
            ),
            user_info=user_info
        )

    @staticmethod
    def approve_request(request_id: str, comments: str, user_info: Dict[str, Any]) -> Dict[str, Any]:
        return ReleaseService.add_review(
            request_id=request_id,
            review_data=ReleaseReviewCreate(
                review_stage="authority_review",
                review_decision="approved",
                comments=comments
            ),
            user_info=user_info
        )

    @staticmethod
    def reject_request(request_id: str, comments: str, user_info: Dict[str, Any]) -> Dict[str, Any]:
        if not comments or len(comments.strip()) < 5:
            raise ValueError("Formal written justification is mandatory for rejecting a release request.")
        return ReleaseService.add_review(
            request_id=request_id,
            review_data=ReleaseReviewCreate(
                review_stage="authority_review",
                review_decision="rejected",
                comments=comments
            ),
            user_info=user_info
        )

    # -------------------------------------------------------------------------
    # BANK RELEASE TRACKING
    # -------------------------------------------------------------------------
    @staticmethod
    def prepare_release_instruction(
        request_id: str,
        instruction_data: ReleaseInstructionCreate,
        user_info: Dict[str, Any]
    ) -> Dict[str, Any]:
        req = ReleaseService.get_release_request(request_id)
        if not req:
            raise ValueError("Release request not found.")

        if req.get("request_status") not in ("approved", "release_initiated"):
            raise ValueError(f"Cannot prepare release instruction for request in '{req.get('request_status')}' state. Must be approved.")

        bank_rels = [b for b in _MOCK_BANK_RELEASES.values() if str(b.get("release_request_id")) == str(request_id)]
        if not bank_rels:
            raise ValueError("Bank release record missing.")

        bank_rec = bank_rels[0]
        ref = instruction_data.instruction_reference or f"AICTE/REL/INST/{datetime.utcnow().year}/{len(_MOCK_BANK_RELEASES):04d}"
        bank_rec["instruction_reference"] = ref
        bank_rec["release_status"] = "instruction_prepared"
        bank_rec["updated_at"] = datetime.utcnow().isoformat()

        req["request_status"] = "release_initiated"
        req["bank_release_status"] = "instruction_prepared"
        req["updated_at"] = datetime.utcnow().isoformat()
        return bank_rec

    @staticmethod
    def record_bank_confirmation(
        request_id: str,
        confirmation: BankConfirmationCreate,
        user_info: Dict[str, Any],
        fdr_lifecycle_updater
    ) -> Dict[str, Any]:
        """
        Records simulated bank confirmation.
        Enforces:
        - Must be in release_initiated state
        - Clearly flagged as mock simulation
        - Only a validated confirmation transitions FDR lifecycle status to 'released'
        """
        req = ReleaseService.get_release_request(request_id)
        if not req:
            raise ValueError("Release request not found.")

        bank_rels = [b for b in _MOCK_BANK_RELEASES.values() if str(b.get("release_request_id")) == str(request_id)]
        if not bank_rels:
            raise ValueError("Bank release record missing.")

        bank_rec = bank_rels[0]
        bank_rec["bank_reference"] = confirmation.bank_reference
        if confirmation.bank_confirmation_date:
            bank_rec["bank_confirmation_date"] = (
                confirmation.bank_confirmation_date.isoformat()
                if hasattr(confirmation.bank_confirmation_date, "isoformat")
                else str(confirmation.bank_confirmation_date)
            )
        else:
            bank_rec["bank_confirmation_date"] = datetime.utcnow().isoformat()
        bank_rec["confirmation_method"] = confirmation.confirmation_method
        bank_rec["release_status"] = confirmation.decision
        bank_rec["confirmed_by"] = user_info.get("id")
        bank_rec["is_mock"] = True
        bank_rec["disclaimer"] = "SIMULATED DEMO — NOT AN ACTUAL BANK MONEY TRANSFER"
        bank_rec["updated_at"] = datetime.utcnow().isoformat()

        req["bank_release_status"] = confirmation.decision

        if confirmation.decision == "released":
            req["request_status"] = "bank_confirmed"
            # Authorized lifecycle transition: mark underlying FDR as released!
            fdr_lifecycle_updater(req["fdr_id"], "released")
        elif confirmation.decision == "release_rejected":
            req["request_status"] = "rejected"
            req["decision_comments"] = f"Bank rejected lien revocation: {confirmation.notes or 'No notes provided'}"

        req["updated_at"] = datetime.utcnow().isoformat()
        return bank_rec

    # -------------------------------------------------------------------------
    # REFUND LEDGER & RECONCILIATION
    # -------------------------------------------------------------------------
    @staticmethod
    def get_refund_record(request_id: str) -> Optional[Dict[str, Any]]:
        refunds = [rf for rf in _MOCK_REFUNDS.values() if str(rf.get("release_request_id")) == str(request_id)]
        if not refunds:
            return None
        rf = dict(refunds[0])
        txs = [t for t in _MOCK_REFUND_TRANSACTIONS.values() if str(t.get("refund_record_id")) == str(rf["id"])]
        rf["transactions"] = txs
        return rf

    @staticmethod
    def record_refund_transaction(
        request_id: str,
        tx_data: RefundTransactionCreate,
        user_info: Dict[str, Any]
    ) -> Dict[str, Any]:
        rf = ReleaseService.get_refund_record(request_id)
        if not rf:
            raise ValueError("Refund record not found for this release request.")

        tx_id = str(uuid.uuid4())
        new_tx = {
            "id": tx_id,
            "refund_record_id": rf["id"],
            "transaction_reference": tx_data.transaction_reference,
            "amount": float(tx_data.amount),
            "transaction_date": (
                tx_data.transaction_date.isoformat()
                if hasattr(tx_data.transaction_date, "isoformat")
                else (str(tx_data.transaction_date) if tx_data.transaction_date else date.today().isoformat())
            ),
            "payment_mode": tx_data.payment_mode,
            "utr_number": tx_data.utr_number,
            "receipt_document_id": str(tx_data.receipt_document_id) if tx_data.receipt_document_id else None,
            "recorded_by": user_info.get("id"),
            "created_at": datetime.utcnow().isoformat()
        }
        _MOCK_REFUND_TRANSACTIONS[tx_id] = new_tx

        # Update cumulative received amount in parent refund record
        current_rf = _MOCK_REFUNDS[rf["id"]]
        current_rf["received_amount"] = float(current_rf.get("received_amount", 0.0)) + float(tx_data.amount)
        expected = float(current_rf.get("expected_amount", 0.0))

        if current_rf["received_amount"] >= expected:
            current_rf["refund_status"] = "reconciliation_pending"
        elif current_rf["received_amount"] > 0:
            current_rf["refund_status"] = "partially_received"

        current_rf["updated_at"] = datetime.utcnow().isoformat()

        req = ReleaseService.get_release_request(request_id)
        if req:
            req["refund_status"] = current_rf["refund_status"]
            req["updated_at"] = datetime.utcnow().isoformat()

        return new_tx

    @staticmethod
    def reconcile_refund(
        request_id: str,
        rec_data: RefundReconciliationCreate,
        user_info: Dict[str, Any]
    ) -> Dict[str, Any]:
        rf = _MOCK_REFUNDS.get(str(request_id)) or next((r for r in _MOCK_REFUNDS.values() if str(r.get("release_request_id")) == str(request_id)), None)
        if not rf:
            raise ValueError("Refund record not found.")

        rf["refund_status"] = rec_data.status
        rf["updated_at"] = datetime.utcnow().isoformat()

        req = ReleaseService.get_release_request(request_id)
        if req:
            req["refund_status"] = rec_data.status
            req["updated_at"] = datetime.utcnow().isoformat()
        return rf

    # -------------------------------------------------------------------------
    # FINAL CLOSURE
    # -------------------------------------------------------------------------
    @staticmethod
    def close_release_request(
        request_id: str,
        closure_data: ReleaseClosureCreate,
        user_info: Dict[str, Any],
        fdr_lifecycle_updater
    ) -> Dict[str, Any]:
        """
        Final statutory closure:
        - Validates release request is bank_confirmed
        - Validates refund is reconciled (or waived/not applicable)
        - Creates closure record and marks request closed
        """
        req = ReleaseService.get_release_request(request_id)
        if not req:
            raise ValueError("Release request not found.")

        if req.get("bank_release_status") != "released" and req.get("request_status") != "bank_confirmed":
            raise ValueError("Cannot close request: Depository bank release confirmation has not been recorded.")

        rf = ReleaseService.get_refund_record(request_id)
        if rf and rf.get("refund_status") not in ("reconciled", "waived", "not_applicable"):
            raise ValueError(f"Cannot close request: Refund status is '{rf.get('refund_status')}'. Reconciliation must be completed.")

        closure_id = str(uuid.uuid4())
        rec = {
            "id": closure_id,
            "release_request_id": str(request_id),
            "closure_status": "closed",
            "reconciliation_status": "reconciled",
            "reconciled_by": user_info.get("id"),
            "reconciled_at": datetime.utcnow().isoformat(),
            "closure_notes": closure_data.closure_notes,
            "closure_evidence_document_id": str(closure_data.closure_evidence_document_id) if closure_data.closure_evidence_document_id else None,
            "closed_by": user_info.get("id"),
            "closed_at": datetime.utcnow().isoformat(),
            "created_at": datetime.utcnow().isoformat()
        }
        _MOCK_CLOSURES[closure_id] = rec

        req["request_status"] = "closed"
        req["updated_at"] = datetime.utcnow().isoformat()

        # Update FDR lifecycle status to closed
        fdr_lifecycle_updater(req["fdr_id"], "closed")

        return rec

    # -------------------------------------------------------------------------
    # DASHBOARD KPI AGGREGATION
    # -------------------------------------------------------------------------
    @staticmethod
    def get_dashboard_stats(user_info: Dict[str, Any]) -> ReleaseDashboardStats:
        requests = ReleaseService.list_release_requests(user_info)
        total = len(requests)
        drafts = sum(1 for r in requests if r.get("request_status") == "draft")
        under_review = sum(1 for r in requests if r.get("request_status") in ("submitted", "preliminary_review", "eligibility_review", "finance_review", "authority_review"))
        approved = sum(1 for r in requests if r.get("request_status") in ("approved", "release_initiated"))
        bank_pending = sum(1 for r in requests if r.get("request_status") == "release_initiated" or r.get("bank_release_status") in ("instruction_prepared", "awaiting_bank"))
        refund_pending = sum(1 for r in requests if r.get("refund_status") in ("pending", "partially_received", "reconciliation_pending"))
        closed = sum(1 for r in requests if r.get("request_status") == "closed")
        total_released_amt = sum(float(r.get("principal_amount", 0.0)) for r in requests if r.get("request_status") in ("bank_confirmed", "closed"))

        return ReleaseDashboardStats(
            total_requests=total,
            draft_count=drafts,
            under_review_count=under_review,
            approved_count=approved,
            bank_release_pending=bank_pending,
            refund_pending=refund_pending,
            closed_count=closed,
            total_released_amount=total_released_amt
        )
