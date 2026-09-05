import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  Package,
  AlertTriangle,
  Boxes,
  Building2,
  DollarSign,
  ArrowUpRight,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';
import { Link } from 'react-router-dom';

export default function DashboardOverview() {
  const [metrics, setMetrics] = useState<any>({
    totalSKUs: 12,
    totalStockValuation: 2435000.0,
    lowStockAlerts: 3,
    totalTodaySales: 78500.0,
    totalTodayPurchases: 142000.0,
    activeStores: 2,
    activeSellingPoints: 2,
    currency: '₹',
  });
  const [lowStockItems, setLowStockItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchMetrics = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/v1/dashboard/metrics');
      if (res.ok) {
        const data = await res.json();
        setMetrics(data);
      }
    } catch {}

    try {
      const res = await fetch('/api/v1/items');
      if (res.ok) {
        const data = await res.json();
        const low = data.filter((item: any) => item.total_stock <= item.min_stock);
        setLowStockItems(low);
      }
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Inventory Overview & Analytics</h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time stock valuation, multi-store levels, and Cloudflare D1 inventory metrics
          </p>
        </div>
        <button
          onClick={fetchMetrics}
          className="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-medium text-slate-200 transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-[#12141f] border border-white/10 rounded-2xl space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Total Stock Valuation</span>
            <span className="p-1.5 bg-emerald-500/10 rounded-lg text-emerald-400">
              <DollarSign className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-extrabold text-white font-mono">
            {metrics.currency}{Number(metrics.totalStockValuation || 0).toLocaleString('en-IN')}
          </div>
          <div className="text-[11px] text-emerald-400 flex items-center gap-1 font-medium">
            <TrendingUp className="w-3 h-3" />
            <span>Across all stores & central hub</span>
          </div>
        </div>

        <div className="p-4 bg-[#12141f] border border-white/10 rounded-2xl space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Active SKUs</span>
            <span className="p-1.5 bg-indigo-500/10 rounded-lg text-indigo-400">
              <Package className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-extrabold text-white font-mono">{metrics.totalSKUs}</div>
          <div className="text-[11px] text-slate-400">Catalogued & managed</div>
        </div>

        <div className="p-4 bg-[#12141f] border border-white/10 rounded-2xl space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Low Stock Critical Alerts</span>
            <span className="p-1.5 bg-amber-500/10 rounded-lg text-amber-400">
              <AlertTriangle className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-extrabold text-amber-400 font-mono">
            {metrics.lowStockAlerts}
          </div>
          <div className="text-[11px] text-amber-400/80">Requires replenishment</div>
        </div>

        <div className="p-4 bg-[#12141f] border border-white/10 rounded-2xl space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Warehouses & Counters</span>
            <span className="p-1.5 bg-purple-500/10 rounded-lg text-purple-400">
              <Building2 className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-extrabold text-white font-mono">
            {metrics.activeStores} Stores / {metrics.activeSellingPoints} POS
          </div>
          <div className="text-[11px] text-slate-400">Distributed multi-tenant</div>
        </div>
      </div>

      {/* Stock Health & Quick Links */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Low Stock Alerts Table */}
        <div className="lg:col-span-2 bg-[#12141f] border border-white/10 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <h3 className="font-semibold text-sm text-white">Critical Low-Stock Items</h3>
            </div>
            <Link
              to="/catalog"
              className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-medium"
            >
              <span>View Full Catalog</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-slate-400 border-b border-white/10">
                  <th className="pb-2 font-medium">SKU</th>
                  <th className="pb-2 font-medium">Description</th>
                  <th className="pb-2 font-medium text-center">Store 1</th>
                  <th className="pb-2 font-medium text-center">Store 2</th>
                  <th className="pb-2 font-medium text-center">Total</th>
                  <th className="pb-2 font-medium text-center">Min Req</th>
                  <th className="pb-2 font-medium text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {lowStockItems.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-6 text-center text-slate-500">
                      All inventory stock levels are currently healthy!
                    </td>
                  </tr>
                ) : (
                  lowStockItems.map((item) => (
                    <tr key={item.item_code} className="hover:bg-white/5 transition">
                      <td className="py-3 font-mono text-indigo-400 font-semibold">{item.item_code}</td>
                      <td className="py-3 font-medium text-slate-200 max-w-[200px] truncate">
                        {item.description}
                      </td>
                      <td className="py-3 text-center">{item.stock_s_001}</td>
                      <td className="py-3 text-center">{item.stock_s_002}</td>
                      <td className="py-3 text-center font-bold text-amber-400 font-mono">{item.total_stock}</td>
                      <td className="py-3 text-center font-mono text-slate-400">{item.min_stock}</td>
                      <td className="py-3 text-right">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          Reorder Soon
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Quick Inventory Actions & System Architecture */}
        <div className="bg-[#12141f] border border-white/10 rounded-2xl p-5 flex flex-col justify-between space-y-4">
          <div className="space-y-4">
            <h3 className="font-semibold text-sm text-white">Quick Navigation</h3>
            <div className="space-y-2">
              <Link
                to="/catalog"
                className="flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-indigo-600/15 border border-white/5 hover:border-indigo-500/30 text-xs text-slate-200 hover:text-white transition group"
              >
                <div className="flex items-center gap-2.5">
                  <Boxes className="w-4 h-4 text-indigo-400" />
                  <span>Item Master Catalog</span>
                </div>
                <ArrowUpRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-indigo-400" />
              </Link>

              <Link
                to="/stores"
                className="flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-indigo-600/15 border border-white/5 hover:border-indigo-500/30 text-xs text-slate-200 hover:text-white transition group"
              >
                <div className="flex items-center gap-2.5">
                  <Building2 className="w-4 h-4 text-emerald-400" />
                  <span>Store Locations & Hubs</span>
                </div>
                <ArrowUpRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-indigo-400" />
              </Link>

              <Link
                to="/suppliers"
                className="flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-indigo-600/15 border border-white/5 hover:border-indigo-500/30 text-xs text-slate-200 hover:text-white transition group"
              >
                <div className="flex items-center gap-2.5">
                  <Package className="w-4 h-4 text-purple-400" />
                  <span>Vendor Directory & POs</span>
                </div>
                <ArrowUpRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-indigo-400" />
              </Link>
            </div>
          </div>

          <div className="p-3 bg-white/5 border border-white/5 rounded-xl space-y-1.5 text-xs text-slate-400">
            <div className="flex items-center gap-2 text-white font-medium">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Cloudflare D1 Relational Engine</span>
            </div>
            <p className="text-[11px] leading-relaxed">
              Inventory balances are committed directly to Cloudflare D1 edge database with zero-latency replication.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
