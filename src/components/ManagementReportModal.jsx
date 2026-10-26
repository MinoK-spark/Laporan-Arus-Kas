import React from 'react';
import { 
  Printer, 
  X, 
  Building2, 
  Calendar, 
  FileText, 
  ArrowDownLeft, 
  ArrowUpRight, 
  Scale, 
  ShieldCheck, 
  Target, 
  CheckCircle2 
} from 'lucide-react';
import { formatRupiah, formatDateIndo } from '../utils/formatters';

export function ManagementReportModal({
  isOpen,
  onClose,
  companyName = 'PT GRAHA PRIMA ENERGI',
  currentUser,
  periodLabel = 'Bulan Berjalan',
  totalPemasukan = 0,
  totalPengeluaran = 0,
  netCashflow = 0,
  saldoAkhirKumulatif = 0,
  bankAnalyticsData = [],
  forecasts = [],
  transactions = []
}) {
  if (!isOpen) return null;

  const currentDate = new Date().toISOString().split('T')[0];
  const currentTime = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

  // Compute forecast comparison
  const totalForecastMasuk = forecasts
    .filter(f => f.tipe === 'pemasukan')
    .reduce((sum, f) => sum + (Number(f.nominal) || 0), 0);

  const totalForecastKeluar = forecasts
    .filter(f => f.tipe === 'pengeluaran')
    .reduce((sum, f) => sum + (Number(f.nominal) || 0), 0);

  const persenMasuk = totalForecastMasuk > 0 ? Math.round((totalPemasukan / totalForecastMasuk) * 100) : 0;
  const persenKeluar = totalForecastKeluar > 0 ? Math.round((totalPengeluaran / totalForecastKeluar) * 100) : 0;

  // Ukuran font adaptif agar angka ratusan milyar / triliun tidak saling tumpang tindih atau terpotong
  const getNominalSizeClass = (val) => {
    const str = formatRupiah(val);
    if (str.length >= 22) return 'text-xs sm:text-sm font-black font-mono-num tracking-tight print:text-xs';
    if (str.length >= 18) return 'text-sm sm:text-base font-black font-mono-num tracking-tight print:text-sm';
    return 'text-base sm:text-lg font-black font-mono-num print:text-base';
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/75 backdrop-blur-xs animate-in fade-in duration-150 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-6xl max-h-[94vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 my-auto">
        
        {/* Top Control Bar (Hidden on Print) */}
        <div className="px-6 py-3.5 bg-corporate-900 text-white flex items-center justify-between no-print shrink-0 border-b border-corporate-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-amber-400">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold tracking-tight">Laporan Formal Analisis Arus Kas Eksekutif</h3>
                <span className="text-[10px] font-mono bg-corporate-800 text-amber-300 px-2 py-0.5 rounded border border-corporate-700/80">
                  Untuk Manajemen
                </span>
              </div>
              <p className="text-[11px] text-corporate-300">Format resmi untuk presentasi Direksi, Komisaris, dan Tim Manajemen</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1.5 hover:shadow-emerald-600/30"
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

        {/* Printable Formal Document Area */}
        <div className="p-4 sm:p-8 overflow-y-auto flex-1 bg-slate-100/60 print:bg-white print:p-0">
          <div id="printable-management-report" className="bg-white p-6 sm:p-10 rounded-xl border border-slate-200 shadow-sm print:border-none print:shadow-none print:p-0 max-w-full text-slate-900 font-sans">
            
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
                    LAPORAN ANALISIS ARUS KAS & KEUANGAN EKSEKUTIF
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Executive Cash Flow Intelligence & Strategic Treasury Report
                  </p>
                </div>
                <div className="text-right text-xs text-slate-700 space-y-0.5 border-l pl-4 border-slate-200 print:text-[10px]">
                  <p><span className="text-slate-400">Periode:</span> <strong>{periodLabel}</strong></p>
                  <p><span className="text-slate-400">Tanggal Terbit:</span> <strong className="text-slate-900">{formatDateIndo(currentDate)}</strong></p>
                  <p><span className="text-slate-400">Pukul:</span> <span className="font-mono-num">{currentTime} WIB</span></p>
                  <p><span className="text-slate-400">Penyusun:</span> <span className="font-semibold">{currentUser?.name || 'Treasury & Finance'}</span></p>
                </div>
              </div>
            </div>

            {/* SECTION 1: RINGKASAN EKSEKUTIF (EXECUTIVE SUMMARY) */}
            <div className="mb-6 print:mb-4">
              <div className="flex items-center gap-2 mb-3 print:mb-2">
                <span className="w-2.5 h-2.5 rounded-full bg-corporate-700"></span>
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  I. Indikator Utama Likuiditas & Arus Kas
                </h2>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 print:gap-2.5">
                <div className="p-3.5 bg-emerald-50/80 border border-emerald-200 rounded-xl overflow-hidden min-w-0 flex flex-col justify-between">
                  <p className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider truncate">Total Kas Masuk</p>
                  <p className={`${getNominalSizeClass(totalPemasukan)} text-emerald-700 mt-1 truncate`} title={formatRupiah(totalPemasukan)}>
                    {formatRupiah(totalPemasukan)}
                  </p>
                  <p className="text-[10px] text-emerald-700 font-medium mt-0.5 truncate">
                    {persenMasuk > 0 ? `${persenMasuk}% dari target forecast` : 'Realisasi masuk'}
                  </p>
                </div>

                <div className="p-3.5 bg-rose-50/80 border border-rose-200 rounded-xl overflow-hidden min-w-0 flex flex-col justify-between">
                  <p className="text-[10px] font-bold text-rose-800 uppercase tracking-wider truncate">Total Kas Keluar</p>
                  <p className={`${getNominalSizeClass(totalPengeluaran)} text-rose-700 mt-1 truncate`} title={formatRupiah(totalPengeluaran)}>
                    {formatRupiah(totalPengeluaran)}
                  </p>
                  <p className="text-[10px] text-rose-700 font-medium mt-0.5 truncate">
                    {persenKeluar > 0 ? `${persenKeluar}% dari pagu forecast` : 'Realisasi keluar'}
                  </p>
                </div>

                <div className={`p-3.5 border rounded-xl overflow-hidden min-w-0 flex flex-col justify-between ${netCashflow >= 0 ? 'bg-blue-50/80 border-blue-200' : 'bg-amber-50/80 border-amber-200'}`}>
                  <p className={`text-[10px] font-bold uppercase tracking-wider truncate ${netCashflow >= 0 ? 'text-blue-800' : 'text-amber-800'}`}>
                    Arus Kas Bersih (Net)
                  </p>
                  <p className={`${getNominalSizeClass(netCashflow)} mt-1 truncate ${netCashflow >= 0 ? 'text-blue-700' : 'text-amber-700'}`} title={formatRupiah(netCashflow)}>
                    {netCashflow >= 0 ? `+${formatRupiah(netCashflow)}` : `-${formatRupiah(Math.abs(netCashflow))}`}
                  </p>
                  <p className="text-[10px] text-slate-500 mt-0.5 truncate">
                    {netCashflow >= 0 ? 'Surplus Kas Periode' : 'Defisit Kas Periode'}
                  </p>
                </div>

                <div className="p-3.5 bg-slate-900 text-white rounded-xl overflow-hidden min-w-0 flex flex-col justify-between">
                  <p className="text-[10px] font-bold text-amber-300 uppercase tracking-wider truncate">Total Saldo Kas Riil</p>
                  <p className={`${getNominalSizeClass(saldoAkhirKumulatif)} text-white mt-1 truncate`} title={formatRupiah(saldoAkhirKumulatif)}>
                    {formatRupiah(saldoAkhirKumulatif)}
                  </p>
                  <p className="text-[10px] text-slate-300 mt-0.5 truncate">
                    Posisi Likuiditas Akhir
                  </p>
                </div>
              </div>
            </div>

            {/* SECTION 2: ANALISIS PERFORMA FORECAST VS REALISASI */}
            <div className="mb-6 print:mb-4">
              <div className="flex items-center gap-2 mb-3 print:mb-2">
                <span className="w-2.5 h-2.5 rounded-full bg-corporate-700"></span>
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  II. Analisis Komparasi Forecast vs Realisasi Kas
                </h2>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left border-collapse text-xs print:text-[11px]">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 uppercase text-[10px] font-bold border-b border-slate-200">
                      <th className="py-2.5 px-3 print:py-2 print:px-2.5">Kategori Indikator</th>
                      <th className="py-2.5 px-3 print:py-2 print:px-2.5 text-right">Rencana / Forecast</th>
                      <th className="py-2.5 px-3 print:py-2 print:px-2.5 text-right">Realisasi Riil</th>
                      <th className="py-2.5 px-3 print:py-2 print:px-2.5 text-right">Selisih (Varian)</th>
                      <th className="py-2.5 px-3 print:py-2 print:px-2.5 text-center">Tingkat Capaian</th>
                      <th className="py-2.5 px-3 print:py-2 print:px-2.5 text-center">Status Manajemen</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    <tr>
                      <td className="py-2.5 px-3 print:py-2 print:px-2.5 font-bold text-slate-800">Penerimaan Kas (Inflow)</td>
                      <td className="py-2.5 px-3 print:py-2 print:px-2.5 text-right font-mono-num text-slate-600">{formatRupiah(totalForecastMasuk)}</td>
                      <td className="py-2.5 px-3 print:py-2 print:px-2.5 text-right font-mono-num font-bold text-emerald-700">{formatRupiah(totalPemasukan)}</td>
                      <td className={`py-2.5 px-3 print:py-2 print:px-2.5 text-right font-mono-num font-bold ${totalPemasukan >= totalForecastMasuk ? 'text-emerald-700' : 'text-amber-700'}`}>
                        {totalPemasukan >= totalForecastMasuk ? '+' : ''}{formatRupiah(totalPemasukan - totalForecastMasuk)}
                      </td>
                      <td className="py-2.5 px-3 print:py-2 print:px-2.5 text-center font-bold text-slate-700">{persenMasuk}%</td>
                      <td className="py-2.5 px-3 print:py-2 print:px-2.5 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold print:border print:border-slate-300 ${totalPemasukan >= totalForecastMasuk ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                          {totalPemasukan >= totalForecastMasuk ? 'Tercapai (Surplus)' : 'Di Bawah Target'}
                        </span>
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 print:py-2 print:px-2.5 font-bold text-slate-800">Pengeluaran Kas (Outflow)</td>
                      <td className="py-2.5 px-3 print:py-2 print:px-2.5 text-right font-mono-num text-slate-600">{formatRupiah(totalForecastKeluar)}</td>
                      <td className="py-2.5 px-3 print:py-2 print:px-2.5 text-right font-mono-num font-bold text-rose-700">{formatRupiah(totalPengeluaran)}</td>
                      <td className={`py-2.5 px-3 print:py-2 print:px-2.5 text-right font-mono-num font-bold ${totalForecastKeluar >= totalPengeluaran ? 'text-emerald-700' : 'text-rose-700'}`}>
                        {totalForecastKeluar >= totalPengeluaran ? '+' : ''}{formatRupiah(totalForecastKeluar - totalPengeluaran)}
                      </td>
                      <td className="py-2.5 px-3 print:py-2 print:px-2.5 text-center font-bold text-slate-700">{persenKeluar}%</td>
                      <td className="py-2.5 px-3 print:py-2 print:px-2.5 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold print:border print:border-slate-300 ${totalForecastKeluar >= totalPengeluaran ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                          {totalForecastKeluar >= totalPengeluaran ? 'Hemat / Efisien' : 'Overbudget'}
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* SECTION 3: SEBARAN SALDO BANK & KAS */}
            <div className="mb-6 print:mb-4">
              <div className="flex items-center gap-2 mb-3 print:mb-2">
                <span className="w-2.5 h-2.5 rounded-full bg-corporate-700"></span>
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  III. Sebaran Likuiditas per Rekening Bank & Kas
                </h2>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left border-collapse text-xs print:text-[10px]">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 uppercase text-[10px] font-bold border-b border-slate-200">
                      <th className="py-2 px-3 print:py-1.5 print:px-2 text-center w-8">No</th>
                      <th className="py-2 px-3 print:py-1.5 print:px-2">Nama Rekening / Akun</th>
                      <th className="py-2 px-3 print:py-1.5 print:px-2 text-center">Mutasi</th>
                      <th className="py-2 px-3 print:py-1.5 print:px-2 text-right">Pemasukan</th>
                      <th className="py-2 px-3 print:py-1.5 print:px-2 text-right">Pengeluaran</th>
                      <th className="py-2 px-3 print:py-1.5 print:px-2 text-right">Net Periode</th>
                      <th className="py-2 px-3 print:py-1.5 print:px-2 text-right font-black bg-slate-200/50">Saldo Akhir Kumulatif</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {bankAnalyticsData.map((b, idx) => (
                      <tr key={b.id}>
                        <td className="py-1.5 px-3 print:py-1 print:px-2 text-center text-slate-500 font-semibold">{idx + 1}</td>
                        <td className="py-1.5 px-3 print:py-1 print:px-2 font-bold text-slate-900">{b.name}</td>
                        <td className="py-1.5 px-3 print:py-1 print:px-2 text-center text-slate-500">{b.txCount} tx</td>
                        <td className="py-1.5 px-3 print:py-1 print:px-2 text-right font-mono-num text-emerald-700">{b.pemasukan > 0 ? formatRupiah(b.pemasukan) : '-'}</td>
                        <td className="py-1.5 px-3 print:py-1 print:px-2 text-right font-mono-num text-rose-700">{b.pengeluaran > 0 ? formatRupiah(b.pengeluaran) : '-'}</td>
                        <td className={`py-1.5 px-3 print:py-1 print:px-2 text-right font-mono-num font-semibold ${b.netCashflow >= 0 ? 'text-blue-700' : 'text-amber-700'}`}>
                          {b.netCashflow >= 0 ? '+' : ''}{formatRupiah(b.netCashflow)}
                        </td>
                        <td className="py-1.5 px-3 print:py-1 print:px-2 text-right font-mono-num font-black text-slate-950 bg-slate-50">
                          {formatRupiah(b.saldoAkhir)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-900 text-white font-bold">
                      <td colSpan="3" className="py-2 px-3 print:py-1.5 print:px-2 uppercase text-[10px] tracking-wider font-black">
                        Total Keseluruhan Posisi Kas
                      </td>
                      <td className="py-2 px-3 print:py-1.5 print:px-2 text-right font-mono-num text-emerald-300">{formatRupiah(totalPemasukan)}</td>
                      <td className="py-2 px-3 print:py-1.5 print:px-2 text-right font-mono-num text-rose-300">{formatRupiah(totalPengeluaran)}</td>
                      <td className="py-2 px-3 print:py-1.5 print:px-2 text-right font-mono-num text-blue-200">
                        {netCashflow >= 0 ? '+' : ''}{formatRupiah(netCashflow)}
                      </td>
                      <td className="py-2 px-3 print:py-1.5 print:px-2 text-right font-mono-num font-black text-amber-300">
                        {formatRupiah(saldoAkhirKumulatif)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* SECTION 4: LEMBAR PENGESAHAN MANAJEMEN */}
            <div className="mt-8 pt-6 border-t-2 border-slate-200 break-inside-avoid print:mt-6 print:pt-4">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-6 text-center print:mb-4">
                LEMBAR PENGESAHAN LAPORAN KEUANGAN MANAJEMEN
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
