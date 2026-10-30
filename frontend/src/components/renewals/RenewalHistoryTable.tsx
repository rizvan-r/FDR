import React from 'react';
import { Link } from 'react-router-dom';
import { RenewalCase } from '../../types';
import { RenewalStatusBadge } from './RenewalStatusBadge';

interface RenewalHistoryTableProps {
  cases: RenewalCase[];
  emptyMessage?: string;
}

export const RenewalHistoryTable: React.FC<RenewalHistoryTableProps> = ({
  cases,
  emptyMessage = 'No renewal cases found.',
}) => {
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '—';
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

  if (cases.length === 0) {
    return (
      <div className="p-8 text-center text-slate-400 text-sm bg-white border border-slate-200 rounded-xl">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-slate-700">
          <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
            <tr>
              <th className="py-3 px-4">Case Number</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4">Predecessor FDR</th>
              <th className="py-3 px-4">Proposed Replacement</th>
              <th className="py-3 px-4">Match Score</th>
              <th className="py-3 px-4">Submitted</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {cases.map((c) => (
              <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                <td className="py-3 px-4 font-mono font-bold text-blue-700">
                  <Link to={`/renewals/${c.id}`} className="hover:underline">
                    {c.case_number}
                  </Link>
                </td>
                <td className="py-3 px-4">
                  <RenewalStatusBadge status={c.status || c.case_status || 'draft'} size="sm" />
                </td>
                <td className="py-3 px-4 font-mono">
                  {c.original_fdr?.fdr_number || c.original_fdr_id}
                </td>
                <td className="py-3 px-4 font-mono">
                  {c.proposed_replacement_fdr?.fdr_number ||
                    c.proposed_replacement_fdr_id || (
                      <span className="text-slate-400 italic">None</span>
                    )}
                </td>
                <td className="py-3 px-4">
                  {c.matching_score !== undefined || c.match_score !== undefined ? (
                    <span className="font-semibold text-slate-900">
                      {(c.matching_score ?? c.match_score)?.toFixed(0)}%
                    </span>
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </td>
                <td className="py-3 px-4 text-slate-500">
                  {formatDate(c.submitted_at || c.created_at)}
                </td>
                <td className="py-3 px-4 text-right">
                  <Link
                    to={`/renewals/${c.id}`}
                    className="font-semibold text-blue-600 hover:text-blue-800"
                  >
                    View Case
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
