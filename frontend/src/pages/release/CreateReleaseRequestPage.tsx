import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import {
  FileCheck2,
  Building2,
  ShieldCheck,
  AlertCircle,
  ArrowLeft,
  Send,
  Save,
  CheckCircle2,
  Calendar,
  IndianRupee,
  Layers,
} from 'lucide-react';
import { FDR, ReleasePolicyVersion } from '../../types';
import { fetchFDRs, fetchReleasePolicies, createReleaseRequest, submitReleaseRequest } from '../../lib/api';

export const CreateReleaseRequestPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedFdrId = searchParams.get('fdr_id');

  const [fdrs, setFdrs] = useState<FDR[]>([]);
  const [policies, setPolicies] = useState<ReleasePolicyVersion[]>([]);
  const [selectedFdrId, setSelectedFdrId] = useState<string>(preselectedFdrId || '');
  const [selectedPolicyId, setSelectedPolicyId] = useState<string>('');
  const [requestReason, setRequestReason] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const loadInitData = async () => {
      setIsLoading(true);
      try {
        const [fdrsData, policiesData] = await Promise.all([
          fetchFDRs(),
          fetchReleasePolicies(),
        ]);
        setFdrs(fdrsData.items || (Array.isArray(fdrsData) ? fdrsData : []));
        setPolicies(policiesData);

        const activePolicy = policiesData.find((p) => p.is_active) || policiesData[0];
        if (activePolicy) {
          setSelectedPolicyId(activePolicy.id);
        }
        if (preselectedFdrId) {
          setSelectedFdrId(preselectedFdrId);
        }
      } catch (err: any) {
        setErrorMsg('Failed to initialize release configuration.');
      } finally {
        setIsLoading(false);
      }
    };
    loadInitData();
  }, [preselectedFdrId]);

  const selectedFdr = fdrs.find((f) => f.id === selectedFdrId);
  const selectedPolicy = policies.find((p) => p.id === selectedPolicyId) || policies[0];

  const handleCreate = async (shouldSubmitImmediately: boolean) => {
    if (!selectedFdrId) {
      setErrorMsg('Please select an active Fixed Deposit Receipt from the vault.');
      return;
    }
    if (!requestReason.trim() || requestReason.length < 15) {
      setErrorMsg('Please state comprehensive statutory grounds for release (minimum 15 characters).');
      return;
    }

    try {
      setSubmitting(true);
      setErrorMsg(null);

      const created = await createReleaseRequest(selectedFdrId, {
        request_reason: requestReason,
        policy_version_id: selectedPolicyId || undefined,
      });

      if (shouldSubmitImmediately && created?.id) {
        await submitReleaseRequest(created.id);
      }

      navigate(`/releases/${created.id}`);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to initialize release request.');
    } finally {
      setSubmitting(false);
    }
  };

  const formatCurrency = (amt: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amt);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-10">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Link
          to="/releases"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Release Command
        </Link>
        <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
          Statutory Release Initiation
        </span>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
        <div className="flex items-center gap-3 pb-5 border-b border-slate-200">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-[#12345A] flex items-center justify-center">
            <FileCheck2 className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Initiate FDR Release & Lien Revocation Request
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              File statutory request under AICTE Approval Process Handbook (APH) guidelines.
            </p>
          </div>
        </div>

        {errorMsg && (
          <div className="mt-4 p-3.5 bg-rose-50 border border-rose-200 rounded-lg flex items-start gap-2.5 text-xs text-rose-800">
            <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1 font-medium">{errorMsg}</div>
          </div>
        )}

        <div className="mt-6 space-y-6">
          {/* Step 1: Choose FDR */}
          <div>
            <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
              1. Select Collateral Deposit from Central Registry
            </label>
            <select
              value={selectedFdrId}
              onChange={(e) => setSelectedFdrId(e.target.value)}
              disabled={isLoading}
              className="w-full text-xs rounded-lg border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 py-2.5 px-3"
            >
              <option value="">-- Select Active FDR --</option>
              {fdrs.map((fdr) => (
                <option key={fdr.id} value={fdr.id}>
                  {fdr.fdr_number} — {fdr.institution_name} ({fdr.bank_name}) — {formatCurrency(fdr.amount)}
                </option>
              ))}
            </select>
          </div>

          {/* Selected FDR Summary Card */}
          {selectedFdr && (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-[#1D5F91]" />
                  Deposit Profile & Vault Verification
                </span>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                  Trust Tier {selectedFdr.trust_tier || 2}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <span className="text-slate-500 text-[11px]">Principal Amount</span>
                  <div className="font-bold text-slate-900 mt-0.5">
                    {formatCurrency(selectedFdr.amount)}
                  </div>
                </div>

                <div>
                  <span className="text-slate-500 text-[11px]">Issuing Bank</span>
                  <div className="font-medium text-slate-800 mt-0.5">
                    {selectedFdr.bank_name}
                  </div>
                </div>

                <div>
                  <span className="text-slate-500 text-[11px]">Branch / IFSC</span>
                  <div className="font-mono text-slate-800 mt-0.5">
                    {selectedFdr.ifsc_code || selectedFdr.branch_name || 'N/A'}
                  </div>
                </div>

                <div>
                  <span className="text-slate-500 text-[11px]">Stated Maturity</span>
                  <div className="font-medium text-slate-800 mt-0.5">
                    {new Date(selectedFdr.maturity_date).toLocaleDateString()}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Policy & Regulatory Norms */}
          <div>
            <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
              2. Applicable Release Policy & Delegation Matrix
            </label>
            <select
              value={selectedPolicyId}
              onChange={(e) => setSelectedPolicyId(e.target.value)}
              className="w-full text-xs rounded-lg border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 py-2.5 px-3"
            >
              {policies.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.policy_name} ({p.policy_version})
                </option>
              ))}
            </select>
            {selectedPolicy?.source_reference && (
              <p className="text-[11px] text-slate-500 mt-1 italic">
                Statutory Reference: {selectedPolicy.source_reference}
              </p>
            )}
          </div>

          {/* Step 3: Statutory Justification */}
          <div>
            <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">
              3. Statutory Grounds & Justification for Release <span className="text-rose-600">*</span>
            </label>
            <p className="text-xs text-slate-500 mb-2">
              State compliance milestones (e.g. full academic cycle graduated, course closure, replacement FDR provided).
            </p>
            <textarea
              rows={4}
              value={requestReason}
              onChange={(e) => setRequestReason(e.target.value)}
              placeholder="Detail institutional grounds, resolution numbers, and absence of pending court or AICTE disputes..."
              className="w-full text-xs rounded-lg border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              required
            />
          </div>

          {/* Step 4: Policy Checklist Preview */}
          {selectedPolicy?.checklist_configuration && (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                Required Audit Criteria ({selectedPolicy.checklist_configuration.length} Checks)
              </span>
              <p className="text-[11px] text-slate-500">
                These criteria will be audited sequentially across Regional, Approval, and Finance bureaus before final sanction.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                {selectedPolicy.checklist_configuration.map((chk, idx) => (
                  <div
                    key={chk.key}
                    className="flex items-center gap-2 p-2 bg-white border border-slate-200 rounded-lg text-xs"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
                    <span className="font-medium text-slate-800 truncate">{chk.title}</span>
                    {chk.is_required && (
                      <span className="text-[10px] text-rose-700 font-bold ml-auto">*Mandatory</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Submission Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={() => handleCreate(false)}
              disabled={submitting || isLoading}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg shadow-sm transition-colors disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              Save as Draft
            </button>

            <button
              type="button"
              onClick={() => handleCreate(true)}
              disabled={submitting || isLoading}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-5 py-2 text-xs font-semibold text-white bg-[#1D5F91] hover:bg-[#12345A] rounded-lg shadow-sm transition-colors disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              {submitting ? 'Submitting...' : 'Submit for Regulatory Review'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
