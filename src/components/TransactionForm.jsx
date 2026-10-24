import React, { useState, useEffect, useRef } from 'react';
import { Receipt, ArrowDownLeft, ArrowUpRight, AlertTriangle, CheckCircle2, Send, Info, Upload, Lock, FileSpreadsheet } from 'lucide-react';
import { formatRupiah, formatNominalInput, parseRupiahInput } from '../utils/formatters';
import { downloadExcel, parseExcelFile, getRowValue, normalizeExcelDate } from '../utils/excelHelper';

export const TransactionForm = ({ banks, forecasts, transactions, onAddTransaction, onAddTransactions, currentUser }) => {
  const isViewer = currentUser?.role === 'viewer';

  const [bankId, setBankId] = useState(banks[0]?.id || '');
  const [tipe, setTipe] = useState('pemasukan'); // IN or OUT
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
    if (f.tipe !== tipe) return false;
    if (periodeBulan && f.periodeBulan && f.periodeBulan !== periodeBulan) return false;
    return true;
  });

  useEffect(() => {
    if (planId !== 'unplanned') {
      const exists = availablePlans.some((p) => p.id === planId);
      if (!exists) {
        setPlanId('unplanned');
      }
    }
  }, [tipe, bankId, periodeBulan, availablePlans, planId]);

  const handleNominalChange = (e) => {
    const raw = e.target.value;
    setNominalDisplay(formatNominalInput(raw));
  };

  const handleDownloadTemplate = () => {
    const sampleBank = banks[0]?.name || 'Bank BCA';
    const sampleKas = banks.find(b => b.tipeAkun === 'kas')?.name || 'Kas Operasional';
    const sampleForecastOut = forecasts.find(f => f.tipe === 'pengeluaran')?.deskripsi || 'Pembelian Alat & Operasional Kantor';
    const sampleForecastIn = forecasts.find(f => f.tipe === 'pemasukan')?.deskripsi || 'Termin 1 Pembayaran Klien';

    const templateData = [
      {
        "Tanggal": "2026-10-20",
        "Deskripsi": "Pembelian ATK & Keperluan Kantor",
        "Nominal": 250000,
        "Jenis Mutasi": "pengeluaran",
        "Nama Bank / Akun": sampleKas,
        "Rencana Forecast": sampleForecastOut
      },
      {
        "Tanggal": "2026-10-21",
        "Deskripsi": "Penerimaan Pelunasan Invoice Client A",
        "Nominal": 15000000,
        "Jenis Mutasi": "pemasukan",
        "Nama Bank / Akun": sampleBank,
        "Rencana Forecast": sampleForecastIn
      },
      {
        "Tanggal": "2026-10-22",
        "Deskripsi": "Biaya Parkir & Kurir Mendadak",
        "Nominal": 50000,
        "Jenis Mutasi": "pengeluaran",
        "Nama Bank / Akun": sampleKas,
        "Rencana Forecast": "Tanpa Forecast"
      }
    ];
    downloadExcel(templateData, 'Template_Import_Mutasi.xlsx', 'Mutasi Kas & Bank');
  };

  const handleImportExcel = async (e) => {
    if (isViewer) return;
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const rows = await parseExcelFile(file);
      const newTransactionsToAdd = [];
      let duplicateCounter = 0;

      rows.forEach((row, index) => {
        const desk = getRowValue(row, 'Deskripsi', 'Keterangan', 'Uraian', 'Catatan', 'Deskripsi Transaksi');
        const nominalRaw = getRowValue(row, 'Nominal', 'Jumlah', 'Nilai', 'Total');
        const tglRaw = getRowValue(row, 'Tanggal', 'Tgl', 'Tanggal Transaksi', 'Date');
        const tipeVal = getRowValue(row, 'Jenis Mutasi', 'Tipe', 'Jenis', 'Mutasi', 'Kategori');
        const namaBank = getRowValue(row, 'Nama Bank / Akun', 'Nama Bank', 'Bank', 'Nama Akun', 'Akun', 'Rekening');
        const forecastVal = getRowValue(row, 'Rencana Forecast', 'Forecast / Rencana', 'Forecast', 'Rencana', 'Target Forecast', 'Nama Forecast', 'Kategori Forecast', 'Plan');

        const cleanNom = parseRupiahInput(nominalRaw) || 0;
        const cleanTipe = String(tipeVal).trim().toLowerCase().includes('masuk') ? 'pemasukan' : 'pengeluaran';
        const cleanTgl = normalizeExcelDate(tglRaw);

        // Match bank by name or fallback to selected bank
        const matchedBank = banks.find(b => 
          b.name.toLowerCase() === String(namaBank).trim().toLowerCase() ||
          b.id === String(namaBank).trim()
        );
        const targetBankId = matchedBank ? matchedBank.id : (bankId || banks[0]?.id);

        // Match forecast / target plan
        let targetPlanId = 'unplanned';
        if (forecastVal && String(forecastVal).trim()) {
          const cleanFVal = String(forecastVal).trim().toLowerCase();
          const isUnplannedKeyword = ['unplanned', '-', 'none', 'tanpa rencana', 'tanpa forecast', 'tidak ada', 'diluar forecast'].includes(cleanFVal);
          if (!isUnplannedKeyword) {
            const matchedForecast = forecasts.find(f => {
              const fDesc = (f.deskripsi || '').toLowerCase().trim();
              const fId = (f.id || '').toLowerCase().trim();
              return fId === cleanFVal ||
                     fDesc === cleanFVal ||
                     cleanFVal.includes(fDesc) ||
                     fDesc.includes(cleanFVal);
            });
            if (matchedForecast) {
              targetPlanId = matchedForecast.id;
            }
          }
        }

        if (desk && String(desk).trim() && cleanNom > 0) {
          const cleanDeskStr = String(desk).trim();
          const normDate = (d) => (d ? String(d).trim().substring(0, 10) : '');

          // Duplicate detection against existing data
          // Parameters: tanggal, nama rekening, nama / deskripsi transaksi, nominal
          const isDuplicateInDb = (transactions || []).some(existingTx => {
            const sameDate = normDate(existingTx.tanggal) === normDate(cleanTgl);
            const sameNominal = Math.abs(Number(existingTx.nominal || 0) - cleanNom) < 0.01;
            const sameDesc = String(existingTx.deskripsi || '').trim().toLowerCase() === cleanDeskStr.toLowerCase();
            
            const existingBankName = banks.find(b => b.id === existingTx.bankId)?.name?.toLowerCase()?.trim();
            const currentBankName = banks.find(b => b.id === targetBankId)?.name?.toLowerCase()?.trim();
            const sameBank = existingTx.bankId === targetBankId || (existingBankName && currentBankName && existingBankName === currentBankName);

            return sameDate && sameNominal && sameDesc && sameBank;
          });

          // Duplicate detection within the current imported batch
          const isDuplicateInBatch = newTransactionsToAdd.some(prevTx => {
            const sameDate = normDate(prevTx.tanggal) === normDate(cleanTgl);
            const sameNominal = Math.abs(Number(prevTx.nominal || 0) - cleanNom) < 0.01;
            const sameDesc = String(prevTx.deskripsi || '').trim().toLowerCase() === cleanDeskStr.toLowerCase();
            const sameBank = prevTx.bankId === targetBankId;
            return sameDate && sameNominal && sameDesc && sameBank;
          });

          const isDuplicate = isDuplicateInDb || isDuplicateInBatch;
          if (isDuplicate) duplicateCounter++;

          newTransactionsToAdd.push({
            id: `tx-imp-${Date.now()}-${index}`,
            bankId: targetBankId,
            tipe: cleanTipe,
            planId: targetPlanId,
            deskripsi: cleanDeskStr,
            nominal: cleanNom,
            tanggal: cleanTgl,
            isDuplicate: Boolean(isDuplicate),
            duplicateReason: isDuplicate ? 'Terdeteksi kesamaan tanggal, rekening, deskripsi, dan nominal dengan data yang ada' : null
          });
        }
      });

      if (newTransactionsToAdd.length > 0) {
        if (onAddTransactions) {
          onAddTransactions(newTransactionsToAdd);
        } else {
          newTransactionsToAdd.forEach(tx => onAddTransaction(tx));
        }
        let msg = `Berhasil mengimpor ${newTransactionsToAdd.length} mutasi kas dari file Excel!`;
        if (duplicateCounter > 0) {
          msg += `\n\nPerhatian: ${duplicateCounter} transaksi terdeteksi duplikat (tanggal, rekening, deskripsi & nominal sama). Data tetap dimasukkan dengan label/penanda [Duplikat].`;
        }
        alert(msg);
      } else {
        alert('Tidak ada transaksi valid yang ditemukan dalam file Excel. Silakan periksa kolom sesuai template.');
      }
    } catch (err) {
      alert('Gagal membaca file Excel: ' + err.message);
    } finally {
      if (e.target) e.target.value = '';
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isViewer) return;
    const num = parseRupiahInput(nominalDisplay);
    if (num <= 0) {
      alert('Nominal harus lebih dari 0');
      return;
    }

    const cleanDeskStr = deskripsi.trim();
    const targetBankId = bankId || banks[0]?.id;
    const normDate = (d) => (d ? String(d).trim().substring(0, 10) : '');

    // Duplicate detection against existing data
    const isDuplicate = (transactions || []).some(existingTx => {
      const sameDate = normDate(existingTx.tanggal) === normDate(tanggal);
      const sameNominal = Math.abs(Number(existingTx.nominal || 0) - num) < 0.01;
      const sameDesc = String(existingTx.deskripsi || '').trim().toLowerCase() === cleanDeskStr.toLowerCase();
      const existingBankName = banks.find(b => b.id === existingTx.bankId)?.name?.toLowerCase()?.trim();
      const currentBankName = banks.find(b => b.id === targetBankId)?.name?.toLowerCase()?.trim();
      const sameBank = existingTx.bankId === targetBankId || (existingBankName && currentBankName && existingBankName === currentBankName);
      return sameDate && sameNominal && sameDesc && sameBank;
    });

    const newTx = {
      id: 'tx-' + Date.now(),
      bankId: targetBankId,
      tipe,
      planId,
      deskripsi: cleanDeskStr,
      nominal: num,
      tanggal,
      buktiRef: buktiRef.trim(),
      isDuplicate: Boolean(isDuplicate),
      duplicateReason: isDuplicate ? 'Terdeteksi kesamaan tanggal, rekening, deskripsi, dan nominal dengan data yang ada' : null
    };

    onAddTransaction(newTx);
    setDeskripsi('');
    setNominalDisplay('');
    setBuktiRef('');
    setIsSuccess(true);
    setTimeout(() => setIsSuccess(false), 3000);
  };

  const selectedPlan = forecasts.find(f => f.id === planId);

  // If the user has viewer / read-only role
  if (isViewer) {
    return (
      <div className="bg-gradient-to-br from-slate-900 to-corporate-950 text-white rounded-2xl shadow-xl border border-corporate-800 p-6 flex flex-col items-center text-center">
        <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center mb-3">
          <Lock className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-white">Mode Tamu Aktif (Akses Terbatas)</h3>
        <p className="text-xs text-slate-300 max-w-md mt-1.5 leading-relaxed">
          Formulir pencatatan mutasi kas dinonaktifkan untuk akun Tamu / Auditor Eksternal. Anda memiliki izin penuh untuk memantau ringkasan saldo, detail rekonsiliasi, dan mengunduh laporan PDF.
        </p>
        <div className="mt-4 inline-flex items-center gap-2 bg-slate-800/80 px-3 py-1.5 rounded-full text-xs font-semibold text-amber-300 border border-amber-800/50">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
          Izin Pengguna: Lihat Saja (Read-Only)
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-6 flex flex-col justify-between">
      
      {/* Header Form */}
      <div className="flex flex-wrap items-center justify-between pb-3 border-b border-slate-100 gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-corporate-900 text-white flex items-center justify-center shadow-md shrink-0">
            <Receipt className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">Catat Mutasi Aktual</h3>
            <p className="text-xs text-slate-500">Pencatatan realisasi kas masuk/keluar harian.</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button 
            type="button"
            onClick={handleDownloadTemplate}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl shadow-xs hover:bg-emerald-100 transition-all cursor-pointer"
            title="Unduh Template Excel (.xlsx)"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" /> Template Excel
          </button>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleImportExcel} 
            accept=".xlsx, .xls, .csv" 
            className="hidden" 
          />
          <button 
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-corporate-700 bg-white border border-slate-200 rounded-xl shadow-xs hover:bg-slate-50 transition-all cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5" /> Import Excel
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
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">2. Pilih Rekening Bank / Kas</label>
            <select
              value={bankId}
              onChange={(e) => setBankId(e.target.value)}
              className="w-full px-3 py-2.5 text-sm font-semibold bg-slate-50 border border-slate-200 rounded-xl text-corporate-900 focus:ring-2 focus:ring-corporate-500 cursor-pointer"
            >
              {banks.length === 0 && <option value="">-- Buat Bank Dulu --</option>}
              {banks.map(b => (
                <option key={b.id} value={b.id}>
                  {b.tipeAkun === 'kas' ? '💵 [Kas]' : '🏦 [Bank]'} {b.name}
                </option>
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
                className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all ${tipe === 'pemasukan' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-200/60'}`}
              >
                <ArrowDownLeft className="w-4 h-4" /> Pemasukan
              </button>
              <button
                type="button"
                onClick={() => setTipe('pengeluaran')}
                className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all ${tipe === 'pengeluaran' ? 'bg-rose-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-200/60'}`}
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
            className={`w-full py-3 rounded-xl text-sm font-bold text-white transition-all flex items-center justify-center gap-2 shadow-xs ${
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
