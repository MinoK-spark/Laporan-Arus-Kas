import React, { useState, useMemo } from 'react';
import { 
  ArrowLeftRight,
  Printer, 
  X, 
  Building, 
  Wallet, 
  Calendar, 
  FileText, 
  ArrowDownLeft, 
  ArrowUpRight, 
  Download, 
  Table, 
  TrendingUp, 
  Scale, 
  History,
  CheckCircle2,
  FileSpreadsheet
} from 'lucide-react';
import { formatRupiah, formatDateIndo } from '../utils/formatters';
import { isTransferTransaction, getTransferDirection, isOperationalIncome, isOperationalExpense } from '../utils/transactionHelper';
import { downloadExcel } from '../utils/excelHelper';

export function BankAccountReportModal({
  isOpen,
  onClose,
  bank,
  transactions = [],
  companyName = 'PT GRAHA PRIMA ENERGI',
  currentUser
}) {
  if (!isOpen || !bank) return null;

  const [activeTab, setActiveTab] = useState('monthly'); // 'monthly' | 'ledger'
  const [filterMonth, setFilterMonth] = useState('all'); // for ledger filtering

  const currentDate = new Date().toISOString().split('T')[0];
  const currentTime = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

  const isKas = bank.tipeAkun === 'kas';
  const masterSaldoAwal = Number(bank.saldoAwal) || 0;

  // Filter transactions belonging to this bank
  const bankTransactions = useMemo(() => {
    return (transactions || [])
      .filter(t => t.bankId === bank.id)
      .sort((a, b) => (a.tanggal || '').localeCompare(b.tanggal || ''));
  }, [transactions, bank.id]);

  // Identify all unique months
  const availableMonths = useMemo(() => {
    const set = new Set();
    if (bank.tanggalSaldoAwal) {
      set.add(bank.tanggalSaldoAwal.slice(0, 7));
    }
    bankTransactions.forEach(t => {
      if (t.tanggal) {
        set.add(t.tanggal.slice(0, 7));
      }
    });
    // Add current month if empty
    if (set.size === 0) {
      const now = new Date();
      set.add(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
    }
    return Array.from(set).sort();
  }, [bankTransactions, bank.tanggalSaldoAwal]);

  // Format month label
  const formatBulan = (yyyymm) => {
    if (!yyyymm || yyyymm === 'all') return 'Semua Periode';
    try {
      const [year, month] = yyyymm.split('-');
      const date = new Date(year, parseInt(month) - 1);
      return new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' }).format(date);
    } catch {
      return yyyymm;
    }
  };

  // Compute Monthly Accumulation History (Running Balances Month over Month)
  const monthlyHistory = useMemo(() => {
    const history = [];
    let runningSaldo = masterSaldoAwal;

    for (const m of availableMonths) {
      const monthTx = bankTransactions.filter(t => t.tanggal && t.tanggal.startsWith(m));
      const masuk = monthTx
        .filter(t => isOperationalIncome(t) || (isTransferTransaction(t) && getTransferDirection(t) === 'in'))
        .reduce((s, t) => s + (Number(t.nominal) || 0), 0);
      const keluar = monthTx
        .filter(t => isOperationalExpense(t) || (isTransferTransaction(t) && getTransferDirection(t) === 'out'))
        .reduce((s, t) => s + (Number(t.nominal) || 0), 0);
      const opMasuk = monthTx.filter(t => isOperationalIncome(t)).reduce((s, t) => s + (Number(t.nominal) || 0), 0);
      const opKeluar = monthTx.filter(t => isOperationalExpense(t)).reduce((s, t) => s + (Number(t.nominal) || 0), 0);
      const trfMasuk = monthTx.filter(t => isTransferTransaction(t) && getTransferDirection(t) === 'in').reduce((s, t) => s + (Number(t.nominal) || 0), 0);
      const trfKeluar = monthTx.filter(t => isTransferTransaction(t) && getTransferDirection(t) === 'out').reduce((s, t) => s + (Number(t.nominal) || 0), 0);

      const net = masuk - keluar;
      const saldoAwalBulan = runningSaldo;
      const saldoAkhirBulan = saldoAwalBulan + net;

      history.push({
        bulan: m,
        bulanLabel: formatBulan(m),
        saldoAwal: saldoAwalBulan,
        masuk,
        keluar,
        opMasuk,
        opKeluar,
        trfMasuk,
        trfKeluar,
        net,
        saldoAkhir: saldoAkhirBulan,
        txCount: monthTx.length,
        txMasukCount: monthTx.filter(t => isOperationalIncome(t) || (isTransferTransaction(t) && getTransferDirection(t) === 'in')).length,
        txKeluarCount: monthTx.filter(t => isOperationalExpense(t) || (isTransferTransaction(t) && getTransferDirection(t) === 'out')).length
      });

      runningSaldo = saldoAkhirBulan;
    }

    return history;
  }, [availableMonths, bankTransactions, masterSaldoAwal]);

  // Overall totals for this bank
  const totalAllMasuk = useMemo(() => {
    return bankTransactions.filter(t => t.tipe === 'pemasukan').reduce((s, t) => s + (Number(t.nominal) || 0), 0);
  }, [bankTransactions]);

  const totalAllKeluar = useMemo(() => {
    return bankTransactions.filter(t => t.tipe === 'pengeluaran').reduce((s, t) => s + (Number(t.nominal) || 0), 0);
  }, [bankTransactions]);

  const currentEndingBalance = masterSaldoAwal + totalAllMasuk - totalAllKeluar;

  // Ledger with running balance
  const ledgerWithBalances = useMemo(() => {
    let running = masterSaldoAwal;
    return bankTransactions.map(tx => {
      const nom = Number(tx.nominal) || 0;
      if (tx.tipe === 'pemasukan') {
        running += nom;
      } else {
        running -= nom;
      }
      return {
        ...tx,
        balanceAfter: running
      };
    });
  }, [bankTransactions, masterSaldoAwal]);

  const displayedLedger = useMemo(() => {
    if (filterMonth === 'all') return ledgerWithBalances;
    return ledgerWithBalances.filter(t => t.tanggal && t.tanggal.startsWith(filterMonth));
  }, [ledgerWithBalances, filterMonth]);

  const handlePrint = () => {
    window.print();
  };

  // Export Excel
  const handleExportExcel = () => {
    // Sheet: Rekap Bulanan
    const summaryRows = monthlyHistory.map((item, idx) => ({
      'No': idx + 1,
      'Periode Bulan': item.bulanLabel,
      'Kode Bulan': item.bulan,
      'Saldo Awal': item.saldoAwal,
      'Total Pemasukan': item.masuk,
      'Total Pengeluaran': item.keluar,
      'Net Mutasi': item.net,
      'Saldo Akhir': item.saldoAkhir,
      'Jumlah Transaksi': item.txCount
    }));

    downloadExcel(
      summaryRows, 
      `Laporan_Akumulasi_${bank.name.replace(/[^a-zA-Z0-9]/g, '_')}_${currentDate}.xlsx`, 
      'Akumulasi Bulanan'
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/75 backdrop-blur-xs animate-in fade-in duration-150 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-6xl max-h-[94vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 my-auto">
        
        {/* Top Control Bar (Hidden on Print) */}
        <div className="px-6 py-3.5 bg-corporate-900 text-white flex items-center justify-between no-print shrink-0 border-b border-corporate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-amber-400">
              {isKas ? <Wallet className="w-5 h-5" /> : <Building className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold tracking-tight">Laporan & Akumulasi Bulanan: {bank.name}</h3>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase border ${isKas ? 'bg-emerald-950 text-emerald-300 border-emerald-800' : 'bg-blue-950 text-blue-300 border-blue-800'}`}>
                  {isKas ? 'Kas Tunai' : 'Rekening Bank'}
                </span>
              </div>
              <p className="text-[11px] text-corporate-300">Rekapitulasi aktivitas pemasukan, pengeluaran, dan saldo terakumulasi per bulan</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportExcel}
              className="px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-xl border border-white/20 transition-all cursor-pointer flex items-center gap-1.5"
              title="Export Rekap Bulanan ke Excel (.xlsx)"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span>Export Excel</span>
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1.5 hover:shadow-emerald-600/30"
              title="Cetak Laporan Rekening ke PDF"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak PDF</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Sub-header / Tabs for On-Screen View (Hidden on Print) */}
        <div className="px-6 py-2.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 no-print">
          <div className="flex items-center gap-1 bg-slate-200/70 p-1 rounded-xl border border-slate-300/80">
            <button
              type="button"
              onClick={() => setActiveTab('monthly')}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'monthly'
                  ? 'bg-white text-corporate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Table className="w-3.5 h-3.5" />
              <span>Rekapitulasi Akumulasi Bulanan</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('ledger')}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'ledger'
                  ? 'bg-white text-corporate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>Buku Mutasi Kas / Transaksi ({bankTransactions.length})</span>
            </button>
          </div>

          {activeTab === 'ledger' && (
            <div className="flex items-center gap-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Filter Periode:</label>
              <select
                value={filterMonth}
                onChange={(e) => setFilterMonth(e.target.value)}
                className="text-xs font-bold text-slate-800 bg-white border border-slate-300 rounded-xl px-3 py-1.5 outline-none shadow-2xs"
              >
                <option value="all">Semua Bulan ({bankTransactions.length} tx)</option>
                {availableMonths.map(m => (
                  <option key={m} value={m}>{formatBulan(m)}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Printable & Scrollable Content Area */}
        <div className="p-4 sm:p-8 overflow-y-auto flex-1 bg-slate-100/60 print:bg-white print:p-0">
          <div id="printable-bank-account-report" className="bg-white p-6 sm:p-10 rounded-xl border border-slate-200 shadow-sm print:border-none print:shadow-none print:p-0 max-w-full text-slate-900 font-sans">
            
            {/* KOP SURAT FORMAL */}
            <div className="border-b-2 border-slate-900 pb-5 mb-6 print:pb-4 print:mb-4">
              <div className="flex justify-between items-start gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-corporate-900"></span>
                    <h1 className="text-xl sm:text-2xl font-black text-slate-950 tracking-tight uppercase">
                      {companyName}
                    </h1>
                  </div>
                  <p className="text-xs font-black text-corporate-800 tracking-wider uppercase mt-1">
                    LAPORAN BUKU KAS & REKENING KORAN PER AKUN
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Individual Bank & Cash Account Reconciliation & Accumulation Statement
                  </p>
                </div>
                <div className="text-right text-xs text-slate-700 space-y-0.5 border-l pl-4 border-slate-200 print:text-[10px]">
                  <p><span className="text-slate-400">Akun:</span> <strong className="text-slate-900">{bank.name}</strong></p>
                  <p><span className="text-slate-400">Tipe Akun:</span> <span className="font-semibold uppercase">{isKas ? 'Kas Tunai' : 'Rekening Bank'}</span></p>
                  <p><span className="text-slate-400">Tanggal Terbit:</span> <strong className="text-slate-900">{formatDateIndo(currentDate)}</strong></p>
                  <p><span className="text-slate-400">Pukul:</span> <span className="font-mono-num">{currentTime} WIB</span></p>
                  <p><span className="text-slate-400">Penyusun:</span> <span className="font-semibold">{currentUser?.name || 'Treasury & Finance'}</span></p>
                </div>
              </div>
            </div>

            {/* SEKSI 1: RINGKASAN SALDO AKUN */}
            <div className="mb-6 print:mb-4">
              <div className="flex items-center gap-2 mb-3 print:mb-2">
                <span className="w-2.5 h-2.5 rounded-full bg-corporate-700"></span>
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  I. Ringkasan Posisi Likuiditas Akun
                </h2>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 print:gap-2.5">
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl overflow-hidden min-w-0">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider truncate">Saldo Awal Master</p>
                  <p className="text-sm sm:text-base font-black font-mono-num text-slate-900 mt-1 truncate">
                    {formatRupiah(masterSaldoAwal)}
                  </p>
                  <p className="text-[10px] text-slate-400 font-medium mt-0.5 truncate">
                    Per {bank.tanggalSaldoAwal ? formatDateIndo(bank.tanggalSaldoAwal) : 'Registrasi Awal'}
                  </p>
                </div>

                <div className="p-3.5 bg-emerald-50/80 border border-emerald-200 rounded-xl overflow-hidden min-w-0">
                  <p className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider truncate">Total Mutasi Masuk</p>
                  <p className="text-sm sm:text-base font-black font-mono-num text-emerald-700 mt-1 truncate">
                    {formatRupiah(totalAllMasuk)}
                  </p>
                  <p className="text-[10px] text-emerald-700 font-medium mt-0.5 truncate">
                    {bankTransactions.filter(t => t.tipe === 'pemasukan').length} Transaksi Masuk
                  </p>
                </div>

                <div className="p-3.5 bg-rose-50/80 border border-rose-200 rounded-xl overflow-hidden min-w-0">
                  <p className="text-[10px] font-bold text-rose-800 uppercase tracking-wider truncate">Total Mutasi Keluar</p>
                  <p className="text-sm sm:text-base font-black font-mono-num text-rose-700 mt-1 truncate">
                    {formatRupiah(totalAllKeluar)}
                  </p>
                  <p className="text-[10px] text-rose-700 font-medium mt-0.5 truncate">
                    {bankTransactions.filter(t => t.tipe === 'pengeluaran').length} Transaksi Keluar
                  </p>
                </div>

                <div className="p-3.5 bg-slate-900 text-white rounded-xl overflow-hidden min-w-0">
                  <p className="text-[10px] font-bold text-amber-300 uppercase tracking-wider truncate">Saldo Akhir Riil</p>
                  <p className="text-sm sm:text-base font-black font-mono-num text-white mt-1 truncate">
                    {formatRupiah(currentEndingBalance)}
                  </p>
                  <p className="text-[10px] text-slate-300 mt-0.5 truncate">
                    Posisi Saldo Terkini
                  </p>
                </div>
              </div>
            </div>

            {/* SEKSI 2: TABEL AKUMULASI BULANAN */}
            <div className="mb-6 print:mb-4">
              <div className="flex items-center gap-2 mb-3 print:mb-2">
                <span className="w-2.5 h-2.5 rounded-full bg-corporate-700"></span>
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  II. Tabel Rekapitulasi Mutasi Kas Terakumulasi per Bulan
                </h2>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left border-collapse text-xs print:text-[11px]">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 uppercase text-[10px] font-bold border-b border-slate-200">
                      <th className="py-2.5 px-3 print:py-2 print:px-2.5 text-center w-8">No</th>
                      <th className="py-2.5 px-3 print:py-2 print:px-2.5">Periode Bulan</th>
                      <th className="py-2.5 px-3 print:py-2 print:px-2.5 text-right">Saldo Awal Bulan</th>
                      <th className="py-2.5 px-3 print:py-2 print:px-2.5 text-right text-emerald-700">Pemasukan (+)</th>
                      <th className="py-2.5 px-3 print:py-2 print:px-2.5 text-right text-rose-700">Pengeluaran (-)</th>
                      <th className="py-2.5 px-3 print:py-2 print:px-2.5 text-right">Net Mutasi</th>
                      <th className="py-2.5 px-3 print:py-2 print:px-2.5 text-right font-black bg-slate-200/50">Saldo Akhir Bulan</th>
                      <th className="py-2.5 px-3 print:py-2 print:px-2.5 text-center">Mutasi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {monthlyHistory.map((item, idx) => (
                      <tr key={item.bulan} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-2.5 px-3 print:py-2 print:px-2.5 text-center text-slate-500 font-semibold">{idx + 1}</td>
                        <td className="py-2.5 px-3 print:py-2 print:px-2.5 font-bold text-slate-900">
                          {item.bulanLabel}
                          <span className="text-[10px] text-slate-400 font-mono ml-1.5 font-normal">({item.bulan})</span>
                        </td>
                        <td className="py-2.5 px-3 print:py-2 print:px-2.5 text-right font-mono-num text-slate-700">
                          {formatRupiah(item.saldoAwal)}
                        </td>
                        <td className="py-2.5 px-3 print:py-2 print:px-2.5 text-right font-mono-num font-bold text-emerald-700">
                          {item.masuk > 0 ? formatRupiah(item.masuk) : '-'}
                        </td>
                        <td className="py-2.5 px-3 print:py-2 print:px-2.5 text-right font-mono-num font-bold text-rose-700">
                          {item.keluar > 0 ? formatRupiah(item.keluar) : '-'}
                        </td>
                        <td className={`py-2.5 px-3 print:py-2 print:px-2.5 text-right font-mono-num font-semibold ${item.net >= 0 ? 'text-blue-700' : 'text-amber-700'}`}>
                          {item.net >= 0 ? '+' : ''}{formatRupiah(item.net)}
                        </td>
                        <td className="py-2.5 px-3 print:py-2 print:px-2.5 text-right font-mono-num font-black text-slate-950 bg-slate-50/70">
                          {formatRupiah(item.saldoAkhir)}
                        </td>
                        <td className="py-2.5 px-3 print:py-2 print:px-2.5 text-center text-slate-600 font-semibold">
                          {item.txCount} tx
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-900 text-white font-bold">
                      <td colSpan="3" className="py-2.5 px-3 print:py-2 print:px-2.5 uppercase text-[10px] tracking-wider font-black">
                        Total Akumulatif Seluruh Periode
                      </td>
                      <td className="py-2.5 px-3 print:py-2 print:px-2.5 text-right font-mono-num text-emerald-300">
                        {formatRupiah(totalAllMasuk)}
                      </td>
                      <td className="py-2.5 px-3 print:py-2 print:px-2.5 text-right font-mono-num text-rose-300">
                        {formatRupiah(totalAllKeluar)}
                      </td>
                      <td className="py-2.5 px-3 print:py-2 print:px-2.5 text-right font-mono-num text-blue-200">
                        {totalAllMasuk - totalAllKeluar >= 0 ? '+' : ''}{formatRupiah(totalAllMasuk - totalAllKeluar)}
                      </td>
                      <td className="py-2.5 px-3 print:py-2 print:px-2.5 text-right font-mono-num font-black text-amber-300">
                        {formatRupiah(currentEndingBalance)}
                      </td>
                      <td className="py-2.5 px-3 print:py-2 print:px-2.5 text-center text-slate-300">
                        {bankTransactions.length} tx
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* SEKSI 3: BUKU MUTASI TRANSAKSI */}
            <div className="mb-6 print:mb-4">
              <div className="flex items-center gap-2 mb-3 print:mb-2">
                <span className="w-2.5 h-2.5 rounded-full bg-corporate-700"></span>
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  III. Buku Mutasi Transaksi Rekening {filterMonth !== 'all' ? `(${formatBulan(filterMonth)})` : '(Semua Transaksi)'}
                </h2>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left border-collapse text-xs print:text-[10px]">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 uppercase text-[10px] font-bold border-b border-slate-200">
                      <th className="py-2 px-3 print:py-1.5 print:px-2 text-center w-8">No</th>
                      <th className="py-2 px-3 print:py-1.5 print:px-2">Tanggal</th>
                      <th className="py-2 px-3 print:py-1.5 print:px-2">Deskripsi Transaksi</th>
                      <th className="py-2 px-3 print:py-1.5 print:px-2 text-center">Tipe Mutasi</th>
                      <th className="py-2 px-3 print:py-1.5 print:px-2 text-right text-emerald-700">Pemasukan (+)</th>
                      <th className="py-2 px-3 print:py-1.5 print:px-2 text-right text-rose-700">Pengeluaran (-)</th>
                      <th className="py-2 px-3 print:py-1.5 print:px-2 text-right font-black bg-slate-200/50">Saldo Berjalan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {displayedLedger.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="py-6 text-center text-slate-400 text-xs">
                          Tidak ada transaksi mutasi kas tercatat untuk periode ini.
                        </td>
                      </tr>
                    ) : (
                      displayedLedger.map((tx, idx) => (
                        <tr key={tx.id || idx} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-1.5 px-3 print:py-1 print:px-2 text-center text-slate-500">{idx + 1}</td>
                          <td className="py-1.5 px-3 print:py-1 print:px-2 whitespace-nowrap text-slate-700 font-semibold">
                            {formatDateIndo(tx.tanggal)}
                          </td>
                          <td className="py-1.5 px-3 print:py-1 print:px-2 font-medium text-slate-900 break-words">
                            {tx.deskripsi}
                          </td>
                          <td className="py-1.5 px-3 print:py-1 print:px-2 text-center whitespace-nowrap">
                            <span className={`inline-block px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                              tx.tipe === 'pemasukan' 
                                ? 'bg-emerald-100 text-emerald-800' 
                                : 'bg-rose-100 text-rose-800'
                            }`}>
                              {tx.tipe === 'pemasukan' ? 'Masuk' : 'Keluar'}
                            </span>
                          </td>
                          <td className="py-1.5 px-3 print:py-1 print:px-2 text-right font-mono-num text-emerald-700 font-bold">
                            {tx.tipe === 'pemasukan' ? formatRupiah(tx.nominal) : '-'}
                          </td>
                          <td className="py-1.5 px-3 print:py-1 print:px-2 text-right font-mono-num text-rose-700 font-bold">
                            {tx.tipe === 'pengeluaran' ? formatRupiah(tx.nominal) : '-'}
                          </td>
                          <td className="py-1.5 px-3 print:py-1 print:px-2 text-right font-mono-num font-black text-slate-950 bg-slate-50/70">
                            {formatRupiah(tx.balanceAfter)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* SEKSI 4: LEMBAR PENGESAHAN */}
            <div className="mt-8 pt-6 border-t-2 border-slate-200 break-inside-avoid print:mt-6 print:pt-4">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-6 text-center print:mb-4">
                LEMBAR PENGESAHAN LAPORAN BUKU KAS & REKENING
              </p>

              <div className="grid grid-cols-3 gap-6 text-center print:gap-4">
                <div>
                  <p className="text-[11px] text-slate-500 font-semibold mb-16 print:mb-10">Disiapkan Oleh (Finance):</p>
                  <div className="border-t border-slate-400 pt-1.5 mx-auto max-w-[160px]">
                    <p className="font-bold text-xs text-slate-900">{currentUser?.name || 'Staff Finance & Treasury'}</p>
                    <p className="text-[10px] text-slate-500 capitalize">{currentUser?.role || 'Staff'}</p>
                  </div>
                </div>

                <div>
                  <p className="text-[11px] text-slate-500 font-semibold mb-16 print:mb-10">Diperiksa Oleh:</p>
                  <div className="border-t border-slate-400 pt-1.5 mx-auto max-w-[160px]">
                    <p className="font-bold text-xs text-slate-900">Finance & Accounting Manager</p>
                    <p className="text-[10px] text-slate-500">Departemen Keuangan</p>
                  </div>
                </div>

                <div>
                  <p className="text-[11px] text-slate-500 font-semibold mb-16 print:mb-10">Disetujui Oleh (Direksi):</p>
                  <div className="border-t border-slate-400 pt-1.5 mx-auto max-w-[160px]">
                    <p className="font-bold text-xs text-slate-900">Direktur Utama</p>
                    <p className="text-[10px] text-slate-500">{companyName}</p>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-3 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400 print:mt-4 print:pt-2">
                <span>Dokumen ini dihasilkan secara otomatis oleh Sistem Laporan Arus Kas & Treasury.</span>
                <span>Halaman 1 dari 1</span>
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
