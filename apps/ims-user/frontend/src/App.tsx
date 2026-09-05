import React from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Package, ShoppingCart, Settings as SettingsIcon, LogOut } from 'lucide-react';
import Home from './pages/Home';
import Items from './pages/Items';

export default function App() {
  const location = useLocation();

  const navItems = [
    { label: 'Overview', path: '/', icon: LayoutDashboard },
    { label: 'Items & Stock', path: '/items', icon: Package },
  ];

  return (
    <div className="min-h-screen flex bg-[#0b0d14] text-slate-100">
      {/* Sidebar */}
      <aside className="w-64 border-r border-white/10 bg-[#0f111c] flex flex-col justify-between p-4 flex-shrink-0">
        <div className="space-y-6">
          <div className="flex items-center gap-3 px-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-white shadow-md">
              Z
            </div>
            <div>
              <div className="font-bold text-sm tracking-wide text-white">ZOLEXORA IMS</div>
              <div className="text-[11px] text-slate-400">Tenant Workspace</div>
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
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
                    active
                      ? 'bg-indigo-600/15 text-indigo-400 border border-indigo-500/30'
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
            <span className="text-white font-mono">Store 1</span>
          </div>
          <div className="flex items-center justify-between">
            <span>D1 Database</span>
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b border-white/10 bg-[#0f111c]/60 backdrop-blur-sm px-6 flex items-center justify-between sticky top-0 z-10">
          <div className="text-xs text-slate-400 font-mono">
            Location: <span className="text-white font-medium">S_001 (Store 1 - Main Branch)</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400">Logged in as</span>
            <span className="text-xs px-2 py-1 bg-white/5 border border-white/10 rounded-md font-medium text-white">
              Store Incharge
            </span>
          </div>
        </header>

        <main className="flex-1 p-6 overflow-y-auto max-w-7xl w-full mx-auto">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/items" element={<Items />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}
