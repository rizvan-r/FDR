import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Bell,
  AlertTriangle,
  Clock,
  ShieldAlert,
  CheckCircle2,
  Calendar,
  UserCheck,
  Check,
  ExternalLink,
  Filter,
  RefreshCw,
  Search,
  X,
  FileCheck2,
} from 'lucide-react';
import { FDRAlert, AlertSeverity, AlertType } from '../../types';
import { fetchAlerts, markAlertAsRead, assignAlert, resolveAlert } from '../../lib/api';

export const AlertCenterPage: React.FC = () => {
  const [alerts, setAlerts] = useState<FDRAlert[]>([]);
  const [total, setTotal] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // Filter state
  const [filterResolved, setFilterResolved] = useState<string>('unresolved'); // 'all' | 'unresolved' | 'resolved'
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [search, setSearch] = useState('');

  // Modals state
  const [resolvingAlert, setResolvingAlert] = useState<FDRAlert | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [submittingResolution, setSubmittingResolution] = useState(false);

  const [assigningAlert, setAssigningAlert] = useState<FDRAlert | null>(null);
  const [assignedOfficerName, setAssignedOfficerName] = useState('Dr. Rajeshwar Sharma');
  const [submittingAssign, setSubmittingAssign] = useState(false);

  const [actionFeedback, setActionFeedback] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const loadAlerts = async () => {
    try {
      setLoading(true);
      const isResolvedParam =
        filterResolved === 'unresolved' ? false : filterResolved === 'resolved' ? true : undefined;
      const severityParam = filterSeverity === 'all' ? undefined : filterSeverity;

      const res = await fetchAlerts({
        is_resolved: isResolvedParam,
        severity: severityParam,
        page_size: 50,
      });

      let items = res.items || [];
      if (search.trim()) {
        const q = search.toLowerCase();
        items = items.filter(
          (a) =>
            a.title.toLowerCase().includes(q) ||
            a.message.toLowerCase().includes(q) ||
            (a.fdr_number && a.fdr_number.toLowerCase().includes(q))
        );
      }

      setAlerts(items);
      setTotal(res.total || 0);
      setUnreadCount(res.unread_count || 0);
    } catch (err: any) {
      console.error('Failed to load regulatory alerts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAlerts();
  }, [filterResolved, filterSeverity]);

  const handleMarkRead = async (alertId: string) => {
    try {
      await markAlertAsRead(alertId);
      setAlerts((prev) =>
        prev.map((a) => (a.id === alertId ? { ...a, is_read: true } : a))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch (err: any) {
      console.error('Failed to mark alert as read:', err);
    }
  };

  const handleResolveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolvingAlert || !resolutionNotes.trim()) return;

    try {
      setSubmittingResolution(true);
      setActionFeedback(null);
      await resolveAlert(resolvingAlert.id, resolutionNotes.trim());
      setActionFeedback({
        text: `Alert "${resolvingAlert.title}" resolved successfully.`,
        type: 'success',
      });
      setResolutionNotes('');
      setResolvingAlert(null);
      await loadAlerts();
    } catch (err: any) {
      setActionFeedback({
        text: err.message || 'Failed to resolve alert.',
        type: 'error',
      });
    } finally {
      setSubmittingResolution(false);
    }
  };

  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assigningAlert) return;

    try {
      setSubmittingAssign(true);
      setActionFeedback(null);
      await assignAlert(assigningAlert.id, assignedOfficerName);
      setActionFeedback({
        text: `Alert assigned to ${assignedOfficerName}.`,
        type: 'success',
      });
      setAssigningAlert(null);
      await loadAlerts();
    } catch (err: any) {
      setActionFeedback({
        text: err.message || 'Failed to assign alert.',
        type: 'error',
      });
    } finally {
      setSubmittingAssign(false);
    }
  };

  const criticalCount = alerts.filter((a) => a.severity === 'critical' && !a.is_resolved).length;
  const warningCount = alerts.filter((a) => a.severity === 'warning' && !a.is_resolved).length;
  const infoCount = alerts.filter((a) => a.severity === 'info' && !a.is_resolved).length;

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#1D5F91]">
            <Bell className="w-4 h-4 text-amber-600" />
            Regulatory Surveillance Center
          </div>
          <h1 className="text-2xl font-bold text-[#12345A] mt-1">
            FDR Alert & Remediation Desk
          </h1>
          <p className="text-sm text-slate-600 mt-1 max-w-3xl">
            Triage broken liens, investigate unverified bank intervals, review upcoming maturity windows, and maintain legally binding audit resolutions.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/heartbeat"
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-xs font-semibold rounded-lg shadow-xs transition-colors"
          >
            <span>&larr; Overview Dashboard</span>
          </Link>
          <button
            type="button"
            onClick={loadAlerts}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Action Feedback Banner */}
      {actionFeedback && (
        <div
          className={`p-3.5 rounded-lg border text-xs flex items-center justify-between ${
            actionFeedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-rose-50 border-rose-200 text-rose-900'
          }`}
        >
          <div className="flex items-center gap-2">
            {actionFeedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-600" />
            )}
            <span className="font-medium">{actionFeedback.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionFeedback(null)}
            className="text-slate-400 hover:text-slate-600"
          >
            &times;
          </button>
        </div>
      )}

      {/* Stats Counter Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs text-slate-500 font-medium">Unresolved Alerts</div>
          <div className="text-2xl font-bold text-[#12345A] mt-1">{total}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">{unreadCount} unread</div>
        </div>

        <div className="p-4 bg-white rounded-xl border border-rose-200 shadow-xs">
          <div className="text-xs text-rose-700 font-medium flex items-center gap-1">
            <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
            <span>Critical Severity</span>
          </div>
          <div className="text-2xl font-bold text-rose-700 mt-1">{criticalCount}</div>
          <div className="text-[11px] text-rose-600 mt-0.5">immediate desk action</div>
        </div>

        <div className="p-4 bg-white rounded-xl border border-amber-200 shadow-xs">
          <div className="text-xs text-amber-700 font-medium flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            <span>Warnings</span>
          </div>
          <div className="text-2xl font-bold text-amber-800 mt-1">{warningCount}</div>
          <div className="text-[11px] text-amber-600 mt-0.5">stale checks & maturities</div>
        </div>

        <div className="p-4 bg-white rounded-xl border border-blue-200 shadow-xs">
          <div className="text-xs text-blue-700 font-medium flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-blue-600" />
            <span>Reminders & Info</span>
          </div>
          <div className="text-2xl font-bold text-blue-800 mt-1">{infoCount}</div>
          <div className="text-[11px] text-blue-600 mt-0.5">scheduled notices</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Resolution Tabs */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg text-xs">
            <button
              type="button"
              onClick={() => setFilterResolved('unresolved')}
              className={`px-3 py-1 font-medium rounded-md transition-colors ${
                filterResolved === 'unresolved'
                  ? 'bg-white text-[#12345A] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Active Unresolved
            </button>
            <button
              type="button"
              onClick={() => setFilterResolved('resolved')}
              className={`px-3 py-1 font-medium rounded-md transition-colors ${
                filterResolved === 'resolved'
                  ? 'bg-white text-[#12345A] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Resolved History
            </button>
            <button
              type="button"
              onClick={() => setFilterResolved('all')}
              className={`px-3 py-1 font-medium rounded-md transition-colors ${
                filterResolved === 'all'
                  ? 'bg-white text-[#12345A] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Alerts
            </button>
          </div>

          {/* Severity Filters */}
          <div className="flex items-center gap-1 text-xs">
            <span className="text-slate-400 mr-1 flex items-center gap-1">
              <Filter className="w-3 h-3" /> Severity:
            </span>
            {['all', 'critical', 'warning', 'info'].map((sev) => (
              <button
                key={sev}
                type="button"
                onClick={() => setFilterSeverity(sev)}
                className={`px-2.5 py-1 rounded capitalize transition-colors ${
                  filterSeverity === sev
                    ? 'bg-[#12345A] text-white font-semibold'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {sev}
              </button>
            ))}
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search alerts by title, message text, or FDR number..."
            className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-[#1D5F91] focus:outline-hidden"
          />
        </div>
      </div>

      {/* Alert Cards Feed */}
      <div className="space-y-3">
        {loading ? (
          <div className="bg-white p-12 text-center rounded-xl border border-slate-200 text-slate-400 text-xs">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[#1D5F91]" />
            Loading regulatory alert feed...
          </div>
        ) : alerts.length === 0 ? (
          <div className="bg-white p-12 text-center rounded-xl border border-slate-200 text-slate-500 text-xs">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
            <h3 className="font-semibold text-slate-700 text-sm">No Alerts Found</h3>
            <p className="mt-1 text-slate-500 max-w-sm mx-auto">
              There are no alerts matching the active filters. All surveillance metrics are currently within nominal tolerances.
            </p>
          </div>
        ) : (
          alerts.map((alert) => {
            const isCritical = alert.severity === 'critical';
            const isWarning = alert.severity === 'warning';

            return (
              <div
                key={alert.id}
                onClick={() => !alert.is_read && handleMarkRead(alert.id)}
                className={`p-4 rounded-xl border bg-white shadow-xs transition-all ${
                  !alert.is_read ? 'border-l-4 border-l-[#1D5F91]' : ''
                } ${
                  isCritical
                    ? 'border-rose-200 hover:border-rose-300'
                    : isWarning
                    ? 'border-amber-200 hover:border-amber-300'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    {/* Severity Icon */}
                    <div
                      className={`p-2.5 rounded-lg shrink-0 ${
                        isCritical
                          ? 'bg-rose-100 text-rose-700'
                          : isWarning
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-blue-100 text-blue-700'
                      }`}
                    >
                      {isCritical ? (
                        <ShieldAlert className="w-5 h-5" />
                      ) : isWarning ? (
                        <AlertTriangle className="w-5 h-5" />
                      ) : (
                        <Calendar className="w-5 h-5" />
                      )}
                    </div>

                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                            isCritical
                              ? 'bg-rose-100 text-rose-800'
                              : isWarning
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {alert.severity}
                        </span>

                        <span className="text-[11px] font-mono text-slate-400">
                          {alert.alert_type}
                        </span>

                        {!alert.is_read && (
                          <span className="px-1.5 py-0.5 bg-blue-100 text-blue-800 text-[10px] font-bold rounded">
                            NEW
                          </span>
                        )}

                        {alert.is_resolved && (
                          <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-semibold rounded flex items-center gap-1">
                            <Check className="w-3 h-3" /> Resolved
                          </span>
                        )}
                      </div>

                      <h3 className="text-sm font-bold text-[#12345A] mt-1.5 leading-snug">
                        {alert.title}
                      </h3>

                      <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                        {alert.message}
                      </p>

                      {/* Metadata Chips */}
                      <div className="flex flex-wrap items-center gap-3 mt-3 text-[11px] text-slate-500">
                        {alert.fdr_number && (
                          <Link
                            to={`/fdrs/${alert.fdr_id}`}
                            className="font-semibold text-[#1D5F91] hover:underline flex items-center gap-1"
                          >
                            <span>FDR: {alert.fdr_number}</span>
                            <ExternalLink className="w-3 h-3" />
                          </Link>
                        )}

                        {alert.bank_name && <span>Bank: {alert.bank_name}</span>}

                        <span>
                          Created:{' '}
                          {new Date(alert.created_at).toLocaleDateString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>

                        {alert.assigned_to_name && (
                          <span className="flex items-center gap-1 text-slate-700 bg-slate-100 px-2 py-0.5 rounded font-medium">
                            <UserCheck className="w-3 h-3 text-[#1D5F91]" />
                            <span>{alert.assigned_to_name}</span>
                          </span>
                        )}
                      </div>

                      {/* Resolution Box if resolved */}
                      {alert.is_resolved && (
                        <div className="mt-3 p-3 bg-emerald-50/70 border border-emerald-200 rounded-lg text-xs text-emerald-950">
                          <div className="font-semibold flex items-center gap-1 text-emerald-900">
                            <FileCheck2 className="w-3.5 h-3.5" />
                            <span>Resolution Record:</span>
                          </div>
                          <p className="mt-0.5 text-emerald-800">{alert.resolution_notes}</p>
                          <div className="mt-1 text-[10px] text-emerald-700">
                            Resolved by {alert.resolved_by || 'Authorized Officer'} on{' '}
                            {alert.resolved_at
                              ? new Date(alert.resolved_at).toLocaleDateString('en-IN', {
                                  day: '2-digit',
                                  month: 'short',
                                  year: 'numeric',
                                })
                              : '—'}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions Column */}
                  {!alert.is_resolved && (
                    <div className="flex sm:flex-col items-center sm:items-end gap-2 shrink-0 pt-2 sm:pt-0">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setResolvingAlert(alert);
                          setResolutionNotes('');
                        }}
                        className="px-3 py-1.5 bg-[#12345A] hover:bg-[#1D5F91] text-white text-xs font-semibold rounded-lg shadow-xs transition-colors flex items-center gap-1"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Resolve Alert</span>
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setAssigningAlert(alert);
                        }}
                        className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-xs font-medium rounded-lg transition-colors flex items-center gap-1"
                      >
                        <UserCheck className="w-3.5 h-3.5 text-slate-500" />
                        <span>{alert.assigned_to ? 'Reassign' : 'Assign Officer'}</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Resolve Modal */}
      {resolvingAlert && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs"
          onClick={() => !submittingResolution && setResolvingAlert(null)}
        >
          <div
            className="bg-white rounded-xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden text-left animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-[#12345A] text-white p-5 flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-base">Document Regulatory Remediation</h3>
                <p className="text-xs text-white/75 mt-0.5 line-clamp-1">
                  Alert: {resolvingAlert.title}
                </p>
              </div>
              <button
                type="button"
                disabled={submittingResolution}
                onClick={() => setResolvingAlert(null)}
                className="text-white/80 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleResolveSubmit} className="p-6 space-y-4">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1">
                <div className="font-semibold text-slate-800">Surveillance Incident:</div>
                <div className="text-slate-600 leading-relaxed">{resolvingAlert.message}</div>
                {resolvingAlert.fdr_number && (
                  <div className="text-[11px] text-[#1D5F91] font-semibold mt-1">
                    Associated FDR: {resolvingAlert.fdr_number}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Remediation & Review Notes <span className="text-rose-600">*</span>
                </label>
                <textarea
                  required
                  rows={4}
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  placeholder="Record documented evidence of bilateral contact with the bank branch manager, lien status confirmation letter, renewal agreement, or rectified discrepancy details..."
                  className="w-full p-2.5 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-[#1D5F91] focus:outline-hidden"
                />
                <span className="text-[11px] text-slate-500 mt-1 block">
                  Mandatory for legal audit and compliance trail.
                </span>
              </div>

              <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-lg text-[11px] text-amber-900">
                Resolving this alert clears the escalation flag. If this FDR was marked Broken, this resolution provides the documented authorized record required to permit normal liveness checks.
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  disabled={submittingResolution}
                  onClick={() => setResolvingAlert(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingResolution || !resolutionNotes.trim()}
                  className="px-4 py-2 bg-[#12345A] hover:bg-[#1D5F91] text-white text-xs font-semibold rounded-lg shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Check className={`w-3.5 h-3.5 ${submittingResolution ? 'animate-spin' : ''}`} />
                  <span>{submittingResolution ? 'Recording...' : 'Authorize & Resolve'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Modal */}
      {assigningAlert && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs"
          onClick={() => !submittingAssign && setAssigningAlert(null)}
        >
          <div
            className="bg-white rounded-xl shadow-2xl max-w-sm w-full border border-slate-200 overflow-hidden text-left animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-[#12345A] text-white p-5 flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-base">Assign Regulatory Alert</h3>
                <p className="text-xs text-white/75 mt-0.5">Designate remediation officer</p>
              </div>
              <button
                type="button"
                disabled={submittingAssign}
                onClick={() => setAssigningAlert(null)}
                className="text-white/80 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAssignSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Responsible Officer
                </label>
                <select
                  value={assignedOfficerName}
                  onChange={(e) => setAssignedOfficerName(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-lg text-xs bg-white focus:ring-2 focus:ring-[#1D5F91] focus:outline-hidden"
                >
                  <option value="Dr. Rajeshwar Sharma">Dr. Rajeshwar Sharma (Admin Officer)</option>
                  <option value="Shri Amit Srivastava">Shri Amit Srivastava (Regional Officer - NR)</option>
                  <option value="Smt. Ananya Sen">Smt. Ananya Sen (Bureau Officer)</option>
                  <option value="Shri Raghavan Iyer">Shri Raghavan Iyer (Finance Officer)</option>
                </select>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  disabled={submittingAssign}
                  onClick={() => setAssigningAlert(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingAssign}
                  className="px-4 py-2 bg-[#12345A] hover:bg-[#1D5F91] text-white text-xs font-semibold rounded-lg shadow-xs transition-colors flex items-center gap-1.5"
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>{submittingAssign ? 'Assigning...' : 'Confirm Assignment'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
