import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Region } from '../../types';
import { fetchRegions, createRegion, updateRegion } from '../../lib/api';
import { Modal } from '../../components/ui/Modal';
import { Badge } from '../../components/ui/Badge';
import {
  MapPin,
  Plus,
  Search,
  Edit2,
  CheckCircle,
  XCircle,
  AlertCircle,
  Globe,
} from 'lucide-react';

export const RegionsListPage: React.FC = () => {
  const { activeRole } = useAuth();
  const isAdmin = activeRole === 'system_admin';

  const [regions, setRegions] = useState<Region[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRegion, setEditingRegion] = useState<Region | null>(null);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    state_coverage: '',
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
      const data = await fetchRegions();
      setRegions(data);
    } catch (err) {
      console.error('Failed to load regions:', err);
    } finally {
      setLoading(false);
    }
  }

  const handleOpenAdd = () => {
    setEditingRegion(null);
    setFormData({
      code: '',
      name: '',
      description: '',
      state_coverage: '',
      is_active: true,
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (reg: Region) => {
    setEditingRegion(reg);
    setFormData({
      code: reg.code,
      name: reg.name,
      description: reg.description || '',
      state_coverage: (reg.state_coverage || []).join(', '),
      is_active: reg.is_active,
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!formData.code || !formData.name) {
      setFormError('Region code and name are required.');
      return;
    }

    setIsSubmitting(true);
    const parsedStates = formData.state_coverage
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    try {
      if (editingRegion) {
        await updateRegion(editingRegion.id, {
          code: formData.code,
          name: formData.name,
          description: formData.description,
          state_coverage: parsedStates,
          is_active: formData.is_active,
        });
      } else {
        await createRegion({
          code: formData.code,
          name: formData.name,
          description: formData.description,
          state_coverage: parsedStates,
          is_active: formData.is_active,
        });
      }
      await loadData();
      setIsModalOpen(false);
    } catch (err: any) {
      setFormError(err.message || 'Failed to save region.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (reg: Region) => {
    if (!isAdmin) return;
    try {
      await updateRegion(reg.id, { is_active: !reg.is_active });
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to update region status.');
    }
  };

  const filtered = regions.filter(
    (reg) =>
      reg.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      reg.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (reg.state_coverage || []).some((s) => s.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-gov-navy">Regions & Territorial Jurisdictions</h1>
            <Badge variant="navy">Geographic Master</Badge>
          </div>
          <p className="text-xs text-gov-muted mt-0.5">
            Zonal divisions defining regional oversight scopes for Regional Officers and institutions
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-md bg-gov-navy hover:bg-[#0d2847] text-white text-xs font-semibold shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Region</span>
          </button>
        )}
      </div>

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-lg border border-gov-border shadow-gov">
        <div className="relative w-full">
          <Search className="w-4 h-4 text-gov-muted absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search regions by code (e.g. REG-NR), zone name, or state (e.g. Delhi, Maharashtra)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs border border-gov-border rounded-md focus:outline-none focus:ring-2 focus:ring-gov-blue"
          />
        </div>
      </div>

      {/* Regions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {loading ? (
          <div className="col-span-full text-center py-12 text-gov-muted">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gov-navy mb-2"></div>
            <p className="text-xs">Loading regional jurisdictions...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="col-span-full bg-white p-8 rounded-lg border border-gov-border text-center text-xs text-gov-muted">
            No regions found matching your search.
          </div>
        ) : (
          filtered.map((reg) => (
            <div
              key={reg.id}
              className="bg-white rounded-lg border border-gov-border shadow-gov p-5 flex flex-col justify-between hover:border-gov-blue transition"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-gov-navy text-white">
                    {reg.code}
                  </span>
                  {reg.is_active ? (
                    <Badge variant="success">Active</Badge>
                  ) : (
                    <Badge variant="danger">Inactive</Badge>
                  )}
                </div>

                <h2 className="text-base font-bold text-gov-navy">{reg.name}</h2>
                <p className="text-xs text-gov-muted mt-1 leading-relaxed">
                  {reg.description || 'Territorial jurisdiction division'}
                </p>

                {/* State Coverage Tags */}
                <div className="mt-4 pt-3 border-t border-gov-border">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gov-muted block mb-1.5">
                    States & UTs Covered ({reg.state_coverage?.length || 0}):
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {(reg.state_coverage || []).map((st, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 rounded text-[10px] font-medium bg-gov-light text-gov-navy border border-gov-border"
                      >
                        {st}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Admin Actions */}
              {isAdmin && (
                <div className="mt-5 pt-3 border-t border-gov-border flex items-center justify-end gap-2">
                  <button
                    onClick={() => handleOpenEdit(reg)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded border border-gov-border hover:bg-gov-bg text-gov-blue"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Edit</span>
                  </button>
                  <button
                    onClick={() => handleToggleStatus(reg)}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded border ${
                      reg.is_active
                        ? 'border-red-200 text-gov-danger hover:bg-red-50'
                        : 'border-emerald-200 text-gov-success hover:bg-emerald-50'
                    }`}
                  >
                    {reg.is_active ? 'Deactivate' : 'Activate'}
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Modal: Add / Edit Region */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingRegion ? 'Edit Jurisdiction Region' : 'Define New Region'}
        subtitle="Specify territorial boundaries and state coverage"
        maxWidth="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {formError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div>
            <label className="block font-bold text-gov-navy mb-1" htmlFor="r-code">
              Region Code <span className="text-gov-danger">*</span>
            </label>
            <input
              id="r-code"
              type="text"
              required
              disabled={Boolean(editingRegion)}
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
              placeholder="e.g. REG-NR"
              className="w-full px-3 py-2 border border-gov-border rounded-md font-mono focus:ring-2 focus:ring-gov-blue disabled:bg-gray-100"
            />
          </div>

          <div>
            <label className="block font-bold text-gov-navy mb-1" htmlFor="r-name">
              Region Name <span className="text-gov-danger">*</span>
            </label>
            <input
              id="r-name"
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Northern Region"
              className="w-full px-3 py-2 border border-gov-border rounded-md focus:ring-2 focus:ring-gov-blue"
            />
          </div>

          <div>
            <label className="block font-bold text-gov-navy mb-1" htmlFor="r-desc">
              Description & Jurisdiction Notes
            </label>
            <textarea
              id="r-desc"
              rows={2}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Jurisdiction covering North Indian states and UTs"
              className="w-full px-3 py-2 border border-gov-border rounded-md focus:ring-2 focus:ring-gov-blue"
            />
          </div>

          <div>
            <label className="block font-bold text-gov-navy mb-1" htmlFor="r-states">
              States & Union Territories (comma separated)
            </label>
            <textarea
              id="r-states"
              rows={3}
              value={formData.state_coverage}
              onChange={(e) => setFormData({ ...formData, state_coverage: e.target.value })}
              placeholder="Delhi, Punjab, Haryana, Himachal Pradesh, Jammu & Kashmir"
              className="w-full px-3 py-2 border border-gov-border rounded-md focus:ring-2 focus:ring-gov-blue"
            />
            <span className="text-[10px] text-gov-muted">
              Used to enforce jurisdiction isolation for Regional Officers.
            </span>
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
              {isSubmitting ? 'Saving...' : editingRegion ? 'Save Changes' : 'Create Region'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
