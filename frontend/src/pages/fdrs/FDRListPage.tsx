import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  fetchFDRs,
  fetchBanks,
  fetchInstitutions,
  fetchRegions,
  fetchFDRStats,
} from '../../lib/api';
import {
  FDR,
  Bank,
  Institution,
  Region,
  FDRLifecycleStatus,
  FDRSummaryStats,
} from '../../types';
import { Badge } from '../../components/ui/Badge';
import {
  Search,
  Filter,
  PlusCircle,
  FileText,
  Calendar,
  Building2,
  Landmark,
  ArrowRight,
  ShieldCheck,
  ShieldAlert,
  Clock,
  RotateCcw,
  Paperclip,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';

export const FDRListPage: React.FC = () => {
  const navigate = useNavigate();
  const { activeRole, user } = useAuth();

  const [fdrs, setFdrs] = useState<FDR[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [pageSize] = useState<number>(10);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filter state
  const [search, setSearch] = useState<string>('');
  const [selectedBank, setSelectedBank] = useState<string>('');
  const [selectedInstitution, setSelectedInstitution] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [selectedTier, setSelectedTier] = useState<string>('');
  const [selectedRegion, setSelectedRegion] = useState<string>('');

  // Dropdown data
  const [banks, setBanks] = useState<Bank[]>([]);
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [regions, setRegions] = useState<Region[]>([]);
  const [stats, setStats] = useState<FDRSummaryStats | null>(null);

  useEffect(() => {
    loadFilterOptions();
  }, []);

  useEffect(() => {
    loadFDRs();
  }, [page, search, selectedBank, selectedInstitution, selectedStatus, selectedTier, selectedRegion]);

  const loadFilterOptions = async () => {
    try {
      const [banksData, instsData, regsData, statsData] = await Promise.all([
        fetchBanks(),
        fetchInstitutions(),
        fetchRegions(),
        fetchFDRStats(),
      ]);
      setBanks(banksData);
      setInstitutions(instsData);
      setRegions(regsData);
      setStats(statsData);
    } catch (err: any) {
      console.error('Failed to load filter catalogs:', err);
    }
  };

  const loadFDRs = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetchFDRs({
        page,
        page_size: pageSize,
        search: search.trim() || undefined,
        bank_id: selectedBank || undefined,
        institution_id: selectedInstitution || undefined,
        lifecycle_status: selectedStatus || undefined,
        trust_tier: selectedTier ? Number(selectedTier) : undefined,
        region_id: selectedRegion || undefined,
      });
      setFdrs(res.items);
      setTotal(res.total);
    } catch (err: any) {
      setError(err.message || 'Failed to retrieve FDR repository records.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetFilters = () => {
    setSearch('');
    setSelectedBank('');
    setSelectedInstitution('');
    setSelectedStatus('');
    setSelectedTier('');
    setSelectedRegion('');
    setPage(1);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatShortDate = (dateStr: string) => {
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

  const getDaysRemaining = (maturityDateStr: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const maturity = new Date(maturityDateStr);
    maturity.setHours(0, 0, 0, 0);
    const diffTime = maturity.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getStatusBadge = (status: FDRLifecycleStatus) => {
    switch (status) {
      case 'active':
        return <Badge variant="success">Active</Badge>;
      case 'pending':
        return <Badge variant="warning">Pending Verification</Badge>;
      case 'under_review':
        return <Badge variant="info">Under Review</Badge>;
      case 'matured':
        return <Badge variant="default">Matured</Badge>;
      case 'released':
        return <Badge variant="navy">Released</Badge>;
      case 'invoked':
        return <Badge variant="danger">Invoked</Badge>;
      default:
        return <Badge variant="default">{status}</Badge>;
    }
  };

  const getTierBadge = (tier: number, verificationStatus: string) => {
    if (tier === 1) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-amber-50 text-amber-800 border border-amber-200">
          <ShieldAlert className="w-3 h-3 text-amber-600" />
          <span>Tier 1 (Institution Declared)</span>
        </span>
      );
    }
    if (tier === 2) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-blue-50 text-blue-800 border border-blue-200">
          <ShieldCheck className="w-3 h-3 text-blue-600" />
          <span>Tier 2 (Bank Confirmed)</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-50 text-emerald-800 border border-emerald-200">
        <ShieldCheck className="w-3 h-3 text-emerald-600" />
        <span>Tier 3 (Signed Token)</span>
      </span>
    );
  };

  const totalPages = Math.ceil(total / pageSize) || 1;
  const canRegister = activeRole === 'institution_user' || activeRole === 'system_admin';

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-lg border border-gov-border shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase bg-[#12345A]/10 text-gov-navy rounded">
              Phase 2 Operational
            </span>
            <span className="text-xs text-gov-muted font-medium">Sovereign Deposit Registry</span>
          </div>
          <h1 className="text-2xl font-bold text-gov-navy tracking-tight mt-1">
            FDR Central Repository
          </h1>
          <p className="text-sm text-gov-muted mt-0.5">
            Cryptographically audited Fixed Deposit Receipts, institutional lien records, and custodial verification statuses.
          </p>
        </div>

        {canRegister && (
          <button
            onClick={() => navigate('/fdrs/new')}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-gov-navy hover:bg-gov-navy-light text-white text-xs font-semibold rounded-md shadow-xs transition-colors"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Register New FDR</span>
          </button>
        )}
      </div>

      {/* Real Aggregate Metric Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-lg border border-gov-border shadow-xs">
            <div className="text-[11px] font-medium text-gov-muted uppercase tracking-wider">
              Total Custodial Value
            </div>
            <div className="text-xl font-bold text-gov-navy mt-1">
              {formatCurrency(stats.total_amount)}
            </div>
            <div className="text-[11px] text-gov-muted mt-1">
              Across <span className="font-semibold text-gov-text">{stats.total_fdrs}</span> active & pending deposits
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg border border-gov-border shadow-xs">
            <div className="text-[11px] font-medium text-amber-700 uppercase tracking-wider flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              <span>Pending E-Verification</span>
            </div>
            <div className="text-xl font-bold text-amber-800 mt-1">
              {stats.pending_count}
            </div>
            <div className="text-[11px] text-gov-muted mt-1">
              Tier 1 records awaiting bank action
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg border border-gov-border shadow-xs">
            <div className="text-[11px] font-medium text-emerald-700 uppercase tracking-wider flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Active Verified FDRs</span>
            </div>
            <div className="text-xl font-bold text-emerald-800 mt-1">
              {stats.active_count}
            </div>
            <div className="text-[11px] text-gov-muted mt-1">
              Confirmatory lien standing intact
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg border border-gov-border shadow-xs">
            <div className="text-[11px] font-medium text-blue-700 uppercase tracking-wider flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Maturing Soon (90d)</span>
            </div>
            <div className="text-xl font-bold text-blue-800 mt-1">
              {stats.upcoming_maturity_90d}
            </div>
            <div className="text-[11px] text-gov-muted mt-1">
              <span className="font-semibold text-gov-text">{stats.upcoming_maturity_30d}</span> within 30 days
            </div>
          </div>
        </div>
      )}

      {/* Multi-Attribute Filter & Search Toolbar */}
      <div className="bg-white p-4 rounded-lg border border-gov-border shadow-xs space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-gov-border">
          <div className="flex items-center gap-2 text-xs font-semibold text-gov-navy">
            <Filter className="w-3.5 h-3.5 text-gov-blue" />
            <span>Search & Multi-Attribute Filtering</span>
          </div>
          {(search || selectedBank || selectedInstitution || selectedStatus || selectedTier || selectedRegion) && (
            <button
              onClick={handleResetFilters}
              className="inline-flex items-center gap-1 text-[11px] font-medium text-gov-blue hover:text-gov-navy transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset Filters</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          {/* Search Input */}
          <div className="lg:col-span-2 relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gov-muted" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search FDR No, Lien, IFSC..."
              className="w-full pl-8 pr-3 py-1.5 text-xs border border-gov-border rounded focus:outline-none focus:ring-1 focus:ring-gov-navy"
            />
          </div>

          {/* Depository Bank Filter */}
          <div>
            <select
              value={selectedBank}
              onChange={(e) => {
                setSelectedBank(e.target.value);
                setPage(1);
              }}
              className="w-full px-2.5 py-1.5 text-xs border border-gov-border rounded bg-white text-gov-text focus:outline-none focus:ring-1 focus:ring-gov-navy"
            >
              <option value="">All Banks</option>
              {banks.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.code})
                </option>
              ))}
            </select>
          </div>

          {/* Lifecycle Status Filter */}
          <div>
            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setPage(1);
              }}
              className="w-full px-2.5 py-1.5 text-xs border border-gov-border rounded bg-white text-gov-text focus:outline-none focus:ring-1 focus:ring-gov-navy"
            >
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="active">Active</option>
              <option value="under_review">Under Review</option>
              <option value="matured">Matured</option>
              <option value="released">Released</option>
              <option value="invoked">Invoked</option>
            </select>
          </div>

          {/* Trust Tier Filter */}
          <div>
            <select
              value={selectedTier}
              onChange={(e) => {
                setSelectedTier(e.target.value);
                setPage(1);
              }}
              className="w-full px-2.5 py-1.5 text-xs border border-gov-border rounded bg-white text-gov-text focus:outline-none focus:ring-1 focus:ring-gov-navy"
            >
              <option value="">All Trust Tiers</option>
              <option value="1">Tier 1 (Institution Declared)</option>
              <option value="2">Tier 2 (Bank Verified)</option>
              <option value="3">Tier 3 (Digitally Signed)</option>
            </select>
          </div>

          {/* Region Filter */}
          <div>
            <select
              value={selectedRegion}
              onChange={(e) => {
                setSelectedRegion(e.target.value);
                setPage(1);
              }}
              className="w-full px-2.5 py-1.5 text-xs border border-gov-border rounded bg-white text-gov-text focus:outline-none focus:ring-1 focus:ring-gov-navy"
            >
              <option value="">All Regions</option>
              {regions.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Main FDR Data Table */}
      <div className="bg-white rounded-lg border border-gov-border shadow-xs overflow-hidden">
        {error && (
          <div className="p-4 bg-red-50 text-red-700 text-xs border-b border-red-200">
            {error}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gov-bg border-b border-gov-border text-[11px] font-semibold text-gov-navy uppercase tracking-wider">
                <th className="py-3 px-4">FDR Identifier & Bank</th>
                <th className="py-3 px-4">Depositor Institution</th>
                <th className="py-3 px-4">Lien Beneficiary</th>
                <th className="py-3 px-4">Principal Amount</th>
                <th className="py-3 px-4">Maturity / Tenor</th>
                <th className="py-3 px-4">Trust Tier</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-center">Docs</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gov-border text-xs">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-gov-muted">
                    <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-gov-navy border-t-transparent mb-2" />
                    <p>Loading FDR records from secure vault...</p>
                  </td>
                </tr>
              ) : fdrs.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-gov-muted">
                    <FileText className="w-8 h-8 text-gov-border mx-auto mb-2" />
                    <p className="font-semibold text-gov-text">No FDR records found</p>
                    <p className="text-[11px] text-gov-muted mt-1">
                      Try resetting your filters or register a new FDR deposit record.
                    </p>
                  </td>
                </tr>
              ) : (
                fdrs.map((fdr) => {
                  const daysRemaining = getDaysRemaining(fdr.maturity_date);
                  const isExpiringSoon = daysRemaining > 0 && daysRemaining <= 60;
                  const isExpired = daysRemaining <= 0;

                  return (
                    <tr
                      key={fdr.id}
                      className="hover:bg-gov-light/60 transition-colors cursor-pointer"
                      onClick={() => navigate(`/fdrs/${fdr.id}`)}
                    >
                      {/* FDR Number & Bank */}
                      <td className="py-3 px-4">
                        <div className="font-mono font-bold text-gov-navy">
                          {fdr.fdr_number}
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px] text-gov-muted mt-0.5">
                          <Landmark className="w-3 h-3 text-gov-muted shrink-0" />
                          <span className="font-medium text-gov-text">
                            {fdr.bank_name || 'Bank'}
                          </span>
                          <span className="text-[10px] bg-gray-100 text-gray-700 px-1 rounded font-mono">
                            {fdr.ifsc_code}
                          </span>
                        </div>
                      </td>

                      {/* Institution */}
                      <td className="py-3 px-4">
                        <div className="font-medium text-gov-text line-clamp-1">
                          {fdr.institution_name || 'Autonomous Body'}
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] text-gov-muted mt-0.5">
                          <Building2 className="w-3 h-3 text-gov-muted shrink-0" />
                          <span>{fdr.region_name || 'All-India Scope'}</span>
                        </div>
                      </td>

                      {/* Lien In Favour Of */}
                      <td className="py-3 px-4 max-w-[200px]">
                        <div className="font-medium text-gov-text truncate" title={fdr.lien_in_favour}>
                          {fdr.lien_in_favour}
                        </div>
                        {fdr.remarks && (
                          <div className="text-[10px] text-gov-muted truncate mt-0.5">
                            {fdr.remarks}
                          </div>
                        )}
                      </td>

                      {/* Principal Amount & Rate */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-gov-navy text-[13px]">
                          {formatCurrency(fdr.amount)}
                        </div>
                        {fdr.interest_rate && (
                          <div className="text-[10px] text-emerald-700 font-medium">
                            {fdr.interest_rate}% p.a.
                          </div>
                        )}
                      </td>

                      {/* Maturity & Days Remaining */}
                      <td className="py-3 px-4">
                        <div className="font-medium text-gov-text flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-gov-muted" />
                          <span>{formatShortDate(fdr.maturity_date)}</span>
                        </div>
                        <div className="text-[10px] mt-0.5">
                          {isExpired ? (
                            <span className="text-red-700 font-semibold">Matured</span>
                          ) : isExpiringSoon ? (
                            <span className="text-amber-700 font-semibold">
                              {daysRemaining} days left
                            </span>
                          ) : (
                            <span className="text-gov-muted">{daysRemaining} days left</span>
                          )}
                        </div>
                      </td>

                      {/* Trust Tier */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {getTierBadge(fdr.trust_tier, fdr.verification_status)}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {getStatusBadge(fdr.lifecycle_status)}
                      </td>

                      {/* Documents Count */}
                      <td className="py-3 px-4 text-center">
                        <span className="inline-flex items-center gap-0.5 text-[11px] text-gov-muted font-medium bg-gray-100 px-1.5 py-0.5 rounded">
                          <Paperclip className="w-3 h-3" />
                          {fdr.documents?.length || 0}
                        </span>
                      </td>

                      {/* Action */}
                      <td className="py-3 px-4 text-right">
                        <Link
                          to={`/fdrs/${fdr.id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-gov-blue hover:text-gov-navy transition-colors"
                        >
                          <span>Inspect</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Toolbar */}
        <div className="p-3 bg-gov-bg/60 border-t border-gov-border flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gov-muted">
          <div>
            Showing{' '}
            <span className="font-semibold text-gov-text">
              {total === 0 ? 0 : (page - 1) * pageSize + 1}
            </span>{' '}
            to{' '}
            <span className="font-semibold text-gov-text">
              {Math.min(page * pageSize, total)}
            </span>{' '}
            of <span className="font-semibold text-gov-text">{total}</span> records
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-2.5 py-1 text-xs border border-gov-border rounded bg-white text-gov-text disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gov-light transition-colors"
            >
              Previous
            </button>
            <span className="px-2 text-xs font-medium text-gov-text">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="px-2.5 py-1 text-xs border border-gov-border rounded bg-white text-gov-text disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gov-light transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
