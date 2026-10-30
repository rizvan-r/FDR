import React, { useState, useEffect } from 'react';
import { Key, Plus, ShieldAlert, CheckCircle2, AlertCircle, X, Search, Landmark, Clock, Slash } from 'lucide-react';
import { fetchBankKeys, registerBankKey, revokeBankKey, fetchBanks } from '../../lib/api';
import { BankKey, Bank } from '../../types';

export const BankKeysPage: React.FC = () => {
  const [keys, setKeys] = useState<BankKey[]>([]);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [filterBank, setFilterBank] = useState<string>('');

  // Register Modal State
  const [showRegisterModal, setShowRegisterModal] = useState<boolean>(false);
  const [targetBankId, setTargetBankId] = useState<string>('');
  const [keyId, setKeyId] = useState<string>('');
  const [algorithm, setAlgorithm] = useState<string>('Ed25519');
  const [publicKeyPem, setPublicKeyPem] = useState<string>('');
  const [validDays, setValidDays] = useState<number>(365);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Revoke Modal State
  const [showRevokeModal, setShowRevokeModal] = useState<boolean>(false);
  const [selectedKeyForRevoke, setSelectedKeyForRevoke] = useState<BankKey | null>(null);
  const [revocationReason, setRevocationReason] = useState<string>('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [allKeys, allBanks] = await Promise.all([
        fetchBankKeys(),
        fetchBanks(),
      ]);
      setKeys(allKeys);
      setBanks(allBanks);
      if (allBanks.length > 0) {
        setTargetBankId(allBanks[0].id);
      }
    } catch (err: any) {
      console.error('Failed to load bank keys:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetBankId || !keyId.trim() || !publicKeyPem.trim()) {
      setErrorMessage('Please fill in all mandatory fields.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const validUntil = new Date(Date.now() + validDays * 24 * 3600 * 1000).toISOString();
      const newKey = await registerBankKey({
        bank_id: targetBankId,
        key_id: keyId.trim().toUpperCase(),
        algorithm,
        public_key_pem: publicKeyPem.trim(),
        valid_until: validUntil,
      });

      setSuccessMessage(`Public key '${newKey.key_id}' registered successfully in government registry.`);
      setShowRegisterModal(false);
      setKeyId('');
      setPublicKeyPem('');
      loadData();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to register bank public key.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRevokeKey = async () => {
    if (!selectedKeyForRevoke || !revocationReason.trim()) return;

    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await revokeBankKey(selectedKeyForRevoke.key_id, revocationReason.trim());
      setSuccessMessage(`Key '${selectedKeyForRevoke.key_id}' has been revoked. Reason recorded in audit log.`);
      setShowRevokeModal(false);
      setSelectedKeyForRevoke(null);
      setRevocationReason('');
      loadData();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to revoke key.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredKeys = keys.filter((k) => {
    const matchesSearch =
      k.key_id.toLowerCase().includes(search.toLowerCase()) ||
      k.bank_name?.toLowerCase().includes(search.toLowerCase());
    const matchesBank = !filterBank || k.bank_id === filterBank;
    return matchesSearch && matchesBank;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-lg border border-gov-border shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase bg-[#12345A]/10 text-gov-navy rounded">
              Phase 3 Cryptography
            </span>
            <span className="text-xs text-gov-muted font-medium">Asymmetric Public Key Registry</span>
          </div>
          <h1 className="text-2xl font-bold text-gov-navy tracking-tight mt-1">
            Bank Public Key Management
          </h1>
          <p className="text-sm text-gov-muted mt-0.5">
            Register, rotate, and revoke authorized commercial bank public keys for authenticating inbound Ed25519 digital signatures.
          </p>
        </div>

        <button
          onClick={() => setShowRegisterModal(true)}
          className="px-4 py-2.5 bg-gov-navy text-white text-xs font-bold rounded hover:bg-gov-navy/90 flex items-center gap-2 shadow-xs transition-colors self-start sm:self-auto"
        >
          <Plus className="w-4 h-4 text-gov-gold" />
          <span>Register New Public Key</span>
        </button>
      </div>

      {/* Messages */}
      {errorMessage && (
        <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {successMessage && (
        <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-lg border border-gov-border shadow-xs flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gov-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by Key ID or Bank Name..."
            className="w-full pl-8 pr-3 py-1.5 text-xs border border-gov-border rounded bg-white text-gov-text focus:outline-none focus:ring-1 focus:ring-gov-navy"
          />
        </div>

        <select
          value={filterBank}
          onChange={(e) => setFilterBank(e.target.value)}
          className="w-full sm:w-48 px-3 py-1.5 text-xs border border-gov-border rounded bg-white text-gov-text focus:outline-none focus:ring-1 focus:ring-gov-navy"
        >
          <option value="">All Depository Banks</option>
          {banks.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name} ({b.code})
            </option>
          ))}
        </select>
      </div>

      {/* Keys Table */}
      <div className="bg-white rounded-lg border border-gov-border overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50 border-b border-gov-border text-gov-muted uppercase text-[10px] tracking-wider font-semibold">
              <tr>
                <th className="py-3 px-4">Key ID & Bank</th>
                <th className="py-3 px-4">Algorithm</th>
                <th className="py-3 px-4">Validity Window</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gov-border">
              {filteredKeys.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-gov-muted">
                    No registered bank public keys match your filters.
                  </td>
                </tr>
              ) : (
                filteredKeys.map((k) => (
                  <tr key={k.id} className="hover:bg-gray-50/70">
                    <td className="py-3 px-4">
                      <div className="font-mono font-bold text-gov-navy">{k.key_id}</div>
                      <div className="text-[11px] text-gov-muted mt-0.5">{k.bank_name || 'Commercial Bank'}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-mono px-2 py-0.5 bg-gray-100 rounded text-gov-text">
                        {k.algorithm}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-[11px]">
                      <div>
                        Valid until: <strong className="text-gov-text">{new Date(k.valid_until).toLocaleDateString('en-IN')}</strong>
                      </div>
                      <div className="text-gov-muted">
                        Registered: {new Date(k.valid_from).toLocaleDateString('en-IN')}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      {k.is_active && !k.is_revoked ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 inline-flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>Active</span>
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-800 inline-flex items-center gap-1">
                          <Slash className="w-3 h-3 text-red-600" />
                          <span>Revoked</span>
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {k.is_active && !k.is_revoked && (
                        <button
                          onClick={() => {
                            setSelectedKeyForRevoke(k);
                            setShowRevokeModal(true);
                          }}
                          className="px-2.5 py-1 text-[11px] font-semibold text-red-700 bg-red-50 hover:bg-red-100 rounded border border-red-200 transition-colors"
                        >
                          Revoke Key
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Register Key Modal */}
      {showRegisterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-lg border border-gov-border max-w-lg w-full shadow-xl overflow-hidden">
            <div className="bg-gov-navy text-white px-6 py-4 flex items-center justify-between">
              <h3 className="font-bold text-sm tracking-wide flex items-center gap-2">
                <Key className="w-4 h-4 text-gov-gold" />
                Register Bank Ed25519 Public Key
              </h3>
              <button
                onClick={() => setShowRegisterModal(false)}
                className="text-white/80 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleRegisterKey} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block text-xs font-semibold text-gov-text mb-1">
                  Issuing Depository Bank *
                </label>
                <select
                  value={targetBankId}
                  onChange={(e) => setTargetBankId(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-gov-border rounded bg-white"
                  required
                >
                  {banks.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gov-text mb-1">
                  Canonical Key Identifier (Key ID) *
                </label>
                <input
                  type="text"
                  value={keyId}
                  onChange={(e) => setKeyId(e.target.value)}
                  placeholder="e.g. SBIN-ED25519-2026-ROTATED"
                  className="w-full px-3 py-2 text-xs font-mono border border-gov-border rounded focus:outline-none focus:ring-1 focus:ring-gov-navy uppercase"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gov-text mb-1">
                  Algorithm Standard
                </label>
                <input
                  type="text"
                  value={algorithm}
                  disabled
                  className="w-full px-3 py-2 text-xs font-mono bg-gray-100 border border-gov-border rounded text-gov-muted cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gov-text mb-1">
                  Public Key (PEM Format: SubjectPublicKeyInfo) *
                </label>
                <textarea
                  value={publicKeyPem}
                  onChange={(e) => setPublicKeyPem(e.target.value)}
                  placeholder="-----BEGIN PUBLIC KEY-----\nMCowBQYDK2VwAyEA...\n-----END PUBLIC KEY-----"
                  rows={4}
                  className="w-full px-3 py-2 text-xs font-mono border border-gov-border rounded focus:outline-none focus:ring-1 focus:ring-gov-navy"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gov-text mb-1">
                  Validity Period (Days)
                </label>
                <input
                  type="number"
                  min="30"
                  max="1095"
                  value={validDays}
                  onChange={(e) => setValidDays(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs border border-gov-border rounded focus:outline-none focus:ring-1 focus:ring-gov-navy"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-gov-border">
                <button
                  type="button"
                  onClick={() => setShowRegisterModal(false)}
                  className="px-3.5 py-1.5 text-xs text-gov-muted hover:text-gov-text"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-1.5 bg-gov-navy text-white text-xs font-bold rounded hover:bg-gov-navy/90 disabled:opacity-50"
                >
                  {isSubmitting ? 'Registering...' : 'Register Public Key'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Revoke Key Modal */}
      {showRevokeModal && selectedKeyForRevoke && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-lg border border-gov-border max-w-md w-full p-6 space-y-4 shadow-xl">
            <h3 className="text-sm font-bold text-red-900 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-red-600" />
              Revoke Public Key ({selectedKeyForRevoke.key_id})
            </h3>
            <p className="text-xs text-gov-muted leading-relaxed">
              Revoking this key will immediately prevent any future Tier 3 digital signature attestations signed under this key ID. Existing historical attestations will remain retained for audit purposes.
            </p>
            <div>
              <label className="block text-xs font-semibold text-gov-text mb-1">
                Audited Revocation Reason *
              </label>
              <textarea
                value={revocationReason}
                onChange={(e) => setRevocationReason(e.target.value)}
                placeholder="State reason for key revocation (e.g. annual rotation, scheduled key decommissioning, or key replacement)..."
                rows={3}
                className="w-full px-3 py-2 text-xs border border-gov-border rounded focus:outline-none focus:ring-1 focus:ring-red-500"
                required
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowRevokeModal(false)}
                className="px-3 py-1.5 text-xs font-semibold text-gov-muted hover:text-gov-text"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRevokeKey}
                disabled={isSubmitting || !revocationReason.trim()}
                className="px-4 py-1.5 bg-red-600 text-white text-xs font-semibold rounded hover:bg-red-700 disabled:opacity-50"
              >
                {isSubmitting ? 'Revoking...' : 'Confirm Revocation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
