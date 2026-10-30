-- ============================================================================
-- FDR-CHAIN ENTERPRISE PLATFORM: PHASE 8 ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all Phase 8 tables
ALTER TABLE release_policy_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE fdr_release_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE release_checklist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE release_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_release_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE fdr_refund_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE fdr_refund_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE release_closure_records ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- 1. RELEASE POLICY VERSIONS
-- ----------------------------------------------------------------------------
CREATE POLICY "release_policies_select_policy"
ON release_policy_versions FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "release_policies_admin_manage_policy"
ON release_policy_versions FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id = auth.uid()
          AND r.name IN ('system_admin', 'bureau_officer')
    )
);

-- ----------------------------------------------------------------------------
-- 2. FDR RELEASE REQUESTS
-- ----------------------------------------------------------------------------
CREATE POLICY "release_requests_institution_select"
ON fdr_release_requests FOR SELECT
TO authenticated
USING (
    institution_id IN (
        SELECT institution_id FROM user_roles
        WHERE user_id = auth.uid() AND institution_id IS NOT NULL
    )
    OR
    EXISTS (
        SELECT 1 FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id = auth.uid()
          AND r.name IN ('system_admin', 'bureau_officer', 'regional_officer', 'finance_officer')
    )
);

CREATE POLICY "release_requests_institution_insert"
ON fdr_release_requests FOR INSERT
TO authenticated
WITH CHECK (
    institution_id IN (
        SELECT institution_id FROM user_roles
        WHERE user_id = auth.uid() AND institution_id IS NOT NULL
    )
    OR
    EXISTS (
        SELECT 1 FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id = auth.uid()
          AND r.name IN ('system_admin', 'bureau_officer')
    )
);

CREATE POLICY "release_requests_update_policy"
ON fdr_release_requests FOR UPDATE
TO authenticated
USING (
    -- Institution can update drafts / respond to return_for_correction
    (
        institution_id IN (
            SELECT institution_id FROM user_roles
            WHERE user_id = auth.uid() AND institution_id IS NOT NULL
        )
        AND request_status IN ('draft', 'returned_for_correction')
    )
    OR
    -- Regulatory officers can update across review workflow
    EXISTS (
        SELECT 1 FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id = auth.uid()
          AND r.name IN ('system_admin', 'bureau_officer', 'regional_officer', 'finance_officer')
    )
);

-- ----------------------------------------------------------------------------
-- 3. RELEASE CHECKLIST ITEMS
-- ----------------------------------------------------------------------------
CREATE POLICY "checklist_items_select_policy"
ON release_checklist_items FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM fdr_release_requests rr
        WHERE rr.id = release_checklist_items.release_request_id
          AND (
              rr.institution_id IN (
                  SELECT institution_id FROM user_roles
                  WHERE user_id = auth.uid() AND institution_id IS NOT NULL
              )
              OR
              EXISTS (
                  SELECT 1 FROM user_roles ur
                  JOIN roles r ON ur.role_id = r.id
                  WHERE ur.user_id = auth.uid()
                    AND r.name IN ('system_admin', 'bureau_officer', 'regional_officer', 'finance_officer')
              )
          )
    )
);

CREATE POLICY "checklist_items_manage_policy"
ON release_checklist_items FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id = auth.uid()
          AND r.name IN ('system_admin', 'bureau_officer', 'regional_officer', 'finance_officer')
    )
);

-- ----------------------------------------------------------------------------
-- 4. RELEASE REVIEWS
-- ----------------------------------------------------------------------------
CREATE POLICY "release_reviews_select_policy"
ON release_reviews FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM fdr_release_requests rr
        WHERE rr.id = release_reviews.release_request_id
          AND (
              rr.institution_id IN (
                  SELECT institution_id FROM user_roles
                  WHERE user_id = auth.uid() AND institution_id IS NOT NULL
              )
              OR
              EXISTS (
                  SELECT 1 FROM user_roles ur
                  JOIN roles r ON ur.role_id = r.id
                  WHERE ur.user_id = auth.uid()
                    AND r.name IN ('system_admin', 'bureau_officer', 'regional_officer', 'finance_officer')
              )
          )
    )
);

