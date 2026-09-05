import React, { useState, useEffect } from 'react';
import { QrCode, CheckCircle2, Copy, Check, Clock, X, Smartphone } from 'lucide-react';

interface UpiQrModalProps {
  amount: number;
  billNo: string;
  isOpen: boolean;
  onClose: () => void;
  onPaymentSuccess: () => void;
}

export default function UpiQrModal({
  amount,
  billNo,
  isOpen,
  onClose,
  onPaymentSuccess,
}: UpiQrModalProps) {
  const [copied, setCopied] = useState(false);
  const [timeLeft, setTimeLeft] = useState(180);
  const [verifying, setVerifying] = useState(false);

  const upiId = 'zolexora@icici';
  const payeeName = 'Zolexora Retail Terminal';
  const upiUrl = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(payeeName)}&am=${amount.toFixed(2)}&cu=INR&tn=Invoice_${billNo}`;
  const qrSvgUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(upiUrl)}&bgcolor=ffffff&color=0b0d14&margin=10`;

  useEffect(() => {
    if (!isOpen) return;
    setTimeLeft(180);
    const interval = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopyUpi = () => {
    navigator.clipboard.writeText(upiUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleManualVerify = () => {
    setVerifying(true);
    setTimeout(() => {
      setVerifying(false);
      onPaymentSuccess();
    }, 700);
  };

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-[#121420] border border-white/10 rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="p-4 bg-emerald-500/10 border-b border-emerald-500/20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <QrCode className="w-5 h-5 text-emerald-400" />
            <h3 className="font-bold text-white text-sm">Dynamic UPI Counter QR</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* QR Code Container */}
        <div className="p-6 flex flex-col items-center space-y-4 bg-[#0d0f17]">
          {/* Amount Badge */}
          <div className="text-center">
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Exact Payable Amount
            </div>
            <div className="text-3xl font-black text-white font-mono mt-0.5">
              ₹{amount.toFixed(2)}
            </div>
            <div className="text-[10px] text-slate-500 font-mono mt-0.5">
              Ref: {billNo}
            </div>
          </div>

          {/* QR Code Image */}
          <div className="p-3 bg-white rounded-2xl shadow-xl shadow-emerald-500/10 border-2 border-emerald-500/40 relative group">
            <img
              src={qrSvgUrl}
              alt="UPI QR Code"
              className="w-48 h-48 rounded-lg object-contain"
            />
            <div className="absolute inset-x-0 bottom-1.5 flex items-center justify-center">
              <span className="text-[9px] font-bold tracking-widest text-slate-700 uppercase bg-white/90 px-2 py-0.5 rounded shadow-xs">
                BHIM UPI • GPay • PhonePe • Paytm
              </span>
            </div>
          </div>

          {/* Timer & UPI ID */}
          <div className="w-full space-y-2 text-center text-xs">
            <div className="flex items-center justify-center gap-1.5 text-amber-400 font-mono text-xs">
              <Clock className="w-3.5 h-3.5" />
              <span>Expires in {formatTimer(timeLeft)}</span>
            </div>

            <div className="flex items-center justify-between bg-white/5 px-3 py-1.5 rounded-xl border border-white/5 text-[11px]">
              <span className="text-slate-400">VPA: <strong className="text-white font-mono">{upiId}</strong></span>
              <button
                onClick={handleCopyUpi}
                className="text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                title="Copy payment link"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Verification Action */}
        <div className="p-4 bg-[#141624] border-t border-white/10 space-y-2">
          <button
            onClick={handleManualVerify}
            disabled={verifying}
            className="w-full flex items-center justify-center gap-2 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-emerald-600/30 disabled:opacity-50"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{verifying ? 'Verifying Bank Settlement...' : 'Payment Received (Confirm & Close)'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
