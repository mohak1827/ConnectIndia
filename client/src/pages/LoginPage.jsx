import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../app/AuthContext';
import { getDefaultLandingPage } from '../app/ProtectedRoute';
import { Lock, Mail, ArrowRight, AlertCircle, ShieldCheck, Home, UserPlus } from 'lucide-react';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const loggedInUser = await login(email, password);
      const defaultPage = getDefaultLandingPage(loggedInUser.role);
      navigate(defaultPage, { replace: true });
    } catch (err) {
      setError(err.message || 'Authentication failed. Please verify your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--ci-bg-page)' }}>
      {/* Top Navigation Header */}
      <header className="w-full bg-white border-b border-slate-200 px-4 sm:px-6 py-2.5 flex items-center justify-between sticky top-0 z-30 shadow-2xs">
        <div className="flex items-center gap-3">
          <Link to="/" className="flex items-center gap-2.5 text-decoration-none">
            <img
              src="/logo.png"
              alt="ConnectIndia Platform"
              style={{ maxHeight: '42px', width: 'auto', objectFit: 'contain' }}
            />
            <div>
              <span className="text-sm font-bold text-slate-900 tracking-tight block leading-tight">ConnectIndia</span>
              <span className="text-[10px] text-slate-500 block">Verification Gateway</span>
            </div>
          </Link>
        </div>

        <nav className="flex items-center gap-2 sm:gap-4">
          <Link
            to="/"
            className="text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:bg-slate-50 text-decoration-none transition-colors"
          >
            <Home size={15} />
            <span>Home</span>
          </Link>
          <Link
            to="/request-access"
            className="text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:bg-slate-50 text-decoration-none transition-colors"
          >
            <UserPlus size={15} />
            <span>Request Access</span>
          </Link>
          <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            Gateway Online
          </span>
        </nav>
      </header>

      {/* Main Login Content */}
      <div className="flex-1 flex flex-col justify-center items-center p-4">
        <div style={{ maxWidth: '440px', width: '100%' }}>
          {/* Brand header */}
          <div className="text-center mb-4">
            <img
              src="/logo.png"
              alt="ConnectIndia Platform"
              className="mb-2 mx-auto"
              style={{ maxHeight: '100px', width: 'auto', objectFit: 'contain' }}
            />
          <h1 className="h5 mb-1" style={{ color: 'var(--ci-navy-800)', fontWeight: 700 }}>
            ConnectIndia Gateway
          </h1>
          <p className="small text-muted mb-0">
            Federated Multi-Sector Verification Gateway · Official Access Portal
          </p>
        </div>

        {/* Card */}
        <div className="ci-card p-4 p-sm-5 mb-3">
          <div className="mb-4">
            <h2 className="h6 mb-1" style={{ color: 'var(--ci-navy-800)', fontWeight: 600 }}>
              Authorized Portal Sign In
            </h2>
            <p className="small text-muted mb-0">
              Sign in with your approved Platform Admin, Provider Operator, or Organization Verifier account.
            </p>
          </div>

          {error && (
            <div className="alert alert-danger d-flex align-items-start gap-2 py-2 px-3 small rounded-3 mb-4" role="alert">
              <AlertCircle className="shrink-0 mt-1" size={16} />
              <div>{error}</div>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label className="form-label small fw-semibold text-secondary mb-1">
                Official Email Address
              </label>
              <div className="input-group">
                <span className="input-group-text bg-light border-end-0 text-muted">
                  <Mail size={16} />
                </span>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="operator@cbse.gov.in or verifier@du.ac.in"
                  className="form-control form-control-sm border-start-0 ps-1"
                  style={{ fontSize: '0.875rem', height: '42px' }}
                />
              </div>
            </div>

            <div className="mb-4">
              <label className="form-label small fw-semibold text-secondary mb-1">
                Password
              </label>
              <div className="input-group">
                <span className="input-group-text bg-light border-end-0 text-muted">
                  <Lock size={16} />
                </span>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your confidential password"
                  className="form-control form-control-sm border-start-0 ps-1"
                  style={{ fontSize: '0.875rem', height: '42px' }}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="ci-btn-primary w-100 py-2 d-flex align-items-center justify-content-center gap-2"
              style={{ height: '42px', fontSize: '0.875rem' }}
            >
              {loading ? (
                <div className="spinner-border spinner-border-sm text-light" role="status" />
              ) : (
                <>
                  <span>Authenticate & Enter</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          <div className="mt-4 pt-3 border-top text-center">
            <span className="small text-muted">New organization or data provider? </span>
            <a href="/request-access" className="small fw-semibold text-decoration-none" style={{ color: 'var(--ci-navy-600)' }}>
              Submit an Onboarding Application
            </a>
          </div>
        </div>

        <div className="text-center small text-muted d-flex align-items-center justify-content-center gap-1">
          <ShieldCheck size={14} className="text-success" />
          <span>Role-Based Multi-Sector Gateway · All Mutations Audited</span>
        </div>
      </div>
    </div>
  </div>
  );
}
