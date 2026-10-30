import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, User, AlertCircle, Clock } from 'lucide-react';
import { OfficerTask } from '../../types';
import { PriorityBadge } from './PriorityBadge';
import { TaskStatusBadge } from './TaskStatusBadge';

interface OfficerTaskTableProps {
  tasks: OfficerTask[];
  isLoading?: boolean;
  onAssignClick?: (task: OfficerTask) => void;
  className?: string;
}

export const OfficerTaskTable: React.FC<OfficerTaskTableProps> = ({
  tasks,
  isLoading = false,
  onAssignClick,
  className = '',
}) => {
  const formatTaskType = (type: string) => {
    return type
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());
  };

  const formatDeadline = (iso?: string) => {
    if (!iso) return '-';
    const d = new Date(iso);
    const now = new Date();
    const diffHours = Math.round((d.getTime() - now.getTime()) / (1000 * 3600));

    if (diffHours < 0) {
      return (
        <span className="text-rose-600 font-semibold flex items-center gap-1">
          <AlertCircle className="w-3.5 h-3.5" />
          {Math.abs(diffHours)}h overdue
        </span>
      );
    } else if (diffHours <= 24) {
      return (
        <span className="text-amber-600 font-medium flex items-center gap-1">
          <Clock className="w-3.5 h-3.5" />
          {diffHours}h left
        </span>
      );
    }
    const days = Math.round(diffHours / 24);
    return `${days}d left`;
  };

  if (isLoading) {
    return (
      <div className="p-8 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
        <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-3" />
        <p className="text-sm text-slate-500">Loading priority task queue...</p>
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="p-10 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
        <CheckCircleIcon className="w-12 h-12 text-slate-400 mx-auto mb-3" />
        <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">No active tasks</h4>
        <p className="text-xs text-slate-500 mt-1">
          All review items within your scope have been processed.
        </p>
      </div>
    );
  }

  return (
    <div className={`overflow-x-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm ${className}`}>
      <table className="w-full text-left text-sm">
        <thead className="bg-slate-50 dark:bg-slate-800/60 text-xs font-semibold uppercase text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
          <tr>
            <th className="px-4 py-3">Priority</th>
            <th className="px-4 py-3">Task Title & Reference</th>
            <th className="px-4 py-3">Institution & Bank</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">SLA Deadline</th>
            <th className="px-4 py-3">Assigned To</th>
            <th className="px-4 py-3 text-right">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
          {tasks.map((task) => (
            <tr
              key={task.id}
              className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors ${
                task.priority_level === 'critical' ? 'bg-rose-50/20 dark:bg-rose-950/10' : ''
              }`}
            >
              <td className="px-4 py-3.5 whitespace-nowrap">
                <PriorityBadge level={task.priority_level} score={task.priority_score} />
              </td>
              <td className="px-4 py-3.5">
                <div className="font-semibold text-slate-900 dark:text-white leading-tight">
                  {task.title}
                </div>
                <div className="text-xs text-slate-500 mt-1 flex items-center gap-2">
                  <span className="font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-[11px]">
                    {task.fdr_number || formatTaskType(task.task_type)}
                  </span>
                  <span>•</span>
                  <span>{formatTaskType(task.task_type)}</span>
                  {task.is_escalated && (
                    <span className="text-[10px] bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 font-bold px-1.5 py-0.2 rounded border border-rose-300">
                      ESCALATED
                    </span>
                  )}
                </div>
              </td>
              <td className="px-4 py-3.5 whitespace-nowrap">
                <div className="text-xs font-medium text-slate-800 dark:text-slate-200">
                  {task.institution_name || 'All Institutions'}
                </div>
                <div className="text-[11px] text-slate-500">
                  {task.bank_name || 'State Bank of India'} • {task.region_name || 'Northern Region'}
                </div>
              </td>
              <td className="px-4 py-3.5 whitespace-nowrap">
                <TaskStatusBadge status={task.task_status} />
              </td>
              <td className="px-4 py-3.5 whitespace-nowrap text-xs">
                {formatDeadline(task.due_at)}
              </td>
              <td className="px-4 py-3.5 whitespace-nowrap">
                {task.assigned_to_name ? (
                  <div className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300">
                    <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 flex items-center justify-center font-bold text-[10px]">
                      {task.assigned_to_name.charAt(0)}
                    </div>
                    <span>{task.assigned_to_name}</span>
                  </div>
                ) : (
                  <button
                    onClick={() => onAssignClick && onAssignClick(task)}
                    className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                  >
                    <User className="w-3.5 h-3.5" />
                    Assign
                  </button>
                )}
              </td>
              <td className="px-4 py-3.5 text-right whitespace-nowrap">
                <Link
                  to={`/officer/tasks/${task.id}`}
                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/60 border border-blue-200 dark:border-blue-800 rounded-lg text-xs font-semibold transition-colors"
                >
                  Review
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const CheckCircleIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);
