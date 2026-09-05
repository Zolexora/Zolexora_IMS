import React from 'react';
import { Routes, Route, useLocation, Navigate, useNavigate } from 'react-router-dom';
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

// Supabase Auth
import { useAuth } from './lib/auth-context';
import { LogOut, UserCircle2, Loader2 } from 'lucide-react';

/**
 * Route guard enforcing authentic Supabase session.
 * Unauthenticated requests are intercepted and redirected to /login.
 */
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#07080e] flex flex-col items-center justify-center text-slate-400">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mb-3" />
        <p className="text-xs font-mono tracking-wider">Verifying Supabase Session...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}

export default function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  // Determine if current route renders full-viewport without the inventory side panel
  const isStandaloneRoute =
    ['/landing', '/login', '/onboarding'].includes(location.pathname) ||
    location.pathname.startsWith('/pos');

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex bg-[#07080e] text-slate-100 font-sans">
      {/* Sidebar Navigation: Shown on protected inventory module pages */}
      {!isStandaloneRoute && user && <Sidepanal />}

      {/* Main Viewport */}
      <div className="flex-1 flex flex-col min-w-0">
        {!isStandaloneRoute && user && (
          <header className="h-14 border-b border-white/10 bg-[#0c0e18]/80 backdrop-blur-sm px-6 flex items-center justify-between sticky top-0 z-20 flex-shrink-0">
            <div className="text-xs text-slate-400 font-mono">
              Workspace Scope: <span className="text-white font-medium">Zolexora Retail Operations (D1 Synchronized)</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-xs">
                <UserCircle2 className="w-4 h-4 text-indigo-400" />
                <span className="text-slate-300 font-medium">{user.email}</span>
                <span className="text-[10px] px-2 py-0.5 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-md font-semibold">
                  {user.user_metadata?.name || 'Staff'}
                </span>
              </div>
              <button
                onClick={handleSignOut}
                className="flex items-center gap-1.5 text-xs text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 px-2.5 py-1 rounded-lg transition"
                title="Sign Out"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          </header>
        )}

        <main className="flex-1 overflow-hidden flex flex-col">
          <Routes>
            {/* Public Unprotected Pages */}
            <Route path="/landing" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/onboarding" element={<OnboardingPage />} />

            {/* Root: Enforces Auth -> Redirects unauthenticated to /login, authenticated to /dashboard */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Navigate to="/dashboard" replace />
                </ProtectedRoute>
              }
            />

            {/* Protected Point of Sale (POS) Module */}
            <Route
              path="/pos"
              element={
                <ProtectedRoute>
                  <POSTerminal />
                </ProtectedRoute>
              }
            />

            {/* Protected Inventory Core Pages */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <div className="p-6 overflow-y-auto flex-1"><Dashboard /></div>
                </ProtectedRoute>
              }
            />
            <Route
              path="/products"
              element={
                <ProtectedRoute>
                  <div className="p-6 overflow-y-auto flex-1"><Products /></div>
                </ProtectedRoute>
              }
            />
            <Route path="/catalog" element={<Navigate to="/products" replace />} />
            <Route path="/items" element={<Navigate to="/products" replace />} />
            <Route
              path="/requisitions"
              element={
                <ProtectedRoute>
                  <div className="p-6 overflow-y-auto flex-1"><Requisitions /></div>
                </ProtectedRoute>
              }
            />
            <Route
              path="/suppliers"
              element={
                <ProtectedRoute>
                  <div className="p-6 overflow-y-auto flex-1"><Suppliers /></div>
                </ProtectedRoute>
              }
            />
            <Route
              path="/issuance-logs"
              element={
                <ProtectedRoute>
                  <div className="p-6 overflow-y-auto flex-1"><IssuanceLogs /></div>
                </ProtectedRoute>
              }
            />
            <Route
              path="/reports"
              element={
                <ProtectedRoute>
                  <div className="p-6 overflow-y-auto flex-1"><Reports /></div>
                </ProtectedRoute>
              }
            />
            <Route
              path="/users"
              element={
                <ProtectedRoute>
                  <div className="p-6 overflow-y-auto flex-1"><Users /></div>
                </ProtectedRoute>
              }
            />
            <Route
              path="/site-management"
              element={
                <ProtectedRoute>
                  <div className="p-6 overflow-y-auto flex-1"><SiteManagement /></div>
                </ProtectedRoute>
              }
            />
            <Route path="/stores" element={<Navigate to="/site-management" replace />} />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <div className="p-6 overflow-y-auto flex-1"><Profile /></div>
                </ProtectedRoute>
              }
            />

            {/* Protected Inventory Action Forms */}
            <Route
              path="/forms/sku-addition"
              element={
                <ProtectedRoute>
                  <div className="p-6 overflow-y-auto flex-1"><SKUaddition /></div>
                </ProtectedRoute>
              }
            />
            <Route
              path="/forms/purchase-entry"
              element={
                <ProtectedRoute>
                  <div className="p-6 overflow-y-auto flex-1"><PurchaseEntry /></div>
                </ProtectedRoute>
              }
            />
            <Route
              path="/forms/issuance-entry"
              element={
                <ProtectedRoute>
                  <div className="p-6 overflow-y-auto flex-1"><IssuanceEntry /></div>
                </ProtectedRoute>
              }
            />

            {/* 404 Route */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}
