import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { RoleRoute } from './components/auth/RoleRoute';
import { DashboardLayout } from './components/layout/DashboardLayout';

// Auth Pages
import { LoginPage } from './pages/auth/LoginPage';
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/auth/ResetPasswordPage';

// Phase 3: Bank Verification & Crypto Pages
import { BankVerificationPage } from './pages/bank/BankVerificationPage';
import { MockBankPortalPage } from './pages/bank/MockBankPortalPage';
import { BankKeysPage } from './pages/admin/BankKeysPage';

// Phase 4: Heartbeat Monitoring & Surveillance Pages
import { HeartbeatDashboardPage } from './pages/heartbeat/HeartbeatDashboardPage';
import { HeartbeatMonitoringPage } from './pages/heartbeat/HeartbeatMonitoringPage';
import { AlertCenterPage } from './pages/heartbeat/AlertCenterPage';
import { HeartbeatPolicyPage } from './pages/admin/HeartbeatPolicyPage';

// Phase 5: Renewal Management & FDR Lineage Pages
import { RenewalDashboardPage } from './pages/renewals/RenewalDashboardPage';
import { CreateRenewalPage } from './pages/renewals/CreateRenewalPage';
import { RenewalReviewPage } from './pages/renewals/RenewalReviewPage';
import { RenewalApprovalQueuePage } from './pages/renewals/RenewalApprovalQueuePage';
import { FDRLineagePage } from './pages/fdrs/FDRLineagePage';

// Main Pages
import { DashboardOverviewPage } from './pages/dashboard/DashboardOverviewPage';
import { FDRListPage } from './pages/fdrs/FDRListPage';
import { FDRRegisterPage } from './pages/fdrs/FDRRegisterPage';
import { FDRDetailPage } from './pages/fdrs/FDRDetailPage';
import { InstitutionsListPage } from './pages/institutions/InstitutionsListPage';
import { InstitutionDetailPage } from './pages/institutions/InstitutionDetailPage';
import { RegionsListPage } from './pages/regions/RegionsListPage';
import { BanksListPage } from './pages/banks/BanksListPage';
import { BankDetailPage } from './pages/banks/BankDetailPage';
import { UsersListPage } from './pages/users/UsersListPage';
import { ProfilePage } from './pages/profile/ProfilePage';

// Error Pages
import { AccessDeniedPage } from './pages/errors/AccessDeniedPage';
import { NotFoundPage } from './pages/errors/NotFoundPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 5, // 5 minutes
    },
  },
});

export const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />

            {/* Phase 3: Public Bank Verification Route (Single-use token credential) */}
            <Route path="/bank/verify/:token" element={<BankVerificationPage />} />

            {/* Protected Routes (Formal Dashboard Shell) */}
            <Route
              element={
                <ProtectedRoute>
                  <DashboardLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<DashboardOverviewPage />} />

              {/* Phase 2: FDR Repository & Registration */}
              <Route path="/fdrs" element={<FDRListPage />} />
              <Route
                path="/fdrs/new"
                element={
                  <RoleRoute allowedRoles={['institution_user', 'system_admin']}>
                    <FDRRegisterPage />
                  </RoleRoute>
                }
              />
              <Route path="/fdrs/:id" element={<FDRDetailPage />} />
              <Route path="/fdrs/:id/lineage" element={<FDRLineagePage />} />

              {/* Institutions Master */}
              <Route
                path="/institutions"
                element={
                  <RoleRoute
                    allowedRoles={[
                      'system_admin',
                      'bureau_officer',
                      'regional_officer',
                      'finance_officer',
                      'institution_user',
                      'bank_nodal_officer',
                    ]}
                  >
                    <InstitutionsListPage />
                  </RoleRoute>
                }
              />
              <Route path="/institutions/:id" element={<InstitutionDetailPage />} />

              {/* Regions & Territorial Jurisdictions */}
              <Route
                path="/regions"
                element={
                  <RoleRoute allowedRoles={['system_admin', 'bureau_officer', 'regional_officer']}>
                    <RegionsListPage />
                  </RoleRoute>
                }
              />

              {/* Banks & Branches */}
              <Route
                path="/banks"
                element={
                  <RoleRoute
                    allowedRoles={[
                      'system_admin',
                      'bureau_officer',
                      'finance_officer',
                      'bank_nodal_officer',
                    ]}
                  >
                    <BanksListPage />
                  </RoleRoute>
                }
              />
              <Route path="/banks/:id" element={<BankDetailPage />} />

              {/* User Management & RBAC Directory (System Admin Only) */}
              <Route
                path="/users"
                element={
                  <RoleRoute allowedRoles={['system_admin']}>
                    <UsersListPage />
                  </RoleRoute>
                }
              />

              {/* Phase 3: Mock Bank Portal (Verification & Digital Signing Workbench) */}
              <Route path="/bank" element={<MockBankPortalPage />} />

              {/* Phase 3: Bank Key Registry Management (Admin Only) */}
              <Route
                path="/admin/bank-keys"
                element={
                  <RoleRoute allowedRoles={['system_admin']}>
                    <BankKeysPage />
                  </RoleRoute>
                }
              />

              {/* Phase 4: Heartbeat Surveillance & Alert Desk */}
              <Route path="/heartbeat" element={<HeartbeatDashboardPage />} />
              <Route path="/heartbeat/monitoring" element={<HeartbeatMonitoringPage />} />
              <Route path="/alerts" element={<AlertCenterPage />} />
              <Route
                path="/admin/heartbeat-policies"
                element={
                  <RoleRoute allowedRoles={['system_admin']}>
                    <HeartbeatPolicyPage />
                  </RoleRoute>
                }
              />

              {/* Phase 5: Renewal Management & Lineage Desk */}
              <Route path="/renewals" element={<RenewalDashboardPage />} />
              <Route
                path="/renewals/new"
                element={
                  <RoleRoute allowedRoles={['institution_user', 'system_admin']}>
                    <CreateRenewalPage />
                  </RoleRoute>
                }
              />
              <Route
                path="/renewals/queue"
                element={
                  <RoleRoute
                    allowedRoles={[
                      'system_admin',
                      'bureau_officer',
                      'regional_officer',
                      'finance_officer',
                    ]}
                  >
                    <RenewalApprovalQueuePage />
                  </RoleRoute>
                }
              />
              <Route path="/renewals/:id" element={<RenewalReviewPage />} />

              {/* Profile & Security */}
              <Route path="/profile" element={<ProfilePage />} />

              {/* Access Denied */}
              <Route path="/access-denied" element={<AccessDeniedPage />} />

              {/* 404 Inside Layout */}
              <Route path="*" element={<NotFoundPage />} />
            </Route>

            {/* Catch-all global */}
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
