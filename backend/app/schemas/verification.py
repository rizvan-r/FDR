from typing import Optional, Dict, Any, List, Literal
from datetime import datetime, date
from decimal import Decimal
from pydantic import BaseModel, Field, field_validator

# ==============================================================================
# 1. TIER 2 VERIFICATION REQUEST SCHEMAS
# ==============================================================================

class VerificationRequestCreate(BaseModel):
    fdr_id: str = Field(..., description="Target FDR UUID or string ID")

class VerificationRequestResponse(BaseModel):
    id: str
    fdr_id: str
    institution_id: str
    bank_id: str
    status: Literal['pending', 'consumed', 'expired', 'revoked']
    fdr_snapshot: Dict[str, Any]
    expires_at: datetime
    consumed_at: Optional[datetime] = None
    created_at: datetime
    # Raw token and URL are ONLY populated on initial generation for the requesting officer
    raw_token: Optional[str] = None
    verification_url: Optional[str] = None

class BankVerificationConfirmRequest(BaseModel):
    token: str = Field(..., description="High-entropy single-use verification token")
    action: Literal['confirm', 'reject'] = Field(..., description="Bank action")
    rejection_reason: Optional[str] = Field(None, description="Reason if action is reject")
    officer_name: Optional[str] = Field(None, description="Name of confirming bank officer")
    notes: Optional[str] = Field(None, description="Branch remarks / reference notes")

class BankVerificationDetailResponse(BaseModel):
    request_id: str
    fdr_id: str
    fdr_number: str
    institution_id: str
    institution_name: Optional[str] = None
    bank_id: str
    bank_name: Optional[str] = None
    branch_id: Optional[str] = None
    branch_name: Optional[str] = None
    ifsc_code: Optional[str] = None
    amount: Decimal
    currency: str
    issue_date: str
    maturity_date: str
    interest_rate: Optional[Decimal] = None
    lien_in_favour: str
    status: str
    expires_at: datetime
    is_expired: bool
    is_snapshot_valid: bool

# ==============================================================================
# 2. TIER 3 DIGITAL SIGNATURE & ATTESTATION SCHEMAS
# ==============================================================================

class SignedFDRPayload(BaseModel):
    schema_version: str = Field("1.0", description="Payload schema specification version")
    issuer: str = Field(..., description="Bank code / identifier (e.g. SBIN)")
    audience: str = Field("fdr-chain-gov", description="Target gateway audience")
    key_id: str = Field(..., description="Public key ID registered in bank_keys")
    nonce: str = Field(..., description="Unique single-use cryptographic nonce")
    issued_at: str = Field(..., description="ISO 8601 UTC timestamp of signature")
    institution_code: str
    bank_code: str
    branch_ifsc: str
    fdr_number: str
    amount: str = Field(..., description="Decimal string representation of amount (e.g. '25000000.00')")
    currency: str = Field("INR")
    issue_date: str
    maturity_date: str
    lien_in_favour: str

class DigitalSignatureSubmissionRequest(BaseModel):
    fdr_id: str = Field(..., description="Target FDR UUID or ID")
    signed_payload: Dict[str, Any] = Field(..., description="Canonical signed payload")
    signature_hex: str = Field(..., description="64-byte Ed25519 signature in hex (128 hex chars)")

class BankAttestationResponse(BaseModel):
    id: str
    fdr_id: str
    institution_id: str
    bank_id: str
    branch_id: Optional[str] = None
    attestation_type: Literal['tier2_bank_confirmation', 'tier3_digital_signature']
    trust_tier: int
    verification_status: str
    request_id: Optional[str] = None
    key_id: Optional[str] = None
    signature_hex: Optional[str] = None
    nonce: Optional[str] = None
    attested_by: Optional[str] = None
    attestation_metadata: Dict[str, Any] = Field(default_factory=dict)
    created_at: datetime

# ==============================================================================
# 3. BANK PUBLIC KEY MANAGEMENT SCHEMAS
# ==============================================================================

class BankKeyCreate(BaseModel):
    bank_id: str
    key_id: str
    algorithm: str = Field("Ed25519")
    public_key_pem: str
    valid_until: datetime

class BankKeyRevokeRequest(BaseModel):
    revocation_reason: str = Field(..., min_length=5, description="Audited justification for key revocation")

class BankKeyResponse(BaseModel):
    id: str
    bank_id: str
    bank_name: Optional[str] = None
    key_id: str
    algorithm: str
    public_key_pem: str
    public_key_raw_hex: str
    valid_from: datetime
    valid_until: datetime
    is_active: bool
    is_revoked: bool
    revoked_at: Optional[datetime] = None
    revocation_reason: Optional[str] = None
    created_at: datetime
