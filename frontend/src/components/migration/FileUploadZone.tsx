import React, { useState, useRef } from 'react';
import { UploadCloud, FileSpreadsheet, AlertCircle, Download, CheckCircle2 } from 'lucide-react';

interface FileUploadZoneProps {
  onFileSelected: (file: File) => void;
  isLoading?: boolean;
}

export const FileUploadZone: React.FC<FileUploadZoneProps> = ({
  onFileSelected,
  isLoading = false,
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateAndSelect = (file: File) => {
    setErrorMsg(null);
    const validExtensions = ['.csv', '.xlsx', '.xls'];
    const hasValidExt = validExtensions.some((ext) =>
      file.name.toLowerCase().endsWith(ext)
    );

    if (!hasValidExt) {
      setErrorMsg('Invalid file format. Please upload a standard CSV or Excel (.xlsx) spreadsheet.');
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      setErrorMsg('File exceeds 20MB regulatory transfer threshold.');
      return;
    }

    setSelectedFile(file);
    onFileSelected(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSelect(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSelect(e.target.files[0]);
    }
  };

  const downloadSampleTemplate = () => {
    const csvContent = `Institution Name,Bank Name,Branch,FDR No,Deposit Amount,Currency,Date of Issue,Date of Maturity,Interest Rate,Lien In Favour,Remarks\nNational Highways Authority of India,State Bank of India,SBI Main Branch,FDR-2026-LEGACY-001,10000000,INR,2026-01-01,2027-01-01,7.1,AICTE,Standard Legacy Rollover Deposit\n`;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'AICTE_Legacy_FDR_Sample_Template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4">
      {/* Drag & Drop Area */}
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
          dragActive
            ? 'border-gov-blue bg-blue-50/50'
            : 'border-gov-border hover:border-gov-blue hover:bg-gov-light/30'
        } ${isLoading ? 'opacity-50 pointer-events-none' : ''}`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.xlsx,.xls"
          onChange={handleChange}
          className="hidden"
        />

        <div className="flex flex-col items-center justify-center space-y-3">
          <div className="w-14 h-14 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center text-gov-blue">
            <UploadCloud className="w-7 h-7" />
          </div>

          <div>
            <p className="text-sm font-bold text-gov-navy">
              {selectedFile ? selectedFile.name : 'Click to select or drag and drop spreadsheet'}
            </p>
            <p className="text-xs text-gov-muted mt-1">
              Supports Comma Separated Values (.csv) or Microsoft Excel (.xlsx) files
            </p>
          </div>

          {selectedFile && (
            <div className="flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Ready for mapping ({(selectedFile.size / 1024).toFixed(1)} KB)</span>
            </div>
          )}
        </div>
      </div>

      {/* Error Notice */}
      {errorMsg && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-md text-xs text-rose-800 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Statutory Batch Limits & Instructions */}
      <div className="bg-slate-50 border border-gov-border rounded-lg p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
        <div className="space-y-0.5">
          <span className="font-semibold text-gov-navy">Statutory Governance Invariants:</span>
          <p className="text-[11px] text-gov-muted">
            Batches are limited to 5,000 records per upload. All imported records initialize strictly at{' '}
            <strong className="text-gov-navy">Trust Tier 1 (Pending Bank Verification)</strong>.
          </p>
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            downloadSampleTemplate();
          }}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gov-border hover:bg-gov-light text-gov-navy rounded font-medium text-xs shadow-2xs transition shrink-0"
        >
          <Download className="w-3.5 h-3.5 text-gov-blue" />
          <span>Download Sample CSV</span>
        </button>
      </div>
    </div>
  );
};
