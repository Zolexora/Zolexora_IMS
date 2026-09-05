import React from 'react';
import { Routes, Route, useLocation, Navigate } from 'react-router-dom';
import Sidepanal from './inv-pages/Sidepanal';
import Dashboard from './inv-pages/Dashboard';
import Products from './inv-pages/Products';
import Requisitions from './inv-pages/Requisitions';
import Suppliers from './inv-pages/Suppliers';
import IssuanceLogs from './inv-pages/IssuanceLogs';
import Reports from './inv-pages/Reports';
import Users from './inv-pages/Users';
import SiteManagement from './inv-pages/SiteManagement';
import Profile from './inv-pages/Profile';
import SKUaddition from './inv-pages/forms/SKUaddition';
import PurchaseEntry from './inv-pages/forms/PurchaseEntry';
import IssuanceEntry from './inv-pages/forms/IssuanceEntry';
import POSTerminal from './pos-pages/POSTerminal';

export default function App() {
  const location = useLocation();
  const isPosRoute = location.pathname.startsWith('/pos');

  return (
    <div className="min-h-screen flex bg-[#0b0d14] text-slate-100 font-sans">
      {/* Sidebar Navigation: Shown on all inventory pages */}
      {!isPosRoute && <Sidepanal />}

      {/* Main Content Viewport */}
      <div className="flex-1 flex flex-col min-w-0">
        {!isPosRoute && (
          <header className="h-14 border-b border-white/10 bg-[#0f111c]/80 backdrop-blur-sm px-6 flex items-center justify-between sticky top-0 z-20 flex-shrink-0">
            <div className="text-xs text-slate-400 font-mono">
              Workspace Scope: <span className="text-white font-medium">Zolexora Retail Operations (D1 Synchronized)</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-400">Current Role:</span>
              <span className="text-xs px-2.5 py-1 bg-white/5 border border-white/10 rounded-lg font-medium text-white">
                Operations Lead
              </span>
            </div>
          </header>
        )}

        <main className="flex-1 overflow-hidden flex flex-col">
          <Routes>
            {/* Inventory Core Pages */}
            <Route path="/" element={<div className="p-6 overflow-y-auto flex-1"><Dashboard /></div>} />
            <Route path="/dashboard" element={<div className="p-6 overflow-y-auto flex-1"><Dashboard /></div>} />
            <Route path="/products" element={<div className="p-6 overflow-y-auto flex-1"><Products /></div>} />
            <Route path="/catalog" element={<Navigate to="/products" replace />} />
            <Route path="/items" element={<Navigate to="/products" replace />} />
            <Route path="/requisitions" element={<div className="p-6 overflow-y-auto flex-1"><Requisitions /></div>} />
            <Route path="/suppliers" element={<div className="p-6 overflow-y-auto flex-1"><Suppliers /></div>} />
            <Route path="/issuance-logs" element={<div className="p-6 overflow-y-auto flex-1"><IssuanceLogs /></div>} />
            <Route path="/reports" element={<div className="p-6 overflow-y-auto flex-1"><Reports /></div>} />
            <Route path="/users" element={<div className="p-6 overflow-y-auto flex-1"><Users /></div>} />
            <Route path="/site-management" element={<div className="p-6 overflow-y-auto flex-1"><SiteManagement /></div>} />
            <Route path="/stores" element={<Navigate to="/site-management" replace />} />
            <Route path="/profile" element={<div className="p-6 overflow-y-auto flex-1"><Profile /></div>} />

            {/* Inventory Action Forms */}
            <Route path="/forms/sku-addition" element={<div className="p-6 overflow-y-auto flex-1"><SKUaddition /></div>} />
            <Route path="/forms/purchase-entry" element={<div className="p-6 overflow-y-auto flex-1"><PurchaseEntry /></div>} />
            <Route path="/forms/issuance-entry" element={<div className="p-6 overflow-y-auto flex-1"><IssuanceEntry /></div>} />

            {/* POS Terminal */}
            <Route path="/pos" element={<POSTerminal />} />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}
