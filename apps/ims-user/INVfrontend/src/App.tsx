import React from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Boxes, Building2, Truck, Database, ShieldCheck } from 'lucide-react';
import DashboardOverview from './pages/DashboardOverview';
import InventoryCatalog from './pages/InventoryCatalog';
import StoresView from './pages/StoresView';
import SuppliersView from './pages/SuppliersView';

export default function App() {
  const location = useLocation();

  const navItems = [
    { label: 'Overview', path: '/', icon: LayoutDashboard },
    { label: 'Inventory Catalog', path: '/catalog', icon: Boxes },
    { label: 'Stores & Hubs', path: '/stores', icon: Building2 },
    { label: 'Suppliers & Vendors', path: '/suppliers', icon: Truck },
  ];

  return (
    <div className="min-h-screen flex bg-[#0b0d14] text-slate-100 font-sans">
      {/* Sidebar */}
      <aside className="w-64 border-r border-white/10 bg-[#0f111c] flex flex-col justify-between p-4 flex-shrink-0">
        <div className="space-y-6">
          <div className="flex items-center gap-3 px-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-white shadow-md">
              INV
            </div>
            <div>
              <div className="font-bold text-sm tracking-wide text-white">ZOLEXORA INV</div>
              <div className="text-[11px] text-slate-400">Inventory Management</div>
            </div>
          </div>

          <nav className="space-y-1">
            {navItems.map((item) => {
              const active = location.pathname === item.path;
              const Icon = item.icon;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition ${
                    active
                      ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 shadow-xs'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="border-t border-white/10 pt-4 px-2 space-y-2 text-xs text-slate-400">
          <div className="flex items-center justify-between">
            <span>Branch</span>
            <span className="text-white font-mono text-[11px]">S_001 (Main)</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-indigo-400" />
              <span>D1 Sync</span>
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              Live
            </span>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 border-b border-white/10 bg-[#0f111c]/80 backdrop-blur-sm px-6 flex items-center justify-between sticky top-0 z-10">
          <div className="text-xs text-slate-400 font-mono">
            Location Scope: <span className="text-white font-medium">S_001 (Store 1 - Central Warehouse)</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400">Role:</span>
            <span className="text-xs px-2.5 py-1 bg-white/5 border border-white/10 rounded-lg font-medium text-white">
              Inventory Manager
            </span>
          </div>
        </header>

        <main className="flex-1 p-6 overflow-y-auto max-w-7xl w-full mx-auto">
          <Routes>
            <Route path="/" element={<DashboardOverview />} />
            <Route path="/catalog" element={<InventoryCatalog />} />
            <Route path="/stores" element={<StoresView />} />
            <Route path="/suppliers" element={<SuppliersView />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}
