import React from 'react';
import { Trash2, AlertTriangle, X, CheckCircle2 } from 'lucide-react';
import { formatRupiah } from '../utils/formatters';

export const ConfirmDeleteModal = ({
  isOpen,
  onClose,
  onConfirm,
  title = 'Konfirmasi Hapus Data',
  message,
  itemType = 'Data',
  items = [],
  isBatch = false,
  warningText,
  confirmText,
  loading = false
}) => {
  if (!isOpen) return null;

  const count = items.length;
  const totalNominal = items.reduce((sum, item) => sum + (Number(item?.nominal || item?.saldoAwal) || 0), 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-2xl shadow-2xl border border-slate-100 max-w-md w-full overflow-hidden transform transition-all animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-headline"
      >
        {/* Header Visual */}
        <div className="pt-6 pb-4 px-6 text-center">
          <div className="w-14 h-14 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-3.5 ring-8 ring-rose-50 shadow-inner">
            <Trash2 className="w-7 h-7" />
          </div>
          
          <h3 className="text-lg font-bold text-slate-900 mb-1" id="modal-headline">
            {title}
          </h3>
          
          <p className="text-xs text-slate-500 leading-relaxed">
            {message || (isBatch 
              ? `Anda akan menghapus ${count} data ${itemType} terpilih.` 
              : `Apakah Anda yakin ingin menghapus data ${itemType} ini?`
            )}
          </p>
        </div>

        {/* Data Preview Box */}
        {count > 0 && (
          <div className="px-6 mb-4">
            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 max-h-48 overflow-y-auto text-xs">
              <div className="font-semibold text-slate-700 mb-2 flex items-center justify-between">
                <span>Rincian Data ({count}):</span>
                {totalNominal > 0 && (
                  <span className="font-mono-num font-bold text-rose-700">
                    Total: {formatRupiah(totalNominal)}
                  </span>
                )}
              </div>

              <div className="space-y-1.5">
                {items.slice(0, 5).map((item, idx) => {
                  const label = item?.deskripsi || item?.name || item?.nama || (typeof item === 'string' ? item : `Data #${idx + 1}`);
                  const nominal = item?.nominal !== undefined ? item.nominal : item?.saldoAwal;
                  const tipe = item?.tipe;

                  return (
                    <div 
                      key={item?.id || idx} 
                      className="flex items-center justify-between py-1 px-2 bg-white rounded-lg border border-slate-100 shadow-2xs text-[11px]"
                    >
                      <div className="flex items-center gap-1.5 min-w-0 pr-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0"></span>
                        <span className="font-medium text-slate-800 truncate" title={label}>{label}</span>
                        {tipe && (
                          <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded shrink-0 uppercase ${
                            tipe === 'pemasukan' ? 'bg-emerald-100 text-emerald-800' : 'bg-corporate-100 text-corporate-800'
                          }`}>
                            {tipe}
                          </span>
                        )}
                      </div>
                      {nominal !== undefined && (
                        <span className="font-mono-num font-semibold text-slate-600 shrink-0">
                          {formatRupiah(nominal)}
                        </span>
                      )}
                    </div>
                  );
                })}

                {count > 5 && (
                  <div className="text-[11px] text-center text-slate-400 font-medium pt-1">
                    + {count - 5} data lainnya...
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Warning Banner */}
        <div className="px-6 mb-5">
          <div className="bg-amber-50/90 border border-amber-200/80 rounded-xl p-3 text-xs text-amber-900 flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="font-bold block">Peringatan:</span>
              <p className="text-[11px] text-amber-800/90 leading-tight">
                {warningText || 'Tindakan ini tidak dapat dibatalkan. Data akan dihapus secara permanen dari Cloud Firestore.'}
              </p>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-100 flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="flex-1 px-4 py-2.5 text-xs font-bold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-100 active:bg-slate-200 transition-all cursor-pointer shadow-2xs disabled:opacity-50"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 px-4 py-2.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 active:bg-rose-800 rounded-xl transition-all cursor-pointer shadow-sm hover:shadow-rose-600/20 flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            <Trash2 className="w-3.5 h-3.5" />
            {confirmText || (isBatch ? `Ya, Hapus (${count}) Data` : 'Ya, Hapus Data')}
          </button>
        </div>
      </div>
    </div>
  );
};
