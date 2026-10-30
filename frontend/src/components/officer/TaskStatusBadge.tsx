import React from 'react';
import { Clock, Play, Pause, CheckCircle2, XCircle } from 'lucide-react';
import { TaskStatus } from '../../types';

interface TaskStatusBadgeProps {
  status: TaskStatus;
  className?: string;
}

export const TaskStatusBadge: React.FC<TaskStatusBadgeProps> = ({ status, className = '' }) => {
  const configs: Record<
    TaskStatus,
    { label: string; bg: string; text: string; border: string; icon: React.ReactNode }
  > = {
    open: {
      label: 'Open',
      bg: 'bg-blue-50 dark:bg-blue-950/40',
      text: 'text-blue-700 dark:text-blue-300',
      border: 'border-blue-300 dark:border-blue-800',
      icon: <Clock className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />,
    },
    in_progress: {
      label: 'In Progress',
      bg: 'bg-amber-50 dark:bg-amber-950/40',
      text: 'text-amber-700 dark:text-amber-300',
      border: 'border-amber-300 dark:border-amber-800',
      icon: <Play className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />,
    },
    waiting: {
      label: 'Waiting',
      bg: 'bg-purple-50 dark:bg-purple-950/40',
      text: 'text-purple-700 dark:text-purple-300',
      border: 'border-purple-300 dark:border-purple-800',
      icon: <Pause className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />,
    },
    completed: {
      label: 'Completed',
      bg: 'bg-emerald-50 dark:bg-emerald-950/40',
      text: 'text-emerald-700 dark:text-emerald-300',
      border: 'border-emerald-300 dark:border-emerald-800',
      icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />,
    },
    cancelled: {
      label: 'Cancelled',
      bg: 'bg-slate-100 dark:bg-slate-800',
      text: 'text-slate-600 dark:text-slate-400',
      border: 'border-slate-300 dark:border-slate-700',
      icon: <XCircle className="w-3.5 h-3.5 text-slate-500" />,
    },
  };

  const config = configs[status] || configs.open;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${config.bg} ${config.text} ${config.border} ${className}`}
    >
      {config.icon}
      <span>{config.label}</span>
    </span>
  );
};
