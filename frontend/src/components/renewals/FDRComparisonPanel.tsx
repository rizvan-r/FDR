import React from 'react';
import { FDR } from '../../types';
import { TrustTierBadge } from '../common/TrustTierBadge';
import { HeartbeatStatusBadge } from '../common/HeartbeatStatusBadge';

interface FDRComparisonPanelProps {
  originalFdr?: FDR | null;
  replacementFdr?: FDR | null;
}

export const FDRComparisonPanel: React.FC<FDRComparisonPanelProps> = ({
  originalFdr,
  replacementFdr,
}) => {
  if (!originalFdr) {
    return (
      <div className="p-8 text-center bg-slate-50 border border-slate-200 rounded-lg text-slate-500 text-sm">
        Original FDR record not selected.
      </div>
    );
  }

  const formatCurrency = (val?: number) => {
    if (val === undefined || val === null) return 'N/A';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val);
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'N/A';
    try {
      return new Date(dateStr).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const amountDiff =
    replacementFdr && originalFdr
      ? replacementFdr.amount - originalFdr.amount
      : 0;

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
      <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-slate-900">
            FDR Replacement Comparison Matrix
          </h3>
          <p className="text-xs text-slate-500">
            Side-by-side structural verification between original deposit and proposed replacement
          </p>
        </div>
        {replacementFdr && (
          <div className="flex items-center gap-2">
            {amountDiff === 0 ? (
              <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800">
                Exact Amount Match
              </span>
            ) : amountDiff > 0 ? (
              <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-blue-100 text-blue-800">
                Increased by {formatCurrency(amountDiff)}
              </span>
            ) : (
              <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-amber-100 text-amber-800">
                Decreased by {formatCurrency(Math.abs(amountDiff))}
              </span>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-200">
        {/* Original FDR Column */}
        <div className="p-5 bg-slate-50/50 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                Original Predecessor Deposit
              </span>
              <h4 className="text-base font-bold text-slate-900 font-mono">
                {originalFdr.fdr_number}
              </h4>
            </div>
            <span className="px-2 py-0.5 rounded text-xs font-medium bg-slate-200 text-slate-700 capitalize">
              {originalFdr.lifecycle_status}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-slate-500 block">Beneficiary Institution</span>
              <span className="font-semibold text-slate-800">
                {originalFdr.institution_name || 'N/A'}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block">Depository Bank</span>
              <span className="font-semibold text-slate-800">
                {originalFdr.bank_name || 'N/A'}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block">Branch & IFSC</span>
              <span className="font-medium text-slate-800">
                {originalFdr.branch_name || 'N/A'}
                <span className="block text-[10px] text-slate-500 font-mono">
                  {originalFdr.ifsc_code}
                </span>
              </span>
            </div>
            <div>
              <span className="text-slate-500 block">Principal Amount</span>
              <span className="font-bold text-slate-900 text-sm">
                {formatCurrency(originalFdr.amount)}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block">Issue Date</span>
              <span className="font-medium text-slate-800">
                {formatDate(originalFdr.issue_date)}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block">Maturity Date</span>
              <span className="font-medium text-slate-800">
                {formatDate(originalFdr.maturity_date)}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block">Interest Rate</span>
              <span className="font-medium text-slate-800">
                {originalFdr.interest_rate ? `${originalFdr.interest_rate}% p.a.` : 'N/A'}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block">Trust Tier</span>
              <div className="mt-0.5">
                <TrustTierBadge tier={originalFdr.trust_tier} size="sm" />
              </div>
            </div>
            <div className="col-span-2">
              <span className="text-slate-500 block">Lien In Favour</span>
              <span className="font-medium text-slate-800">{originalFdr.lien_in_favour}</span>
            </div>
            <div className="col-span-2">
              <span className="text-slate-500 block">Heartbeat Status</span>
              <div className="mt-0.5">
                <HeartbeatStatusBadge status={originalFdr.heartbeat_status} size="sm" />
              </div>
            </div>
          </div>
        </div>

        {/* Replacement FDR Column */}
        <div className="p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600 block">
                Proposed Replacement Successor
              </span>
              {replacementFdr ? (
                <h4 className="text-base font-bold text-slate-900 font-mono">
                  {replacementFdr.fdr_number}
                </h4>
              ) : (
                <span className="text-sm italic text-slate-400">Not designated yet</span>
              )}
            </div>
            {replacementFdr && (
              <span className="px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-800 capitalize">
                {replacementFdr.lifecycle_status}
              </span>
            )}
          </div>

          {replacementFdr ? (
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-slate-500 block">Beneficiary Institution</span>
                <span
                  className={`font-semibold ${
                    replacementFdr.institution_id === originalFdr.institution_id
                      ? 'text-emerald-700'
                      : 'text-rose-700 font-bold'
                  }`}
                >
                  {replacementFdr.institution_name || 'N/A'}
                  {replacementFdr.institution_id !== originalFdr.institution_id && (
                    <span className="block text-[10px] text-rose-600">Cross-institution mismatch</span>
                  )}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Depository Bank</span>
                <span
                  className={`font-semibold ${
                    replacementFdr.bank_id === originalFdr.bank_id
                      ? 'text-slate-800'
                      : 'text-amber-700'
                  }`}
                >
                  {replacementFdr.bank_name || 'N/A'}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Branch & IFSC</span>
                <span className="font-medium text-slate-800">
                  {replacementFdr.branch_name || 'N/A'}
                  <span className="block text-[10px] text-slate-500 font-mono">
                    {replacementFdr.ifsc_code}
                  </span>
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Principal Amount</span>
                <span
                  className={`font-bold text-sm ${
                    amountDiff === 0
                      ? 'text-emerald-700'
                      : amountDiff > 0
                      ? 'text-blue-700'
                      : 'text-amber-700'
                  }`}
                >
                  {formatCurrency(replacementFdr.amount)}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Issue Date</span>
                <span className="font-medium text-slate-800">
                  {formatDate(replacementFdr.issue_date)}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Maturity Date</span>
                <span className="font-medium text-slate-800 font-bold text-blue-900">
                  {formatDate(replacementFdr.maturity_date)}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Interest Rate</span>
                <span className="font-medium text-slate-800">
                  {replacementFdr.interest_rate ? `${replacementFdr.interest_rate}% p.a.` : 'N/A'}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Independent Trust Tier</span>
                <div className="mt-0.5 flex items-center gap-1.5">
                  <TrustTierBadge tier={replacementFdr.trust_tier} size="sm" />
                  {replacementFdr.trust_tier < 2 && (
                    <span className="text-[10px] text-amber-600 font-medium">Needs Bank Confirm</span>
                  )}
                </div>
              </div>
              <div className="col-span-2">
                <span className="text-slate-500 block">Lien In Favour</span>
                <span className="font-medium text-slate-800">{replacementFdr.lien_in_favour}</span>
              </div>
              <div className="col-span-2">
                <span className="text-slate-500 block">Heartbeat Status</span>
                <div className="mt-0.5">
                  <HeartbeatStatusBadge status={replacementFdr.heartbeat_status} size="sm" />
                </div>
              </div>
            </div>
          ) : (
            <div className="py-12 text-center text-slate-400 text-xs">
              Select or propose a candidate deposit receipt to inspect side-by-side variations.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
