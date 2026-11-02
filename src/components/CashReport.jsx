import React, { useState, useMemo, useRef } from 'react';
import {
  FileText,
  Download,
  Printer,
  Calendar,
  Building,
  Filter,
  ChevronDown,
  ChevronUp,
  Info,
  Maximize2,
  Minimize2,
  TrendingUp,
  TrendingDown,
  Layers,
  Target,
  Zap,
  Combine,
  Split,
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

  // Mode pengelompokan Bank: 'pisah' (1 baris per Tanggal x Bank) | 'gabung' (1 baris per Tanggal, gabung seluruh bank)
  const [bankGroupingMode, setBankGroupingMode] = useState('pisah');

  // Filter Mutasi Antar Bank (Transfer): false (Hanya Operasional) | true (Termasuk Transfer Antar Bank)
  const [includeTransfer, setIncludeTransfer] = useState(false);

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

  // ─── Agregasi Data Laporan Sesuai Mode Gabung / Pisah Bank ─────────────────
  const reportRows = useMemo(() => {
    // 1. Filter awal transaksi sesuai periode bulan dan rekening yang dicentang
    const filteredPeriodTx = transactions.filter(t => {
      if (!t.tanggal) return false;
      if (selectedMonth && !t.tanggal.startsWith(selectedMonth)) return false;
      if (!selectedBankIds.includes(t.bankId)) return false;
      return true;
    });

    // 2. Filter transaksi sesuai pilihan Jenis Mutasi, Status Transaksi & Transfer
    const matchedTx = filteredPeriodTx.filter(t => {
      // Filter Transfer Antar Bank
      if (!includeTransfer && isTransferTransaction(t)) {
        return false;
      }

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

      // Filter Status Transaksi
      const isFc = isForecastTx(t);
      if (forecastFilter === 'forecast' && !isFc) return false;
      if (forecastFilter === 'non_forecast' && isFc) return false;

      return true;
    });

    if (matchedTx.length === 0) return [];

    // Helper kalkulasi nominal & keterangan non-forecast untuk kumpulan transaksi
    const summarizeTxs = (txList) => {
      // Pemasukan
      const pemasukanForecast = txList
        .filter(t => isOperationalIncome(t) && isForecastTx(t))
        .reduce((s, t) => s + (Number(t.nominal) || 0), 0);
      const pemasukanNonForecast = txList
        .filter(t => isOperationalIncome(t) && !isForecastTx(t))
        .reduce((s, t) => s + (Number(t.nominal) || 0), 0);
      const pemasukanTransfer = txList
        .filter(t => isTransferTransaction(t) && getTransferDirection(t) === 'in')
        .reduce((s, t) => s + (Number(t.nominal) || 0), 0);

      // Pengeluaran
      const pengeluaranForecast = txList
        .filter(t => isOperationalExpense(t) && isForecastTx(t))
        .reduce((s, t) => s + (Number(t.nominal) || 0), 0);
      const pengeluaranNonForecast = txList
        .filter(t => isOperationalExpense(t) && !isForecastTx(t))
        .reduce((s, t) => s + (Number(t.nominal) || 0), 0);
      const pengeluaranTransfer = txList
        .filter(t => isTransferTransaction(t) && getTransferDirection(t) === 'out')
        .reduce((s, t) => s + (Number(t.nominal) || 0), 0);

      const totalPemasukan = pemasukanForecast + pemasukanNonForecast + pemasukanTransfer;
      const totalPengeluaran = pengeluaranForecast + pengeluaranNonForecast + pengeluaranTransfer;

      // Total Transaksi: jika filter jenis aktif tampilkan total nominal mutasi jenis tersebut, jika 'all' tampilkan akumulasi masuk + keluar
      let totalTransaksi = 0;
      if (jenisFilter === 'pemasukan') {
        totalTransaksi = totalPemasukan;
      } else if (jenisFilter === 'pengeluaran') {
        totalTransaksi = totalPengeluaran;
      } else {
        totalTransaksi = totalPemasukan + totalPengeluaran;
      }

      // Keterangan: HANYA deskripsi dari transaksi non-forecast saja
      const keterangan = txList
        .filter(t => !isForecastTx(t))
        .map(t => t.deskripsi || '')
        .filter(Boolean)
        .join('; ');

      return {
        pemasukanForecast,
        pemasukanNonForecast,
        pemasukanTransfer,
        totalPemasukan,
        pengeluaranForecast,
        pengeluaranNonForecast,
        pengeluaranTransfer,
        totalPengeluaran,
        totalTransaksi,
        keterangan,
        txCount: txList.length,
      };
    };

    // ─── Cabang 1: Mode Gabung Bank (1 baris per Tanggal) ───
    if (bankGroupingMode === 'gabung') {
      const datesSet = new Set(matchedTx.map(t => t.tanggal));
      const sortedDates = Array.from(datesSet).sort();

      return sortedDates.map(tanggal => {
        const todayTxs = matchedTx.filter(t => t.tanggal === tanggal);
        const summary = summarizeTxs(todayTxs);

        // Kumpulkan daftar nama rekening yang terlibat transaksi hari ini
        const involvedBankIds = [...new Set(todayTxs.map(t => t.bankId))];
        const involvedBankNames = involvedBankIds
          .map(bId => banks.find(b => b.id === bId)?.name)
          .filter(Boolean);

        const bankNameDisplay = involvedBankNames.length > 0
          ? (involvedBankNames.length === banks.length && banks.length > 1)
            ? 'Semua Rekening'
            : involvedBankNames.join(', ')
          : 'Semua Rekening';

        return {
          rowKey: tanggal,
          tanggal,
          bankId: 'all',
          bankName: bankNameDisplay,
          tipeAkun: 'Gabungan',
          ...summary,
        };
      });
    }

    // ─── Cabang 2: Mode Pisah Bank (1 baris per Tanggal x Bank) ───
    const keys = new Set();
    matchedTx.forEach(t => keys.add(`${t.tanggal}__${t.bankId}`));
    const sortedKeys = Array.from(keys).sort(); // "YYYY-MM-DD__bankId"

    return sortedKeys.map(key => {
      const [tanggal, bankId] = key.split('__');
      const bank = banks.find(b => b.id === bankId);
      if (!bank) return null;

      const cellTxs = matchedTx.filter(t => t.tanggal === tanggal && t.bankId === bankId);
      const summary = summarizeTxs(cellTxs);

      return {
        rowKey: key,
        tanggal,
        bankId,
        bankName: bank.name,
        tipeAkun: isKasAccount(bank) ? 'Kas' : 'Bank',
        ...summary,
      };
    }).filter(Boolean);

  }, [transactions, banks, forecasts, selectedMonth, selectedBankIds, jenisFilter, forecastFilter, bankGroupingMode, includeTransfer]);

  // ─── Grand Total ──────────────────────────────────────────────────────────
  const grandTotal = useMemo(() => ({
    totalPemasukan: reportRows.reduce((s, r) => s + r.totalPemasukan, 0),
    pemasukanForecast: reportRows.reduce((s, r) => s + r.pemasukanForecast, 0),
    pemasukanNonForecast: reportRows.reduce((s, r) => s + r.pemasukanNonForecast, 0),
    totalPengeluaran: reportRows.reduce((s, r) => s + r.totalPengeluaran, 0),
    pengeluaranForecast: reportRows.reduce((s, r) => s + r.pengeluaranForecast, 0),
    pengeluaranNonForecast: reportRows.reduce((s, r) => s + r.pengeluaranNonForecast, 0),
    totalTransaksi: reportRows.reduce((s, r) => s + r.totalTransaksi, 0),
    txCount: reportRows.reduce((s, r) => s + r.txCount, 0),
  }), [reportRows]);

  const showPemasukan = jenisFilter === 'all' || jenisFilter === 'pemasukan';
  const showPengeluaran = jenisFilter === 'all' || jenisFilter === 'pengeluaran';

  // Sub-kolom dinamis sesuai forecastFilter
  const showPemasukanFC = showPemasukan && (forecastFilter === 'all' || forecastFilter === 'forecast');
  const showPemasukanNonFC = showPemasukan && (forecastFilter === 'all' || forecastFilter === 'non_forecast');
  const showPengeluaranFC = showPengeluaran && (forecastFilter === 'all' || forecastFilter === 'forecast');
  const showPengeluaranNonFC = showPengeluaran && (forecastFilter === 'all' || forecastFilter === 'non_forecast');

  // Angka aktif untuk ringkasan KPI dan Net
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
        'Tanggal Transaksi': formatDateIndo(r.tanggal),
        'Rekening': r.bankGroupingMode === 'gabung' ? r.bankName : `${r.tipeAkun === 'Kas' ? '💵' : r.tipeAkun === 'Bank' ? '🏦' : '📂'} ${r.bankName}`,
        'Total Transaksi (Rp)': r.totalTransaksi,
      };

      if (showPemasukanFC) {
        row['Pemasukan Forecast (Rp)'] = r.pemasukanForecast;
      }
      if (showPemasukanNonFC) {
        row['Pemasukan Non Forecast (Rp)'] = r.pemasukanNonForecast;
      }

      if (showPengeluaranFC) {
        row['Pengeluaran Forecast (Rp)'] = r.pengeluaranForecast;
      }
      if (showPengeluaranNonFC) {
        row['Pengeluaran Non Forecast (Rp)'] = r.pengeluaranNonForecast;
      }

      row['Keterangan (Non Forecast)'] = r.keterangan;
      return row;
    });

    // Baris Grand Total
    const totalRow = {
      'No': '',
      'Tanggal Transaksi': 'GRAND TOTAL',
      'Rekening': '',
      'Total Transaksi (Rp)': grandTotal.totalTransaksi,
    };

    if (showPemasukanFC) totalRow['Pemasukan Forecast (Rp)'] = grandTotal.pemasukanForecast;
    if (showPemasukanNonFC) totalRow['Pemasukan Non Forecast (Rp)'] = grandTotal.pemasukanNonForecast;
    if (showPengeluaranFC) totalRow['Pengeluaran Forecast (Rp)'] = grandTotal.pengeluaranForecast;
    if (showPengeluaranNonFC) totalRow['Pengeluaran Non Forecast (Rp)'] = grandTotal.pengeluaranNonForecast;
    totalRow['Keterangan (Non Forecast)'] = '';
    exportData.push(totalRow);

    const periodLabel = selectedMonth ? formatMonthIndo(selectedMonth) : 'Semua_Periode';
    const tagMode = bankGroupingMode === 'gabung' ? '_GabungBank' : '_PisahBank';
    const tagTransfer = includeTransfer ? '_DgTransfer' : '_TanpaTransfer';
    const tagForecast = forecastFilter === 'forecast' ? '_Forecast' : forecastFilter === 'non_forecast' ? '_Non_Forecast' : '';
    downloadExcel(exportData, `Laporan_Kas${tagMode}${tagTransfer}${tagForecast}_${periodLabel.replace(/\s/g, '_')}.xlsx`, 'Laporan Kas');
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
            font-size: 8pt !important;
            line-height: 1.2 !important;
            width: 100% !important;
          }
          #printable-cash-report th,
          #printable-cash-report td {
            padding: 4px 6px !important;
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
                  <h2 className="text-lg font-black text-slate-900 tracking-tight">Laporan Mutasi Transaksi Kas</h2>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    bankGroupingMode === 'gabung'
                      ? 'bg-purple-100 text-purple-900 border-purple-200'
                      : 'bg-corporate-100 text-corporate-800 border-corporate-200/80'
                  }`}>
                    {bankGroupingMode === 'gabung' ? '📂 Bank Digabung' : '🏦 Bank Terpisah'}
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    includeTransfer
                      ? 'bg-cyan-100 text-cyan-900 border-cyan-200'
                      : 'bg-slate-100 text-slate-700 border-slate-200'
                  }`}>
                    {includeTransfer ? '⇄ Termasuk Transfer' : 'Murni Operasional'}
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    forecastFilter === 'forecast'
                      ? 'bg-indigo-100 text-indigo-800 border-indigo-200'
                      : forecastFilter === 'non_forecast'
                      ? 'bg-amber-100 text-amber-900 border-amber-200'
                      : 'bg-slate-100 text-slate-700 border-slate-200'
                  }`}>
                    {forecastFilter === 'forecast' ? '🎯 Forecast Saja' : forecastFilter === 'non_forecast' ? '⚡ Non Forecast Saja' : 'Semua Transaksi'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Rekapitulasi tanggal transaksi, rekening, total mutasi, rincian forecast/non forecast & deskripsi
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Opsi Gabung / Pisah Bank di Top Bar */}
              <div className="flex items-center p-0.5 bg-slate-200/70 rounded-xl text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setBankGroupingMode('pisah')}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                    bankGroupingMode === 'pisah'
                      ? 'bg-white text-slate-900 shadow-2xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Pisahkan baris per rekening bank"
                >
                  <Split className="w-3 h-3 text-corporate-600" />
                  <span>Pisah Bank</span>
                </button>
                <button
                  type="button"
                  onClick={() => setBankGroupingMode('gabung')}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                    bankGroupingMode === 'gabung'
                      ? 'bg-purple-700 text-white shadow-2xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Gabungkan seluruh transaksi per tanggal menjadi 1 baris"
                >
                  <Combine className="w-3 h-3" />
                  <span>Gabung Bank</span>
                </button>
              </div>

              {/* Quick Toggle Mutasi Transfer Antar Bank di Top Bar */}
              <div className="flex items-center p-0.5 bg-slate-200/70 rounded-xl text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setIncludeTransfer(false)}
                  className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                    !includeTransfer
                      ? 'bg-white text-slate-900 shadow-2xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Hanya transaksi operasional murni (tanpa pemindahan dana antar rekening)"
                >
                  Murni Operasional
                </button>
                <button
                  type="button"
                  onClick={() => setIncludeTransfer(true)}
                  className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                    includeTransfer
                      ? 'bg-cyan-700 text-white shadow-2xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Sertakan mutasi transfer masuk & keluar antar rekening"
                >
                  + Transfer
                </button>
              </div>

              {/* Quick Toggle Forecast / Non Forecast */}
              <div className="flex items-center p-0.5 bg-slate-200/70 rounded-xl text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setForecastFilter('all')}
                  className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                    forecastFilter === 'all'
                      ? 'bg-white text-slate-900 shadow-2xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
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
                >
                  <Zap className="w-3 h-3" />
                  <span>Non FC</span>
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">

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

              {/* Filter 2: Opsi Gabung / Pisah Bank */}
              <div>
                <label className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">
                  <Layers className="w-3.5 h-3.5 text-corporate-600" />
                  Tampilan Rekening
                </label>
                <div className="flex items-center gap-1 p-1 bg-slate-200/70 rounded-xl text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => setBankGroupingMode('pisah')}
                    className={`flex-1 py-1.5 px-2 rounded-lg cursor-pointer transition-all whitespace-nowrap text-center ${
                      bankGroupingMode === 'pisah'
                        ? 'bg-white text-slate-900 shadow-sm font-bold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Pisah Bank
                  </button>
                  <button
                    type="button"
                    onClick={() => setBankGroupingMode('gabung')}
                    className={`flex-1 py-1.5 px-2 rounded-lg cursor-pointer transition-all whitespace-nowrap text-center ${
                      bankGroupingMode === 'gabung'
                        ? 'bg-purple-700 text-white shadow-sm font-bold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Gabung Bank
                  </button>
                </div>
              </div>

              {/* Filter 3: Transfer Antar Bank */}
              <div>
                <label className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">
                  <Layers className="w-3.5 h-3.5 text-cyan-600" />
                  Transfer Antar Bank
                </label>
                <div className="flex items-center gap-1 p-1 bg-slate-200/70 rounded-xl text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => setIncludeTransfer(false)}
                    className={`flex-1 py-1.5 px-1.5 rounded-lg cursor-pointer transition-all whitespace-nowrap text-center ${
                      !includeTransfer
                        ? 'bg-white text-slate-900 shadow-sm font-bold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                    title="Kecualikan transfer antar bank (hanya transaksi operasional riil)"
                  >
                    Kecualikan
                  </button>
                  <button
                    type="button"
                    onClick={() => setIncludeTransfer(true)}
                    className={`flex-1 py-1.5 px-1.5 rounded-lg cursor-pointer transition-all whitespace-nowrap text-center ${
                      includeTransfer
                        ? 'bg-cyan-700 text-white shadow-sm font-bold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                    title="Sertakan mutasi transfer antar rekening"
                  >
                    Sertakan
                  </button>
                </div>
              </div>

              {/* Filter 3: Status Transaksi */}
              <div>
                <label className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">
                  <Target className="w-3.5 h-3.5 text-corporate-600" />
                  Status Transaksi
                </label>
                <div className="flex items-center gap-1 p-1 bg-slate-200/70 rounded-xl text-xs font-semibold">
                  {[
                    { val: 'all', label: 'Semua' },
                    { val: 'forecast', label: '🎯 Forecast' },
                    { val: 'non_forecast', label: '⚡ Non FC' },
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

              {/* Filter 4: Jenis Mutasi */}
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

              {/* Filter 5: Checklist Rekening */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    <Building className="w-3.5 h-3.5 text-corporate-600" />
                    Rekening ({selectedBankIds.length}/{banks.length})
                  </label>
                  <div className="flex items-center gap-1.5 text-[10px]">
                    <button type="button" onClick={handleSelectAllBanks} className="text-corporate-600 hover:text-corporate-800 font-semibold cursor-pointer">Semua</button>
                    <span className="text-slate-300">|</span>
                    <button type="button" onClick={handleDeselectAllBanks} className="text-rose-600 hover:text-rose-800 font-semibold cursor-pointer">Reset</button>
                  </div>
                </div>
                <div className="max-h-24 overflow-y-auto space-y-1 bg-white border border-slate-200 rounded-xl p-2 shadow-xs">
                  {banks.length === 0 && (
                    <p className="text-xs text-slate-400 text-center py-2">Belum ada rekening</p>
                  )}
                  {banks.map(b => {
                    const checked = selectedBankIds.includes(b.id);
                    return (
                      <label
                        key={b.id}
                        className={`flex items-center gap-2 px-2 py-0.5 rounded-lg cursor-pointer transition-colors text-xs font-medium ${
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
                Menampilkan <strong className="text-slate-800">{reportRows.length} baris</strong> ({grandTotal.txCount} mutasi transaksi) dari periode{' '}
                <strong className="text-slate-800">{formatMonthIndo(selectedMonth)}</strong> • Tampilan:{' '}
                <strong className="text-purple-700">{bankGroupingMode === 'gabung' ? 'Bank Digabung per Tanggal' : 'Bank Terpisah per Tanggal'}</strong> • Filter:{' '}
                <strong className="text-slate-800">
                  {forecastFilter === 'forecast' ? 'Hanya Forecast' : forecastFilter === 'non_forecast' ? 'Hanya Non Forecast' : 'Semua Transaksi'}
                </strong>
              </span>
            </div>
          </div>
        )}

        {/* ── KPI Ringkasan Transaksi (Screen Only) ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 p-4 bg-slate-50/70 border-b border-slate-200/80 no-print">
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between text-xs text-corporate-600 mb-1">
              <span className="font-semibold">Total Mutasi Transaksi</span>
              <Layers className="w-4 h-4 text-corporate-600" />
            </div>
            <div className="text-sm sm:text-base font-extrabold text-slate-900 font-mono-num truncate">
              {formatRupiah(grandTotal.totalTransaksi)}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">{grandTotal.txCount} transaksi tercatat</div>
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between text-xs text-emerald-600 mb-1">
              <span className="font-semibold">
                {forecastFilter === 'forecast' ? 'Pemasukan Forecast' : forecastFilter === 'non_forecast' ? 'Pemasukan Non FC' : 'Total Pemasukan'}
              </span>
              <TrendingUp className="w-4 h-4" />
            </div>
            <div className="text-sm sm:text-base font-extrabold text-emerald-700 font-mono-num truncate">
              {formatRupiah(activePemasukan)}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              {forecastFilter === 'all'
                ? `FC: ${formatRupiah(grandTotal.pemasukanForecast)} | Non FC: ${formatRupiah(grandTotal.pemasukanNonForecast)}`
                : 'Arus kas masuk terverifikasi'}
            </div>
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between text-xs text-rose-600 mb-1">
              <span className="font-semibold">
                {forecastFilter === 'forecast' ? 'Pengeluaran Forecast' : forecastFilter === 'non_forecast' ? 'Pengeluaran Non FC' : 'Total Pengeluaran'}
              </span>
              <TrendingDown className="w-4 h-4" />
            </div>
            <div className="text-sm sm:text-base font-extrabold text-rose-700 font-mono-num truncate">
              {formatRupiah(activePengeluaran)}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              {forecastFilter === 'all'
                ? `FC: ${formatRupiah(grandTotal.pengeluaranForecast)} | Non FC: ${formatRupiah(grandTotal.pengeluaranNonForecast)}`
                : 'Arus kas keluar terverifikasi'}
            </div>
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between text-xs text-indigo-600 mb-1">
              <span className="font-semibold">Net Mutasi (Masuk − Keluar)</span>
              <Target className="w-4 h-4" />
            </div>
            <div className={`text-sm sm:text-base font-extrabold font-mono-num truncate ${
              activeNet >= 0 ? 'text-emerald-700' : 'text-rose-700'
            }`}>
              {formatRupiah(activeNet)}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">{reportRows.length} baris pada tabel</div>
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
                  LAPORAN MUTASI ARUS KAS
                  {bankGroupingMode === 'gabung' ? ' (BANK DIGABUNG)' : ' (PER REKENING)'}
                  {forecastFilter === 'forecast' ? ' - HANYA FORECAST' : forecastFilter === 'non_forecast' ? ' - HANYA NON FORECAST' : ''}
                  {!includeTransfer && ' [MURNI OPERASIONAL]'}
                </h2>
                <p className="text-[10px] text-slate-600 font-medium mt-0.5">
                  Periode: <strong className="text-slate-900">{formatMonthIndo(selectedMonth)}</strong>
                  {jenisFilter !== 'all' && ` • Filter: ${jenisFilter === 'pemasukan' ? 'Hanya Pemasukan' : 'Hanya Pengeluaran'}`}
                  {` • Format: ${bankGroupingMode === 'gabung' ? 'Gabung Bank per Tanggal' : 'Pisah per Rekening'}`}
                  {` • Transfer: ${includeTransfer ? 'Termasuk Transfer' : 'Tanpa Transfer'}`}
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
                <span className="text-slate-500 block">Total Mutasi Transaksi:</span>
                <span className="font-bold text-slate-900">{formatRupiah(grandTotal.totalTransaksi)}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Total Pemasukan:</span>
                <span className="font-bold text-emerald-700">{formatRupiah(activePemasukan)}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Total Pengeluaran:</span>
                <span className="font-bold text-rose-700">{formatRupiah(activePengeluaran)}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Net Mutasi:</span>
                <span className={`font-black ${activeNet >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                  {formatRupiah(activeNet)}
                </span>
              </div>
            </div>
          </div>

          {/* Tabel Utama Laporan */}
          <div className="overflow-x-auto max-w-full">
            <table className="w-full text-left border-collapse text-xs min-w-[1000px]">
              <thead>
                <tr className="bg-corporate-900 text-white text-[10px] font-bold uppercase tracking-wider">
                  <th className="sticky-col sticky left-0 z-30 bg-corporate-900 py-3 px-2.5 text-center border-r border-corporate-700 w-11 min-w-[44px]">
                    No
                  </th>
                  <th className="sticky-col sticky left-[44px] z-30 bg-corporate-900 py-3 px-3 border-r border-corporate-700 w-32 min-w-[120px]">
                    Tanggal<br/>Transaksi
                  </th>
                  <th className="sticky-col sticky left-[164px] z-30 bg-corporate-900 py-3 px-3 border-r-2 border-corporate-600 shadow-[3px_0_6px_-2px_rgba(0,0,0,0.3)] min-w-[160px]">
                    Rekening {bankGroupingMode === 'gabung' && <span className="text-[9px] text-purple-300 font-normal">(Digabung)</span>}
                  </th>
                  <th className="py-3 px-3 text-right border-r border-corporate-700 min-w-[130px] bg-slate-950/60">
                    Total Transaksi
                  </th>
                  {showPemasukanFC && (
                    <th className="py-3 px-3 text-right border-r border-corporate-700 bg-emerald-950/80 min-w-[130px]">
                      ↑ Pemasukan<br/>Forecast
                    </th>
                  )}
                  {showPemasukanNonFC && (
                    <th className="py-3 px-3 text-right border-r border-corporate-700 bg-emerald-900/80 min-w-[130px]">
                      ↑ Pemasukan<br/>Non Forecast
                    </th>
                  )}
                  {showPengeluaranFC && (
                    <th className="py-3 px-3 text-right border-r border-corporate-700 bg-rose-950/80 min-w-[130px]">
                      ↓ Pengeluaran<br/>Forecast
                    </th>
                  )}
                  {showPengeluaranNonFC && (
                    <th className="py-3 px-3 text-right border-r border-corporate-700 bg-rose-900/80 min-w-[130px]">
                      ↓ Pengeluaran<br/>Non Forecast
                    </th>
                  )}
                  <th className="py-3 px-3 min-w-[260px]">
                    Keterangan
                    <div className="text-[9px] font-normal text-amber-300 normal-case tracking-normal">
                      (Hanya Deskripsi Non Forecast)
                    </div>
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {/* Empty State */}
                {reportRows.length === 0 && (
                  <tr>
                    <td
                      colSpan={4 + (showPemasukanFC ? 1 : 0) + (showPemasukanNonFC ? 1 : 0) + (showPengeluaranFC ? 1 : 0) + (showPengeluaranNonFC ? 1 : 0) + 1}
                      className="py-14 px-4 text-center text-slate-400"
                    >
                      <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3">
                        <FileText className="w-6 h-6 text-slate-300 stroke-[1.75]" />
                      </div>
                      <p className="font-bold text-slate-600 text-sm">Tidak Ada Transaksi Sesuai Filter</p>
                      <p className="text-xs text-slate-400 mt-1">
                        Coba sesuaikan periode bulan, jenis mutasi, status transaksi, atau rekening.
                      </p>
                    </td>
                  </tr>
                )}

                {/* Baris Data */}
                {reportRows.map((row, idx) => {
                  const isKas = row.tipeAkun === 'Kas';
                  const isGabung = row.bankGroupingMode === 'gabung' || row.tipeAkun === 'Gabungan';
                  const rowBgClass = idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/70';
                  const stickyBgClass = idx % 2 === 0 ? 'bg-white' : 'bg-slate-50';

                  return (
                    <tr
                      key={row.rowKey}
                      className={`transition-colors hover:bg-corporate-50/40 group ${rowBgClass}`}
                    >
                      {/* No (Sticky) */}
                      <td className={`sticky-col sticky left-0 z-10 ${stickyBgClass} group-hover:bg-corporate-50/60 py-2.5 px-2.5 text-center text-slate-400 font-semibold border-r border-slate-100 w-11 min-w-[44px]`}>
                        {idx + 1}
                      </td>

                      {/* Tanggal Transaksi (Sticky) */}
                      <td className={`sticky-col sticky left-[44px] z-10 ${stickyBgClass} group-hover:bg-corporate-50/60 py-2.5 px-3 whitespace-nowrap border-r border-slate-100 w-32 min-w-[120px]`}>
                        <span className="font-bold text-slate-800 text-xs">{formatDateIndo(row.tanggal)}</span>
                        <div className="text-[10px] text-slate-400">{row.txCount} transaksi</div>
                      </td>

                      {/* Rekening (Sticky + Shadow Separator) */}
                      <td className={`sticky-col sticky left-[164px] z-10 ${stickyBgClass} group-hover:bg-corporate-50/60 py-2.5 px-3 border-r-2 border-slate-300 shadow-[3px_0_6px_-2px_rgba(0,0,0,0.06)] min-w-[160px]`}>
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm leading-none shrink-0">
                            {isGabung ? '📂' : isKas ? '💵' : '🏦'}
                          </span>
                          <div className="min-w-0">
                            <div className="font-bold text-slate-800 text-xs truncate" title={row.bankName}>
                              {row.bankName}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              {isGabung ? 'Gabungan Rekening' : row.tipeAkun}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Total Transaksi */}
                      <td className="py-2.5 px-3 text-right font-mono-num border-r border-slate-100 bg-slate-50/40 min-w-[130px]">
                        <span className="font-extrabold text-slate-900 text-xs">
                          {formatRupiah(row.totalTransaksi)}
                        </span>
                      </td>

                      {/* Pemasukan Forecast */}
                      {showPemasukanFC && (
                        <td className="py-2.5 px-3 text-right font-mono-num border-r border-slate-100 min-w-[130px]">
                          {row.pemasukanForecast > 0
                            ? <span className="font-semibold text-emerald-600">{formatRupiah(row.pemasukanForecast)}</span>
                            : <span className="text-slate-300 font-normal">—</span>}
                        </td>
                      )}

                      {/* Pemasukan Non Forecast */}
                      {showPemasukanNonFC && (
                        <td className="py-2.5 px-3 text-right font-mono-num border-r border-slate-100 min-w-[130px]">
                          {row.pemasukanNonForecast > 0
                            ? <span className="font-semibold text-emerald-700">{formatRupiah(row.pemasukanNonForecast)}</span>
                            : <span className="text-slate-300 font-normal">—</span>}
                        </td>
                      )}

                      {/* Pengeluaran Forecast */}
                      {showPengeluaranFC && (
                        <td className="py-2.5 px-3 text-right font-mono-num border-r border-slate-100 min-w-[130px]">
                          {row.pengeluaranForecast > 0
                            ? <span className="font-semibold text-rose-600">{formatRupiah(row.pengeluaranForecast)}</span>
                            : <span className="text-slate-300 font-normal">—</span>}
                        </td>
                      )}

                      {/* Pengeluaran Non Forecast */}
                      {showPengeluaranNonFC && (
                        <td className="py-2.5 px-3 text-right font-mono-num border-r border-slate-100 min-w-[130px]">
                          {row.pengeluaranNonForecast > 0
                            ? <span className="font-semibold text-rose-700">{formatRupiah(row.pengeluaranNonForecast)}</span>
                            : <span className="text-slate-300 font-normal">—</span>}
                        </td>
                      )}

                      {/* Keterangan: HANYA Deskripsi Transaksi Non Forecast */}
                      <td className="py-2.5 px-3 text-slate-700 text-[11px] min-w-[260px] max-w-md">
                        {row.keterangan ? (
                          <span className="italic leading-relaxed block break-words text-slate-800">
                            {row.keterangan}
                          </span>
                        ) : (
                          <span className="text-slate-300 italic">—</span>
                        )}
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
                        GRAND TOTAL {bankGroupingMode === 'gabung' ? '(GABUNG BANK)' : ''}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right font-mono-num border-r border-corporate-700 bg-slate-950 font-black text-amber-300">
                      {formatRupiah(grandTotal.totalTransaksi)}
                    </td>
                    {showPemasukanFC && (
                      <td className="py-3 px-3 text-right font-mono-num border-r border-corporate-700 bg-emerald-900/60 font-semibold text-emerald-200">
                        {formatRupiah(grandTotal.pemasukanForecast)}
                      </td>
                    )}
                    {showPemasukanNonFC && (
                      <td className="py-3 px-3 text-right font-mono-num border-r border-corporate-700 bg-emerald-900/80 font-black text-emerald-100">
                        {formatRupiah(grandTotal.pemasukanNonForecast)}
                      </td>
                    )}
                    {showPengeluaranFC && (
                      <td className="py-3 px-3 text-right font-mono-num border-r border-corporate-700 bg-rose-900/60 font-semibold text-rose-200">
                        {formatRupiah(grandTotal.pengeluaranForecast)}
                      </td>
                    )}
                    {showPengeluaranNonFC && (
                      <td className="py-3 px-3 text-right font-mono-num border-r border-corporate-700 bg-rose-900/80 font-black text-rose-100">
                        {formatRupiah(grandTotal.pengeluaranNonForecast)}
                      </td>
                    )}
                    <td className="py-3 px-3 text-[10px] text-slate-400 italic">
                      {reportRows.length} baris ({grandTotal.txCount} transaksi)
                    </td>
                  </tr>

                  {/* Ringkasan Net Arus Kas */}
                  {jenisFilter === 'all' && (
                    <tr className="bg-slate-800 text-white text-xs font-bold">
                      <td className="sticky-col sticky left-0 z-30 bg-slate-800 py-2.5 px-3 border-r border-slate-700" colSpan={3}>
                        <span className="text-[10px] uppercase tracking-wider text-slate-300">
                          Net Arus Kas (Pemasukan − Pengeluaran)
                        </span>
                      </td>
                      <td className="py-2.5 px-3 border-r border-slate-700 text-right font-mono-num text-slate-300 text-[11px]">
                        Net: {formatRupiah(activeNet)}
                      </td>
                      <td
                        colSpan={(showPemasukanFC ? 1 : 0) + (showPemasukanNonFC ? 1 : 0)}
                        className="py-2.5 px-3 text-right font-mono-num text-emerald-300 border-r border-slate-700"
                      >
                        Total Masuk: {formatRupiah(activePemasukan)}
                      </td>
                      <td
                        colSpan={(showPengeluaranFC ? 1 : 0) + (showPengeluaranNonFC ? 1 : 0)}
                        className="py-2.5 px-3 text-right font-mono-num text-rose-300 border-r border-slate-700"
                      >
                        Total Keluar: {formatRupiah(activePengeluaran)}
                      </td>
                      <td className="py-2.5 px-3 text-[10px] text-slate-400 italic">
                        {activeNet >= 0 ? 'Surplus Kas' : 'Defisit Kas'}
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
                <p>• Dokumen ini merupakan Laporan Mutasi Kas resmi yang dihasilkan oleh Sistem Manajemen Arus Kas.</p>
                <p>• Kolom keterangan khusus mencatat rincian transaksi non forecast (di luar rencana anggaran).</p>
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
