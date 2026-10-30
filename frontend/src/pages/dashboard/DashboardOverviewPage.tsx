import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Link } from 'react-router-dom';
import {
  Building2,
  MapPin,
  Landmark,
  Users,
  ShieldCheck,
  CheckCircle,
  Database,
  Server,
  ArrowRight,
  Info,
} from 'lucide-react';
import { fetchInstitutions, fetchRegions, fetchBanks, fetchUsers } from '../../lib/api';
import { UpcomingPhasePlaceholder } from '../../components/common/UpcomingPhasePlaceholder';
import { Badge } from '../../components/ui/Badge';

export const DashboardOverviewPage: React.FC = () => {
  const { user, activeRole } = useAuth();

  const [stats, setStats] = useState({
    institutions: 0,
    regions: 0,
    banks: 0,
    users: 0,
    loading: true,
  });

  useEffect(() => {
    async function loadStats() {
      try {
        const [insts, regs, bnks, usrs] = await Promise.all([
          fetchInstitutions(),
          fetchRegions(),
          fetchBanks(),
          fetchUsers(),
        ]);
        setStats({
          institutions: insts.length,
          regions: regs.length,
          banks: bnks.length,
          users: usrs.length,
          loading: false,
        });
      } catch (err) {
        console.error('Failed to load dashboard metrics:', err);
        setStats((prev) => ({ ...prev, loading: false }));
      }
    }
    loadStats();
  }, []);

  const isAdmin = activeRole === 'system_admin';
  const isRegional = activeRole === 'regional_officer';
  const isBank = activeRole === 'bank_nodal_officer';
  const isInstUser = activeRole === 'institution_user';

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-white rounded-lg border border-gov-border shadow-gov p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <Badge variant="navy">FDR-Chain Phase 1 Foundation</Badge>
              <Badge variant="success">Institutional RBAC Active</Badge>
            </div>
            <h1 className="text-xl font-bold text-gov-navy">
              Welcome, {user?.full_name || 'Officer'}
            </h1>
            <p className="text-xs text-gov-muted mt-0.5">
              {user?.designation || 'Institutional Officer'} • {user?.email}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-gov-muted">Active Role Jurisdiction:</span>
            <span className="px-3 py-1 bg-gov-light text-gov-navy font-bold rounded-md text-xs border border-gov-border uppercase">
              {activeRole?.replace(/_/g, ' ')}
            </span>
          </div>
        </div>

        {/* Informational Notice */}
        <div className="mt-4 p-3 bg-blue-50/60 border border-blue-200/60 rounded-md text-xs text-gov-blue flex items-start gap-2.5">
          <Info className="w-4 h-4 text-gov-blue mt-0.5 shrink-0" />
          <div className="leading-relaxed">
            <span className="font-semibold">Phase 1 Objective Scope: </span>
            This release establishes the centralized Government Authentication, Role-Based Access Control (RBAC), and Institutional Master-Data Foundation (Institutions, Regions, Banks, Branches, and User Accounts). Security deposit FDR submissions and bank lien confirmations will unlock in Phase 2.
          </div>
        </div>
      </div>

      {/* Real Master-Data Metrics (Strictly Real Master Counts, No Fake Financial Stats) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Institutions */}
        <div className="bg-white p-5 rounded-lg border border-gov-border shadow-gov">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gov-muted uppercase tracking-wider">
              Institutions Master
            </span>
            <div className="p-2 rounded bg-blue-50 text-gov-blue">
              <Building2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-gov-navy">
              {stats.loading ? '...' : stats.institutions}
            </span>
            <span className="text-[11px] text-gov-muted">Public & Govt Entities</span>
          </div>
          <div className="mt-3 pt-3 border-t border-gov-border">
            <Link
              to="/institutions"
              className="text-xs text-gov-blue hover:underline font-semibold flex items-center gap-1"
            >
              <span>Manage Institutions</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Regions */}
        <div className="bg-white p-5 rounded-lg border border-gov-border shadow-gov">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gov-muted uppercase tracking-wider">
              Jurisdiction Regions
            </span>
            <div className="p-2 rounded bg-emerald-50 text-emerald-700">
              <MapPin className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-gov-navy">
              {stats.loading ? '...' : stats.regions}
            </span>
            <span className="text-[11px] text-gov-muted">National Zones</span>
          </div>
          <div className="mt-3 pt-3 border-t border-gov-border">
            <Link
              to="/regions"
              className="text-xs text-gov-blue hover:underline font-semibold flex items-center gap-1"
            >
              <span>View Regions</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Banks */}
        <div className="bg-white p-5 rounded-lg border border-gov-border shadow-gov">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gov-muted uppercase tracking-wider">
              Scheduled Banks
            </span>
            <div className="p-2 rounded bg-indigo-50 text-indigo-700">
              <Landmark className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-gov-navy">
              {stats.loading ? '...' : stats.banks}
            </span>
            <span className="text-[11px] text-gov-muted">Integrated Banks</span>
          </div>
          <div className="mt-3 pt-3 border-t border-gov-border">
            <Link
              to="/banks"
              className="text-xs text-gov-blue hover:underline font-semibold flex items-center gap-1"
            >
              <span>View Banks & Branches</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Users */}
        <div className="bg-white p-5 rounded-lg border border-gov-border shadow-gov">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gov-muted uppercase tracking-wider">
              System Accounts
            </span>
            <div className="p-2 rounded bg-purple-50 text-purple-700">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-gov-navy">
              {stats.loading ? '...' : stats.users}
            </span>
            <span className="text-[11px] text-gov-muted">Assigned Personnel</span>
          </div>
          <div className="mt-3 pt-3 border-t border-gov-border">
            {isAdmin ? (
              <Link
                to="/users"
                className="text-xs text-gov-blue hover:underline font-semibold flex items-center gap-1"
              >
                <span>User RBAC Directory</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            ) : (
              <Link
                to="/profile"
                className="text-xs text-gov-blue hover:underline font-semibold flex items-center gap-1"
              >
                <span>My Security Profile</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Security Architecture & Institutional Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg border border-gov-border shadow-gov p-5 lg:col-span-2">
          <h2 className="text-sm font-bold text-gov-navy uppercase tracking-wider mb-4 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-gov-success" />
            Phase 1 Security & Authorization Architecture
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-3.5 rounded border border-gov-border bg-gov-bg/60">
              <div className="flex items-center gap-2 mb-1">
                <Database className="w-4 h-4 text-gov-navy" />
                <span className="text-xs font-bold text-gov-navy">Supabase PostgreSQL RLS</span>
              </div>
              <p className="text-[11px] text-gov-muted leading-relaxed">
                Row-Level Security policies active across all tables. Role elevation and self-assignment are strictly blocked at database layer.
              </p>
              <div className="mt-2 flex items-center gap-1 text-[11px] text-gov-success font-semibold">
                <CheckCircle className="w-3.5 h-3.5" />
                <span>Policies Deployed (8 Tables)</span>
              </div>
            </div>

            <div className="p-3.5 rounded border border-gov-border bg-gov-bg/60">
              <div className="flex items-center gap-2 mb-1">
                <Server className="w-4 h-4 text-gov-navy" />
                <span className="text-xs font-bold text-gov-navy">FastAPI Administrative Gateway</span>
              </div>
              <p className="text-[11px] text-gov-muted leading-relaxed">
                Centralized server-side provisioning. Token verification using Bearer authorization headers without exposing service keys.
              </p>
              <div className="mt-2 flex items-center gap-1 text-[11px] text-gov-success font-semibold">
                <CheckCircle className="w-3.5 h-3.5" />
                <span>Endpoints Guarded by RBAC</span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-gov-border">
            <div className="flex flex-wrap items-center justify-between text-xs text-gov-text gap-2">
              <span className="font-semibold text-gov-navy">Active Session Scope:</span>
              <span>
                {isRegional && 'Regional Officer (Jurisdiction: Northern Region)'}
                {isBank && 'Bank Nodal Branch Officer (SBI Parliament St Branch)'}
                {isInstUser && 'Institutional Officer (NHAI Security Deposits)'}
                {isAdmin && 'System Administrator (Full Portal Oversight)'}
                {!isRegional && !isBank && !isInstUser && !isAdmin && 'Central Bureau / Oversight Officer'}
              </span>
            </div>
          </div>
        </div>

        {/* Quick Actions Panel */}
        <div className="bg-white rounded-lg border border-gov-border shadow-gov p-5">
          <h2 className="text-sm font-bold text-gov-navy uppercase tracking-wider mb-4">
            Master Data Navigation
          </h2>
          <div className="space-y-2">
            <Link
              to="/institutions"
              className="w-full flex items-center justify-between p-2.5 rounded-md border border-gov-border hover:bg-gov-light text-xs font-medium text-gov-navy transition"
            >
              <span className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-gov-blue" />
                <span>Institutions Directory</span>
              </span>
              <ArrowRight className="w-3.5 h-3.5 text-gov-muted" />
            </Link>

            <Link
              to="/regions"
              className="w-full flex items-center justify-between p-2.5 rounded-md border border-gov-border hover:bg-gov-light text-xs font-medium text-gov-navy transition"
            >
              <span className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-emerald-700" />
                <span>Regional Jurisdictions</span>
              </span>
              <ArrowRight className="w-3.5 h-3.5 text-gov-muted" />
            </Link>

            <Link
              to="/banks"
              className="w-full flex items-center justify-between p-2.5 rounded-md border border-gov-border hover:bg-gov-light text-xs font-medium text-gov-navy transition"
            >
              <span className="flex items-center gap-2">
                <Landmark className="w-4 h-4 text-indigo-700" />
                <span>Banks & Branches</span>
              </span>
              <ArrowRight className="w-3.5 h-3.5 text-gov-muted" />
            </Link>

            {isAdmin && (
              <Link
                to="/users"
                className="w-full flex items-center justify-between p-2.5 rounded-md border border-gov-border hover:bg-gov-light text-xs font-medium text-gov-navy transition"
              >
                <span className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-purple-700" />
                  <span>User Provisioning (Admin)</span>
                </span>
                <ArrowRight className="w-3.5 h-3.5 text-gov-muted" />
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Upcoming Phase Modules Section (Strict Phase Boundary Visualizer) */}
      <div className="pt-2">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-gov-navy">
              Upcoming Phase Modules & Extension Points
            </h2>
            <p className="text-xs text-gov-muted mt-0.5">
              Strict Phase 1 development boundary maintained. Subsequent capabilities planned for Phase 2 & Phase 3.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <UpcomingPhasePlaceholder
            phaseNumber={2}
            moduleName="FDR E-Registration & AI OCR Verification"
            description="Institutional depositor workflow for uploading fixed deposit receipts, automated OCR metadata extraction, and lien request generation."
            capabilities={[
              'Multi-page PDF FDR Document Upload',
              'AI OCR for FDR Number, Amount & Maturity Date',
              'Automated Schema Verification Against Bank Records',
              'Immutable Submission Timestamping',
            ]}
          />

          <UpcomingPhasePlaceholder
            phaseNumber={2}
            moduleName="Bank Nodal Lien Marking & Digital Signatures"
            description="Commercial bank branch portal for dual-factor verification, e-lien confirmation, and Ed25519 cryptographic authorization."
            capabilities={[
              'Direct IFSC Branch Routing & Lien Queues',
              'Ed25519 Nodal Officer Digital Signatures',
              'Instant Custody Status Acknowledgement',
              'Automated Heartbeat & Maturity Monitoring',
            ]}
          />
        </div>
      </div>
    </div>
  );
};
