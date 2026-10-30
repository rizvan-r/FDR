import React, { useState } from 'react';
import { BankReleaseRecord } from '../../types';
import { ReleaseStatusBadge } from './ReleaseStatusBadge';
import { Building2, ArrowRightCircle, CheckCircle2, XCircle, AlertCircle, Send, ShieldAlert, Clock } from 'lucide-react';

interface BankReleaseStatusCardProps {
  bankRelease?: BankReleaseRecord;
  canPrepareInstruction?: boolean;
  canSimulateBank?: boolean;
  onPrepareInstruction?: () => Promise<void>;
  onConfirmBankRelease?: (bankRef: string, status: 'released' | 'release_rejected', method: string) => Promise<void>;
  isLoading?: boolean;
}

export const BankReleaseStatusCard: React.FC<BankReleaseStatusCardProps> = ({
  bankRelease,
  canPrepareInstruction = false,
  canSimulateBank = false,
  onPrepareInstruction,
  onConfirmBankRelease,
  isLoading = false,
}) => {
  const [showSimulateModal, setShowSimulateModal] = useState(false);
  const [simBankRef, setSimBankRef] = useState(`BNK-REL-${Math.floor(100000 + Math.random() * 900000)}`);
  const [simStatus, setSimStatus] = useState<'released' | 'release_rejected'>('released');
  const [simMethod, setSimMethod] = useState('simulated_bank_portal');
  const [processing, setProcessing] = useState(false);

  const handleSimulateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onConfirmBankRelease) return;
    try {
      setProcessing(true);
      await onConfirmBankRelease(simBankRef, simStatus, simMethod);
      setShowSimulateModal(false);
    } finally {
      setProcessing(false);
    }
  };

  const status = bankRelease?.release_status || 'not_started';

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
      {/* Header */}
      <div className="p-5 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Building2 className="w-5 h-5 text-[#12345A]" />
          <div>
            <h3 className="font-semibold text-slate-900 text-base">
              Commercial Depository Bank Release Tracking
            </h3>
            <p className="text-xs text-slate-500">
              Direct lien discharge surveillance with issuing banking institution
            </p>
          </div>
        </div>
        <ReleaseStatusBadge status={status} type="bank" size="lg" />
      </div>

      {/* Body */}
      <div className="p-5 space-y-4">
        {/* Strict Simulated Demo Disclaimer Alert */}
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2.5 text-xs text-amber-900">
          <ShieldAlert className="w-4 h-4 text-amber-700 flex-shrink-0 mt-0.5" />
          <div>
            <span className="font-bold tracking-wide">SIMULATED DEMO NOTICE:</span>{' '}
            {bankRelease?.disclaimer || 'SIMULATED DEMO — NOT AN ACTUAL BANK MONEY TRANSFER. All banking responses operate within an authorized sovereign sandbox.'}
          </div>
        </div>

        {/* Status Fields */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 pt-1">
          <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200">
            <span className="text-xs text-slate-500 font-medium block">Issuing Bank</span>
            <span className="text-sm font-semibold text-slate-900 mt-0.5 block">
              {bankRelease?.bank_name || 'Designated Commercial Bank'}
            </span>
          </div>

          <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200">
            <span className="text-xs text-slate-500 font-medium block">Instruction Reference</span>
            <span className="text-sm font-mono font-medium text-slate-800 mt-0.5 block">
              {bankRelease?.instruction_reference || 'Not Yet Dispatched'}
            </span>
          </div>

          <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200">
            <span className="text-xs text-slate-500 font-medium block">Bank Confirmation Reference</span>
            <span className="text-sm font-mono font-medium text-slate-800 mt-0.5 block">
              {bankRelease?.bank_reference || 'Pending Bank Confirmation'}
            </span>
          </div>

          <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200">
            <span className="text-xs text-slate-500 font-medium block">Confirmation Method</span>
            <span className="text-sm font-medium text-slate-800 mt-0.5 block capitalize">
              {bankRelease?.confirmation_method?.replace(/_/g, ' ') || 'Awaiting Response'}
            </span>
          </div>

          <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200">
            <span className="text-xs text-slate-500 font-medium block">Confirmation Date</span>
            <span className="text-sm font-medium text-slate-800 mt-0.5 block">
              {bankRelease?.bank_confirmation_date
                ? new Date(bankRelease.bank_confirmation_date).toLocaleString()
                : 'Pending'}
            </span>
          </div>

          <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200">
            <span className="text-xs text-slate-500 font-medium block">Environment Status</span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-100 text-blue-800 inline-block mt-1">
              Sandbox Simulation
            </span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="pt-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-slate-500">
            {status === 'released' && (
              <span className="flex items-center gap-1.5 text-emerald-700 font-semibold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Lien encumbrance legally discharged on depository core banking ledger.
              </span>
            )}
            {status === 'release_rejected' && (
              <span className="flex items-center gap-1.5 text-rose-700 font-semibold">
                <XCircle className="w-4 h-4 text-rose-600" />
                Depository bank declined lien release. Review grounds with Bank Nodal Officer.
              </span>
            )}
            {status === 'not_started' && (
              <span>Dispatch formal statutory instruction to bank to initiate lien release.</span>
            )}
            {status === 'instruction_prepared' && (
              <span className="flex items-center gap-1 text-amber-700">
                <Clock className="w-4 h-4 animate-spin" />
                Instruction generated. Awaiting confirmation from branch or sandbox.
              </span>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            {canPrepareInstruction && status === 'not_started' && onPrepareInstruction && (
              <button
                type="button"
                onClick={onPrepareInstruction}
                disabled={isLoading}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-[#1D5F91] hover:bg-[#12345A] rounded-lg shadow-sm transition-colors disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                Dispatch Bank Release Instruction
              </button>
            )}

            {canSimulateBank && status !== 'released' && onConfirmBankRelease && (
              <button
                type="button"
                onClick={() => setShowSimulateModal(true)}
                disabled={isLoading}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg shadow-sm transition-colors"
              >
                <Building2 className="w-3.5 h-3.5 text-[#1D5F91]" />
                Simulate Bank Response
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Simulation Modal */}
      {showSimulateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-[#1D5F91]" />
                <h4 className="font-bold text-slate-900 text-sm">
                  Simulate Bank Lien Release Response
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setShowSimulateModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSimulateSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Bank Confirmation Action
                </label>
                <select
                  value={simStatus}
                  onChange={(e) => setSimStatus(e.target.value as any)}
                  className="w-full text-xs rounded-lg border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="released">Confirm Lien Release (Discharged)</option>
                  <option value="release_rejected">Reject Lien Release (Branch Discrepancy)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Simulated Bank Reference Number
                </label>
                <input
                  type="text"
                  value={simBankRef}
                  onChange={(e) => setSimBankRef(e.target.value)}
                  className="w-full text-xs rounded-lg border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Confirmation Protocol
                </label>
                <select
                  value={simMethod}
                  onChange={(e) => setSimMethod(e.target.value)}
                  className="w-full text-xs rounded-lg border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="simulated_bank_portal">Simulated Bank Gateway</option>
                  <option value="sftp_cbs_sync">Automated CBS Reconciliation</option>
                  <option value="branch_official_attestation">Branch Official Physical Attestation</option>
                </select>
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
                Notice: Submitting will update the bank release state and, upon release confirmation, update the FDR lifecycle status to <strong className="text-amber-950">Released</strong>.
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowSimulateModal(false)}
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
                  {processing ? 'Processing...' : 'Submit Simulated Confirmation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
