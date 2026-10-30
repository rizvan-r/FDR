import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { FDRLineageGraph, FDR } from '../../types';
import { fetchFDRLineage, fetchFDRById } from '../../lib/api';
import { FDRLineageTree } from '../../components/lineage/FDRLineageTree';
import { LineageTimeline } from '../../components/lineage/LineageTimeline';

export const FDRLineagePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [fdr, setFdr] = useState<FDR | null>(null);
  const [lineage, setLineage] = useState<FDRLineageGraph | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    Promise.all([fetchFDRById(id), fetchFDRLineage(id)])
      .then(([fdrData, lineageData]) => {
        setFdr(fdrData);
        setLineage(lineageData);
      })
      .catch((err) => {
        setError(err.message || 'Failed to load FDR lineage graph.');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [id]);

  if (loading) {
    return (
      <div className="p-12 text-center text-slate-500 bg-white border border-slate-200 rounded-xl">
        Loading FDR directed lineage graph and heritage chain...
      </div>
    );
  }

  if (error || !lineage) {
    return (
      <div className="p-8 text-center text-rose-700 bg-rose-50 border border-rose-200 rounded-xl text-sm">
        {error || 'Lineage graph not available.'}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded border border-purple-200">
              Heritage DAG
            </span>
            <span className="text-xs font-mono font-bold text-slate-800">
              {fdr?.fdr_number || id}
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            FDR Lineage & Heritage Explorer
          </h1>
          <p className="text-sm text-slate-600 mt-1 max-w-2xl">
            Trace the complete multi-generational lineage chain of security deposits, verify predecessor
            replacements, and audit approved lifecycle transitions.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {fdr && (
            <Link
              to={`/fdrs/${fdr.id}`}
              className="px-3.5 py-2 rounded-lg border border-slate-300 text-slate-700 font-medium text-xs hover:bg-slate-50 transition-colors"
            >
              ← Back to FDR Details
            </Link>
          )}

          <Link
            to={`/renewals/new`}
            className="px-3.5 py-2 rounded-lg bg-blue-700 text-white font-semibold text-xs hover:bg-blue-800 transition-colors shadow-sm"
          >
            + Initiate Renewal
          </Link>
        </div>
      </div>

      {/* Visual DAG Tree Component */}
      <FDRLineageTree lineage={lineage} currentTargetId={id} />

      {/* Chronological Audit Timeline */}
      <LineageTimeline lineage={lineage} />
    </div>
  );
};
