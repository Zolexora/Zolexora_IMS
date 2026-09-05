import React, { useState, useEffect } from 'react';
import {
  Building2,
  Store,
  MapPin,
  Phone,
  Plus,
  RefreshCw,
  Layers,
  CheckCircle2,
} from 'lucide-react';

interface Site {
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

const DEFAULT_SITES: Site[] = [
  { code: 'S_001', name: 'Store 1 — Central Hub & Warehouse', type: 'Main Fulfillment Hub', address: 'Plot 42, Industrial Area, Phase 1', phone: '+91 98765 43210', status: 'Active' },
  { code: 'S_002', name: 'Store 2 — Downtown Commercial Branch', type: 'Retail Store & Stockroom', address: 'Shop 14, City Center Mall', phone: '+91 98765 43211', status: 'Active' },
  { code: 'CENTRAL', name: 'Central Regional Distribution Center', type: 'Primary Buffer Warehouse', address: 'Logistics Park, National Highway 8', phone: '+91 98765 43299', status: 'Active' },
];

const DEFAULT_POINTS: SellingPoint[] = [
  { code: 'SP_001', name: 'Main Retail Counter 1', assigned_store_code: 'S_001', status: 'Active' },
  { code: 'SP_002', name: 'Mall Express Counter 2', assigned_store_code: 'S_002', status: 'Active' },
];

export default function SiteManagement() {
  const [sites, setSites] = useState<Site[]>(DEFAULT_SITES);
  const [sellingPoints, setSellingPoints] = useState<SellingPoint[]>(DEFAULT_POINTS);
  const [loading, setLoading] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const [newSite, setNewSite] = useState({
    code: '',
    name: '',
    type: 'Warehouse',
    address: '',
    phone: '',
  });

  const fetchSites = async () => {
    setLoading(true);
    try {
      const sRes = await fetch('/api/v1/stores');
      if (sRes.ok) {
        const sData = await sRes.json();
        if (Array.isArray(sData) && sData.length > 0) setSites(sData);
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
    fetchSites();
  }, []);

  const handleAddSite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSite.name.trim()) return;

    const code = newSite.code.trim().toUpperCase() || `S_00${sites.length + 1}`;
    setSites([
      ...sites,
      {
        ...newSite,
        code,
        status: 'Active',
      },
    ]);
    setIsAddModalOpen(false);
    setNewSite({ code: '', name: '', type: 'Warehouse', address: '', phone: '' });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Building2 className="w-6 h-6 text-indigo-400" />
            Warehouse & Site Management
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Physical store footprints, regional fulfillment hubs, and connected POS cashier terminals
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchSites}
            className="p-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-slate-300 transition"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-indigo-600/30 transition"
          >
            <Plus className="w-4 h-4" />
            <span>+ Add Site</span>
          </button>
        </div>
      </div>

      {/* Sites Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sites.map((st) => {
          const associatedSPs = sellingPoints.filter((sp) => sp.assigned_store_code === st.code);

          return (
            <div
              key={st.code}
              className="p-5 bg-[#12141f] border border-white/10 rounded-2xl space-y-4 hover:border-indigo-500/30 transition shadow-lg flex flex-col justify-between"
            >
              <div className="space-y-3">
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
                  <div className="flex items-center gap-2 text-slate-300">
                    <MapPin className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                    <span>{st.address || 'Standard Hub Footprint'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-300">
                    <Phone className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                    <span>{st.phone || 'Direct Extension'}</span>
                  </div>
                </div>

                {/* POS counters */}
                <div className="pt-2 border-t border-white/5 space-y-1.5">
                  <div className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
                    <Store className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Connected POS Registers ({associatedSPs.length})</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {associatedSPs.length === 0 ? (
                      <span className="text-[11px] text-slate-500">No active POS terminals</span>
                    ) : (
                      associatedSPs.map((sp) => (
                        <span
                          key={sp.code}
                          className="px-2 py-0.5 rounded-md bg-[#181a28] border border-white/5 text-[11px] text-slate-200 font-medium"
                        >
                          {sp.name} ({sp.code})
                        </span>
                      ))
                    )}
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-white/5 flex items-center justify-between text-xs text-slate-400">
                <span>D1 Sync Node:</span>
                <span className="font-mono text-emerald-400 font-semibold">Online</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Site Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-[#12141f] border border-white/10 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl p-6 space-y-4">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Building2 className="w-5 h-5 text-indigo-400" />
              Add Warehouse / Site Location
            </h2>

            <form onSubmit={handleAddSite} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Site Code *</label>
                  <input
                    type="text"
                    required
                    value={newSite.code}
                    onChange={(e) => setNewSite({ ...newSite, code: e.target.value.toUpperCase() })}
                    placeholder="e.g. S_003"
                    className="w-full bg-[#181a28] border border-white/10 rounded-xl px-3 py-2 text-white font-mono outline-hidden focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Facility Type</label>
                  <select
                    value={newSite.type}
                    onChange={(e) => setNewSite({ ...newSite, type: e.target.value })}
                    className="w-full bg-[#181a28] border border-white/10 rounded-xl px-3 py-2 text-white outline-hidden focus:border-indigo-500"
                  >
                    <option value="Warehouse">Warehouse Hub</option>
                    <option value="Retail Outlet">Retail Outlet</option>
                    <option value="Distribution Hub">Regional Distribution</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Site / Store Name *</label>
                <input
                  type="text"
                  required
                  value={newSite.name}
                  onChange={(e) => setNewSite({ ...newSite, name: e.target.value })}
                  placeholder="e.g. Store 3 — Airport Logistics Park"
                  className="w-full bg-[#181a28] border border-white/10 rounded-xl px-3 py-2 text-white outline-hidden focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Physical Address</label>
                <input
                  type="text"
                  value={newSite.address}
                  onChange={(e) => setNewSite({ ...newSite, address: e.target.value })}
                  placeholder="Street, Industrial Area, City"
                  className="w-full bg-[#181a28] border border-white/10 rounded-xl px-3 py-2 text-white outline-hidden focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Contact Phone</label>
                <input
                  type="text"
                  value={newSite.phone}
                  onChange={(e) => setNewSite({ ...newSite, phone: e.target.value })}
                  placeholder="+91 ..."
                  className="w-full bg-[#181a28] border border-white/10 rounded-xl px-3 py-2 text-white outline-hidden focus:border-indigo-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/5 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl shadow-md transition"
                >
                  Add Site
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
