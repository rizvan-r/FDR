import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  FileCheck2,
  Building2,
  ShieldCheck,
  IndianRupee,
  Calendar,
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Send,
  Ban,
  FileText,
  Lock,
  Layers,
  Archive,
} from 'lucide-react';
import { ReleaseRequestDetail, ChecklistItemStatus } from '../../types';
import {
  fetchReleaseRequestDetail,
  submitReleaseRequest,
  cancelReleaseRequest,
  updateReleaseChecklistItem,
  submitReleaseReview,
  returnReleaseRequest,
  approveReleaseRequest,
  rejectReleaseRequest,
  prepareReleaseInstruction,
  recordBankConfirmation,
  recordRefundTransaction,
  reconcileRefund,
  closeReleaseRequest,
} from '../../lib/api';
import { ReleaseStatusBadge } from '../../components/release/ReleaseStatusBadge';
import { EligibilityChecklist } from '../../components/release/EligibilityChecklist';
import { BankReleaseStatusCard } from '../../components/release/BankReleaseStatusCard';
import { RefundTransactionTable } from '../../components/release/RefundTransactionTable';
import { ReviewDecisionPanel } from '../../components/release/ReviewDecisionPanel';
import { ClosureConfirmationDialog } from '../../components/release/ClosureConfirmationDialog';

