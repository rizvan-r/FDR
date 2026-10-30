import React, { useState } from 'react';
import { ComplianceDocument } from '../../types';
import { X, PenTool, AlertTriangle, ShieldCheck, Check } from 'lucide-react';

interface MockSignatureModalProps {
  document: ComplianceDocument;
  isOpen: boolean;
  onClose: () => void;
  onConfirmSign: (signerName: string) => Promise<void>;
}

export const MockSignatureModal: React.FC<MockSignatureModalProps> = ({
  document,
  isOpen,
  onClose,
  onConfirmSign,
}) => {
  if (!isOpen) return null;

  const [signerName, setSignerName] = useState('Dr. Rajeshwar Sharma (System Administrator)');
  const [consentAcknowledged, setConsentAcknowledged] = useState(false);
  const [isSigning, setIsSigning] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!consentAcknowledged || !signerName.trim()) return;

    setIsSigning(true);
    try {
      await onConfirmSign(signerName.trim());
      onClose();
    } finally {
      setIsSigning(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
      <div className="bg-white rounded-xl shadow-xl border border-gov-border max-w-lg w-full overflow-hidden">
        {/* Header */}
        <div className="bg-gov-navy text-white px-5 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <PenTool className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-bold">
              Execute Mock Digital E-Signature (Demonstration)
            </h3>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white transition">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          {/* Statutory Simulation Disclaimer Alert */}
          <div className="p-3.5 bg-amber-50 border-2 border-amber-300 rounded-lg text-amber-950 space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold text-amber-900">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span className="uppercase tracking-wide">
                Statutory Architecture Disclaimer
              </span>
            </div>
            <p className="text-[11px] leading-relaxed font-semibold text-amber-900">
              DEMO — NOT A LEGALLY VALID DIGITAL SIGNATURE
            </p>
            <p className="text-[10px] text-amber-800 leading-relaxed">
              This simulated workflow demonstrates digital certificate hashing, audit trail linking, and visual sealing under Phase 7 specifications. Real production deployment requires CCA-approved Class 3 DSC tokens.
            </p>
          </div>

          {/* Document Summary */}
          <div className="p-3 bg-slate-50 border border-gov-border rounded-lg space-y-1.5">
            <div className="flex justify-between">
              <span className="text-gov-muted">Document:</span>
              <span className="font-semibold text-gov-navy">{document.document_title}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gov-muted">Reference:</span>
              <span className="font-mono font-bold text-gov-navy">{document.reference_number}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gov-muted">Target FDR:</span>
              <span className="font-mono text-gov-navy">{document.fdr_number || 'N/A'}</span>
            </div>
          </div>

          {/* Signer Identity Input */}
          <div>
            <label className="block font-semibold text-gov-navy mb-1">
              Signer Display Name & Title *
            </label>
            <input
              type="text"
              required
              value={signerName}
              onChange={(e) => setSignerName(e.target.value)}
              className="w-full p-2 border border-gov-border rounded bg-white text-xs focus:border-gov-blue focus:outline-hidden"
              placeholder="e.g. Dr. Rajeshwar Sharma (System Administrator)"
            />
          </div>

          {/* Consent Checkbox */}
          <div className="pt-1">
            <label className="flex items-start gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                required
                checked={consentAcknowledged}
                onChange={(e) => setConsentAcknowledged(e.target.checked)}
                className="mt-0.5 rounded border-gov-border text-gov-blue focus:ring-gov-blue"
              />
              <span className="text-[11px] text-gov-text font-medium leading-relaxed">
                I acknowledge that this e-sign action is an educational demonstration on the FDR-Chain evaluation portal and satisfies Phase 7 governance criteria.
              </span>
            </label>
          </div>

          {/* Actions */}
          <div className="pt-3 flex items-center justify-end gap-2 border-t border-gov-border">
            <button
              type="button"
              onClick={onClose}
              disabled={isSigning}
              className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gov-navy rounded font-medium text-xs transition"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSigning || !consentAcknowledged || !signerName.trim()}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-gov-navy hover:bg-gov-navy-light disabled:opacity-50 text-white rounded font-semibold text-xs shadow-xs transition"
            >
              {isSigning ? (
                <span>Affixing Digital Seal...</span>
              ) : (
                <>
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                  <span>Affix Simulated Digital Signature</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
