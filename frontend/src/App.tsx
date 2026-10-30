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

// Main Pages
import { DashboardOverviewPage } from './pages/dashboard/DashboardOverviewPage';
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
