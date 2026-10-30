import React, { useState } from 'react';
import { ShieldCheck, CheckCircle2, FileText, Lock, ChevronRight, X, ExternalLink } from 'lucide-react';
import { TrustTier, FDRVerificationStatus } from '../../types';

interface TrustTierBadgeProps {
  tier: TrustTier | number;
  status?: FDRVerificationStatus | string;
  size?: 'sm' | 'md' | 'lg';
  showDetailsOnClick?: boolean;
  bankName?: string;
  keyId?: string;
  verifiedAt?: string;
}

export const TrustTierBadge: React.FC<TrustTierBadgeProps> = ({
  tier,
  status,
  size = 'md',
  showDetailsOnClick = true,
  bankName,
  keyId,
  verifiedAt,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Configuration for each Trust Tier
  const tierConfig = {
    1: {
      label: 'Tier 1: Institution Declared',
      shortLabel: 'Tier 1 Declared',
      badgeClass: 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100',
      icon: FileText,
      iconColor: 'text-amber-600',
      description: 'Declared directly by the depositor authority. Awaiting commercial bank confirmation.',
      trustLevel: 'Institutional Custody (Initial)',
      badgeDot: 'bg-amber-500',
    },
    2: {
      label: 'Tier 2: Bank Confirmed',
      shortLabel: 'Tier 2 Confirmed',
      badgeClass: 'bg-blue-50 text-blue-900 border-blue-300 hover:bg-blue-100',
      icon: CheckCircle2,
      iconColor: 'text-blue-700',
      description: 'Formally acknowledged and confirmed by a bank nodal branch officer via single-use verification token.',
      trustLevel: 'Depository Bank Confirmed',
      badgeDot: 'bg-blue-600',
    },
    3: {
      label: 'Tier 3: Signature Verified',
      shortLabel: 'Tier 3 Verified',
      badgeClass: 'bg-emerald-50 text-emerald-900 border-emerald-300 hover:bg-emerald-100 shadow-xs',
      icon: ShieldCheck,
      iconColor: 'text-emerald-700',
      description: 'Cryptographically certified with an authentic Ed25519 digital signature from an authorized banking key.',
      trustLevel: 'Cryptographically Secured (Highest)',
      badgeDot: 'bg-emerald-600 animate-pulse',
    },
  }[tier as 1 | 2 | 3] || {
    label: `Tier ${tier}`,
    shortLabel: `Tier ${tier}`,
    badgeClass: 'bg-slate-50 text-slate-800 border-slate-300',
    icon: FileText,
    iconColor: 'text-slate-600',
    description: 'Unknown tier status',
    trustLevel: 'Standard',
    badgeDot: 'bg-slate-500',
  };

  const Icon = tierConfig.icon;

  const sizeClasses = {
    sm: 'text-[10px] px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5',
    lg: 'text-sm px-3.5 py-1.5 gap-2 font-semibold',
  }[size];

  return (
    <>
      <button
        type="button"
        onClick={() => showDetailsOnClick && setIsModalOpen(true)}
        className={`inline-flex items-center font-medium rounded-full border transition-all ${tierConfig.badgeClass} ${sizeClasses} ${
          showDetailsOnClick ? 'cursor-pointer hover:shadow-xs' : 'cursor-default'
        }`}
        title="Click to view Trust Tier verification proof"
      >
        <span className={`w-1.5 h-1.5 rounded-full ${tierConfig.badgeDot}`} />
        <Icon className={`shrink-0 ${size === 'sm' ? 'w-3 h-3' : size === 'lg' ? 'w-4 h-4' : 'w-3.5 h-3.5'} ${tierConfig.iconColor}`} />
        <span>{size === 'sm' ? tierConfig.shortLabel : tierConfig.label}</span>
      </button>

      {/* Verification Evidence Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-lg border border-gov-border max-w-md w-full shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="bg-gov-navy text-white px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-gov-gold" />
                <h3 className="font-bold text-sm tracking-wide">Trust Tier Verification Evidence</h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-white/80 hover:text-white p-1 rounded hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            <div className="p-5 space-y-4 text-xs">
              {/* Active Tier Highlight */}
              <div className={`p-4 rounded-lg border ${tierConfig.badgeClass}`}>
                <div className="flex items-center gap-2 font-bold text-sm">
                  <Icon className={`w-5 h-5 ${tierConfig.iconColor}`} />
                  <span>{tierConfig.label}</span>
                </div>
                <p className="mt-1.5 leading-relaxed text-[11px] opacity-90">{tierConfig.description}</p>
              </div>

              {/* Trust Hierarchy Progress */}
              <div>
                <label className="text-[11px] font-bold text-gov-muted uppercase tracking-wider block mb-2">
                  Three-Tier Trust Progression
                </label>
                <div className="space-y-2">
                  <div
                    className={`p-2 rounded border flex items-center justify-between text-xs ${
                      tier >= 1 ? 'border-amber-300 bg-amber-50/50 text-gov-text font-medium' : 'border-gray-200 opacity-50'
                    }`}
                  >
                    <span>Tier 1: Institutional Self-Declaration</span>
                    {tier >= 1 ? <CheckCircle2 className="w-4 h-4 text-amber-600" /> : <span className="text-[10px]">Pending</span>}
                  </div>

                  <div
                    className={`p-2 rounded border flex items-center justify-between text-xs ${
                      tier >= 2 ? 'border-blue-300 bg-blue-50/50 text-gov-text font-medium' : 'border-gray-200 opacity-50'
                    }`}
                  >
                    <span>Tier 2: Single-Use Link Bank Confirmation</span>
                    {tier >= 2 ? <CheckCircle2 className="w-4 h-4 text-blue-600" /> : <span className="text-[10px]">Unconfirmed</span>}
                  </div>

                  <div
                    className={`p-2 rounded border flex items-center justify-between text-xs ${
                      tier >= 3 ? 'border-emerald-300 bg-emerald-50/50 text-gov-text font-medium' : 'border-gray-200 opacity-50'
                    }`}
                  >
                    <span>Tier 3: Ed25519 Digital Signature Verified</span>
                    {tier >= 3 ? <ShieldCheck className="w-4 h-4 text-emerald-600" /> : <span className="text-[10px]">Unsigned</span>}
                  </div>
                </div>
              </div>

              {/* Detailed Metadata */}
              <div className="p-3 bg-gov-bg rounded border border-gov-border space-y-1.5 text-[11px]">
                <div className="flex justify-between">
                  <span className="text-gov-muted">Verified Bank:</span>
                  <span className="font-medium text-gov-navy">{bankName || 'Depository Bank'}</span>
                </div>
                {keyId && (
                  <div className="flex justify-between">
                    <span className="text-gov-muted">Public Key ID:</span>
                    <span className="font-mono text-gov-blue">{keyId}</span>
                  </div>
                )}
                {verifiedAt && (
                  <div className="flex justify-between">
                    <span className="text-gov-muted">Verification Date:</span>
                    <span>{new Date(verifiedAt).toLocaleString('en-IN')}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gov-muted">Algorithm Standard:</span>
                  <span className="font-mono">RFC 8032 (Ed25519) / JCS RFC 8785</span>
                </div>
              </div>

              {/* Footer Notice */}
              <p className="text-[10px] text-gov-muted leading-normal">
                Governance Rule: Trust tiers can only be upgraded through verified bank cryptographic attestations or secure officer tokens. Direct database mutations are strictly prohibited.
              </p>
            </div>

            <div className="bg-gray-50 px-5 py-3 border-t border-gov-border flex justify-end">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-1.5 text-xs font-semibold rounded bg-gov-navy text-white hover:bg-gov-navy/90"
              >
                Close Evidence
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
