import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ScrollText,
  FileText,
  ArrowLeft,
  CheckCircle2,
  Clock,
  AlertCircle,
  Download,
  PenTool,
  Send,
  Edit3,
  Save,
  Check,
  RotateCcw,
  History,
  ShieldCheck,
  FileCheck,
} from 'lucide-react';
import { ComplianceDocument, ComplianceDocumentVersion } from '../../types';
import {
  fetchComplianceDocument,
  updateComplianceDocument,
  submitComplianceDocumentForReview,
  reviewComplianceDocument,
  finalizeComplianceDocument,
  mockSignComplianceDocument,
  fetchDocumentVersions,
} from '../../lib/api';
import { DocumentPreview } from '../../components/compliance/DocumentPreview';
import { MockSignatureModal } from '../../components/compliance/MockSignatureModal';
import { useAuth } from '../../contexts/AuthContext';

export const ComplianceDocumentDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { activeRole } = useAuth();

  const isSupervisor = activeRole === 'system_admin' || activeRole === 'bureau_officer' || activeRole === 'regional_officer';

  const [document, setDocument] = useState<ComplianceDocument | null>(null);
  const [versions, setVersions] = useState<ComplianceDocumentVersion[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState('');
  const [editedTitle, setEditedTitle] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Review state
  const [reviewAction, setReviewAction] = useState<'approved' | 'returned_for_correction'>('approved');
  const [reviewComments, setReviewComments] = useState('');
  const [isReviewing, setIsReviewing] = useState(false);

  // Modals & tabs
  const [isSignModalOpen, setIsSignModalOpen] = useState(false);
  const [activeView, setActiveView] = useState<'preview' | 'versions'>('preview');
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadDoc = async () => {
    if (!id) return;
    try {
      const data = await fetchComplianceDocument(id);
      setDocument(data);
      setEditedText(data.content_text);
      setEditedTitle(data.document_title);
      const vers = await fetchDocumentVersions(id);
      setVersions(vers);
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || 'Failed to load compliance document.' });
    }
  };

  useEffect(() => {
    loadDoc();
  }, [id]);

  const handleSaveDraft = async () => {
    if (!id) return;
    setIsSaving(true);
    setMsg(null);
    try {
      await updateComplianceDocument(id, {
        document_title: editedTitle,
        content_text: editedText,
      });
      setIsEditing(false);
      setMsg({ type: 'success', text: 'Draft updated and version snapshot recorded.' });
      await loadDoc();
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || 'Failed to save changes.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmitForReview = async () => {
    if (!id) return;
    setIsSaving(true);
    setMsg(null);
    try {
      await submitComplianceDocumentForReview(id);
      setMsg({ type: 'success', text: 'Document submitted for supervisory review.' });
      await loadDoc();
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || 'Submission failed.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleReviewDecision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setIsReviewing(true);
    setMsg(null);
    try {
      await reviewComplianceDocument(id, {
        action: reviewAction,
        comments: reviewComments,
      });
      setMsg({
        type: 'success',
        text: reviewAction === 'approved' ? 'Document approved for finalization.' : 'Document returned for correction.',
      });
      await loadDoc();
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || 'Review action failed.' });
    } finally {
      setIsReviewing(false);
    }
  };

  const handleFinalizePdf = async () => {
    if (!id) return;
    setIsSaving(true);
    setMsg(null);
    try {
      await finalizeComplianceDocument(id);
      setMsg({ type: 'success', text: 'PDF generated with official government letterhead branding.' });
      await loadDoc();
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || 'Finalization failed.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleMockSign = async (signerName: string) => {
    if (!id) return;
    try {
      await mockSignComplianceDocument(id, {
        signer_display_name: signerName,
        consent_acknowledged: true,
      });
      setMsg({
        type: 'success',
        text: 'Simulated digital e-signature affixed with statutory demonstration disclaimer.',
      });
      await loadDoc();
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || 'Signing failed.' });
    }
  };

  const handleDownloadPdf = () => {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
    window.open(`${apiUrl}/api/v1/compliance/documents/${id}/pdf`, '_blank');
  };

  if (!document) {
    return (
      <div className="p-8 text-center text-xs text-gov-muted">
        Loading compliance document details...
      </div>
    );
  }

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
      {/* Top Bar */}
      <div className="bg-white border border-gov-border rounded-lg p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <button
            onClick={() => navigate('/compliance')}
            className="text-xs font-semibold text-gov-navy hover:underline flex items-center gap-1 mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Document Registry</span>
          </button>

          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-xl font-bold text-gov-navy">{document.document_title}</h1>
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase ${getStatusBadge(
                document.document_status
              )}`}
            >
              {document.document_status.replace(/_/g, ' ')}
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 bg-slate-100 text-slate-700 rounded border border-slate-200">
              v{document.current_version}
            </span>
          </div>

          <p className="text-xs text-gov-muted">
            Reference: <span className="font-mono font-bold text-gov-navy">{document.reference_number}</span> •{' '}
            Institution: <strong>{document.institution_name}</strong> • Linked FDR:{' '}
            <span className="font-mono">{document.fdr_number || 'General Notice'}</span>
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Edit / Cancel Editing */}
          {(document.document_status === 'draft' || document.document_status === 'returned_for_correction') && (
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="px-3 py-1.5 border border-gov-border hover:bg-gov-light text-gov-navy rounded-md font-semibold text-xs shadow-2xs transition flex items-center gap-1.5"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>{isEditing ? 'Cancel Edit' : 'Edit Draft'}</span>
            </button>
          )}

          {/* Submit for Review */}
          {(document.document_status === 'draft' || document.document_status === 'returned_for_correction') && (
            <button
              onClick={handleSubmitForReview}
              disabled={isSaving}
              className="px-4 py-1.5 bg-gov-navy hover:bg-gov-navy-light text-white rounded-md font-semibold text-xs shadow-xs transition flex items-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5 text-emerald-400" />
              <span>Submit for Supervisory Review</span>
            </button>
          )}

          {/* Finalize PDF */}
          {document.document_status === 'approved' && (
            <button
              onClick={handleFinalizePdf}
              disabled={isSaving}
              className="px-4 py-1.5 bg-blue-700 hover:bg-blue-800 text-white rounded-md font-semibold text-xs shadow-xs transition flex items-center gap-1.5"
            >
              <FileCheck className="w-3.5 h-3.5" />
              <span>Finalize Official PDF</span>
            </button>
          )}

          {/* Mock E-Sign (Demonstration) */}
          {(document.document_status === 'approved' || document.document_status === 'finalized') && (
            <button
              onClick={() => setIsSignModalOpen(true)}
              className="px-4 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-md font-semibold text-xs shadow-xs transition flex items-center gap-1.5"
            >
              <PenTool className="w-3.5 h-3.5 text-amber-300" />
              <span>Affix Mock E-Sign (Demo)</span>
            </button>
          )}

          {/* Download PDF */}
          {(document.document_status === 'finalized' || document.document_status === 'signed') && (
            <button
              onClick={handleDownloadPdf}
              className="px-3.5 py-1.5 border border-gov-border hover:bg-gov-light text-gov-navy rounded-md font-semibold text-xs shadow-2xs transition flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5 text-gov-blue" />
              <span>Download PDF</span>
            </button>
          )}
        </div>
      </div>

      {/* Alert Banner */}
      {msg && (
        <div
          className={`p-3 rounded-md text-xs flex items-center gap-2 border ${
            msg.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
              : 'bg-rose-50 text-rose-900 border-rose-200'
          }`}
        >
          {msg.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          )}
          <span>{msg.text}</span>
        </div>
      )}

      {/* Supervisory Review Panel (Shown if submitted for review and user is supervisor) */}
      {document.document_status === 'submitted_for_review' && isSupervisor && (
        <div className="bg-amber-50/80 border border-amber-300 rounded-lg p-5 shadow-xs space-y-3">
          <div className="flex items-center gap-2 font-bold text-xs text-amber-900">
            <ShieldCheck className="w-4 h-4 text-amber-700" />
            <span>Supervisory Regulatory Adjudication Desk</span>
          </div>
          <p className="text-[11px] text-amber-800 leading-relaxed">
            Review the generated letter against Approval Process Handbook rules. You may approve the draft for finalization and simulated signing or return it with correction remarks.
          </p>

          <form onSubmit={handleReviewDecision} className="space-y-3 text-xs">
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-1.5 font-semibold text-gov-navy cursor-pointer">
                <input
                  type="radio"
                  name="reviewAction"
                  value="approved"
                  checked={reviewAction === 'approved'}
                  onChange={() => setReviewAction('approved')}
                  className="text-emerald-600 focus:ring-emerald-500"
                />
                <span>Approve Document</span>
              </label>

              <label className="flex items-center gap-1.5 font-semibold text-rose-800 cursor-pointer">
                <input
                  type="radio"
                  name="reviewAction"
                  value="returned_for_correction"
                  checked={reviewAction === 'returned_for_correction'}
                  onChange={() => setReviewAction('returned_for_correction')}
                  className="text-rose-600 focus:ring-rose-500"
                />
                <span>Return for Correction</span>
              </label>
            </div>

            <div>
              <textarea
                required
                rows={2}
                value={reviewComments}
                onChange={(e) => setReviewComments(e.target.value)}
                placeholder="Enter statutory review notes, verified parameters, or required corrections..."
                className="w-full p-2 border border-gov-border rounded bg-white text-xs focus:border-gov-blue focus:outline-hidden"
              />
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isReviewing || !reviewComments.trim()}
                className="px-4 py-1.5 bg-gov-navy hover:bg-gov-navy-light disabled:opacity-50 text-white rounded font-semibold text-xs shadow-xs transition"
              >
                {isReviewing ? 'Recording Adjudication...' : 'Submit Review Decision'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gov-border flex gap-4 text-xs font-semibold">
        <button
          onClick={() => setActiveView('preview')}
          className={`pb-2.5 transition border-b-2 ${
            activeView === 'preview'
              ? 'border-gov-blue text-gov-blue'
              : 'border-transparent text-gov-muted hover:text-gov-navy'
          }`}
        >
          Official Letterhead Preview
        </button>

        <button
          onClick={() => setActiveView('versions')}
          className={`pb-2.5 transition border-b-2 flex items-center gap-1.5 ${
            activeView === 'versions'
              ? 'border-gov-blue text-gov-blue'
              : 'border-transparent text-gov-muted hover:text-gov-navy'
          }`}
        >
          <History className="w-3.5 h-3.5" />
          <span>Version Snapshots ({versions.length})</span>
        </button>
      </div>

      {/* Main View */}
      {activeView === 'preview' ? (
        isEditing ? (
          /* Editor Mode */
          <div className="bg-white border border-gov-border rounded-lg p-6 shadow-2xs space-y-4 text-xs">
            <div className="space-y-1">
              <label className="block font-semibold text-gov-navy">Document Title</label>
              <input
                type="text"
                value={editedTitle}
                onChange={(e) => setEditedTitle(e.target.value)}
                className="w-full p-2 border border-gov-border rounded text-xs focus:border-gov-blue focus:outline-hidden"
              />
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="block font-semibold text-gov-navy">Letter Body Content</label>
                <span className="text-[10px] text-gov-muted">{editedText.length} characters</span>
              </div>
              <textarea
                rows={18}
                value={editedText}
                onChange={(e) => setEditedText(e.target.value)}
                className="w-full p-3 border border-gov-border rounded text-xs font-mono leading-relaxed focus:border-gov-blue focus:outline-hidden"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gov-border">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gov-navy rounded font-medium text-xs transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveDraft}
                disabled={isSaving}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-gov-navy hover:bg-gov-navy-light text-white rounded font-semibold text-xs shadow-xs transition"
              >
                <Save className="w-3.5 h-3.5 text-emerald-400" />
                <span>Save New Version Snapshot</span>
              </button>
            </div>
          </div>
        ) : (
          /* Letterhead Preview */
          <DocumentPreview document={document} />
        )
      ) : (
        /* Version History View */
        <div className="border border-gov-border rounded-lg overflow-hidden bg-white shadow-2xs">
          <div className="p-3 bg-gov-light border-b border-gov-border font-bold text-xs text-gov-navy">
            Cryptographic SHA-256 Version Snapshots
          </div>
          <div className="divide-y divide-gov-border">
            {versions.map((v) => (
              <div key={v.id} className="p-4 space-y-1 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-gov-navy">Version {v.version_number}</span>
                  <span className="text-[11px] text-gov-muted">
                    {new Date(v.created_at).toLocaleString('en-IN')}
                  </span>
                </div>
                <p className="text-[11px] text-gov-muted">{v.change_summary || 'Document revision'}</p>
                <div className="pt-1 flex items-center gap-2 text-[10px] font-mono text-gray-500">
                  <span className="text-gov-muted">SHA-256:</span>
                  <span className="bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200">
                    {v.sha256_hash}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Mock Signature Modal */}
      {isSignModalOpen && (
        <MockSignatureModal
          document={document}
          isOpen={isSignModalOpen}
          onClose={() => setIsSignModalOpen(false)}
          onConfirmSign={handleMockSign}
        />
      )}
    </div>
  );
};
