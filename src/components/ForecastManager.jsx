import React, { useState, useRef } from 'react';
import { Target, PlusCircle, ArrowDownLeft, ArrowUpRight, CheckCircle2, Trash2, Upload, Calendar, Download, Edit3 } from 'lucide-react';
import { formatRupiah, parseRupiahInput } from '../utils/formatters';

export const ForecastManager = ({ forecasts, onAddForecast, onDeleteForecast, onUpdateForecast }) => {
  const [tipe, setTipe] = useState('pengeluaran');
  const [deskripsi, setDeskripsi] = useState('');
  const [nominalDisplay, setNominalDisplay] = useState('');
  const [periodeBulan, setPeriodeBulan] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [isSuccess, setIsSuccess] = useState(false);
  const fileInputRef = useRef(null);

  const handleNominalChange = (e) => {
    const raw = e.target.value;
    const num = parseRupiahInput(raw);
    if (num === 0 && raw === '') setNominalDisplay('');
    else setNominalDisplay(new Intl.NumberFormat('id-ID').format(num));
  };

  const handleForecastSubmit = (e) => {
    e.preventDefault();
    const cleanNominal = parseRupiahInput(nominalDisplay);
    if (!deskripsi.trim()) return alert('Masukkan deskripsi.');
    if (!cleanNominal || cleanNominal <= 0) return alert('Nominal harus > 0.');
    if (!periodeBulan) return alert('Pilih periode bulan.');

    const newForecast = {
      id: `plan-${Date.now()}`,
      tipe,
      deskripsi: deskripsi.trim(),
      nominal: cleanNominal,
      tanggalDibuat: new Date().toISOString().split('T')[0],
      periodeBulan
    };

    onAddForecast(newForecast);
    setDeskripsi('');
    setNominalDisplay('');
    setIsSuccess(true);
    setTimeout(() => setIsSuccess(false), 2500);
  };

  const downloadTemplate = () => {
    const csvContent = "Tipe,Deskripsi,Nominal,Periode\nPemasukan,Termin Proyek A,50000000,2026-10\nPengeluaran,Operasional Kantor,10000000,2026-10";
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'Template_Import_Forecast.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleEditForecast = (plan) => {
    const newDeskripsi = window.prompt('Ubah Deskripsi Forecast:', plan.deskripsi);
    if (newDeskripsi === null) return;
    const newNominalRaw = window.prompt('Ubah Target Nominal (angka saja):', plan.nominal);
    if (newNominalRaw === null) return;
    const newNominal = parseInt(newNominalRaw.replace(/[^\d]/g, ''), 10);
    
    onUpdateForecast(plan.id, { 
      deskripsi: newDeskripsi.trim() || plan.deskripsi, 
      nominal: isNaN(newNominal) ? plan.nominal : newNominal 
    });
  };

  const handleImportCSV = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target.result;
      const lines = text.split('\n');
      let importedCount = 0;
      
      const defaultPeriode = new Date().toISOString().slice(0, 7); // YYYY-MM
      
      // format expected: tipe, deskripsi, nominal, periode_bulan(opsional YYYY-MM)
      lines.forEach((line, index) => {
        if (index === 0) return; // skip header
        if (!line.trim()) return;
        
        const [tipeCsv, descCsv, nominalCsv, periodeCsv] = line.split(',');
        if (tipeCsv && descCsv && nominalCsv) {
          const t = tipeCsv.trim().toLowerCase();
          const cleanTipe = (t === 'in' || t === 'pemasukan') ? 'pemasukan' : 'pengeluaran';
          onAddForecast({
            id: `plan-imp-${Date.now()}-${index}`,
            tipe: cleanTipe,
            deskripsi: descCsv.trim(),
            nominal: parseInt(nominalCsv.trim().replace(/[^\d]/g, ''), 10) || 0,
            tanggalDibuat: new Date().toISOString().split('T')[0],
            periodeBulan: periodeCsv ? periodeCsv.trim() : defaultPeriode,
          });
          importedCount++;
        }
      });
      alert(`Berhasil mengimpor ${importedCount} rencana forecast!`);
      e.target.value = '';
    };
    reader.readAsText(file);
  };

  const formatBulan = (yyyymm) => {
    if (!yyyymm) return '-';
    try {
      const [year, month] = yyyymm.split('-');
      const date = new Date(year, parseInt(month) - 1);
      return new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' }).format(date);
    } catch {
      return yyyymm;
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      
      {/* Form Tambah Forecast */}
      <div className="lg:col-span-1 bg-white rounded-2xl border border-slate-200/90 shadow-card p-5 h-fit">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-corporate-100 flex items-center justify-center">
              <Target className="w-5 h-5 text-corporate-700" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 tracking-tight">Setup Forecast</h2>
              <p className="text-xs text-slate-500">Perumusan target kas</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleForecastSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">Tipe Rencana</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setTipe('pemasukan')}
                className={`flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold border transition-all ${tipe === 'pemasukan' ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}
              >
                <ArrowDownLeft className="w-4 h-4" /> Pemasukan
              </button>
              <button
                type="button"
                onClick={() => setTipe('pengeluaran')}
                className={`flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold border transition-all ${tipe === 'pengeluaran' ? 'bg-corporate-800 text-white border-corporate-800 shadow-sm' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}
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
              className="w-full px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-corporate-500"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">Periode Bulan</label>
            <input
              type="month"
              value={periodeBulan}
              onChange={(e) => setPeriodeBulan(e.target.value)}
              className="w-full px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-corporate-500"
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
                onChange={handleNominalChange}
                placeholder="0"
                className="w-full pl-10 pr-3 py-2.5 text-sm font-mono-num font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-corporate-500"
                required
              />
            </div>
          </div>

          <div className="pt-2">
            {isSuccess && (
              <div className="mb-2 text-xs font-semibold text-emerald-600 flex items-center gap-1"><CheckCircle2 className="w-4 h-4" /> Forecast disimpan!</div>
            )}
            <button type="submit" className="w-full py-2.5 rounded-xl text-sm font-bold text-white bg-corporate-800 hover:bg-corporate-900 flex justify-center gap-2 transition-all">
              <PlusCircle className="w-4 h-4" /> Simpan Rencana Forecast
            </button>
          </div>
        </form>
      </div>

      {/* Daftar Forecast */}
      <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/90 shadow-card overflow-hidden">
        <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900 tracking-tight">Daftar Rencana Forecast</h2>
            <p className="text-xs text-slate-500">Total: {forecasts.length} Rencana</p>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={downloadTemplate}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-xl shadow-sm hover:bg-slate-50 transition-all"
            >
              <Download className="w-3.5 h-3.5" /> Template CSV
            </button>
            <input type="file" accept=".csv" className="hidden" ref={fileInputRef} onChange={handleImportCSV} />
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-corporate-700 bg-white border border-slate-200 rounded-xl shadow-sm hover:bg-slate-50 transition-all"
            >
              <Upload className="w-3.5 h-3.5" /> Import CSV
            </button>
          </div>
        </div>

        <div className="p-0 overflow-x-auto max-h-[600px] overflow-y-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-slate-100/90 text-slate-700 uppercase tracking-wider text-[11px] font-bold border-b border-slate-200">
                <th className="py-3 px-4">Deskripsi</th>
                <th className="py-3 px-4">Periode</th>
                <th className="py-3 px-4 text-center">Tipe</th>
                <th className="py-3 px-4 text-right">Target Nominal</th>
                <th className="py-3 px-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {forecasts.map(plan => (
                <tr key={plan.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-4 font-bold text-slate-900">{plan.deskripsi}</td>
                  <td className="py-3 px-4 text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                    <Calendar className="w-3.5 h-3.5" /> {formatBulan(plan.periodeBulan)}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${plan.tipe === 'pemasukan' ? 'bg-emerald-100 text-emerald-800' : 'bg-corporate-100 text-corporate-800'}`}>
                      {plan.tipe}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right font-mono-num font-medium text-slate-700">
                    {formatRupiah(plan.nominal)}
                  </td>
                  <td className="py-3 px-4 text-center flex items-center justify-center gap-2">
                    <button
                      onClick={() => handleEditForecast(plan)}
                      className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
                      title="Edit Forecast"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        if (window.confirm(`Hapus rencana "${plan.deskripsi}"?`)) onDeleteForecast(plan.id);
                      }}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                      title="Hapus Forecast"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {forecasts.length === 0 && (
                <tr><td colSpan="5" className="py-8 text-center text-slate-400 text-sm">Belum ada data forecast.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
