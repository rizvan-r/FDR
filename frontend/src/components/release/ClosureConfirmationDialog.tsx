import React, { useState } from 'react';
import { ReleaseRequestDetail } from '../../types';
import { CheckCircle2, AlertTriangle, ShieldCheck, FileCheck, X } from 'lucide-react';

interface ClosureConfirmationDialogProps {
  isOpen: boolean;
  request: ReleaseRequestDetail;
  onClose: () => void;
  onConfirmClose: (notes: string) => Promise<void>;
  isLoading?: boolean;
}

export const ClosureConfirmationDialog: React.FC<ClosureConfirmationDialogProps> = ({
  isOpen,
  request,
  onClose,
  onConfirmClose,
  isLoading = false,
}) => {
  const [closureNotes, setClosureNotes] = useState(
    'All statutory conditions verified, depository bank lien discharged, refund reconciled, and file formally closed.'
  );
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const isBankReleased = request.bank_release?.release_status === 'released' || request.bank_release_status === 'released';
  const isRefundReconciled = request.refund_status === 'reconciled' || request.refund_record?.refund_status === 'reconciled';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      await onConfirmClose(closureNotes);
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 border border-slate-200">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-6 h-6 text-emerald-600" />
            <div>
              <h3 className="font-bold text-slate-900 text-base">
                Final Case Closure & Statutory FDR Discharge
              </h3>
              <p className="text-xs text-slate-500">Permanent lifecycle settlement</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 rounded-lg p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Pre-requisite checklist */}
          <div className="space-y-2 bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs">
            <div className="font-semibold text-slate-800 mb-1">Pre-requisite Validation:</div>

            <div className="flex items-center justify-between">
              <span className="text-slate-600">Depository Bank Lien Discharge</span>
              {isBankReleased ? (
                <span className="flex items-center gap-1 text-emerald-700 font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Released
                </span>
              ) : (
                <span className="flex items-center gap-1 text-amber-700 font-semibold">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600" /> Unconfirmed
                </span>
              )}
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-600">Institutional Refund Reconciliation</span>
              {isRefundReconciled ? (
                <span className="flex items-center gap-1 text-emerald-700 font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Reconciled
                </span>
              ) : (
                <span className="flex items-center gap-1 text-amber-700 font-semibold">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600" /> Pending Reconcile
                </span>
              )}
            </div>
          </div>

          {/* Warning banner */}
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 space-y-1">
            <div className="font-bold flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-amber-700" />
              Statutory Invariant & Immutability Notice
            </div>
            <p>
              Executing final closure will transition the underlying FDR's lifecycle status to{' '}
              <strong>'closed'</strong>. The record will be archived as fully settled and cannot be re-opened.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Final Supervisory Closure Order / Notes <span className="text-rose-600">*</span>
            </label>
            <textarea
              rows={3}
              value={closureNotes}
              onChange={(e) => setClosureNotes(e.target.value)}
              className="w-full text-xs rounded-xl border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              required
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting || isLoading}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-xl bg-slate-100 hover:bg-slate-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || isLoading}
              className="inline-flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl shadow-sm transition-colors disabled:opacity-50"
            >
              <FileCheck className="w-4 h-4" />
              {submitting ? 'Executing Closure...' : 'Execute Final Case Closure'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
