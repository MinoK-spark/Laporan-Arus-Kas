import React from 'react';
import { ShieldAlert, X, AlertTriangle, Lock } from 'lucide-react';
import { formatRupiah } from '../utils/formatters';

export const BlockedDeleteModal = ({
  isOpen,
  onClose,
  title = 'Data Master Tidak Dapat Dihapus',
  masterType = 'data master', // e.g., 'rekening bank / kas' atau 'rencana forecast'
  masterName = '',
  transactionCount = 0,
  items = [] // for batch mode [{ name, count, detail }]
}) => {
  if (!isOpen) return null;

  const isBatch = items && items.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden transform transition-all animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        {/* Header Visual */}
        <div className="pt-6 pb-4 px-6 text-center">
          <div className="w-14 h-14 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mx-auto mb-3.5 ring-8 ring-amber-50 shadow-inner">
            <ShieldAlert className="w-7 h-7" />
          </div>
          
          <h3 className="text-lg font-bold text-slate-900 mb-1">
            {title}
          </h3>
          
          <p className="text-xs text-slate-500 leading-relaxed">
            Data master yang telah memiliki riwayat transaksi terkunci dari penghapusan demi menjaga integritas pembukuan dan riwayat arus kas.
          </p>
        </div>

        {/* Content Box */}
        <div className="px-6 mb-4">
          {!isBatch ? (
            <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-3.5 text-xs text-slate-700 space-y-2">
              <div className="flex items-start gap-2">
                <Lock className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-slate-900 block">{masterName || 'Data Master Terpilih'}</span>
                  <span className="text-slate-600 block mt-0.5">
                    Memiliki <span className="font-bold text-amber-900 font-mono-num">{transactionCount} transaksi</span> aktif yang terhubung.
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 max-h-52 overflow-y-auto text-xs">
              <div className="font-semibold text-slate-700 mb-2 flex items-center justify-between">
                <span>Daftar {masterType} yang memiliki transaksi ({items.length}):</span>
              </div>
              <div className="space-y-1.5">
                {items.map((it, idx) => (
                  <div 
                    key={idx}
                    className="flex items-center justify-between py-1.5 px-2.5 bg-white rounded-lg border border-slate-200 shadow-2xs text-[11px]"
                  >
                    <div className="flex items-center gap-1.5 min-w-0 pr-2">
                      <Lock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <span className="font-medium text-slate-800 truncate">{it.name}</span>
                    </div>
                    <span className="font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full shrink-0">
                      {it.count} transaksi
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Policy Notice */}
        <div className="px-6 mb-5">
          <div className="bg-slate-100 border border-slate-200 rounded-xl p-3 text-xs text-slate-600 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
            <p className="text-[11px] leading-relaxed">
              <span className="font-bold text-slate-700">Aturan Sistem: </span>
              Semua data master ({masterType}) tidak boleh dihapus jika sudah pernah ada transaksinya. Jika ingin menghapus data master ini, silakan hapus atau alihkan transaksi terkait terlebih dahulu di menu Rekonsiliasi.
            </p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="bg-slate-50 px-6 py-3.5 border-t border-slate-100 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="w-full px-4 py-2.5 text-xs font-bold text-corporate-900 bg-white border border-corporate-200 hover:bg-corporate-50 active:bg-corporate-100 rounded-xl transition-all cursor-pointer shadow-2xs text-center"
          >
            Saya Mengerti
          </button>
        </div>
      </div>
    </div>
  );
};
