import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  ShieldAlert,
  AlertTriangle,
  Clock,
  WifiOff,
  CheckCircle2,
  Bell,
  Sliders,
  RefreshCw,
  ArrowRight,
  TrendingUp,
  FileText,
  Calendar,
  ExternalLink,
} from 'lucide-react';
import { HeartbeatDashboardStats, FDRAlert, HeartbeatCheck } from '../../types';
import {
  fetchHeartbeatDashboard,
  fetchAlerts,
  fetchFDRHeartbeatHistory,
  triggerSchedulerCycle,
} from '../../lib/api';
import { HeartbeatStatusBadge } from '../../components/common/HeartbeatStatusBadge';

export const HeartbeatDashboardPage: React.FC = () => {
  const [stats, setStats] = useState<HeartbeatDashboardStats | null>(null);
  const [recentAlerts, setRecentAlerts] = useState<FDRAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [runningCycle, setRunningCycle] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [dashStats, alertData] = await Promise.all([
        fetchHeartbeatDashboard(),
        fetchAlerts({ is_resolved: false, page_size: 5 }),
      ]);
      setStats(dashStats);
      setRecentAlerts(alertData.items || []);
    } catch (err: any) {
      console.error('Failed to load heartbeat dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRunScheduler = async () => {
    try {
      setRunningCycle(true);
      setFeedbackMsg(null);
      const res = await triggerSchedulerCycle();
      setFeedbackMsg({
        text: res.message || 'Scheduler cycle executed successfully.',
        type: 'success',
      });
      await loadData();
    } catch (err: any) {
      setFeedbackMsg({
        text: err.message || 'Failed to trigger scheduler cycle.',
        type: 'error',
      });
    } finally {
      setRunningCycle(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner & Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#1D5F91]">
            <Activity className="w-4 h-4 text-emerald-600 animate-pulse" />
            Phase 4: Automated Liveness & Integrity Surveillance
          </div>
          <h1 className="text-2xl font-bold text-[#12345A] mt-1">
            FDR Heartbeat Monitoring & Regulatory Surveillance
          </h1>
          <p className="text-sm text-slate-600 mt-1 max-w-3xl">
            Autonomous bi-directional verification verifying depository bank custody, lien integrity, and maturity windows across public sector fixed deposits.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={handleRunScheduler}
            disabled={runningCycle}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#12345A] hover:bg-[#1D5F91] text-white text-xs font-semibold rounded-lg shadow-xs transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${runningCycle ? 'animate-spin' : ''}`} />
            <span>{runningCycle ? 'Running Cycle...' : 'Run Scheduler Now'}</span>
          </button>

          <Link
            to="/admin/heartbeat-policies"
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-xs font-semibold rounded-lg shadow-xs transition-colors"
          >
            <Sliders className="w-3.5 h-3.5 text-slate-500" />
            <span>Policies</span>
          </Link>
        </div>
      </div>

      {/* Feedback Toast */}
      {feedbackMsg && (
        <div
          className={`p-3.5 rounded-lg border text-xs flex items-center justify-between ${
            feedbackMsg.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-rose-50 border-rose-200 text-rose-900'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedbackMsg.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-600" />
            )}
            <span className="font-medium">{feedbackMsg.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedbackMsg(null)}
            className="text-slate-400 hover:text-slate-600"
          >
            &times;
          </button>
        </div>
      )}

      {/* Primary KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Monitored */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Monitored FDRs
            </span>
            <div className="p-2 bg-blue-50 text-[#1D5F91] rounded-lg">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-[#12345A]">
              {loading ? '...' : stats?.total_monitored_fdrs ?? 0}
            </span>
            <span className="text-xs text-slate-500">active deposits</span>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
            <span>Overall Compliance</span>
            <span className="font-semibold text-emerald-700">
              {stats?.compliance_rate_percent ?? 100}%
            </span>
          </div>
        </div>

        {/* Alive (Active) */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs hover:border-emerald-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-emerald-700 uppercase tracking-wider">
              Alive / Verified
            </span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-emerald-700">
              {loading ? '...' : stats?.alive_count ?? 0}
            </span>
            <span className="text-xs text-emerald-600 font-medium">custody intact</span>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
            <span>Active checks run</span>
            <span className="font-semibold">{stats?.total_checks_count ?? 0}</span>
          </div>
        </div>

        {/* Stale / Overdue */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs hover:border-amber-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-amber-700 uppercase tracking-wider">
              Stale Checks
            </span>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-amber-800">
              {loading ? '...' : stats?.stale_count ?? 0}
            </span>
            <span className="text-xs text-amber-700">exceeded interval</span>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
            <span>Pending response</span>
            <span className="font-semibold">{stats?.pending_checks_count ?? 0}</span>
          </div>
        </div>

        {/* Critical Broken & Unresponsive */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs hover:border-rose-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-rose-700 uppercase tracking-wider">
              Broken & Unresponsive
            </span>
            <div className="p-2 bg-rose-50 text-rose-600 rounded-lg">
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-rose-700">
              {loading
                ? '...'
                : (stats?.broken_count ?? 0) + (stats?.unresponsive_count ?? 0)}
            </span>
            <span className="text-xs text-rose-600">urgent desk action</span>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
            <span>Critical alerts</span>
            <span className="font-bold text-rose-700">
              {stats?.critical_alerts_count ?? 0} open
            </span>
          </div>
        </div>
      </div>

      {/* Liveness Health Distribution & Regulatory Action Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Status Distribution Breakdown */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs lg:col-span-2">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-base font-bold text-[#12345A]">
                Custody Liveness Status Distribution
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Proportion of active deposits across surveillance classifications
              </p>
            </div>
            <Link
              to="/heartbeat/monitoring"
              className="text-xs font-semibold text-[#1D5F91] hover:underline flex items-center gap-1"
            >
              <span>View Monitored Grid</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="mt-6 space-y-4">
            {/* Alive bar */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-semibold text-emerald-800 flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  Alive / Verified ({stats?.alive_count ?? 0})
                </span>
                <span className="text-slate-600 font-medium">
                  {stats?.total_monitored_fdrs
                    ? Math.round(((stats.alive_count || 0) / stats.total_monitored_fdrs) * 100)
                    : 0}
                  %
                </span>
              </div>
              <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                  style={{
                    width: `${
                      stats?.total_monitored_fdrs
                        ? ((stats.alive_count || 0) / stats.total_monitored_fdrs) * 100
                        : 0
                    }%`,
                  }}
                />
              </div>
            </div>

            {/* Stale bar */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-semibold text-amber-800 flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  Stale Threshold Exceeded ({stats?.stale_count ?? 0})
                </span>
                <span className="text-slate-600 font-medium">
                  {stats?.total_monitored_fdrs
                    ? Math.round(((stats.stale_count || 0) / stats.total_monitored_fdrs) * 100)
                    : 0}
                  %
                </span>
              </div>
              <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-500 rounded-full transition-all duration-500"
                  style={{
                    width: `${
                      stats?.total_monitored_fdrs
                        ? ((stats.stale_count || 0) / stats.total_monitored_fdrs) * 100
                        : 0
                    }%`,
                  }}
                />
              </div>
            </div>

            {/* Unresponsive bar */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-semibold text-orange-800 flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-orange-500" />
                  Unresponsive (Max Retries) ({stats?.unresponsive_count ?? 0})
                </span>
                <span className="text-slate-600 font-medium">
                  {stats?.total_monitored_fdrs
                    ? Math.round(((stats.unresponsive_count || 0) / stats.total_monitored_fdrs) * 100)
                    : 0}
                  %
                </span>
              </div>
              <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-orange-500 rounded-full transition-all duration-500"
                  style={{
                    width: `${
                      stats?.total_monitored_fdrs
                        ? ((stats.unresponsive_count || 0) / stats.total_monitored_fdrs) * 100
                        : 0
                    }%`,
                  }}
                />
              </div>
            </div>

            {/* Broken bar */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-semibold text-rose-800 flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-600" />
                  Broken / Lien Discrepancy ({stats?.broken_count ?? 0})
                </span>
                <span className="text-slate-600 font-medium">
                  {stats?.total_monitored_fdrs
                    ? Math.round(((stats.broken_count || 0) / stats.total_monitored_fdrs) * 100)
                    : 0}
                  %
                </span>
              </div>
              <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-rose-600 rounded-full transition-all duration-500"
                  style={{
                    width: `${
                      stats?.total_monitored_fdrs
                        ? ((stats.broken_count || 0) / stats.total_monitored_fdrs) * 100
                        : 0
                    }%`,
                  }}
                />
              </div>
            </div>
          </div>

          {/* Policy rule note */}
          <div className="mt-6 p-3.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600 flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-[#1D5F91] shrink-0 mt-0.5" />
            <p>
              <strong>Surveillance Rule #4.3:</strong> FDRs marked as{' '}
              <span className="text-rose-700 font-bold">Broken</span> cannot silently transition back to{' '}
              <span className="text-emerald-700 font-bold">Alive</span> via automated heartbeat checks without a documented authorized review recorded in the Regulatory Alert Desk.
            </p>
          </div>
        </div>

        {/* Quick Links & Alert Desk Snapshot */}
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-amber-600" />
                <h3 className="font-bold text-sm text-[#12345A]">Regulatory Alert Desk</h3>
              </div>
              <Link
                to="/alerts"
                className="text-xs font-semibold text-[#1D5F91] hover:underline"
              >
                Open Desk &rarr;
              </Link>
            </div>

            <div className="mt-3 space-y-2.5">
              {recentAlerts.length === 0 ? (
                <div className="text-center py-6 text-xs text-slate-500">
                  <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto mb-1.5" />
                  No open regulatory alerts at this time.
                </div>
              ) : (
                recentAlerts.map((alert) => (
                  <Link
                    key={alert.id}
                    to="/alerts"
                    className="block p-3 rounded-lg border border-slate-100 hover:border-slate-200 hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          alert.severity === 'critical'
                            ? 'bg-rose-100 text-rose-800'
                            : alert.severity === 'warning'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {alert.severity}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {new Date(alert.created_at).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                        })}
                      </span>
                    </div>
                    <div className="font-semibold text-xs text-slate-800 mt-1 line-clamp-1">
                      {alert.title}
                    </div>
                    <div className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                      {alert.fdr_number ? `FDR: ${alert.fdr_number}` : alert.message}
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>

          {/* Quick Actions Card */}
          <div className="bg-[#12345A] text-white p-5 rounded-xl shadow-xs">
            <h3 className="font-bold text-sm">Surveillance Control Desk</h3>
            <p className="text-xs text-white/75 mt-1 leading-relaxed">
              Maintain regulatory adherence across scheduled batches, review broken liens, and inspect bank attestation tokens.
            </p>
            <div className="mt-4 space-y-2">
              <Link
                to="/heartbeat/monitoring"
                className="flex items-center justify-between p-2.5 bg-white/10 hover:bg-white/15 rounded-lg text-xs font-medium transition-colors"
              >
                <span>Active Monitored FDRs</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
              <Link
                to="/alerts"
                className="flex items-center justify-between p-2.5 bg-white/10 hover:bg-white/15 rounded-lg text-xs font-medium transition-colors"
              >
                <span>Alert Desk ({stats?.active_alerts_count ?? 0} active)</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
              <Link
                to="/admin/heartbeat-policies"
                className="flex items-center justify-between p-2.5 bg-white/10 hover:bg-white/15 rounded-lg text-xs font-medium transition-colors"
              >
                <span>Configure Frequency Policies</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
