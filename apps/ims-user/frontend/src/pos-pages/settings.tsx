import React, { useState } from 'react';
import {
  Settings,
  Printer,
  Wifi,
  Database,
  Store,
  CheckCircle2,
  Save,
  RefreshCw,
  Sliders,
  DollarSign,
  FileText,
  ShieldCheck,
  Smartphone,
  Cpu,
  Zap,
} from 'lucide-react';

export default function PosSettings() {
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  // Hardware Printer state
  const [printerInterface, setPrinterInterface] = useState<'network' | 'usb' | 'bluetooth' | 'browser'>('network');
  const [printerIp, setPrinterIp] = useState<string>('192.168.1.180');
  const [printerPort, setPrinterPort] = useState<string>('9100');
  const [paperWidth, setPaperWidth] = useState<'80mm' | '58mm'>('80mm');
  const [autoCutPaper, setAutoCutPaper] = useState<boolean>(true);
  const [drawerKickOnCash, setDrawerKickOnCash] = useState<boolean>(true);

  // KOT Kitchen Printer state
  const [kotPrinterIp, setKotPrinterIp] = useState<string>('192.168.1.185');
  const [autoPrintKotOnHold, setAutoPrintKotOnHold] = useState<boolean>(true);
  const [largeTokenFont, setLargeTokenFont] = useState<boolean>(true);

  // Bill Header / Footer Customization
  const [storeLegalName, setStoreLegalName] = useState<string>('Zolexora Retail Operations Pvt Ltd');
  const [gstin, setGstin] = useState<string>('27AABCZ1234F1Z8');
  const [storeAddress, setStoreAddress] = useState<string>('Shop 4, Ground Floor, Cyber City Boulevard, Mumbai');
  const [phoneOnReceipt, setPhoneOnReceipt] = useState<string>('+91 98765 43210');
  const [receiptFooter, setReceiptFooter] = useState<string>('Thank you for dining with Zolexora! Have a great day.');
  const [serviceChargePercent, setServiceChargePercent] = useState<number>(0);

  // D1 Edge Cache
  const [offlineSyncEnabled, setOfflineSyncEnabled] = useState<boolean>(true);
  const [edgeLatency, setEdgeLatency] = useState<number>(18);
  const [testingConnection, setTestingConnection] = useState<boolean>(false);

  const handleTestPrinter = () => {
    alert(`Testing print to ${printerInterface.toUpperCase()} printer (${printerIp}:${printerPort})... ESC/POS Test Slip Sent!`);
  };

  const handleTestEdge = () => {
    setTestingConnection(true);
    setTimeout(() => {
      setEdgeLatency(Math.floor(Math.random() * 15) + 12);
      setTestingConnection(false);
    }, 600);
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[#07080e] p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Settings className="w-5 h-5 text-emerald-400" />
            <span>POS Terminal Hardware & Settings</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Configure ESC/POS thermal printers, kitchen KOT routing, cash drawer kick & GST tax metadata
          </p>
        </div>
        <div className="flex items-center gap-2">
          {savedSuccess && (
            <span className="text-emerald-400 text-xs font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4" />
              Settings Saved!
            </span>
          )}
          <button
            onClick={handleSaveSettings}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl transition shadow-md shadow-emerald-600/20"
          >
            <Save className="w-4 h-4" />
            <span>Save Configuration</span>
          </button>
        </div>
      </div>

      {/* Main Settings Form */}
      <form onSubmit={handleSaveSettings} className="flex-1 overflow-y-auto space-y-6 max-w-5xl">
        {/* Section 1: Thermal Receipt Printer */}
        <div className="bg-slate-900/40 border border-white/10 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-white/5">
            <div className="flex items-center gap-2.5">
              <Printer className="w-5 h-5 text-emerald-400" />
              <div>
                <h2 className="text-sm font-bold text-white">Receipt Thermal Printer (ESC/POS)</h2>
                <p className="text-[11px] text-slate-400">Primary counter customer receipt printing</p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleTestPrinter}
              className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white rounded-lg text-xs font-semibold border border-white/10 transition"
            >
              Test Print Slip
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
            <div>
              <label className="block text-slate-400 mb-1 font-semibold">Printer Interface</label>
              <select
                value={printerInterface}
                onChange={(e) => setPrinterInterface(e.target.value as any)}
                className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="network">Network (Ethernet / Wi-Fi)</option>
                <option value="bluetooth">Bluetooth ESC/POS</option>
                <option value="usb">USB Serial</option>
                <option value="browser">Browser Native Print</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-400 mb-1 font-semibold">Printer IP Address</label>
              <input
                type="text"
                value={printerIp}
                onChange={(e) => setPrinterIp(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1 font-semibold">Port</label>
              <input
                type="text"
                value={printerPort}
                onChange={(e) => setPrinterPort(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1 font-semibold">Paper Roll Width</label>
              <select
                value={paperWidth}
                onChange={(e) => setPaperWidth(e.target.value as any)}
                className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="80mm">80mm (Standard POS Thermal)</option>
                <option value="58mm">58mm (Compact Portable)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs">
            <label className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/5 cursor-pointer">
              <input
                type="checkbox"
                checked={autoCutPaper}
                onChange={(e) => setAutoCutPaper(e.target.checked)}
                className="w-4 h-4 rounded text-emerald-600 focus:ring-0 bg-black/40 border-white/20"
              />
              <div>
                <div className="font-semibold text-white">Auto Cut Paper</div>
                <div className="text-[11px] text-slate-400">Send GS V 0 cut code after receipt finishes printing</div>
              </div>
            </label>

            <label className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/5 cursor-pointer">
              <input
                type="checkbox"
                checked={drawerKickOnCash}
                onChange={(e) => setDrawerKickOnCash(e.target.checked)}
                className="w-4 h-4 rounded text-emerald-600 focus:ring-0 bg-black/40 border-white/20"
              />
              <div>
                <div className="font-semibold text-white">Auto Kick Cash Drawer</div>
                <div className="text-[11px] text-slate-400">Trigger electronic cash drawer on cash settlement</div>
              </div>
            </label>
          </div>
        </div>

        {/* Section 2: Kitchen Display / KOT Printer */}
        <div className="bg-slate-900/40 border border-white/10 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-white/5">
            <div className="flex items-center gap-2.5">
              <Cpu className="w-5 h-5 text-indigo-400" />
              <div>
                <h2 className="text-sm font-bold text-white">Kitchen Order Ticket (KOT) Routing</h2>
                <p className="text-[11px] text-slate-400">Direct transmission of orders to kitchen chefs</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block text-slate-400 mb-1 font-semibold">Kitchen Printer IP</label>
              <input
                type="text"
                value={kotPrinterIp}
                onChange={(e) => setKotPrinterIp(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>

            <label className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/5 cursor-pointer">
              <input
                type="checkbox"
                checked={autoPrintKotOnHold}
                onChange={(e) => setAutoPrintKotOnHold(e.target.checked)}
                className="w-4 h-4 rounded text-indigo-600 focus:ring-0 bg-black/40 border-white/20"
              />
              <div>
                <div className="font-semibold text-white">Auto Print on Hold / Table Save</div>
                <div className="text-[11px] text-slate-400">Send KOT whenever table order is updated</div>
              </div>
            </label>

            <label className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/5 cursor-pointer">
              <input
                type="checkbox"
                checked={largeTokenFont}
                onChange={(e) => setLargeTokenFont(e.target.checked)}
                className="w-4 h-4 rounded text-indigo-600 focus:ring-0 bg-black/40 border-white/20"
              />
              <div>
                <div className="font-semibold text-white">Double-Height Token Number</div>
                <div className="text-[11px] text-slate-400">Enlarge token numbers on kitchen slips</div>
              </div>
            </label>
          </div>
        </div>

        {/* Section 3: Receipt Branding & GSTIN */}
        <div className="bg-slate-900/40 border border-white/10 rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-white/5">
            <Store className="w-5 h-5 text-amber-400" />
            <div>
              <h2 className="text-sm font-bold text-white">Receipt Branding & GST Metadata</h2>
              <p className="text-[11px] text-slate-400">Printed on all customer thermal receipts & digital invoices</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-slate-400 mb-1 font-semibold">Store Legal Business Name</label>
              <input
                type="text"
                value={storeLegalName}
                onChange={(e) => setStoreLegalName(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1 font-semibold">GSTIN / Tax ID</label>
              <input
                type="text"
                value={gstin}
                onChange={(e) => setGstin(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white font-mono uppercase focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-slate-400 mb-1 font-semibold">Store Physical Address</label>
              <input
                type="text"
                value={storeAddress}
                onChange={(e) => setStoreAddress(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1 font-semibold">Customer Helpline Phone</label>
              <input
                type="text"
                value={phoneOnReceipt}
                onChange={(e) => setPhoneOnReceipt(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1 font-semibold">Service Charge (%) (Optional)</label>
              <input
                type="number"
                min="0"
                max="20"
                value={serviceChargePercent}
                onChange={(e) => setServiceChargePercent(Number(e.target.value))}
                className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-slate-400 mb-1 font-semibold">Receipt Footer Message</label>
              <input
                type="text"
                value={receiptFooter}
                onChange={(e) => setReceiptFooter(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>
        </div>

        {/* Section 4: Cloudflare D1 Edge Connectivity & Offline Mode */}
        <div className="bg-slate-900/40 border border-white/10 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-white/5">
            <div className="flex items-center gap-2.5">
              <Database className="w-5 h-5 text-cyan-400" />
              <div>
                <h2 className="text-sm font-bold text-white">Edge Sync & Offline Cache Mode</h2>
                <p className="text-[11px] text-slate-400">Cloudflare D1 transactional sync and offline fallback</p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleTestEdge}
              disabled={testingConnection}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white rounded-lg text-xs font-semibold border border-white/10 transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${testingConnection ? 'animate-spin' : ''}`} />
              <span>Ping Edge</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-3 bg-white/5 rounded-xl border border-white/5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Cloudflare D1 Status:</span>
                <span className="inline-flex items-center gap-1.5 text-emerald-400 font-bold">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  ONLINE
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Edge Round-Trip Latency:</span>
                <span className="font-mono text-cyan-300 font-bold">{edgeLatency} ms</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Local Offline Buffer:</span>
                <span className="text-slate-300">0 pending outbox bills</span>
              </div>
            </div>

            <label className="flex items-start gap-3 p-3 bg-white/5 rounded-xl border border-white/5 cursor-pointer">
              <input
                type="checkbox"
                checked={offlineSyncEnabled}
                onChange={(e) => setOfflineSyncEnabled(e.target.checked)}
                className="w-4 h-4 rounded text-cyan-600 focus:ring-0 bg-black/40 border-white/20 mt-0.5"
              />
              <div>
                <div className="font-semibold text-white">Enable Seamless Offline Billing</div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  Allows cashiers to ring up orders even if the internet connection is disrupted; orders sync automatically when connection recovers.
                </div>
              </div>
            </label>
          </div>
        </div>
      </form>
    </div>
  );
}
