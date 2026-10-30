import React, { useState } from 'react';
import { ColumnMappingItem, MigrationMappingProfile } from '../../types';
import { Check, AlertCircle, Save, Sparkles } from 'lucide-react';

interface ColumnMappingTableProps {
  headers: string[];
  initialMappings: ColumnMappingItem[];
  profiles?: MigrationMappingProfile[];
  onMappingsChange: (mappings: ColumnMappingItem[], profileName?: string) => void;
  isLoading?: boolean;
}

export const CANONICAL_FDR_FIELDS = [
  { field: 'institution_name', label: 'Institution Name', required: false, description: 'Beneficiary educational/state institution' },
  { field: 'bank_name', label: 'Commercial Bank Name', required: true, description: 'Issuing scheduled commercial bank' },
  { field: 'branch_name', label: 'Branch Office', required: false, description: 'Specific bank branch' },
  { field: 'fdr_number', label: 'FDR Number / Receipt No', required: true, description: 'Primary fixed deposit receipt identifier' },
  { field: 'amount', label: 'Deposit Principal Amount', required: true, description: 'Positive numeric deposit value' },
  { field: 'currency', label: 'Currency Code', required: false, description: 'Defaults to INR' },
  { field: 'issue_date', label: 'Date of Issue', required: true, description: 'Origination date (YYYY-MM-DD or DD/MM/YYYY)' },
  { field: 'maturity_date', label: 'Date of Maturity', required: true, description: 'Statutory expiration date (after issue date)' },
  { field: 'interest_rate', label: 'Interest Rate (% p.a.)', required: false, description: 'Annual yield percentage' },
  { field: 'lien_in_favour', label: 'Lien Registered In Favour', required: false, description: 'Defaults to AICTE' },
  { field: 'remarks', label: 'Remarks / Custodial Notes', required: false, description: 'Audit trail or legacy archive memo' },
];

