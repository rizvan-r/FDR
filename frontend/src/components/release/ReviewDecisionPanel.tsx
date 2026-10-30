import React, { useState } from 'react';
import { ReleaseReviewItem, ReleaseRequestDetail } from '../../types';
import { CheckCircle2, XCircle, AlertTriangle, CornerDownLeft, Shield, Clock, FileText, UserCheck } from 'lucide-react';

interface ReviewDecisionPanelProps {
  request: ReleaseRequestDetail;
  currentUserId?: string;
  currentUserRole?: string;
  canReview?: boolean;
  canApprove?: boolean;
  onAddReview?: (stage: string, decision: string, comments: string) => Promise<void>;
  onReturn?: (comments: string) => Promise<void>;
  onApprove?: (comments: string) => Promise<void>;
  onReject?: (comments: string) => Promise<void>;
  isLoading?: boolean;
}

export const ReviewDecisionPanel: React.FC<ReviewDecisionPanelProps> = ({
  request,
  currentUserId,
  currentUserRole,
  canReview = false,
  canApprove = false,
  onAddReview,
  onReturn,
  onApprove,
  onReject,
  isLoading = false,
}) => {
  const [comments, setComments] = useState('');
  const [selectedStage, setSelectedStage] = useState('eligibility_review');
  const [selectedDecision, setSelectedDecision] = useState('recommend_approval');
  const [submitting, setSubmitting] = useState(false);
  const [actionType, setActionType] = useState<'review' | 'approve' | 'reject' | 'return'>('review');

  const isRequester = currentUserId && request.requested_by === currentUserId;
  const isTerminal = ['approved', 'rejected', 'cancelled', 'closed'].includes(request.request_status);
  const reviews: ReleaseReviewItem[] = request.reviews || [];

  const handleAction = async (type: 'review' | 'approve' | 'reject' | 'return') => {
    if (!comments.trim()) {
      alert('Mandatory supervisory comments/rationale required.');
      return;
    }

    try {
      setSubmitting(true);
      if (type === 'review' && onAddReview) {
        await onAddReview(selectedStage, selectedDecision, comments);
      } else if (type === 'return' && onReturn) {
        await onReturn(comments);
      } else if (type === 'approve' && onApprove) {
        await onApprove(comments);
      } else if (type === 'reject' && onReject) {
        await onReject(comments);
      }
      setComments('');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
      {/* Header */}
      <div className="p-5 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <UserCheck className="w-5 h-5 text-[#12345A]" />
          <div>
            <h3 className="font-semibold text-slate-900 text-base">
              Supervisory Review & Sanction Decisions
            </h3>
            <p className="text-xs text-slate-500">
              Four-tier delegation matrix and immutable statutory audit trail
            </p>
          </div>
        </div>
      </div>

      {/* Review History Trail */}
      <div className="p-5 border-b border-slate-200">
        <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">
          Recorded Review Trail ({reviews.length})
        </h4>

        {reviews.length === 0 ? (
          <div className="text-xs text-slate-400 py-3 text-center italic">
            No supervisory reviews recorded yet. Initial review pending.
          </div>
        ) : (
          <div className="relative pl-6 space-y-5 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
            {reviews.map((rev) => {
              const isApproved = rev.review_decision === 'approved' || rev.review_decision === 'recommend_approval';
              const isRejected = rev.review_decision === 'rejected' || rev.review_decision === 'recommend_rejection';
              const isReturned = rev.review_decision === 'return_for_correction';

              return (
                <div key={rev.id} className="relative">
                  <span
                    className={`absolute -left-6 top-1 w-3.5 h-3.5 rounded-full border-2 bg-white ${
                      isApproved
                        ? 'border-emerald-500'
                        : isRejected
                        ? 'border-rose-500'
                        : isReturned
                        ? 'border-orange-500'
                        : 'border-blue-500'
                    }`}
                  />
                  <div className="bg-slate-50/80 p-3.5 rounded-lg border border-slate-200 text-xs">
                    <div className="flex items-center justify-between gap-2 flex-wrap mb-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900">
                          {rev.reviewer_name || rev.reviewer_role || 'Supervisory Officer'}
                        </span>
                        <span className="text-[11px] px-2 py-0.5 rounded bg-slate-200 text-slate-700 font-medium capitalize">
                          {rev.review_stage.replace(/_/g, ' ')}
                        </span>
                      </div>
                      <span className="text-slate-400 text-[11px]">
                        {new Date(rev.reviewed_at || rev.created_at).toLocaleString()}
                      </span>
                    </div>

                    <p className="text-slate-700 mt-1 leading-relaxed">{rev.comments}</p>

                    <div className="mt-2 text-[11px] font-semibold flex items-center gap-1.5">
                      <span className="text-slate-500">Decision:</span>
                      <span
                        className={
                          isApproved
                            ? 'text-emerald-700'
                            : isRejected
                            ? 'text-rose-700'
                            : 'text-orange-700'
                        }
                      >
                        {rev.review_decision.replace(/_/g, ' ').toUpperCase()}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Review Actions Form */}
      {!isTerminal && (
        <div className="p-5 bg-white space-y-4">
          {/* Self-approval restriction alert */}
          {isRequester ? (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2 text-xs text-amber-800">
              <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <strong>Self-Approval Restricted:</strong> You submitted this release request. To adhere to statutory separation of duties, you cannot review or approve your own submission.
              </div>
            </div>
          ) : (
            <>
              {/* Officer Note */}
              <div className="p-3 bg-blue-50/60 border border-blue-200 rounded-lg text-xs text-blue-900 flex items-start gap-2">
                <Shield className="w-4 h-4 text-[#1D5F91] flex-shrink-0 mt-0.5" />
                <div>
                  <strong>Statutory Principle:</strong> Approving this request sanctions the release, but will <em>not</em> change the FDR lifecycle status until the depository bank confirms lien discharge.
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Review Stage
                </label>
                <select
                  value={selectedStage}
                  onChange={(e) => setSelectedStage(e.target.value)}
                  disabled={!canReview || isLoading}
                  className="w-full text-xs rounded-lg border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="preliminary_review">Regional Office Preliminary Review</option>
                  <option value="eligibility_review">Approval Bureau Eligibility Audit</option>
                  <option value="finance_review">Finance Bureau Reconciliation</option>
                  <option value="authority_review">Competent Authority Final Sanction</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Supervisory Rationale & Comments <span className="text-rose-600">*</span>
                </label>
                <textarea
                  rows={3}
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  placeholder="Provide statutory findings, policy compliance grounds, or defect details..."
                  className="w-full text-xs rounded-lg border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <div className="flex items-center gap-2">
                  {onReturn && (
                    <button
                      type="button"
                      onClick={() => handleAction('return')}
                      disabled={submitting || isLoading}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-orange-700 bg-orange-50 hover:bg-orange-100 border border-orange-300 rounded-lg shadow-sm transition-colors disabled:opacity-50"
                    >
                      <CornerDownLeft className="w-3.5 h-3.5" />
                      Return for Correction
                    </button>
                  )}

                  {onReject && (
                    <button
                      type="button"
                      onClick={() => handleAction('reject')}
                      disabled={submitting || isLoading}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-300 rounded-lg shadow-sm transition-colors disabled:opacity-50"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      Reject Release
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {canReview && onAddReview && (
                    <button
                      type="button"
                      onClick={() => handleAction('review')}
                      disabled={submitting || isLoading}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg shadow-sm transition-colors disabled:opacity-50"
                    >
                      <Clock className="w-3.5 h-3.5" />
                      Record Stage Review
                    </button>
                  )}

                  {canApprove && onApprove && (
                    <button
                      type="button"
                      onClick={() => handleAction('approve')}
                      disabled={submitting || isLoading}
                      className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-sm transition-colors disabled:opacity-50"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Sanction & Approve Release
                    </button>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};
