import React, { useState, useEffect } from 'react';
import { Truck, Phone, Mail, MapPin, RefreshCw, ShoppingCart } from 'lucide-react';

interface Supplier {
  code: string;
  name: string;
  contact_person?: string;
  phone?: string;
  email?: string;
  address?: string;
  category?: string;
  payment_terms?: string;
  status: string;
}

const DEFAULT_SUPPLIERS: Supplier[] = [
  {
    code: 'SUP_001',
    name: 'TechLogix Distribution Pvt Ltd',
    contact_person: 'Rajesh Sharma',
    phone: '+91 98234 11223',
    email: 'orders@techlogix.example.com',
    address: 'Electronics Zone, Sector 62, Noida',
    category: 'Electronics & Audio',
    payment_terms: 'Net 30',
    status: 'Active',
  },
  {
    code: 'SUP_002',
    name: 'Apex Peripherals & Storage Ltd',
    contact_person: 'Anita Verma',
    phone: '+91 98112 33445',
    email: 'sales@apexperipherals.example.com',
    address: 'Nehru Place Hub, New Delhi',
    category: 'Computer Peripherals',
    payment_terms: 'Net 15',
    status: 'Active',
  },
];

export default function SuppliersView() {
  const [suppliers, setSuppliers] = useState<Supplier[]>(DEFAULT_SUPPLIERS);
  const [loading, setLoading] = useState(false);

  const fetchSuppliers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/v1/suppliers');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) setSuppliers(data);
      }
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    fetchSuppliers();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Suppliers & Vendors</h1>
          <p className="text-xs text-slate-400 mt-1">
            Vendor records, preferred replenishment suppliers, and procurement channels
          </p>
        </div>
        <button
          onClick={fetchSuppliers}
          className="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-medium text-slate-200 transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {suppliers.map((sup) => (
          <div
            key={sup.code}
            className="p-5 bg-[#12141f] border border-white/10 rounded-2xl space-y-4 hover:border-indigo-500/30 transition shadow-lg"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-600/15 border border-purple-500/30 flex items-center justify-center text-purple-400">
                  <Truck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">{sup.name}</h3>
                  <div className="text-[11px] font-mono text-purple-400">{sup.code} • {sup.category || 'General'}</div>
                </div>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
                {sup.status}
              </span>
            </div>

            <div className="space-y-1.5 text-xs text-slate-400 pt-2 border-t border-white/5">
              <div className="flex items-center justify-between">
                <span>Contact Person:</span>
                <span className="text-slate-200 font-medium">{sup.contact_person || 'Procurement Desk'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Payment Terms:</span>
                <span className="text-slate-200 font-mono">{sup.payment_terms || 'Net 30'}</span>
              </div>
              {sup.phone && (
                <div className="flex items-center gap-2 pt-1">
                  <Phone className="w-3.5 h-3.5 text-slate-500" />
                  <span>{sup.phone}</span>
                </div>
              )}
              {sup.email && (
                <div className="flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-slate-500" />
                  <span>{sup.email}</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
