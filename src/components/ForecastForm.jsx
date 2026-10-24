import React, { useState } from 'react';
import { Target, PlusCircle, ArrowDownLeft, ArrowUpRight, CheckCircle2 } from 'lucide-react';
import { formatRupiah, formatNominalInput, parseRupiahInput } from '../utils/formatters';

export const ForecastForm = ({ onAddForecast, forecastsCount }) => {
  const [tipe, setTipe] = useState('pemasukan'); // default or pemasukan
  const [deskripsi, setDeskripsi] = useState('');
  const [nominalDisplay, setNominalDisplay] = useState('');
  const [kategori, setKategori] = useState('Operasional');
  const [isSuccess, setIsSuccess] = useState(false);

  const handleNominalChange = (e) => {
    const raw = e.target.value;
    const num = parseRupiahInput(raw);
    if (num === 0 && raw === '') {
      setNominalDisplay('');
    } else {
      setNominalDisplay(new Intl.NumberFormat('id-ID').format(num));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const cleanNominal = parseRupiahInput(nominalDisplay);

    if (!deskripsi.trim()) {
      alert('Mohon masukkan deskripsi rencana forecast.');
      return;
    }

    if (!cleanNominal || cleanNominal <= 0) {
      alert('Mohon masukkan nominal target yang valid (> 0).');
      return;
    }

    const newForecast = {
      id: `plan-${Date.now()}`,
      tipe,
      deskripsi: deskripsi.trim(),
      nominal: cleanNominal,
      kategori,
      tanggalDibuat: new Date().toISOString().split('T')[0],
    };

    onAddForecast(newForecast);
    setDeskripsi('');
    setNominalDisplay('');
    setIsSuccess(true);
    setTimeout(() => setIsSuccess(false), 2500);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-card p-5 flex flex-col h-full">
      {/* Form Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-corporate-100 border border-corporate-200 flex items-center justify-center text-corporate-800">
            <Target className="w-5 h-5 text-corporate-700" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 tracking-tight">
              Setup Forecast (Rencana)
            </h2>
            <p className="text-xs text-slate-500">
              Form perumusan target anggaran & rencana kas
            </p>
          </div>
        </div>
        <span className="text-xs font-semibold bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full border border-slate-200">
          {forecastsCount} Rencana Aktif
        </span>
      </div>

      {/* Form Content */}
      <form onSubmit={handleSubmit} className="mt-4 space-y-4 flex-1 flex flex-col justify-between">
        <div className="space-y-4">
          
          {/* Tipe Selector */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              Tipe Rencana <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setTipe('pemasukan')}
                className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all border ${
                  tipe === 'pemasukan'
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200'
                }`}
              >
                <ArrowDownLeft className="w-4 h-4" />
                <span>Pemasukan</span>
              </button>

              <button
                type="button"
                onClick={() => setTipe('pengeluaran')}
                className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all border ${
                  tipe === 'pengeluaran'
                    ? 'bg-corporate-800 text-white border-corporate-800 shadow-sm'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200'
                }`}
              >
                <ArrowUpRight className="w-4 h-4" />
                <span>Pengeluaran</span>
              </button>
            </div>
          </div>

          {/* Deskripsi */}
          <div>
            <label htmlFor="forecast-deskripsi" className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              Deskripsi Rencana <span className="text-rose-500">*</span>
            </label>
            <input
              id="forecast-deskripsi"
              type="text"
              value={deskripsi}
              onChange={(e) => setDeskripsi(e.target.value)}
              placeholder="Contoh: Pengadaan Solar Genset Site Kaubun..."
              className="w-full px-3.5 py-2.5 text-sm bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-corporate-500 focus:border-corporate-500 transition-all placeholder:text-slate-400"
              required
            />
          </div>

          {/* Nominal Target */}
          <div>
            <label htmlFor="forecast-nominal" className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              Nominal Target Forecast <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-xs font-bold text-slate-500">
                Rp
              </span>
              <input
                id="forecast-nominal"
                type="text"
                value={nominalDisplay}
                onChange={handleNominalChange}
                placeholder="0"
                className="w-full pl-11 pr-3.5 py-2.5 text-sm font-mono-num font-semibold bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-corporate-500 focus:border-corporate-500 transition-all text-slate-900 placeholder:text-slate-400"
                required
              />
            </div>
            {nominalDisplay && (
              <p className="mt-1 text-xs text-corporate-700 font-medium font-mono-num">
                Terbaca: {formatRupiah(parseRupiahInput(nominalDisplay))}
              </p>
            )}
          </div>

          {/* Kategori / Divisi */}
          <div>
            <label htmlFor="forecast-kategori" className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              Kategori / Divisi Terkait
            </label>
            <select
              id="forecast-kategori"
              value={kategori}
              onChange={(e) => setKategori(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-corporate-500 focus:border-corporate-500 transition-all text-slate-700 cursor-pointer"
            >
              <option value="Operasional">Operasional & Finansial</option>
              <option value="Proyek Site Kaubun">Proyek Site Kaubun</option>
              <option value="Alat Berat & Maintenance">Alat Berat & Unit Kendaraan</option>
              <option value="HRD & General Affair">HRD & General Affair</option>
              <option value="Legalitas & Pajak">Legalitas & Pajak</option>
            </select>
          </div>
        </div>

        {/* Submit Button & Notification */}
        <div className="pt-2">
          {isSuccess && (
            <div className="mb-2 p-2 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-xs font-semibold text-emerald-800">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Rencana forecast berhasil ditambahkan!</span>
            </div>
          )}

          <button
            type="submit"
            className="w-full py-2.5 px-4 rounded-xl text-sm font-bold text-white bg-corporate-800 hover:bg-corporate-900 active:scale-[0.99] transition-all flex items-center justify-center gap-2 shadow-sm"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Simpan Rencana Forecast</span>
          </button>
        </div>
      </form>
    </div>
  );
};
