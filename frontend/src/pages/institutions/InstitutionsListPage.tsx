import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Institution, Region, InstitutionType } from '../../types';
import { fetchInstitutions, fetchRegions, createInstitution, updateInstitution } from '../../lib/api';
import { Modal } from '../../components/ui/Modal';
import { Badge } from '../../components/ui/Badge';
import {
  Building2,
  Plus,
  Search,
  Filter,
  Eye,
  Edit2,
  CheckCircle,
  XCircle,
  ExternalLink,
  AlertCircle,
} from 'lucide-react';

const INSTITUTION_TYPES: { value: InstitutionType; label: string }[] = [
  { value: 'central_psu', label: 'Central PSU' },
  { value: 'state_psu', label: 'State PSU' },
  { value: 'government_department', label: 'Government Department' },
  { value: 'statutory_corporation', label: 'Statutory Corporation' },
  { value: 'autonomous_body', label: 'Autonomous Body' },
  { value: 'other', label: 'Other' },
];

export const InstitutionsListPage: React.FC = () => {
  const { activeRole } = useAuth();
  const isAdmin = activeRole === 'system_admin';

  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [regions, setRegions] = useState<Region[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRegion, setSelectedRegion] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingInstitution, setEditingInstitution] = useState<Institution | null>(null);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    institution_type: 'government_department' as InstitutionType,
    region_id: '',
    registration_number: '',
    nodal_ministry: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
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
      const [instList, regList] = await Promise.all([fetchInstitutions(), fetchRegions()]);
      setInstitutions(instList);
      setRegions(regList);
    } catch (err) {
      console.error('Failed to load institutions:', err);
    } finally {
      setLoading(false);
    }
  }

  const handleOpenAdd = () => {
    setEditingInstitution(null);
    setFormData({
      code: '',
      name: '',
      institution_type: 'government_department',
      region_id: regions[0]?.id || '',
      registration_number: '',
      nodal_ministry: '',
      address: '',
      city: '',
      state: '',
      pincode: '',
      contact_email: '',
      contact_phone: '',
      website: '',
      is_active: true,
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (inst: Institution) => {
    setEditingInstitution(inst);
    setFormData({
      code: inst.code,
      name: inst.name,
      institution_type: inst.institution_type,
      region_id: inst.region_id || '',
      registration_number: inst.registration_number || '',
      nodal_ministry: inst.nodal_ministry || '',
      address: inst.address || '',
      city: inst.city || '',
      state: inst.state || '',
      pincode: inst.pincode || '',
      contact_email: inst.contact_email,
      contact_phone: inst.contact_phone || '',
      website: inst.website || '',
      is_active: inst.is_active,
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!formData.code || !formData.name || !formData.contact_email) {
      setFormError('Institution code, name, and official email are mandatory.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingInstitution) {
        await updateInstitution(editingInstitution.id, formData);
      } else {
        await createInstitution(formData);
      }
      await loadData();
      setIsModalOpen(false);
    } catch (err: any) {
      setFormError(err.message || 'Operation failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (inst: Institution) => {
    if (!isAdmin) return;
    try {
      await updateInstitution(inst.id, { is_active: !inst.is_active });
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to update institution status.');
    }
  };

  // Filter logic
  const filtered = institutions.filter((inst) => {
    const matchesSearch =
      inst.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inst.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (inst.nodal_ministry && inst.nodal_ministry.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesRegion = !selectedRegion || inst.region_id === selectedRegion;
    const matchesType = !selectedType || inst.institution_type === selectedType;

    return matchesSearch && matchesRegion && matchesType;
  });

  const totalPages = Math.ceil(filtered.length / itemsPerPage) || 1;
  const paginated = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="space-y-6">
      {/* Page Title & Top Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-gov-navy">Institutions Master</h1>
            <Badge variant="navy">Master Directory</Badge>
          </div>
          <p className="text-xs text-gov-muted mt-0.5">
            Government departments, Central & State PSUs, and statutory depositor organizations
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-md bg-gov-navy hover:bg-[#0d2847] text-white text-xs font-semibold shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Institution</span>
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-lg border border-gov-border shadow-gov flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-gov-muted absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by institution name, code (e.g. INST-NHAI), or ministry..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-9 pr-3 py-2 text-xs border border-gov-border rounded-md focus:outline-none focus:ring-2 focus:ring-gov-blue"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="flex items-center gap-1.5 w-1/2 md:w-44">
            <Filter className="w-3.5 h-3.5 text-gov-muted shrink-0" />
            <select
              value={selectedRegion}
              onChange={(e) => {
                setSelectedRegion(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full py-2 px-2 text-xs border border-gov-border rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-gov-blue"
            >
              <option value="">All Regions</option>
              {regions.map((reg) => (
                <option key={reg.id} value={reg.id}>
                  {reg.name}
                </option>
              ))}
            </select>
          </div>

          <div className="w-1/2 md:w-44">
            <select
              value={selectedType}
              onChange={(e) => {
                setSelectedType(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full py-2 px-2 text-xs border border-gov-border rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-gov-blue"
            >
              <option value="">All Types</option>
              {INSTITUTION_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Institutions Table */}
      <div className="bg-white rounded-lg border border-gov-border shadow-gov overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-gov-bg border-b border-gov-border text-gov-muted font-bold uppercase text-[10px] tracking-wider">
                <th className="py-3 px-4">Code</th>
                <th className="py-3 px-4">Institution Name</th>
                <th className="py-3 px-4">Entity Type</th>
                <th className="py-3 px-4">Jurisdiction Region</th>
                <th className="py-3 px-4">Nodal Ministry</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gov-border">
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-gov-muted">
                    <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-gov-navy mr-2"></div>
                    Loading registered institutions...
                  </td>
                </tr>
              ) : paginated.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-gov-muted">
                    No institutions match your search criteria.
                  </td>
                </tr>
              ) : (
                paginated.map((inst) => (
                  <tr key={inst.id} className="hover:bg-gov-light/50 transition">
                    <td className="py-3 px-4 font-mono font-bold text-gov-navy">{inst.code}</td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-gov-navy">{inst.name}</div>
                      <div className="text-[11px] text-gov-muted">{inst.contact_email}</div>
                    </td>
                    <td className="py-3 px-4 capitalize">
                      <Badge variant="default">{inst.institution_type.replace(/_/g, ' ')}</Badge>
                    </td>
                    <td className="py-3 px-4 text-gov-text">
                      {inst.region?.name || 'Unassigned'}
                    </td>
                    <td className="py-3 px-4 text-gov-muted text-[11px] max-w-[200px] truncate">
                      {inst.nodal_ministry || '—'}
                    </td>
                    <td className="py-3 px-4">
                      {inst.is_active ? (
                        <Badge variant="success">Active</Badge>
                      ) : (
                        <Badge variant="danger">Inactive</Badge>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          to={`/institutions/${inst.id}`}
                          className="p-1.5 text-gov-muted hover:text-gov-navy hover:bg-gov-bg rounded"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>

                        {isAdmin && (
                          <>
                            <button
                              onClick={() => handleOpenEdit(inst)}
                              className="p-1.5 text-gov-muted hover:text-gov-blue hover:bg-gov-bg rounded"
                              title="Edit Institution"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleToggleStatus(inst)}
                              className={`p-1.5 rounded ${
                                inst.is_active
                                  ? 'text-gov-danger hover:bg-red-50'
                                  : 'text-gov-success hover:bg-emerald-50'
                              }`}
                              title={inst.is_active ? 'Deactivate' : 'Activate'}
                            >
                              {inst.is_active ? (
                                <XCircle className="w-4 h-4" />
                              ) : (
                                <CheckCircle className="w-4 h-4" />
                              )}
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="bg-gov-bg/40 px-4 py-3 border-t border-gov-border flex items-center justify-between text-xs text-gov-muted">
          <span>
            Showing {filtered.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1} to{' '}
            {Math.min(currentPage * itemsPerPage, filtered.length)} of {filtered.length} institutions
          </span>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-2.5 py-1 rounded border border-gov-border bg-white hover:bg-gov-bg disabled:opacity-40 text-gov-navy font-semibold"
            >
              Previous
            </button>
            <span className="px-2 text-gov-navy font-bold">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-2.5 py-1 rounded border border-gov-border bg-white hover:bg-gov-bg disabled:opacity-40 text-gov-navy font-semibold"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Add / Edit Institution Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingInstitution ? 'Edit Institution Master' : 'Register New Institution'}
        subtitle="Manage government departments, PSUs, and public agencies"
        maxWidth="2xl"
      >
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {formError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-gov-navy mb-1" htmlFor="m-code">
                Institution Code <span className="text-gov-danger">*</span>
              </label>
              <input
                id="m-code"
                type="text"
                required
                disabled={Boolean(editingInstitution)}
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                placeholder="e.g. INST-NHAI"
                className="w-full px-3 py-2 border border-gov-border rounded-md font-mono focus:ring-2 focus:ring-gov-blue disabled:bg-gray-100"
              />
              <span className="text-[10px] text-gov-muted">Unique identifier across national portal</span>
            </div>

            <div>
              <label className="block font-bold text-gov-navy mb-1" htmlFor="m-name">
                Institution Full Name <span className="text-gov-danger">*</span>
              </label>
              <input
                id="m-name"
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. National Highways Authority of India"
                className="w-full px-3 py-2 border border-gov-border rounded-md focus:ring-2 focus:ring-gov-blue"
              />
            </div>

            <div>
              <label className="block font-bold text-gov-navy mb-1" htmlFor="m-type">
                Entity Classification
              </label>
              <select
                id="m-type"
                value={formData.institution_type}
                onChange={(e) =>
                  setFormData({ ...formData, institution_type: e.target.value as InstitutionType })
                }
                className="w-full px-3 py-2 border border-gov-border rounded-md bg-white focus:ring-2 focus:ring-gov-blue"
              >
                {INSTITUTION_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-gov-navy mb-1" htmlFor="m-region">
                Jurisdiction Region
              </label>
              <select
                id="m-region"
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
              <label className="block font-bold text-gov-navy mb-1" htmlFor="m-ministry">
                Nodal Ministry / Department
              </label>
              <input
                id="m-ministry"
                type="text"
                value={formData.nodal_ministry}
                onChange={(e) => setFormData({ ...formData, nodal_ministry: e.target.value })}
                placeholder="Ministry of Road Transport and Highways"
                className="w-full px-3 py-2 border border-gov-border rounded-md focus:ring-2 focus:ring-gov-blue"
              />
            </div>

            <div>
              <label className="block font-bold text-gov-navy mb-1" htmlFor="m-regno">
                Registration / Act Number
              </label>
              <input
                id="m-regno"
                type="text"
                value={formData.registration_number}
                onChange={(e) => setFormData({ ...formData, registration_number: e.target.value })}
                placeholder="NHAI/ACT/1988/01"
                className="w-full px-3 py-2 border border-gov-border rounded-md focus:ring-2 focus:ring-gov-blue"
              />
            </div>

            <div>
              <label className="block font-bold text-gov-navy mb-1" htmlFor="m-email">
                Official Nodal Email <span className="text-gov-danger">*</span>
              </label>
              <input
                id="m-email"
                type="email"
                required
                value={formData.contact_email}
                onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                placeholder="fdr.desk@agency.gov.in"
                className="w-full px-3 py-2 border border-gov-border rounded-md focus:ring-2 focus:ring-gov-blue"
              />
            </div>

            <div>
              <label className="block font-bold text-gov-navy mb-1" htmlFor="m-phone">
                Nodal Contact Phone
              </label>
              <input
                id="m-phone"
                type="text"
                value={formData.contact_phone}
                onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                placeholder="+91-11-25074100"
                className="w-full px-3 py-2 border border-gov-border rounded-md focus:ring-2 focus:ring-gov-blue"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-gov-navy mb-1" htmlFor="m-addr">
              Headquarters Postal Address
            </label>
            <input
              id="m-addr"
              type="text"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="G 5&6, Sector-10, Dwarka, New Delhi"
              className="w-full px-3 py-2 border border-gov-border rounded-md focus:ring-2 focus:ring-gov-blue"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block font-bold text-gov-navy mb-1" htmlFor="m-city">
                City
              </label>
              <input
                id="m-city"
                type="text"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                placeholder="New Delhi"
                className="w-full px-3 py-2 border border-gov-border rounded-md focus:ring-2 focus:ring-gov-blue"
              />
            </div>
            <div>
              <label className="block font-bold text-gov-navy mb-1" htmlFor="m-state">
                State
              </label>
              <input
                id="m-state"
                type="text"
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                placeholder="Delhi"
                className="w-full px-3 py-2 border border-gov-border rounded-md focus:ring-2 focus:ring-gov-blue"
              />
            </div>
            <div>
              <label className="block font-bold text-gov-navy mb-1" htmlFor="m-pin">
                PIN Code
              </label>
              <input
                id="m-pin"
                type="text"
                value={formData.pincode}
                onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                placeholder="110075"
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
              {isSubmitting ? 'Saving...' : editingInstitution ? 'Save Changes' : 'Register Institution'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
