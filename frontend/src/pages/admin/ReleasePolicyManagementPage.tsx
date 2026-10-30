import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldCheck,
  PlusCircle,
  CheckCircle2,
  AlertCircle,
  FileText,
  Clock,
  Layers,
  Save,
  Check,
  ArrowLeft,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import { ReleasePolicyVersion, ReleasePolicyConfigItem } from '../../types';
import { fetchReleasePolicies, createReleasePolicy, activateReleasePolicy } from '../../lib/api';

export const ReleasePolicyManagementPage: React.FC = () => {
  const [policies, setPolicies] = useState<ReleasePolicyVersion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [processing, setProcessing] = useState(false);

  // Form State
  const [policyName, setPolicyName] = useState('');
  const [policyVersion, setPolicyVersion] = useState(`RPV-2026.${Math.floor(2 + Math.random() * 5)}`);
  const [policyDescription, setPolicyDescription] = useState('');
  const [sourceReference, setSourceReference] = useState('AICTE Approval Process Handbook (APH) 2026-27, Chapter IV');

  const loadPolicies = async () => {
    setIsLoading(true);
    try {
      const data = await fetchReleasePolicies();
      setPolicies(data);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPolicies();
  }, []);

  const handleActivate = async (policyId: string) => {
    try {
      setProcessing(true);
      await activateReleasePolicy(policyId);
      await loadPolicies();
    } catch (err: any) {
      alert(err.message || 'Failed to activate policy.');
    } finally {
      setProcessing(false);
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setProcessing(true);
      await createReleasePolicy({
        policy_name: policyName,
        policy_version: policyVersion,
        policy_description: policyDescription,
        source_reference: sourceReference,
        effective_from: new Date().toISOString(),
        checklist_configuration: [
          { key: 'CHK_FDR_IDENTITY', title: 'FDR Identity & Custody Verification', is_required: true },
          { key: 'CHK_MATURITY_STATUS', title: 'Deposit Maturity & Tenure Completion', is_required: true },
          { key: 'CHK_BANK_VERIFICATION', title: 'Depository Bank Digital Standing', is_required: true },
          { key: 'CHK_COMPLIANCE_CLEARANCE', title: 'Institutional Regulatory Clearance', is_required: true },
          { key: 'CHK_FINANCIAL_SETTLEMENT', title: 'Financial Corpus Assessment', is_required: true },
        ],
        approval_configuration: {
          stages: [
            { stage: 'preliminary_review', role: 'regional_officer', label: 'Regional Office Preliminary' },
            { stage: 'eligibility_review', role: 'bureau_officer', label: 'Approval Bureau Regulatory' },
            { stage: 'finance_review', role: 'finance_officer', label: 'Finance Bureau Reconciliation' },
            { stage: 'authority_review', role: 'system_admin', label: 'Competent Authority Final Sanction' },
          ],
        },
      });
      setShowCreateModal(false);
      setPolicyName('');
      setPolicyDescription('');
      await loadPolicies();
    } catch (err: any) {
      alert(err.message || 'Failed to create policy.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <Link
              to="/releases"
              className="text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors inline-flex items-center gap-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Releases
            </Link>
            <span className="text-slate-300">/</span>
            <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-800 border border-purple-200">
              Regulatory Policy Engine
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <ShieldCheck className="w-7 h-7 text-[#12345A]" />
            Release Policy Versions & Delegation Configuration
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Maintain statutory checklist definitions, four-tier delegation matrices, and separation-of-duties rules.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            disabled={isLoading || processing}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#1D5F91] hover:bg-[#12345A] rounded-lg shadow-sm transition-colors"
          >
            <PlusCircle className="w-4 h-4" />
            New Policy Version
          </button>
          <button
            type="button"
            onClick={loadPolicies}
            disabled={isLoading}
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200"
            title="Refresh policies"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Policy List Cards */}
      <div className="space-y-6">
        {policies.map((pol) => (
          <div
            key={pol.id}
            className={`bg-white border rounded-xl shadow-sm overflow-hidden transition-all ${
              pol.is_active ? 'border-blue-400 ring-1 ring-blue-400/30' : 'border-slate-200'
            }`}
          >
            {/* Policy Title Header */}
            <div className="p-5 border-b border-slate-200 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-bold text-slate-900 text-base">{pol.policy_name}</h3>
                  <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-200 font-semibold text-slate-800">
                    {pol.policy_version}
                  </span>
                  {pol.is_active ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                      <Check className="w-3 h-3" />
                      Active Enforcement
                    </span>
                  ) : (
                    <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-slate-100 text-slate-500">
                      Historical
                    </span>
                  )}
                </div>

                <p className="text-xs text-slate-600">{pol.policy_description}</p>
                <p className="text-[11px] text-slate-400 italic">
                  Source: {pol.source_reference}
                </p>
              </div>

              <div>
                {!pol.is_active && (
                  <button
                    type="button"
                    onClick={() => handleActivate(pol.id)}
                    disabled={processing}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-[#1D5F91] bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg shadow-sm transition-colors"
                  >
                    Activate Policy Version
                  </button>
                )}
              </div>
            </div>

            {/* Policy Subsections */}
            <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-6 bg-white">
              {/* Checklist Requirements */}
              <div className="space-y-3">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-[#1D5F91]" />
                  Statutory Checklist Criteria ({pol.checklist_configuration?.length || 0})
                </span>

                <div className="space-y-2">
                  {(pol.checklist_configuration || []).map((chk: any, idx: number) => (
                    <div
                      key={chk.key}
                      className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs flex items-start gap-2.5"
                    >
                      <span className="w-5 h-5 rounded-full bg-white border border-slate-300 text-slate-600 flex items-center justify-center font-bold text-[10px] flex-shrink-0">
                        {idx + 1}
                      </span>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-slate-900">{chk.title}</span>
                          {chk.is_required && (
                            <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-1.5 py-0.2 rounded">
                              Required
                            </span>
                          )}
                        </div>
                        {chk.description && (
                          <p className="text-slate-500 text-[11px] mt-0.5">{chk.description}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Four-tier Delegation Approval Matrix */}
              <div className="space-y-3">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  Four-Tier Delegation & Governance Matrix
                </span>

                <div className="space-y-2">
                  {(pol.approval_configuration?.stages || [
                    { stage: 'preliminary_review', role: 'regional_officer', label: 'Regional Office Preliminary Review' },
                    { stage: 'eligibility_review', role: 'bureau_officer', label: 'Approval Bureau Regulatory Audit' },
                    { stage: 'finance_review', role: 'finance_officer', label: 'Finance Bureau Reconciliation' },
                    { stage: 'authority_review', role: 'system_admin', label: 'Competent Authority Final Sanction' },
                  ]).map((stg: any, idx: number) => (
                    <div
                      key={stg.stage}
                      className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center font-bold text-[10px]">
                          T{idx + 1}
                        </span>
                        <div>
                          <div className="font-semibold text-slate-900">{stg.label}</div>
                          <div className="text-[11px] text-slate-500 font-mono">Role: {stg.role}</div>
                        </div>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 font-semibold border border-emerald-200">
                        Authorized
                      </span>
                    </div>
                  ))}
                </div>

                <div className="mt-4 p-3 bg-blue-50/70 border border-blue-200 rounded-lg text-[11px] text-blue-900 space-y-1">
                  <div className="font-bold">Separation of Duties Rule:</div>
                  <p>
                    Self-approval strictly prohibited across all stages. Applicants cannot audit or approve their own submissions.
                  </p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Create Policy Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-[#1D5F91]" />
                <h4 className="font-bold text-slate-900 text-sm">
                  Create New Release Policy Specification
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Policy Name
                </label>
                <input
                  type="text"
                  value={policyName}
                  onChange={(e) => setPolicyName(e.target.value)}
                  placeholder="e.g. AICTE Security Deposit Release Norms (Revised 2027)"
                  className="w-full text-xs rounded-lg border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Policy Version Tag
                </label>
                <input
                  type="text"
                  value={policyVersion}
                  onChange={(e) => setPolicyVersion(e.target.value)}
                  className="w-full text-xs rounded-lg border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Source Reference / Council Order
                </label>
                <input
                  type="text"
                  value={sourceReference}
                  onChange={(e) => setSourceReference(e.target.value)}
                  className="w-full text-xs rounded-lg border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Policy Summary & Purpose
                </label>
                <textarea
                  rows={3}
                  value={policyDescription}
                  onChange={(e) => setPolicyDescription(e.target.value)}
                  placeholder="Summarize applicable chapters, deposit types, or tenure exceptions..."
                  className="w-full text-xs rounded-lg border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  disabled={processing}
                  className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-800 rounded bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={processing}
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-[#1D5F91] hover:bg-[#12345A] rounded-lg shadow-sm disabled:opacity-50"
                >
                  {processing ? 'Creating...' : 'Create Policy Version'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
