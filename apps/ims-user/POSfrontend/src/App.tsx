import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Search,
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  CreditCard,
  Banknote,
  QrCode,
  Store,
  Clock,
  CheckCircle2,
  RefreshCw,
  History,
  AlertCircle,
  Percent,
} from 'lucide-react';
import ReceiptModal, { CartItem, SaleReceipt } from './components/ReceiptModal';
import RecentSalesDrawer, { RecentTxn } from './components/RecentSalesDrawer';

interface Product {
  item_code: string;
  description: string;
  category: string;
  rate: number;
  tax_percent: number;
  stock_s_001: number;
  stock_s_002: number;
  central_stock: number;
  total_stock: number;
  uom: string;
  status: string;
}

const DEFAULT_PRODUCTS: Product[] = [
  { item_code: "P001", description: "Logitech MX Master 3S Wireless Mouse", category: "Electronics", rate: 8999.0, tax_percent: 18.0, stock_s_001: 25, stock_s_002: 10, central_stock: 50, total_stock: 85, uom: "Pcs", status: "Active" },
  { item_code: "P002", description: "Keychron K2 Mechanical Keyboard V2", category: "Electronics", rate: 7499.0, tax_percent: 18.0, stock_s_001: 14, stock_s_002: 5, central_stock: 20, total_stock: 39, uom: "Pcs", status: "Active" },
  { item_code: "P003", description: "Dell UltraSharp 27 4K Monitor U2723QE", category: "Electronics", rate: 52000.0, tax_percent: 18.0, stock_s_001: 6, stock_s_002: 2, central_stock: 12, total_stock: 20, uom: "Pcs", status: "Active" },
  { item_code: "P004", description: "Sony WH-1000XM5 Noise Cancelling Headphones", category: "Audio", rate: 29990.0, tax_percent: 18.0, stock_s_001: 9, stock_s_002: 4, central_stock: 15, total_stock: 28, uom: "Pcs", status: "Active" },
  { item_code: "P005", description: "Apple AirPods Pro (2nd Gen) USB-C", category: "Audio", rate: 24900.0, tax_percent: 18.0, stock_s_001: 18, stock_s_002: 8, central_stock: 30, total_stock: 56, uom: "Pcs", status: "Active" },
  { item_code: "P006", description: "Anker 737 Power Bank (PowerCore 24K)", category: "Accessories", rate: 12499.0, tax_percent: 18.0, stock_s_001: 20, stock_s_002: 7, central_stock: 40, total_stock: 67, uom: "Pcs", status: "Active" },
  { item_code: "P007", description: "Samsung T7 Shield 2TB Portable SSD", category: "Storage", rate: 16999.0, tax_percent: 18.0, stock_s_001: 15, stock_s_002: 6, central_stock: 25, total_stock: 46, uom: "Pcs", status: "Active" },
  { item_code: "P008", description: "Belkin BoostCharge Pro 3-in-1 Wireless Pad", category: "Accessories", rate: 11999.0, tax_percent: 18.0, stock_s_001: 11, stock_s_002: 3, central_stock: 18, total_stock: 32, uom: "Pcs", status: "Active" },
  { item_code: "P009", description: "Ergotron LX Desk Mount LCD Arm", category: "Office", rate: 15500.0, tax_percent: 18.0, stock_s_001: 8, stock_s_002: 2, central_stock: 10, total_stock: 20, uom: "Pcs", status: "Active" },
  { item_code: "P010", description: "CalDigit TS4 Thunderbolt 4 Dock", category: "Accessories", rate: 38500.0, tax_percent: 18.0, stock_s_001: 4, stock_s_002: 1, central_stock: 8, total_stock: 13, uom: "Pcs", status: "Active" },
  { item_code: "P011", description: "Shure SM7B Vocal Dynamic Microphone", category: "Audio", rate: 36900.0, tax_percent: 18.0, stock_s_001: 5, stock_s_002: 2, central_stock: 7, total_stock: 14, uom: "Pcs", status: "Active" },
  { item_code: "P012", description: "Elgato Stream Deck XL 32 Keys", category: "Electronics", rate: 21990.0, tax_percent: 18.0, stock_s_001: 7, stock_s_002: 3, central_stock: 14, total_stock: 24, uom: "Pcs", status: "Active" },
];

