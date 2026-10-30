import React, { useState } from 'react';
import { ReleaseChecklistItem, ChecklistItemStatus } from '../../types';
import { ReleaseStatusBadge } from './ReleaseStatusBadge';
import { CheckCircle2, AlertTriangle, ShieldCheck, HelpCircle, Edit3, Save, X, ExternalLink } from 'lucide-react';

interface EligibilityChecklistProps {
  items: ReleaseChecklistItem[];
  canEdit?: boolean;
  onUpdateItem?: (itemId: string, status: ChecklistItemStatus, comments?: string) => Promise<void>;
  isLoading?: boolean;
}

export const EligibilityChecklist: React.FC<EligibilityChecklistProps> = ({
  items,
  canEdit = false,
  onUpdateItem,
  isLoading = false,
}) => {
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editStatus, setEditStatus] = useState<ChecklistItemStatus>('pending');
  const [editComments, setEditComments] = useState('');
  const [saving, setSaving] = useState(false);

  const startEdit = (item: ReleaseChecklistItem) => {
    setEditingItemId(item.id);
    setEditStatus(item.review_status);
    setEditComments(item.review_comments || '');
  };

  const cancelEdit = () => {
    setEditingItemId(null);
    setEditComments('');
  };

  const handleSave = async (itemId: string) => {
    if (!onUpdateItem) return;
    try {
      setSaving(true);
      await onUpdateItem(itemId, editStatus, editComments);
      setEditingItemId(null);
    } finally {
      setSaving(false);
    }
  };

  const requiredItems = items.filter((i) => i.is_required);
  const satisfiedRequired = requiredItems.filter((i) => i.review_status === 'satisfied');
  const percentSatisfied = requiredItems.length > 0
    ? Math.round((satisfiedRequired.length / requiredItems.length) * 100)
    : 100;

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
      {/* Header with progress */}
      <div className="p-5 border-b border-slate-200 bg-slate-50/70">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-[#12345A]" />
              <h3 className="font-semibold text-slate-900 text-base">
                Statutory Eligibility & Compliance Checklist
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Governed by AICTE Approval Process Handbook (APH) Release Directives
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <span className="text-xs font-medium text-slate-500">Mandatory Clearance</span>
              <div className="text-sm font-bold text-slate-800">
                {satisfiedRequired.length} of {requiredItems.length} Satisfied
              </div>
            </div>
            <div className="w-16 h-16 relative flex items-center justify-center">
              <div className="text-xs font-bold text-[#1D5F91]">{percentSatisfied}%</div>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-slate-200 rounded-full h-2 mt-2 overflow-hidden">
          <div
            className={`h-2 transition-all duration-500 ${
              percentSatisfied === 100 ? 'bg-emerald-500' : 'bg-[#1D5F91]'
            }`}
            style={{ width: `${percentSatisfied}%` }}
          />
        </div>
      </div>

      {/* Items List */}
      <div className="divide-y divide-slate-100">
        {items.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-sm">
            No checklist items recorded for this release request.
          </div>
        ) : (
          items.map((item, idx) => {
            const isEditing = editingItemId === item.id;

            return (
              <div
                key={item.id}
                className={`p-4 transition-colors ${
                  isEditing ? 'bg-blue-50/40' : 'hover:bg-slate-50/60'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center text-xs font-semibold mt-0.5">
                      {idx + 1}
                    </span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-slate-900 text-sm">
                          {item.requirement_title}
                        </span>
                        {item.is_required ? (
                          <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-rose-100 text-rose-700">
                            Mandatory
                          </span>
                        ) : (
                          <span className="text-[10px] uppercase font-medium tracking-wider px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                            Optional
                          </span>
                        )}
                        <ReleaseStatusBadge status={item.review_status} type="checklist" size="sm" />
                      </div>

                      {item.requirement_description && (
                        <p className="text-xs text-slate-600 mt-1">
                          {item.requirement_description}
                        </p>
                      )}

                      {/* Review details if not editing */}
                      {!isEditing && (item.review_comments || item.reviewed_by) && (
                        <div className="mt-2.5 p-2.5 rounded-lg bg-slate-50 border border-slate-200/80 text-xs">
                          {item.review_comments && (
                            <div className="text-slate-700 font-normal mb-1">
                              <span className="font-semibold text-slate-800">Officer Remark:</span>{' '}
                              {item.review_comments}
                            </div>
                          )}
                          {item.reviewed_at && (
                            <div className="text-slate-500 text-[11px]">
                              Verified on {new Date(item.reviewed_at).toLocaleDateString()} by{' '}
                              {item.reviewed_by || 'Regulatory Officer'}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Inline Edit Form */}
                      {isEditing && (
                        <div className="mt-3 p-3.5 bg-white border border-blue-200 rounded-lg shadow-sm space-y-3">
                          <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">
                              Verification Decision
                            </label>
                            <select
                              value={editStatus}
                              onChange={(e) => setEditStatus(e.target.value as ChecklistItemStatus)}
                              className="w-full text-xs rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                            >
                              <option value="satisfied">Satisfied (Compliant)</option>
                              <option value="not_satisfied">Not Satisfied (Deficient)</option>
                              <option value="needs_clarification">Needs Clarification</option>
                              <option value="pending">Pending Audit</option>
                              <option value="not_applicable">Not Applicable</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">
                              Supervisory Remarks & Justification
                            </label>
                            <textarea
                              rows={2}
                              value={editComments}
                              onChange={(e) => setEditComments(e.target.value)}
                              placeholder="Detail statutory verification findings..."
                              className="w-full text-xs rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                            />
                          </div>

                          <div className="flex items-center justify-end gap-2 pt-1">
                            <button
                              type="button"
                              onClick={cancelEdit}
                              disabled={saving}
                              className="px-2.5 py-1 text-xs font-medium text-slate-600 hover:text-slate-800 rounded bg-slate-100 hover:bg-slate-200"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSave(item.id)}
                              disabled={saving}
                              className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium text-white bg-[#1D5F91] hover:bg-[#12345A] rounded shadow-sm disabled:opacity-50"
                            >
                              <Save className="w-3.5 h-3.5" />
                              {saving ? 'Saving...' : 'Record Verification'}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Edit action */}
                  {canEdit && !isEditing && (
                    <button
                      type="button"
                      onClick={() => startEdit(item)}
                      disabled={isLoading}
                      className="p-1.5 text-slate-400 hover:text-[#1D5F91] hover:bg-slate-100 rounded transition-colors"
                      title="Update checklist verification"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
