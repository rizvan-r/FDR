import React from 'react';
import { MigrationBatchStatus, MigrationRowValidationStatus } from '../../types';

interface MigrationStatusBadgeProps {
  status: MigrationBatchStatus | MigrationRowValidationStatus;
  size?: 'sm' | 'md';
}

export const MigrationStatusBadge: React.FC<MigrationStatusBadgeProps> = ({
  status,
  size = 'md',
}) => {
  const getBadgeStyle = (st: string) => {
    switch (st) {
      case 'uploaded':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'mapping':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'validating':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'review_required':
        return 'bg-orange-50 text-orange-700 border-orange-200';
      case 'ready':
        return 'bg-teal-50 text-teal-700 border-teal-200';
      case 'importing':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200 animate-pulse';
      case 'completed':
      case 'valid':
      case 'reviewed':
      case 'imported':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'invalid':
      case 'duplicate_exact':
      case 'failed':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'duplicate_fuzzy':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'excluded':
      case 'cancelled':
        return 'bg-gray-100 text-gray-600 border-gray-300';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  const formatStatus = (st: string) => {
    return st.replace(/_/g, ' ').toUpperCase();
  };

  const sizeClasses = size === 'sm' ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-xs';

  return (
    <span
      className={`inline-flex items-center font-semibold rounded-md border ${sizeClasses} ${getBadgeStyle(
        status
      )}`}
    >
      {formatStatus(status)}
    </span>
  );
};
