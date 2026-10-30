# FDR Monitoring System - Phase 5 Lineage Documentation

## FDR Provenance & Directed Acyclic Graph (DAG) Lineage

### 1. Overview
In institutional regulatory compliance, fixed deposits often span multiple renewal cycles. An initial 5-year deposit registered in 2018 may be renewed in 2023, and rollover again in 2028. Without lineage tracking, regulators cannot trace whether an active deposit originated from an approved security deposit or verify the uninterrupted continuity of reserve funds.

Phase 5 implements a formal **Directed Acyclic Graph (DAG)** lineage engine that connects predecessor (parent) FDRs with successor (child) replacement FDRs.

---

### 2. Graph Model & Topology

#### Nodes (Vertices)
Each node represents an FDR record in the `fdrs` table, containing:
- `id` (UUID)
- `fdr_number` (Unique reference)
- `institution_id` (Tenant isolation)
- `amount` & `currency`
- `lifecycle_status` (`active`, `renewed`, `matured`, `lien_released`)
- `trust_tier` (Tier 1, Tier 2, or Tier 3)
- `heartbeat_status` (`alive`, `stale`, `broken`)
- `generation_offset` (0 = queried node, negative = ancestors, positive = descendants)

#### Edges (Directed Links)
Each edge in `fdr_lineage` represents a verified transition:
$$\text{Parent FDR} \xrightarrow{\text{relationship\_type}} \text{Child FDR}$$
Edges store:
- `parent_fdr_id` (predecessor FDR)
- `child_fdr_id` (replacement FDR, `UNIQUE`)
- `renewal_case_id` (governing approval record)
- `relationship_type` (`renewal`, `rollover`, `split`, `consolidation`, `replacement`)
- `created_at` (audit timestamp)
- `created_by` (approving officer reference)

---

### 3. Multi-Generation Lineage Visualization

```
Gen -2 (Origin 2013)       Gen -1 (Renewal 2018)       Gen 0 (Active 2023)
+-------------------+      +-------------------+      +-------------------+
| FDR-2013-SBI-001  | ---> | FDR-2018-SBI-042  | ---> | FDR-2023-SBI-108  |
| Amount: 50,00,000 |      | Amount: 50,00,000 |      | Amount: 55,00,000 |
| Status: renewed   |      | Status: renewed   |      | Status: active    |
| Tier: 3 (Verified)|      | Tier: 3 (Verified)|      | Tier: 2 (Confirmed|
+-------------------+      +-------------------+      +-------------------+
                                                        (Current Monitored)
```

---

### 4. Mathematical Integrity Guarantees

#### A. Single Predecessor Invariant
$$\forall c \in \text{FDRs}, \quad \text{in-degree}(c) \le 1$$
Enforced by:
```sql
CONSTRAINT uq_child_fdr UNIQUE (child_fdr_id)
```
A replacement deposit can only replace a single predecessor deposit under standard renewals.

#### B. Anti-Reflexivity (No Self-Links)
$$\forall u \in \text{FDRs}, \quad (u, u) \notin \text{Edges}$$
Enforced by:
```sql
CONSTRAINT chk_no_self_link CHECK (parent_fdr_id <> child_fdr_id)
```

#### C. Acyclicity (No Directed Cycles)
$$\nexists \text{ path } u \to v_1 \to v_2 \to \dots \to u$$
Enforced at two distinct defense-in-depth levels:
1. **Application Level**: `renewal_service.py` runs a Breadth-First Search (BFS) starting from `replacement_fdr_id`. If `original_fdr_id` is found in the descendant subgraph, the operation throws an HTTP 400 error.
2. **Database Engine Level**: The trigger `trg_prevent_lineage_cycle` executes a recursive CTE prior to every edge insertion or update. If a cycle is detected, the transaction aborts with a PostgreSQL exception.

---

### 5. Graph Traversal Algorithms

#### Ancestor Traversal (Upward to Root)
Given target node $X$:
1. Base query selects $(P, X)$ from `fdr_lineage`.
2. Recursive term joins $(GP, P)$ from `fdr_lineage` where $P$ is the child.
3. Continues until no parent edge exists.
4. Identifies the original **root deposit**.

#### Descendant Traversal (Downward to Leaf)
Given target node $X$:
1. Base query selects $(X, C)$ from `fdr_lineage`.
2. Recursive term joins $(C, GC)$ where $C$ is the parent.
3. Continues until no child edge exists.
4. Identifies the current **active leaf deposit**.

---

### 6. UI Lineage Explorer Features

1. **`FDRLineageTree` Component**:
   - SVG/CSS rendered tree showing ancestor nodes, active node, and descendant nodes.
   - Distinct generational badges (`Origin / Root`, `Gen -1`, `Current Target`, `Gen +1`, `Latest Active`).
   - Node detail cards showing lifecycle status, trust tier badge, issuing bank, principal amount, and maturity date.
   - Direct link navigation to authorized FDR detail pages.

2. **`LineageTimeline` Component**:
   - Vertical timeline displaying the chronological progression of renewal events.
   - Highlights amount changes, interest rate adjustments, approving officers, and case numbers.
