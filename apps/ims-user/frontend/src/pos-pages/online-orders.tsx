import React, { useState, useEffect } from 'react';
import {
  Bike,
  UtensilsCrossed,
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  Phone,
  Printer,
  Sparkles,
  Volume2,
  VolumeX,
  RefreshCw,
  Power,
  ChevronRight,
  ShieldCheck,
  Gift,
  ExternalLink,
  Flame,
  IndianRupee,
} from 'lucide-react';
import { useAuth } from '../lib/auth-context';
import { useNavigate } from 'react-router-dom';

interface AggregatorOrder {
  id: string;
  platform: 'Swiggy' | 'Zomato' | 'Dineout' | 'ONDC';
  channel_color: string;
  order_time: string;
  customer_name: string;
  customer_phone: string;
  items: Array<{ name: string; qty: number; price: number; notes?: string }>;
  subtotal: number;
  tax: number;
  total_amount: number;
  payment_status: string;
  status: 'NEW' | 'ACCEPTED' | 'READY' | 'DISPATCHED' | 'CANCELLED';
  rider?: {
    name: string;
    phone: string;
    status: string;
    otp: string;
  };
  table_no?: string;
  prep_time_mins: number;
}

const INITIAL_ORDERS: AggregatorOrder[] = [
  {
    id: 'SW-4892',
    platform: 'Swiggy',
    channel_color: 'bg-orange-500 text-white',
    order_time: '2 mins ago',
    customer_name: 'Aditya Sharma',
    customer_phone: '+91 98200 11223',
    items: [
      { name: 'Oat Milk Cappuccino', qty: 2, price: 220, notes: 'Less ice, extra cinnamon' },
      { name: 'Butter Croissant Flaky', qty: 2, price: 160 },
    ],
    subtotal: 760.0,
    tax: 38.0,
    total_amount: 798.0,
    payment_status: 'Paid Online (Swiggy Money)',
    status: 'NEW',
    rider: { name: 'Manoj Kumar', phone: '+91 97110 33445', status: 'En Route to Store (4 mins)', otp: '4892' },
    prep_time_mins: 15,
  },
  {
    id: 'ZM-8102',
    platform: 'Zomato',
    channel_color: 'bg-rose-600 text-white',
    order_time: '7 mins ago',
    customer_name: 'Priyanka Joshi',
    customer_phone: '+91 91234 88776',
    items: [
      { name: 'Tandoori Paneer Roll', qty: 2, price: 240, notes: 'Mint chutney separate' },
      { name: 'Parmesan Truffle Fries', qty: 1, price: 220 },
    ],
    subtotal: 700.0,
    tax: 35.0,
    total_amount: 735.0,
    payment_status: 'Paid Online (Zomato Pay)',
    status: 'ACCEPTED',
    rider: { name: 'Deepak Yadav', phone: '+91 99882 11002', status: 'Arrived at Store Counter', otp: '8102' },
    prep_time_mins: 20,
  },
  {
    id: 'DO-3019',
    platform: 'Dineout',
    channel_color: 'bg-purple-600 text-white',
    order_time: '12 mins ago',
    customer_name: 'Karan Singhal',
    customer_phone: '+91 98450 77661',
    items: [
      { name: 'Smoked Salmon Bagel', qty: 1, price: 380 },
      { name: 'Artisan Espresso Single', qty: 2, price: 140 },
    ],
    subtotal: 660.0,
    tax: 33.0,
    total_amount: 693.0,
    payment_status: 'Pre-paid (Dineout Pay - 20% Applied)',
    status: 'READY',
    table_no: 'T-03',
    prep_time_mins: 10,
  },
  {
    id: 'SW-4889',
    platform: 'Swiggy',
    channel_color: 'bg-orange-500 text-white',
    order_time: '26 mins ago',
    customer_name: 'Rohan Mehta',
    customer_phone: '+91 98331 44556',
    items: [{ name: 'Belgian Fudge Brownie', qty: 3, price: 180 }],
    subtotal: 540.0,
    tax: 27.0,
    total_amount: 567.0,
    payment_status: 'Paid Online (UPI)',
    status: 'DISPATCHED',
    rider: { name: 'Sameer Khan', phone: '+91 91122 33441', status: 'Delivering to Customer', otp: '4889' },
    prep_time_mins: 15,
  },
];

interface PlatformState {
  id: string;
  name: string;
  status: 'Online' | 'Paused';
  active_orders: number;
  rating: number;
}

