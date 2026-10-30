import React from 'react';
import { Link } from 'react-router-dom';
import { FDRLineageGraph, FDRLineageNode } from '../../types';
import { TrustTierBadge } from '../common/TrustTierBadge';
import { HeartbeatStatusBadge } from '../common/HeartbeatStatusBadge';

interface FDRLineageTreeProps {
  lineage: FDRLineageGraph;
  currentTargetId?: string;
}

export const FDRLineageTree: React.FC<FDRLineageTreeProps> = ({
  lineage,
  currentTargetId,
}) => {
  const { nodes, edges, root_fdr_id, total_nodes } = lineage;

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

  if (!nodes || nodes.length === 0) {
    return (
      <div className="p-12 text-center bg-white border border-slate-200 rounded-xl text-slate-400">
        No lineage graph data available.
      </div>
    );
  }

  // Sort nodes by generation level
  const sortedNodes = [...nodes].sort(
    (a, b) => (a.generation_level ?? 0) - (b.generation_level ?? 0)
  );

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
      <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
            <span>FDR Lineage & Heritage Graph</span>
            <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800">
              {total_nodes} Generation{total_nodes !== 1 ? 's' : ''} Linked
            </span>
          </h3>
          <p className="text-xs text-slate-500">
            Immutable chain of security deposit renewals, predecessor links, and regulatory lineage
          </p>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5 text-slate-600">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
            <span>Active Replacement</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-600">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-500 inline-block" />
            <span>Renewed Predecessor</span>
          </div>
        </div>
      </div>

      {/* Visual DAG Nodes Container */}
      <div className="p-6 md:p-8 overflow-x-auto">
        <div className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-8 min-w-max mx-auto py-4">
          {sortedNodes.map((node, index) => {
            const isTarget =
              node.fdr_id === currentTargetId || node.id === currentTargetId || node.is_current;
            const isRoot = node.fdr_id === root_fdr_id;
            const edgeBefore = index > 0 ? edges[index - 1] : null;

            return (
              <React.Fragment key={node.fdr_id || node.id || index}>
                {/* Connecting Edge Arrow (for index > 0) */}
                {index > 0 && (
                  <div className="flex flex-col items-center justify-center text-slate-400 py-2 md:py-0">
                    <div className="flex items-center gap-1 text-[11px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 uppercase tracking-wider mb-1">
                      <span>➔</span>
                      <span>{edgeBefore?.relationship_type || 'Renewal'}</span>
                    </div>
                    <div className="w-0.5 h-6 md:w-12 md:h-0.5 bg-blue-300 relative">
                      <div className="hidden md:block absolute -right-1.5 -top-1 w-2.5 h-2.5 border-t-2 border-r-2 border-blue-500 rotate-45" />
                    </div>
                    {edgeBefore?.created_at && (
                      <span className="text-[10px] text-slate-400 mt-1">
                        {formatDate(edgeBefore.created_at)}
                      </span>
                    )}
                  </div>
                )}

                {/* Node Card */}
                <div
                  className={`w-72 rounded-xl border p-4 transition-all duration-200 shadow-sm relative ${
                    isTarget
                      ? 'border-blue-500 bg-blue-50/30 ring-2 ring-blue-500/20'
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-md'
                  }`}
                >
                  {/* Generation Badge Header */}
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                        isRoot
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {isRoot
                        ? 'Root Original (Gen 0)'
                        : `Generation ${node.generation_level || index}`}
                    </span>

                    {isTarget && (
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-600 text-white">
                        Inspecting
                      </span>
                    )}
                  </div>

                  {/* FDR Number */}
                  <div className="mb-2">
                    <Link
                      to={`/fdrs/${node.fdr_id || node.id}`}
                      className="text-sm font-bold font-mono text-slate-900 hover:text-blue-700 transition-colors block truncate"
                      title={node.fdr_number}
                    >
                      {node.fdr_number}
                    </Link>
                    <span className="text-xs text-slate-500 truncate block">
                      {node.bank_name} {node.branch_name ? `• ${node.branch_name}` : ''}
                    </span>
                  </div>

                  {/* Amount & Dates */}
                  <div className="bg-slate-50 rounded-lg p-2.5 my-2 border border-slate-100 space-y-1 text-xs">
                    <div className="flex justify-between items-baseline">
                      <span className="text-slate-500">Principal:</span>
                      <span className="font-bold text-slate-900 text-sm">
                        {formatCurrency(node.amount)}
                      </span>
                    </div>
                    <div className="flex justify-between text-[11px] text-slate-600">
                      <span>Maturity:</span>
                      <span className="font-medium">{formatDate(node.maturity_date)}</span>
                    </div>
                  </div>

                  {/* Status & Trust Tier Badges */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 mt-2">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-medium capitalize ${
                        node.lifecycle_status === 'renewed'
                          ? 'bg-purple-100 text-purple-800'
                          : node.lifecycle_status === 'active'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {node.lifecycle_status}
                    </span>

                    <div className="flex items-center gap-1.5">
                      <TrustTierBadge tier={node.trust_tier} size="sm" />
                      <HeartbeatStatusBadge status={node.heartbeat_status} size="sm" />
                    </div>
                  </div>

                  {/* Detail Link Button */}
                  <div className="mt-3 pt-2 text-right">
                    <Link
                      to={`/fdrs/${node.fdr_id || node.id}`}
                      className="text-xs font-semibold text-blue-700 hover:text-blue-900 transition-colors inline-flex items-center gap-1"
                    >
                      <span>View FDR Details</span>
                      <span>→</span>
                    </Link>
                  </div>
                </div>
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
};
