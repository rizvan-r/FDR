import React from 'react';
import { ReleaseRequestStatus, BankReleaseStatus, RefundStatus, ChecklistItemStatus } from '../../types';
import { CheckCircle2, Clock, AlertTriangle, XCircle, ShieldCheck, ArrowRightCircle, FileText, Ban } from 'lucide-react';

interface ReleaseStatusBadgeProps {
  status: ReleaseRequestStatus | BankReleaseStatus | RefundStatus | ChecklistItemStatus;
  type?: 'request' | 'bank' | 'refund' | 'checklist';
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const ReleaseStatusBadge: React.FC<ReleaseStatusBadgeProps> = ({
  status,
  type = 'request',
  className = '',
  size = 'md',
}) => {
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-xs',
    lg: 'px-3 py-1.5 text-sm font-semibold',
  }[size];

  // Request status mapping
  if (type === 'request') {
    switch (status as ReleaseRequestStatus) {
      case 'draft':
        return (
          <span className={`inline-flex items-center gap-1.5 rounded-full font-medium bg-slate-100 text-slate-700 border border-slate-300 ${sizeClasses} ${className}`}>
            <FileText className="w-3.5 h-3.5 text-slate-500" />
            Draft
          </span>
        );
      case 'submitted':
      case 'preliminary_review':
        return (
          <span className={`inline-flex items-center gap-1.5 rounded-full font-medium bg-blue-50 text-blue-800 border border-blue-200 ${sizeClasses} ${className}`}>
            <Clock className="w-3.5 h-3.5 text-blue-600 animate-pulse" />
            Preliminary Review
          </span>
        );
      case 'eligibility_review':
        return (
          <span className={`inline-flex items-center gap-1.5 rounded-full font-medium bg-indigo-50 text-indigo-800 border border-indigo-200 ${sizeClasses} ${className}`}>
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
            Eligibility Audit
          </span>
        );
      case 'finance_review':
        return (
          <span className={`inline-flex items-center gap-1.5 rounded-full font-medium bg-purple-50 text-purple-800 border border-purple-200 ${sizeClasses} ${className}`}>
            <Clock className="w-3.5 h-3.5 text-purple-600" />
            Finance Review
          </span>
        );
      case 'authority_review':
        return (
          <span className={`inline-flex items-center gap-1.5 rounded-full font-medium bg-amber-50 text-amber-800 border border-amber-200 ${sizeClasses} ${className}`}>
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            Authority Sanction
          </span>
        );
      case 'returned_for_correction':
        return (
          <span className={`inline-flex items-center gap-1.5 rounded-full font-medium bg-orange-50 text-orange-800 border border-orange-200 ${sizeClasses} ${className}`}>
            <AlertTriangle className="w-3.5 h-3.5 text-orange-600" />
            Returned for Correction
          </span>
        );
      case 'approved':
        return (
          <span className={`inline-flex items-center gap-1.5 rounded-full font-medium bg-emerald-50 text-emerald-800 border border-emerald-200 ${sizeClasses} ${className}`}>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Sanction Approved
          </span>
        );
      case 'release_initiated':
        return (
          <span className={`inline-flex items-center gap-1.5 rounded-full font-medium bg-cyan-50 text-cyan-800 border border-cyan-200 ${sizeClasses} ${className}`}>
            <ArrowRightCircle className="w-3.5 h-3.5 text-cyan-600 animate-pulse" />
            Release Dispatched
          </span>
        );
      case 'bank_confirmed':
        return (
          <span className={`inline-flex items-center gap-1.5 rounded-full font-medium bg-teal-50 text-teal-800 border border-teal-200 ${sizeClasses} ${className}`}>
            <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
            Bank Confirmed
          </span>
        );
      case 'closed':
        return (
          <span className={`inline-flex items-center gap-1.5 rounded-full font-medium bg-green-100 text-green-900 border border-green-300 ${sizeClasses} ${className}`}>
            <CheckCircle2 className="w-3.5 h-3.5 text-green-700" />
            Closed & Discharged
          </span>
        );
      case 'rejected':
        return (
          <span className={`inline-flex items-center gap-1.5 rounded-full font-medium bg-rose-50 text-rose-800 border border-rose-200 ${sizeClasses} ${className}`}>
            <XCircle className="w-3.5 h-3.5 text-rose-600" />
            Rejected
          </span>
        );
      case 'cancelled':
        return (
          <span className={`inline-flex items-center gap-1.5 rounded-full font-medium bg-slate-100 text-slate-600 border border-slate-300 ${sizeClasses} ${className}`}>
            <Ban className="w-3.5 h-3.5 text-slate-500" />
            Cancelled
          </span>
        );
      default:
        return (
          <span className={`inline-flex items-center gap-1.5 rounded-full font-medium bg-slate-100 text-slate-700 border border-slate-200 ${sizeClasses} ${className}`}>
            {status}
          </span>
        );
    }
  }

