import React, { useState, useEffect } from 'react';
import { servicesApi } from '../api/services.api';
import { orgApi } from '../api/org.api';
import { useAuth } from '../app/AuthContext';
import { StatusBadge } from '../components/StatusBadge';
import { Modal } from '../components/Modal';
import {
  Search,
  Filter,
  Play,
  Layers,
  Building2,
  Lock,
  Code2,
  CheckCircle,
  AlertCircle,
  ExternalLink,
  Plus,
} from 'lucide-react';

export function ServiceDirectoryPage() {
  const { role, user } = useAuth();
  const normRole = (role || '').toLowerCase();
  const isAdmin = normRole === 'admin' || normRole === 'platform_admin';
  const isVerifier = normRole === 'verifier' || normRole === 'organization_verifier';
  const isOperator = normRole === 'operator' || normRole === 'provider_operator';

  const [services, setServices] = useState([]);
  const [grantedServiceIds, setGrantedServiceIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [status, setStatus] = useState('all');

  // Detail Modal & Sandbox Test
  const [selectedService, setSelectedService] = useState(null);
  const [sandboxPayload, setSandboxPayload] = useState('');
  const [sandboxResult, setSandboxResult] = useState(null);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    if (isVerifier) {
      orgApi
        .getServices()
        .then((res) => {
          const ids = new Set((res.data?.services || []).map((s) => s._id));
          setGrantedServiceIds(ids);
        })
        .catch(console.error);
    }
  }, [isVerifier]);

  const fetchServices = async () => {
    try {
      setLoading(true);
      const res = await servicesApi.list({ search, category, status });
      if (res.success) {
        setServices(res.data.services || []);
      }
    } catch (err) {
      console.error('Failed to fetch services:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServices();
  }, [category, status]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchServices();
  };

  const handleOpenDetail = (service) => {
    setSelectedService(service);
    setSandboxPayload(JSON.stringify(service.exampleRequest || {}, null, 2));
    setSandboxResult(null);
  };

  const handleRunSandbox = async () => {
    if (!selectedService) return;
    setTesting(true);
    setSandboxResult(null);
    try {
      let parsed = {};
      try {
        parsed = JSON.parse(sandboxPayload);
      } catch {
        parsed = selectedService.exampleRequest;
      }
      const res = await servicesApi.sandboxTest(selectedService._id, parsed);
      setSandboxResult(res);
    } catch (err) {
      setSandboxResult({
        success: false,
        error: { message: err.message, status: err.status },
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Service Directory</h1>
          <p className="text-xs text-slate-500">
            Discover federated service catalogues, API specifications, and test mock endpoints.
          </p>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="ci-filter-bar">
        <form onSubmit={handleSearchSubmit} style={{ flex: 1, position: 'relative', margin: 0 }}>
          <Search
            className="w-4 h-4 text-slate-400"
            style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)' }}
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search service name, description, or endpoint..."
            className="ci-form-control"
            style={{ paddingLeft: '2.25rem', width: '100%', height: '38px' }}
          />
        </form>

        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="ci-form-control"
          style={{ width: 'auto', minWidth: '150px', height: '38px', cursor: 'pointer' }}
        >
          <option value="all">All Categories</option>
          <option value="Education">Education</option>
          <option value="Insurance">Insurance</option>
          <option value="Identity">Identity</option>
          <option value="Employment">Employment</option>
          <option value="Business">Business</option>
          <option value="Governance">Governance</option>
          <option value="Transport">Transport</option>
          <option value="Healthcare">Healthcare</option>
        </select>

        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="ci-form-control"
          style={{ width: 'auto', minWidth: '130px', height: '38px', cursor: 'pointer' }}
        >
          <option value="all">All Statuses</option>
          <option value="active">Active</option>
          <option value="beta">Beta</option>
          <option value="offline">Offline</option>
        </select>

        <button
          type="button"
          onClick={fetchServices}
          className="px-4 py-2 rounded-lg text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shrink-0"
          style={{ height: '38px', backgroundColor: '#2563eb', border: '1px solid #1d4ed8' }}
        >
          <Filter className="w-3.5 h-3.5" />
          <span>Filter</span>
        </button>
      </div>

      {/* Services Grid */}
      {loading ? (
        <div className="p-12 text-center text-slate-400 text-xs">Loading catalogued services...</div>
      ) : services.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-xl border border-slate-200/80 text-slate-400 text-xs">
          No services matched the filter criteria.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {services.map((svc) => (
            <div
              key={svc._id}
              className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-2xs hover:border-slate-300 transition-all flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200/60">
                      {svc.category}
                    </span>
                    {isVerifier && (
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-medium flex items-center gap-1 border ${
                          grantedServiceIds.has(svc._id)
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-slate-50 text-slate-500 border-slate-200'
                        }`}
                      >
                        {grantedServiceIds.has(svc._id) ? (
                          <>
                            <CheckCircle className="w-2.5 h-2.5 text-emerald-600" />
                            <span>Granted Access</span>
                          </>
                        ) : (
                          <>
                            <Lock className="w-2.5 h-2.5 text-slate-400" />
                            <span>Not Entitled</span>
                          </>
                        )}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono text-slate-600 bg-slate-50 border border-slate-200/60">
                      {svc.version}
                    </span>
                    <StatusBadge status={svc.status} />
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-sm text-slate-900">
                    {svc.name}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                    {svc.description}
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-100 space-y-1.5 text-xs text-slate-600">
                  <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
                    <Building2 className="w-3.5 h-3.5 text-slate-400" />
                    <span className="truncate">{svc.organizationId?.name || 'Registered Organization'}</span>
                  </div>
                  <div className="flex items-center gap-2 font-mono text-[11px] text-slate-600 bg-slate-50/80 p-1.5 rounded-lg border border-slate-200/60">
                    <span className="font-semibold text-slate-800">{svc.httpMethod}</span>
                    <span className="truncate">{svc.endpointAlias}</span>
                  </div>
                </div>
              </div>

              <div className="pt-3.5 mt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] text-slate-400">
                  {svc.isMock ? 'Mock Sandbox' : 'Official Gateway'}
                </span>
                <button
                  onClick={() => handleOpenDetail(svc)}
                  className="px-2.5 py-1 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200/80 rounded-lg text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Code2 className="w-3.5 h-3.5 text-slate-500" />
                  <span>Inspect & Test</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Service Detail & Sandbox Modal */}
      <Modal
        isOpen={!!selectedService}
        onClose={() => setSelectedService(null)}
        title={selectedService?.name || 'Service Details'}
        maxWidth="max-w-2xl"
      >
        {selectedService && (
          <div className="space-y-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                  {selectedService.category}
                </span>
                <span className="font-mono text-[11px] bg-slate-50 border border-slate-200 px-2 py-0.5 rounded text-slate-700">
                  {selectedService.httpMethod} {selectedService.endpointAlias}
                </span>
                <StatusBadge status={selectedService.status} />
              </div>
              <p className="text-xs text-slate-600 pt-1 leading-relaxed">{selectedService.description}</p>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50/80 p-3 rounded-xl border border-slate-200/70">
              <div>
                <span className="font-semibold text-slate-400 uppercase text-[10px]">Custodian</span>
                <p className="text-slate-800 font-medium mt-0.5">
                  {selectedService.organizationId?.name} ({selectedService.organizationId?.memberCode})
                </p>
              </div>
              <div>
                <span className="font-semibold text-slate-400 uppercase text-[10px]">Auth Scheme</span>
                <p className="text-slate-800 font-medium mt-0.5">{selectedService.authRequirement}</p>
              </div>
            </div>

            {/* Sandbox Test Box */}
            <div className="space-y-3 pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                  <Play className="w-3.5 h-3.5 text-slate-600" />
                  <span>Sandbox Test Runner</span>
                </h4>
                <span className="text-[11px] text-slate-400">Calls ConnectIndia Backend Gateway</span>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-medium text-slate-500">Sample JSON Request Payload</label>
                <textarea
                  rows={4}
                  value={sandboxPayload}
                  onChange={(e) => setSandboxPayload(e.target.value)}
                  className="w-full p-2.5 font-mono text-xs bg-slate-900 text-slate-100 rounded-lg border border-slate-800 focus:outline-hidden"
                />
              </div>

              <button
                onClick={handleRunSandbox}
                disabled={testing}
                className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-900 disabled:opacity-50 text-white rounded-lg text-xs font-medium flex items-center gap-2 cursor-pointer transition-colors"
              >
                {testing ? (
                  <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Play className="w-3 h-3" />
                )}
                <span>Execute Gateway Sandbox Call</span>
              </button>

              {sandboxResult && (
                <div className="p-3 rounded-lg border border-slate-200 bg-slate-900 text-slate-100 font-mono text-xs overflow-x-auto space-y-1">
                  <div className="text-[10px] uppercase font-semibold text-slate-400 mb-1">Normalized Gateway Response:</div>
                  <pre className="text-[11px]">{JSON.stringify(sandboxResult, null, 2)}</pre>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
