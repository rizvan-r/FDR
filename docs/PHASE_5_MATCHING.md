# FDR Monitoring System - Phase 5 Candidate Matching Documentation

## Advisory 6-Signal Candidate Matching Engine

### 1. Overview & Architectural Philosophy
The renewal matching engine (`backend/app/services/matching_service.py`) provides intelligent advisory assistance to reviewing officers and institutions when identifying potential replacement fixed deposits for an expiring or matured FDR.

#### The Golden Advisory Guarantee
> [!IMPORTANT]
> **Matching is strictly advisory.** The matching engine **never** commits a lineage link, **never** automatically transitions a case to `approved`, and **never** replaces human officer review. The score and breakdown serve solely as a decision-support heuristic to accelerate review queues and highlight discrepancies.

---

### 2. Matching Signals & Scoring Matrix

The engine evaluates candidate FDRs across 6 weighted signals totaling 100 points:

| Signal | Name | Weight | Evaluation Logic | Discrepancy Triggered |
| :---: | :--- | :---: | :--- | :--- |
| **1** | **Bank Identity** | **25 pts** | Exact case-insensitive match on `bank_name` earns full 25 pts. | `Different issuing bank: {orig} vs {cand}` |
| **2** | **Branch Identity** | **15 pts** | Exact match on branch name or IFSC code earns 15 pts. Same bank but different branch earns 5 pts partial credit. | `Branch mismatch: {orig} vs {cand}` |
| **3** | **Deposit Amount** | **25 pts** | Exact amount match ($\Delta = 0$) earns 25 pts. Minor variation ($\le 2\%$ difference, e.g. accrued interest or roundoff) earns 20 pts. Moderate difference ($\le 10\%$) earns 10 pts. Larger difference earns 0 pts. | `Deposit amount decreased by INR {diff}` or `Deposit amount increased by INR {diff}` |
| **4** | **Chronological Continuity** | **15 pts** | Replacement deposit start date starts within $[-7, +45]$ days of original FDR maturity date. If within $[-3, +15]$ days: 15 pts. If $[-7, +45]$ days: 10 pts. Gap $> 45$ days: 0 pts. Replacement starts $> 30$ days *before* maturity: 0 pts. | `Chronological gap of {days} days between original maturity and replacement issuance` |
| **5** | **Lien / AICTE Joint Marking**| **10 pts** | Evaluates whether replacement FDR carries `lien_marked == True` and joint holder matches AICTE/Regulatory beneficiary. Full 10 pts if confirmed. | `Replacement FDR does not currently show AICTE lien marking` |
| **6** | **Reference & Remarks** | **10 pts** | Checks if replacement FDR's remarks, renewal note, or FDR number cross-references original FDR number (or vice-versa). | (Informational bonus signal) |

---

### 3. Absolute Institution Isolation Rule
Before evaluating any of the 6 signals, the matching service checks:
$$\text{candidate.institution\_id} == \text{original.institution\_id}$$
If the institution IDs do not match, the candidate is **immediately assigned a score of 0.00** and marked as disqualified. Cross-institution renewals are categorically prohibited by security policy.

---

### 4. Confidence Classification

The composite score maps directly to confidence tiers:

| Composite Score | Confidence Tier | UI Badge Color | Officer Advisory Guideline |
| :---: | :---: | :---: | :--- |
| **85.00 – 100.00** | `high` | Emerald Green | High probability rollover. Check for required bank confirmation and verify evidence documents. |
| **60.00 – 84.99** | `medium` | Amber Yellow | Moderate alignment. Review identified discrepancies (e.g. branch change or interest capitalisation). |
| **30.00 – 59.99** | `low` | Orange / Red | Weak alignment. Significant differences in amounts, dates, or branch. Thorough manual scrutiny required. |
| **0.00 – 29.99** | `none` | Slate Gray | Minimal to no correlation. Likely an unrelated deposit. |

---

### 5. Discrepancy Reporting Format
The matching engine returns structured JSON discrepancies for every deviation detected, enabling the frontend `FDRComparisonPanel` and `RenewalMatchScore` components to render exact discrepancy tags:

```json
{
  "score": 85.0,
  "confidence": "high",
  "matched_signals": [
    "Identical issuing bank: State Bank of India",
    "Identical bank branch: New Delhi Main Branch",
    "Identical deposit principal amount: INR 10,000,000.00",
    "Continuous chronology: Replacement starts on original maturity date",
    "Confirmed AICTE lien marked on replacement record"
  ],
  "discrepancies": [
    "No explicit cross-reference to original FDR-2023-SBI-001 found in remarks"
  ]
}
```

---

### 6. Candidate Ranking & Search Query
The endpoint `POST /api/v1/renewals/cases/matching/candidates` evaluates candidates dynamically:
1. Fetches candidate pool from the same institution.
2. Filters out the original FDR itself (preventing self-matching).
3. Filters out FDRs that already serve as child replacement FDRs in existing approved lineage records (`fdr_lineage`).
4. Computes 6-signal breakdown for each candidate.
5. Sorts candidates by composite score descending.
6. Returns top candidates with matching metadata and discrepancy arrays.
