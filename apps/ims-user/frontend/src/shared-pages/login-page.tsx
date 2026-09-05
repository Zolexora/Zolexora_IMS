import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Lock,
  Mail,
  ArrowRight,
  ShieldCheck,
  Building2,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  Store,
  ShoppingCart,
  Boxes,
} from 'lucide-react';

export default function LoginPage() {
  const navigate = useNavigate();

  const [email, setEmail] = useState('admin@zolexora.com');
  const [password, setPassword] = useState('••••••••••••');
  const [targetApp, setTargetApp] = useState<'POS' | 'INV'>('INV');
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const demoAccounts = [
    { label: 'Store Incharge', email: 'admin@zolexora.com', role: 'Full Access', defaultApp: 'INV' as const },
    { label: 'POS Cashier', email: 'cashier@zolexora.com', role: 'Point of Sale', defaultApp: 'POS' as const },
    { label: 'Inventory Manager', email: 'inventory@zolexora.com', role: 'Stock & SKUs', defaultApp: 'INV' as const },
  ];

  const handleDemoSelect = (acc: typeof demoAccounts[0]) => {
    setEmail(acc.email);
    setPassword('demo-session-token');
    setTargetApp(acc.defaultApp);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Please provide a valid email address.');
      return;
    }

    setLoading(true);
    setError(null);

    // Simulate edge session verification
    setTimeout(() => {
      setLoading(false);
      if (targetApp === 'POS') {
        navigate('/pos');
      } else {
        navigate('/dashboard');
      }
    }, 700);
  };

  return (
    <div className="min-h-screen bg-[#07080e] flex flex-col justify-center py-12 sm:px-6 lg:px-8 text-slate-100 font-sans selection:bg-indigo-500 selection:text-white">
      {/* Brand Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center space-y-3">
        <Link to="/landing" className="inline-flex items-center gap-3 group">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center font-black text-white text-xl shadow-xl shadow-indigo-600/30 group-hover:scale-105 transition">
            Z
          </div>
          <div className="text-left">
            <span className="font-extrabold text-base tracking-wider text-white block">ZOLEXORA IMS</span>
            <span className="text-[11px] text-slate-400 block font-mono">Retail & Warehouse Engine</span>
          </div>
        </Link>
        <h2 className="text-2xl font-extrabold text-white tracking-tight">Staff Authentication</h2>
        <p className="text-xs text-slate-400">
          Sign in to access your assigned store registers and inventory catalog
        </p>
      </div>

      {/* Main Login Card */}
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-[#0f111c] border border-white/10 py-8 px-6 sm:px-10 rounded-3xl shadow-2xl space-y-6">
          {error && (
            <div className="p-3 bg-rose-500/15 border border-rose-500/30 rounded-xl flex items-center gap-2 text-rose-400 text-xs">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Target App Switcher */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Direct Access Mode:
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setTargetApp('INV')}
                className={`py-2 px-3 rounded-xl border flex items-center justify-center gap-2 text-xs font-semibold transition ${
                  targetApp === 'INV'
                    ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/30'
                    : 'bg-white/5 text-slate-400 border-white/5 hover:bg-white/10'
                }`}
              >
                <Boxes className="w-3.5 h-3.5" />
                <span>Inventory Master</span>
              </button>

              <button
                type="button"
                onClick={() => setTargetApp('POS')}
                className={`py-2 px-3 rounded-xl border flex items-center justify-center gap-2 text-xs font-semibold transition ${
                  targetApp === 'POS'
                    ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/30'
                    : 'bg-white/5 text-slate-400 border-white/5 hover:bg-white/10'
                }`}
              >
                <ShoppingCart className="w-3.5 h-3.5" />
                <span>POS Register</span>
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block font-medium text-slate-300 mb-1.5">Staff Email Address *</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-[#181a28] border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-indigo-500"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="font-medium text-slate-300">Password / Token *</label>
                <a href="#reset" onClick={(e) => { e.preventDefault(); alert('Please contact store administrator to reset password.'); }} className="text-[11px] text-indigo-400 hover:underline">
                  Forgot?
                </a>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[#181a28] border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer text-slate-400">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded border-white/10 bg-[#181a28] text-indigo-600 focus:ring-0"
                />
                <span>Edge session (7-day cache)</span>
              </label>
              <span className="text-[11px] font-mono text-emerald-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                D1 Live
              </span>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-indigo-600/30 transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>{loading ? 'Verifying Credentials...' : `Enter ${targetApp === 'POS' ? 'Point of Sale' : 'Inventory Workspace'}`}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </form>

          {/* Quick Demo Logins */}
          <div className="pt-2 border-t border-white/5 space-y-2">
            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block text-center">
              Quick Fill Demo Accounts
            </span>
            <div className="grid grid-cols-3 gap-1.5">
              {demoAccounts.map((acc) => (
                <button
                  key={acc.label}
                  type="button"
                  onClick={() => handleDemoSelect(acc)}
                  className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-indigo-500/30 text-center transition group"
                >
                  <div className="text-[11px] font-bold text-slate-200 group-hover:text-white truncate">
                    {acc.label}
                  </div>
                  <div className="text-[9px] text-slate-500">{acc.role}</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer Links */}
        <div className="mt-6 text-center text-xs text-slate-400 space-y-2">
          <div>
            Need to initialize a new retail store?{' '}
            <Link to="/onboarding" className="font-semibold text-indigo-400 hover:underline">
              Start Store Onboarding
            </Link>
          </div>
          <div>
            <Link to="/landing" className="hover:text-white transition">
              ← Return to Home Overview
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
