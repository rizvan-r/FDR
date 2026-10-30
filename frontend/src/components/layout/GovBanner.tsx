import React from 'react';
import { ShieldCheck } from 'lucide-react';

export const GovBanner: React.FC = () => {
  return (
    <div className="w-full bg-[#0d233a] text-white border-b border-[#1f4066] text-xs">
      {/* National Tricolor Stripe */}
      <div className="h-1 w-full flex">
        <div className="h-full w-1/3 bg-[#FF9933]"></div>
        <div className="h-full w-1/3 bg-[#FFFFFF]"></div>
        <div className="h-full w-1/3 bg-[#138808]"></div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center space-x-3">
          {/* Emblem representation */}
          <div className="flex items-center space-x-2">
            <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center border border-white/20 text-[#D4AF37]">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <div className="font-semibold tracking-wide uppercase text-[11px] text-gray-200">
                भारत सरकार | Government of India
              </div>
              <div className="text-[10px] text-gray-400">
                Institutional Security Deposit & FDR Central Oversight System
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-4 text-[11px] text-gray-300">
          <span className="hidden sm:inline-flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#16804A] inline-block animate-pulse"></span>
            Govt. High-Security Portal (TLS 1.3 / Supabase RLS Protected)
          </span>
          <span className="text-gray-400">|</span>
          <span className="font-mono text-gray-300">v8.0 (National Portal)</span>
        </div>
      </div>
    </div>
  );
};
