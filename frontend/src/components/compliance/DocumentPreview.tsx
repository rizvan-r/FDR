import React from 'react';
import { ComplianceDocument } from '../../types';
import { ShieldCheck, Award, FileCheck, CheckCircle2 } from 'lucide-react';

interface DocumentPreviewProps {
  document: ComplianceDocument;
}

export const DocumentPreview: React.FC<DocumentPreviewProps> = ({ document }) => {
  return (
    <div className="relative bg-white border border-gov-border rounded-xl shadow-md p-8 md:p-12 text-gov-text font-serif max-w-3xl mx-auto overflow-hidden">
      {/* Background Watermark */}
      <div className="absolute inset-0 flex items-center justify-center opacity-4 pointer-events-none select-none">
        <div className="text-[120px] font-black uppercase text-gov-navy tracking-widest rotate-[-30deg]">
          AICTE
        </div>
      </div>

      {/* Official Government Letterhead Header */}
      <div className="border-b-2 border-gov-navy pb-4 mb-6 text-center">
        <div className="flex items-center justify-center gap-3 mb-2">
          {/* Emblem Placeholder / Seal */}
          <div className="w-12 h-12 rounded-full border-2 border-amber-600 flex items-center justify-center text-amber-700 bg-amber-50 shadow-2xs font-bold text-xs">
            भारत
          </div>
        </div>

        <h1 className="text-base md:text-lg font-bold tracking-wide text-gov-navy uppercase">
          अखिल भारतीय तकनीकी शिक्षा परिषद्
        </h1>
        <h2 className="text-sm font-semibold text-gov-navy tracking-wider uppercase">
          All India Council for Technical Education
        </h2>
        <p className="text-[10px] text-gov-muted mt-1 font-sans">
          (A Statutory Body of the Government of India, Ministry of Education)
        </p>
        <p className="text-[10px] text-gov-muted font-sans">
          Nelson Mandela Marg, Vasant Kunj, New Delhi - 110070 | www.aicte-india.org
        </p>
      </div>

      {/* Metadata Bar: Reference & Date */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs font-sans border-b border-gray-100 pb-3 mb-6 gap-2">
        <div>
          <span className="text-gov-muted">Dispatch Reference No: </span>
          <span className="font-mono font-bold text-gov-navy">{document.reference_number}</span>
        </div>
        <div>
          <span className="text-gov-muted">Date: </span>
          <span className="font-semibold text-gov-navy">
            {new Date(document.updated_at || document.created_at).toLocaleDateString('en-IN', {
              day: '2-digit',
              month: 'long',
              year: 'numeric',
            })}
          </span>
        </div>
      </div>

      {/* Document Body */}
      <div className="text-xs leading-relaxed space-y-4 whitespace-pre-wrap font-sans text-gray-800">
        {document.content_text}
      </div>

      {/* Mock Signature / Supervisory Seal Panel */}
      <div className="mt-12 pt-6 border-t border-gray-200">
        <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-6">
          <div className="space-y-1 text-[10px] font-sans text-gov-muted">
            <p>Verification SHA-256 Digest:</p>
            <p className="font-mono text-[9px] text-gray-500 break-all">
              {document.finalized_pdf_hash || 'c8f43a90b1e428d0954b9f2913e6178a3d72e90f23a4b5c6d7e8f90123456789'}
            </p>
            <p>Generated via Central FDR-Chain Governance Node</p>
          </div>

          {document.document_status === 'signed' && document.mock_signature ? (
            <div className="p-3 bg-amber-50/80 border border-amber-300 rounded-lg text-amber-950 font-sans shadow-2xs space-y-1.5 w-full sm:w-72">
              <div className="flex items-center gap-1.5 font-bold text-xs text-amber-900">
                <FileCheck className="w-4 h-4 text-emerald-600" />
                <span>Simulated Digital E-Seal</span>
              </div>
              <p className="text-[11px] font-semibold text-gray-800">
                {document.mock_signature.signer_display_name}
              </p>
              <p className="text-[10px] font-mono text-gray-600">
                Ref: {document.mock_signature.signature_reference}
              </p>
              <div className="pt-1 border-t border-amber-200 text-[9px] font-bold text-amber-800 uppercase tracking-wider">
                {document.mock_signature.disclaimer}
              </div>
            </div>
          ) : document.document_status === 'approved' ? (
            <div className="text-right font-sans">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded font-bold text-xs">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Supervisory Approval Granted</span>
              </div>
              <p className="text-[10px] text-gov-muted mt-1">Pending Digital E-Sign</p>
            </div>
          ) : (
            <div className="text-right font-sans text-gov-muted text-xs">
              <div className="italic text-gray-400 border-b border-dashed border-gray-300 pb-1 mb-1">
                [Authorized Signatory Signature]
              </div>
              <p className="font-semibold text-gov-navy">Competent Regulatory Authority</p>
              <p className="text-[10px]">AICTE Central Directorate</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
