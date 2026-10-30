import React from 'react';
import { RenewalMatchCandidate } from '../../types';

interface RenewalMatchScoreProps {
  score?: number;
  candidate?: RenewalMatchCandidate | null;
  compact?: boolean;
}

export const RenewalMatchScore: React.FC<RenewalMatchScoreProps> = ({
  score = 0,
  candidate,
  compact = false,
}) => {
  const displayScore = candidate?.score ?? score;
  const confidence =
    candidate?.confidence_level ||
    (displayScore >= 80 ? 'high' : displayScore >= 50 ? 'moderate' : 'low');

  const getScoreColor = () => {
    if (displayScore >= 80) return 'text-emerald-700 bg-emerald-50 border-emerald-300';
    if (displayScore >= 50) return 'text-amber-700 bg-amber-50 border-amber-300';
    return 'text-rose-700 bg-rose-50 border-rose-300';
  };

  const getBarColor = () => {
    if (displayScore >= 80) return 'bg-emerald-500';
    if (displayScore >= 50) return 'bg-amber-500';
    return 'bg-rose-500';
  };

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <div className={`px-2 py-0.5 rounded border text-xs font-bold ${getScoreColor()}`}>
          {displayScore.toFixed(0)}% Match
        </div>
        <span className="text-xs text-slate-500 capitalize">({confidence})</span>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h4 className="text-sm font-semibold text-slate-800">Candidate Matching Score</h4>
          <p className="text-xs text-slate-500">6-signal automated weighted compatibility matrix</p>
        </div>
        <div className="text-right">
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold text-slate-900">{displayScore.toFixed(1)}</span>
            <span className="text-xs font-medium text-slate-500">/ 100</span>
          </div>
          <span
            className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${
              confidence === 'high'
                ? 'bg-emerald-100 text-emerald-800'
                : confidence === 'moderate'
                ? 'bg-amber-100 text-amber-800'
                : 'bg-rose-100 text-rose-800'
            }`}
          >
            {confidence} Confidence
          </span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-slate-100 rounded-full h-2 mb-3 overflow-hidden">
        <div
          className={`h-2 rounded-full transition-all duration-500 ${getBarColor()}`}
          style={{ width: `${Math.min(100, Math.max(0, displayScore))}%` }}
        />
      </div>

      {/* Factors and Mismatches */}
      {candidate && (
        <div className="space-y-2 mt-3 pt-3 border-t border-slate-100 text-xs">
          {candidate.matching_factors && candidate.matching_factors.length > 0 && (
            <div>
              <span className="font-medium text-emerald-800 block mb-1">
                Matched Signals ({candidate.matching_factors.length}):
              </span>
              <div className="flex flex-wrap gap-1.5">
                {candidate.matching_factors.map((factor, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded text-[11px] border border-emerald-200"
                  >
                    ✓ {factor}
                  </span>
                ))}
              </div>
            </div>
          )}

          {candidate.mismatched_fields && candidate.mismatched_fields.length > 0 && (
            <div className="mt-2">
              <span className="font-medium text-amber-800 block mb-1">
                Discrepancies / Variations ({candidate.mismatched_fields.length}):
              </span>
              <div className="flex flex-wrap gap-1.5">
                {candidate.mismatched_fields.map((field, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 px-2 py-0.5 rounded text-[11px] border border-amber-200"
                  >
                    ⚠ {field}
                  </span>
                ))}
              </div>
            </div>
          )}

          {candidate.explanation && (
            <p className="text-slate-600 bg-slate-50 p-2 rounded text-[11px] border border-slate-200 mt-2">
              <strong>Evaluation Note:</strong> {candidate.explanation}
            </p>
          )}
        </div>
      )}

      {/* Mandatory Advisory Notice */}
      <div className="mt-3 p-2.5 bg-blue-50/70 border border-blue-200 rounded text-[11px] text-blue-900 flex items-start gap-2">
        <span className="text-blue-600 font-bold text-sm">ℹ</span>
        <span>
          <strong>Advisory Only:</strong> Candidate matching scores are heuristic suggestions for
          reviewing officers. High scores never automatically approve a renewal or commit a lineage link.
        </span>
      </div>
    </div>
  );
};
