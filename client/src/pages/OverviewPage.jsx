import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { dashboardApi } from '../api/dashboard.api';
import { useAuth } from '../app/AuthContext';
import { StatCard } from '../components/StatCard';
import { StatusBadge } from '../components/StatusBadge';
import {
  Layers,
  Building2,
  Activity,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  RefreshCw,
  Server,
  FileCheck2,
  Database,
  FileSpreadsheet,
  AlertTriangle,
  XCircle,
  ShieldCheck,
  AlertCircle,
  Inbox,
  Shield,
} from 'lucide-react';

export function OverviewPage() {
  const { user, role } = useAuth();
  const [summary, setSummary] = useState(null);
  const [activity, setActivity] = useState([]);
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const normRole = (role || '').toLowerCase();
  const isAdmin = normRole === 'admin' || normRole === 'platform_admin';
  const isOperator = normRole === 'operator' || normRole === 'provider_operator';
  const isVerifier = normRole === 'verifier' || normRole === 'organization_verifier';

  const fetchData = async () => {
    try {
      setRefreshing(true);
      setError(null);
      const [sumRes, actRes, healthRes] = await Promise.all([
        dashboardApi.getSummary(),
        dashboardApi.getActivity(10),
        dashboardApi.getProviderHealth(),
      ]);

      if (sumRes.success) setSummary(sumRes.data);
      if (actRes.success) setActivity(actRes.data.recentActivity || []);
      if (healthRes.success) setProviders(healthRes.data.providers || []);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
      setError(err.message || 'Failed to connect to gateway dashboard API.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [role]);

  const metrics = summary?.metrics || {};
  const outcomes = metrics.outcomes || {};

  return (
    <div className="space-y-6">
      {/* Title & Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            {isAdmin
              ? 'Platform Administration Overview'
              : isOperator
              ? `Provider Telemetry: ${metrics.providerName || user?.organization?.name || 'Authoritative Registry'}`
              : `Organization Dashboard: ${metrics.organizationName || user?.organization?.name || 'Authorized Verifier'}`}
          </h1>
          <p className="text-xs text-slate-500">
            {isAdmin
              ? 'Real-time telemetry of ConnectIndia federated gateway, participant organizations, and immutable transactions.'
              : isOperator
              ? `Operational status of registry records, adapter health, and inbound verification throughput.`
              : `Assigned verification grants, consumer request throughput, and outcome distribution.`}
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={fetchData}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-200/90 rounded-lg hover:bg-slate-50 shadow-2xs transition-all cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-slate-700 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          {isAdmin && (() => {
            const totalPending = (metrics.pendingOrgRequests || 0) + (metrics.pendingProviderRequests || 0);
            return (
              <Link
                to="/app/admin?tab=requests&status=PENDING"
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-slate-800 rounded-lg hover:bg-slate-900 shadow-2xs transition-all text-decoration-none"
              >
                <Inbox className="w-3.5 h-3.5" />
                <span>Pending Requests {totalPending > 0 ? `(${totalPending})` : ''}</span>
              </Link>
            );
          })()}

          {isOperator && (
            <Link
              to="/app/provider/registry"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-slate-800 rounded-lg hover:bg-slate-900 shadow-2xs transition-all text-decoration-none"
            >
              <Database className="w-3.5 h-3.5" />
              <span>Manage Registry</span>
            </Link>
          )}

          {isVerifier && (
            <Link
              to="/app/verification"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-slate-800 rounded-lg hover:bg-slate-900 shadow-2xs transition-all text-decoration-none"
            >
              <FileCheck2 className="w-3.5 h-3.5" />
              <span>Run Verification</span>
            </Link>
          )}
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="alert alert-danger d-flex align-items-center justify-content-between p-3 rounded-xl mb-0 shadow-xs">
          <div className="d-flex align-items-center gap-2">
            <AlertCircle size={18} className="shrink-0" />
            <div className="small">{error}</div>
          </div>
          <button
            onClick={fetchData}
            className="btn btn-sm btn-outline-danger text-xs font-semibold"
          >
            Retry Connection
          </button>
        </div>
      )}

      {/* Verifier Suspended Notice if applicable */}
      {isVerifier && metrics.organizationStatus === 'suspended' && (
        <div className="alert alert-warning d-flex align-items-center gap-3 p-3 rounded-xl border-amber-300 bg-amber-50 text-amber-900">
          <AlertTriangle size={20} className="shrink-0 text-amber-600" />
          <div className="text-xs">
            <strong>Organization Suspended:</strong> Your organization has been marked as suspended by Platform Administration. Outbound verification calls and schema access will be rejected by the gateway policy engine.
          </div>
        </div>
      )}

      {/* METRIC CARDS GRID (Role-Specific) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {isAdmin ? (
          <>
            <StatCard
              label="Consumer Organizations"
              value={metrics.totalOrganizations ?? 0}
              subtext={`${metrics.approvedOrganizations ?? 0} active · ${metrics.pendingOrgRequests ?? 0} pending`}
              icon={Building2}
              badgeText="Registered"
              badgeColor="slate"
            />
            <StatCard
              label="Authoritative Providers"
              value={metrics.totalProviders ?? 0}
              subtext={`${metrics.activeProviders ?? 0} active · ${metrics.pendingProviderRequests ?? 0} pending`}
              icon={Server}
              badgeText="Federated"
              badgeColor="sky"
            />
            <StatCard
              label="Active API Services"
              value={metrics.activeServices ?? 0}
              subtext="Catalogued schemas"
              icon={Layers}
              badgeText="Adapters"
              badgeColor="emerald"
            />
            <StatCard
              label="Total Transactions"
              value={metrics.totalRequests ?? 0}
              subtext={`Success rate: ${metrics.successRatePercent ?? 0}% · Latency: ${metrics.averageLatencyMs ?? 0}ms`}
              icon={Activity}
              badgeText="Throughput"
              badgeColor="amber"
            />
          </>
        ) : isOperator ? (
          <>
            <StatCard
              label="Registry Records"
              value={metrics.registryRecordCount ?? 0}
              subtext={`Live in ${metrics.providerCategory || 'authoritative'} registry`}
              icon={Database}
              badgeText="Data Scope"
              badgeColor="slate"
            />
            <StatCard
              label="Registered Services"
              value={metrics.activeServices ?? 0}
              subtext="Standardized API adapters"
              icon={Layers}
              badgeText="Exposed"
              badgeColor="sky"
            />
            <StatCard
              label="CSV Import Jobs"
              value={metrics.totalImports ?? 0}
              subtext={`${metrics.failedImports ?? 0} failed ingestion jobs`}
              icon={FileSpreadsheet}
              badgeText="Batch Ops"
              badgeColor="emerald"
            />
            <StatCard
              label="Inbound Invocations"
              value={metrics.totalRequests ?? 0}
              subtext={`Adapter status: ${metrics.adapterStatus || 'Online'}`}
              icon={Activity}
              badgeText="Gateway Load"
              badgeColor="amber"
            />
          </>
        ) : (
          <>
            <StatCard
              label="Assigned Services"
              value={metrics.assignedServices ?? 0}
              subtext="Granted verification services"
              icon={Layers}
              badgeText="Entitlements"
              badgeColor="slate"
            />
            <StatCard
              label="Verification Requests"
              value={metrics.totalRequests ?? 0}
              subtext="Submitted by your organization"
              icon={Activity}
              badgeText="Consumer Load"
              badgeColor="sky"
            />
            <StatCard
              label="Verification Match Rate"
              value={metrics.totalRequests > 0 ? `${metrics.successRatePercent ?? 0}%` : '0%'}
              subtext={`${outcomes.verified ?? 0} confirmed matches`}
              icon={CheckCircle2}
              badgeText="Match Ratio"
              badgeColor="emerald"
            />
            <StatCard
              label="Average Roundtrip"
              value={metrics.totalRequests > 0 && metrics.averageLatencyMs ? `${metrics.averageLatencyMs} ms` : '0 ms'}
              subtext="Gateway + adapter time"
              icon={Clock}
              badgeText="Normalized"
              badgeColor="amber"
            />
          </>
        )}
      </div>

      {/* OUTCOME DISTRIBUTION SUMMARY STRIP */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-slate-700" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              Verification Outcome Distribution
            </h2>
          </div>
          <span className="text-[11px] text-slate-400 font-mono">
            {metrics.totalRequests ?? 0} Total Scoped Invocations
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div className="p-2.5 rounded-lg bg-emerald-50/70 border border-emerald-200/80 text-emerald-900">
            <div className="flex items-center justify-between text-[11px] font-medium mb-1">
              <span>Verified Match</span>
              <CheckCircle2 size={13} className="text-emerald-600" />
            </div>
            <div className="text-xl font-bold">{outcomes.verified ?? 0}</div>
          </div>

          <div className="p-2.5 rounded-lg bg-amber-50/70 border border-amber-200/80 text-amber-900">
            <div className="flex items-center justify-between text-[11px] font-medium mb-1">
              <span>Field Mismatch</span>
              <AlertTriangle size={13} className="text-amber-600" />
            </div>
            <div className="text-xl font-bold">{outcomes.mismatch ?? 0}</div>
          </div>

          <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-800">
            <div className="flex items-center justify-between text-[11px] font-medium mb-1">
              <span>Not Found</span>
              <XCircle size={13} className="text-slate-500" />
            </div>
            <div className="text-xl font-bold">{outcomes.notFound ?? 0}</div>
          </div>

          <div className="p-2.5 rounded-lg bg-sky-50/70 border border-sky-200/80 text-sky-900">
            <div className="flex items-center justify-between text-[11px] font-medium mb-1">
              <span>Unavailable / Timeout</span>
              <Clock size={13} className="text-sky-600" />
            </div>
            <div className="text-xl font-bold">{outcomes.unavailable ?? 0}</div>
          </div>

          <div className="p-2.5 rounded-lg bg-rose-50/70 border border-rose-200/80 text-rose-900">
            <div className="flex items-center justify-between text-[11px] font-medium mb-1">
              <span>Policy Denied</span>
              <Shield size={13} className="text-rose-600" />
            </div>
            <div className="text-xl font-bold">{outcomes.denied ?? 0}</div>
          </div>
        </div>
      </div>

      {/* TWO COLUMN LAYOUT: Recent Activity & Provider Telemetry */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Role-Scoped Recent Gateway Activity */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200/80 shadow-2xs overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-slate-600" />
              <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                {isAdmin
                  ? 'Recent Platform Activity Log'
                  : isOperator
                  ? 'Inbound Verification Transactions'
                  : 'Organization Verification History'}
              </h2>
            </div>
            <Link
              to="/app/monitoring"
              className="text-xs text-slate-600 hover:text-slate-900 font-medium flex items-center gap-1 text-decoration-none"
            >
              <span>View Full Monitoring</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="divide-y divide-slate-100 flex-1">
            {activity.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                <FileCheck2 size={28} className="mx-auto mb-2 text-slate-300" />
                <p className="font-medium text-slate-600 mb-1">No transaction records found yet</p>
                <p className="text-[11px] text-slate-400 mb-3">
                  {isVerifier
                    ? 'Execute a verification request through the Verification Portal to record live activity.'
                    : 'Transactions will appear here as verifiers invoke your service adapters.'}
                </p>
                {isVerifier && (
                  <Link
                    to="/app/verification"
                    className="btn btn-sm btn-outline-primary text-xs"
                  >
                    Open Verification Portal
                  </Link>
                )}
              </div>
            ) : (
              activity.map((item) => (
                <div
                  key={item._id || item.requestId}
                  className="p-3.5 flex items-center justify-between hover:bg-slate-50/60 transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-semibold text-slate-900">{item.requestId}</span>
                      <StatusBadge status={item.status} />
                    </div>
                    <p className="text-xs text-slate-600 mb-0">
                      {item.serviceName} · {item.providerName}
                    </p>
                    <p className="text-[11px] text-slate-400 mb-0">{item.summary}</p>
                  </div>
                  <div className="text-right space-y-1 shrink-0">
                    <span className="font-mono text-xs text-slate-500 font-medium">{item.latencyMs}ms</span>
                    <p className="text-[10px] text-slate-400 mb-0">
                      {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right 1 Col: Provider Health Matrix */}
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Server className="w-4 h-4 text-slate-600" />
              <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                Provider Health Matrix
              </h2>
            </div>
            <span className="text-[10px] font-medium bg-slate-100 px-2 py-0.5 rounded text-slate-500 border border-slate-200/60">
              Telemetry · Mock Mode
            </span>
          </div>

          <div className="p-3.5 space-y-2.5 flex-1 overflow-y-auto">
            {providers.length === 0 ? (
              <div className="p-4 text-center text-slate-400 text-xs">
                No provider adapters configured yet.
              </div>
            ) : (
              providers.map((p) => (
                <div
                  key={p.id}
                  className="p-3 rounded-lg border border-slate-200/70 bg-slate-50/30 hover:bg-white transition-all space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-xs text-slate-800 truncate max-w-[160px]">
                      {p.organizationName}
                    </span>
                    <StatusBadge status={p.healthState} />
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span className="font-mono text-[10px]">{p.memberCode}</span>
                    <span className="text-[10px] text-slate-400">{p.adapterType}</span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-100">
                    <span>Latency ~{p.latencyAvgMs}ms</span>
                    <span>Env: {p.environment}</span>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="p-3 bg-slate-50/50 border-t border-slate-100 text-[11px] text-slate-400">
            Simulated health telemetry verifies adapter interface responsiveness without exposing source credentials.
          </div>
        </div>
      </div>
    </div>
  );
}
