import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { RenewalCase, Institution, Bank } from '../../types';
import { fetchRenewalCases, fetchInstitutions, fetchBanks } from '../../lib/api';
import { RenewalStatusBadge } from '../../components/renewals/RenewalStatusBadge';

export const RenewalApprovalQueuePage: React.FC = () => {
  const [cases, setCases] = useState<RenewalCase[]>([]);
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('under_review');
  const [institutionFilter, setInstitutionFilter] = useState<string>('');
  const [bankFilter, setBankFilter] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');

  const loadData = async () => {
    try {
      setLoading(true);
      const [casesRes, instRes, bankRes] = await Promise.all([
        fetchRenewalCases({
          status: statusFilter === 'all' ? undefined : statusFilter,
          institution_id: institutionFilter || undefined,
          search: searchTerm || undefined,
        }),
        fetchInstitutions(),
        fetchBanks(),
      ]);
      setCases(casesRes.items);
      setInstitutions(instRes);
      setBanks(bankRes);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [statusFilter, institutionFilter, bankFilter, searchTerm]);

  const filteredCases = bankFilter
    ? cases.filter((c) => c.bank_id === bankFilter)
    : cases;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded border border-amber-200">
              Regulatory Desk
            </span>
            <span className="text-xs font-medium text-slate-500">
              Supervisory Workload
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Officer Renewal Approval Queue
          </h1>
          <p className="text-sm text-slate-600 mt-1 max-w-2xl">
            Pending institutional renewal cases requiring regulatory review, bank confirmation validation,
            and directed lineage DAG commitment.
          </p>
        </div>

        <Link
          to="/renewals"
          className="px-3.5 py-2 rounded-lg border border-slate-300 text-slate-700 font-medium text-xs hover:bg-slate-50 transition-colors"
        >
          ← Back to Renewal Desk
        </Link>
      </div>

      {/* Filter Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
        <div>
          <label className="block text-slate-600 font-medium mb-1">Case Status</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full border border-slate-300 rounded p-2 bg-white text-slate-800"
          >
            <option value="under_review">Under Review (Action Req.)</option>
            <option value="submitted">Submitted</option>
            <option value="draft">Drafts</option>
            <option value="approved">Approved & Linked</option>
            <option value="rejected">Rejected</option>
            <option value="all">All Statuses</option>
          </select>
        </div>

        <div>
          <label className="block text-slate-600 font-medium mb-1">Beneficiary Institution</label>
          <select
            value={institutionFilter}
            onChange={(e) => setInstitutionFilter(e.target.value)}
            className="w-full border border-slate-300 rounded p-2 bg-white text-slate-800"
          >
            <option value="">All Institutions</option>
            {institutions.map((i) => (
              <option key={i.id} value={i.id}>
                {i.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-slate-600 font-medium mb-1">Depository Bank</label>
          <select
            value={bankFilter}
            onChange={(e) => setBankFilter(e.target.value)}
            className="w-full border border-slate-300 rounded p-2 bg-white text-slate-800"
          >
            <option value="">All Banks</option>
            {banks.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-slate-600 font-medium mb-1">Search Identifier</label>
          <input
            type="text"
            placeholder="Search case #, FDR #..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full border border-slate-300 rounded p-2 bg-white text-slate-800"
          />
        </div>
      </div>

      {/* Queue Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-12 text-center text-slate-500 text-sm">
            Loading approval queue...
          </div>
        ) : filteredCases.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-sm">
            No renewal cases currently awaiting supervisory review matching the selected criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Case #</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Predecessor FDR</th>
                  <th className="py-3 px-4">Proposed Replacement</th>
                  <th className="py-3 px-4">Institution</th>
                  <th className="py-3 px-4">Match Score</th>
                  <th className="py-3 px-4">Submitted</th>
                  <th className="py-3 px-4 text-right">Supervisory Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredCases.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-blue-700">
                      <Link to={`/renewals/${c.id}`} className="hover:underline">
                        {c.case_number}
                      </Link>
                    </td>
                    <td className="py-3 px-4">
                      <RenewalStatusBadge status={c.status || c.case_status || 'draft'} size="sm" />
                    </td>
                    <td className="py-3 px-4 font-mono">
                      {c.original_fdr?.fdr_number || c.original_fdr_id}
                    </td>
                    <td className="py-3 px-4 font-mono">
                      {c.proposed_replacement_fdr?.fdr_number ||
                        c.proposed_replacement_fdr_id || (
                          <span className="text-slate-400 italic">None</span>
                        )}
                    </td>
                    <td className="py-3 px-4 text-slate-800">
                      {c.institution_name || 'N/A'}
                    </td>
                    <td className="py-3 px-4">
                      {c.matching_score !== undefined || c.match_score !== undefined ? (
                        <span className="font-semibold text-slate-900">
                          {(c.matching_score ?? c.match_score)?.toFixed(0)}%
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-500">
                      {c.submitted_at
                        ? new Date(c.submitted_at).toLocaleDateString()
                        : '—'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Link
                        to={`/renewals/${c.id}`}
                        className="px-3 py-1.5 rounded bg-blue-700 text-white font-semibold text-xs hover:bg-blue-800 transition-colors shadow-sm inline-block"
                      >
                        Review Case →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
