import React, { useState } from 'react';
import {
  Activity,
  AlertTriangle,
  Clock,
  WifiOff,
  HelpCircle,
  X,
  Calendar,
  CheckCircle2,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import { FDRHeartbeatStatus } from '../../types';

interface HeartbeatStatusBadgeProps {
  status: FDRHeartbeatStatus | string;
  size?: 'sm' | 'md' | 'lg';
  showDetailsOnClick?: boolean;
  lastHeartbeatAt?: string;
  nextHeartbeatAt?: string;
  failureCount?: number;
  fdrNumber?: string;
}

export const HeartbeatStatusBadge: React.FC<HeartbeatStatusBadgeProps> = ({
  status,
  size = 'md',
  showDetailsOnClick = true,
  lastHeartbeatAt,
  nextHeartbeatAt,
  failureCount = 0,
  fdrNumber,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const normalizedStatus = (status || 'not_started').toLowerCase() as FDRHeartbeatStatus;

  const statusConfig: Record<
    FDRHeartbeatStatus,
    {
      label: string;
      shortLabel: string;
      badgeClass: string;
      icon: React.ComponentType<{ className?: string }>;
      iconColor: string;
      dotColor: string;
      description: string;
      regulatoryAction: string;
    }
  > = {
    alive: {
      label: 'Alive (Verified)',
      shortLabel: 'Alive',
      badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100',
      icon: Activity,
      iconColor: 'text-emerald-700',
      dotColor: 'bg-emerald-500 animate-pulse',
      description: 'The depository bank has recently verified that this fixed deposit is active, in-custody, and free of unauthorized liens.',
      regulatoryAction: 'Nominal. Scheduled for routine cycle check per institutional policy.',
    },
    stale: {
      label: 'Stale (Overdue)',
      shortLabel: 'Stale',
      badgeClass: 'bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100',
      icon: Clock,
      iconColor: 'text-amber-700',
      dotColor: 'bg-amber-500',
      description: 'No verified bank response has been logged within the policy stale threshold. Re-attestation is past due.',
      regulatoryAction: 'Automated retry or manual verification request recommended.',
    },
    broken: {
      label: 'Broken (Flagged)',
      shortLabel: 'Broken',
      badgeClass: 'bg-rose-50 text-rose-900 border-rose-300 hover:bg-rose-100',
      icon: AlertTriangle,
      iconColor: 'text-rose-700',
      dotColor: 'bg-rose-600 animate-ping',
      description: 'The depository bank explicitly rejected verification or reported that the FDR was liquidated, lien was broken, or details mismatched.',
      regulatoryAction: 'CRITICAL REGULATORY ALERT: Cannot silently revert to alive without documented authorized review in Alert Desk.',
    },
    unresponsive: {
      label: 'Unresponsive',
      shortLabel: 'Unresponsive',
      badgeClass: 'bg-orange-50 text-orange-900 border-orange-300 hover:bg-orange-100',
      icon: WifiOff,
      iconColor: 'text-orange-700',
      dotColor: 'bg-orange-500',
      description: 'Verification requests have reached the maximum retry limit without confirmation from the bank nodal officer.',
      regulatoryAction: 'Escalated to regulatory alert desk for bilateral branch follow-up.',
    },
    not_started: {
      label: 'Not Started',
      shortLabel: 'Not Started',
      badgeClass: 'bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100',
      icon: HelpCircle,
      iconColor: 'text-slate-500',
      dotColor: 'bg-slate-400',
      description: 'FDR is pending initial bank confirmation before periodic heartbeat verification begins.',
      regulatoryAction: 'Execute Tier 2 bank verification or initial check.',
    },
  };

  const config = statusConfig[normalizedStatus] || statusConfig.not_started;
  const Icon = config.icon;

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5 font-medium',
    lg: 'text-sm px-3.5 py-1.5 gap-2 font-medium',
  }[size];

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-3.5 h-3.5',
    lg: 'w-4 h-4',
  }[size];

  const formatDate = (isoString?: string) => {
    if (!isoString) return 'Not available';
    try {
      return new Date(isoString).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  return (
    <>
      <button
        type="button"
        disabled={!showDetailsOnClick}
        onClick={(e) => {
          if (showDetailsOnClick) {
            e.stopPropagation();
            setIsModalOpen(true);
          }
        }}
        className={`inline-flex items-center rounded-full border transition-all ${
          config.badgeClass
        } ${sizeClasses} ${
          showDetailsOnClick ? 'cursor-pointer hover:shadow-xs' : 'cursor-default'
        }`}
        title={`Heartbeat: ${config.label}`}
      >
        <span className={`w-2 h-2 rounded-full shrink-0 ${config.dotColor}`} />
        <Icon className={`${iconSizes} ${config.iconColor}`} />
        <span>{size === 'sm' ? config.shortLabel : config.label}</span>
      </button>

      {/* Heartbeat Status Modal */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs"
          onClick={() => setIsModalOpen(false)}
        >
          <div
            className="bg-white rounded-xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden text-left animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-[#12345A] text-white p-5 flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-white/10 rounded-lg">
                  <Activity className="w-6 h-6 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-base font-semibold leading-tight">
                    FDR Heartbeat Verification Status
                  </h3>
                  <p className="text-xs text-white/75 mt-0.5">
                    {fdrNumber ? `FDR: ${fdrNumber}` : 'Periodic Liveness & Integrity Audit'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-white/80 hover:text-white p-1 hover:bg-white/10 rounded-md transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-5">
              {/* Status Header Block */}
              <div
                className={`p-4 rounded-lg border flex items-start gap-3.5 ${
                  normalizedStatus === 'alive'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                    : normalizedStatus === 'broken'
                    ? 'bg-rose-50 border-rose-200 text-rose-950'
                    : normalizedStatus === 'unresponsive'
                    ? 'bg-orange-50 border-orange-200 text-orange-950'
                    : normalizedStatus === 'stale'
                    ? 'bg-amber-50 border-amber-200 text-amber-950'
                    : 'bg-slate-50 border-slate-200 text-slate-900'
                }`}
              >
                <Icon className={`w-6 h-6 shrink-0 mt-0.5 ${config.iconColor}`} />
                <div>
                  <div className="font-semibold text-sm flex items-center gap-2">
                    <span>{config.label}</span>
                    <span className={`w-2 h-2 rounded-full ${config.dotColor}`} />
                  </div>
                  <p className="text-xs mt-1 leading-relaxed">{config.description}</p>
                </div>
              </div>

              {/* Timestamp Grid */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="flex items-center gap-1.5 text-slate-500 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Last Confirmed Check</span>
                  </div>
                  <div className="mt-1 font-semibold text-slate-800">
                    {formatDate(lastHeartbeatAt)}
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="flex items-center gap-1.5 text-slate-500 font-medium">
                    <Calendar className="w-3.5 h-3.5 text-blue-600" />
                    <span>Next Scheduled Check</span>
                  </div>
                  <div className="mt-1 font-semibold text-slate-800">
                    {formatDate(nextHeartbeatAt)}
                  </div>
                </div>
              </div>

              {/* Failure Counter */}
              {failureCount > 0 && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs flex items-center justify-between">
                  <span className="text-amber-800 font-medium">Consecutive Check Failures:</span>
                  <span className="px-2 py-0.5 bg-amber-200 text-amber-900 font-bold rounded">
                    {failureCount} attempt{failureCount > 1 ? 's' : ''}
                  </span>
                </div>
              )}

              {/* Regulatory Directive */}
              <div className="p-3.5 bg-blue-50/60 border border-blue-200/80 rounded-lg text-xs">
                <div className="font-semibold text-blue-900 flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-blue-700" />
                  <span>Regulatory Directive</span>
                </div>
                <p className="text-blue-800 mt-1 leading-relaxed">
                  {config.regulatoryAction}
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 bg-slate-200 text-slate-700 hover:bg-slate-300 rounded-lg text-xs font-semibold transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
