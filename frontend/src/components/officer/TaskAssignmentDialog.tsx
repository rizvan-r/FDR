import React, { useState } from 'react';
import { X, UserCheck, UserMinus, Shield } from 'lucide-react';
import { OfficerTask } from '../../types';

interface TaskAssignmentDialogProps {
  task: OfficerTask | null;
  isOpen: boolean;
  onClose: () => void;
  onAssign: (taskId: string, assignedTo: string | null, note: string) => Promise<void>;
}

export const TaskAssignmentDialog: React.FC<TaskAssignmentDialogProps> = ({
  task,
  isOpen,
  onClose,
  onAssign,
}) => {
  const [selectedOfficer, setSelectedOfficer] = useState<string>('usr-admin-01');
  const [note, setNote] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  if (!isOpen || !task) return null;

  const officers = [
    { id: 'usr-admin-01', name: 'Dr. Rajeshwar Sharma (System Administrator)' },
    { id: 'usr-regional-01', name: 'Smt. Ananya Roy (Regional Officer - North)' },
    { id: 'usr-bureau-01', name: 'Shri Vikramaditya Verma (Bureau Chief - Regulation)' },
    { id: 'usr-finance-01', name: 'Shri Manoj Agarwal (Finance Officer)' },
  ];

  const handleConfirm = async (officerId: string | null) => {
    try {
      setIsSubmitting(true);
      await onAssign(task.id, officerId, note);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xl max-w-md w-full p-6">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-600" />
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">
              Assign Officer Task
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mb-4 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-lg border border-slate-100 dark:border-slate-800">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
            Target Task
          </p>
          <p className="text-sm font-semibold text-slate-900 dark:text-white leading-tight">
            {task.title}
          </p>
          <p className="text-xs text-slate-500 font-mono mt-0.5">
            {task.fdr_number || task.id}
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
              Select Officer
            </label>
            <select
              value={selectedOfficer}
              onChange={(e) => setSelectedOfficer(e.target.value)}
              className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
            >
              {officers.map((off) => (
                <option key={off.id} value={off.id}>
                  {off.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
              Assignment Note (Optional)
            </label>
            <textarea
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Provide briefing notes or instructions for the reviewing officer..."
              className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            {task.assigned_to ? (
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => handleConfirm(null)}
                className="px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors flex items-center gap-1"
              >
                <UserMinus className="w-3.5 h-3.5" />
                Unassign
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => handleConfirm(selectedOfficer)}
                className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
              >
                <UserCheck className="w-3.5 h-3.5" />
                {isSubmitting ? 'Saving...' : 'Confirm Assignment'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
