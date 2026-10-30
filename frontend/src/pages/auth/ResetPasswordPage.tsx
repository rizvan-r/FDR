import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { Lock, Eye, EyeOff, ShieldCheck, CheckCircle2, AlertCircle } from 'lucide-react';

export const ResetPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMsg(null);

    if (password.length < 8) {
      setStatusMsg({ type: 'error', text: 'Password must be at least 8 characters with numbers and symbols.' });
      return;
    }

    if (password !== confirmPassword) {
      setStatusMsg({ type: 'error', text: 'Passwords do not match.' });
      return;
    }

    setIsSubmitting(true);
    if (!isSupabaseConfigured) {
      setTimeout(() => {
        setIsSubmitting(false);
        setStatusMsg({ type: 'success', text: 'Password successfully updated. Redirecting to login...' });
        setTimeout(() => navigate('/login'), 1500);
      }, 800);
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({ password });
      setIsSubmitting(false);
      if (error) {
        setStatusMsg({ type: 'error', text: error.message });
      } else {
        setStatusMsg({ type: 'success', text: 'Password successfully updated. Redirecting to login...' });
        setTimeout(() => navigate('/login'), 1500);
      }
    } catch (err: any) {
      setIsSubmitting(false);
      setStatusMsg({ type: 'error', text: err.message || 'Failed to update password.' });
    }
  };

  return (
    <div className="min-h-screen bg-gov-bg flex flex-col justify-between">
      <div className="w-full bg-[#0d233a] text-white border-b border-[#1f4066] text-xs py-2 px-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <span className="font-semibold uppercase tracking-wider text-[11px] text-gray-200">
            भारत सरकार | Government of India
          </span>
          <span className="text-gray-400">Institutional Security Deposit Oversight</span>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-lg shadow-gov-md border border-gov-border overflow-hidden">
          <div className="bg-gov-light px-6 py-4 border-b border-gov-border flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-gov-navy flex items-center justify-center text-[#D4AF37]">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-gov-navy">Set New Password</h2>
              <p className="text-[11px] text-gov-muted">Establish New Institutional Access Credentials</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {statusMsg && (
              <div
                className={`p-3 rounded text-xs flex items-start gap-2 border ${
                  statusMsg.type === 'success'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : 'bg-red-50 border-red-200 text-red-800'
                }`}
              >
                {statusMsg.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
                )}
                <span>{statusMsg.text}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-gov-navy mb-1.5" htmlFor="password">
                New Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gov-muted">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-9 pr-10 py-2 text-xs border border-gov-border rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-gov-blue text-gov-text font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gov-muted hover:text-gov-text"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gov-navy mb-1.5" htmlFor="confirm">
                Confirm New Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gov-muted">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="confirm"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-9 pr-3 py-2 text-xs border border-gov-border rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-gov-blue text-gov-text font-mono"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-gov-navy hover:bg-[#0c243f] text-white py-2.5 px-4 rounded-md text-xs font-semibold uppercase tracking-wider shadow-sm transition disabled:opacity-50"
            >
              {isSubmitting ? 'Updating Password...' : 'Save New Password'}
            </button>

            <div className="text-center pt-2">
              <Link to="/login" className="text-xs text-gov-blue hover:underline font-semibold">
                Cancel and return to login
              </Link>
            </div>
          </form>
        </div>
      </div>

      <div className="py-3 text-center text-xs text-gov-muted border-t border-gov-border bg-white">
        FDR-Chain Portal • Phase 1
      </div>
    </div>
  );
};
