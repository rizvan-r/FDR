import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Mail, ArrowLeft, ShieldCheck, CheckCircle2, AlertCircle } from 'lucide-react';

export const ForgotPasswordPage: React.FC = () => {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMsg(null);
    if (!email) return;

    setIsSubmitting(true);
    const res = await resetPassword(email);
    setIsSubmitting(false);

    if (res.error) {
      setStatusMsg({ type: 'error', text: res.error });
    } else {
      setStatusMsg({ type: 'success', text: res.message || 'Password reset link sent to your registered email.' });
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
              <h2 className="text-sm font-bold text-gov-navy">Password Recovery Request</h2>
              <p className="text-[11px] text-gov-muted">Official Portal Credentials Recovery</p>
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
              <label className="block text-xs font-bold text-gov-navy mb-1.5" htmlFor="email">
                Registered Institutional Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gov-muted">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="officer@agency.gov.in"
                  className="w-full pl-9 pr-3 py-2 text-xs border border-gov-border rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-gov-blue text-gov-text"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-gov-navy hover:bg-[#0c243f] text-white py-2.5 px-4 rounded-md text-xs font-semibold uppercase tracking-wider shadow-sm transition disabled:opacity-50"
            >
              {isSubmitting ? 'Dispatching Verification...' : 'Send Password Reset Link'}
            </button>

            <div className="text-center pt-2">
              <Link
                to="/login"
                className="inline-flex items-center gap-1.5 text-xs text-gov-blue hover:underline font-semibold"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Return to Institutional Sign In</span>
              </Link>
            </div>
          </form>
        </div>
      </div>

      <div className="py-3 text-center text-xs text-gov-muted border-t border-gov-border bg-white">
        FDR-Chain Portal • Institutional Identity Recovery
      </div>
    </div>
  );
};