export default function PosOnlineOrders() {
  const navigate = useNavigate();
  const { authFetch } = useAuth();
  const [orders, setOrders] = useState<AggregatorOrder[]>(INITIAL_ORDERS);
  const [activeTab, setActiveTab] = useState<string>('All');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [platforms, setPlatforms] = useState<PlatformState[]>([
    { id: 'swiggy', name: 'Swiggy Delivery', status: 'Online', active_orders: 2, rating: 4.6 },
    { id: 'zomato', name: 'Zomato Delivery', status: 'Online', active_orders: 1, rating: 4.8 },
    { id: 'dineout', name: 'Swiggy Dineout', status: 'Online', active_orders: 1, rating: 4.7 },
    { id: 'zomato_gold', name: 'Zomato Gold Privilege', status: 'Online', active_orders: 0, rating: 4.9 },
    { id: 'ondc', name: 'ONDC Network', status: 'Online', active_orders: 0, rating: 4.5 },
  ]);

  // Dining Benefit modal
  const [showGoldModal, setShowGoldModal] = useState<boolean>(false);
  const [memberCode, setMemberCode] = useState<string>('GOLD15');
  const [checkBillAmount, setCheckBillAmount] = useState<number>(1450);
  const [verifyResult, setVerifyResult] = useState<any>(null);

  const fetchLiveState = async () => {
    try {
      const pRes = await authFetch('/api/v1/aggregator/platforms');
      if (pRes.ok) {
        const pData = await pRes.json();
        setPlatforms(pData);
      }
      const oRes = await authFetch('/api/v1/aggregator/orders');
      if (oRes.ok) {
        const oData = await oRes.json();
        if (Array.isArray(oData) && oData.length > 0) {
          setOrders(oData);
        }
      }
    } catch {}
  };

  useEffect(() => {
    fetchLiveState();
    const interval = setInterval(fetchLiveState, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleTogglePlatform = async (platformId: string) => {
    setPlatforms((prev) =>
      prev.map((p) =>
        p.id === platformId ? { ...p, status: p.status === 'Online' ? 'Paused' : 'Online' } : p
      )
    );
    try {
      await authFetch(`/api/v1/aggregator/platforms/${platformId}/toggle`, { method: 'POST' });
    } catch {}
  };

  const handleUpdateOrderStatus = async (orderId: string, newStatus: AggregatorOrder['status']) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
    );
    try {
      await authFetch(`/api/v1/aggregator/orders/${orderId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
    } catch {}
  };

  const handleVerifyBenefit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await authFetch('/api/v1/aggregator/dining-benefit/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform: 'Zomato Gold',
          membership_code: memberCode,
          bill_amount: checkBillAmount,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setVerifyResult(data);
      }
    } catch {
      // Fallback local calc
      const discount = Math.min(checkBillAmount * 0.15, 300);
      setVerifyResult({
        valid: true,
        platform: 'Zomato Gold',
        benefit_title: 'Zomato Gold 15% Dining Privilege',
        discount_percent: 15,
        discount_amount: discount,
        net_payable: checkBillAmount - discount,
      });
    }
  };

  const filteredOrders = orders.filter((o) => {
    if (activeTab === 'New') return o.status === 'NEW';
    if (activeTab === 'Preparing') return o.status === 'ACCEPTED';
    if (activeTab === 'Ready') return o.status === 'READY';
    if (activeTab === 'Dispatched') return o.status === 'DISPATCHED';
    return true;
  });

  const newOrdersCount = orders.filter((o) => o.status === 'NEW').length;

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[#07080e] p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Bike className="w-5 h-5 text-orange-400" />
            <span>Online Platforms Aggregator (Swiggy • Zomato • Dineout • ONDC)</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Petpooja & UrbanPiper style unified delivery channels, live orders, rider dispatch & dining privileges
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition ${
              soundEnabled
                ? 'bg-emerald-600/20 text-emerald-300 border-emerald-500/30'
                : 'bg-white/5 text-slate-400 border-white/10'
            }`}
            title="Audio alerts on incoming order"
          >
            {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
            <span>{soundEnabled ? 'Chime ON' : 'Muted'}</span>
          </button>

          <button
            onClick={() => setShowGoldModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 text-white text-xs font-bold rounded-xl transition shadow-md shadow-amber-600/20"
          >
            <Gift className="w-4 h-4" />
            <span>Verify Zomato Gold / Dineout</span>
          </button>
        </div>
      </div>

      {/* Platform Channel Status Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {platforms.map((p) => {
          const isOnline = p.status === 'Online';
          return (
            <div
              key={p.id}
              className={`p-3 rounded-xl border transition-all flex flex-col justify-between ${
                isOnline ? 'bg-slate-900/60 border-white/10' : 'bg-rose-950/20 border-rose-500/30'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white truncate">{p.name}</span>
                <button
                  onClick={() => handleTogglePlatform(p.id)}
                  className={`w-6 h-6 rounded-full flex items-center justify-center transition ${
                    isOnline ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                  }`}
                  title={isOnline ? 'Pause Store' : 'Resume Store'}
                >
                  <Power className="w-3 h-3" />
                </button>
              </div>

              <div className="flex items-center justify-between text-[11px] mt-2 pt-2 border-t border-white/5">
                <span className="flex items-center gap-1 text-slate-400">
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'
                    }`}
                  />
                  {p.status}
                </span>
                <span className="font-mono text-slate-300 font-semibold">{p.active_orders} orders</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Order Status Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/40 p-2.5 rounded-xl border border-white/5">
        <div className="flex items-center gap-1 overflow-x-auto">
          {['All', 'New', 'Preparing', 'Ready', 'Dispatched'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === tab
                  ? 'bg-orange-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <span>{tab}</span>
              {tab === 'New' && newOrdersCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[10px] font-black animate-pulse">
                  {newOrdersCount}
                </span>
              )}
            </button>
          ))}
        </div>

        <button
          onClick={fetchLiveState}
          className="flex items-center gap-1 px-2.5 py-1 text-xs text-slate-400 hover:text-white transition"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Sync Now</span>
        </button>
      </div>

      {/* Orders Stream Grid */}
      <div className="flex-1 overflow-y-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredOrders.map((order) => {
          const isNew = order.status === 'NEW';
          const isAccepted = order.status === 'ACCEPTED';
          const isReady = order.status === 'READY';
          const isDispatched = order.status === 'DISPATCHED';

          return (
            <div
              key={order.id}
              className={`p-4 rounded-2xl border flex flex-col justify-between space-y-3 transition-all ${
                isNew
                  ? 'bg-orange-950/20 border-orange-500/50 shadow-lg shadow-orange-950/20'
                  : isAccepted
                  ? 'bg-slate-900/50 border-white/10'
                  : isReady
                  ? 'bg-emerald-950/20 border-emerald-500/40'
                  : 'bg-slate-900/30 border-white/5 opacity-80'
              }`}
            >
              {/* Order Card Header */}
              <div>
                <div className="flex items-center justify-between pb-2 border-b border-white/10">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded-md font-black text-[10px] uppercase tracking-wider ${
                        order.platform === 'Swiggy'
                          ? 'bg-orange-500 text-white'
                          : order.platform === 'Zomato'
                          ? 'bg-rose-600 text-white'
                          : order.platform === 'Dineout'
                          ? 'bg-purple-600 text-white'
                          : 'bg-blue-600 text-white'
                      }`}
                    >
                      {order.platform}
                    </span>
                    <span className="font-mono text-sm font-black text-white">{order.id}</span>
                  </div>

                  <span className="text-[11px] text-slate-400 flex items-center gap-1 font-mono">
                    <Clock className="w-3 h-3 text-slate-500" />
                    {order.order_time}
                  </span>
                </div>

                {/* Customer Details */}
                <div className="py-2 text-xs flex items-center justify-between text-slate-300">
                  <div className="font-semibold text-white">{order.customer_name}</div>
                  <div className="font-mono text-slate-400 text-[11px] flex items-center gap-1">
                    <Phone className="w-3 h-3 text-emerald-400" />
                    {order.customer_phone}
                  </div>
                </div>

                {/* Items list */}
                <div className="space-y-1.5 py-1 text-xs">
                  {order.items.map((it, idx) => (
                    <div key={idx} className="flex justify-between items-start text-slate-300">
                      <div>
                        <span className="font-bold text-white">{it.qty}x</span> {it.name}
                        {it.notes && (
                          <div className="text-[10px] text-amber-300 italic pl-4">
                            Note: {it.notes}
                          </div>
                        )}
                      </div>
                      <span className="font-mono text-slate-400">₹{it.price * it.qty}</span>
                    </div>
                  ))}
                </div>

                {/* Total & Payment */}
                <div className="pt-2 border-t border-white/5 flex items-center justify-between text-xs">
                  <span className="text-[11px] text-emerald-400 font-medium">{order.payment_status}</span>
                  <span className="font-mono font-black text-sm text-white">
                    ₹{order.total_amount.toFixed(2)}
                  </span>
                </div>

                {/* Rider Info if available */}
                {order.rider && (
                  <div className="mt-2.5 p-2.5 bg-black/40 rounded-xl border border-white/5 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 flex items-center gap-1 text-[11px]">
                        <Bike className="w-3.5 h-3.5 text-indigo-400" />
                        Rider: <strong className="text-white">{order.rider.name}</strong>
                      </span>
                      <span className="font-mono text-amber-300 font-black text-[11px]">
                        OTP: {order.rider.otp}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400">{order.rider.status}</div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="pt-2 space-y-1.5">
                {isNew && (
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => handleUpdateOrderStatus(order.id, 'ACCEPTED')}
                      className="py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition shadow-md shadow-emerald-600/25 flex items-center justify-center gap-1.5"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Accept & KOT</span>
                    </button>
                    <button
                      onClick={() => handleUpdateOrderStatus(order.id, 'CANCELLED')}
                      className="py-2.5 bg-white/5 hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 border border-white/10 rounded-xl text-xs font-semibold transition"
                    >
                      Reject
                    </button>
                  </div>
                )}

                {isAccepted && (
                  <button
                    onClick={() => handleUpdateOrderStatus(order.id, 'READY')}
                    className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs transition shadow-md shadow-indigo-600/20 flex items-center justify-center gap-1.5"
                  >
                    <UtensilsCrossed className="w-3.5 h-3.5" />
                    <span>Food Ready (Notify Rider)</span>
                  </button>
                )}

                {isReady && (
                  <button
                    onClick={() => handleUpdateOrderStatus(order.id, 'DISPATCHED')}
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition shadow-md shadow-emerald-600/20 flex items-center justify-center gap-1.5"
                  >
                    <Bike className="w-3.5 h-3.5" />
                    <span>Handover to Rider & Dispatch</span>
                  </button>
                )}

                {isDispatched && (
                  <div className="text-center text-[11px] text-slate-500 py-1 font-medium">
                    Order Picked up & Dispatched
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Zomato Gold / Dineout Verification Modal */}
      {showGoldModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#0f121d] border border-white/10 rounded-2xl p-6 w-full max-w-md space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Gift className="w-4 h-4 text-amber-400" />
                <span>Verify Dining Privileges (Zomato Gold / Dineout)</span>
              </h3>
              <button onClick={() => setShowGoldModal(false)} className="text-slate-400 hover:text-white">
                ✕
              </button>
            </div>

            <form onSubmit={handleVerifyBenefit} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-semibold">
                  Member Code / Coupon / Mobile
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. GOLD15, DINEOUT20, SWIGGYONE"
                  value={memberCode}
                  onChange={(e) => setMemberCode(e.target.value.toUpperCase())}
                  className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white font-mono uppercase focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Current Bill Amount (₹)</label>
                <input
                  type="number"
                  step="1"
                  required
                  value={checkBillAmount}
                  onChange={(e) => setCheckBillAmount(Number(e.target.value))}
                  className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl transition shadow-md shadow-amber-600/20"
                >
                  Verify Membership
                </button>
              </div>
            </form>

            {verifyResult && (
              <div
                className={`p-4 rounded-xl border space-y-2 text-xs ${
                  verifyResult.valid
                    ? 'bg-amber-950/20 border-amber-500/40 text-slate-200'
                    : 'bg-rose-950/20 border-rose-500/30 text-rose-300'
                }`}
              >
                {verifyResult.valid ? (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-amber-400 text-sm">{verifyResult.benefit_title}</span>
                      <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-bold">
                        VALID
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-t border-white/5">
                      <span>Discount (15%):</span>
                      <span className="font-mono font-bold text-emerald-400">-₹{verifyResult.discount_amount}</span>
                    </div>
                    <div className="flex justify-between py-1 border-t border-white/5">
                      <span>Final Payable:</span>
                      <span className="font-mono font-black text-white text-sm">₹{verifyResult.net_payable}</span>
                    </div>
                    <button
                      onClick={() => {
                        alert(`Applied ₹${verifyResult.discount_amount} discount from ${verifyResult.platform}!`);
                        setShowGoldModal(false);
                      }}
                      className="w-full mt-2 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg transition"
                    >
                      Apply to Active POS Bill
                    </button>
                  </>
                ) : (
                  <div>{verifyResult.message}</div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
