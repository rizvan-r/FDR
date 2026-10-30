import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Landmark,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Key,
  FileSignature,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  Copy,
  Check,
  Building2,
  RefreshCw,
  Hash,
  Lock,
} from 'lucide-react';
import {
  fetchBanks,
  fetchFDRs,
  listBankPendingRequests,
  mockBankSignFDR,
  submitDigitalSignature,
  fetchBankKeys,
} from '../../lib/api';
import { Bank, FDR, VerificationRequest, BankKey } from '../../types';
import { TrustTierBadge } from '../../components/common/TrustTierBadge';

export const MockBankPortalPage: React.FC = () => {
  const navigate = useNavigate();

  // Navigation & Bank Selection
  const [activeTab, setActiveTab] = useState<'pending' | 'signature' | 'keys'>('signature');
  const [banks, setBanks] = useState<Bank[]>([]);
  const [selectedBankId, setSelectedBankId] = useState<string>('');

  // Data
  const [pendingRequests, setPendingRequests] = useState<VerificationRequest[]>([]);
  const [bankFDRs, setBankFDRs] = useState<FDR[]>([]);
  const [bankKeys, setBankKeys] = useState<BankKey[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Digital Signature Workbench State
  const [selectedFdrId, setSelectedFdrId] = useState<string>('');
  const [isSigning, setIsSigning] = useState<boolean>(false);
  const [generatedPayload, setGeneratedPayload] = useState<any>(null);
  const [generatedSignature, setGeneratedSignature] = useState<string>('');
  const [isSubmittingSig, setIsSubmittingSig] = useState<boolean>(false);
  const [submissionResult, setSubmissionResult] = useState<any>(null);
  const [sigError, setSigError] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  useEffect(() => {
    loadBanks();
  }, []);

  useEffect(() => {
    if (selectedBankId) {
      loadBankData();
    }
  }, [selectedBankId]);

  const loadBanks = async () => {
    try {
      const bankList = await fetchBanks();
      setBanks(bankList);
      if (bankList.length > 0) {
        setSelectedBankId(bankList[0].id);
      }
    } catch (err) {
      console.error('Failed to load banks:', err);
    }
  };

  const loadBankData = async () => {
    setIsLoading(true);
    setSubmissionResult(null);
    setGeneratedPayload(null);
    setGeneratedSignature('');
    setSigError(null);

    try {
      const [reqs, fdrsRes, keys] = await Promise.all([
        listBankPendingRequests(selectedBankId),
        fetchFDRs({ bank_id: selectedBankId, page_size: 50 }),
        fetchBankKeys(selectedBankId),
      ]);
      setPendingRequests(reqs);
      setBankFDRs(fdrsRes.items);
      setBankKeys(keys);

      if (fdrsRes.items.length > 0) {
        setSelectedFdrId(fdrsRes.items[0].id);
      } else {
        setSelectedFdrId('');
      }
    } catch (err) {
      console.error('Failed to load bank data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateSignature = async () => {
    if (!selectedFdrId) return;
    setIsSigning(true);
    setSigError(null);
    setSubmissionResult(null);

    try {
      // Call backend mock-bank sign endpoint (private key stays isolated on backend)
      const res = await mockBankSignFDR(selectedFdrId);
      setGeneratedPayload(res.signed_payload);
      setGeneratedSignature(res.signature_hex);
    } catch (err: any) {
      setSigError(err.message || 'Failed to generate digital signature.');
    } finally {
      setIsSigning(false);
    }
  };

  const handleSubmitSignature = async () => {
    if (!selectedFdrId || !generatedPayload || !generatedSignature) return;
    setIsSubmittingSig(true);
    setSigError(null);

    try {
      const res = await submitDigitalSignature(selectedFdrId, generatedPayload, generatedSignature);
      setSubmissionResult(res);
      // Reload FDR list to reflect updated Tier 3 status
      const updated = await fetchFDRs({ bank_id: selectedBankId, page_size: 50 });
      setBankFDRs(updated.items);
    } catch (err: any) {
      setSigError(err.message || 'Signature rejected by FDR-Chain Gateway.');
    } finally {
      setIsSubmittingSig(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(label);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const selectedBank = banks.find((b) => b.id === selectedBankId);
  const selectedFdr = bankFDRs.find((f) => f.id === selectedFdrId);

  return (
    <div className="space-y-6">
      {/* Simulation Banner */}
      <div className="p-4 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-start gap-2.5">
          <Landmark className="w-5 h-5 text-indigo-700 shrink-0 mt-0.5" />
          <div>
            <div className="font-bold flex items-center gap-2 text-indigo-900">
              <span>Simulated Commercial Bank Integration Environment</span>
              <span className="px-2 py-0.5 text-[10px] uppercase font-bold rounded bg-indigo-200 text-indigo-900">
                Phase 3 Prototype
              </span>
            </div>
            <p className="mt-0.5 text-indigo-800 leading-relaxed text-[11px]">
              Demonstrating commercial depository bank nodal workflows, single-use token review (Tier 2), and RFC 8032 Ed25519 digital signature generation & verification (Tier 3).
            </p>
          </div>
        </div>

        {/* Bank Switcher */}
        <div className="shrink-0 flex items-center gap-2">
          <label className="font-semibold text-indigo-950 text-xs">Active Bank:</label>
          <select
            value={selectedBankId}
            onChange={(e) => setSelectedBankId(e.target.value)}
            className="px-3 py-1.5 text-xs font-semibold rounded border border-indigo-300 bg-white text-indigo-900 focus:outline-none focus:ring-1 focus:ring-indigo-500 shadow-xs"
          >
            {banks.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name} ({b.code})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Tabs */}
      <div className="bg-white rounded-lg border border-gov-border shadow-xs overflow-hidden">
        <div className="flex border-b border-gov-border px-6 pt-3 bg-gray-50/70">
          <button
            onClick={() => setActiveTab('signature')}
            className={`pb-3 px-4 text-xs font-bold uppercase tracking-wider flex items-center gap-2 border-b-2 transition-colors ${
              activeTab === 'signature'
                ? 'border-gov-navy text-gov-navy'
                : 'border-transparent text-gov-muted hover:text-gov-text'
            }`}
          >
            <FileSignature className="w-4 h-4 text-emerald-600" />
            <span>Tier 3: Digital Signature Workbench</span>
          </button>

          <button
            onClick={() => setActiveTab('pending')}
            className={`pb-3 px-4 text-xs font-bold uppercase tracking-wider flex items-center gap-2 border-b-2 transition-colors ${
              activeTab === 'pending'
                ? 'border-gov-navy text-gov-navy'
                : 'border-transparent text-gov-muted hover:text-gov-text'
            }`}
          >
            <Clock className="w-4 h-4 text-blue-600" />
            <span>Tier 2: Pending Requests</span>
            {pendingRequests.length > 0 && (
              <span className="px-1.5 py-0.2 bg-blue-100 text-blue-800 rounded-full text-[10px]">
                {pendingRequests.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('keys')}
            className={`pb-3 px-4 text-xs font-bold uppercase tracking-wider flex items-center gap-2 border-b-2 transition-colors ${
              activeTab === 'keys'
                ? 'border-gov-navy text-gov-navy'
                : 'border-transparent text-gov-muted hover:text-gov-text'
            }`}
          >
            <Key className="w-4 h-4 text-amber-600" />
            <span>Registered Public Keys ({bankKeys.length})</span>
          </button>
        </div>

        {/* Tab 1: Digital Signature Workbench (Tier 3) */}
        {activeTab === 'signature' && (
          <div className="p-6 space-y-6">
            <div>
              <h2 className="text-sm font-bold text-gov-navy uppercase tracking-wider flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                Ed25519 Digital Signature Attestation Workbench
              </h2>
              <p className="text-xs text-gov-muted mt-0.5">
                Select an institutional FDR lodged with <strong className="text-gov-navy">{selectedBank?.name}</strong>, construct the canonical JSON payload, sign with the bank's Ed25519 private key, and verify against the gateway.
              </p>
            </div>

            {/* FDR Selector */}
            <div className="p-4 bg-gov-bg rounded-lg border border-gov-border space-y-3">
              <label className="block text-xs font-semibold text-gov-text">
                Target Fixed Deposit Receipt (Lodged at {selectedBank?.code}) *
              </label>
              {bankFDRs.length === 0 ? (
                <p className="text-xs text-gov-muted italic">No FDR records currently lodged at this bank.</p>
              ) : (
                <select
                  value={selectedFdrId}
                  onChange={(e) => setSelectedFdrId(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-gov-border rounded bg-white font-mono text-gov-navy font-semibold focus:outline-none focus:ring-1 focus:ring-gov-navy"
                >
                  {bankFDRs.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.fdr_number} — ₹{(Number(f.amount) / 100000).toFixed(2)} Lakh ({f.institution_name}) [Tier {f.trust_tier}]
                    </option>
                  ))}
                </select>
              )}

              {selectedFdr && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11px] pt-1">
                  <div>
                    <span className="text-gov-muted block">Depositor Entity:</span>
                    <span className="font-semibold text-gov-navy">{selectedFdr.institution_name}</span>
                  </div>
                  <div>
                    <span className="text-gov-muted block">Principal Amount:</span>
                    <span className="font-mono font-bold text-emerald-700">₹{Number(selectedFdr.amount).toLocaleString('en-IN')}</span>
                  </div>
                  <div>
                    <span className="text-gov-muted block">Current Trust Tier:</span>
                    <TrustTierBadge tier={selectedFdr.trust_tier} size="sm" />
                  </div>
                  <div>
                    <span className="text-gov-muted block">Maturity Date:</span>
                    <span className="font-medium text-gov-text">{selectedFdr.maturity_date}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Action Button 1: Generate Signature */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleGenerateSignature}
                disabled={!selectedFdrId || isSigning}
                className="px-4 py-2 bg-gov-navy text-white hover:bg-gov-navy/90 text-xs font-bold rounded flex items-center gap-2 shadow-xs transition-colors disabled:opacity-50"
              >
                <FileSignature className="w-4 h-4 text-gov-gold" />
                <span>{isSigning ? 'Computing Canonical Signature...' : 'Generate & Sign Payload (Ed25519)'}</span>
              </button>

              {generatedSignature && (
                <button
                  type="button"
                  onClick={handleSubmitSignature}
                  disabled={isSubmittingSig}
                  className="px-5 py-2 bg-emerald-700 text-white hover:bg-emerald-800 text-xs font-bold rounded flex items-center gap-2 shadow-xs transition-colors disabled:opacity-50 animate-in fade-in"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>{isSubmittingSig ? 'Verifying...' : 'Submit Digital Signature to Gateway (Promote to Tier 3)'}</span>
                </button>
              )}
            </div>

            {/* Messages */}
            {sigError && (
              <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{sigError}</span>
              </div>
            )}

            {submissionResult && (
              <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs space-y-2">
                <div className="flex items-center gap-2 font-bold text-emerald-800">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <span>15-Point Verification Passed: Promoted to Trust Tier 3 (Signature Verified)!</span>
                </div>
                <p className="text-[11px] text-emerald-700 leading-relaxed">
                  Attestation Reference: <strong className="font-mono">{submissionResult.attestation_id}</strong> | Key ID: <strong className="font-mono">{submissionResult.key_id}</strong>
                </p>
              </div>
            )}

            {/* Generated Cryptographic Artifacts Preview */}
            {generatedPayload && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                {/* Canonical JSON Payload */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-gov-navy">Deterministic Canonical JSON Payload</span>
                    <button
                      onClick={() => copyToClipboard(JSON.stringify(generatedPayload, null, 2), 'payload')}
                      className="text-[11px] text-gov-blue hover:underline flex items-center gap-1"
                    >
                      {copiedKey === 'payload' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedKey === 'payload' ? 'Copied' : 'Copy JSON'}</span>
                    </button>
                  </div>
                  <pre className="p-3 bg-gray-900 text-emerald-400 font-mono text-[10px] rounded border border-gray-700 max-h-60 overflow-y-auto leading-relaxed">
                    {JSON.stringify(generatedPayload, null, 2)}
                  </pre>
                </div>

                {/* Ed25519 Signature */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-gov-navy">Asymmetric Signature (64-byte Ed25519 Hex)</span>
                    <button
                      onClick={() => copyToClipboard(generatedSignature, 'sig')}
                      className="text-[11px] text-gov-blue hover:underline flex items-center gap-1"
                    >
                      {copiedKey === 'sig' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedKey === 'sig' ? 'Copied' : 'Copy Hex'}</span>
                    </button>
                  </div>
                  <div className="p-3 bg-gray-900 text-amber-300 font-mono text-[11px] rounded border border-gray-700 break-all max-h-60 overflow-y-auto leading-relaxed">
                    {generatedSignature}
                  </div>
                  <p className="text-[10px] text-gov-muted mt-1">
                    Algorithm: <span className="font-mono text-gov-navy font-semibold">Ed25519 (Curve25519 / SHA-512)</span> | Signing Key: <span className="font-mono">{generatedPayload.key_id}</span>
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Pending Requests (Tier 2) */}
        {activeTab === 'pending' && (
          <div className="p-6 space-y-4">
            <div>
              <h2 className="text-sm font-bold text-gov-navy uppercase tracking-wider flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-600" />
                Outstanding Tier 2 Verification Requests
              </h2>
              <p className="text-xs text-gov-muted mt-0.5">
                Depositor institutions have requested official bank confirmation for the deposits listed below.
              </p>
            </div>

            {pendingRequests.length === 0 ? (
              <div className="text-center py-10 bg-gov-bg rounded border border-dashed border-gov-border">
                <CheckCircle2 className="w-8 h-8 text-gov-muted mx-auto mb-2 opacity-50" />
                <p className="text-xs text-gov-muted">No pending Tier 2 verification requests for {selectedBank?.name}.</p>
              </div>
            ) : (
              <div className="divide-y divide-gov-border border border-gov-border rounded-lg overflow-hidden">
                {pendingRequests.map((req) => (
                  <div key={req.id} className="p-4 bg-white hover:bg-gray-50 flex items-center justify-between gap-4 text-xs">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-gov-navy text-sm">
                          {req.fdr_snapshot.fdr_number}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-100 text-blue-800">
                          Pending Bank Review
                        </span>
                      </div>
                      <div className="text-gov-muted text-[11px]">
                        Amount: <strong className="font-mono text-gov-text">₹{Number(req.fdr_snapshot.amount).toLocaleString('en-IN')}</strong> | Expiry: {new Date(req.expires_at).toLocaleDateString('en-IN')}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {req.raw_token && (
                        <button
                          onClick={() => navigate(`/bank/verify/${req.raw_token}`)}
                          className="px-3.5 py-1.5 bg-gov-navy text-white text-xs font-semibold rounded hover:bg-gov-navy/90 flex items-center gap-1.5"
                        >
                          <span>Review & Confirm</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Registered Bank Keys */}
        {activeTab === 'keys' && (
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-gov-navy uppercase tracking-wider flex items-center gap-2">
                  <Key className="w-4 h-4 text-amber-600" />
                  Bank Public Key Registry ({selectedBank?.name})
                </h2>
                <p className="text-xs text-gov-muted mt-0.5">
                  Public keys registered with FDR-Chain for authenticating inbound Ed25519 digital signatures.
                </p>
              </div>
              <button
                onClick={() => navigate('/admin/bank-keys')}
                className="px-3 py-1.5 bg-gov-bg border border-gov-border text-gov-navy text-xs font-semibold rounded hover:bg-gray-100 flex items-center gap-1.5"
              >
                <span>Manage All Keys</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="divide-y divide-gov-border border border-gov-border rounded-lg overflow-hidden">
              {bankKeys.map((k) => (
                <div key={k.id} className="p-4 bg-white space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-gov-navy text-sm">{k.key_id}</span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                        k.is_active && !k.is_revoked ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {k.is_active && !k.is_revoked ? 'Active / Valid' : 'Revoked'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] text-gov-muted">
                    <div>Algorithm: <span className="font-mono text-gov-text font-medium">{k.algorithm}</span></div>
                    <div>Valid Until: <span className="font-medium text-gov-text">{new Date(k.valid_until).toLocaleDateString('en-IN')}</span></div>
                    <div>Raw Hex: <span className="font-mono text-[10px] truncate block">{k.public_key_raw_hex}</span></div>
                  </div>

                  <div className="pt-1">
                    <pre className="p-2.5 bg-gray-900 text-gray-300 font-mono text-[10px] rounded overflow-x-auto">
                      {k.public_key_pem}
                    </pre>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
