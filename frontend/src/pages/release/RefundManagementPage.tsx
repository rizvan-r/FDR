import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  IndianRupee,
  Search,
  Filter,
  RefreshCw,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  FileText,
  Clock,
  ArrowDownRight,
  Building2,
} from 'lucide-react';
import { ReleaseRequestSummary } from '../../types';
import { listReleaseRequests } from '../../lib/api';
import { ReleaseStatusBadge } from '../../components/release/ReleaseStatusBadge';

export const RefundManagementPage: React.FC = () => {
  const [requests, setRequests] = useState<ReleaseRequestSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const loadData = async () => {
    setIsLoading(true);
    try {
      const data = await listReleaseRequests();
      // Only include cases that are in approval or later stages where refund is tracked
      setRequests(data);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const totalExpected = requests.reduce((sum, r) => sum + (r.principal_amount || 0), 0);
  const reconciledCases = requests.filter((r) => r.refund_status === 'reconciled').length;
  const pendingCases = requests.filter((r) => r.refund_status === 'pending' || r.refund_status === 'reconciliation_pending').length;

  const filtered = requests.filter((r) => {
    const matchesSearch =
      r.request_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.fdr_number && r.fdr_number.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (r.institution_name && r.institution_name.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = statusFilter === 'all' || r.refund_status === statusFilter;
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
            <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-teal-50 text-teal-800 border border-teal-200">
              Financial Treasury Ledger
            </span>
            <span className="text-xs text-slate-500 font-medium">Phase 8</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <IndianRupee className="w-7 h-7 text-[#12345A]" />
            Refund Settlement & Treasury Reconciliation
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Tracking returned principal funds, accrued interest reconciliation, and institutional banking remittances.
          </p>
        </div>

        <button
          type="button"
          onClick={loadData}
          disabled={isLoading}
          className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg shadow-sm transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh Ledger
        </button>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Total Encumbered Corpus
            </span>
            <div className="text-xl font-bold text-slate-900 mt-1">
              {formatCurrency(totalExpected)}
            </div>
            <span className="text-xs text-slate-500 mt-0.5 block">
              Across {requests.length} release requests
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-[#1D5F91] flex items-center justify-center">
            <IndianRupee className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Reconciliation Pending
            </span>
            <div className="text-xl font-bold text-amber-700 mt-1">
              {pendingCases} Cases
            </div>
            <span className="text-xs text-amber-600 mt-0.5 block font-medium">
              Awaiting treasury credit confirmation
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Reconciled Settlements
            </span>
            <div className="text-xl font-bold text-emerald-700 mt-1">
              {reconciledCases} Cases
            </div>
            <span className="text-xs text-emerald-600 mt-0.5 block font-medium">
              Full institutional settlement confirmed
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Filter and Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 sm:w-80">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by case #, FDR #, institution..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full text-xs pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center gap-2.5">
            <Filter className="w-3.5 h-3.5 text-slate-500" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="all">All Refund States</option>
              <option value="pending">Refund Pending</option>
              <option value="partially_received">Partially Received</option>
              <option value="received">Received (Unreconciled)</option>
              <option value="reconciliation_pending">Reconciliation Pending</option>
              <option value="reconciled">Reconciled</option>
              <option value="disputed">Disputed</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
            <thead className="bg-slate-50/70 font-semibold text-slate-600">
              <tr>
                <th className="px-5 py-3">Case Number</th>
                <th className="px-5 py-3">FDR & Bank</th>
                <th className="px-5 py-3">Beneficiary Institution</th>
                <th className="px-5 py-3 text-right">Expected Refund</th>
                <th className="px-5 py-3">Refund Status</th>
                <th className="px-5 py-3">Case Status</th>
                <th className="px-5 py-3 text-right">Ledger Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[#1D5F91]" />
                    Loading refund ledger...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-slate-400">
                    No refund cases found.
                  </td>
                </tr>
              ) : (
                filtered.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-5 py-3.5 font-mono font-semibold text-slate-900">
                      <Link
                        to={`/releases/${r.id}`}
                        className="text-[#1D5F91] hover:underline hover:text-[#12345A]"
                      >
                        {r.request_number}
                      </Link>
                    </td>

                    <td className="px-5 py-3.5">
                      <div className="font-medium text-slate-900">{r.fdr_number || r.fdr_id}</div>
                      <div className="text-[11px] text-slate-500">{r.bank_name || 'Designated Bank'}</div>
                    </td>

                    <td className="px-5 py-3.5 text-slate-800 font-medium">
                      {r.institution_name}
                    </td>

                    <td className="px-5 py-3.5 text-right font-bold text-slate-900">
                      {formatCurrency(r.principal_amount || 0)}
                    </td>

                    <td className="px-5 py-3.5">
                      <ReleaseStatusBadge
                        status={r.refund_status || 'pending'}
                        type="refund"
                        size="sm"
                      />
                    </td>

                    <td className="px-5 py-3.5">
                      <ReleaseStatusBadge status={r.request_status} type="request" size="sm" />
                    </td>

                    <td className="px-5 py-3.5 text-right">
                      <Link
                        to={`/releases/${r.id}`}
                        className="inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold text-[#1D5F91] bg-teal-50 hover:bg-teal-100 rounded-lg transition-colors"
                      >
                        Ledger
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
