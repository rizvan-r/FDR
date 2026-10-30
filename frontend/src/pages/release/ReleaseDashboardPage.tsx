import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FileCheck2,
  PlusCircle,
  Clock,
  CheckCircle2,
  Building2,
  IndianRupee,
  Search,
  Filter,
  RefreshCw,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react';
import { ReleaseRequestSummary, ReleaseDashboardStats } from '../../types';
import { fetchReleaseDashboardStats, listReleaseRequests } from '../../lib/api';
import { ReleaseStatusBadge } from '../../components/release/ReleaseStatusBadge';

export const ReleaseDashboardPage: React.FC = () => {
  const [stats, setStats] = useState<ReleaseDashboardStats | null>(null);
  const [requests, setRequests] = useState<ReleaseRequestSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [statsData, reqsData] = await Promise.all([
        fetchReleaseDashboardStats(),
        listReleaseRequests(),
      ]);
      setStats(statsData);
      setRequests(reqsData);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredRequests = requests.filter((r) => {
    const matchesSearch =
      r.request_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.fdr_number && r.fdr_number.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (r.institution_name && r.institution_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (r.bank_name && r.bank_name.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = statusFilter === 'all' || r.request_status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const formatCurrency = (amt: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amt);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
              Release & Settlement Governance
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <FileCheck2 className="w-7 h-7 text-[#12345A]" />
            FDR Release, Refund & Closure Management
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Supervisory command for statutory deposit releases, multi-stage approvals, bank lien discharges, and refund ledger reconciliation.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            to="/releases/new"
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-[#1D5F91] hover:bg-[#12345A] rounded-lg shadow-sm transition-colors"
          >
            <PlusCircle className="w-4 h-4" />
            New Release Request
          </Link>
          <Link
            to="/releases/queue"
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg shadow-sm transition-colors"
          >
            <Clock className="w-4 h-4 text-blue-700" />
            Review Queue
          </Link>
          <button
            type="button"
            onClick={loadData}
            disabled={isLoading}
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200"
            title="Refresh Ledger"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Total Release Cases
            </span>
            <div className="text-2xl font-bold text-slate-900 mt-1">
              {stats?.total_requests || requests.length}
            </div>
            <span className="text-xs text-slate-500 mt-0.5 block">
              {stats?.draft_count || 0} in draft
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-[#1D5F91] flex items-center justify-center">
            <FileCheck2 className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Under Review
            </span>
            <div className="text-2xl font-bold text-blue-700 mt-1">
              {stats?.under_review_count || 0}
            </div>
            <span className="text-xs text-blue-600 mt-0.5 block font-medium">
              Multi-tier delegation active
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Awaiting Bank / Refund
            </span>
            <div className="text-2xl font-bold text-amber-700 mt-1">
              {(stats?.bank_release_pending || 0) + (stats?.refund_pending || 0)}
            </div>
            <span className="text-xs text-amber-600 mt-0.5 block font-medium">
              Lien & remittance tracking
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Building2 className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Settled & Closed Corpus
            </span>
            <div className="text-xl font-bold text-emerald-700 mt-1">
              {formatCurrency(stats?.total_released_amount || 0)}
            </div>
            <span className="text-xs text-emerald-600 mt-0.5 block font-medium">
              {stats?.closed_count || 0} cases fully discharged
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Quick Navigation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link
          to="/releases/bank-tracking"
          className="p-4 bg-white border border-slate-200 rounded-xl hover:border-blue-300 hover:shadow-md transition-all group"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Bank Release Tracking</h3>
                <p className="text-xs text-slate-500">Monitor depository bank lien discharges</p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all" />
          </div>
        </Link>

        <Link
          to="/refunds"
          className="p-4 bg-white border border-slate-200 rounded-xl hover:border-blue-300 hover:shadow-md transition-all group"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center group-hover:scale-105 transition-transform">
                <IndianRupee className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Refund Settlement Ledger</h3>
                <p className="text-xs text-slate-500">Reconcile returned institutional corpus</p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all" />
          </div>
        </Link>

        <Link
          to="/admin/release-policies"
          className="p-4 bg-white border border-slate-200 rounded-xl hover:border-blue-300 hover:shadow-md transition-all group"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center group-hover:scale-105 transition-transform">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Release Policy Engine</h3>
                <p className="text-xs text-slate-500">Configure checklists & delegation stages</p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all" />
          </div>
        </Link>
      </div>

      {/* Main Release Requests Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        {/* Table Filters Header */}
        <div className="p-4 border-b border-slate-200 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="relative flex-1 sm:w-80">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search by case #, FDR #, institution, bank..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full text-xs pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <Filter className="w-3.5 h-3.5 text-slate-500" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="all">All Release States</option>
              <option value="draft">Draft</option>
              <option value="preliminary_review">Preliminary Review</option>
              <option value="eligibility_review">Eligibility Review</option>
              <option value="finance_review">Finance Review</option>
              <option value="approved">Approved</option>
              <option value="bank_confirmed">Bank Confirmed</option>
              <option value="closed">Closed & Discharged</option>
              <option value="rejected">Rejected</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
            <thead className="bg-slate-50/70 font-semibold text-slate-600">
              <tr>
                <th className="px-5 py-3">Request Number</th>
                <th className="px-5 py-3">FDR Details</th>
                <th className="px-5 py-3">Institution</th>
                <th className="px-5 py-3 text-right">Principal Sum</th>
                <th className="px-5 py-3">Request Status</th>
                <th className="px-5 py-3">Bank Release</th>
                <th className="px-5 py-3">Refund Status</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[#1D5F91]" />
                    Loading release requests registry...
                  </td>
                </tr>
              ) : filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center text-slate-400">
                    No release requests found matching your filter criteria.
                  </td>
                </tr>
              ) : (
                filteredRequests.map((req) => (
                  <tr key={req.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-5 py-3.5 font-mono font-semibold text-slate-900">
                      <Link
                        to={`/releases/${req.id}`}
                        className="text-[#1D5F91] hover:underline hover:text-[#12345A]"
                      >
                        {req.request_number}
                      </Link>
                      <span className="block text-[11px] text-slate-400 font-sans mt-0.5">
                        {new Date(req.created_at).toLocaleDateString()}
                      </span>
                    </td>

                    <td className="px-5 py-3.5">
                      <div className="font-medium text-slate-900">
                        {req.fdr_number || req.fdr_id}
                      </div>
                      <div className="text-[11px] text-slate-500">{req.bank_name || 'Commercial Bank'}</div>
                    </td>

                    <td className="px-5 py-3.5">
                      <div className="font-medium text-slate-800 line-clamp-1 max-w-[200px]">
                        {req.institution_name || 'AICTE Affiliated Institution'}
                      </div>
                      <div className="text-[11px] text-slate-400">{req.policy_version || 'APH Policy'}</div>
                    </td>

                    <td className="px-5 py-3.5 text-right font-bold text-slate-900">
                      {formatCurrency(req.principal_amount || 0)}
                    </td>

                    <td className="px-5 py-3.5">
                      <ReleaseStatusBadge status={req.request_status} type="request" size="sm" />
                    </td>

                    <td className="px-5 py-3.5">
                      <ReleaseStatusBadge
                        status={req.bank_release_status || 'not_started'}
                        type="bank"
                        size="sm"
                      />
                    </td>

                    <td className="px-5 py-3.5">
                      <ReleaseStatusBadge
                        status={req.refund_status || 'pending'}
                        type="refund"
                        size="sm"
                      />
                    </td>

                    <td className="px-5 py-3.5 text-right">
                      <Link
                        to={`/releases/${req.id}`}
                        className="inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold text-[#1D5F91] bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                      >
                        Manage
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
