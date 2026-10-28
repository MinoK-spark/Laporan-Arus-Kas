import React, { useState, useMemo } from 'react';
import { 
  X, 
  Target, 
  Search, 
  ArrowDownLeft, 
  ArrowUpRight, 
  Receipt, 
  Calendar, 
  Building, 
  FileSpreadsheet, 
  AlertTriangle,
  ArrowUpDown
} from 'lucide-react';
import { formatRupiah, formatDateIndo, formatMonthIndo } from '../utils/formatters';
import { isKasAccount } from '../utils/transactionHelper';

export const ForecastTransactionsModal = ({
  isOpen,
  onClose,
  forecast,
  transactions = [],
  banks = []
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState('desc'); // 'desc' | 'asc'

  // Helper bank resolver
  const getBankInfo = (bankId) => {
    const bank = banks.find(b => b.id === bankId);
    if (!bank) return { name: 'Kas / Bank', isKas: false };
    return {
      name: bank.name,
      isKas: isKasAccount(bank)
    };
  };

  // Filter transaksi yang terhubung ke forecast ini
  const relatedTransactions = useMemo(() => {
    if (!forecast?.id) return [];
    return transactions.filter(t => t.planId === forecast.id);
  }, [forecast, transactions]);

  // Total Realisasi & Sisa
  const totalRealisasi = useMemo(() => {
    return relatedTransactions.reduce((sum, t) => sum + (Number(t.nominal) || 0), 0);
  }, [relatedTransactions]);

  const targetNominal = Number(forecast?.nominal) || 0;
  const sisa = targetNominal - totalRealisasi;
  const persentase = targetNominal > 0 ? Math.min(Math.round((totalRealisasi / targetNominal) * 100), 100) : 0;
  const isPemasukan = forecast?.tipe === 'pemasukan';

  // Filtered & Sorted Transactions
  const displayedTransactions = useMemo(() => {
    let result = [...relatedTransactions];

    if (searchTerm.trim()) {
      const q = searchTerm.trim().toLowerCase();
      result = result.filter(t => {
        const descMatch = String(t.deskripsi || '').toLowerCase().includes(q);
        const bankName = getBankInfo(t.bankId).name.toLowerCase();
        const bankMatch = bankName.includes(q);
        const dateMatch = String(t.tanggal || '').includes(q);
        return descMatch || bankMatch || dateMatch;
      });
    }

    result.sort((a, b) => {
      const dateA = a.tanggal || '';
      const dateB = b.tanggal || '';
      return sortOrder === 'asc' ? dateA.localeCompare(dateB) : dateB.localeCompare(dateA);
    });

    return result;
  }, [relatedTransactions, searchTerm, sortOrder, banks]);

  if (!isOpen || !forecast) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        {/* Header Modal */}
        <div className="px-6 py-4 bg-corporate-900 text-white flex items-center justify-between shrink-0 border-b border-corporate-800">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-corporate-800 border border-corporate-700 flex items-center justify-center text-amber-400 shrink-0">
              <Receipt className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-bold text-white truncate max-w-md">
                  {forecast.deskripsi}
                </h3>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                  isPemasukan ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-corporate-700 text-corporate-200 border border-corporate-600'
                }`}>
                  {forecast.tipe}
                </span>
                <span className="text-[11px] text-corporate-300 bg-white/10 px-2 py-0.5 rounded-md">
                  Periode: {formatMonthIndo(forecast.periodeBulan)}
                </span>
              </div>
              <p className="text-xs text-corporate-300 mt-0.5">
                Rincian mutasi kas aktual yang dihubungkan dengan target rencana ini
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-corporate-300 hover:text-white p-2 rounded-xl hover:bg-white/10 transition-colors cursor-pointer shrink-0 ml-3"
            title="Tutup"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 3 Summary Cards */}
        <div className="p-5 bg-slate-50/80 border-b border-slate-200 shrink-0">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            {/* Target Forecast */}
            <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-2xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Target Forecast</span>
              <div className="text-base font-bold font-mono-num text-slate-900 mt-0.5">
                {formatRupiah(targetNominal)}
              </div>
              <span className="text-[11px] text-slate-500 mt-0.5 block">Anggaran yang direncanakan</span>
            </div>

            {/* Total Realisasi */}
            <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Realisasi</span>
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700">
                  {relatedTransactions.length} Transaksi
                </span>
              </div>
              <div className="text-base font-bold font-mono-num text-emerald-700 mt-0.5">
                {formatRupiah(totalRealisasi)}
              </div>
              <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2 overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all ${
                    isPemasukan ? 'bg-emerald-600' : 'bg-corporate-700'
                  }`}
                  style={{ width: `${persentase}%` }}
                />
              </div>
            </div>

            {/* Sisa Anggaran */}
            <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-2xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                {isPemasukan ? 'Selisih Target' : 'Sisa Anggaran'}
              </span>
              <div className={`text-base font-bold font-mono-num mt-0.5 ${sisa < 0 ? 'text-rose-600' : 'text-slate-800'}`}>
                {formatRupiah(sisa)}
              </div>
              <span className="text-[11px] text-slate-500 mt-0.5 block">
                {persentase}% tercapai
              </span>
            </div>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="px-5 py-3 bg-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cari deskripsi, rekening, atau tanggal..."
              className="w-full pl-8.5 pr-8 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-corporate-500 outline-none"
            />
            {searchTerm && (
              <button 
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
              title="Urutkan Tanggal"
            >
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-500" />
              <span>Tanggal: {sortOrder === 'desc' ? 'Terbaru' : 'Terlama'}</span>
            </button>
            <span className="text-xs text-slate-500 font-medium">
              Menampilkan {displayedTransactions.length} dari {relatedTransactions.length} data
            </span>
          </div>
        </div>

        {/* Transactions Table Scrollable */}
        <div className="flex-1 overflow-y-auto">
          {displayedTransactions.length === 0 ? (
            <div className="py-16 px-4 text-center text-slate-400">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-400">
                <FileSpreadsheet className="w-6 h-6 stroke-[1.75]" />
              </div>
              <p className="font-bold text-slate-700 text-sm">
                {relatedTransactions.length === 0 ? 'Belum Ada Transaksi Terkait' : 'Tidak Ada Transaksi yang Cocok'}
              </p>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto leading-relaxed">
                {relatedTransactions.length === 0 
                  ? 'Belum ada transaksi mutasi kas aktual yang dihubungkan ke rencana forecast ini.'
                  : 'Coba ubah kata kunci pencarian pada kotak filter di atas.'}
              </p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-100/90 text-slate-600 uppercase tracking-wider text-[10px] font-bold sticky top-0 z-10 border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-4 w-12 text-center">No</th>
                  <th className="py-2.5 px-4 w-32">Tanggal</th>
                  <th className="py-2.5 px-4 w-48">Rekening Bank / Kas</th>
                  <th className="py-2.5 px-4">Deskripsi Mutasi Kas</th>
                  <th className="py-2.5 px-4 text-right w-40">Nominal</th>
                  <th className="py-2.5 px-3 text-center w-24">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {displayedTransactions.map((tx, idx) => {
                  const bankInfo = getBankInfo(tx.bankId);
                  return (
                    <tr key={tx.id || idx} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 text-center text-slate-400 font-mono-num">
                        {idx + 1}
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-700 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{formatDateIndo(tx.tanggal)}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold ${
                          bankInfo.isKas ? 'bg-emerald-50 text-emerald-800 border border-emerald-200/60' : 'bg-slate-100 text-slate-800 border border-slate-200/60'
                        }`}>
                          <Building className="w-3 h-3 shrink-0" />
                          <span className="truncate max-w-[150px]">{bankInfo.name}</span>
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900 leading-snug">{tx.deskripsi}</div>
                        {tx.isDuplicate && (
                          <div className="flex items-center gap-1 text-[10px] text-amber-600 mt-0.5">
                            <AlertTriangle className="w-3 h-3 shrink-0" />
                            <span>Terindikasi Duplikat</span>
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right font-mono-num font-bold text-slate-900 whitespace-nowrap">
                        <span className={isPemasukan ? 'text-emerald-700' : 'text-corporate-900'}>
                          {formatRupiah(tx.nominal)}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                          Realisasi
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-500">
            Total Realisasi: <span className="font-bold text-slate-800 font-mono-num">{formatRupiah(totalRealisasi)}</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer shadow-2xs"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
