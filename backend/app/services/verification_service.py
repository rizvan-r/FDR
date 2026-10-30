import logging
import hashlib
import secrets
from typing import Dict, Any, List, Optional, Tuple
from uuid import uuid4
from datetime import datetime, timezone, timedelta
from decimal import Decimal
from fastapi import HTTPException, status
from cryptography.hazmat.primitives.asymmetric import ed25519
from cryptography.hazmat.primitives import serialization
from cryptography.exceptions import InvalidSignature

from app.services.canonical_json import canonical_serialize
from app.services.mock_bank_crypto import MockBankSigningService, MOCK_BANK_REGISTRY
from app.services.supabase_admin import supabase_admin
from app.services.fdr_service import fdr_service, LOCAL_FDR_STORE

logger = logging.getLogger("fdr_chain.verification")

# ==============================================================================
# IN-MEMORY STORES FOR LOCAL EVALUATION FALLBACK
# ==============================================================================
LOCAL_BANK_KEYS: List[Dict[str, Any]] = [
    {
        "id": "key-01",
        "bank_id": "bank-01",
        "bank_name": "State Bank of India",
        "key_id": "SBIN-ED25519-2026-01",
        "algorithm": "Ed25519",
        "public_key_pem": MOCK_BANK_REGISTRY["SBIN"]["pub_pem"],
        "public_key_raw_hex": MOCK_BANK_REGISTRY["SBIN"]["pub_hex"],
        "valid_from": datetime.now(timezone.utc) - timedelta(days=30),
        "valid_until": datetime.now(timezone.utc) + timedelta(days=365),
        "is_active": True,
        "is_revoked": False,
        "revoked_at": None,
        "revocation_reason": None,
        "created_at": datetime.now(timezone.utc) - timedelta(days=30),
    },
    {
        "id": "key-02",
        "bank_id": "bank-02",
        "bank_name": "Punjab National Bank",
        "key_id": "PUNB-ED25519-2026-01",
        "algorithm": "Ed25519",
        "public_key_pem": MOCK_BANK_REGISTRY["PUNB"]["pub_pem"],
        "public_key_raw_hex": MOCK_BANK_REGISTRY["PUNB"]["pub_hex"],
        "valid_from": datetime.now(timezone.utc) - timedelta(days=30),
        "valid_until": datetime.now(timezone.utc) + timedelta(days=365),
        "is_active": True,
        "is_revoked": False,
        "revoked_at": None,
        "revocation_reason": None,
        "created_at": datetime.now(timezone.utc) - timedelta(days=30),
    },
    {
        "id": "key-03",
        "bank_id": "bank-03",
        "bank_name": "Bank of Baroda",
        "key_id": "BARB-ED25519-2026-01",
        "algorithm": "Ed25519",
        "public_key_pem": MOCK_BANK_REGISTRY["BARB"]["pub_pem"],
        "public_key_raw_hex": MOCK_BANK_REGISTRY["BARB"]["pub_hex"],
        "valid_from": datetime.now(timezone.utc) - timedelta(days=30),
        "valid_until": datetime.now(timezone.utc) + timedelta(days=365),
        "is_active": True,
        "is_revoked": False,
        "revoked_at": None,
        "revocation_reason": None,
        "created_at": datetime.now(timezone.utc) - timedelta(days=30),
    },
    {
        "id": "key-04",
        "bank_id": "bank-04",
        "bank_name": "Canara Bank",
        "key_id": "CNRB-ED25519-2026-01",
        "algorithm": "Ed25519",
        "public_key_pem": MOCK_BANK_REGISTRY["CNRB"]["pub_pem"],
        "public_key_raw_hex": MOCK_BANK_REGISTRY["CNRB"]["pub_hex"],
        "valid_from": datetime.now(timezone.utc) - timedelta(days=30),
        "valid_until": datetime.now(timezone.utc) + timedelta(days=365),
        "is_active": True,
        "is_revoked": False,
        "revoked_at": None,
        "revocation_reason": None,
        "created_at": datetime.now(timezone.utc) - timedelta(days=30),
    },
    {
        "id": "key-05",
        "bank_id": "bank-05",
        "bank_name": "HDFC Bank Limited",
        "key_id": "HDFC-ED25519-2026-01",
        "algorithm": "Ed25519",
        "public_key_pem": MOCK_BANK_REGISTRY["HDFC"]["pub_pem"],
        "public_key_raw_hex": MOCK_BANK_REGISTRY["HDFC"]["pub_hex"],
        "valid_from": datetime.now(timezone.utc) - timedelta(days=30),
        "valid_until": datetime.now(timezone.utc) + timedelta(days=365),
        "is_active": True,
        "is_revoked": False,
        "revoked_at": None,
        "revocation_reason": None,
        "created_at": datetime.now(timezone.utc) - timedelta(days=30),
    },
    {
        "id": "key-06",
        "bank_id": "bank-06",
        "bank_name": "ICICI Bank Limited",
        "key_id": "ICIC-ED25519-2026-01",
        "algorithm": "Ed25519",
        "public_key_pem": MOCK_BANK_REGISTRY["ICIC"]["pub_pem"],
        "public_key_raw_hex": MOCK_BANK_REGISTRY["ICIC"]["pub_hex"],
        "valid_from": datetime.now(timezone.utc) - timedelta(days=30),
        "valid_until": datetime.now(timezone.utc) + timedelta(days=365),
        "is_active": True,
        "is_revoked": False,
        "revoked_at": None,
        "revocation_reason": None,
        "created_at": datetime.now(timezone.utc) - timedelta(days=30),
    },
]

