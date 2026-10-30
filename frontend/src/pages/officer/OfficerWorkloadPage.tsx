import React, { useState, useEffect } from 'react';
import { Users, Filter, RefreshCw, Shield } from 'lucide-react';
import { OfficerWorkloadSummary, OfficerTask } from '../../types';
import { fetchOfficerWorkload, fetchOfficerTasks } from '../../lib/api';
import { WorkloadSummary } from '../../components/officer/WorkloadSummary';
import { OfficerTaskTable } from '../../components/officer/OfficerTaskTable';

export const OfficerWorkloadPage: React.FC = () => {
  const [workload, setWorkload] = useState<OfficerWorkloadSummary | null>(null);
  const [selectedOfficerId, setSelectedOfficerId] = useState<string | null>(null);
  const [tasks, setTasks] = useState<OfficerTask[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    loadWorkload();
  }, []);

  useEffect(() => {
    loadOfficerTasks(selectedOfficerId);
  }, [selectedOfficerId]);

  const loadWorkload = async () => {
    try {
      setIsLoading(true);
      const data = await fetchOfficerWorkload();
      setWorkload(data);
    } finally {
      setIsLoading(false);
    }
  };

  const loadOfficerTasks = async (officerId: string | null) => {
    const data = await fetchOfficerTasks({
      assigned_to: officerId || undefined,
      limit: 20,
    });
    setTasks(data);
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200">
              Capacity Monitoring
            </span>
            <span className="text-xs text-slate-500 font-mono">Team Workload Distribution</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
            Officer Workload & Staffing Desk
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Supervisory visibility into active case assignments, critical backlogs, and operational bandwidth.
          </p>
        </div>

        <button
          onClick={loadWorkload}
          className="px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 rounded-lg shadow-sm flex items-center gap-2 transition-colors self-start sm:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh Workload
        </button>
      </div>

      {/* Workload Cards */}
      {workload && (
        <WorkloadSummary
          summary={workload}
          onOfficerSelect={(id) => setSelectedOfficerId(id === selectedOfficerId ? null : id)}
        />
      )}

      {/* Selected Officer Tasks List */}
      <div className="space-y-3 pt-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-blue-600" />
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">
              {selectedOfficerId ? `Filtered Tasks for Selected Officer` : 'All Active Department Tasks'}
            </h3>
          </div>
          {selectedOfficerId && (
            <button
              onClick={() => setSelectedOfficerId(null)}
              className="text-xs text-blue-600 hover:underline font-medium"
            >
              Clear Filter
            </button>
          )}
        </div>

        <OfficerTaskTable tasks={tasks} isLoading={isLoading} />
      </div>
    </div>
  );
};
