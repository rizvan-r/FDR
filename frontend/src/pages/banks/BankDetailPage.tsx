import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Bank, BankBranch, Region } from '../../types';
import { fetchBankById, fetchBranchesByBankId, fetchRegions, createBranch } from '../../lib/api';
import { Modal } from '../../components/ui/Modal';
import { Badge } from '../../components/ui/Badge';
import {
  Landmark,
  ArrowLeft,
  Plus,
  GitBranch,
  Mail,
  Phone,
  MapPin,
  CheckCircle,
  AlertCircle,
  Info,
} from 'lucide-react';

export const BankDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { activeRole } = useAuth();
  const isAdmin = activeRole === 'system_admin';
  const isBankOfficer = activeRole === 'bank_nodal_officer';
  const canAddBranch = isAdmin || isBankOfficer;

  const [bank, setBank] = useState<Bank | null>(null);
  const [branches, setBranches] = useState<BankBranch[]>([]);
  const [regions, setRegions] = useState<Region[]>([]);
  const [loading, setLoading] = useState(true);

  // Add Branch Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    branch_name: '',
    branch_code: '',
    ifsc_code: '',
    region_id: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    contact_email: '',
    contact_phone: '',
    is_active: true,
  });
  const [ifscValidationMsg, setIfscValidationMsg] = useState('');
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (id) {
      loadData(id);
    }
  }, [id]);

  async function loadData(bankId: string) {
    setLoading(true);
    try {
      const [bankData, branchData, regionData] = await Promise.all([
        fetchBankById(bankId),
        fetchBranchesByBankId(bankId),
        fetchRegions(),
      ]);
      setBank(bankData);
      setBranches(branchData);
      setRegions(regionData);
    } catch (err) {
      console.error('Error loading bank details:', err);
    } finally {
      setLoading(false);
    }
  }

  // Real-time IFSC code validation check
  const handleIfscChange = (val: string) => {
    const uppercase = val.toUpperCase().trim();
    setFormData((prev) => ({ ...prev, ifsc_code: uppercase }));

    if (!uppercase) {
      setIfscValidationMsg('');
      return;
    }

    const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
    if (uppercase.length === 11) {
      if (ifscRegex.test(uppercase)) {
        setIfscValidationMsg('Valid Indian IFSC code format (4 letters, 0, 6 alphanumeric).');
      } else {
        setIfscValidationMsg('Invalid format: 5th character must be zero (0).');
      }
    } else {
      setIfscValidationMsg(`Format requires 11 characters (Currently ${uppercase.length}/11).`);
    }
  };

  const handleOpenAddBranch = () => {
    if (!bank) return;
    setFormData({
      branch_name: '',
      branch_code: '',
      ifsc_code: bank.code ? `${bank.code}0` : '',
      region_id: regions[0]?.id || '',
      address: '',
      city: '',
      state: '',
      pincode: '',
      contact_email: '',
      contact_phone: '',
      is_active: true,
    });
    setIfscValidationMsg('');
    setFormError('');
    setIsModalOpen(true);
  };

  const handleSubmitBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!bank) return;
    if (!formData.branch_name || !formData.ifsc_code) {
      setFormError('Branch name and IFSC code are required.');
      return;
    }

    setIsSubmitting(true);
    try {
      await createBranch({
        ...formData,
        bank_id: bank.id,
      });
      await loadData(bank.id);
      setIsModalOpen(false);
    } catch (err: any) {
      setFormError(err.message || 'Failed to register branch.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12 text-gov-muted">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gov-navy mb-2"></div>
        <p className="text-xs">Loading bank profile and branches...</p>
      </div>
    );
  }

  if (!bank) {
    return (
      <div className="bg-white p-8 rounded-lg border border-gov-border text-center">
        <h2 className="text-base font-bold text-gov-navy">Bank Not Found</h2>
        <p className="text-xs text-gov-muted mt-1">The requested bank record does not exist.</p>
        <Link to="/banks" className="mt-4 inline-flex items-center gap-1.5 text-xs text-gov-blue hover:underline font-semibold">
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Banks Directory</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back button */}
      <div>
        <Link
          to="/banks"
          className="inline-flex items-center gap-1.5 text-xs text-gov-blue hover:underline font-semibold"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Banks Directory</span>
        </Link>
      </div>

      {/* Bank Profile Banner */}
      <div className="bg-white rounded-lg border border-gov-border shadow-gov p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-lg bg-gov-light text-gov-navy flex items-center justify-center border border-gov-border shrink-0">
              <Landmark className="w-7 h-7 text-gov-navy" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-gov-navy text-white">
                  {bank.code}
                </span>
                <Badge variant="navy">{bank.bank_type.replace(/_/g, ' ')}</Badge>
                <Badge variant="success">Active Partner Bank</Badge>
              </div>
              <h1 className="text-xl font-bold text-gov-navy">{bank.name}</h1>
              <p className="text-xs text-gov-muted mt-0.5">
                Headquarters: {bank.headquarters || 'India'} • Nodal Email: {bank.contact_email}
              </p>
            </div>
          </div>

          {canAddBranch && (
            <button
              onClick={handleOpenAddBranch}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-md bg-gov-navy hover:bg-[#0d2847] text-white text-xs font-semibold shadow-sm transition"
            >
              <Plus className="w-4 h-4" />
              <span>Add Designated Branch</span>
            </button>
          )}
        </div>

        {/* Phase Boundary Notice */}
        <div className="mt-4 p-3 bg-amber-50/70 border border-amber-200/80 rounded text-xs text-amber-900 flex items-start gap-2">
          <Info className="w-4 h-4 text-amber-700 mt-0.5 shrink-0" />
          <div className="leading-relaxed">
            <span className="font-semibold">Phase 1 Boundary Notice: </span>
            This screen manages institutional bank branches and IFSC directory master data. Direct bank FDR electronic verification, dual-custody lien marking, and Ed25519 digital signatures will be activated in Phase 2.
          </div>
        </div>
      </div>

      {/* Branches List Table */}
      <div className="bg-white rounded-lg border border-gov-border shadow-gov overflow-hidden">
        <div className="px-5 py-3.5 bg-gov-bg border-b border-gov-border flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-gov-navy flex items-center gap-2">
            <GitBranch className="w-4 h-4 text-gov-blue" />
            <span>Designated Bank Branches ({branches.length})</span>
          </h2>
          <span className="text-[11px] text-gov-muted">Verified Indian IFSC Standard</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-white border-b border-gov-border text-gov-muted font-bold uppercase text-[10px] tracking-wider">
                <th className="py-3 px-4">IFSC Code</th>
                <th className="py-3 px-4">Branch Name</th>
                <th className="py-3 px-4">Branch Code</th>
                <th className="py-3 px-4">Jurisdiction Region</th>
                <th className="py-3 px-4">City / State</th>
                <th className="py-3 px-4">Official Contact</th>
                <th className="py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gov-border">
              {branches.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-gov-muted">
                    No branches registered yet for {bank.name}.
                  </td>
                </tr>
              ) : (
                branches.map((br) => (
                  <tr key={br.id} className="hover:bg-gov-light/40 transition">
                    <td className="py-3 px-4 font-mono font-bold text-gov-blue tracking-wide">
                      {br.ifsc_code}
                    </td>
                    <td className="py-3 px-4 font-semibold text-gov-navy">{br.branch_name}</td>
                    <td className="py-3 px-4 font-mono text-gov-muted">{br.branch_code || '—'}</td>
                    <td className="py-3 px-4 text-gov-text">{br.region?.name || 'Central'}</td>
                    <td className="py-3 px-4 text-gov-text">
                      {br.city ? `${br.city}, ${br.state || ''}` : '—'}
                    </td>
                    <td className="py-3 px-4 text-gov-muted text-[11px]">
                      {br.contact_email || br.contact_phone || '—'}
                    </td>
                    <td className="py-3 px-4">
                      {br.is_active ? (
                        <Badge variant="success">Active</Badge>
                      ) : (
                        <Badge variant="danger">Inactive</Badge>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Branch Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={`Register Designated Branch — ${bank.name}`}
        subtitle="Ensure valid 11-character Indian IFSC format"
        maxWidth="lg"
      >
        <form onSubmit={handleSubmitBranch} className="space-y-4 text-xs">
          {formError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div>
            <label className="block font-bold text-gov-navy mb-1" htmlFor="br-ifsc">
              IFSC Code <span className="text-gov-danger">*</span>
            </label>
            <input
              id="br-ifsc"
              type="text"
              required
              maxLength={11}
              value={formData.ifsc_code}
              onChange={(e) => handleIfscChange(e.target.value)}
              placeholder="e.g. SBIN0000691"
              className="w-full px-3 py-2 border border-gov-border rounded-md font-mono tracking-wider focus:ring-2 focus:ring-gov-blue"
            />
            {ifscValidationMsg && (
              <span
                className={`text-[11px] block mt-1 font-medium ${
                  ifscValidationMsg.includes('Valid') ? 'text-gov-success' : 'text-gov-danger'
                }`}
              >
                {ifscValidationMsg}
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-gov-navy mb-1" htmlFor="br-name">
                Branch Name <span className="text-gov-danger">*</span>
              </label>
              <input
                id="br-name"
                type="text"
                required
                value={formData.branch_name}
                onChange={(e) => setFormData({ ...formData, branch_name: e.target.value })}
                placeholder="e.g. New Delhi Main Branch"
                className="w-full px-3 py-2 border border-gov-border rounded-md focus:ring-2 focus:ring-gov-blue"
              />
            </div>

            <div>
              <label className="block font-bold text-gov-navy mb-1" htmlFor="br-code">
                Branch Code
              </label>
              <input
                id="br-code"
                type="text"
                value={formData.branch_code}
                onChange={(e) => setFormData({ ...formData, branch_code: e.target.value })}
                placeholder="00691"
                className="w-full px-3 py-2 border border-gov-border rounded-md font-mono focus:ring-2 focus:ring-gov-blue"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-gov-navy mb-1" htmlFor="br-region">
              Jurisdiction Region
            </label>
            <select
              id="br-region"
              value={formData.region_id}
              onChange={(e) => setFormData({ ...formData, region_id: e.target.value })}
              className="w-full px-3 py-2 border border-gov-border rounded-md bg-white focus:ring-2 focus:ring-gov-blue"
            >
              <option value="">Select Region</option>
              {regions.map((reg) => (
                <option key={reg.id} value={reg.id}>
                  {reg.name} ({reg.code})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-bold text-gov-navy mb-1" htmlFor="br-addr">
              Branch Street Address
            </label>
            <input
              id="br-addr"
              type="text"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="11, Parliament Street"
              className="w-full px-3 py-2 border border-gov-border rounded-md focus:ring-2 focus:ring-gov-blue"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block font-bold text-gov-navy mb-1" htmlFor="br-city">
                City
              </label>
              <input
                id="br-city"
                type="text"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                placeholder="New Delhi"
                className="w-full px-3 py-2 border border-gov-border rounded-md focus:ring-2 focus:ring-gov-blue"
              />
            </div>

            <div>
              <label className="block font-bold text-gov-navy mb-1" htmlFor="br-state">
                State
              </label>
              <input
                id="br-state"
                type="text"
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                placeholder="Delhi"
                className="w-full px-3 py-2 border border-gov-border rounded-md focus:ring-2 focus:ring-gov-blue"
              />
            </div>

            <div>
              <label className="block font-bold text-gov-navy mb-1" htmlFor="br-pin">
                PIN Code
              </label>
              <input
                id="br-pin"
                type="text"
                value={formData.pincode}
                onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                placeholder="110001"
                className="w-full px-3 py-2 border border-gov-border rounded-md focus:ring-2 focus:ring-gov-blue"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-gov-navy mb-1" htmlFor="br-email">
                Branch Nodal Email
              </label>
              <input
                id="br-email"
                type="email"
                value={formData.contact_email}
                onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                placeholder="branch@bank.co.in"
                className="w-full px-3 py-2 border border-gov-border rounded-md focus:ring-2 focus:ring-gov-blue"
              />
            </div>

            <div>
              <label className="block font-bold text-gov-navy mb-1" htmlFor="br-phone">
                Branch Phone
              </label>
              <input
                id="br-phone"
                type="text"
                value={formData.contact_phone}
                onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                placeholder="+91-11-23374242"
                className="w-full px-3 py-2 border border-gov-border rounded-md focus:ring-2 focus:ring-gov-blue"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-gov-border flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 border border-gov-border rounded-md text-gov-text hover:bg-gov-bg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-gov-navy hover:bg-[#0c243f] text-white rounded-md font-semibold"
            >
              {isSubmitting ? 'Registering...' : 'Register Branch'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