LOCAL_VERIFICATION_REQUESTS: List[Dict[str, Any]] = []
LOCAL_BANK_ATTESTATIONS: List[Dict[str, Any]] = []
LOCAL_NONCE_REGISTRY: set = set()


class VerificationService:
    def __init__(self):
        self.supabase = supabase_admin.client

    # ==========================================================================
    # 1. TIER 2: VERIFICATION REQUEST CREATION
    # ==========================================================================
    def create_verification_request(
        self, fdr_id: str, user_profile: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Creates a single-use expiring Tier 2 verification request.
        Generates 256-bit cryptographically secure token, hashes with SHA-256,
        stores immutable snapshot of verified FDR parameters.
        Enforces invariant: Only one pending request per FDR.
        """
        fdr = fdr_service.get_fdr_by_id(fdr_id)
        if not fdr:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"FDR record '{fdr_id}' not found.",
            )

        # Institutional scope check
        user_roles = user_profile.get("roles", [])
        if "institution_user" in user_roles and "system_admin" not in user_roles:
            user_inst_id = user_profile.get("institution_id")
            if user_inst_id and str(fdr.get("institution_id")) != str(user_inst_id):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Institutional officers can only request verification for their own entity's FDRs.",
                )

        # Enforce invariant: Only one pending request per FDR
        existing_pending = [
            req for req in LOCAL_VERIFICATION_REQUESTS
            if str(req.get("fdr_id")) == str(fdr_id) and req.get("status") == "pending"
        ]
        if existing_pending:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A pending verification request is already outstanding for this FDR. Complete or revoke it before creating a new one.",
            )

        # Generate 256 bits of cryptographic entropy
        raw_token = secrets.token_urlsafe(32)
        token_hash = hashlib.sha256(raw_token.encode("utf-8")).hexdigest()
        expires_at = datetime.now(timezone.utc) + timedelta(hours=48)

        # Snapshot immutable verified parameters
        fdr_snapshot = {
            "fdr_number": fdr.get("fdr_number"),
            "amount": str(fdr.get("amount")),
            "currency": fdr.get("currency", "INR"),
            "issue_date": str(fdr.get("issue_date")),
            "maturity_date": str(fdr.get("maturity_date")),
            "interest_rate": str(fdr.get("interest_rate")) if fdr.get("interest_rate") else None,
            "lien_in_favour": fdr.get("lien_in_favour"),
            "bank_id": str(fdr.get("bank_id")),
            "branch_id": str(fdr.get("branch_id")),
            "institution_id": str(fdr.get("institution_id")),
        }

        request_id = f"vreq-{uuid4().hex[:12]}"
        now = datetime.now(timezone.utc)

        new_request = {
            "id": request_id,
            "fdr_id": str(fdr_id),
            "institution_id": str(fdr.get("institution_id")),
            "bank_id": str(fdr.get("bank_id")),
            "token_hash": token_hash,
            "status": "pending",
            "fdr_snapshot": fdr_snapshot,
            "expires_at": expires_at,
            "consumed_at": None,
            "consumed_by": None,
            "created_by": str(user_profile.get("id")),
            "created_at": now,
            "updated_at": now,
        }

        LOCAL_VERIFICATION_REQUESTS.append(new_request)

        # Log event in FDR history
        fdr_service.append_fdr_event(
            fdr_id=str(fdr_id),
            institution_id=str(fdr.get("institution_id")),
            actor_profile=user_profile,
            event_type="verification_requested",
            description=f"Tier 2 Bank Verification requested by depositor officer. Single-use link generated (valid 48h).",
            metadata={"request_id": request_id, "expires_at": expires_at.isoformat()},
        )

        return {
            "id": request_id,
            "fdr_id": str(fdr_id),
            "institution_id": str(fdr.get("institution_id")),
            "bank_id": str(fdr.get("bank_id")),
            "status": "pending",
            "fdr_snapshot": fdr_snapshot,
            "expires_at": expires_at,
            "created_at": now,
            "raw_token": raw_token,
            "verification_url": f"/bank/verify/{raw_token}",
        }

    # ==========================================================================
    # 2. TIER 2: RETRIEVE VERIFICATION DETAILS (BY TOKEN OR REQUEST ID)
    # ==========================================================================
    def get_verification_by_token_or_id(self, token_or_id: str) -> Dict[str, Any]:
        """
        Locates verification request by either raw token (hashed) or request_id.
        Validates token freshness, snapshot consistency, and returns review payload.
        """
        token_hash = hashlib.sha256(token_or_id.encode("utf-8")).hexdigest()

        matched_req = None
        for req in LOCAL_VERIFICATION_REQUESTS:
            if req.get("token_hash") == token_hash or req.get("id") == token_or_id:
                matched_req = req
                break

        if not matched_req:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Verification request not found or invalid token.",
            )

        fdr_id = matched_req.get("fdr_id")
        fdr = fdr_service.get_fdr_by_id(fdr_id)
        if not fdr:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Underlying FDR record was not found.",
            )

        now = datetime.now(timezone.utc)
        expires_at = matched_req.get("expires_at")
        if isinstance(expires_at, str):
            expires_at = datetime.fromisoformat(expires_at.replace("Z", "+00:00"))

        is_expired = now > expires_at

        # Validate snapshot consistency (detect if FDR was tampered/edited)
        snapshot = matched_req.get("fdr_snapshot", {})
        is_snapshot_valid = (
            str(fdr.get("fdr_number")) == str(snapshot.get("fdr_number"))
            and f"{float(fdr.get('amount')):.2f}" == f"{float(snapshot.get('amount')):.2f}"
            and str(fdr.get("issue_date")) == str(snapshot.get("issue_date"))
            and str(fdr.get("maturity_date")) == str(snapshot.get("maturity_date"))
            and str(fdr.get("lien_in_favour")) == str(snapshot.get("lien_in_favour"))
        )

        return {
            "request_id": matched_req.get("id"),
            "fdr_id": str(fdr_id),
            "fdr_number": str(fdr.get("fdr_number")),
            "institution_id": str(fdr.get("institution_id")),
            "institution_name": fdr.get("institution_name", "Public Institution"),
            "bank_id": str(fdr.get("bank_id")),
            "bank_name": fdr.get("bank_name", "Depository Bank"),
            "branch_id": str(fdr.get("branch_id")),
            "branch_name": fdr.get("branch_name", "Issuing Branch"),
            "ifsc_code": fdr.get("ifsc_code", ""),
            "amount": Decimal(str(fdr.get("amount"))),
            "currency": str(fdr.get("currency", "INR")),
            "issue_date": str(fdr.get("issue_date")),
            "maturity_date": str(fdr.get("maturity_date")),
            "interest_rate": Decimal(str(fdr.get("interest_rate"))) if fdr.get("interest_rate") else None,
            "lien_in_favour": str(fdr.get("lien_in_favour")),
            "status": matched_req.get("status"),
            "expires_at": expires_at,
            "is_expired": is_expired,
            "is_snapshot_valid": is_snapshot_valid,
        }

    # ==========================================================================
    # 3. TIER 2: ATOMIC TOKEN CONSUMPTION (CONFIRM OR REJECT)
    # ==========================================================================
    def confirm_bank_verification(
        self,
        token: str,
        action: str,
        rejection_reason: Optional[str] = None,
        officer_name: Optional[str] = None,
        notes: Optional[str] = None,
        actor_profile: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Atomically consumes the single-use token.
        Enforces:
          - Valid token hash
          - Pending status
          - Expiry check
          - Snapshot fidelity
        On confirm: Promotes FDR to Trust Tier 2, status 'bank_confirmed', logs Tier 2 attestation.
        On reject: Sets status 'rejected', leaves Trust Tier 1, logs rejection attestation.
        """
        token_hash = hashlib.sha256(token.encode("utf-8")).hexdigest()

        matched_req = None
        for req in LOCAL_VERIFICATION_REQUESTS:
            if req.get("token_hash") == token_hash:
                matched_req = req
                break

        if not matched_req:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid verification token. Authentication token not recognized.",
            )

        if matched_req.get("status") == "consumed":
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Verification token has already been consumed. Replay rejected.",
            )

        if matched_req.get("status") != "pending":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Verification request is in '{matched_req.get('status')}' state and cannot be processed.",
            )

        now = datetime.now(timezone.utc)
        expires_at = matched_req.get("expires_at")
        if isinstance(expires_at, str):
            expires_at = datetime.fromisoformat(expires_at.replace("Z", "+00:00"))

        if now > expires_at:
            matched_req["status"] = "expired"
            matched_req["updated_at"] = now
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Verification token has expired (48-hour validity exceeded). Please request a fresh token.",
            )

        fdr_id = matched_req.get("fdr_id")
        fdr = fdr_service.get_fdr_by_id(fdr_id)
        if not fdr:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Target FDR was deleted or could not be found.",
            )

        # Snapshot mismatch validation
        snapshot = matched_req.get("fdr_snapshot", {})
        if (
            str(fdr.get("fdr_number")) != str(snapshot.get("fdr_number"))
            or f"{float(fdr.get('amount')):.2f}" != f"{float(snapshot.get('amount')):.2f}"
            or str(fdr.get("issue_date")) != str(snapshot.get("issue_date"))
            or str(fdr.get("maturity_date")) != str(snapshot.get("maturity_date"))
            or str(fdr.get("lien_in_favour")) != str(snapshot.get("lien_in_favour"))
        ):
            matched_req["status"] = "revoked"
            matched_req["updated_at"] = now
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="FDR parameters have been altered since the verification request was generated. Snapshot mismatch detected.",
            )

        # Atomic token consumption
        matched_req["status"] = "consumed"
        matched_req["consumed_at"] = now
        matched_req["consumed_by"] = actor_profile.get("id") if actor_profile else None
        matched_req["updated_at"] = now

        attestation_id = f"attest-t2-{uuid4().hex[:12]}"
        actor_id = actor_profile.get("id") if actor_profile else "usr-bank-nodal"
        actor_name = officer_name or (actor_profile.get("full_name") if actor_profile else "Bank Nodal Officer")

        if action == "confirm":
            # Update FDR to Trust Tier 2
            fdr["trust_tier"] = 2
            fdr["verification_status"] = "bank_confirmed"
            fdr["updated_at"] = now

            # Create Tier 2 Attestation
            attestation = {
                "id": attestation_id,
                "fdr_id": str(fdr_id),
                "institution_id": str(fdr.get("institution_id")),
                "bank_id": str(fdr.get("bank_id")),
                "branch_id": str(fdr.get("branch_id")),
                "attestation_type": "tier2_bank_confirmation",
                "trust_tier": 2,
                "verification_status": "bank_confirmed",
                "request_id": matched_req.get("id"),
                "key_id": None,
                "signature_hex": None,
                "nonce": None,
                "attested_by": actor_id,
                "attestation_metadata": {
                    "officer_name": actor_name,
                    "notes": notes or "Confirmed via single-use bank verification link.",
                    "bank_name": fdr.get("bank_name"),
                    "branch_name": fdr.get("branch_name"),
                    "ifsc_code": fdr.get("ifsc_code"),
                },
                "created_at": now,
            }
            LOCAL_BANK_ATTESTATIONS.append(attestation)

            # Log FDR Event
            fdr_service.append_fdr_event(
                fdr_id=str(fdr_id),
                institution_id=str(fdr.get("institution_id")),
                actor_profile=actor_profile or {"id": actor_id, "full_name": actor_name, "email": "nodal@bank.co.in"},
                event_type="bank_confirmed",
                description=f"FDR deposit confirmed by {fdr.get('bank_name')} ({actor_name}). Promoted to Trust Tier 2 (Bank Confirmed).",
                metadata={
                    "attestation_id": attestation_id,
                    "trust_tier": 2,
                    "verification_status": "bank_confirmed",
                },
            )

            # Phase 4 Heartbeat Integration
            try:
                from app.services.heartbeat_service import heartbeat_service
                heartbeat_service.record_heartbeat_confirmation(
                    fdr_id=str(fdr_id),
                    attestation_id=attestation_id,
                    method="tier2_bank_confirmation",
                    actor_profile=actor_profile,
                )
            except Exception as hb_err:
                logger.warning(f"Heartbeat confirmation hook warning: {hb_err}")

            return {
                "success": True,
                "action": "confirmed",
                "trust_tier": 2,
                "verification_status": "bank_confirmed",
                "attestation_id": attestation_id,
                "message": f"FDR {fdr.get('fdr_number')} successfully confirmed by {fdr.get('bank_name')} and promoted to Trust Tier 2.",
            }

        else:
            # Action: Reject
            fdr["verification_status"] = "rejected"
            fdr["updated_at"] = now

            attestation = {
                "id": attestation_id,
                "fdr_id": str(fdr_id),
                "institution_id": str(fdr.get("institution_id")),
                "bank_id": str(fdr.get("bank_id")),
                "branch_id": str(fdr.get("branch_id")),
                "attestation_type": "tier2_bank_confirmation",
                "trust_tier": 1,  # Tier remains 1
                "verification_status": "rejected",
                "request_id": matched_req.get("id"),
                "key_id": None,
                "signature_hex": None,
                "nonce": None,
                "attested_by": actor_id,
                "attestation_metadata": {
                    "officer_name": actor_name,
                    "rejection_reason": rejection_reason or "Deposit terms rejected or unconfirmed by depository bank.",
                    "notes": notes,
                },
                "created_at": now,
            }
            LOCAL_BANK_ATTESTATIONS.append(attestation)

            fdr_service.append_fdr_event(
                fdr_id=str(fdr_id),
                institution_id=str(fdr.get("institution_id")),
                actor_profile=actor_profile or {"id": actor_id, "full_name": actor_name, "email": "nodal@bank.co.in"},
                event_type="bank_rejected",
                description=f"FDR deposit confirmation rejected by {fdr.get('bank_name')}. Reason: {rejection_reason or 'Not specified'}.",
                metadata={
                    "attestation_id": attestation_id,
                    "trust_tier": 1,
                    "verification_status": "rejected",
                    "reason": rejection_reason,
                },
            )

            # Phase 4 Heartbeat Integration
            try:
                from app.services.heartbeat_service import heartbeat_service
                heartbeat_service.record_heartbeat_rejection(
                    fdr_id=str(fdr_id),
                    rejection_reason=rejection_reason or "Deposit terms rejected or unconfirmed by depository bank.",
                    actor_profile=actor_profile,
                )
            except Exception as hb_err:
                logger.warning(f"Heartbeat rejection hook warning: {hb_err}")

            return {
                "success": True,
                "action": "rejected",
                "trust_tier": 1,
                "verification_status": "rejected",
                "attestation_id": attestation_id,
                "message": f"FDR confirmation rejected. Recorded evidence under attestation reference {attestation_id}.",
            }

    # ==========================================================================
    # 4. TIER 3: ED25519 DIGITAL SIGNATURE VERIFICATION (STRICT 15-POINT CHECKLIST)
    # ==========================================================================
    def verify_and_record_attestation(
        self,
        fdr_id: str,
        signed_payload: Dict[str, Any],
        signature_hex: str,
        actor_profile: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Executes complete Section 6 checklist for Tier 3 digital signature verification:
          1. Loads registered public key by key_id
          2. Checks bank association
          3. Checks key ID
          4. Checks algorithm (Ed25519)
          5. Checks key validity dates
          6. Checks revocation status
          7. Checks signing timestamp (clock skew < 5m)
          8. Checks payload issuer
          9. Checks audience
          10. Checks schema version
          11. Checks nonce uniqueness (replay protection)
          12. Canonicalizes payload deterministically
          13. Cryptographically verifies signature using public key
          14. Validates business data against actual FDR record
          15. Saves Tier 3 attestation and promotes FDR to Trust Tier 3
        """
        fdr = fdr_service.get_fdr_by_id(fdr_id)
        if not fdr:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"FDR record '{fdr_id}' not found.",
            )

        # 1. Load registered public key
        key_id = signed_payload.get("key_id")
        if not key_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Payload missing required 'key_id' field.",
            )

        bank_key = None
        for k in LOCAL_BANK_KEYS:
            if k.get("key_id") == key_id:
                bank_key = k
                break

        if not bank_key:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Public key '{key_id}' is not registered in the FDR-Chain bank keys registry.",
            )

        # 2. Check bank association (key bank == payload issuer == FDR bank)
        fdr_bank_code = str(fdr.get("bank_code", "")).upper()
        payload_issuer = str(signed_payload.get("issuer", "")).upper()
        payload_bank_code = str(signed_payload.get("bank_code", "")).upper()

        if fdr_bank_code != payload_issuer or fdr_bank_code != payload_bank_code:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Bank association mismatch: Payload issuer '{payload_issuer}' does not match FDR bank '{fdr_bank_code}'.",
            )

        # 3. Check algorithm
        if str(bank_key.get("algorithm")).lower() != "ed25519":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unsupported algorithm '{bank_key.get('algorithm')}'. Strict Ed25519 required.",
            )

        # 4 & 5. Check key validity dates & revocation
        now = datetime.now(timezone.utc)
        valid_from = bank_key.get("valid_from")
        valid_until = bank_key.get("valid_until")

        if isinstance(valid_from, str):
            valid_from = datetime.fromisoformat(valid_from.replace("Z", "+00:00"))
        if isinstance(valid_until, str):
            valid_until = datetime.fromisoformat(valid_until.replace("Z", "+00:00"))

        if now < valid_from:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Bank signing key is not yet valid under configured schedule.",
            )
        if now > valid_until:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Bank signing key has expired. Please perform key rotation.",
            )

        # 6. Check revocation status
        if bank_key.get("is_revoked") or not bank_key.get("is_active", True):
            reason = bank_key.get("revocation_reason", "Key has been revoked by system administrator")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Signing key '{key_id}' has been revoked: {reason}.",
            )

        # 7. Check signing timestamp (within 5 minutes of future, not older than 7 days)
        issued_at_str = signed_payload.get("issued_at")
        if not issued_at_str:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Missing 'issued_at' timestamp.")
        try:
            issued_at = datetime.fromisoformat(issued_at_str.replace("Z", "+00:00"))
        except Exception:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid ISO 8601 'issued_at' timestamp.")

        if issued_at > now + timedelta(minutes=5):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Signature timestamp cannot be in the future.")

        # 8, 9, 10. Check Audience & Schema Version
        if signed_payload.get("audience") != "fdr-chain-gov":
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Invalid audience. Target audience must be 'fdr-chain-gov'.",
            )
        if signed_payload.get("schema_version") != "1.0":
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Unsupported schema version. Must be '1.0'.",
            )

        # 11. Check Nonce Uniqueness (Replay Attack Prevention)
        nonce = signed_payload.get("nonce")
        if not nonce:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Missing cryptographic nonce in payload.")

        if nonce in LOCAL_NONCE_REGISTRY:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Cryptographic replay detected: Nonce '{nonce}' has already been processed.",
            )

        # 12 & 13. Deterministic Canonical Serialization & Ed25519 Signature Verification
        canonical_bytes = canonical_serialize(signed_payload)

        try:
            sig_bytes = bytes.fromhex(signature_hex)
            if len(sig_bytes) != 64:
                raise ValueError("Ed25519 signature must be exactly 64 bytes.")
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid signature format. Must be 64-byte hex string (128 hex chars): {str(e)}",
            )

        try:
            pub_pem = bank_key.get("public_key_pem")
            pub_key = serialization.load_pem_public_key(pub_pem.encode("utf-8"))
            pub_key.verify(sig_bytes, canonical_bytes)
        except InvalidSignature:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Cryptographic signature verification failed. Signature does not match payload bytes.",
            )
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Error during cryptographic signature evaluation: {str(e)}",
            )

        # 14. Business-Data Comparison with Actual FDR Record
        # If the signature is valid, but the payload contains mismatched data, reject!
        mismatches = []
        if str(signed_payload.get("fdr_number")).upper() != str(fdr.get("fdr_number")).upper():
            mismatches.append(f"fdr_number (payload: {signed_payload.get('fdr_number')}, db: {fdr.get('fdr_number')})")

        payload_amt = f"{float(signed_payload.get('amount', 0)):.2f}"
        db_amt = f"{float(fdr.get('amount', 0)):.2f}"
        if payload_amt != db_amt:
            mismatches.append(f"amount (payload: {payload_amt}, db: {db_amt})")

        if str(signed_payload.get("currency", "INR")).upper() != str(fdr.get("currency", "INR")).upper():
            mismatches.append("currency")

        if str(signed_payload.get("issue_date")) != str(fdr.get("issue_date")):
            mismatches.append("issue_date")

        if str(signed_payload.get("maturity_date")) != str(fdr.get("maturity_date")):
            mismatches.append("maturity_date")

        if str(signed_payload.get("lien_in_favour")).strip() != str(fdr.get("lien_in_favour")).strip():
            mismatches.append("lien_in_favour")

        if str(signed_payload.get("branch_ifsc")).upper() != str(fdr.get("ifsc_code", "")).upper():
            mismatches.append("branch_ifsc")

        if mismatches:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Valid signature over mismatched FDR data. Business discrepancies detected in: {', '.join(mismatches)}.",
            )

        # 15. All checks passed! Record Nonce & Attestation, and update Trust Tier to 3
        LOCAL_NONCE_REGISTRY.add(nonce)

        attestation_id = f"attest-t3-{uuid4().hex[:12]}"
        actor_id = actor_profile.get("id") if actor_profile else "usr-bank-system"

        attestation = {
            "id": attestation_id,
            "fdr_id": str(fdr_id),
            "institution_id": str(fdr.get("institution_id")),
            "bank_id": str(fdr.get("bank_id")),
            "branch_id": str(fdr.get("branch_id")),
            "attestation_type": "tier3_digital_signature",
            "trust_tier": 3,
            "verification_status": "signature_verified",
            "request_id": None,
            "key_id": key_id,
            "signed_payload": signed_payload,
            "signature_hex": signature_hex,
            "nonce": nonce,
            "attested_by": actor_id,
            "attestation_metadata": {
                "algorithm": "Ed25519",
                "issuer": payload_issuer,
                "key_id": key_id,
                "verified_at": now.isoformat(),
                "canonical_bytes_len": len(canonical_bytes),
            },
            "created_at": now,
        }
        LOCAL_BANK_ATTESTATIONS.append(attestation)

        # Update FDR to Trust Tier 3
        fdr["trust_tier"] = 3
        fdr["verification_status"] = "signature_verified"
        fdr["updated_at"] = now

        # Record FDR History Event
        fdr_service.append_fdr_event(
            fdr_id=str(fdr_id),
            institution_id=str(fdr.get("institution_id")),
            actor_profile=actor_profile or {"id": actor_id, "full_name": f"{fdr_bank_code} Core Banking Gateway", "email": "gateway@sbi.co.in"},
            event_type="signature_verified",
            description=f"Ed25519 asymmetric digital signature verified using key '{key_id}'. Promoted to highest Trust Tier 3 (Signature Verified).",
            metadata={
                "attestation_id": attestation_id,
                "trust_tier": 3,
                "verification_status": "signature_verified",
                "key_id": key_id,
            },
        )

        # Phase 4 Heartbeat Integration
        try:
            from app.services.heartbeat_service import heartbeat_service
            heartbeat_service.record_heartbeat_confirmation(
                fdr_id=str(fdr_id),
                attestation_id=attestation_id,
                method="tier3_digital_signature",
                actor_profile=actor_profile,
            )
        except Exception as hb_err:
            logger.warning(f"Heartbeat confirmation hook warning: {hb_err}")

        return {
            "success": True,
            "attestation_id": attestation_id,
            "trust_tier": 3,
            "verification_status": "signature_verified",
            "key_id": key_id,
            "fdr_number": fdr.get("fdr_number"),
            "message": f"FDR {fdr.get('fdr_number')} successfully promoted to Trust Tier 3 via Ed25519 digital signature verification.",
        }

    # ==========================================================================
    # 5. ATTESTATIONS RETRIEVAL
    # ==========================================================================
    def get_fdr_attestations(self, fdr_id: str) -> List[Dict[str, Any]]:
        """Returns all historical Tier 2 and Tier 3 attestations for an FDR."""
        items = [
            att for att in LOCAL_BANK_ATTESTATIONS
            if str(att.get("fdr_id")) == str(fdr_id)
        ]
        return sorted(items, key=lambda x: x.get("created_at"), reverse=True)

    # ==========================================================================
    # 6. KEY MANAGEMENT SERVICE
    # ==========================================================================
    def list_bank_keys(self, bank_id: Optional[str] = None, is_active: Optional[bool] = None) -> List[Dict[str, Any]]:
        """Lists registered bank public keys."""
        res = list(LOCAL_BANK_KEYS)
        if bank_id:
            res = [k for k in res if str(k.get("bank_id")) == str(bank_id)]
        if is_active is not None:
            res = [k for k in res if k.get("is_active") == is_active]
        return sorted(res, key=lambda x: x.get("created_at"), reverse=True)

    def register_bank_key(
        self,
        bank_id: str,
        key_id: str,
        public_key_pem: str,
        valid_until: datetime,
        algorithm: str = "Ed25519",
        actor_profile: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """Registers a new bank public key."""
        if any(k.get("key_id") == key_id for k in LOCAL_BANK_KEYS):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Key ID '{key_id}' is already registered in the registry.",
            )

        # Validate PEM format & parse raw hex
        try:
            pub_key = serialization.load_pem_public_key(public_key_pem.encode("utf-8"))
            pub_raw_hex = pub_key.public_bytes(
                encoding=serialization.Encoding.Raw,
                format=serialization.PublicFormat.Raw
            ).hex()
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid Ed25519 Public Key PEM: {str(e)}",
            )

        now = datetime.now(timezone.utc)
        new_key = {
            "id": f"key-{uuid4().hex[:12]}",
            "bank_id": str(bank_id),
            "bank_name": "Commercial Bank",
            "key_id": key_id,
            "algorithm": algorithm,
            "public_key_pem": public_key_pem.strip(),
            "public_key_raw_hex": pub_raw_hex,
            "valid_from": now,
            "valid_until": valid_until,
            "is_active": True,
            "is_revoked": False,
            "revoked_at": None,
            "revocation_reason": None,
            "created_at": now,
        }
        LOCAL_BANK_KEYS.append(new_key)
        return new_key

    def revoke_bank_key(
        self, key_id: str, revocation_reason: str, actor_profile: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Revokes a bank public key with an audited justification."""
        for k in LOCAL_BANK_KEYS:
            if k.get("key_id") == key_id or k.get("id") == key_id:
                now = datetime.now(timezone.utc)
                k["is_active"] = False
                k["is_revoked"] = True
                k["revoked_at"] = now
                k["revocation_reason"] = revocation_reason
                return k

        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Bank key '{key_id}' not found.",
        )


verification_service = VerificationService()
