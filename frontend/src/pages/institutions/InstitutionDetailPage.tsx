import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Institution } from '../../types';
import { fetchInstitutionById } from '../../lib/api';
import { Badge } from '../../components/ui/Badge';
import {
  Building2,
  ArrowLeft,
  Mail,
  Phone,
  Globe,
  MapPin,
  FileText,
  Calendar,
  ExternalLink,
} from 'lucide-react';

export const InstitutionDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [institution, setInstitution] = useState<Institution | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchInstitutionById(id)
        .then((data) => setInstitution(data))
        .catch((err) => console.error(err))
        .finally(() => setLoading(false));
    }
  }, [id]);

  if (loading) {
    return (
      <div className="text-center py-12 text-gov-muted">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gov-navy mb-2"></div>
        <p className="text-xs">Loading institution profile...</p>
      </div>
    );
  }

  if (!institution) {
    return (
      <div className="bg-white p-8 rounded-lg border border-gov-border text-center">
        <h2 className="text-base font-bold text-gov-navy">Institution Not Found</h2>
        <p className="text-xs text-gov-muted mt-1">The requested institutional record does not exist.</p>
        <Link to="/institutions" className="mt-4 inline-flex items-center gap-1.5 text-xs text-gov-blue hover:underline font-semibold">
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Institutions Master</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back button */}
      <div>
        <Link
          to="/institutions"
          className="inline-flex items-center gap-1.5 text-xs text-gov-blue hover:underline font-semibold"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Institutions Directory</span>
        </Link>
      </div>

      {/* Main Profile Header */}
      <div className="bg-white rounded-lg border border-gov-border shadow-gov p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-lg bg-gov-light text-gov-navy flex items-center justify-center border border-gov-border shrink-0">
              <Building2 className="w-7 h-7 text-gov-navy" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-gov-navy text-white">
                  {institution.code}
                </span>
                <Badge variant="navy">{institution.institution_type.replace(/_/g, ' ')}</Badge>
                {institution.is_active ? (
                  <Badge variant="success">Active Status</Badge>
                ) : (
                  <Badge variant="danger">Inactive</Badge>
                )}
              </div>
              <h1 className="text-xl font-bold text-gov-navy">{institution.name}</h1>
              <p className="text-xs text-gov-muted mt-0.5">
                {institution.nodal_ministry || 'Government of India Entity'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Jurisdiction & Registration */}
        <div className="bg-white rounded-lg border border-gov-border shadow-gov p-5 space-y-4">
          <h2 className="text-xs font-bold text-gov-navy uppercase tracking-wider border-b border-gov-border pb-2 flex items-center gap-2">
            <FileText className="w-4 h-4 text-gov-blue" />
            Governance & Jurisdiction Information
          </h2>

          <div className="space-y-3 text-xs">
            <div>
              <span className="text-gov-muted block text-[11px]">Nodal Ministry / Department</span>
              <span className="font-semibold text-gov-navy">{institution.nodal_ministry || '—'}</span>
            </div>

            <div>
              <span className="text-gov-muted block text-[11px]">Registration / Statute Act No.</span>
              <span className="font-semibold text-gov-navy">{institution.registration_number || '—'}</span>
            </div>

            <div>
              <span className="text-gov-muted block text-[11px]">Assigned Regional Jurisdiction</span>
              <span className="font-semibold text-gov-navy">
                {institution.region ? `${institution.region.name} (${institution.region.code})` : 'Unassigned'}
              </span>
            </div>

            <div>
              <span className="text-gov-muted block text-[11px]">System Record Enrolled</span>
              <span className="font-mono text-gov-text">
                {new Date(institution.created_at).toLocaleDateString('en-IN', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                })}
              </span>
            </div>
          </div>
        </div>

        {/* Contact & Location */}
        <div className="bg-white rounded-lg border border-gov-border shadow-gov p-5 space-y-4">
          <h2 className="text-xs font-bold text-gov-navy uppercase tracking-wider border-b border-gov-border pb-2 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-gov-blue" />
            Official Nodal Communications
          </h2>

          <div className="space-y-3 text-xs">
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-gov-muted" />
              <div>
                <span className="text-gov-muted block text-[11px]">Nodal Email</span>
                <a href={`mailto:${institution.contact_email}`} className="font-semibold text-gov-blue hover:underline">
                  {institution.contact_email}
                </a>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-gov-muted" />
              <div>
                <span className="text-gov-muted block text-[11px]">Contact Telephone</span>
                <span className="font-semibold text-gov-navy">{institution.contact_phone || '—'}</span>
              </div>
            </div>

            {institution.website && (
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-gov-muted" />
                <div>
                  <span className="text-gov-muted block text-[11px]">Official Portal</span>
                  <a
                    href={institution.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold text-gov-blue hover:underline inline-flex items-center gap-1"
                  >
                    <span>{institution.website}</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            )}

            <div>
              <span className="text-gov-muted block text-[11px]">Headquarters Address</span>
              <p className="font-medium text-gov-text mt-0.5 leading-relaxed">
                {institution.address || 'Address not listed'}, {institution.city}, {institution.state} -{' '}
                {institution.pincode}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
