import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Sliders,
  Plus,
  Edit2,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ShieldCheck,
  RefreshCw,
  X,
  Save,
  Check,
} from 'lucide-react';
import { HeartbeatPolicy } from '../../types';
import {
  fetchHeartbeatPolicies,
  createHeartbeatPolicy,
  updateHeartbeatPolicy,
} from '../../lib/api';

export const HeartbeatPolicyPage: React.FC = () => {
  const [policies, setPolicies] = useState<HeartbeatPolicy[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal / Form state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<HeartbeatPolicy | null>(null);
  const [formData, setFormData] = useState<Partial<HeartbeatPolicy>>({
    name: '',
    description: '',
    is_default: false,
    min_amount: 0,
    max_amount: undefined,
    frequency_days: 14,
    response_timeout_hours: 48,
    max_retries: 3,
    retry_interval_hours: 24,
    stale_threshold_days: 21,
    is_active: true,
  });

  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const loadPolicies = async () => {
    try {
      setLoading(true);
      const res = await fetchHeartbeatPolicies();
      setPolicies(res || []);
    } catch (err: any) {
      console.error('Failed to load heartbeat policies:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPolicies();
  }, []);

  const handleOpenCreate = () => {
    setEditingPolicy(null);
    setFormData({
      name: '',
      description: '',
      is_default: false,
      min_amount: 0,
      max_amount: undefined,
      frequency_days: 14,
      response_timeout_hours: 48,
      max_retries: 3,
      retry_interval_hours: 24,
      stale_threshold_days: 21,
      is_active: true,
    });
    setFeedback(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (policy: HeartbeatPolicy) => {
    setEditingPolicy(policy);
    setFormData({
      ...policy,
    });
    setFeedback(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name?.trim()) return;

    try {
      setSaving(true);
      setFeedback(null);

      if (editingPolicy) {
        await updateHeartbeatPolicy(editingPolicy.id, formData);
        setFeedback({
          text: `Policy "${formData.name}" updated successfully.`,
          type: 'success',
        });
      } else {
        await createHeartbeatPolicy(formData);
        setFeedback({
          text: `Policy "${formData.name}" created successfully.`,
          type: 'success',
        });
      }

      await loadPolicies();
      setTimeout(() => {
        setIsModalOpen(false);
        setFeedback(null);
      }, 1200);
    } catch (err: any) {
      setFeedback({
        text: err.message || 'Failed to save heartbeat policy.',
        type: 'error',
      });
    } finally {
      setSaving(false);
    }
  };

  const formatAmountINR = (amt?: number) => {
    if (amt === undefined || amt === null) return 'No Limit';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amt);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#1D5F91]">
            <Sliders className="w-4 h-4 text-[#1D5F91]" />
            Regulatory Policy Engine
          </div>
          <h1 className="text-2xl font-bold text-[#12345A] mt-1">
            FDR Heartbeat Verification Policies
          </h1>
          <p className="text-sm text-slate-600 mt-1 max-w-3xl">
            Configure automated surveillance frequencies, retry thresholds, response timeouts, and staleness parameters mapped by deposit value thresholds.
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
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#12345A] hover:bg-[#1D5F91] text-white text-xs font-semibold rounded-lg shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Policy</span>
          </button>
        </div>
      </div>

      {/* Policies Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {loading ? (
          <div className="col-span-full py-12 text-center text-slate-400 text-xs">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[#1D5F91]" />
            Loading heartbeat surveillance policies...
          </div>
        ) : (
          policies.map((policy) => (
            <div
              key={policy.id}
              className={`bg-white rounded-xl border p-5 shadow-xs flex flex-col justify-between transition-all ${
                policy.is_default
                  ? 'border-[#1D5F91] ring-1 ring-[#1D5F91]/20'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2.5 h-2.5 rounded-full ${
                        policy.is_active ? 'bg-emerald-500' : 'bg-slate-300'
                      }`}
                    />
                    <h3 className="font-bold text-sm text-[#12345A] leading-snug">
                      {policy.name}
                    </h3>
                  </div>
                  {policy.is_default && (
                    <span className="px-2 py-0.5 bg-blue-100 text-[#1D5F91] text-[10px] font-bold rounded uppercase">
                      Default
                    </span>
                  )}
                </div>

                <p className="text-xs text-slate-600 mt-2 leading-relaxed line-clamp-2">
                  {policy.description || 'Surveillance parameters for public fixed deposits.'}
                </p>

                {/* Amount Bracket */}
                <div className="mt-4 p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs">
                  <span className="text-slate-500 font-medium">Deposit Threshold:</span>
                  <div className="font-bold text-slate-800 mt-0.5">
                    {formatAmountINR(policy.min_amount)} &mdash; {formatAmountINR(policy.max_amount)}
                  </div>
                </div>

                {/* Policy Specs Grid */}
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 bg-slate-50/70 border border-slate-100 rounded-lg">
                    <span className="text-slate-500 text-[11px]">Frequency:</span>
                    <div className="font-semibold text-slate-800 mt-0.5">
                      Every {policy.frequency_days} Days
                    </div>
                  </div>

                  <div className="p-2.5 bg-slate-50/70 border border-slate-100 rounded-lg">
                    <span className="text-slate-500 text-[11px]">Timeout SLA:</span>
                    <div className="font-semibold text-slate-800 mt-0.5">
                      {policy.response_timeout_hours} Hours
                    </div>
                  </div>

                  <div className="p-2.5 bg-slate-50/70 border border-slate-100 rounded-lg">
                    <span className="text-slate-500 text-[11px]">Max Retries:</span>
                    <div className="font-semibold text-slate-800 mt-0.5">
                      {policy.max_retries} Attempts ({policy.retry_interval_hours}h gap)
                    </div>
                  </div>

                  <div className="p-2.5 bg-slate-50/70 border border-slate-100 rounded-lg">
                    <span className="text-slate-500 text-[11px]">Stale Window:</span>
                    <div className="font-semibold text-amber-800 mt-0.5">
                      {policy.stale_threshold_days} Days
                    </div>
                  </div>
                </div>
              </div>

              {/* Card Footer */}
              <div className="mt-5 pt-3.5 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-400 text-[11px]">
                  Updated: {new Date(policy.updated_at).toLocaleDateString('en-IN')}
                </span>
                <button
                  type="button"
                  onClick={() => handleOpenEdit(policy)}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded transition-colors inline-flex items-center gap-1"
                >
                  <Edit2 className="w-3 h-3" />
                  <span>Configure</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal: Create / Edit Policy */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs"
          onClick={() => !saving && setIsModalOpen(false)}
        >
          <div
            className="bg-white rounded-xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden text-left animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-[#12345A] text-white p-5 flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-base">
                  {editingPolicy ? 'Configure Heartbeat Policy' : 'Create New Heartbeat Policy'}
                </h3>
                <p className="text-xs text-white/75 mt-0.5">
                  Surveillance rules executed automatically by APScheduler worker
                </p>
              </div>
              <button
                type="button"
                disabled={saving}
                onClick={() => setIsModalOpen(false)}
                className="text-white/80 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {feedback && (
                <div
                  className={`p-3 rounded-lg text-xs font-medium ${
                    feedback.type === 'success'
                      ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                      : 'bg-rose-50 text-rose-900 border border-rose-200'
                  }`}
                >
                  {feedback.text}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Policy Name <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. High-Value Critical PSU Deposit Surveillance"
                  className="w-full p-2.5 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-[#1D5F91] focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={formData.description || ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Operational rationale and regulatory guidelines..."
                  className="w-full p-2.5 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-[#1D5F91] focus:outline-hidden"
                />
              </div>

              {/* Threshold Range */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Min Amount (INR)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={formData.min_amount ?? 0}
                    onChange={(e) =>
                      setFormData({ ...formData, min_amount: Number(e.target.value) })
                    }
                    className="w-full p-2 border border-slate-300 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Max Amount (INR)
                  </label>
                  <input
                    type="number"
                    min={0}
                    placeholder="Leave empty for unconstrained"
                    value={formData.max_amount ?? ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        max_amount: e.target.value ? Number(e.target.value) : undefined,
                      })
                    }
                    className="w-full p-2 border border-slate-300 rounded-lg text-xs"
                  />
                </div>
              </div>

              {/* Timings */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Frequency (Days)
                  </label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={formData.frequency_days ?? 14}
                    onChange={(e) =>
                      setFormData({ ...formData, frequency_days: Number(e.target.value) })
                    }
                    className="w-full p-2 border border-slate-300 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Response Timeout (Hours)
                  </label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={formData.response_timeout_hours ?? 48}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        response_timeout_hours: Number(e.target.value),
                      })
                    }
                    className="w-full p-2 border border-slate-300 rounded-lg text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Max Retries
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    required
                    value={formData.max_retries ?? 3}
                    onChange={(e) =>
                      setFormData({ ...formData, max_retries: Number(e.target.value) })
                    }
                    className="w-full p-2 border border-slate-300 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Retry Gap (Hours)
                  </label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={formData.retry_interval_hours ?? 24}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        retry_interval_hours: Number(e.target.value),
                      })
                    }
                    className="w-full p-2 border border-slate-300 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Stale After (Days)
                  </label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={formData.stale_threshold_days ?? 21}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        stale_threshold_days: Number(e.target.value),
                      })
                    }
                    className="w-full p-2 border border-slate-300 rounded-lg text-xs"
                  />
                </div>
              </div>

              {/* Checkboxes */}
              <div className="pt-2 space-y-2 border-t border-slate-100">
                <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_default ?? false}
                    onChange={(e) => setFormData({ ...formData, is_default: e.target.checked })}
                    className="rounded text-[#12345A] focus:ring-[#1D5F91]"
                  />
                  <span>Designate as Default Fallback Policy</span>
                </label>

                <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_active ?? true}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="rounded text-[#12345A] focus:ring-[#1D5F91]"
                  />
                  <span>Policy Active for Scheduled Scheduler Scans</span>
                </label>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || !formData.name?.trim()}
                  className="px-4 py-2 bg-[#12345A] hover:bg-[#1D5F91] text-white text-xs font-semibold rounded-lg shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Save className={`w-3.5 h-3.5 ${saving ? 'animate-spin' : ''}`} />
                  <span>{saving ? 'Saving...' : 'Save Policy'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
