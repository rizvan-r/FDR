import React, { useState } from 'react';
import { RefundRecord, RefundTransaction } from '../../types';
import { ReleaseStatusBadge } from './ReleaseStatusBadge';
import { IndianRupee, Plus, CheckCircle2, AlertCircle, FileText, ArrowDownRight, Layers } from 'lucide-react';

interface RefundTransactionTableProps {
  refundRecord?: RefundRecord;
  canRecordTransaction?: boolean;
  canReconcile?: boolean;
  onAddTransaction?: (data: {
    transaction_reference: string;
    amount: number;
    transaction_date?: string;
    payment_mode: string;
    utr_number?: string;
  }) => Promise<void>;
  onReconcile?: (status: string, refNotes?: string) => Promise<void>;
  isLoading?: boolean;
}

export const RefundTransactionTable: React.FC<RefundTransactionTableProps> = ({
  refundRecord,
  canRecordTransaction = false,
  canReconcile = false,
  onAddTransaction,
  onReconcile,
  isLoading = false,
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [txRef, setTxRef] = useState(`TX-RTGS-${Math.floor(1000 + Math.random() * 9000)}`);
  const [txAmount, setTxAmount] = useState<number>(0);
  const [txDate, setTxDate] = useState(new Date().toISOString().split('T')[0]);
  const [txMode, setTxMode] = useState('RTGS');
  const [txUtr, setTxUtr] = useState(`SBIN${Date.now().toString().slice(-8)}`);
  const [processing, setProcessing] = useState(false);

  const [reconciling, setReconciling] = useState(false);

  const expectedAmount = refundRecord?.expected_amount || 0;
  const receivedAmount = refundRecord?.received_amount || 0;
  const outstandingAmount = Math.max(0, expectedAmount - receivedAmount);
  const isFullyReceived = receivedAmount >= expectedAmount && expectedAmount > 0;
  const transactions: RefundTransaction[] = refundRecord?.transactions || [];

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onAddTransaction) return;
    try {
      setProcessing(true);
      await onAddTransaction({
        transaction_reference: txRef,
        amount: Number(txAmount),
        transaction_date: txDate,
        payment_mode: txMode,
        utr_number: txUtr,
      });
      setShowAddModal(false);
      setTxAmount(0);
    } finally {
      setProcessing(false);
    }
  };

  const handleReconcileSubmit = async () => {
    if (!onReconcile) return;
    try {
      setReconciling(true);
      await onReconcile('reconciled', 'Refund fully received and reconciled against institutional account.');
    } finally {
      setReconciling(false);
    }
  };

  const formatCurrency = (amt: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: refundRecord?.currency || 'INR',
      maximumFractionDigits: 2,
    }).format(amt);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
      {/* Header */}
      <div className="p-5 border-b border-slate-200 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <IndianRupee className="w-5 h-5 text-[#12345A]" />
          <div>
            <h3 className="font-semibold text-slate-900 text-base">
              Refund & Financial Reconciliation Ledger
            </h3>
            <p className="text-xs text-slate-500">
              Audit trail of institutional refund remittances and treasury settlement
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <ReleaseStatusBadge
            status={refundRecord?.refund_status || 'pending'}
            type="refund"
            size="md"
          />

          {canRecordTransaction && (
            <button
              type="button"
              onClick={() => {
                setTxAmount(outstandingAmount > 0 ? outstandingAmount : 0);
                setShowAddModal(true);
              }}
              disabled={isLoading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-[#1D5F91] hover:bg-[#12345A] rounded-lg shadow-sm transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Record Credit
            </button>
          )}
        </div>
      </div>

      {/* Summary Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-slate-200 border-b border-slate-200 bg-white">
        <div className="p-4">
          <span className="text-xs font-medium text-slate-500">Principal Deposit / Expected Refund</span>
          <div className="text-base font-bold text-slate-900 mt-0.5">
            {formatCurrency(expectedAmount)}
          </div>
        </div>

        <div className="p-4">
          <span className="text-xs font-medium text-slate-500">Total Remitted / Credited</span>
          <div className="text-base font-bold text-emerald-700 mt-0.5 flex items-center gap-1">
            <ArrowDownRight className="w-4 h-4 text-emerald-600" />
            {formatCurrency(receivedAmount)}
          </div>
        </div>

        <div className="p-4">
          <span className="text-xs font-medium text-slate-500">Outstanding Balance</span>
          <div
            className={`text-base font-bold mt-0.5 ${
              outstandingAmount > 0 ? 'text-amber-700' : 'text-slate-700'
            }`}
          >
            {formatCurrency(outstandingAmount)}
          </div>
        </div>
      </div>

      {/* Transaction Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
          <thead className="bg-slate-50/70 font-semibold text-slate-600">
            <tr>
              <th className="px-4 py-3">Tx Reference</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Payment Mode</th>
              <th className="px-4 py-3">UTR / Transaction ID</th>
              <th className="px-4 py-3 text-right">Amount</th>
              <th className="px-4 py-3">Recorded By</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {transactions.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                  No refund remittances recorded yet. Click "Record Credit" to register a transaction.
                </td>
              </tr>
            ) : (
              transactions.map((tx) => (
                <tr key={tx.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="px-4 py-3 font-mono font-medium text-slate-800">
                    {tx.transaction_reference}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {new Date(tx.transaction_date).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold uppercase text-[11px]">
                      {tx.payment_mode}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-slate-700">
                    {tx.utr_number || '—'}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-slate-900">
                    {formatCurrency(tx.amount)}
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    {tx.recorded_by}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Reconciliation action footer */}
      {canReconcile && refundRecord?.refund_status !== 'reconciled' && (
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="text-xs text-slate-600">
            {isFullyReceived ? (
              <span className="text-emerald-800 font-medium flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                All funds received. Proceed with formal finance reconciliation.
              </span>
            ) : (
              <span className="text-amber-800 font-medium flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-amber-600" />
                Outstanding balance exists. Reconcile only after institutional confirmation.
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={handleReconcileSubmit}
            disabled={reconciling || isLoading}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-sm transition-colors disabled:opacity-50"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            {reconciling ? 'Reconciling...' : 'Confirm Finance Reconciliation'}
          </button>
        </div>
      )}

      {/* Add Transaction Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <IndianRupee className="w-5 h-5 text-[#1D5F91]" />
                <h4 className="font-bold text-slate-900 text-sm">
                  Record Refund Remittance Credit
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Transaction Reference
                </label>
                <input
                  type="text"
                  value={txRef}
                  onChange={(e) => setTxRef(e.target.value)}
                  className="w-full text-xs rounded-lg border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Credit Amount ({refundRecord?.currency || 'INR'})
                </label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  value={txAmount}
                  onChange={(e) => setTxAmount(parseFloat(e.target.value) || 0)}
                  className="w-full text-xs rounded-lg border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 font-semibold"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Payment Mode
                  </label>
                  <select
                    value={txMode}
                    onChange={(e) => setTxMode(e.target.value)}
                    className="w-full text-xs rounded-lg border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  >
                    <option value="RTGS">RTGS</option>
                    <option value="NEFT">NEFT</option>
                    <option value="TREASURY_TRANSFER">Treasury Transfer</option>
                    <option value="BANKERS_CHEQUE">Banker's Cheque</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Transaction Date
                  </label>
                  <input
                    type="date"
                    value={txDate}
                    onChange={(e) => setTxDate(e.target.value)}
                    className="w-full text-xs rounded-lg border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Bank UTR Number
                </label>
                <input
                  type="text"
                  value={txUtr}
                  onChange={(e) => setTxUtr(e.target.value)}
                  className="w-full text-xs rounded-lg border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 font-mono"
                  placeholder="e.g. SBIN2026..."
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  disabled={processing}
                  className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-800 rounded bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={processing}
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-[#1D5F91] hover:bg-[#12345A] rounded-lg shadow-sm disabled:opacity-50"
                >
                  {processing ? 'Recording...' : 'Record Transaction'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
