"""
Mock Bank Cryptographic Signing Environment (Phase 3 Demonstration)

This module holds private signing keys for the simulated banking sector environment.
Strict Phase 3 Rule:
Private keys are isolated exclusively to this backend service and are NEVER exposed
to the React client, Supabase public tables, browser storage, or public APIs.
"""

import os
import uuid
from datetime import datetime, timezone
from typing import Dict, Any, Tuple
from cryptography.hazmat.primitives.asymmetric import ed25519
from cryptography.hazmat.primitives import serialization
from app.services.canonical_json import canonical_serialize

# Deterministic simulated bank keypairs for Phase 3 prototype
MOCK_BANK_REGISTRY: Dict[str, Dict[str, str]] = {
    "SBIN": {
        "bank_name": "State Bank of India",
        "key_id": "SBIN-ED25519-2026-01",
        "priv_hex": "3d604b9ba4e7927f0b687d8b42b0da173267ff9520621c667ef159840c8d5416",
        "pub_hex": "4ae45b402bc3a4c1f5083e9622dd20a19706606bd3ff01eba0849b9160a601b7",
        "pub_pem": "-----BEGIN PUBLIC KEY-----\nMCowBQYDK2VwAyEASuRbQCvDpMH1CD6WIt0goZcGYGvT/wHroISbkWCmAbc=\n-----END PUBLIC KEY-----",
    },
    "PUNB": {
        "bank_name": "Punjab National Bank",
        "key_id": "PUNB-ED25519-2026-01",
        "priv_hex": "a02090f47428cfb3839a95337b817449d4378ddf813f5de3e53b86bdb8ae9245",
        "pub_hex": "832355f842a050cb32c1c37753130f9adea009913fed1a080f529a3977f3fac8",
        "pub_pem": "-----BEGIN PUBLIC KEY-----\nMCowBQYDK2VwAyEAgyNV+EKgUMsywcN3UxMPmt6gCZE/7RoID1KaOXfz+sg=\n-----END PUBLIC KEY-----",
    },
    "BARB": {
        "bank_name": "Bank of Baroda",
        "key_id": "BARB-ED25519-2026-01",
        "priv_hex": "51a017a114480b8607d91a00a511cffaa78104b933ed616a333a44c7e3950f57",
        "pub_hex": "07c5396a2b602602d32bad32de119124787004296da77d36241b8565599acb8c",
        "pub_pem": "-----BEGIN PUBLIC KEY-----\nMCowBQYDK2VwAyEAB8U5aitgJgLTK60y3hGRJHhwBCltp302JBuFZVmay4w=\n-----END PUBLIC KEY-----",
    },
    "CNRB": {
        "bank_name": "Canara Bank",
        "key_id": "CNRB-ED25519-2026-01",
        "priv_hex": "a727aaff748cf93c96357896c957982f910b2b409ebfc05357e1115c1e8c3a7f",
        "pub_hex": "7cd5f199aa741778ce2f4591a55904800eb5c59c25557d1c2e6949e5da3b76bb",
        "pub_pem": "-----BEGIN PUBLIC KEY-----\nMCowBQYDK2VwAyEAfNXxmap0F3jOL0WRpVkEgA61xZwlVX0cLmlJ5do7drs=\n-----END PUBLIC KEY-----",
    },
    "HDFC": {
        "bank_name": "HDFC Bank Limited",
        "key_id": "HDFC-ED25519-2026-01",
        "priv_hex": "4bc2053cb32b7b664d1b9d7d4ff14d574a7c0d8010af5700e20b8878c9ab29c5",
        "pub_hex": "b42345ef9ede63b8834fbb09505b9d93029668bd2a0a259c7e33684d9f129bd3",
        "pub_pem": "-----BEGIN PUBLIC KEY-----\nMCowBQYDK2VwAyEAtCNF757eY7iDT7sJUFudkwKWaL0qCiWcfjNoTZ8Sm9M=\n-----END PUBLIC KEY-----",
    },
    "ICIC": {
        "bank_name": "ICICI Bank Limited",
        "key_id": "ICIC-ED25519-2026-01",
        "priv_hex": "64795fca42800a321b95653b0e29feafbc626be0905a25ea8a53ae0f0e25509c",
        "pub_hex": "ff1d12d066fa8389bf2d8c8e3e9c997dd12ba4f0b959055e447967f3b7354e2b",
        "pub_pem": "-----BEGIN PUBLIC KEY-----\nMCowBQYDK2VwAyEA/x0S0Gb6g4m/LYyOPpyZfdErpPC5WQVeRHln87c1Tis=\n-----END PUBLIC KEY-----",
    },
}

class MockBankSigningService:
    @staticmethod
    def get_bank_info(bank_code: str) -> Dict[str, str]:
        bank_code = bank_code.upper()
        if bank_code not in MOCK_BANK_REGISTRY:
            raise ValueError(f"Mock bank '{bank_code}' not provisioned in simulated environment.")
        return MOCK_BANK_REGISTRY[bank_code]

    @staticmethod
    def generate_signed_payload(bank_code: str, fdr_record: Dict[str, Any], key_id: str = None) -> Tuple[Dict[str, Any], str]:
        """
        Builds the canonical JSON payload according to Section 6 specification,
        and digitally signs it using the bank's Ed25519 private key.
        Returns (signed_payload_dict, signature_hex_string).
        """
        bank_code = bank_code.upper()
        bank_info = MockBankSigningService.get_bank_info(bank_code)
        target_key_id = key_id or bank_info["key_id"]

        # Parse and format monetary amount as standard decimal string (e.g. '25000000.00')
        raw_amt = fdr_record.get("amount")
        amt_str = f"{float(raw_amt):.2f}"

        # High-entropy single-use nonce
        nonce = f"nonce-{uuid.uuid4().hex}"
        issued_at = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

        payload: Dict[str, Any] = {
            "schema_version": "1.0",
            "issuer": bank_code,
            "audience": "fdr-chain-gov",
            "key_id": target_key_id,
            "nonce": nonce,
            "issued_at": issued_at,
            "institution_code": str(fdr_record.get("institution_code", "")),
            "bank_code": bank_code,
            "branch_ifsc": str(fdr_record.get("ifsc_code", "")),
            "fdr_number": str(fdr_record.get("fdr_number", "")),
            "amount": amt_str,
            "currency": str(fdr_record.get("currency", "INR")),
            "issue_date": str(fdr_record.get("issue_date", "")),
            "maturity_date": str(fdr_record.get("maturity_date", "")),
            "lien_in_favour": str(fdr_record.get("lien_in_favour", "")),
        }

        # Canonicalize and sign
        canonical_bytes = canonical_serialize(payload)
        priv_bytes = bytes.fromhex(bank_info["priv_hex"])
        private_key = ed25519.Ed25519PrivateKey.from_private_bytes(priv_bytes)

        sig_bytes = private_key.sign(canonical_bytes)
        sig_hex = sig_bytes.hex()

        return payload, sig_hex

    @staticmethod
    def generate_new_keypair() -> Dict[str, str]:
        """Utility for admin key creation demo"""
        priv = ed25519.Ed25519PrivateKey.generate()
        pub = priv.public_key()
        pub_pem = pub.public_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PublicFormat.SubjectPublicKeyInfo
        ).decode("utf-8")
        pub_raw_hex = pub.public_bytes(
            encoding=serialization.Encoding.Raw,
            format=serialization.PublicFormat.Raw
        ).hex()
        return {
            "algorithm": "Ed25519",
            "public_key_pem": pub_pem.strip(),
            "public_key_raw_hex": pub_raw_hex,
        }
