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
  Target,
  Zap,
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

  // Filter jenis mutasi: 'all' | 'pemasukan' | 'pengeluaran'
  const [jenisFilter, setJenisFilter] = useState('all');

  // Filter status transaksi: 'all' | 'forecast' | 'non_forecast'
  const [forecastFilter, setForecastFilter] = useState('all');

  // Toggle panel filter terbuka/tertutup
  const [filterOpen, setFilterOpen] = useState(true);

  // Toggle mode layar penuh lebar
  const [isFullWidth, setIsFullWidth] = useState(false);

  const printRef = useRef(null);

  // ─── Helper Cek Status Forecast Transaksi ─────────────────────────────────
  const isForecastTx = (t) => {
    return Boolean(t.planId && t.planId !== 'unplanned' && forecasts.some(f => f.id === t.planId));
  };

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
    // 1. Filter awal transaksi sesuai periode bulan dan rekening terpilih
    const filtered = transactions.filter(t => {
      if (!t.tanggal) return false;
      if (selectedMonth && !t.tanggal.startsWith(selectedMonth)) return false;
      if (!selectedBankIds.includes(t.bankId)) return false;
      return true;
    });

    // 2. Ambil semua kombinasi tanggal × bankId unik
    const keys = new Set();
    filtered.forEach(t => keys.add(`${t.tanggal}__${t.bankId}`));
    const sortedKeys = Array.from(keys).sort(); // "YYYY-MM-DD__bankId"

    // 3. Semua transaksi periode ini per bank (untuk menghitung running balance yang mulus)
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

    // Hitung baris data
    const rowMap = {};
    sortedKeys.forEach(key => {
      const [tanggal, bankId] = key.split('__');
      const bank = banks.find(b => b.id === bankId);
      if (!bank) return;

      const state = runningBankSaldo[bankId];
      const allTxForBank = allPeriodTxByBank[bankId] || [];

      // Perbarui running balance dengan transaksi hari-hari sebelumnya
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

      // Filter transaksi hari ini berdasarkan jenis mutasi dan status forecast
      const filteredTodayTx = todayAllTx.filter(t => {
        // Filter Jenis Mutasi
        if (jenisFilter === 'pemasukan') {
          if (!(isOperationalIncome(t) || (isTransferTransaction(t) && getTransferDirection(t) === 'in'))) {
            return false;
          }
        }
        if (jenisFilter === 'pengeluaran') {
          if (!(isOperationalExpense(t) || (isTransferTransaction(t) && getTransferDirection(t) === 'out'))) {
            return false;
          }
        }
        // Filter Status Transaksi (Forecast vs Non Forecast)
        const isFc = isForecastTx(t);
        if (forecastFilter === 'forecast' && !isFc) {
          return false;
        }
        if (forecastFilter === 'non_forecast' && isFc) {
          return false;
        }
        return true;
      });

      // Jika tidak ada transaksi yang cocok dengan filter pada hari & rekening ini, lewati baris ini
      if (filteredTodayTx.length === 0) {
        return;
      }

      // Sub-kalkulasi: Pemasukan Forecast vs Non-Forecast
      const pemasukanForecast = filteredTodayTx
        .filter(t => isOperationalIncome(t) && isForecastTx(t))
        .reduce((s, t) => s + (Number(t.nominal) || 0), 0);
      const pemasukanNonForecast = filteredTodayTx
        .filter(t => isOperationalIncome(t) && !isForecastTx(t))
        .reduce((s, t) => s + (Number(t.nominal) || 0), 0);
      const pemasukanTransfer = filteredTodayTx
        .filter(t => isTransferTransaction(t) && getTransferDirection(t) === 'in')
        .reduce((s, t) => s + (Number(t.nominal) || 0), 0);

      // Sub-kalkulasi: Pengeluaran Forecast vs Non-Forecast
      const pengeluaranForecast = filteredTodayTx
        .filter(t => isOperationalExpense(t) && isForecastTx(t))
        .reduce((s, t) => s + (Number(t.nominal) || 0), 0);
      const pengeluaranNonForecast = filteredTodayTx
        .filter(t => isOperationalExpense(t) && !isForecastTx(t))
        .reduce((s, t) => s + (Number(t.nominal) || 0), 0);
      const pengeluaranTransfer = filteredTodayTx
        .filter(t => isTransferTransaction(t) && getTransferDirection(t) === 'out')
        .reduce((s, t) => s + (Number(t.nominal) || 0), 0);

      const totalPemasukan = pemasukanForecast + pemasukanNonForecast + pemasukanTransfer;
      const totalPengeluaran = pengeluaranForecast + pengeluaranNonForecast + pengeluaranTransfer;

      // Keterangan: gabung semua deskripsi transaksi hari itu yang lolos filter
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
  }, [banks, transactions, forecasts, selectedMonth, selectedBankIds, jenisFilter, forecastFilter, bankSaldoAwalPeriode]);

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

  // Kolom span dinamis sesuai forecastFilter
  const pemasukanColSpan = forecastFilter === 'all' ? 3 : 1;
  const pengeluaranColSpan = forecastFilter === 'all' ? 3 : 1;

  // Angka aktif untuk ringkasan KPI dan Net Row
  const activePemasukan = forecastFilter === 'forecast'
    ? grandTotal.pemasukanForecast
    : forecastFilter === 'non_forecast'
    ? grandTotal.pemasukanNonForecast
    : grandTotal.totalPemasukan;

  const activePengeluaran = forecastFilter === 'forecast'
    ? grandTotal.pengeluaranForecast
    : forecastFilter === 'non_forecast'
    ? grandTotal.pengeluaranNonForecast
    : grandTotal.totalPengeluaran;

  const activeNet = activePemasukan - activePengeluaran;

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
        if (forecastFilter === 'all') {
          row['Total Pemasukan (Rp)'] = r.totalPemasukan;
          row['  Pemasukan Forecast (Rp)'] = r.pemasukanForecast;
          row['  Pemasukan Non Forecast (Rp)'] = r.pemasukanNonForecast;
          if (jenisFilter === 'all') row['  Transfer Masuk (Rp)'] = r.pemasukanTransfer;
        } else if (forecastFilter === 'forecast') {
          row['Pemasukan Forecast (Rp)'] = r.pemasukanForecast;
        } else if (forecastFilter === 'non_forecast') {
          row['Pemasukan Non Forecast (Rp)'] = r.pemasukanNonForecast;
        }
      }

      if (showPengeluaran) {
        if (forecastFilter === 'all') {
          row['Total Pengeluaran (Rp)'] = r.totalPengeluaran;
          row['  Pengeluaran Forecast (Rp)'] = r.pengeluaranForecast;
          row['  Pengeluaran Non Forecast (Rp)'] = r.pengeluaranNonForecast;
          if (jenisFilter === 'all') row['  Transfer Keluar (Rp)'] = r.pengeluaranTransfer;
        } else if (forecastFilter === 'forecast') {
          row['Pengeluaran Forecast (Rp)'] = r.pengeluaranForecast;
        } else if (forecastFilter === 'non_forecast') {
          row['Pengeluaran Non Forecast (Rp)'] = r.pengeluaranNonForecast;
        }
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
      if (forecastFilter === 'all') {
        totalRow['Total Pemasukan (Rp)'] = grandTotal.totalPemasukan;
        totalRow['  Pemasukan Forecast (Rp)'] = grandTotal.pemasukanForecast;
        totalRow['  Pemasukan Non Forecast (Rp)'] = grandTotal.pemasukanNonForecast;
        if (jenisFilter === 'all') totalRow['  Transfer Masuk (Rp)'] = 0;
      } else if (forecastFilter === 'forecast') {
        totalRow['Pemasukan Forecast (Rp)'] = grandTotal.pemasukanForecast;
      } else if (forecastFilter === 'non_forecast') {
        totalRow['Pemasukan Non Forecast (Rp)'] = grandTotal.pemasukanNonForecast;
      }
    }

    if (showPengeluaran) {
      if (forecastFilter === 'all') {
        totalRow['Total Pengeluaran (Rp)'] = grandTotal.totalPengeluaran;
        totalRow['  Pengeluaran Forecast (Rp)'] = grandTotal.pengeluaranForecast;
        totalRow['  Pengeluaran Non Forecast (Rp)'] = grandTotal.pengeluaranNonForecast;
        if (jenisFilter === 'all') totalRow['  Transfer Keluar (Rp)'] = 0;
      } else if (forecastFilter === 'forecast') {
        totalRow['Pengeluaran Forecast (Rp)'] = grandTotal.pengeluaranForecast;
      } else if (forecastFilter === 'non_forecast') {
        totalRow['Pengeluaran Non Forecast (Rp)'] = grandTotal.pengeluaranNonForecast;
      }
    }

    totalRow['Total Saldo Akhir (Rp)'] = '';
    totalRow['Keterangan'] = '';
    exportData.push(totalRow);

    const periodLabel = selectedMonth ? formatMonthIndo(selectedMonth) : 'Semua_Periode';
    const tagForecast = forecastFilter === 'forecast' ? '_Forecast' : forecastFilter === 'non_forecast' ? '_Non_Forecast' : '';
    downloadExcel(exportData, `Laporan_Kas${tagForecast}_${periodLabel.replace(/\s/g, '_')}.xlsx`, 'Laporan Kas');
  };

  // ─── Print / PDF ──────────────────────────────────────────────────────────
  const handlePrint = () => {
    window.print();
  };

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
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    forecastFilter === 'forecast'
                      ? 'bg-indigo-100 text-indigo-800 border-indigo-200'
                      : forecastFilter === 'non_forecast'
                      ? 'bg-amber-100 text-amber-900 border-amber-200'
                      : 'bg-corporate-100 text-corporate-800 border-corporate-200/80'
                  }`}>
                    {forecastFilter === 'forecast' ? '🎯 Hanya Forecast' : forecastFilter === 'non_forecast' ? '⚡ Non Forecast' : 'Semua Transaksi'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Rekapitulasi mutasi kas masuk, keluar, dan saldo akhir per tanggal transaksi & rekening bank
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Quick Toggle Forecast / Non Forecast di Top Bar */}
              <div className="flex items-center p-0.5 bg-slate-200/70 rounded-xl text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setForecastFilter('all')}
                  className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                    forecastFilter === 'all'
                      ? 'bg-white text-slate-900 shadow-2xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Tampilkan semua transaksi baik forecast maupun non forecast"
                >
                  Semua
                </button>
                <button
                  type="button"
                  onClick={() => setForecastFilter('forecast')}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                    forecastFilter === 'forecast'
                      ? 'bg-indigo-600 text-white shadow-2xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Hanya tampilkan transaksi yang terdaftar dalam Forecast Rencana"
                >
                  <Target className="w-3 h-3" />
                  <span>Forecast</span>
                </button>
                <button
                  type="button"
                  onClick={() => setForecastFilter('non_forecast')}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                    forecastFilter === 'non_forecast'
                      ? 'bg-amber-600 text-white shadow-2xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Hanya tampilkan transaksi di luar rencana (Non Forecast)"
                >
                  <Zap className="w-3 h-3" />
                  <span>Non Forecast</span>
                </button>
              </div>

              {/* Toggle Lebar Penuh */}
              <button
                type="button"
                onClick={() => setIsFullWidth(v => !v)}
                className={`hidden md:flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border transition-colors cursor-pointer shadow-xs ${
                  isFullWidth ? 'bg-corporate-700 text-white border-corporate-800' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
                title={isFullWidth ? "Kembali ke lebar standar" : "Perluas tabel ke lebar penuh layar"}
              >
                {isFullWidth ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                <span>{isFullWidth ? 'Normal' : 'Lebar Penuh'}</span>
              </button>

              {/* Toggle Filter Drawer */}
              <button
                type="button"
                onClick={() => setFilterOpen(v => !v)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer text-slate-700 shadow-xs"
              >
                <Filter className="w-3.5 h-3.5 text-corporate-600" />
                <span>Filter</span>
                {filterOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>

              {/* Export Excel */}
              <button
                type="button"
                onClick={handleExportExcel}
                className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded-xl shadow-xs transition-all cursor-pointer"
                title="Export data laporan ke berkas Microsoft Excel (.xlsx)"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Excel</span>
              </button>

              {/* Cetak / PDF */}
              <button
                type="button"
                onClick={handlePrint}
                className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-corporate-800 hover:bg-corporate-900 active:bg-corporate-950 rounded-xl shadow-xs transition-all cursor-pointer"
                title="Cetak langsung atau simpan sebagai dokumen PDF (A4 Landscape)"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Cetak / PDF</span>
              </button>
            </div>
          </div>
        </div>

        {/* ── Panel Filter Lengkap (Screen Only) ── */}
        {filterOpen && (
          <div id="cash-report-filter-panel" className="p-4 sm:p-5 border-b border-slate-200/80 bg-slate-50/40 no-print">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">

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

              {/* Filter 2: Status Transaksi (Forecast vs Non Forecast) */}
              <div>
                <label className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">
                  <Target className="w-3.5 h-3.5 text-corporate-600" />
                  Status Transaksi
                </label>
                <div className="flex items-center gap-1 p-1 bg-slate-200/70 rounded-xl text-xs font-semibold">
                  {[
                    { val: 'all', label: 'Semua' },
                    { val: 'forecast', label: '🎯 Forecast' },
                    { val: 'non_forecast', label: '⚡ Non Forecast' },
                  ].map(({ val, label }) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setForecastFilter(val)}
                      className={`flex-1 py-1.5 px-1.5 rounded-lg cursor-pointer transition-all whitespace-nowrap text-center ${
                        forecastFilter === val
                          ? val === 'forecast'
                            ? 'bg-indigo-600 text-white shadow-sm font-bold'
                            : val === 'non_forecast'
                            ? 'bg-amber-600 text-white shadow-sm font-bold'
                            : 'bg-white text-slate-900 shadow-sm font-bold'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Filter 3: Jenis Mutasi */}
              <div>
                <label className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">
                  <Filter className="w-3.5 h-3.5 text-corporate-600" />
                  Jenis Mutasi
                </label>
                <div className="flex items-center gap-1 p-1 bg-slate-200/70 rounded-xl text-xs font-semibold">
                  {[
                    { val: 'all', label: 'Semua' },
                    { val: 'pemasukan', label: '↑ Masuk' },
                    { val: 'pengeluaran', label: '↓ Keluar' },
                  ].map(({ val, label }) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setJenisFilter(val)}
                      className={`flex-1 py-1.5 px-1.5 rounded-lg cursor-pointer transition-all whitespace-nowrap text-center ${
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

              {/* Filter 4: Checklist Rekening */}
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
                <strong className="text-slate-800">{formatMonthIndo(selectedMonth)}</strong> • Filter:{' '}
                <strong className="text-slate-800">
                  {forecastFilter === 'forecast' ? 'Hanya Transaksi Forecast' : forecastFilter === 'non_forecast' ? 'Hanya Transaksi Non Forecast' : 'Semua Status'}
                </strong>{' '}
                ({selectedBankIds.length} dari {banks.length} rekening aktif)
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
              <span className="font-semibold">
                {forecastFilter === 'forecast' ? 'Pemasukan Forecast' : forecastFilter === 'non_forecast' ? 'Pemasukan Non Forecast' : 'Total Pemasukan'}
              </span>
              <TrendingUp className="w-4 h-4" />
            </div>
            <div className="text-sm sm:text-base font-extrabold text-emerald-700 font-mono-num truncate">
              {formatRupiah(activePemasukan)}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              {forecastFilter === 'all'
                ? `Forecast: ${formatRupiah(grandTotal.pemasukanForecast)}`
                : forecastFilter === 'forecast'
                ? 'Mutasi rencana anggaran'
                : 'Mutasi di luar anggaran'}
            </div>
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between text-xs text-rose-600 mb-1">
              <span className="font-semibold">
                {forecastFilter === 'forecast' ? 'Pengeluaran Forecast' : forecastFilter === 'non_forecast' ? 'Pengeluaran Non Forecast' : 'Total Pengeluaran'}
              </span>
              <TrendingDown className="w-4 h-4" />
            </div>
            <div className="text-sm sm:text-base font-extrabold text-rose-700 font-mono-num truncate">
              {formatRupiah(activePengeluaran)}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              {forecastFilter === 'all'
                ? `Forecast: ${formatRupiah(grandTotal.pengeluaranForecast)}`
                : forecastFilter === 'forecast'
                ? 'Mutasi rencana anggaran'
                : 'Mutasi di luar anggaran'}
            </div>
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between text-xs text-corporate-600 mb-1">
              <span className="font-semibold">
                Net Mutasi {forecastFilter === 'forecast' ? 'Forecast' : forecastFilter === 'non_forecast' ? 'Non FC' : 'Kas'}
              </span>
              <Layers className="w-4 h-4" />
            </div>
            <div className={`text-sm sm:text-base font-extrabold font-mono-num truncate ${
              activeNet >= 0 ? 'text-emerald-700' : 'text-rose-700'
            }`}>
              {formatRupiah(activeNet)}
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
                <h2 className="text-sm font-extrabold text-slate-800 tracking-wide mt-0.5">
                  LAPORAN ARUS KAS HARIAN PER REKENING
                  {forecastFilter === 'forecast' ? ' (HANYA FORECAST)' : forecastFilter === 'non_forecast' ? ' (HANYA NON FORECAST)' : ''}
                </h2>
                <p className="text-[10px] text-slate-600 font-medium mt-0.5">
                  Periode: <strong className="text-slate-900">{formatMonthIndo(selectedMonth)}</strong>
                  {jenisFilter !== 'all' && ` • Filter: ${jenisFilter === 'pemasukan' ? 'Hanya Pemasukan' : 'Hanya Pengeluaran'}`}
                  {forecastFilter !== 'all' && ` • Status: ${forecastFilter === 'forecast' ? 'Transaksi Forecast' : 'Transaksi Non Forecast'}`}
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
                <span className="font-bold text-emerald-700">{formatRupiah(activePemasukan)}</span>
                {forecastFilter === 'all' && (
                  <span className="text-[8px] text-slate-400 block">Forecast: {formatRupiah(grandTotal.pemasukanForecast)}</span>
                )}
              </div>
              <div>
                <span className="text-slate-500 block">Total Pengeluaran:</span>
                <span className="font-bold text-rose-700">{formatRupiah(activePengeluaran)}</span>
                {forecastFilter === 'all' && (
                  <span className="text-[8px] text-slate-400 block">Forecast: {formatRupiah(grandTotal.pengeluaranForecast)}</span>
                )}
              </div>
              <div>
                <span className="text-slate-500 block">Net Mutasi:</span>
                <span className={`font-black ${activeNet >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                  {formatRupiah(activeNet)}
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
            <table className="w-full text-left border-collapse text-xs min-w-[1200px]">
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
                    <th
                      className="py-2.5 px-3 text-center border-r border-corporate-700 bg-emerald-950/80"
                      colSpan={pemasukanColSpan}
                    >
                      ↑ Mutasi Pemasukan {forecastFilter === 'forecast' ? '(Forecast)' : forecastFilter === 'non_forecast' ? '(Non Forecast)' : ''}
                    </th>
                  )}
                  {showPengeluaran && (
                    <th
                      className="py-2.5 px-3 text-center border-r border-corporate-700 bg-rose-950/80"
                      colSpan={pengeluaranColSpan}
                    >
                      ↓ Mutasi Pengeluaran {forecastFilter === 'forecast' ? '(Forecast)' : forecastFilter === 'non_forecast' ? '(Non Forecast)' : ''}
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
                      {forecastFilter === 'all' && (
                        <>
                          <th className="py-2 px-3 text-right border-r border-corporate-700 bg-emerald-900/60 whitespace-nowrap min-w-[125px]">
                            Total Pemasukan
                          </th>
                          <th className="py-2 px-3 text-right border-r border-corporate-700 bg-emerald-900/40 whitespace-nowrap min-w-[120px]">
                            Pemasukan Forecast
                          </th>
                          <th className="py-2 px-3 text-right border-r border-corporate-700 bg-emerald-900/40 whitespace-nowrap min-w-[120px]">
                            Pemasukan Non FC
                          </th>
                        </>
                      )}
                      {forecastFilter === 'forecast' && (
                        <th className="py-2 px-3 text-right border-r border-corporate-700 bg-emerald-900/60 whitespace-nowrap min-w-[140px]">
                          Pemasukan Forecast
                        </th>
                      )}
                      {forecastFilter === 'non_forecast' && (
                        <th className="py-2 px-3 text-right border-r border-corporate-700 bg-emerald-900/60 whitespace-nowrap min-w-[140px]">
                          Pemasukan Non Forecast
                        </th>
                      )}
                    </>
                  )}
                  {showPengeluaran && (
                    <>
                      {forecastFilter === 'all' && (
                        <>
                          <th className="py-2 px-3 text-right border-r border-corporate-700 bg-rose-900/60 whitespace-nowrap min-w-[125px]">
                            Total Pengeluaran
                          </th>
                          <th className="py-2 px-3 text-right border-r border-corporate-700 bg-rose-900/40 whitespace-nowrap min-w-[120px]">
                            Pengeluaran Forecast
                          </th>
                          <th className="py-2 px-3 text-right border-r border-corporate-700 bg-rose-900/40 whitespace-nowrap min-w-[120px]">
                            Pengeluaran Non FC
                          </th>
                        </>
                      )}
                      {forecastFilter === 'forecast' && (
                        <th className="py-2 px-3 text-right border-r border-corporate-700 bg-rose-900/60 whitespace-nowrap min-w-[140px]">
                          Pengeluaran Forecast
                        </th>
                      )}
                      {forecastFilter === 'non_forecast' && (
                        <th className="py-2 px-3 text-right border-r border-corporate-700 bg-rose-900/60 whitespace-nowrap min-w-[140px]">
                          Pengeluaran Non Forecast
                        </th>
                      )}
                    </>
                  )}
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {/* Empty State */}
                {reportRows.length === 0 && (
                  <tr>
                    <td
                      colSpan={4 + (showPemasukan ? pemasukanColSpan : 0) + (showPengeluaran ? pengeluaranColSpan : 0) + 2}
                      className="py-14 px-4 text-center text-slate-400"
                    >
                      <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3">
                        <FileText className="w-6 h-6 text-slate-300 stroke-[1.75]" />
                      </div>
                      <p className="font-bold text-slate-600 text-sm">Tidak Ada Transaksi Sesuai Filter</p>
                      <p className="text-xs text-slate-400 mt-1">
                        Coba ubah status transaksi (Forecast/Non Forecast), jenis mutasi, atau periode bulan.
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

                      {/* Kolom Pemasukan Disesuaikan */}
                      {showPemasukan && (
                        <>
                          {forecastFilter === 'all' && (
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
                          {forecastFilter === 'forecast' && (
                            <td className="py-2.5 px-3 text-right font-mono-num border-r border-slate-100 min-w-[140px]">
                              {row.pemasukanForecast > 0
                                ? <span className="font-extrabold text-emerald-700">{formatRupiah(row.pemasukanForecast)}</span>
                                : <span className="text-slate-300 font-normal">—</span>}
                            </td>
                          )}
                          {forecastFilter === 'non_forecast' && (
                            <td className="py-2.5 px-3 text-right font-mono-num border-r border-slate-100 min-w-[140px]">
                              {row.pemasukanNonForecast > 0
                                ? <span className="font-extrabold text-amber-600">{formatRupiah(row.pemasukanNonForecast)}</span>
                                : <span className="text-slate-300 font-normal">—</span>}
                            </td>
                          )}
                        </>
                      )}

                      {/* Kolom Pengeluaran Disesuaikan */}
                      {showPengeluaran && (
                        <>
                          {forecastFilter === 'all' && (
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
                          {forecastFilter === 'forecast' && (
                            <td className="py-2.5 px-3 text-right font-mono-num border-r border-slate-100 min-w-[140px]">
                              {row.pengeluaranForecast > 0
                                ? <span className="font-extrabold text-rose-700">{formatRupiah(row.pengeluaranForecast)}</span>
                                : <span className="text-slate-300 font-normal">—</span>}
                            </td>
                          )}
                          {forecastFilter === 'non_forecast' && (
                            <td className="py-2.5 px-3 text-right font-mono-num border-r border-slate-100 min-w-[140px]">
                              {row.pengeluaranNonForecast > 0
                                ? <span className="font-extrabold text-rose-700">{formatRupiah(row.pengeluaranNonForecast)}</span>
                                : <span className="text-slate-300 font-normal">—</span>}
                            </td>
                          )}
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
                      <span className="text-[10px] font-bold uppercase tracking-wider text-corporate-200">
                        GRAND TOTAL {forecastFilter === 'forecast' ? '(FORECAST)' : forecastFilter === 'non_forecast' ? '(NON FORECAST)' : ''}
                      </span>
                    </td>
                    <td className="py-3 px-3 border-r border-corporate-700 text-right font-mono-num text-corporate-300 text-[10px]">
                      —
                    </td>
                    {showPemasukan && (
                      <>
                        {forecastFilter === 'all' && (
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
                        {forecastFilter === 'forecast' && (
                          <td className="py-3 px-3 text-right font-mono-num border-r border-corporate-700 bg-emerald-900/60 font-black text-emerald-100">
                            {formatRupiah(grandTotal.pemasukanForecast)}
                          </td>
                        )}
                        {forecastFilter === 'non_forecast' && (
                          <td className="py-3 px-3 text-right font-mono-num border-r border-corporate-700 bg-emerald-900/60 font-black text-amber-200">
                            {formatRupiah(grandTotal.pemasukanNonForecast)}
                          </td>
                        )}
                      </>
                    )}
                    {showPengeluaran && (
                      <>
                        {forecastFilter === 'all' && (
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
                        {forecastFilter === 'forecast' && (
                          <td className="py-3 px-3 text-right font-mono-num border-r border-corporate-700 bg-rose-900/60 font-black text-rose-100">
                            {formatRupiah(grandTotal.pengeluaranForecast)}
                          </td>
                        )}
                        {forecastFilter === 'non_forecast' && (
                          <td className="py-3 px-3 text-right font-mono-num border-r border-corporate-700 bg-rose-900/60 font-black text-rose-100">
                            {formatRupiah(grandTotal.pengeluaranNonForecast)}
                          </td>
                        )}
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
                          Net Arus Kas {forecastFilter === 'forecast' ? 'Forecast' : forecastFilter === 'non_forecast' ? 'Non Forecast' : 'Periode'} (Masuk − Keluar)
                        </span>
                      </td>
                      <td className="py-2.5 px-3 border-r border-slate-700" />
                      <td colSpan={pemasukanColSpan} className="py-2.5 px-3 text-right font-mono-num text-emerald-300 border-r border-slate-700">
                        Total Masuk: {formatRupiah(activePemasukan)}
                      </td>
                      <td colSpan={pengeluaranColSpan} className="py-2.5 px-3 text-right font-mono-num text-rose-300 border-r border-slate-700">
                        Total Keluar: {formatRupiah(activePengeluaran)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono-num font-extrabold border-r border-slate-700">
                        <span className={activeNet >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                          Net: {formatRupiah(activeNet)}
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
