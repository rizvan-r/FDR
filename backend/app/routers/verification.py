import logging
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, status
from app.auth.dependencies import get_current_user, require_admin
from app.schemas.verification import (
    VerificationRequestResponse,
    BankVerificationConfirmRequest,
    BankVerificationDetailResponse,
    DigitalSignatureSubmissionRequest,
    BankAttestationResponse,
    BankKeyCreate,
    BankKeyRevokeRequest,
    BankKeyResponse,
)
from app.services.verification_service import verification_service
from app.services.mock_bank_crypto import MockBankSigningService
from app.services.fdr_service import fdr_service

logger = logging.getLogger("fdr_chain.verification_router")
router = APIRouter(prefix="/api/v1", tags=["Bank Verification & Trust Tiers (Phase 3)"])

# ==============================================================================
# 1. TIER 2: VERIFICATION REQUESTS
# ==============================================================================

@router.post("/fdrs/{fdr_id}/verification-requests", response_model=VerificationRequestResponse, status_code=status.HTTP_201_CREATED)
async def create_verification_request(
    fdr_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Institution Officer creates a single-use expiring Tier 2 verification request.
    Generates 256-bit high-entropy token, stores SHA-256 hash, and binds immutable FDR snapshot.
    Enforces invariant: Only one pending request per FDR.
    """
    return verification_service.create_verification_request(fdr_id, current_user)

@router.get("/bank/verification/{token_or_id}", response_model=BankVerificationDetailResponse)
async def get_verification_request_details(
    token_or_id: str,
):
    """
    Bank Officer views FDR details and snapshot fidelity using verification token or request_id.
    Validates token freshness and flags any snapshot tampering.
    """
    return verification_service.get_verification_by_token_or_id(token_or_id)

@router.post("/bank/verification/confirm")
async def confirm_bank_verification(
    request_data: BankVerificationConfirmRequest,
    current_user: Optional[dict] = Depends(get_current_user)
):
    """
    Atomically consumes single-use verification token.
    On confirm: Promotes FDR to Trust Tier 2, status 'bank_confirmed', records Tier 2 attestation.
    On reject: Sets status 'rejected', retains Trust Tier 1, records rejection evidence.
    Prevents replay, expired token consumption, and snapshot mismatch.
    """
    return verification_service.confirm_bank_verification(
        token=request_data.token,
        action=request_data.action,
        rejection_reason=request_data.rejection_reason,
        officer_name=request_data.officer_name,
        notes=request_data.notes,
        actor_profile=current_user
    )

@router.get("/bank/pending-requests")
async def list_bank_pending_requests(
    bank_id: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user)
):
    """
    Lists pending Tier 2 verification requests for bank review.
    Bank-scoped or administrative oversight.
    """
    user_roles = current_user.get("roles", [])
    user_bank_id = current_user.get("bank_id")
    target_bank = bank_id or user_bank_id

    reqs = []
    from app.services.verification_service import LOCAL_VERIFICATION_REQUESTS
    for req in LOCAL_VERIFICATION_REQUESTS:
        if req.get("status") == "pending":
            if target_bank and str(req.get("bank_id")) != str(target_bank) and "system_admin" not in user_roles and "bureau_officer" not in user_roles:
                continue
            reqs.append(req)

    return sorted(reqs, key=lambda x: x.get("created_at"), reverse=True)

# ==============================================================================
# 2. TIER 3: DIGITAL SIGNATURE VERIFICATION & ATTESTATIONS
# ==============================================================================

@router.post("/bank/attestations")
async def submit_digital_signature_attestation(
    attestation_data: DigitalSignatureSubmissionRequest,
    current_user: Optional[dict] = Depends(get_current_user)
):
    """
    Submits Ed25519 digitally signed bank payload for strict verification.
    Executes complete 15-point verification checklist:
      - Validates key_id against registered bank public keys
      - Checks algorithm, validity window, and revocation status
      - Enforces timestamp skew and audience constraints
      - Enforces cryptographic nonce uniqueness (replay protection)
      - Verifies Ed25519 signature over deterministic canonical bytes
      - Compares all business parameters against actual FDR record
    On success: Promotes FDR to highest Trust Tier 3 (Signature Verified).
    """
    return verification_service.verify_and_record_attestation(
        fdr_id=attestation_data.fdr_id,
        signed_payload=attestation_data.signed_payload,
        signature_hex=attestation_data.signature_hex,
        actor_profile=current_user
    )

@router.get("/fdrs/{fdr_id}/attestations", response_model=List[BankAttestationResponse])
async def get_fdr_attestations(
    fdr_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Retrieves complete historical attestation evidence (Tier 2 confirmations and Tier 3 digital signatures).
    """
    return verification_service.get_fdr_attestations(fdr_id)

@router.post("/bank/mock-sign/{fdr_id}")
async def mock_bank_sign_fdr(
    fdr_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Simulated Bank Integration Helper:
    Generates deterministic canonical JSON payload and signs with mock bank's Ed25519 private key.
    Used exclusively for testing and bank portal workbench demonstration.
    Private key is kept isolated on the server.
    """
    fdr = fdr_service.get_fdr_by_id(fdr_id, current_user)
    bank_code = fdr.get("bank_code", "SBIN")
    payload, sig_hex = MockBankSigningService.generate_signed_payload(bank_code, fdr)
    return {
        "fdr_id": fdr_id,
        "bank_code": bank_code,
        "signed_payload": payload,
        "signature_hex": sig_hex
    }

# ==============================================================================
# 3. BANK PUBLIC KEY REGISTRY & KEY MANAGEMENT
# ==============================================================================

@router.get("/admin/bank-keys", response_model=List[BankKeyResponse])
async def list_bank_keys(
    bank_id: Optional[str] = Query(None),
    is_active: Optional[bool] = Query(None),
    current_user: dict = Depends(get_current_user)
):
    """
    Lists registered bank public keys with key lifecycle status.
    """
    return verification_service.list_bank_keys(bank_id=bank_id, is_active=is_active)

@router.post("/admin/bank-keys", response_model=BankKeyResponse, status_code=status.HTTP_201_CREATED)
async def register_bank_key(
    key_data: BankKeyCreate,
    current_user: dict = Depends(require_admin)
):
    """
    System Administrator registers an authorized bank's Ed25519 public key.
    """
    return verification_service.register_bank_key(
        bank_id=key_data.bank_id,
        key_id=key_data.key_id,
        public_key_pem=key_data.public_key_pem,
        valid_until=key_data.valid_until,
        algorithm=key_data.algorithm,
        actor_profile=current_user
    )

@router.patch("/admin/bank-keys/{key_id}/revoke", response_model=BankKeyResponse)
async def revoke_bank_key(
    key_id: str,
    revoke_data: BankKeyRevokeRequest,
    current_user: dict = Depends(require_admin)
):
    """
    System Administrator revokes a bank public key with audited justification.
    """
    return verification_service.revoke_bank_key(
        key_id=key_id,
        revocation_reason=revoke_data.revocation_reason,
        actor_profile=current_user
    )
