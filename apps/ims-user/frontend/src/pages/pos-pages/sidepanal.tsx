import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  ShoppingCart,
  Boxes,
  ArrowUpRight,
  Store,
  Clock,
  Database,
  Receipt,
  UtensilsCrossed,
  BookOpen,
  Users,
  Wallet,
  BarChart3,
  Settings,
  CreditCard,
  Bike,
  ShieldCheck,
} from 'lucide-react';

interface PosSidepanalProps {
  sellingPoint?: string;
}

export default function PosSidepanal({
  sellingPoint = 'SP_001',
}: PosSidepanalProps) {
  const location = useLocation();

  const navLinks = [
    { label: 'Register Terminal', path: '/pos/dashboard', icon: ShoppingCart },
    { label: 'Online Aggregators', path: '/pos/online-orders', icon: Bike },
    { label: 'Orders & KOT Tickets', path: '/pos/orders', icon: Receipt },
    { label: 'Floor & Table Map', path: '/pos/tables', icon: UtensilsCrossed },
    { label: 'Menu & Quick Keys', path: '/pos/menu', icon: BookOpen },
    { label: 'Customer CRM & Club', path: '/pos/customers', icon: Users },
    { label: 'Cash Drawer & Float', path: '/pos/cash-drawer', icon: Wallet },
    { label: 'POS Sales & Z-Report', path: '/pos/reports', icon: BarChart3 },
    { label: 'Hardware & Printers', path: '/pos/settings', icon: Settings },
  ];

  return (
    <aside className="w-64 border-r border-white/10 bg-[#0f111c] flex flex-col justify-between p-4 flex-shrink-0 select-none">
      <div className="space-y-4">
        {/* Brand */}
        <div className="flex items-center gap-3 px-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-600 flex items-center justify-center font-black text-white shadow-md text-sm">
            P
          </div>
          <div>
            <div className="font-bold text-sm tracking-wide text-white">ZOLEXORA POS</div>
            <div className="text-[10px] text-emerald-400 font-medium">Front Register Terminal</div>
          </div>
        </div>

        {/* Workspace Switchers */}
        <div className="space-y-2">
          {/* Inventory Terminal Switcher */}
          <div className="p-2.5 bg-gradient-to-r from-indigo-950/50 to-purple-950/50 border border-indigo-500/30 rounded-xl space-y-1.5 shadow-md">
            <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-indigo-300">
              <span className="flex items-center gap-1.5">
                <Boxes className="w-3.5 h-3.5 text-indigo-400" />
                Warehouse Portal
              </span>
              <span className="text-[9px] px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-200 font-mono">
                HUB
              </span>
            </div>
            <Link
              to="/inv/dashboard"
              onClick={() => localStorage.setItem('zolexora_last_app', 'inv')}
              className="flex items-center justify-between px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition shadow-md shadow-indigo-600/30 group"
            >
              <div className="flex items-center gap-2">
                <Boxes className="w-4 h-4 text-white" />
                <span>Inventory Terminal</span>
              </div>
              <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition" />
            </Link>
          </div>

          {/* Command Panel Switcher Button (Direct access to Command Panel) */}
          <div className="p-2.5 bg-gradient-to-r from-purple-950/60 to-indigo-950/60 border border-purple-500/40 rounded-xl space-y-1.5 shadow-md">
            <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-purple-300">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
                Corporate Governance
              </span>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-gradient-to-r from-purple-500/30 to-indigo-500/30 text-purple-200 border border-purple-500/40 font-mono font-bold">
                COMMANDER
              </span>
            </div>
            <Link
              to="/cmd-panal/dashboard"
              onClick={() => localStorage.setItem('zolexora_last_app', 'cmd-panal')}
              className="flex items-center justify-between px-3 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-lg text-xs font-bold transition shadow-md shadow-purple-900/30 group"
            >
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-white" />
                <span>Command Panel</span>
              </div>
              <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition" />
            </Link>
          </div>
        </div>

        {/* Main POS Navigation Links (ALL strictly pointing to /pos/*) */}
        <div className="space-y-1">
          <div className="px-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
            POS Navigation
          </div>
          <nav className="space-y-0.5">
            {navLinks.map((item) => {
              const active =
                location.pathname === item.path ||
                (item.path === '/pos/dashboard' &&
                  (location.pathname === '/pos' || location.pathname === '/pos/dashboard'));
              const Icon = item.icon;

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => localStorage.setItem('zolexora_last_app', 'pos')}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition ${
                    active
                      ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 shadow-xs font-semibold'
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

        {/* Counter Scope & Hardware Status */}
        <div className="p-3 bg-white/5 border border-white/5 rounded-xl space-y-2 text-xs">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Terminal Hardware
          </div>
          <div className="space-y-1.5 text-[11px]">
            <div className="flex items-center justify-between text-slate-300">
              <span className="flex items-center gap-1 text-slate-400">
                <Store className="w-3 h-3 text-emerald-400" />
                Active Desk
              </span>
              <span className="font-mono text-white">{sellingPoint}</span>
            </div>
            <div className="flex items-center justify-between text-slate-300">
              <span className="flex items-center gap-1 text-slate-400">
                <CreditCard className="w-3 h-3 text-indigo-400" />
                Payments
              </span>
              <span className="text-emerald-400 font-medium">Cash / Card / UPI</span>
            </div>
            <div className="flex items-center justify-between text-slate-300">
              <span className="flex items-center gap-1 text-slate-400">
                <Database className="w-3 h-3 text-cyan-400" />
                Edge Sync
              </span>
              <span className="inline-flex items-center gap-1 text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                D1 Connected
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Info */}
      <div className="border-t border-white/10 pt-4 px-2 space-y-2 text-xs text-slate-400">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <Store className="w-3.5 h-3.5 text-slate-500" />
            <span>Store Outlet</span>
          </span>
          <span className="text-white font-mono text-[11px]">S_001 (Retail)</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            <span>Terminal ID</span>
          </span>
          <span className="text-slate-300 font-mono text-[10px]">TERM-SP001-D1</span>
        </div>
      </div>
    </aside>
  );
}
