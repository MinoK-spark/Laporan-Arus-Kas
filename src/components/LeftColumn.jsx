import React, { useState } from 'react';
import { Target, PlusCircle, ArrowDownLeft, ArrowUpRight, CheckCircle2, Building, DollarSign } from 'lucide-react';
import { formatRupiah, formatNominalInput, parseRupiahInput } from '../utils/formatters';

export const LeftColumn = ({ banks, onAddBank, onAddForecast, forecastsCount }) => {
  const [bankName, setBankName] = useState('');
  const [bankSaldoDisplay, setBankSaldoDisplay] = useState('');
  const [isBankSuccess, setIsBankSuccess] = useState(false);

  const [forecastBankId, setForecastBankId] = useState(banks[0]?.id || '');
  const [tipe, setTipe] = useState('pemasukan');
  const [deskripsi, setDeskripsi] = useState('');
  const [nominalDisplay, setNominalDisplay] = useState('');
  const [isForecastSuccess, setIsForecastSuccess] = useState(false);

  const handleBankSaldoChange = (e) => { setBankSaldoDisplay(formatNominalInput(e.target.value)); };

  const handleForecastNominalChange = (e) => {
    const raw = e.target.value;
    const num = parseRupiahInput(raw);
    if (num === 0 && raw === '') setNominalDisplay('');
    else setNominalDisplay(new Intl.NumberFormat('id-ID').format(num));
  };

  const handleBankSubmit = (e) => {
    e.preventDefault();
    const cleanNominal = parseRupiahInput(bankSaldoDisplay);
    if (!bankName.trim()) return alert('Masukkan nama bank.');
    
    const newBank = {
      id: `bank-${Date.now()}`,
      name: bankName.trim(),
      saldoAwal: cleanNominal || 0,
    };
    onAddBank(newBank);
    if (!forecastBankId) setForecastBankId(newBank.id);
    
    setBankName('');
    setBankSaldoDisplay('');
    setIsBankSuccess(true);
    setTimeout(() => setIsBankSuccess(false), 2500);
  };

  const handleForecastSubmit = (e) => {
    e.preventDefault();
    const cleanNominal = parseRupiahInput(nominalDisplay);
    if (!forecastBankId) return alert('Pilih bank terlebih dahulu.');
    if (!deskripsi.trim()) return alert('Masukkan deskripsi.');
    if (!cleanNominal || cleanNominal <= 0) return alert('Nominal harus > 0.');

    const newForecast = {
      id: `plan-${Date.now()}`,
      bankId: forecastBankId,
      tipe,
      deskripsi: deskripsi.trim(),
      nominal: cleanNominal,
      tanggalDibuat: new Date().toISOString().split('T')[0],
    };

    onAddForecast(newForecast);
    setDeskripsi('');
    setNominalDisplay('');
    setIsForecastSuccess(true);
    setTimeout(() => setIsForecastSuccess(false), 2500);
  };

  return (
    <div className="flex flex-col gap-6 h-full">
      
      {/* Form Tambah Bank */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-card p-5">
        <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100">
          <div className="w-9 h-9 rounded-xl bg-corporate-100 flex items-center justify-center">
            <Building className="w-5 h-5 text-corporate-700" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 tracking-tight">Tambah Rekening Bank</h2>
            <p className="text-xs text-slate-500">Daftarkan akun bank baru</p>
          </div>
        </div>

        <form onSubmit={handleBankSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">Nama Bank</label>
            <input
              type="text"
              value={bankName}
              onChange={(e) => setBankName(e.target.value)}
              placeholder="Contoh: Bank BCA"
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-corporate-500"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">Saldo Awal</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-xs font-bold text-slate-500">Rp</span>
              <input
                type="text"
                value={bankSaldoDisplay}
                onChange={handleBankSaldoChange}
                placeholder="0"
                className="w-full pl-10 pr-3 py-2 text-sm font-mono-num font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-corporate-500"
              />
            </div>
          </div>
          <div>
            {isBankSuccess && (
              <div className="mb-2 text-xs font-semibold text-emerald-600 flex items-center gap-1"><CheckCircle2 className="w-4 h-4" /> Bank ditambahkan!</div>
            )}
            <button type="submit" className="w-full py-2 rounded-xl text-sm font-bold text-white bg-slate-800 hover:bg-slate-900 flex justify-center gap-2">
              <PlusCircle className="w-4 h-4" /> Tambah Bank
            </button>
          </div>
        </form>
      </div>

      {/* Form Tambah Forecast */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-card p-5 flex-1">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-corporate-100 flex items-center justify-center">
              <Target className="w-5 h-5 text-corporate-700" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 tracking-tight">Setup Forecast Baru</h2>
              <p className="text-xs text-slate-500">Perumusan target kas</p>
            </div>
          </div>
          <span className="text-xs font-semibold bg-slate-100 text-slate-600 px-2 py-1 rounded-full border border-slate-200">
            {forecastsCount} Rencana
          </span>
        </div>

        <form onSubmit={handleForecastSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">Pilih Bank</label>
            <select
              value={forecastBankId}
              onChange={(e) => setForecastBankId(e.target.value)}
              className="w-full px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl"
              required
            >
              {banks.length === 0 && <option value="">-- Buat Bank Dulu --</option>}
              {banks.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">Tipe Rencana</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setTipe('pemasukan')}
                className={`flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold border ${tipe === 'pemasukan' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-slate-50 text-slate-600'}`}
              >
                <ArrowDownLeft className="w-4 h-4" /> Pemasukan
              </button>
              <button
                type="button"
                onClick={() => setTipe('pengeluaran')}
                className={`flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold border ${tipe === 'pengeluaran' ? 'bg-corporate-800 text-white border-corporate-800' : 'bg-slate-50 text-slate-600'}`}
              >
                <ArrowUpRight className="w-4 h-4" /> Pengeluaran
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">Deskripsi Rencana</label>
            <input
              type="text"
              value={deskripsi}
              onChange={(e) => setDeskripsi(e.target.value)}
              placeholder="Contoh: Termin 1 Klien..."
              className="w-full px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">Nominal Target</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-xs font-bold text-slate-500">Rp</span>
              <input
                type="text"
                value={nominalDisplay}
                onChange={handleForecastNominalChange}
                placeholder="0"
                className="w-full pl-10 pr-3 py-2.5 text-sm font-mono-num font-semibold bg-slate-50 border border-slate-200 rounded-xl"
                required
              />
            </div>
          </div>

          <div className="pt-2">
            {isForecastSuccess && (
              <div className="mb-2 text-xs font-semibold text-emerald-600 flex items-center gap-1"><CheckCircle2 className="w-4 h-4" /> Forecast disimpan!</div>
            )}
            <button type="submit" className="w-full py-2.5 rounded-xl text-sm font-bold text-white bg-corporate-800 hover:bg-corporate-900 flex justify-center gap-2">
              <PlusCircle className="w-4 h-4" /> Simpan Rencana Forecast
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
