import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { RenewalDashboardStats, RenewalCase } from '../../types';
import { fetchRenewalDashboardStats, fetchRenewalCases } from '../../lib/api';
import { RenewalStatusBadge } from '../../components/renewals/RenewalStatusBadge';
import { RenewalCaseCard } from '../../components/renewals/RenewalCaseCard';
import { RenewalHistoryTable } from '../../components/renewals/RenewalHistoryTable';

export const RenewalDashboardPage: React.FC = () => {
  const [stats, setStats] = useState<RenewalDashboardStats | null>(null);
  const [cases, setCases] = useState<RenewalCase[]>([]);
  const [activeTab, setActiveTab] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('table');

  const loadData = async () => {
    try {
      setLoading(true);
      const [statsData, casesData] = await Promise.all([
        fetchRenewalDashboardStats(),
        fetchRenewalCases({
          status: activeTab === 'all' ? undefined : activeTab,
          search: searchTerm || undefined,
        }),
      ]);
      setStats(statsData);
      setCases(casesData.items);
    } catch (err) {
      console.error('Failed to load renewal dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeTab, searchTerm]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded border border-blue-200">
              Phase 5
            </span>
            <span className="text-xs font-medium text-slate-500">
              Lifecycle Governance & Lineage Integrity
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Renewal Management & Lineage Desk
          </h1>
          <p className="text-sm text-slate-600 mt-1 max-w-2xl">
            Track deposit maturities, submit verified renewal cases, evaluate 6-signal candidate matches,
            and establish immutable directed acyclic graph (DAG) lineage relationships.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Link
            to="/renewals/queue"
            className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 font-semibold text-xs hover:bg-slate-50 transition-colors shadow-sm inline-flex items-center gap-2"
          >
            <span>Officer Queue</span>
            {stats && stats.pending_officer_review > 0 && (
              <span className="px-1.5 py-0.2 bg-amber-500 text-white rounded-full text-[10px]">
                {stats.pending_officer_review}
              </span>
            )}
          </Link>

          <Link
            to="/renewals/new"
            className="px-4 py-2 rounded-lg bg-blue-700 text-white font-semibold text-xs hover:bg-blue-800 transition-colors shadow-sm inline-flex items-center gap-1.5"
          >
            <span>+ Initiate Renewal Case</span>
          </Link>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
            Total Cases
          </span>
          <span className="text-2xl font-bold text-slate-900 mt-1 block">
            {stats?.total_cases ?? '—'}
          </span>
          <span className="text-[10px] text-slate-400">All registered cases</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
            Drafts
          </span>
          <span className="text-2xl font-bold text-slate-700 mt-1 block">
            {stats?.draft_cases ?? '—'}
          </span>
          <span className="text-[10px] text-slate-400">Pending submission</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700 block">
            Submitted
          </span>
          <span className="text-2xl font-bold text-blue-800 mt-1 block">
            {stats?.submitted_cases ?? '—'}
          </span>
          <span className="text-[10px] text-blue-600">Awaiting queue</span>
        </div>

        <div className="bg-white border border-amber-200 bg-amber-50/20 rounded-xl p-4 shadow-sm">
          <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800 block">
            Under Review
          </span>
          <span className="text-2xl font-bold text-amber-800 mt-1 block">
            {stats?.under_review_cases ?? '—'}
          </span>
          <span className="text-[10px] text-amber-700">Officer action req.</span>
        </div>

        <div className="bg-white border border-emerald-200 bg-emerald-50/20 rounded-xl p-4 shadow-sm">
          <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 block">
            Approved & Linked
          </span>
          <span className="text-2xl font-bold text-emerald-800 mt-1 block">
            {stats?.approved_cases ?? '—'}
          </span>
          <span className="text-[10px] text-emerald-700">Lineage committed</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <span className="text-[11px] font-bold uppercase tracking-wider text-rose-700 block">
            Rejected
          </span>
          <span className="text-2xl font-bold text-rose-800 mt-1 block">
            {stats?.rejected_cases ?? '—'}
          </span>
          <span className="text-[10px] text-rose-600">Deficiencies found</span>
        </div>

        <div className="bg-white border border-purple-200 bg-purple-50/20 rounded-xl p-4 shadow-sm">
          <span className="text-[11px] font-bold uppercase tracking-wider text-purple-800 block">
            Upcoming Mat. (30d)
          </span>
          <span className="text-2xl font-bold text-purple-800 mt-1 block">
            {stats?.upcoming_maturities_30d ?? '—'}
          </span>
          <span className="text-[10px] text-purple-700">Prompt renewal</span>
        </div>
      </div>

      {/* Main Content Workspace */}
      <div className="space-y-4">
        {/* Filter and Tab Bar */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-1.5 border-b md:border-b-0 pb-2 md:pb-0">
            {[
              { id: 'all', label: 'All Cases' },
              { id: 'under_review', label: 'Under Review' },
              { id: 'draft', label: 'Drafts' },
              { id: 'approved', label: 'Approved & Linked' },
              { id: 'rejected', label: 'Rejected' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  activeTab === tab.id
                    ? 'bg-blue-700 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <input
              type="text"
              placeholder="Search case #, FDR #, notes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="text-xs border border-slate-300 rounded-lg px-3 py-1.5 w-64 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />

            <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden">
              <button
                onClick={() => setViewMode('table')}
                className={`px-2.5 py-1.5 text-xs font-medium ${
                  viewMode === 'table' ? 'bg-slate-200 text-slate-900' : 'text-slate-500 hover:bg-slate-50'
                }`}
                title="Table View"
              >
                ☰
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`px-2.5 py-1.5 text-xs font-medium ${
                  viewMode === 'grid' ? 'bg-slate-200 text-slate-900' : 'text-slate-500 hover:bg-slate-50'
                }`}
                title="Grid View"
              >
                ⊞
              </button>
            </div>
          </div>
        </div>

        {/* Loading / Results View */}
        {loading ? (
          <div className="p-12 text-center text-slate-500 bg-white border border-slate-200 rounded-xl text-sm">
            Loading renewal cases...
          </div>
        ) : cases.length === 0 ? (
          <div className="p-12 text-center text-slate-400 bg-white border border-slate-200 rounded-xl text-sm">
            No renewal cases match your selected filter criteria.
          </div>
        ) : viewMode === 'table' ? (
          <RenewalHistoryTable cases={cases} />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {cases.map((c) => (
              <RenewalCaseCard key={c.id} renewalCase={c} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
