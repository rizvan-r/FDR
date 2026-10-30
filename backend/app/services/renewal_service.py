import logging
import hashlib
from typing import Dict, Any, List, Optional, Set
from uuid import uuid4
from datetime import datetime, date, timedelta, timezone
from decimal import Decimal
from fastapi import HTTPException, UploadFile, status

from app.schemas.renewal import (
    RenewalCaseCreateRequest,
    RenewalCaseUpdateRequest,
    RenewalCaseSubmitRequest,
    RenewalApprovalRequest,
    RenewalRejectionRequest,
    RenewalCaseResponse,
    RenewalCaseListResponse,
    RenewalApprovalResponse,
    RenewalEvidenceResponse,
    FDRLineageGraphResponse,
    FDRLineageNode,
    FDRLineageEdge,
    MatchingResultResponse,
    RenewalDashboardStatsResponse,
)
from app.services.matching_service import candidate_matching_service
from app.services.fdr_service import LOCAL_FDR_STORE
from app.services.supabase_admin import supabase_admin

logger = logging.getLogger("fdr_chain.renewal_service")

# --- In-Memory Stores for Local Evaluation Mode ---

LOCAL_RENEWAL_CASES: List[Dict[str, Any]] = [
    {
        "id": "case-001",
        "case_number": "RC-2027-0001",
        "institution_id": "inst-01",
        "original_fdr_id": "fdr-001",
        "proposed_replacement_fdr_id": "fdr-005",
        "status": "approved",
        "submission_notes": "Routine annual renewal of NH-48 Expressway Package 4 performance guarantee. Replacement FDR issued by SBI New Delhi Main Branch with identical amount (2.5 Cr) and extended tenure to 2028.",
        "submitted_by": "usr-admin-01",
        "submitted_at": datetime(2027, 1, 16, 10, 0, 0, tzinfo=timezone.utc),
        "reviewer_id": "usr-admin-01",
        "reviewed_at": datetime(2027, 1, 18, 11, 30, 0, tzinfo=timezone.utc),
        "decision_notes": "Bank verification complete via SBI API (Tier 2 verified). Renewal advice and closure vouchers verified against SBI records. Lineage approved.",
        "created_at": datetime(2027, 1, 16, 9, 30, 0, tzinfo=timezone.utc),
        "updated_at": datetime(2027, 1, 18, 11, 30, 0, tzinfo=timezone.utc),
    },
    {
        "id": "case-002",
        "case_number": "RC-2026-0002",
        "institution_id": "inst-02",
        "original_fdr_id": "fdr-002",
        "proposed_replacement_fdr_id": None,
        "status": "under_review",
        "submission_notes": "Maturity approaching for CPWD Parliament Annex security deposit (PNB). Replacement deposit voucher received from contractor; awaiting official bank confirmation.",
        "submitted_by": "usr-admin-01",
        "submitted_at": datetime.now(timezone.utc) - timedelta(days=5),
        "reviewer_id": None,
        "reviewed_at": None,
        "decision_notes": None,
        "created_at": datetime.now(timezone.utc) - timedelta(days=6),
        "updated_at": datetime.now(timezone.utc) - timedelta(days=5),
    },
    {
        "id": "case-003",
        "case_number": "RC-2026-0003",
        "institution_id": "inst-03",
        "original_fdr_id": "fdr-003",
        "proposed_replacement_fdr_id": None,
        "status": "draft",
        "submission_notes": "Draft case initiated for upcoming BHEL turbine guarantee maturity.",
        "submitted_by": "usr-admin-01",
        "submitted_at": None,
        "reviewer_id": None,
        "reviewed_at": None,
        "decision_notes": None,
        "created_at": datetime.now(timezone.utc) - timedelta(days=2),
        "updated_at": datetime.now(timezone.utc) - timedelta(days=2),
    },
]

LOCAL_FDR_LINEAGE: List[Dict[str, Any]] = [
    {
        "id": "lineage-001",
        "parent_fdr_id": "fdr-001",
        "child_fdr_id": "fdr-005",
        "renewal_case_id": "case-001",
        "relationship_type": "renewal",
        "created_by": "usr-admin-01",
        "created_at": datetime(2027, 1, 18, 11, 30, 0, tzinfo=timezone.utc),
    }
]

