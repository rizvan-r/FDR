import React from 'react';
import { ShieldAlert, Clock, Info } from 'lucide-react';
import { PriorityReason, TaskPriorityLevel } from '../../types';
import { PriorityBadge } from './PriorityBadge';

interface PriorityReasonPanelProps {
  score: number;
  level: TaskPriorityLevel;
  reasons: PriorityReason[];
  dueAt?: string;
  isOverdue?: boolean;
  className?: string;
}

export const PriorityReasonPanel: React.FC<PriorityReasonPanelProps> = ({
  score,
  level,
  reasons,
  dueAt,
  isOverdue,
  className = '',
}) => {
  const formatDeadline = (iso?: string) => {
    if (!iso) return 'No statutory deadline set';
    const d = new Date(iso);
    const now = new Date();
    const diffHours = Math.round((d.getTime() - now.getTime()) / (1000 * 3600));

    if (diffHours < 0) {
      return `Overdue by ${Math.abs(diffHours)} hours (${d.toLocaleString()})`;
    } else if (diffHours < 24) {
      return `Due in ${diffHours} hours (${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`;
    } else {
      const days = Math.round(diffHours / 24);
      return `Due in ${days} days (${d.toLocaleDateString()})`;
    }
  };

  return (
    <div className={`bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm ${className}`}>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 flex items-center justify-center text-blue-700 dark:text-blue-300 font-bold font-mono text-lg">
            {score}
          </div>
          <div>
            <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
              Dynamic Priority Rating
            </h4>
            <p className="text-xs text-slate-500">
              Evaluated across regulatory urgency and SLA thresholds
            </p>
          </div>
        </div>
        <PriorityBadge level={level} score={score} />
      </div>

      {/* Deadline Bar */}
      <div className={`flex items-center gap-2 p-2.5 rounded-lg text-xs mb-4 ${
        isOverdue 
          ? 'bg-rose-50 text-rose-800 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800'
          : 'bg-slate-50 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
      }`}>
        <Clock className={`w-4 h-4 shrink-0 ${isOverdue ? 'text-rose-600' : 'text-slate-500'}`} />
        <span className="font-medium">SLA Deadline:</span>
        <span>{formatDeadline(dueAt)}</span>
      </div>

      {/* Signals Breakdown */}
      <div className="space-y-2 mb-4">
        <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
          Active Scoring Signals ({reasons.length})
        </span>
        {reasons.length === 0 ? (
          <p className="text-xs text-slate-500 italic">Standard baseline operational priority.</p>
        ) : (
          <div className="space-y-1.5">
            {reasons.map((r, i) => (
              <div
                key={i}
                className="flex items-start justify-between gap-2 p-2 rounded-md bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-xs"
              >
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                  <span className="text-slate-800 dark:text-slate-200">{r.description}</span>
                </div>
                <span className="font-mono font-bold text-blue-700 dark:text-blue-300 bg-blue-100/60 dark:bg-blue-900/60 px-1.5 py-0.5 rounded text-[11px] shrink-0">
                  +{r.points}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Advisory Guarantee Notice */}
      <div className="flex items-start gap-2 p-2.5 rounded-lg bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/50 text-[11px] text-blue-800 dark:text-blue-300">
        <Info className="w-4 h-4 shrink-0 text-blue-600 dark:text-blue-400 mt-0.5" />
        <span>
          <strong>Advisory Notice:</strong> Priority calculations determine review queue ranking only. Completing or prioritizing tasks does not automatically approve or modify underlying FDR status.
        </span>
      </div>
    </div>
  );
};
