import React, { useState, useEffect } from 'react';
import { transactionsApi } from '../api/transactions.api';
import { useAuth } from '../app/AuthContext';
import { StatusBadge } from '../components/StatusBadge';
import { StatCard } from '../components/StatCard';
import { Modal } from '../components/Modal';
import {
  Activity,
  Download,
  Filter,
  RefreshCw,
  Search,
  Eye,
  CheckCircle2,
  AlertTriangle,
  Clock,
  XCircle,
} from 'lucide-react';

export function MonitoringPage() {
  const { role } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  // Filters
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });

  // Detail Modal
  const [selectedTx, setSelectedTx] = useState(null);

  const fetchSummary = async () => {
    try {
      const res = await transactionsApi.getSummary();
      if (res.success) {
        setSummary(res.data);
      }
    } catch (err) {
      console.error('Failed to load transaction summary:', err);
    }
  };

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const res = await transactionsApi.list({ status, page, limit: 12 });
      if (res.success) {
        setTransactions(res.data.transactions || []);
        setPagination(res.data.pagination || { total: 0, totalPages: 1 });
      }
    } catch (err) {
      console.error('Failed to list transactions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, []);

  useEffect(() => {
    fetchTransactions();
  }, [status, page]);

  const handleExportCsv = async () => {
    try {
      setExporting(true);
      const blob = await transactionsApi.exportCsv({ status });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `connectindia-audit-${status}-${Date.now()}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch (err) {
      alert('CSV export failed: ' + err.message);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">API Monitoring & Audits</h1>
          <p className="text-xs text-slate-500">
            Real-time transaction log with safe operational metadata, latency tracking, and CSV export.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              fetchSummary();
              fetchTransactions();
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 shadow-2xs transition-all cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
            <span>Refresh</span>
          </button>
          <button
            onClick={handleExportCsv}
            disabled={exporting}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-slate-800 hover:bg-slate-900 rounded-lg shadow-2xs transition-all cursor-pointer disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{exporting ? 'Exporting...' : 'Export CSV'}</span>
          </button>
        </div>
      </div>

      {/* Metrics Summary Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard
          label="Total Scoped Requests"
          value={summary?.total ?? '—'}
          subtext="Processed by gateway"
          icon={Activity}
          badgeText="Throughput"
          badgeColor="slate"
        />
        <StatCard
          label="Verified Matches"
          value={summary?.verified ?? '—'}
          subtext="Positive confirmations"
          icon={CheckCircle2}
          badgeText="Match"
          badgeColor="emerald"
        />
        <StatCard
          label="Field Mismatches"
          value={summary?.mismatch ?? '—'}
          subtext="Discrepancy detected"
          icon={AlertTriangle}
          badgeText="Mismatch"
          badgeColor="amber"
        />
        <StatCard
          label="Unavailable / Denied"
          value={(summary?.unavailable || 0) + (summary?.denied || 0)}
          subtext="Timeouts & policy blocks"
          icon={XCircle}
          badgeText="Attention"
          badgeColor="sky"
        />
      </div>

      {/* Filters Strip */}
      <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-xs font-medium text-slate-600">Status:</span>
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 cursor-pointer"
          >
            <option value="all">All Outcomes ({summary?.total || 0})</option>
            <option value="verified">Verified ({summary?.verified || 0})</option>
            <option value="mismatch">Mismatch ({summary?.mismatch || 0})</option>
            <option value="unavailable">Unavailable ({summary?.unavailable || 0})</option>
            <option value="denied">Denied ({summary?.denied || 0})</option>
            <option value="invalid_input">Invalid Input ({summary?.invalidInput || 0})</option>
          </select>
        </div>

        <div className="text-[11px] text-slate-400 font-medium">
          Showing {transactions.length} of {pagination.total} records
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/60 border-b border-slate-200/80 text-slate-400 font-medium uppercase tracking-wider text-[10px]">
                <th className="py-2.5 px-4">Request ID</th>
                <th className="py-2.5 px-4">Service & Provider</th>
                <th className="py-2.5 px-4">Caller / Consumer</th>
                <th className="py-2.5 px-4">Outcome</th>
                <th className="py-2.5 px-4">Latency</th>
                <th className="py-2.5 px-4">Timestamp</th>
                <th className="py-2.5 px-4 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-400">
                    Loading transactions...
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-400">
                    No transactions match the selected filter.
                  </td>
                </tr>
              ) : (
                transactions.map((tx) => (
                  <tr key={tx._id || tx.requestId} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3 px-4 font-mono font-medium text-slate-900">{tx.requestId}</td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-900">{tx.serviceName}</div>
                      <div className="text-[11px] text-slate-400">{tx.providerName}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div>{tx.consumerOrgName}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{tx.actorEmail}</div>
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={tx.status} />
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-600">{tx.latencyMs}ms</td>
                    <td className="py-3 px-4 text-slate-400 text-[11px]">
                      {new Date(tx.createdAt).toLocaleString([], {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="py-3 px-4 text-end">
                      <button
                        type="button"
                        onClick={() => setSelectedTx(tx)}
                        className="btn btn-sm btn-outline-secondary d-inline-flex align-items-center gap-1 py-1 px-2 text-decoration-none"
                        style={{ fontSize: '11px', borderRadius: '6px' }}
                        title="View Transaction Audit Details"
                      >
                        <Eye className="w-3.5 h-3.5" style={{ width: '13px', height: '13px' }} />
                        <span>Inspect</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {pagination.totalPages > 1 && (
          <div className="p-3 bg-slate-50/50 border-t border-slate-200/80 flex items-center justify-between text-xs">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-2.5 py-1 bg-white border border-slate-200 rounded-md disabled:opacity-40 cursor-pointer text-slate-600 font-medium"
            >
              Previous
            </button>
            <span className="text-slate-400 text-[11px]">
              Page {page} of {pagination.totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
              disabled={page >= pagination.totalPages}
              className="px-2.5 py-1 bg-white border border-slate-200 rounded-md disabled:opacity-40 cursor-pointer text-slate-600 font-medium"
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* Transaction Details Modal */}
      <Modal
        isOpen={!!selectedTx}
        onClose={() => setSelectedTx(null)}
        title={`Audit Inspector: ${selectedTx?.requestId || ''}`}
        maxWidth="max-w-lg"
      >
        {selectedTx && (
          <div className="space-y-3" style={{ fontSize: '12px' }}>
            <div className="d-flex align-items-center justify-content-between p-3 bg-light rounded border">
              <div>
                <span className="text-muted d-block small fw-bold text-uppercase" style={{ fontSize: '10px' }}>Gateway Verification Decision</span>
                <span className="fw-semibold text-dark font-monospace">{selectedTx.requestId}</span>
              </div>
              <StatusBadge status={selectedTx.status} />
            </div>

            <div className="row g-2 p-3 bg-light rounded border">
              <div className="col-6">
                <span className="fw-bold text-muted text-uppercase d-block" style={{ fontSize: '10px' }}>Target Service</span>
                <p className="fw-semibold text-dark mb-0 mt-0.5">{selectedTx.serviceName}</p>
              </div>
              <div className="col-6">
                <span className="fw-bold text-muted text-uppercase d-block" style={{ fontSize: '10px' }}>Provider Organization</span>
                <p className="fw-semibold text-dark mb-0 mt-0.5">{selectedTx.providerName}</p>
              </div>
              <div className="col-6 pt-2">
                <span className="fw-bold text-muted text-uppercase d-block" style={{ fontSize: '10px' }}>Caller / Verifier Org</span>
                <p className="fw-semibold text-dark mb-0 mt-0.5">{selectedTx.consumerOrgName}</p>
              </div>
              <div className="col-6 pt-2">
                <span className="fw-bold text-muted text-uppercase d-block" style={{ fontSize: '10px' }}>Actor Identity</span>
                <p className="font-monospace text-secondary mb-0 mt-0.5">{selectedTx.actorEmail}</p>
              </div>
              <div className="col-6 pt-2">
                <span className="fw-bold text-muted text-uppercase d-block" style={{ fontSize: '10px' }}>Gateway Latency</span>
                <p className="font-monospace text-dark mb-0 mt-0.5">{selectedTx.latencyMs} ms</p>
              </div>
              <div className="col-6 pt-2">
                <span className="fw-bold text-muted text-uppercase d-block" style={{ fontSize: '10px' }}>Error Status Code</span>
                <p className="font-monospace text-dark mb-0 mt-0.5">{selectedTx.errorCode || 'NONE (SUCCESS)'}</p>
              </div>
              <div className="col-12 pt-2">
                <span className="fw-bold text-muted text-uppercase d-block" style={{ fontSize: '10px' }}>Audit Timestamp (Local)</span>
                <p className="text-muted mb-0 mt-0.5 font-monospace">
                  {new Date(selectedTx.createdAt).toLocaleString('en-IN', {
                    dateStyle: 'medium',
                    timeStyle: 'medium',
                  })}
                </p>
              </div>
            </div>

            <div className="p-3 bg-light rounded border">
              <span className="fw-bold text-muted text-uppercase d-block mb-1" style={{ fontSize: '10px' }}>Outcome Summary</span>
              <p className="text-secondary mb-0 leading-relaxed" style={{ fontSize: '12px' }}>
                {selectedTx.summary || 'Verification transaction processed successfully in accordance with platform federated policy rules.'}
              </p>
            </div>

            <div className="alert alert-info py-2 px-3 mb-0 d-flex align-items-center gap-2" style={{ fontSize: '11px' }}>
              <span>🔒 Zero-Knowledge Compliance: Raw citizen identity payloads and credential secrets are cryptographically shielded and never stored in operational gateway logs.</span>
            </div>

            <div className="d-flex justify-content-end pt-2">
              <button
                type="button"
                onClick={() => setSelectedTx(null)}
                className="btn btn-sm btn-secondary px-3"
              >
                Close Inspector
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
