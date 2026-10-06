import React, { useState, useEffect, useRef } from 'react';
import { Receipt, ArrowDownLeft, ArrowUpRight, AlertTriangle, CheckCircle2, Send, Info, Upload, Download } from 'lucide-react';
import { formatRupiah, parseRupiahInput } from '../utils/formatters';

export const TransactionForm = ({ banks, forecasts, transactions, onAddTransaction }) => {
  const [bankId, setBankId] = useState(banks[0]?.id || '');
  const [tipe, setTipe] = useState('pengeluaran'); // IN or OUT
  const [periodeBulan, setPeriodeBulan] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [planId, setPlanId] = useState('unplanned');
  
  const [deskripsi, setDeskripsi] = useState('');
  const [nominalDisplay, setNominalDisplay] = useState('');
  const [tanggal, setTanggal] = useState(new Date().toISOString().split('T')[0]);
  const [buktiRef, setBuktiRef] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const fileInputRef = useRef(null);

  // Auto select first bank if available and empty
  useEffect(() => {
    if (!bankId && banks.length > 0) setBankId(banks[0].id);
  }, [banks, bankId]);

  // Filter plans based on the chosen toggle AND periodeBulan AND ensure it hasn't been used yet
  const availablePlans = forecasts.filter((f) => {
    // 1. Filter by Tipe
    if (f.tipe !== tipe) return false;
    
    // 2. Filter by Periode Bulan (only show plans for this selected month)
    if (f.periodeBulan && f.periodeBulan !== periodeBulan) return false;

    // 3. Prevent reuse: if a transaction already exists with this planId, filter it out
    const isUsed = transactions.some((t) => t.planId === f.id);
    if (isUsed) return false;

    return true;
  });

  // If the selected plan does not belong to the available filtered combo, reset to 'unplanned'
  useEffect(() => {
    if (planId !== 'unplanned') {
      const exists = availablePlans.some((p) => p.id === planId);
      if (!exists) {
        setPlanId('unplanned');
      }
    }
  }, [tipe, periodeBulan, availablePlans, planId]);

  const handleNominalChange = (e) => {
    const raw = e.target.value;
    const num = parseRupiahInput(raw);
    if (num === 0 && raw === '') setNominalDisplay('');
    else setNominalDisplay(new Intl.NumberFormat('id-ID').format(num));
  };

  const selectedPlan = forecasts.find((f) => f.id === planId);
  
  // Realisasi of selected plan (should be 0 since we only show unused, but keeping logic just in case)
  const selectedPlanActual = selectedPlan
    ? transactions.filter((t) => t.planId === selectedPlan.id).reduce((sum, t) => sum + t.nominal, 0)
    : 0;

  const handleSubmit = (e) => {
    e.preventDefault();
    const cleanNominal = parseRupiahInput(nominalDisplay);

    if (!bankId) return alert('Silakan pilih Bank terlebih dahulu.');
    if (!deskripsi.trim()) return alert('Mohon masukkan deskripsi.');
    if (!cleanNominal || cleanNominal <= 0) return alert('Nominal harus > 0.');

    const defaultRef = buktiRef.trim() || (tipe === 'pemasukan' ? `BKM-${Date.now().toString().slice(-4)}` : `BKK-${Date.now().toString().slice(-4)}`);

    const newTransaction = {
      id: `tx-${Date.now()}`,
      tanggal: tanggal || new Date().toISOString().split('T')[0],
      bankId,
      tipe,
      deskripsi: deskripsi.trim(),
      nominal: cleanNominal,
      planId,
      buktiRef: defaultRef,
      keterangan: planId === 'unplanned' ? 'Transaksi aktual tanpa alokasi rencana forecast (Anomali)' : `Realisasi rencana: ${selectedPlan?.deskripsi || '-'}`,
    };

    onAddTransaction(newTransaction);
    setDeskripsi('');
    setNominalDisplay('');
    setBuktiRef('');
    setPlanId('unplanned'); // Reset to unplanned after success to prevent attempting to reuse
    setIsSuccess(true);
    setTimeout(() => setIsSuccess(false), 2500);
  };

  const downloadTemplate = () => {
    const csvContent = "Tipe,Deskripsi,Nominal,Tanggal\nPemasukan,Cair Termin 1,50000000,2026-10-01\nPengeluaran,Beli Material,10000000,2026-10-02";
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'Template_Import_Transaksi.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImportCSV = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (banks.length === 0) return alert('Buat bank terlebih dahulu sebelum import transaksi!');

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target.result;
      const lines = text.split('\n');
      let importedCount = 0;
      
      // format expected: tipe(pemasukan/pengeluaran), deskripsi, nominal, tanggal
      lines.forEach((line, index) => {
        if (index === 0) return; // skip header
        if (!line.trim()) return;
        
        const [tipeCsv, descCsv, nominalCsv, tglCsv] = line.split(',');
        if (tipeCsv && descCsv && nominalCsv) {
          const t = tipeCsv.trim().toLowerCase();
          const cleanTipe = (t === 'in' || t === 'pemasukan') ? 'pemasukan' : 'pengeluaran';
          onAddTransaction({
            id: `tx-imp-${Date.now()}-${index}`,
            tanggal: tglCsv ? tglCsv.trim() : new Date().toISOString().split('T')[0],
            bankId: bankId || banks[0].id, // fallback to currently selected bank
            tipe: cleanTipe,
            deskripsi: descCsv.trim(),
            nominal: parseInt(nominalCsv.trim().replace(/[^\d]/g, ''), 10) || 0,
            planId: 'unplanned',
            buktiRef: `IMP-${Date.now().toString().slice(-4)}-${index}`,
            keterangan: 'Hasil Import CSV (Anomali Default)',
          });
          importedCount++;
        }
      });
      alert(`Berhasil mengimpor ${importedCount} transaksi ke rekening aktif!`);
      e.target.value = '';
    };
    reader.readAsText(file);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-card p-5 flex flex-col h-full">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-corporate-900 flex items-center justify-center text-white">
            <Receipt className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 tracking-tight">Input Transaksi Harian</h2>
            <p className="text-xs text-slate-500">Pencatatan mutasi kas (Kasir)</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button 
            type="button"
            onClick={downloadTemplate}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-xl shadow-sm hover:bg-slate-50 transition-all"
          >
            <Download className="w-3.5 h-3.5" /> Template CSV
          </button>
          <input type="file" accept=".csv" className="hidden" ref={fileInputRef} onChange={handleImportCSV} />
          <button 
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-corporate-700 bg-white border border-slate-200 rounded-xl shadow-sm hover:bg-slate-50 transition-all"
          >
            <Upload className="w-3.5 h-3.5" /> Import CSV
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="mt-4 space-y-4 flex-1 flex flex-col justify-between">
        <div className="space-y-4">
          
          {/* Cascading 1: Pilih Periode Bulan */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">1. Filter Periode Rencana</label>
            <input
              type="month"
              value={periodeBulan}
              onChange={(e) => setPeriodeBulan(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-corporate-500"
            />
          </div>

          {/* Cascading 2: Pilih Bank */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">2. Pilih Rekening Bank</label>
            <select
              value={bankId}
              onChange={(e) => setBankId(e.target.value)}
              className="w-full px-3 py-2.5 text-sm font-semibold bg-slate-50 border border-slate-200 rounded-xl text-corporate-900 focus:ring-2 focus:ring-corporate-500 cursor-pointer"
            >
              {banks.length === 0 && <option value="">-- Buat Bank Dulu --</option>}
              {banks.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>

          {/* Cascading 3: Pilih Tipe */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">3. Jenis Mutasi Kas</label>
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl border border-slate-200/80">
              <button
                type="button"
                onClick={() => setTipe('pemasukan')}
                className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all ${tipe === 'pemasukan' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-200/60'}`}
              >
                <ArrowDownLeft className="w-4 h-4" /> Pemasukan
              </button>
              <button
                type="button"
                onClick={() => setTipe('pengeluaran')}
                className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all ${tipe === 'pengeluaran' ? 'bg-rose-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-200/60'}`}
              >
                <ArrowUpRight className="w-4 h-4" /> Pengeluaran
              </button>
            </div>
          </div>

          {/* Cascading 4: Pilih Forecast */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">4. Terkait Forecast Rencana</label>
              <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded border border-slate-200">
                Menampilkan yang belum terealisasi
              </span>
            </div>
            
            <select
              value={planId}
              onChange={(e) => setPlanId(e.target.value)}
              className={`w-full px-3 py-2.5 text-sm rounded-xl font-medium border focus:outline-none focus:ring-2 transition-all cursor-pointer ${
                planId === 'unplanned'
                  ? 'bg-rose-50/70 border-rose-300 text-rose-900'
                  : 'bg-slate-50 border-slate-200 text-slate-800'
              }`}
            >
              <option value="unplanned" className="font-semibold text-rose-700 bg-rose-50">
                -- Transaksi Tambahan (Diluar Forecast) --
              </option>
              {availablePlans.map((plan) => (
                <option key={plan.id} value={plan.id} className="text-slate-800">
                  {plan.deskripsi} ({formatRupiah(plan.nominal)})
                </option>
              ))}
            </select>

            {planId === 'unplanned' ? (
              <div className="mt-2 p-2.5 bg-rose-50 border border-rose-200/80 rounded-xl flex items-start gap-2 text-xs text-rose-800">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div><span className="font-semibold">Perhatian:</span> Transaksi ini dicatat tanpa rencana target (akan ditandai sebagai anomali).</div>
              </div>
            ) : (
              selectedPlan && (
                <div className="mt-2 p-2 bg-corporate-50 border border-corporate-200/80 rounded-xl text-xs text-corporate-900 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5 text-corporate-600" />
                    <span>Target: <strong>{formatRupiah(selectedPlan.nominal)}</strong></span>
                  </div>
                  <span className="text-emerald-600 font-bold">Rencana Tersedia</span>
                </div>
              )
            )}
          </div>

          {/* Deskripsi & Nominal */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">Deskripsi Transaksi Aktual</label>
            <input
              type="text"
              value={deskripsi}
              onChange={(e) => setDeskripsi(e.target.value)}
              className="w-full px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-corporate-500"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">Nominal</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-xs font-bold text-slate-500">Rp</span>
                <input
                  type="text"
                  value={nominalDisplay}
                  onChange={handleNominalChange}
                  className="w-full pl-10 pr-3 py-2.5 text-sm font-mono-num font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-corporate-500"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">Tanggal</label>
              <input
                type="date"
                value={tanggal}
                onChange={(e) => setTanggal(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-corporate-500"
              />
            </div>
          </div>
        </div>

        <div className="pt-4">
          {isSuccess && (
            <div className="mb-2 p-2 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-xs font-semibold text-emerald-800">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Mutasi berhasil!
            </div>
          )}
          <button
            type="submit"
            className={`w-full py-3 rounded-xl text-sm font-bold text-white transition-all flex items-center justify-center gap-2 shadow-sm ${
              tipe === 'pemasukan' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-corporate-900 hover:bg-navy-950'
            }`}
          >
            <Send className="w-4 h-4" /> Catat Mutasi
          </button>
        </div>
      </form>
    </div>
  );
};
