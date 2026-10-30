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
  ShieldCheck,
  Key,
  Coins,
  Lock,
  Activity,
  Bell,
  Sliders,
  Clock,
  GitBranch,
  ListOrdered,
  CheckSquare,
  Briefcase,
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
              Dashboard & Vault
            </div>
            <nav className="space-y-1">
              <NavLink to="/dashboard" className={navLinkClass} onClick={onClose}>
                <LayoutDashboard className="w-4 h-4" />
                <span>Dashboard Overview</span>
              </NavLink>

              <NavLink to="/fdrs" className={navLinkClass} onClick={onClose}>
                <FileText className="w-4 h-4" />
                <span>FDR Repository</span>
              </NavLink>

              {(isAdmin || isInstUser) && (
                <NavLink to="/fdrs/new" className={navLinkClass} onClick={onClose}>
                  <Coins className="w-4 h-4" />
                  <span>Register New FDR</span>
                </NavLink>
              )}
            </nav>
          </div>

          {/* Institutional Infrastructure (Phase 1) */}
          <div>
            <div className="px-3 mb-2 text-[10px] font-bold tracking-wider text-gov-muted uppercase">
              Entity Masters
            </div>
            <nav className="space-y-1">
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

          {/* Phase 3: Bank Verification & Trust Network */}
          <div>
            <div className="px-3 mb-2 text-[10px] font-bold tracking-wider text-gov-muted uppercase">
              Trust & Verification
            </div>
            <nav className="space-y-1">
              <NavLink to="/bank" className={navLinkClass} onClick={onClose}>
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Mock Bank Portal</span>
              </NavLink>

              {isAdmin && (
                <NavLink to="/admin/bank-keys" className={navLinkClass} onClick={onClose}>
                  <Key className="w-4 h-4 text-blue-600" />
                  <span>Public Key Registry</span>
                </NavLink>
              )}
            </nav>
          </div>

          {/* Phase 4: Heartbeat Surveillance & Alert Desk */}
          <div>
            <div className="px-3 mb-2 flex items-center justify-between text-[10px] font-bold tracking-wider text-gov-muted uppercase">
              <span>Surveillance & Alerts</span>
              <span className="px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 text-[9px] font-semibold">
                Phase 4 Live
              </span>
            </div>
            <nav className="space-y-1">
              <NavLink to="/heartbeat" className={navLinkClass} onClick={onClose}>
                <Activity className="w-4 h-4 text-emerald-600" />
                <span>Heartbeat Surveillance</span>
              </NavLink>

              <NavLink to="/heartbeat/monitoring" className={navLinkClass} onClick={onClose}>
                <Clock className="w-4 h-4 text-blue-600" />
                <span>Monitored Deposits</span>
              </NavLink>

              <NavLink to="/alerts" className={navLinkClass} onClick={onClose}>
                <Bell className="w-4 h-4 text-amber-600" />
                <span>Regulatory Alert Desk</span>
              </NavLink>

              {isAdmin && (
                <NavLink to="/admin/heartbeat-policies" className={navLinkClass} onClick={onClose}>
                  <Sliders className="w-4 h-4 text-purple-600" />
                  <span>Heartbeat Policies</span>
                </NavLink>
              )}
            </nav>
          </div>

          {/* Phase 5: Renewal Management & FDR Lineage */}
          <div>
            <div className="px-3 mb-2 flex items-center justify-between text-[10px] font-bold tracking-wider text-gov-muted uppercase">
              <span>Renewals & Lineage</span>
              <span className="px-1.5 py-0.2 rounded bg-purple-100 text-purple-800 text-[9px] font-semibold">
                Phase 5 Live
              </span>
            </div>
            <nav className="space-y-1">
              <NavLink to="/renewals" className={navLinkClass} onClick={onClose}>
                <GitBranch className="w-4 h-4 text-purple-600" />
                <span>Renewal Desk</span>
              </NavLink>

              <NavLink to="/renewals/queue" className={navLinkClass} onClick={onClose}>
                <Clock className="w-4 h-4 text-blue-600" />
                <span>Approval Queue</span>
              </NavLink>

              {(isAdmin || isInstUser) && (
                <NavLink to="/renewals/new" className={navLinkClass} onClick={onClose}>
                  <Coins className="w-4 h-4 text-emerald-600" />
                  <span>Initiate Renewal</span>
                </NavLink>
              )}
            </nav>
          </div>

          {/* Phase 6: Officer Desk & Priority Queue */}
          <div>
            <div className="px-3 mb-2 flex items-center justify-between text-[10px] font-bold tracking-wider text-gov-muted uppercase">
              <span>Officer Operations</span>
              <span className="px-1.5 py-0.2 rounded bg-blue-100 text-blue-800 text-[9px] font-semibold">
                Phase 6 Live
              </span>
            </div>
            <nav className="space-y-1">
              <NavLink to="/officer/dashboard" className={navLinkClass} onClick={onClose}>
                <CheckSquare className="w-4 h-4 text-blue-600" />
                <span>Officer Desk</span>
              </NavLink>

              <NavLink to="/officer/queue" className={navLinkClass} onClick={onClose}>
                <ListOrdered className="w-4 h-4 text-indigo-600" />
                <span>Priority Queue</span>
              </NavLink>

              {(isAdmin || isBureau || isRegional) && (
                <NavLink to="/officer/workload" className={navLinkClass} onClick={onClose}>
                  <Briefcase className="w-4 h-4 text-amber-600" />
                  <span>Workload Staffing</span>
                </NavLink>
              )}

              {(isAdmin || isBureau || isRegional) && (
                <NavLink to="/officer/escalations" className={navLinkClass} onClick={onClose}>
                  <ShieldAlert className="w-4 h-4 text-rose-600" />
                  <span>Escalation Command</span>
                </NavLink>
              )}

              {isAdmin && (
                <NavLink to="/officer/policies" className={navLinkClass} onClick={onClose}>
                  <Sliders className="w-4 h-4 text-purple-600" />
                  <span>Queue Policies</span>
                </NavLink>
              )}
            </nav>
          </div>

          {/* Future Modules Section (Strict Phase Boundary Visualization) */}
          <div className="pt-4 border-t border-gov-border">
            <div className="px-3 mb-2 flex items-center justify-between text-[10px] font-bold tracking-wider text-gov-muted uppercase">
              <span>Upcoming Capabilities</span>
              <span className="px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 text-[9px] font-semibold">
                Phase 7
              </span>
            </div>
            <div className="space-y-1 text-xs text-gray-400">
              <div className="flex items-center justify-between px-3.5 py-2 rounded-md hover:bg-gray-50 opacity-70 cursor-not-allowed">
                <span className="flex items-center gap-2.5">
                  <Coins className="w-3.5 h-3.5" />
                  <span>Legacy Migration & Ingestion</span>
                </span>
                <span className="text-[9px] bg-slate-100 text-slate-600 px-1 py-0.5 rounded border border-slate-200">
                  Phase 7
                </span>
              </div>

              <div className="flex items-center justify-between px-3.5 py-2 rounded-md hover:bg-gray-50 opacity-70 cursor-not-allowed">
                <span className="flex items-center gap-2.5">
                  <Lock className="w-3.5 h-3.5" />
                  <span>OCR & Document Intelligence</span>
                </span>
                <span className="text-[9px] bg-slate-100 text-slate-600 px-1 py-0.5 rounded border border-slate-200">
                  Phase 7
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
