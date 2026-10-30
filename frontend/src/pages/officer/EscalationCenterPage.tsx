import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ShieldAlert,
  CheckCircle2,
  Clock,
  Filter,
  Search,
  ArrowRight,
  RefreshCw,
  User,
  ExternalLink,
  MessageSquare,
  AlertOctagon,
  FileCheck,
} from 'lucide-react';
import {
  fetchOfficerTasks,
  acknowledgeTaskEscalation,
  resolveTaskEscalation,
} from '../../lib/api';
import { OfficerTask, TaskEscalation } from '../../types';
import { PriorityBadge } from '../../components/officer/PriorityBadge';
import { TaskStatusBadge } from '../../components/officer/TaskStatusBadge';
import { EscalationCard } from '../../components/officer/EscalationCard';

interface EscalationWithTask extends TaskEscalation {
  task: OfficerTask;
}

export const EscalationCenterPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tasks, setTasks] = useState<OfficerTask[]>([]);
  const [escalations, setEscalations] = useState<EscalationWithTask[]>([]);
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'acknowledged' | 'resolved'>('all');
  const [levelFilter, setLevelFilter] = useState<'all' | '1' | '2'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Resolution modal state
  const [resolvingEsc, setResolvingEsc] = useState<EscalationWithTask | null>(null);
  const [resolutionNote, setResolutionNote] = useState('');
  const [submittingResolution, setSubmittingResolution] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const loadData = async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    else setLoading(true);
    setActionError(null);

    try {
      const allTasks = await fetchOfficerTasks();
      setTasks(allTasks);

      // Collect all escalations from tasks that have escalations
      const gathered: EscalationWithTask[] = [];
      allTasks.forEach((t) => {
        if (t.escalations && t.escalations.length > 0) {
          t.escalations.forEach((esc) => {
            gathered.push({
              ...esc,
              task: t,
            });
          });
        }
      });

      // Sort by active first, then highest level, then date
      gathered.sort((a, b) => {
        const aActive = !a.resolved_at ? 1 : 0;
        const bActive = !b.resolved_at ? 1 : 0;
        if (aActive !== bActive) return bActive - aActive;
        if (a.escalation_level !== b.escalation_level) {
          return b.escalation_level - a.escalation_level;
        }
        return new Date(b.escalated_at).getTime() - new Date(a.escalated_at).getTime();
      });

      setEscalations(gathered);
    } catch (err: any) {
      setActionError(err.message || 'Failed to load escalated cases.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAcknowledge = async (esc: EscalationWithTask) => {
    try {
      await acknowledgeTaskEscalation(esc.task_id, esc.id);
      await loadData();
    } catch (err: any) {
      setActionError(err.message || 'Failed to acknowledge escalation.');
    }
  };

  const handleResolve = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolvingEsc || !resolutionNote.trim()) return;

    setSubmittingResolution(true);
    try {
      await resolveTaskEscalation(resolvingEsc.task_id, resolvingEsc.id, resolutionNote);
      setResolvingEsc(null);
      setResolutionNote('');
      await loadData();
    } catch (err: any) {
      setActionError(err.message || 'Failed to resolve escalation.');
    } finally {
      setSubmittingResolution(false);
    }
  };

  // Filter calculations
  const filteredEscalations = escalations.filter((item) => {
    // Status filter
    if (statusFilter === 'active' && item.resolved_at) return false;
    if (statusFilter === 'acknowledged' && (!item.acknowledged_at || item.resolved_at)) return false;
    if (statusFilter === 'resolved' && !item.resolved_at) return false;

    // Level filter
    if (levelFilter !== 'all' && item.escalation_level.toString() !== levelFilter) {
      return false;
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchReason = item.reason.toLowerCase().includes(q);
      const matchTaskTitle = item.task.title.toLowerCase().includes(q);
      const matchFdr = item.task.fdr_number?.toLowerCase().includes(q);
      const matchInst = item.task.institution_name?.toLowerCase().includes(q);
      const matchRecipient = item.escalated_to_name?.toLowerCase().includes(q);
      if (!matchReason && !matchTaskTitle && !matchFdr && !matchInst && !matchRecipient) {
        return false;
      }
    }

    return true;
  });

  // KPI stats
  const totalEscalations = escalations.length;
  const activeCount = escalations.filter((e) => !e.resolved_at).length;
  const unacknowledgedCount = escalations.filter((e) => !e.acknowledged_at && !e.resolved_at).length;
  const level2Count = escalations.filter((e) => e.escalation_level >= 2 && !e.resolved_at).length;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white border border-gov-border rounded-lg p-5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-rose-700 uppercase tracking-wider">
              <ShieldAlert className="w-4 h-4 text-rose-600" />
              <span>Phase 6 Supervisory Command</span>
            </div>
            <h1 className="text-2xl font-bold text-gov-navy mt-1">Escalation Command Center</h1>
            <p className="text-sm text-gov-muted mt-0.5">
              Supervisory monitoring, formal acknowledgements, and structured resolution of escalated operational bottlenecks.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => loadData(true)}
              disabled={refreshing || loading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-gov-border bg-white text-xs font-medium text-gov-navy hover:bg-slate-50 transition shadow-xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
            <Link
              to="/officer/queue"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-gov-navy text-white text-xs font-medium hover:bg-slate-800 transition shadow-xs"
            >
              <span>View Priority Queue</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-rose-200 rounded-lg p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gov-muted">Active Escalations</span>
            <AlertTriangle className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-2xl font-bold text-rose-700 mt-2">{activeCount}</div>
          <div className="text-[11px] text-gov-muted mt-1">Requiring supervisory attention</div>
        </div>

        <div className="bg-white border border-amber-200 rounded-lg p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gov-muted">Unacknowledged</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-bold text-amber-700 mt-2">{unacknowledgedCount}</div>
          <div className="text-[11px] text-gov-muted mt-1">Pending initial receipt review</div>
        </div>

        <div className="bg-white border border-purple-200 rounded-lg p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gov-muted">Level 2+ Super Escalations</span>
            <AlertOctagon className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-2xl font-bold text-purple-700 mt-2">{level2Count}</div>
          <div className="text-[11px] text-gov-muted mt-1">Escalated to Bureau Chief</div>
        </div>

        <div className="bg-white border border-emerald-200 rounded-lg p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gov-muted">Total History Tracked</span>
            <FileCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-gov-navy mt-2">{totalEscalations}</div>
          <div className="text-[11px] text-gov-muted mt-1">Across all task modules</div>
        </div>
      </div>

      {/* Action Error Banner */}
      {actionError && (
        <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center justify-between">
          <span className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{actionError}</span>
          </span>
          <button
            onClick={() => setActionError(null)}
            className="text-rose-600 hover:text-rose-900 font-bold"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Filters and Search Bar */}
      <div className="bg-white border border-gov-border rounded-lg p-4 shadow-xs flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search by reason, task title, FDR number, or institution..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 border border-slate-200 rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-gov-navy"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
          <div className="flex items-center gap-1 border border-slate-200 rounded-md p-0.5 bg-slate-50 text-xs shrink-0">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-2.5 py-1 rounded text-xs font-medium transition ${
                statusFilter === 'all'
                  ? 'bg-white text-gov-navy shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All ({escalations.length})
            </button>
            <button
              onClick={() => setStatusFilter('active')}
              className={`px-2.5 py-1 rounded text-xs font-medium transition ${
                statusFilter === 'active'
                  ? 'bg-rose-600 text-white shadow-xs font-bold'
                  : 'text-rose-700 hover:bg-rose-50'
              }`}
            >
              Active ({activeCount})
            </button>
            <button
              onClick={() => setStatusFilter('acknowledged')}
              className={`px-2.5 py-1 rounded text-xs font-medium transition ${
                statusFilter === 'acknowledged'
                  ? 'bg-amber-600 text-white shadow-xs font-bold'
                  : 'text-amber-700 hover:bg-amber-50'
              }`}
            >
              Acknowledged
            </button>
            <button
              onClick={() => setStatusFilter('resolved')}
              className={`px-2.5 py-1 rounded text-xs font-medium transition ${
                statusFilter === 'resolved'
                  ? 'bg-emerald-600 text-white shadow-xs font-bold'
                  : 'text-emerald-700 hover:bg-emerald-50'
              }`}
            >
              Resolved
            </button>
          </div>

          <select
            value={levelFilter}
            onChange={(e) => setLevelFilter(e.target.value as any)}
            className="border border-slate-200 rounded-md py-1.5 px-2.5 text-xs text-slate-700 bg-white focus:outline-none focus:ring-1 focus:ring-gov-navy shrink-0"
          >
            <option value="all">All Stages</option>
            <option value="1">Stage 1 (Supervisor)</option>
            <option value="2">Stage 2 (Bureau Head)</option>
          </select>
        </div>
      </div>

      {/* Escalations List */}
      {loading ? (
        <div className="bg-white border border-gov-border rounded-lg p-12 text-center shadow-xs">
          <RefreshCw className="w-8 h-8 text-gov-navy animate-spin mx-auto mb-3" />
          <p className="text-sm text-gov-muted">Loading escalation records...</p>
        </div>
      ) : filteredEscalations.length === 0 ? (
        <div className="bg-white border border-gov-border rounded-lg p-12 text-center shadow-xs">
          <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
          <h3 className="text-base font-semibold text-gov-navy">No Escalations Found</h3>
          <p className="text-xs text-gov-muted mt-1 max-w-md mx-auto">
            {searchQuery || statusFilter !== 'all' || levelFilter !== 'all'
              ? 'No escalations match your active search and filter criteria.'
              : 'There are currently no escalated cases recorded in the system.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredEscalations.map((esc) => {
            const isResolved = !!esc.resolved_at;
            const isAcknowledged = !!esc.acknowledged_at;

            return (
              <div
                key={esc.id}
                className={`bg-white border rounded-lg p-4 shadow-xs transition hover:shadow-sm ${
                  !isResolved
                    ? esc.escalation_level >= 2
                      ? 'border-purple-300 ring-1 ring-purple-100'
                      : 'border-rose-200 ring-1 ring-rose-50'
                    : 'border-gov-border'
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                  {/* Left Column: Severity, Title, Reason */}
                  <div className="space-y-2 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                          esc.escalation_level >= 2
                            ? 'bg-purple-50 text-purple-800 border-purple-200'
                            : 'bg-rose-50 text-rose-800 border-rose-200'
                        }`}
                      >
                        <ShieldAlert className="w-3 h-3" />
                        Stage {esc.escalation_level} Escalation
                      </span>

                      <PriorityBadge level={esc.task.priority_level} score={esc.task.priority_score} />
                      <TaskStatusBadge status={esc.task.task_status} />

                      {isResolved ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3" />
                          Resolved
                        </span>
                      ) : isAcknowledged ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                          <Clock className="w-3 h-3" />
                          Acknowledged
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-300 animate-pulse">
                          <AlertTriangle className="w-3 h-3" />
                          Awaiting Acknowledgement
                        </span>
                      )}
                    </div>

                    <div>
                      <Link
                        to={`/officer/tasks/${esc.task.id}`}
                        className="text-base font-bold text-gov-navy hover:text-blue-700 hover:underline flex items-center gap-1.5"
                      >
                        <span>{esc.task.title}</span>
                        <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                      </Link>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gov-muted mt-1">
                        {esc.task.fdr_number && (
                          <span>
                            FDR: <strong className="text-slate-700 font-mono">{esc.task.fdr_number}</strong>
                          </span>
                        )}
                        {esc.task.institution_name && (
                          <span>
                            Institution: <span className="text-slate-700">{esc.task.institution_name}</span>
                          </span>
                        )}
                        {esc.task.region_name && (
                          <span>
                            Region: <span className="text-slate-700">{esc.task.region_name}</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Reason box */}
                    <div className="p-3 rounded-md bg-slate-50 border border-slate-200 text-xs">
                      <div className="font-semibold text-slate-800 mb-0.5">Escalation Trigger:</div>
                      <div className="text-slate-700 whitespace-pre-wrap">{esc.reason}</div>
                    </div>

                    {/* Resolution details if resolved */}
                    {isResolved && esc.resolution_note && (
                      <div className="p-3 rounded-md bg-emerald-50/70 border border-emerald-200 text-xs">
                        <div className="font-semibold text-emerald-900 mb-0.5 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          Resolution Justification:
                        </div>
                        <div className="text-emerald-800">{esc.resolution_note}</div>
                        <div className="text-[10px] text-emerald-700 mt-1">
                          Resolved on {new Date(esc.resolved_at!).toLocaleString()}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Right Column: People, Timestamps & Actions */}
                  <div className="lg:w-72 shrink-0 flex flex-col justify-between border-t lg:border-t-0 lg:border-l lg:pl-4 pt-3 lg:pt-0 space-y-3">
                    <div className="space-y-1.5 text-xs">
                      <div>
                        <span className="text-gov-muted">Escalated By: </span>
                        <span className="font-medium text-slate-700">
                          {esc.escalated_from_name || 'System Supervisor'}
                        </span>
                      </div>
                      <div>
                        <span className="text-gov-muted">Designated To: </span>
                        <span className="font-medium text-slate-800">
                          {esc.escalated_to_name || esc.escalated_to_role || 'Supervisory Queue'}
                        </span>
                      </div>
                      <div>
                        <span className="text-gov-muted">Triggered At: </span>
                        <span className="font-mono text-slate-600">
                          {new Date(esc.escalated_at).toLocaleString()}
                        </span>
                      </div>
                      {esc.acknowledged_at && (
                        <div>
                          <span className="text-gov-muted">Acknowledged: </span>
                          <span className="font-mono text-slate-600">
                            {new Date(esc.acknowledged_at).toLocaleString()}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Supervisory Action Buttons */}
                    <div className="pt-2 flex flex-col gap-2">
                      {!isResolved && (
                        <>
                          {!isAcknowledged && (
                            <button
                              onClick={() => handleAcknowledge(esc)}
                              className="w-full py-1.5 px-3 rounded-md bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shadow-xs transition"
                            >
                              Acknowledge Receipt
                            </button>
                          )}
                          <button
                            onClick={() => {
                              setResolvingEsc(esc);
                              setResolutionNote('');
                            }}
                            className="w-full py-1.5 px-3 rounded-md bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold shadow-xs transition"
                          >
                            Resolve Escalation
                          </button>
                        </>
                      )}

                      <Link
                        to={`/officer/tasks/${esc.task.id}`}
                        className="w-full py-1.5 px-3 rounded-md border border-gov-border bg-slate-50 hover:bg-slate-100 text-gov-navy text-xs font-medium text-center transition shadow-xs"
                      >
                        Inspect Task Details
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Resolve Escalation Modal */}
      {resolvingEsc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-lg shadow-xl border border-gov-border max-w-lg w-full p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-gov-border pb-3">
              <h3 className="text-base font-bold text-gov-navy flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                Resolve Supervisory Escalation
              </h3>
              <button
                onClick={() => setResolvingEsc(null)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-gov-muted">
              Enter formal resolution findings for Stage {resolvingEsc.escalation_level} escalation on task{' '}
              <strong className="text-slate-700">{resolvingEsc.task.title}</strong>.
            </p>

            <form onSubmit={handleResolve} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gov-navy mb-1">
                  Resolution Justification Note <span className="text-rose-600">*</span>
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="Detail the remedial actions taken, verified documents, or supervisory approvals granted to close this escalation..."
                  value={resolutionNote}
                  onChange={(e) => setResolutionNote(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-emerald-600"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setResolvingEsc(null)}
                  disabled={submittingResolution}
                  className="px-4 py-2 border border-gov-border rounded-md text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingResolution || !resolutionNote.trim()}
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white rounded-md text-xs font-semibold shadow-xs"
                >
                  {submittingResolution ? 'Submitting...' : 'Confirm Resolution'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
