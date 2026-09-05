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
    { label: 'Dashboard', path: '/inv/dashboard', icon: LayoutDashboard },
    { label: 'Products Master', path: '/inv/products', icon: Boxes },
    { label: 'Requisitions', path: '/inv/requisitions', icon: ClipboardList },
    { label: 'Suppliers & Vendors', path: '/inv/suppliers', icon: Truck },
    { label: 'Issuance Logs', path: '/inv/issuance-logs', icon: FileSpreadsheet },
    { label: 'Reports & Analytics', path: '/inv/reports', icon: BarChart3 },
    { label: 'Users & Permissions', path: '/inv/users', icon: UsersIcon },
    { label: 'Site Management', path: '/inv/site-management', icon: Building2 },
    { label: 'Profile Settings', path: '/inv/profile', icon: UserCircle },
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

        {/* POS Terminal Switcher Button (Requested: pos terminal btn on inv) */}
        <div className="p-3 bg-gradient-to-r from-emerald-950/50 to-teal-950/50 border border-emerald-500/30 rounded-xl space-y-2 shadow-lg">
          <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-emerald-300">
            <span className="flex items-center gap-1.5">
              <Store className="w-3.5 h-3.5 text-emerald-400" />
              Retail Checkout
            </span>
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-200 font-mono">
              ACTIVE
            </span>
          </div>
          <Link
            to="/pos/dashboard"
            onClick={() => localStorage.setItem('zolexora_last_app', 'pos')}
            className="flex items-center justify-between px-3 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition shadow-md shadow-emerald-600/30 group"
          >
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-4 h-4 text-white" />
              <span>POS Terminal</span>
            </div>
            <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition" />
          </Link>
        </div>

        {/* Quick Action Forms */}
        <div className="p-3 bg-white/5 border border-white/5 rounded-xl space-y-2">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Quick Actions
          </div>
          <div className="grid grid-cols-1 gap-1.5">
            <Link
              to="/inv/forms/sku-addition"
              className="flex items-center gap-2 px-2.5 py-1.5 bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white rounded-lg text-xs font-semibold transition"
            >
              <PackagePlus className="w-3.5 h-3.5" />
              <span>+ New SKU</span>
            </Link>
            <Link
              to="/inv/forms/purchase-entry"
              className="flex items-center gap-2 px-2.5 py-1.5 bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white rounded-lg text-xs font-semibold transition"
            >
              <Truck className="w-3.5 h-3.5" />
              <span>+ Purchase GRN</span>
            </Link>
            <Link
              to="/inv/forms/issuance-entry"
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
                (item.path === '/inv/dashboard' &&
                  (location.pathname === '/' ||
                    location.pathname === '/inv' ||
                    location.pathname === '/dashboard'));
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
