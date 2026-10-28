import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../app/AuthContext';
import {
  LayoutDashboard,
  Layers,
  FileCheck2,
  Activity,
  Database,
  Building2,
  FileSpreadsheet,
  History,
  HeartPulse,
  Settings,
  Inbox,
  Info,
  X,
} from 'lucide-react';

export function Sidebar({ isOpen = false, onClose = () => {} }) {
  const { role } = useAuth();
  const location = useLocation();

  // Normalize role
  const normRole = (role || '').toLowerCase();
  const isAdmin = normRole === 'admin' || normRole === 'platform_admin';
  const isOperator = normRole === 'operator' || normRole === 'provider_operator';

  // Role-Specific Navigation Structures (Strictly Enforced)
  let navItems = [];

  if (isAdmin) {
    navItems = [
      { to: '/app/overview', label: 'System Overview', icon: LayoutDashboard },
      { to: '/app/admin?tab=organizations', label: 'Organization Management', icon: Building2 },
      { to: '/app/admin?tab=requests', label: 'Access Requests', icon: Inbox },
      { to: '/app/admin?tab=providers', label: 'Provider Adapters & Health', icon: HeartPulse },
      { to: '/app/admin?tab=grants', label: 'Service & Access Grants', icon: Layers },
      { to: '/app/monitoring', label: 'Transaction Monitoring', icon: Activity },
      { to: '/app/admin?tab=audit', label: 'Audit Logs', icon: History },
      { to: '/app/admin?tab=users', label: 'Platform Settings & Users', icon: Settings },
      { to: '/app/profile', label: 'Admin Profile', icon: Building2 },
    ];
  } else if (isOperator) {
    navItems = [
      { to: '/app/overview', label: 'Provider Overview', icon: LayoutDashboard },
      { to: '/app/provider/registry', label: 'Registry / Data Management', icon: Database },
      { to: '/app/provider/registry?import=true', label: 'Bulk Import Records', icon: FileSpreadsheet },
      { to: '/app/services', label: 'Provider Services', icon: Layers },
      { to: '/app/monitoring', label: 'Provider Transactions', icon: Activity },
      { to: '/app/profile', label: 'Provider Profile', icon: Building2 },
    ];
  } else {
    // Default: Organization Verifier (Access & Consent removed)
    navItems = [
      { to: '/app/overview', label: 'Organization Overview', icon: LayoutDashboard },
      { to: '/app/services', label: 'Service Directory', icon: Layers },
      { to: '/app/verification', label: 'Verification Portal', icon: FileCheck2 },
      { to: '/app/monitoring', label: 'Verification History', icon: Activity },
      { to: '/app/profile', label: 'Organization Profile', icon: Building2 },
    ];
  }

  const roleLabels = {
    admin: 'Platform Admin',
    platform_admin: 'Platform Admin',
    operator: 'Provider Operator',
    provider_operator: 'Provider Operator',
    verifier: 'Organization Verifier',
    organization_verifier: 'Organization Verifier',
  };

  // Precise Active-Link Detection taking both pathname and query params into account
  const isItemActive = (targetTo) => {
    const [targetPath, targetSearch] = targetTo.split('?');

    if (location.pathname !== targetPath) {
      return false;
    }

    const currentParams = new URLSearchParams(location.search);

    // If target has query parameters
    if (targetSearch) {
      const targetParams = new URLSearchParams(targetSearch);

      // Special handling for /app/admin tabs
      if (targetPath === '/app/admin') {
        const targetTab = targetParams.get('tab');
        const currentTab = currentParams.get('tab') || 'organizations';

        if (targetTab === 'organizations') {
          return currentTab === 'organizations';
        }
        if (targetTab === 'providers' || targetTab === 'configs') {
          return currentTab === 'providers' || currentTab === 'configs';
        }
        if (targetTab === 'audit' || targetTab === 'audits') {
          return currentTab === 'audit' || currentTab === 'audits';
        }
        if (targetTab === 'users' || targetTab === 'settings') {
          return currentTab === 'users' || currentTab === 'settings';
        }
        return currentTab === targetTab;
      }

      // Special handling for /app/provider/registry import query
      if (targetPath === '/app/provider/registry') {
        return currentParams.get('import') === targetParams.get('import');
      }

      // Generic parameter match
      for (const [key, val] of targetParams.entries()) {
        if (currentParams.get(key) !== val) {
          return false;
        }
      }
      return true;
    }

    // Target has NO query parameters
    if (targetPath === '/app/admin') {
      const currentTab = currentParams.get('tab') || 'organizations';
      return currentTab === 'organizations';
    }

    if (targetPath === '/app/provider/registry') {
      return currentParams.get('import') !== 'true';
    }

    return true;
  };

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpen && (
        <div
          onClick={onClose}
          className="md:hidden"
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.4)',
            zIndex: 40,
            backdropFilter: 'blur(2px)',
          }}
        />
      )}

      {/* Sidebar Content */}
      <aside
        className={`ci-sidebar ${isOpen ? 'mobile-open' : ''}`}
        style={{
          minHeight: 'calc(100vh - 72px)',
        }}
      >
        <div>
          {/* Mobile Close Bar */}
          <div className="flex md:hidden items-center justify-between px-2 mb-3 pb-2 border-b border-slate-100">
            <span className="text-xs font-bold text-slate-800">Navigation Menu</span>
            <button
              onClick={onClose}
              className="p-1 rounded-md text-slate-500 hover:text-slate-900 hover:bg-slate-100"
            >
              <X size={18} />
            </button>
          </div>

          <div
            className="text-uppercase text-muted px-2.5 mb-2 font-bold"
            style={{ fontSize: '0.6875rem', letterSpacing: '0.06em', color: '#64748b' }}
          >
            {roleLabels[normRole] || 'Gateway Navigation'}
          </div>

          <nav className="flex flex-col gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isItemActive(item.to);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => {
                    if (window.innerWidth < 768) {
                      onClose();
                    }
                  }}
                  className={`ci-nav-link ${active ? 'active' : ''}`}
                >
                  <Icon size={16} className="ci-nav-icon shrink-0" />
                  <span className="truncate">{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        <div>
          {/* Prototype Info Notice */}
          <div className="p-3 rounded-lg border border-slate-200 bg-slate-50 mb-2">
            <div className="flex items-center gap-1.5 font-semibold text-slate-700 mb-1" style={{ fontSize: '0.75rem' }}>
              <Info size={14} className="text-blue-600 shrink-0" />
              <span>Evaluation Prototype</span>
            </div>
            <p className="text-slate-500 m-0" style={{ fontSize: '0.6875rem', lineHeight: 1.4 }}>
              Operating with standardized mock adapters and database-driven fictional records.
            </p>
          </div>

          <div className="text-center text-slate-400 border-t border-slate-100 pt-2" style={{ fontSize: '0.6875rem' }}>
            ConnectIndia Gateway v3.0
          </div>
        </div>
      </aside>
    </>
  );
}
