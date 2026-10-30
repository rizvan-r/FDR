# FDR Monitoring System - Phase 5 Database Documentation

## Database Schema, Integrity Constraints & RLS Policies

### 1. Overview
Phase 5 introduces three database tables, one recursive PostgreSQL graph traversal function, a cycle-prevention trigger function, and comprehensive Row-Level Security (RLS) policies implemented across:
- `database/13_phase5_schema.sql`
- `database/14_phase5_rls_policies.sql`
- `database/15_phase5_seed_data.sql`

---

### 2. Schema Definitions

#### A. Table: `renewal_cases`
Stores governed renewal requests tracking the lifecycle from initiation to supervisory approval.

```sql
CREATE TABLE IF NOT EXISTS public.renewal_cases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_number VARCHAR(50) UNIQUE NOT NULL,
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE RESTRICT,
    original_fdr_id UUID NOT NULL REFERENCES public.fdrs(id) ON DELETE RESTRICT,
    replacement_fdr_id UUID REFERENCES public.fdrs(id) ON DELETE SET NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'draft' CHECK (status IN (
        'draft', 'under_review', 'submitted', 'approved', 'rejected', 'awaiting_bank_confirmation'
    )),
    matching_score NUMERIC(5, 2) DEFAULT 0.00,
    matching_confidence VARCHAR(20) DEFAULT 'none' CHECK (matching_confidence IN ('high', 'medium', 'low', 'none')),
    matching_signals JSONB DEFAULT '{}'::jsonb,
    matching_discrepancies JSONB DEFAULT '[]'::jsonb,
    justification TEXT,
    officer_notes TEXT,
    rejection_reason TEXT,
    created_by UUID REFERENCES public.users(id),
    submitted_at TIMESTAMPTZ,
    reviewed_by UUID REFERENCES public.users(id),
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

#### B. Table: `fdr_lineage`
Maintains Directed Acyclic Graph (DAG) edges linking original and replacement FDRs.

```sql
CREATE TABLE IF NOT EXISTS public.fdr_lineage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_fdr_id UUID NOT NULL REFERENCES public.fdrs(id) ON DELETE RESTRICT,
    child_fdr_id UUID NOT NULL UNIQUE REFERENCES public.fdrs(id) ON DELETE RESTRICT,
    renewal_case_id UUID REFERENCES public.renewal_cases(id) ON DELETE SET NULL,
    relationship_type VARCHAR(50) NOT NULL DEFAULT 'renewal' CHECK (relationship_type IN (
        'renewal', 'rollover', 'split', 'consolidation', 'replacement'
    )),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_by UUID REFERENCES public.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_no_self_link CHECK (parent_fdr_id <> child_fdr_id)
);
```
*Key Invariant*: `child_fdr_id` carries a `UNIQUE` constraint, enforcing that a replacement FDR can have at most one predecessor link.

#### C. Table: `renewal_evidence`
Maintains document artifacts supporting the renewal request (e.g., bank renewal certificates, sanction letters, board resolutions).

```sql
CREATE TABLE IF NOT EXISTS public.renewal_evidence (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    renewal_case_id UUID NOT NULL REFERENCES public.renewal_cases(id) ON DELETE CASCADE,
    document_type VARCHAR(50) NOT NULL CHECK (document_type IN (
        'bank_renewal_certificate', 'sanction_letter', 'board_resolution', 'bank_statement', 'other'
    )),
    file_name VARCHAR(255) NOT NULL,
    file_url TEXT NOT NULL,
    file_size_bytes BIGINT,
    mime_type VARCHAR(100) NOT NULL,
    sha256_hash VARCHAR(64) NOT NULL,
    verified BOOLEAN NOT NULL DEFAULT FALSE,
    verified_by UUID REFERENCES public.users(id),
    verified_at TIMESTAMPTZ,
    uploaded_by UUID REFERENCES public.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

### 3. Recursive Graph Traversal & Cycle Prevention Functions

#### Recursive DAG Function: `get_fdr_lineage_graph(p_fdr_id UUID)`
Performs bidirectional Common Table Expression (CTE) search to retrieve all ancestors and descendants:

```sql
CREATE OR REPLACE FUNCTION public.get_fdr_lineage_graph(p_fdr_id UUID)
RETURNS TABLE (
    node_fdr_id UUID,
    fdr_number VARCHAR,
    institution_id UUID,
    parent_fdr_id UUID,
    generation_offset INT,
    relationship_type VARCHAR,
    lifecycle_status VARCHAR,
    amount NUMERIC,
    currency VARCHAR,
    maturity_date DATE,
    trust_tier INT,
    heartbeat_status VARCHAR
) LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    WITH RECURSIVE
    ancestors AS (
        SELECT l.parent_fdr_id AS current_id, l.child_fdr_id AS target_id, -1 AS gen, l.relationship_type
        FROM public.fdr_lineage l WHERE l.child_fdr_id = p_fdr_id
        UNION ALL
        SELECT l.parent_fdr_id, l.child_fdr_id, a.gen - 1, l.relationship_type
        FROM public.fdr_lineage l
        INNER JOIN ancestors a ON l.child_fdr_id = a.current_id
    ),
    descendants AS (
        SELECT l.child_fdr_id AS current_id, l.parent_fdr_id AS source_id, 1 AS gen, l.relationship_type
        FROM public.fdr_lineage l WHERE l.parent_fdr_id = p_fdr_id
        UNION ALL
        SELECT l.child_fdr_id, l.parent_fdr_id, d.gen + 1, l.relationship_type
        FROM public.fdr_lineage l
        INNER JOIN descendants d ON l.parent_fdr_id = d.current_id
    ),
    combined AS (
        SELECT p_fdr_id AS f_id, NULL::UUID AS p_id, 0 AS gen, 'root'::VARCHAR AS rel
        UNION ALL
        SELECT current_id, target_id, gen, relationship_type FROM ancestors
        UNION ALL
        SELECT current_id, source_id, gen, relationship_type FROM descendants
    )
    SELECT DISTINCT ON (c.f_id)
        f.id AS node_fdr_id,
        f.fdr_number,
        f.institution_id,
        c.p_id AS parent_fdr_id,
        c.gen AS generation_offset,
        c.rel AS relationship_type,
        f.lifecycle_status,
        f.amount,
        f.currency,
        f.maturity_date,
        f.trust_tier,
        f.heartbeat_status
    FROM combined c
    JOIN public.fdrs f ON f.id = c.f_id
    ORDER BY c.f_id, c.gen ASC;
END;
$$;
```

#### Cycle Prevention Trigger: `trg_prevent_lineage_cycle`
Enforces graph acyclicity directly in the database engine:
```sql
CREATE OR REPLACE FUNCTION public.prevent_lineage_cycle()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
    cycle_detected BOOLEAN;
BEGIN
    IF NEW.parent_fdr_id = NEW.child_fdr_id THEN
        RAISE EXCEPTION 'Self-referencing lineage is prohibited.';
    END IF;

    WITH RECURSIVE check_path AS (
        SELECT child_fdr_id FROM public.fdr_lineage WHERE parent_fdr_id = NEW.child_fdr_id
        UNION ALL
        SELECT l.child_fdr_id FROM public.fdr_lineage l
        JOIN check_path cp ON l.parent_fdr_id = cp.child_fdr_id
    )
    SELECT EXISTS (SELECT 1 FROM check_path WHERE child_fdr_id = NEW.parent_fdr_id) INTO cycle_detected;

    IF cycle_detected THEN
        RAISE EXCEPTION 'Cyclic dependency detected in FDR lineage graph.';
    END IF;

    RETURN NEW;
END;
$$;
```

---

### 4. Row-Level Security (RLS) Policies

All Phase 5 tables have Row-Level Security enabled. Policies enforce strict multi-tenant isolation:
1. **Institutions**:
   - `SELECT`, `INSERT`, `UPDATE` allowed only when `institution_id = current_user_institution_id()`.
   - `UPDATE` restricted to cases where `status = 'draft'`.
2. **Bank Officers**:
   - `SELECT` allowed on renewal cases and lineage edges where the associated FDR was issued by the officer's bank.
3. **Regulatory & Regional Officers**:
   - `SELECT` across all cases in their jurisdiction (regional or all).
   - `UPDATE` permitted to execute status transitions (`submitted` $\to$ `approved` / `rejected`).
4. **Finance Officers**:
   - `SELECT` permitted for auditing and compliance reporting.
