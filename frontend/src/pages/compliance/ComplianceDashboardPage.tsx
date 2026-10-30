import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ScrollText,
  FileText,
  PlusCircle,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Search,
  Filter,
  RefreshCw,
  ArrowRight,
  PenTool,
} from 'lucide-react';
import { ComplianceDocument } from '../../types';
import { fetchComplianceDocuments } from '../../lib/api';

export const ComplianceDashboardPage: React.FC = () => {
  const [documents, setDocuments] = useState<ComplianceDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const loadDocs = async () => {
    setIsLoading(true);
    try {
      const data = await fetchComplianceDocuments();
      setDocuments(data);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDocs();
  }, []);

  const totalDocs = documents.length;
  const pendingReview = documents.filter((d) => d.document_status === 'submitted_for_review').length;
  const approvedDocs = documents.filter((d) => d.document_status === 'approved' || d.document_status === 'finalized').length;
  const signedDocs = documents.filter((d) => d.document_status === 'signed').length;

  const filteredDocs = documents.filter((d) => {
    const matchesSearch =
      d.document_title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.reference_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (d.fdr_number && d.fdr_number.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = statusFilter === 'all' || d.document_status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft':
        return 'bg-slate-100 text-slate-700 border-slate-200';
      case 'submitted_for_review':
        return 'bg-amber-50 text-amber-800 border-amber-200';
      case 'approved':
        return 'bg-blue-50 text-blue-800 border-blue-200';
      case 'returned_for_correction':
        return 'bg-rose-50 text-rose-800 border-rose-200';
      case 'finalized':
        return 'bg-purple-50 text-purple-800 border-purple-200';
      case 'signed':
        return 'bg-emerald-50 text-emerald-800 border-emerald-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white border border-gov-border rounded-lg p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
              Phase 7 Module
            </span>
            <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
              Statutory Letter & Notice Engine
            </span>
          </div>
          <h1 className="text-xl font-bold text-gov-navy">
            Compliance Document Registry
          </h1>
          <p className="text-xs text-gov-muted mt-0.5">
            Generation, supervisory review, official letterheads, version snapshots, and mock e-signatures.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/compliance/templates"
            className="px-3.5 py-2 border border-gov-border hover:bg-gov-light text-gov-navy rounded-md font-semibold text-xs shadow-2xs transition flex items-center gap-1.5"
          >
            <FileText className="w-4 h-4 text-gov-blue" />
            <span>Statutory Templates</span>
          </Link>

          <Link
            to="/compliance/generate"
            className="inline-flex items-center gap-2 px-4 py-2 bg-gov-navy hover:bg-gov-navy-light text-white rounded-md font-semibold text-xs shadow-xs transition"
          >
            <PlusCircle className="w-4 h-4 text-emerald-400" />
            <span>Generate Document</span>
          </Link>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 border border-gov-border rounded-lg shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gov-muted">Total Documents</span>
            <ScrollText className="w-4 h-4 text-gov-blue" />
          </div>
          <p className="text-2xl font-bold text-gov-navy mt-2">{totalDocs}</p>
          <span className="text-[10px] text-gov-muted mt-1 block">Active regulatory notices & letters</span>
        </div>

        <div className="bg-white p-4 border border-gov-border rounded-lg shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gov-muted">Pending Supervisory Review</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-2xl font-bold text-amber-700 mt-2">{pendingReview}</p>
          <span className="text-[10px] text-amber-800 mt-1 block font-medium">Awaiting directorate approval</span>
        </div>

        <div className="bg-white p-4 border border-gov-border rounded-lg shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gov-muted">Approved & Finalized</span>
            <CheckCircle2 className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-blue-700 mt-2">{approvedDocs}</p>
          <span className="text-[10px] text-gov-muted mt-1 block">Ready for official dispatch</span>
        </div>

        <div className="bg-white p-4 border border-gov-border rounded-lg shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gov-muted">Demonstration Signed</span>
            <PenTool className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-bold text-emerald-700 mt-2">{signedDocs}</p>
          <span className="text-[10px] text-emerald-800 mt-1 block font-medium">E-sealed with demo disclaimer</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-gov-border rounded-lg p-4 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-3.5 h-3.5 text-gov-muted absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search reference, title or FDR number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs border border-gov-border rounded-md bg-gov-light/30 focus:outline-hidden focus:border-gov-blue"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-3.5 h-3.5 text-gov-muted" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs border border-gov-border rounded-md p-1.5 bg-white focus:outline-hidden"
          >
            <option value="all">All Lifecycle States</option>
            <option value="draft">Draft</option>
            <option value="submitted_for_review">Submitted for Review</option>
            <option value="approved">Approved</option>
            <option value="returned_for_correction">Returned for Correction</option>
            <option value="finalized">Finalized PDF</option>
            <option value="signed">Mock E-Signed</option>
          </select>
        </div>
      </div>

      {/* Documents List */}
      <div className="border border-gov-border rounded-lg overflow-hidden bg-white shadow-2xs">
        <div className="p-3 bg-gov-light border-b border-gov-border flex items-center justify-between">
          <span className="text-xs font-bold text-gov-navy">Registered Documents</span>
          <span className="text-[11px] text-gov-muted">{filteredDocs.length} Documents</span>
        </div>

        {filteredDocs.length === 0 ? (
          <div className="p-8 text-center text-xs text-gov-muted">
            No compliance letters found matching filter criteria.
          </div>
        ) : (
          <div className="divide-y divide-gov-border">
            {filteredDocs.map((doc) => (
              <Link
                key={doc.id}
                to={`/compliance/documents/${doc.id}`}
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/60 transition block"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-xs text-gov-navy hover:text-gov-blue">
                      {doc.document_title}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase ${getStatusBadge(
                        doc.document_status
                      )}`}
                    >
                      {doc.document_status.replace(/_/g, ' ')}
                    </span>
                    <span className="text-[10px] font-mono px-1.5 py-0.2 bg-slate-100 text-slate-700 rounded border border-slate-200">
                      v{doc.current_version}
                    </span>
                  </div>

                  <p className="text-[11px] text-gov-muted">
                    Ref: <span className="font-mono font-semibold text-gov-navy">{doc.reference_number}</span> •{' '}
                    Target FDR: <span className="font-mono">{doc.fdr_number || 'N/A'}</span> • Beneficiary:{' '}
                    {doc.institution_name}
                  </p>
                </div>

                <div className="flex items-center gap-4 text-xs">
                  <span className="text-[11px] text-gov-muted">
                    {new Date(doc.updated_at || doc.created_at).toLocaleDateString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </span>
                  <ArrowRight className="w-4 h-4 text-gov-muted" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
