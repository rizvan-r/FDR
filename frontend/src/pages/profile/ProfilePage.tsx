import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Badge } from '../../components/ui/Badge';
import {
  UserCheck,
  Shield,
  Key,
  Lock,
  Mail,
  Building,
  CheckCircle2,
  AlertCircle,
  Clock,
  Laptop,
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';

export const ProfilePage: React.FC = () => {
  const { user, activeRole, roles } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMsg(null);

    if (newPassword.length < 8) {
      setStatusMsg({ type: 'error', text: 'New password must be at least 8 characters.' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setStatusMsg({ type: 'error', text: 'New passwords do not match.' });
      return;
    }

    setIsUpdating(true);
    if (!isSupabaseConfigured) {
      setTimeout(() => {
        setIsUpdating(false);
        setStatusMsg({ type: 'success', text: 'Password successfully changed (Development Mode).' });
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }, 700);
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      setIsUpdating(false);
      if (error) {
        setStatusMsg({ type: 'error', text: error.message });
      } else {
        setStatusMsg({ type: 'success', text: 'Password successfully updated in Supabase Auth.' });
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch (err: any) {
      setIsUpdating(false);
      setStatusMsg({ type: 'error', text: err.message || 'Password update failed.' });
    }
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-xl font-bold text-gov-navy">My Institutional Security Profile</h1>
        <p className="text-xs text-gov-muted mt-0.5">
          Verified database credentials, role permissions, and active session telemetry
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Card */}
        <div className="bg-white rounded-lg border border-gov-border shadow-gov p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gov-light text-gov-navy flex items-center justify-center font-bold text-lg border border-gov-border">
              {user?.full_name?.charAt(0) || 'U'}
            </div>
            <div>
              <h2 className="text-base font-bold text-gov-navy">{user?.full_name}</h2>
              <span className="text-xs text-gov-muted block">{user?.email}</span>
            </div>
          </div>

          <div className="pt-3 border-t border-gov-border space-y-2.5 text-xs">
            <div>
              <span className="text-gov-muted block text-[11px]">Designation</span>
              <span className="font-semibold text-gov-navy">{user?.designation || 'Institutional Officer'}</span>
            </div>

            <div>
              <span className="text-gov-muted block text-[11px]">Government Employee ID</span>
              <span className="font-mono text-gov-text">{user?.employee_id || 'GOI-NIC-PORTAL'}</span>
            </div>

            <div>
              <span className="text-gov-muted block text-[11px]">Contact Telephone</span>
              <span className="text-gov-text">{user?.phone || '+91-11-23094411'}</span>
            </div>

            <div>
              <span className="text-gov-muted block text-[11px]">Account Status</span>
              {user?.is_active ? (
                <Badge variant="success">Active & In Good Standing</Badge>
              ) : (
                <Badge variant="danger">Inactive</Badge>
              )}
            </div>
          </div>
        </div>

        {/* Roles & Security Authorization */}
        <div className="bg-white rounded-lg border border-gov-border shadow-gov p-6 space-y-4 lg:col-span-2">
          <h2 className="text-xs font-bold text-gov-navy uppercase tracking-wider border-b border-gov-border pb-2 flex items-center gap-2">
            <Shield className="w-4 h-4 text-gov-success" />
            <span>Assigned Database Roles & Permissions (RBAC)</span>
          </h2>

          <div className="space-y-3">
            <div className="p-3 rounded-md border border-gov-border bg-gov-bg/60">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-gov-navy uppercase">
                  Active Session Role: {activeRole?.replace(/_/g, ' ')}
                </span>
                <Badge variant="navy">PostgreSQL Verified</Badge>
              </div>
              <p className="text-[11px] text-gov-muted leading-relaxed">
                Roles are retrieved directly from the database and evaluated server-side by Row Level Security policies. Frontend manipulation is strictly rejected.
              </p>
            </div>

            <div className="pt-2">
              <span className="text-xs font-bold text-gov-navy block mb-2">
                All Authorized Roles:
              </span>
              <div className="flex flex-wrap gap-2">
                {roles.map((r) => (
                  <span
                    key={r}
                    className="px-3 py-1 rounded-md text-xs font-semibold bg-gov-light text-gov-navy border border-gov-border"
                  >
                    {r.replace(/_/g, ' ')}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Change Password Form */}
          <div className="pt-4 border-t border-gov-border">
            <h3 className="text-xs font-bold text-gov-navy uppercase tracking-wider mb-3 flex items-center gap-2">
              <Key className="w-4 h-4 text-gov-blue" />
              <span>Update Password Credentials</span>
            </h3>

            {statusMsg && (
              <div
                className={`mb-3 p-3 rounded text-xs flex items-start gap-2 border ${
                  statusMsg.type === 'success'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : 'bg-red-50 border-red-200 text-red-800'
                }`}
              >
                {statusMsg.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
                )}
                <span>{statusMsg.text}</span>
              </div>
            )}

            <form onSubmit={handlePasswordUpdate} className="space-y-3 text-xs max-w-md">
              <div>
                <label className="block font-bold text-gov-navy mb-1" htmlFor="p-new">
                  New Password
                </label>
                <input
                  id="p-new"
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min. 8 characters"
                  className="w-full px-3 py-2 border border-gov-border rounded-md font-mono focus:ring-2 focus:ring-gov-blue"
                />
              </div>

              <div>
                <label className="block font-bold text-gov-navy mb-1" htmlFor="p-conf">
                  Confirm New Password
                </label>
                <input
                  id="p-conf"
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  className="w-full px-3 py-2 border border-gov-border rounded-md font-mono focus:ring-2 focus:ring-gov-blue"
                />
              </div>

              <button
                type="submit"
                disabled={isUpdating}
                className="px-4 py-2 bg-gov-navy hover:bg-[#0c243f] text-white rounded-md font-semibold transition"
              >
                {isUpdating ? 'Updating...' : 'Update Password'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
