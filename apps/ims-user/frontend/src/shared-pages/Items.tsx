import React, { useEffect, useState } from 'react';
import { Search, Plus, Filter, AlertCircle, CheckCircle } from 'lucide-react';

interface Product {
  item_code: string;
  description: string;
  category: string;
  uom: string;
  rate: number;
  min_stock: number;
  stock_s_001: number;
  stock_s_002: number;
  central_stock: number;
  total_stock: number;
  total_valuation: number;
  status: string;
}

export default function Items() {
  const [items, setItems] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newItem, setNewItem] = useState({
    item_code: '',
    description: '',
    category: 'Gourmet & Pastas',
    uom: 'Pcs',
    rate: 0,
    min_stock: 5,
    stock_s_001: 10,
    stock_s_002: 0,
    central_stock: 0,
  });

  const loadItems = () => {
    setLoading(true);
    let url = '/api/v1/items';
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (category !== 'ALL') params.append('category', category);
    if (params.toString()) url += `?${params.toString()}`;

    fetch(url)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setItems(data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadItems();
  }, [category]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadItems();
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/v1/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newItem),
      });
      if (res.ok) {
        setShowModal(false);
        setNewItem({
          item_code: '',
          description: '',
          category: 'Gourmet & Pastas',
          uom: 'Pcs',
          rate: 0,
          min_stock: 5,
          stock_s_001: 10,
          stock_s_002: 0,
          central_stock: 0,
        });
        loadItems();
      }
    } catch {}
  };

  const categories = ['ALL', ...Array.from(new Set(items.map((i) => i.category)))];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Products & Inventory</h1>
          <p className="text-sm text-slate-400">Manage SKUs, stock distributions, rates, and valuations</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition flex items-center gap-2 shadow-sm"
        >
          <Plus className="w-4 h-4" /> Add Product
        </button>
      </div>

      {/* Filters Bar */}
      <div className="bg-[#121522] border border-white/10 rounded-xl p-4 flex flex-col md:flex-row gap-3 items-center justify-between">
        <form onSubmit={handleSearch} className="flex-1 w-full flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search by SKU code, item name, or description..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[#181b2a] border border-white/10 rounded-lg pl-9 pr-4 py-2 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-white/10 hover:bg-white/15 text-white rounded-lg text-sm transition"
          >
            Search
          </button>
        </form>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="bg-[#181b2a] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 w-full md:w-auto"
          >
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Items Table */}
      <div className="bg-[#121522] border border-white/10 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-[#181b2a] text-xs uppercase font-semibold text-slate-400 border-b border-white/10">
              <tr>
                <th className="px-4 py-3">SKU</th>
                <th className="px-4 py-3">Description</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3 text-right">Unit Rate</th>
                <th className="px-4 py-3 text-right">Store 1</th>
                <th className="px-4 py-3 text-right">Store 2</th>
                <th className="px-4 py-3 text-right">Total Stock</th>
                <th className="px-4 py-3 text-right">Valuation</th>
                <th className="px-4 py-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {items.map((item) => {
                const isLow = item.total_stock <= item.min_stock;
                return (
                  <tr key={item.item_code} className="hover:bg-white/[0.02] transition">
                    <td className="px-4 py-3 font-mono font-medium text-indigo-400">{item.item_code}</td>
                    <td className="px-4 py-3 font-medium text-white">{item.description}</td>
                    <td className="px-4 py-3 text-slate-400">{item.category}</td>
                    <td className="px-4 py-3 text-right text-white">₹{item.rate.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right text-slate-300">{item.stock_s_001}</td>
                    <td className="px-4 py-3 text-right text-slate-300">{item.stock_s_002}</td>
                    <td className="px-4 py-3 text-right font-semibold">
                      <span className={isLow ? 'text-amber-400' : 'text-emerald-400'}>
                        {item.total_stock} {item.uom}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-white">₹{item.total_valuation.toLocaleString()}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        {item.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {items.length === 0 && !loading && (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-slate-400">
                    No products found matching your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#121522] border border-white/15 rounded-xl max-w-lg w-full p-6 space-y-4">
            <h2 className="text-lg font-bold text-white">Add New Product</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Item SKU Code</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. ITM-NEW-001"
                  value={newItem.item_code}
                  onChange={(e) => setNewItem({ ...newItem, item_code: e.target.value })}
                  className="w-full bg-[#181b2a] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">Description / Name</label>
                <input
                  type="text"
                  required
                  placeholder="Product name"
                  value={newItem.description}
                  onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                  className="w-full bg-[#181b2a] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Category</label>
                  <input
                    type="text"
                    required
                    value={newItem.category}
                    onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}
                    className="w-full bg-[#181b2a] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Rate (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={newItem.rate}
                    onChange={(e) => setNewItem({ ...newItem, rate: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-[#181b2a] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Initial Stock (Store 1)</label>
                  <input
                    type="number"
                    value={newItem.stock_s_001}
                    onChange={(e) => setNewItem({ ...newItem, stock_s_001: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-[#181b2a] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Min Alert Stock</label>
                  <input
                    type="number"
                    value={newItem.min_stock}
                    onChange={(e) => setNewItem({ ...newItem, min_stock: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-[#181b2a] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 text-slate-300 rounded-lg text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium"
                >
                  Save Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
