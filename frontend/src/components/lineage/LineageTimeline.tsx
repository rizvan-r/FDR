import React from 'react';
import { FDRLineageGraph } from '../../types';

interface LineageTimelineProps {
  lineage: FDRLineageGraph;
}

export const LineageTimeline: React.FC<LineageTimelineProps> = ({ lineage }) => {
  const { nodes, edges } = lineage;

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

  const formatCurrency = (val?: number) => {
    if (val === undefined || val === null) return 'N/A';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
      <h3 className="text-base font-semibold text-slate-900 mb-1">
        Lineage Heritage Audit Trail
      </h3>
      <p className="text-xs text-slate-500 mb-6">
        Chronological audit record of original deposit registration, renewal submissions, and supervisory approvals
      </p>

      <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200">
        {nodes.map((node, idx) => (
          <div key={node.fdr_id || idx} className="relative group">
            {/* Timeline Marker Dot */}
            <div
              className={`absolute -left-6 top-1.5 w-3.5 h-3.5 rounded-full border-2 border-white shadow-sm ${
                idx === 0
                  ? 'bg-purple-600 ring-2 ring-purple-100'
                  : idx === nodes.length - 1
                  ? 'bg-emerald-600 ring-2 ring-emerald-100'
                  : 'bg-blue-600 ring-2 ring-blue-100'
              }`}
            />

            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 transition-all group-hover:border-slate-300">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                <span className="text-xs font-bold text-slate-900 font-mono">
                  {node.fdr_number}
                </span>
                <span className="text-[11px] font-medium text-slate-500">
                  Issued: {formatDate(node.issue_date)} • Matures: {formatDate(node.maturity_date)}
                </span>
              </div>

              <div className="text-xs text-slate-600 mb-2">
                <span>{node.bank_name}</span>
                {node.branch_name && <span> • {node.branch_name}</span>}
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-200 text-xs">
                <span className="font-semibold text-slate-900">
                  {formatCurrency(node.amount)}
                </span>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider ${
                    node.lifecycle_status === 'renewed'
                      ? 'bg-purple-100 text-purple-800'
                      : 'bg-emerald-100 text-emerald-800'
                  }`}
                >
                  {idx === 0 ? 'Original Predecessor' : `Successor Deposit (Gen ${node.generation_level || idx})`}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
