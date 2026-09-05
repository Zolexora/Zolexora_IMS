import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Boxes,
  ClipboardList,
  Truck,
  FileSpreadsheet,
  BarChart3,
  Users as UsersIcon,
  Building2,
  UserCircle,
  PackagePlus,
  ArrowUpRight,
  Database,
  Store,
  ShoppingCart,
} from 'lucide-react';

export default function Sidepanal() {
  const location = useLocation();

  const navLinks = [
    { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { label: 'Products Master', path: '/products', icon: Boxes },
    { label: 'Requisitions', path: '/requisitions', icon: ClipboardList },
    { label: 'Suppliers & Vendors', path: '/suppliers', icon: Truck },
    { label: 'Issuance Logs', path: '/issuance-logs', icon: FileSpreadsheet },
    { label: 'Reports & Analytics', path: '/reports', icon: BarChart3 },
    { label: 'Users & Permissions', path: '/users', icon: UsersIcon },
    { label: 'Site Management', path: '/site-management', icon: Building2 },
    { label: 'Profile Settings', path: '/profile', icon: UserCircle },
  ];

  return (
    <aside className="w-64 border-r border-white/10 bg-[#0f111c] flex flex-col justify-between p-4 flex-shrink-0 select-none">
      <div className="space-y-5">
        {/* Brand */}
        <div className="flex items-center gap-3 px-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center font-black text-white shadow-md text-sm">
            Z
          </div>
          <div>
            <div className="font-bold text-sm tracking-wide text-white">ZOLEXORA IMS</div>
            <div className="text-[10px] text-slate-400">Inventory & Logistics</div>
          </div>
        </div>

        {/* Quick Action Forms */}
        <div className="p-3 bg-white/5 border border-white/5 rounded-xl space-y-2">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Quick Actions
          </div>
          <div className="grid grid-cols-1 gap-1.5">
            <Link
              to="/forms/sku-addition"
              className="flex items-center gap-2 px-2.5 py-1.5 bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white rounded-lg text-xs font-semibold transition"
            >
              <PackagePlus className="w-3.5 h-3.5" />
              <span>+ New SKU</span>
            </Link>
            <Link
              to="/forms/purchase-entry"
              className="flex items-center gap-2 px-2.5 py-1.5 bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white rounded-lg text-xs font-semibold transition"
            >
              <Truck className="w-3.5 h-3.5" />
              <span>+ Purchase GRN</span>
            </Link>
            <Link
              to="/forms/issuance-entry"
              className="flex items-center gap-2 px-2.5 py-1.5 bg-purple-600/20 hover:bg-purple-600 text-purple-300 hover:text-white rounded-lg text-xs font-semibold transition"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>+ Issue Material</span>
            </Link>
          </div>
        </div>

        {/* Main Navigation Links */}
        <div className="space-y-1">
          <div className="px-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Inventory Navigation
          </div>
          <nav className="space-y-0.5">
            {navLinks.map((item) => {
              const active =
                location.pathname === item.path ||
                (item.path === '/dashboard' && location.pathname === '/');
              const Icon = item.icon;

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition ${
                    active
                      ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 shadow-xs font-semibold'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Cross-Link to POS Terminal */}
        <div className="pt-1">
          <Link
            to="/pos"
            className="flex items-center justify-between p-2.5 bg-gradient-to-r from-indigo-950/40 to-violet-950/40 border border-indigo-500/30 hover:border-indigo-500/60 rounded-xl text-xs text-indigo-300 hover:text-white transition group"
          >
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-3.5 h-3.5 text-indigo-400" />
              <span className="font-semibold">POS Register Terminal</span>
            </div>
            <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-white" />
          </Link>
        </div>
      </div>

      {/* Footer Info */}
      <div className="border-t border-white/10 pt-4 px-2 space-y-2 text-xs text-slate-400">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <Store className="w-3.5 h-3.5 text-slate-500" />
            <span>Store Scope</span>
          </span>
          <span className="text-white font-mono text-[11px]">S_001 (Main)</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <Database className="w-3.5 h-3.5 text-indigo-400" />
            <span>Cloudflare D1</span>
          </span>
          <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            Sync Active
          </span>
        </div>
      </div>
    </aside>
  );
}
