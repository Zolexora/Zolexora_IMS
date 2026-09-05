import React, { useEffect, useState } from 'react';
import { Package, DollarSign, AlertTriangle, TrendingUp, Store, ShoppingCart } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Home() {
  const [metrics, setMetrics] = useState({
    totalSKUs: 12,
    totalStockValuation: 221650,
    lowStockAlerts: 1,
    totalTodaySales: 0,
    activeStores: 3,
    activeSellingPoints: 3,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/v1/dashboard/metrics')
      .then((res) => res.json())
      .then((data) => {
        if (data && !data.error) setMetrics(data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Inventory Overview</h1>
          <p className="text-sm text-slate-400">Real-time multi-tenant stock and operations telemetry</p>
        </div>
        <div className="flex gap-3">
          <Link
            to="/items"
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition flex items-center gap-2 shadow-sm"
          >
            <Package className="w-4 h-4" /> Manage Inventory
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#121522] border border-white/10 rounded-xl p-5 shadow-sm">
          <div className="flex justify-between items-center text-slate-400 mb-2">
            <span className="text-xs uppercase font-semibold tracking-wider">Total SKUs</span>
            <Package className="w-5 h-5 text-indigo-400" />
          </div>
          <div className="text-2xl font-bold text-white">{metrics.totalSKUs}</div>
          <span className="text-xs text-emerald-400 font-medium">Catalog Active</span>
        </div>

        <div className="bg-[#121522] border border-white/10 rounded-xl p-5 shadow-sm">
          <div className="flex justify-between items-center text-slate-400 mb-2">
            <span className="text-xs uppercase font-semibold tracking-wider">Stock Valuation</span>
            <DollarSign className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-white">₹{metrics.totalStockValuation.toLocaleString()}</div>
          <span className="text-xs text-slate-400">Across all depots</span>
        </div>

        <div className="bg-[#121522] border border-white/10 rounded-xl p-5 shadow-sm">
          <div className="flex justify-between items-center text-slate-400 mb-2">
            <span className="text-xs uppercase font-semibold tracking-wider">Low Stock Alerts</span>
            <AlertTriangle className="w-5 h-5 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-amber-300">{metrics.lowStockAlerts}</div>
          <span className="text-xs text-amber-400">Needs replenishment</span>
        </div>

        <div className="bg-[#121522] border border-white/10 rounded-xl p-5 shadow-sm">
          <div className="flex justify-between items-center text-slate-400 mb-2">
            <span className="text-xs uppercase font-semibold tracking-wider">Today's Sales</span>
            <TrendingUp className="w-5 h-5 text-purple-400" />
          </div>
          <div className="text-2xl font-bold text-white">₹{metrics.totalTodaySales.toLocaleString()}</div>
          <span className="text-xs text-purple-400">All selling points</span>
        </div>
      </div>

      {/* Action shortcuts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-[#121522] border border-white/10 rounded-xl p-5">
          <h2 className="text-base font-semibold text-white mb-3">Quick Navigation</h2>
          <div className="grid grid-cols-2 gap-3">
            <Link
              to="/items"
              className="p-3 bg-white/5 hover:bg-white/10 rounded-lg border border-white/5 flex items-center gap-3 transition"
            >
              <Package className="w-5 h-5 text-indigo-400" />
              <div>
                <div className="text-sm font-medium text-white">All Products</div>
                <div className="text-xs text-slate-400">View and update stock</div>
              </div>
            </Link>
            <div className="p-3 bg-white/5 rounded-lg border border-white/5 flex items-center gap-3">
              <Store className="w-5 h-5 text-emerald-400" />
              <div>
                <div className="text-sm font-medium text-white">{metrics.activeStores} Stores Active</div>
                <div className="text-xs text-slate-400">Store 1, Store 2, Central</div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-[#121522] border border-white/10 rounded-xl p-5">
          <h2 className="text-base font-semibold text-white mb-3">System Engine</h2>
          <div className="space-y-2 text-xs text-slate-400">
            <div className="flex justify-between py-1 border-b border-white/5">
              <span>Relational Engine:</span>
              <span className="text-emerald-400 font-medium">Cloudflare D1 / SQLite Engine</span>
            </div>
            <div className="flex justify-between py-1 border-b border-white/5">
              <span>Authentication:</span>
              <span className="text-indigo-400 font-medium">Supabase Auth Session</span>
            </div>
            <div className="flex justify-between py-1">
              <span>Backend Server:</span>
              <span className="text-purple-400 font-medium">FastAPI (Python 3.11+) on Render</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
