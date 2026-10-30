# FDR-Chain: Supabase Schema, Migrations & Synchronization Guide

This folder contains the official database definitions, migrations, seed data, and CLI configuration to synchronize **FDR-Chain** with Supabase.

---

## 📁 Directory Structure

```
supabase/
├── config.toml                              # Official Supabase CLI configuration
├── schema.sql                               # Master consolidated schema + RLS (1-Click SQL Editor setup)
├── seed.sql                                 # Complete seed data for local/remote database reset
├── README.md                                # This documentation guide
└── migrations/                              # Chronological Supabase CLI migrations
    ├── 20260101000001_phase1_schema.sql
    ├── 20260101000002_phase1_rls_policies.sql
    ├── 20260101000003_phase2_schema.sql
    ├── 20260101000004_phase2_rls_policies.sql
    ├── 20260101000005_phase3_schema.sql
    ├── 20260101000006_phase3_rls_policies.sql
    ├── 20260101000007_phase4_schema.sql
    ├── 20260101000008_phase4_rls_policies.sql
    ├── 20260101000009_phase5_schema.sql
    ├── 20260101000010_phase5_rls_policies.sql
    ├── 20260101000011_phase6_schema.sql
    ├── 20260101000012_phase6_rls_policies.sql
    ├── 20260101000013_phase7_schema.sql
    ├── 20260101000014_phase7_rls_policies.sql
    ├── 20260101000015_phase8_schema.sql
    └── 20260101000016_phase8_rls_policies.sql
```

---

## 🚀 Synchronization Option 1: Supabase CLI (Recommended)

### Prerequisites
- Node.js (with `npx`)
- A Supabase Project created at [supabase.com](https://supabase.com)

### 1. Authenticate with Supabase
```powershell
npx.cmd supabase login
```

### 2. Link Your Local Project to Remote Supabase
Find your project reference ID in the Supabase Dashboard URL (e.g., `https://supabase.com/dashboard/project/<PROJECT_REF>`):
```powershell
npx.cmd supabase link --project-ref <YOUR_PROJECT_REF>
```

### 3. Push Migrations to Remote Supabase
This automatically applies all 16 chronological migration files in `supabase/migrations/`:
```powershell
npx.cmd supabase db push
```

### 4. (Optional) Run Local Supabase Stack
For 100% offline development with Docker:
```powershell
npx.cmd supabase start
npx.cmd supabase db reset
```

---

## 🌐 Synchronization Option 2: Supabase Web Dashboard (Zero CLI)

If you prefer applying the database schema directly through the Supabase Web Console without installing Docker or linking CLI credentials:

1. Open your project on the [Supabase Dashboard](https://supabase.com/dashboard).
2. Navigate to **SQL Editor** in the left sidebar.
3. Click **New Query**.
4. Open [`supabase/schema.sql`](file:///i:/Richu/Projects/SIH/FDR/supabase/schema.sql), copy its entire content, paste it into the SQL Editor, and click **Run**.
   - *This creates all 22 tables, custom enums, cryptographic triggers, indexes, Row-Level Security (RLS) policies, and provisions storage buckets (`fdr-documents`, `compliance-certificates`).*
5. Click **New Query** again.
6. Open [`supabase/seed.sql`](file:///i:/Richu/Projects/SIH/FDR/supabase/seed.sql), copy its content, paste it into the SQL Editor, and click **Run**.
   - *This seeds canonical roles, regions, banks, branches, institutions, initial deposits, and policies.*

---

## 🔑 Configure Application Environment Variables

Once synchronized, copy your Supabase credentials into the project's environment files:

### Backend ([`backend/.env`](file:///i:/Richu/Projects/SIH/FDR/backend/.env))
```ini
USE_MOCK_SUPABASE=False
SUPABASE_URL=https://<YOUR_PROJECT_REF>.supabase.co
SUPABASE_ANON_KEY=<YOUR_SUPABASE_ANON_KEY>
SUPABASE_SERVICE_ROLE_KEY=<YOUR_SUPABASE_SERVICE_ROLE_KEY>
SUPABASE_JWT_SECRET=<YOUR_SUPABASE_JWT_SECRET>
```

### Frontend ([`frontend/.env`](file:///i:/Richu/Projects/SIH/FDR/frontend/.env))
```ini
VITE_SUPABASE_URL=https://<YOUR_PROJECT_REF>.supabase.co
VITE_SUPABASE_ANON_KEY=<YOUR_SUPABASE_ANON_KEY>
```

> [!CAUTION]
> Never copy `SUPABASE_SERVICE_ROLE_KEY` into `frontend/.env`. The service-role key is for backend server authorization only.
