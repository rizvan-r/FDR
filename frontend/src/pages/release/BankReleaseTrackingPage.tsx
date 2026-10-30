import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Building2,
  Search,
  Filter,
  RefreshCw,
  ArrowRight,
  ShieldAlert,
  CheckCircle2,
  Clock,
  XCircle,
  Send,
  ArrowLeft,
} from 'lucide-react';
import { ReleaseRequestSummary } from '../../types';
import { listReleaseRequests } from '../../lib/api';
import { ReleaseStatusBadge } from '../../components/release/ReleaseStatusBadge';

export const BankReleaseTrackingPage: React.FC = () => {
  const [requests, setRequests] = useState<ReleaseRequestSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const loadData = async () => {
    setIsLoading(true);
    try {
      const data = await listReleaseRequests();
      setRequests(data);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const totalInstructions = requests.filter(
    (r) => r.bank_release_status && r.bank_release_status !== 'not_started'
  ).length;
  const releasedCount = requests.filter((r) => r.bank_release_status === 'released').length;
  const awaitingCount = requests.filter(
    (r) =>
      r.bank_release_status === 'instruction_prepared' ||
      r.bank_release_status === 'awaiting_bank' ||
      r.bank_release_status === 'unconfirmed'
  ).length;

  const filtered = requests.filter((r) => {
    const matchesSearch =
      r.request_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.fdr_number && r.fdr_number.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (r.bank_name && r.bank_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (r.institution_name && r.institution_name.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus =
      statusFilter === 'all' || (r.bank_release_status || 'not_started') === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <Link
              to="/releases"
              className="text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors inline-flex items-center gap-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Releases
            </Link>
            <span className="text-slate-300">/</span>
            <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
              Commercial Bank Interface
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <Building2 className="w-7 h-7 text-[#12345A]" />
            Commercial Depository Bank Release Surveillance
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Tracking statutory lien discharge instructions and depository bank confirmations across core banking branches.
          </p>
        </div>

        <button
          type="button"
          onClick={loadData}
          disabled={isLoading}
          className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg shadow-sm transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh Registry
        </button>
      </div>

      {/* Strict Simulated Demo Disclaimer Alert */}
      <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3 text-xs text-amber-900">
        <ShieldAlert className="w-5 h-5 text-amber-700 flex-shrink-0 mt-0.5" />
        <div>
          <span className="font-bold tracking-wide">STATUTORY BANKING SIMULATION NOTICE:</span>{' '}
          All bank release instructions and confirmations operate within the AICTE-approved demonstration sandbox.
          <strong> SIMULATED DEMO — NOT AN ACTUAL BANK MONEY TRANSFER.</strong> Lien discharge state updates are for regulatory validation and audit trial compliance.
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Dispatched Instructions
            </span>
            <div className="text-2xl font-bold text-slate-900 mt-1">
              {totalInstructions}
            </div>
            <span className="text-xs text-slate-500 mt-0.5 block">
              Formal release instructions issued
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-[#1D5F91] flex items-center justify-center">
            <Send className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Awaiting Confirmation
            </span>
            <div className="text-2xl font-bold text-amber-700 mt-1">
              {awaitingCount}
            </div>
            <span className="text-xs text-amber-600 mt-0.5 block font-medium">
              Pending depository branch response
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Confirmed Lien Discharges
            </span>
            <div className="text-2xl font-bold text-emerald-700 mt-1">
              {releasedCount}
            </div>
            <span className="text-xs text-emerald-600 mt-0.5 block font-medium">
              FDRs transitioned to 'Released'
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
              placeholder="Search by case #, FDR #, bank..."
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
              <option value="all">All Bank Release States</option>
              <option value="not_started">Not Dispatched</option>
              <option value="instruction_prepared">Instruction Prepared</option>
              <option value="awaiting_bank">Awaiting Bank</option>
              <option value="released">Lien Released (Confirmed)</option>
              <option value="release_rejected">Release Rejected</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
            <thead className="bg-slate-50/70 font-semibold text-slate-600">
              <tr>
                <th className="px-5 py-3">Case Number</th>
                <th className="px-5 py-3">FDR Identification</th>
                <th className="px-5 py-3">Issuing Depository Bank</th>
                <th className="px-5 py-3">Institution Name</th>
                <th className="px-5 py-3">Bank Release Standing</th>
                <th className="px-5 py-3">Case Status</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[#1D5F91]" />
                    Loading depository release records...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-slate-400">
                    No bank release records matching criteria.
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

                    <td className="px-5 py-3.5 font-medium text-slate-900">
                      {r.fdr_number || r.fdr_id}
                    </td>

                    <td className="px-5 py-3.5 font-medium text-slate-800">
                      {r.bank_name || 'Designated Commercial Bank'}
                    </td>

                    <td className="px-5 py-3.5 text-slate-600">
                      {r.institution_name}
                    </td>

                    <td className="px-5 py-3.5">
                      <ReleaseStatusBadge
                        status={r.bank_release_status || 'not_started'}
                        type="bank"
                        size="sm"
                      />
                    </td>

                    <td className="px-5 py-3.5">
                      <ReleaseStatusBadge status={r.request_status} type="request" size="sm" />
                    </td>

                    <td className="px-5 py-3.5 text-right">
                      <Link
                        to={`/releases/${r.id}`}
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
