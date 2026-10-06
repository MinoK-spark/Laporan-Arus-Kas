import React from 'react';
import { Wallet, ArrowDownLeft, ArrowUpRight, Scale, Building, Calendar, Target, AlertTriangle } from 'lucide-react';
import { formatRupiah, formatDateIndo } from '../utils/formatters';

export const MetricCards = ({
  banks,
  transactions,
  totalSaldoAwalSemuaBank,
  totalMasuk,
  totalKeluar,
  saldoAkhirKeseluruhan
}) => {
  // Pemasukan Breakdown
  const masukForecast = transactions.filter(t => t.tipe === 'pemasukan' && t.planId !== 'unplanned').reduce((sum, t) => sum + t.nominal, 0);
  const masukNonForecast = transactions.filter(t => t.tipe === 'pemasukan' && t.planId === 'unplanned').reduce((sum, t) => sum + t.nominal, 0);

  // Pengeluaran Breakdown
  const keluarForecast = transactions.filter(t => t.tipe === 'pengeluaran' && t.planId !== 'unplanned').reduce((sum, t) => sum + t.nominal, 0);
  const keluarNonForecast = transactions.filter(t => t.tipe === 'pengeluaran' && t.planId === 'unplanned').reduce((sum, t) => sum + t.nominal, 0);

  return (
    <div className="space-y-4">
      {/* Consolidated Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Total Saldo Awal Semua Bank */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-card hover:shadow-card-hover transition-all duration-200 relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-corporate-600 rounded-l-2xl"></div>
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold tracking-wider text-slate-500 uppercase">
                Total Saldo Awal
              </span>
              <div className="w-9 h-9 rounded-xl bg-corporate-50 border border-corporate-200 flex items-center justify-center text-corporate-700">
                <Wallet className="w-5 h-5" />
              </div>
            </div>
            <div className="text-2xl font-extrabold text-slate-900 tracking-tight font-mono-num">
              {formatRupiah(totalSaldoAwalSemuaBank)}
            </div>
          </div>
          <div className="mt-2.5 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-semibold">
            <span>Tersebar di {banks.length} Rekening Bank</span>
          </div>
        </div>

        {/* 2. Total Kas Masuk */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-card hover:shadow-card-hover transition-all duration-200 relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-500 rounded-l-2xl"></div>
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold tracking-wider text-emerald-800 uppercase">
                Total Pemasukan
              </span>
              <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
                <ArrowDownLeft className="w-5 h-5" />
              </div>
            </div>
            <div className="text-2xl font-extrabold text-emerald-700 tracking-tight font-mono-num mb-1">
              {formatRupiah(totalMasuk)}
            </div>
          </div>
          <div className="mt-2 pt-2 border-t border-emerald-100/50 space-y-1">
            <div className="flex items-center justify-between text-[10px] font-semibold text-emerald-800/80">
              <span className="flex items-center gap-1"><Target className="w-3 h-3"/> Forecast</span>
              <span className="font-mono-num">{formatRupiah(masukForecast)}</span>
            </div>
            <div className="flex items-center justify-between text-[10px] font-semibold text-rose-600/80">
              <span className="flex items-center gap-1"><AlertTriangle className="w-3 h-3"/> Non-Forecast</span>
              <span className="font-mono-num">{formatRupiah(masukNonForecast)}</span>
            </div>
          </div>
        </div>

        {/* 3. Total Kas Keluar */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-card hover:shadow-card-hover transition-all duration-200 relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-rose-500 rounded-l-2xl"></div>
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold tracking-wider text-rose-800 uppercase">
                Total Pengeluaran
              </span>
              <div className="w-9 h-9 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600">
                <ArrowUpRight className="w-5 h-5" />
              </div>
            </div>
            <div className="text-2xl font-extrabold text-rose-700 tracking-tight font-mono-num mb-1">
              {formatRupiah(totalKeluar)}
            </div>
          </div>
          <div className="mt-2 pt-2 border-t border-rose-100/50 space-y-1">
            <div className="flex items-center justify-between text-[10px] font-semibold text-emerald-700/80">
              <span className="flex items-center gap-1"><Target className="w-3 h-3"/> Forecast</span>
              <span className="font-mono-num">{formatRupiah(keluarForecast)}</span>
            </div>
            <div className="flex items-center justify-between text-[10px] font-semibold text-rose-800/80">
              <span className="flex items-center gap-1"><AlertTriangle className="w-3 h-3"/> Non-Forecast</span>
              <span className="font-mono-num">{formatRupiah(keluarNonForecast)}</span>
            </div>
          </div>
        </div>

        {/* 4. Saldo Akhir Keseluruhan */}
        <div className="bg-gradient-to-br from-navy-900 to-corporate-900 text-white rounded-2xl p-5 border border-corporate-700/60 shadow-xl relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-amber-400 rounded-l-2xl"></div>
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold tracking-wider text-corporate-200 uppercase">
                Saldo Keseluruhan
              </span>
              <div className="w-9 h-9 rounded-xl bg-corporate-800/80 border border-corporate-600/50 flex items-center justify-center text-amber-400">
                <Scale className="w-5 h-5" />
              </div>
            </div>
            <div className="text-2xl font-extrabold text-white tracking-tight font-mono-num">
              {formatRupiah(saldoAkhirKeseluruhan)}
            </div>
          </div>
          <div className="mt-2.5 pt-2.5 border-t border-corporate-700/60 flex items-center justify-between text-[11px] text-corporate-300 font-semibold">
            <span>Akumulasi semua bank aktif</span>
          </div>
        </div>
      </div>

      {/* Mini Cards for Individual Banks */}
      <div>
        <h3 className="text-xs font-bold tracking-wider text-slate-500 uppercase mb-2">
          Saldo Terkini per Rekening Bank
        </h3>
        <div className="flex flex-wrap gap-3">
          {banks.map(bank => {
            const bankIn = transactions.filter(t => t.bankId === bank.id && t.tipe === 'pemasukan').reduce((sum, t) => sum + t.nominal, 0);
            const bankOut = transactions.filter(t => t.bankId === bank.id && t.tipe === 'pengeluaran').reduce((sum, t) => sum + t.nominal, 0);
            const currentBalance = bank.saldoAwal + bankIn - bankOut;

            return (
              <div key={bank.id} className="bg-white border border-slate-200 rounded-xl px-4 py-3 flex items-center gap-3 shadow-sm min-w-[240px]">
                <div className="w-10 h-10 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-600 shrink-0">
                  <Building className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-slate-600">{bank.name}</div>
                  <div className="font-bold text-slate-900 font-mono-num text-lg leading-tight">{formatRupiah(currentBalance)}</div>
                  {bank.tanggalSaldoAwal && (
                    <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                      <Calendar className="w-3 h-3" />
                      Awal: {formatDateIndo(bank.tanggalSaldoAwal)}
                    </div>
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
