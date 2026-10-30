# FDR-Chain — Phase 1 Implementation Prompt

## Project Context

You are working on FDR-Chain, a Government-style Security Deposit / Fixed Deposit Receipt (FDR) Management Portal.

The project is being developed for Smart India Hackathon 2026.

The objective is to build a centralized and secure platform for managing institutional security deposit FDRs, including verification, monitoring, renewal, compliance and release workflows.

## Finalized Technology Stack

- Frontend: React + Vite + TypeScript
- UI: Tailwind CSS + shadcn/ui
- Design: Government / Institutional Enterprise
- Icons: Lucide React
- Routing: React Router DOM
- Server state: TanStack Query
- Forms: React Hook Form + Zod
- Database: Supabase PostgreSQL
- Authentication: Supabase Auth
- Authorization: Role-Based Access Control + Supabase RLS
- Storage: Supabase Storage (prepare for future use)
- Backend: Python FastAPI
- Digital signatures in later phases: Ed25519
- Audit integrity in later phases: SHA-256 hash chain

## Mandatory Development Rules

1. Inspect the existing repository before modifying files.
2. Preserve all working code and existing configurations.
3. Do not recreate the project unnecessarily.
4. Use TypeScript strictly.
5. Use reusable components.
6. Keep frontend, backend, database and business logic separated.
7. Never hardcode authentication credentials.
8. Never expose Supabase service-role keys in the frontend.
9. Never allow users to assign their own roles.
10. Enforce permissions using Supabase RLS and server-side authorization.
11. Do not create mock success responses for database operations.
12. Display real loading, success and error states.
13. Use realistic sample data only in clearly marked development seed scripts.
14. Do not implement future-phase modules in Phase 1.
15. Test every important feature before marking it complete.

# PHASE 1 OBJECTIVE

Build the complete authentication, RBAC and institutional master-data foundation.

## 1. Supabase Integration

Connect the React application to the existing Supabase project using environment variables.

Create a reusable Supabase client.

Implement:

- Login
- Logout
- Session persistence
- Email verification handling
- Password reset
- Authentication state management
- Current user retrieval
- Profile retrieval
- Role retrieval

Do not store passwords in application tables.

## 2. User Roles

Implement these six roles:

- institution_user
- bank_nodal_officer
- regional_officer
- bureau_officer
- finance_officer
- system_admin

Retrieve roles from the database.

Do not trust role values from local storage, editable user metadata or frontend request bodies.

## 3. Database

Use the Phase 1 Supabase schema provided in the project specification.

Required tables:

- user_profiles
- roles
- user_roles
- regions
- user_region_scopes
- institutions
- banks
- bank_branches

Use foreign keys, indexes, unique constraints and timestamps.

Enable RLS on all user-facing tables.

Review all policies and ensure users cannot modify their own roles, institution assignment or active status.

Implement a secure first-admin bootstrap process. Never automatically assign administrator privileges to a newly registered user.

If any schema adjustment is required, create a migration and document the reason. Do not silently modify database security rules.

## 4. Authentication UI

Create a professional Government-style login page.

Include:

- FDR-Chain branding
- Project description
- Email input
- Password input
- Show/hide password
- Login button
- Forgot password
- Validation messages
- Loading state
- Authentication errors

Do not add a public administrator registration option.

## 5. Protected Routing

Create reusable:

- ProtectedRoute
- RoleRoute
- AuthProvider
- RoleProvider

Unauthenticated users must be redirected to login.

Authenticated users without permission must see an access-denied page.

The frontend route guard is not a substitute for database RLS.

## 6. Dashboard

Create a reusable dashboard shell.

Display different navigation based on role.

For Phase 1, show relevant welcome information and basic system information. Do not invent FDR counts or financial statistics.

Dashboard placeholders must clearly indicate which modules will become available in later phases.

## 7. Institution Management

Build:

- Institution list
- Add institution form
- Edit institution form
- Institution detail view
- Search
- Region filter
- Active/inactive status
- Pagination

Only authorized administrators may create, edit or deactivate institutions.

Validate institution codes and prevent duplicates.

## 8. Region Management

Build:

- Region list
- Add region
- Edit region
- Region details
- Active/inactive status

Only authorized administrators may manage regions.

## 9. Bank Management

Build:

- Bank list
- Add bank
- Edit bank
- Bank detail page
- Bank branch list
- Add/edit branch
- IFSC validation
- Search and filtering

Do not implement bank FDR verification in this phase.

## 10. User Management

Build:

- User list
- User detail page
- User activation/deactivation
- Institution association
- Role assignment
- Region scope assignment for regional officers

Only administrators can perform privileged user-management actions.

Use a trusted FastAPI endpoint or another secure server-side administrative workflow for account provisioning and privileged role changes.

Do not use the frontend's Supabase client with a service-role key.

## 11. Government UI Design System

Use the following colors:

- Primary navy: #12345A
- Secondary blue: #1D5F91
- Background: #F4F6F9
- Card background: #FFFFFF
- Main text: #1B2733
- Secondary text: #64748B
- Success: #16804A
- Warning: #C58A12
- Danger: #B42318
- Border: #D9E0E8

Use:

- Formal institutional layout
- Sidebar navigation
- Header with user profile and logout
- Clear page titles
- Professional tables
- Consistent forms
- Status labels
- Confirmation dialogs
- Accessible keyboard navigation
- Responsive desktop and mobile layouts

Avoid unnecessary gradients, excessive animations and consumer-fintech styling.

## 12. Backend Foundation

Initialize FastAPI.

Implement:

- Application configuration
- Environment variable management
- Supabase access-token validation
- Current-user authorization dependency
- Central exception handling
- CORS configuration
- Structured logging
- Health endpoint

Do not use a second database.

Supabase PostgreSQL remains the primary database.

## 13. Testing

Test all the following:

- Valid login
- Invalid login
- Logout
- Session persistence
- Password reset
- Inactive account access denial
- User role retrieval
- Unauthorized route access
- Institution CRUD
- Region CRUD
- Bank CRUD
- Branch CRUD
- Role assignment restrictions
- Regional data restrictions
- RLS enforcement using separate test accounts
- Backend token validation
- Frontend build
- Responsive layout

Test using separate accounts representing the six roles.

## 14. Expected Deliverables

Provide:

1. Complete Phase 1 frontend implementation.
2. FastAPI foundation.
3. Supabase integration.
4. Database migrations or SQL scripts.
5. Secure authentication flow.
6. Role-based navigation.
7. Protected routes.
8. Institution management.
9. Region management.
10. Bank and branch management.
11. User management.
12. Error handling.
13. README with Windows setup instructions.
14. Environment variable examples.
15. Testing report.
16. Screenshots of the completed screens.

## 15. Strict Phase Boundary

Implement Phase 1 only.

Do not implement:

- FDR registration
- FDR document upload
- Bank digital signatures
- Trust tiers
- Heartbeat monitoring
- Renewal matching
- FDR lineage
- Release/refund workflows
- AI features
- OCR
- Legacy migration

Prepare clean extension points for these modules, but do not build them now.

## Final Verification

Before completing Phase 1:

- Run the frontend.
- Run the backend.
- Verify Supabase connectivity.
- Verify database schema.
- Test authentication.
- Test RLS.
- Test all role restrictions.
- Test institution, region and bank CRUD.
- Run TypeScript checks and production build.
- Fix all critical errors.

At the end, provide a clear report showing:

- Completed features
- Files created or modified
- Database tables created
- RLS policies created
- Tests passed
- Known issues
- Exact instructions to run the project

Stop after Phase 1 and wait for approval before beginning Phase 2.