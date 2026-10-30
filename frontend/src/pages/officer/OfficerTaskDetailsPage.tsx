import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Play,
  Pause,
  CheckCircle2,
  XCircle,
  UserCheck,
  Building,
  Landmark,
  Shield,
  FileText,
  ExternalLink,
} from 'lucide-react';
import { OfficerTask } from '../../types';
import {
  fetchOfficerTaskById,
  startOfficerTask,
  waitOfficerTask,
  completeOfficerTask,
  assignOfficerTask,
  addOfficerTaskComment,
  escalateOfficerTask,
  acknowledgeTaskEscalation,
  resolveTaskEscalation,
} from '../../lib/api';
import { PriorityBadge } from '../../components/officer/PriorityBadge';
import { TaskStatusBadge } from '../../components/officer/TaskStatusBadge';
import { PriorityReasonPanel } from '../../components/officer/PriorityReasonPanel';
import { TaskCommentPanel } from '../../components/officer/TaskCommentPanel';
import { TaskHistoryTimeline } from '../../components/officer/TaskHistoryTimeline';
import { EscalationCard } from '../../components/officer/EscalationCard';
import { TaskAssignmentDialog } from '../../components/officer/TaskAssignmentDialog';

export const OfficerTaskDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [task, setTask] = useState<OfficerTask | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState<boolean>(false);
  const [isWaitModalOpen, setIsWaitModalOpen] = useState<boolean>(false);
  const [waitReason, setWaitReason] = useState<string>('');
  const [isCompleteModalOpen, setIsCompleteModalOpen] = useState<boolean>(false);
  const [completionNote, setCompletionNote] = useState<string>('');
  const [isActionLoading, setIsActionLoading] = useState<boolean>(false);

  useEffect(() => {
    if (id) loadTask(id);
  }, [id]);

  const loadTask = async (taskId: string) => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await fetchOfficerTaskById(taskId);
      setTask(data);
    } catch (err: any) {
      setError(err?.message || 'Unable to load task details.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStart = async () => {
    if (!task) return;
    try {
      setIsActionLoading(true);
      const updated = await startOfficerTask(task.id);
      setTask(updated);
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleWait = async () => {
    if (!task || !waitReason.trim()) return;
    try {
      setIsActionLoading(true);
      const updated = await waitOfficerTask(task.id, waitReason);
      setTask(updated);
      setIsWaitModalOpen(false);
      setWaitReason('');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleComplete = async () => {
    if (!task || !completionNote.trim()) return;
    try {
      setIsActionLoading(true);
      const updated = await completeOfficerTask(task.id, completionNote);
      setTask(updated);
      setIsCompleteModalOpen(false);
      setCompletionNote('');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleAssign = async (taskId: string, assignedTo: string | null, note: string) => {
    const updated = await assignOfficerTask(taskId, assignedTo, note);
    setTask(updated);
  };

  const handleAddComment = async (text: string) => {
    if (!task) return;
    const newComment = await addOfficerTaskComment(task.id, text);
    setTask((prev) => prev ? { ...prev, comments: [newComment, ...(prev.comments || [])] } : null);
  };

  const handleEscalate = async (reason: string, targetRole?: string) => {
    if (!task) return;
    await escalateOfficerTask(task.id, { reason, target_role: targetRole });
    await loadTask(task.id);
  };

  const handleAcknowledgeEsc = async (escId: string) => {
    if (!task) return;
    await acknowledgeTaskEscalation(task.id, escId);
    await loadTask(task.id);
  };

  const handleResolveEsc = async (escId: string, resolution: string) => {
    if (!task) return;
    await resolveTaskEscalation(task.id, escId, resolution);
    await loadTask(task.id);
  };

  if (isLoading) {
    return (
      <div className="p-16 text-center">
        <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-3" />
        <p className="text-sm text-slate-500">Loading task record and audit history...</p>
      </div>
    );
  }

  if (error || !task) {
    return (
      <div className="p-10 max-w-lg mx-auto text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
        <XCircle className="w-10 h-10 text-rose-500 mx-auto mb-3" />
        <h3 className="text-base font-bold text-slate-900 dark:text-white">Unable to open task</h3>
        <p className="text-xs text-slate-500 mt-1">{error || 'Task does not exist or access is unauthorized.'}</p>
        <Link to="/officer/queue" className="mt-4 inline-block px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold">
          Return to Queue
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn pb-16">
      {/* Back Link & Breadcrumb */}
      <div className="flex items-center justify-between">
        <Link
          to="/officer/queue"
          className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 flex items-center gap-1.5 font-medium transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Priority Queue
        </Link>
        <span className="text-xs font-mono text-slate-400">Task ID: {task.id}</span>
      </div>

      {/* Task Header Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-5 mb-5">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <PriorityBadge level={task.priority_level} score={task.priority_score} />
              <TaskStatusBadge status={task.task_status} />
              {task.is_escalated && (
                <span className="text-xs bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 font-bold px-2 py-0.5 rounded border border-rose-300 dark:border-rose-800">
                  ESCALATED
                </span>
              )}
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
              {task.title}
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Source: <span className="font-mono font-semibold uppercase">{task.source_type}</span> • Reference:{' '}
              <span className="font-mono font-semibold">{task.fdr_number || task.source_id}</span>
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {task.task_status === 'open' && (
              <button
                onClick={handleStart}
                disabled={isActionLoading}
                className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors"
              >
                <Play className="w-3.5 h-3.5" />
                Start Review
              </button>
            )}

            {task.task_status === 'in_progress' && (
              <>
                <button
                  onClick={() => setIsWaitModalOpen(true)}
                  disabled={isActionLoading}
                  className="px-3.5 py-2 bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 hover:bg-purple-100 border border-purple-200 dark:border-purple-800 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <Pause className="w-3.5 h-3.5" />
                  Hold / Waiting
                </button>
                <button
                  onClick={() => setIsCompleteModalOpen(true)}
                  disabled={isActionLoading}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Complete Review
                </button>
              </>
            )}

            {task.task_status === 'waiting' && (
              <button
                onClick={handleStart}
                disabled={isActionLoading}
                className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors"
              >
                <Play className="w-3.5 h-3.5" />
                Resume Review
              </button>
            )}

            <button
              onClick={() => setIsAssignDialogOpen(true)}
              className="px-3.5 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors"
            >
              <UserCheck className="w-3.5 h-3.5" />
              {task.assigned_to ? 'Reassign' : 'Assign Officer'}
            </button>
          </div>
        </div>

        {/* Task Description */}
        {task.description && (
          <div className="bg-slate-50 dark:bg-slate-800/40 p-3.5 rounded-lg border border-slate-100 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
            {task.description}
          </div>
        )}
      </div>

      {/* Main Grid: Details + Audits */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Priority breakdown, Source metadata, Escalations, Comments */}
        <div className="lg:col-span-2 space-y-6">
          <PriorityReasonPanel
            score={task.priority_score}
            level={task.priority_level}
            reasons={task.priority_reasons}
            dueAt={task.due_at}
            isOverdue={task.is_overdue}
          />

          {/* Underlying FDR Record Link */}
          {task.fdr_id && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-3">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-600" />
                  <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                    Associated Fixed Deposit Receipt
                  </h4>
                </div>
                <Link
                  to={`/fdrs/${task.fdr_id}`}
                  className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 font-medium"
                >
                  View FDR Record
                  <ExternalLink className="w-3 h-3" />
                </Link>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase">FDR Number</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white">{task.fdr_number}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase">Institution</span>
                  <span className="font-medium text-slate-800 dark:text-slate-200">{task.institution_name || 'Associated Institution'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase">Bank & Branch</span>
                  <span className="font-medium text-slate-800 dark:text-slate-200">{task.bank_name || 'SBI'} • {task.region_name || 'Northern'}</span>
                </div>
              </div>
            </div>
          )}

          <EscalationCard
            taskId={task.id}
            escalations={task.escalations || []}
            onEscalate={handleEscalate}
            onAcknowledge={handleAcknowledgeEsc}
            onResolve={handleResolveEsc}
          />

          <TaskCommentPanel
            taskId={task.id}
            comments={task.comments || []}
            onAddComment={handleAddComment}
          />
        </div>

        {/* Right 1 Col: Audit Timeline & Assignment Meta */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100 dark:border-slate-800 pb-2">
              Assignment Standing
            </h4>
            <div className="text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500">Currently Assigned:</span>
                <span className="font-semibold text-slate-900 dark:text-white">{task.assigned_to_name || 'Unassigned (In Pool)'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Jurisdiction:</span>
                <span className="font-medium text-slate-800 dark:text-slate-200">{task.region_name || 'National Jurisdiction'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Created:</span>
                <span className="text-slate-700 dark:text-slate-300">{new Date(task.created_at).toLocaleDateString()}</span>
              </div>
            </div>
          </div>

          <TaskHistoryTimeline
            createdAt={task.created_at}
            startedAt={task.started_at}
            completedAt={task.completed_at}
            assignments={task.assignments}
            escalations={task.escalations}
          />
        </div>
      </div>

      {/* Assignment Modal */}
      <TaskAssignmentDialog
        task={task}
        isOpen={isAssignDialogOpen}
        onClose={() => setIsAssignDialogOpen(false)}
        onAssign={handleAssign}
      />

      {/* Wait / On-Hold Dialog */}
      {isWaitModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 max-w-md w-full shadow-xl">
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2">
              Place Task on Hold
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              State the blocker or external dependency causing this review to be paused.
            </p>
            <textarea
              rows={3}
              value={waitReason}
              onChange={(e) => setWaitReason(e.target.value)}
              placeholder="e.g., Awaiting formal certificate dispatch from SBI Zonal Hub..."
              className="w-full text-xs p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 mb-4"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setIsWaitModalOpen(false)}
                className="px-3 py-1.5 text-xs text-slate-500 hover:bg-slate-100 rounded"
              >
                Cancel
              </button>
              <button
                disabled={!waitReason.trim() || isActionLoading}
                onClick={handleWait}
                className="px-4 py-1.5 text-xs font-semibold bg-purple-600 hover:bg-purple-700 text-white rounded"
              >
                Confirm Hold
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Complete Task Dialog */}
      {isCompleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 max-w-md w-full shadow-xl">
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2">
              Complete Officer Task Review
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Enter official review findings and closure notes. Note: Completing this review task does not automatically release or modify statutory FDR pledges.
            </p>
            <textarea
              rows={4}
              value={completionNote}
              onChange={(e) => setCompletionNote(e.target.value)}
              placeholder="Document the resolution, bank correspondence, or audit clearance..."
              className="w-full text-xs p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 mb-4"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setIsCompleteModalOpen(false)}
                className="px-3 py-1.5 text-xs text-slate-500 hover:bg-slate-100 rounded"
              >
                Cancel
              </button>
              <button
                disabled={!completionNote.trim() || isActionLoading}
                onClick={handleComplete}
                className="px-4 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded"
              >
                Document & Complete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
