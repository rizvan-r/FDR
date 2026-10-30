import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Bank, BankType } from '../../types';
import { fetchBanks, createBank } from '../../lib/api';
import { Modal } from '../../components/ui/Modal';
import { Badge } from '../../components/ui/Badge';
import {
  Landmark,
  Plus,
  Search,
  Eye,
  GitBranch,
  ExternalLink,
  Mail,
  Phone,
  AlertCircle,
  Building,
} from 'lucide-react';

const BANK_TYPES: { value: BankType; label: string }[] = [
  { value: 'public_sector', label: 'Public Sector Bank' },
  { value: 'private_sector', label: 'Private Sector Bank' },
  { value: 'scheduled_commercial', label: 'Scheduled Commercial' },
  { value: 'regional_rural', label: 'Regional Rural' },
  { value: 'cooperative', label: 'Cooperative Bank' },
];

export const BanksListPage: React.FC = () => {
  const { activeRole } = useAuth();
  const isAdmin = activeRole === 'system_admin';

  const [banks, setBanks] = useState<Bank[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    bank_type: 'public_sector' as BankType,
    headquarters: '',
    nodal_contact_name: '',
    contact_email: '',
    contact_phone: '',
    website: '',
    is_active: true,
  });
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const data = await fetchBanks();
      setBanks(data);
    } catch (err) {
      console.error('Failed to load banks:', err);
    } finally {
      setLoading(false);
    }
  }

  const handleOpenAdd = () => {
    setFormData({
      code: '',
      name: '',
      bank_type: 'public_sector',
      headquarters: '',
      nodal_contact_name: '',
      contact_email: '',
      contact_phone: '',
      website: '',
      is_active: true,
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!formData.code || !formData.name || !formData.contact_email) {
      setFormError('Bank code, name, and official nodal email are required.');
      return;
    }

    setIsSubmitting(true);
    try {
      await createBank(formData);
      await loadData();
      setIsModalOpen(false);
    } catch (err: any) {
      setFormError(err.message || 'Failed to register bank.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filtered = banks.filter((b) => {
    const matchesSearch =
      b.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (b.headquarters && b.headquarters.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesType = !selectedType || b.bank_type === selectedType;

    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-6">
      {/* Top Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-gov-navy">Scheduled Banks Directory</h1>
            <Badge variant="navy">Financial Master</Badge>
          </div>
          <p className="text-xs text-gov-muted mt-0.5">
            Designated commercial and public sector banking partners maintaining security deposit FDR liens
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-md bg-gov-navy hover:bg-[#0d2847] text-white text-xs font-semibold shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            <span>Register Scheduled Bank</span>
          </button>
        )}
      </div>

      {/* Search and Filters */}
      <div className="bg-white p-4 rounded-lg border border-gov-border shadow-gov flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-gov-muted absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search bank name, IFSC prefix code (e.g. SBIN, PUNB), or headquarters..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs border border-gov-border rounded-md focus:outline-none focus:ring-2 focus:ring-gov-blue"
          />
        </div>

        <div className="w-full md:w-56">
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="w-full py-2 px-2 text-xs border border-gov-border rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-gov-blue"
          >
            <option value="">All Bank Classifications</option>
            {BANK_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Banks Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {loading ? (
          <div className="col-span-full text-center py-12 text-gov-muted">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gov-navy mb-2"></div>
            <p className="text-xs">Loading scheduled bank registry...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="col-span-full bg-white p-8 rounded-lg border border-gov-border text-center text-xs text-gov-muted">
            No banks found matching your search.
          </div>
        ) : (
          filtered.map((bank) => (
            <div
              key={bank.id}
              className="bg-white rounded-lg border border-gov-border shadow-gov p-5 flex flex-col justify-between hover:border-gov-blue transition"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-gov-navy text-white">
                    {bank.code}
                  </span>
                  <Badge variant={bank.bank_type === 'public_sector' ? 'info' : 'default'}>
                    {bank.bank_type.replace(/_/g, ' ')}
                  </Badge>
                </div>

                <h2 className="text-base font-bold text-gov-navy">{bank.name}</h2>
                <p className="text-xs text-gov-muted mt-0.5 flex items-center gap-1">
                  <Building className="w-3.5 h-3.5" />
                  <span>HQ: {bank.headquarters || 'India'}</span>
                </p>

                <div className="mt-4 pt-3 border-t border-gov-border space-y-1.5 text-xs text-gov-text">
                  <div className="flex items-center gap-1.5 text-gov-muted">
                    <Mail className="w-3.5 h-3.5" />
                    <span className="truncate">{bank.contact_email}</span>
                  </div>
                  {bank.contact_phone && (
                    <div className="flex items-center gap-1.5 text-gov-muted">
                      <Phone className="w-3.5 h-3.5" />
                      <span>{bank.contact_phone}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-gov-border flex items-center justify-between">
                <span className="text-xs font-semibold text-gov-navy flex items-center gap-1.5">
                  <GitBranch className="w-3.5 h-3.5 text-gov-blue" />
                  <span>{bank.branch_count ?? 1} Designated Branches</span>
                </span>

                <Link
                  to={`/banks/${bank.id}`}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-gov-light text-gov-navy hover:bg-gov-navy hover:text-white text-xs font-semibold transition"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>View Branches</span>
                </Link>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal: Add Bank */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Register Scheduled Commercial Bank"
        subtitle="Establish bank master record for branch IFSC mapping"
        maxWidth="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {formError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-gov-navy mb-1" htmlFor="b-code">
                IFSC Prefix Code <span className="text-gov-danger">*</span>
              </label>
              <input
                id="b-code"
                type="text"
                required
                maxLength={4}
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                placeholder="e.g. SBIN"
                className="w-full px-3 py-2 border border-gov-border rounded-md font-mono focus:ring-2 focus:ring-gov-blue"
              />
              <span className="text-[10px] text-gov-muted">4-letter prefix standard</span>
            </div>

            <div>
              <label className="block font-bold text-gov-navy mb-1" htmlFor="b-type">
                Bank Classification
              </label>
              <select
                id="b-type"
                value={formData.bank_type}
                onChange={(e) => setFormData({ ...formData, bank_type: e.target.value as BankType })}
                className="w-full px-3 py-2 border border-gov-border rounded-md bg-white focus:ring-2 focus:ring-gov-blue"
              >
                {BANK_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block font-bold text-gov-navy mb-1" htmlFor="b-name">
              Bank Official Name <span className="text-gov-danger">*</span>
            </label>
            <input
              id="b-name"
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. State Bank of India"
              className="w-full px-3 py-2 border border-gov-border rounded-md focus:ring-2 focus:ring-gov-blue"
            />
          </div>

          <div>
            <label className="block font-bold text-gov-navy mb-1" htmlFor="b-hq">
              Headquarters City & State
            </label>
            <input
              id="b-hq"
              type="text"
              value={formData.headquarters}
              onChange={(e) => setFormData({ ...formData, headquarters: e.target.value })}
              placeholder="Mumbai, Maharashtra"
              className="w-full px-3 py-2 border border-gov-border rounded-md focus:ring-2 focus:ring-gov-blue"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-gov-navy mb-1" htmlFor="b-email">
                Nodal FDR Desk Email <span className="text-gov-danger">*</span>
              </label>
              <input
                id="b-email"
                type="email"
                required
                value={formData.contact_email}
                onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                placeholder="nodal.fdr@bank.co.in"
                className="w-full px-3 py-2 border border-gov-border rounded-md focus:ring-2 focus:ring-gov-blue"
              />
            </div>

            <div>
              <label className="block font-bold text-gov-navy mb-1" htmlFor="b-phone">
                Nodal Telephone
              </label>
              <input
                id="b-phone"
                type="text"
                value={formData.contact_phone}
                onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                placeholder="+91-22-22740000"
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
              {isSubmitting ? 'Registering...' : 'Register Bank'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
