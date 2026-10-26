import React, { useState, useEffect } from 'react';
import { 
  X, 
  Edit3, 
  CheckCircle2, 
  ArrowDownLeft, 
  ArrowUpRight, 
  Calendar, 
  Building,
  AlertTriangle 
} from 'lucide-react';
import { formatRupiah, formatNominalInput, parseRupiahInput } from '../utils/formatters';

export function EditForecastModal({
  isOpen,
  onClose,
  forecast,
  banks = [],
  onSave,
  isViewer = false
}) {
  if (!isOpen || !forecast) return null;

  const [tipe, setTipe] = useState(forecast.tipe || 'pengeluaran');
  const [deskripsi, setDeskripsi] = useState(forecast.deskripsi || '');
  const [nominalDisplay, setNominalDisplay] = useState(formatNominalInput(String(forecast.nominal || '')));
  const [periodeBulan, setPeriodeBulan] = useState(forecast.periodeBulan || '');
  const [bankId, setBankId] = useState(forecast.bankId || banks[0]?.id || '');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (forecast) {
      setTipe(forecast.tipe || 'pengeluaran');
      setDeskripsi(forecast.deskripsi || '');
      setNominalDisplay(formatNominalInput(String(forecast.nominal || '')));
      setPeriodeBulan(forecast.periodeBulan || '');
      setBankId(forecast.bankId || banks[0]?.id || '');
      setErrorMsg('');
    }
  }, [forecast, banks]);

  const handleNominalChange = (e) => {
    const raw = e.target.value;
    setNominalDisplay(formatNominalInput(raw));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isViewer) return;

    const parsedNom = parseRupiahInput(nominalDisplay);
    if (!deskripsi.trim()) {
      setErrorMsg('Deskripsi rencana forecast wajib diisi.');
      return;
    }
    if (isNaN(parsedNom) || parsedNom <= 0) {
      setErrorMsg('Target nominal forecast harus lebih dari 0.');
      return;
    }

    const updatedFields = {
      tipe,
      deskripsi: deskripsi.trim(),
      nominal: parsedNom,
      periodeBulan,
      bankId
    };

    onSave(updatedFields);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-150 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200 my-auto">
        
        {/* Header (Matching Gambar 1) */}
        <div className="px-6 py-4 bg-[#202f45] text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-slate-200 shrink-0">
              <Edit3 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold tracking-tight text-white">Edit Rencana Forecast</h3>
              <p className="text-xs text-slate-300">Ubah target anggaran, tipe, periode, dan rekening bank/kas</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          
          {errorMsg && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-xs text-rose-700 font-semibold">
              <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* 1. Tipe Rencana */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              Tipe Rencana
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setTipe('pemasukan')}
                className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 border transition-all cursor-pointer ${
                  tipe === 'pemasukan' 
                    ? 'bg-[#27384e] text-white border-[#27384e] shadow-xs' 
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <ArrowDownLeft className="w-4 h-4 text-emerald-400" />
                <span>Pemasukan</span>
              </button>
              <button
                type="button"
                onClick={() => setTipe('pengeluaran')}
                className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 border transition-all cursor-pointer ${
                  tipe === 'pengeluaran' 
                    ? 'bg-[#27384e] text-white border-[#27384e] shadow-xs' 
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <ArrowUpRight className="w-4 h-4 text-rose-400" />
                <span>Pengeluaran</span>
              </button>
            </div>
          </div>

          {/* 2. Deskripsi Rencana */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              Deskripsi Rencana Forecast
            </label>
            <input
              type="text"
              value={deskripsi}
              onChange={(e) => setDeskripsi(e.target.value)}
              placeholder="Contoh: Belanja Operasional Bulanan..."
              className="w-full px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-corporate-500 font-semibold text-slate-900"
              required
            />
          </div>

          {/* 3. Nominal Target */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              Target Nominal
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-xs font-bold text-slate-500">Rp</span>
              <input
                type="text"
                value={nominalDisplay}
                onChange={handleNominalChange}
                placeholder="0"
                className="w-full pl-10 pr-3 py-2.5 text-sm font-mono-num font-bold bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-corporate-500 text-slate-900"
                required
              />
            </div>
          </div>

          {/* 4. Periode Bulan & Rekening */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Periode Bulan
              </label>
              <input
                type="month"
                value={periodeBulan}
                onChange={(e) => setPeriodeBulan(e.target.value)}
                className="w-full px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-corporate-500 font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Rekening Terkait
              </label>
              <select
                value={bankId}
                onChange={(e) => setBankId(e.target.value)}
                className="w-full px-3 py-2.5 text-sm font-semibold bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:ring-2 focus:ring-corporate-500 cursor-pointer"
              >
                {banks.map(b => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Actions (Matching Gambar 1) */}
          <div className="pt-4 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isViewer}
              className="px-6 py-2.5 text-xs font-bold text-white bg-[#27384e] hover:bg-[#1b2838] active:scale-95 rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Simpan Perubahan</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
