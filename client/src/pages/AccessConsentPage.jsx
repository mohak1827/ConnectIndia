import React, { useState, useEffect } from 'react';
import { consentApi } from '../api/consent.api';
import { servicesApi } from '../api/services.api';
import { useAuth } from '../app/AuthContext';
import { StatusBadge } from '../components/StatusBadge';
import {
  KeyRound,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  Play,
  RotateCcw,
} from 'lucide-react';

export function AccessConsentPage() {
  const { role, user } = useAuth();
  const [consents, setConsents] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);

  // Policy Simulator inputs
  const [simServiceId, setSimServiceId] = useState('');
  const [simPurpose, setSimPurpose] = useState('academic_verification');
  const [simSubjectRef, setSimSubjectRef] = useState('CBSE-2023-90812');
  const [simResult, setSimResult] = useState(null);
  const [evaluating, setEvaluating] = useState(false);

  const fetchConsents = async () => {
    try {
      setLoading(true);
      const [cRes, sRes] = await Promise.all([
        consentApi.list(),
        servicesApi.list({ limit: 20 }),
      ]);
      if (cRes.success) setConsents(cRes.data.consents || []);
      if (sRes.success && sRes.data.services?.length > 0) {
        setServices(sRes.data.services);
        setSimServiceId(sRes.data.services[0]._id);
      }
    } catch (err) {
      console.error('Failed to load consents/services:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConsents();
  }, []);

  const handleToggleConsentStatus = async (id, newStatus) => {
    try {
      const res = await consentApi.updateStatus(id, newStatus);
      if (res.success) {
        setConsents((prev) =>
          prev.map((c) => (c._id === id ? { ...c, status: newStatus, revokedAt: newStatus === 'revoked' ? new Date() : null } : c))
        );
      }
    } catch (err) {
      alert('Failed to update consent status: ' + err.message);
    }
  };

  const handleRunPolicySimulation = async (e) => {
    e.preventDefault();
    if (!simServiceId) return;
    setEvaluating(true);
    setSimResult(null);

    try {
      const res = await consentApi.evaluatePolicy({
        serviceId: simServiceId,
        purpose: simPurpose,
        subjectRef: simSubjectRef,
      });
      setSimResult(res.data);
    } catch (err) {
      setSimResult({
        evaluation: {
          allowed: false,
          reason: err.message,
          code: err.code || 'POLICY_REJECTED',
        },
      });
    } finally {
      setEvaluating(false);
    }
  };

  // Permission Matrix display items
  const matrix = [
    { permission: 'education.verify', label: 'Verify Academic Credentials', admin: true, verifier: true, operator: false },
    { permission: 'transactions.read_all', label: 'Platform Transaction Oversight', admin: true, verifier: false, operator: false },
    { permission: 'transactions.read_provider', label: 'Provider Scope Transactions', admin: true, verifier: false, operator: true },
    { permission: 'registry.manage_own', label: 'Registry Data CRUD & Import', admin: true, verifier: false, operator: true },
    { permission: 'services.manage_own', label: 'Register / Edit Own Services', admin: true, verifier: false, operator: true },
    { permission: 'grants.manage', label: 'Organization Access Grants', admin: true, verifier: false, operator: false },
    { permission: 'organizations.manage', label: 'Federated Registry Management', admin: true, verifier: false, operator: false },
  ];

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">Access & Consent Control</h1>
        <p className="text-xs text-slate-500">
          Backend policy enforcement, purpose limitation checks, and subject consent lifecycle.
        </p>
      </div>

      {/* Grid: Policy Simulator + Consent Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 7 Cols: Interactive Policy Evaluation Simulator */}
        <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200/80 shadow-2xs p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-slate-600" />
              <h2 className="text-sm font-semibold text-slate-900">Backend Policy Simulator</h2>
            </div>
            <span className="text-[11px] bg-slate-100 text-slate-700 border border-slate-200 px-2 py-0.5 rounded-md font-medium">
              Role: {role}
            </span>
          </div>

          <p className="text-xs text-slate-500 leading-relaxed">
            Test whether gateway policy permits access for a specific service, purpose, and subject reference.
          </p>

          <form onSubmit={handleRunPolicySimulation} className="space-y-3.5">
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700">Target Service</label>
              <select
                value={simServiceId}
                onChange={(e) => setSimServiceId(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-50/60 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-slate-300"
              >
                {services.map((s) => (
                  <option key={s._id} value={s._id}>
                    {s.name} ({s.category})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700">Declared Purpose</label>
                <select
                  value={simPurpose}
                  onChange={(e) => setSimPurpose(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-50/60 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-slate-300"
                >
                  <option value="academic_verification">academic_verification</option>
                  <option value="employment_screening">employment_screening</option>
                  <option value="scholarship_evaluation">scholarship_evaluation</option>
                  <option value="unauthorized_marketing">unauthorized_marketing (Should Deny)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700">Subject Reference / Roll No.</label>
                <input
                  type="text"
                  value={simSubjectRef}
                  onChange={(e) => setSimSubjectRef(e.target.value)}
                  placeholder="e.g. CBSE-2023-90812"
                  className="w-full px-3 py-1.5 bg-slate-50/60 border border-slate-200 rounded-lg text-xs font-mono text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-slate-300"
                />
              </div>
            </div>

            <div className="pt-1 flex justify-end">
              <button
                type="submit"
                disabled={evaluating}
                className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-900 disabled:opacity-50 text-white rounded-lg text-xs font-medium flex items-center gap-2 cursor-pointer shadow-2xs transition-colors"
              >
                {evaluating ? (
                  <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Play className="w-3.5 h-3.5" />
                )}
                <span>Evaluate Policy Rules</span>
              </button>
            </div>
          </form>

          {/* Simulator Decision Output */}
          {simResult && (
            <div
              className={`p-3.5 rounded-xl border space-y-1.5 animate-in fade-in duration-150 ${
                simResult.evaluation?.allowed
                  ? 'bg-emerald-50/70 border-emerald-200/80 text-emerald-900'
                  : 'bg-rose-50/70 border-rose-200/80 text-rose-900'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-semibold text-xs">
                  {simResult.evaluation?.allowed ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Policy Evaluation: AUTHORIZED</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-4 h-4 text-rose-600" />
                      <span>Policy Evaluation: ACCESS DENIED</span>
                    </>
                  )}
                </div>
                <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-white/70 border border-current">
                  {simResult.evaluation?.code}
                </span>
              </div>
              <p className="text-xs leading-relaxed">{simResult.evaluation?.reason}</p>
            </div>
          )}
        </div>

        {/* Right 5 Cols: Permission Matrix by Role */}
        <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200/80 shadow-2xs p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-slate-600" />
              <span>Role Capability Matrix</span>
            </h2>
            <span className="text-[10px] font-medium text-slate-400 uppercase">Enforced</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] font-semibold text-slate-400 uppercase">
                  <th className="py-2">Capability</th>
                  <th className="py-2 text-center">Admin</th>
                  <th className="py-2 text-center">Verifier</th>
                  <th className="py-2 text-center">Operator</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {matrix.map((m) => (
                  <tr key={m.permission} className="hover:bg-slate-50/50">
                    <td className="py-2 pr-2">
                      <div className="font-medium text-slate-800 text-[11px]">{m.label}</div>
                      <div className="font-mono text-[10px] text-slate-400">{m.permission}</div>
                    </td>
                    <td className="py-2 text-center text-xs">{m.admin ? '✓' : '—'}</td>
                    <td className="py-2 text-center text-xs">{m.verifier ? '✓' : '—'}</td>
                    <td className="py-2 text-center text-xs">{m.operator ? '✓' : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Active Consents Registry Table */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <div className="space-y-0.5">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-700">Registered Subject Consents</h3>
            <p className="text-[11px] text-slate-400">
              Granular consent states authorizing data exchange between consumer and provider.
            </p>
          </div>
          <span className="text-xs font-medium px-2 py-0.5 bg-white border border-slate-200 rounded text-slate-600">
            {consents.length} Records
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/40 border-b border-slate-200/80 text-slate-400 font-medium uppercase tracking-wider text-[10px]">
                <th className="py-2.5 px-4">Subject Reference</th>
                <th className="py-2.5 px-4">Requesting Organization</th>
                <th className="py-2.5 px-4">Service</th>
                <th className="py-2.5 px-4">Purpose</th>
                <th className="py-2.5 px-4">Status</th>
                <th className="py-2.5 px-4">Expires</th>
                <th className="py-2.5 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    Loading consents...
                  </td>
                </tr>
              ) : consents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    No consent records found for current user scope.
                  </td>
                </tr>
              ) : (
                consents.map((c) => (
                  <tr key={c._id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3 px-4 font-mono font-medium text-slate-900">{c.subjectRef}</td>
                    <td className="py-3 px-4 text-slate-700">
                      {c.consumerOrgId?.name || 'Registered Consumer'}
                    </td>
                    <td className="py-3 px-4 text-slate-600">{c.serviceId?.name}</td>
                    <td className="py-3 px-4 font-mono text-slate-500 text-[11px]">{c.purpose}</td>
                    <td className="py-3 px-4">
                      <StatusBadge status={c.status} />
                    </td>
                    <td className="py-3 px-4 text-slate-400 text-[11px]">
                      {new Date(c.expiresAt).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {c.status === 'active' ? (
                        <button
                          onClick={() => handleToggleConsentStatus(c._id, 'revoked')}
                          className="px-2 py-0.5 text-[11px] font-medium text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded transition-colors cursor-pointer"
                        >
                          Revoke
                        </button>
                      ) : (
                        <button
                          onClick={() => handleToggleConsentStatus(c._id, 'active')}
                          className="px-2 py-0.5 text-[11px] font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded transition-colors cursor-pointer"
                        >
                          Reactivate
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
