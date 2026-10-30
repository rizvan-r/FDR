import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UploadCloud,
  FileSpreadsheet,
  Check,
  ArrowRight,
  ArrowLeft,
  AlertCircle,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';
import { FileUploadZone } from '../../components/migration/FileUploadZone';
import { ColumnMappingTable } from '../../components/migration/ColumnMappingTable';
import {
  ColumnMappingItem,
  MigrationBatchDetail,
  MigrationMappingProfile,
} from '../../types';
import {
  uploadMigrationFile,
  setColumnMappings,
  validateMigrationBatch,
  executeMigrationImport,
  fetchMigrationProfiles,
} from '../../lib/api';

export const MigrationUploadPage: React.FC = () => {
  const navigate = useNavigate();

  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [file, setFile] = useState<File | null>(null);
  const [batch, setBatch] = useState<MigrationBatchDetail | null>(null);
  const [profiles, setProfiles] = useState<MigrationMappingProfile[]>([]);
  const [mappings, setMappings] = useState<ColumnMappingItem[]>([]);
  const [saveProfileName, setSaveProfileName] = useState<string | undefined>();
  const [validationResult, setValidationResult] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    fetchMigrationProfiles().then(setProfiles).catch(() => {});
  }, []);

  const handleFileSelected = async (selectedFile: File) => {
    setFile(selectedFile);
    setErrorMsg(null);
  };

  const handleUploadAndProceed = async () => {
    if (!file) return;
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const createdBatch = await uploadMigrationFile(file);
      // Fetch full details with mappings
      setBatch(createdBatch as MigrationBatchDetail);
      setMappings((createdBatch as MigrationBatchDetail).mappings || []);
      setCurrentStep(2);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to parse and upload file.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleMappingsChange = (newMappings: ColumnMappingItem[], profileName?: string) => {
    setMappings(newMappings);
    setSaveProfileName(profileName);
  };

  const handleSaveMappingsAndValidate = async () => {
    if (!batch) return;
    setIsLoading(true);
    setErrorMsg(null);
    try {
      await setColumnMappings(batch.id, mappings, saveProfileName);
      const valRes = await validateMigrationBatch(batch.id);
      setValidationResult(valRes);
      setCurrentStep(3);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to validate batch with selected mappings.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExecuteImport = async () => {
    if (!batch) return;
    setIsLoading(true);
    try {
      await executeMigrationImport(batch.id, true);
      navigate(`/migrations/${batch.id}`);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to execute import.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white border border-gov-border rounded-lg p-6 shadow-xs flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gov-navy">
            Legacy Spreadsheet Onboarding Wizard
          </h1>
          <p className="text-xs text-gov-muted mt-0.5">
            Step-by-step ingestion: upload file, map headers, run validation, and verify Tier 1 creation.
          </p>
        </div>

        <button
          onClick={() => navigate('/migrations')}
          className="text-xs font-semibold text-gov-navy hover:underline flex items-center gap-1"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Batches</span>
        </button>
      </div>

      {/* Stepper Progress Bar */}
      <div className="bg-white border border-gov-border rounded-lg p-4 shadow-2xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs ${
                currentStep >= 1 ? 'bg-gov-navy text-white' : 'bg-gray-100 text-gray-500'
              }`}
            >
              1
            </div>
            <div>
              <span className="text-xs font-bold text-gov-navy">Upload Spreadsheet</span>
              <p className="text-[10px] text-gov-muted">Select CSV or Excel document</p>
            </div>
          </div>

          <div className="h-0.5 w-16 bg-gov-border hidden sm:block" />

          <div className="flex items-center gap-3">
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs ${
                currentStep >= 2 ? 'bg-gov-navy text-white' : 'bg-gray-100 text-gray-500'
              }`}
            >
              2
            </div>
            <div>
              <span className="text-xs font-bold text-gov-navy">Column Mapping</span>
              <p className="text-[10px] text-gov-muted">Match headers to FDR fields</p>
            </div>
          </div>

          <div className="h-0.5 w-16 bg-gov-border hidden sm:block" />

          <div className="flex items-center gap-3">
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs ${
                currentStep === 3 ? 'bg-gov-navy text-white' : 'bg-gray-100 text-gray-500'
              }`}
            >
              3
            </div>
            <div>
              <span className="text-xs font-bold text-gov-navy">Validate & Import</span>
              <p className="text-[10px] text-gov-muted">Review duplicates & execute</p>
            </div>
          </div>
        </div>
      </div>

      {/* Error Notice */}
      {errorMsg && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-md text-xs text-rose-800 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* STEP 1: Upload */}
      {currentStep === 1 && (
        <div className="bg-white border border-gov-border rounded-lg p-6 shadow-2xs space-y-6">
          <FileUploadZone onFileSelected={handleFileSelected} isLoading={isLoading} />

          <div className="flex items-center justify-end pt-4 border-t border-gov-border">
            <button
              onClick={handleUploadAndProceed}
              disabled={!file || isLoading}
              className="inline-flex items-center gap-2 px-5 py-2 bg-gov-navy hover:bg-gov-navy-light disabled:opacity-50 text-white rounded-md font-semibold text-xs shadow-xs transition"
            >
              <span>{isLoading ? 'Parsing File...' : 'Proceed to Column Mapping'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: Column Mapping */}
      {currentStep === 2 && batch && (
        <div className="bg-white border border-gov-border rounded-lg p-6 shadow-2xs space-y-6">
          <div className="space-y-1">
            <h2 className="text-sm font-bold text-gov-navy">
              Configure Header Alignment for {batch.file_name}
            </h2>
            <p className="text-xs text-gov-muted">
              Auto-suggestions are pre-selected based on column name heuristics. Check and refine each field mapping.
            </p>
          </div>

          <ColumnMappingTable
            headers={batch.headers || []}
            initialMappings={mappings}
            profiles={profiles}
            onMappingsChange={handleMappingsChange}
            isLoading={isLoading}
          />

          <div className="flex items-center justify-between pt-4 border-t border-gov-border">
            <button
              onClick={() => setCurrentStep(1)}
              className="px-4 py-2 border border-gov-border hover:bg-gov-light text-gov-navy rounded-md font-medium text-xs transition"
            >
              Back to Upload
            </button>

            <button
              onClick={handleSaveMappingsAndValidate}
              disabled={isLoading}
              className="inline-flex items-center gap-2 px-5 py-2 bg-gov-navy hover:bg-gov-navy-light text-white rounded-md font-semibold text-xs shadow-xs transition"
            >
              <span>{isLoading ? 'Validating Records...' : 'Save Mapping & Run Validation'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: Validation & Import */}
      {currentStep === 3 && batch && validationResult && (
        <div className="bg-white border border-gov-border rounded-lg p-6 shadow-2xs space-y-6">
          <div className="space-y-1">
            <h2 className="text-sm font-bold text-gov-navy">
              Validation Summary for Batch {batch.id}
            </h2>
            <p className="text-xs text-gov-muted">
              Review data health metrics before final creation of Trust Tier 1 vault records.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="p-4 bg-slate-50 border border-gov-border rounded-lg text-center">
              <span className="text-xs text-gov-muted">Total Rows Analyzed</span>
              <p className="text-xl font-bold text-gov-navy mt-1">{validationResult.total_rows}</p>
            </div>
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg text-center">
              <span className="text-xs text-emerald-800 font-semibold">Valid & Ready</span>
              <p className="text-xl font-bold text-emerald-700 mt-1">{validationResult.valid_rows}</p>
            </div>
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-lg text-center">
              <span className="text-xs text-rose-800 font-semibold">Flagged / Duplicates</span>
              <p className="text-xl font-bold text-rose-700 mt-1">{validationResult.invalid_rows}</p>
            </div>
          </div>

          {/* Statutory Tier 1 Assurance Note */}
          <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-lg text-xs text-blue-900 space-y-2">
            <div className="flex items-center gap-2 font-bold text-gov-blue">
              <ShieldCheck className="w-4 h-4 text-gov-blue shrink-0" />
              <span>Statutory Ingestion Invariant Assurance:</span>
            </div>
            <p className="text-[11px] text-blue-800 leading-relaxed">
              Importing this batch creates live entries in the Central FDR Vault strictly at{' '}
              <strong className="underline">Trust Tier 1 (Institution Declared)</strong> with pending lifecycle custody. The import operation is idempotent and will not re-import duplicate FDR identifiers.
            </p>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-gov-border">
            <button
              onClick={() => setCurrentStep(2)}
              className="px-4 py-2 border border-gov-border hover:bg-gov-light text-gov-navy rounded-md font-medium text-xs transition"
            >
              Back to Mapping
            </button>

            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate(`/migrations/${batch.id}`)}
                className="px-4 py-2 border border-gov-border hover:bg-gov-light text-gov-navy rounded-md font-medium text-xs transition"
              >
                Review Problematic Rows
              </button>

              <button
                onClick={handleExecuteImport}
                disabled={isLoading || validationResult.valid_rows === 0}
                className="inline-flex items-center gap-2 px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-md font-semibold text-xs shadow-xs transition"
              >
                <Check className="w-4 h-4" />
                <span>{isLoading ? 'Importing...' : `Import ${validationResult.valid_rows} Valid Records`}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
