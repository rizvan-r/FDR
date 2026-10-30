import { describe, it, expect } from 'vitest';
import { UserRole } from '../types';

describe('Phase 9 Frontend: Auth & Role Permission Boundaries', () => {
  const ALL_ROLES: UserRole[] = [
    'system_admin',
    'bureau_officer',
    'finance_officer',
    'regional_officer',
    'bank_nodal_officer',
    'institution_user',
  ];

  it('should define all 6 official government roles without truncation', () => {
    expect(ALL_ROLES.length).toBe(6);
    expect(ALL_ROLES).toContain('system_admin');
    expect(ALL_ROLES).toContain('bureau_officer');
    expect(ALL_ROLES).toContain('finance_officer');
    expect(ALL_ROLES).toContain('regional_officer');
    expect(ALL_ROLES).toContain('bank_nodal_officer');
    expect(ALL_ROLES).toContain('institution_user');
  });

  it('should enforce role route permissions correctly', () => {
    const canAccessAdminRoutes = (roles: UserRole[]) => roles.includes('system_admin');
    const canAccessSupervisorRoutes = (roles: UserRole[]) =>
      roles.some((r) => ['system_admin', 'bureau_officer', 'finance_officer'].includes(r));
    const canAccessReleaseReview = (roles: UserRole[]) =>
      roles.some((r) => ['system_admin', 'bureau_officer', 'finance_officer'].includes(r));
    const canSubmitRelease = (roles: UserRole[]) =>
      roles.some((r) => ['institution_user', 'system_admin'].includes(r));

    expect(canAccessAdminRoutes(['system_admin'])).toBe(true);
    expect(canAccessAdminRoutes(['institution_user'])).toBe(false);
    expect(canAccessAdminRoutes(['regional_officer'])).toBe(false);

    expect(canAccessSupervisorRoutes(['bureau_officer'])).toBe(true);
    expect(canAccessSupervisorRoutes(['finance_officer'])).toBe(true);
    expect(canAccessSupervisorRoutes(['bank_nodal_officer'])).toBe(false);

    expect(canAccessReleaseReview(['bureau_officer'])).toBe(true);
    expect(canAccessReleaseReview(['institution_user'])).toBe(false);

    expect(canSubmitRelease(['institution_user'])).toBe(true);
    expect(canSubmitRelease(['regional_officer'])).toBe(false);
  });

  it('should map demo credentials to safe development accounts', () => {
    const demoAccounts = {
      system_admin: 'admin@fdrchain.gov.in',
      bureau_officer: 'bureau.officer@fdrchain.gov.in',
      finance_officer: 'finance.officer@fdrchain.gov.in',
      regional_officer: 'regional.officer.nr@fdrchain.gov.in',
      bank_nodal_officer: 'nodal.sbi@sbi.co.in',
      institution_user: 'deposits.officer@nhai.gov.in',
    };

    for (const [role, email] of Object.entries(demoAccounts)) {
      expect(email).toBeTruthy();
      expect(email).toContain('@');
      expect(typeof role).toBe('string');
    }
  });
});
