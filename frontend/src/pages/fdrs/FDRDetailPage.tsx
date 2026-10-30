import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  fetchFDRById,
  updateFDR,
  uploadFDRDocument,
  downloadDocument,
  computeSha256,
  createVerificationRequest,
  fetchFDRAttestations,
  fetchFDRHeartbeatHistory,
  triggerManualHeartbeatCheck,
} from '../../lib/api';
import { FDR, FDRDocument, FDREvent, DocumentType, BankAttestation, HeartbeatCheck } from '../../types';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { TrustTierBadge } from '../../components/common/TrustTierBadge';
import { HeartbeatStatusBadge } from '../../components/common/HeartbeatStatusBadge';
import { MaturityCountdown } from '../../components/common/MaturityCountdown';
import {
  ArrowLeft,
  FileText,
  Landmark,
  Building2,
  Calendar,
  IndianRupee,
  ShieldCheck,
  ShieldAlert,
  Activity,
  Clock,
  Download,
  UploadCloud,
  Edit3,
  CheckCircle2,
  AlertCircle,
  Copy,
  ExternalLink,
  History,
  Lock,
  FileCheck,
  Send,
  Key,
  Fingerprint,
  FileSignature,
  Check,
} from 'lucide-react';

export const FDRDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { activeRole } = useAuth();

  const [fdr, setFdr] = useState<FDR | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'documents' | 'history' | 'verification' | 'heartbeat'>('overview');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Phase 4 Heartbeat Surveillance State
  const [heartbeatChecks, setHeartbeatChecks] = useState<HeartbeatCheck[]>([]);
  const [isLoadingHeartbeat, setIsLoadingHeartbeat] = useState<boolean>(false);
  const [isTriggeringHeartbeat, setIsTriggeringHeartbeat] = useState<boolean>(false);
  const [heartbeatNotes, setHeartbeatNotes] = useState<string>('');
  const [heartbeatMsg, setHeartbeatMsg] = useState<string | null>(null);

  // Phase 3 Attestations & Verification Request State
  const [attestations, setAttestations] = useState<BankAttestation[]>([]);
  const [isLoadingAttestations, setIsLoadingAttestations] = useState<boolean>(false);
  const [isRequestModalOpen, setIsRequestModalOpen] = useState<boolean>(false);
  const [requestEmail, setRequestEmail] = useState<string>('');
  const [requestNotes, setRequestNotes] = useState<string>('');
  const [isSubmittingRequest, setIsSubmittingRequest] = useState<boolean>(false);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [createdTokenData, setCreatedTokenData] = useState<{
    verify_url: string;
    raw_token: string;
    expires_at: string;
  } | null>(null);
  const [copiedTokenUrl, setCopiedTokenUrl] = useState<boolean>(false);

  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [editAmount, setEditAmount] = useState<string>('');
  const [editIssueDate, setEditIssueDate] = useState<string>('');
  const [editMaturityDate, setEditMaturityDate] = useState<string>('');
  const [editInterestRate, setEditInterestRate] = useState<string>('');
  const [editLienInFavour, setEditLienInFavour] = useState<string>('');
  const [editRemarks, setEditRemarks] = useState<string>('');
  const [isSubmittingEdit, setIsSubmittingEdit] = useState<boolean>(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Additional Document Upload State
  const [isUploadModalOpen, setIsUploadModalOpen] = useState<boolean>(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadDocType, setUploadDocType] = useState<DocumentType>('supporting_document');
  const [uploadDescription, setUploadDescription] = useState<string>('');
  const [uploadChecksum, setUploadChecksum] = useState<string>('');
  const [isComputingHash, setIsComputingHash] = useState<boolean>(false);
  const [isUploadingDoc, setIsUploadingDoc] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Copied checksum indicator
  const [copiedDocId, setCopiedDocId] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      loadFDR(id);
    }
  }, [id]);

  const loadFDR = async (fdrId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchFDRById(fdrId);
      setFdr(data);
      // Populate edit fields
      setEditAmount(String(data.amount));
      setEditIssueDate(data.issue_date);
      setEditMaturityDate(data.maturity_date);
      setEditInterestRate(data.interest_rate ? String(data.interest_rate) : '');
      setEditLienInFavour(data.lien_in_favour);
      setEditRemarks(data.remarks || '');
      // Load Phase 3 cryptographic attestations
      loadAttestations(fdrId);
      // Load Phase 4 heartbeat surveillance history
      loadHeartbeatHistory(fdrId);
    } catch (err: any) {
      setError(err.message || 'Failed to retrieve FDR record details.');
    } finally {
      setIsLoading(false);
    }
  };

  const loadAttestations = async (fdrId: string) => {
    setIsLoadingAttestations(true);
    try {
      const list = await fetchFDRAttestations(fdrId);
      setAttestations(list);
    } catch {
      // Non-blocking fallback
    } finally {
      setIsLoadingAttestations(false);
    }
  };

  const loadHeartbeatHistory = async (fdrId: string) => {
    setIsLoadingHeartbeat(true);
    try {
      const list = await fetchFDRHeartbeatHistory(fdrId);
      setHeartbeatChecks(list);
    } catch {
      // Non-blocking fallback
    } finally {
      setIsLoadingHeartbeat(false);
    }
  };

  const handleManualHeartbeatCheck = async () => {
    if (!fdr) return;
    setIsTriggeringHeartbeat(true);
    setHeartbeatMsg(null);
    try {
      await triggerManualHeartbeatCheck(fdr.id, heartbeatNotes || undefined);
      setHeartbeatMsg('Immediate heartbeat verification dispatched successfully.');
      setHeartbeatNotes('');
      await loadHeartbeatHistory(fdr.id);
      const updated = await fetchFDRById(fdr.id);
      setFdr(updated);
    } catch (err: any) {
      setHeartbeatMsg(err.message || 'Failed to dispatch heartbeat check.');
    } finally {
      setIsTriggeringHeartbeat(false);
    }
  };

  const handleCreateVerificationRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fdr) return;
    setRequestError(null);
    setIsSubmittingRequest(true);
    try {
      const res = await createVerificationRequest({
        fdr_id: fdr.id,
        recipient_email: requestEmail.trim() || undefined,
        request_notes: requestNotes.trim() || undefined,
      });
      setCreatedTokenData({
        verify_url: res.verification_url || `/bank/verify/${res.raw_token || ''}`,
        raw_token: res.raw_token || '',
        expires_at: res.expires_at,
      });
      setSuccessMsg(`Single-use verification token generated (Valid for 48 hours).`);
      setTimeout(() => setSuccessMsg(null), 5000);
      loadAttestations(fdr.id);
    } catch (err: any) {
      setRequestError(err.message || 'Failed to generate verification request token.');
    } finally {
      setIsSubmittingRequest(false);
    }
  };

  const formatCurrency = (amt: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amt);
  };

  const formatDisplayDate = (dateStr: string) => {
    if (!dateStr) return 'N/A';
    try {
      return new Date(dateStr).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const formatDateTime = (dateStr: string) => {
    if (!dateStr) return 'N/A';
    try {
      return new Date(dateStr).toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  const getDaysRemaining = (maturityDateStr: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const maturity = new Date(maturityDateStr);
    maturity.setHours(0, 0, 0, 0);
    const diffTime = maturity.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const handleCopyChecksum = (checksum: string, docId: string) => {
    navigator.clipboard.writeText(checksum);
    setCopiedDocId(docId);
    setTimeout(() => setCopiedDocId(null), 2000);
  };

  const handleDownloadDoc = async (doc: FDRDocument) => {
    try {
      if (doc.download_url && doc.download_url.startsWith('blob:')) {
        // Direct local blob preview
        window.open(doc.download_url, '_blank');
        return;
      }
      const res = await downloadDocument(doc.id);
      if (res.download_url && res.download_url !== '#') {
        window.open(res.download_url, '_blank');
      } else {
        alert(`Document ${doc.original_filename} download prepared. Checksum: ${doc.sha256_checksum}`);
      }
    } catch (err: any) {
      alert('Failed to initiate document download: ' + err.message);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fdr) return;
    setEditError(null);

    const parsedAmount = parseFloat(editAmount);
    if (!parsedAmount || parsedAmount <= 0) {
      setEditError('Principal amount must be greater than zero.');
      return;
    }
    if (new Date(editMaturityDate) <= new Date(editIssueDate)) {
      setEditError('Maturity date must strictly occur after the Issue date.');
      return;
    }
    if (!editLienInFavour.trim()) {
      setEditError('Lien in favour of cannot be empty.');
      return;
    }

    setIsSubmittingEdit(true);
    try {
      const updated = await updateFDR(fdr.id, {
        amount: parsedAmount,
        issue_date: editIssueDate,
        maturity_date: editMaturityDate,
        interest_rate: editInterestRate ? parseFloat(editInterestRate) : undefined,
        lien_in_favour: editLienInFavour.trim(),
        remarks: editRemarks.trim() || undefined,
      });
      setFdr(updated);
      setIsEditModalOpen(false);
      setSuccessMsg('FDR parameters successfully updated in pending state.');
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setEditError(err.message || 'Failed to update FDR.');
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  const handleUploadFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const MAX_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      setUploadError(`File is ${(file.size / (1024 * 1024)).toFixed(2)} MB. Maximum allowed limit is 10 MB.`);
      setUploadFile(null);
      setUploadChecksum('');
      return;
    }

    setUploadError(null);
    setUploadFile(file);
    setIsComputingHash(true);
    try {
      const sha256 = await computeSha256(file);
      setUploadChecksum(sha256);
    } catch (err: any) {
      setUploadError('Failed to compute client SHA-256 hash: ' + err.message);
    } finally {
      setIsComputingHash(false);
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fdr || !uploadFile) return;
    setUploadError(null);

    setIsUploadingDoc(true);
    try {
      await uploadFDRDocument(fdr.id, uploadFile, uploadDocType, uploadDescription);
      setIsUploadModalOpen(false);
      setUploadFile(null);
      setUploadChecksum('');
      setUploadDescription('');
      setSuccessMsg(`Document '${uploadFile.name}' successfully uploaded and verified.`);
      setTimeout(() => setSuccessMsg(null), 4000);
      // Reload FDR
      await loadFDR(fdr.id);
    } catch (err: any) {
      setUploadError(err.message || 'Failed to upload document.');
    } finally {
      setIsUploadingDoc(false);
    }
  };

  if (isLoading) {
    return (
      <div className="py-20 text-center text-gov-muted">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-gov-navy border-t-transparent mb-3" />
        <p className="text-sm font-semibold text-gov-navy">Loading FDR Certificate & Custodial Record...</p>
      </div>
    );
  }

  if (error || !fdr) {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center space-y-4">
        <div className="p-6 bg-red-50 border border-red-200 rounded-lg text-red-800 text-xs">
          <AlertCircle className="w-8 h-8 text-red-600 mx-auto mb-2" />
          <h2 className="text-base font-bold text-red-900 mb-1">Record Not Found</h2>
          <p>{error || 'The requested FDR record does not exist or access was denied.'}</p>
        </div>
        <button
          onClick={() => navigate('/fdrs')}
          className="inline-flex items-center gap-2 px-4 py-2 bg-gov-navy text-white text-xs font-semibold rounded-md"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to FDR Repository</span>
        </button>
      </div>
    );
  }

  const daysRemaining = getDaysRemaining(fdr.maturity_date);
  const isPending = fdr.lifecycle_status === 'pending';
  const canEdit = isPending && (activeRole === 'institution_user' || activeRole === 'system_admin');

  return (
    <div className="space-y-6">
      {/* Top Navigation & Actions */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <button
          onClick={() => navigate('/fdrs')}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-gov-blue hover:text-gov-navy transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to FDR Repository</span>
        </button>

        <div className="flex flex-wrap items-center gap-2">
          {fdr.trust_tier === 1 && (
            <button
              onClick={() => {
                setCreatedTokenData(null);
                setRequestEmail('');
                setRequestNotes('');
                setIsRequestModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-md shadow-xs transition-colors"
              title="Issue single-use 48h verification token for bank nodal officer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Request Verification</span>
            </button>
          )}

          <Link
            to="/bank"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gov-navy bg-white border border-gov-navy/30 rounded-md hover:bg-gov-light transition-colors shadow-xs"
            title="Open Mock Bank Workbench to process Tier 2/3 confirmations"
          >
            <Landmark className="w-3.5 h-3.5 text-blue-700" />
            <span>Mock Bank Portal</span>
          </Link>

          {canEdit ? (
            <button
              onClick={() => setIsEditModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gov-navy bg-white border border-gov-navy/30 rounded-md hover:bg-gov-light transition-colors shadow-xs"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Edit FDR</span>
            </button>
          ) : (
            <div
              title={
                !isPending
                  ? 'FDR is no longer in pending status and cannot be modified.'
                  : 'Insufficient permissions to edit FDR.'
              }
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-gov-muted bg-gray-100 rounded border border-gray-200 cursor-not-allowed"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Locked ({fdr.lifecycle_status})</span>
            </div>
          )}

          <button
            onClick={() => setIsUploadModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-gov-navy hover:bg-gov-navy-light rounded-md shadow-xs transition-colors"
          >
            <UploadCloud className="w-3.5 h-3.5" />
            <span>Upload Document</span>
          </button>
        </div>
      </div>

      {/* Success Notification */}
      {successMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-md flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Header Inspection Banner */}
      <div className="bg-white p-6 rounded-lg border border-gov-border shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="font-mono text-xs font-bold bg-gov-navy text-white px-2 py-0.5 rounded">
                FDR CERTIFICATE
              </span>
              {/* Trust Tier Badge with interactive cryptographic evidence modal */}
              <TrustTierBadge tier={fdr.trust_tier} size="md" bankName={fdr.bank_name} />

              {/* Status Badge */}
              <Badge variant={fdr.lifecycle_status === 'active' ? 'success' : fdr.lifecycle_status === 'pending' ? 'warning' : 'default'}>
                Status: {fdr.lifecycle_status.toUpperCase()}
              </Badge>

              {/* Heartbeat Status */}
              <HeartbeatStatusBadge
                status={fdr.heartbeat_status || 'not_started'}
                size="md"
                lastHeartbeatAt={fdr.last_heartbeat_at}
                nextHeartbeatAt={fdr.next_heartbeat_at}
                failureCount={fdr.heartbeat_failure_count}
                fdrNumber={fdr.fdr_number}
              />
            </div>

            <h1 className="text-2xl font-mono font-bold text-gov-navy tracking-tight">
              {fdr.fdr_number}
            </h1>
            <p className="text-xs text-gov-muted mt-1 flex items-center gap-2">
              <span>Depositor: <strong className="text-gov-text">{fdr.institution_name}</strong></span>
              <span>•</span>
              <span>Depository: <strong className="text-gov-text">{fdr.bank_name}</strong> ({fdr.branch_name})</span>
            </p>
          </div>

          {/* Primary Custodial Value Counter */}
          <div className="lg:text-right bg-gov-bg p-4 rounded-lg border border-gov-border shrink-0">
            <div className="text-[11px] font-semibold text-gov-muted uppercase tracking-wider">
              Principal Deposit Value
            </div>
            <div className="text-2xl font-bold text-gov-navy font-mono mt-0.5">
              {formatCurrency(fdr.amount)}
            </div>
            {fdr.interest_rate && (
              <div className="text-xs text-emerald-700 font-semibold mt-0.5">
                {fdr.interest_rate}% p.a. Annual Yield
              </div>
            )}
          </div>
        </div>

        {/* Highlight Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-5 mt-5 border-t border-gov-border">
          <div>
            <div className="text-[10px] text-gov-muted uppercase font-bold">Issue / Deposit Date</div>
            <div className="text-xs font-semibold text-gov-text mt-0.5 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-gov-muted" />
              <span>{formatDisplayDate(fdr.issue_date)}</span>
            </div>
          </div>

          <div>
            <div className="text-[10px] text-gov-muted uppercase font-bold">Maturity Date</div>
            <div className="text-xs font-semibold text-gov-text mt-0.5 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-gov-muted" />
              <span>{formatDisplayDate(fdr.maturity_date)}</span>
            </div>
          </div>

          <div>
            <div className="text-[10px] text-gov-muted uppercase font-bold">Tenor Standing</div>
            <div className="mt-1">
              <MaturityCountdown maturityDate={fdr.maturity_date} size="sm" />
            </div>
          </div>

          <div>
            <div className="text-[10px] text-gov-muted uppercase font-bold">Branch IFSC Code</div>
            <div className="text-xs font-mono font-bold text-gov-navy mt-0.5">
              {fdr.ifsc_code || 'N/A'}
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gov-border">
        <nav className="flex space-x-6">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-3 px-1 text-xs font-semibold border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'overview'
                ? 'border-gov-navy text-gov-navy'
                : 'border-transparent text-gov-muted hover:text-gov-navy hover:border-gray-300'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Deposit Overview & Lien Terms</span>
          </button>

          <button
            onClick={() => setActiveTab('documents')}
            className={`py-3 px-1 text-xs font-semibold border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'documents'
                ? 'border-gov-navy text-gov-navy'
                : 'border-transparent text-gov-muted hover:text-gov-navy hover:border-gray-300'
            }`}
          >
            <FileCheck className="w-4 h-4" />
            <span>Document Vault ({fdr.documents?.length || 0})</span>
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`py-3 px-1 text-xs font-semibold border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'history'
                ? 'border-gov-navy text-gov-navy'
                : 'border-transparent text-gov-muted hover:text-gov-navy hover:border-gray-300'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Audit Trail & Events ({fdr.events?.length || 0})</span>
          </button>

          <button
            onClick={() => setActiveTab('verification')}
            className={`py-3 px-1 text-xs font-semibold border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'verification'
                ? 'border-gov-navy text-gov-navy'
                : 'border-transparent text-gov-muted hover:text-gov-navy hover:border-gray-300'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Verification & Trust Tiers ({attestations.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('heartbeat')}
            className={`py-3 px-1 text-xs font-semibold border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'heartbeat'
                ? 'border-gov-navy text-gov-navy'
                : 'border-transparent text-gov-muted hover:text-gov-navy hover:border-gray-300'
            }`}
          >
            <Activity className="w-4 h-4 text-emerald-600" />
            <span>Heartbeat Surveillance ({heartbeatChecks.length})</span>
          </button>
        </nav>
      </div>

      {/* Tab 1: Overview */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Depositor & Lien Terms */}
          <div className="bg-white p-5 rounded-lg border border-gov-border shadow-xs space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-gov-border">
              <Building2 className="w-4 h-4 text-gov-blue" />
              <h3 className="text-xs font-bold text-gov-navy uppercase tracking-wider">
                Institutional Lien Standing
              </h3>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-gov-muted block text-[10px] uppercase font-bold">
                  Depositor Institution
                </span>
                <span className="font-semibold text-gov-text text-sm">
                  {fdr.institution_name}
                </span>
                <span className="ml-2 font-mono text-[10px] text-gov-muted">
                  ({fdr.institution_code})
                </span>
              </div>

              <div>
                <span className="text-gov-muted block text-[10px] uppercase font-bold">
                  Territorial Jurisdiction
                </span>
                <span className="font-medium text-gov-text">
                  {fdr.region_name || 'All-India National Scope'}
                </span>
              </div>

              <div className="p-3 bg-gov-bg rounded border border-gov-border">
                <span className="text-gov-navy block text-[10px] uppercase font-bold">
                  Lien Beneficiary (In Favour Of)
                </span>
                <span className="font-semibold text-gov-text text-xs leading-relaxed block mt-0.5">
                  {fdr.lien_in_favour}
                </span>
              </div>

              {fdr.remarks && (
                <div>
                  <span className="text-gov-muted block text-[10px] uppercase font-bold">
                    Purpose / Contract Specification
                  </span>
                  <p className="text-gov-text mt-0.5 leading-relaxed bg-gray-50 p-2.5 rounded border border-gray-200">
                    {fdr.remarks}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Depository Bank & Branch */}
          <div className="bg-white p-5 rounded-lg border border-gov-border shadow-xs space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-gov-border">
              <Landmark className="w-4 h-4 text-gov-blue" />
              <h3 className="text-xs font-bold text-gov-navy uppercase tracking-wider">
                Depository Banking Details
              </h3>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-gov-muted block text-[10px] uppercase font-bold">
                  Depository Bank
                </span>
                <span className="font-semibold text-gov-text text-sm">
                  {fdr.bank_name}
                </span>
                <span className="ml-2 font-mono text-[10px] text-gov-muted">
                  ({fdr.bank_code})
                </span>
              </div>

              <div>
                <span className="text-gov-muted block text-[10px] uppercase font-bold">
                  Depository Branch
                </span>
                <span className="font-medium text-gov-text">
                  {fdr.branch_name}
                </span>
              </div>

              <div>
                <span className="text-gov-muted block text-[10px] uppercase font-bold">
                  IFSC Code (Automated Verification Routing)
                </span>
                <span className="font-mono font-bold text-gov-navy text-xs">
                  {fdr.ifsc_code}
                </span>
              </div>

              <div className="pt-2 border-t border-gov-border flex justify-between text-[11px] text-gov-muted">
                <span>Created At: {formatDateTime(fdr.created_at)}</span>
                <span>Last Updated: {formatDateTime(fdr.updated_at)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Document Vault */}
      {activeTab === 'documents' && (
        <div className="bg-white rounded-lg border border-gov-border shadow-xs p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-gov-border">
            <div>
              <h3 className="text-sm font-bold text-gov-navy uppercase tracking-wider">
                Cryptographic Document Vault
              </h3>
              <p className="text-xs text-gov-muted mt-0.5">
                Original scan receipts, deposit vouchers, and lien instruments with client-verified SHA-256 integrity digests.
              </p>
            </div>
            <button
              onClick={() => setIsUploadModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-gov-navy hover:bg-gov-navy-light rounded shadow-xs"
            >
              <UploadCloud className="w-3.5 h-3.5" />
              <span>Upload Document</span>
            </button>
          </div>

          {(!fdr.documents || fdr.documents.length === 0) ? (
            <div className="py-12 text-center text-gov-muted">
              <UploadCloud className="w-8 h-8 text-gov-border mx-auto mb-2" />
              <p className="font-semibold text-gov-text text-xs">No documents attached yet</p>
              <p className="text-[11px] text-gov-muted mt-1">
                Upload the scanned physical FDR receipt to enable bank cross-verification.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {fdr.documents.map((doc) => (
                <div
                  key={doc.id}
                  className="p-4 rounded-lg border border-gov-border bg-slate-50/50 hover:bg-slate-50 transition-colors flex flex-col md:flex-row md:items-center md:justify-between gap-4"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-gov-navy/10 text-gov-navy">
                        {doc.document_type.replace(/_/g, ' ')}
                      </span>
                      <span className="font-semibold text-xs text-gov-navy">
                        {doc.original_filename}
                      </span>
                      <span className="text-[11px] text-gov-muted">
                        ({(doc.file_size_bytes / 1024).toFixed(1)} KB)
                      </span>
                    </div>

                    {doc.description && (
                      <p className="text-xs text-gov-text">{doc.description}</p>
                    )}

                    {/* SHA-256 Digest Box with Copy */}
                    <div className="flex items-center gap-2 pt-1">
                      <span className="text-[10px] text-gov-muted font-bold uppercase">
                        SHA-256:
                      </span>
                      <code className="text-[10px] font-mono text-slate-700 bg-white px-2 py-0.5 rounded border border-slate-200 break-all">
                        {doc.sha256_checksum}
                      </code>
                      <button
                        onClick={() => handleCopyChecksum(doc.sha256_checksum, doc.id)}
                        className="inline-flex items-center text-gov-blue hover:text-gov-navy text-[10px]"
                        title="Copy SHA-256 Checksum"
                      >
                        {copiedDocId === doc.id ? (
                          <span className="text-emerald-700 font-semibold">Copied!</span>
                        ) : (
                          <Copy className="w-3 h-3 text-gov-muted hover:text-gov-navy" />
                        )}
                      </button>
                    </div>

                    <div className="text-[10px] text-gov-muted">
                      Uploaded on {formatDateTime(doc.uploaded_at)}
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center gap-2">
                    <button
                      onClick={() => handleDownloadDoc(doc)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gov-blue bg-white border border-gov-blue/30 rounded hover:bg-blue-50 transition-colors shadow-xs"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download / Inspect</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Immutable Audit Trail */}
      {activeTab === 'history' && (
        <div className="bg-white rounded-lg border border-gov-border shadow-xs p-5 space-y-4">
          <div className="pb-3 border-b border-gov-border">
            <h3 className="text-sm font-bold text-gov-navy uppercase tracking-wider">
              Immutable Event Audit History
            </h3>
            <p className="text-xs text-gov-muted mt-0.5">
              Append-only event log capturing every lifecycle transition, parameter modification, and cryptographic document attachment.
            </p>
          </div>

          {(!fdr.events || fdr.events.length === 0) ? (
            <div className="py-8 text-center text-gov-muted text-xs">
              No audit events logged yet.
            </div>
          ) : (
            <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-gov-border">
              {fdr.events.map((evt, idx) => (
                <div key={evt.id || idx} className="relative text-xs">
                  {/* Dot */}
                  <div className="absolute -left-6 top-1 w-2.5 h-2.5 rounded-full bg-gov-navy ring-4 ring-white" />

                  <div className="bg-slate-50/70 p-3.5 rounded-lg border border-gov-border space-y-1.5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                      <span className="font-semibold font-mono text-[11px] text-gov-navy uppercase">
                        {evt.event_type}
                      </span>
                      <span className="text-[10px] text-gov-muted">
                        {formatDateTime(evt.created_at)}
                      </span>
                    </div>

                    <p className="text-xs text-gov-text leading-relaxed">
                      {evt.description}
                    </p>

                    {evt.actor_name && (
                      <div className="text-[11px] text-gov-muted">
                        Officer: <span className="font-medium text-gov-text">{evt.actor_name}</span> ({evt.actor_email})
                      </div>
                    )}

                    {evt.metadata && Object.keys(evt.metadata).length > 0 && (
                      <div className="mt-2 pt-2 border-t border-slate-200">
                        <span className="text-[10px] font-bold text-gov-muted uppercase block mb-1">
                          Audit Event Parameters
                        </span>
                        <pre className="text-[10px] font-mono bg-white p-2 rounded border border-slate-200 overflow-x-auto text-slate-700">
                          {JSON.stringify(evt.metadata, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 4: Verification & Trust Tiers (Phase 3) */}
      {activeTab === 'verification' && (
        <div className="space-y-6">
          {/* Trust Tier Multi-Stage Progression Stepper */}
          <div className="bg-white p-5 rounded-lg border border-gov-border shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-3 border-b border-gov-border">
              <div>
                <h3 className="text-xs font-bold text-gov-navy uppercase tracking-wider flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-gov-blue" />
                  <span>Multi-Tier Cryptographic Trust Architecture</span>
                </h3>
                <p className="text-[11px] text-gov-muted mt-0.5">
                  Three-tier evidentiary pipeline verifying custodial legitimacy from declaration to cryptographic non-repudiation.
                </p>
              </div>
              <div className="shrink-0">
                <TrustTierBadge tier={fdr.trust_tier} size="md" bankName={fdr.bank_name} />
              </div>
            </div>

            {/* Visual Stepper 3-Tier */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Tier 1 Card */}
              <div
                className={`p-4 rounded-lg border text-xs space-y-2 transition-all ${
                  fdr.trust_tier >= 1
                    ? 'bg-amber-50/60 border-amber-300 ring-1 ring-amber-300/40'
                    : 'bg-gray-50 border-gray-200 opacity-60'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-amber-900 flex items-center gap-1.5">
                    <ShieldAlert className="w-4 h-4 text-amber-700" />
                    <span>Tier 1: Declared</span>
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-100 text-amber-900 font-semibold">
                    {fdr.trust_tier >= 1 ? 'COMPLETED' : 'PENDING'}
                  </span>
                </div>
                <p className="text-amber-900/90 text-[11px] leading-relaxed">
                  Institution self-declared deposit parameters with receipt upload & client-side SHA-256 fingerprinting.
                </p>
                <div className="pt-2 border-t border-amber-200 text-[10px] text-amber-800">
                  Status: <strong>Basic Deposit Custody</strong>
                </div>
              </div>

              {/* Tier 2 Card */}
              <div
                className={`p-4 rounded-lg border text-xs space-y-2 transition-all ${
                  fdr.trust_tier >= 2
                    ? 'bg-blue-50/60 border-blue-300 ring-1 ring-blue-300/40'
                    : 'bg-gray-50 border-gray-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-blue-900 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-blue-700" />
                    <span>Tier 2: Bank Confirmed</span>
                  </span>
                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded font-semibold ${
                      fdr.trust_tier >= 2
                        ? 'bg-blue-100 text-blue-900'
                        : 'bg-gray-200 text-gray-700'
                    }`}
                  >
                    {fdr.trust_tier >= 2 ? 'CONFIRMED' : 'AWAITING'}
                  </span>
                </div>
                <p className="text-blue-900/90 text-[11px] leading-relaxed">
                  Depository branch banker verified receipt and lien marking via single-use 48h token or bank portal.
                </p>
                <div className="pt-2 border-t border-blue-200 text-[10px] text-blue-800">
                  {fdr.trust_tier >= 2 ? (
                    <span>Confirmed by: <strong>{fdr.bank_name} Officer</strong></span>
                  ) : (
                    <span>Requires branch banker review</span>
                  )}
                </div>
              </div>

              {/* Tier 3 Card */}
              <div
                className={`p-4 rounded-lg border text-xs space-y-2 transition-all ${
                  fdr.trust_tier === 3
                    ? 'bg-emerald-50/70 border-emerald-300 ring-1 ring-emerald-300/40'
                    : 'bg-gray-50 border-gray-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-emerald-900 flex items-center gap-1.5">
                    <Fingerprint className="w-4 h-4 text-emerald-700" />
                    <span>Tier 3: Digitally Signed</span>
                  </span>
                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded font-semibold ${
                      fdr.trust_tier === 3
                        ? 'bg-emerald-100 text-emerald-900'
                        : 'bg-gray-200 text-gray-700'
                    }`}
                  >
                    {fdr.trust_tier === 3 ? 'CRYPTOGRAPHIC' : 'NOT SIGNED'}
                  </span>
                </div>
                <p className="text-emerald-900/90 text-[11px] leading-relaxed">
                  Ed25519 asymmetric signature over RFC 8785 canonical JSON payload. Tamper-evident & non-repudiable under Evidence Act 65B.
                </p>
                <div className="pt-2 border-t border-emerald-200 text-[10px] text-emerald-800">
                  {fdr.trust_tier === 3 ? (
                    <span className="flex items-center gap-1">
                      <Check className="w-3 h-3 text-emerald-600" />
                      <span>Verified on Public Key Registry</span>
                    </span>
                  ) : (
                    <span>Awaiting bank cryptographic signature</span>
                  )}
                </div>
              </div>
            </div>

            {/* Action Banner for Tier Upgrades */}
            <div className="p-4 bg-gov-bg rounded-lg border border-gov-border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <div className="text-xs font-bold text-gov-navy">
                  {fdr.trust_tier === 1 && 'Tier 1 Declared: Ready for Depository Verification'}
                  {fdr.trust_tier === 2 && 'Tier 2 Confirmed: Ready for Cryptographic Digital Signing'}
                  {fdr.trust_tier === 3 && 'Tier 3 Signed: Maximum Evidentiary Standing Achieved'}
                </div>
                <div className="text-[11px] text-gov-muted mt-0.5">
                  {fdr.trust_tier === 1 &&
                    'Generate a single-use 48h token for the branch manager or use the Mock Bank Portal to process.'}
                  {fdr.trust_tier === 2 &&
                    'Bank branch confirmation logged. Depository can now sign with Ed25519 private key.'}
                  {fdr.trust_tier === 3 &&
                    'Digital signature validated against public key registry. Canonical payload immutable.'}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {fdr.trust_tier === 1 && (
                  <button
                    onClick={() => {
                      setCreatedTokenData(null);
                      setRequestEmail('');
                      setRequestNotes('');
                      setIsRequestModalOpen(true);
                    }}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-md shadow-xs transition-colors"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Generate 48h Link</span>
                  </button>
                )}

                <Link
                  to="/bank"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-gov-navy bg-white border border-gov-border rounded-md hover:bg-gov-light transition-colors shadow-xs"
                >
                  <Landmark className="w-3.5 h-3.5 text-blue-700" />
                  <span>Launch Bank Workbench</span>
                </Link>
              </div>
            </div>
          </div>

          {/* Attestation Audit History Table */}
          <div className="bg-white p-5 rounded-lg border border-gov-border shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-gov-border">
              <div className="flex items-center gap-2">
                <FileSignature className="w-4 h-4 text-gov-blue" />
                <h3 className="text-xs font-bold text-gov-navy uppercase tracking-wider">
                  Cryptographic Bank Attestation Ledger ({attestations.length})
                </h3>
              </div>
              <button
                onClick={() => fdr && loadAttestations(fdr.id)}
                className="text-xs text-gov-blue hover:text-gov-navy font-semibold inline-flex items-center gap-1"
              >
                Refresh
              </button>
            </div>

            {isLoadingAttestations ? (
              <div className="py-8 text-center text-xs text-gov-muted">
                <div className="inline-block animate-spin rounded-full h-5 w-5 border-2 border-gov-navy border-t-transparent mb-2" />
                <p>Loading cryptographic attestation ledger...</p>
              </div>
            ) : attestations.length === 0 ? (
              <div className="p-8 text-center bg-gray-50 rounded-lg border border-dashed border-gray-300 text-xs text-gov-muted space-y-2">
                <ShieldAlert className="w-8 h-8 text-amber-600 mx-auto" />
                <p className="font-semibold text-gov-navy">No Bank Attestations Recorded</p>
                <p className="max-w-md mx-auto text-[11px]">
                  This FDR currently stands at Tier 1 (Self-Declared). Click "Generate 48h Link" or use the Mock Bank Portal to submit a Tier 2 confirmation or Tier 3 cryptographic digital signature.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-gov-border bg-gov-bg text-[10px] font-bold text-gov-muted uppercase tracking-wider">
                      <th className="py-2.5 px-3">Type</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3">Attested At</th>
                      <th className="py-2.5 px-3">Attester / Bank</th>
                      <th className="py-2.5 px-3">Key Fingerprint</th>
                      <th className="py-2.5 px-3">Verification Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {attestations.map((att) => (
                      <tr key={att.id} className="hover:bg-gov-light/50 transition-colors">
                        <td className="py-3 px-3">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold ${
                              att.attestation_type === 'tier3_digital_signature'
                                ? 'bg-purple-50 text-purple-800 border border-purple-200'
                                : 'bg-blue-50 text-blue-800 border border-blue-200'
                            }`}
                          >
                            {att.attestation_type === 'tier3_digital_signature' ? (
                              <>
                                <Fingerprint className="w-3 h-3 text-purple-600" />
                                <span>Digital Signature</span>
                              </>
                            ) : (
                              <>
                                <ShieldCheck className="w-3 h-3 text-blue-600" />
                                <span>Bank Confirmation</span>
                              </>
                            )}
                          </span>
                        </td>

                        <td className="py-3 px-3">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                              att.verification_status === 'verified' || att.verification_status === 'bank_confirmed'
                                ? 'bg-emerald-100 text-emerald-800'
                                : att.verification_status === 'rejected'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {att.verification_status.toUpperCase()}
                          </span>
                        </td>

                        <td className="py-3 px-3 text-gov-muted text-[11px] font-mono">
                          {formatDateTime(att.created_at)}
                        </td>

                        <td className="py-3 px-3">
                          <div className="font-semibold text-gov-navy text-[11px]">
                            {att.attestation_metadata?.officer_name || att.attested_by || 'Bank Nodal Officer'}
                          </div>
                          {att.attestation_metadata?.officer_email && (
                            <div className="text-[10px] text-gov-muted">
                              {att.attestation_metadata.officer_email}
                            </div>
                          )}
                        </td>

                        <td className="py-3 px-3">
                          {att.key_id ? (
                            <span className="font-mono text-[10px] bg-slate-100 text-slate-800 px-1.5 py-0.5 rounded border border-slate-200">
                              {att.key_id}
                            </span>
                          ) : (
                            <span className="text-gov-muted text-[11px]">—</span>
                          )}
                        </td>

                        <td className="py-3 px-3">
                          {att.signature_hex ? (
                            <div className="space-y-1">
                              <span className="text-[10px] text-emerald-700 font-bold block">
                                Ed25519 Validated
                              </span>
                              <code
                                className="text-[9px] font-mono text-slate-600 bg-slate-50 p-1 rounded block max-w-xs truncate"
                                title={att.signature_hex}
                              >
                                {att.signature_hex}
                              </code>
                            </div>
                          ) : att.attestation_metadata?.notes ? (
                            <span className="text-[11px] text-gov-text italic">
                              "{att.attestation_metadata.notes}"
                            </span>
                          ) : (
                            <span className="text-gov-muted text-[11px]">Token Verified</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 5: Heartbeat Surveillance & Integrity */}
      {activeTab === 'heartbeat' && (
        <div className="space-y-6">
          {/* Heartbeat Status & Control Card */}
          <div className="bg-white p-5 rounded-lg border border-gov-border shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-gov-border gap-2">
              <div>
                <h3 className="text-sm font-bold text-gov-navy">
                  Surveillance & Custody Integrity Status
                </h3>
                <p className="text-xs text-gov-muted mt-0.5">
                  Automated periodic verification of deposit custody, lien terms, and active balance.
                </p>
              </div>

              <HeartbeatStatusBadge
                status={fdr.heartbeat_status || 'not_started'}
                size="lg"
                lastHeartbeatAt={fdr.last_heartbeat_at}
                nextHeartbeatAt={fdr.next_heartbeat_at}
                failureCount={fdr.heartbeat_failure_count}
                fdrNumber={fdr.fdr_number}
              />
            </div>

            {/* Notification */}
            {heartbeatMsg && (
              <div className="p-3 bg-blue-50 border border-blue-200 text-blue-900 text-xs rounded-md">
                {heartbeatMsg}
              </div>
            )}

            {/* Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-3 bg-gov-bg rounded-lg border border-gov-border">
                <span className="text-[11px] text-gov-muted font-semibold uppercase">Last Confirmed Response</span>
                <div className="text-sm font-bold text-gov-navy mt-1">
                  {fdr.last_heartbeat_at
                    ? new Date(fdr.last_heartbeat_at).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : 'No prior response'}
                </div>
              </div>

              <div className="p-3 bg-gov-bg rounded-lg border border-gov-border">
                <span className="text-[11px] text-gov-muted font-semibold uppercase">Next Scheduled Cycle</span>
                <div className="text-sm font-bold text-gov-navy mt-1">
                  {fdr.next_heartbeat_at
                    ? new Date(fdr.next_heartbeat_at).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : 'Scheduled by policy'}
                </div>
              </div>

              <div className="p-3 bg-gov-bg rounded-lg border border-gov-border">
                <span className="text-[11px] text-gov-muted font-semibold uppercase">Surveillance SLA Standing</span>
                <div className="text-sm font-bold text-gov-navy mt-1 flex items-center gap-1.5">
                  {(fdr.heartbeat_failure_count || 0) === 0 ? (
                    <span className="text-emerald-700 flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4" /> Fully Compliant
                    </span>
                  ) : (
                    <span className="text-amber-700 flex items-center gap-1">
                      <Clock className="w-4 h-4" /> {fdr.heartbeat_failure_count} retries
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Manual Check Trigger Bar */}
            <div className="pt-3 border-t border-gov-border flex flex-col sm:flex-row items-center justify-between gap-3">
              <input
                type="text"
                value={heartbeatNotes}
                onChange={(e) => setHeartbeatNotes(e.target.value)}
                placeholder="Optional surveillance notes for manual check..."
                className="w-full sm:w-80 px-3 py-1.5 text-xs border border-gov-border rounded focus:ring-1 focus:ring-gov-navy focus:outline-hidden"
              />
              <button
                type="button"
                disabled={isTriggeringHeartbeat}
                onClick={handleManualHeartbeatCheck}
                className="w-full sm:w-auto px-4 py-2 bg-gov-navy hover:bg-gov-navy-light text-white text-xs font-semibold rounded-md shadow-xs transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isTriggeringHeartbeat ? 'Dispatching...' : 'Request Immediate Check'}</span>
              </button>
            </div>
          </div>

          {/* Historical Checks Ledger */}
          <div className="bg-white p-5 rounded-lg border border-gov-border shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-gov-border">
              <h3 className="text-xs font-bold text-gov-navy uppercase tracking-wider">
                Historical Surveillance Checks ({heartbeatChecks.length})
              </h3>
              <button
                onClick={() => fdr && loadHeartbeatHistory(fdr.id)}
                className="text-xs text-gov-blue hover:text-gov-navy font-semibold inline-flex items-center gap-1"
              >
                Refresh
              </button>
            </div>

            {isLoadingHeartbeat ? (
              <div className="py-8 text-center text-xs text-gov-muted">
                <div className="inline-block animate-spin rounded-full h-5 w-5 border-2 border-gov-navy border-t-transparent mb-2" />
                <p>Loading surveillance ledger...</p>
              </div>
            ) : heartbeatChecks.length === 0 ? (
              <div className="p-8 text-center bg-gray-50 rounded-lg border border-dashed border-gray-300 text-xs text-gov-muted">
                <Activity className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <p className="font-semibold text-gov-navy">No Heartbeat Checks Recorded Yet</p>
                <p className="text-[11px] mt-1">
                  Heartbeat checks are scheduled automatically based on the active policy or can be requested manually above.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-gov-border bg-gov-bg text-[10px] font-bold text-gov-muted uppercase tracking-wider">
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3">Scheduled / Dispatched</th>
                      <th className="py-2.5 px-3">Response At</th>
                      <th className="py-2.5 px-3">Retries</th>
                      <th className="py-2.5 px-3">Surveillance Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {heartbeatChecks.map((chk) => (
                      <tr key={chk.id} className="hover:bg-gov-light/50 transition-colors">
                        <td className="py-3 px-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              chk.check_status === 'confirmed'
                                ? 'bg-emerald-100 text-emerald-800'
                                : chk.check_status === 'rejected'
                                ? 'bg-rose-100 text-rose-800'
                                : chk.check_status === 'timed_out'
                                ? 'bg-orange-100 text-orange-800'
                                : 'bg-blue-100 text-blue-800'
                            }`}
                          >
                            {chk.check_status}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-gov-text font-mono">
                          {chk.requested_at
                            ? new Date(chk.requested_at).toLocaleDateString('en-IN', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : new Date(chk.scheduled_at).toLocaleDateString('en-IN')}
                        </td>
                        <td className="py-3 px-3 text-gov-muted font-mono">
                          {chk.responded_at
                            ? new Date(chk.responded_at).toLocaleDateString('en-IN', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : '—'}
                        </td>
                        <td className="py-3 px-3">
                          {chk.retry_count > 0 ? (
                            <span className="font-semibold text-amber-700">{chk.retry_count} retries</span>
                          ) : (
                            <span className="text-slate-400">0</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-gov-muted text-[11px] max-w-xs truncate">
                          {chk.notes || 'Routine scheduled surveillance check.'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Edit FDR Modal (Strictly Pending Status Only) */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit FDR Parameters (Pending State)"
      >
        <form onSubmit={handleEditSubmit} className="space-y-4">
          <div className="p-3 bg-amber-50 border border-amber-200 rounded text-[11px] text-amber-800">
            <strong>Audit Notice:</strong> This FDR is currently in <em>pending</em> status. Modifications are permitted prior to bank e-verification and will be recorded in the immutable audit log. Bank and Certificate Number are locked.
          </div>

          {editError && (
            <div className="p-2.5 bg-red-50 text-red-700 text-xs rounded border border-red-200">
              {editError}
            </div>
          )}

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-gov-text mb-1">
                Principal Amount (INR ₹) *
              </label>
              <input
                type="number"
                step="0.01"
                min="1"
                value={editAmount}
                onChange={(e) => setEditAmount(e.target.value)}
                className="w-full px-3 py-1.5 text-xs font-mono font-bold text-gov-navy border border-gov-border rounded focus:outline-none focus:ring-1 focus:ring-gov-navy"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gov-text mb-1">
                  Issue Date *
                </label>
                <input
                  type="date"
                  value={editIssueDate}
                  onChange={(e) => setEditIssueDate(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs border border-gov-border rounded focus:outline-none focus:ring-1 focus:ring-gov-navy"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gov-text mb-1">
                  Maturity Date *
                </label>
                <input
                  type="date"
                  value={editMaturityDate}
                  min={editIssueDate}
                  onChange={(e) => setEditMaturityDate(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs border border-gov-border rounded focus:outline-none focus:ring-1 focus:ring-gov-navy"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gov-text mb-1">
                Interest Rate (% p.a.)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="25"
                value={editInterestRate}
                onChange={(e) => setEditInterestRate(e.target.value)}
                className="w-full px-3 py-1.5 text-xs font-mono border border-gov-border rounded focus:outline-none focus:ring-1 focus:ring-gov-navy"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gov-text mb-1">
                Lien In Favour Of *
              </label>
              <input
                type="text"
                value={editLienInFavour}
                onChange={(e) => setEditLienInFavour(e.target.value)}
                className="w-full px-3 py-1.5 text-xs border border-gov-border rounded focus:outline-none focus:ring-1 focus:ring-gov-navy"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gov-text mb-1">
                Remarks / Purpose
              </label>
              <input
                type="text"
                value={editRemarks}
                onChange={(e) => setEditRemarks(e.target.value)}
                className="w-full px-3 py-1.5 text-xs border border-gov-border rounded focus:outline-none focus:ring-1 focus:ring-gov-navy"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-gov-border">
            <button
              type="button"
              onClick={() => setIsEditModalOpen(false)}
              className="px-3 py-1.5 text-xs font-semibold text-gov-text border border-gov-border rounded hover:bg-gov-light"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmittingEdit}
              className="px-4 py-1.5 text-xs font-semibold text-white bg-gov-navy hover:bg-gov-navy-light rounded disabled:opacity-50"
            >
              {isSubmittingEdit ? 'Saving...' : 'Save Parameters'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Additional Document Upload Modal */}
      <Modal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        title="Upload Document & Compute Hash"
      >
        <form onSubmit={handleUploadSubmit} className="space-y-4">
          {uploadError && (
            <div className="p-2.5 bg-red-50 text-red-700 text-xs rounded border border-red-200">
              {uploadError}
            </div>
          )}

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-gov-text mb-1">
                Document Classification *
              </label>
              <select
                value={uploadDocType}
                onChange={(e) => setUploadDocType(e.target.value as DocumentType)}
                className="w-full px-3 py-1.5 text-xs border border-gov-border rounded bg-white text-gov-text focus:outline-none focus:ring-1 focus:ring-gov-navy"
              >
                <option value="original_fdr">Original Scanned FDR Receipt</option>
                <option value="lien_letter">Statutory Lien Marking Letter</option>
                <option value="supporting_document">Tender / Contract Notice</option>
                <option value="other">Other Official Enclosure</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gov-text mb-1">
                Description / Notes
              </label>
              <input
                type="text"
                value={uploadDescription}
                onChange={(e) => setUploadDescription(e.target.value)}
                placeholder="e.g. Countersigned branch lien endorsement"
                className="w-full px-3 py-1.5 text-xs border border-gov-border rounded focus:outline-none focus:ring-1 focus:ring-gov-navy"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gov-text mb-1">
                Select File (PDF, PNG, JPG - max 10MB) *
              </label>
              <input
                type="file"
                accept=".pdf,.png,.jpg,.jpeg"
                onChange={handleUploadFileChange}
                className="w-full text-xs file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-gov-navy file:text-white hover:file:bg-gov-navy-light cursor-pointer"
                required
              />
            </div>

            {isComputingHash && (
              <div className="text-xs text-gov-blue flex items-center gap-1.5">
                <div className="animate-spin rounded-full h-3 w-3 border-2 border-gov-blue border-t-transparent" />
                <span>Computing SHA-256 digest...</span>
              </div>
            )}

            {uploadChecksum && (
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded text-xs space-y-1">
                <span className="text-[10px] font-bold text-emerald-700 block">
                  SHA-256 Digest Verified:
                </span>
                <code className="text-[10px] font-mono break-all text-slate-800 block">
                  {uploadChecksum}
                </code>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-gov-border">
            <button
              type="button"
              onClick={() => setIsUploadModalOpen(false)}
              className="px-3 py-1.5 text-xs font-semibold text-gov-text border border-gov-border rounded hover:bg-gov-light"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isUploadingDoc || !uploadFile}
              className="px-4 py-1.5 text-xs font-semibold text-white bg-gov-navy hover:bg-gov-navy-light rounded disabled:opacity-50"
            >
              {isUploadingDoc ? 'Uploading...' : 'Upload & Audit'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Phase 3: Single-Use Verification Request Modal */}
      <Modal
        isOpen={isRequestModalOpen}
        onClose={() => {
          setIsRequestModalOpen(false);
          setCreatedTokenData(null);
        }}
        title="Generate Bank Verification Request (Tier 2)"
      >
        {createdTokenData ? (
          <div className="space-y-4">
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-md text-xs space-y-1">
              <div className="flex items-center gap-2 font-bold text-emerald-900">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Single-Use 48-Hour Token Successfully Generated</span>
              </div>
              <p className="text-[11px] text-emerald-800">
                A 256-bit secure cryptographic token has been created for depository bank review. Share this URL with the depository nodal officer.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-gov-text">
                Secure Verification Link:
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={createdTokenData.verify_url}
                  className="w-full px-3 py-2 text-xs font-mono bg-slate-50 border border-gov-border rounded select-all focus:outline-none"
                />
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(createdTokenData.verify_url);
                    setCopiedTokenUrl(true);
                    setTimeout(() => setCopiedTokenUrl(false), 2000);
                  }}
                  className="px-3 py-2 text-xs font-semibold bg-gov-navy text-white hover:bg-gov-navy-light rounded shrink-0 flex items-center gap-1.5"
                >
                  {copiedTokenUrl ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Link</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded text-xs space-y-1 text-amber-900">
              <div className="font-bold flex items-center gap-1.5 text-amber-950">
                <ShieldAlert className="w-3.5 h-3.5 text-amber-700" />
                <span>Security Notice: Single-Use & Snapshot Protected</span>
              </div>
              <p className="text-[11px]">
                This token expires on <strong>{formatDateTime(createdTokenData.expires_at)}</strong>. It will be permanently invalidated once confirmed or rejected. Any subsequent modification to deposit parameters will invalidate snapshot verification.
              </p>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-gov-border">
              <a
                href={createdTokenData.verify_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-blue-700 hover:text-blue-900 font-semibold"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Test Link in New Tab</span>
              </a>

              <button
                type="button"
                onClick={() => {
                  setIsRequestModalOpen(false);
                  setCreatedTokenData(null);
                }}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-gov-navy hover:bg-gov-navy-light rounded"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleCreateVerificationRequest} className="space-y-4">
            <div className="p-3 bg-blue-50 border border-blue-200 text-blue-900 rounded text-xs space-y-1">
              <div className="font-bold text-blue-950">Tier 2 Depository Branch Verification</div>
              <p className="text-[11px]">
                This will generate a 256-bit cryptographically secure one-time token bound to an immutable snapshot of FDR #{fdr.fdr_number} (₹{fdr.amount.toLocaleString('en-IN')}).
              </p>
            </div>

            {requestError && (
              <div className="p-2.5 bg-red-50 text-red-700 text-xs rounded border border-red-200">
                {requestError}
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gov-text mb-1">
                  Depository Bank Official Email (Optional notification)
                </label>
                <input
                  type="email"
                  value={requestEmail}
                  onChange={(e) => setRequestEmail(e.target.value)}
                  placeholder="e.g. manager.mumbai@sbi.co.in"
                  className="w-full px-3 py-1.5 text-xs border border-gov-border rounded focus:outline-none focus:ring-1 focus:ring-gov-navy"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gov-text mb-1">
                  Verification Notes / Letter Reference
                </label>
                <textarea
                  rows={2}
                  value={requestNotes}
                  onChange={(e) => setRequestNotes(e.target.value)}
                  placeholder="e.g. Official lien marking confirmation requested for Tender Ref AICTE/2026/014"
                  className="w-full px-3 py-1.5 text-xs border border-gov-border rounded focus:outline-none focus:ring-1 focus:ring-gov-navy"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-gov-border">
              <button
                type="button"
                onClick={() => setIsRequestModalOpen(false)}
                className="px-3 py-1.5 text-xs font-semibold text-gov-text border border-gov-border rounded hover:bg-gov-light"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmittingRequest}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded disabled:opacity-50 flex items-center gap-1.5"
              >
                {isSubmittingRequest ? (
                  <>
                    <div className="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent" />
                    <span>Generating...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Generate Secure Link</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};
