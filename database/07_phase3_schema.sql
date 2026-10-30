-- ==============================================================================
-- FDR-Chain: Fixed Deposit Receipt Management Portal (SIH 2026)
-- Phase 3: Digital Bank Verification, Trust Tiers and Ed25519 Signatures Schema
-- ==============================================================================

-- 1. EXTEND ENUMERATIONS IF APPLICABLE
DO $$
BEGIN
    ALTER TYPE fdr_verification_enum ADD VALUE IF NOT EXISTS 'bank_confirmed';
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$
BEGIN
    ALTER TYPE fdr_verification_enum ADD VALUE IF NOT EXISTS 'signature_verified';
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Attestation Type Enum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'attestation_type_enum') THEN
        CREATE TYPE attestation_type_enum AS ENUM (
            'tier2_bank_confirmation',  -- Nodal bank officer single-use link confirmation
            'tier3_digital_signature'   -- Asymmetric Ed25519 cryptographically signed bank payload
        );
    END IF;
END $$;

-- Verification Request Status Enum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'verification_request_status_enum') THEN
        CREATE TYPE verification_request_status_enum AS ENUM (
            'pending',   -- Link active, awaiting bank officer response
            'consumed',  -- Token used to confirm or reject
            'expired',   -- Past the 48-hour validity period
            'revoked'    -- Cancelled due to FDR modifications or manual recall
        );
    END IF;
END $$;


-- ==============================================================================
-- 2. BANK KEYS TABLE (Public Key Registry for Ed25519 Digital Signatures)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.bank_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bank_id UUID NOT NULL REFERENCES public.banks(id) ON DELETE CASCADE,
    key_id VARCHAR(100) NOT NULL UNIQUE,          -- Canonical identifier (e.g. SBIN-ED25519-2026-01)
    algorithm VARCHAR(50) NOT NULL DEFAULT 'Ed25519',
    public_key_pem TEXT NOT NULL,                 -- RFC 7468 PEM-encoded SubjectPublicKeyInfo
    public_key_raw_hex VARCHAR(128) NOT NULL,     -- 32-byte raw public key in hex
    valid_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    valid_until TIMESTAMPTZ NOT NULL,             -- Key lifecycle expiry
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_revoked BOOLEAN NOT NULL DEFAULT FALSE,
    revoked_at TIMESTAMPTZ,
    revocation_reason TEXT,
    created_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_bank_keys_validity CHECK (valid_until > valid_from)
);

CREATE INDEX IF NOT EXISTS idx_bank_keys_bank ON public.bank_keys(bank_id);
CREATE INDEX IF NOT EXISTS idx_bank_keys_key_id ON public.bank_keys(key_id);
CREATE INDEX IF NOT EXISTS idx_bank_keys_active ON public.bank_keys(is_active, is_revoked);


-- ==============================================================================
-- 3. VERIFICATION REQUESTS TABLE (Tier 2 Single-Use Ephemeral Link Tokens)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.verification_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fdr_id UUID NOT NULL REFERENCES public.fdrs(id) ON DELETE CASCADE,
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE RESTRICT,
    bank_id UUID NOT NULL REFERENCES public.banks(id) ON DELETE RESTRICT,
    token_hash VARCHAR(64) NOT NULL UNIQUE,       -- SHA-256 hash of high-entropy 256-bit token
    status verification_request_status_enum NOT NULL DEFAULT 'pending',
    fdr_snapshot JSONB NOT NULL,                  -- Immutable snapshot of verified parameters at request time
    expires_at TIMESTAMPTZ NOT NULL,              -- Default 48 hours validity
    consumed_at TIMESTAMPTZ,
    consumed_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    created_by UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Invariant: Exactly one pending verification request allowed per FDR at any given time
CREATE UNIQUE INDEX IF NOT EXISTS uq_pending_verification_request 
    ON public.verification_requests (fdr_id) 
    WHERE (status = 'pending');

CREATE INDEX IF NOT EXISTS idx_verification_requests_fdr ON public.verification_requests(fdr_id);
CREATE INDEX IF NOT EXISTS idx_verification_requests_bank ON public.verification_requests(bank_id);
CREATE INDEX IF NOT EXISTS idx_verification_requests_token ON public.verification_requests(token_hash);
CREATE INDEX IF NOT EXISTS idx_verification_requests_status ON public.verification_requests(status);


-- ==============================================================================
-- 4. BANK ATTESTATIONS TABLE (Immutable Historical Verification Evidence)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.bank_attestations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fdr_id UUID NOT NULL REFERENCES public.fdrs(id) ON DELETE CASCADE,
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE RESTRICT,
    bank_id UUID NOT NULL REFERENCES public.banks(id) ON DELETE RESTRICT,
    branch_id UUID REFERENCES public.bank_branches(id) ON DELETE SET NULL,
    attestation_type attestation_type_enum NOT NULL,
    trust_tier INT NOT NULL CHECK (trust_tier IN (2, 3)),
    verification_status VARCHAR(50) NOT NULL,     -- 'bank_confirmed', 'signature_verified', 'rejected'
    request_id UUID REFERENCES public.verification_requests(id) ON DELETE SET NULL,
    key_id VARCHAR(100),                          -- References bank_keys(key_id) for Tier 3
    signed_payload JSONB,                         -- Canonical JSON payload verified for Tier 3
    signature_hex TEXT,                           -- 64-byte Ed25519 signature in hex format
    nonce VARCHAR(128),                           -- Replay protection nonce for Tier 3
    attested_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    attestation_metadata JSONB DEFAULT '{}'::jsonb, -- IP, User-Agent, Rejection Notes, etc.
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ensure bank associated with attestation matches the bank of the request / FDR
CREATE INDEX IF NOT EXISTS idx_bank_attestations_fdr ON public.bank_attestations(fdr_id);
CREATE INDEX IF NOT EXISTS idx_bank_attestations_bank ON public.bank_attestations(bank_id);
CREATE INDEX IF NOT EXISTS idx_bank_attestations_tier ON public.bank_attestations(trust_tier);
CREATE INDEX IF NOT EXISTS idx_bank_attestations_created ON public.bank_attestations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bank_attestations_nonce ON public.bank_attestations(nonce) WHERE (nonce IS NOT NULL);


-- ==============================================================================
-- 5. AUTOMATIC TIMESTAMP TRIGGERS
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_bank_keys_updated_at ON public.bank_keys;
CREATE TRIGGER trg_bank_keys_updated_at
    BEFORE UPDATE ON public.bank_keys
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trg_verification_requests_updated_at ON public.verification_requests;
CREATE TRIGGER trg_verification_requests_updated_at
    BEFORE UPDATE ON public.verification_requests
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();