CREATE POLICY "release_reviews_insert_policy"
ON release_reviews FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id = auth.uid()
          AND r.name IN ('system_admin', 'bureau_officer', 'regional_officer', 'finance_officer')
    )
);

-- ----------------------------------------------------------------------------
-- 5. BANK RELEASE RECORDS
-- ----------------------------------------------------------------------------
CREATE POLICY "bank_release_records_select_policy"
ON bank_release_records FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM fdr_release_requests rr
        WHERE rr.id = bank_release_records.release_request_id
          AND (
              rr.institution_id IN (
                  SELECT institution_id FROM user_roles
                  WHERE user_id = auth.uid() AND institution_id IS NOT NULL
              )
              OR
              EXISTS (
                  SELECT 1 FROM user_roles ur
                  JOIN roles r ON ur.role_id = r.id
                  WHERE ur.user_id = auth.uid()
                    AND r.name IN ('system_admin', 'bureau_officer', 'regional_officer', 'finance_officer')
              )
          )
    )
);

CREATE POLICY "bank_release_records_manage_policy"
ON bank_release_records FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id = auth.uid()
          AND r.name IN ('system_admin', 'bureau_officer', 'regional_officer')
    )
);

-- ----------------------------------------------------------------------------
-- 6. FDR REFUND RECORDS & TRANSACTIONS
-- ----------------------------------------------------------------------------
CREATE POLICY "refund_records_select_policy"
ON fdr_refund_records FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM fdr_release_requests rr
        WHERE rr.id = fdr_refund_records.release_request_id
          AND (
              rr.institution_id IN (
                  SELECT institution_id FROM user_roles
                  WHERE user_id = auth.uid() AND institution_id IS NOT NULL
              )
              OR
              EXISTS (
                  SELECT 1 FROM user_roles ur
                  JOIN roles r ON ur.role_id = r.id
                  WHERE ur.user_id = auth.uid()
                    AND r.name IN ('system_admin', 'bureau_officer', 'regional_officer', 'finance_officer')
              )
          )
    )
);

CREATE POLICY "refund_records_manage_policy"
ON fdr_refund_records FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id = auth.uid()
          AND r.name IN ('system_admin', 'finance_officer', 'bureau_officer')
    )
);

CREATE POLICY "refund_transactions_select_policy"
ON fdr_refund_transactions FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM fdr_refund_records rr
        JOIN fdr_release_requests req ON rr.release_request_id = req.id
        WHERE rr.id = fdr_refund_transactions.refund_record_id
          AND (
              req.institution_id IN (
                  SELECT institution_id FROM user_roles
                  WHERE user_id = auth.uid() AND institution_id IS NOT NULL
              )
              OR
              EXISTS (
                  SELECT 1 FROM user_roles ur
                  JOIN roles r ON ur.role_id = r.id
                  WHERE ur.user_id = auth.uid()
                    AND r.name IN ('system_admin', 'bureau_officer', 'regional_officer', 'finance_officer')
              )
          )
    )
);

CREATE POLICY "refund_transactions_manage_policy"
ON fdr_refund_transactions FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id = auth.uid()
          AND r.name IN ('system_admin', 'finance_officer', 'bureau_officer')
    )
);

-- ----------------------------------------------------------------------------
-- 7. RELEASE CLOSURE RECORDS
-- ----------------------------------------------------------------------------
CREATE POLICY "closure_records_select_policy"
ON release_closure_records FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM fdr_release_requests rr
        WHERE rr.id = release_closure_records.release_request_id
          AND (
              rr.institution_id IN (
                  SELECT institution_id FROM user_roles
                  WHERE user_id = auth.uid() AND institution_id IS NOT NULL
              )
              OR
              EXISTS (
                  SELECT 1 FROM user_roles ur
                  JOIN roles r ON ur.role_id = r.id
                  WHERE ur.user_id = auth.uid()
                    AND r.name IN ('system_admin', 'bureau_officer', 'regional_officer', 'finance_officer')
              )
          )
    )
);

CREATE POLICY "closure_records_manage_policy"
ON release_closure_records FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id = auth.uid()
          AND r.name IN ('system_admin', 'bureau_officer')
    )
);
