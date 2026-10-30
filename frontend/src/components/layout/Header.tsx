import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { UserRole } from '../../types';
import { LogOut, User, Server, Menu, X, ChevronDown, Bell } from 'lucide-react';
import { checkBackendHealth, fetchAlerts } from '../../lib/api';
import { OfficerNotificationBell } from '../officer/OfficerNotificationBell';

const ROLE_LABELS: Record<UserRole, { label: string; badgeClass: string }> = {
  system_admin: { label: 'System Administrator', badgeClass: 'bg-red-50 text-red-700 border-red-200' },
  bureau_officer: { label: 'Bureau Officer', badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  finance_officer: { label: 'Finance Officer', badgeClass: 'bg-amber-50 text-amber-700 border-amber-200' },
  regional_officer: { label: 'Regional Officer', badgeClass: 'bg-blue-50 text-blue-700 border-blue-200' },
  bank_nodal_officer: { label: 'Bank Nodal Officer', badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  institution_user: { label: 'Institution Officer', badgeClass: 'bg-purple-50 text-purple-700 border-purple-200' },
};

interface HeaderProps {
  onToggleSidebar?: () => void;
  isSidebarOpen?: boolean;
}

export const Header: React.FC<HeaderProps> = ({ onToggleSidebar, isSidebarOpen }) => {
  const { user, activeRole, switchDemoRole, signOut } = useAuth();
  const [backendStatus, setBackendStatus] = useState<'checking' | 'healthy' | 'offline'>('checking');
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);
  const [unreadAlertCount, setUnreadAlertCount] = useState<number>(0);

  useEffect(() => {
    checkBackendHealth().then((res) => {
      if (res.status === 'healthy') {
        setBackendStatus('healthy');
      } else {
        setBackendStatus('offline');
      }
    });

    fetchAlerts({ is_resolved: false })
      .then((res) => {
        setUnreadAlertCount(res.unread_count || 0);
      })
      .catch(() => {});
  }, []);

  const currentRoleInfo = activeRole ? ROLE_LABELS[activeRole] : null;

  return (
    <header className="bg-white border-b border-gov-border sticky top-0 z-30 shadow-gov">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left: Mobile Toggle & Title */}
          <div className="flex items-center space-x-3">
            <button
              onClick={onToggleSidebar}
              className="lg:hidden p-2 rounded-md text-gov-navy hover:bg-gov-bg focus:outline-none"
              aria-label="Toggle Navigation"
            >
              {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            <div className="flex items-center space-x-2">
              <div className="w-9 h-9 rounded bg-gov-navy flex items-center justify-center text-white font-bold tracking-tight shadow-sm">
                FDR
              </div>
              <div>
                <h1 className="text-base font-bold text-gov-navy leading-none">
                  FDR-Chain Portal
                </h1>
                <p className="text-[11px] text-gov-muted mt-0.5">
                  Institutional Security Deposit Master System
                </p>
              </div>
            </div>
          </div>

          {/* Right: Role Switcher Tester & User Profile & Logout */}
          <div className="flex items-center space-x-3">
            {/* Backend Health Badge */}
            <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded bg-gov-bg border border-gov-border text-[11px] text-gov-muted">
              <Server className="w-3.5 h-3.5 text-gov-navy" />
              <span>FastAPI Backend:</span>
              <span
                className={`font-semibold ${
                  backendStatus === 'healthy' ? 'text-gov-success' : 'text-gov-danger'
                }`}
              >
                {backendStatus === 'healthy' ? 'Online' : 'Standby / Local'}
              </span>
            </div>

            {/* Officer Notifications Bell (Phase 6) */}
            <OfficerNotificationBell />

            {/* Regulatory Alert Desk Bell Icon */}
            <Link
              to="/alerts"
              className="relative p-2 rounded-md text-gov-navy hover:bg-gov-bg border border-gov-border transition-colors shadow-xs"
              title="Regulatory Surveillance Alert Desk"
            >
              <Bell className="w-4 h-4 text-slate-700" />
              {unreadAlertCount > 0 && (
                <span className="absolute -top-1 -right-1 px-1.5 py-0.2 min-w-[18px] text-[10px] font-bold bg-rose-600 text-white rounded-full flex items-center justify-center animate-pulse">
                  {unreadAlertCount}
                </span>
              )}
            </Link>

            {/* Institutional Role Switcher */}
            <div className="relative">
              <button
                onClick={() => setRoleDropdownOpen(!roleDropdownOpen)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold border ${
                  currentRoleInfo?.badgeClass || 'bg-gray-100 text-gray-700'
                }`}
                title="Switch active role"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                <span>{currentRoleInfo?.label || 'Select Role'}</span>
                <ChevronDown className="w-3.5 h-3.5 ml-0.5" />
              </button>

              {roleDropdownOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-md shadow-gov-lg border border-gov-border py-1.5 z-50 text-xs">
                  <div className="px-3 py-1.5 border-b border-gov-border text-[10px] font-bold text-gov-muted uppercase tracking-wider">
                    Active Role Switcher
                  </div>
                  {(Object.keys(ROLE_LABELS) as UserRole[]).map((roleKey) => (
                    <button
                      key={roleKey}
                      onClick={() => {
                        switchDemoRole(roleKey);
                        setRoleDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 flex items-center justify-between hover:bg-gov-bg ${
                        activeRole === roleKey ? 'font-bold bg-gov-light text-gov-navy' : 'text-gov-text'
                      }`}
                    >
                      <span>{ROLE_LABELS[roleKey].label}</span>
                      {activeRole === roleKey && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-gov-navy text-white">
                          Active
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* User Profile Info */}
            <div className="hidden sm:flex flex-col text-right">
              <span className="text-xs font-semibold text-gov-navy leading-tight">
                {user?.full_name || 'Guest User'}
              </span>
              <span className="text-[10px] text-gov-muted truncate max-w-[150px]">
                {user?.email || ''}
              </span>
            </div>

            {/* Logout button */}
            <button
              onClick={() => signOut()}
              className="p-2 rounded-md text-gov-muted hover:text-gov-danger hover:bg-red-50 transition border border-transparent hover:border-red-200"
              title="Sign Out / Disconnect Session"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
