-- ==============================================================================
-- FDR-Chain: Fixed Deposit Receipt Management Portal (SIH 2026)
-- Phase 3: Seed Bank Public Keys & Sample Attestations
-- ==============================================================================

DO $$
DECLARE
    bank_sbi UUID;
    bank_pnb UUID;
    bank_barb UUID;
    bank_cnrb UUID;
    bank_hdfc UUID;
    bank_icic UUID;
    admin_usr UUID;
    sample_fdr UUID;
    inst_nhai UUID;
    br_sbi_delhi UUID;
BEGIN
    SELECT id INTO bank_sbi FROM public.banks WHERE code = 'SBIN';
    SELECT id INTO bank_pnb FROM public.banks WHERE code = 'PUNB';
    SELECT id INTO bank_barb FROM public.banks WHERE code = 'BARB';
    SELECT id INTO bank_cnrb FROM public.banks WHERE code = 'CNRB';
    SELECT id INTO bank_hdfc FROM public.banks WHERE code = 'HDFC';
    SELECT id INTO bank_icic FROM public.banks WHERE code = 'ICIC';

    SELECT id INTO admin_usr FROM public.user_profiles LIMIT 1;
    SELECT id, institution_id, branch_id INTO sample_fdr, inst_nhai, br_sbi_delhi 
    FROM public.fdrs 
    WHERE fdr_number = 'FDR-2026-NHAI-84920' LIMIT 1;

    -- 1. SEED PUBLIC KEYS FOR AUTHORIZED SCHEDULED BANKS
    IF bank_sbi IS NOT NULL THEN
        INSERT INTO public.bank_keys (
            bank_id, key_id, algorithm, public_key_pem, public_key_raw_hex,
            valid_from, valid_until, is_active, is_revoked, created_by
        ) VALUES (
            bank_sbi, 'SBIN-ED25519-2026-01', 'Ed25519',
            '-----BEGIN PUBLIC KEY-----'||E'\n'||'MCowBQYDK2VwAyEASuRbQCvDpMH1CD6WIt0goZcGYGvT/wHroISbkWCmAbc='||E'\n'||'-----END PUBLIC KEY-----',
            '4ae45b402bc3a4c1f5083e9622dd20a19706606bd3ff01eba0849b9160a601b7',
            NOW() - INTERVAL '30 days', NOW() + INTERVAL '365 days', TRUE, FALSE, admin_usr
        ) ON CONFLICT (key_id) DO NOTHING;
    END IF;

    IF bank_pnb IS NOT NULL THEN
        INSERT INTO public.bank_keys (
            bank_id, key_id, algorithm, public_key_pem, public_key_raw_hex,
            valid_from, valid_until, is_active, is_revoked, created_by
        ) VALUES (
            bank_pnb, 'PUNB-ED25519-2026-01', 'Ed25519',
            '-----BEGIN PUBLIC KEY-----'||E'\n'||'MCowBQYDK2VwAyEAgyNV+EKgUMsywcN3UxMPmt6gCZE/7RoID1KaOXfz+sg='||E'\n'||'-----END PUBLIC KEY-----',
            '832355f842a050cb32c1c37753130f9adea009913fed1a080f529a3977f3fac8',
            NOW() - INTERVAL '30 days', NOW() + INTERVAL '365 days', TRUE, FALSE, admin_usr
        ) ON CONFLICT (key_id) DO NOTHING;
    END IF;

    IF bank_barb IS NOT NULL THEN
        INSERT INTO public.bank_keys (
            bank_id, key_id, algorithm, public_key_pem, public_key_raw_hex,
            valid_from, valid_until, is_active, is_revoked, created_by
        ) VALUES (
            bank_barb, 'BARB-ED25519-2026-01', 'Ed25519',
            '-----BEGIN PUBLIC KEY-----'||E'\n'||'MCowBQYDK2VwAyEAB8U5aitgJgLTK60y3hGRJHhwBCltp302JBuFZVmay4w='||E'\n'||'-----END PUBLIC KEY-----',
            '07c5396a2b602602d32bad32de119124787004296da77d36241b8565599acb8c',
            NOW() - INTERVAL '30 days', NOW() + INTERVAL '365 days', TRUE, FALSE, admin_usr
        ) ON CONFLICT (key_id) DO NOTHING;
    END IF;

    IF bank_cnrb IS NOT NULL THEN
        INSERT INTO public.bank_keys (
            bank_id, key_id, algorithm, public_key_pem, public_key_raw_hex,
            valid_from, valid_until, is_active, is_revoked, created_by
        ) VALUES (
            bank_cnrb, 'CNRB-ED25519-2026-01', 'Ed25519',
            '-----BEGIN PUBLIC KEY-----'||E'\n'||'MCowBQYDK2VwAyEAfNXxmap0F3jOL0WRpVkEgA61xZwlVX0cLmlJ5do7drs='||E'\n'||'-----END PUBLIC KEY-----',
            '7cd5f199aa741778ce2f4591a55904800eb5c59c25557d1c2e6949e5da3b76bb',
            NOW() - INTERVAL '30 days', NOW() + INTERVAL '365 days', TRUE, FALSE, admin_usr
        ) ON CONFLICT (key_id) DO NOTHING;
    END IF;

    IF bank_hdfc IS NOT NULL THEN
        INSERT INTO public.bank_keys (
            bank_id, key_id, algorithm, public_key_pem, public_key_raw_hex,
            valid_from, valid_until, is_active, is_revoked, created_by
        ) VALUES (
            bank_hdfc, 'HDFC-ED25519-2026-01', 'Ed25519',
            '-----BEGIN PUBLIC KEY-----'||E'\n'||'MCowBQYDK2VwAyEAtCNF757eY7iDT7sJUFudkwKWaL0qCiWcfjNoTZ8Sm9M='||E'\n'||'-----END PUBLIC KEY-----',
            'b42345ef9ede63b8834fbb09505b9d93029668bd2a0a259c7e33684d9f129bd3',
            NOW() - INTERVAL '30 days', NOW() + INTERVAL '365 days', TRUE, FALSE, admin_usr
        ) ON CONFLICT (key_id) DO NOTHING;
    END IF;

    IF bank_icic IS NOT NULL THEN
        INSERT INTO public.bank_keys (
            bank_id, key_id, algorithm, public_key_pem, public_key_raw_hex,
            valid_from, valid_until, is_active, is_revoked, created_by
        ) VALUES (
            bank_icic, 'ICIC-ED25519-2026-01', 'Ed25519',
            '-----BEGIN PUBLIC KEY-----'||E'\n'||'MCowBQYDK2VwAyEA/x0S0Gb6g4m/LYyOPpyZfdErpPC5WQVeRHln87c1Tis='||E'\n'||'-----END PUBLIC KEY-----',
            'ff1d12d066fa8389bf2d8c8e3e9c997dd12ba4f0b959055e447967f3b7354e2b',
            NOW() - INTERVAL '30 days', NOW() + INTERVAL '365 days', TRUE, FALSE, admin_usr
        ) ON CONFLICT (key_id) DO NOTHING;
    END IF;

END $$;
