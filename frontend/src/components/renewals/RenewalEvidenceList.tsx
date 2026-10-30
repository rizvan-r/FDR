import React, { useState } from 'react';
import { RenewalEvidence } from '../../types';

interface RenewalEvidenceListProps {
  evidence: RenewalEvidence[];
  onUpload?: (file: File, type: string, description: string) => Promise<void>;
  canUpload?: boolean;
}

export const RenewalEvidenceList: React.FC<RenewalEvidenceListProps> = ({
  evidence,
  onUpload,
  canUpload = false,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [evidenceType, setEvidenceType] = useState<string>('bank_renewal_advice');
  const [description, setDescription] = useState<string>('');
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [copiedChecksum, setCopiedChecksum] = useState<string | null>(null);

  const handleCopyChecksum = (checksum?: string) => {
    if (!checksum) return;
    navigator.clipboard.writeText(checksum);
    setCopiedChecksum(checksum);
    setTimeout(() => setCopiedChecksum(null), 2000);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile || !onUpload) return;
    try {
      setIsUploading(true);
      setUploadError(null);
      await onUpload(selectedFile, evidenceType, description);
      setSelectedFile(null);
      setDescription('');
    } catch (err: any) {
      setUploadError(err.message || 'Failed to upload evidence document');
    } finally {
      setIsUploading(false);
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  const getEvidenceTypeLabel = (type: string) => {
    switch (type) {
      case 'replacement_fdr_copy':
        return 'Replacement FDR Certificate';
      case 'bank_renewal_advice':
        return 'Official Bank Renewal Advice';
      case 'original_fdr_closure':
        return 'Original FDR Closure / Maturity Voucher';
      case 'bank_pledge_confirmation':
        return 'Lien / Pledge Confirmation Letter';
      default:
        return 'Supporting Document';
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
      <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-slate-900">
            Mandatory Supporting Evidence ({evidence.length})
          </h3>
          <p className="text-xs text-slate-500">
            Cryptographically fingerprinted audit records (SHA-256) verifying bank renewal advice
          </p>
        </div>
      </div>

      {/* Evidence Items List */}
      <div className="divide-y divide-slate-100">
        {evidence.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">
            No supporting documents attached yet. At least one bank confirmation document is required for approval.
          </div>
        ) : (
          evidence.map((item) => (
            <div key={item.id} className="p-4 hover:bg-slate-50 transition-colors">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                      {getEvidenceTypeLabel(item.evidence_type)}
                    </span>
                    <span className="text-sm font-medium text-slate-900">
                      {item.file_name || 'Document'}
                    </span>
                    <span className="text-xs text-slate-400">
                      ({formatFileSize(item.file_size_bytes)})
                    </span>
                  </div>

                  {item.description && (
                    <p className="text-xs text-slate-600">{item.description}</p>
                  )}

                  {/* SHA-256 Checksum Pill */}
                  {item.sha256_checksum && (
                    <div className="flex items-center gap-1.5 pt-1">
                      <span className="text-[10px] text-slate-400 uppercase font-mono">SHA-256:</span>
                      <code className="text-[10px] font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-600 truncate max-w-xs">
                        {item.sha256_checksum}
                      </code>
                      <button
                        type="button"
                        onClick={() => handleCopyChecksum(item.sha256_checksum)}
                        className="text-[10px] text-blue-600 hover:text-blue-800 font-medium"
                      >
                        {copiedChecksum === item.sha256_checksum ? 'Copied!' : 'Copy'}
                      </button>
                    </div>
                  )}
                </div>

                <div className="text-right flex flex-col items-end gap-1">
                  {item.is_reviewed ? (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                      ✓ Verified by Officer
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                      ⏳ Pending Verification
                    </span>
                  )}
                  {item.reviewed_at && (
                    <span className="text-[10px] text-slate-400">
                      Reviewed on {new Date(item.reviewed_at).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>

              {item.review_notes && (
                <div className="mt-2 text-xs bg-emerald-50/60 border border-emerald-100 text-emerald-900 p-2 rounded">
                  <strong>Review Note:</strong> {item.review_notes}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Upload Form */}
      {canUpload && onUpload && (
        <form onSubmit={handleFormSubmit} className="p-5 bg-slate-50 border-t border-slate-200 space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600">
            Attach Supporting Document
          </h4>

          {uploadError && (
            <div className="p-2.5 rounded bg-rose-50 border border-rose-200 text-rose-800 text-xs">
              {uploadError}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block text-slate-700 font-medium mb-1">
                Document Category *
              </label>
              <select
                value={evidenceType}
                onChange={(e) => setEvidenceType(e.target.value)}
                className="w-full border border-slate-300 rounded px-3 py-1.5 bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="bank_renewal_advice">Official Bank Renewal Advice</option>
                <option value="replacement_fdr_copy">Replacement FDR Certificate Copy</option>
                <option value="original_fdr_closure">Original FDR Closure / Settlement Voucher</option>
                <option value="bank_pledge_confirmation">Bank Lien / Pledge Confirmation Letter</option>
                <option value="other_supporting_document">Other Supporting Document</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-700 font-medium mb-1">
                Select File (PDF, JPEG, PNG, max 10MB) *
              </label>
              <input
                type="file"
                accept=".pdf,image/jpeg,image/png"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                className="w-full text-xs text-slate-600 file:mr-2 file:py-1 file:px-2.5 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                required
              />
            </div>

            <div className="col-span-2">
              <label className="block text-slate-700 font-medium mb-1">
                Description / Memo
              </label>
              <input
                type="text"
                placeholder="e.g. Scanned branch advice letter signed by AGM with official seal"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full border border-slate-300 rounded px-3 py-1.5 bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex justify-end pt-1">
            <button
              type="submit"
              disabled={isUploading || !selectedFile}
              className="px-4 py-1.5 rounded bg-blue-700 text-white font-medium text-xs hover:bg-blue-800 disabled:opacity-50 transition-colors shadow-sm"
            >
              {isUploading ? 'Uploading & Hashing...' : 'Upload Evidence'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
