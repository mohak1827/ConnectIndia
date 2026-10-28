import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { adminApi } from '../api/admin.api';
import { accessRequestApi } from '../api/accessRequest.api';
import { servicesApi } from '../api/services.api';
import { useAuth } from '../app/AuthContext';
import {
  ShieldAlert,
  Building2,
  Server,
  FileText,
  Plus,
  Filter,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Search,
  Inbox,
  Check,
  X,
  KeyRound,
  Eye,
  Clock,
  Layers,
  Users,
  Copy,
} from 'lucide-react';

export function AdminPage() {
  const { role, user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabFromUrl = searchParams.get('tab');
  const statusFromUrl = searchParams.get('status');
  const [activeTab, setActiveTab] = useState(tabFromUrl || 'organizations');

  useEffect(() => {
    const currentTab = tabFromUrl || 'organizations';
    if (currentTab !== activeTab) {
      setActiveTab(currentTab);
    }
  }, [tabFromUrl]);

  const switchTab = (tab) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  // Organizations state
  const [organizations, setOrganizations] = useState([]);
  const [loadingOrgs, setLoadingOrgs] = useState(false);
  const [showOrgModal, setShowOrgModal] = useState(false);
  const [newOrg, setNewOrg] = useState({
    name: '',
    memberCode: '',
    category: 'Education',
    contactEmail: '',
    description: '',
  });

  // Providers state
  const [providerConfigs, setProviderConfigs] = useState([]);
  const [loadingProviders, setLoadingProviders] = useState(false);

  // Audits state
  const [auditEvents, setAuditEvents] = useState([]);
  const [loadingAudits, setLoadingAudits] = useState(false);
  const [auditFilterAction, setAuditFilterAction] = useState('all');
  const [auditFilterOutcome, setAuditFilterOutcome] = useState('all');
  const [auditPage, setAuditPage] = useState(1);
  const [auditPagination, setAuditPagination] = useState({ total: 0, totalPages: 1 });

  // Access Requests state (Organization & Provider)
  const [requestCategoryTab, setRequestCategoryTab] = useState('org'); // 'org' | 'provider'
  const [accessRequests, setAccessRequests] = useState([]);
  const [providerRequests, setProviderRequests] = useState([]);
  const [orgPendingCount, setOrgPendingCount] = useState(0);
  const [providerPendingCount, setProviderPendingCount] = useState(0);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [loadingProviderRequests, setLoadingProviderRequests] = useState(false);
  const [requestFilterStatus, setRequestFilterStatus] = useState(statusFromUrl || 'all');
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewAction, setReviewAction] = useState('APPROVED');
  const [reviewNote, setReviewNote] = useState('');
  const [reviewInitialPassword, setReviewInitialPassword] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);

  // Detail Modal state
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [detailItem, setDetailItem] = useState(null);

  // Activation modal state
  const [showActivateModal, setShowActivateModal] = useState(false);
  const [activatingRequest, setActivatingRequest] = useState(null);
  const [activateMemberCode, setActivateMemberCode] = useState('');
  const [activateInitialPassword, setActivateInitialPassword] = useState('ConnectIndia@2024');
  const [activateSubmitting, setActivateSubmitting] = useState(false);
  const [activationResult, setActivationResult] = useState(null);
  const [copiedCreds, setCopiedCreds] = useState(false);

  const generateRandomPassword = () => {
    const uppercase = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const lowercase = 'abcdefghijkmnpqrstuvwxyz';
    const numbers = '23456789';
    const specials = '!@#$%';
    const all = uppercase + lowercase + numbers + specials;
    let pass = '';
    pass += uppercase.charAt(Math.floor(Math.random() * uppercase.length));
    pass += lowercase.charAt(Math.floor(Math.random() * lowercase.length));
    pass += numbers.charAt(Math.floor(Math.random() * numbers.length));
    pass += specials.charAt(Math.floor(Math.random() * specials.length));
    for (let i = 0; i < 6; i++) {
      pass += all.charAt(Math.floor(Math.random() * all.length));
    }
    return pass;
  };

  // Grants state
  const [grants, setGrants] = useState([]);
  const [loadingGrants, setLoadingGrants] = useState(false);
  const [showGrantModal, setShowGrantModal] = useState(false);
  const [availableServices, setAvailableServices] = useState([]);
  const [newGrant, setNewGrant] = useState({
    organizationId: '',
    serviceId: '',
    allowedPurposes: ['academic_credential_check', 'kyc_identity_verification'],
  });
  const [grantSubmitting, setGrantSubmitting] = useState(false);
  const [grantsViewMode, setGrantsViewMode] = useState('grouped'); // 'grouped' | 'flat'
  const [grantOrgFilter, setGrantOrgFilter] = useState('all');
  const [grantSearch, setGrantSearch] = useState('');

  // Users state
  const [usersList, setUsersList] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  const fetchOrgs = async () => {
    try {
      setLoadingOrgs(true);
      const res = await adminApi.listOrganizations();
      if (res.success) setOrganizations(res.data.organizations || []);
    } catch (err) {
      console.error('Failed to fetch orgs:', err);
    } finally {
      setLoadingOrgs(false);
    }
  };

  const fetchProviders = async () => {
    try {
      setLoadingProviders(true);
      const res = await adminApi.listProviderConfigs();
      if (res.success) setProviderConfigs(res.data.providerConfigs || []);
    } catch (err) {
      console.error('Failed to fetch provider configs:', err);
    } finally {
      setLoadingProviders(false);
    }
  };

  const fetchAudits = async () => {
    try {
      setLoadingAudits(true);
      const res = await adminApi.listAuditEvents({
        action: auditFilterAction,
        outcome: auditFilterOutcome,
        page: auditPage,
        limit: 15,
      });
      if (res.success) {
        setAuditEvents(res.data.auditEvents || []);
        setAuditPagination(res.data.pagination || { total: 0, totalPages: 1 });
      }
    } catch (err) {
      console.error('Failed to fetch audits:', err);
    } finally {
      setLoadingAudits(false);
    }
  };

  const fetchAccessRequests = async () => {
    try {
      setLoadingRequests(true);
      const res = await accessRequestApi.list(
        requestFilterStatus && requestFilterStatus !== 'all' ? { status: requestFilterStatus } : {}
      );
      if (res.success) {
        setAccessRequests(res.data.requests || []);
        if (typeof res.data.pendingCount === 'number') {
          setOrgPendingCount(res.data.pendingCount);
        } else {
          setOrgPendingCount((res.data.requests || []).filter((r) => r.status === 'PENDING').length);
        }
      }
    } catch (err) {
      console.error('Failed to fetch access requests:', err);
    } finally {
      setLoadingRequests(false);
    }
  };

  const fetchProviderRequests = async () => {
    try {
      setLoadingProviderRequests(true);
      const res = await adminApi.listProviderRequests(
        requestFilterStatus && requestFilterStatus !== 'all' ? requestFilterStatus : undefined
      );
      if (res.success) {
        setProviderRequests(res.data.requests || []);
        if (typeof res.data.pendingCount === 'number') {
          setProviderPendingCount(res.data.pendingCount);
        } else {
          setProviderPendingCount((res.data.requests || []).filter((r) => r.status === 'PENDING').length);
        }
      }
    } catch (err) {
      console.error('Failed to fetch provider requests:', err);
    } finally {
      setLoadingProviderRequests(false);
    }
  };

  const fetchGrants = async () => {
    try {
      setLoadingGrants(true);
      const res = await adminApi.listGrants();
      if (res.success) setGrants(res.data.grants || []);
    } catch (err) {
      console.error('Failed to fetch grants:', err);
    } finally {
      setLoadingGrants(false);
    }
  };

  const fetchServices = async () => {
    try {
      const res = await servicesApi.list({ limit: 100 });
      if (res.success) setAvailableServices(res.data.services || []);
    } catch (err) {
      console.error('Failed to fetch services:', err);
    }
  };

  const fetchUsers = async () => {
    try {
      setLoadingUsers(true);
      const res = await adminApi.listUsers();
      if (res.success) setUsersList(res.data.users || []);
    } catch (err) {
      console.error('Failed to fetch users:', err);
    } finally {
      setLoadingUsers(false);
    }
  };

  // Always fetch request counts on initial load for badge
  useEffect(() => {
    fetchAccessRequests();
    fetchProviderRequests();
  }, []);

  useEffect(() => {
    if (activeTab === 'organizations') fetchOrgs();
    if (activeTab === 'providers' || activeTab === 'configs') fetchProviders();
    if (activeTab === 'audits' || activeTab === 'audit') fetchAudits();
    if (activeTab === 'requests') {
      fetchAccessRequests();
      fetchProviderRequests();
    }
    if (activeTab === 'grants') {
      fetchGrants();
      fetchOrgs();
      fetchServices();
    }
    if (activeTab === 'users' || activeTab === 'settings') fetchUsers();
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'audits' || activeTab === 'audit') fetchAudits();
  }, [auditFilterAction, auditFilterOutcome, auditPage]);

  useEffect(() => {
    if (activeTab === 'requests') {
      fetchAccessRequests();
      fetchProviderRequests();
    }
  }, [requestFilterStatus]);

  useEffect(() => {
    const s = searchParams.get('status') || 'all';
    if (s !== requestFilterStatus) {
      setRequestFilterStatus(s);
    }
  }, [searchParams]);

  const handleToggleOrgStatus = async (orgId, currentStatus) => {
    const nextStatus = currentStatus === 'active' ? 'suspended' : 'active';
    const confirmMsg = nextStatus === 'suspended'
      ? 'Are you sure you want to suspend this organization? It will immediately lose verification gateway access.'
      : 'Reactivate this organization?';
    if (!window.confirm(confirmMsg)) return;

    try {
      const res = await adminApi.updateOrganization(orgId, { status: nextStatus });
      if (res.success) fetchOrgs();
    } catch (err) {
      alert('Failed to update organization status: ' + err.message);
    }
  };

  const handleToggleProviderHealth = async (configId, currentHealth) => {
    const nextHealth = currentHealth === 'Online' ? 'Unavailable' : 'Online';
    try {
      const res = await adminApi.updateProviderHealth(configId, { healthState: nextHealth });
      if (res.success) fetchProviders();
    } catch (err) {
      alert('Failed to update provider health: ' + err.message);
    }
  };

  const handleCreateOrg = async (e) => {
    e.preventDefault();
    try {
      const res = await adminApi.createOrganization(newOrg);
      if (res.success) {
        setShowOrgModal(false);
        setNewOrg({ name: '', memberCode: '', category: 'Education', contactEmail: '', description: '' });
        fetchOrgs();
      }
    } catch (err) {
      alert('Error creating organization: ' + err.message);
    }
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!selectedRequest) return;
    try {
      setReviewSubmitting(true);
      if (selectedRequest._type === 'provider') {
        const res = await adminApi.reviewProviderRequest(selectedRequest._id, {
          status: reviewAction,
          reviewNote,
          initialPassword: reviewInitialPassword.trim() || undefined,
        });
        if (res.success) {
          setShowReviewModal(false);
          setReviewNote('');
          setReviewInitialPassword('');
          fetchProviderRequests();
          fetchOrgs();
          fetchProviders();

          if (reviewAction === 'APPROVED' && res.data?.account) {
            setActivatingRequest({
              ...selectedRequest,
              organizationName: res.data.account.providerName || selectedRequest.providerName,
              providerName: res.data.account.providerName || selectedRequest.providerName,
              officialEmail: res.data.account.email || selectedRequest.officialEmail,
              _type: 'provider',
            });
            setActivationResult({
              account: {
                email: res.data.account.email,
                initialPassword: res.data.account.initialPassword,
              },
              organization: {
                memberCode: res.data.account.memberCode,
                name: res.data.account.providerName,
              },
            });
            setShowActivateModal(true);
          }
          setSelectedRequest(null);
        }
      } else {
        const res = await accessRequestApi.review(selectedRequest._id, {
          status: reviewAction,
          reviewNote,
        });
        if (res.success) {
          setShowReviewModal(false);
          setSelectedRequest(null);
          setReviewNote('');
          fetchAccessRequests();
          fetchOrgs();
        }
      }
    } catch (err) {
      alert('Failed to submit review: ' + err.message);
    } finally {
      setReviewSubmitting(false);
    }
  };

  const handleResetProviderPassword = async (reqItem) => {
    try {
      const generatedPass = generateRandomPassword();
      const res = await adminApi.resetProviderPassword(reqItem._id, { newPassword: generatedPass });
      if (res.success) {
        setActivatingRequest({
          ...reqItem,
          organizationName: reqItem.providerName,
          providerName: reqItem.providerName,
          officialEmail: reqItem.officialEmail,
          _type: 'provider',
        });
        setActivationResult({
          account: {
            email: res.data?.account?.email || reqItem.officialEmail,
            initialPassword: res.data?.account?.newPassword || generatedPass,
          },
          organization: {
            memberCode: res.data?.account?.memberCode || 'PRV-AUTH',
            name: res.data?.account?.providerName || reqItem.providerName,
          },
        });
        setShowActivateModal(true);
        fetchProviderRequests();
      }
    } catch (err) {
      alert('Failed to reset provider credentials: ' + (err.message || 'Error occurred'));
    }
  };

  const handleActivateSubmit = async (e) => {
    e.preventDefault();
    if (!activatingRequest) return;
    try {
      setActivateSubmitting(true);
      const res = await accessRequestApi.activate(activatingRequest._id, {
        memberCode: activateMemberCode.trim().toUpperCase(),
        initialPassword: activateInitialPassword,
      });
      if (res.success) {
        setActivationResult(res.data);
        fetchAccessRequests();
        fetchOrgs();
      }
    } catch (err) {
      alert('Failed to activate request: ' + err.message);
    } finally {
      setActivateSubmitting(false);
    }
  };

  const handleRevokeGrant = async (grantId) => {
    if (!window.confirm('Are you sure you want to revoke this service grant?')) return;
    try {
      const res = await adminApi.deleteGrant(grantId);
      if (res.success) fetchGrants();
    } catch (err) {
      alert('Failed to revoke grant: ' + err.message);
    }
  };

  const handleCreateGrantSubmit = async (e) => {
    e.preventDefault();
    if (!newGrant.organizationId || !newGrant.serviceId) {
      alert('Please select both an organization and a service.');
      return;
    }
    try {
      setGrantSubmitting(true);
      const res = await adminApi.createGrant(newGrant);
      if (res.success) {
        setShowGrantModal(false);
        setNewGrant({
          organizationId: '',
          serviceId: '',
          allowedPurposes: ['academic_credential_check', 'kyc_identity_verification'],
        });
        fetchGrants();
      }
    } catch (err) {
      alert('Failed to create grant: ' + err.message);
    } finally {
      setGrantSubmitting(false);
    }
  };

  const handleToggleUserStatus = async (userId, currentStatus, userName) => {
    const nextStatus = currentStatus === 'active' ? 'suspended' : 'active';
    const confirmMsg = nextStatus === 'suspended'
      ? `Are you sure you want to suspend user account "${userName}"? They will immediately lose login and API gateway access.`
      : `Reactivate user account "${userName}"?`;
    if (!window.confirm(confirmMsg)) return;

    try {
      const res = await adminApi.updateUser(userId, { status: nextStatus });
      if (res.success) {
        fetchUsers();
      }
    } catch (err) {
      alert('Failed to update user status: ' + (err.message || 'Error occurred'));
    }
  };

  return (
    <div className="container-fluid p-4">
      {/* Header with Dynamic Title based on Left Sidebar selection */}
      {(() => {
        const getHeaderInfo = (tab) => {
          switch (tab) {
            case 'requests':
              return {
                title: 'Organization Onboarding Requests',
                desc: 'Review, approve, or reject external organization and data provider onboarding applications.',
              };
            case 'providers':
            case 'configs':
              return {
                title: 'Provider Adapters & Health',
                desc: 'Authoritative data source adapters, routing configurations, operational status, and latency metrics.',
              };
            case 'grants':
              return {
                title: 'Service & Access Grants',
                desc: 'Federated organization service entitlements, sector verification permissions, and consent policies.',
              };
            case 'audits':
            case 'audit':
              return {
                title: 'Immutable Audit Log',
                desc: 'Cryptographic ledger of verification queries, administrative updates, and security events.',
              };
            case 'users':
            case 'settings':
              return {
                title: 'Platform Settings & User Accounts',
                desc: 'Administrative users, security credentials, and role-based privilege assignments.',
              };
            case 'organizations':
            default:
              return {
                title: 'Organization Management',
                desc: 'Federated member organizations, participant metadata, category assignments, and gateway enrollment status.',
              };
          }
        };

        const headerInfo = getHeaderInfo(activeTab);
        const pendingCount = orgPendingCount + providerPendingCount;

        return (
          <div className="d-flex flex-column flex-sm-row sm:items-center justify-content-between gap-3 mb-4">
            <div>
              <h1 className="h4 mb-1" style={{ color: 'var(--ci-navy-800)', fontWeight: 700 }}>
                {headerInfo.title}
              </h1>
              <p className="small text-muted mb-0">
                {headerInfo.desc}
              </p>
            </div>

            <div className="d-flex align-items-center gap-2 align-self-start">
              {activeTab === 'organizations' && (
                <>
                  {pendingCount > 0 && (
                    <Link
                      to="/app/admin?tab=requests"
                      className="btn btn-sm btn-outline-warning d-flex align-items-center gap-2 text-decoration-none"
                    >
                      <Inbox size={15} />
                      <span>{pendingCount} Pending Requests</span>
                    </Link>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowOrgModal(true)}
                    className="ci-btn-primary d-flex align-items-center gap-2"
                  >
                    <Plus size={16} />
                    <span>Register Organization</span>
                  </button>
                </>
              )}
            </div>
          </div>
        );
      })()}

      {/* TAB 1: Organizations */}
      {activeTab === 'organizations' && (
        <div className="ci-card overflow-hidden">
          <div className="ci-card-header">
            <span className="small fw-bold text-uppercase text-muted">Federated Member Organizations</span>
            <span className="badge bg-light text-dark border">{organizations.length} Organizations</span>
          </div>

          <div className="table-responsive">
            <table className="table ci-table table-hover align-middle mb-0">
              <thead>
                <tr>
                  <th>Organization Name</th>
                  <th>Member Code</th>
                  <th>Category</th>
                  <th>Contact Email</th>
                  <th>Status</th>
                  <th>Registered</th>
                  <th className="text-end">Lifecycle Actions</th>
                </tr>
              </thead>
              <tbody>
                {loadingOrgs ? (
                  <tr>
                    <td colSpan={7} className="text-center py-4 text-muted">Loading organizations...</td>
                  </tr>
                ) : organizations.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-4 text-muted">No organizations registered yet.</td>
                  </tr>
                ) : (
                  organizations.map((org) => (
                    <tr key={org._id}>
                      <td>
                        <div className="fw-semibold text-dark">{org.name}</div>
                        <div className="small text-muted text-truncate" style={{ maxWidth: '300px' }}>{org.description}</div>
                      </td>
                      <td className="font-monospace fw-semibold text-primary">{org.memberCode}</td>
                      <td><span className="badge bg-light text-secondary border">{org.category}</span></td>
                      <td className="text-muted small">{org.contactEmail}</td>
                      <td>
                        <span className={`ci-badge ${
                          org.status === 'active' ? 'ci-badge-success' : org.status === 'suspended' ? 'ci-badge-danger' : 'ci-badge-warning'
                        }`}>
                          {org.status}
                        </span>
                      </td>
                      <td className="small text-muted">
                        {new Date(org.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="text-end">
                        <button
                          type="button"
                          onClick={() => handleToggleOrgStatus(org._id, org.status)}
                          className={`btn btn-xs ${org.status === 'active' ? 'btn-outline-warning' : 'btn-outline-success'}`}
                          style={{ fontSize: '11px', padding: '3px 9px' }}
                        >
                          {org.status === 'active' ? 'Suspend Access' : 'Reactivate Access'}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: Access Requests */}
      {activeTab === 'requests' && (
        <div className="ci-card overflow-hidden">
          <div className="ci-card-header d-flex flex-column flex-sm-row justify-content-between align-items-sm-center gap-2">
            <div className="d-flex align-items-center gap-2">
              <button
                type="button"
                onClick={() => setRequestCategoryTab('org')}
                className={`btn btn-sm px-3 py-1.5 fw-semibold d-inline-flex align-items-center gap-2 ${
                  requestCategoryTab === 'org' ? 'btn-primary shadow-sm' : 'btn-light text-secondary border'
                }`}
                style={
                  requestCategoryTab === 'org'
                    ? { backgroundColor: 'var(--ci-navy-700)', borderColor: 'var(--ci-navy-700)' }
                    : { backgroundColor: '#f8fafc' }
                }
              >
                <span>Organization Requests</span>
                {orgPendingCount > 0 ? (
                  <span
                    className="badge rounded-pill fw-bold"
                    style={{
                      fontSize: '11px',
                      padding: '3px 8px',
                      backgroundColor: requestCategoryTab === 'org' ? '#fbbf24' : '#fef3c7',
                      color: requestCategoryTab === 'org' ? '#78350f' : '#92400e',
                      border: '1px solid rgba(180, 83, 9, 0.25)',
                    }}
                  >
                    {orgPendingCount} Pending
                  </span>
                ) : (
                  <span
                    className="badge rounded-pill fw-medium"
                    style={{
                      fontSize: '11px',
                      padding: '3px 8px',
                      backgroundColor: requestCategoryTab === 'org' ? 'rgba(255,255,255,0.2)' : '#e2e8f0',
                      color: requestCategoryTab === 'org' ? '#ffffff' : '#64748b',
                    }}
                  >
                    0 Pending
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={() => setRequestCategoryTab('provider')}
                className={`btn btn-sm px-3 py-1.5 fw-semibold d-inline-flex align-items-center gap-2 ${
                  requestCategoryTab === 'provider' ? 'btn-primary shadow-sm' : 'btn-light text-secondary border'
                }`}
                style={
                  requestCategoryTab === 'provider'
                    ? { backgroundColor: 'var(--ci-navy-700)', borderColor: 'var(--ci-navy-700)' }
                    : { backgroundColor: '#f8fafc' }
                }
              >
                <span>Provider Requests</span>
                {providerPendingCount > 0 ? (
                  <span
                    className="badge rounded-pill fw-bold"
                    style={{
                      fontSize: '11px',
                      padding: '3px 8px',
                      backgroundColor: requestCategoryTab === 'provider' ? '#fbbf24' : '#fef3c7',
                      color: requestCategoryTab === 'provider' ? '#78350f' : '#92400e',
                      border: '1px solid rgba(180, 83, 9, 0.25)',
                    }}
                  >
                    {providerPendingCount} Pending
                  </span>
                ) : (
                  <span
                    className="badge rounded-pill fw-medium"
                    style={{
                      fontSize: '11px',
                      padding: '3px 8px',
                      backgroundColor: requestCategoryTab === 'provider' ? 'rgba(255,255,255,0.2)' : '#e2e8f0',
                      color: requestCategoryTab === 'provider' ? '#ffffff' : '#64748b',
                    }}
                  >
                    0 Pending
                  </span>
                )}
              </button>
            </div>

            <div className="d-flex align-items-center gap-2">
              <select
                value={requestFilterStatus}
                onChange={(e) => {
                  const val = e.target.value;
                  setRequestFilterStatus(val);
                  const newParams = new URLSearchParams(searchParams);
                  if (val === 'all') {
                    newParams.delete('status');
                  } else {
                    newParams.set('status', val);
                  }
                  setSearchParams(newParams);
                }}
                className="form-select form-select-sm"
                style={{ width: '160px' }}
              >
                <option value="all">All Statuses</option>
                <option value="PENDING">Pending Review</option>
                <option value="UNDER_REVIEW">Under Review</option>
                <option value="APPROVED">Approved</option>
                <option value="REJECTED">Rejected</option>
              </select>
            </div>
          </div>

          <div className="table-responsive">
            {requestCategoryTab === 'org' ? (
              <table className="table ci-table table-hover align-middle mb-0">
                <thead>
                  <tr>
                    <th>Ref Number</th>
                    <th>Organization Name</th>
                    <th>Type</th>
                    <th>Contact Person</th>
                    <th>Status</th>
                    <th>Submitted At</th>
                    <th className="text-end">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingRequests ? (
                    <tr>
                      <td colSpan={7} className="text-center py-4 text-muted">Loading access requests...</td>
                    </tr>
                  ) : accessRequests.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-4 text-muted">No organization requests found matching the filter.</td>
                    </tr>
                  ) : (
                    accessRequests.map((req) => (
                      <tr key={req._id}>
                        <td className="font-monospace fw-semibold text-primary">{req.referenceNumber}</td>
                        <td>
                          <div className="fw-semibold text-dark">{req.organizationName}</div>
                          <div className="small text-muted">{req.officialEmail}</div>
                        </td>
                        <td><span className="badge bg-light text-secondary border">{req.organizationType}</span></td>
                        <td>
                          <div className="small text-dark">{req.contactPersonName}</div>
                          <div className="small text-muted">{req.designation}</div>
                        </td>
                        <td>
                          <span className={`ci-badge ${
                            req.status === 'APPROVED' ? 'ci-badge-success' : req.status === 'PENDING' ? 'ci-badge-warning' : 'ci-badge-danger'
                          }`}>
                            {req.status}
                          </span>
                          {req.status === 'APPROVED' && req.createdOrganizationId && (
                            <div className="mt-1">
                              <span className="badge bg-success-subtle text-success border border-success-subtle d-inline-flex align-items-center gap-1" style={{ fontSize: '10px' }}>
                                <CheckCircle2 size={10} />
                                Active & Provisioned
                              </span>
                            </div>
                          )}
                        </td>
                        <td className="small text-muted">
                          {new Date(req.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </td>
                        <td className="text-end">
                          <div className="btn-group btn-group-sm">
                            <button
                              type="button"
                              onClick={() => {
                                setDetailItem({ ...req, _type: 'org' });
                                setShowDetailModal(true);
                              }}
                              className="btn btn-outline-secondary"
                              title="View full submitted details"
                            >
                              <Eye size={13} className="me-1" />
                              <span>Details</span>
                            </button>
                            {['PENDING', 'UNDER_REVIEW'].includes(req.status) && (
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedRequest({ ...req, _type: 'org' });
                                  setReviewAction('APPROVED');
                                  setShowReviewModal(true);
                                }}
                                className="btn btn-outline-primary"
                              >
                                Review
                              </button>
                            )}
                            {req.status === 'APPROVED' && (
                              <button
                                type="button"
                                onClick={() => {
                                  setActivatingRequest(req);
                                  setActivateMemberCode(`IN-${req.organizationName.substring(0, 4).toUpperCase()}-01`);
                                  setActivateInitialPassword(generateRandomPassword());
                                  setShowActivateModal(true);
                                }}
                                className="btn btn-outline-secondary"
                                title={req.createdOrganizationId ? "Re-provision / Reset password for this organization verifier" : "Provision organization & verifier account"}
                              >
                                <KeyRound size={13} className="me-1" />
                                <span>{req.createdOrganizationId ? 'Reset Password' : 'Activate Account'}</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            ) : (
              <table className="table ci-table table-hover align-middle mb-0">
                <thead>
                  <tr>
                    <th>Ref Number</th>
                    <th>Provider Name</th>
                    <th>Category</th>
                    <th>Contact Person</th>
                    <th>Status</th>
                    <th>Submitted At</th>
                    <th className="text-end">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingProviderRequests ? (
                    <tr>
                      <td colSpan={7} className="text-center py-4 text-muted">Loading provider applications...</td>
                    </tr>
                  ) : providerRequests.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-4 text-muted">No provider applications found matching the filter.</td>
                    </tr>
                  ) : (
                    providerRequests.map((req) => (
                      <tr key={req._id}>
                        <td className="font-monospace fw-semibold text-primary">{req.referenceNumber}</td>
                        <td>
                          <div className="fw-semibold text-dark">{req.providerName}</div>
                          <div className="small text-muted">{req.officialEmail}</div>
                        </td>
                        <td><span className="badge bg-light text-secondary border">{req.providerCategory}</span></td>
                        <td>
                          <div className="small text-dark">{req.contactPersonName}</div>
                          <div className="small text-muted">{req.designation}</div>
                        </td>
                        <td>
                          <span className={`ci-badge ${
                            req.status === 'APPROVED' ? 'ci-badge-success' : req.status === 'PENDING' ? 'ci-badge-warning' : 'ci-badge-danger'
                          }`}>
                            {req.status}
                          </span>
                          {req.status === 'APPROVED' && (
                            <div className="mt-1">
                              <span className="badge bg-success-subtle text-success border border-success-subtle d-inline-flex align-items-center gap-1" style={{ fontSize: '10px' }}>
                                <CheckCircle2 size={10} />
                                Active & Provisioned
                              </span>
                            </div>
                          )}
                        </td>
                        <td className="small text-muted">
                          {new Date(req.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </td>
                        <td className="text-end">
                          <div className="btn-group btn-group-sm">
                            <button
                              type="button"
                              onClick={() => {
                                setDetailItem({ ...req, _type: 'provider' });
                                setShowDetailModal(true);
                              }}
                              className="btn btn-outline-secondary"
                              title="View full submitted details"
                            >
                              <Eye size={13} className="me-1" />
                              <span>Details</span>
                            </button>
                            {['PENDING', 'UNDER_REVIEW'].includes(req.status) && (
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedRequest({ ...req, _type: 'provider' });
                                  setReviewAction('APPROVED');
                                  setReviewInitialPassword(generateRandomPassword());
                                  setShowReviewModal(true);
                                }}
                                className="btn btn-outline-primary"
                              >
                                Review
                              </button>
                            )}
                            {req.status === 'APPROVED' && (
                              <button
                                type="button"
                                onClick={() => handleResetProviderPassword(req)}
                                className="btn btn-outline-secondary"
                                title="Reset credentials for this provider operator"
                              >
                                <KeyRound size={13} className="me-1" />
                                <span>Reset Password</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: Provider Configurations & Health */}
      {['providers', 'configs'].includes(activeTab) && (
        <div className="ci-card overflow-hidden">
          <div className="ci-card-header">
            <span className="small fw-bold text-uppercase text-muted">Provider Routing & Adapter Telemetry</span>
            <span className="badge bg-light text-dark border">{providerConfigs.length} Adapters</span>
          </div>

          <div className="table-responsive">
            <table className="table ci-table table-hover align-middle mb-0">
              <thead>
                <tr>
                  <th>Provider Organization</th>
                  <th>Service Endpoint</th>
                  <th>Adapter Type</th>
                  <th>Environment</th>
                  <th>Status</th>
                  <th>Avg Latency</th>
                  <th>Last Checked</th>
                  <th className="text-end">Health Actions</th>
                </tr>
              </thead>
              <tbody>
                {loadingProviders ? (
                  <tr><td colSpan={8} className="text-center py-4 text-muted">Loading provider configurations...</td></tr>
                ) : providerConfigs.length === 0 ? (
                  <tr><td colSpan={8} className="text-center py-4 text-muted">No provider configurations active.</td></tr>
                ) : (
                  providerConfigs.map((cfg) => (
                    <tr key={cfg._id}>
                      <td>
                        <div className="fw-semibold text-dark">{cfg.organizationId?.name || 'General Provider'}</div>
                        <div className="small text-muted font-monospace">{cfg.organizationId?.memberCode || 'N/A'}</div>
                      </td>
                      <td>
                        <div className="small fw-semibold">{cfg.serviceId?.name || 'All Services'}</div>
                        <div className="small text-muted font-monospace">{cfg.serviceId?.endpointAlias || 'N/A'}</div>
                      </td>
                      <td><span className="badge bg-light text-secondary border font-monospace">{cfg.adapterType}</span></td>
                      <td><span className="badge bg-light text-dark border text-uppercase">{cfg.environment}</span></td>
                      <td>
                        <span className={`ci-badge ${cfg.healthState === 'Online' ? 'ci-badge-success' : 'ci-badge-warning'}`}>
                          {cfg.healthState}
                        </span>
                      </td>
                      <td className="small font-monospace">{cfg.latencyAvgMs} ms</td>
                      <td className="small text-muted">
                        {cfg.lastCheckedAt ? new Date(cfg.lastCheckedAt).toLocaleTimeString() : 'N/A'}
                      </td>
                      <td className="text-end">
                        <button
                          type="button"
                          onClick={() => handleToggleProviderHealth(cfg._id, cfg.healthState)}
                          className={`btn btn-xs ${cfg.healthState === 'Online' ? 'btn-outline-danger' : 'btn-outline-success'}`}
                          style={{ fontSize: '11px', padding: '3px 8px' }}
                        >
                          {cfg.healthState === 'Online' ? 'Set Offline' : 'Set Online'}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: Service Grants */}
      {activeTab === 'grants' && (() => {
        // Filter out broken/orphaned entries without valid service or organization
        const validGrants = (grants || []).filter((g) => g.serviceId && g.organizationId);

        // Get unique organizations for the dropdown filter
        const uniqueOrgs = Array.from(
          new Map(validGrants.map((g) => [g.organizationId._id, g.organizationId])).values()
        );

        // Apply org filter and search
        const displayGrants = validGrants.filter((g) => {
          if (grantOrgFilter !== 'all' && g.organizationId._id !== grantOrgFilter) {
            return false;
          }
          if (grantSearch.trim()) {
            const query = grantSearch.toLowerCase();
            const orgName = (g.organizationId?.name || '').toLowerCase();
            const memberCode = (g.organizationId?.memberCode || '').toLowerCase();
            const svcName = (g.serviceId?.name || '').toLowerCase();
            const svcCat = (g.serviceId?.category || '').toLowerCase();
            if (!orgName.includes(query) && !memberCode.includes(query) && !svcName.includes(query) && !svcCat.includes(query)) {
              return false;
            }
          }
          return true;
        });

        // Group by organization
        const groupedMap = {};
        displayGrants.forEach((g) => {
          const orgId = g.organizationId._id;
          if (!groupedMap[orgId]) {
            groupedMap[orgId] = {
              organization: g.organizationId,
              grants: [],
            };
          }
          groupedMap[orgId].grants.push(g);
        });
        const groupedOrgs = Object.values(groupedMap);

        return (
          <div className="d-flex flex-column gap-3">
            {/* Toolbar: Search, Org Filter, View Toggle, and Grant Button */}
            <div className="ci-card p-3">
              <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
                <div className="d-flex flex-wrap align-items-center gap-2">
                  <div className="input-group input-group-sm" style={{ width: '220px' }}>
                    <span className="input-group-text bg-white border-end-0">
                      <Search size={14} className="text-muted" />
                    </span>
                    <input
                      type="text"
                      placeholder="Search org or service..."
                      value={grantSearch}
                      onChange={(e) => setGrantSearch(e.target.value)}
                      className="form-control form-control-sm border-start-0"
                    />
                  </div>

                  <select
                    value={grantOrgFilter}
                    onChange={(e) => setGrantOrgFilter(e.target.value)}
                    className="form-select form-select-sm"
                    style={{ width: '210px' }}
                  >
                    <option value="all">All Organizations ({uniqueOrgs.length})</option>
                    {uniqueOrgs.map((o) => (
                      <option key={o._id} value={o._id}>
                        {o.name} ({o.memberCode})
                      </option>
                    ))}
                  </select>

                  <div className="btn-group btn-group-sm ms-md-2" role="group">
                    <button
                      type="button"
                      onClick={() => setGrantsViewMode('grouped')}
                      className={`btn btn-sm ${grantsViewMode === 'grouped' ? 'btn-primary' : 'btn-outline-secondary'}`}
                    >
                      Grouped by Org
                    </button>
                    <button
                      type="button"
                      onClick={() => setGrantsViewMode('flat')}
                      className={`btn btn-sm ${grantsViewMode === 'flat' ? 'btn-primary' : 'btn-outline-secondary'}`}
                    >
                      Flat List
                    </button>
                  </div>
                </div>

                <div className="d-flex align-items-center gap-2">
                  <span className="badge bg-light text-dark border px-2 py-1.5" style={{ fontSize: '12px' }}>
                    {displayGrants.length} Active Grants
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      fetchOrgs();
                      fetchServices();
                      setShowGrantModal(true);
                    }}
                    className="ci-btn-primary btn-sm d-flex align-items-center gap-1.5 py-1 px-3"
                    style={{ fontSize: '12px' }}
                  >
                    <Plus size={14} />
                    <span>Grant Service Access</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Content Area */}
            {loadingGrants ? (
              <div className="ci-card p-5 text-center text-muted">
                <RefreshCw size={24} className="animate-spin mb-2 mx-auto text-secondary" />
                <p className="mb-0">Loading federated service entitlements...</p>
              </div>
            ) : displayGrants.length === 0 ? (
              <div className="ci-card p-5 text-center text-muted">
                <Layers size={32} className="mb-2 mx-auto text-secondary opacity-50" />
                <h6 className="fw-bold text-dark">No Service Grants Found</h6>
                <p className="small mb-0">
                  {grantSearch || grantOrgFilter !== 'all'
                    ? 'No grants match your selected search or filter criteria.'
                    : 'No service access grants have been issued yet. Click "+ Grant Service Access" to create one.'}
                </p>
              </div>
            ) : grantsViewMode === 'grouped' ? (
              /* GROUPED VIEW: Clear organization containers, each service listed cleanly */
              groupedOrgs.map(({ organization, grants: orgGrants }) => (
                <div key={organization._id} className="ci-card overflow-hidden shadow-2xs">
                  {/* Organization Card Header */}
                  <div className="ci-card-header d-flex flex-column flex-sm-row justify-content-between align-items-sm-center gap-2 bg-light py-2.5 px-3 border-bottom">
                    <div className="d-flex align-items-center gap-2">
                      <Building2 size={16} className="text-primary" />
                      <span className="fw-bold text-dark">{organization.name}</span>
                      <span className="badge bg-white text-primary border font-monospace" style={{ fontSize: '11px' }}>
                        {organization.memberCode}
                      </span>
                      <span className="badge bg-secondary-subtle text-secondary border" style={{ fontSize: '11px' }}>
                        {organization.category}
                      </span>
                      <span className={`ci-badge ${organization.status === 'active' ? 'ci-badge-success' : 'ci-badge-danger'}`}>
                        Org: {organization.status}
                      </span>
                    </div>
                    <span className="badge bg-primary text-white" style={{ fontSize: '11px' }}>
                      {orgGrants.length} Entitled Service{orgGrants.length > 1 ? 's' : ''}
                    </span>
                  </div>

                  {/* Grants Table for this Organization */}
                  <div className="table-responsive">
                    <table className="table ci-table table-hover align-middle mb-0">
                      <thead>
                        <tr className="bg-white">
                          <th style={{ width: '35%' }}>Granted Verification Service</th>
                          <th style={{ width: '35%' }}>Permitted Verification Purposes</th>
                          <th style={{ width: '10%' }}>Status</th>
                          <th style={{ width: '10%' }}>Granted At</th>
                          <th style={{ width: '10%' }} className="text-end">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {orgGrants.map((g) => (
                          <tr key={g._id}>
                            <td>
                              <div className="fw-semibold text-dark">{g.serviceId?.name || 'N/A'}</div>
                              <div className="small text-muted">{g.serviceId?.category} • v{g.serviceId?.version || '1.0'}</div>
                            </td>
                            <td>
                              <div className="d-flex flex-wrap gap-1" style={{ maxWidth: '320px' }}>
                                {(g.allowedPurposes || []).map((p, idx) => (
                                  <span key={idx} className="badge bg-light text-secondary border" style={{ fontSize: '10px' }}>
                                    {p}
                                  </span>
                                ))}
                              </div>
                            </td>
                            <td>
                              <span className={`ci-badge ${g.status === 'ACTIVE' ? 'ci-badge-success' : 'ci-badge-danger'}`}>
                                {g.status}
                              </span>
                            </td>
                            <td className="small text-muted font-monospace" style={{ fontSize: '11px' }}>
                              {new Date(g.grantedAt || g.createdAt).toLocaleDateString('en-IN', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                              })}
                            </td>
                            <td className="text-end">
                              <button
                                type="button"
                                onClick={() => handleRevokeGrant(g._id)}
                                className="btn btn-sm btn-outline-danger"
                                style={{ fontSize: '11px', padding: '3px 8px' }}
                                title="Revoke this service entitlement"
                              >
                                Revoke
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))
            ) : (
              /* FLAT TABLE VIEW: Distinct service tag clearly explaining multiple services per org */
              <div className="ci-card overflow-hidden">
                <div className="table-responsive">
                  <table className="table ci-table table-hover align-middle mb-0">
                    <thead>
                      <tr>
                        <th>Consumer Organization</th>
                        <th>Granted Service</th>
                        <th>Allowed Purposes</th>
                        <th>Status</th>
                        <th>Granted At</th>
                        <th className="text-end">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {displayGrants.map((g) => (
                        <tr key={g._id}>
                          <td>
                            <div className="fw-semibold text-dark">{g.organizationId?.name}</div>
                            <div className="small text-muted font-monospace">{g.organizationId?.memberCode}</div>
                          </td>
                          <td>
                            <div className="small fw-semibold text-dark">{g.serviceId?.name || 'N/A'}</div>
                            <div className="small text-muted">{g.serviceId?.category}</div>
                          </td>
                          <td>
                            <div className="d-flex flex-wrap gap-1" style={{ maxWidth: '280px' }}>
                              {(g.allowedPurposes || []).map((p, idx) => (
                                <span key={idx} className="badge bg-light text-secondary border" style={{ fontSize: '10px' }}>
                                  {p}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td>
                            <span className={`ci-badge ${g.status === 'ACTIVE' ? 'ci-badge-success' : 'ci-badge-danger'}`}>
                              {g.status}
                            </span>
                          </td>
                          <td className="small text-muted font-monospace" style={{ fontSize: '11px' }}>
                            {new Date(g.grantedAt || g.createdAt).toLocaleDateString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </td>
                          <td className="text-end">
                            <button
                              type="button"
                              onClick={() => handleRevokeGrant(g._id)}
                              className="btn btn-sm btn-outline-danger"
                              style={{ fontSize: '11px', padding: '3px 8px' }}
                              title="Revoke grant"
                            >
                              Revoke
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* TAB 5: Audit Log */}
      {['audits', 'audit'].includes(activeTab) && (
        <div className="ci-card overflow-hidden">
          <div className="ci-card-header">
            <span className="small fw-bold text-uppercase text-muted">Immutable Platform Audit Trail</span>
            <div className="d-flex align-items-center gap-2">
              <select
                value={auditFilterOutcome}
                onChange={(e) => { setAuditFilterOutcome(e.target.value); setAuditPage(1); }}
                className="form-select form-select-sm"
                style={{ width: '140px' }}
              >
                <option value="all">All Outcomes</option>
                <option value="SUCCESS">SUCCESS</option>
                <option value="DENIED">DENIED</option>
                <option value="FAILURE">FAILURE</option>
              </select>
            </div>
          </div>

          <div className="table-responsive">
            <table className="table ci-table table-hover align-middle mb-0">
              <thead>
                <tr>
                  <th>Timestamp (UTC)</th>
                  <th>Actor / Email</th>
                  <th>Action</th>
                  <th>Resource</th>
                  <th>Outcome</th>
                  <th>Audit Details</th>
                </tr>
              </thead>
              <tbody>
                {loadingAudits ? (
                  <tr><td colSpan={6} className="text-center py-4 text-muted">Loading audit trail...</td></tr>
                ) : auditEvents.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-4 text-muted">No audit events found.</td></tr>
                ) : (
                  auditEvents.map((evt) => (
                    <tr key={evt._id}>
                      <td className="font-monospace small text-muted">
                        {new Date(evt.createdAt).toISOString().replace('T', ' ').slice(0, 19)}
                      </td>
                      <td>
                        <div className="small fw-semibold text-dark">{evt.actorEmail}</div>
                      </td>
                      <td>
                        <span className="badge bg-light text-dark border font-monospace" style={{ fontSize: '11px' }}>
                          {evt.action}
                        </span>
                      </td>
                      <td className="small text-secondary">{evt.resourceType}</td>
                      <td>
                        <span className={`ci-badge ${
                          evt.outcome === 'SUCCESS' ? 'ci-badge-success' : evt.outcome === 'DENIED' ? 'ci-badge-warning' : 'ci-badge-danger'
                        }`}>
                          {evt.outcome}
                        </span>
                      </td>
                      <td className="small text-muted text-truncate" style={{ maxWidth: '350px' }}>
                        {evt.details}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Audit Pagination */}
          {auditPagination.totalPages > 1 && (
            <div className="d-flex align-items-center justify-content-between p-3 border-top">
              <span className="small text-muted">
                Showing page {auditPage} of {auditPagination.totalPages} ({auditPagination.total} total events)
              </span>
              <div className="btn-group btn-group-sm">
                <button
                  type="button"
                  disabled={auditPage <= 1}
                  onClick={() => setAuditPage(auditPage - 1)}
                  className="btn btn-outline-secondary"
                >
                  Previous
                </button>
                <button
                  type="button"
                  disabled={auditPage >= auditPagination.totalPages}
                  onClick={() => setAuditPage(auditPage + 1)}
                  className="btn btn-outline-secondary"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 6: Users */}
      {['users', 'settings'].includes(activeTab) && (
        <div className="ci-card overflow-hidden">
          <div className="ci-card-header">
            <span className="small fw-bold text-uppercase text-muted">Platform User Accounts & Role Assignments</span>
            <span className="badge bg-light text-dark border">{usersList.length} Users</span>
          </div>

          <div className="table-responsive">
            <table className="table ci-table table-hover align-middle mb-0">
              <thead>
                <tr>
                  <th>Display Name</th>
                  <th>Email Address</th>
                  <th>Assigned Role</th>
                  <th>Associated Organization</th>
                  <th>Status</th>
                  <th>Created At</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loadingUsers ? (
                  <tr><td colSpan={7} className="text-center py-4 text-muted">Loading user accounts...</td></tr>
                ) : usersList.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-4 text-muted">No users found.</td></tr>
                ) : (
                  usersList.map((u) => {
                    const isSelf = u.email === user?.email;
                    return (
                      <tr key={u._id}>
                        <td>
                          <div className="fw-semibold text-dark">{u.displayName}</div>
                          {isSelf && <span className="badge bg-primary-subtle text-primary border" style={{ fontSize: '10px' }}>Current User</span>}
                        </td>
                        <td className="small font-monospace">{u.email}</td>
                        <td>
                          <span className="badge bg-light text-secondary border font-monospace text-uppercase">
                            {u.role}
                          </span>
                        </td>
                        <td className="small text-muted">
                          {u.organizationId?.name || u.providerId?.name || 'Platform Level'}
                        </td>
                        <td>
                          <span className={`ci-badge ${u.status === 'active' ? 'ci-badge-success' : 'ci-badge-danger'}`}>
                            {u.status}
                          </span>
                        </td>
                        <td className="small text-muted">
                          {new Date(u.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </td>
                        <td className="text-end">
                          <div className="btn-group btn-group-sm">
                            <button
                              type="button"
                              onClick={async () => {
                                const generated = generateRandomPassword();
                                const newP = prompt(`Reset password for ${u.displayName} (${u.email}):`, generated);
                                if (!newP) return;
                                try {
                                  const res = await adminApi.updateUser(u._id, { password: newP });
                                  if (res.success) {
                                    alert(`Password for ${u.email} successfully updated to:\n${newP}`);
                                    fetchUsers();
                                  }
                                } catch (err) {
                                  alert('Failed to update password: ' + (err.message || 'Error'));
                                }
                              }}
                              className="btn btn-outline-secondary"
                              style={{ fontSize: '11px', padding: '2px 8px' }}
                              title="Reset user password"
                            >
                              <KeyRound size={12} className="me-1" />
                              Reset Password
                            </button>
                            {isSelf ? (
                              <span className="badge bg-light text-muted border d-flex align-items-center px-2" style={{ fontSize: '11px' }}>Protected</span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleToggleUserStatus(u._id, u.status, u.displayName || u.email)}
                                className={`btn ${u.status === 'active' ? 'btn-outline-danger' : 'btn-outline-success'}`}
                                style={{ fontSize: '11px', padding: '2px 8px' }}
                                title={u.status === 'active' ? 'Suspend access for this user' : 'Reactivate access for this user'}
                              >
                                {u.status === 'active' ? 'Suspend' : 'Reactivate'}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CREATE ORG MODAL */}
      {showOrgModal && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content ci-card border-0 shadow">
              <div className="modal-header border-bottom">
                <h5 className="modal-title h6 fw-bold">Register New Organization</h5>
                <button type="button" className="btn-close" onClick={() => setShowOrgModal(false)} />
              </div>
              <form onSubmit={handleCreateOrg}>
                <div className="modal-body p-4 row g-3">
                  <div className="col-12">
                    <label className="form-label small fw-semibold">Organization Name *</label>
                    <input
                      type="text"
                      required
                      value={newOrg.name}
                      onChange={(e) => setNewOrg({ ...newOrg, name: e.target.value })}
                      placeholder="e.g. University of Mumbai"
                      className="form-control form-control-sm"
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label small fw-semibold">Member Code *</label>
                    <input
                      type="text"
                      required
                      value={newOrg.memberCode}
                      onChange={(e) => setNewOrg({ ...newOrg, memberCode: e.target.value })}
                      placeholder="IN-MU-01"
                      className="form-control form-control-sm"
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label small fw-semibold">Category *</label>
                    <select
                      value={newOrg.category}
                      onChange={(e) => setNewOrg({ ...newOrg, category: e.target.value })}
                      className="form-select form-select-sm"
                    >
                      <option value="Education">Education</option>
                      <option value="Insurance">Insurance</option>
                      <option value="Identity">Identity</option>
                      <option value="Employment">Employment</option>
                      <option value="Business">Business</option>
                      <option value="Verifier">Verifier</option>
                    </select>
                  </div>
                  <div className="col-12">
                    <label className="form-label small fw-semibold">Contact Email *</label>
                    <input
                      type="email"
                      required
                      value={newOrg.contactEmail}
                      onChange={(e) => setNewOrg({ ...newOrg, contactEmail: e.target.value })}
                      placeholder="admin@mu.ac.in"
                      className="form-control form-control-sm"
                    />
                  </div>
                  <div className="col-12">
                    <label className="form-label small fw-semibold">Description</label>
                    <textarea
                      rows={2}
                      value={newOrg.description}
                      onChange={(e) => setNewOrg({ ...newOrg, description: e.target.value })}
                      className="form-control form-control-sm"
                    />
                  </div>
                </div>
                <div className="modal-footer border-top">
                  <button type="button" className="ci-btn-secondary" onClick={() => setShowOrgModal(false)}>Cancel</button>
                  <button type="submit" className="ci-btn-primary">Register Organization</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* REVIEW APPLICATION MODAL */}
      {showReviewModal && selectedRequest && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content ci-card border-0 shadow">
              <div className="modal-header border-bottom">
                <h5 className="modal-title h6 fw-bold">
                  Review Application: {selectedRequest.organizationName || selectedRequest.providerName}
                </h5>
                <button type="button" className="btn-close" onClick={() => setShowReviewModal(false)} />
              </div>
              <form onSubmit={handleReviewSubmit}>
                <div className="modal-body p-4 row g-3">
                  <div className="col-12">
                    <div className="p-3 bg-light rounded-3 border small mb-2">
                      <div className="d-flex justify-content-between mb-1">
                        <span className="text-muted">Type:</span>
                        <strong className="text-dark">
                          {selectedRequest.organizationType || selectedRequest.providerCategory || 'Institutional'}
                        </strong>
                      </div>
                      <div className="d-flex justify-content-between mb-1">
                        <span className="text-muted">Contact:</span>
                        <span>{selectedRequest.contactPersonName} ({selectedRequest.officialEmail})</span>
                      </div>
                      <div className="d-flex justify-content-between">
                        <span className="text-muted">Scope / Reason:</span>
                        <span className="text-dark">
                          {selectedRequest.reasonForAccess || selectedRequest.serviceOfferings || 'Standard Verification'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="col-12">
                    <label className="form-label small fw-semibold">Review Decision *</label>
                    <select
                      value={reviewAction}
                      onChange={(e) => setReviewAction(e.target.value)}
                      className="form-select form-select-sm"
                    >
                      <option value="APPROVED">APPROVE APPLICATION</option>
                      <option value="REJECTED">REJECT APPLICATION</option>
                      <option value="UNDER_REVIEW">SET UNDER REVIEW</option>
                    </select>
                  </div>

                  {reviewAction === 'APPROVED' && selectedRequest._type === 'provider' && (
                    <div className="col-12">
                      <div className="d-flex justify-content-between align-items-center mb-1">
                        <label className="form-label small fw-semibold mb-0">Initial Operator Password</label>
                        <button
                          type="button"
                          className="btn btn-link btn-sm p-0 text-decoration-none"
                          style={{ fontSize: '12px' }}
                          onClick={() => setReviewInitialPassword(generateRandomPassword())}
                        >
                          Generate Random
                        </button>
                      </div>
                      <input
                        type="text"
                        value={reviewInitialPassword}
                        onChange={(e) => setReviewInitialPassword(e.target.value)}
                        placeholder="Leave blank to auto-generate a random secure password"
                        className="form-control form-control-sm font-monospace"
                      />
                      <small className="text-muted" style={{ fontSize: '11px' }}>
                        A unique secure password will be created and displayed upon approval.
                      </small>
                    </div>
                  )}

                  <div className="col-12">
                    <label className="form-label small fw-semibold">Review Notes & Justification</label>
                    <textarea
                      rows={3}
                      value={reviewNote}
                      onChange={(e) => setReviewNote(e.target.value)}
                      placeholder="e.g. Identity and authorization verified against official registry."
                      className="form-control form-control-sm"
                    />
                  </div>
                </div>
                <div className="modal-footer border-top">
                  <button type="button" className="ci-btn-secondary" onClick={() => setShowReviewModal(false)}>Cancel</button>
                  <button type="submit" disabled={reviewSubmitting} className="ci-btn-primary">
                    {reviewSubmitting ? 'Recording Decision...' : 'Commit Decision'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* DETAIL MODAL */}
      {showDetailModal && detailItem && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content ci-card border-0 shadow">
              <div className="modal-header border-bottom">
                <div className="d-flex align-items-center gap-2">
                  <h5 className="modal-title h6 fw-bold mb-0">Application Details</h5>
                  <span className="badge bg-light text-primary border font-monospace">{detailItem.referenceNumber}</span>
                  <span className={`ci-badge ${
                    detailItem.status === 'APPROVED' ? 'ci-badge-success' : detailItem.status === 'PENDING' ? 'ci-badge-warning' : 'ci-badge-danger'
                  }`}>
                    {detailItem.status}
                  </span>
                </div>
                <button type="button" className="btn-close" onClick={() => setShowDetailModal(false)} />
              </div>
              <div className="modal-body p-4">
                <div className="row g-3 small">
                  <div className="col-sm-6">
                    <span className="text-muted d-block">Entity Legal Name:</span>
                    <strong className="fs-6 text-dark">{detailItem.organizationName || detailItem.providerName}</strong>
                  </div>
                  <div className="col-sm-6">
                    <span className="text-muted d-block">Application Track:</span>
                    <span className="badge bg-light text-dark border">
                      {detailItem._type === 'provider' ? 'Authoritative Data Provider' : 'Consumer / Verifier Organization'}
                    </span>
                  </div>

                  <div className="col-sm-6">
                    <span className="text-muted d-block">Official Email:</span>
                    <span>{detailItem.officialEmail}</span>
                  </div>
                  <div className="col-sm-6">
                    <span className="text-muted d-block">Sector / Category:</span>
                    <span>{detailItem.organizationType || detailItem.providerCategory || 'N/A'}</span>
                  </div>

                  <div className="col-sm-6">
                    <span className="text-muted d-block">Contact Person:</span>
                    <span>{detailItem.contactPersonName || 'N/A'} ({detailItem.designation || 'N/A'})</span>
                  </div>
                  <div className="col-sm-6">
                    <span className="text-muted d-block">Contact Phone:</span>
                    <span>{detailItem.contactPhone || 'N/A'}</span>
                  </div>

                  {detailItem.website && (
                    <div className="col-sm-6">
                      <span className="text-muted d-block">Official Website:</span>
                      <a href={detailItem.website} target="_blank" rel="noreferrer" className="text-primary text-truncate d-block">
                        {detailItem.website}
                      </a>
                    </div>
                  )}

                  {detailItem.technicalContactEmail && (
                    <div className="col-sm-6">
                      <span className="text-muted d-block">Technical Contact Email:</span>
                      <span>{detailItem.technicalContactEmail}</span>
                    </div>
                  )}

                  {detailItem.registrationNumber && (
                    <div className="col-sm-6">
                      <span className="text-muted d-block">Registration / CIN Number:</span>
                      <span className="font-monospace text-dark">{detailItem.registrationNumber}</span>
                    </div>
                  )}

                  <div className="col-sm-6">
                    <span className="text-muted d-block">Submission Timestamp:</span>
                    <span>{new Date(detailItem.createdAt).toLocaleString('en-IN')}</span>
                  </div>

                  <div className="col-12 mt-2 pt-2 border-top">
                    <span className="text-muted d-block">Service Offerings / Requested Access:</span>
                    <div className="p-2 bg-light rounded border text-dark mt-1">
                      {detailItem.intendedServices?.length
                        ? detailItem.intendedServices.join(', ')
                        : (detailItem.serviceOfferings || detailItem.reasonForAccess || 'Standard verification scope')}
                    </div>
                  </div>

                  {detailItem.reviewNote && (
                    <div className="col-12 mt-2 pt-2 border-top">
                      <span className="text-muted d-block">Review Decision Notes:</span>
                      <div className="p-2 bg-light rounded border text-dark fst-italic mt-1">
                        "{detailItem.reviewNote}"
                      </div>
                    </div>
                  )}

                  {detailItem.createdOrganizationId && (
                    <div className="col-12 mt-2 pt-2 border-top">
                      <span className="text-muted d-block">Provisioned Organization ID:</span>
                      <span className="font-monospace text-primary">{detailItem.createdOrganizationId}</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="modal-footer border-top">
                <button type="button" className="ci-btn-secondary" onClick={() => setShowDetailModal(false)}>
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* GRANT SERVICE MODAL */}
      {showGrantModal && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content ci-card border-0 shadow">
              <div className="modal-header border-bottom">
                <h5 className="modal-title h6 fw-bold">Grant Service Access to Organization</h5>
                <button type="button" className="btn-close" onClick={() => setShowGrantModal(false)} />
              </div>
              <form onSubmit={handleCreateGrantSubmit}>
                <div className="modal-body p-4 row g-3">
                  <div className="col-12">
                    <label className="form-label small fw-semibold">Select Consumer Organization *</label>
                    <select
                      required
                      value={newGrant.organizationId}
                      onChange={(e) => setNewGrant({ ...newGrant, organizationId: e.target.value })}
                      className="form-select form-select-sm"
                    >
                      <option value="">-- Choose Approved Organization --</option>
                      {organizations
                        .filter((o) => o.status === 'active')
                        .map((o) => (
                          <option key={o._id} value={o._id}>
                            {o.name} ({o.memberCode})
                          </option>
                        ))}
                    </select>
                  </div>

                  <div className="col-12">
                    <label className="form-label small fw-semibold">Select Verification Service *</label>
                    <select
                      required
                      value={newGrant.serviceId}
                      onChange={(e) => setNewGrant({ ...newGrant, serviceId: e.target.value })}
                      className="form-select form-select-sm"
                    >
                      <option value="">-- Choose Active Service --</option>
                      {availableServices.map((s) => (
                        <option key={s._id} value={s._id}>
                          {s.name} ({s.category} - {s.endpointAlias})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="col-12">
                    <label className="form-label small fw-semibold mb-1">Allowed Verification Purposes</label>
                    <div className="d-flex flex-column gap-1.5 p-2.5 bg-light rounded border small">
                      {[
                        { id: 'academic_credential_check', label: 'Academic & Degree Verification' },
                        { id: 'kyc_identity_verification', label: 'KYC & Identity Verification' },
                        { id: 'employment_screening', label: 'Employment History Screening' },
                        { id: 'insurance_claim_assessment', label: 'Insurance Policy Assessment' },
                        { id: 'audit_and_compliance', label: 'Regulatory Audit & Compliance' },
                      ].map((p) => (
                        <label key={p.id} className="d-flex align-items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={newGrant.allowedPurposes.includes(p.id)}
                            onChange={() => {
                              const exists = newGrant.allowedPurposes.includes(p.id);
                              setNewGrant({
                                ...newGrant,
                                allowedPurposes: exists
                                  ? newGrant.allowedPurposes.filter((x) => x !== p.id)
                                  : [...newGrant.allowedPurposes, p.id],
                              });
                            }}
                            className="form-check-input mt-0"
                          />
                          <span>{p.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="modal-footer border-top">
                  <button type="button" className="ci-btn-secondary" onClick={() => setShowGrantModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" disabled={grantSubmitting} className="ci-btn-primary">
                    {grantSubmitting ? 'Granting...' : 'Grant Service Access'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ACTIVATE ACCOUNT / CREDENTIALS MODAL */}
      {showActivateModal && activatingRequest && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content ci-card border-0 shadow">
              <div className="modal-header border-bottom">
                <h5 className="modal-title h6 fw-bold">
                  {activationResult ? 'Provisioned Account Credentials' : `Activate Account: ${activatingRequest.organizationName || activatingRequest.providerName}`}
                </h5>
                <button type="button" className="btn-close" onClick={() => { setShowActivateModal(false); setActivationResult(null); }} />
              </div>
              <form onSubmit={handleActivateSubmit}>
                <div className="modal-body p-4 row g-3">
                  {activationResult ? (
                    <div className="col-12">
                      <div className="alert alert-success small mb-0">
                        <div className="d-flex align-items-center justify-content-between mb-2">
                          <h6 className="fw-bold mb-0 text-success d-flex align-items-center gap-1.5">
                            <CheckCircle2 size={16} /> Credentials Active in Database
                          </h6>
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-1"
                            style={{ fontSize: '11px' }}
                            onClick={() => {
                              const text = `ConnectIndia Login Credentials:\nEmail: ${activationResult.account?.email}\nPassword: ${activationResult.account?.initialPassword}\nEntity Code: ${activationResult.organization?.memberCode}`;
                              navigator.clipboard.writeText(text);
                              setCopiedCreds(true);
                              setTimeout(() => setCopiedCreds(false), 2000);
                            }}
                          >
                            {copiedCreds ? <Check size={12} className="text-success" /> : <Copy size={12} />}
                            <span>{copiedCreds ? 'Copied!' : 'Copy Credentials'}</span>
                          </button>
                        </div>
                        <p className="mb-2 text-muted" style={{ fontSize: '12px' }}>
                          These credentials can now be used immediately to sign in to the platform:
                        </p>
                        <div className="p-3 bg-white rounded border font-monospace small">
                          <div className="mb-1.5"><strong>Login Email:</strong> <span className="text-primary">{activationResult.account?.email}</span></div>
                          <div className="mb-1.5"><strong>Password:</strong> <span className="badge bg-light text-dark border px-2 py-1 font-monospace">{activationResult.account?.initialPassword}</span></div>
                          <div><strong>Entity / Member Code:</strong> {activationResult.organization?.memberCode}</div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="col-12">
                        <label className="form-label small fw-semibold">Assigned Member Code *</label>
                        <input
                          type="text"
                          required
                          value={activateMemberCode}
                          onChange={(e) => setActivateMemberCode(e.target.value)}
                          className="form-control form-control-sm font-monospace"
                        />
                      </div>
                      <div className="col-12">
                        <div className="d-flex justify-content-between align-items-center mb-1">
                          <label className="form-label small fw-semibold mb-0">Initial Password *</label>
                          <button
                            type="button"
                            className="btn btn-link btn-sm p-0 text-decoration-none"
                            style={{ fontSize: '12px' }}
                            onClick={() => setActivateInitialPassword(generateRandomPassword())}
                          >
                            Generate Random
                          </button>
                        </div>
                        <input
                          type="text"
                          required
                          value={activateInitialPassword}
                          onChange={(e) => setActivateInitialPassword(e.target.value)}
                          className="form-control form-control-sm font-monospace"
                        />
                      </div>
                    </>
                  )}
                </div>
                <div className="modal-footer border-top">
                  <button
                    type="button"
                    className="ci-btn-secondary"
                    onClick={() => { setShowActivateModal(false); setActivationResult(null); }}
                  >
                    Close
                  </button>
                  {!activationResult && (
                    <button type="submit" disabled={activateSubmitting} className="ci-btn-primary">
                      {activateSubmitting ? 'Provisioning...' : 'Provision Organization & Verifier User'}
                    </button>
                  )}
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