  // Bank release status mapping
  if (type === 'bank') {
    switch (status as BankReleaseStatus) {
      case 'not_started':
        return (
          <span className={`inline-flex items-center gap-1.5 rounded-full font-medium bg-slate-100 text-slate-600 border border-slate-200 ${sizeClasses} ${className}`}>
            Not Started
          </span>
        );
      case 'instruction_prepared':
        return (
          <span className={`inline-flex items-center gap-1.5 rounded-full font-medium bg-amber-50 text-amber-800 border border-amber-200 ${sizeClasses} ${className}`}>
            Instruction Prepared
          </span>
        );
      case 'awaiting_bank':
        return (
          <span className={`inline-flex items-center gap-1.5 rounded-full font-medium bg-blue-50 text-blue-800 border border-blue-200 ${sizeClasses} ${className}`}>
            Awaiting Bank
          </span>
        );
      case 'released':
        return (
          <span className={`inline-flex items-center gap-1.5 rounded-full font-medium bg-emerald-50 text-emerald-800 border border-emerald-200 ${sizeClasses} ${className}`}>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Lien Released
          </span>
        );
      case 'release_rejected':
        return (
          <span className={`inline-flex items-center gap-1.5 rounded-full font-medium bg-rose-50 text-rose-800 border border-rose-200 ${sizeClasses} ${className}`}>
            <XCircle className="w-3.5 h-3.5 text-rose-600" />
            Bank Rejected
          </span>
        );
      case 'unconfirmed':
        return (
          <span className={`inline-flex items-center gap-1.5 rounded-full font-medium bg-orange-50 text-orange-800 border border-orange-200 ${sizeClasses} ${className}`}>
            Unconfirmed
          </span>
        );
      default:
        return <span className={`rounded-full bg-slate-100 text-slate-700 ${sizeClasses}`}>{status}</span>;
    }
  }

  // Refund status mapping
  if (type === 'refund') {
    switch (status as RefundStatus) {
      case 'not_applicable':
        return (
          <span className={`inline-flex items-center rounded-full font-medium bg-slate-100 text-slate-500 border border-slate-200 ${sizeClasses} ${className}`}>
            N/A
          </span>
        );
      case 'pending':
        return (
          <span className={`inline-flex items-center gap-1.5 rounded-full font-medium bg-amber-50 text-amber-800 border border-amber-200 ${sizeClasses} ${className}`}>
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            Refund Pending
          </span>
        );
      case 'partially_received':
        return (
          <span className={`inline-flex items-center gap-1.5 rounded-full font-medium bg-cyan-50 text-cyan-800 border border-cyan-200 ${sizeClasses} ${className}`}>
            Partially Received
          </span>
        );
      case 'received':
        return (
          <span className={`inline-flex items-center gap-1.5 rounded-full font-medium bg-teal-50 text-teal-800 border border-teal-200 ${sizeClasses} ${className}`}>
            Received (Unreconciled)
          </span>
        );
      case 'reconciliation_pending':
        return (
          <span className={`inline-flex items-center gap-1.5 rounded-full font-medium bg-purple-50 text-purple-800 border border-purple-200 ${sizeClasses} ${className}`}>
            Reconciliation Pending
          </span>
        );
      case 'reconciled':
        return (
          <span className={`inline-flex items-center gap-1.5 rounded-full font-medium bg-emerald-50 text-emerald-800 border border-emerald-200 ${sizeClasses} ${className}`}>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Reconciled
          </span>
        );
      case 'disputed':
        return (
          <span className={`inline-flex items-center gap-1.5 rounded-full font-medium bg-rose-50 text-rose-800 border border-rose-200 ${sizeClasses} ${className}`}>
            <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
            Disputed
          </span>
        );
      default:
        return <span className={`rounded-full bg-slate-100 text-slate-700 ${sizeClasses}`}>{status}</span>;
    }
  }

  // Checklist status mapping
  switch (status as ChecklistItemStatus) {
    case 'satisfied':
      return (
        <span className={`inline-flex items-center gap-1 rounded-full font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 ${sizeClasses} ${className}`}>
          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
          Satisfied
        </span>
      );
    case 'not_satisfied':
      return (
        <span className={`inline-flex items-center gap-1 rounded-full font-medium bg-rose-50 text-rose-700 border border-rose-200 ${sizeClasses} ${className}`}>
          <XCircle className="w-3 h-3 text-rose-600" />
          Not Satisfied
        </span>
      );
    case 'needs_clarification':
      return (
        <span className={`inline-flex items-center gap-1 rounded-full font-medium bg-amber-50 text-amber-700 border border-amber-200 ${sizeClasses} ${className}`}>
          <AlertTriangle className="w-3 h-3 text-amber-600" />
          Needs Clarification
        </span>
      );
    case 'not_applicable':
      return (
        <span className={`inline-flex items-center rounded-full font-medium bg-slate-100 text-slate-500 border border-slate-200 ${sizeClasses} ${className}`}>
          N/A
        </span>
      );
    default:
      return (
        <span className={`inline-flex items-center gap-1 rounded-full font-medium bg-slate-100 text-slate-600 border border-slate-200 ${sizeClasses} ${className}`}>
          <Clock className="w-3 h-3 text-slate-400" />
          Pending
        </span>
      );
  }
};
