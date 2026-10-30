# FDR-Chain: Database Setup & Migrations (Phase 1)

This directory contains the complete database setup for **FDR-Chain: Institutional Fixed Deposit Receipt Management Portal**.

## Setup Instructions (Supabase)

1. Open your [Supabase Dashboard](https://supabase.com/dashboard).
2. Go to **SQL Editor** in the left sidebar.
3. Run the scripts in the following sequential order:
   - **`01_phase1_schema.sql`**: Creates tables, custom enum types, constraints, foreign keys, and indexes.
   - **`02_rls_policies.sql`**: Establishes strict Row-Level Security (RLS) policies and security helper functions.
   - **`03_seed_data.sql`**: Seeds canonical roles, Indian regions, national banks, branches with standard IFSCs, government institutions, and bootstrap administrative triggers.

## Admin Provisioning (First Administrator)

To assign the `system_admin` role to your registered user, run the following in Supabase SQL Editor after registering via the portal:

```sql
CALL public.bootstrap_system_admin('your-email@example.com');
```

## Security Design

- **No Passwords Stored in Application Tables**: Managed securely via Supabase Auth.
- **Strict Role Elevation Prevention**: Normal users cannot modify their roles, institution assignment, or status.
- **RLS Enforced**: Direct Supabase queries are protected at the database row level.
