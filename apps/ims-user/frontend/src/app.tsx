import React from 'react';
import { Routes, Route, useLocation, Navigate } from 'react-router-dom';
import Sidepanal from './inv-pages/sidepanal';
import Dashboard from './inv-pages/dashboard';
import Products from './inv-pages/products';
import Requisitions from './inv-pages/requisitions';
import Suppliers from './inv-pages/suppliers';
import IssuanceLogs from './inv-pages/issuance-logs';
import Reports from './inv-pages/reports';
import Users from './inv-pages/users';
import SiteManagement from './inv-pages/site-management';
import Profile from './inv-pages/profile';
import SKUaddition from './inv-pages/forms/sku-addition';
import PurchaseEntry from './inv-pages/forms/purchase-entry';
import IssuanceEntry from './inv-pages/forms/issuance-entry';
import POSTerminal from './pos-pages/pos-terminal';

// Shared Pages
import LandingPage from './shared-pages/landing-page';
import LoginPage from './shared-pages/login-page';
import OnboardingPage from './shared-pages/onboarding-page';
import NotFoundPage from './shared-pages/not-found-page';

export default function App() {
  const location = useLocation();

  // Determine if current route should render full-viewport without inventory side panel
  const isStandaloneRoute =
    ['/landing', '/login', '/onboarding'].includes(location.pathname) ||
    location.pathname.startsWith('/pos');

  return (
    <div className="min-h-screen flex bg-[#07080e] text-slate-100 font-sans">
      {/* Sidebar Navigation: Shown on all inventory module pages */}
      {!isStandaloneRoute && <Sidepanal />}

      {/* Main Viewport */}
      <div className="flex-1 flex flex-col min-w-0">
        {!isStandaloneRoute && (
          <header className="h-14 border-b border-white/10 bg-[#0c0e18]/80 backdrop-blur-sm px-6 flex items-center justify-between sticky top-0 z-20 flex-shrink-0">
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
            {/* Shared Standalone Pages */}
            <Route path="/landing" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/onboarding" element={<OnboardingPage />} />

            {/* Point of Sale (POS) Module */}
            <Route path="/pos" element={<POSTerminal />} />

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

            {/* 404 Route */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}
