import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { ShieldAlert, ArrowLeft, Home, Key } from 'lucide-react';

export const AccessDeniedPage: React.FC = () => {
  const { user, activeRole } = useAuth();

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg border border-red-200 shadow-gov-md p-6 text-center space-y-4">
        <div className="w-14 h-14 rounded-full bg-red-50 text-gov-danger flex items-center justify-center mx-auto border border-red-200">
          <ShieldAlert className="w-8 h-8" />
        </div>

        <div>
          <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-red-100 text-red-800 uppercase tracking-wider">
            HTTP 403 Forbidden
          </span>
          <h1 className="text-xl font-bold text-gov-navy mt-2">
            Institutional Access Denied
          </h1>
          <p className="text-xs text-gov-muted mt-1 leading-relaxed">
            Your current assigned role ({activeRole}) does not have authorized clearance to view this administrative resource.
          </p>
        </div>

        <div className="p-3 bg-gov-bg rounded border border-gov-border text-left text-xs space-y-1">
          <div className="flex justify-between">
            <span className="text-gov-muted">Authenticated Officer:</span>
            <span className="font-semibold text-gov-navy">{user?.full_name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gov-muted">Active Role Scope:</span>
            <span className="font-mono font-bold text-gov-navy">{activeRole}</span>
          </div>
        </div>

        <p className="text-[11px] text-gov-muted">
          If you require access to this module, submit an official RBAC elevation request to your designated Portal System Administrator.
        </p>

        <div className="pt-2 flex items-center justify-center gap-3">
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-gov-navy hover:bg-[#0c243f] text-white text-xs font-semibold shadow-sm transition"
          >
            <Home className="w-4 h-4" />
            <span>Return to Dashboard</span>
          </Link>
        </div>
      </div>
    </div>
  );
};
