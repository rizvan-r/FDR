import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Landmark,
  Building2,
  Calendar,
  IndianRupee,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  ArrowRight,
  FileCheck2,
} from 'lucide-react';
import { getVerificationDetails, confirmBankVerification } from '../../lib/api';

export const BankVerificationPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [fdrData, setFdrData] = useState<any>(null);

  // Form State
  const [officerName, setOfficerName] = useState<string>('Smt. Meenakshi Sundaram');
  const [notes, setNotes] = useState<string>('Verified against official Core Banking System (CBS) deposit master.');
  const [rejectionReason, setRejectionReason] = useState<string>('');
  const [showRejectModal, setShowRejectModal] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    if (token) {
      loadRequest();
    }
  }, [token]);

  const loadRequest = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getVerificationDetails(token!);
      setFdrData(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load verification request. Link may be invalid or expired.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (!token) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const res = await confirmBankVerification({
        token,
        action: 'confirm',
        officer_name: officerName,
        notes,
      });
      setResult(res);
    } catch (err: any) {
      setError(err.message || 'Failed to submit bank confirmation.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!token || !rejectionReason.trim()) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const res = await confirmBankVerification({
        token,
        action: 'reject',
        rejection_reason: rejectionReason,
        officer_name: officerName,
        notes,
      });
      setResult(res);
      setShowRejectModal(false);
    } catch (err: any) {
      setError(err.message || 'Failed to submit rejection.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatCurrency = (val: number | string) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(Number(val));
  };

  if (isLoading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center space-y-3">
        <div className="w-8 h-8 border-3 border-gov-navy border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-semibold text-gov-muted uppercase tracking-wider">
          Validating Single-Use Verification Token...
        </p>
      </div>
    );
  }

  // Success Confirmation Screen
  if (result) {
    return (
      <div className="max-w-2xl mx-auto py-8">
        <div className="bg-white rounded-lg border border-gov-border p-8 text-center space-y-5 shadow-sm">
          <div
            className={`w-14 h-14 rounded-full mx-auto flex items-center justify-center ${
              result.action === 'confirmed' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
            }`}
          >
            {result.action === 'confirmed' ? <ShieldCheck className="w-8 h-8" /> : <XCircle className="w-8 h-8" />}
          </div>

          <div>
            <h1 className="text-xl font-bold text-gov-navy">
              {result.action === 'confirmed'
                ? 'Fixed Deposit Successfully Confirmed!'
                : 'Deposit Verification Formally Rejected'}
            </h1>
            <p className="text-xs text-gov-muted mt-1 leading-relaxed">
              {result.message}
            </p>
          </div>

          <div className="p-4 bg-gov-bg rounded border border-gov-border text-left text-xs space-y-2">
            <div className="flex justify-between">
              <span className="text-gov-muted">Attestation Reference:</span>
              <span className="font-mono font-bold text-gov-navy">{result.attestation_id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gov-muted">New Trust Tier:</span>
              <span className="font-bold">Tier {result.trust_tier}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gov-muted">Verification Status:</span>
              <span className="font-mono capitalize text-gov-blue">{result.verification_status}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gov-muted">Token State:</span>
              <span className="text-emerald-700 font-medium">Atomically Consumed (Single-Use Completed)</span>
            </div>
          </div>

          <div className="pt-2 flex justify-center gap-3">
            <button
              onClick={() => navigate('/fdrs')}
              className="px-4 py-2 bg-gov-navy text-white text-xs font-semibold rounded hover:bg-gov-navy/90"
            >
              Go to FDR Central Repository
            </button>
            <button
              onClick={() => navigate('/bank')}
              className="px-4 py-2 bg-gov-bg border border-gov-border text-gov-navy text-xs font-semibold rounded hover:bg-gray-100"
            >
              Mock Bank Portal Hub
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Error Screen
  if (error || !fdrData) {
    return (
      <div className="max-w-xl mx-auto py-12">
        <div className="bg-white rounded-lg border border-red-200 p-8 text-center space-y-4 shadow-sm">
          <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full mx-auto flex items-center justify-center">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-red-900">Verification Link Unavailable</h2>
          <p className="text-xs text-red-700 leading-relaxed">
            {error || 'This single-use verification link is invalid, has expired, or was already consumed.'}
          </p>
          <div className="pt-4">
            <button
              onClick={() => navigate('/fdrs')}
              className="px-4 py-2 bg-gov-navy text-white text-xs font-semibold rounded hover:bg-gov-navy/90"
            >
              Return to Safe Portal
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 py-4">
      {/* Official Government Verification Header */}
      <div className="bg-white p-6 rounded-lg border border-gov-border shadow-xs">
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase bg-[#12345A]/10 text-gov-navy rounded">
            Tier 2 Nodal Action
          </span>
          <span className="text-xs text-gov-muted font-medium">Single-Use Bank Verification Portal</span>
        </div>
        <h1 className="text-2xl font-bold text-gov-navy tracking-tight mt-1">
          Depository Bank Deposit Confirmation
        </h1>
        <p className="text-sm text-gov-muted mt-0.5">
          Review the institutional Fixed Deposit terms declared below. Confirming this deposit will promote it to{' '}
          <strong className="text-gov-navy">Trust Tier 2 (Bank Confirmed)</strong>.
        </p>
      </div>

      {/* Expiry & Snapshot Fidelity Banner */}
      <div className="p-4 rounded-lg bg-blue-50 border border-blue-200 text-blue-900 text-xs flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-blue-700" />
          <span>
            Link Expiry:{' '}
            <strong className="font-semibold">{new Date(fdrData.expires_at).toLocaleString('en-IN')}</strong>
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-emerald-800 font-semibold bg-emerald-100/70 px-2.5 py-1 rounded">
          <FileCheck2 className="w-3.5 h-3.5 text-emerald-700" />
          <span>Snapshot Integrity Verified</span>
        </div>
      </div>

      {/* FDR Details Card */}
      <div className="bg-white rounded-lg border border-gov-border overflow-hidden shadow-xs">
        <div className="px-6 py-4 bg-gray-50 border-b border-gov-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Landmark className="w-4 h-4 text-gov-blue" />
            <h2 className="text-sm font-bold text-gov-navy uppercase tracking-wider">
              Deposit Parameters Under Verification
            </h2>
          </div>
          <span className="font-mono text-xs font-bold text-gov-navy">{fdrData.fdr_number}</span>
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
          <div>
            <span className="text-gov-muted block mb-0.5">Depositor Entity / Authority</span>
            <span className="font-bold text-gov-navy text-sm">{fdrData.institution_name}</span>
          </div>

          <div>
            <span className="text-gov-muted block mb-0.5">Principal Deposit Amount</span>
            <span className="font-bold text-gov-navy text-sm text-emerald-700 font-mono">
              {formatCurrency(fdrData.amount)}
            </span>
          </div>

          <div>
            <span className="text-gov-muted block mb-0.5">Depository Bank & Branch</span>
            <div className="font-medium text-gov-text">
              {fdrData.bank_name} — {fdrData.branch_name}
            </div>
            <div className="text-[11px] text-gov-muted mt-0.5">
              IFSC: <span className="font-mono font-semibold">{fdrData.ifsc_code}</span>
            </div>
          </div>

          <div>
            <span className="text-gov-muted block mb-0.5">Statutory Lien Beneficiary</span>
            <span className="font-medium text-gov-text">{fdrData.lien_in_favour}</span>
          </div>

          <div>
            <span className="text-gov-muted block mb-0.5">Issue Date</span>
            <span className="font-medium text-gov-text">{fdrData.issue_date}</span>
          </div>

          <div>
            <span className="text-gov-muted block mb-0.5">Maturity Date</span>
            <span className="font-medium text-gov-text">{fdrData.maturity_date}</span>
          </div>
        </div>

        {/* Action Form */}
        <div className="p-6 bg-gray-50/70 border-t border-gov-border space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gov-text mb-1">
                Confirming Bank Officer Name *
              </label>
              <input
                type="text"
                value={officerName}
                onChange={(e) => setOfficerName(e.target.value)}
                placeholder="e.g. Smt. Meenakshi Sundaram"
                className="w-full px-3 py-2 text-xs border border-gov-border rounded bg-white focus:outline-none focus:ring-1 focus:ring-gov-navy"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gov-text mb-1">
                Verification Reference / CBS Remarks
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Verified against SBI CBS Terminal #4920"
                className="w-full px-3 py-2 text-xs border border-gov-border rounded bg-white focus:outline-none focus:ring-1 focus:ring-gov-navy"
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowRejectModal(true)}
              disabled={isSubmitting}
              className="w-full sm:w-auto px-4 py-2 border border-red-300 text-red-700 bg-red-50 hover:bg-red-100 text-xs font-semibold rounded flex items-center justify-center gap-1.5 transition-colors"
            >
              <XCircle className="w-4 h-4" />
              <span>Reject Deposit Terms</span>
            </button>

            <button
              type="button"
              onClick={handleConfirm}
              disabled={isSubmitting || !officerName.trim()}
              className="w-full sm:w-auto px-6 py-2.5 bg-gov-navy text-white hover:bg-gov-navy/90 text-xs font-bold rounded flex items-center justify-center gap-2 shadow-xs transition-colors disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4 text-gov-gold" />
              <span>{isSubmitting ? 'Confirming...' : 'Formally Confirm FDR (Promote to Tier 2)'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-lg border border-gov-border max-w-md w-full p-6 space-y-4 shadow-xl">
            <h3 className="text-sm font-bold text-red-900 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600" />
              Reject FDR Verification
            </h3>
            <p className="text-xs text-gov-muted leading-relaxed">
              Please specify the audited reason why this Fixed Deposit Receipt cannot be confirmed (e.g. certificate number not found, incorrect amount, or expired receipt).
            </p>
            <div>
              <label className="block text-xs font-semibold text-gov-text mb-1">
                Audited Rejection Reason *
              </label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="State specific discrepancy found in bank records..."
                rows={3}
                className="w-full px-3 py-2 text-xs border border-gov-border rounded focus:outline-none focus:ring-1 focus:ring-red-500"
                required
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowRejectModal(false)}
                className="px-3 py-1.5 text-xs font-semibold text-gov-muted hover:text-gov-text"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleReject}
                disabled={isSubmitting || !rejectionReason.trim()}
                className="px-4 py-1.5 bg-red-600 text-white text-xs font-semibold rounded hover:bg-red-700 disabled:opacity-50"
              >
                {isSubmitting ? 'Submitting...' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