export default function App() {
  const [products, setProducts] = useState<Product[]>(DEFAULT_PRODUCTS);
  const [loading, setLoading] = useState<boolean>(false);
  const [d1Connected, setD1Connected] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [sellingPoint, setSellingPoint] = useState<string>('SP_001');
  const [customerName, setCustomerName] = useState<string>('Walk-in Customer');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentMode, setPaymentMode] = useState<'Cash' | 'Card' | 'UPI'>('Cash');
  const [cashTendered, setCashTendered] = useState<string>('');
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [receipt, setReceipt] = useState<SaleReceipt | null>(null);
  const [recentTxns, setRecentTxns] = useState<RecentTxn[]>([]);
  const [drawerOpen, setDrawerOpen] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<string>(new Date().toLocaleTimeString());

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Keep live time updated
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date().toLocaleTimeString()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch live products and transactions from backend
  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/v1/items');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setProducts(data);
        }
        setD1Connected(true);
      } else {
        setD1Connected(false);
      }
    } catch {
      setD1Connected(false);
    }

    try {
      const txRes = await fetch('/api/v1/transactions?limit=20');
      if (txRes.ok) {
        const txData = await txRes.json();
        if (Array.isArray(txData)) {
          setRecentTxns(txData);
        }
      }
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Extract unique categories
  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => set.add(p.category));
    return ['All', ...Array.from(set)];
  }, [products]);

  // Filtered products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesSearch =
        p.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.item_code.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [products, searchQuery, selectedCategory]);

  // Add to cart
  const addToCart = (product: Product) => {
    const currentStoreStock = sellingPoint === 'SP_001' ? product.stock_s_001 : product.stock_s_002;
    const existing = cart.find((item) => item.item_code === product.item_code);
    const curQtyInCart = existing ? existing.quantity : 0;

    if (curQtyInCart + 1 > currentStoreStock) {
      alert(`Cannot add more: only ${currentStoreStock} ${product.uom} available in selected store.`);
      return;
    }

    if (existing) {
      setCart(
        cart.map((item) =>
          item.item_code === product.item_code ? { ...item, quantity: item.quantity + 1 } : item
        )
      );
    } else {
      setCart([
        ...cart,
        {
          item_code: product.item_code,
          description: product.description,
          rate: product.rate,
          quantity: 1,
          tax_percent: product.tax_percent || 18.0,
        },
      ]);
    }
  };

  // Adjust cart quantity
  const updateQuantity = (item_code: string, delta: number) => {
    const product = products.find((p) => p.item_code === item_code);
    const currentStoreStock = product
      ? sellingPoint === 'SP_001'
        ? product.stock_s_001
        : product.stock_s_002
      : 999;

    setCart(
      cart
        .map((item) => {
          if (item.item_code === item_code) {
            const next = item.quantity + delta;
            if (next > currentStoreStock) {
              alert(`Max available stock in this location is ${currentStoreStock}`);
              return item;
            }
            return { ...item, quantity: next };
          }
          return item;
        })
        .filter((item) => item.quantity > 0)
    );
  };

  const removeFromCart = (item_code: string) => {
    setCart(cart.filter((item) => item.item_code !== item_code));
  };

  const clearCart = () => {
    setCart([]);
    setCashTendered('');
    setDiscountPercent(0);
  };

  // Financial calculations
  const subtotal = useMemo(() => {
    return cart.reduce((acc, item) => acc + item.rate * item.quantity, 0);
  }, [cart]);

  const discountAmount = useMemo(() => {
    return (subtotal * discountPercent) / 100;
  }, [subtotal, discountPercent]);

  const discountedSubtotal = subtotal - discountAmount;

  const taxAmount = useMemo(() => {
    // 18% standard effective GST on discounted base
    return (discountedSubtotal * 18.0) / 100;
  }, [discountedSubtotal]);

  const grandTotal = Math.round(discountedSubtotal + taxAmount);

  const tenderedVal = parseFloat(cashTendered) || 0;
  const changeDue = Math.max(0, tenderedVal - grandTotal);

  // Complete Checkout Sale
  const handleCheckout = async () => {
    if (cart.length === 0) return;
    if (paymentMode === 'Cash' && tenderedVal > 0 && tenderedVal < grandTotal) {
      alert('Tendered amount cannot be less than Grand Total!');
      return;
    }

    const billNo = `BILL-${Math.floor(100000 + Math.random() * 900000)}`;
    const salePayload = {
      selling_point_code: sellingPoint,
      customer_name: customerName.trim() || 'Walk-in Customer',
      bill_no: billNo,
      items: cart.map((c) => ({
        item_code: c.item_code,
        quantity: c.quantity,
        rate: c.rate,
        tax_percent: c.tax_percent,
      })),
      payment_mode: paymentMode,
      notes: `POS terminal sale (${paymentMode})`,
    };

    try {
      await fetch('/api/v1/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(salePayload),
      });
    } catch {}

    // Decrement local stock state immediately
    setProducts((prev) =>
      prev.map((p) => {
        const itemInCart = cart.find((c) => c.item_code === p.item_code);
        if (!itemInCart) return p;
        const dec = itemInCart.quantity;
        const s1 = sellingPoint === 'SP_001' ? Math.max(0, p.stock_s_001 - dec) : p.stock_s_001;
        const s2 = sellingPoint === 'SP_002' ? Math.max(0, p.stock_s_002 - dec) : p.stock_s_002;
        return {
          ...p,
          stock_s_001: s1,
          stock_s_002: s2,
          total_stock: s1 + s2 + p.central_stock,
        };
      })
    );

    const receiptObj: SaleReceipt = {
      bill_no: billNo,
      date: new Date().toLocaleString(),
      selling_point: sellingPoint === 'SP_001' ? 'Counter 1 (Store 1)' : 'Counter 2 (Store 2)',
      cashier: 'POS Cashier 01',
      customer_name: customerName.trim() || 'Walk-in Customer',
      items: [...cart],
      subtotal,
      discount: discountAmount,
      tax: taxAmount,
      total: grandTotal,
      payment_mode: paymentMode,
      tendered: paymentMode === 'Cash' ? (tenderedVal > 0 ? tenderedVal : grandTotal) : undefined,
      change: paymentMode === 'Cash' ? changeDue : undefined,
    };

    setReceipt(receiptObj);

    // Append to recent transactions
    setRecentTxns((prev) => [
      {
        id: `tx_${Date.now()}`,
        bill_no: billNo,
        timestamp: new Date().toISOString(),
        customer_name: customerName.trim() || 'Walk-in Customer',
        total_amount: grandTotal,
        payment_mode: paymentMode,
      },
      ...prev,
    ]);

    clearCart();
  };

  return (
    <div className="min-h-screen bg-[#090a10] text-slate-100 flex flex-col font-sans">
      {/* Top Header Bar */}
      <header className="h-14 bg-[#10121d] border-b border-white/10 px-5 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center font-black text-white text-sm shadow-md">
            POS
          </div>
          <div>
            <div className="font-bold text-sm tracking-wide text-white flex items-center gap-2">
              ZOLEXORA POS
              <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Terminal Live
              </span>
            </div>
            <div className="text-[11px] text-slate-400">High-Speed Register & D1 Edge Sync</div>
          </div>
        </div>

        {/* Counter & Selling Point Switcher */}
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-lg border border-white/10">
            <Store className="w-3.5 h-3.5 text-indigo-400" />
            <select
              value={sellingPoint}
              onChange={(e) => setSellingPoint(e.target.value)}
              className="bg-transparent text-white font-medium outline-hidden cursor-pointer"
            >
              <option value="SP_001" className="bg-[#10121d] text-white">
                SP_001 — Main Branch Counter 1
              </option>
              <option value="SP_002" className="bg-[#10121d] text-white">
                SP_002 — Outlet Counter 2
              </option>
            </select>
          </div>

          <div className="flex items-center gap-2 text-slate-400 font-mono bg-white/5 px-3 py-1.5 rounded-lg border border-white/10">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>{currentTime}</span>
          </div>

          <button
            onClick={() => setDrawerOpen(true)}
            className="flex items-center gap-1.5 bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-lg border border-white/10 text-slate-200 transition"
          >
            <History className="w-3.5 h-3.5 text-indigo-400" />
            <span>Orders ({recentTxns.length})</span>
          </button>

          <button
            onClick={fetchData}
            title="Refresh D1 stock"
            className="p-2 bg-white/5 hover:bg-white/10 rounded-lg border border-white/10 text-slate-400 hover:text-white transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-indigo-400' : ''}`} />
          </button>
        </div>
      </header>

      {/* Main Workspace Layout: Split Catalog & Register */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Side: Product Catalog & Fast Lookup */}
        <section className="flex-1 flex flex-col min-w-0 border-r border-white/10 bg-[#0c0d16]">
          {/* Search & Category Filter Toolbar */}
          <div className="p-4 border-b border-white/10 bg-[#10121d]/80 space-y-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Scan barcode or search by item code, product title... (Press / to focus)"
                className="w-full bg-[#181b29] border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
              {categories.map((cat) => {
                const active = selectedCategory === cat;
                return (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition ${
                      active
                        ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                        : 'bg-white/5 hover:bg-white/10 text-slate-400 hover:text-slate-200 border border-white/5'
                    }`}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Product Cards Grid */}
          <div className="flex-1 overflow-y-auto p-4">
            {filteredProducts.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center text-slate-500 gap-2">
                <AlertCircle className="w-8 h-8 text-slate-600" />
                <p className="text-sm">No items matching "{searchQuery}"</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {filteredProducts.map((prod) => {
                  const currentStoreStock =
                    sellingPoint === 'SP_001' ? prod.stock_s_001 : prod.stock_s_002;
                  const isOutOfStock = currentStoreStock <= 0;
                  const isLowStock = currentStoreStock > 0 && currentStoreStock <= 5;

                  return (
                    <div
                      key={prod.item_code}
                      onClick={() => !isOutOfStock && addToCart(prod)}
                      className={`group p-3.5 rounded-xl border transition flex flex-col justify-between select-none ${
                        isOutOfStock
                          ? 'bg-white/[0.02] border-white/5 opacity-50 cursor-not-allowed'
                          : 'bg-[#121420] hover:bg-[#181b2a] border-white/5 hover:border-indigo-500/40 hover:shadow-lg hover:shadow-indigo-950/40 cursor-pointer'
                      }`}
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-[11px] font-semibold text-indigo-400 group-hover:text-indigo-300">
                            {prod.item_code}
                          </span>
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded-md font-medium ${
                              isOutOfStock
                                ? 'bg-rose-500/20 text-rose-300'
                                : isLowStock
                                ? 'bg-amber-500/20 text-amber-300'
                                : 'bg-emerald-500/15 text-emerald-400'
                            }`}
                          >
                            {isOutOfStock ? 'Out of Stock' : `${currentStoreStock} ${prod.uom}`}
                          </span>
                        </div>

                        <h3 className="text-xs font-medium text-slate-200 line-clamp-2 leading-snug group-hover:text-white">
                          {prod.description}
                        </h3>
                        <div className="text-[10px] text-slate-500">{prod.category}</div>
                      </div>

                      <div className="mt-3 pt-2 border-t border-white/5 flex items-center justify-between">
                        <div className="text-sm font-bold text-white">
                          ₹{prod.rate.toLocaleString('en-IN')}
                        </div>
                        <button
                          disabled={isOutOfStock}
                          className="p-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600 group-hover:text-white text-indigo-300 transition"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* Right Side: Register & Checkout Cart */}
        <aside className="w-96 flex flex-col bg-[#10121d] flex-shrink-0">
          {/* Cart Header */}
          <div className="p-4 border-b border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-indigo-400" />
              <h2 className="font-bold text-sm text-white">Active Register Cart</h2>
              <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-600/20 text-indigo-300 font-mono font-medium">
                {cart.reduce((acc, i) => acc + i.quantity, 0)}
              </span>
            </div>
            {cart.length > 0 && (
              <button
                onClick={clearCart}
                className="text-xs text-rose-400 hover:text-rose-300 hover:underline transition"
              >
                Clear Cart
              </button>
            )}
          </div>

          {/* Customer Input */}
          <div className="px-4 py-2.5 bg-white/2 border-b border-white/5 flex items-center gap-2">
            <label className="text-[11px] text-slate-400 whitespace-nowrap">Customer:</label>
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Walk-in Customer / Phone"
              className="flex-1 bg-transparent text-xs text-white placeholder-slate-500 outline-hidden focus:border-b focus:border-indigo-400"
            />
          </div>

          {/* Cart Items List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-500 text-center space-y-2">
                <ShoppingCart className="w-10 h-10 text-slate-700 stroke-[1.5]" />
                <p className="text-xs">Cart is empty</p>
                <p className="text-[11px] text-slate-600">
                  Select products from the catalog to start checkout
                </p>
              </div>
            ) : (
              cart.map((item) => (
                <div
                  key={item.item_code}
                  className="p-3 bg-[#151724] border border-white/5 rounded-xl space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="text-xs font-medium text-white line-clamp-1">
                      {item.description}
                    </div>
                    <button
                      onClick={() => removeFromCart(item.item_code)}
                      className="text-slate-500 hover:text-rose-400 p-0.5 transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="text-xs text-slate-400">
                      ₹{item.rate.toLocaleString('en-IN')} each
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex items-center bg-white/5 border border-white/10 rounded-lg overflow-hidden">
                        <button
                          onClick={() => updateQuantity(item.item_code, -1)}
                          className="p-1.5 hover:bg-white/10 text-slate-300"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-7 text-center text-xs font-mono font-medium text-white">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.item_code, 1)}
                          className="p-1.5 hover:bg-white/10 text-slate-300"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                      <div className="w-16 text-right font-semibold text-xs text-white">
                        ₹{(item.rate * item.quantity).toLocaleString('en-IN')}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Pricing & Checkout Summary Panel */}
          <div className="p-4 border-t border-white/10 bg-[#141624] space-y-3">
            {/* Quick Discount selector */}
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="flex items-center gap-1">
                <Percent className="w-3 h-3 text-indigo-400" /> Apply Discount:
              </span>
              <div className="flex items-center gap-1">
                {[0, 5, 10, 15].map((pct) => (
                  <button
                    key={pct}
                    onClick={() => setDiscountPercent(pct)}
                    className={`px-2 py-0.5 rounded text-[11px] font-mono transition ${
                      discountPercent === pct
                        ? 'bg-indigo-600 text-white'
                        : 'bg-white/5 hover:bg-white/10 text-slate-400'
                    }`}
                  >
                    {pct}%
                  </button>
                ))}
              </div>
            </div>

            {/* Calculations */}
            <div className="space-y-1.5 text-xs text-slate-400 border-t border-white/5 pt-2">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="font-mono text-slate-200">₹{subtotal.toFixed(2)}</span>
              </div>
              {discountPercent > 0 && (
                <div className="flex justify-between text-emerald-400">
                  <span>Discount ({discountPercent}%)</span>
                  <span className="font-mono">-₹{discountAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Estimated GST / Tax (18%)</span>
                <span className="font-mono text-slate-200">₹{taxAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-baseline text-sm font-bold text-white border-t border-white/10 pt-2">
                <span>TOTAL DUE</span>
                <span className="text-lg text-emerald-400 font-mono">
                  ₹{grandTotal.toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            {/* Payment Method Selector */}
            <div className="space-y-1.5 pt-1">
              <label className="text-[11px] text-slate-400 font-medium">Payment Mode</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentMode('Cash')}
                  className={`py-2 rounded-xl flex flex-col items-center gap-1 border transition text-xs font-medium ${
                    paymentMode === 'Cash'
                      ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/30'
                      : 'bg-white/5 text-slate-400 border-white/10 hover:bg-white/10'
                  }`}
                >
                  <Banknote className="w-4 h-4" />
                  <span>Cash</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMode('Card')}
                  className={`py-2 rounded-xl flex flex-col items-center gap-1 border transition text-xs font-medium ${
                    paymentMode === 'Card'
                      ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/30'
                      : 'bg-white/5 text-slate-400 border-white/10 hover:bg-white/10'
                  }`}
                >
                  <CreditCard className="w-4 h-4" />
                  <span>Card</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMode('UPI')}
                  className={`py-2 rounded-xl flex flex-col items-center gap-1 border transition text-xs font-medium ${
                    paymentMode === 'UPI'
                      ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/30'
                      : 'bg-white/5 text-slate-400 border-white/10 hover:bg-white/10'
                  }`}
                >
                  <QrCode className="w-4 h-4" />
                  <span>UPI / QR</span>
                </button>
              </div>
            </div>

            {/* Cash Tendered & Change Due (If Cash selected) */}
            {paymentMode === 'Cash' && cart.length > 0 && (
              <div className="p-2.5 bg-white/5 border border-white/10 rounded-xl space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Cash Tendered:</span>
                  <input
                    type="number"
                    value={cashTendered}
                    onChange={(e) => setCashTendered(e.target.value)}
                    placeholder={grandTotal.toString()}
                    className="w-28 bg-[#181b29] border border-white/10 rounded-lg px-2 py-1 text-right text-xs text-white font-mono outline-hidden focus:border-indigo-400"
                  />
                </div>
                {tenderedVal > 0 && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Change Due:</span>
                    <span
                      className={`font-mono font-bold ${
                        tenderedVal >= grandTotal ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      ₹{changeDue.toFixed(2)}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Complete Sale Button */}
            <button
              disabled={cart.length === 0}
              onClick={handleCheckout}
              className={`w-full py-3 rounded-xl font-bold text-sm tracking-wide transition flex items-center justify-center gap-2 shadow-xl ${
                cart.length === 0
                  ? 'bg-white/10 text-slate-500 cursor-not-allowed'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/30'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>COMPLETE SALE (₹{grandTotal.toLocaleString('en-IN')})</span>
            </button>
          </div>
        </aside>
      </div>

      {/* Modals & Drawers */}
      <ReceiptModal receipt={receipt} onClose={() => setReceipt(null)} />
      <RecentSalesDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        transactions={recentTxns}
        onSelectTxn={(txn) => {
          setDrawerOpen(false);
          setReceipt({
            bill_no: txn.bill_no,
            date: new Date(txn.timestamp).toLocaleString(),
            selling_point: 'Selling Point',
            cashier: 'Cashier',
            customer_name: txn.customer_name,
            items: [],
            subtotal: txn.total_amount,
            tax: 0,
            discount: 0,
            total: txn.total_amount,
            payment_mode: txn.payment_mode,
          });
        }}
      />
    </div>
  );
}
