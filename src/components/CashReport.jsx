import React, { useState, useMemo, useRef } from 'react';
import {
  FileText,
  Download,
  Printer,
  Calendar,
  Building,
  CheckSquare,
  Square,
  Filter,
  ChevronDown,
  ChevronUp,
  ArrowUpRight,
  ArrowDownLeft,
  RefreshCw,
  Info,
} from 'lucide-react';
import { formatRupiah, formatDateIndo, formatMonthIndo } from '../utils/formatters';
import { isTransferTransaction, getTransferDirection, isOperationalIncome, isOperationalExpense, isKasAccount } from '../utils/transactionHelper';
import { downloadExcel } from '../utils/excelHelper';

export const CashReport = ({
  banks = [],
  forecasts = [],
  transactions = [],
  companyName = 'Laporan Kas',
}) => {
  // ─── Filter State ──────────────────────────────────────────────────────────

  // Daftar bulan tersedia dari data (descending)
  const availableMonths = useMemo(() => {
    const set = new Set();
    transactions.forEach(t => { if (t.tanggal) set.add(t.tanggal.slice(0, 7)); });
    banks.forEach(b => { if (b.tanggalSaldoAwal) set.add(b.tanggalSaldoAwal.slice(0, 7)); });
    const now = new Date();
    set.add(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
    return Array.from(set).sort().reverse();
  }, [banks, transactions]);

  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  // Checklist rekening — default: semua terpilih
  const [selectedBankIds, setSelectedBankIds] = useState(() => banks.map(b => b.id));

  // Sinkronisasi jika banks berubah (rekening baru ditambahkan)
  const prevBanksRef = useRef(banks);
  if (prevBanksRef.current !== banks) {
    prevBanksRef.current = banks;
    const currentIds = banks.map(b => b.id);
    setSelectedBankIds(prev => {
      const merged = [...new Set([...prev, ...currentIds])].filter(id => currentIds.includes(id));
      return merged;
    });
  }

  // Toggle jenis mutasi: 'all' | 'pemasukan' | 'pengeluaran'
  const [jenisFilter, setJenisFilter] = useState('all');

  // Panel filter collapsed/expanded
  const [filterOpen, setFilterOpen] = useState(true);

  const printRef = useRef(null);

  // ─── Toggle rekening (multi-select checklist) ──────────────────────────────
  const handleToggleBank = (bankId) => {
    setSelectedBankIds(prev =>
      prev.includes(bankId) ? prev.filter(id => id !== bankId) : [...prev, bankId]
    );
  };
  const handleSelectAllBanks = () => setSelectedBankIds(banks.map(b => b.id));
  const handleDeselectAllBanks = () => setSelectedBankIds([]);

  // ─── Kalkulasi Saldo Awal Rekening di Awal Periode ─────────────────────────
  // Persis sama dengan logika banksWithPeriodBalances di App.jsx
  const bankSaldoAwalPeriode = useMemo(() => {
    const result = {};
    banks.forEach(b => {
      const masterSaldo = Number(b.saldoAwal) || 0;
      if (!selectedMonth) {
        result[b.id] = masterSaldo;
        return;
      }
      const startOfMonth = `${selectedMonth}-01`;
      // Semua mutasi SEBELUM periode (baik operasional maupun transfer internal)
      const priorIn = transactions
        .filter(t =>
          t.bankId === b.id &&
          (isOperationalIncome(t) || (isTransferTransaction(t) && getTransferDirection(t) === 'in')) &&
          t.tanggal && t.tanggal < startOfMonth
        )
        .reduce((s, t) => s + (Number(t.nominal) || 0), 0);
      const priorOut = transactions
        .filter(t =>
          t.bankId === b.id &&
          (isOperationalExpense(t) || (isTransferTransaction(t) && getTransferDirection(t) === 'out')) &&
          t.tanggal && t.tanggal < startOfMonth
        )
        .reduce((s, t) => s + (Number(t.nominal) || 0), 0);
      result[b.id] = masterSaldo + priorIn - priorOut;
    });
    return result;
  }, [banks, transactions, selectedMonth]);

  // ─── Buat Flat Records: Agregasi per Tanggal × Rekening ───────────────────
  // Menggunakan pola useMemo sesuai dokumentasi terbaru React (context7)
  const reportRows = useMemo(() => {
    // 1. Filter transaksi sesuai periode dan rekening terpilih
    const filtered = transactions.filter(t => {
      if (!t.tanggal) return false;
      if (selectedMonth && !t.tanggal.startsWith(selectedMonth)) return false;
      if (!selectedBankIds.includes(t.bankId)) return false;
      // Filter jenis mutasi
      if (jenisFilter === 'pemasukan' && !isOperationalIncome(t) && !(isTransferTransaction(t) && getTransferDirection(t) === 'in')) return false;
      if (jenisFilter === 'pengeluaran' && !isOperationalExpense(t) && !(isTransferTransaction(t) && getTransferDirection(t) === 'out')) return false;
      return true;
    });

    // 2. Ambil semua kombinasi tanggal × bankId yang unik, lalu sort ascending
    const keys = new Set();
    filtered.forEach(t => keys.add(`${t.tanggal}__${t.bankId}`));
    const sortedKeys = Array.from(keys).sort(); // "YYYY-MM-DD__bankId" → urutan kronologis

    // 3. Hitung running saldo per rekening, dimulai dari saldo awal periode
    //    Untuk running saldo yang akurat, kita perlu semua transaksi pada rekening
    //    di dalam periode ini — tanpa filter jenis (agar saldo tidak melompat)
    const allPeriodTxByBank = {};
    banks.forEach(b => { allPeriodTxByBank[b.id] = []; });
    transactions.forEach(t => {
      if (!t.tanggal) return;
      if (selectedMonth && !t.tanggal.startsWith(selectedMonth)) return;
      if (!allPeriodTxByBank[t.bankId]) return;
      allPeriodTxByBank[t.bankId].push(t);
    });

    // Urutkan tiap rekening berdasarkan tanggal ascending
    Object.keys(allPeriodTxByBank).forEach(bankId => {
      allPeriodTxByBank[bankId].sort((a, b) => (a.tanggal || '').localeCompare(b.tanggal || ''));
    });

    // Running saldo tracker per rekening
    const runningBankSaldo = {};
    banks.forEach(b => {
      runningBankSaldo[b.id] = {
        lastDate: null,
        runningBefore: bankSaldoAwalPeriode[b.id] ?? 0, // saldo sebelum tanggal ini
      };
    });

    // Hitung saldo awal dan akhir per (tanggal × rekening) dengan running approach
    const rowMap = {};
    sortedKeys.forEach(key => {
      const [tanggal, bankId] = key.split('__');
      const bank = banks.find(b => b.id === bankId);
      if (!bank) return;

      // Advance running saldo sampai tanggal ini
      const state = runningBankSaldo[bankId];
      const allTxForBank = allPeriodTxByBank[bankId] || [];

      // Mutasi di hari-hari sebelum tanggal ini yang belum dihitung
      const pendingDates = [...new Set(allTxForBank.map(t => t.tanggal))]
        .filter(d => d < tanggal && d !== state.lastDate)
        .sort();

      pendingDates.forEach(d => {
        if (state.lastDate && d <= state.lastDate) return;
        const dayTxs = allTxForBank.filter(t => t.tanggal === d);
        const dayIn = dayTxs
          .filter(t => isOperationalIncome(t) || (isTransferTransaction(t) && getTransferDirection(t) === 'in'))
          .reduce((s, t) => s + (Number(t.nominal) || 0), 0);
        const dayOut = dayTxs
          .filter(t => isOperationalExpense(t) || (isTransferTransaction(t) && getTransferDirection(t) === 'out'))
          .reduce((s, t) => s + (Number(t.nominal) || 0), 0);
        state.runningBefore = state.runningBefore + dayIn - dayOut;
        state.lastDate = d;
      });

      const saldoAwalHari = state.runningBefore;

      // Semua transaksi hari ini pada rekening ini (dari semua jenis, untuk saldo)
      const allTodayTx = allTxForBank.filter(t => t.tanggal === tanggal);
      const todayIn_all = allTodayTx
        .filter(t => isOperationalIncome(t) || (isTransferTransaction(t) && getTransferDirection(t) === 'in'))
        .reduce((s, t) => s + (Number(t.nominal) || 0), 0);
      const todayOut_all = allTodayTx
        .filter(t => isOperationalExpense(t) || (isTransferTransaction(t) && getTransferDirection(t) === 'out'))
        .reduce((s, t) => s + (Number(t.nominal) || 0), 0);
      const saldoAkhirHari = saldoAwalHari + todayIn_all - todayOut_all;

      // Transaksi hari ini yang sudah difilter (sesuai jenisFilter)
      const filteredTodayTx = filtered.filter(t => t.bankId === bankId && t.tanggal === tanggal);

      // Sub-kalkulasi: Pemasukan Forecast vs Non-Forecast
      const pemasukanForecast = filteredTodayTx
        .filter(t => isOperationalIncome(t) && t.planId && t.planId !== 'unplanned' && forecasts.some(f => f.id === t.planId))
        .reduce((s, t) => s + (Number(t.nominal) || 0), 0);
      const pemasukanNonForecast = filteredTodayTx
        .filter(t => isOperationalIncome(t) && (!t.planId || t.planId === 'unplanned' || !forecasts.some(f => f.id === t.planId)))
        .reduce((s, t) => s + (Number(t.nominal) || 0), 0);
      const pemasukanTransfer = filteredTodayTx
        .filter(t => isTransferTransaction(t) && getTransferDirection(t) === 'in')
        .reduce((s, t) => s + (Number(t.nominal) || 0), 0);

      // Sub-kalkulasi: Pengeluaran Forecast vs Non-Forecast
      const pengeluaranForecast = filteredTodayTx
        .filter(t => isOperationalExpense(t) && t.planId && t.planId !== 'unplanned' && forecasts.some(f => f.id === t.planId))
        .reduce((s, t) => s + (Number(t.nominal) || 0), 0);
      const pengeluaranNonForecast = filteredTodayTx
        .filter(t => isOperationalExpense(t) && (!t.planId || t.planId === 'unplanned' || !forecasts.some(f => f.id === t.planId)))
        .reduce((s, t) => s + (Number(t.nominal) || 0), 0);
      const pengeluaranTransfer = filteredTodayTx
        .filter(t => isTransferTransaction(t) && getTransferDirection(t) === 'out')
        .reduce((s, t) => s + (Number(t.nominal) || 0), 0);

      const totalPemasukan = pemasukanForecast + pemasukanNonForecast + pemasukanTransfer;
      const totalPengeluaran = pengeluaranForecast + pengeluaranNonForecast + pengeluaranTransfer;

      // Keterangan: gabung semua deskripsi transaksi yang terfilter
      const keterangan = filteredTodayTx
        .map(t => t.deskripsi || '')
        .filter(Boolean)
        .join('; ');

      rowMap[key] = {
        tanggal,
        bankId,
        bankName: bank.name,
        tipeAkun: isKasAccount(bank) ? 'Kas' : 'Bank',
        saldoAwalHari,
        pemasukanForecast,
        pemasukanNonForecast,
        pemasukanTransfer,
        totalPemasukan,
        pengeluaranForecast,
        pengeluaranNonForecast,
        pengeluaranTransfer,
        totalPengeluaran,
        saldoAkhirHari,
        keterangan,
        txCount: filteredTodayTx.length,
      };
    });

    return sortedKeys.map(k => rowMap[k]).filter(Boolean);
  }, [banks, transactions, forecasts, selectedMonth, selectedBankIds, jenisFilter, bankSaldoAwalPeriode]);

  // ─── Grand Total (footer baris total) ──────────────────────────────────────
  const grandTotal = useMemo(() => ({
    totalPemasukan: reportRows.reduce((s, r) => s + r.totalPemasukan, 0),
    pemasukanForecast: reportRows.reduce((s, r) => s + r.pemasukanForecast, 0),
    pemasukanNonForecast: reportRows.reduce((s, r) => s + r.pemasukanNonForecast, 0),
    totalPengeluaran: reportRows.reduce((s, r) => s + r.totalPengeluaran, 0),
    pengeluaranForecast: reportRows.reduce((s, r) => s + r.pengeluaranForecast, 0),
    pengeluaranNonForecast: reportRows.reduce((s, r) => s + r.pengeluaranNonForecast, 0),
  }), [reportRows]);

  // ─── Tampilkan kolom sesuai filter jenis ──────────────────────────────────
  const showPemasukan = jenisFilter === 'all' || jenisFilter === 'pemasukan';
  const showPengeluaran = jenisFilter === 'all' || jenisFilter === 'pengeluaran';

  // ─── Export Excel ──────────────────────────────────────────────────────────
  const handleExportExcel = () => {
    if (reportRows.length === 0) return alert('Tidak ada data untuk diexport.');
    const exportData = reportRows.map((r, i) => {
      const row = {
        'No': i + 1,
        'Tanggal': formatDateIndo(r.tanggal),
        'Rekening': `${r.tipeAkun === 'Kas' ? '💵' : '🏦'} ${r.bankName}`,
        'Tipe Akun': r.tipeAkun,
        'Saldo Awal Periode (Rp)': r.saldoAwalHari,
      };
      if (showPemasukan) {
        row['Total Pemasukan (Rp)'] = r.totalPemasukan;
        row['  Pemasukan Forecast (Rp)'] = r.pemasukanForecast;
        row['  Pemasukan Non Forecast (Rp)'] = r.pemasukanNonForecast;
        if (jenisFilter === 'all') row['  Transfer Masuk (Rp)'] = r.pemasukanTransfer;
      }
      if (showPengeluaran) {
        row['Total Pengeluaran (Rp)'] = r.totalPengeluaran;
        row['  Pengeluaran Forecast (Rp)'] = r.pengeluaranForecast;
        row['  Pengeluaran Non Forecast (Rp)'] = r.pengeluaranNonForecast;
        if (jenisFilter === 'all') row['  Transfer Keluar (Rp)'] = r.pengeluaranTransfer;
      }
      row['Total Saldo Akhir (Rp)'] = r.saldoAkhirHari;
      row['Keterangan'] = r.keterangan;
      return row;
    });

    // Baris grand total
    const totalRow = {
      'No': '',
      'Tanggal': 'GRAND TOTAL',
      'Rekening': '',
      'Tipe Akun': '',
      'Saldo Awal Periode (Rp)': '',
    };
    if (showPemasukan) {
      totalRow['Total Pemasukan (Rp)'] = grandTotal.totalPemasukan;
      totalRow['  Pemasukan Forecast (Rp)'] = grandTotal.pemasukanForecast;
      totalRow['  Pemasukan Non Forecast (Rp)'] = grandTotal.pemasukanNonForecast;
      if (jenisFilter === 'all') totalRow['  Transfer Masuk (Rp)'] = 0;
    }
    if (showPengeluaran) {
      totalRow['Total Pengeluaran (Rp)'] = grandTotal.totalPengeluaran;
      totalRow['  Pengeluaran Forecast (Rp)'] = grandTotal.pengeluaranForecast;
      totalRow['  Pengeluaran Non Forecast (Rp)'] = grandTotal.pengeluaranNonForecast;
      if (jenisFilter === 'all') totalRow['  Transfer Keluar (Rp)'] = 0;
    }
    totalRow['Total Saldo Akhir (Rp)'] = '';
    totalRow['Keterangan'] = '';
    exportData.push(totalRow);

    const periodLabel = selectedMonth ? formatMonthIndo(selectedMonth) : 'Semua_Periode';
    downloadExcel(exportData, `Laporan_Kas_${periodLabel.replace(/\s/g, '_')}.xlsx`, 'Laporan Kas Harian');
  };

  // ─── Print / PDF ──────────────────────────────────────────────────────────
  const handlePrint = () => {
    window.print();
  };

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">

      {/* ── CSS Print Style (injected inline) ── */}
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #cash-report-print-area, #cash-report-print-area * { visibility: visible !important; }
          #cash-report-print-area { position: fixed !important; top: 0; left: 0; width: 100%; z-index: 9999; background: white; }
          #cash-report-filter-panel { display: none !important; }
          .no-print { display: none !important; }
          table { font-size: 10px !important; }
          th, td { padding: 4px 6px !important; }
        }
      `}</style>

      {/* ── Header Komponen ── */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-card overflow-hidden">
        <div className="p-5 border-b border-slate-200/80 bg-slate-50/50">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-corporate-900 flex items-center justify-center shrink-0">
                <FileText className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <h2 className="text-lg font-black text-slate-900 tracking-tight">Laporan Kas Harian per Rekening</h2>
                <p className="text-[11px] text-slate-500 font-medium">
                  Rekapitulasi arus kas masuk & keluar per tanggal transaksi dan rekening bank/kas
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 no-print">
              <button
                type="button"
                onClick={() => setFilterOpen(v => !v)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer text-slate-700 shadow-xs"
              >
                <Filter className="w-3.5 h-3.5 text-corporate-600" />
                Filter
                {filterOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
              <button
                type="button"
                onClick={handleExportExcel}
                className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded-xl shadow-xs transition-all cursor-pointer"
                title="Export laporan ke Excel (.xlsx)"
              >
                <Download className="w-3.5 h-3.5" />
                Export Excel
              </button>
              <button
                type="button"
                onClick={handlePrint}
                className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-slate-700 hover:bg-slate-800 rounded-xl shadow-xs transition-all cursor-pointer"
                title="Cetak / simpan sebagai PDF"
              >
                <Printer className="w-3.5 h-3.5" />
                Cetak / PDF
              </button>
            </div>
          </div>
        </div>

        {/* ── Panel Filter ── */}
        {filterOpen && (
          <div id="cash-report-filter-panel" className="p-5 border-b border-slate-200/80 bg-slate-50/30 no-print">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

              {/* Filter 1: Periode Bulan */}
              <div>
                <label className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">
                  <Calendar className="w-3.5 h-3.5 text-corporate-600" />
                  Periode Bulan
                </label>
                <select
                  value={selectedMonth}
                  onChange={e => setSelectedMonth(e.target.value)}
                  className="w-full px-3 py-2 text-sm font-semibold bg-white border border-slate-200 rounded-xl cursor-pointer text-slate-800 focus:outline-none focus:ring-2 focus:ring-corporate-500 shadow-xs"
                >
                  {availableMonths.map(m => (
                    <option key={m} value={m}>{formatMonthIndo(m)}</option>
                  ))}
                </select>
              </div>

              {/* Filter 2: Jenis Mutasi */}
              <div>
                <label className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">
                  <Filter className="w-3.5 h-3.5 text-corporate-600" />
                  Jenis Mutasi
                </label>
                <div className="flex items-center gap-1.5 p-1 bg-slate-200/60 rounded-xl text-xs font-semibold">
                  {[
                    { val: 'all', label: 'Semua' },
                    { val: 'pemasukan', label: '↑ Pemasukan' },
                    { val: 'pengeluaran', label: '↓ Pengeluaran' },
                  ].map(({ val, label }) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setJenisFilter(val)}
                      className={`flex-1 py-1.5 px-2 rounded-lg cursor-pointer transition-all whitespace-nowrap ${
                        jenisFilter === val
                          ? val === 'pemasukan'
                            ? 'bg-emerald-600 text-white shadow-sm font-bold'
                            : val === 'pengeluaran'
                            ? 'bg-rose-600 text-white shadow-sm font-bold'
                            : 'bg-white text-slate-900 shadow-sm font-bold'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Filter 3: Pilih Rekening (Checklist) */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    <Building className="w-3.5 h-3.5 text-corporate-600" />
                    Rekening ({selectedBankIds.length}/{banks.length})
                  </label>
                  <div className="flex items-center gap-1.5 text-[10px]">
                    <button type="button" onClick={handleSelectAllBanks} className="text-corporate-600 hover:text-corporate-800 font-semibold cursor-pointer">Pilih Semua</button>
                    <span className="text-slate-300">|</span>
                    <button type="button" onClick={handleDeselectAllBanks} className="text-rose-600 hover:text-rose-800 font-semibold cursor-pointer">Kosongkan</button>
                  </div>
                </div>
                <div className="max-h-32 overflow-y-auto space-y-1 bg-white border border-slate-200 rounded-xl p-2 shadow-xs">
                  {banks.length === 0 && (
                    <p className="text-xs text-slate-400 text-center py-2">Belum ada rekening</p>
                  )}
                  {banks.map(b => {
                    const checked = selectedBankIds.includes(b.id);
                    return (
                      <label
                        key={b.id}
                        className={`flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer transition-colors text-xs font-medium ${
                          checked ? 'bg-corporate-50 text-corporate-900' : 'text-slate-500 hover:bg-slate-50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => handleToggleBank(b.id)}
                          className="w-3.5 h-3.5 rounded border-slate-300 text-corporate-700 focus:ring-corporate-500 cursor-pointer"
                        />
                        <span>{isKasAccount(b) ? '💵' : '🏦'} {b.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Info ringkasan filter */}
            <div className="mt-3 flex items-center gap-2 text-[11px] text-slate-500">
              <Info className="w-3.5 h-3.5 shrink-0 text-slate-400" />
              <span>
                Menampilkan <strong className="text-slate-700">{reportRows.length} baris</strong> dari periode{' '}
                <strong className="text-slate-700">{formatMonthIndo(selectedMonth)}</strong>,{' '}
                rekening terpilih: <strong className="text-slate-700">{selectedBankIds.length} dari {banks.length}</strong>
              </span>
            </div>
          </div>
        )}

        {/* ── Area Print ── */}
        <div id="cash-report-print-area" ref={printRef}>

          {/* Kop Surat (tampil di print) */}
          <div className="hidden print:block px-6 pt-5 pb-3 border-b border-slate-300">
            <div className="text-center">
              <h1 className="text-lg font-black text-slate-900">{companyName}</h1>
              <h2 className="text-base font-bold text-slate-800">LAPORAN KAS HARIAN PER REKENING</h2>
              <p className="text-sm text-slate-600">
                Periode: {formatMonthIndo(selectedMonth)}
                {jenisFilter !== 'all' && ` • Jenis: ${jenisFilter === 'pemasukan' ? 'Pemasukan' : 'Pengeluaran'}`}
              </p>
            </div>
          </div>

          {/* Tabel Laporan */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                {/* ── Header Grup Kolom ── */}
                <tr className="bg-corporate-900 text-white text-[10px] font-bold uppercase tracking-wider">
                  <th className="py-2.5 px-3 text-center border-r border-corporate-700" rowSpan={2}>No</th>
                  <th className="py-2.5 px-3 border-r border-corporate-700" rowSpan={2}>Tanggal<br/>Transaksi</th>
                  <th className="py-2.5 px-3 border-r border-corporate-700" rowSpan={2}>Rekening</th>
                  <th className="py-2.5 px-3 text-right border-r border-corporate-700" rowSpan={2}>Saldo Awal<br/>Periode</th>
                  {showPemasukan && (
                    <th className="py-2.5 px-3 text-center border-r border-corporate-700 bg-emerald-900/80" colSpan={3}>
                      ↑ Pemasukan
                    </th>
                  )}
                  {showPengeluaran && (
                    <th className="py-2.5 px-3 text-center border-r border-corporate-700 bg-rose-900/80" colSpan={3}>
                      ↓ Pengeluaran
                    </th>
                  )}
                  <th className="py-2.5 px-3 text-right border-r border-corporate-700" rowSpan={2}>Total Saldo<br/>Akhir</th>
                  <th className="py-2.5 px-3" rowSpan={2}>Keterangan</th>
                </tr>
                {/* ── Header Sub-Kolom ── */}
                <tr className="bg-corporate-800 text-white text-[10px] font-semibold">
                  {showPemasukan && (
                    <>
                      <th className="py-2 px-3 text-right border-r border-corporate-700 bg-emerald-900/60 whitespace-nowrap">Total<br/>Pemasukan</th>
                      <th className="py-2 px-3 text-right border-r border-corporate-700 bg-emerald-900/40 whitespace-nowrap">Pemasukan<br/>Forecast</th>
                      <th className="py-2 px-3 text-right border-r border-corporate-700 bg-emerald-900/40 whitespace-nowrap">Pemasukan<br/>Non Forecast</th>
                    </>
                  )}
                  {showPengeluaran && (
                    <>
                      <th className="py-2 px-3 text-right border-r border-corporate-700 bg-rose-900/60 whitespace-nowrap">Total<br/>Pengeluaran</th>
                      <th className="py-2 px-3 text-right border-r border-corporate-700 bg-rose-900/40 whitespace-nowrap">Pengeluaran<br/>Forecast</th>
                      <th className="py-2 px-3 text-right border-r border-corporate-700 bg-rose-900/40 whitespace-nowrap">Pengeluaran<br/>Non Forecast</th>
                    </>
                  )}
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {/* Empty State */}
                {reportRows.length === 0 && (
                  <tr>
                    <td colSpan={4 + (showPemasukan ? 3 : 0) + (showPengeluaran ? 3 : 0) + 2}
                      className="py-14 px-4 text-center text-slate-400">
                      <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3">
                        <FileText className="w-6 h-6 text-slate-300 stroke-[1.75]" />
                      </div>
                      <p className="font-bold text-slate-600 text-sm">Tidak Ada Data</p>
                      <p className="text-xs text-slate-400 mt-1">
                        Tidak ada transaksi yang sesuai dengan filter yang dipilih.
                      </p>
                    </td>
                  </tr>
                )}

                {/* Data Rows */}
                {reportRows.map((row, idx) => {
                  const isKas = row.tipeAkun === 'Kas';
                  return (
                    <tr key={`${row.tanggal}__${row.bankId}`}
                      className={`transition-colors hover:bg-slate-50/70 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'}`}
                    >
                      {/* No */}
                      <td className="py-2.5 px-3 text-center text-slate-400 font-semibold border-r border-slate-100">
                        {idx + 1}
                      </td>

                      {/* Tanggal */}
                      <td className="py-2.5 px-3 whitespace-nowrap border-r border-slate-100">
                        <span className="font-semibold text-slate-800">{formatDateIndo(row.tanggal)}</span>
                        <div className="text-[10px] text-slate-400">{row.txCount} mutasi</div>
                      </td>

                      {/* Rekening */}
                      <td className="py-2.5 px-3 border-r border-slate-100">
                        <div className="flex items-center gap-1.5">
                          <span className="text-base leading-none">{isKas ? '💵' : '🏦'}</span>
                          <div>
                            <div className="font-bold text-slate-800 text-xs">{row.bankName}</div>
                            <div className="text-[10px] text-slate-400">{row.tipeAkun}</div>
                          </div>
                        </div>
                      </td>

                      {/* Saldo Awal */}
                      <td className="py-2.5 px-3 text-right font-mono-num border-r border-slate-100 text-slate-600 font-semibold">
                        {formatRupiah(row.saldoAwalHari)}
                      </td>

                      {/* Kolom Pemasukan */}
                      {showPemasukan && (
                        <>
                          <td className="py-2.5 px-3 text-right font-mono-num border-r border-slate-100">
                            {row.totalPemasukan > 0
                              ? <span className="font-bold text-emerald-700">{formatRupiah(row.totalPemasukan)}</span>
                              : <span className="text-slate-300">—</span>}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono-num border-r border-slate-100">
                            {row.pemasukanForecast > 0
                              ? <span className="text-emerald-600">{formatRupiah(row.pemasukanForecast)}</span>
                              : <span className="text-slate-300">—</span>}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono-num border-r border-slate-100">
                            {row.pemasukanNonForecast > 0
                              ? <span className="text-amber-600">{formatRupiah(row.pemasukanNonForecast)}</span>
                              : <span className="text-slate-300">—</span>}
                          </td>
                        </>
                      )}

                      {/* Kolom Pengeluaran */}
                      {showPengeluaran && (
                        <>
                          <td className="py-2.5 px-3 text-right font-mono-num border-r border-slate-100">
                            {row.totalPengeluaran > 0
                              ? <span className="font-bold text-rose-700">{formatRupiah(row.totalPengeluaran)}</span>
                              : <span className="text-slate-300">—</span>}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono-num border-r border-slate-100">
                            {row.pengeluaranForecast > 0
                              ? <span className="text-rose-600">{formatRupiah(row.pengeluaranForecast)}</span>
                              : <span className="text-slate-300">—</span>}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono-num border-r border-slate-100">
                            {row.pengeluaranNonForecast > 0
                              ? <span className="text-rose-400">{formatRupiah(row.pengeluaranNonForecast)}</span>
                              : <span className="text-slate-300">—</span>}
                          </td>
                        </>
                      )}

                      {/* Saldo Akhir */}
                      <td className="py-2.5 px-3 text-right font-mono-num border-r border-slate-100">
                        <span className={`font-extrabold ${row.saldoAkhirHari >= 0 ? 'text-slate-900' : 'text-rose-700'}`}>
                          {formatRupiah(row.saldoAkhirHari)}
                        </span>
                      </td>

                      {/* Keterangan */}
                      <td className="py-2.5 px-3 text-slate-600 text-[11px] max-w-xs">
                        <span className="italic leading-relaxed">{row.keterangan || '—'}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>

              {/* Footer Grand Total */}
              {reportRows.length > 0 && (
                <tfoot>
                  <tr className="bg-corporate-900 text-white font-bold text-xs border-t-2 border-corporate-700">
                    <td className="py-3 px-3 text-center border-r border-corporate-700" colSpan={4}>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-corporate-200">Grand Total Periode</span>
                    </td>
                    {showPemasukan && (
                      <>
                        <td className="py-3 px-3 text-right font-mono-num border-r border-corporate-700 bg-emerald-900/50">
                          {formatRupiah(grandTotal.totalPemasukan)}
                        </td>
                        <td className="py-3 px-3 text-right font-mono-num border-r border-corporate-700 bg-emerald-900/30 font-normal text-emerald-200">
                          {formatRupiah(grandTotal.pemasukanForecast)}
                        </td>
                        <td className="py-3 px-3 text-right font-mono-num border-r border-corporate-700 bg-emerald-900/30 font-normal text-amber-200">
                          {formatRupiah(grandTotal.pemasukanNonForecast)}
                        </td>
                      </>
                    )}
                    {showPengeluaran && (
                      <>
                        <td className="py-3 px-3 text-right font-mono-num border-r border-corporate-700 bg-rose-900/50">
                          {formatRupiah(grandTotal.totalPengeluaran)}
                        </td>
                        <td className="py-3 px-3 text-right font-mono-num border-r border-corporate-700 bg-rose-900/30 font-normal text-rose-200">
                          {formatRupiah(grandTotal.pengeluaranForecast)}
                        </td>
                        <td className="py-3 px-3 text-right font-mono-num border-r border-corporate-700 bg-rose-900/30 font-normal text-rose-300">
                          {formatRupiah(grandTotal.pengeluaranNonForecast)}
                        </td>
                      </>
                    )}
                    <td className="py-3 px-3 border-r border-corporate-700" />
                    <td className="py-3 px-3" />
                  </tr>

                  {/* Ringkasan Net */}
                  {jenisFilter === 'all' && (
                    <tr className="bg-slate-800 text-white text-xs font-bold">
                      <td className="py-2.5 px-3 border-r border-slate-700" colSpan={4}>
                        <span className="text-[10px] uppercase tracking-wider text-slate-300">Net Arus Kas Periode (Pemasukan − Pengeluaran)</span>
                      </td>
                      <td colSpan={3} className="py-2.5 px-3 text-right font-mono-num text-emerald-300 border-r border-slate-700">
                        Total Masuk: {formatRupiah(grandTotal.totalPemasukan)}
                      </td>
                      <td colSpan={3} className="py-2.5 px-3 text-right font-mono-num text-rose-300 border-r border-slate-700">
                        Total Keluar: {formatRupiah(grandTotal.totalPengeluaran)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono-num font-extrabold border-r border-slate-700">
                        <span className={grandTotal.totalPemasukan - grandTotal.totalPengeluaran >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                          Net: {formatRupiah(grandTotal.totalPemasukan - grandTotal.totalPengeluaran)}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-[10px] text-slate-400 italic">
                        {reportRows.length} hari × rekening
                      </td>
                    </tr>
                  )}
                </tfoot>
              )}
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CashReport;

