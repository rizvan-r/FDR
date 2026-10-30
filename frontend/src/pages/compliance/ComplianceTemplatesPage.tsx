import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  FileText,
  PlusCircle,
  Search,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  CheckCircle2,
  Copy,
  PenTool,
} from 'lucide-react';
import { ComplianceTemplate } from '../../types';
import { fetchComplianceTemplates, createComplianceTemplate } from '../../lib/api';

export const ComplianceTemplatesPage: React.FC = () => {
  const navigate = useNavigate();

  const [templates, setTemplates] = useState<ComplianceTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<ComplianceTemplate | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // New Template form state
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState('compliance_clarification');
  const [newDesc, setNewDesc] = useState('');
  const [newContent, setNewContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadTemplates = async () => {
    setIsLoading(true);
    try {
      const data = await fetchComplianceTemplates();
      setTemplates(data);
      if (data.length > 0 && !selectedTemplate) {
        setSelectedTemplate(data[0]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTemplates();
  }, []);

  const handleCreateTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await createComplianceTemplate({
        template_name: newName,
        template_type: newType as any,
        description: newDesc,
        template_content: newContent,
      });
      setIsCreateModalOpen(false);
      setNewName('');
      setNewDesc('');
      setNewContent('');
      await loadTemplates();
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredTemplates = templates.filter(
    (t) =>
      t.template_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.template_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.description && t.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white border border-gov-border rounded-lg p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <button
            onClick={() => navigate('/compliance')}
            className="text-xs font-semibold text-gov-navy hover:underline flex items-center gap-1 mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Document Registry</span>
          </button>
          <h1 className="text-xl font-bold text-gov-navy">
            Statutory Compliance Letter & Notice Templates
          </h1>
          <p className="text-xs text-gov-muted mt-0.5">
            Pre-approved regulatory wording adhering strictly to Approval Process Handbook provisions.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gov-navy hover:bg-gov-navy-light text-white rounded-md font-semibold text-xs shadow-xs transition"
          >
            <PlusCircle className="w-4 h-4 text-emerald-400" />
            <span>Create Custom Template</span>
          </button>
        </div>
      </div>

      {/* Main Two-Column View */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Template List */}
        <div className="space-y-3">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-gov-muted absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search templates..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs border border-gov-border rounded-md bg-white focus:outline-hidden focus:border-gov-blue"
            />
          </div>

          <div className="space-y-2">
            {filteredTemplates.map((tpl) => (
              <div
                key={tpl.id}
                onClick={() => setSelectedTemplate(tpl)}
                className={`p-3.5 rounded-lg border text-xs cursor-pointer transition ${
                  selectedTemplate?.id === tpl.id
                    ? 'border-gov-blue bg-blue-50/50 shadow-2xs'
                    : 'border-gov-border bg-white hover:border-gray-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-gov-navy">{tpl.template_name}</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.2 bg-slate-100 text-slate-700 rounded border border-slate-200">
                    v{tpl.version}
                  </span>
                </div>
                <p className="text-[11px] text-gov-muted line-clamp-2 leading-relaxed">
                  {tpl.description || 'Statutory regulatory template.'}
                </p>
                <div className="mt-2 text-[10px] text-gov-blue font-medium uppercase">
                  {tpl.template_type.replace(/_/g, ' ')}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Template Inspection & Action */}
        <div className="lg:col-span-2">
          {selectedTemplate ? (
            <div className="bg-white border border-gov-border rounded-lg p-6 shadow-2xs space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gov-border pb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h2 className="text-base font-bold text-gov-navy">
                      {selectedTemplate.template_name}
                    </h2>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 uppercase">
                      Active Statutory Model
                    </span>
                  </div>
                  <p className="text-xs text-gov-muted">{selectedTemplate.description}</p>
                </div>

                <Link
                  to={`/compliance/generate?template_id=${selectedTemplate.id}`}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-gov-navy hover:bg-gov-navy-light text-white rounded-md font-semibold text-xs shadow-xs transition shrink-0"
                >
                  <PenTool className="w-4 h-4 text-amber-400" />
                  <span>Use Template to Generate Draft</span>
                </Link>
              </div>

              {/* Supported Dynamic Parameters */}
              <div className="p-3 bg-slate-50 border border-gov-border rounded-lg space-y-1.5 text-xs">
                <span className="font-semibold text-gov-navy">Supported Dynamic Auto-Fill Tokens:</span>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {[
                    '{{reference_number}}',
                    '{{generated_date}}',
                    '{{institution_name}}',
                    '{{fdr_number}}',
                    '{{amount}}',
                    '{{currency}}',
                    '{{bank_name}}',
                    '{{branch_name}}',
                    '{{ifsc_code}}',
                    '{{issue_date}}',
                    '{{maturity_date}}',
                    '{{lien_in_favour}}',
                  ].map((token) => (
                    <span
                      key={token}
                      className="px-2 py-0.5 rounded bg-white border border-gov-border font-mono text-[10px] text-gov-navy"
                    >
                      {token}
                    </span>
                  ))}
                </div>
              </div>

              {/* Template Content Preview */}
              <div className="space-y-1">
                <span className="text-xs font-semibold text-gov-navy">Template Body Text:</span>
                <div className="p-4 bg-slate-50/70 border border-gov-border rounded-lg text-xs font-mono leading-relaxed whitespace-pre-wrap text-gray-800 max-h-96 overflow-y-auto">
                  {selectedTemplate.template_content}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center text-xs text-gov-muted bg-white border border-gov-border rounded-lg">
              Select a statutory template on the left to inspect content.
            </div>
          )}
        </div>
      </div>

      {/* Create Custom Template Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-xl border border-gov-border max-w-xl w-full overflow-hidden">
            <div className="bg-gov-navy text-white px-5 py-3.5 flex items-center justify-between">
              <h3 className="text-sm font-bold">Add Statutory Compliance Template</h3>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-white/80 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateTemplate} className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-gov-navy mb-1">Template Name *</label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Special Directorate Collateral Summons"
                  className="w-full p-2 border border-gov-border rounded text-xs focus:border-gov-blue focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-semibold text-gov-navy mb-1">Template Category *</label>
                <select
                  value={newType}
                  onChange={(e) => setNewType(e.target.value)}
                  className="w-full p-2 border border-gov-border rounded text-xs bg-white focus:border-gov-blue focus:outline-hidden"
                >
                  <option value="fdr_confirmation">Statutory Deposit Confirmation</option>
                  <option value="fdr_discrepancy_inquiry">Notice of Discrepancy & Inquiry</option>
                  <option value="directorate_audit_summons">Directorate Hearing Summons</option>
                  <option value="maturity_intimation">Maturity Intimation Notice</option>
                  <option value="lineage_attestation">Lineage Substitution Certificate</option>
                  <option value="lien_release_preliminary">Preliminary Lien Release Clearance</option>
                  <option value="compliance_clarification">Compliance Clarification Notice</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-gov-navy mb-1">Regulatory Purpose Description</label>
                <input
                  type="text"
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Summary of statutory trigger..."
                  className="w-full p-2 border border-gov-border rounded text-xs focus:border-gov-blue focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-semibold text-gov-navy mb-1">
                  Template Content (Use {'{{fdr_number}}'}, {'{{institution_name}}'} tokens) *
                </label>
                <textarea
                  required
                  rows={8}
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  placeholder="Enter official letter text with placeholder tokens..."
                  className="w-full p-2 border border-gov-border rounded text-xs font-mono focus:border-gov-blue focus:outline-hidden"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-gov-border">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gov-navy rounded font-medium text-xs transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-1.5 bg-gov-navy hover:bg-gov-navy-light text-white rounded font-semibold text-xs shadow-xs transition"
                >
                  {isSubmitting ? 'Saving...' : 'Save Template'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
