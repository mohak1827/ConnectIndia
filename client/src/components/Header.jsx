import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../app/AuthContext';
import { LogOut, Building2, Menu } from 'lucide-react';

export function Header({ onToggleSidebar = () => {} }) {
  const { user, role, logout } = useAuth();

  const roleConfigs = {
    admin: { label: 'Platform Administrator', badge: 'bg-slate-100 text-slate-700 border-slate-200' },
    platform_admin: { label: 'Platform Administrator', badge: 'bg-slate-100 text-slate-700 border-slate-200' },
    verifier: { label: 'Organization Verifier', badge: 'bg-sky-50 text-sky-700 border-sky-200' },
    organization_verifier: { label: 'Organization Verifier', badge: 'bg-sky-50 text-sky-700 border-sky-200' },
    operator: { label: 'Provider Operator', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    provider_operator: { label: 'Provider Operator', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  };

  const normKey = (role || '').toLowerCase();
  const roleInfo = roleConfigs[normKey] || { label: role, badge: 'bg-slate-100 text-slate-700 border-slate-200' };

  return (
    <header className="h-20 bg-white border-b border-slate-200/80 flex items-center justify-between px-6 sticky top-0 z-30 shadow-2xs">
      {/* Left: Branding */}
      <div className="flex items-center gap-3">
        {/* Mobile menu button */}
        <button
          type="button"
          onClick={onToggleSidebar}
          className="md:hidden p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200"
          title="Open menu"
        >
          <Menu size={20} />
        </button>

        <div className="flex items-center gap-3.5">
          <img
            src="/logo.png"
            alt="ConnectIndia Logo"
            className="h-12 sm:h-14 w-auto object-contain cursor-pointer hover:opacity-95 transition-opacity py-0.5"
            style={{ maxHeight: '52px', width: 'auto', objectFit: 'contain' }}
            onClick={() => { window.location.href = '/app/overview'; }}
          />
          <div className="hidden lg:block border-l border-slate-200 pl-3.5">
            <span className="text-sm font-bold text-slate-900 tracking-tight block leading-tight">Interoperability Gateway</span>
            <span className="text-xs text-slate-400 block mt-0.5">Federated Multi-Sector Platform</span>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-2 border-l border-slate-200 pl-3.5">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Gateway Online · Mock Mode
          </span>
        </div>
      </div>

      {/* Right: User Profile & Actions */}
      <div className="flex items-center gap-4">
        {/* Organization / Role Chip */}
        <Link
          to="/app/profile"
          className="hidden sm:flex flex-col items-end text-right text-decoration-none group cursor-pointer hover:opacity-90 transition-opacity"
          title="View and edit profile"
        >
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-800 group-hover:text-blue-900 transition-colors">
              {user?.displayName || 'User'}
            </span>
            <span className={`text-[10px] px-2 py-0.5 rounded-md font-medium border ${roleInfo.badge}`}>
              {roleInfo.label}
            </span>
          </div>
          <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
            {user?.organization ? (
              <>
                <Building2 className="w-3 h-3 text-slate-400" />
                <span>{user.organization.name}</span>
              </>
            ) : (
              <span>{user?.email}</span>
            )}
          </div>
        </Link>

        {/* Logout Button */}
        <button
          onClick={logout}
          title="Sign out of ConnectIndia session"
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Sign Out</span>
        </button>
      </div>
    </header>
  );
}
