import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  LayoutDashboard,
  Building2,
  MapPin,
  Landmark,
  Users,
  UserCheck,
  FileText,
  ShieldAlert,
  Coins,
  Lock,
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { activeRole } = useAuth();

  const isAdmin = activeRole === 'system_admin';
  const isBureau = activeRole === 'bureau_officer';
  const isFinance = activeRole === 'finance_officer';
  const isRegional = activeRole === 'regional_officer';
  const isBank = activeRole === 'bank_nodal_officer';
  const isInstUser = activeRole === 'institution_user';

  const canSeeInstitutions = isAdmin || isBureau || isFinance || isRegional || isInstUser;
  const canSeeRegions = isAdmin || isBureau || isRegional;
  const canSeeBanks = isAdmin || isBureau || isFinance || isBank;
  const canSeeUsers = isAdmin;

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 px-3.5 py-2.5 rounded-md text-xs font-medium transition-colors ${
      isActive
        ? 'bg-gov-navy text-white shadow-sm'
        : 'text-gov-text hover:bg-gov-light hover:text-gov-navy'
    }`;

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 lg:hidden backdrop-blur-xs"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 w-64 bg-white border-r border-gov-border flex flex-col pt-20 transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static lg:pt-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
          {/* Main Navigation */}
          <div>
            <div className="px-3 mb-2 text-[10px] font-bold tracking-wider text-gov-muted uppercase">
              Core Modules (Phase 1)
            </div>
            <nav className="space-y-1">
              <NavLink to="/dashboard" className={navLinkClass} onClick={onClose}>
                <LayoutDashboard className="w-4 h-4" />
                <span>Dashboard Overview</span>
              </NavLink>

              {canSeeInstitutions && (
                <NavLink to="/institutions" className={navLinkClass} onClick={onClose}>
                  <Building2 className="w-4 h-4" />
                  <span>Institutions Master</span>
                </NavLink>
              )}

              {canSeeRegions && (
                <NavLink to="/regions" className={navLinkClass} onClick={onClose}>
                  <MapPin className="w-4 h-4" />
                  <span>Regions & Jurisdictions</span>
                </NavLink>
              )}

              {canSeeBanks && (
                <NavLink to="/banks" className={navLinkClass} onClick={onClose}>
                  <Landmark className="w-4 h-4" />
                  <span>Banks & Branches</span>
                </NavLink>
              )}

              {canSeeUsers && (
                <NavLink to="/users" className={navLinkClass} onClick={onClose}>
                  <Users className="w-4 h-4" />
                  <span>User Management (RBAC)</span>
                </NavLink>
              )}

              <NavLink to="/profile" className={navLinkClass} onClick={onClose}>
                <UserCheck className="w-4 h-4" />
                <span>My Profile & Security</span>
              </NavLink>
            </nav>
          </div>

          {/* Future Modules Section (Strict Phase Boundary Visualization) */}
          <div className="pt-4 border-t border-gov-border">
            <div className="px-3 mb-2 flex items-center justify-between text-[10px] font-bold tracking-wider text-gov-muted uppercase">
              <span>Upcoming Modules</span>
              <span className="px-1.5 py-0.2 rounded bg-gray-200 text-gray-700 text-[9px]">
                Future
              </span>
            </div>
            <div className="space-y-1 text-xs text-gray-400">
              <div className="flex items-center justify-between px-3.5 py-2 rounded-md hover:bg-gray-50 opacity-70 cursor-not-allowed">
                <span className="flex items-center gap-2.5">
                  <FileText className="w-3.5 h-3.5" />
                  <span>FDR E-Registration</span>
                </span>
                <span className="text-[9px] bg-amber-50 text-amber-700 px-1 py-0.5 rounded border border-amber-200">
                  Phase 2
                </span>
              </div>

              <div className="flex items-center justify-between px-3.5 py-2 rounded-md hover:bg-gray-50 opacity-70 cursor-not-allowed">
                <span className="flex items-center gap-2.5">
                  <Lock className="w-3.5 h-3.5" />
                  <span>Bank E-Verification</span>
                </span>
                <span className="text-[9px] bg-amber-50 text-amber-700 px-1 py-0.5 rounded border border-amber-200">
                  Phase 2
                </span>
              </div>

              <div className="flex items-center justify-between px-3.5 py-2 rounded-md hover:bg-gray-50 opacity-70 cursor-not-allowed">
                <span className="flex items-center gap-2.5">
                  <ShieldAlert className="w-3.5 h-3.5" />
                  <span>Lien Monitoring</span>
                </span>
                <span className="text-[9px] bg-amber-50 text-amber-700 px-1 py-0.5 rounded border border-amber-200">
                  Phase 2
                </span>
              </div>

              <div className="flex items-center justify-between px-3.5 py-2 rounded-md hover:bg-gray-50 opacity-70 cursor-not-allowed">
                <span className="flex items-center gap-2.5">
                  <Coins className="w-3.5 h-3.5" />
                  <span>Release & Refund</span>
                </span>
                <span className="text-[9px] bg-blue-50 text-blue-700 px-1 py-0.5 rounded border border-blue-200">
                  Phase 3
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-gov-border bg-gov-bg/50">
          <div className="text-[11px] font-semibold text-gov-navy">
            FDR-Chain System Foundation
          </div>
          <div className="text-[10px] text-gov-muted mt-0.5">
            Role: <span className="font-mono font-medium text-gov-text">{activeRole}</span>
          </div>
        </div>
      </aside>
    </>
  );
};