LOCAL_RENEWAL_EVIDENCE: List[Dict[str, Any]] = [
    {
        "id": "ev-001",
        "renewal_case_id": "case-001",
        "evidence_type": "replacement_fdr_copy",
        "file_name": "SBI_Replacement_FDR_99411.pdf",
        "file_path": "inst-01/renewals/case-001/SBI_Replacement_FDR_99411.pdf",
        "file_size_bytes": 1542000,
        "mime_type": "application/pdf",
        "sha256_checksum": "c83a54b3834160408d6c703b44b94f6e4a2bc9571f541e21b7114e9f75ec582e",
        "description": "Scanned copy of replacement FDR deposit certificate issued by SBI",
        "is_reviewed": True,
        "reviewed_by": "usr-admin-01",
        "reviewed_at": datetime(2027, 1, 18, 11, 0, 0, tzinfo=timezone.utc),
        "review_notes": "Official replacement FDR certificate verified",
        "uploaded_by": "usr-admin-01",
        "created_at": datetime(2027, 1, 16, 10, 15, 0, tzinfo=timezone.utc),
    },
    {
        "id": "ev-002",
        "renewal_case_id": "case-001",
        "evidence_type": "bank_renewal_advice",
        "file_name": "SBI_Renewal_Advice_NHAI_Jan2027.pdf",
        "file_path": "inst-01/renewals/case-001/SBI_Renewal_Advice_NHAI_Jan2027.pdf",
        "file_size_bytes": 845200,
        "mime_type": "application/pdf",
        "sha256_checksum": "a78f4b1192d6e32d1847cbb6859567923c4a2a1b9c8d7e6f5a4b3c2d1e0f9a8b",
        "description": "Official branch letter confirming renewal under lien to NHAI",
        "is_reviewed": True,
        "reviewed_by": "usr-admin-01",
        "reviewed_at": datetime(2027, 1, 18, 11, 15, 0, tzinfo=timezone.utc),
        "review_notes": "Bank branch renewal advice verified with AGM signature",
        "uploaded_by": "usr-admin-01",
        "created_at": datetime(2027, 1, 16, 10, 20, 0, tzinfo=timezone.utc),
    },
]


