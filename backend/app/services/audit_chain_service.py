"""
FDR-Chain Audit Chain Service (SHA-256 Cryptographic Hash-Chain)

Implements an append-only, tamper-evident SHA-256 hash-chain for FDR audit events.
Adheres to Phase 9 Audit Integrity Requirements:
  - Every event block contains:
      1. prev_event_hash: SHA-256 hash of the immediate predecessor (or 64 zeros for genesis block)
      2. event_hash: SHA-256 hash of (prev_event_hash + canonical_json(event_payload))
  - Verification mathematically guarantees:
      - No event in the historical chain can be inserted, edited, or deleted without breaking all downstream hashes.
      - Canonical serialization prevents whitespace or formatting ambiguities.
"""

import hashlib
from typing import List, Dict, Any, Tuple, Optional
from app.services.canonical_json import canonical_serialize

GENESIS_HASH = "0" * 64

class AuditChainService:
    @staticmethod
    def compute_event_hash(prev_hash: str, event_data: Dict[str, Any]) -> str:
        """
        Computes deterministic SHA-256 event hash over prev_hash and canonical event data.
        Excludes volatile fields like 'event_hash' itself during hashing.
        """
        payload = {
            "id": str(event_data.get("id", "")),
            "fdr_id": str(event_data.get("fdr_id", "")),
            "institution_id": str(event_data.get("institution_id", "")),
            "actor_id": str(event_data.get("actor_id", "")),
            "event_type": str(event_data.get("event_type", "")),
            "description": str(event_data.get("description", "")),
            "metadata": event_data.get("metadata", {}),
            "created_at": event_data.get("created_at")
        }
        canonical_bytes = canonical_serialize(payload)
        hasher = hashlib.sha256()
        hasher.update(prev_hash.encode("utf-8"))
        hasher.update(canonical_bytes)
        return hasher.hexdigest()

    @classmethod
    def chain_events(cls, events: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Chains a chronological list of events (oldest first), assigning prev_event_hash
        and event_hash to each block.
        """
        prev_hash = GENESIS_HASH
        for event in events:
            event["prev_event_hash"] = prev_hash
            curr_hash = cls.compute_event_hash(prev_hash, event)
            event["event_hash"] = curr_hash
            prev_hash = curr_hash
        return events

    @classmethod
    def verify_chain(cls, events: List[Dict[str, Any]]) -> Tuple[bool, Optional[str], int]:
        """
        Verifies the cryptographic integrity of an event chain.
        Events must be provided in chronological order (oldest first).
        
        Returns:
            Tuple[is_valid (bool), error_message (Optional[str]), verified_blocks (int)]
        """
        if not events:
            return True, None, 0

        prev_hash = GENESIS_HASH
        for idx, event in enumerate(events):
            expected_prev = event.get("prev_event_hash")
            if expected_prev != prev_hash:
                return (
                    False,
                    f"Chain break at block {idx} (ID: {event.get('id')}): "
                    f"expected prev_hash {prev_hash[:16]}..., found {str(expected_prev)[:16]}...",
                    idx
                )

            recorded_hash = event.get("event_hash")
            calculated_hash = cls.compute_event_hash(prev_hash, event)

            if recorded_hash != calculated_hash:
                return (
                    False,
                    f"Tamper detected at block {idx} (ID: {event.get('id')}): "
                    f"recorded hash {str(recorded_hash)[:16]}... does not match calculated {calculated_hash[:16]}...",
                    idx
                )

            prev_hash = calculated_hash

        return True, None, len(events)

audit_chain_service = AuditChainService()
