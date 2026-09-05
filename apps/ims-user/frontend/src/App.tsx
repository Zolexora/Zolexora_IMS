import React from 'react';
import { Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import {
  LayoutDashboard,
  ShoppingCart,
  Boxes,
  Building2,
  Truck,
  Database,
  ShieldCheck,
  Store,
} from 'lucide-react';
import POSTerminal from './pos-pages/POSTerminal';
import DashboardOverview from './inv-pages/DashboardOverview';
import InventoryCatalog from './inv-pages/InventoryCatalog';
import StoresView from './inv-pages/StoresView';
import SuppliersView from './inv-pages/SuppliersView';

export default function App() {
  const location = useLocation();
  const isPosPage = location.pathname.startsWith('/pos');

  const navItems = [
    { label: 'Overview', path: '/', icon: LayoutDashboard },
    { label: 'POS Terminal', path: '/pos', icon: ShoppingCart, badge: 'Live' },
    { label: 'Inventory Catalog', path: '/catalog', icon: Boxes },
    { label: 'Stores & Hubs', path: '/stores', icon: Building2 },
    { label: 'Suppliers & Vendors', path: '/suppliers', icon: Truck },
  ];

  return (
    <div className="min-h-screen flex bg-[#0b0d14] text-slate-100 font-sans">
      {/* Sidebar Navigation */}
      <aside className="w-64 border-r border-white/10 bg-[#0f111c] flex flex-col justify-between p-4 flex-shrink-0 select-none">
        <div className="space-y-6">
          <div className="flex items-center gap-3 px-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center font-bold text-white shadow-md">
              Z
            </div>
            <div>
              <div className="font-bold text-sm tracking-wide text-white">ZOLEXORA IMS</div>
              <div className="text-[11px] text-slate-400">Business Management</div>
            </div>
          </div>

          <div className="space-y-1">
            <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Applications
            </div>
            <nav className="space-y-1">
              {navItems.map((item) => {
                const active =
                  item.path === '/'
                    ? location.pathname === '/'
                    : location.pathname.startsWith(item.path);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition ${
                      active
                        ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 shadow-xs'
                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="w-4 h-4" />
                      <span>{item.label}</span>
                    </div>
                    {item.badge && (
                      <span className="text-[9px] px-1.5 py-0.2 rounded-full font-mono bg-emerald-500/20 text-emerald-300">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>

        <div className="border-t border-white/10 pt-4 px-2 space-y-2 text-xs text-slate-400">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Store className="w-3.5 h-3.5 text-slate-500" />
              <span>Location</span>
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
              Synchronized
            </span>
          </div>
        </div>
      </aside>

      {/* Main Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 border-b border-white/10 bg-[#0f111c]/80 backdrop-blur-sm px-6 flex items-center justify-between sticky top-0 z-20 flex-shrink-0">
          <div className="text-xs text-slate-400 font-mono">
            Workspace: <span className="text-white font-medium">Zolexora Retail Operations</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400">Current Role:</span>
            <span className="text-xs px-2.5 py-1 bg-white/5 border border-white/10 rounded-lg font-medium text-white">
              Operations Lead
            </span>
          </div>
        </header>

        <main className="flex-1 overflow-hidden flex flex-col">
          <Routes>
            <Route path="/" element={<div className="p-6 overflow-y-auto flex-1"><DashboardOverview /></div>} />
            <Route path="/pos" element={<POSTerminal />} />
            <Route path="/catalog" element={<div className="p-6 overflow-y-auto flex-1"><InventoryCatalog /></div>} />
            <Route path="/items" element={<Navigate to="/catalog" replace />} />
            <Route path="/stores" element={<div className="p-6 overflow-y-auto flex-1"><StoresView /></div>} />
            <Route path="/suppliers" element={<div className="p-6 overflow-y-auto flex-1"><SuppliersView /></div>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}
