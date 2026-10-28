import React, { useState, useEffect } from 'react';
import { useAuth } from '../app/AuthContext';
import { authApi } from '../api/auth.api';
import { orgApi } from '../api/org.api';
import { providerApi } from '../api/provider.api';
import { dashboardApi } from '../api/dashboard.api';
import {
  Building2,
  User,
  ShieldCheck,
  Layers,
  KeyRound,
  CheckCircle2,
  Clock,
  Mail,
  Shield,
  FileCheck2,
  Database,
  RefreshCw,
  Edit3,
  Save,
  X,
  AlertCircle,
  Activity,
  Server,
  FileSpreadsheet,
} from 'lucide-react';

export function ProfilePage() {
  const { user, role, updateUser } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Authenticated User Details (from /auth/me)
  const [fullUser, setFullUser] = useState(null);

  // Role Specific Profile & Stats
  const [orgProfile, setOrgProfile] = useState(null);
  const [orgGrants, setOrgGrants] = useState([]);
  const [providerProfile, setProviderProfile] = useState(null);
  const [providerMetrics, setProviderMetrics] = useState(null);
  const [providerServices, setProviderServices] = useState([]);
  const [adminStats, setAdminStats] = useState(null);

  // Edit Mode States
  const [isEditingUser, setIsEditingUser] = useState(false);
  const [displayNameInput, setDisplayNameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [confirmPasswordInput, setConfirmPasswordInput] = useState('');
  const [savingUser, setSavingUser] = useState(false);

  // Edit Entity State (Org / Provider)
  const [isEditingEntity, setIsEditingEntity] = useState(false);
  const [contactEmailInput, setContactEmailInput] = useState('');
  const [descriptionInput, setDescriptionInput] = useState('');
  const [savingEntity, setSavingEntity] = useState(false);

  // Dedicated Password Management State (for all roles)
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const normRole = (role || '').toLowerCase();
  const isVerifier = normRole === 'verifier' || normRole === 'organization_verifier';
  const isOperator = normRole === 'operator' || normRole === 'provider_operator';
  const isAdmin = normRole === 'admin' || normRole === 'platform_admin';

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // 1. Always fetch fresh authenticated user profile
      const meRes = await authApi.getMe().catch((err) => {
        throw new Error(`Failed to load authenticated profile: ${err.message}`);
      });

      if (meRes.success && meRes.data?.user) {
        setFullUser(meRes.data.user);
        setDisplayNameInput(meRes.data.user.displayName || '');
      }

      // 2. Fetch role-specific details from backend
      if (isVerifier) {
        const [profRes, grantRes] = await Promise.all([
          orgApi.getProfile().catch(() => ({ success: false })),
          orgApi.getGrants().catch(() => ({ success: false })),
        ]);

        if (profRes.success && profRes.data?.organization) {
          setOrgProfile(profRes.data.organization);
          setContactEmailInput(profRes.data.organization.contactEmail || '');
          setDescriptionInput(profRes.data.organization.description || '');
        }
        if (grantRes.success && grantRes.data?.grants) {
          setOrgGrants(grantRes.data.grants);
        }
      } else if (isOperator) {
        const [provRes, srvRes] = await Promise.all([
          providerApi.getProfile().catch(() => ({ success: false })),
          providerApi.getServices().catch(() => ({ success: false })),
        ]);

        if (provRes.success && provRes.data?.provider) {
          setProviderProfile(provRes.data.provider);
          setProviderMetrics(provRes.data.metrics || null);
          setContactEmailInput(provRes.data.provider.contactEmail || '');
          setDescriptionInput(provRes.data.provider.description || '');
        }
        if (srvRes.success && srvRes.data?.services) {
          setProviderServices(srvRes.data.services);
        }
      } else if (isAdmin) {
        const sumRes = await dashboardApi.getSummary().catch(() => ({ success: false }));
        if (sumRes.success && sumRes.data?.metrics) {
          setAdminStats(sumRes.data.metrics);
        }
      }
    } catch (err) {
      console.error('ProfilePage load error:', err);
      setError(err.message || 'Failed to load profile data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [role]);

  // Handle User Profile Update (Name & Password)
  const handleUpdateUserProfile = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!displayNameInput.trim()) {
      setError('Display Name cannot be empty.');
      return;
    }

    if (passwordInput) {
      if (passwordInput.length < 8) {
        setError('New password must be at least 8 characters long.');
        return;
      }
      if (passwordInput !== confirmPasswordInput) {
        setError('Passwords do not match.');
        return;
      }
    }

    setSavingUser(true);
    try {
      const payload = { displayName: displayNameInput.trim() };
      if (passwordInput) payload.password = passwordInput;

      const res = await authApi.updateProfile(payload);
      if (res.success && res.data?.user) {
        setFullUser(res.data.user);
        updateUser(res.data.user);
        setIsEditingUser(false);
        setPasswordInput('');
        setConfirmPasswordInput('');
        setSuccessMsg('Your user profile has been updated and persisted to the database.');
      }
    } catch (err) {
      setError(err.message || 'Failed to update user profile.');
    } finally {
      setSavingUser(false);
    }
  };

  // Handle Entity Profile Update (Org or Provider)
  const handleUpdateEntityProfile = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!contactEmailInput.trim() || !contactEmailInput.includes('@')) {
      setError('Please provide a valid official contact email address.');
      return;
    }

    setSavingEntity(true);
    try {
      const payload = {
        contactEmail: contactEmailInput.trim(),
        description: descriptionInput.trim(),
      };

      if (isVerifier) {
        const res = await orgApi.updateProfile(payload);
        if (res.success && res.data?.organization) {
          setOrgProfile(res.data.organization);
          setIsEditingEntity(false);
          setSuccessMsg('Organization profile details successfully updated and saved in MongoDB.');
        }
      } else if (isOperator) {
        const res = await providerApi.updateProfile(payload);
        if (res.success && res.data?.provider) {
          setProviderProfile(res.data.provider);
          setIsEditingEntity(false);
          setSuccessMsg('Provider profile details successfully updated and saved in MongoDB.');
        }
      }
    } catch (err) {
      setError(err.message || 'Failed to update profile details.');
    } finally {
      setSavingEntity(false);
    }
  };

  // Handle Dedicated Password Change (for Admin, Provider, and Organization)
  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (!currentPassword) {
      setPasswordError('Please enter your current password.');
      return;
    }

    if (!newPassword || newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('New password and confirmation do not match.');
      return;
    }

    try {
      setPasswordLoading(true);
      const res = await authApi.changePassword({
        currentPassword,
        newPassword,
      });

      if (res.success) {
        setPasswordSuccess('Password successfully updated and securely hashed in MongoDB!');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setPasswordError(res.error?.message || 'Failed to update password.');
      }
    } catch (err) {
      setPasswordError(err.message || 'An error occurred while updating your password.');
    } finally {
      setPasswordLoading(false);
    }
  };

  const currentUser = fullUser || user;
  const entityName = isVerifier
    ? orgProfile?.name || currentUser?.organization?.name || 'Verified Organization'
    : isOperator
    ? providerProfile?.name || currentUser?.organization?.name || 'Authorized Provider'
    : 'Platform Governance Authority';

  const memberCode = isVerifier
    ? orgProfile?.memberCode || currentUser?.organization?.memberCode || 'IN-ORG-AUTH'
    : isOperator
    ? providerProfile?.memberCode || currentUser?.organization?.memberCode || 'IN-PRV-AUTH'
    : 'CI-GOV-CENTRAL';

  const category = isVerifier
    ? orgProfile?.category || currentUser?.organization?.category || 'Consuming Verifier'
    : isOperator
    ? providerProfile?.category || currentUser?.organization?.category || 'Authoritative Registry'
    : 'Platform Administration';

  const entityStatus = isVerifier
    ? orgProfile?.status || currentUser?.organization?.status || 'active'
    : isOperator
    ? providerProfile?.status || currentUser?.organization?.status || 'active'
    : 'active';

  return (
    <div className="space-y-6">
      {/* Header & Refresh */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            {isAdmin
              ? 'Platform Administrator Profile'
              : isVerifier
              ? 'Organization Profile & Permissions'
              : 'Provider Operator Profile & Scope'}
          </h1>
          <p className="text-xs text-slate-500">
            {isAdmin
              ? 'Authenticated administrator credentials, platform privilege scope, and audit accountability.'
              : isVerifier
              ? 'Authorized organization identity, verification service grants, and security settings.'
              : 'Authoritative data provider registry identity, registered services, and operator configuration.'}
          </p>
        </div>

        <button
          onClick={loadData}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-200/90 rounded-lg hover:bg-slate-50 shadow-2xs transition-all cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-slate-600 ${loading ? 'animate-spin' : ''}`} />
          <span>Reload Details</span>
        </button>
      </div>

      {/* Notifications */}
      {error && (
        <div className="alert alert-danger d-flex align-items-center gap-2 py-2 px-3 small rounded-3 mb-0" role="alert">
          <AlertCircle size={16} className="shrink-0" />
          <div className="flex-1">{error}</div>
          <button type="button" className="btn-close btn-close-white btn-sm" onClick={() => setError(null)} />
        </div>
      )}

      {successMsg && (
        <div className="alert alert-success d-flex align-items-center gap-2 py-2 px-3 small rounded-3 mb-0" role="alert">
          <CheckCircle2 size={16} className="shrink-0 text-success" />
          <div className="flex-1">{successMsg}</div>
          <button type="button" className="btn-close btn-sm" onClick={() => setSuccessMsg(null)} />
        </div>
      )}

      {/* Grid: Operator Identity & Organization Identity */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* User Identity Card */}
        <div className="ci-card p-4 space-y-3">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-slate-700" />
              <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Authenticated Identity</h2>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-[10px] px-2 py-0.5 rounded font-semibold uppercase ${
                currentUser?.status === 'active'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-rose-50 text-rose-700 border border-rose-200'
              }`}>
                ● {currentUser?.status || 'Active'}
              </span>
              {!isEditingUser && (
                <button
                  type="button"
                  onClick={() => {
                    setIsEditingUser(true);
                    setDisplayNameInput(currentUser?.displayName || '');
                    setPasswordInput('');
                    setConfirmPasswordInput('');
                  }}
                  className="btn btn-xs btn-outline-secondary d-flex align-items-center gap-1"
                  style={{ fontSize: '11px', padding: '2px 7px' }}
                >
                  <Edit3 size={12} />
                  <span>Edit Profile</span>
                </button>
              )}
            </div>
          </div>

          {isEditingUser ? (
            <form onSubmit={handleUpdateUserProfile} className="space-y-3 pt-1">
              <div>
                <label className="text-[11px] font-semibold text-slate-700 block mb-1">Display Name *</label>
                <input
                  type="text"
                  required
                  value={displayNameInput}
                  onChange={(e) => setDisplayNameInput(e.target.value)}
                  className="form-control form-control-sm text-xs"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                  Change Password <span className="text-slate-400 font-normal">(Leave blank to keep current)</span>
                </label>
                <input
                  type="password"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="Min 8 characters"
                  className="form-control form-control-sm text-xs mb-1.5"
                />
                {passwordInput && (
                  <input
                    type="password"
                    value={confirmPasswordInput}
                    onChange={(e) => setConfirmPasswordInput(e.target.value)}
                    placeholder="Confirm new password"
                    className="form-control form-control-sm text-xs"
                  />
                )}
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="submit"
                  disabled={savingUser}
                  className="btn btn-sm btn-primary d-flex align-items-center gap-1 text-xs"
                >
                  <Save size={13} />
                  <span>{savingUser ? 'Saving...' : 'Save Profile'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditingUser(false)}
                  className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-1 text-xs"
                >
                  <X size={13} />
                  <span>Cancel</span>
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-2.5 text-xs">
              <div>
                <span className="text-slate-400 block text-[11px]">Full Display Name</span>
                <span className="font-semibold text-slate-900 text-sm">{currentUser?.displayName || 'Authorized User'}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div>
                  <span className="text-slate-400 block text-[10px]">Login Email</span>
                  <span className="font-mono text-slate-800 truncate block">{currentUser?.email || 'user@connectindia.gov.in'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Assigned Role</span>
                  <span className="font-semibold text-blue-900 capitalize">{role?.replace('_', ' ')}</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div>
                  <span className="text-slate-400 block text-[10px]">Created Date</span>
                  <span className="text-slate-700">
                    {currentUser?.createdAt
                      ? new Date(currentUser.createdAt).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })
                      : 'Initial Provision'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Last Login</span>
                  <span className="text-slate-700">
                    {currentUser?.lastLoginAt
                      ? new Date(currentUser.lastLoginAt).toLocaleString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : 'Active Session'}
                  </span>
                </div>
              </div>
              <div className="pt-1 flex items-center gap-1.5 text-slate-500 text-[11px]">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Cryptographically signed JWT session active</span>
              </div>
            </div>
          )}
        </div>

        {/* Entity Card: Organization / Provider / Platform HQ */}
        <div className="ci-card p-4 space-y-3">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-slate-700" />
              <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                {isOperator ? 'Authoritative Provider Entity' : isVerifier ? 'Registered Consumer Organization' : 'Central Platform Administration'}
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-[10px] px-2 py-0.5 rounded font-semibold uppercase ${
                entityStatus === 'active'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-amber-50 text-amber-700 border border-amber-200'
              }`}>
                ● {entityStatus}
              </span>
              {(isVerifier || isOperator) && !isEditingEntity && (
                <button
                  type="button"
                  onClick={() => {
                    setIsEditingEntity(true);
                    setContactEmailInput(isVerifier ? orgProfile?.contactEmail || '' : providerProfile?.contactEmail || '');
                    setDescriptionInput(isVerifier ? orgProfile?.description || '' : providerProfile?.description || '');
                  }}
                  className="btn btn-xs btn-outline-secondary d-flex align-items-center gap-1"
                  style={{ fontSize: '11px', padding: '2px 7px' }}
                >
                  <Edit3 size={12} />
                  <span>Edit Contact</span>
                </button>
              )}
            </div>
          </div>

          {isEditingEntity ? (
            <form onSubmit={handleUpdateEntityProfile} className="space-y-3 pt-1">
              <div>
                <label className="text-[11px] font-semibold text-slate-700 block mb-1">Official Contact Email *</label>
                <input
                  type="email"
                  required
                  value={contactEmailInput}
                  onChange={(e) => setContactEmailInput(e.target.value)}
                  className="form-control form-control-sm text-xs"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-700 block mb-1">Entity Description / Mission</label>
                <textarea
                  rows={2}
                  value={descriptionInput}
                  onChange={(e) => setDescriptionInput(e.target.value)}
                  placeholder="Official entity purpose..."
                  className="form-control form-control-sm text-xs"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="submit"
                  disabled={savingEntity}
                  className="btn btn-sm btn-primary d-flex align-items-center gap-1 text-xs"
                >
                  <Save size={13} />
                  <span>{savingEntity ? 'Saving...' : 'Save Entity Details'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditingEntity(false)}
                  className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-1 text-xs"
                >
                  <X size={13} />
                  <span>Cancel</span>
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-2.5 text-xs">
              <div>
                <span className="text-slate-400 block text-[11px]">Official Entity Name</span>
                <span className="font-semibold text-slate-900 text-sm">{entityName}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div>
                  <span className="text-slate-400 block text-[10px]">Member / Registry Code</span>
                  <span className="font-mono text-slate-800 font-semibold">{memberCode}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Sector Category</span>
                  <span className="text-slate-800 font-medium">{category}</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div>
                  <span className="text-slate-400 block text-[10px]">Official Contact Email</span>
                  <span className="font-mono text-slate-700 truncate block">
                    {isVerifier
                      ? orgProfile?.contactEmail || currentUser?.email
                      : isOperator
                      ? providerProfile?.contactEmail || currentUser?.email
                      : 'admin@connectindia.gov.in'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Entity ID</span>
                  <span className="font-mono text-slate-500 text-[11px] truncate block">
                    {isVerifier
                      ? orgProfile?._id || currentUser?.organizationId || 'ORG-CENTRAL'
                      : isOperator
                      ? providerProfile?._id || currentUser?.providerId || 'PRV-CENTRAL'
                      : 'CI-CENTRAL-NODE'}
                  </span>
                </div>
              </div>
              {(orgProfile?.description || providerProfile?.description) && (
                <div className="pt-1">
                  <span className="text-slate-400 block text-[10px]">Official Mission / Description</span>
                  <p className="text-slate-600 text-[11px] m-0 line-clamp-2">
                    {orgProfile?.description || providerProfile?.description}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Security & Password Management Card (Accessible to Platform Admin, Data Providers, and Organizations) */}
      <div className="ci-card p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
          <div className="flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-slate-700" />
            <div>
              <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-0">
                Security & Password Management
              </h2>
              <span className="text-[11px] text-slate-500">
                Change your account password securely. Applicable to Platform Admin, Data Providers, and Organization Verifiers.
              </span>
            </div>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded font-mono bg-slate-100 text-slate-600 border self-start sm:self-auto">
            bcrypt (10 rounds)
          </span>
        </div>

        {passwordSuccess && (
          <div className="alert alert-success d-flex align-items-center gap-2 py-2 px-3 small rounded-3 mt-3 mb-0" role="alert">
            <CheckCircle2 size={16} className="shrink-0 text-success" />
            <div className="flex-1">{passwordSuccess}</div>
            <button type="button" className="btn-close btn-sm" onClick={() => setPasswordSuccess('')} />
          </div>
        )}

        {passwordError && (
          <div className="alert alert-danger d-flex align-items-center gap-2 py-2 px-3 small rounded-3 mt-3 mb-0" role="alert">
            <AlertCircle size={16} className="shrink-0" />
            <div className="flex-1">{passwordError}</div>
            <button type="button" className="btn-close btn-close-white btn-sm" onClick={() => setPasswordError('')} />
          </div>
        )}

        <form onSubmit={handleChangePassword} className="mt-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                Current Password *
              </label>
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
                className="form-control form-control-sm text-xs font-monospace"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                New Password *
              </label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimum 8 characters"
                className="form-control form-control-sm text-xs font-monospace"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                Confirm New Password *
              </label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-type new password"
                className="form-control form-control-sm text-xs font-monospace"
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between pt-3 mt-2 border-t border-slate-50 gap-2">
            <span className="text-[11px] text-slate-400">
              Password will be updated immediately in the database and required for subsequent logins.
            </span>
            <button
              type="submit"
              disabled={passwordLoading}
              className="btn btn-sm btn-primary d-flex align-items-center gap-1.5 text-xs px-3 self-end sm:self-auto"
            >
              <KeyRound size={13} />
              <span>{passwordLoading ? 'Updating Password...' : 'Update Password'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* ROLE-SPECIFIC DETAILED SECTION */}

      {/* 1. ORGANIZATION VERIFIER: Granted Verification Services */}
      {isVerifier && (
        <div className="ci-card overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-blue-900" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                  Approved Verification Services & Access Grants
                </h3>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Database-backed record of verification services assigned to {entityName} by Platform Administration.
              </p>
            </div>
            <span className="text-xs font-medium px-2 py-0.5 bg-white border border-slate-200 rounded text-slate-700 self-start sm:self-auto">
              {orgGrants.length} Active Grants
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="ci-table">
              <thead>
                <tr>
                  <th>Approved Service</th>
                  <th>Category</th>
                  <th>Permitted Purpose Policy</th>
                  <th>Consent Policy</th>
                  <th>Status</th>
                  <th>Granted By</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-slate-400 text-xs">
                      <RefreshCw size={18} className="animate-spin mx-auto mb-1 text-slate-500" />
                      Loading approved service grants...
                    </td>
                  </tr>
                ) : orgGrants.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-slate-400 text-xs">
                      No explicit service grants assigned yet. Contact Platform Administration to assign services to this organization.
                    </td>
                  </tr>
                ) : (
                  orgGrants.map((g) => (
                    <tr key={g._id || g.serviceId?._id}>
                      <td>
                        <div className="font-semibold text-slate-900 text-xs">
                          {g.serviceId?.name || 'Standard Verification Service'}
                        </div>
                        <div className="text-[10px] font-mono text-slate-400">
                          v{g.serviceId?.version || '1.0'}
                        </div>
                      </td>
                      <td>
                        <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-medium border border-slate-200">
                          {g.serviceId?.category || 'General'}
                        </span>
                      </td>
                      <td>
                        <div className="flex flex-wrap gap-1">
                          {g.allowedPurposes && g.allowedPurposes.length > 0 ? (
                            g.allowedPurposes.map((p) => (
                              <span
                                key={p}
                                className="text-[10px] bg-blue-50 text-blue-800 border border-blue-200 px-1.5 py-0.2 rounded font-mono"
                              >
                                {p}
                              </span>
                            ))
                          ) : (
                            <span className="text-slate-400 text-[11px]">General Verification</span>
                          )}
                        </div>
                      </td>
                      <td>
                        <span className="text-[11px] text-slate-700 flex items-center gap-1 font-medium">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          Subject Consent Required
                        </span>
                      </td>
                      <td>
                        <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded font-semibold uppercase">
                          {g.status || 'ACTIVE'}
                        </span>
                      </td>
                      <td className="text-slate-500 text-[11px]">
                        {g.grantedBy?.displayName || 'Platform Administrator'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 2. PROVIDER OPERATOR: Registry Scope, Services & Import Activity */}
      {isOperator && (
        <div className="space-y-4">
          {/* Provider Telemetry Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="ci-card p-3">
              <div className="text-slate-400 text-[11px] flex items-center gap-1">
                <Database size={13} />
                <span>Registry Records</span>
              </div>
              <div className="text-lg font-bold text-slate-900 mt-1">
                {providerMetrics?.recordCount ?? '—'}
              </div>
              <div className="text-[10px] text-slate-500">Live in {category} registry</div>
            </div>

            <div className="ci-card p-3">
              <div className="text-slate-400 text-[11px] flex items-center gap-1">
                <Layers size={13} />
                <span>Registered Services</span>
              </div>
              <div className="text-lg font-bold text-slate-900 mt-1">
                {providerMetrics?.activeServices ?? providerServices.length}
              </div>
              <div className="text-[10px] text-slate-500">Standardized API endpoints</div>
            </div>

            <div className="ci-card p-3">
              <div className="text-slate-400 text-[11px] flex items-center gap-1">
                <FileSpreadsheet size={13} />
                <span>Import Operations</span>
              </div>
              <div className="text-lg font-bold text-slate-900 mt-1">
                {providerMetrics?.totalImports ?? '—'}
              </div>
              <div className="text-[10px] text-slate-500">Batch CSV ingestion jobs</div>
            </div>

            <div className="ci-card p-3">
              <div className="text-slate-400 text-[11px] flex items-center gap-1">
                <Activity size={13} />
                <span>Inbound Requests</span>
              </div>
              <div className="text-lg font-bold text-slate-900 mt-1">
                {providerMetrics?.totalTransactions ?? '—'}
              </div>
              <div className="text-[10px] text-slate-500">Resolved via adapter</div>
            </div>
          </div>

          {/* Provider Registered Services Table */}
          <div className="ci-card overflow-hidden">
            <div className="p-3.5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Server className="w-4 h-4 text-emerald-700" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                  Services Provided by {entityName}
                </h3>
              </div>
              <span className="text-[11px] font-medium text-slate-500">
                {providerServices.length} Active Services
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="ci-table">
                <thead>
                  <tr>
                    <th>Service Name</th>
                    <th>Category</th>
                    <th>Adapter Key</th>
                    <th>Status</th>
                    <th>Created</th>
                  </tr>
                </thead>
                <tbody>
                  {providerServices.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-slate-400 text-xs">
                        No services registered for this provider yet.
                      </td>
                    </tr>
                  ) : (
                    providerServices.map((srv) => (
                      <tr key={srv._id}>
                        <td>
                          <div className="font-semibold text-slate-900 text-xs">{srv.name}</div>
                          <div className="text-[10px] font-mono text-slate-400">v{srv.version || '1.0'}</div>
                        </td>
                        <td>
                          <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-medium border border-slate-200">
                            {srv.category}
                          </span>
                        </td>
                        <td className="font-mono text-slate-600 text-xs">{srv.adapterKey}</td>
                        <td>
                          <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded font-semibold uppercase">
                            {srv.status}
                          </span>
                        </td>
                        <td className="text-slate-500 text-[11px]">
                          {srv.createdAt ? new Date(srv.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 3. PLATFORM ADMINISTRATOR: Global System Metrics Overview */}
      {isAdmin && adminStats && (
        <div className="ci-card overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-slate-700" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                Global Platform Oversight Telemetry
              </h3>
            </div>
            <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-mono border">
              Live Database Queries
            </span>
          </div>

          <div className="p-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/80 text-center">
              <span className="text-slate-500 text-[10px] uppercase font-semibold block">Total Orgs</span>
              <span className="text-xl font-bold text-slate-900 block mt-1">{adminStats.totalOrganizations ?? 0}</span>
              <span className="text-[10px] text-slate-400">{adminStats.approvedOrganizations ?? 0} active</span>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/80 text-center">
              <span className="text-slate-500 text-[10px] uppercase font-semibold block">Pending Orgs</span>
              <span className="text-xl font-bold text-amber-600 block mt-1">{adminStats.pendingOrgRequests ?? 0}</span>
              <span className="text-[10px] text-slate-400">Awaiting review</span>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/80 text-center">
              <span className="text-slate-500 text-[10px] uppercase font-semibold block">Total Providers</span>
              <span className="text-xl font-bold text-slate-900 block mt-1">{adminStats.totalProviders ?? 0}</span>
              <span className="text-[10px] text-slate-400">{adminStats.activeProviders ?? 0} active</span>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/80 text-center">
              <span className="text-slate-500 text-[10px] uppercase font-semibold block">Active Services</span>
              <span className="text-xl font-bold text-slate-900 block mt-1">{adminStats.activeServices ?? 0}</span>
              <span className="text-[10px] text-slate-400">Federated APIs</span>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/80 text-center">
              <span className="text-slate-500 text-[10px] uppercase font-semibold block">Throughput</span>
              <span className="text-xl font-bold text-slate-900 block mt-1">{adminStats.totalRequests ?? 0}</span>
              <span className="text-[10px] text-slate-400">Audit logged</span>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/80 text-center">
              <span className="text-slate-500 text-[10px] uppercase font-semibold block">Audit Events</span>
              <span className="text-xl font-bold text-slate-900 block mt-1">{adminStats.totalAuditEvents ?? 0}</span>
              <span className="text-[10px] text-slate-400">Immutable trail</span>
            </div>
          </div>
        </div>
      )}

      {/* Governance & Compliance Footer Note */}
      <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-500 flex items-start gap-2.5">
        <Shield className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
        <p className="m-0 leading-relaxed">
          <strong>Security Notice:</strong> All profile modifications and role operations are recorded in the immutable platform audit ledger with actor credentials, cryptographic session identifiers, and exact timestamps. Account elevations and status shifts require authorized administrator validation.
        </p>
      </div>
    </div>
  );
}
