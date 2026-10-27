import React from 'react';
import { 
  ArrowLeftRight,
  ArrowDownLeft, 
  ArrowUpRight, 
  Wallet, 
  Scale, 
  Target, 
  Building, 
  Sparkles,
  Calendar,
  Filter
} from 'lucide-react';
import { formatRupiah, formatDateIndo } from '../utils/formatters';
import { isOperationalIncome, isOperationalExpense, isTransferTransaction, getTransferDirection } from '../utils/transactionHelper';

export const MetricCards = ({ 
  banks = [], 
  forecasts = [],
  transactions = [], 
  totalSaldoAwalSemuaBank = 0, 
  totalMasuk = 0, 
  totalKeluar = 0, 
  saldoAkhirKeseluruhan = 0,
  totalForecastMasuk = 0,
  totalForecastKeluar = 0,
  proyeksiSaldoAkhir = 0,
  totalTransfer = 0,
  transferCount = 0,
  selectedMonth = 'all',
  onMonthChange,
  availableMonths = [],
  banksWithPeriodBalances = []
}) => {
  // Format month label
  const formatBulan = (yyyymm) => {
    if (!yyyymm || yyyymm === 'all') return 'Semua Periode (All-Time)';
    try {
      const [year, month] = yyyymm.split('-');
      const date = new Date(year, parseInt(month) - 1);
      return new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' }).format(date);
    } catch {
      return yyyymm;
    }
  };

  const isPeriodFiltered = selectedMonth && selectedMonth !== 'all';
  const displayBanks = banksWithPeriodBalances.length > 0 ? banksWithPeriodBalances : banks;

  const countMasukTx = (transactions || []).filter(t => {
    if (!isOperationalIncome(t)) return false;
    if (isPeriodFiltered && t.tanggal && !t.tanggal.startsWith(selectedMonth)) return false;
    return true;
  }).length;

  const countKeluarTx = (transactions || []).filter(t => {
    if (!isOperationalExpense(t)) return false;
    if (isPeriodFiltered && t.tanggal && !t.tanggal.startsWith(selectedMonth)) return false;
    return true;
  }).length;

  const persenMasuk = totalForecastMasuk > 0 ? Math.round((totalMasuk / totalForecastMasuk) * 100) : 0;
  const selisihPemasukan = totalMasuk - totalForecastMasuk;
  const selisihPengeluaran = totalForecastKeluar - totalKeluar;
  const isOverbudget = totalForecastKeluar > 0 && totalKeluar > totalForecastKeluar;
  const netMutasi = totalMasuk - totalKeluar;

  // Responsive font size helper
  const getNominalSizeClass = (val) => {
    const formatted = formatRupiah(val);
    if (formatted.length >= 20) return 'text-[15px] sm:text-[16px] xl:text-[17px] 2xl:text-[19px] font-black tracking-tight whitespace-nowrap';
    if (formatted.length >= 17) return 'text-[17px] sm:text-[18px] xl:text-[19px] 2xl:text-[21px] font-black tracking-tight whitespace-nowrap';
    if (formatted.length >= 14) return 'text-[19px] sm:text-[20px] xl:text-[22px] 2xl:text-[24px] font-black tracking-tight whitespace-nowrap';
    return 'text-[21px] sm:text-[23px] xl:text-[25px] 2xl:text-[27px] font-black tracking-tight whitespace-nowrap';
  };

  return (
    <div className="space-y-6">
      
      {/* Period Sync Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white px-5 py-3 rounded-2xl border border-slate-200/90 shadow-2xs">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-corporate-50 border border-corporate-200/80 flex items-center justify-center text-corporate-700">
            <Calendar className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Periode Kas Aktif:</span>
              <span className="text-xs font-black text-slate-900 bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200">
                {formatBulan(selectedMonth)}
              </span>
              {isPeriodFiltered && (
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  Sinkron dengan Rekonsiliasi
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400">Saldo awal dihitung otomatis dari akumulasi saldo akhir bulan sebelumnya</p>
          </div>
        </div>

        {onMonthChange && availableMonths.length > 0 && (
          <div className="flex items-center gap-2">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Ubah Periode:</label>
            <select
              value={selectedMonth || 'all'}
              onChange={(e) => onMonthChange(e.target.value)}
              className="text-xs font-bold text-slate-800 bg-slate-50 hover:bg-slate-100 border border-slate-300 rounded-xl px-3 py-1.5 outline-none cursor-pointer shadow-2xs transition-colors"
            >
              <option value="all">Semua Periode (All-Time)</option>
              {availableMonths.map(m => (
                <option key={m} value={m}>{formatBulan(m)}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* 4 Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* 1. Total Saldo Awal (Rollover dari bulan sebelumnya / master pertama kali) */}
        <div className="bg-white rounded-2xl px-4 sm:px-5 py-4 border border-slate-200/90 shadow-card hover:shadow-card-hover transition-all duration-200 relative overflow-hidden flex flex-col justify-between min-h-[160px]">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-corporate-600 rounded-l-2xl"></div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold tracking-wider text-slate-500 uppercase">
                Total Saldo Awal
              </span>
              <div className="w-9 h-9 rounded-xl bg-corporate-50 border border-corporate-200/80 flex items-center justify-center text-corporate-700 shrink-0">
                <Wallet className="w-5 h-5" />
              </div>
            </div>
            <div 
              className={`${getNominalSizeClass(totalSaldoAwalSemuaBank)} text-slate-900 font-mono-num whitespace-nowrap leading-none py-1`}
              title={formatRupiah(totalSaldoAwalSemuaBank)}
            >
              {formatRupiah(totalSaldoAwalSemuaBank)}
            </div>
            <div className="mt-1 flex items-center gap-1.5">
              <span className="text-[10px] bg-slate-100 text-slate-700 font-bold px-2 py-0.5 rounded-full border border-slate-200">
                {isPeriodFiltered ? 'Saldo Awal Periode' : 'Saldo Awal Terdaftar'}
              </span>
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-semibold">
            <span>{isPeriodFiltered ? 'Akumulasi s/d akhir bulan lalu' : `Tersebar di ${banks.length} Rekening Bank & Kas`}</span>
          </div>
        </div>

        {/* 2. Total Pemasukan Aktual Bulan Ini */}
        <div className="bg-white rounded-2xl px-4 sm:px-5 py-4 border border-slate-200/90 shadow-card hover:shadow-card-hover transition-all duration-200 relative overflow-hidden flex flex-col justify-between min-h-[160px]">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-500 rounded-l-2xl"></div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold tracking-wider text-emerald-800 uppercase">
                Total Pemasukan Operasional
              </span>
              <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shrink-0">
                <ArrowDownLeft className="w-5 h-5" />
              </div>
            </div>
            <div 
              className={`${getNominalSizeClass(totalMasuk)} text-emerald-700 font-mono-num whitespace-nowrap leading-none py-1`}
              title={formatRupiah(totalMasuk)}
            >
              {formatRupiah(totalMasuk)}
            </div>
            <div className="mt-1 flex items-center gap-1.5">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${totalMasuk > 0 ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                {totalMasuk > 0 ? `${countMasukTx} Mutasi Kas Masuk` : 'Belum Ada Mutasi Masuk'}
              </span>
              {totalForecastMasuk > 0 && (
                <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100/70 px-2 py-0.5 rounded-full border border-emerald-200">
                  {persenMasuk}% Target
                </span>
              )}
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-emerald-100/70 space-y-1">
            <div className="flex items-center justify-between text-[10px] font-semibold text-emerald-900">
              <span className="flex items-center gap-1" title="Target rencana penerimaan kas">
                <Target className="w-3 h-3 text-emerald-600"/> Target Forecast:
              </span>
              <span className="font-mono-num whitespace-nowrap font-bold">
                {totalForecastMasuk > 0 ? formatRupiah(totalForecastMasuk) : 'Tanpa Target'}
              </span>
            </div>
            <div className="flex items-center justify-between text-[10px] font-semibold text-slate-600">
              <span>{selisihPemasukan >= 0 ? 'Surplus Capaian:' : 'Kekurangan Target:'}</span>
              <span className={`font-mono-num whitespace-nowrap font-bold ${selisihPemasukan >= 0 ? 'text-emerald-700' : 'text-amber-700'}`}>
                {totalForecastMasuk > 0 
                  ? (selisihPemasukan >= 0 ? `+${formatRupiah(selisihPemasukan)}` : `-${formatRupiah(Math.abs(selisihPemasukan))}`)
                  : formatRupiah(totalMasuk)
                }
              </span>
            </div>
          </div>
        </div>

        {/* 3. Total Pengeluaran Aktual Bulan Ini */}
        <div className="bg-white rounded-2xl px-4 sm:px-5 py-4 border border-slate-200/90 shadow-card hover:shadow-card-hover transition-all duration-200 relative overflow-hidden flex flex-col justify-between min-h-[160px]">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-rose-500 rounded-l-2xl"></div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold tracking-wider text-rose-800 uppercase">
                Total Pengeluaran Operasional
              </span>
              <div className="w-9 h-9 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 shrink-0">
                <ArrowUpRight className="w-5 h-5" />
              </div>
            </div>
            <div 
              className={`${getNominalSizeClass(totalKeluar)} text-rose-700 font-mono-num whitespace-nowrap leading-none py-1`}
              title={formatRupiah(totalKeluar)}
            >
              {formatRupiah(totalKeluar)}
            </div>
            <div className="mt-1 flex items-center gap-1.5">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${totalKeluar > 0 ? 'bg-rose-100 text-rose-800 border-rose-300' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                {totalKeluar > 0 ? `${countKeluarTx} Mutasi Kas Keluar` : 'Belum Ada Mutasi Keluar'}
              </span>
              {isOverbudget && (
                <span className="text-[10px] font-bold text-rose-800 bg-rose-100 px-2 py-0.5 rounded-full border border-rose-300 animate-pulse">
                  Melebihi Plafon
                </span>
              )}
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-rose-100/70 space-y-1">
            <div className="flex items-center justify-between text-[10px] font-semibold text-rose-900">
              <span className="flex items-center gap-1" title="Plafon rencana pengeluaran kas">
                <Target className="w-3 h-3 text-rose-600"/> Plafon Forecast:
              </span>
              <span className="font-mono-num whitespace-nowrap font-bold">
                {totalForecastKeluar > 0 ? formatRupiah(totalForecastKeluar) : 'Tanpa Plafon'}
              </span>
            </div>
            <div className="flex items-center justify-between text-[10px] font-semibold text-slate-600">
              <span>{isOverbudget ? 'Melebihi Plafon:' : 'Sisa Plafon Anggaran:'}</span>
              <span className={`font-mono-num whitespace-nowrap font-bold ${isOverbudget ? 'text-rose-700' : 'text-emerald-700'}`}>
                {totalForecastKeluar > 0 
                  ? (isOverbudget ? `-${formatRupiah(Math.abs(selisihPengeluaran))}` : `+${formatRupiah(selisihPengeluaran)}`)
                  : formatRupiah(totalKeluar)
                }
              </span>
            </div>
          </div>
        </div>

        {/* 4. Saldo Kas Riil & Proyeksi Keseluruhan */}
        <div className="bg-gradient-to-br from-navy-950 via-corporate-950 to-corporate-900 text-white rounded-2xl px-4 sm:px-5 py-4 border border-corporate-700/60 shadow-xl relative overflow-hidden flex flex-col justify-between min-h-[160px]">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-amber-400 rounded-l-2xl"></div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold tracking-wider text-corporate-200 uppercase flex items-center gap-1">
                <span>Saldo Keseluruhan</span>
              </span>
              <div className="w-9 h-9 rounded-xl bg-corporate-800/90 border border-corporate-600/50 flex items-center justify-center text-amber-400 shrink-0 shadow-xs">
                <Scale className="w-5 h-5" />
              </div>
            </div>
            <div 
              className={`${getNominalSizeClass(saldoAkhirKeseluruhan)} text-white font-mono-num whitespace-nowrap leading-none py-1`}
              title={formatRupiah(saldoAkhirKeseluruhan)}
            >
              {formatRupiah(saldoAkhirKeseluruhan)}
            </div>
            <div className="mt-1 flex items-center gap-1.5">
              <span className="text-[10px] bg-corporate-800 text-amber-300 font-bold px-2 py-0.5 rounded-full border border-corporate-700">
                {isPeriodFiltered ? `Posisi Akhir ${formatBulan(selectedMonth)}` : 'Saldo Kas Riil Saat Ini'}
              </span>
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-corporate-700/60 space-y-1">
            <div className="flex items-center justify-between text-[10px] font-semibold text-corporate-200">
              <span className="flex items-center gap-1" title="Proyeksi saldo kas berdasarkan rekonsiliasi aktif">
                <Sparkles className="w-3 h-3 text-amber-400" /> Proyeksi Rekonsiliasi:
              </span>
              <span className="font-mono-num whitespace-nowrap text-amber-300 font-bold">
                {formatRupiah(proyeksiSaldoAkhir)}
              </span>
            </div>
            <div className="flex items-center justify-between text-[10px] text-corporate-300 font-medium">
              <span>Net Mutasi Kas:</span>
              <span className={`font-mono-num whitespace-nowrap font-bold ${netMutasi >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
                {netMutasi >= 0 ? '+' : ''}{formatRupiah(netMutasi)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Grid Cards for Individual Banks */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-bold tracking-wider text-slate-500 uppercase flex items-center gap-2">
            <Building className="w-4 h-4 text-corporate-600" />
            <span>
              Saldo per Rekening Bank & Kas ({displayBanks.length})
              {isPeriodFiltered && <span className="text-corporate-700 font-bold ml-1">• Periode {formatBulan(selectedMonth)}</span>}
            </span>
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3.5">
          {displayBanks.map(bank => {
            const currentBalance = bank.saldoAkhirPeriode !== undefined 
              ? bank.saldoAkhirPeriode 
              : ((Number(bank.saldoAwal) || 0) + (bank.totalMasuk || 0) - (bank.totalKeluar || 0));

            const hasMutation = (bank.totalMasukPeriode || bank.totalMasuk || 0) > 0 || (bank.totalKeluarPeriode || bank.totalKeluar || 0) > 0;

            return (
              <div 
                key={bank.id} 
                className="bg-white border border-slate-200/90 hover:border-corporate-400/80 rounded-2xl p-4 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between group"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200/70 flex items-center justify-center text-corporate-700 group-hover:bg-corporate-50 group-hover:border-corporate-300 transition-colors shrink-0">
                    <Building className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold text-slate-700 group-hover:text-corporate-900 transition-colors truncate" title={bank.name}>
                      {bank.name}
                    </div>
                    <div 
                      className="text-base sm:text-lg font-black text-slate-900 font-mono-num tracking-tight mt-1 break-words leading-snug"
                      title={formatRupiah(currentBalance)}
                    >
                      {formatRupiah(currentBalance)}
                    </div>
                  </div>
                </div>

                <div className="text-[11px] text-slate-400 font-medium flex items-center justify-between gap-1.5 mt-3 pt-2.5 border-t border-slate-100">
                  <span className="truncate">
                    Awal: {formatRupiah(bank.saldoAwalPeriode !== undefined ? bank.saldoAwalPeriode : bank.saldoAwal)}
                  </span>
                  {hasMutation && (
                    <span className="text-[10px] font-bold text-corporate-700 bg-corporate-50 px-1.5 py-0.5 rounded">
                      Ada Mutasi
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