export const ReleaseRequestDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [request, setRequest] = useState<ReleaseRequestDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'checklist' | 'reviews' | 'bank' | 'refund'>('checklist');
  const [showClosureModal, setShowClosureModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const loadDetail = async () => {
    if (!id) return;
    setIsLoading(true);
    try {
      const data = await fetchReleaseRequestDetail(id);
      setRequest(data);
      setErrorMsg(null);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load release request details.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDetail();
  }, [id]);

  const handleSubmitDraft = async () => {
    if (!id) return;
    try {
      setActionLoading(true);
      await submitReleaseRequest(id);
      await loadDetail();
    } catch (err: any) {
      alert(err.message || 'Failed to submit release request.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelRequest = async () => {
    if (!id) return;
    const reason = prompt('Enter cancellation reason:');
    if (!reason) return;
    try {
      setActionLoading(true);
      await cancelReleaseRequest(id, reason);
      await loadDetail();
    } catch (err: any) {
      alert(err.message || 'Failed to cancel release request.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateChecklistItem = async (
    itemId: string,
    status: ChecklistItemStatus,
    comments?: string
  ) => {
    if (!id) return;
    await updateReleaseChecklistItem(id, itemId, {
      review_status: status,
      review_comments: comments,
    });
    await loadDetail();
  };

  const handleAddReview = async (stage: string, decision: string, comments: string) => {
    if (!id) return;
    await submitReleaseReview(id, { review_stage: stage, review_decision: decision, comments });
    await loadDetail();
  };

  const handleReturnRequest = async (comments: string) => {
    if (!id) return;
    await returnReleaseRequest(id, comments);
    await loadDetail();
  };

  const handleApproveRequest = async (comments: string) => {
    if (!id) return;
    await approveReleaseRequest(id, comments);
    await loadDetail();
  };

  const handleRejectRequest = async (comments: string) => {
    if (!id) return;
    await rejectReleaseRequest(id, comments);
    await loadDetail();
  };

  const handlePrepareBankInstruction = async () => {
    if (!id) return;
    setActionLoading(true);
    try {
      await prepareReleaseInstruction(id);
      await loadDetail();
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmBankRelease = async (
    bankRef: string,
    status: 'released' | 'release_rejected',
    method: string
  ) => {
    if (!id) return;
    setActionLoading(true);
    try {
      await recordBankConfirmation(id, {
        bank_reference: bankRef,
        release_status: status,
        confirmation_method: method,
      });
      await loadDetail();
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddRefundTx = async (txData: any) => {
    if (!id) return;
    await recordRefundTransaction(id, txData);
    await loadDetail();
  };

  const handleReconcileRefund = async (status: string, refNotes?: string) => {
    if (!id) return;
    await reconcileRefund(id, {
      refund_status: status,
      refund_reference: refNotes,
    });
    await loadDetail();
  };

  const handleConfirmClosure = async (notes: string) => {
    if (!id) return;
    await closeReleaseRequest(id, { closure_notes: notes });
    await loadDetail();
  };

  const formatCurrency = (amt: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amt);
  };

  if (isLoading) {
    return (
      <div className="p-16 text-center text-slate-500 text-sm">
        <Clock className="w-8 h-8 animate-spin mx-auto mb-2 text-[#1D5F91]" />
        Loading release request dossier...
      </div>
    );
  }

  if (errorMsg || !request) {
    return (
      <div className="max-w-xl mx-auto p-8 text-center bg-white border border-slate-200 rounded-xl shadow-sm">
        <AlertTriangle className="w-10 h-10 text-rose-500 mx-auto mb-3" />
        <h2 className="text-base font-bold text-slate-900">Release Dossier Unavailable</h2>
        <p className="text-xs text-slate-600 mt-1 mb-4">{errorMsg || 'Release request not found.'}</p>
        <Link
          to="/releases"
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#1D5F91] hover:bg-[#12345A] rounded-lg"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Release Command
        </Link>
      </div>
    );
  }

  const isDraft = request.request_status === 'draft';
  const isApproved = ['approved', 'release_initiated', 'bank_confirmed', 'closed'].includes(request.request_status);
  const isBankReleased = request.bank_release?.release_status === 'released' || request.bank_release_status === 'released';
  const isClosed = request.request_status === 'closed';

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Top Breadcrumb & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <Link
          to="/releases"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Release Command
        </Link>

        <div className="flex flex-wrap items-center gap-2">
          {isDraft && (
            <>
              <button
                type="button"
                onClick={handleCancelRequest}
                disabled={actionLoading}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg shadow-sm"
              >
                <Ban className="w-3.5 h-3.5" />
                Cancel Request
              </button>
              <button
                type="button"
                onClick={handleSubmitDraft}
                disabled={actionLoading}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-[#1D5F91] hover:bg-[#12345A] rounded-lg shadow-sm"
              >
                <Send className="w-3.5 h-3.5" />
                Submit for Audit
              </button>
            </>
          )}

          {isApproved && isBankReleased && !isClosed && (
            <button
              type="button"
              onClick={() => setShowClosureModal(true)}
              disabled={actionLoading}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-sm"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Execute Final Case Closure
            </button>
          )}

          {isClosed && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg">
              <Archive className="w-3.5 h-3.5 text-emerald-600" />
              Archived & Permanently Settled
            </span>
          )}
        </div>
      </div>

      {/* Main Dossier Header Banner */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
                Official Release Dossier
              </span>
              <span className="text-xs font-mono font-medium text-slate-500">
                {request.policy_version || 'RPV-2026.1'}
              </span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
              <FileCheck2 className="w-7 h-7 text-[#12345A]" />
              {request.request_number}
            </h1>
            <p className="text-xs text-slate-600 mt-1 flex items-center gap-1.5">
              <span>Institution:</span>
              <strong className="text-slate-900 font-semibold">{request.institution_name}</strong>
              <span className="text-slate-300">|</span>
              <span>Requested on:</span>
              <span className="text-slate-700 font-medium">
                {new Date(request.created_at).toLocaleDateString()}
              </span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <div className="text-right">
              <span className="text-xs text-slate-500 font-medium block">Principal Corpus</span>
              <span className="text-2xl font-extrabold text-slate-900">
                {formatCurrency(request.principal_amount || 0)}
              </span>
            </div>

            <div className="h-10 w-[1px] bg-slate-200 hidden sm:block" />

            <div className="space-y-1">
              <div className="text-[11px] font-medium text-slate-500">Lifecycle Status:</div>
              <ReleaseStatusBadge status={request.request_status} type="request" size="md" />
            </div>
          </div>
        </div>

        {/* Underlying FDR Details Strip */}
        <div className="mt-4 pt-1 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div>
            <span className="text-slate-500 font-medium text-[11px]">Underlying FDR Number</span>
            <div className="font-mono font-bold text-[#1D5F91] mt-0.5">
              {request.fdr_number || request.fdr_id}
            </div>
          </div>

          <div>
            <span className="text-slate-500 font-medium text-[11px]">Issuing Depository Bank</span>
            <div className="font-semibold text-slate-800 mt-0.5">
              {request.bank_name || 'Designated Bank'}
            </div>
          </div>

          <div>
            <span className="text-slate-500 font-medium text-[11px]">Bank Release Standing</span>
            <div className="mt-1">
              <ReleaseStatusBadge
                status={request.bank_release_status || 'not_started'}
                type="bank"
                size="sm"
              />
            </div>
          </div>

          <div>
            <span className="text-slate-500 font-medium text-[11px]">Refund Ledger Standing</span>
            <div className="mt-1">
              <ReleaseStatusBadge
                status={request.refund_status || 'pending'}
                type="refund"
                size="sm"
              />
            </div>
          </div>
        </div>

        {/* Reason / Grounds */}
        <div className="mt-4 p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs">
          <span className="font-bold text-slate-800">Declared Statutory Grounds:</span>{' '}
          <span className="text-slate-700">{request.request_reason}</span>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-slate-200 flex items-center gap-1">
        <button
          type="button"
          onClick={() => setActiveTab('checklist')}
          className={`px-4 py-2.5 text-xs font-semibold rounded-t-lg transition-colors border-b-2 flex items-center gap-2 ${
            activeTab === 'checklist'
              ? 'border-[#1D5F91] text-[#1D5F91] bg-white'
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          Eligibility Checklist ({request.checklist_items?.length || 0})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('reviews')}
          className={`px-4 py-2.5 text-xs font-semibold rounded-t-lg transition-colors border-b-2 flex items-center gap-2 ${
            activeTab === 'reviews'
              ? 'border-[#1D5F91] text-[#1D5F91] bg-white'
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
          }`}
        >
          <Clock className="w-4 h-4" />
          Review & Decision Trail ({request.reviews?.length || 0})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('bank')}
          className={`px-4 py-2.5 text-xs font-semibold rounded-t-lg transition-colors border-b-2 flex items-center gap-2 ${
            activeTab === 'bank'
              ? 'border-[#1D5F91] text-[#1D5F91] bg-white'
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
          }`}
        >
          <Building2 className="w-4 h-4" />
          Bank Release Tracking
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('refund')}
          className={`px-4 py-2.5 text-xs font-semibold rounded-t-lg transition-colors border-b-2 flex items-center gap-2 ${
            activeTab === 'refund'
              ? 'border-[#1D5F91] text-[#1D5F91] bg-white'
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
          }`}
        >
          <IndianRupee className="w-4 h-4" />
          Refund Ledger
        </button>
      </div>

      {/* Tab Panels */}
      <div>
        {activeTab === 'checklist' && (
          <EligibilityChecklist
            items={request.checklist_items || []}
            canEdit={!isClosed && request.request_status !== 'rejected'}
            onUpdateItem={handleUpdateChecklistItem}
            isLoading={actionLoading}
          />
        )}

        {activeTab === 'reviews' && (
          <ReviewDecisionPanel
            request={request}
            canReview={!isClosed && !isDraft}
            canApprove={!isClosed && request.request_status !== 'approved'}
            onAddReview={handleAddReview}
            onReturn={handleReturnRequest}
            onApprove={handleApproveRequest}
            onReject={handleRejectRequest}
            isLoading={actionLoading}
          />
        )}

        {activeTab === 'bank' && (
          <BankReleaseStatusCard
            bankRelease={request.bank_release}
            canPrepareInstruction={request.request_status === 'approved' && (!request.bank_release || request.bank_release.release_status === 'not_started')}
            canSimulateBank={!isClosed && request.bank_release?.release_status !== 'released'}
            onPrepareInstruction={handlePrepareBankInstruction}
            onConfirmBankRelease={handleConfirmBankRelease}
            isLoading={actionLoading}
          />
        )}

        {activeTab === 'refund' && (
          <RefundTransactionTable
            refundRecord={request.refund_record}
            canRecordTransaction={!isClosed}
            canReconcile={!isClosed}
            onAddTransaction={handleAddRefundTx}
            onReconcile={handleReconcileRefund}
            isLoading={actionLoading}
          />
        )}
      </div>

      {/* Case Closure Modal */}
      <ClosureConfirmationDialog
        isOpen={showClosureModal}
        request={request}
        onClose={() => setShowClosureModal(false)}
        onConfirmClose={handleConfirmClosure}
        isLoading={actionLoading}
      />
    </div>
  );
};