export const ColumnMappingTable: React.FC<ColumnMappingTableProps> = ({
  headers,
  initialMappings,
  profiles = [],
  onMappingsChange,
  isLoading = false,
}) => {
  const [currentMappings, setCurrentMappings] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    initialMappings.forEach((m) => {
      map[m.source_column] = m.target_field;
    });
    return map;
  });

  const [saveProfile, setSaveProfile] = useState(false);
  const [profileName, setProfileName] = useState('');

  const handleFieldChange = (header: string, targetField: string) => {
    const updated = { ...currentMappings, [header]: targetField };
    setCurrentMappings(updated);

    const mappingList: ColumnMappingItem[] = Object.entries(updated)
      .filter(([_, val]) => val && val !== 'ignore')
      .map(([src, trg]) => ({
        source_column: src,
        target_field: trg,
      }));

    onMappingsChange(mappingList, saveProfile ? profileName : undefined);
  };

  const handleApplyProfile = (prof: MigrationMappingProfile) => {
    const updated: Record<string, string> = {};
    headers.forEach((h) => {
      if (prof.column_mapping[h]) {
        updated[h] = prof.column_mapping[h];
      }
    });
    setCurrentMappings(updated);

    const mappingList: ColumnMappingItem[] = Object.entries(updated)
      .filter(([_, val]) => val && val !== 'ignore')
      .map(([src, trg]) => ({
        source_column: src,
        target_field: trg,
      }));

    onMappingsChange(mappingList);
  };

  // Required field coverage validation
  const mappedTargets = new Set(Object.values(currentMappings));
  const missingRequired = CANONICAL_FDR_FIELDS.filter(
    (f) => f.required && !mappedTargets.has(f.field)
  );

  return (
    <div className="space-y-4">
      {/* Top Profile Selection Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 bg-slate-50 border border-gov-border rounded-lg text-xs">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-gov-blue shrink-0" />
          <span className="font-semibold text-gov-navy">Saved Mapping Profiles:</span>
          {profiles.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {profiles.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleApplyProfile(p)}
                  className="px-2.5 py-1 bg-white border border-gov-border hover:border-gov-blue hover:text-gov-blue rounded font-medium text-[11px] shadow-2xs transition"
                >
                  {p.profile_name}
                </button>
              ))}
            </div>
          ) : (
            <span className="text-gov-muted italic text-[11px]">No saved profiles yet</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5 cursor-pointer text-[11px] text-gov-navy font-medium">
            <input
              type="checkbox"
              checked={saveProfile}
              onChange={(e) => setSaveProfile(e.target.checked)}
              className="rounded border-gov-border text-gov-blue focus:ring-gov-blue"
            />
            <span>Save as Reusable Profile</span>
          </label>
          {saveProfile && (
            <input
              type="text"
              placeholder="e.g. State Bank Legacy Format"
              value={profileName}
              onChange={(e) => {
                setProfileName(e.target.value);
                const mappingList: ColumnMappingItem[] = Object.entries(currentMappings)
                  .filter(([_, val]) => val && val !== 'ignore')
                  .map(([src, trg]) => ({ source_column: src, target_field: trg }));
                onMappingsChange(mappingList, e.target.value);
              }}
              className="px-2 py-1 text-xs border border-gov-border rounded bg-white w-48 focus:outline-hidden focus:border-gov-blue"
            />
          )}
        </div>
      </div>

      {/* Mapping Table */}
      <div className="border border-gov-border rounded-lg overflow-hidden bg-white shadow-2xs">
        <table className="w-full text-left text-xs">
          <thead className="bg-gov-light text-gov-navy font-semibold border-b border-gov-border">
            <tr>
              <th className="p-3 w-1/3">Spreadsheet Column Header</th>
              <th className="p-3 w-1/3">Canonical FDR Field</th>
              <th className="p-3 w-1/3">Field Requirement & Purpose</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gov-border">
            {headers.map((hdr) => {
              const currentVal = currentMappings[hdr] || '';
              const matchedField = CANONICAL_FDR_FIELDS.find((f) => f.field === currentVal);

              return (
                <tr key={hdr} className="hover:bg-slate-50/50 transition-colors">
                  <td className="p-3 font-mono font-medium text-gov-navy flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-slate-100 rounded border border-slate-200">
                      {hdr}
                    </span>
                  </td>
                  <td className="p-3">
                    <select
                      value={currentVal}
                      disabled={isLoading}
                      onChange={(e) => handleFieldChange(hdr, e.target.value)}
                      className={`w-full p-2 border rounded-md text-xs font-medium focus:outline-hidden ${
                        matchedField?.required
                          ? 'border-emerald-300 bg-emerald-50/30 text-emerald-950 focus:border-emerald-500'
                          : 'border-gov-border bg-white text-gov-text focus:border-gov-blue'
                      }`}
                    >
                      <option value="">-- Ignore / Do Not Map --</option>
                      {CANONICAL_FDR_FIELDS.map((f) => (
                        <option key={f.field} value={f.field}>
                          {f.label} {f.required ? '(* Required)' : ''}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="p-3 text-[11px] text-gov-muted">
                    {matchedField ? (
                      <span className="flex items-center gap-1.5">
                        {matchedField.required && (
                          <span className="px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 font-bold text-[9px]">
                            MANDATORY
                          </span>
                        )}
                        <span>{matchedField.description}</span>
                      </span>
                    ) : (
                      <span className="text-gray-400 italic">This column will be omitted from import</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Validation Banner */}
      {missingRequired.length > 0 ? (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-md text-xs text-amber-900 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold">Missing Required Field Mappings: </span>
            The following mandatory fields must be mapped before running validation:{' '}
            <strong className="underline">
              {missingRequired.map((f) => f.label).join(', ')}
            </strong>
          </div>
        </div>
      ) : (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-md text-xs text-emerald-900 flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="font-medium">
            All mandatory statutory fields mapped. Ready to validate spreadsheet data.
          </span>
        </div>
      )}
    </div>
  );
};
