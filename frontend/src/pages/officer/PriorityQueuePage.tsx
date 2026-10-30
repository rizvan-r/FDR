import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, Filter, ShieldAlert, RefreshCw, UserCheck, Inbox } from 'lucide-react';
import { OfficerTask } from '../../types';
import { fetchOfficerTasks, assignOfficerTask, syncOfficerTasks } from '../../lib/api';
import { OfficerTaskTable } from '../../components/officer/OfficerTaskTable';
import { TaskAssignmentDialog } from '../../components/officer/TaskAssignmentDialog';

export const PriorityQueuePage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [tasks, setTasks] = useState<OfficerTask[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>(searchParams.get('status') || '');
  const [priorityFilter, setPriorityFilter] = useState<string>(searchParams.get('priority') || '');
  const [myTasksOnly, setMyTasksOnly] = useState<boolean>(searchParams.get('my_tasks') === 'true');
  const [unassignedOnly, setUnassignedOnly] = useState<boolean>(searchParams.get('unassigned') === 'true');

  const [assignDialogTask, setAssignDialogTask] = useState<OfficerTask | null>(null);

  useEffect(() => {
    loadTasks();
  }, [statusFilter, priorityFilter, myTasksOnly, unassignedOnly]);

  const loadTasks = async () => {
    try {
      setIsLoading(true);
      const data = await fetchOfficerTasks({
        status: statusFilter || undefined,
        priority_level: priorityFilter || undefined,
        search: searchTerm || undefined,
        my_tasks: myTasksOnly,
        unassigned_only: unassignedOnly,
      });
      setTasks(data);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadTasks();
  };

  const handleSync = async () => {
    try {
      setIsSyncing(true);
      await syncOfficerTasks();
      await loadTasks();
    } finally {
      setIsSyncing(false);
    }
  };

  const handleAssignConfirm = async (taskId: string, assignedTo: string | null, note: string) => {
    await assignOfficerTask(taskId, assignedTo, note);
    await loadTasks();
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-200">
              Unified Queue
            </span>
            <span className="text-xs text-slate-500 font-mono">Dynamic Priority Ordering</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
            Officer Priority Queue
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Real-time operational triage merging verification requests, heartbeat alerts, and renewal approvals.
          </p>
        </div>

        <button
          onClick={handleSync}
          disabled={isSyncing}
          className="px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/60 rounded-lg shadow-sm flex items-center gap-2 transition-colors disabled:opacity-50 self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
          {isSyncing ? 'Synchronizing...' : 'Sync Queue'}
        </button>
      </div>

      {/* Filter and Control Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm space-y-4">
        {/* Top Controls: Search and Quick Toggles */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <form onSubmit={handleSearchSubmit} className="flex-1 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by FDR number, title, or institution name..."
              className="w-full text-xs pl-9 pr-20 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="submit"
              className="absolute right-1.5 top-1/2 -translate-y-1/2 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-semibold"
            >
              Search
            </button>
          </form>

          {/* Quick Scope Toggles */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setMyTasksOnly(!myTasksOnly);
                if (!myTasksOnly) setUnassignedOnly(false);
              }}
              className={`px-3 py-2 text-xs font-semibold rounded-lg border transition-colors flex items-center gap-1.5 ${
                myTasksOnly
                  ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-slate-50'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" />
              My Tasks
            </button>

            <button
              onClick={() => {
                setUnassignedOnly(!unassignedOnly);
                if (!unassignedOnly) setMyTasksOnly(false);
              }}
              className={`px-3 py-2 text-xs font-semibold rounded-lg border transition-colors flex items-center gap-1.5 ${
                unassignedOnly
                  ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-slate-50'
              }`}
            >
              <Inbox className="w-3.5 h-3.5" />
              Unassigned Only
            </button>
          </div>
        </div>

        {/* Filter Badges Row: Status & Priority */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
          {/* Status Tabs */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-slate-500 font-medium mr-1 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" /> Status:
            </span>
            {[
              { id: '', label: 'All' },
              { id: 'open', label: 'Open' },
              { id: 'in_progress', label: 'In Progress' },
              { id: 'waiting', label: 'Waiting' },
              { id: 'completed', label: 'Completed' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${
                  statusFilter === tab.id
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Priority Level Filters */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-medium mr-1 flex items-center gap-1">
              <ShieldAlert className="w-3.5 h-3.5" /> Priority:
            </span>
            {[
              { id: '', label: 'All' },
              { id: 'critical', label: 'Critical' },
              { id: 'high', label: 'High' },
              { id: 'medium', label: 'Medium' },
              { id: 'low', label: 'Low' },
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => setPriorityFilter(p.id)}
                className={`px-2 py-0.5 rounded text-xs font-medium border transition-colors ${
                  priorityFilter === p.id
                    ? 'bg-blue-50 text-blue-700 border-blue-300 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800'
                    : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Task List Table */}
      <OfficerTaskTable
        tasks={tasks}
        isLoading={isLoading}
        onAssignClick={(task) => setAssignDialogTask(task)}
      />

      {/* Assignment Modal Dialog */}
      <TaskAssignmentDialog
        task={assignDialogTask}
        isOpen={Boolean(assignDialogTask)}
        onClose={() => setAssignDialogTask(null)}
        onAssign={handleAssignConfirm}
      />
    </div>
  );
};
