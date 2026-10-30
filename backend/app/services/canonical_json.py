"""
Deterministic Canonical JSON Serialization Module (RFC 8785 Prototype Convention)

This module implements deterministic canonical serialization for Ed25519 digital signatures.
Adheres to Section 6 of the FDR-Chain Phase 3 specification:
  1. Lexicographical sorting of JSON object keys.
  2. UTF-8 character encoding without BOM.
  3. Strict elimination of insignificant whitespace (separators=(',', ':')).
  4. Disallowance of IEEE-754 special values (NaN, Infinity, -Infinity).
  5. Monetary amounts represented as formatted decimal strings (e.g. "25000000.00").
  6. Normalization of ISO timestamps to UTC format.

Migration Path Documentation:
In production banking deployments, this convention maps directly to JSON Canonicalization 
Scheme (JCS - RFC 8785) and ETSI TS 119 182-1 (JAdES - JSON Advanced Electronic Signatures).
"""

import json
from decimal import Decimal
from datetime import datetime, timezone
from typing import Any, Dict

class CanonicalJSONEncoder(json.JSONEncoder):
    def default(self, obj: Any) -> Any:
        if isinstance(obj, Decimal):
            return str(obj)
        if isinstance(obj, datetime):
            # Normalize to ISO 8601 UTC with 'Z' suffix
            if obj.tzinfo is None:
                obj = obj.replace(tzinfo=timezone.utc)
            else:
                obj = obj.astimezone(timezone.utc)
            return obj.strftime("%Y-%m-%dT%H:%M:%SZ")
        return super().default(obj)

def canonical_serialize(payload: Dict[str, Any]) -> bytes:
    """
    Serializes a dictionary into canonical UTF-8 bytes for Ed25519 signing or verification.
    """
    # json.dumps with sort_keys=True, separators=(',', ':'), allow_nan=False
    canonical_str = json.dumps(
        payload,
        cls=CanonicalJSONEncoder,
        sort_keys=True,
        separators=(',', ':'),
        allow_nan=False,
        ensure_ascii=False
    )
    return canonical_str.encode('utf-8')
