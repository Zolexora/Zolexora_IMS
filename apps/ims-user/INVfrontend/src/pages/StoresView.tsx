import React, { useState, useEffect } from 'react';
import { Building2, Store, MapPin, Phone, ShieldCheck, RefreshCw } from 'lucide-react';

interface StoreLocation {
  code: string;
  name: string;
  type: string;
  address?: string;
  phone?: string;
  status: string;
}

interface SellingPoint {
  code: string;
  name: string;
  assigned_store_code: string;
  status: string;
}

const DEFAULT_STORES: StoreLocation[] = [
  { code: 'S_001', name: 'Store 1 — Central Hub & Warehouse', type: 'Main Warehouse', address: 'Plot 42, Industrial Area, Phase 1', phone: '+91 98765 43210', status: 'Active' },
  { code: 'S_002', name: 'Store 2 — Downtown Commercial Branch', type: 'Retail Branch', address: 'Shop 14, City Center Mall', phone: '+91 98765 43211', status: 'Active' },
];

const DEFAULT_POINTS: SellingPoint[] = [
  { code: 'SP_001', name: 'Main Counter 1', assigned_store_code: 'S_001', status: 'Active' },
  { code: 'SP_002', name: 'Mall Express Counter 2', assigned_store_code: 'S_002', status: 'Active' },
];

export default function StoresView() {
  const [stores, setStores] = useState<StoreLocation[]>(DEFAULT_STORES);
  const [sellingPoints, setSellingPoints] = useState<SellingPoint[]>(DEFAULT_POINTS);
  const [loading, setLoading] = useState(false);

  const fetchLocations = async () => {
    setLoading(true);
    try {
      const sRes = await fetch('/api/v1/stores');
      if (sRes.ok) {
        const sData = await sRes.json();
        if (Array.isArray(sData) && sData.length > 0) setStores(sData);
      }
      const pRes = await fetch('/api/v1/selling-points');
      if (pRes.ok) {
        const pData = await pRes.json();
        if (Array.isArray(pData) && pData.length > 0) setSellingPoints(pData);
      }
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    fetchLocations();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Stores & Warehouses</h1>
          <p className="text-xs text-slate-400 mt-1">
            Locations, fulfillment nodes, and connected POS registers
          </p>
        </div>
        <button
          onClick={fetchLocations}
          className="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-medium text-slate-200 transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Stores Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {stores.map((st) => {
          const associatedSPs = sellingPoints.filter((sp) => sp.assigned_store_code === st.code);

          return (
            <div
              key={st.code}
              className="p-5 bg-[#12141f] border border-white/10 rounded-2xl space-y-4 hover:border-indigo-500/30 transition shadow-lg"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-600/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">{st.name}</h3>
                    <div className="text-[11px] font-mono text-indigo-400">{st.code} • {st.type || 'Warehouse'}</div>
                  </div>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
                  {st.status}
                </span>
              </div>

              <div className="space-y-1.5 text-xs text-slate-400 pt-2 border-t border-white/5">
                <div className="flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                  <span>{st.address || 'Standard Location'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                  <span>{st.phone || 'Direct Extension'}</span>
                </div>
              </div>

              {/* Linked Selling Points */}
              <div className="pt-2 border-t border-white/5 space-y-2">
                <div className="text-[11px] font-medium text-slate-300 flex items-center gap-1.5">
                  <Store className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Assigned Point of Sale Counters:</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {associatedSPs.length === 0 ? (
                    <span className="text-[11px] text-slate-500">No active POS terminals</span>
                  ) : (
                    associatedSPs.map((sp) => (
                      <span
                        key={sp.code}
                        className="px-2 py-1 rounded-lg bg-[#181a28] border border-white/5 text-[11px] text-slate-200 font-medium"
                      >
                        {sp.name} ({sp.code})
                      </span>
                    ))
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
