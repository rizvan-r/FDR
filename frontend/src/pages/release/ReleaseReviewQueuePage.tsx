import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Clock,
  ShieldCheck,
  Search,
  Filter,
  RefreshCw,
  ArrowRight,
  AlertTriangle,
  Building2,
  CheckCircle2,
  FileCheck2,
  ArrowLeft,
} from 'lucide-react';
import { ReleaseRequestSummary } from '../../types';
import { listReleaseRequests } from '../../lib/api';
import { ReleaseStatusBadge } from '../../components/release/ReleaseStatusBadge';

export const ReleaseReviewQueuePage: React.FC = () => {
  const [requests, setRequests] = useState<ReleaseRequestSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [stageFilter, setStageFilter] = useState('all');

  const loadQueue = async () => {
    setIsLoading(true);
    try {
      const allReqs = await listReleaseRequests();
      // Filter to actionable requests in review pipeline
      const actionable = allReqs.filter((r) =>
        [
          'submitted',
          'preliminary_review',
          'eligibility_review',
          'finance_review',
          'authority_review',
          'approved',
          'release_initiated',
          'bank_confirmed',
        ].includes(r.request_status)
      );
      setRequests(actionable);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadQueue();
  }, []);

  const filteredQueue = requests.filter((r) => {
    const matchesSearch =
      r.request_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.fdr_number && r.fdr_number.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (r.institution_name && r.institution_name.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStage = stageFilter === 'all' || r.request_status === stageFilter;
    return matchesSearch && matchesStage;
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
            <Link
              to="/releases"
              className="text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors inline-flex items-center gap-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Releases
            </Link>
            <span className="text-slate-300">/</span>
            <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
              Supervisory Review Queue
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <Clock className="w-7 h-7 text-[#12345A]" />
            Actionable Release Review Pipeline
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Prioritized regulatory inbox for four-tier delegation review, checklist verification, and sanction orders.
          </p>
        </div>

        <button
          type="button"
          onClick={loadQueue}
          disabled={isLoading}
          className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg shadow-sm transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh Pipeline
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
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
            value={stageFilter}
            onChange={(e) => setStageFilter(e.target.value)}
            className="text-xs bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="all">All Pending Review Stages</option>
            <option value="preliminary_review">Regional Office Preliminary</option>
            <option value="eligibility_review">Approval Bureau Audit</option>
            <option value="finance_review">Finance Review</option>
            <option value="authority_review">Authority Sanction</option>
            <option value="approved">Sanctioned (Awaiting Bank)</option>
            <option value="bank_confirmed">Bank Confirmed (Awaiting Closure)</option>
          </select>
        </div>
      </div>

      {/* Queue Items */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="bg-white p-12 rounded-xl border border-slate-200 text-center text-slate-400 text-xs">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[#1D5F91]" />
            Loading review queue items...
          </div>
        ) : filteredQueue.length === 0 ? (
          <div className="bg-white p-12 rounded-xl border border-slate-200 text-center text-slate-500 text-xs">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
            No actionable cases pending in this review queue stage. All tasks up to date!
          </div>
        ) : (
          filteredQueue.map((item) => (
            <div
              key={item.id}
              className="bg-white border border-slate-200 hover:border-blue-300 rounded-xl p-5 shadow-sm transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="space-y-1.5 flex-1">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className="font-mono font-bold text-slate-900 text-sm">
                    {item.request_number}
                  </span>
                  <ReleaseStatusBadge status={item.request_status} type="request" size="sm" />
                  <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                    FDR: {item.fdr_number || item.fdr_id}
                  </span>
                </div>

                <div className="text-xs text-slate-600 font-medium">
                  {item.institution_name} • <span className="text-slate-500">{item.bank_name}</span>
                </div>

                <div className="text-xs text-slate-500 line-clamp-1 italic">
                  "{item.request_reason}"
                </div>

                <div className="flex items-center gap-4 text-[11px] text-slate-400 pt-1">
                  <span>Policy: {item.policy_version || 'RPV-2026.1'}</span>
                  <span>Submitted: {item.submitted_at ? new Date(item.submitted_at).toLocaleDateString() : 'Pending'}</span>
                </div>
              </div>

              <div className="flex items-center justify-between md:flex-col md:items-end gap-3 pt-3 md:pt-0 border-t md:border-t-0 border-slate-100">
                <div className="text-right">
                  <span className="text-[11px] text-slate-500 font-medium block">Principal Amount</span>
                  <span className="text-base font-bold text-slate-900">
                    {formatCurrency(item.principal_amount || 0)}
                  </span>
                </div>

                <Link
                  to={`/releases/${item.id}`}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#1D5F91] hover:bg-[#12345A] rounded-lg shadow-sm transition-colors"
                >
                  Conduct Audit
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
