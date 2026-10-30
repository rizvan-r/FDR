import React from 'react';
import { History, UserCheck, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';
import { TaskAssignment, TaskEscalation } from '../../types';

interface TaskHistoryTimelineProps {
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  assignments?: TaskAssignment[];
  escalations?: TaskEscalation[];
  className?: string;
}

export const TaskHistoryTimeline: React.FC<TaskHistoryTimelineProps> = ({
  createdAt,
  startedAt,
  completedAt,
  assignments = [],
  escalations = [],
  className = '',
}) => {
  interface TimelineEvent {
    id: string;
    time: string;
    title: string;
    description?: string;
    icon: React.ReactNode;
    color: string;
  }

  const events: TimelineEvent[] = [];

  events.push({
    id: 'created',
    time: createdAt,
    title: 'Task Generated & Enqueued',
    description: 'Auto-synchronized from source event and prioritized.',
    icon: <Clock className="w-3.5 h-3.5 text-blue-600" />,
    color: 'border-blue-500 bg-blue-50 dark:bg-blue-950/50',
  });

  assignments.forEach((a) => {
    events.push({
      id: a.id,
      time: a.assigned_at,
      title: `Assigned to ${a.assigned_to_name || 'Officer'}`,
      description: a.assignment_note ? `Note: ${a.assignment_note}` : undefined,
      icon: <UserCheck className="w-3.5 h-3.5 text-emerald-600" />,
      color: 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/50',
    });
  });

  if (startedAt) {
    events.push({
      id: 'started',
      time: startedAt,
      title: 'Review Commenced',
      description: 'Officer marked task in-progress.',
      icon: <Clock className="w-3.5 h-3.5 text-amber-600" />,
      color: 'border-amber-500 bg-amber-50 dark:bg-amber-950/50',
    });
  }

  escalations.forEach((e) => {
    events.push({
      id: e.id,
      time: e.escalated_at,
      title: `Escalated to Level ${e.escalation_level} (${e.escalated_to_name || e.escalated_to_role || 'Supervisor'})`,
      description: `Reason: ${e.reason}`,
      icon: <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />,
      color: 'border-rose-500 bg-rose-50 dark:bg-rose-950/50',
    });
  });

  if (completedAt) {
    events.push({
      id: 'completed',
      time: completedAt,
      title: 'Task Completed & Audited',
      description: 'Supervisory review closed with documented notes.',
      icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />,
      color: 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/50',
    });
  }

  // Sort descending by time
  events.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

  return (
    <div className={`bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm ${className}`}>
      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
        <History className="w-4 h-4 text-blue-600" />
        <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
          Lifecycle Audit Trail
        </h4>
      </div>

      <div className="relative border-l-2 border-slate-200 dark:border-slate-700 ml-3.5 space-y-4 my-2">
        {events.map((ev) => (
          <div key={ev.id} className="relative pl-6">
            {/* Timeline Node */}
            <div
              className={`absolute -left-[9px] top-0.5 w-4 h-4 rounded-full border-2 ${ev.color} flex items-center justify-center`}
            />

            <div className="text-xs font-semibold text-slate-900 dark:text-white">
              {ev.title}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              {new Date(ev.time).toLocaleString([], {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </div>
            {ev.description && (
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 bg-slate-50 dark:bg-slate-800/40 p-2 rounded border border-slate-100 dark:border-slate-800">
                {ev.description}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