class RenewalService:
    ALLOWED_MIME_TYPES = ["application/pdf", "image/jpeg", "image/png"]
    MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024  # 10 MB

    def _get_fdr(self, fdr_id: str) -> Optional[Dict[str, Any]]:
        """Helper to find an FDR record across store or Supabase."""
        if supabase_admin.client:
            try:
                res = supabase_admin.client.table("fdrs").select("*").eq("id", fdr_id).execute()
                if res.data and len(res.data) > 0:
                    return res.data[0]
            except Exception as e:
                logger.error(f"Error querying FDR {fdr_id} from Supabase: {e}")
        for f in LOCAL_FDR_STORE:
            if str(f["id"]) == str(fdr_id):
                return f
        return None

    def _check_user_scope(self, current_user: Dict[str, Any], institution_id: str) -> None:
        """Enforces multi-tenant institutional isolation."""
        roles = current_user.get("roles", [])
        if "system_admin" in roles or "bureau_officer" in roles:
            return
        user_inst = current_user.get("institution_id")
        if user_inst and user_inst != institution_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: Cannot access renewal cases belonging to another institution."
            )

    def _detect_cycle(self, parent_id: str, child_id: str) -> bool:
        """
        Detects if adding an edge parent_id -> child_id would create a cycle.
        A cycle is formed if parent_id is reachable from child_id via existing edges.
        """
        if parent_id == child_id:
            return True

        # Build adjacency list from existing edges
        edges = list(LOCAL_FDR_LINEAGE)
        if supabase_admin.client:
            try:
                res = supabase_admin.client.table("fdr_lineage").select("parent_fdr_id, child_fdr_id").execute()
                if res.data:
                    edges = res.data
            except Exception as e:
                logger.error(f"Error fetching lineage edges for cycle check: {e}")

        adj: Dict[str, List[str]] = {}
        for edge in edges:
            p = str(edge["parent_fdr_id"])
            c = str(edge["child_fdr_id"])
            if p not in adj:
                adj[p] = []
            adj[p].append(c)

        # BFS from child_id to see if parent_id is reached
        visited: Set[str] = set()
        queue = [child_id]
        while queue:
            curr = queue.pop(0)
            if curr == parent_id:
                return True
            if curr in visited:
                continue
            visited.add(curr)
            for neighbor in adj.get(curr, []):
                if neighbor not in visited:
                    queue.append(neighbor)
        return False

    def create_renewal_case(
        self,
        original_fdr_id: str,
        payload: RenewalCaseCreateRequest,
        current_user: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Creates a new renewal case in draft state."""
        original_fdr = self._get_fdr(original_fdr_id)
        if not original_fdr:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Original FDR with ID '{original_fdr_id}' not found."
            )

        inst_id = original_fdr["institution_id"]
        self._check_user_scope(current_user, inst_id)

        proposed_fdr = None
        if payload.proposed_replacement_fdr_id:
            if payload.proposed_replacement_fdr_id == original_fdr_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Original FDR cannot be its own proposed replacement."
                )
            proposed_fdr = self._get_fdr(payload.proposed_replacement_fdr_id)
            if not proposed_fdr:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Proposed replacement FDR '{payload.proposed_replacement_fdr_id}' not found."
                )
            # CRITICAL: Cross-institution check
            if proposed_fdr["institution_id"] != inst_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Cross-institution renewal prohibited: replacement FDR belongs to a different institution."
                )

        case_id = f"case-{uuid4().hex[:8]}"
        case_number = f"RC-{datetime.now().year}-{len(LOCAL_RENEWAL_CASES) + 1:04d}"
        now = datetime.now(timezone.utc)

        new_case = {
            "id": case_id,
            "case_number": case_number,
            "institution_id": inst_id,
            "original_fdr_id": original_fdr_id,
            "proposed_replacement_fdr_id": payload.proposed_replacement_fdr_id,
            "status": "draft",
            "submission_notes": payload.submission_notes,
            "submitted_by": current_user.get("id", "usr-admin-01"),
            "submitted_at": None,
            "reviewer_id": None,
            "reviewed_at": None,
            "decision_notes": None,
            "created_at": now,
            "updated_at": now,
        }

        LOCAL_RENEWAL_CASES.append(new_case)
        if supabase_admin.client:
            try:
                supabase_admin.client.table("renewal_cases").insert({
                    "id": new_case["id"],
                    "case_number": new_case["case_number"],
                    "institution_id": new_case["institution_id"],
                    "original_fdr_id": new_case["original_fdr_id"],
                    "proposed_replacement_fdr_id": new_case["proposed_replacement_fdr_id"],
                    "status": new_case["status"],
                    "submission_notes": new_case["submission_notes"],
                    "submitted_by": new_case["submitted_by"],
                    "created_at": new_case["created_at"].isoformat(),
                    "updated_at": new_case["updated_at"].isoformat(),
                }).execute()
            except Exception as e:
                logger.error(f"Error persisting renewal case to Supabase: {e}")

        logger.info(f"Renewal case {case_number} ({case_id}) created for FDR {original_fdr_id}")
        return self.get_renewal_case_by_id(case_id, current_user)

    def get_renewal_cases(
        self,
        current_user: Dict[str, Any],
        status_filter: Optional[str] = None,
        institution_id: Optional[str] = None,
        original_fdr_id: Optional[str] = None,
        search: Optional[str] = None,
        page: int = 1,
        page_size: int = 10
    ) -> Dict[str, Any]:
        """Lists renewal cases with institutional and role-based scoping."""
        roles = current_user.get("roles", [])
        is_admin = "system_admin" in roles or "bureau_officer" in roles
        user_inst = current_user.get("institution_id")

        items = list(LOCAL_RENEWAL_CASES)

        # Scoping
        if not is_admin and user_inst:
            items = [c for c in items if c.get("institution_id") == user_inst]
        elif institution_id:
            items = [c for c in items if c.get("institution_id") == institution_id]

        if status_filter:
            items = [c for c in items if c.get("status") == status_filter]

        if original_fdr_id:
            items = [c for c in items if c.get("original_fdr_id") == original_fdr_id]

        if search:
            s = search.lower()
            filtered = []
            for c in items:
                orig = self._get_fdr(c["original_fdr_id"])
                fdr_num = orig.get("fdr_number", "").lower() if orig else ""
                case_num = c.get("case_number", "").lower()
                notes = (c.get("submission_notes") or "").lower()
                if s in case_num or s in fdr_num or s in notes:
                    filtered.append(c)
            items = filtered

        # Sort descending by created_at
        items.sort(key=lambda x: x.get("created_at") or datetime.min.replace(tzinfo=timezone.utc), reverse=True)

        total = len(items)
        paginated = items[(page - 1) * page_size : page * page_size]

        enriched = [self._enrich_case(c) for c in paginated]

        return {
            "items": enriched,
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": (total + page_size - 1) // page_size if total > 0 else 1
        }

    def _enrich_case(self, case: Dict[str, Any]) -> Dict[str, Any]:
        """Enriches case record with FDR details and evidence count."""
        c = dict(case)
        orig = self._get_fdr(c["original_fdr_id"])
        c["original_fdr"] = orig
        if c.get("proposed_replacement_fdr_id"):
            c["proposed_replacement_fdr"] = self._get_fdr(c["proposed_replacement_fdr_id"])
        else:
            c["proposed_replacement_fdr"] = None

        evidence_list = [e for e in LOCAL_RENEWAL_EVIDENCE if e.get("renewal_case_id") == c["id"]]
        c["evidence"] = evidence_list
        return c

    def get_renewal_case_by_id(self, case_id: str, current_user: Dict[str, Any]) -> Dict[str, Any]:
        """Retrieves a single renewal case by ID with full enrichment and authorization."""
        case = None
        for c in LOCAL_RENEWAL_CASES:
            if str(c["id"]) == str(case_id):
                case = c
                break

        if not case and supabase_admin.client:
            try:
                res = supabase_admin.client.table("renewal_cases").select("*").eq("id", case_id).execute()
                if res.data and len(res.data) > 0:
                    case = res.data[0]
            except Exception as e:
                logger.error(f"Error fetching renewal case {case_id} from Supabase: {e}")

        if not case:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Renewal case '{case_id}' not found."
            )

        self._check_user_scope(current_user, case["institution_id"])
        enriched = self._enrich_case(case)

        # Calculate advisory match score if proposed replacement is present
        if enriched.get("proposed_replacement_fdr") and enriched.get("original_fdr"):
            match_res = candidate_matching_service.find_candidates(
                enriched["original_fdr"],
                [enriched["proposed_replacement_fdr"]]
            )
            if match_res.candidates:
                top_cand = match_res.candidates[0]
                if isinstance(top_cand, dict):
                    enriched["matching_score"] = top_cand.get("score", top_cand.get("match_score", 0.0))
                    enriched["matching_analysis"] = top_cand
                else:
                    enriched["matching_score"] = getattr(top_cand, "score", getattr(top_cand, "match_score", 0.0))
                    enriched["matching_analysis"] = top_cand.dict() if hasattr(top_cand, "dict") else dict(top_cand)

        return enriched

    def update_renewal_case(
        self,
        case_id: str,
        payload: RenewalCaseUpdateRequest,
        current_user: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Edits a draft renewal case. Changes forbidden once submitted or decided."""
        case = self.get_renewal_case_by_id(case_id, current_user)
        if case["status"] != "draft":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot edit case in status '{case['status']}'. Edits are only permitted on draft cases."
            )

        inst_id = case["institution_id"]

        for c in LOCAL_RENEWAL_CASES:
            if str(c["id"]) == str(case_id):
                if payload.proposed_replacement_fdr_id is not None:
                    if payload.proposed_replacement_fdr_id == case["original_fdr_id"]:
                        raise HTTPException(
                            status_code=status.HTTP_400_BAD_REQUEST,
                            detail="Original FDR cannot be its own proposed replacement."
                        )
                    rep = self._get_fdr(payload.proposed_replacement_fdr_id)
                    if not rep:
                        raise HTTPException(
                            status_code=status.HTTP_404_NOT_FOUND,
                            detail=f"Proposed replacement FDR '{payload.proposed_replacement_fdr_id}' not found."
                        )
                    if rep["institution_id"] != inst_id:
                        raise HTTPException(
                            status_code=status.HTTP_400_BAD_REQUEST,
                            detail="Cross-institution renewal prohibited: replacement FDR belongs to a different institution."
                        )
                    c["proposed_replacement_fdr_id"] = payload.proposed_replacement_fdr_id

                if payload.submission_notes is not None:
                    c["submission_notes"] = payload.submission_notes

                c["updated_at"] = datetime.now(timezone.utc)
                return self.get_renewal_case_by_id(case_id, current_user)

        raise HTTPException(status_code=404, detail="Renewal case not found.")

    def submit_renewal_case(
        self,
        case_id: str,
        payload: RenewalCaseSubmitRequest,
        current_user: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Submits a draft case for supervisory review."""
        case = self.get_renewal_case_by_id(case_id, current_user)
        if case["status"] != "draft":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Only cases in 'draft' status can be submitted. Current status: '{case['status']}'."
            )

        proposed_id = payload.proposed_replacement_fdr_id or case.get("proposed_replacement_fdr_id")
        if not proposed_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A proposed replacement FDR must be selected before submitting the renewal case."
            )

        if proposed_id == case["original_fdr_id"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Original FDR cannot be its own replacement."
            )

        rep = self._get_fdr(proposed_id)
        if not rep:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Proposed replacement FDR '{proposed_id}' not found."
            )

        if rep["institution_id"] != case["institution_id"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cross-institution renewal prohibited: replacement FDR belongs to a different institution."
            )

        for c in LOCAL_RENEWAL_CASES:
            if str(c["id"]) == str(case_id):
                c["proposed_replacement_fdr_id"] = proposed_id
                c["status"] = "under_review"
                c["submitted_at"] = datetime.now(timezone.utc)
                c["submitted_by"] = current_user.get("id", "usr-admin-01")
                if payload.submission_notes:
                    c["submission_notes"] = payload.submission_notes
                c["updated_at"] = datetime.now(timezone.utc)
                logger.info(f"Renewal case {c['case_number']} submitted for review.")
                return self.get_renewal_case_by_id(case_id, current_user)

        raise HTTPException(status_code=404, detail="Renewal case not found.")

    def run_matching_for_case(
        self,
        case_id: str,
        current_user: Dict[str, Any],
        custom_candidate_id: Optional[str] = None
    ) -> MatchingResultResponse:
        """
        Runs the 6-signal candidate matching matrix.
        IMPORTANT: This is strictly advisory. Never mutates status or creates links.
        """
        case = self.get_renewal_case_by_id(case_id, current_user)
        original_fdr = case.get("original_fdr")
        if not original_fdr:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Original FDR not found for this case."
            )

        candidates_pool = []
        if custom_candidate_id:
            cand = self._get_fdr(custom_candidate_id)
            if cand:
                candidates_pool.append(cand)
        else:
            # Query candidate pool: FDRs from the same institution, not the original FDR
            inst_id = original_fdr["institution_id"]
            for f in LOCAL_FDR_STORE:
                if f["institution_id"] == inst_id and f["id"] != original_fdr["id"]:
                    candidates_pool.append(f)

        return candidate_matching_service.find_candidates(original_fdr, candidates_pool)

    def attach_evidence(
        self,
        case_id: str,
        evidence_type: str,
        file: UploadFile,
        description: Optional[str],
        current_user: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Uploads and registers an evidence file for a renewal case."""
        case = self.get_renewal_case_by_id(case_id, current_user)
        if case["status"] in ["approved", "rejected"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot attach evidence to a decided renewal case (status: {case['status']})."
            )

        if file.content_type not in self.ALLOWED_MIME_TYPES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unsupported file MIME type '{file.content_type}'. Allowed types: PDF, JPEG, PNG."
            )

        contents = file.file.read()
        file_size = len(contents)
        if file_size > self.MAX_FILE_SIZE_BYTES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File exceeds maximum allowed size of 10 MB ({file_size} bytes)."
            )

        checksum = hashlib.sha256(contents).hexdigest()
        evidence_id = f"ev-{uuid4().hex[:8]}"
        now = datetime.now(timezone.utc)
        safe_filename = file.filename or "evidence.pdf"
        storage_path = f"{case['institution_id']}/renewals/{case_id}/{evidence_id}_{safe_filename}"

        new_evidence = {
            "id": evidence_id,
            "renewal_case_id": case_id,
            "evidence_type": evidence_type,
            "file_name": safe_filename,
            "file_path": storage_path,
            "file_size_bytes": file_size,
            "mime_type": file.content_type or "application/pdf",
            "sha256_checksum": checksum,
            "description": description or f"Uploaded {evidence_type.replace('_', ' ').title()}",
            "is_reviewed": False,
            "reviewed_by": None,
            "reviewed_at": None,
            "review_notes": None,
            "uploaded_by": current_user.get("id", "usr-admin-01"),
            "created_at": now,
        }

        LOCAL_RENEWAL_EVIDENCE.append(new_evidence)
        logger.info(f"Evidence {evidence_id} attached to renewal case {case_id}")
        return new_evidence

    def approve_renewal_case(
        self,
        case_id: str,
        payload: RenewalApprovalRequest,
        current_user: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Executes an atomic approval transaction for a renewal case.
        Validates roles, scopes, bank verification, evidence, and lineage cycle integrity.
        Transitions original FDR to 'renewed' and establishes directed lineage link.
        """
        roles = current_user.get("roles", [])
        authorized_approver_roles = ["system_admin", "bureau_officer", "regional_officer"]
        if not any(r in authorized_approver_roles for r in roles):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Unauthorized: Renewal approval requires Bureau Officer, Regional Officer, or Admin privileges."
            )

        case = self.get_renewal_case_by_id(case_id, current_user)

        # Prevent duplicate approval
        if case["status"] == "approved":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Duplicate approval prohibited: Case is already approved."
            )

        if case["status"] == "rejected":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid transition: Cannot approve a rejected case."
            )

        orig_id = case["original_fdr_id"]
        rep_id = case.get("proposed_replacement_fdr_id")
        if not rep_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot approve renewal case without a designated replacement FDR."
            )

        orig_fdr = self._get_fdr(orig_id)
        rep_fdr = self._get_fdr(rep_id)

        if not orig_fdr:
            raise HTTPException(status_code=404, detail="Original FDR not found.")
        if not rep_fdr:
            raise HTTPException(status_code=404, detail="Replacement FDR not found.")

        # Same institution check
        if orig_fdr["institution_id"] != rep_fdr["institution_id"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cross-institution renewal prohibited: Both FDRs must belong to the same institution."
            )

        # Self-link check
        if orig_id == rep_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Self-link prohibited: An FDR cannot be renewed by itself."
            )

        # Bank verification requirement on replacement FDR (Independent trust tier)
        # Trust Tier >= 2 or verified status is required
        rep_tier = rep_fdr.get("trust_tier", 1)
        rep_verif_status = rep_fdr.get("verification_status", "institution_declared")
        if rep_tier < 2 and rep_verif_status not in ["bank_confirmed", "api_verified"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Bank verification required: Replacement FDR must be independently verified by the bank (Trust Tier >= 2) before renewal approval."
            )

        # Evidence review check
        case_evidences = [e for e in LOCAL_RENEWAL_EVIDENCE if e.get("renewal_case_id") == case_id]
        if not case_evidences:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Supporting evidence required: At least one renewal document must be attached prior to approval."
            )

        # Check for conflicting predecessor (unique child_fdr_id)
        for link in LOCAL_FDR_LINEAGE:
            if str(link["child_fdr_id"]) == str(rep_id):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Conflicting predecessor: Replacement FDR '{rep_id}' is already linked to another predecessor in lineage."
                )

        # Cycle prevention check
        if self._detect_cycle(orig_id, rep_id):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Lineage cycle detected: Linking {orig_id} -> {rep_id} would create a circular dependency in FDR lineage graph."
            )

        # --- Atomic Transaction ---
        now = datetime.now(timezone.utc)
        reviewer_id = current_user.get("id", "usr-admin-01")

        # 1. Update Case
        for c in LOCAL_RENEWAL_CASES:
            if str(c["id"]) == str(case_id):
                c["status"] = "approved"
                c["reviewer_id"] = reviewer_id
                c["reviewed_at"] = now
                c["decision_notes"] = payload.decision_notes
                c["updated_at"] = now

        # 2. Insert Lineage Edge
        lineage_id = f"lineage-{uuid4().hex[:8]}"
        lineage_record = {
            "id": lineage_id,
            "parent_fdr_id": orig_id,
            "child_fdr_id": rep_id,
            "renewal_case_id": case_id,
            "relationship_type": payload.relationship_type,
            "created_by": reviewer_id,
            "created_at": now,
        }
        LOCAL_FDR_LINEAGE.append(lineage_record)

        # 3. Transition Original FDR Status
        orig_fdr["lifecycle_status"] = "renewed"
        orig_fdr["updated_at"] = now

        # 4. Audit events
        orig_events = orig_fdr.setdefault("events", [])
        orig_events.append({
            "id": f"evt-{uuid4().hex[:8]}",
            "fdr_id": orig_id,
            "institution_id": orig_fdr["institution_id"],
            "actor_id": reviewer_id,
            "actor_name": current_user.get("name", "Approving Officer"),
            "actor_email": current_user.get("email", "officer@fdrchain.gov.in"),
            "event_type": "fdr_renewed",
            "description": f"FDR marked as renewed. Successor established: {rep_fdr.get('fdr_number', rep_id)} via Case {case['case_number']}.",
            "metadata": {"replacement_fdr_id": rep_id, "case_id": case_id},
            "created_at": now,
        })

        rep_events = rep_fdr.setdefault("events", [])
        rep_events.append({
            "id": f"evt-{uuid4().hex[:8]}",
            "fdr_id": rep_id,
            "institution_id": rep_fdr["institution_id"],
            "actor_id": reviewer_id,
            "actor_name": current_user.get("name", "Approving Officer"),
            "actor_email": current_user.get("email", "officer@fdrchain.gov.in"),
            "event_type": "lineage_established",
            "description": f"Predecessor link confirmed: {orig_fdr.get('fdr_number', orig_id)} via Case {case['case_number']}.",
            "metadata": {"predecessor_fdr_id": orig_id, "case_id": case_id},
            "created_at": now,
        })

        logger.info(f"Renewal case {case['case_number']} approved. Lineage link {orig_id} -> {rep_id} established.")

        return {
            "success": True,
            "case_id": case_id,
            "case_number": case["case_number"],
            "status": "approved",
            "lineage_id": lineage_id,
            "parent_fdr_id": orig_id,
            "child_fdr_id": rep_id,
            "message": "Renewal case approved and lineage relationship atomically committed."
        }

    def reject_renewal_case(
        self,
        case_id: str,
        payload: RenewalRejectionRequest,
        current_user: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Rejects a renewal case with mandatory rejection reason."""
        roles = current_user.get("roles", [])
        authorized_approver_roles = ["system_admin", "bureau_officer", "regional_officer"]
        if not any(r in authorized_approver_roles for r in roles):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Unauthorized: Renewal rejection requires Bureau Officer, Regional Officer, or Admin privileges."
            )

        case = self.get_renewal_case_by_id(case_id, current_user)
        if case["status"] in ["approved", "rejected"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot reject case in final status '{case['status']}'."
            )

        now = datetime.now(timezone.utc)
        reviewer_id = current_user.get("id", "usr-admin-01")

        for c in LOCAL_RENEWAL_CASES:
            if str(c["id"]) == str(case_id):
                c["status"] = "rejected"
                c["reviewer_id"] = reviewer_id
                c["reviewed_at"] = now
                c["decision_notes"] = f"REJECTED: {payload.rejection_reason}"
                c["updated_at"] = now
                logger.info(f"Renewal case {c['case_number']} rejected by {reviewer_id}")
                return self.get_renewal_case_by_id(case_id, current_user)

        raise HTTPException(status_code=404, detail="Renewal case not found.")

    def get_fdr_lineage(self, fdr_id: str, current_user: Dict[str, Any]) -> Dict[str, Any]:
        """
        Retrieves the complete ancestor and descendant graph for an FDR record.
        Computes generation levels, identifies root, and handles isolated/chain cases.
        """
        center_fdr = self._get_fdr(fdr_id)
        if not center_fdr:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"FDR record with ID '{fdr_id}' not found."
            )

        self._check_user_scope(current_user, center_fdr["institution_id"])

        # Collect all connected edges using bidirectional graph traversal
        all_edges = list(LOCAL_FDR_LINEAGE)
        if supabase_admin.client:
            try:
                res = supabase_admin.client.table("fdr_lineage").select("*").execute()
                if res.data:
                    all_edges = res.data
            except Exception as e:
                logger.error(f"Error reading lineage from Supabase: {e}")

        # Parent -> Children and Child -> Parents maps
        parent_map: Dict[str, List[Dict[str, Any]]] = {}
        child_map: Dict[str, List[Dict[str, Any]]] = {}
        for edge in all_edges:
            p = str(edge["parent_fdr_id"])
            c = str(edge["child_fdr_id"])
            parent_map.setdefault(p, []).append(edge)
            child_map.setdefault(c, []).append(edge)

        # Collect all reachable node IDs (both upwards towards root and downwards towards leaf)
        connected_node_ids: Set[str] = {fdr_id}

        # Upwards (ancestors)
        queue = [fdr_id]
        while queue:
            curr = queue.pop(0)
            for edge in child_map.get(curr, []):
                p = str(edge["parent_fdr_id"])
                if p not in connected_node_ids:
                    connected_node_ids.add(p)
                    queue.append(p)

        # Downwards (descendants)
        queue = [fdr_id]
        while queue:
            curr = queue.pop(0)
            for edge in parent_map.get(curr, []):
                c = str(edge["child_fdr_id"])
                if c not in connected_node_ids:
                    connected_node_ids.add(c)
                    queue.append(c)

        # Relevant edges are those between connected nodes
        relevant_edges = [
            e for e in all_edges
            if str(e["parent_fdr_id"]) in connected_node_ids and str(e["child_fdr_id"]) in connected_node_ids
        ]

        # Find the root node (node in connected_node_ids with no incoming edges)
        nodes_with_parents = {str(e["child_fdr_id"]) for e in relevant_edges}
        root_candidates = [n for n in connected_node_ids if n not in nodes_with_parents]
        root_id = root_candidates[0] if root_candidates else fdr_id

        # Calculate generation levels from root using BFS
        gen_levels: Dict[str, int] = {root_id: 0}
        q = [root_id]
        while q:
            curr = q.pop(0)
            curr_level = gen_levels.get(curr, 0)
            for edge in parent_map.get(curr, []):
                child = str(edge["child_fdr_id"])
                if child in connected_node_ids and child not in gen_levels:
                    gen_levels[child] = curr_level + 1
                    q.append(child)

        # Construct FDRLineageNode list
        nodes = []
        for nid in sorted(connected_node_ids, key=lambda x: gen_levels.get(x, 0)):
            f_data = self._get_fdr(nid)
            if not f_data:
                continue
            nodes.append({
                "fdr_id": str(f_data["id"]),
                "fdr_number": f_data.get("fdr_number", ""),
                "institution_id": f_data.get("institution_id", ""),
                "institution_name": f_data.get("institution_name", ""),
                "bank_id": f_data.get("bank_id", ""),
                "bank_name": f_data.get("bank_name", ""),
                "branch_name": f_data.get("branch_name", ""),
                "amount": f_data.get("amount", Decimal("0.00")),
                "currency": f_data.get("currency", "INR"),
                "issue_date": f_data.get("issue_date"),
                "maturity_date": f_data.get("maturity_date"),
                "lifecycle_status": f_data.get("lifecycle_status", "active"),
                "trust_tier": f_data.get("trust_tier", 1),
                "verification_status": f_data.get("verification_status", "institution_declared"),
                "heartbeat_status": f_data.get("heartbeat_status", "healthy"),
                "generation_level": gen_levels.get(nid, 0),
                "is_current": str(nid) == str(fdr_id),
            })

        # Construct FDRLineageEdge list
        edges = []
        for e in relevant_edges:
            edges.append({
                "id": str(e["id"]),
                "parent_fdr_id": str(e["parent_fdr_id"]),
                "child_fdr_id": str(e["child_fdr_id"]),
                "renewal_case_id": str(e.get("renewal_case_id", "")),
                "relationship_type": e.get("relationship_type", "renewal"),
                "created_at": e.get("created_at"),
            })

        is_leaf = len(parent_map.get(fdr_id, [])) == 0
        has_cycles = False

        return {
            "root_fdr_id": root_id,
            "center_fdr_id": fdr_id,
            "total_nodes": len(nodes),
            "total_edges": len(edges),
            "nodes": nodes,
            "edges": edges,
            "has_cycles": has_cycles,
            "is_leaf": is_leaf,
        }

    def get_dashboard_stats(self, current_user: Dict[str, Any]) -> Dict[str, Any]:
        """Calculates dashboard metrics across renewal cases and upcoming maturities."""
        roles = current_user.get("roles", [])
        is_admin = "system_admin" in roles or "bureau_officer" in roles
        user_inst = current_user.get("institution_id")

        cases = list(LOCAL_RENEWAL_CASES)
        if not is_admin and user_inst:
            cases = [c for c in cases if c.get("institution_id") == user_inst]

        total_cases = len(cases)
        draft_cases = len([c for c in cases if c.get("status") == "draft"])
        submitted_cases = len([c for c in cases if c.get("status") == "submitted"])
        awaiting_bank_confirmation = len([c for c in cases if c.get("status") == "awaiting_bank_confirmation"])
        under_review_cases = len([c for c in cases if c.get("status") == "under_review"])
        approved_cases = len([c for c in cases if c.get("status") == "approved"])
        rejected_cases = len([c for c in cases if c.get("status") == "rejected"])

        # Upcoming maturities within 30 days
        today = date.today()
        upcoming_threshold = today + timedelta(days=30)
        fdrs = list(LOCAL_FDR_STORE)
        if not is_admin and user_inst:
            fdrs = [f for f in fdrs if f.get("institution_id") == user_inst]

        upcoming_maturities = 0
        for f in fdrs:
            mat = f.get("maturity_date")
            if isinstance(mat, str):
                try:
                    mat = date.fromisoformat(mat)
                except Exception:
                    continue
            if mat and today <= mat <= upcoming_threshold and f.get("lifecycle_status") not in ["closed", "renewed"]:
                upcoming_maturities += 1

        recent = sorted(cases, key=lambda x: x.get("created_at") or datetime.min.replace(tzinfo=timezone.utc), reverse=True)[:5]
        enriched_recent = [self._enrich_case(c) for c in recent]

        return {
            "total_cases": total_cases,
            "draft_cases": draft_cases,
            "submitted_cases": submitted_cases,
            "awaiting_bank_confirmation": awaiting_bank_confirmation,
            "under_review_cases": under_review_cases,
            "approved_cases": approved_cases,
            "rejected_cases": rejected_cases,
            "upcoming_maturities_30d": upcoming_maturities,
            "pending_officer_review": under_review_cases + submitted_cases,
            "recent_cases": enriched_recent,
        }


renewal_service = RenewalService()
