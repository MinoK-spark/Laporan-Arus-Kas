import React, { useState, useEffect } from 'react';
import { 
  X, 
  Check, 
  Building, 
  ArrowDownLeft, 
  ArrowUpRight, 
  Calendar, 
  FileText, 
  Target, 
  Coins, 
  AlertTriangle 
} from 'lucide-react';
import { formatRupiah, formatNominalInput, parseRupiahInput } from '../utils/formatters';

export function EditTransactionModal({
  isOpen,
  onClose,
  transaction,
  banks = [],
  forecasts = [],
  onSave,
  isViewer = false
}) {
  if (!isOpen || !transaction) return null;

  const [bankId, setBankId] = useState(transaction.bankId || banks[0]?.id || '');
  const [tipe, setTipe] = useState(transaction.tipe || 'pengeluaran');
  const [tanggal, setTanggal] = useState(transaction.tanggal || new Date().toISOString().split('T')[0]);
  const [deskripsi, setDeskripsi] = useState(transaction.deskripsi || '');
  const [nominalDisplay, setNominalDisplay] = useState(formatNominalInput(String(transaction.nominal || '')));
  const [planId, setPlanId] = useState(transaction.planId || 'unplanned');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (transaction) {
      setBankId(transaction.bankId || banks[0]?.id || '');
      setTipe(transaction.tipe || 'pengeluaran');
      setTanggal(transaction.tanggal || new Date().toISOString().split('T')[0]);
      setDeskripsi(transaction.deskripsi || '');
      setNominalDisplay(formatNominalInput(String(transaction.nominal || '')));
      setPlanId(transaction.planId || 'unplanned');
      setErrorMsg('');
    }
  }, [transaction, banks]);

  const handleNominalChange = (e) => {
    const raw = e.target.value;
    setNominalDisplay(formatNominalInput(raw));
  };

  // Filter forecasts matching current tipe
  const availablePlans = forecasts.filter(f => f.tipe === tipe);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isViewer) return;

    const parsedNom = parseRupiahInput(nominalDisplay);
    if (!deskripsi.trim()) {
      setErrorMsg('Deskripsi transaksi wajib diisi.');
      return;
    }
    if (isNaN(parsedNom) || parsedNom <= 0) {
      setErrorMsg('Nominal transaksi harus lebih dari 0.');
      return;
    }

    const updatedFields = {
      bankId,
      tipe,
      tanggal,
      deskripsi: deskripsi.trim(),
      nominal: parsedNom,
      planId
    };

    onSave(updatedFields);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-150 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200 my-auto">
        
        {/* Header */}
        <div className="px-5 py-4 bg-corporate-900 text-white flex items-center justify-between border-b border-corporate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-corporate-200">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold tracking-tight">Edit Data Mutasi Kas</h3>
              <p className="text-[11px] text-corporate-300">Sesuaikan rekening, tipe, nominal, dan tanggal transaksi</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-corporate-300 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4">
          
          {errorMsg && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-xs text-rose-700 font-semibold">
              <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* 1. Pilih Rekening Bank / Kas */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5 flex items-center gap-1.5">
              <Building className="w-3.5 h-3.5 text-corporate-600" />
              Pilihan Rekening Bank / Kas
            </label>
            <select
              value={bankId}
              onChange={(e) => setBankId(e.target.value)}
              className="w-full px-3 py-2.5 text-xs sm:text-sm font-semibold bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:ring-2 focus:ring-corporate-500 cursor-pointer"
              required
            >
              {banks.map(b => (
                <option key={b.id} value={b.id}>
                  {b.tipeAkun === 'kas' ? '💵 [Kas]' : '🏦 [Bank]'} {b.name}
                </option>
              ))}
            </select>
          </div>

          {/* 2. Jenis Mutasi */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              Jenis Mutasi
            </label>
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl border border-slate-200/80">
              <button
                type="button"
                onClick={() => {
                  setTipe('pemasukan');
                  if (planId !== 'unplanned') {
                    const exists = forecasts.some(f => f.id === planId && f.tipe === 'pemasukan');
                    if (!exists) setPlanId('unplanned');
                  }
                }}
                className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  tipe === 'pemasukan' 
                    ? 'bg-emerald-600 text-white shadow-xs' 
                    : 'text-slate-600 hover:bg-slate-200/60'
                }`}
              >
                <ArrowDownLeft className="w-4 h-4" /> Pemasukan (Masuk)
              </button>
              <button
                type="button"
                onClick={() => {
                  setTipe('pengeluaran');
                  if (planId !== 'unplanned') {
                    const exists = forecasts.some(f => f.id === planId && f.tipe === 'pengeluaran');
                    if (!exists) setPlanId('unplanned');
                  }
                }}
                className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  tipe === 'pengeluaran' 
                    ? 'bg-rose-600 text-white shadow-xs' 
                    : 'text-slate-600 hover:bg-slate-200/60'
                }`}
              >
                <ArrowUpRight className="w-4 h-4" /> Pengeluaran (Keluar)
              </button>
            </div>
          </div>

          {/* 3. Tanggal & Nominal */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-corporate-600" />
                Tanggal Transaksi
              </label>
              <input
                type="date"
                value={tanggal}
                onChange={(e) => setTanggal(e.target.value)}
                className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-corporate-500 font-medium"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5 flex items-center gap-1.5">
                <Coins className="w-3.5 h-3.5 text-corporate-600" />
                Nominal (Rp)
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-xs font-bold text-slate-500">Rp</span>
                <input
                  type="text"
                  value={nominalDisplay}
                  onChange={handleNominalChange}
                  placeholder="0"
                  className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm font-mono-num font-bold bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-corporate-500 text-slate-900"
                  required
                />
              </div>
            </div>
          </div>

          {/* 4. Deskripsi Transaksi */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-corporate-600" />
              Deskripsi / Uraian Transaksi
            </label>
            <input
              type="text"
              value={deskripsi}
              onChange={(e) => setDeskripsi(e.target.value)}
              placeholder="Contoh: Pembelian perlengkapan kantor..."
              className="w-full px-3 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-corporate-500 font-semibold text-slate-900"
              required
            />
          </div>

          {/* 5. Target Forecast */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5 flex items-center gap-1.5">
              <Target className="w-3.5 h-3.5 text-corporate-600" />
              Alokasi Rencana Forecast
            </label>
            <select
              value={planId}
              onChange={(e) => setPlanId(e.target.value)}
              className={`w-full px-3 py-2 text-xs rounded-xl font-medium border focus:ring-2 focus:ring-corporate-500 cursor-pointer ${
                planId === 'unplanned'
                  ? 'bg-rose-50/70 border-rose-300 text-rose-900'
                  : 'bg-slate-50 border-slate-200 text-slate-800'
              }`}
            >
              <option value="unplanned">
                -- Transaksi Tambahan (Diluar Forecast / Anomali) --
              </option>
              {availablePlans.map((plan) => (
                <option key={plan.id} value={plan.id}>
                  {plan.deskripsi} ({formatRupiah(plan.nominal)})
                </option>
              ))}
            </select>
          </div>

          {/* Actions */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isViewer}
              className="px-5 py-2 text-xs font-bold text-white bg-corporate-900 hover:bg-navy-950 active:scale-95 rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              Simpan Perubahan
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
