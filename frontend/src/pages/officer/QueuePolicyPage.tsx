import React, { useState, useEffect } from 'react';
import {
  Sliders,
  ShieldCheck,
  AlertTriangle,
  Save,
  RotateCcw,
  CheckCircle2,
  Clock,
  Layers,
  ArrowRight,
  TrendingUp,
  Award,
  Zap,
} from 'lucide-react';
import { fetchQueuePolicies, updateQueuePolicy } from '../../lib/api';
import { QueuePolicy } from '../../types';

export const QueuePolicyPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [policy, setPolicy] = useState<QueuePolicy | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form State
  const [weights, setWeights] = useState({
    broken_fdr: 100,
    unresponsive_heartbeat: 70,
    stale_heartbeat: 40,
    deadline_exceeded: 50,
    deadline_within_24h: 35,
    deadline_within_7d: 20,
    renewal_awaiting_review: 20,
    missing_evidence: 15,
    escalated_case: 30,
  });

  const [thresholds, setThresholds] = useState({
    critical: 100,
    high: 70,
    medium: 35,
    low: 0,
  });

  const [deadlineRules, setDeadlineRules] = useState({
    broken_fdr_hours: 24,
    unresponsive_hours: 48,
    stale_heartbeat_days: 5,
    renewal_review_days: 3,
    standard_verification_days: 2,
  });

  const [escalationRules, setEscalationRules] = useState({
    critical_immediate_notify: true,
    overdue_escalation_hours: 24,
    level_1_target_role: 'regional_officer',
    level_2_target_role: 'bureau_officer',
  });

  const loadPolicy = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const policies = await fetchQueuePolicies();
      if (policies && policies.length > 0) {
        const active = policies.find((p) => p.is_active) || policies[0];
        setPolicy(active);
        setWeights({ ...weights, ...active.weights });
        setThresholds({ ...thresholds, ...active.thresholds });
        setDeadlineRules({ ...deadlineRules, ...active.deadline_rules });
        setEscalationRules({ ...escalationRules, ...active.escalation_rules });
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to load queue policy.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPolicy();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!policy) return;

    // Validation
    if (thresholds.critical <= thresholds.high) {
      setErrorMessage('Validation Error: Critical threshold must be greater than High threshold.');
      return;
    }
    if (thresholds.high <= thresholds.medium) {
      setErrorMessage('Validation Error: High threshold must be greater than Medium threshold.');
      return;
    }
    if (thresholds.medium <= thresholds.low) {
      setErrorMessage('Validation Error: Medium threshold must be greater than Low threshold.');
      return;
    }

    setSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const updated = await updateQueuePolicy(policy.id, {
        weights,
        thresholds,
        deadline_rules: deadlineRules,
        escalation_rules: escalationRules,
      });
      setPolicy(updated);
      setSuccessMessage('Queue priority and escalation policy successfully updated across the national portal.');
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to update policy.');
    } finally {
      setSaving(false);
    }
  };

  const handleResetDefaults = () => {
    setWeights({
      broken_fdr: 100,
      unresponsive_heartbeat: 70,
      stale_heartbeat: 40,
      deadline_exceeded: 50,
      deadline_within_24h: 35,
      deadline_within_7d: 20,
      renewal_awaiting_review: 20,
      missing_evidence: 15,
      escalated_case: 30,
    });
    setThresholds({
      critical: 100,
      high: 70,
      medium: 35,
      low: 0,
    });
    setDeadlineRules({
      broken_fdr_hours: 24,
      unresponsive_hours: 48,
      stale_heartbeat_days: 5,
      renewal_review_days: 3,
      standard_verification_days: 2,
    });
    setEscalationRules({
      critical_immediate_notify: true,
      overdue_escalation_hours: 24,
      level_1_target_role: 'regional_officer',
      level_2_target_role: 'bureau_officer',
    });
    setSuccessMessage('Restored official Government prototype baseline parameters.');
    setTimeout(() => setSuccessMessage(null), 4000);
  };

  // Sample scenario simulator
  const sampleScenarios = [
    {
      title: 'Broken FDR (Lien Breach)',
      factors: ['broken_fdr'],
      score: weights.broken_fdr,
    },
    {
      title: 'Unresponsive Heartbeat + Deadline Exceeded',
      factors: ['unresponsive_heartbeat', 'deadline_exceeded'],
      score: weights.unresponsive_heartbeat + weights.deadline_exceeded,
    },
    {
      title: 'Renewal Awaiting Review + Due in 24h',
      factors: ['renewal_awaiting_review', 'deadline_within_24h'],
      score: weights.renewal_awaiting_review + weights.deadline_within_24h,
    },
  ];

  const getSimulatedTier = (score: number) => {
    if (score >= thresholds.critical) return { label: 'CRITICAL', color: 'bg-rose-100 text-rose-800 border-rose-300' };
    if (score >= thresholds.high) return { label: 'HIGH', color: 'bg-amber-100 text-amber-800 border-amber-300' };
    if (score >= thresholds.medium) return { label: 'MEDIUM', color: 'bg-blue-100 text-blue-800 border-blue-300' };
    return { label: 'LOW', color: 'bg-slate-100 text-slate-800 border-slate-300' };
  };

  if (loading) {
    return (
      <div className="bg-white border border-gov-border rounded-lg p-12 text-center shadow-xs">
        <Sliders className="w-8 h-8 text-gov-navy animate-spin mx-auto mb-3" />
        <p className="text-sm text-gov-muted">Loading queue priority policies...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white border border-gov-border rounded-lg p-5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-purple-700 uppercase tracking-wider">
              <Sliders className="w-4 h-4 text-purple-600" />
              <span>Phase 6 Administrator Control</span>
            </div>
            <h1 className="text-2xl font-bold text-gov-navy mt-1">Queue & Priority Policy Settings</h1>
            <p className="text-sm text-gov-muted mt-0.5">
              Configure heuristic priority weights, risk tier score boundaries, SLA countdown timers, and multi-tier escalation routing.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleResetDefaults}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-slate-300 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50 transition shadow-xs"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Restore Baseline Defaults</span>
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-md bg-gov-navy text-white text-xs font-semibold hover:bg-slate-800 transition shadow-xs disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{saving ? 'Saving...' : 'Deploy Policy Changes'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Notifications / Alerts */}
      {successMessage && (
        <div className="p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center justify-between">
          <span className="flex items-center gap-2 font-medium">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMessage}</span>
          </span>
          <button onClick={() => setSuccessMessage(null)} className="text-emerald-700 hover:text-emerald-900 font-bold">
            Dismiss
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center justify-between">
          <span className="flex items-center gap-2 font-medium">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </span>
          <button onClick={() => setErrorMessage(null)} className="text-rose-700 hover:text-rose-900 font-bold">
            Dismiss
          </button>
        </div>
      )}

      {/* Form Container */}
      <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left & Middle Columns: Settings Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Section 1: Heuristic Priority Weights */}
          <div className="bg-white border border-gov-border rounded-lg p-5 shadow-xs space-y-4">
            <div className="flex items-center gap-2 border-b border-gov-border pb-3">
              <Zap className="w-4 h-4 text-amber-600" />
              <h2 className="text-sm font-bold text-gov-navy">1. Signal Priority Weights (+Points)</h2>
            </div>
            <p className="text-xs text-gov-muted">
              Point values added to tasks when specific operational or surveillance events occur. Cumulative scores determine queue ordering.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Broken FDR / Lien Breach (+Pts)
                </label>
                <input
                  type="number"
                  min="0"
                  max="200"
                  value={weights.broken_fdr}
                  onChange={(e) => setWeights({ ...weights, broken_fdr: Number(e.target.value) })}
                  className="w-full p-2 border border-slate-300 rounded-md text-xs focus:ring-1 focus:ring-gov-navy"
                />
                <span className="text-[10px] text-gov-muted">Immediate highest alert for discharged collateral</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Unresponsive Heartbeat (+Pts)
                </label>
                <input
                  type="number"
                  min="0"
                  max="200"
                  value={weights.unresponsive_heartbeat}
                  onChange={(e) => setWeights({ ...weights, unresponsive_heartbeat: Number(e.target.value) })}
                  className="w-full p-2 border border-slate-300 rounded-md text-xs focus:ring-1 focus:ring-gov-navy"
                />
                <span className="text-[10px] text-gov-muted">Missed multiple consecutive verification pings</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Stale Heartbeat (+Pts)
                </label>
                <input
                  type="number"
                  min="0"
                  max="200"
                  value={weights.stale_heartbeat}
                  onChange={(e) => setWeights({ ...weights, stale_heartbeat: Number(e.target.value) })}
                  className="w-full p-2 border border-slate-300 rounded-md text-xs focus:ring-1 focus:ring-gov-navy"
                />
                <span className="text-[10px] text-gov-muted">Exceeded configured normal ping cadence</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Deadline Exceeded (+Pts)
                </label>
                <input
                  type="number"
                  min="0"
                  max="200"
                  value={weights.deadline_exceeded}
                  onChange={(e) => setWeights({ ...weights, deadline_exceeded: Number(e.target.value) })}
                  className="w-full p-2 border border-slate-300 rounded-md text-xs focus:ring-1 focus:ring-gov-navy"
                />
                <span className="text-[10px] text-gov-muted">SLA timer has expired without resolution</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Deadline within 24 Hours (+Pts)
                </label>
                <input
                  type="number"
                  min="0"
                  max="200"
                  value={weights.deadline_within_24h}
                  onChange={(e) => setWeights({ ...weights, deadline_within_24h: Number(e.target.value) })}
                  className="w-full p-2 border border-slate-300 rounded-md text-xs focus:ring-1 focus:ring-gov-navy"
                />
                <span className="text-[10px] text-gov-muted">Urgent turnaround window</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Deadline within 7 Days (+Pts)
                </label>
                <input
                  type="number"
                  min="0"
                  max="200"
                  value={weights.deadline_within_7d}
                  onChange={(e) => setWeights({ ...weights, deadline_within_7d: Number(e.target.value) })}
                  className="w-full p-2 border border-slate-300 rounded-md text-xs focus:ring-1 focus:ring-gov-navy"
                />
                <span className="text-[10px] text-gov-muted">Upcoming maturity or verification expiry</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Renewal Awaiting Review (+Pts)
                </label>
                <input
                  type="number"
                  min="0"
                  max="200"
                  value={weights.renewal_awaiting_review}
                  onChange={(e) => setWeights({ ...weights, renewal_awaiting_review: Number(e.target.value) })}
                  className="w-full p-2 border border-slate-300 rounded-md text-xs focus:ring-1 focus:ring-gov-navy"
                />
                <span className="text-[10px] text-gov-muted">New renewal case submitted by institution</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Missing Required Evidence (+Pts)
                </label>
                <input
                  type="number"
                  min="0"
                  max="200"
                  value={weights.missing_evidence}
                  onChange={(e) => setWeights({ ...weights, missing_evidence: Number(e.target.value) })}
                  className="w-full p-2 border border-slate-300 rounded-md text-xs focus:ring-1 focus:ring-gov-navy"
                />
                <span className="text-[10px] text-gov-muted">Deposit certificate or letter missing</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Formally Escalated Case (+Pts)
                </label>
                <input
                  type="number"
                  min="0"
                  max="200"
                  value={weights.escalated_case}
                  onChange={(e) => setWeights({ ...weights, escalated_case: Number(e.target.value) })}
                  className="w-full p-2 border border-slate-300 rounded-md text-xs focus:ring-1 focus:ring-gov-navy"
                />
                <span className="text-[10px] text-gov-muted">Active supervisory escalation stage attached</span>
              </div>
            </div>
          </div>

          {/* Section 2: Priority Thresholds */}
          <div className="bg-white border border-gov-border rounded-lg p-5 shadow-xs space-y-4">
            <div className="flex items-center gap-2 border-b border-gov-border pb-3">
              <TrendingUp className="w-4 h-4 text-rose-600" />
              <h2 className="text-sm font-bold text-gov-navy">2. Priority Level Score Thresholds</h2>
            </div>
            <p className="text-xs text-gov-muted">
              Map calculated cumulative scores into operational priority tiers. Critical and High priority tasks trigger notification and escalation workflows.
            </p>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-semibold text-rose-700 mb-1">Critical Tier (Score ≥)</label>
                <input
                  type="number"
                  min="0"
                  value={thresholds.critical}
                  onChange={(e) => setThresholds({ ...thresholds, critical: Number(e.target.value) })}
                  className="w-full p-2 border border-rose-300 bg-rose-50/30 rounded-md text-xs font-bold text-rose-800 focus:ring-1 focus:ring-rose-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-amber-700 mb-1">High Tier (Score ≥)</label>
                <input
                  type="number"
                  min="0"
                  value={thresholds.high}
                  onChange={(e) => setThresholds({ ...thresholds, high: Number(e.target.value) })}
                  className="w-full p-2 border border-amber-300 bg-amber-50/30 rounded-md text-xs font-bold text-amber-800 focus:ring-1 focus:ring-amber-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-blue-700 mb-1">Medium Tier (Score ≥)</label>
                <input
                  type="number"
                  min="0"
                  value={thresholds.medium}
                  onChange={(e) => setThresholds({ ...thresholds, medium: Number(e.target.value) })}
                  className="w-full p-2 border border-blue-300 bg-blue-50/30 rounded-md text-xs font-bold text-blue-800 focus:ring-1 focus:ring-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Low Tier (Score ≥)</label>
                <input
                  type="number"
                  min="0"
                  value={thresholds.low}
                  onChange={(e) => setThresholds({ ...thresholds, low: Number(e.target.value) })}
                  className="w-full p-2 border border-slate-300 bg-slate-50 rounded-md text-xs font-bold text-slate-800 focus:ring-1 focus:ring-slate-600"
                />
              </div>
            </div>
          </div>

          {/* Section 3: SLA Timing & Deadline Rules */}
          <div className="bg-white border border-gov-border rounded-lg p-5 shadow-xs space-y-4">
            <div className="flex items-center gap-2 border-b border-gov-border pb-3">
              <Clock className="w-4 h-4 text-blue-600" />
              <h2 className="text-sm font-bold text-gov-navy">3. Operational SLA & Due Date Rules</h2>
            </div>
            <p className="text-xs text-gov-muted">
              Default resolution time windows assigned to automatically synchronized tasks from upstream modules.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Broken FDR Investigation Due (Hours)
                </label>
                <input
                  type="number"
                  min="1"
                  max="168"
                  value={deadlineRules.broken_fdr_hours}
                  onChange={(e) => setDeadlineRules({ ...deadlineRules, broken_fdr_hours: Number(e.target.value) })}
                  className="w-full p-2 border border-slate-300 rounded-md text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Unresponsive Branch Inquiry Due (Hours)
                </label>
                <input
                  type="number"
                  min="1"
                  max="168"
                  value={deadlineRules.unresponsive_hours}
                  onChange={(e) => setDeadlineRules({ ...deadlineRules, unresponsive_hours: Number(e.target.value) })}
                  className="w-full p-2 border border-slate-300 rounded-md text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Renewal Case Review SLA (Days)
                </label>
                <input
                  type="number"
                  min="1"
                  max="30"
                  value={deadlineRules.renewal_review_days}
                  onChange={(e) => setDeadlineRules({ ...deadlineRules, renewal_review_days: Number(e.target.value) })}
                  className="w-full p-2 border border-slate-300 rounded-md text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Bank Verification Turnaround SLA (Days)
                </label>
                <input
                  type="number"
                  min="1"
                  max="30"
                  value={deadlineRules.standard_verification_days}
                  onChange={(e) =>
                    setDeadlineRules({ ...deadlineRules, standard_verification_days: Number(e.target.value) })
                  }
                  className="w-full p-2 border border-slate-300 rounded-md text-xs"
                />
              </div>
            </div>
          </div>

          {/* Section 4: Escalation Routing Policies */}
          <div className="bg-white border border-gov-border rounded-lg p-5 shadow-xs space-y-4">
            <div className="flex items-center gap-2 border-b border-gov-border pb-3">
              <Layers className="w-4 h-4 text-purple-600" />
              <h2 className="text-sm font-bold text-gov-navy">4. Supervisory Escalation Policies</h2>
            </div>
            <p className="text-xs text-gov-muted">
              Configure automatic escalation timers and default recipient supervisory roles.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Overdue Task Auto-Escalate Delay (Hours)
                </label>
                <input
                  type="number"
                  min="1"
                  max="168"
                  value={escalationRules.overdue_escalation_hours}
                  onChange={(e) =>
                    setEscalationRules({ ...escalationRules, overdue_escalation_hours: Number(e.target.value) })
                  }
                  className="w-full p-2 border border-slate-300 rounded-md text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Stage 1 Escalation Recipient Role
                </label>
                <select
                  value={escalationRules.level_1_target_role}
                  onChange={(e) => setEscalationRules({ ...escalationRules, level_1_target_role: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-md text-xs bg-white"
                >
                  <option value="regional_officer">Regional Officer (Regional Supervision)</option>
                  <option value="bureau_officer">Bureau Officer (National Bureau)</option>
                  <option value="system_admin">System Administrator</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Stage 2 Escalation Recipient Role
                </label>
                <select
                  value={escalationRules.level_2_target_role}
                  onChange={(e) => setEscalationRules({ ...escalationRules, level_2_target_role: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-md text-xs bg-white"
                >
                  <option value="bureau_officer">Bureau Officer (Bureau Chief)</option>
                  <option value="system_admin">System Administrator</option>
                </select>
              </div>

              <div className="flex items-center gap-2 pt-5">
                <input
                  type="checkbox"
                  id="criticalNotify"
                  checked={escalationRules.critical_immediate_notify}
                  onChange={(e) =>
                    setEscalationRules({ ...escalationRules, critical_immediate_notify: e.target.checked })
                  }
                  className="w-4 h-4 rounded text-gov-navy focus:ring-gov-navy"
                />
                <label htmlFor="criticalNotify" className="text-xs font-medium text-slate-700">
                  Immediately notify supervisor upon creation of Critical tasks
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Live Policy Simulator & Policy Summary */}
        <div className="space-y-6">
          <div className="bg-white border border-gov-border rounded-lg p-5 shadow-xs space-y-4 sticky top-20">
            <div className="flex items-center gap-2 border-b border-gov-border pb-3">
              <Award className="w-4 h-4 text-gov-navy" />
              <h2 className="text-sm font-bold text-gov-navy">Live Heuristic Simulator</h2>
            </div>
            <p className="text-xs text-gov-muted">
              Preview real-time score calculation and tier classification under your pending configuration.
            </p>

            <div className="space-y-3 pt-1">
              {sampleScenarios.map((sc, idx) => {
                const tier = getSimulatedTier(sc.score);
                return (
                  <div key={idx} className="p-3 rounded-lg border border-slate-200 bg-slate-50 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800">{sc.title}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${tier.color}`}>
                        {tier.label}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-gov-muted">
                      <span>Calculated Score:</span>
                      <span className="font-mono font-bold text-gov-navy">{sc.score} pts</span>
                    </div>
                    <div className="text-[10px] text-slate-500">
                      Signals: {sc.factors.map((f) => weights[f as keyof typeof weights] + ' pts').join(' + ')}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-4 border-t border-gov-border space-y-3">
              <div className="p-3 rounded-md bg-blue-50/70 border border-blue-200 text-xs text-blue-900">
                <strong>Non-Destructive Ordering Invariant:</strong> Priority scoring strictly determines officer task queue presentation and SLA urgency. It never modifies underlying FDR collateral, financial liens, or renewal case status.
              </div>

              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="w-full py-2.5 px-4 rounded-md bg-gov-navy hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-bold shadow-xs transition"
              >
                {saving ? 'Deploying Changes...' : 'Save & Deploy Policy'}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};
