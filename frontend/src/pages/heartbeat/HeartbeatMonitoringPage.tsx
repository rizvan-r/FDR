import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  Search,
  Filter,
  RefreshCw,
  ExternalLink,
  Send,
  X,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Building,
  Landmark,
} from 'lucide-react';
import { FDR, FDRHeartbeatStatus, HeartbeatCheck } from '../../types';
import { fetchMonitoredFDRs, triggerManualHeartbeatCheck } from '../../lib/api';
import { HeartbeatStatusBadge } from '../../components/common/HeartbeatStatusBadge';
import { TrustTierBadge } from '../../components/common/TrustTierBadge';
import { MaturityCountdown } from '../../components/common/MaturityCountdown';

export const HeartbeatMonitoringPage: React.FC = () => {
  const [fdrs, setFdrs] = useState<FDR[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [search, setSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  // Trigger Check Modal state
  const [selectedFDRForCheck, setSelectedFDRForCheck] = useState<FDR | null>(null);
  const [checkNotes, setCheckNotes] = useState('');
  const [submittingCheck, setSubmittingCheck] = useState(false);
  const [checkFeedback, setCheckFeedback] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const loadMonitoredFDRs = async () => {
    try {
      setLoading(true);
      const res = await fetchMonitoredFDRs({
        heartbeat_status: selectedStatus === 'all' ? undefined : selectedStatus,
        search: search.trim() || undefined,
        page,
        page_size: pageSize,
      });
      setFdrs(res.items || []);
      setTotal(res.total || 0);
    } catch (err: any) {
      console.error('Failed to load monitored FDRs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMonitoredFDRs();
  }, [page, selectedStatus]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadMonitoredFDRs();
  };

  const handleManualCheckSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFDRForCheck) return;

    try {
      setSubmittingCheck(true);
      setCheckFeedback(null);
      await triggerManualHeartbeatCheck(selectedFDRForCheck.id, checkNotes.trim() || undefined);
      setCheckFeedback({
        text: `Heartbeat check successfully dispatched for FDR ${selectedFDRForCheck.fdr_number}.`,
        type: 'success',
      });
      setCheckNotes('');
      // Reload table
      await loadMonitoredFDRs();
      setTimeout(() => {
        setSelectedFDRForCheck(null);
        setCheckFeedback(null);
      }, 1500);
    } catch (err: any) {
      setCheckFeedback({
        text: err.message || 'Failed to dispatch heartbeat check.',
        type: 'error',
      });
    } finally {
      setSubmittingCheck(false);
    }
  };

  const statusTabs = [
    { id: 'all', label: 'All Monitored' },
    { id: 'alive', label: 'Alive' },
    { id: 'stale', label: 'Stale' },
    { id: 'broken', label: 'Broken' },
    { id: 'unresponsive', label: 'Unresponsive' },
    { id: 'not_started', label: 'Not Started' },
  ];

  const formatAmountINR = (amt: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amt);
  };

  const formatDate = (isoString?: string) => {
    if (!isoString) return '—';
    try {
      return new Date(isoString).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#1D5F91]">
            <Activity className="w-4 h-4 text-emerald-600" />
            Active Surveillance Registry
          </div>
          <h1 className="text-2xl font-bold text-[#12345A] mt-1">
            Monitored Public Sector Deposits
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Real-time status tracking, automated interval scheduling, and manual verification dispatch.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/heartbeat"
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-xs font-semibold rounded-lg shadow-xs transition-colors"
          >
            <span>&larr; Overview Dashboard</span>
          </Link>
          <button
            type="button"
            onClick={loadMonitoredFDRs}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors"
            title="Refresh Table"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-4">
        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 border-b border-slate-100 text-xs">
          {statusTabs.map((tab) => {
            const isActive = selectedStatus === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setSelectedStatus(tab.id);
                  setPage(1);
                }}
                className={`px-3 py-1.5 font-medium rounded-lg whitespace-nowrap transition-colors ${
                  isActive
                    ? 'bg-[#12345A] text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Search Input */}
        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by FDR number, bank name, or institution..."
              className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-xs focus:outline-hidden focus:ring-2 focus:ring-[#1D5F91]"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-[#12345A] hover:bg-[#1D5F91] text-white text-xs font-semibold rounded-lg transition-colors"
          >
            Search
          </button>
          {search && (
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setPage(1);
                loadMonitoredFDRs();
              }}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-semibold rounded-lg transition-colors"
            >
              Clear
            </button>
          )}
        </form>
      </div>

      {/* Monitored FDRs Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">FDR Details</th>
                <th className="py-3 px-4">Depository Bank</th>
                <th className="py-3 px-4 text-right">Amount (INR)</th>
                <th className="py-3 px-4">Maturity Timeline</th>
                <th className="py-3 px-4">Trust Tier</th>
                <th className="py-3 px-4">Heartbeat Status</th>
                <th className="py-3 px-4">Last / Next Check</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[#1D5F91]" />
                    Loading monitored fixed deposits...
                  </td>
                </tr>
              ) : fdrs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <AlertCircle className="w-6 h-6 mx-auto mb-2 text-slate-300" />
                    No fixed deposits matched your search or status filter.
                  </td>
                </tr>
              ) : (
                fdrs.map((fdr) => (
                  <tr key={fdr.id} className="hover:bg-slate-50/80 transition-colors">
                    {/* FDR Details */}
                    <td className="py-3.5 px-4">
                      <Link
                        to={`/fdrs/${fdr.id}`}
                        className="font-bold text-[#12345A] hover:text-[#1D5F91] hover:underline flex items-center gap-1.5"
                      >
                        <span>{fdr.fdr_number}</span>
                        <ExternalLink className="w-3 h-3 text-slate-400" />
                      </Link>
                      <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1">
                        <Building className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="line-clamp-1">{fdr.institution_name || 'PSU Institution'}</span>
                      </div>
                    </td>

                    {/* Bank */}
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-slate-800 flex items-center gap-1.5">
                        <Landmark className="w-3 h-3 text-slate-400 shrink-0" />
                        <span>{fdr.bank_name || 'Commercial Bank'}</span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        IFSC: {fdr.ifsc_code || '—'}
                      </div>
                    </td>

                    {/* Amount */}
                    <td className="py-3.5 px-4 text-right">
                      <span className="font-bold text-slate-900">
                        {formatAmountINR(fdr.amount)}
                      </span>
                    </td>

                    {/* Maturity */}
                    <td className="py-3.5 px-4">
                      <MaturityCountdown maturityDate={fdr.maturity_date} size="sm" showDate />
                    </td>

                    {/* Trust Tier */}
                    <td className="py-3.5 px-4">
                      <TrustTierBadge tier={fdr.trust_tier} size="sm" />
                    </td>

                    {/* Heartbeat Status */}
                    <td className="py-3.5 px-4">
                      <HeartbeatStatusBadge
                        status={fdr.heartbeat_status || 'not_started'}
                        size="sm"
                        lastHeartbeatAt={fdr.last_heartbeat_at}
                        nextHeartbeatAt={fdr.next_heartbeat_at}
                        failureCount={fdr.heartbeat_failure_count}
                        fdrNumber={fdr.fdr_number}
                      />
                    </td>

                    {/* Last / Next Check */}
                    <td className="py-3.5 px-4 text-[11px] text-slate-600 space-y-0.5">
                      <div>
                        <span className="text-slate-400">Last: </span>
                        <span className="font-medium text-slate-700">{formatDate(fdr.last_heartbeat_at)}</span>
                      </div>
                      <div>
                        <span className="text-slate-400">Next: </span>
                        <span className="font-medium text-slate-700">{formatDate(fdr.next_heartbeat_at)}</span>
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedFDRForCheck(fdr);
                            setCheckNotes('');
                            setCheckFeedback(null);
                          }}
                          className="px-2.5 py-1 bg-[#12345A] hover:bg-[#1D5F91] text-white text-[11px] font-semibold rounded transition-colors inline-flex items-center gap-1"
                          title="Trigger immediate heartbeat re-attestation request"
                        >
                          <Send className="w-3 h-3" />
                          <span>Check</span>
                        </button>
                        <Link
                          to={`/fdrs/${fdr.id}`}
                          className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-medium rounded transition-colors"
                          title="View Full FDR Lifecycle"
                        >
                          View
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
          <div>
            Showing <span className="font-semibold">{fdrs.length}</span> of{' '}
            <span className="font-semibold">{total}</span> total deposits
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-3 py-1 bg-white border border-slate-300 rounded hover:bg-slate-100 disabled:opacity-40 transition-colors"
            >
              Previous
            </button>
            <span className="px-2">Page {page}</span>
            <button
              type="button"
              disabled={page * pageSize >= total}
              onClick={() => setPage((p) => p + 1)}
              className="px-3 py-1 bg-white border border-slate-300 rounded hover:bg-slate-100 disabled:opacity-40 transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Manual Check Request Modal */}
      {selectedFDRForCheck && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs"
          onClick={() => !submittingCheck && setSelectedFDRForCheck(null)}
        >
          <div
            className="bg-white rounded-xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden text-left animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-[#12345A] text-white p-5 flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-base">Request Immediate Heartbeat Check</h3>
                <p className="text-xs text-white/75 mt-0.5">
                  FDR #{selectedFDRForCheck.fdr_number}
                </p>
              </div>
              <button
                type="button"
                disabled={submittingCheck}
                onClick={() => setSelectedFDRForCheck(null)}
                className="text-white/80 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleManualCheckSubmit} className="p-6 space-y-4">
              {checkFeedback && (
                <div
                  className={`p-3 rounded-lg text-xs font-medium ${
                    checkFeedback.type === 'success'
                      ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                      : 'bg-rose-50 text-rose-900 border border-rose-200'
                  }`}
                >
                  {checkFeedback.text}
                </div>
              )}

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Bank:</span>
                  <span className="font-semibold text-slate-800">{selectedFDRForCheck.bank_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Current Status:</span>
                  <span className="font-semibold uppercase text-[#1D5F91]">
                    {selectedFDRForCheck.heartbeat_status || 'not_started'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Amount:</span>
                  <span className="font-semibold text-slate-800">{formatAmountINR(selectedFDRForCheck.amount)}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Surveillance Notes / Reason for Request (Optional)
                </label>
                <textarea
                  rows={3}
                  value={checkNotes}
                  onChange={(e) => setCheckNotes(e.target.value)}
                  placeholder="e.g. Quarterly balance sheet audit reconciliation, or interim lien confirmation..."
                  className="w-full p-2.5 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-[#1D5F91] focus:outline-hidden"
                />
              </div>

              <div className="p-3 bg-blue-50/70 border border-blue-200/70 rounded-lg text-[11px] text-blue-900">
                A verification token will be dispatched to the registered bank nodal officer. Response is tracked under policy SLA with automated escalation upon timeout.
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  disabled={submittingCheck}
                  onClick={() => setSelectedFDRForCheck(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingCheck}
                  className="px-4 py-2 bg-[#12345A] hover:bg-[#1D5F91] text-white text-xs font-semibold rounded-lg shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Send className={`w-3.5 h-3.5 ${submittingCheck ? 'animate-spin' : ''}`} />
                  <span>{submittingCheck ? 'Dispatching...' : 'Dispatch Request'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
