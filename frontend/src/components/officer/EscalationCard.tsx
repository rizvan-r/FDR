import React, { useState } from 'react';
import { AlertTriangle, CheckCircle, ShieldAlert, ArrowRight } from 'lucide-react';
import { TaskEscalation } from '../../types';

interface EscalationCardProps {
  taskId: string;
  escalations: TaskEscalation[];
  onEscalate: (reason: string, targetRole?: string) => Promise<void>;
  onAcknowledge: (escId: string) => Promise<void>;
  onResolve: (escId: string, resolutionNote: string) => Promise<void>;
  className?: string;
}

export const EscalationCard: React.FC<EscalationCardProps> = ({
  taskId,
  escalations,
  onEscalate,
  onAcknowledge,
  onResolve,
  className = '',
}) => {
  const [showEscalateForm, setShowEscalateForm] = useState(false);
  const [reason, setReason] = useState('');
  const [targetRole, setTargetRole] = useState('bureau_officer');
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [resolutionNote, setResolutionNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const activeEscalation = escalations.find((e) => !e.resolved_at);

  const handleEscalateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) return;
    try {
      setIsSubmitting(true);
      await onEscalate(reason, targetRole);
      setReason('');
      setShowEscalateForm(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResolveSubmit = async (escId: string) => {
    if (!resolutionNote.trim()) return;
    try {
      setIsSubmitting(true);
      await onResolve(escId, resolutionNote);
      setResolvingId(null);
      setResolutionNote('');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={`bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm ${className}`}>
      <div className="flex items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-rose-600" />
          <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
            Supervisory Escalation Pipeline
          </h4>
        </div>
        {!activeEscalation && !showEscalateForm && (
          <button
            onClick={() => setShowEscalateForm(true)}
            className="px-2.5 py-1 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-lg transition-colors flex items-center gap-1"
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            Escalate Task
          </button>
        )}
      </div>

      {/* Active Escalation Notice */}
      {activeEscalation ? (
        <div className="p-4 bg-rose-50/80 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-lg text-xs space-y-3">
          <div className="flex items-center justify-between gap-2">
            <span className="font-bold text-rose-800 dark:text-rose-200 uppercase tracking-wider flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-rose-600" />
              Level {activeEscalation.escalation_level} Active Escalation
            </span>
            <span className="text-[11px] text-rose-600 dark:text-rose-400">
              {new Date(activeEscalation.escalated_at).toLocaleString()}
            </span>
          </div>

          <div className="flex items-center gap-2 text-rose-900 dark:text-rose-100 font-medium">
            <span>{activeEscalation.escalated_from_name || 'Reporting Officer'}</span>
            <ArrowRight className="w-3.5 h-3.5 text-rose-400" />
            <span>
              {activeEscalation.escalated_to_name || activeEscalation.escalated_to_role || 'Supervisor'}
            </span>
          </div>

          <p className="p-2.5 bg-white/80 dark:bg-black/30 rounded border border-rose-200/60 dark:border-rose-900/40 text-slate-800 dark:text-slate-200">
            <strong>Reason:</strong> {activeEscalation.reason}
          </p>

          <div className="flex items-center justify-between pt-2">
            {activeEscalation.acknowledged_at ? (
              <span className="text-[11px] text-emerald-700 dark:text-emerald-300 font-medium flex items-center gap-1">
                <CheckCircle className="w-3.5 h-3.5" />
                Acknowledged by supervisor
              </span>
            ) : (
              <button
                disabled={isSubmitting}
                onClick={() => onAcknowledge(activeEscalation.id)}
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded text-xs font-semibold"
              >
                Acknowledge Escalation
              </button>
            )}

            {resolvingId === activeEscalation.id ? (
              <div className="w-full mt-2 space-y-2">
                <input
                  type="text"
                  value={resolutionNote}
                  onChange={(e) => setResolutionNote(e.target.value)}
                  placeholder="Document resolution note / action taken..."
                  className="w-full text-xs p-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
                <div className="flex gap-2 justify-end">
                  <button
                    onClick={() => setResolvingId(null)}
                    className="px-2 py-1 text-xs text-slate-500 hover:bg-slate-100 rounded"
                  >
                    Cancel
                  </button>
                  <button
                    disabled={isSubmitting || !resolutionNote.trim()}
                    onClick={() => handleResolveSubmit(activeEscalation.id)}
                    className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-semibold"
                  >
                    Confirm Resolution
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setResolvingId(activeEscalation.id)}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-semibold"
              >
                Resolve Escalation
              </button>
            )}
          </div>
        </div>
      ) : showEscalateForm ? (
        <form onSubmit={handleEscalateSubmit} className="space-y-3 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-lg border border-slate-100 dark:border-slate-800 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Escalate To Role
            </label>
            <select
              value={targetRole}
              onChange={(e) => setTargetRole(e.target.value)}
              className="w-full text-xs p-2 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
            >
              <option value="bureau_officer">Bureau Chief (Regulation)</option>
              <option value="regional_officer">Regional Officer (Jurisdiction)</option>
              <option value="system_admin">System Administrator</option>
            </select>
          </div>
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Escalation Justification
            </label>
            <textarea
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Explain the critical condition, overdue threshold, or non-compliance requiring supervisory intervention..."
              className="w-full text-xs p-2 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowEscalateForm(false)}
              className="px-3 py-1 text-slate-500 hover:bg-slate-100 rounded"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !reason.trim()}
              className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded"
            >
              Submit Escalation
            </button>
          </div>
        </form>
      ) : (
        <p className="text-xs text-slate-500 italic py-2">
          No active escalations. Task is within normal officer review cadence.
        </p>
      )}
    </div>
  );
};
