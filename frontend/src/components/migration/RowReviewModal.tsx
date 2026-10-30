import React, { useState } from 'react';
import { MigrationRowItem } from '../../types';
import { X, Check, Trash2, Edit3, AlertTriangle, ShieldCheck } from 'lucide-react';

interface RowReviewModalProps {
  row: MigrationRowItem;
  isOpen: boolean;
  onClose: () => void;
  onSubmitReview: (
    action: 'correct' | 'exclude' | 'approve',
    correctedData?: Record<string, any>,
    reviewNote?: string
  ) => Promise<void>;
}

export const RowReviewModal: React.FC<RowReviewModalProps> = ({
  row,
  isOpen,
  onClose,
  onSubmitReview,
}) => {
  if (!isOpen) return null;

  const [fdrNumber, setFdrNumber] = useState(row.normalized_data?.fdr_number || '');
  const [amount, setAmount] = useState<string>(String(row.normalized_data?.amount || ''));
  const [issueDate, setIssueDate] = useState(row.normalized_data?.issue_date || '');
  const [maturityDate, setMaturityDate] = useState(row.normalized_data?.maturity_date || '');
  const [reviewNote, setReviewNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionType, setActionType] = useState<'correct' | 'approve' | 'exclude'>('correct');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (actionType === 'correct') {
        const numAmt = parseFloat(amount);
        const corrected: Record<string, any> = {
          fdr_number: fdrNumber,
          amount: isNaN(numAmt) ? 0 : numAmt,
          issue_date: issueDate,
          maturity_date: maturityDate,
        };
        await onSubmitReview('correct', corrected, reviewNote);
      } else if (actionType === 'approve') {
        await onSubmitReview('approve', undefined, reviewNote);
      } else {
        await onSubmitReview('exclude', undefined, reviewNote);
      }
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
      <div className="bg-white rounded-xl shadow-xl border border-gov-border max-w-lg w-full overflow-hidden">
        {/* Header */}
        <div className="bg-gov-navy text-white px-5 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Edit3 className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-bold">
              Review Migration Row #{row.row_number}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          {/* Validation Warnings / Duplicate Alert */}
          {row.validation_errors && row.validation_errors.length > 0 && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-900 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-rose-800">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                <span>Validation Errors Flagged:</span>
              </div>
              <ul className="list-disc pl-5 text-[11px] space-y-0.5">
                {row.validation_errors.map((err, idx) => (
                  <li key={idx}>
                    <strong className="capitalize">{err.field}: </strong>
                    {err.message}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {row.duplicate_candidates && row.duplicate_candidates.length > 0 && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-amber-800">
                <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
                <span>Central Vault Conflict:</span>
              </div>
              <p className="text-[11px]">
                {row.duplicate_candidates[0].reason} with existing FDR ID{' '}
                <span className="font-mono font-bold">
                  {row.duplicate_candidates[0].fdr_number}
                </span>
                .
              </p>
            </div>
          )}

          {/* Action Choice Tabs */}
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setActionType('correct')}
              className={`p-2 rounded border text-center font-semibold transition ${
                actionType === 'correct'
                  ? 'border-gov-blue bg-blue-50 text-gov-blue'
                  : 'border-gov-border bg-gray-50 text-gov-text hover:bg-gray-100'
              }`}
            >
              Correct Data
            </button>
            <button
              type="button"
              onClick={() => setActionType('approve')}
              className={`p-2 rounded border text-center font-semibold transition ${
                actionType === 'approve'
                  ? 'border-emerald-500 bg-emerald-50 text-emerald-800'
                  : 'border-gov-border bg-gray-50 text-gov-text hover:bg-gray-100'
              }`}
            >
              Approve As-Is
            </button>
            <button
              type="button"
              onClick={() => setActionType('exclude')}
              className={`p-2 rounded border text-center font-semibold transition ${
                actionType === 'exclude'
                  ? 'border-rose-500 bg-rose-50 text-rose-800'
                  : 'border-gov-border bg-gray-50 text-gov-text hover:bg-gray-100'
              }`}
            >
              Exclude Row
            </button>
          </div>

          {/* Edit Fields (shown if actionType === 'correct') */}
          {actionType === 'correct' && (
            <div className="space-y-3 p-3 bg-slate-50 border border-gov-border rounded-lg">
              <div>
                <label className="block font-semibold text-gov-navy mb-1">
                  FDR Number *
                </label>
                <input
                  type="text"
                  required
                  value={fdrNumber}
                  onChange={(e) => setFdrNumber(e.target.value)}
                  className="w-full p-2 border border-gov-border rounded bg-white font-mono text-xs focus:border-gov-blue focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-semibold text-gov-navy mb-1">
                  Deposit Principal Amount (INR) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full p-2 border border-gov-border rounded bg-white text-xs focus:border-gov-blue focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-gov-navy mb-1">
                    Issue Date (YYYY-MM-DD) *
                  </label>
                  <input
                    type="date"
                    required
                    value={issueDate}
                    onChange={(e) => setIssueDate(e.target.value)}
                    className="w-full p-2 border border-gov-border rounded bg-white text-xs focus:border-gov-blue focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-gov-navy mb-1">
                    Maturity Date (YYYY-MM-DD) *
                  </label>
                  <input
                    type="date"
                    required
                    value={maturityDate}
                    onChange={(e) => setMaturityDate(e.target.value)}
                    className="w-full p-2 border border-gov-border rounded bg-white text-xs focus:border-gov-blue focus:outline-hidden"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Supervisory Audit Reason Note */}
          <div>
            <label className="block font-semibold text-gov-navy mb-1">
              Officer Audit Note & Rationale *
            </label>
            <textarea
              required
              rows={2}
              value={reviewNote}
              onChange={(e) => setReviewNote(e.target.value)}
              placeholder="Provide reason for correction, override, or exclusion for statutory audit..."
              className="w-full p-2 border border-gov-border rounded bg-white text-xs focus:border-gov-blue focus:outline-hidden"
            />
          </div>

          {/* Modal Actions */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-gov-border">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gov-navy rounded font-medium text-xs transition"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSubmitting || !reviewNote.trim()}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-gov-navy hover:bg-gov-navy-light disabled:opacity-50 text-white rounded font-semibold text-xs shadow-xs transition"
            >
              {isSubmitting ? (
                <span>Recording...</span>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Confirm Decision</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
