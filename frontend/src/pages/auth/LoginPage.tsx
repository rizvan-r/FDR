import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Eye, EyeOff, Lock, Mail, ShieldAlert, ArrowRight, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { DEMO_USERS } from '../../lib/mockData';
import { UserRole } from '../../types';

export const LoginPage: React.FC = () => {
  const { signIn, isConfigured, switchDemoRole } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const from = location.state?.from?.pathname || '/dashboard';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!email || !password) {
      setErrorMsg('Please enter both your official email and password.');
      return;
    }

    setIsSubmitting(true);
    const result = await signIn(email, password);
    setIsSubmitting(false);

    if (result.error) {
      setErrorMsg(result.error);
    } else {
      navigate(from, { replace: true });
    }
  };

  const handleQuickRoleFill = (role: UserRole) => {
    const demoUser = DEMO_USERS[role];
    if (demoUser) {
      setEmail(demoUser.email);
      setPassword('Admin@FDR2026#');
      setErrorMsg('');
    }
  };

  return (
    <div className="min-h-screen bg-gov-bg flex flex-col justify-between">
      {/* Top National Header Bar */}
      <div className="w-full bg-[#0d233a] text-white border-b border-[#1f4066] text-xs">
        <div className="h-1 w-full flex">
          <div className="h-full w-1/3 bg-[#FF9933]"></div>
          <div className="h-full w-1/3 bg-[#FFFFFF]"></div>
          <div className="h-full w-1/3 bg-[#138808]"></div>
        </div>
        <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="font-semibold uppercase tracking-wider text-[11px] text-gray-200">
              भारत सरकार | Government of India
            </span>
            <span className="text-gray-400">|</span>
            <span className="text-[10px] text-gray-400">Institutional Security Deposit Oversight</span>
          </div>
          <span className="text-[11px] text-[#D4AF37] font-semibold">
            Smart India Hackathon 2026
          </span>
        </div>
      </div>

      {/* Main Login Card Container */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-xl">
          {/* Official Seal and Portal Title */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-gov-navy text-white shadow-gov-md border-2 border-[#D4AF37] mb-3">
              <ShieldCheck className="w-8 h-8 text-[#D4AF37]" />
            </div>
            <h1 className="text-2xl font-bold text-gov-navy tracking-tight">
              FDR-Chain Portal
            </h1>
            <p className="text-xs font-medium text-gov-muted mt-1 uppercase tracking-wider">
              Fixed Deposit Receipt & Security Deposit Management System
            </p>
          </div>

          {/* Login Form Box */}
          <div className="bg-white rounded-lg shadow-gov-md border border-gov-border overflow-hidden">
            <div className="bg-gov-light px-6 py-3.5 border-b border-gov-border flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-gov-navy">
                Institutional Official Authentication
              </h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white text-gov-navy border border-gov-border">
                {isConfigured ? 'Live Supabase Auth' : 'Local Dev / Evaluation Mode'}
              </span>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {errorMsg && (
                <div className="p-3 bg-red-50 border border-red-200 rounded text-xs text-red-700 flex items-start gap-2">
                  <ShieldAlert className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
                  <div>
                    <span className="font-semibold">Authentication Notice: </span>
                    {errorMsg}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-gov-navy mb-1.5" htmlFor="email">
                  Official Email Address <span className="text-gov-danger">*</span>
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
                    className="w-full pl-9 pr-3 py-2 text-xs border border-gov-border rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-gov-blue focus:border-gov-blue text-gov-text"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-gov-navy" htmlFor="password">
                    Password <span className="text-gov-danger">*</span>
                  </label>
                  <Link
                    to="/forgot-password"
                    className="text-[11px] text-gov-blue hover:underline font-medium"
                  >
                    Forgot Password?
                  </Link>
                </div>
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
                    className="w-full pl-9 pr-10 py-2 text-xs border border-gov-border rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-gov-blue focus:border-gov-blue text-gov-text font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gov-muted hover:text-gov-text"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-gov-navy hover:bg-[#0c243f] text-white py-2.5 px-4 rounded-md text-xs font-semibold tracking-wide uppercase shadow-sm transition flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      <span>Verifying Credentials...</span>
                    </>
                  ) : (
                    <>
                      <span>Secure Institutional Login</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>

              <div className="text-center pt-2">
                <p className="text-[11px] text-gov-muted">
                  Restricted government platform. Unauthorized access attempts are monitored and recorded.
                </p>
              </div>
            </form>

            {/* SIH 2026 Test & Evaluation Helper Panel */}
            <div className="bg-gray-50 border-t border-gov-border p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gov-muted flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-gov-blue" />
                  Quick Role Fill for SIH Evaluators (Phase 1 Testing)
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 text-[11px]">
                <button
                  type="button"
                  onClick={() => handleQuickRoleFill('system_admin')}
                  className="p-1.5 bg-white border border-gov-border rounded hover:border-gov-navy text-left truncate transition"
                >
                  <span className="font-semibold text-red-700 block">System Admin</span>
                  <span className="text-[9px] text-gray-500 truncate block">admin@fdrchain.gov.in</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickRoleFill('bureau_officer')}
                  className="p-1.5 bg-white border border-gov-border rounded hover:border-gov-navy text-left truncate transition"
                >
                  <span className="font-semibold text-emerald-700 block">Bureau Officer</span>
                  <span className="text-[9px] text-gray-500 truncate block">bureau.officer@...</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickRoleFill('finance_officer')}
                  className="p-1.5 bg-white border border-gov-border rounded hover:border-gov-navy text-left truncate transition"
                >
                  <span className="font-semibold text-amber-700 block">Finance Officer</span>
                  <span className="text-[9px] text-gray-500 truncate block">finance.officer@...</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickRoleFill('regional_officer')}
                  className="p-1.5 bg-white border border-gov-border rounded hover:border-gov-navy text-left truncate transition"
                >
                  <span className="font-semibold text-blue-700 block">Regional Officer</span>
                  <span className="text-[9px] text-gray-500 truncate block">regional.officer.nr@...</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickRoleFill('bank_nodal_officer')}
                  className="p-1.5 bg-white border border-gov-border rounded hover:border-gov-navy text-left truncate transition"
                >
                  <span className="font-semibold text-indigo-700 block">Bank Nodal</span>
                  <span className="text-[9px] text-gray-500 truncate block">nodal.sbi@sbi.co.in</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickRoleFill('institution_user')}
                  className="p-1.5 bg-white border border-gov-border rounded hover:border-gov-navy text-left truncate transition"
                >
                  <span className="font-semibold text-purple-700 block">Institution User</span>
                  <span className="text-[9px] text-gray-500 truncate block">deposits.officer@nhai...</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Institutional Bottom Disclaimer */}
      <div className="py-3 text-center text-xs text-gov-muted border-t border-gov-border bg-white">
        Designed for Smart India Hackathon 2026 • Government Security Deposit FDR Digital Governance
      </div>
    </div>
  );
};
