import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldAlert,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Users,
  RefreshCw,
  ArrowRight,
  TrendingUp,
  Inbox,
  Filter,
} from 'lucide-react';
import { OfficerDashboardStats, OfficerTask } from '../../types';
import { fetchOfficerDashboardStats, fetchOfficerTasks, syncOfficerTasks } from '../../lib/api';
import { OfficerTaskTable } from '../../components/officer/OfficerTaskTable';

export const OfficerDashboardPage: React.FC = () => {
  const [stats, setStats] = useState<OfficerDashboardStats | null>(null);
  const [topTasks, setTopTasks] = useState<OfficerTask[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [statsData, tasksData] = await Promise.all([
        fetchOfficerDashboardStats(),
        fetchOfficerTasks({ limit: 5 }),
      ]);
      setStats(statsData);
      setTopTasks(tasksData);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSync = async () => {
    try {
      setIsSyncing(true);
      await syncOfficerTasks();
      await loadData();
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-200">
              Phase 6 Enterprise
            </span>
            <span className="text-xs text-slate-500 font-mono">Government Operations Desk</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
            Officer Dashboard & Priority Queue
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Role-aware central task coordination, dynamic priority scoring, and supervisory escalation pipeline.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleSync}
            disabled={isSyncing}
            className="px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/60 rounded-lg shadow-sm flex items-center gap-2 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'Syncing...' : 'Sync Tasks'}
          </button>
          <Link
            to="/officer/queue"
            className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm flex items-center gap-1.5 transition-colors"
          >
            Open Priority Queue
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Open Tasks</span>
            <Inbox className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900 dark:text-white">
            {stats?.open_tasks ?? 0}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">Active in Queue</span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm bg-rose-50/20 dark:bg-rose-950/10">
          <div className="flex items-center justify-between text-rose-600 mb-2">
            <span className="text-xs font-semibold">Critical Tasks</span>
            <ShieldAlert className="w-4 h-4" />
          </div>
          <div className="text-2xl font-bold font-mono text-rose-700 dark:text-rose-400">
            {stats?.critical_tasks ?? 0}
          </div>
          <span className="text-[11px] text-rose-600 dark:text-rose-400 mt-1 block">Score &ge; 100</span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-orange-600 mb-2">
            <span className="text-xs font-semibold">High Priority</span>
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div className="text-2xl font-bold font-mono text-orange-700 dark:text-orange-400">
            {stats?.high_priority_tasks ?? 0}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">Score 70–99</span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-amber-600 mb-2">
            <span className="text-xs font-medium">Overdue SLA</span>
            <Clock className="w-4 h-4" />
          </div>
          <div className={`text-2xl font-bold font-mono ${(stats?.overdue_tasks ?? 0) > 0 ? 'text-rose-600' : 'text-slate-900 dark:text-white'}`}>
            {stats?.overdue_tasks ?? 0}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">Target Missed</span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-emerald-600 mb-2">
            <span className="text-xs font-medium">Completed</span>
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-600">
            {stats?.completed_this_month ?? 0}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">This Month</span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-purple-600 mb-2">
            <span className="text-xs font-medium">Escalations</span>
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div className="text-2xl font-bold font-mono text-purple-700 dark:text-purple-300">
            {stats?.pending_escalations ?? 0}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">Pending Review</span>
        </div>
      </div>

      {/* Main Split: Top Urgent Tasks & Quick Action Shortcuts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Urgent Priority Worklist */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-600" />
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                Top Priority Worklist
              </h3>
            </div>
            <Link
              to="/officer/queue"
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 font-medium"
            >
              View Full Priority Queue ({stats?.open_tasks ?? 0})
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <OfficerTaskTable tasks={topTasks} isLoading={isLoading} />
        </div>

        {/* Right 1 Col: Quick Links & Recent Activity */}
        <div className="space-y-5">
          {/* Workspaces & Quick Links Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
              Officer Workspaces
            </h4>
            <div className="space-y-2">
              <Link
                to="/officer/queue?my_tasks=true"
                className="flex items-center justify-between p-3 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors text-xs font-medium"
              >
                <div className="flex items-center gap-2.5">
                  <Inbox className="w-4 h-4 text-blue-600" />
                  <span>My Assigned Tasks</span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
              </Link>

              <Link
                to="/officer/escalations"
                className="flex items-center justify-between p-3 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors text-xs font-medium"
              >
                <div className="flex items-center gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                  <span>Escalation Center</span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
              </Link>

              <Link
                to="/officer/workload"
                className="flex items-center justify-between p-3 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors text-xs font-medium"
              >
                <div className="flex items-center gap-2.5">
                  <Users className="w-4 h-4 text-emerald-600" />
                  <span>Officer Workload Distribution</span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
              </Link>

              <Link
                to="/officer/policies"
                className="flex items-center justify-between p-3 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors text-xs font-medium"
              >
                <div className="flex items-center gap-2.5">
                  <TrendingUp className="w-4 h-4 text-purple-600" />
                  <span>Queue Scoring Policies (Admin)</span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
              </Link>
            </div>
          </div>

          {/* Recent Operational Activity Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
              Recent Operational Activity
            </h4>
            <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
              {(stats?.recent_activity || []).map((act, i) => (
                <div key={i} className="py-2.5 first:pt-0 last:pb-0">
                  <div className="flex items-center justify-between gap-1 text-slate-800 dark:text-slate-200 font-semibold">
                    <span>{act.action}</span>
                    <span className="text-[10px] text-slate-400 font-normal">{act.time}</span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5 flex items-center justify-between">
                    <span>{act.user}</span>
                    <span className="font-mono text-[10px] bg-slate-100 dark:bg-slate-800 px-1 py-0.2 rounded">
                      {act.fdr}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
