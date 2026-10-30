import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  FileText,
  Building2,
  Coins,
  ArrowRight,
  ArrowLeft,
  Check,
  AlertCircle,
  Eye,
  Sparkles,
} from 'lucide-react';
import {
  ComplianceTemplate,
  Institution,
  FDR,
} from '../../types';
import {
  fetchComplianceTemplates,
  fetchInstitutions,
  fetchFDRs,
  generateComplianceDocument,
} from '../../lib/api';

export const GenerateComplianceDocumentPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const preTemplateId = searchParams.get('template_id') || '';
  const preFdrId = searchParams.get('fdr_id') || '';
  const preInstitutionId = searchParams.get('institution_id') || '';

  const [templates, setTemplates] = useState<ComplianceTemplate[]>([]);
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [fdrs, setFdrs] = useState<FDR[]>([]);

  const [selectedTemplateId, setSelectedTemplateId] = useState(preTemplateId);
  const [selectedInstitutionId, setSelectedInstitutionId] = useState(preInstitutionId);
  const [selectedFdrId, setSelectedFdrId] = useState(preFdrId);
  const [customTitle, setCustomTitle] = useState('');

  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        const [tplList, instList, fdrList] = await Promise.all([
          fetchComplianceTemplates(),
          fetchInstitutions(),
          fetchFDRs({ page: 1, page_size: 50 }),
        ]);
        setTemplates(tplList);
        setInstitutions(instList);
        setFdrs(fdrList.items || []);

        if (tplList.length > 0 && !selectedTemplateId) {
          setSelectedTemplateId(tplList[0].id);
        }
        if (instList.length > 0 && !selectedInstitutionId) {
          setSelectedInstitutionId(instList[0].id);
        }
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  const filteredFdrs = fdrs.filter(
    (f) => !selectedInstitutionId || f.institution_id === selectedInstitutionId
  );

  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId);
  const selectedFdr = fdrs.find((f) => f.id === selectedFdrId);
  const selectedInstitution = institutions.find((i) => i.id === selectedInstitutionId);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTemplateId || !selectedInstitutionId) {
      setErrorMsg('Please select both a statutory template and an institution.');
      return;
    }

    setIsGenerating(true);
    setErrorMsg(null);
    try {
      const doc = await generateComplianceDocument({
        template_id: selectedTemplateId,
        institution_id: selectedInstitutionId,
        fdr_id: selectedFdrId || undefined,
        custom_title: customTitle.trim() || undefined,
      });
      navigate(`/compliance/documents/${doc.id}`);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to generate compliance document.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white border border-gov-border rounded-lg p-6 shadow-xs flex items-center justify-between">
        <div>
          <button
            onClick={() => navigate('/compliance')}
            className="text-xs font-semibold text-gov-navy hover:underline flex items-center gap-1 mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Document Registry</span>
          </button>
          <h1 className="text-xl font-bold text-gov-navy">
            Generate Statutory Compliance Document
          </h1>
          <p className="text-xs text-gov-muted mt-0.5">
            Auto-fill official letters, notices, or certificates from Central FDR Vault data.
          </p>
        </div>
      </div>

      {errorMsg && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-md text-xs text-rose-800 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Generation Form */}
      <form onSubmit={handleGenerate} className="bg-white border border-gov-border rounded-lg p-6 shadow-2xs space-y-5 text-xs">
        {/* Template Selector */}
        <div>
          <label className="block font-semibold text-gov-navy mb-1.5 flex items-center gap-1.5">
            <FileText className="w-4 h-4 text-gov-blue" />
            <span>Statutory Template Model *</span>
          </label>
          <select
            value={selectedTemplateId}
            onChange={(e) => setSelectedTemplateId(e.target.value)}
            required
            className="w-full p-2.5 border border-gov-border rounded-md text-xs bg-white focus:border-gov-blue focus:outline-hidden"
          >
            {templates.map((tpl) => (
              <option key={tpl.id} value={tpl.id}>
                {tpl.template_name} ({tpl.template_type.replace(/_/g, ' ')})
              </option>
            ))}
          </select>
          {selectedTemplate && (
            <p className="text-[11px] text-gov-muted mt-1 leading-relaxed">
              {selectedTemplate.description}
            </p>
          )}
        </div>

        {/* Institution Selector */}
        <div>
          <label className="block font-semibold text-gov-navy mb-1.5 flex items-center gap-1.5">
            <Building2 className="w-4 h-4 text-indigo-600" />
            <span>Target Beneficiary Institution *</span>
          </label>
          <select
            value={selectedInstitutionId}
            onChange={(e) => {
              setSelectedInstitutionId(e.target.value);
              setSelectedFdrId('');
            }}
            required
            className="w-full p-2.5 border border-gov-border rounded-md text-xs bg-white focus:border-gov-blue focus:outline-hidden"
          >
            {institutions.map((inst) => (
              <option key={inst.id} value={inst.id}>
                {inst.name} ({inst.code})
              </option>
            ))}
          </select>
        </div>

        {/* Linked FDR Selector */}
        <div>
          <label className="block font-semibold text-gov-navy mb-1.5 flex items-center gap-1.5">
            <Coins className="w-4 h-4 text-amber-600" />
            <span>Associated Fixed Deposit Receipt (Optional for General Notice)</span>
          </label>
          <select
            value={selectedFdrId}
            onChange={(e) => setSelectedFdrId(e.target.value)}
            className="w-full p-2.5 border border-gov-border rounded-md text-xs bg-white focus:border-gov-blue focus:outline-hidden"
          >
            <option value="">-- No Specific FDR Linked (General Audit Notice) --</option>
            {filteredFdrs.map((fdr) => (
              <option key={fdr.id} value={fdr.id}>
                {fdr.fdr_number} — INR {Number(fdr.amount).toLocaleString('en-IN')} ({fdr.bank_name || 'Bank'})
              </option>
            ))}
          </select>
        </div>

        {/* Custom Subject / Title */}
        <div>
          <label className="block font-semibold text-gov-navy mb-1.5">
            Custom Document Title (Optional)
          </label>
          <input
            type="text"
            value={customTitle}
            onChange={(e) => setCustomTitle(e.target.value)}
            placeholder={selectedTemplate?.template_name || 'e.g. Official Confirmation - Package 1'}
            className="w-full p-2.5 border border-gov-border rounded-md text-xs focus:border-gov-blue focus:outline-hidden"
          />
        </div>

        {/* Summary Card */}
        <div className="p-4 bg-slate-50 border border-gov-border rounded-lg space-y-1.5 text-xs">
          <span className="font-semibold text-gov-navy flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-gov-blue" />
            <span>Pre-Filling Parameter Alignment:</span>
          </span>
          <div className="text-[11px] text-gov-muted space-y-1 pt-1">
            <p>• Institution: <strong>{selectedInstitution?.name || 'Selected Institution'}</strong></p>
            <p>• Linked Collateral: <strong>{selectedFdr ? `${selectedFdr.fdr_number} (INR ${Number(selectedFdr.amount).toLocaleString('en-IN')})` : 'General Notice'}</strong></p>
            <p>• Target Template: <strong>{selectedTemplate?.template_name}</strong></p>
            <p>• Initial Status: <strong>Draft (Version 1) with SHA-256 Content Snapshot</strong></p>
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-gov-border">
          <button
            type="button"
            onClick={() => navigate('/compliance')}
            className="px-4 py-2 border border-gov-border hover:bg-gov-light text-gov-navy rounded-md font-medium text-xs transition"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={isGenerating}
            className="inline-flex items-center gap-2 px-5 py-2 bg-gov-navy hover:bg-gov-navy-light text-white rounded-md font-semibold text-xs shadow-xs transition"
          >
            <span>{isGenerating ? 'Pre-filling & Generating...' : 'Generate Statutory Draft'}</span>
            <ArrowRight className="w-4 h-4 text-emerald-400" />
          </button>
        </div>
      </form>
    </div>
  );
};
