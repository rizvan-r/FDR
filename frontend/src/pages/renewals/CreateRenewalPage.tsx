import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FDR, MatchingResult } from '../../types';
import { fetchFDRs, createRenewalCase, runCandidateMatching, uploadRenewalEvidence } from '../../lib/api';
import { RenewalMatchScore } from '../../components/renewals/RenewalMatchScore';
import { FDRComparisonPanel } from '../../components/renewals/FDRComparisonPanel';

export const CreateRenewalPage: React.FC = () => {
  const navigate = useNavigate();

  // State
  const [fdrs, setFdrs] = useState<FDR[]>([]);
  const [selectedOriginalFdrId, setSelectedOriginalFdrId] = useState<string>('');
  const [selectedReplacementFdrId, setSelectedReplacementFdrId] = useState<string>('');
  const [submissionNotes, setSubmissionNotes] = useState<string>('');
  const [matchingResult, setMatchingResult] = useState<MatchingResult | null>(null);
  const [isMatching, setIsMatching] = useState<boolean>(false);
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
  const [evidenceType, setEvidenceType] = useState<string>('bank_renewal_advice');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchFDRs().then((res) => {
      setFdrs(res.items);
    });
  }, []);

  const originalFdr = fdrs.find((f) => f.id === selectedOriginalFdrId);
  const replacementFdr = fdrs.find((f) => f.id === selectedReplacementFdrId);

  // Available replacement candidates from the same institution
  const candidateFdrs = originalFdr
    ? fdrs.filter(
        (f) =>
          f.institution_id === originalFdr.institution_id &&
          f.id !== originalFdr.id &&
          f.lifecycle_status !== 'renewed'
      )
    : [];

  const handleEvaluateMatching = async () => {
    if (!selectedOriginalFdrId || !selectedReplacementFdrId) return;
    try {
      setIsMatching(true);
      setError(null);
      // Create a temporary simulated evaluation
      const res = await runCandidateMatching('temp-eval', selectedReplacementFdrId);
      setMatchingResult(res);
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsMatching(false);
    }
  };

  const handleSubmit = async (submitNow: boolean) => {
    if (!selectedOriginalFdrId) {
      setError('Please select an original predecessor FDR.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      // 1. Create case
      const createdCase = await createRenewalCase(selectedOriginalFdrId, {
        proposed_replacement_fdr_id: selectedReplacementFdrId || undefined,
        submission_notes: submissionNotes,
      });

      // 2. Upload evidence if provided
      if (evidenceFile) {
        await uploadRenewalEvidence(
          createdCase.id,
          evidenceFile,
          evidenceType,
          'Initial supporting document attached during case initiation'
        );
      }

      // 3. Submit if requested
      if (submitNow) {
        navigate(`/renewals/${createdCase.id}`);
      } else {
        navigate(`/renewals`);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create renewal case.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">Initiate New FDR Renewal Case</h1>
        <p className="text-sm text-slate-600 mt-1">
          Register a formal renewal case linking an expiring or matured security deposit to its replacement.
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm">
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Workflow Form */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-6">
        {/* Step 1: Select Original Predecessor FDR */}
        <div className="space-y-2">
          <label className="block text-sm font-bold text-slate-900">
            Step 1: Select Maturing / Predecessor Deposit *
          </label>
          <select
            value={selectedOriginalFdrId}
            onChange={(e) => {
              setSelectedOriginalFdrId(e.target.value);
              setSelectedReplacementFdrId('');
              setMatchingResult(null);
            }}
            className="w-full border border-slate-300 rounded-lg p-2.5 text-sm bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">-- Choose Predecessor FDR --</option>
            {fdrs.map((f) => (
              <option key={f.id} value={f.id}>
                {f.fdr_number} • {f.institution_name} • {f.bank_name} • INR{' '}
                {f.amount.toLocaleString('en-IN')} (Matures: {f.maturity_date})
              </option>
            ))}
          </select>
        </div>

        {/* Step 2: Select Proposed Replacement FDR */}
        {originalFdr && (
          <div className="space-y-3 pt-4 border-t border-slate-200">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-bold text-slate-900">
                Step 2: Designate Proposed Replacement Deposit
              </label>
              <span className="text-xs text-slate-500">
                Restricted to deposits belonging to {originalFdr.institution_name}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="md:col-span-2">
                <select
                  value={selectedReplacementFdrId}
                  onChange={(e) => {
                    setSelectedReplacementFdrId(e.target.value);
                    setMatchingResult(null);
                  }}
                  className="w-full border border-slate-300 rounded-lg p-2.5 text-sm bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Propose Candidate Replacement --</option>
                  {candidateFdrs.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.fdr_number} • {f.bank_name} • INR {f.amount.toLocaleString('en-IN')} • Tier{' '}
                      {f.trust_tier}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <button
                  type="button"
                  onClick={handleEvaluateMatching}
                  disabled={!selectedReplacementFdrId || isMatching}
                  className="w-full px-4 py-2.5 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 font-semibold text-xs hover:bg-blue-100 disabled:opacity-50 transition-colors"
                >
                  {isMatching ? 'Evaluating Signals...' : '🔍 Evaluate Match Score'}
                </button>
              </div>
            </div>

            {/* Matching Advisory Score */}
            {matchingResult && (
              <div className="mt-4">
                <RenewalMatchScore
                  score={matchingResult.candidates[0]?.score}
                  candidate={matchingResult.candidates[0]}
                />
              </div>
            )}
          </div>
        )}

        {/* Comparison Preview */}
        {originalFdr && selectedReplacementFdrId && (
          <div className="pt-4 border-t border-slate-200">
            <FDRComparisonPanel
              originalFdr={originalFdr}
              replacementFdr={replacementFdr}
            />
          </div>
        )}

        {/* Step 3: Attach Evidence */}
        <div className="space-y-3 pt-4 border-t border-slate-200">
          <label className="block text-sm font-bold text-slate-900">
            Step 3: Attach Bank Renewal Advice / Evidence
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block text-slate-600 mb-1">Document Category</label>
              <select
                value={evidenceType}
                onChange={(e) => setEvidenceType(e.target.value)}
                className="w-full border border-slate-300 rounded p-2 bg-white text-slate-800"
              >
                <option value="bank_renewal_advice">Official Bank Renewal Advice</option>
                <option value="replacement_fdr_copy">Replacement FDR Copy</option>
                <option value="original_fdr_closure">Original FDR Closure Voucher</option>
                <option value="bank_pledge_confirmation">Bank Lien Pledge Confirmation</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-600 mb-1">File Attachment (PDF, JPG, PNG)</label>
              <input
                type="file"
                accept=".pdf,image/jpeg,image/png"
                onChange={(e) => setEvidenceFile(e.target.files?.[0] || null)}
                className="w-full text-xs text-slate-600 file:mr-2 file:py-1 file:px-2.5 file:rounded file:border-0 file:bg-blue-50 file:text-blue-700"
              />
            </div>
          </div>
        </div>

        {/* Step 4: Submission Memo */}
        <div className="space-y-2 pt-4 border-t border-slate-200">
          <label className="block text-sm font-bold text-slate-900">
            Step 4: Submission Justification / Institutional Notes
          </label>
          <textarea
            rows={3}
            placeholder="Explain contract extension, tender reference, or reason for renewal..."
            value={submissionNotes}
            onChange={(e) => setSubmissionNotes(e.target.value)}
            className="w-full border border-slate-300 rounded-lg p-2.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        {/* Actions */}
        <div className="pt-6 border-t border-slate-200 flex items-center justify-between">
          <button
            type="button"
            onClick={() => navigate('/renewals')}
            className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 font-medium text-xs hover:bg-slate-50"
          >
            Cancel
          </button>

          <div className="flex items-center gap-3">
            <button
              type="button"
              disabled={isSubmitting || !selectedOriginalFdrId}
              onClick={() => handleSubmit(false)}
              className="px-4 py-2 rounded-lg border border-blue-600 text-blue-700 font-semibold text-xs hover:bg-blue-50 disabled:opacity-50 transition-colors"
            >
              Save as Draft
            </button>

            <button
              type="button"
              disabled={isSubmitting || !selectedOriginalFdrId}
              onClick={() => handleSubmit(true)}
              className="px-5 py-2 rounded-lg bg-blue-700 text-white font-semibold text-xs hover:bg-blue-800 disabled:opacity-50 transition-colors shadow-sm"
            >
              {isSubmitting ? 'Processing...' : 'Continue to Review →'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
