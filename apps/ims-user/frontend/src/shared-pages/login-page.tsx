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
  UserPlus,
  LogIn,
} from 'lucide-react';
import { useAuth } from '../lib/auth-context';

export default function LoginPage() {
  const navigate = useNavigate();
  const { signIn, signUp } = useAuth();

  const [isSignUp, setIsSignUp] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('aeroma7701@gmail.com');
  const [password, setPassword] = useState('Zolexora@2026!');
  const [targetApp, setTargetApp] = useState<'POS' | 'INV'>('INV');
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const demoAccounts = [
    { label: 'Admin / Owner', email: 'aeroma7701@gmail.com', role: 'Full Access', defaultApp: 'INV' as const },
    { label: 'Store Incharge', email: 'store1@zolexora.com', role: 'Main Store', defaultApp: 'INV' as const },
    { label: 'POS Cashier 1', email: 'pos1@zolexora.com', role: 'Front Counter', defaultApp: 'POS' as const },
  ];

  const handleDemoSelect = (acc: typeof demoAccounts[0]) => {
    setIsSignUp(false);
    setEmail(acc.email);
    setPassword('Zolexora@2026!');
    setTargetApp(acc.defaultApp);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError('Please provide both email and password.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      if (isSignUp) {
        const { error: signUpError } = await signUp(email.trim(), password, name.trim());
        if (signUpError) {
          setError(signUpError.message);
          setLoading(false);
          return;
        }
        setSuccessMessage('Account created successfully! Signing in...');
      }

      const { error: signInError } = await signIn(email.trim(), password);
      if (signInError) {
        setError(signInError.message);
        setLoading(false);
        return;
      }

      setLoading(false);
      if (targetApp === 'POS') {
        navigate('/pos');
      } else {
        navigate('/inv/dashboard');
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred during authentication.');
      setLoading(false);
    }
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
        <h2 className="text-2xl font-extrabold text-white tracking-tight">
          {isSignUp ? 'Create Staff Account' : 'Staff Authentication'}
        </h2>
        <p className="text-xs text-slate-400">
          Powered by <span className="text-emerald-400 font-medium">Supabase Auth (ES256)</span> &amp; <span className="text-indigo-400 font-medium">Cloudflare D1</span>
        </p>
      </div>

      {/* Main Login Card */}
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-[#0f111c] border border-white/10 py-8 px-6 sm:px-10 rounded-3xl shadow-2xl space-y-6">
          {/* Sign In vs Sign Up Toggle */}
          <div className="flex rounded-xl bg-white/5 p-1 border border-white/10 text-xs">
            <button
              type="button"
              onClick={() => { setIsSignUp(false); setError(null); }}
              className={`flex-1 py-1.5 rounded-lg font-semibold flex items-center justify-center gap-1.5 transition ${
                !isSignUp ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign In</span>
            </button>
            <button
              type="button"
              onClick={() => { setIsSignUp(true); setError(null); }}
              className={`flex-1 py-1.5 rounded-lg font-semibold flex items-center justify-center gap-1.5 transition ${
                isSignUp ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Create Account</span>
            </button>
          </div>

          {error && (
            <div className="p-3 bg-rose-500/15 border border-rose-500/30 rounded-xl flex items-center gap-2 text-rose-400 text-xs">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3 bg-emerald-500/15 border border-emerald-500/30 rounded-xl flex items-center gap-2 text-emerald-400 text-xs">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Target App Switcher */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Target Workspace Mode:
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
            {isSignUp && (
              <div>
                <label className="block font-medium text-slate-300 mb-1.5">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-[#181a28] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-indigo-500"
                />
              </div>
            )}

            <div>
              <label className="block font-medium text-slate-300 mb-1.5">Email Address *</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  placeholder="name@zolexora.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-[#181a28] border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-indigo-500"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="font-medium text-slate-300">Password *</label>
                {!isSignUp && (
                  <a
                    href="#forgot"
                    onClick={(e) => { e.preventDefault(); alert('Please ask your store SuperAdmin to reset your password.'); }}
                    className="text-[11px] text-indigo-400 hover:underline"
                  >
                    Forgot?
                  </a>
                )}
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  placeholder="••••••••••••"
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
                <span>Keep session active</span>
              </label>
              <span className="text-[11px] font-mono text-emerald-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                Supabase Auth Live
              </span>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-indigo-600/30 transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>{loading ? 'Authenticating...' : isSignUp ? 'Create Supabase Account' : `Enter ${targetApp === 'POS' ? 'Point of Sale' : 'Inventory Workspace'}`}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </form>

          {/* Quick Demo Accounts */}
          <div className="pt-2 border-t border-white/5 space-y-2">
            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block text-center">
              Pre-Configured Staff Logins
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
                  <div className="text-[9px] text-slate-500 truncate">{acc.role}</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer Links */}
        <div className="mt-6 text-center text-xs text-slate-400 space-y-2">
          <div>
            Need to initialize a new retail organization?{' '}
            <Link to="/onboarding" className="font-semibold text-indigo-400 hover:underline">
              Start Organization Onboarding
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
