import React from 'react';
import { Users, AlertCircle, Clock, CheckCircle2, Shield } from 'lucide-react';
import { OfficerWorkloadSummary as WorkloadSummaryType } from '../../types';

interface WorkloadSummaryProps {
  summary: WorkloadSummaryType;
  onOfficerSelect?: (officerId: string) => void;
  className?: string;
}

export const WorkloadSummary: React.FC<WorkloadSummaryProps> = ({
  summary,
  onOfficerSelect,
  className = '',
}) => {
  return (
    <div className={`space-y-4 ${className}`}>
      {/* Top Banner Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 flex items-center justify-center text-blue-600">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-bold text-slate-900 dark:text-white font-mono">
              {summary.total_assigned}
            </div>
            <div className="text-xs text-slate-500 font-medium">Active Assigned Tasks</div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 flex items-center justify-center text-amber-600">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-bold text-slate-900 dark:text-white font-mono">
              {summary.total_unassigned}
            </div>
            <div className="text-xs text-slate-500 font-medium">Unassigned in Queue</div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-emerald-600">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-bold text-slate-900 dark:text-white font-mono">
              {summary.officers.reduce((acc, o) => acc + o.completed_tasks, 0)}
            </div>
            <div className="text-xs text-slate-500 font-medium">Completed This Period</div>
          </div>
        </div>
      </div>

      {/* Officers Workload Table/Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {summary.officers.map((officer) => (
          <div
            key={officer.officer_id}
            onClick={() => onOfficerSelect && onOfficerSelect(officer.officer_id)}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm hover:border-blue-300 dark:hover:border-blue-700 transition-all cursor-pointer"
          >
            <div className="flex items-start justify-between gap-2 mb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 flex items-center justify-center font-bold text-sm">
                  {officer.officer_name.charAt(0)}
                </div>
                <div>
                  <h5 className="text-sm font-semibold text-slate-900 dark:text-white leading-tight">
                    {officer.officer_name}
                  </h5>
                  <p className="text-[11px] text-slate-500 uppercase font-mono tracking-wider mt-0.5">
                    {officer.officer_role.replace(/_/g, ' ')}
                  </p>
                </div>
              </div>
              <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                {officer.assigned_tasks} Active
              </span>
            </div>

            {/* Load Metrics */}
            <div className="grid grid-cols-3 gap-2 text-center text-xs pt-2 border-t border-slate-100 dark:border-slate-800">
              <div className="p-2 rounded bg-slate-50 dark:bg-slate-800/40">
                <div className="text-slate-500 text-[10px] uppercase font-semibold">Critical</div>
                <div className={`font-mono font-bold mt-0.5 ${officer.critical_tasks > 0 ? 'text-rose-600' : 'text-slate-700 dark:text-slate-300'}`}>
                  {officer.critical_tasks}
                </div>
              </div>
              <div className="p-2 rounded bg-slate-50 dark:bg-slate-800/40">
                <div className="text-slate-500 text-[10px] uppercase font-semibold">Overdue</div>
                <div className={`font-mono font-bold mt-0.5 ${officer.overdue_tasks > 0 ? 'text-amber-600' : 'text-slate-700 dark:text-slate-300'}`}>
                  {officer.overdue_tasks}
                </div>
              </div>
              <div className="p-2 rounded bg-slate-50 dark:bg-slate-800/40">
                <div className="text-slate-500 text-[10px] uppercase font-semibold">Completed</div>
                <div className="font-mono font-bold text-emerald-600 mt-0.5">
                  {officer.completed_tasks}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
