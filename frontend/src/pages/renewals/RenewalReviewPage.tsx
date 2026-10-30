import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { RenewalCase } from '../../types';
import {
  fetchRenewalCaseById,
  approveRenewalCase,
  rejectRenewalCase,
  submitRenewalCase,
  uploadRenewalEvidence,
} from '../../lib/api';
import { RenewalStatusBadge } from '../../components/renewals/RenewalStatusBadge';
import { FDRComparisonPanel } from '../../components/renewals/FDRComparisonPanel';
import { RenewalMatchScore } from '../../components/renewals/RenewalMatchScore';
import { RenewalEvidenceList } from '../../components/renewals/RenewalEvidenceList';

export const RenewalReviewPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [renewalCase, setRenewalCase] = useState<RenewalCase | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Approval form state
  const [approvalNotes, setApprovalNotes] = useState<string>('');
  const [relationshipType, setRelationshipType] = useState<string>('renewal');
  const [isApproving, setIsApproving] = useState<boolean>(false);

  // Rejection modal state
  const [showRejectModal, setShowRejectModal] = useState<boolean>(false);
  const [rejectionReason, setRejectionReason] = useState<string>('');
  const [isRejecting, setIsRejecting] = useState<boolean>(false);

  const loadCase = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const data = await fetchRenewalCaseById(id);
      setRenewalCase(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load renewal case.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCase();
  }, [id]);

  const handleApprove = async () => {
    if (!id) return;
    try {
      setIsApproving(true);
      setError(null);
      await approveRenewalCase(id, {
        decision_notes: approvalNotes || 'Approved following verification of bank renewal advice and replacement deposit.',
        relationship_type: relationshipType,
      });
      setActionSuccess('Renewal case approved successfully and lineage DAG link atomically committed.');
      await loadCase();
    } catch (err: any) {
      setError(err.message || 'Approval failed.');
    } finally {
      setIsApproving(false);
    }
  };

  const handleReject = async () => {
    if (!id || !rejectionReason.trim()) return;
    try {
      setIsRejecting(true);
      setError(null);
      await rejectRenewalCase(id, {
        rejection_reason: rejectionReason,
      });
      setShowRejectModal(false);
      setActionSuccess('Renewal case has been rejected.');
      await loadCase();
    } catch (err: any) {
      setError(err.message || 'Rejection failed.');
    } finally {
      setIsRejecting(false);
    }
  };

  const handleSubmitForReview = async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError(null);
      await submitRenewalCase(id);
      setActionSuccess('Case submitted for supervisory review.');
      await loadCase();
    } catch (err: any) {
      setError(err.message || 'Submission failed.');
      setLoading(false);
    }
  };

  const handleEvidenceUpload = async (file: File, type: string, description: string) => {
    if (!id) return;
    await uploadRenewalEvidence(id, file, type, description);
    await loadCase();
  };

  if (loading && !renewalCase) {
    return (
      <div className="p-12 text-center text-slate-500 bg-white border border-slate-200 rounded-xl">
        Loading renewal case evaluation workspace...
      </div>
    );
  }

  if (!renewalCase) {
    return (
      <div className="p-12 text-center text-rose-600 bg-rose-50 border border-rose-200 rounded-xl">
        {error || 'Renewal case not found.'}
      </div>
    );
  }

  const isDecided = renewalCase.status === 'approved' || renewalCase.status === 'rejected';
  const isDraft = renewalCase.status === 'draft';
  const canApproveOrReject = !isDecided && !isDraft;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Top Banner Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="font-mono text-base font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded border border-blue-200">
              {renewalCase.case_number}
            </span>
            <RenewalStatusBadge status={renewalCase.status || 'draft'} size="md" />
          </div>
          <h1 className="text-xl font-bold text-slate-900">
            Renewal Review & Supervisory Lineage Verification
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Registered: {new Date(renewalCase.created_at).toLocaleString()} • Institution:{' '}
            <strong className="text-slate-700">{renewalCase.institution_name}</strong>
          </p>
        </div>

        <div className="flex items-center gap-2">
          {renewalCase.status === 'approved' && (
            <Link
              to={`/fdrs/${renewalCase.original_fdr_id}/lineage`}
              className="px-4 py-2 rounded-lg bg-emerald-600 text-white font-semibold text-xs hover:bg-emerald-700 transition-colors shadow-sm inline-flex items-center gap-1.5"
            >
              <span>🌳 Explore Lineage DAG</span>
            </Link>
          )}

          <Link
            to="/renewals"
            className="px-3.5 py-2 rounded-lg border border-slate-300 text-slate-700 font-medium text-xs hover:bg-slate-50 transition-colors"
          >
            ← Back to Desk
          </Link>
        </div>
      </div>

      {actionSuccess && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-sm flex items-center justify-between">
          <span>✓ {actionSuccess}</span>
          <button
            onClick={() => setActionSuccess(null)}
            className="text-xs font-bold text-emerald-700 hover:text-emerald-900"
          >
            ✕
          </button>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-center justify-between">
          <span>⚠ {error}</span>
          <button
            onClick={() => setError(null)}
            className="text-xs font-bold text-rose-700 hover:text-rose-900"
          >
            ✕
          </button>
        </div>
      )}

      {/* Draft State Banner */}
      {isDraft && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center justify-between">
          <div className="text-xs text-amber-900">
            <strong>Case is in Draft State:</strong> Ensure replacement FDR is designated and supporting bank evidence is attached before submitting for supervisory review.
          </div>
          <button
            type="button"
            onClick={handleSubmitForReview}
            className="px-4 py-1.5 rounded-lg bg-blue-700 text-white text-xs font-semibold hover:bg-blue-800 transition-colors shadow-sm"
          >
            Submit for Officer Review
          </button>
        </div>
      )}

      {/* Decided Banner */}
      {isDecided && (
        <div
          className={`p-4 rounded-xl border text-xs ${
            renewalCase.status === 'approved'
              ? 'bg-emerald-50/60 border-emerald-200 text-emerald-900'
              : 'bg-rose-50/60 border-rose-200 text-rose-900'
          }`}
        >
          <span className="font-bold uppercase tracking-wider block mb-1">
            {renewalCase.status === 'approved' ? 'Approval Decision Record' : 'Rejection Record'}
          </span>
          <p className="italic">"{renewalCase.decision_notes || 'No decision notes recorded.'}"</p>
          {renewalCase.reviewed_at && (
            <span className="text-[10px] text-slate-500 block mt-1">
              Reviewed on {new Date(renewalCase.reviewed_at).toLocaleString()}
            </span>
          )}
        </div>
      )}

      {/* Side-by-Side FDR Comparison Panel */}
      <FDRComparisonPanel
        originalFdr={renewalCase.original_fdr}
        replacementFdr={renewalCase.proposed_replacement_fdr}
      />

      {/* Candidate Matching Signal Matrix */}
      {renewalCase.proposed_replacement_fdr && (
        <RenewalMatchScore
          score={renewalCase.matching_score ?? renewalCase.match_score}
          candidate={renewalCase.matching_analysis as any}
        />
      )}

      {/* Supporting Evidence List & Upload Form */}
      <RenewalEvidenceList
        evidence={renewalCase.evidence || []}
        canUpload={!isDecided}
        onUpload={handleEvidenceUpload}
      />

      {/* Supervisory Approval / Decision Panel */}
      {canApproveOrReject && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <div>
              <h3 className="text-base font-semibold text-slate-900">
                Supervisory Approval Action Panel
              </h3>
              <p className="text-xs text-slate-500">
                Authorized Regulatory Officers: Verify bank attestation and evidence review before committing lineage link
              </p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200">
              Authorized Officers Only
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block text-slate-700 font-medium mb-1">
                Lineage Relationship Type *
              </label>
              <select
                value={relationshipType}
                onChange={(e) => setRelationshipType(e.target.value)}
                className="w-full border border-slate-300 rounded p-2 bg-white text-slate-800"
              >
                <option value="renewal">Renewal (Sequential extension of term)</option>
                <option value="replacement">Replacement (Substitution under contract)</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-slate-700 font-medium mb-1">
                Documented Approval Justification / Decision Notes
              </label>
              <input
                type="text"
                placeholder="e.g. Bank verification confirmed via SBI API. Advice vouchers verified against physical branch register."
                value={approvalNotes}
                onChange={(e) => setApprovalNotes(e.target.value)}
                className="w-full border border-slate-300 rounded p-2 bg-white text-slate-800"
              />
            </div>
          </div>

          <div className="pt-2 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setShowRejectModal(true)}
              disabled={isApproving}
              className="px-4 py-2 rounded-lg border border-rose-300 text-rose-700 font-semibold text-xs hover:bg-rose-50 transition-colors"
            >
              Reject Case...
            </button>

            <button
              type="button"
              onClick={handleApprove}
              disabled={isApproving || !renewalCase.proposed_replacement_fdr}
              className="px-6 py-2 rounded-lg bg-emerald-700 text-white font-semibold text-xs hover:bg-emerald-800 disabled:opacity-50 transition-colors shadow-sm"
            >
              {isApproving ? 'Committing Atomic Lineage...' : '✓ Approve Renewal & Establish Lineage'}
            </button>
          </div>
        </div>
      )}

      {/* Rejection Modal Dialog */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-xl space-y-4">
            <h3 className="text-base font-bold text-slate-900">
              Reject Renewal Case #{renewalCase.case_number}
            </h3>
            <p className="text-xs text-slate-600">
              Please document the mandatory rejection justification. The case will be marked rejected and preserved in the audit log. No lineage link will be formed.
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Rejection Reason (Min. 5 characters) *
              </label>
              <textarea
                rows={4}
                placeholder="e.g. Replacement FDR deposit voucher does not match beneficiary lienholder name..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="w-full border border-slate-300 rounded-lg p-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowRejectModal(false)}
                className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 text-xs font-medium hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isRejecting || rejectionReason.trim().length < 5}
                onClick={handleReject}
                className="px-5 py-2 rounded-lg bg-rose-700 text-white text-xs font-semibold hover:bg-rose-800 disabled:opacity-50 transition-colors"
              >
                {isRejecting ? 'Rejecting...' : 'Confirm Case Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
