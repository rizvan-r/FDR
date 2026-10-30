import React from 'react';
import { AlertCircle, AlertTriangle, ArrowUpRight, Minus } from 'lucide-react';
import { TaskPriorityLevel } from '../../types';

interface PriorityBadgeProps {
  level: TaskPriorityLevel;
  score?: number;
  showIcon?: boolean;
  className?: string;
}

export const PriorityBadge: React.FC<PriorityBadgeProps> = ({
  level,
  score,
  showIcon = true,
  className = '',
}) => {
  const configs: Record<
    TaskPriorityLevel,
    { label: string; bg: string; text: string; border: string; icon: React.ReactNode }
  > = {
    critical: {
      label: 'Critical',
      bg: 'bg-rose-50 dark:bg-rose-950/40',
      text: 'text-rose-700 dark:text-rose-300',
      border: 'border-rose-300 dark:border-rose-800',
      icon: <AlertCircle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />,
    },
    high: {
      label: 'High',
      bg: 'bg-orange-50 dark:bg-orange-950/40',
      text: 'text-orange-700 dark:text-orange-300',
      border: 'border-orange-300 dark:border-orange-800',
      icon: <AlertTriangle className="w-3.5 h-3.5 text-orange-600 dark:text-orange-400" />,
    },
    medium: {
      label: 'Medium',
      bg: 'bg-amber-50 dark:bg-amber-950/40',
      text: 'text-amber-700 dark:text-amber-300',
      border: 'border-amber-300 dark:border-amber-800',
      icon: <ArrowUpRight className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />,
    },
    low: {
      label: 'Low',
      bg: 'bg-slate-50 dark:bg-slate-900',
      text: 'text-slate-700 dark:text-slate-300',
      border: 'border-slate-300 dark:border-slate-700',
      icon: <Minus className="w-3.5 h-3.5 text-slate-500" />,
    },
  };

  const config = configs[level] || configs.low;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${config.bg} ${config.text} ${config.border} ${className}`}
    >
      {showIcon && config.icon}
      <span>{config.label}</span>
      {score !== undefined && (
        <span className="ml-0.5 px-1.5 py-0.2 bg-white/70 dark:bg-black/30 rounded text-[10px] font-mono font-bold">
          {score}
        </span>
      )}
    </span>
  );
};
