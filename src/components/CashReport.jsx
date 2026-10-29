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
  Info,
  Maximize2,
  Minimize2,
  TrendingUp,
  TrendingDown,
  Layers,
  Wallet,
} from 'lucide-react';
import { formatRupiah, formatDateIndo, formatMonthIndo } from '../utils/formatters';
import { isTransferTransaction, getTransferDirection, isOperationalIncome, isOperationalExpense, isKasAccount } from '../utils/transactionHelper';
import { downloadExcel } from '../utils/excelHelper';

export const CashReport = ({
  banks = [],
  forecasts = [],
  transactions = [],
  companyName = 'PT GRAHA PRIMA ENERGI',
  currentUser = null,
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

  // Toggle panel filter terbuka/tertutup
  const [filterOpen, setFilterOpen] = useState(true);

  // Toggle mode layar penuh lebar
  const [isFullWidth, setIsFullWidth] = useState(false);

  const printRef = useRef(null);

  // ─── Handler Filter Rekening ──────────────────────────────────────────────
  const handleToggleBank = (bankId) => {
    setSelectedBankIds(prev =>
      prev.includes(bankId) ? prev.filter(id => id !== bankId) : [...prev, bankId]
    );
  };

  const handleSelectAllBanks = () => setSelectedBankIds(banks.map(b => b.id));
  const handleDeselectAllBanks = () => setSelectedBankIds([]);

  // ─── Kalkulasi Saldo Awal Periode per Rekening ──────────────────────────────
  // Logika identik dengan rollover saldo di App.jsx:
  // Saldo awal periode = saldoAwal akun + mutasi bersih sebelum awal bulan ini
  const bankSaldoAwalPeriode = useMemo(() => {
    const result = {};
    if (!selectedMonth) {
      banks.forEach(b => { result[b.id] = Number(b.saldoAwal) || 0; });
      return result;
    }

    const firstDayOfMonth = `${selectedMonth}-01`;

    banks.forEach(bank => {
      const bankCreatedMonth = (bank.tanggalSaldoAwal || '').slice(0, 7);
      let saldo = Number(bank.saldoAwal) || 0;

      // Jika bank dibuat pada/setelah bulan yang dipilih, saldo awal periode = saldoAwal master
      if (bankCreatedMonth && bankCreatedMonth >= selectedMonth) {
        result[bank.id] = saldo;
        return;
      }

      // Akumulasi seluruh transaksi rekening ini SEBELUM awal bulan yang dipilih
      const prevTxs = transactions.filter(t => t.bankId === bank.id && t.tanggal && t.tanggal < firstDayOfMonth);

      const masuk = prevTxs
        .filter(t => isOperationalIncome(t) || (isTransferTransaction(t) && getTransferDirection(t) === 'in'))
        .reduce((sum, t) => sum + (Number(t.nominal) || 0), 0);

      const keluar = prevTxs
        .filter(t => isOperationalExpense(t) || (isTransferTransaction(t) && getTransferDirection(t) === 'out'))
        .reduce((sum, t) => sum + (Number(t.nominal) || 0), 0);

      result[bank.id] = saldo + masuk - keluar;
    });

    return result;
  }, [banks, transactions, selectedMonth]);

  // Total saldo awal dari semua rekening yang dicentang
  const totalSaldoAwalTerpilih = useMemo(() => {
    return selectedBankIds.reduce((sum, bId) => sum + (bankSaldoAwalPeriode[bId] || 0), 0);
  }, [selectedBankIds, bankSaldoAwalPeriode]);

  // ─── Agregasi Data Laporan (Baris: Tanggal × Rekening) ─────────────────────
  const reportRows = useMemo(() => {
    // 1. Filter transaksi sesuai periode bulan dan rekening yang dicentang
    const filtered = transactions.filter(t => {
      if (!t.tanggal) return false;
      if (selectedMonth && !t.tanggal.startsWith(selectedMonth)) return false;
      if (!selectedBankIds.includes(t.bankId)) return false;
      return true;
    });

    // 2. Ambil semua kombinasi tanggal × bankId yang unik, lalu urutkan kronologis
    const keys = new Set();
    filtered.forEach(t => keys.add(`${t.tanggal}__${t.bankId}`));
    const sortedKeys = Array.from(keys).sort(); // "YYYY-MM-DD__bankId"

    // 3. Siapkan semua transaksi periode ini per bank (untuk menghitung running balance yang mulus)
    const allPeriodTxByBank = {};
    banks.forEach(b => { allPeriodTxByBank[b.id] = []; });
    transactions.forEach(t => {
      if (!t.tanggal) return;
      if (selectedMonth && !t.tanggal.startsWith(selectedMonth)) return;
      if (!allPeriodTxByBank[t.bankId]) return;
      allPeriodTxByBank[t.bankId].push(t);
    });

    Object.keys(allPeriodTxByBank).forEach(bankId => {
      allPeriodTxByBank[bankId].sort((a, b) => (a.tanggal || '').localeCompare(b.tanggal || ''));
    });

    // State running balance per rekening
    const runningBankSaldo = {};
    banks.forEach(b => {
      runningBankSaldo[b.id] = {
        lastDate: null,
        runningBefore: bankSaldoAwalPeriode[b.id] ?? 0,
      };
    });

    // Hitung saldo awal dan saldo akhir per tanggal × rekening
    const rowMap = {};
    sortedKeys.forEach(key => {
      const [tanggal, bankId] = key.split('__');
      const bank = banks.find(b => b.id === bankId);
      if (!bank) return;

      const state = runningBankSaldo[bankId];
      const allTxForBank = allPeriodTxByBank[bankId] || [];

      // Perbarui running balance dengan transaksi di hari-hari sebelumnya
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

      // Semua transaksi pada HARI INI untuk rekening ini
      const todayAllTx = allTxForBank.filter(t => t.tanggal === tanggal);
      const dayNetIn = todayAllTx
        .filter(t => isOperationalIncome(t) || (isTransferTransaction(t) && getTransferDirection(t) === 'in'))
        .reduce((s, t) => s + (Number(t.nominal) || 0), 0);
      const dayNetOut = todayAllTx
        .filter(t => isOperationalExpense(t) || (isTransferTransaction(t) && getTransferDirection(t) === 'out'))
        .reduce((s, t) => s + (Number(t.nominal) || 0), 0);

      const saldoAkhirHari = saldoAwalHari + dayNetIn - dayNetOut;

      // Simpan untuk kalkulasi hari berikutnya
      state.runningBefore = saldoAkhirHari;
      state.lastDate = tanggal;

      // Transaksi hari ini yang sesuai dengan filter jenis mutasi
      const filteredTodayTx = todayAllTx.filter(t => {
        if (jenisFilter === 'pemasukan') {
          return isOperationalIncome(t) || (isTransferTransaction(t) && getTransferDirection(t) === 'in');
        }
        if (jenisFilter === 'pengeluaran') {
          return isOperationalExpense(t) || (isTransferTransaction(t) && getTransferDirection(t) === 'out');
        }
        return true;
      });

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

      // Keterangan: gabung semua deskripsi transaksi hari itu
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

  // ─── Grand Total ──────────────────────────────────────────────────────────
  const grandTotal = useMemo(() => ({
    totalPemasukan: reportRows.reduce((s, r) => s + r.totalPemasukan, 0),
    pemasukanForecast: reportRows.reduce((s, r) => s + r.pemasukanForecast, 0),
    pemasukanNonForecast: reportRows.reduce((s, r) => s + r.pemasukanNonForecast, 0),
    totalPengeluaran: reportRows.reduce((s, r) => s + r.totalPengeluaran, 0),
    pengeluaranForecast: reportRows.reduce((s, r) => s + r.pengeluaranForecast, 0),
    pengeluaranNonForecast: reportRows.reduce((s, r) => s + r.pengeluaranNonForecast, 0),
  }), [reportRows]);

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

  // Tanggal & Waktu sekarang untuk kop surat cetak
  const printTimestamp = useMemo(() => {
    const d = new Date();
    return {
      date: d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }),
      time: d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
    };
  }, []);

  return (
    <div className={`space-y-4 ${isFullWidth ? 'w-full' : ''}`}>

      {/* ── CSS Print Khusus A4 Landscape ── */}
      <style>{`
        @media print {
          @page {
            size: A4 landscape;
            margin: 6mm 6mm 6mm 6mm;
          }
          /* Hilangkan sticky dan shadow pada saat cetak */
          .sticky-col {
            position: static !important;
            box-shadow: none !important;
            background: transparent !important;
          }
          #printable-cash-report table {
            font-size: 7.5pt !important;
            line-height: 1.15 !important;
            width: 100% !important;
          }
          #printable-cash-report th,
          #printable-cash-report td {
            padding: 3px 4px !important;
            border: 0.5pt solid #cbd5e1 !important;
          }
          #printable-cash-report thead {
            display: table-header-group !important;
          }
          #printable-cash-report tfoot {
            display: table-footer-group !important;
          }
          #printable-cash-report tr {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
        }
      `}</style>

      {/* ── Kontainer Utama Laporan ── */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-card overflow-hidden">
        
        {/* ── Top Bar Header (Screen Only) ── */}
        <div className="p-4 sm:p-5 border-b border-slate-200/80 bg-slate-50/50 no-print">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-corporate-900 flex items-center justify-center shrink-0 shadow-xs">
                <FileText className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-black text-slate-900 tracking-tight">Laporan Kas Harian per Rekening</h2>
                  <span className="text-[10px] font-bold bg-corporate-100 text-corporate-800 px-2 py-0.5 rounded-full border border-corporate-200/80">
                    A4 Landscape Ready
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Rekapitulasi mutasi kas masuk, kas keluar, dan saldo akhir per tanggal transaksi & rekening bank
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setIsFullWidth(v => !v)}
                className={`hidden md:flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border transition-colors cursor-pointer shadow-xs ${
                  isFullWidth ? 'bg-corporate-700 text-white border-corporate-800' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
                title={isFullWidth ? "Kembali ke lebar standar" : "Perluas tabel ke lebar penuh layar"}
              >
                {isFullWidth ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                <span>{isFullWidth ? 'Lebar Normal' : 'Lebar Penuh'}</span>
              </button>

              <button
                type="button"
                onClick={() => setFilterOpen(v => !v)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer text-slate-700 shadow-xs"
              >
                <Filter className="w-3.5 h-3.5 text-corporate-600" />
                <span>Filter</span>
                {filterOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>

              <button
                type="button"
                onClick={handleExportExcel}
                className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded-xl shadow-xs transition-all cursor-pointer"
                title="Export data laporan ke berkas Microsoft Excel (.xlsx)"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Excel</span>
              </button>

              <button
                type="button"
                onClick={handlePrint}
                className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-corporate-800 hover:bg-corporate-900 active:bg-corporate-950 rounded-xl shadow-xs transition-all cursor-pointer"
                title="Cetak langsung atau simpan sebagai dokumen PDF"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Cetak / Simpan PDF</span>
              </button>
            </div>
          </div>
        </div>

        {/* ── Panel Filter (Screen Only) ── */}
        {filterOpen && (
          <div id="cash-report-filter-panel" className="p-4 sm:p-5 border-b border-slate-200/80 bg-slate-50/40 no-print">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-5">

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
                <div className="flex items-center gap-1.5 p-1 bg-slate-200/70 rounded-xl text-xs font-semibold">
                  {[
                    { val: 'all', label: 'Semua Mutasi' },
                    { val: 'pemasukan', label: '↑ Pemasukan' },
                    { val: 'pengeluaran', label: '↓ Pengeluaran' },
                  ].map(({ val, label }) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setJenisFilter(val)}
                      className={`flex-1 py-1.5 px-2 rounded-lg cursor-pointer transition-all whitespace-nowrap text-center ${
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

              {/* Filter 3: Checklist Rekening */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    <Building className="w-3.5 h-3.5 text-corporate-600" />
                    Pilih Rekening ({selectedBankIds.length}/{banks.length})
                  </label>
                  <div className="flex items-center gap-1.5 text-[10px]">
                    <button type="button" onClick={handleSelectAllBanks} className="text-corporate-600 hover:text-corporate-800 font-semibold cursor-pointer">Pilih Semua</button>
                    <span className="text-slate-300">|</span>
                    <button type="button" onClick={handleDeselectAllBanks} className="text-rose-600 hover:text-rose-800 font-semibold cursor-pointer">Kosongkan</button>
                  </div>
                </div>
                <div className="max-h-28 overflow-y-auto space-y-1 bg-white border border-slate-200 rounded-xl p-2 shadow-xs">
                  {banks.length === 0 && (
                    <p className="text-xs text-slate-400 text-center py-2">Belum ada rekening</p>
                  )}
                  {banks.map(b => {
                    const checked = selectedBankIds.includes(b.id);
                    return (
                      <label
                        key={b.id}
                        className={`flex items-center gap-2 px-2 py-1 rounded-lg cursor-pointer transition-colors text-xs font-medium ${
                          checked ? 'bg-corporate-50 text-corporate-900' : 'text-slate-500 hover:bg-slate-50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => handleToggleBank(b.id)}
                          className="w-3.5 h-3.5 rounded border-slate-300 text-corporate-700 focus:ring-corporate-500 cursor-pointer"
                        />
                        <span className="truncate">{isKasAccount(b) ? '💵' : '🏦'} {b.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="mt-3 flex items-center gap-2 text-[11px] text-slate-500">
              <Info className="w-3.5 h-3.5 shrink-0 text-slate-400" />
              <span>
                Menampilkan <strong className="text-slate-800">{reportRows.length} baris hari × rekening</strong> dari periode{' '}
                <strong className="text-slate-800">{formatMonthIndo(selectedMonth)}</strong>,{' '}
                rekening aktif: <strong className="text-slate-800">{selectedBankIds.length} dari {banks.length}</strong>
              </span>
            </div>
          </div>
        )}

        {/* ── KPI Ringkasan Kas (Screen Only) ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 p-4 bg-slate-50/70 border-b border-slate-200/80 no-print">
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
              <span className="font-semibold">Saldo Awal Terpilih</span>
              <Wallet className="w-4 h-4 text-corporate-600" />
            </div>
            <div className="text-sm sm:text-base font-extrabold text-slate-800 font-mono-num truncate">
              {formatRupiah(totalSaldoAwalTerpilih)}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">{selectedBankIds.length} rekening terpilih</div>
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between text-xs text-emerald-600 mb-1">
              <span className="font-semibold">Total Pemasukan</span>
              <TrendingUp className="w-4 h-4" />
            </div>
            <div className="text-sm sm:text-base font-extrabold text-emerald-700 font-mono-num truncate">
              {formatRupiah(grandTotal.totalPemasukan)}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              Forecast: {formatRupiah(grandTotal.pemasukanForecast)}
            </div>
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between text-xs text-rose-600 mb-1">
              <span className="font-semibold">Total Pengeluaran</span>
              <TrendingDown className="w-4 h-4" />
            </div>
            <div className="text-sm sm:text-base font-extrabold text-rose-700 font-mono-num truncate">
              {formatRupiah(grandTotal.totalPengeluaran)}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              Forecast: {formatRupiah(grandTotal.pengeluaranForecast)}
            </div>
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between text-xs text-corporate-600 mb-1">
              <span className="font-semibold">Net Mutasi Kas</span>
              <Layers className="w-4 h-4" />
            </div>
            <div className={`text-sm sm:text-base font-extrabold font-mono-num truncate ${
              grandTotal.totalPemasukan - grandTotal.totalPengeluaran >= 0 ? 'text-emerald-700' : 'text-rose-700'
            }`}>
              {formatRupiah(grandTotal.totalPemasukan - grandTotal.totalPengeluaran)}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">{reportRows.length} baris hari × rekening</div>
          </div>
        </div>

        {/* ── Area Print & Tabel Laporan ── */}
        <div id="printable-cash-report" ref={printRef} className="p-0 sm:p-2">

          {/* Kop Surat Resmi (Hanya tampil saat dicetak PDF) */}
          <div className="hidden print:block p-4 mb-3 border-b-2 border-slate-900">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-base font-black text-slate-900 uppercase tracking-tight">{companyName}</h1>
                <h2 className="text-sm font-extrabold text-slate-800 tracking-wide mt-0.5">LAPORAN ARUS KAS HARIAN PER REKENING</h2>
                <p className="text-[10px] text-slate-600 font-medium mt-0.5">
                  Periode: <strong className="text-slate-900">{formatMonthIndo(selectedMonth)}</strong>
                  {jenisFilter !== 'all' && ` • Filter: ${jenisFilter === 'pemasukan' ? 'Hanya Pemasukan' : 'Hanya Pengeluaran'}`}
                  {selectedBankIds.length < banks.length && ` • Rekening: ${selectedBankIds.length} dari ${banks.length} terpilih`}
                </p>
              </div>
              <div className="text-right text-[9px] text-slate-500 space-y-0.5">
                <div>Tanggal Cetak: <span className="font-semibold text-slate-800">{printTimestamp.date}</span></div>
                <div>Waktu: <span className="font-semibold text-slate-800">{printTimestamp.time} WIB</span></div>
                <div>Dicetak Oleh: <span className="font-semibold text-slate-800">{currentUser?.name || 'Staff Finance'}</span></div>
                <div className="inline-block px-1.5 py-0.5 text-[8px] font-mono bg-slate-100 border border-slate-300 rounded text-slate-700">A4 Landscape</div>
              </div>
            </div>

            {/* Mini Summary Box saat cetak */}
            <div className="mt-2.5 grid grid-cols-4 gap-2 text-[9px] bg-slate-50 p-2 rounded border border-slate-300">
              <div>
                <span className="text-slate-500 block">Total Pemasukan:</span>
                <span className="font-bold text-emerald-700">{formatRupiah(grandTotal.totalPemasukan)}</span>
                <span className="text-[8px] text-slate-400 block">Forecast: {formatRupiah(grandTotal.pemasukanForecast)}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Total Pengeluaran:</span>
                <span className="font-bold text-rose-700">{formatRupiah(grandTotal.totalPengeluaran)}</span>
                <span className="text-[8px] text-slate-400 block">Forecast: {formatRupiah(grandTotal.pengeluaranForecast)}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Net Arus Kas Periode:</span>
                <span className={`font-black ${grandTotal.totalPemasukan - grandTotal.totalPengeluaran >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                  {formatRupiah(grandTotal.totalPemasukan - grandTotal.totalPengeluaran)}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Total Baris & Mutasi:</span>
                <span className="font-bold text-slate-800">{reportRows.length} baris ({reportRows.reduce((acc, r) => acc + r.txCount, 0)} mutasi)</span>
              </div>
            </div>
          </div>

          {/* Tabel Utama Laporan */}
          <div className="overflow-x-auto max-w-full">
            <table className="w-full text-left border-collapse text-xs min-w-[1300px]">
              <thead>
                {/* ── Header Tingkat 1 (Grup Kolom) ── */}
                <tr className="bg-corporate-900 text-white text-[10px] font-bold uppercase tracking-wider">
                  <th className="sticky-col sticky left-0 z-30 bg-corporate-900 py-2.5 px-2.5 text-center border-r border-corporate-700 w-11 min-w-[44px]" rowSpan={2}>
                    No
                  </th>
                  <th className="sticky-col sticky left-[44px] z-30 bg-corporate-900 py-2.5 px-3 border-r border-corporate-700 w-28 min-w-[110px]" rowSpan={2}>
                    Tanggal<br/>Transaksi
                  </th>
                  <th className="sticky-col sticky left-[154px] z-30 bg-corporate-900 py-2.5 px-3 border-r-2 border-corporate-600 shadow-[3px_0_6px_-2px_rgba(0,0,0,0.3)] w-44 min-w-[170px]" rowSpan={2}>
                    Rekening
                  </th>
                  <th className="py-2.5 px-3 text-right border-r border-corporate-700 min-w-[135px]" rowSpan={2}>
                    Saldo Awal<br/>Periode
                  </th>
                  {showPemasukan && (
                    <th className="py-2.5 px-3 text-center border-r border-corporate-700 bg-emerald-950/80" colSpan={3}>
                      ↑ Mutasi Pemasukan
                    </th>
                  )}
                  {showPengeluaran && (
                    <th className="py-2.5 px-3 text-center border-r border-corporate-700 bg-rose-950/80" colSpan={3}>
                      ↓ Mutasi Pengeluaran
                    </th>
                  )}
                  <th className="py-2.5 px-3 text-right border-r border-corporate-700 min-w-[135px]" rowSpan={2}>
                    Total Saldo<br/>Akhir
                  </th>
                  <th className="py-2.5 px-3 min-w-[240px]" rowSpan={2}>
                    Keterangan
                  </th>
                </tr>

                {/* ── Header Tingkat 2 (Sub-Kolom) ── */}
                <tr className="bg-corporate-800 text-white text-[10px] font-semibold">
                  {showPemasukan && (
                    <>
                      <th className="py-2 px-3 text-right border-r border-corporate-700 bg-emerald-900/60 whitespace-nowrap min-w-[125px]">
                        Total Pemasukan
                      </th>
                      <th className="py-2 px-3 text-right border-r border-corporate-700 bg-emerald-900/40 whitespace-nowrap min-w-[120px]">
                        Pemasukan Forecast
                      </th>
                      <th className="py-2 px-3 text-right border-r border-corporate-700 bg-emerald-900/40 whitespace-nowrap min-w-[120px]">
                        Pemasukan Non Forecast
                      </th>
                    </>
                  )}
                  {showPengeluaran && (
                    <>
                      <th className="py-2 px-3 text-right border-r border-corporate-700 bg-rose-900/60 whitespace-nowrap min-w-[125px]">
                        Total Pengeluaran
                      </th>
                      <th className="py-2 px-3 text-right border-r border-corporate-700 bg-rose-900/40 whitespace-nowrap min-w-[120px]">
                        Pengeluaran Forecast
                      </th>
                      <th className="py-2 px-3 text-right border-r border-corporate-700 bg-rose-900/40 whitespace-nowrap min-w-[120px]">
                        Pengeluaran Non Forecast
                      </th>
                    </>
                  )}
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {/* Empty State */}
                {reportRows.length === 0 && (
                  <tr>
                    <td
                      colSpan={4 + (showPemasukan ? 3 : 0) + (showPengeluaran ? 3 : 0) + 2}
                      className="py-14 px-4 text-center text-slate-400"
                    >
                      <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3">
                        <FileText className="w-6 h-6 text-slate-300 stroke-[1.75]" />
                      </div>
                      <p className="font-bold text-slate-600 text-sm">Tidak Ada Transaksi Ditemukan</p>
                      <p className="text-xs text-slate-400 mt-1">
                        Sesuaikan filter periode bulan atau pilihan rekening di atas.
                      </p>
                    </td>
                  </tr>
                )}

                {/* Baris Data */}
                {reportRows.map((row, idx) => {
                  const isKas = row.tipeAkun === 'Kas';
                  const rowBgClass = idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/70';
                  const stickyBgClass = idx % 2 === 0 ? 'bg-white' : 'bg-slate-50';

                  return (
                    <tr
                      key={`${row.tanggal}__${row.bankId}`}
                      className={`transition-colors hover:bg-corporate-50/40 group ${rowBgClass}`}
                    >
                      {/* No (Sticky) */}
                      <td className={`sticky-col sticky left-0 z-10 ${stickyBgClass} group-hover:bg-corporate-50/60 py-2.5 px-2.5 text-center text-slate-400 font-semibold border-r border-slate-100 w-11 min-w-[44px]`}>
                        {idx + 1}
                      </td>

                      {/* Tanggal Transaksi (Sticky) */}
                      <td className={`sticky-col sticky left-[44px] z-10 ${stickyBgClass} group-hover:bg-corporate-50/60 py-2.5 px-3 whitespace-nowrap border-r border-slate-100 w-28 min-w-[110px]`}>
                        <span className="font-bold text-slate-800 text-xs">{formatDateIndo(row.tanggal)}</span>
                        <div className="text-[10px] text-slate-400">{row.txCount} mutasi</div>
                      </td>

                      {/* Rekening (Sticky + Shadow Separator) */}
                      <td className={`sticky-col sticky left-[154px] z-10 ${stickyBgClass} group-hover:bg-corporate-50/60 py-2.5 px-3 border-r-2 border-slate-300 shadow-[3px_0_6px_-2px_rgba(0,0,0,0.06)] w-44 min-w-[170px]`}>
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm leading-none shrink-0">{isKas ? '💵' : '🏦'}</span>
                          <div className="min-w-0">
                            <div className="font-bold text-slate-800 text-xs truncate" title={row.bankName}>
                              {row.bankName}
                            </div>
                            <div className="text-[10px] text-slate-400">{row.tipeAkun}</div>
                          </div>
                        </div>
                      </td>

                      {/* Saldo Awal Periode */}
                      <td className="py-2.5 px-3 text-right font-mono-num border-r border-slate-100 text-slate-600 font-semibold min-w-[135px]">
                        {formatRupiah(row.saldoAwalHari)}
                      </td>

                      {/* Kolom Pemasukan */}
                      {showPemasukan && (
                        <>
                          <td className="py-2.5 px-3 text-right font-mono-num border-r border-slate-100 min-w-[125px]">
                            {row.totalPemasukan > 0
                              ? <span className="font-extrabold text-emerald-700">{formatRupiah(row.totalPemasukan)}</span>
                              : <span className="text-slate-300 font-normal">—</span>}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono-num border-r border-slate-100 min-w-[120px]">
                            {row.pemasukanForecast > 0
                              ? <span className="font-semibold text-emerald-600">{formatRupiah(row.pemasukanForecast)}</span>
                              : <span className="text-slate-300 font-normal">—</span>}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono-num border-r border-slate-100 min-w-[120px]">
                            {row.pemasukanNonForecast > 0
                              ? <span className="font-semibold text-amber-600">{formatRupiah(row.pemasukanNonForecast)}</span>
                              : <span className="text-slate-300 font-normal">—</span>}
                          </td>
                        </>
                      )}

                      {/* Kolom Pengeluaran */}
                      {showPengeluaran && (
                        <>
                          <td className="py-2.5 px-3 text-right font-mono-num border-r border-slate-100 min-w-[125px]">
                            {row.totalPengeluaran > 0
                              ? <span className="font-extrabold text-rose-700">{formatRupiah(row.totalPengeluaran)}</span>
                              : <span className="text-slate-300 font-normal">—</span>}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono-num border-r border-slate-100 min-w-[120px]">
                            {row.pengeluaranForecast > 0
                              ? <span className="font-semibold text-rose-600">{formatRupiah(row.pengeluaranForecast)}</span>
                              : <span className="text-slate-300 font-normal">—</span>}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono-num border-r border-slate-100 min-w-[120px]">
                            {row.pengeluaranNonForecast > 0
                              ? <span className="font-semibold text-rose-400">{formatRupiah(row.pengeluaranNonForecast)}</span>
                              : <span className="text-slate-300 font-normal">—</span>}
                          </td>
                        </>
                      )}

                      {/* Saldo Akhir */}
                      <td className="py-2.5 px-3 text-right font-mono-num border-r border-slate-100 min-w-[135px]">
                        <span className={`font-black ${row.saldoAkhirHari >= 0 ? 'text-slate-900' : 'text-rose-700'}`}>
                          {formatRupiah(row.saldoAkhirHari)}
                        </span>
                      </td>

                      {/* Keterangan */}
                      <td className="py-2.5 px-3 text-slate-600 text-[11px] min-w-[240px] max-w-sm">
                        <span className="italic leading-relaxed block break-words">
                          {row.keterangan || '—'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>

              {/* ── Footer Grand Total ── */}
              {reportRows.length > 0 && (
                <tfoot>
                  <tr className="bg-corporate-900 text-white font-bold text-xs border-t-2 border-corporate-700">
                    <td className="sticky-col sticky left-0 z-30 bg-corporate-900 py-3 px-3 text-center border-r border-corporate-700" colSpan={3}>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-corporate-200">GRAND TOTAL</span>
                    </td>
                    <td className="py-3 px-3 border-r border-corporate-700 text-right font-mono-num text-corporate-300 text-[10px]">
                      —
                    </td>
                    {showPemasukan && (
                      <>
                        <td className="py-3 px-3 text-right font-mono-num border-r border-corporate-700 bg-emerald-900/60 font-black text-emerald-100">
                          {formatRupiah(grandTotal.totalPemasukan)}
                        </td>
                        <td className="py-3 px-3 text-right font-mono-num border-r border-corporate-700 bg-emerald-900/40 font-semibold text-emerald-200 text-[11px]">
                          {formatRupiah(grandTotal.pemasukanForecast)}
                        </td>
                        <td className="py-3 px-3 text-right font-mono-num border-r border-corporate-700 bg-emerald-900/40 font-semibold text-amber-200 text-[11px]">
                          {formatRupiah(grandTotal.pemasukanNonForecast)}
                        </td>
                      </>
                    )}
                    {showPengeluaran && (
                      <>
                        <td className="py-3 px-3 text-right font-mono-num border-r border-corporate-700 bg-rose-900/60 font-black text-rose-100">
                          {formatRupiah(grandTotal.totalPengeluaran)}
                        </td>
                        <td className="py-3 px-3 text-right font-mono-num border-r border-corporate-700 bg-rose-900/40 font-semibold text-rose-200 text-[11px]">
                          {formatRupiah(grandTotal.pengeluaranForecast)}
                        </td>
                        <td className="py-3 px-3 text-right font-mono-num border-r border-corporate-700 bg-rose-900/40 font-semibold text-rose-300 text-[11px]">
                          {formatRupiah(grandTotal.pengeluaranNonForecast)}
                        </td>
                      </>
                    )}
                    <td className="py-3 px-3 border-r border-corporate-700" />
                    <td className="py-3 px-3" />
                  </tr>

                  {/* Ringkasan Net Arus Kas */}
                  {jenisFilter === 'all' && (
                    <tr className="bg-slate-800 text-white text-xs font-bold">
                      <td className="sticky-col sticky left-0 z-30 bg-slate-800 py-2.5 px-3 border-r border-slate-700" colSpan={3}>
                        <span className="text-[10px] uppercase tracking-wider text-slate-300">
                          Net Arus Kas Periode (Masuk − Keluar)
                        </span>
                      </td>
                      <td className="py-2.5 px-3 border-r border-slate-700" />
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

          {/* Catatan Kaki & Tanda Tangan Resmi (Hanya tampil saat dicetak PDF) */}
          <div className="hidden print:block mt-6 pt-4 border-t border-slate-300 text-xs text-slate-700 break-inside-avoid">
            <div className="flex justify-between items-end">
              <div className="space-y-1 text-[9px] text-slate-500">
                <p>• Dokumen ini merupakan Laporan Kas Harian resmi hasil olah sistem informasi keuangan terpadu.</p>
                <p>• Data saldo awal periode dan mutasi bersumber dari pembukuan kas bank yang telah terekonsiliasi.</p>
              </div>

              <div className="flex gap-10 text-center">
                <div className="w-36">
                  <p className="text-[10px] text-slate-500 mb-12">Disiapkan Oleh,</p>
                  <div className="border-b border-slate-800 pb-0.5">
                    <p className="font-bold text-[10px] text-slate-900">{currentUser?.name || 'Staff Finance'}</p>
                  </div>
                  <p className="text-[9px] text-slate-500 mt-0.5">Treasury / Kasir</p>
                </div>

                <div className="w-36">
                  <p className="text-[10px] text-slate-500 mb-12">Diperiksa Oleh,</p>
                  <div className="border-b border-slate-800 pb-0.5">
                    <p className="font-bold text-[10px] text-slate-900">Supervisor Keuangan</p>
                  </div>
                  <p className="text-[9px] text-slate-500 mt-0.5">Accounting & Tax</p>
                </div>

                <div className="w-36">
                  <p className="text-[10px] text-slate-500 mb-12">Disetujui Oleh,</p>
                  <div className="border-b border-slate-800 pb-0.5">
                    <p className="font-bold text-[10px] text-slate-900">Finance Manager</p>
                  </div>
                  <p className="text-[9px] text-slate-500 mt-0.5">Head of Finance</p>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default CashReport;
