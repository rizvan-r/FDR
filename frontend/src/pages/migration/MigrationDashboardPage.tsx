import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FileSpreadsheet,
  UploadCloud,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowRight,
  Filter,
  Search,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { MigrationBatchSummary, MigrationMappingProfile } from '../../types';
import { fetchMigrationBatches, fetchMigrationProfiles } from '../../lib/api';
import { MigrationStatusBadge } from '../../components/migration/MigrationStatusBadge';

export const MigrationDashboardPage: React.FC = () => {
  const [batches, setBatches] = useState<MigrationBatchSummary[]>([]);
  const [profiles, setProfiles] = useState<MigrationMappingProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [batchList, profileList] = await Promise.all([
        fetchMigrationBatches(),
        fetchMigrationProfiles(),
      ]);
      setBatches(batchList);
      setProfiles(profileList);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const totalBatches = batches.length;
  const totalRowsIngested = batches.reduce((acc, b) => acc + (b.imported_rows || 0), 0);
  const batchesNeedingReview = batches.filter((b) => b.batch_status === 'review_required').length;
  const completedBatches = batches.filter((b) => b.batch_status === 'completed').length;

  const filteredBatches = batches.filter((b) => {
    const matchesSearch =
      b.file_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || b.batch_status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white border border-gov-border rounded-lg p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              Legacy Ingestion
            </span>
            <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
              Bulk Spreadsheet Engine
            </span>
          </div>
          <h1 className="text-xl font-bold text-gov-navy">
            Legacy Data Migration & Ingestion Desk
          </h1>
          <p className="text-xs text-gov-muted mt-0.5">
            Safe batch onboarding of legacy paper and spreadsheet deposits into the Central FDR Vault.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            className="p-2 border border-gov-border hover:bg-gov-light text-gov-navy rounded-md transition"
            title="Refresh Batches"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>

          <Link
            to="/migrations/upload"
            className="inline-flex items-center gap-2 px-4 py-2 bg-gov-navy hover:bg-gov-navy-light text-white rounded-md font-semibold text-xs shadow-xs transition"
          >
            <UploadCloud className="w-4 h-4 text-emerald-400" />
            <span>Upload Spreadsheet</span>
          </Link>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 border border-gov-border rounded-lg shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gov-muted">Total Migration Batches</span>
            <FileSpreadsheet className="w-4 h-4 text-gov-blue" />
          </div>
          <p className="text-2xl font-bold text-gov-navy mt-2">{totalBatches}</p>
          <span className="text-[10px] text-gov-muted mt-1 block">Active and historical uploads</span>
        </div>

        <div className="bg-white p-4 border border-gov-border rounded-lg shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gov-muted">Records Ingested</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-bold text-emerald-700 mt-2">{totalRowsIngested}</p>
          <span className="text-[10px] text-emerald-800 mt-1 block font-medium">Initialized at Trust Tier 1</span>
        </div>

        <div className="bg-white p-4 border border-gov-border rounded-lg shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gov-muted">Review Required</span>
            <AlertTriangle className="w-4 h-4 text-orange-600" />
          </div>
          <p className="text-2xl font-bold text-orange-700 mt-2">{batchesNeedingReview}</p>
          <span className="text-[10px] text-orange-800 mt-1 block font-medium">Batches with errors or duplicates</span>
        </div>

        <div className="bg-white p-4 border border-gov-border rounded-lg shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gov-muted">Completed Batches</span>
            <Clock className="w-4 h-4 text-indigo-600" />
          </div>
          <p className="text-2xl font-bold text-gov-navy mt-2">{completedBatches}</p>
          <span className="text-[10px] text-gov-muted mt-1 block">Successfully reconciled into vault</span>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Batches Table (2 cols) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white border border-gov-border rounded-lg p-4 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-72">
              <Search className="w-3.5 h-3.5 text-gov-muted absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search batch filename or ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs border border-gov-border rounded-md bg-gov-light/30 focus:outline-hidden focus:border-gov-blue"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Filter className="w-3.5 h-3.5 text-gov-muted" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="text-xs border border-gov-border rounded-md p-1.5 bg-white focus:outline-hidden"
              >
                <option value="all">All Statuses</option>
                <option value="uploaded">Uploaded</option>
                <option value="mapping">Mapping</option>
                <option value="review_required">Review Required</option>
                <option value="ready">Ready to Import</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          <div className="border border-gov-border rounded-lg overflow-hidden bg-white shadow-2xs">
            <div className="p-3 bg-gov-light border-b border-gov-border flex items-center justify-between">
              <span className="text-xs font-bold text-gov-navy">Migration Batches Queue</span>
              <span className="text-[11px] text-gov-muted">{filteredBatches.length} Batches</span>
            </div>

            {filteredBatches.length === 0 ? (
              <div className="p-8 text-center text-xs text-gov-muted">
                No migration batches found. Upload a spreadsheet to get started.
              </div>
            ) : (
              <div className="divide-y divide-gov-border">
                {filteredBatches.map((b) => (
                  <Link
                    key={b.id}
                    to={`/migrations/${b.id}`}
                    className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/60 transition block"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs text-gov-navy hover:text-gov-blue">
                          {b.file_name}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.2 uppercase font-mono bg-slate-100 text-slate-700 rounded border border-slate-200">
                          {b.file_type}
                        </span>
                        <MigrationStatusBadge status={b.batch_status} size="sm" />
                      </div>
                      <p className="text-[11px] text-gov-muted">
                        Batch ID: <span className="font-mono">{b.id}</span> • Uploaded on{' '}
                        {new Date(b.created_at).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </p>
                    </div>

                    <div className="flex items-center gap-4 text-xs">
                      <div className="text-right">
                        <span className="text-gov-navy font-bold">{b.total_rows} rows</span>
                        <div className="text-[10px] text-gov-muted">
                          {b.valid_rows} valid • {b.invalid_rows} flagged
                        </div>
                      </div>

                      <ArrowRight className="w-4 h-4 text-gov-muted" />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Sidebar: Reusable Profiles & Statutory Info */}
        <div className="space-y-4">
          <div className="bg-white border border-gov-border rounded-lg p-4 shadow-2xs space-y-3">
            <div className="flex items-center gap-2 font-bold text-xs text-gov-navy border-b border-gov-border pb-2">
              <Sparkles className="w-4 h-4 text-gov-blue" />
              <span>Saved Column Mapping Profiles</span>
            </div>
            <p className="text-[11px] text-gov-muted leading-relaxed">
              Standard mapping profiles auto-align spreadsheet headers to canonical FDR fields.
            </p>

            <div className="space-y-2">
              {profiles.map((p) => (
                <div
                  key={p.id}
                  className="p-2.5 rounded border border-gov-border bg-slate-50/50 text-xs space-y-1"
                >
                  <div className="font-semibold text-gov-navy">{p.profile_name}</div>
                  <div className="text-[10px] text-gov-muted">
                    {Object.keys(p.column_mapping).length} columns mapped
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Statutory Trust Tier Invariant Reminder */}
          <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-lg text-amber-950 space-y-2 text-xs">
            <div className="flex items-center gap-2 font-bold text-amber-900">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Strict Trust Tier 1 Invariant</span>
            </div>
            <p className="text-[11px] text-amber-800 leading-relaxed">
              All Fixed Deposits created through legacy ingestion MUST initialize strictly at{' '}
              <strong className="underline">Trust Tier 1 (Pending Bank Verification)</strong> with{' '}
              <code className="text-[10px] font-mono bg-amber-100 px-1 py-0.5 rounded">
                lifecycle_status = pending
              </code>
              . Tier 2 verification requires independent nodal bank confirmation.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
