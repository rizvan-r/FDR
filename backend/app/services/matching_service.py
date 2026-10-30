import logging
from typing import Dict, Any, List, Optional
from datetime import datetime, date
from decimal import Decimal

logger = logging.getLogger("fdr_chain.matching_service")

class RenewalMatchingService:
    """
    Advisory matching engine evaluating potential replacement FDR candidates
    against an original parent FDR using a transparent weighted scoring matrix.
    
    IMPORTANT: Matching suggestions are advisory only and NEVER create lineage
    links or approve cases automatically.
    """

    WEIGHTS = {
        "bank_match": 20.0,
        "branch_match": 10.0,
        "amount_match": 25.0,
        "chronological_validity": 15.0,
        "lien_match": 15.0,
        "reference_signal": 15.0,
    }

    def evaluate_candidate(
        self,
        parent_fdr: Dict[str, Any],
        candidate_fdr: Dict[str, Any],
        renewal_reference: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Evaluates a single candidate deposit against the parent deposit.
        Returns match_score (0.0 to 100.0), confidence level, positive factors,
        and mismatched fields.
        """
        # Strict Isolation: Candidates MUST belong to the exact same institution
        if str(parent_fdr.get("institution_id")) != str(candidate_fdr.get("institution_id")):
            return {
                "match_score": 0.0,
                "confidence_level": "low",
                "matching_factors": [],
                "mismatched_fields": ["institution_id (Cross-institution reference prohibited)"],
                "explanation": "Disqualified: Candidate deposit belongs to a different beneficiary institution.",
            }

        # Parent and candidate cannot be identical
        if str(parent_fdr.get("id")) == str(candidate_fdr.get("id")):
            return {
                "match_score": 0.0,
                "confidence_level": "low",
                "matching_factors": [],
                "mismatched_fields": ["id (Self-reference prohibited)"],
                "explanation": "Disqualified: Candidate cannot be the parent deposit itself.",
            }

        score = 0.0
        factors: List[str] = []
        mismatches: List[str] = []

        # 1. Depository Bank Match (20 pts)
        parent_bank = str(parent_fdr.get("bank_id"))
        cand_bank = str(candidate_fdr.get("bank_id"))
        if parent_bank and cand_bank and parent_bank == cand_bank:
            score += self.WEIGHTS["bank_match"]
            factors.append(f"Identical Depository Bank ({candidate_fdr.get('bank_name', 'Matching Bank')})")
        else:
            mismatches.append(f"Depository Bank difference ({parent_fdr.get('bank_name')} vs {candidate_fdr.get('bank_name')})")

        # 2. Branch / IFSC Match (10 pts)
        parent_ifsc = str(parent_fdr.get("ifsc_code", "")).strip().upper()
        cand_ifsc = str(candidate_fdr.get("ifsc_code", "")).strip().upper()
        parent_branch = str(parent_fdr.get("branch_id", ""))
        cand_branch = str(candidate_fdr.get("branch_id", ""))
        if (parent_ifsc and cand_ifsc and parent_ifsc == cand_ifsc) or (parent_branch and cand_branch and parent_branch == cand_branch):
            score += self.WEIGHTS["branch_match"]
            factors.append(f"Matching Depository Branch / IFSC ({cand_ifsc or 'Same Branch'})")
        else:
            mismatches.append(f"Branch / IFSC variation ({parent_ifsc or 'N/A'} vs {cand_ifsc or 'N/A'})")

        # 3. Security Amount Match (25 pts)
        try:
            parent_amt = Decimal(str(parent_fdr.get("amount", 0)))
            cand_amt = Decimal(str(candidate_fdr.get("amount", 0)))

            if cand_amt == parent_amt:
                score += self.WEIGHTS["amount_match"]
                factors.append(f"Exact Security Principal Matched: INR ₹{cand_amt:,.2f}")
            elif cand_amt > parent_amt:
                # Slightly discounted if higher, but fully acceptable
                score += self.WEIGHTS["amount_match"] * 0.9
                factors.append(f"Higher Security Coverage: INR ₹{cand_amt:,.2f} (Exceeds original ₹{parent_amt:,.2f})")
            else:
                pct_diff = abs(parent_amt - cand_amt) / parent_amt if parent_amt > 0 else 1
                if pct_diff <= Decimal("0.05"):
                    score += self.WEIGHTS["amount_match"] * 0.6
                    factors.append(f"Security Principal within 5% variance: INR ₹{cand_amt:,.2f} vs ₹{parent_amt:,.2f}")
                else:
                    mismatches.append(f"Principal Shortfall: INR ₹{cand_amt:,.2f} is lower than required ₹{parent_amt:,.2f}")
        except Exception as e:
            logger.warning(f"Error comparing amounts: {e}")
            mismatches.append("Unable to parse numerical deposit amounts")

        # 4. Chronological Validity (15 pts)
        def parse_date(d):
            if isinstance(d, str):
                return datetime.strptime(d[:10], "%Y-%m-%d").date()
            if isinstance(d, datetime):
                return d.date()
            return d

        parent_issue = parse_date(parent_fdr.get("issue_date"))
        cand_issue = parse_date(candidate_fdr.get("issue_date"))
        parent_mat = parse_date(parent_fdr.get("maturity_date"))
        cand_mat = parse_date(candidate_fdr.get("maturity_date"))

        if parent_mat and cand_mat and cand_mat > parent_mat:
            if parent_issue and cand_issue and cand_issue >= parent_issue:
                score += self.WEIGHTS["chronological_validity"]
                factors.append(f"Sequential Renewal Term: Extended to {cand_mat.strftime('%d-%b-%Y')} (Original matured {parent_mat.strftime('%d-%b-%Y')})")
            else:
                score += self.WEIGHTS["chronological_validity"] * 0.7
                factors.append(f"Maturity Extended to {cand_mat.strftime('%d-%b-%Y')}")
        else:
            mismatches.append(f"Maturity date discrepancy: Candidate matures {cand_mat} (not after original {parent_mat})")

        # 5. Statutory Lien In Favour (15 pts)
        parent_lien = str(parent_fdr.get("lien_in_favour", "")).strip().lower()
        cand_lien = str(candidate_fdr.get("lien_in_favour", "")).strip().lower()
        if parent_lien and cand_lien and (parent_lien == cand_lien or parent_lien in cand_lien or cand_lien in parent_lien):
            score += self.WEIGHTS["lien_match"]
            factors.append(f"Statutory Beneficiary Lien Preserved: '{candidate_fdr.get('lien_in_favour')}'")
        else:
            mismatches.append(f"Lien Pledgee Discrepancy: '{candidate_fdr.get('lien_in_favour')}' vs original '{parent_fdr.get('lien_in_favour')}'")

        # 6. Renewal Reference / Number Signal (15 pts)
        ref_matched = False
        cand_num = str(candidate_fdr.get("fdr_number", "")).strip().lower()
        parent_num = str(parent_fdr.get("fdr_number", "")).strip().lower()
        cand_rem = str(candidate_fdr.get("remarks", "")).strip().lower()

        if renewal_reference:
            clean_ref = str(renewal_reference).strip().lower()
            if clean_ref in cand_num or clean_ref in cand_rem or parent_num in clean_ref:
                ref_matched = True

        # Check if numbers share digits or remarks reference original
        if parent_num and (parent_num in cand_rem or parent_num in cand_num):
            ref_matched = True

        if ref_matched:
            score += self.WEIGHTS["reference_signal"]
            factors.append("Explicit renewal cross-reference detected in deposit records")
        else:
            # Check for partial prefix/suffix heuristic
            if len(parent_num) >= 6 and len(cand_num) >= 6:
                if parent_num[:4] == cand_num[:4] or parent_num[-4:] == cand_num[-4:]:
                    score += self.WEIGHTS["reference_signal"] * 0.5
                    factors.append("Heuristic identifier similarity detected in FDR numbers")

        final_score = round(min(score, 100.0), 2)
        if final_score >= 85.0:
            confidence = "high"
            summary_desc = f"Strong candidate deposit ({final_score}% match). Bank standing, amount, and term align with regulatory renewal requirements."
        elif final_score >= 60.0:
            confidence = "moderate"
            summary_desc = f"Moderate match ({final_score}%). Review flagged mismatches ({', '.join(mismatches[:2])}) before proceeding."
        else:
            confidence = "low"
            summary_desc = f"Low correlation ({final_score}%). Significant discrepancies detected; officer verification essential."

        return {
            "match_score": final_score,
            "confidence_level": confidence,
            "matching_factors": factors,
            "mismatched_fields": mismatches,
            "explanation": summary_desc,
        }

    def find_suggestions(
        self,
        parent_fdr: Dict[str, Any],
        candidate_pool: List[Dict[str, Any]],
        renewal_reference: Optional[str] = None,
        min_threshold: float = 30.0,
    ) -> List[Dict[str, Any]]:
        """
        Scans a pool of candidate FDRs and returns sorted suggestions
        exceeding the advisory threshold.
        """
        results = []
        for cand in candidate_pool:
            # Ignore self
            if str(cand.get("id")) == str(parent_fdr.get("id")):
                continue
            # Must belong to same institution
            if str(cand.get("institution_id")) != str(parent_fdr.get("institution_id")):
                continue
            # Skip if already marked 'renewed' or 'released'
            if cand.get("lifecycle_status") in ("renewed", "released", "invoked"):
                continue

            eval_res = self.evaluate_candidate(parent_fdr, cand, renewal_reference)
            if eval_res["match_score"] >= min_threshold:
                results.append({
                    "candidate_fdr_id": str(cand["id"]),
                    "candidate_fdr_number": str(cand.get("fdr_number")),
                    "bank_name": str(cand.get("bank_name")),
                    "branch_name": cand.get("branch_name"),
                    "amount": Decimal(str(cand.get("amount", 0))),
                    "currency": str(cand.get("currency", "INR")),
                    "issue_date": cand.get("issue_date"),
                    "maturity_date": cand.get("maturity_date"),
                    "trust_tier": cand.get("trust_tier", 1),
                    "heartbeat_status": cand.get("heartbeat_status", "not_started"),
                    "match_score": eval_res["match_score"],
                    "confidence_level": eval_res["confidence_level"],
                    "matching_factors": eval_res["matching_factors"],
                    "mismatched_fields": eval_res["mismatched_fields"],
                    "explanation": eval_res["explanation"],
                })

        # Sort: highest score first
        return sorted(results, key=lambda x: x["match_score"], reverse=True)

    def find_candidates(
        self,
        parent_fdr: Dict[str, Any],
        candidate_pool: List[Dict[str, Any]],
        renewal_reference: Optional[str] = None,
        min_threshold: float = 0.0,
    ) -> Any:
        from datetime import timezone
        from app.schemas.renewal import RenewalMatchResult
        suggestions = self.find_suggestions(parent_fdr, candidate_pool, renewal_reference, min_threshold)
        candidates = []
        for s in suggestions:
            c = dict(s)
            c["score"] = s["match_score"]
            candidates.append(c)
        return RenewalMatchResult(
            parent_fdr_id=parent_fdr.get("id"),
            evaluated_at=datetime.now(timezone.utc),
            total_candidates_evaluated=len(candidate_pool),
            candidates=candidates,
            suggestions=suggestions,
            advisory_notice="Matching suggestions are advisory only and must never be interpreted as automatic approval or legal lineage."
        )


matching_service = RenewalMatchingService()
candidate_matching_service = matching_service
