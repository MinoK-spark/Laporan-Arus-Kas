import React, { useState } from 'react';
import { X, DollarSign, Check } from 'lucide-react';
import { formatRupiah, parseRupiahInput } from '../utils/formatters';

export const InitialBalanceModal = ({ isOpen, onClose, currentSaldo, onSave }) => {
  const [val, setVal] = useState(new Intl.NumberFormat('id-ID').format(currentSaldo));

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    const num = parseRupiahInput(val);
    onSave(num);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/70 backdrop-blur-sm">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 relative animate-in fade-in zoom-in-95 duration-150">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-corporate-100 text-corporate-800 flex items-center justify-center font-bold">
            <DollarSign className="w-6 h-6 text-corporate-700" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">Sesuaikan Saldo Awal</h3>
            <p className="text-xs text-slate-500">Kas awal operasional internal PT Graha Prima Energi</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              Nominal Saldo Awal
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-sm font-bold text-slate-500">
                Rp
              </span>
              <input
                type="text"
                value={val}
                onChange={(e) => {
                  const num = parseRupiahInput(e.target.value);
                  setVal(new Intl.NumberFormat('id-ID').format(num));
                }}
                className="w-full pl-11 pr-3.5 py-2.5 text-base font-mono-num font-bold bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-corporate-500"
                autoFocus
              />
            </div>
            <p className="mt-1 text-xs text-corporate-600 font-mono-num">
              Terbaca: {formatRupiah(parseRupiahInput(val))}
            </p>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-bold text-white bg-corporate-800 hover:bg-corporate-900 rounded-xl flex items-center gap-1.5 shadow-sm transition-all"
            >
              <Check className="w-4 h-4" />
              <span>Simpan Perubahan</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
