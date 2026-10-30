import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  fetchInstitutions,
  fetchBanks,
  fetchBranchesByBankId,
  createFDR,
  uploadFDRDocument,
  computeSha256,
} from '../../lib/api';
import { Institution, Bank, BankBranch, DocumentType } from '../../types';
import { SEED_INSTITUTIONS, SEED_BANKS, SEED_BRANCHES } from '../../lib/mockData';
import {
  FileText,
  Landmark,
  Building2,
  Calendar,
  IndianRupee,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  ShieldAlert,
  ArrowLeft,
  Hash,
  HelpCircle,
} from 'lucide-react';

export const FDRRegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Reference Catalogs
  const [institutions, setInstitutions] = useState<Institution[]>(SEED_INSTITUTIONS);
  const [banks, setBanks] = useState<Bank[]>(SEED_BANKS);
  const [branches, setBranches] = useState<BankBranch[]>(
    SEED_BRANCHES.filter((b) => b.bank_id === SEED_BANKS[0].id)
  );

  // Selected State
  const [selectedInstitutionId, setSelectedInstitutionId] = useState<string>(
    user?.institution_id || SEED_INSTITUTIONS[0].id
  );
  const [selectedBankId, setSelectedBankId] = useState<string>(SEED_BANKS[0].id);
  const [selectedBranchId, setSelectedBranchId] = useState<string>(
    SEED_BRANCHES.filter((b) => b.bank_id === SEED_BANKS[0].id)[0]?.id || ''
  );

  // Form Fields
  const [fdrNumber, setFdrNumber] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [issueDate, setIssueDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [maturityDate, setMaturityDate] = useState<string>('');
  const [interestRate, setInterestRate] = useState<string>('7.10');
  const [lienInFavour, setLienInFavour] = useState<string>('');
  const [remarks, setRemarks] = useState<string>('');

  // Document Upload State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [docType, setDocType] = useState<DocumentType>('original_fdr');
  const [docDescription, setDocDescription] = useState<string>('Scanned original bank deposit receipt');
  const [fileChecksum, setFileChecksum] = useState<string>('');
  const [isComputingHash, setIsComputingHash] = useState<boolean>(false);

  // Status
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    loadCatalogs();
  }, [user]);

  const loadCatalogs = async () => {
    try {
      const [instList, bankList] = await Promise.all([
        fetchInstitutions(),
        fetchBanks(),
      ]);
      const validInsts = instList && instList.length > 0 ? instList : SEED_INSTITUTIONS;
      const validBanks = bankList && bankList.length > 0 ? bankList : SEED_BANKS;

      setInstitutions(validInsts);
      setBanks(validBanks);

      // Determine default institution from user's profile
      if (user?.institution_id && validInsts.some((i) => i.id === user.institution_id)) {
        setSelectedInstitutionId(user.institution_id);
      } else if (validInsts.length > 0) {
        setSelectedInstitutionId(validInsts[0].id);
      }

      // Default Bank & Branches
      if (validBanks.length > 0) {
        const initialBank = validBanks[0];
        setSelectedBankId(initialBank.id);
        let brList = await fetchBranchesByBankId(initialBank.id);
        if (!brList || brList.length === 0) {
          brList = SEED_BRANCHES.filter((b) => b.bank_id === initialBank.id);
        }
        setBranches(brList);
        if (brList.length > 0) {
          setSelectedBranchId(brList[0].id);
        }
      }
    } catch (err: any) {
      console.warn('Using local seed catalogs for FDR registration:', err);
      setInstitutions(SEED_INSTITUTIONS);
      setBanks(SEED_BANKS);
      setSelectedInstitutionId(user?.institution_id || SEED_INSTITUTIONS[0].id);
      setSelectedBankId(SEED_BANKS[0].id);
      const sbiBranches = SEED_BRANCHES.filter((b) => b.bank_id === SEED_BANKS[0].id);
      setBranches(sbiBranches);
      if (sbiBranches.length > 0) {
        setSelectedBranchId(sbiBranches[0].id);
      }
    }
  };

  const handleBankChange = async (bankId: string) => {
    setSelectedBankId(bankId);
    setSelectedBranchId('');
    try {
      let brList = await fetchBranchesByBankId(bankId);
      if (!brList || brList.length === 0) {
        brList = SEED_BRANCHES.filter((b) => b.bank_id === bankId);
      }
      setBranches(brList);
      if (brList.length > 0) {
        setSelectedBranchId(brList[0].id);
      }
    } catch (err: any) {
      console.warn('Failed to load branches, using seeds:', err);
      const fallbackBranches = SEED_BRANCHES.filter((b) => b.bank_id === bankId);
      setBranches(fallbackBranches);
      if (fallbackBranches.length > 0) {
        setSelectedBranchId(fallbackBranches[0].id);
      }
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size limit: 10MB
    const MAX_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      setErrorMessage(`Selected file is ${(file.size / (1024 * 1024)).toFixed(2)} MB. Maximum allowed limit is 10 MB.`);
      setSelectedFile(null);
      setFileChecksum('');
      return;
    }

    setErrorMessage(null);
    setSelectedFile(file);
    setIsComputingHash(true);
    try {
      const sha256 = await computeSha256(file);
      setFileChecksum(sha256);
    } catch (err: any) {
      setErrorMessage('Failed to compute client SHA-256 hash: ' + err.message);
    } finally {
      setIsComputingHash(false);
    }
  };

  // Indian Number Format in Words helper
  const getAmountInWords = (numStr: string) => {
    const n = parseFloat(numStr);
    if (!n || isNaN(n)) return '';
    if (n >= 10000000) {
      return `₹ ${(n / 10000000).toFixed(2)} Crore Rupees`;
    }
    if (n >= 100000) {
      return `₹ ${(n / 100000).toFixed(2)} Lakh Rupees`;
    }
    return `₹ ${n.toLocaleString('en-IN')} Rupees`;
  };

  const selectedInst = institutions.find((i) => i.id === selectedInstitutionId);
  const selectedBank = banks.find((b) => b.id === selectedBankId);
  const selectedBranch = branches.find((br) => br.id === selectedBranchId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    // Form Validations
    if (!selectedBankId || !selectedBranchId) {
      setErrorMessage('Please select a depository bank and branch.');
      return;
    }
    if (!fdrNumber.trim()) {
      setErrorMessage('Please provide the official FDR Certificate / Receipt number.');
      return;
    }
    const parsedAmount = parseFloat(amount);
    if (!parsedAmount || parsedAmount <= 0) {
      setErrorMessage('Principal amount must be a positive number greater than 0.');
      return;
    }
    if (!issueDate || !maturityDate) {
      setErrorMessage('Both Issue Date and Maturity Date are mandatory.');
      return;
    }
    if (new Date(maturityDate) <= new Date(issueDate)) {
      setErrorMessage('Maturity date must strictly occur after the Issue date.');
      return;
    }
    if (!lienInFavour.trim()) {
      setErrorMessage('Please specify the official authority / title in whose favour the lien is marked.');
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Create FDR Record (Strict Phase 2: Tier 1, Pending, Institution Declared)
      const createdFDR = await createFDR({
        institution_id: selectedInstitutionId,
        bank_id: selectedBankId,
        branch_id: selectedBranchId,
        fdr_number: fdrNumber.trim().toUpperCase(),
        amount: parsedAmount,
        issue_date: issueDate,
        maturity_date: maturityDate,
        interest_rate: interestRate ? parseFloat(interestRate) : undefined,
        lien_in_favour: lienInFavour.trim(),
        remarks: remarks.trim() || undefined,
      });

      // 2. Upload Document if selected
      if (selectedFile) {
        await uploadFDRDocument(createdFDR.id, selectedFile, docType, docDescription);
      }

      setSuccessMessage(`FDR ${createdFDR.fdr_number} successfully registered in Tier 1 custody.`);
      setTimeout(() => {
        navigate(`/fdrs/${createdFDR.id}`);
      }, 1200);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to register FDR.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Back button and Header */}
      <div>
        <button
          onClick={() => navigate('/fdrs')}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-gov-blue hover:text-gov-navy mb-3 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to FDR Repository</span>
        </button>

        <div className="bg-white p-6 rounded-lg border border-gov-border shadow-xs">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase bg-[#12345A]/10 text-gov-navy rounded">
              Phase 2 E-Registration
            </span>
            <span className="text-xs text-gov-muted font-medium">Depositor Custody Workflow</span>
          </div>
          <h1 className="text-2xl font-bold text-gov-navy tracking-tight mt-1">
            Register Fixed Deposit Receipt (FDR)
          </h1>
          <p className="text-sm text-gov-muted mt-0.5">
            Declare custodial FDR deposit, register statutory lien terms, and submit verified documentation.
          </p>
        </div>
      </div>

      {/* Strict Phase 2 Governance Alert */}
      <div className="p-4 rounded-lg bg-amber-50/70 border border-amber-200 text-amber-900 text-xs flex items-start gap-3">
        <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold text-amber-800">Phase 2 Governance Invariant:</span>
          <p className="mt-0.5 text-amber-700 leading-relaxed">
            All newly declared deposits are created strictly with{' '}
            <strong className="underline">Trust Tier 1</strong> (Status: <em>Pending</em>, Verification:{' '}
            <em>Institution Declared</em>). Promotion to Trust Tier 2 (Bank Confirmed) requires subsequent digital verification by the depository bank's nodal officer in Phase 3.
          </p>
        </div>
      </div>

      {/* Messages */}
      {errorMessage && (
        <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {successMessage && (
        <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section A: Depositor Institution */}
        <div className="bg-white p-6 rounded-lg border border-gov-border shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-gov-border">
            <Building2 className="w-4 h-4 text-gov-blue" />
            <h2 className="text-sm font-bold text-gov-navy uppercase tracking-wider">
              Section A: Depositor Institution Information
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gov-text mb-1" htmlFor="depositor-institution-select">
                Depositor Entity / Authority *
              </label>
              <select
                id="depositor-institution-select"
                value={selectedInstitutionId}
                onChange={(e) => setSelectedInstitutionId(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-gov-border rounded bg-white text-gov-text focus:outline-none focus:ring-1 focus:ring-gov-navy font-medium"
                required
              >
                {institutions.map((inst) => (
                  <option key={inst.id} value={inst.id}>
                    {inst.name} ({inst.code})
                  </option>
                ))}
              </select>
              {user?.institution_id && (
                <p className="text-[11px] text-gov-muted mt-1">
                  Assigned Profile Entity:{' '}
                  <span className="font-semibold text-gov-navy">
                    {institutions.find((i) => i.id === user.institution_id)?.name || 'Assigned Institution'}
                  </span>
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-gov-text mb-1">
                Territorial Region & Ministry
              </label>
              <div className="p-2.5 bg-gov-bg rounded border border-gov-border text-xs">
                <div className="font-medium text-gov-navy">
                  {selectedInst?.nodal_ministry || selectedInst?.region?.name || 'Central Ministry Scope'}
                </div>
                <div className="text-[11px] text-gov-muted mt-0.5">
                  Registration No:{' '}
                  <span className="font-mono">{selectedInst?.registration_number || selectedInst?.code || 'N/A'}</span>{' '}
                  | Category:{' '}
                  <span className="capitalize font-medium">
                    {selectedInst?.institution_type?.replace(/_/g, ' ') || 'Public Statutory Body'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Section B: Depository Bank & Branch */}
        <div className="bg-white p-6 rounded-lg border border-gov-border shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-gov-border">
            <Landmark className="w-4 h-4 text-gov-blue" />
            <h2 className="text-sm font-bold text-gov-navy uppercase tracking-wider">
              Section B: Depository Bank & Branch Details
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Bank Select */}
            <div>
              <label className="block text-xs font-semibold text-gov-text mb-1" htmlFor="depository-bank-select">
                Depository Bank *
              </label>
              <select
                id="depository-bank-select"
                value={selectedBankId}
                onChange={(e) => handleBankChange(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-gov-border rounded bg-white text-gov-text focus:outline-none focus:ring-1 focus:ring-gov-navy"
                required
              >
                {banks.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.code})
                  </option>
                ))}
              </select>
            </div>

            {/* Branch Select */}
            <div>
              <label className="block text-xs font-semibold text-gov-text mb-1" htmlFor="issuing-branch-select">
                Issuing Branch *
              </label>
              <select
                id="issuing-branch-select"
                value={selectedBranchId}
                onChange={(e) => setSelectedBranchId(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-gov-border rounded bg-white text-gov-text focus:outline-none focus:ring-1 focus:ring-gov-navy"
                required
              >
                {branches.length === 0 && <option value="">No branches configured</option>}
                {branches.map((br) => (
                  <option key={br.id} value={br.id}>
                    {br.branch_name} ({br.ifsc_code})
                  </option>
                ))}
              </select>
            </div>

            {/* Read-only IFSC and Address */}
            <div className="md:col-span-2 p-3 bg-gov-bg rounded border border-gov-border flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <div>
                <span className="text-gov-muted">Branch IFSC Code: </span>
                <span className="font-mono font-bold text-gov-navy">
                  {selectedBranch?.ifsc_code || (branches[0]?.ifsc_code ?? 'Select Branch')}
                </span>
              </div>
              <div className="text-gov-muted text-[11px]">
                {selectedBranch?.address
                  ? `${selectedBranch.address}, ${selectedBranch.city || ''}`
                  : (branches[0]?.address ? `${branches[0].address}, ${branches[0].city || ''}` : 'Official depository branch')}
              </div>
            </div>

            {/* FDR Certificate Number */}
            <div>
              <label className="block text-xs font-semibold text-gov-text mb-1 flex items-center justify-between">
                <span>FDR Receipt / Certificate No. *</span>
                <span className="text-[10px] text-gov-muted font-normal">Must be unique per bank</span>
              </label>
              <div className="relative">
                <Hash className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gov-muted" />
                <input
                  type="text"
                  value={fdrNumber}
                  onChange={(e) => setFdrNumber(e.target.value)}
                  placeholder="e.g. FDR-2026-NHAI-84920"
                  className="w-full pl-8 pr-3 py-2 text-xs font-mono border border-gov-border rounded focus:outline-none focus:ring-1 focus:ring-gov-navy uppercase"
                  required
                />
              </div>
            </div>

            {/* Lien In Favour Of */}
            <div>
              <label className="block text-xs font-semibold text-gov-text mb-1">
                Lien In Favour Of (Beneficiary Authority) *
              </label>
              <input
                type="text"
                value={lienInFavour}
                onChange={(e) => setLienInFavour(e.target.value)}
                placeholder="e.g. Chairman, National Highways Authority of India"
                className="w-full px-3 py-2 text-xs border border-gov-border rounded focus:outline-none focus:ring-1 focus:ring-gov-navy"
                required
              />
            </div>
          </div>
        </div>

        {/* Section C: Financial & Tenor Details */}
        <div className="bg-white p-6 rounded-lg border border-gov-border shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-gov-border">
            <IndianRupee className="w-4 h-4 text-gov-blue" />
            <h2 className="text-sm font-bold text-gov-navy uppercase tracking-wider">
              Section C: Financial & Tenor Parameters
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Amount */}
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-gov-text mb-1 flex items-center justify-between">
                <span>Principal Deposit Amount (INR ₹) *</span>
                <span className="text-[11px] text-gov-blue font-medium">
                  {amount && getAmountInWords(amount)}
                </span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-gov-navy text-xs">
                  ₹
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="e.g. 25000000"
                  className="w-full pl-7 pr-3 py-2 text-xs font-mono font-bold text-gov-navy border border-gov-border rounded focus:outline-none focus:ring-1 focus:ring-gov-navy"
                  required
                />
              </div>
            </div>

            {/* Interest Rate */}
            <div>
              <label className="block text-xs font-semibold text-gov-text mb-1">
                Interest Rate (% p.a.)
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="25"
                  value={interestRate}
                  onChange={(e) => setInterestRate(e.target.value)}
                  placeholder="e.g. 7.10"
                  className="w-full px-3 py-2 text-xs font-mono border border-gov-border rounded focus:outline-none focus:ring-1 focus:ring-gov-navy"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gov-muted">
                  %
                </span>
              </div>
            </div>

            {/* Issue Date */}
            <div>
              <label className="block text-xs font-semibold text-gov-text mb-1">
                Issue / Deposit Date *
              </label>
              <input
                type="date"
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-gov-border rounded focus:outline-none focus:ring-1 focus:ring-gov-navy"
                required
              />
            </div>

            {/* Maturity Date */}
            <div>
              <label className="block text-xs font-semibold text-gov-text mb-1">
                Maturity Date *
              </label>
              <input
                type="date"
                value={maturityDate}
                min={issueDate}
                onChange={(e) => setMaturityDate(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-gov-border rounded focus:outline-none focus:ring-1 focus:ring-gov-navy"
                required
              />
            </div>

            {/* Remarks / Purpose */}
            <div className="md:col-span-3">
              <label className="block text-xs font-semibold text-gov-text mb-1">
                Deposit Purpose / Contract Reference
              </label>
              <input
                type="text"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="e.g. Performance Security Deposit for Expressway Package 4 (Tender Ref: NHAI/2026/PKG-04)"
                className="w-full px-3 py-2 text-xs border border-gov-border rounded focus:outline-none focus:ring-1 focus:ring-gov-navy"
              />
            </div>
          </div>
        </div>

        {/* Section D: Document Upload & Cryptographic Hash */}
        <div className="bg-white p-6 rounded-lg border border-gov-border shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-gov-border">
            <div className="flex items-center gap-2">
              <UploadCloud className="w-4 h-4 text-gov-blue" />
              <h2 className="text-sm font-bold text-gov-navy uppercase tracking-wider">
                Section D: Document Inspection & Cryptographic Checksum
              </h2>
            </div>
            <span className="text-[10px] text-gov-muted">Max file size: 10 MB</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gov-text mb-1">
                Document Classification
              </label>
              <select
                value={docType}
                onChange={(e) => setDocType(e.target.value as DocumentType)}
                className="w-full px-3 py-2 text-xs border border-gov-border rounded bg-white text-gov-text focus:outline-none focus:ring-1 focus:ring-gov-navy"
              >
                <option value="original_fdr">Original Scanned FDR Receipt</option>
                <option value="lien_letter">Statutory Lien Marking Letter</option>
                <option value="supporting_document">Tender / Contract Notice</option>
                <option value="other">Other Official Enclosure</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-gov-text mb-1">
                Document Description
              </label>
              <input
                type="text"
                value={docDescription}
                onChange={(e) => setDocDescription(e.target.value)}
                placeholder="e.g. Scanned copy of physical FDR signed by SBI Chief Manager"
                className="w-full px-3 py-2 text-xs border border-gov-border rounded focus:outline-none focus:ring-1 focus:ring-gov-navy"
              />
            </div>

            {/* File Input Box */}
            <div className="md:col-span-3">
              <div className="border-2 border-dashed border-gov-border hover:border-gov-navy rounded-lg p-5 text-center transition-colors">
                <input
                  type="file"
                  id="fdrDocFile"
                  accept=".pdf,.png,.jpg,.jpeg"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <label
                  htmlFor="fdrDocFile"
                  className="cursor-pointer flex flex-col items-center justify-center space-y-2"
                >
                  <UploadCloud className="w-8 h-8 text-gov-blue" />
                  <div className="text-xs font-medium text-gov-text">
                    {selectedFile ? (
                      <span className="font-semibold text-gov-navy">{selectedFile.name}</span>
                    ) : (
                      <span>
                        <span className="text-gov-blue underline font-semibold">Click to upload</span>{' '}
                        or drag & drop official FDR voucher
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-gov-muted">
                    Supported formats: PDF, PNG, JPG (up to 10 MB)
                  </div>
                </label>
              </div>

              {/* SHA-256 Checksum Indicator */}
              {isComputingHash && (
                <div className="mt-2 text-xs text-gov-blue flex items-center gap-2">
                  <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-gov-blue border-t-transparent" />
                  <span>Computing SHA-256 cryptographic digest...</span>
                </div>
              )}

              {fileChecksum && (
                <div className="mt-3 p-3 bg-slate-50 border border-slate-200 rounded text-xs space-y-1">
                  <div className="flex items-center gap-1.5 text-emerald-700 font-semibold text-[11px]">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Cryptographic SHA-256 Digest Computed (Client Verified)</span>
                  </div>
                  <div className="font-mono text-[10px] text-slate-700 break-all bg-white p-2 rounded border border-slate-200">
                    {fileChecksum}
                  </div>
                  <div className="text-[10px] text-gov-muted">
                    This cryptographic fingerprint will be permanently recorded in the audit event log to prevent tampering.
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => navigate('/fdrs')}
            className="px-4 py-2 text-xs font-semibold text-gov-text border border-gov-border rounded-md hover:bg-gov-light transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-gov-navy hover:bg-gov-navy-light text-white text-xs font-semibold rounded-md shadow-xs disabled:opacity-50 transition-colors"
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-white border-t-transparent" />
                <span>Registering FDR Record...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Submit & Register FDR (Tier 1)</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
