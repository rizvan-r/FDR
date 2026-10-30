# FDR-Chain: Demo Personas & Safe Credentials Guide

## 1. Overview

For demonstration, evaluation, and security boundary testing, **FDR-Chain** provides preconfigured development personas across all organizational tiers. These accounts are seeded with realistic institutional metadata, roles, and organizational boundaries.

> [!NOTE]
> All credentials listed below are designated **strictly for local development and demonstration purposes**. No production keys, real bank credentials, or actual government credentials are used.

---

## 2. Preconfigured Demo Accounts

| Persona / Name | Email | Password | Role | Entity / Department | Key Capabilities |
|---|---|---|---|---|---|
| **Rajesh Sharma**<br>*(Senior Finance Officer)* | `officer.nhai@fdrchain.gov.in` | `DemoPass@2026` | `institution_officer` | National Highways Authority of India (NHAI) | • Create & edit FDR drafts<br>• Upload deposit receipts<br>• Request CBS verification<br>• Initiate release scrutiny |
| **Priya Sundaram**<br>*(Chief Financial Officer)* | `admin.nhai@fdrchain.gov.in` | `DemoPass@2026` | `institution_admin` | National Highways Authority of India (NHAI) | • Approve/reject release requests<br>• Configure institutional limits<br>• Dual-sign release mandates<br>• Manage department users |
| **Amitabh Sen**<br>*(SBI Branch Manager)* | `bank.sbi@fdrchain.gov.in` | `DemoPass@2026` | `bank_representative` | State Bank of India (Main Branch) | • Review verification requests<br>• Issue CBS confirmation tokens<br>• Generate Ed25519 digital attestations<br>• Receive bank release instructions |
| **Vikramaditya Rao**<br>*(Principal Auditor)* | `auditor.cag@fdrchain.gov.in` | `DemoPass@2026` | `auditor` | Comptroller and Auditor General (CAG) | • Read-only inspection of all FDRs<br>• Verify SHA-256 hash chains<br>• Export compliance packs<br>• Audit trail validation |
| **Sunil Mehta**<br>*(National System Admin)* | `sysadmin@fdrchain.gov.in` | `DemoPass@2026` | `system_admin` | Ministry of Finance / NIC | • Register bank public keys<br>• Configure heartbeat engine rules<br>• View system telemetry<br>• Platform health monitoring |
| **Kavita Menon**<br>*(DMRC Accounts Officer)* | `officer.dmrc@fdrchain.gov.in` | `DemoPass@2026` | `institution_officer` | Delhi Metro Rail Corporation (DMRC) | • Multi-tenant isolation testing<br>• Zero visibility into NHAI portfolio<br>• Independent DMRC ledger |

---

## 3. Fast Persona Switching in UI

During an interactive evaluation, you can switch personas without manual logout/login cycles:

1. Click on the **User Profile badge** in the top-right corner of the application header.
2. Select **"Switch Persona (Demo Mode)"**.
3. Choose any of the preconfigured roles to instantly reload the portal with that persona's permissions, institution boundaries, and navigation items.

---

## 4. Multi-Tenant Cross-Isolation Demonstration

To demonstrate institutional data privacy:

1. Log in as **Rajesh Sharma (`officer.nhai@fdrchain.gov.in`)**.
   - Note the FDR list showing NHAI highway concessionaire deposits (e.g. `FDR-2026-NHAI-001`).
2. Switch to **Kavita Menon (`officer.dmrc@fdrchain.gov.in`)**.
   - Observe that the NHAI FDRs **completely disappear** from view. Only DMRC metro rail project deposits are visible.
   - Any attempt to directly fetch an NHAI record via URL/API returns `HTTP 404 Not Found` or `HTTP 403 Forbidden`.
