import React, { useState, useMemo } from 'react';
import { 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';
import { 
  Printer,
  Calendar, 
  TrendingUp, 
  TrendingDown, 
  Building2, 
  Filter, 
  Wallet, 
  ArrowDownLeft, 
  ArrowUpRight, 
  Scale, 
  CheckCircle2, 
  BarChart3 
} from 'lucide-react';
import { formatRupiah, formatDateIndo } from '../utils/formatters';
import { ManagementReportModal } from './ManagementReportModal';

const BULAN_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

export function AnalyticsCharts({ 
  banks = [], 
  transactions = [], 
  forecasts = [], 
  companyName = 'PT GRAHA PRIMA ENERGI', 
  currentUser 
}) {
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  // Extract all distinct years from transactions and bank dates
  const availableYears = useMemo(() => {
    const yearsSet = new Set();
    const currentYear = new Date().getFullYear();
    yearsSet.add(currentYear);

    banks.forEach(b => {
      if (b.tanggalSaldoAwal) {
        const y = parseInt(b.tanggalSaldoAwal.split('-')[0], 10);
        if (!isNaN(y)) yearsSet.add(y);
      }
    });

    transactions.forEach(t => {
      if (t.tanggal) {
        const y = parseInt(t.tanggal.split('-')[0], 10);
        if (!isNaN(y)) yearsSet.add(y);
      }
    });

    return Array.from(yearsSet).sort((a, b) => b - a);
  }, [banks, transactions]);

  const [periodType, setPeriodType] = useState('month'); // 'month' | 'year'
  const [selectedYear, setSelectedYear] = useState(() => {
    return availableYears[0] || new Date().getFullYear();
  });
  const [selectedMonth, setSelectedMonth] = useState(() => {
    return new Date().getMonth() + 1; // 1 - 12
  });

  // Calculate Cumulative Initial Balance of all banks before or at start date
  const totalSaldoAwalMaster = useMemo(() => {
    return banks.reduce((sum, b) => sum + (Number(b.saldoAwal) || 0), 0);
  }, [banks]);

  // 1. DATA FOR PERIODIC CASH FLOW TREND
  const periodicTrendData = useMemo(() => {
    if (periodType === 'year') {
      // Breakdown by 12 Months of the selected year
      const monthlyData = [];

      for (let m = 1; m <= 12; m++) {
        const monthKey = `${selectedYear}-${String(m).padStart(2, '0')}`;
        
        // Transactions in this month
        const monthTx = transactions.filter(t => t.tanggal && t.tanggal.startsWith(monthKey));
        const masuk = monthTx.filter(t => t.tipe === 'pemasukan').reduce((sum, t) => sum + (Number(t.nominal) || 0), 0);
        const keluar = monthTx.filter(t => t.tipe === 'pengeluaran').reduce((sum, t) => sum + (Number(t.nominal) || 0), 0);
        const netCashflow = masuk - keluar;

        // Cumulative running balance up to end of this month (from beginning of time)
        const allTxUpToMonth = transactions.filter(t => t.tanggal && t.tanggal <= `${monthKey}-31`);
        const cumIn = allTxUpToMonth.filter(t => t.tipe === 'pemasukan').reduce((sum, t) => sum + (Number(t.nominal) || 0), 0);
        const cumOut = allTxUpToMonth.filter(t => t.tipe === 'pengeluaran').reduce((sum, t) => sum + (Number(t.nominal) || 0), 0);
        const saldoAkhir = totalSaldoAwalMaster + cumIn - cumOut;

        monthlyData.push({
          label: BULAN_NAMES[m - 1],
          shortLabel: BULAN_NAMES[m - 1].slice(0, 3),
          pemasukan: masuk,
          pengeluaran: keluar,
          net: netCashflow,
          saldo: saldoAkhir
        });
      }

      return monthlyData;
    } else {
      // Breakdown by Days of the selected month
      const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
      const dailyData = [];

      for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        
        const dayTx = transactions.filter(t => t.tanggal === dateStr);
        const masuk = dayTx.filter(t => t.tipe === 'pemasukan').reduce((sum, t) => sum + (Number(t.nominal) || 0), 0);
        const keluar = dayTx.filter(t => t.tipe === 'pengeluaran').reduce((sum, t) => sum + (Number(t.nominal) || 0), 0);

        // Cumulative running balance up to this date
        const allTxUpToDay = transactions.filter(t => t.tanggal && t.tanggal <= dateStr);
        const cumIn = allTxUpToDay.filter(t => t.tipe === 'pemasukan').reduce((sum, t) => sum + (Number(t.nominal) || 0), 0);
        const cumOut = allTxUpToDay.filter(t => t.tipe === 'pengeluaran').reduce((sum, t) => sum + (Number(t.nominal) || 0), 0);
        const saldoAkhir = totalSaldoAwalMaster + cumIn - cumOut;

        dailyData.push({
          label: `Tgl ${d}`,
          shortLabel: `${d}`,
          fullDate: dateStr,
          pemasukan: masuk,
          pengeluaran: keluar,
          net: masuk - keluar,
          saldo: saldoAkhir
        });
      }

      return dailyData;
    }
  }, [periodType, selectedYear, selectedMonth, transactions, totalSaldoAwalMaster]);

  // 2. DATA FOR BANK TRANSACTIONS IN THE SELECTED PERIOD
  const bankAnalyticsData = useMemo(() => {
    // Filter transactions in the selected period
    let periodTransactions = [];
    let periodEndDate = '';

    if (periodType === 'year') {
      periodTransactions = transactions.filter(t => t.tanggal && t.tanggal.startsWith(String(selectedYear)));
      periodEndDate = `${selectedYear}-12-31`;
    } else {
      const monthPrefix = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;
      periodTransactions = transactions.filter(t => t.tanggal && t.tanggal.startsWith(monthPrefix));
      const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
      periodEndDate = `${monthPrefix}-${String(daysInMonth).padStart(2, '0')}`;
    }

    return banks.map(bank => {
      const bTx = periodTransactions.filter(t => t.bankId === bank.id);
      const masuk = bTx.filter(t => t.tipe === 'pemasukan').reduce((sum, t) => sum + (Number(t.nominal) || 0), 0);
      const keluar = bTx.filter(t => t.tipe === 'pengeluaran').reduce((sum, t) => sum + (Number(t.nominal) || 0), 0);
      const volume = masuk + keluar;

      // Cumulative balance of this specific bank up to end of this period
      const allTxForThisBank = transactions.filter(t => t.bankId === bank.id && t.tanggal && t.tanggal <= periodEndDate);
      const allBankIn = allTxForThisBank.filter(t => t.tipe === 'pemasukan').reduce((sum, t) => sum + (Number(t.nominal) || 0), 0);
      const allBankOut = allTxForThisBank.filter(t => t.tipe === 'pengeluaran').reduce((sum, t) => sum + (Number(t.nominal) || 0), 0);
      const currentSaldoBank = (Number(bank.saldoAwal) || 0) + allBankIn - allBankOut;

      return {
        id: bank.id,
        name: bank.name,
        pemasukan: masuk,
        pengeluaran: keluar,
        netCashflow: masuk - keluar,
        volume,
        saldoAkhir: currentSaldoBank,
        txCount: bTx.length
      };
    }).sort((a, b) => b.volume - a.volume);
  }, [periodType, selectedYear, selectedMonth, banks, transactions]);

  // Overall totals for the chosen period
  const periodSummary = useMemo(() => {
    const totalIn = bankAnalyticsData.reduce((sum, b) => sum + b.pemasukan, 0);
    const totalOut = bankAnalyticsData.reduce((sum, b) => sum + b.pengeluaran, 0);
    const net = totalIn - totalOut;

    // Cumulative closing balance at end of period
    let lastDate = '';
    if (periodType === 'year') {
      lastDate = `${selectedYear}-12-31`;
    } else {
      const days = new Date(selectedYear, selectedMonth, 0).getDate();
      lastDate = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(days).padStart(2, '0')}`;
    }

    const txUntilEnd = transactions.filter(t => t.tanggal && t.tanggal <= lastDate);
    const inUntilEnd = txUntilEnd.filter(t => t.tipe === 'pemasukan').reduce((sum, t) => sum + (Number(t.nominal) || 0), 0);
    const outUntilEnd = txUntilEnd.filter(t => t.tipe === 'pengeluaran').reduce((sum, t) => sum + (Number(t.nominal) || 0), 0);
    const closingBalance = totalSaldoAwalMaster + inUntilEnd - outUntilEnd;

    return { totalIn, totalOut, net, closingBalance };
  }, [bankAnalyticsData, periodType, selectedYear, selectedMonth, transactions, totalSaldoAwalMaster]);

  // Custom Tooltip Formatter for Recharts
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900/95 backdrop-blur-md text-white p-3 rounded-xl shadow-xl border border-slate-700 text-xs space-y-1.5 z-50">
          <div className="font-bold text-slate-200 border-b border-slate-700/80 pb-1">
            {label}
          </div>
          {payload.map((entry, idx) => (
            <div key={idx} className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-1.5" style={{ color: entry.color }}>
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }}></span>
                {entry.name}:
              </span>
              <span className="font-mono-num font-bold text-white">
                {formatRupiah(entry.value)}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Top Filter Bar */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-card flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-corporate-700 font-bold text-xs uppercase tracking-wider">
            <BarChart3 className="w-4 h-4" />
            <span>Analisis & Visualisasi Arus Kas</span>
          </div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight mt-0.5">
            Laporan Grafik Periodik & Transaksi Bank
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Data dihitung runtut secara akurat dari saldo awal master dan seluruh mutasi transaksi.
          </p>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Toggle Bulan / Tahun */}
          <div className="bg-slate-100 p-1 rounded-xl flex items-center border border-slate-200 text-xs font-bold">
            <button
              onClick={() => setPeriodType('month')}
              className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${periodType === 'month' ? 'bg-corporate-800 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
            >
              Mode Bulan
            </button>
            <button
              onClick={() => setPeriodType('year')}
              className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${periodType === 'year' ? 'bg-corporate-800 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
            >
              Mode Tahun
            </button>
          </div>

          {/* Selector Bulan (hanya aktif jika periodType === 'month') */}
          {periodType === 'month' && (
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-corporate-500 outline-none shadow-xs cursor-pointer"
            >
              {BULAN_NAMES.map((name, idx) => (
                <option key={idx + 1} value={idx + 1}>
                  {name}
                </option>
              ))}
            </select>
          )}

          {/* Selector Tahun */}
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-corporate-500 outline-none shadow-xs cursor-pointer"
          >
            {availableYears.map(yr => (
              <option key={yr} value={yr}>
                Tahun {yr}
              </option>
            ))}
          </select>

          {/* Tombol Cetak Report Formal Manajemen (PDF) */}
          <button
            type="button"
            onClick={() => setIsReportModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-corporate-900 hover:bg-navy-950 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer active:scale-95 ml-auto md:ml-0"
            title="Cetak Laporan Formal Analisis Arus Kas untuk Manajemen"
          >
            <Printer className="w-3.5 h-3.5 text-amber-400" />
            <span>Cetak Report Manajemen (PDF)</span>
          </button>
        </div>
      </div>

      {/* Summary Cards for Selected Period */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Pemasukan Periode Ini */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-card flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200/80 flex items-center justify-center shrink-0">
            <ArrowDownLeft className="w-6 h-6" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Pemasukan ({periodType === 'month' ? BULAN_NAMES[selectedMonth - 1] : selectedYear})
            </div>
            <div className="text-lg font-black text-emerald-700 font-mono-num tracking-tight mt-0.5 truncate" title={formatRupiah(periodSummary.totalIn)}>
              {formatRupiah(periodSummary.totalIn)}
            </div>
          </div>
        </div>

        {/* Pengeluaran Periode Ini */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-card flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 border border-rose-200/80 flex items-center justify-center shrink-0">
            <ArrowUpRight className="w-6 h-6" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Pengeluaran ({periodType === 'month' ? BULAN_NAMES[selectedMonth - 1] : selectedYear})
            </div>
            <div className="text-lg font-black text-rose-700 font-mono-num tracking-tight mt-0.5 truncate" title={formatRupiah(periodSummary.totalOut)}>
              {formatRupiah(periodSummary.totalOut)}
            </div>
          </div>
        </div>

        {/* Net Cash Flow (Surplus / Defisit) */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-card flex items-center gap-3.5">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border ${periodSummary.net >= 0 ? 'bg-blue-50 text-blue-600 border-blue-200/80' : 'bg-amber-50 text-amber-600 border-amber-200/80'}`}>
            {periodSummary.net >= 0 ? <TrendingUp className="w-6 h-6" /> : <TrendingDown className="w-6 h-6" />}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Net Cash Flow ({periodSummary.net >= 0 ? 'Surplus' : 'Defisit'})
            </div>
            <div className={`text-lg font-black font-mono-num tracking-tight mt-0.5 truncate ${periodSummary.net >= 0 ? 'text-blue-700' : 'text-amber-700'}`} title={formatRupiah(periodSummary.net)}>
              {periodSummary.net >= 0 ? '+' : ''}{formatRupiah(periodSummary.net)}
            </div>
          </div>
        </div>

        {/* Saldo Kumulatif Akhir Periode */}
        <div className="bg-gradient-to-br from-corporate-950 to-navy-950 text-white rounded-2xl p-4 border border-corporate-700/60 shadow-card flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-corporate-800/90 text-amber-400 border border-corporate-600/60 flex items-center justify-center shrink-0">
            <Wallet className="w-6 h-6" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[11px] font-bold text-corporate-300 uppercase tracking-wider">
              Saldo Akhir Periode
            </div>
            <div className="text-lg font-black text-amber-300 font-mono-num tracking-tight mt-0.5 truncate" title={formatRupiah(periodSummary.closingBalance)}>
              {formatRupiah(periodSummary.closingBalance)}
            </div>
          </div>
        </div>

      </div>

      {/* GRAFIK 1: PERIODIC CASH FLOW (MASUK VS KELUAR) */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-card space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-corporate-600"></span>
              Grafik Arus Kas Periodik: Masuk vs Keluar
            </h3>
            <p className="text-xs text-slate-500">
              {periodType === 'month' 
                ? `Perkembangan harian mutasi kas selama bulan ${BULAN_NAMES[selectedMonth - 1]} ${selectedYear}`
                : `Perkembangan bulanan mutasi kas sepanjang tahun ${selectedYear}`}
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs font-semibold">
            <span className="flex items-center gap-1.5 text-emerald-700">
              <span className="w-3 h-3 rounded bg-emerald-500 inline-block"></span> Masuk
            </span>
            <span className="flex items-center gap-1.5 text-rose-700">
              <span className="w-3 h-3 rounded bg-rose-500 inline-block"></span> Keluar
            </span>
          </div>
        </div>

        <div className="h-[320px] w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={periodicTrendData} margin={{ top: 10, right: 10, left: 10, bottom: 25 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis 
                dataKey="shortLabel" 
                tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }}
                axisLine={{ stroke: '#cbd5e1' }}
                tickLine={false}
              />
              <YAxis 
                tick={{ fontSize: 10, fill: '#64748b' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(val) => {
                  if (val >= 1000000000) return `${(val / 1000000000).toFixed(1)}M`;
                  if (val >= 1000000) return `${(val / 1000000).toFixed(0)}jt`;
                  return val;
                }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="pemasukan" name="Pemasukan" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={36} />
              <Bar dataKey="pengeluaran" name="Pengeluaran" fill="#f43f5e" radius={[4, 4, 0, 0]} maxBarSize={36} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* GRAFIK 2: TREN SALDO KAS KUMULATIF DARI AWAL INPUTAN */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-card space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
              Tren Saldo Kumulatif Perusahaan (Dari Awal Inputan)
            </h3>
            <p className="text-xs text-slate-500">
              Pergerakan posisi likuiditas saldo kas riil pada akhir tiap {periodType === 'month' ? 'hari' : 'bulan'}.
            </p>
          </div>
          <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200">
            Garis Tren Saldo Kas
          </span>
        </div>

        <div className="h-[280px] w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={periodicTrendData} margin={{ top: 10, right: 10, left: 10, bottom: 25 }}>
              <defs>
                <linearGradient id="colorSaldo" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563eb" stopOpacity={0.35}/>
                  <stop offset="95%" stopColor="#2563eb" stopOpacity={0.0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis 
                dataKey="shortLabel" 
                tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }}
                axisLine={{ stroke: '#cbd5e1' }}
                tickLine={false}
              />
              <YAxis 
                tick={{ fontSize: 10, fill: '#64748b' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(val) => {
                  if (val >= 1000000000) return `${(val / 1000000000).toFixed(1)}M`;
                  if (val >= 1000000) return `${(val / 1000000).toFixed(0)}jt`;
                  return val;
                }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area 
                type="monotone" 
                dataKey="saldo" 
                name="Saldo Kas Riil" 
                stroke="#2563eb" 
                strokeWidth={3} 
                fillOpacity={1} 
                fill="url(#colorSaldo)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* GRAFIK 3: TRANSAKSI PER BANK MENGIKUTI PERIODE YANG DIPILIH */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-card space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span>
              Grafik Transaksi Masuk vs Keluar per Rekening Bank
            </h3>
            <p className="text-xs text-slate-500">
              Perbandingan mutasi transaksi di setiap rekening bank pada periode {periodType === 'month' ? `${BULAN_NAMES[selectedMonth - 1]} ${selectedYear}` : `Tahun ${selectedYear}`}.
            </p>
          </div>
          <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-full border border-slate-200">
            {banks.length} Rekening Terdaftar
          </span>
        </div>

        <div className="h-[360px] w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart 
              data={bankAnalyticsData} 
              layout="vertical"
              margin={{ top: 10, right: 30, left: 40, bottom: 10 }}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
              <XAxis 
                type="number"
                tick={{ fontSize: 10, fill: '#64748b' }}
                axisLine={{ stroke: '#cbd5e1' }}
                tickFormatter={(val) => {
                  if (val >= 1000000000) return `${(val / 1000000000).toFixed(1)}M`;
                  if (val >= 1000000) return `${(val / 1000000).toFixed(0)}jt`;
                  return val;
                }}
              />
              <YAxis 
                type="category" 
                dataKey="name" 
                tick={{ fontSize: 11, fill: '#334155', fontWeight: 600 }}
                axisLine={false}
                tickLine={false}
                width={120}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend 
                verticalAlign="top" 
                align="right" 
                wrapperStyle={{ paddingBottom: 10, fontSize: 12 }} 
              />
              <Bar dataKey="pemasukan" name="Pemasukan" fill="#10b981" radius={[0, 4, 4, 0]} maxBarSize={18} />
              <Bar dataKey="pengeluaran" name="Pengeluaran" fill="#f43f5e" radius={[0, 4, 4, 0]} maxBarSize={18} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Tabel Rekapitulasi per Bank pada Periode Terpilih */}
        <div className="mt-4 pt-4 border-t border-slate-100 overflow-x-auto">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3">
            Rincian Posisi Kas per Bank ({periodType === 'month' ? `${BULAN_NAMES[selectedMonth - 1]} ${selectedYear}` : `Tahun ${selectedYear}`})
          </h4>
          
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-600 uppercase tracking-wider font-bold border-b border-slate-200">
                <th className="py-2.5 px-3">Nama Bank</th>
                <th className="py-2.5 px-3 text-center">Jumlah Mutasi</th>
                <th className="py-2.5 px-3 text-right">Pemasukan</th>
                <th className="py-2.5 px-3 text-right">Pengeluaran</th>
                <th className="py-2.5 px-3 text-right">Net Periode</th>
                <th className="py-2.5 px-3 text-right font-extrabold text-slate-900">Saldo Akhir Kumulatif</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {bankAnalyticsData.map(b => (
                <tr key={b.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-2.5 px-3 font-bold text-slate-800 flex items-center gap-2">
                    <Building2 className="w-3.5 h-3.5 text-corporate-600 shrink-0" />
                    <span>{b.name}</span>
                  </td>
                  <td className="py-2.5 px-3 text-center text-slate-500 font-semibold">
                    {b.txCount} transaksi
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono-num font-semibold text-emerald-700">
                    {b.pemasukan > 0 ? formatRupiah(b.pemasukan) : '-'}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono-num font-semibold text-rose-700">
                    {b.pengeluaran > 0 ? formatRupiah(b.pengeluaran) : '-'}
                  </td>
                  <td className={`py-2.5 px-3 text-right font-mono-num font-bold ${b.netCashflow >= 0 ? 'text-blue-700' : 'text-amber-700'}`}>
                    {b.netCashflow >= 0 ? '+' : ''}{formatRupiah(b.netCashflow)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono-num font-black text-slate-900">
                    {formatRupiah(b.saldoAkhir)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </div>

      {/* Modal Laporan Formal Manajemen */}
      <ManagementReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        companyName={companyName}
        currentUser={currentUser}
        periodLabel={periodType === 'month' ? `Bulan ${BULAN_NAMES[selectedMonth - 1]} ${selectedYear}` : `Tahun ${selectedYear}`}
        totalPemasukan={periodSummary.totalIn}
        totalPengeluaran={periodSummary.totalOut}
        netCashflow={periodSummary.net}
        saldoAkhirKumulatif={periodSummary.closingBalance}
        bankAnalyticsData={bankAnalyticsData}
        forecasts={forecasts}
        transactions={transactions}
      />

    </div>
  );
}
