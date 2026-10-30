import React from 'react';
import { Link } from 'react-router-dom';
import { RenewalCase } from '../../types';
import { RenewalStatusBadge } from './RenewalStatusBadge';

interface RenewalCaseCardProps {
  renewalCase: RenewalCase;
}

export const RenewalCaseCard: React.FC<RenewalCaseCardProps> = ({ renewalCase }) => {
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

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 hover:border-blue-400 hover:shadow-md transition-all">
      <div className="flex items-center justify-between mb-3">
        <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
          {renewalCase.case_number}
        </span>
        <RenewalStatusBadge status={renewalCase.status || renewalCase.case_status || 'draft'} size="sm" />
      </div>

      <div className="space-y-1.5 mb-4 text-xs">
        <div>
          <span className="text-slate-400 block text-[10px] uppercase font-bold">
            Original Predecessor FDR
          </span>
          <span className="font-mono font-semibold text-slate-800">
            {renewalCase.original_fdr?.fdr_number || renewalCase.original_fdr_id}
          </span>
        </div>

        <div>
          <span className="text-slate-400 block text-[10px] uppercase font-bold">
            Proposed Replacement
          </span>
          <span className="font-mono font-semibold text-slate-800">
            {renewalCase.proposed_replacement_fdr?.fdr_number ||
              renewalCase.proposed_replacement_fdr_id ||
              'Pending Designation'}
          </span>
        </div>

        <div>
          <span className="text-slate-400 block text-[10px] uppercase font-bold">
            Institution & Bank
          </span>
          <span className="text-slate-700 truncate block">
            {renewalCase.institution_name || 'N/A'} • {renewalCase.bank_name || 'N/A'}
          </span>
        </div>
      </div>

      {renewalCase.submission_notes && (
        <p className="text-xs text-slate-500 line-clamp-2 bg-slate-50 p-2 rounded mb-4 italic">
          "{renewalCase.submission_notes}"
        </p>
      )}

      <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs">
        <span className="text-slate-400 text-[11px]">
          Created: {formatDate(renewalCase.created_at)}
        </span>
        <Link
          to={`/renewals/${renewalCase.id}`}
          className="font-semibold text-blue-700 hover:text-blue-900 inline-flex items-center gap-1"
        >
          <span>Review Case</span>
          <span>→</span>
        </Link>
      </div>
    </div>
  );
};
