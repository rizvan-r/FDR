import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowLeft,
  Check,
  Ban,
  RefreshCw,
  Edit3,
  ShieldCheck,
  AlertCircle,
  FileCheck,
} from 'lucide-react';
import { MigrationBatchDetail, MigrationRowItem } from '../../types';
import {
  fetchMigrationBatch,
  validateMigrationBatch,
  executeMigrationImport,
  cancelMigrationBatch,
  reviewMigrationRow,
} from '../../lib/api';
import { MigrationStatusBadge } from '../../components/migration/MigrationStatusBadge';
import { RowReviewModal } from '../../components/migration/RowReviewModal';

export const MigrationBatchDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [batch, setBatch] = useState<MigrationBatchDetail | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'flagged' | 'mapping'>('all');
  const [selectedRowForReview, setSelectedRowForReview] = useState<MigrationRowItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadBatch = async () => {
    if (!id) return;
    setIsLoading(true);
    try {
      const data = await fetchMigrationBatch(id);
      setBatch(data);
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || 'Failed to load batch details.' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadBatch();
  }, [id]);

  const handleRunValidation = async () => {
    if (!id) return;
    setIsProcessing(true);
    setMsg(null);
    try {
      await validateMigrationBatch(id);
      setMsg({ type: 'success', text: 'Validation completed successfully.' });
      await loadBatch();
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || 'Validation failed.' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExecuteImport = async () => {
    if (!id) return;
    setIsProcessing(true);
    setMsg(null);
    try {
      const res = await executeMigrationImport(id, true);
      setMsg({
        type: 'success',
        text: `Import completed! Successfully created ${res.imported_count} Trust Tier 1 FDR records in the Central Vault.`,
      });
      await loadBatch();
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || 'Failed to execute import.' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancelBatch = async () => {
    if (!id) return;
    if (!window.confirm('Are you sure you want to cancel this migration batch?')) return;
    setIsProcessing(true);
    try {
      await cancelMigrationBatch(id);
      await loadBatch();
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSubmitRowReview = async (
    action: 'correct' | 'exclude' | 'approve',
    correctedData?: Record<string, any>,
    reviewNote?: string
  ) => {
    if (!id || !selectedRowForReview) return;
    try {
      await reviewMigrationRow(id, selectedRowForReview.id, {
        action,
        corrected_data: correctedData,
        review_note: reviewNote,
      });
      await loadBatch();
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || 'Failed to update row.' });
    }
  };

  if (isLoading || !batch) {
    return (
      <div className="p-8 text-center text-xs text-gov-muted flex items-center justify-center gap-2">
        <RefreshCw className="w-4 h-4 animate-spin text-gov-blue" />
        <span>Loading batch metadata and records...</span>
      </div>
    );
  }

  const rows = batch.rows || [];
  const flaggedRows = rows.filter(
    (r) =>
      r.validation_status === 'invalid' ||
      r.validation_status === 'duplicate_exact' ||
      r.validation_status === 'duplicate_fuzzy' ||
      (r.validation_errors && r.validation_errors.length > 0)
  );

  const displayedRows = activeTab === 'flagged' ? flaggedRows : rows;

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Actions Bar */}
      <div className="bg-white border border-gov-border rounded-lg p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <button
            onClick={() => navigate('/migrations')}
            className="text-xs font-semibold text-gov-navy hover:underline flex items-center gap-1 mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Batches</span>
          </button>

          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-xl font-bold text-gov-navy">{batch.file_name}</h1>
            <MigrationStatusBadge status={batch.batch_status} />
          </div>
          <p className="text-xs text-gov-muted">
            Batch Reference: <span className="font-mono font-medium">{batch.id}</span> • Uploaded{' '}
            {new Date(batch.created_at).toLocaleString('en-IN')}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {batch.batch_status !== 'completed' && batch.batch_status !== 'cancelled' && (
            <>
              <button
                onClick={handleRunValidation}
                disabled={isProcessing}
                className="px-3 py-1.5 border border-gov-border hover:bg-gov-light text-gov-navy rounded-md font-semibold text-xs shadow-2xs transition flex items-center gap-1.5"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isProcessing ? 'animate-spin' : ''}`} />
                <span>Re-Validate</span>
              </button>

              <button
                onClick={handleCancelBatch}
                disabled={isProcessing}
                className="px-3 py-1.5 border border-rose-200 text-rose-700 hover:bg-rose-50 rounded-md font-medium text-xs transition flex items-center gap-1.5"
              >
                <Ban className="w-3.5 h-3.5" />
                <span>Cancel Batch</span>
              </button>

              <button
                onClick={handleExecuteImport}
                disabled={isProcessing || batch.valid_rows === 0}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white rounded-md font-semibold text-xs shadow-xs transition"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Execute Vault Import ({batch.valid_rows} Eligible)</span>
              </button>
            </>
          )}

          {batch.batch_status === 'completed' && (
            <div className="px-3 py-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-md text-xs font-semibold flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Import Successfully Completed & Ingested</span>
            </div>
          )}
        </div>
      </div>

      {/* Alert Banner */}
      {msg && (
        <div
          className={`p-3 rounded-md text-xs flex items-center gap-2 border ${
            msg.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
              : 'bg-rose-50 text-rose-900 border-rose-200'
          }`}
        >
          {msg.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          )}
          <span>{msg.text}</span>
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 border border-gov-border rounded-lg shadow-2xs text-center">
          <span className="text-xs text-gov-muted">Total Spreadsheet Rows</span>
          <p className="text-xl font-bold text-gov-navy mt-1">{batch.total_rows}</p>
        </div>

        <div className="bg-white p-4 border border-gov-border rounded-lg shadow-2xs text-center">
          <span className="text-xs text-emerald-800 font-semibold">Valid & Ready</span>
          <p className="text-xl font-bold text-emerald-700 mt-1">{batch.valid_rows}</p>
        </div>

        <div className="bg-white p-4 border border-gov-border rounded-lg shadow-2xs text-center">
          <span className="text-xs text-rose-800 font-semibold">Errors & Flagged</span>
          <p className="text-xl font-bold text-rose-700 mt-1">{batch.invalid_rows}</p>
        </div>

        <div className="bg-white p-4 border border-gov-border rounded-lg shadow-2xs text-center">
          <span className="text-xs text-indigo-800 font-semibold">Vault Ingested</span>
          <p className="text-xl font-bold text-indigo-700 mt-1">{batch.imported_rows}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gov-border flex gap-4 text-xs font-semibold">
        <button
          onClick={() => setActiveTab('all')}
          className={`pb-2.5 transition border-b-2 ${
            activeTab === 'all'
              ? 'border-gov-blue text-gov-blue'
              : 'border-transparent text-gov-muted hover:text-gov-navy'
          }`}
        >
          All Rows ({rows.length})
        </button>

        <button
          onClick={() => setActiveTab('flagged')}
          className={`pb-2.5 transition border-b-2 flex items-center gap-1.5 ${
            activeTab === 'flagged'
              ? 'border-orange-500 text-orange-600'
              : 'border-transparent text-gov-muted hover:text-gov-navy'
          }`}
        >
          <span>Flagged / Errors</span>
          <span className="px-1.5 py-0.2 bg-rose-100 text-rose-800 rounded-full text-[10px]">
            {flaggedRows.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('mapping')}
          className={`pb-2.5 transition border-b-2 ${
            activeTab === 'mapping'
              ? 'border-gov-blue text-gov-blue'
              : 'border-transparent text-gov-muted hover:text-gov-navy'
          }`}
        >
          Column Mappings ({batch.mappings?.length || 0})
        </button>
      </div>

      {/* Tab 1 & 2: Row Table */}
      {(activeTab === 'all' || activeTab === 'flagged') && (
        <div className="border border-gov-border rounded-lg overflow-hidden bg-white shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gov-light text-gov-navy font-semibold border-b border-gov-border">
                <tr>
                  <th className="p-3 w-12 text-center">#</th>
                  <th className="p-3">FDR Number</th>
                  <th className="p-3">Commercial Bank</th>
                  <th className="p-3">Principal Amount</th>
                  <th className="p-3">Maturity Date</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Issues / Remarks</th>
                  <th className="p-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gov-border">
                {displayedRows.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-xs text-gov-muted">
                      {activeTab === 'flagged'
                        ? 'No flagged records or errors found in this batch. All rows valid!'
                        : 'No row records loaded.'}
                    </td>
                  </tr>
                ) : (
                  displayedRows.map((r) => {
                    const norm = r.normalized_data || {};
                    return (
                      <tr key={r.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="p-3 text-center text-gov-muted font-mono">{r.row_number}</td>
                        <td className="p-3 font-mono font-bold text-gov-navy">
                          {norm.fdr_number || r.source_data['FDR No'] || '—'}
                        </td>
                        <td className="p-3">
                          {r.matched_bank_name || norm.bank_name || 'State Bank of India'}
                        </td>
                        <td className="p-3 font-semibold text-gov-navy">
                          {norm.amount !== undefined ? `INR ${Number(norm.amount).toLocaleString('en-IN')}` : '—'}
                        </td>
                        <td className="p-3">{norm.maturity_date || '—'}</td>
                        <td className="p-3">
                          <MigrationStatusBadge status={r.validation_status} size="sm" />
                        </td>
                        <td className="p-3 text-[11px]">
                          {r.validation_errors && r.validation_errors.length > 0 ? (
                            <span className="text-rose-700 font-medium">
                              {r.validation_errors[0].message}
                            </span>
                          ) : r.duplicate_candidates && r.duplicate_candidates.length > 0 ? (
                            <span className="text-amber-700 font-medium">
                              {r.duplicate_candidates[0].reason}
                            </span>
                          ) : (
                            <span className="text-gov-muted">Passed schema checks</span>
                          )}
                        </td>
                        <td className="p-3 text-right">
                          {batch.batch_status !== 'completed' && batch.batch_status !== 'cancelled' && (
                            <button
                              onClick={() => setSelectedRowForReview(r)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 bg-white border border-gov-border hover:border-gov-blue hover:text-gov-blue rounded font-medium text-xs shadow-2xs transition"
                            >
                              <Edit3 className="w-3 h-3" />
                              <span>Review</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Column Mappings */}
      {activeTab === 'mapping' && (
        <div className="border border-gov-border rounded-lg overflow-hidden bg-white shadow-2xs">
          <table className="w-full text-left text-xs">
            <thead className="bg-gov-light text-gov-navy font-semibold border-b border-gov-border">
              <tr>
                <th className="p-3">Source Header in Spreadsheet</th>
                <th className="p-3">Target FDR Field</th>
                <th className="p-3">Confidence Heuristic</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gov-border">
              {batch.mappings && batch.mappings.length > 0 ? (
                batch.mappings.map((m, idx) => (
                  <tr key={idx}>
                    <td className="p-3 font-mono text-gov-navy">{m.source_column}</td>
                    <td className="p-3 font-semibold text-emerald-700">{m.target_field}</td>
                    <td className="p-3 text-gov-muted">
                      {m.confidence ? `${Math.round(m.confidence * 100)}% match` : 'Configured'}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={3} className="p-8 text-center text-xs text-gov-muted">
                    No column mappings configured.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Row Review / Correction Modal */}
      {selectedRowForReview && (
        <RowReviewModal
          row={selectedRowForReview}
          isOpen={!!selectedRowForReview}
          onClose={() => setSelectedRowForReview(null)}
          onSubmitReview={handleSubmitRowReview}
        />
      )}
    </div>
  );
};
