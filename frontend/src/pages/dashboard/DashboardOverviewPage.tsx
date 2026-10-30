import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import {
  Building2,
  MapPin,
  Landmark,
  Users,
  ShieldCheck,
  CheckCircle,
  ArrowRight,
  Info,
  Clock,
  Coins,
  FileText,
  AlertTriangle,
  PlusCircle,
  ShieldAlert,
  Calendar,
} from 'lucide-react';
import {
  fetchInstitutions,
  fetchRegions,
  fetchBanks,
  fetchUsers,
  fetchFDRStats,
  fetchFDRs,
} from '../../lib/api';
import { UpcomingPhasePlaceholder } from '../../components/common/UpcomingPhasePlaceholder';
import { Badge } from '../../components/ui/Badge';
import { FDR, FDRSummaryStats } from '../../types';

export const DashboardOverviewPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, activeRole } = useAuth();

  const [masterStats, setMasterStats] = useState({
    institutions: 0,
    regions: 0,
    banks: 0,
    users: 0,
    loading: true,
  });

  const [fdrStats, setFdrStats] = useState<FDRSummaryStats | null>(null);
  const [recentFDRs, setRecentFDRs] = useState<FDR[]>([]);
  const [isLoadingFDRs, setIsLoadingFDRs] = useState<boolean>(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [insts, regs, bnks, usrs, statsData, fdrList] = await Promise.all([
          fetchInstitutions(),
          fetchRegions(),
          fetchBanks(),
          fetchUsers(),
          fetchFDRStats(),
          fetchFDRs({ page: 1, page_size: 5 }),
        ]);

        setMasterStats({
          institutions: insts.length,
          regions: regs.length,
          banks: bnks.length,
          users: usrs.length,
          loading: false,
        });
        setFdrStats(statsData);
        setRecentFDRs(fdrList.items);
      } catch (err) {
        console.error('Failed to load dashboard metrics:', err);
        setMasterStats((prev) => ({ ...prev, loading: false }));
      } finally {
        setIsLoadingFDRs(false);
      }
    }
    loadData();
  }, []);

  const isAdmin = activeRole === 'system_admin';
  const isInstUser = activeRole === 'institution_user';

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDisplayDate = (dateStr: string) => {
    if (!dateStr) return 'N/A';
    try {
      return new Date(dateStr).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-white rounded-lg border border-gov-border shadow-xs p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <Badge variant="navy">FDR-Chain Phase 2 Operational</Badge>
              <Badge variant="success">Repository & Document Vault Active</Badge>
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

        {/* Phase 2 Informational Scope Notice */}
        <div className="mt-4 p-3 bg-blue-50/70 border border-blue-200/70 rounded-md text-xs text-gov-blue flex items-start gap-2.5">
          <Info className="w-4 h-4 text-gov-blue mt-0.5 shrink-0" />
          <div className="leading-relaxed">
            <span className="font-semibold">Phase 2 Operational Scope: </span>
            The FDR Central Repository is live with client-verified SHA-256 document hashing, institutional lien registration, and pending custody management. All newly registered records initialize at{' '}
            <strong className="underline">Trust Tier 1 (Pending Bank Verification)</strong>. Bank dual-factor digital signatures and automated heartbeats will activate in Phase 3.
          </div>
        </div>
      </div>

      {/* Phase 2 Real Custodial Metrics (Zero Fake Stats) */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-bold text-gov-navy uppercase tracking-wider flex items-center gap-2">
            <Coins className="w-4 h-4 text-gov-blue" />
            <span>FDR Custodial Aggregates (Live Repository)</span>
          </h2>
          <Link
            to="/fdrs"
            className="text-xs text-gov-blue hover:text-gov-navy font-semibold flex items-center gap-1"
          >
            <span>View Full Repository</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Custodial Value */}
          <div className="bg-white p-5 rounded-lg border border-gov-border shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gov-muted uppercase tracking-wider">
                Total Custodial Value
              </span>
              <div className="p-2 rounded bg-blue-50 text-gov-blue">
                <Coins className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-2">
              <span className="text-2xl font-bold text-gov-navy font-mono">
                {fdrStats ? formatCurrency(fdrStats.total_amount) : '₹0'}
              </span>
              <div className="text-[11px] text-gov-muted mt-1">
                Across <span className="font-semibold text-gov-text">{fdrStats?.total_fdrs || 0}</span> registered deposits
              </div>
            </div>
          </div>

          {/* Pending Tier 1 Deposits */}
          <div className="bg-white p-5 rounded-lg border border-gov-border shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-800 uppercase tracking-wider">
                Pending Verification
              </span>
              <div className="p-2 rounded bg-amber-50 text-amber-700">
                <Clock className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-2">
              <span className="text-2xl font-bold text-amber-800 font-mono">
                {fdrStats?.pending_count || 0}
              </span>
              <div className="text-[11px] text-gov-muted mt-1">
                Tier 1 deposits awaiting bank action
              </div>
            </div>
          </div>

          {/* Active Confirmed Deposits */}
          <div className="bg-white p-5 rounded-lg border border-gov-border shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">
                Active Confirmed FDRs
              </span>
              <div className="p-2 rounded bg-emerald-50 text-emerald-700">
                <CheckCircle className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-2">
              <span className="text-2xl font-bold text-emerald-800 font-mono">
                {fdrStats?.active_count || 0}
              </span>
              <div className="text-[11px] text-gov-muted mt-1">
                Active lien status confirmed
              </div>
            </div>
          </div>

          {/* Maturing Soon (90 Days) */}
          <div className="bg-white p-5 rounded-lg border border-gov-border shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-indigo-800 uppercase tracking-wider">
                Upcoming Maturities
              </span>
              <div className="p-2 rounded bg-indigo-50 text-indigo-700">
                <AlertTriangle className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-2">
              <span className="text-2xl font-bold text-indigo-800 font-mono">
                {fdrStats?.upcoming_maturity_90d || 0}
              </span>
              <div className="text-[11px] text-gov-muted mt-1">
                <span className="font-semibold text-gov-text">{fdrStats?.upcoming_maturity_30d || 0}</span> within 30 days
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Deposits & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent FDRs Table */}
        <div className="bg-white rounded-lg border border-gov-border shadow-xs p-5 lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-gov-border">
            <h2 className="text-xs font-bold text-gov-navy uppercase tracking-wider flex items-center gap-2">
              <FileText className="w-4 h-4 text-gov-blue" />
              <span>Recent Deposit Submissions</span>
            </h2>
            {(isAdmin || isInstUser) && (
              <button
                onClick={() => navigate('/fdrs/new')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gov-navy hover:bg-gov-navy-light text-white text-xs font-semibold rounded shadow-xs transition-colors"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Register FDR</span>
              </button>
            )}
          </div>

          {isLoadingFDRs ? (
            <div className="py-8 text-center text-xs text-gov-muted">
              Loading recent FDR submissions...
            </div>
          ) : recentFDRs.length === 0 ? (
            <div className="py-8 text-center text-xs text-gov-muted">
              No FDR records found in repository.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-gov-border text-[10px] uppercase font-bold text-gov-muted">
                    <th className="py-2 px-2">FDR Identifier</th>
                    <th className="py-2 px-2">Beneficiary / Bank</th>
                    <th className="py-2 px-2 text-right">Amount</th>
                    <th className="py-2 px-2">Maturity</th>
                    <th className="py-2 px-2 text-center">Status</th>
                    <th className="py-2 px-2 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gov-border">
                  {recentFDRs.map((fdr) => (
                    <tr key={fdr.id} className="hover:bg-gov-light/60">
                      <td className="py-2.5 px-2">
                        <div className="font-mono font-bold text-gov-navy">
                          {fdr.fdr_number}
                        </div>
                        <div className="text-[10px] text-gov-muted">
                          {fdr.institution_name}
                        </div>
                      </td>
                      <td className="py-2.5 px-2 max-w-[180px]">
                        <div className="font-medium text-gov-text truncate">
                          {fdr.lien_in_favour}
                        </div>
                        <div className="text-[10px] text-gov-muted">
                          {fdr.bank_name} ({fdr.ifsc_code})
                        </div>
                      </td>
                      <td className="py-2.5 px-2 text-right font-mono font-bold text-gov-navy">
                        {formatCurrency(fdr.amount)}
                      </td>
                      <td className="py-2.5 px-2 text-[11px] text-gov-text">
                        {formatDisplayDate(fdr.maturity_date)}
                      </td>
                      <td className="py-2.5 px-2 text-center">
                        <Badge variant={fdr.lifecycle_status === 'active' ? 'success' : fdr.lifecycle_status === 'pending' ? 'warning' : 'default'}>
                          {fdr.lifecycle_status}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-2 text-right">
                        <Link
                          to={`/fdrs/${fdr.id}`}
                          className="text-gov-blue hover:text-gov-navy font-semibold text-[11px]"
                        >
                          Inspect
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Quick Operations & Navigation */}
        <div className="space-y-4">
          <div className="bg-white rounded-lg border border-gov-border shadow-xs p-5">
            <h2 className="text-xs font-bold text-gov-navy uppercase tracking-wider mb-3">
              Operational Actions
            </h2>
            <div className="space-y-2">
              <Link
                to="/fdrs"
                className="w-full flex items-center justify-between p-2.5 rounded-md border border-gov-border hover:bg-gov-light text-xs font-medium text-gov-navy transition"
              >
                <span className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-gov-blue" />
                  <span>FDR Central Vault</span>
                </span>
                <ArrowRight className="w-3.5 h-3.5 text-gov-muted" />
              </Link>

              {(isAdmin || isInstUser) && (
                <Link
                  to="/fdrs/new"
                  className="w-full flex items-center justify-between p-2.5 rounded-md border border-gov-navy/20 bg-gov-navy/5 hover:bg-gov-navy/10 text-xs font-semibold text-gov-navy transition"
                >
                  <span className="flex items-center gap-2">
                    <PlusCircle className="w-4 h-4 text-gov-navy" />
                    <span>Register New FDR</span>
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-gov-navy" />
                </Link>
              )}

              <Link
                to="/institutions"
                className="w-full flex items-center justify-between p-2.5 rounded-md border border-gov-border hover:bg-gov-light text-xs font-medium text-gov-navy transition"
              >
                <span className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-gov-blue" />
                  <span>Institutions Master ({masterStats.institutions})</span>
                </span>
                <ArrowRight className="w-3.5 h-3.5 text-gov-muted" />
              </Link>

              <Link
                to="/banks"
                className="w-full flex items-center justify-between p-2.5 rounded-md border border-gov-border hover:bg-gov-light text-xs font-medium text-gov-navy transition"
              >
                <span className="flex items-center gap-2">
                  <Landmark className="w-4 h-4 text-indigo-700" />
                  <span>Banks & Branches ({masterStats.banks})</span>
                </span>
                <ArrowRight className="w-3.5 h-3.5 text-gov-muted" />
              </Link>
            </div>
          </div>

          {/* Phase 2 Invariant Card */}
          <div className="p-4 rounded-lg bg-amber-50/70 border border-amber-200 text-xs text-amber-900 space-y-2">
            <div className="flex items-center gap-2 font-bold text-amber-800">
              <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Trust Tier Architecture</span>
            </div>
            <p className="text-[11px] text-amber-700 leading-relaxed">
              Tier 1 records reflect depositor declaration. Tier 2 verification requires commercial bank integration in Phase 3.
            </p>
          </div>
        </div>
      </div>

      {/* Upcoming Phase Modules Section (Strict Phase Boundary Visualizer) */}
      <div className="pt-2">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-gov-navy">
              Upcoming Phase Modules & Roadmap Extension
            </h2>
            <p className="text-xs text-gov-muted mt-0.5">
              Strict Phase 2 boundary maintained. Subsequent capabilities planned for Phase 3 and Phase 4.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <UpcomingPhasePlaceholder
            phaseNumber={3}
            moduleName="Bank Nodal Verification & Digital Signatures (Tier 2/3)"
            description="Commercial bank branch portal for dual-factor verification, e-lien confirmation, and Ed25519 cryptographic token generation."
            capabilities={[
              'Direct IFSC Branch Routing & Lien Marking Queues',
              'Ed25519 Nodal Officer Digital Signatures',
              'Dual-factor Bank Status Acknowledgement',
              'Automated Periodic Heartbeat Health Checks',
            ]}
          />

          <UpcomingPhasePlaceholder
            phaseNumber={4}
            moduleName="Lien Release & Sovereign Refund Settlement"
            description="Complete lifecycle closure module enabling formal release orders, invocation workflows, and multi-signature refund reconciliation."
            capabilities={[
              'Multi-party Release Order Authorizations',
              'Automated Encashment & Invocation Pipeline',
              'Treasury & Public Account Settlement Logs',
              'AI Assisted Document OCR Validation',
            ]}
          />
        </div>
      </div>
    </div>
  );
};
