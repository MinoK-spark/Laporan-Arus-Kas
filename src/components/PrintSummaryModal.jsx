import React from 'react';
import { Printer, X, Building, Wallet, Calendar, FileText, ArrowDownLeft, ArrowUpRight, CheckCircle2 } from 'lucide-react';
import { formatRupiah, formatDateIndo } from '../utils/formatters';

export function PrintSummaryModal({
  isOpen,
  onClose,
  companyName = 'PT GRAHA PRIMA ENERGI',
  currentUser,
  banks = [],
  transactions = []
}) {
  if (!isOpen) return null;

  const currentDate = new Date().toISOString().split('T')[0];
  const currentTime = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

  // Calculate Transaction Totals
  const totalMasuk = transactions
    .filter(t => t.tipe === 'pemasukan')
    .reduce((sum, t) => sum + (Number(t.nominal) || 0), 0);

  const totalKeluar = transactions
    .filter(t => t.tipe === 'pengeluaran')
    .reduce((sum, t) => sum + (Number(t.nominal) || 0), 0);

  const netCashFlow = totalMasuk - totalKeluar;

  // Calculate Per-account Running Balances
  let grandTotalSaldoAwal = 0;
  let grandTotalMasuk = 0;
  let grandTotalKeluar = 0;
  let grandTotalSaldoAkhir = 0;

  const accountsSummary = banks.map(bank => {
    const masuk = transactions
      .filter(t => t.bankId === bank.id && t.tipe === 'pemasukan')
      .reduce((sum, t) => sum + (Number(t.nominal) || 0), 0);

    const keluar = transactions
      .filter(t => t.bankId === bank.id && t.tipe === 'pengeluaran')
      .reduce((sum, t) => sum + (Number(t.nominal) || 0), 0);

    const saldoAwal = Number(bank.saldoAwal) || 0;
    const saldoAkhir = saldoAwal + masuk - keluar;

    grandTotalSaldoAwal += saldoAwal;
    grandTotalMasuk += masuk;
    grandTotalKeluar += keluar;
    grandTotalSaldoAkhir += saldoAkhir;

    return {
      ...bank,
      masuk,
      keluar,
      saldoAkhir
    };
  });

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-150 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-6xl max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 my-auto">
        
        {/* Modal Top Bar (Hidden on Print) */}
        <div className="px-6 py-3.5 bg-corporate-900 text-white flex items-center justify-between no-print shrink-0 border-b border-corporate-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-corporate-200">
              <Printer className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold tracking-tight">Pratinjau Cetak Ringkasan Kas & Bank</h3>
                <span className="text-[10px] font-mono bg-corporate-800 text-corporate-200 px-2 py-0.5 rounded border border-corporate-700/80">
                  A4 Landscape
                </span>
              </div>
              <p className="text-[11px] text-corporate-300">Menampilkan total transaksi dan saldo berjalan seluruh rekening bank & kas</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak Sekarang (PDF)</span>
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

        {/* Printable Content Area */}
        <div className="p-4 sm:p-8 overflow-y-auto flex-1 bg-slate-100/60 print:bg-white print:p-0">
          
          <div id="printable-dashboard-summary" className="bg-white p-6 sm:p-8 rounded-xl border border-slate-200 shadow-sm print:border-none print:shadow-none print:p-0 max-w-full">
            
            {/* Kop / Header Surat Laporan */}
            <div className="border-b-2 border-slate-900 pb-4 mb-6">
              <div className="flex justify-between items-start gap-4">
                <div>
                  <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight uppercase">
                    {companyName}
                  </h1>
                  <p className="text-xs font-bold text-corporate-700 tracking-wider uppercase mt-0.5">
                    LAPORAN RINGKASAN TRANSAKSI & SALDO BANK / KAS
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Internal Finance & Treasury Report
                  </p>
                </div>
                <div className="text-right text-xs text-slate-600 space-y-0.5">
                  <p><span className="text-slate-400">Tanggal Cetak:</span> <strong className="text-slate-800">{formatDateIndo(currentDate)}</strong></p>
                  <p><span className="text-slate-400">Pukul:</span> <span className="font-mono-num font-semibold text-slate-800">{currentTime} WIB</span></p>
                  <p><span className="text-slate-400">Dicetak Oleh:</span> <span className="font-semibold text-slate-800">{currentUser?.name || 'Administrator'}</span></p>
                </div>
              </div>
            </div>

            {/* BAGIAN 1: TOTAL TRANSAKSI KAS */}
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <span className="w-2 h-2 rounded-full bg-corporate-700"></span>
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  I. Ringkasan Total Mutasi Transaksi Kas
                </h2>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-emerald-50/80 border border-emerald-200 rounded-xl">
                  <p className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">Total Pemasukan</p>
                  <p className="text-base sm:text-lg font-black font-mono-num text-emerald-700 mt-1">
                    {formatRupiah(totalMasuk)}
                  </p>
                  <p className="text-[10px] text-emerald-600 mt-0.5">
                    {transactions.filter(t => t.tipe === 'pemasukan').length} transaksi masuk
                  </p>
                </div>

                <div className="p-3 bg-rose-50/80 border border-rose-200 rounded-xl">
                  <p className="text-[10px] font-bold text-rose-800 uppercase tracking-wider">Total Pengeluaran</p>
                  <p className="text-base sm:text-lg font-black font-mono-num text-rose-700 mt-1">
                    {formatRupiah(totalKeluar)}
                  </p>
                  <p className="text-[10px] text-rose-600 mt-0.5">
                    {transactions.filter(t => t.tipe === 'pengeluaran').length} transaksi keluar
                  </p>
                </div>

                <div className={`p-3 border rounded-xl ${netCashFlow >= 0 ? 'bg-blue-50/80 border-blue-200' : 'bg-amber-50/80 border-amber-200'}`}>
                  <p className={`text-[10px] font-bold uppercase tracking-wider ${netCashFlow >= 0 ? 'text-blue-800' : 'text-amber-800'}`}>
                    Arus Kas Bersih (Net)
                  </p>
                  <p className={`text-base sm:text-lg font-black font-mono-num mt-1 ${netCashFlow >= 0 ? 'text-blue-700' : 'text-amber-700'}`}>
                    {netCashFlow >= 0 ? `+${formatRupiah(netCashFlow)}` : `-${formatRupiah(Math.abs(netCashFlow))}`}
                  </p>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    {netCashFlow >= 0 ? 'Surplus operasional' : 'Defisit operasional'}
                  </p>
                </div>

                <div className="p-3 bg-slate-100/80 border border-slate-300 rounded-xl">
                  <p className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">Total Mutasi Transaksi</p>
                  <p className="text-base sm:text-lg font-black font-mono-num text-slate-900 mt-1">
                    {transactions.length}
                  </p>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    Seluruh catatan kas aktual
                  </p>
                </div>
              </div>
            </div>

            {/* BAGIAN 2: SALDO TERKINI BANK & KAS */}
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <span className="w-2 h-2 rounded-full bg-corporate-700"></span>
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  II. Data Saldo Terkini Rekening Bank & Kas
                </h2>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-x-auto print:overflow-visible print:border print:border-slate-300">
                <table className="w-full text-left border-collapse text-xs print:text-[10px]">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 uppercase text-[10px] font-bold border-b border-slate-200">
                      <th className="py-2.5 px-3 text-center w-10">No</th>
                      <th className="py-2.5 px-3 min-w-[180px]">Nama Rekening / Akun</th>
                      <th className="py-2.5 px-2 text-center w-16">Tipe</th>
                      <th className="py-2.5 px-3 text-right whitespace-nowrap">Saldo Awal</th>
                      <th className="py-2.5 px-3 text-right whitespace-nowrap text-emerald-800">Mutasi Masuk (+)</th>
                      <th className="py-2.5 px-3 text-right whitespace-nowrap text-rose-800">Mutasi Keluar (-)</th>
                      <th className="py-2.5 px-3 text-right whitespace-nowrap font-black bg-slate-200/60 print:bg-slate-100">Saldo Akhir Terkini</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {accountsSummary.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="py-6 text-center text-slate-400">
                          Belum ada akun bank atau kas yang terdaftar.
                        </td>
                      </tr>
                    ) : (
                      accountsSummary.map((acc, index) => {
                        const isKas = acc.tipeAkun === 'kas';
                        return (
                          <tr key={acc.id} className="hover:bg-slate-50 print:hover:bg-transparent">
                            <td className="py-2 px-3 text-center font-semibold text-slate-500">
                              {index + 1}
                            </td>
                            <td className="py-2 px-3 font-bold text-slate-900 break-words">
                              {acc.name}
                            </td>
                            <td className="py-2 px-2 text-center">
                              <span className={`inline-block px-2 py-0.5 rounded text-[9px] font-bold uppercase ${isKas ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'}`}>
                                {isKas ? 'Kas' : 'Bank'}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-right font-mono-num font-medium text-slate-700 whitespace-nowrap">
                              {formatRupiah(acc.saldoAwal)}
                            </td>
                            <td className="py-2 px-3 text-right font-mono-num font-semibold text-emerald-700 whitespace-nowrap">
                              {acc.masuk > 0 ? `+${formatRupiah(acc.masuk)}` : 'Rp 0,00'}
                            </td>
                            <td className="py-2 px-3 text-right font-mono-num font-semibold text-rose-700 whitespace-nowrap">
                              {acc.keluar > 0 ? `-${formatRupiah(acc.keluar)}` : 'Rp 0,00'}
                            </td>
                            <td className="py-2 px-3 text-right font-mono-num font-black text-slate-900 bg-slate-50/80 print:bg-slate-50 whitespace-nowrap">
                              {formatRupiah(acc.saldoAkhir)}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-100/90 font-black text-slate-900 border-t-2 border-slate-300">
                      <td colSpan="3" className="py-2.5 px-3 text-right uppercase text-[10px] tracking-wider">
                        Total Saldo Keseluruhan:
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono-num whitespace-nowrap">
                        {formatRupiah(grandTotalSaldoAwal)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono-num text-emerald-700 whitespace-nowrap">
                        +{formatRupiah(grandTotalMasuk)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono-num text-rose-700 whitespace-nowrap">
                        -{formatRupiah(grandTotalKeluar)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono-num bg-slate-200/80 print:bg-slate-200 text-corporate-950 text-xs sm:text-sm whitespace-nowrap">
                        {formatRupiah(grandTotalSaldoAkhir)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Catatan Kaki & Tanda Tangan Laporan */}
            <div className="mt-8 pt-4 border-t border-slate-200 flex justify-between items-end text-xs text-slate-600">
              <div className="space-y-0.5 text-[10px] text-slate-400">
                <p>• Laporan ini dibuat secara otomatis oleh Sistem Arus Kas Keuangan.</p>
                <p>• Validitas data sesuai pencatatan mutasi kas dan saldo per tanggal cetak.</p>
              </div>

              <div className="flex gap-12 text-center">
                <div>
                  <p className="text-[11px] text-slate-500 mb-10">Disiapkan Oleh,</p>
                  <p className="font-bold text-slate-800 underline">{currentUser?.name || 'Staff Finance'}</p>
                  <p className="text-[10px] text-slate-400">Internal Treasury</p>
                </div>
                <div>
                  <p className="text-[11px] text-slate-500 mb-10">Disetujui Oleh,</p>
                  <p className="font-bold text-slate-800 underline">Finance Manager</p>
                  <p className="text-[10px] text-slate-400">Head of Finance</p>
                </div>
              </div>
            </div>

          </div>

        </div>

        {/* Modal Footer (Hidden on Print) */}
        <div className="px-6 py-3 bg-slate-100/90 border-t border-slate-200 flex flex-wrap justify-between items-center gap-2 no-print shrink-0">
          <p className="text-xs text-slate-500">
            Tip: Format telah disesuaikan untuk cetak <strong>A4 Landscape</strong>. Gunakan opsi <strong>"Save as PDF"</strong> untuk menyimpan berkas.
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer"
            >
              Tutup
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="px-5 py-2 bg-corporate-700 hover:bg-corporate-800 active:bg-corporate-900 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak / Simpan PDF</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
