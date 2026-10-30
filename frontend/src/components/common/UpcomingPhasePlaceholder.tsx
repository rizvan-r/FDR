import React from 'react';
import { Lock, Clock, ArrowRight, ShieldCheck } from 'lucide-react';

interface UpcomingPhaseProps {
  moduleName: string;
  phaseNumber: number;
  description: string;
  capabilities: string[];
}

export const UpcomingPhasePlaceholder: React.FC<UpcomingPhaseProps> = ({
  moduleName,
  phaseNumber,
  description,
  capabilities,
}) => {
  return (
    <div className="bg-white rounded-lg border border-gov-border shadow-gov p-6 text-left relative overflow-hidden">
      <div className="absolute top-0 right-0 w-24 h-24 bg-gov-light rounded-bl-full -mr-8 -mt-8 flex items-end justify-start p-4">
        <Lock className="w-5 h-5 text-gov-blue" />
      </div>

      <div className="flex items-center gap-2 mb-2">
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-semibold bg-blue-50 text-gov-blue border border-blue-200">
          <Clock className="w-3 h-3" />
          Scheduled for Phase {phaseNumber}
        </span>
        <span className="text-xs text-gov-muted">• Strict Phase 1 Boundary Enforced</span>
      </div>

      <h3 className="text-base font-bold text-gov-navy mt-1">{moduleName}</h3>
      <p className="text-xs text-gov-muted mt-1 leading-relaxed">{description}</p>

      <div className="mt-4 pt-4 border-t border-gov-border">
        <h4 className="text-xs font-semibold text-gov-text mb-2 flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-gov-success" />
          Planned Architecture & Capabilities:
        </h4>
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-gov-text">
          {capabilities.map((cap, i) => (
            <li key={i} className="flex items-start gap-1.5">
              <span className="text-gov-blue font-bold">›</span>
              <span>{cap}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-4 pt-3 flex items-center justify-between text-xs text-gov-muted bg-gov-bg p-3 rounded border border-dashed border-gov-border">
        <span>Status: Master-data database schemas and extension points ready</span>
        <span className="font-medium text-gov-navy flex items-center gap-1">
          Awaiting Phase {phaseNumber} Approval <ArrowRight className="w-3.5 h-3.5" />
        </span>
      </div>
    </div>
  );
};
