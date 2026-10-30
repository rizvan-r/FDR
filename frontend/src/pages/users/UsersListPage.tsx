import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { UserProfile, UserRole, Institution, Bank, Region } from '../../types';
import { fetchUsers, fetchInstitutions, fetchBanks, fetchRegions, toggleUserActive, updateUserRole } from '../../lib/api';
import { Modal } from '../../components/ui/Modal';
import { Badge } from '../../components/ui/Badge';
import {
  Users,
  UserPlus,
  Search,
  Shield,
  ShieldAlert,
  CheckCircle,
  XCircle,
  Building2,
  Landmark,
  MapPin,
  Lock,
  Mail,
  AlertCircle,
  Key,
} from 'lucide-react';

const ALL_ROLES: { value: UserRole; label: string; badgeClass: string }[] = [
  { value: 'system_admin', label: 'System Administrator', badgeClass: 'bg-red-50 text-red-700 border-red-200' },
  { value: 'bureau_officer', label: 'Central Bureau Officer', badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { value: 'finance_officer', label: 'Finance Officer', badgeClass: 'bg-amber-50 text-amber-700 border-amber-200' },
  { value: 'regional_officer', label: 'Regional Officer', badgeClass: 'bg-blue-50 text-blue-700 border-blue-200' },
  { value: 'bank_nodal_officer', label: 'Bank Nodal Officer', badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  { value: 'institution_user', label: 'Institutional Depositor', badgeClass: 'bg-purple-50 text-purple-700 border-purple-200' },
];

export const UsersListPage: React.FC = () => {
  const { activeRole } = useAuth();
  const isAdmin = activeRole === 'system_admin';

  const [users, setUsers] = useState<UserProfile[]>([]);
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [regions, setRegions] = useState<Region[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState('');

  // Provisioning Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    full_name: '',
    designation: '',
    employee_id: '',
    phone: '',
    role_name: 'institution_user' as UserRole,
    institution_id: '',
    bank_id: '',
    region_scope_ids: [] as string[],
  });
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Role Assignment Modal
  const [roleModalUser, setRoleModalUser] = useState<UserProfile | null>(null);
  const [newSelectedRole, setNewSelectedRole] = useState<UserRole>('institution_user');

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [usrList, instList, bnkList, regList] = await Promise.all([
        fetchUsers(),
        fetchInstitutions(),
        fetchBanks(),
        fetchRegions(),
      ]);
      setUsers(usrList);
      setInstitutions(instList);
      setBanks(bnkList);
      setRegions(regList);
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      setLoading(false);
    }
  }

  const handleToggleStatus = async (user: UserProfile) => {
    if (!isAdmin) return;
    try {
      await toggleUserActive(user.id, !user.is_active);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Status toggle failed.');
    }
  };

  const handleOpenRoleModal = (user: UserProfile) => {
    setRoleModalUser(user);
    setNewSelectedRole(user.roles[0] || 'institution_user');
  };

  const handleSaveRole = async () => {
    if (!roleModalUser) return;
    try {
      await updateUserRole(roleModalUser.id, newSelectedRole);
      await loadData();
      setRoleModalUser(null);
    } catch (err: any) {
      alert(err.message || 'Role change failed.');
    }
  };

  const handleProvisionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!formData.email || !formData.password || !formData.full_name) {
      setFormError('Email, temporary password, and full name are required.');
      return;
    }

    setIsSubmitting(true);
    try {
      // In production, posts to backend /api/users via FastAPI gateway
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const token = localStorage.getItem('fdr_demo_token') || 'dev-admin-token';

      const res = await fetch(`${apiUrl}/api/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...formData,
          institution_id: formData.institution_id || undefined,
          bank_id: formData.bank_id || undefined,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.detail || 'Provisioning failed on FastAPI backend.');
      }

      await loadData();
      setIsModalOpen(false);
    } catch (err: any) {
      setFormError(err.message || 'User provisioning failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filtered = users.filter((u) => {
    const matchesSearch =
      u.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.employee_id && u.employee_id.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesRole = !selectedRoleFilter || u.roles.includes(selectedRoleFilter as UserRole);

    return matchesSearch && matchesRole;
  });

  return (
    <div className="space-y-6">
      {/* Page Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-gov-navy">User Management & RBAC Directory</h1>
            <Badge variant="danger">System Admin Only</Badge>
          </div>
          <p className="text-xs text-gov-muted mt-0.5">
            Centralized provisioning, database role assignment, and jurisdictional region scope mapping
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={() => {
              setFormData({
                email: '',
                password: '',
                full_name: '',
                designation: '',
                employee_id: '',
                phone: '',
                role_name: 'institution_user',
                institution_id: institutions[0]?.id || '',
                bank_id: '',
                region_scope_ids: [],
              });
              setFormError('');
              setIsModalOpen(true);
            }}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-md bg-gov-navy hover:bg-[#0d2847] text-white text-xs font-semibold shadow-sm transition"
          >
            <UserPlus className="w-4 h-4" />
            <span>Provision Official Account</span>
          </button>
        )}
      </div>

      {/* Security Architecture Callout */}
      <div className="p-3 bg-red-50 border border-red-200 rounded-md text-xs text-red-900 flex items-start gap-2.5">
        <ShieldAlert className="w-4 h-4 text-red-700 mt-0.5 shrink-0" />
        <div className="leading-relaxed">
          <span className="font-semibold">Security Rule Enforced: </span>
          Self-assignment or frontend role elevation is strictly prohibited by database Row Level Security. All role assignments are recorded and verified directly from PostgreSQL application tables.
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-lg border border-gov-border shadow-gov flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-gov-muted absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by officer name, email, or employee government ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs border border-gov-border rounded-md focus:outline-none focus:ring-2 focus:ring-gov-blue"
          />
        </div>

        <div className="w-full md:w-56">
          <select
            value={selectedRoleFilter}
            onChange={(e) => setSelectedRoleFilter(e.target.value)}
            className="w-full py-2 px-2 text-xs border border-gov-border rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-gov-blue"
          >
            <option value="">All Six Roles</option>
            {ALL_ROLES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-lg border border-gov-border shadow-gov overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-gov-bg border-b border-gov-border text-gov-muted font-bold uppercase text-[10px] tracking-wider">
                <th className="py-3 px-4">Officer / Email</th>
                <th className="py-3 px-4">Employee ID</th>
                <th className="py-3 px-4">Designation</th>
                <th className="py-3 px-4">Verified Roles</th>
                <th className="py-3 px-4">Entity Association</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Privileged Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gov-border">
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-gov-muted">
                    <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-gov-navy mr-2"></div>
                    Loading user directory...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-gov-muted">
                    No users match your search.
                  </td>
                </tr>
              ) : (
                filtered.map((u) => {
                  const roleObj = ALL_ROLES.find((r) => r.value === u.roles[0]);
                  return (
                    <tr key={u.id} className="hover:bg-gov-light/40 transition">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-gov-navy">{u.full_name}</div>
                        <div className="text-[11px] text-gov-muted font-mono">{u.email}</div>
                      </td>
                      <td className="py-3 px-4 font-mono text-gov-muted">{u.employee_id || '—'}</td>
                      <td className="py-3 px-4 text-gov-text">{u.designation || 'Officer'}</td>
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-1">
                          {u.roles.map((r, i) => {
                            const rInfo = ALL_ROLES.find((item) => item.value === r);
                            return (
                              <span
                                key={i}
                                className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                                  rInfo?.badgeClass || 'bg-gray-100 text-gray-800'
                                }`}
                              >
                                {rInfo?.label || r}
                              </span>
                            );
                          })}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-gov-text text-[11px]">
                        {u.institution_id ? (
                          <span className="flex items-center gap-1 text-purple-700 font-medium">
                            <Building2 className="w-3.5 h-3.5" />
                            <span>NHAI (Institution)</span>
                          </span>
                        ) : u.bank_id ? (
                          <span className="flex items-center gap-1 text-indigo-700 font-medium">
                            <Landmark className="w-3.5 h-3.5" />
                            <span>State Bank of India</span>
                          </span>
                        ) : u.region_scopes?.length ? (
                          <span className="flex items-center gap-1 text-blue-700 font-medium">
                            <MapPin className="w-3.5 h-3.5" />
                            <span>Northern Region Scope</span>
                          </span>
                        ) : (
                          <span className="text-gov-muted">National Jurisdiction</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {u.is_active ? (
                          <Badge variant="success">Active</Badge>
                        ) : (
                          <Badge variant="danger">Deactivated</Badge>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {isAdmin && (
                            <>
                              <button
                                onClick={() => handleOpenRoleModal(u)}
                                className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-semibold border border-gov-border hover:bg-gov-light text-gov-navy"
                                title="Change Role"
                              >
                                <Key className="w-3 h-3" />
                                <span>Role</span>
                              </button>

                              <button
                                onClick={() => handleToggleStatus(u)}
                                className={`inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-semibold border ${
                                  u.is_active
                                    ? 'border-red-200 text-red-700 hover:bg-red-50'
                                    : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'
                                }`}
                                title={u.is_active ? 'Deactivate User' : 'Activate User'}
                              >
                                {u.is_active ? 'Deactivate' : 'Activate'}
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Provision New User */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Provision Official Institutional User"
        subtitle="Server-side account provisioning via FastAPI Gateway"
        maxWidth="lg"
      >
        <form onSubmit={handleProvisionSubmit} className="space-y-4 text-xs">
          {formError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-gov-navy mb-1" htmlFor="u-name">
                Full Name <span className="text-gov-danger">*</span>
              </label>
              <input
                id="u-name"
                type="text"
                required
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                placeholder="e.g. Smt. Radhika Verma"
                className="w-full px-3 py-2 border border-gov-border rounded-md focus:ring-2 focus:ring-gov-blue"
              />
            </div>

            <div>
              <label className="block font-bold text-gov-navy mb-1" htmlFor="u-empid">
                Government Employee ID
              </label>
              <input
                id="u-empid"
                type="text"
                value={formData.employee_id}
                onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
                placeholder="GOI-NIC-99201"
                className="w-full px-3 py-2 border border-gov-border rounded-md font-mono focus:ring-2 focus:ring-gov-blue"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-gov-navy mb-1" htmlFor="u-email">
                Official Email Address <span className="text-gov-danger">*</span>
              </label>
              <input
                id="u-email"
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="officer@agency.gov.in"
                className="w-full px-3 py-2 border border-gov-border rounded-md focus:ring-2 focus:ring-gov-blue"
              />
            </div>

            <div>
              <label className="block font-bold text-gov-navy mb-1" htmlFor="u-pwd">
                Initial Password <span className="text-gov-danger">*</span>
              </label>
              <input
                id="u-pwd"
                type="password"
                required
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="••••••••••••"
                className="w-full px-3 py-2 border border-gov-border rounded-md font-mono focus:ring-2 focus:ring-gov-blue"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-gov-navy mb-1" htmlFor="u-desig">
              Designation / Position
            </label>
            <input
              id="u-desig"
              type="text"
              value={formData.designation}
              onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
              placeholder="Deputy Director (Contracts & Deposits)"
              className="w-full px-3 py-2 border border-gov-border rounded-md focus:ring-2 focus:ring-gov-blue"
            />
          </div>

          <div>
            <label className="block font-bold text-gov-navy mb-1" htmlFor="u-role">
              Assign Primary Role <span className="text-gov-danger">*</span>
            </label>
            <select
              id="u-role"
              value={formData.role_name}
              onChange={(e) => setFormData({ ...formData, role_name: e.target.value as UserRole })}
              className="w-full px-3 py-2 border border-gov-border rounded-md bg-white focus:ring-2 focus:ring-gov-blue font-semibold"
            >
              {ALL_ROLES.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>

          {/* Conditional Institutional / Bank Mapping */}
          {formData.role_name === 'institution_user' && (
            <div>
              <label className="block font-bold text-gov-navy mb-1" htmlFor="u-inst">
                Associated Government Institution
              </label>
              <select
                id="u-inst"
                value={formData.institution_id}
                onChange={(e) => setFormData({ ...formData, institution_id: e.target.value })}
                className="w-full px-3 py-2 border border-gov-border rounded-md bg-white focus:ring-2 focus:ring-gov-blue"
              >
                <option value="">Select Institution</option>
                {institutions.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.name} ({i.code})
                  </option>
                ))}
              </select>
            </div>
          )}

          {formData.role_name === 'bank_nodal_officer' && (
            <div>
              <label className="block font-bold text-gov-navy mb-1" htmlFor="u-bank">
                Associated Scheduled Bank
              </label>
              <select
                id="u-bank"
                value={formData.bank_id}
                onChange={(e) => setFormData({ ...formData, bank_id: e.target.value })}
                className="w-full px-3 py-2 border border-gov-border rounded-md bg-white focus:ring-2 focus:ring-gov-blue"
              >
                <option value="">Select Bank</option>
                {banks.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.code})
                  </option>
                ))}
              </select>
            </div>
          )}

          {formData.role_name === 'regional_officer' && (
            <div>
              <label className="block font-bold text-gov-navy mb-1">
                Regional Jurisdiction Scope
              </label>
              <div className="grid grid-cols-2 gap-2 p-2 border border-gov-border rounded bg-gov-bg/50 max-h-32 overflow-y-auto">
                {regions.map((reg) => (
                  <label key={reg.id} className="flex items-center gap-1.5 text-xs text-gov-navy cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.region_scope_ids.includes(reg.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFormData({
                            ...formData,
                            region_scope_ids: [...formData.region_scope_ids, reg.id],
                          });
                        } else {
                          setFormData({
                            ...formData,
                            region_scope_ids: formData.region_scope_ids.filter((id) => id !== reg.id),
                          });
                        }
                      }}
                      className="rounded text-gov-navy focus:ring-gov-blue"
                    />
                    <span>{reg.name}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="pt-4 border-t border-gov-border flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 border border-gov-border rounded-md text-gov-text hover:bg-gov-bg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-gov-navy hover:bg-[#0c243f] text-white rounded-md font-semibold"
            >
              {isSubmitting ? 'Provisioning Account...' : 'Provision User'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Change Role */}
      {roleModalUser && (
        <Modal
          isOpen={Boolean(roleModalUser)}
          onClose={() => setRoleModalUser(null)}
          title={`Update Role — ${roleModalUser.full_name}`}
          subtitle="Modifies database authorization privileges"
          maxWidth="md"
        >
          <div className="space-y-4 text-xs">
            <div>
              <span className="text-gov-muted block mb-1">Current User Email</span>
              <span className="font-mono font-bold text-gov-navy">{roleModalUser.email}</span>
            </div>

            <div>
              <label className="block font-bold text-gov-navy mb-1" htmlFor="ch-role">
                Select Canonical Role
              </label>
              <select
                id="ch-role"
                value={newSelectedRole}
                onChange={(e) => setNewSelectedRole(e.target.value as UserRole)}
                className="w-full px-3 py-2 border border-gov-border rounded-md bg-white focus:ring-2 focus:ring-gov-blue font-semibold"
              >
                {ALL_ROLES.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded text-amber-900 leading-relaxed">
              Updating this role will immediately adjust the user's Row-Level Security permissions and accessible portal routes.
            </div>

            <div className="pt-3 border-t border-gov-border flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setRoleModalUser(null)}
                className="px-3 py-1.5 border border-gov-border rounded text-gov-text hover:bg-gov-bg"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveRole}
                className="px-3 py-1.5 bg-gov-navy hover:bg-[#0c243f] text-white rounded font-semibold"
              >
                Apply Role Change
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
