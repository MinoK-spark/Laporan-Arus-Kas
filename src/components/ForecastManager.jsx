import React, { useState, useRef, useMemo } from 'react';
import { 
  Search, 
  Filter, 
  X, 
  Target, 
  PlusCircle, 
  ArrowDownLeft, 
  ArrowUpRight, 
  CheckCircle2, 
  Trash2, 
  Upload, 
  Calendar, 
  Download, 
  Edit3, 
  Lock, 
  FileSpreadsheet,
  ArrowRight
} from 'lucide-react';
import { formatRupiah, formatNominalInput, parseRupiahInput } from '../utils/formatters';
import { downloadExcel, parseExcelFile, getRowValue, normalizeExcelDate } from '../utils/excelHelper';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';

export const ForecastManager = ({ 
  forecasts = [], 
  transactions = [], 
  onAddForecast, 
  onAddForecasts, 
  onDeleteForecast, 
  onDeleteForecastsBatch, 
  onUpdateForecast, 
  currentUser 
}) => {
  const isViewer = currentUser?.role === 'viewer';
  const [tipe, setTipe] = useState('pemasukan');
  const [deskripsi, setDeskripsi] = useState('');
  const [nominalDisplay, setNominalDisplay] = useState('');
  const [periodeBulan, setPeriodeBulan] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [isSuccess, setIsSuccess] = useState(false);
  const fileInputRef = useRef(null);

  // Selection & Batch Delete States
  const [selectedIds, setSelectedIds] = useState([]);
  const [deleteModalState, setDeleteModalState] = useState({
    isOpen: false,
    isBatch: false,
    targetItem: null,
    targetIds: [],
    items: []
  });

  // Edit Modal State
  const [editingPlan, setEditingPlan] = useState(null);

  // Filters & Search
  const [filterPeriode, setFilterPeriode] = useState('all');
  const [filterTipe, setFilterTipe] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Get all unique periods sorted descending
  const availablePeriods = useMemo(() => {
    return Array.from(
      new Set((forecasts || []).map(f => f?.periodeBulan).filter(Boolean))
    ).sort().reverse();
  }, [forecasts]);

  // Format month helper
  const formatBulan = (yyyymm) => {
    if (!yyyymm) return '-';
    try {
      const [year, month] = yyyymm.split('-');
      const date = new Date(year, parseInt(month) - 1);
      return new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' }).format(date);
    } catch {
      return yyyymm;
    }
  };

  // Filtered forecast plans
  const filteredForecasts = useMemo(() => {
    return (forecasts || []).filter(f => {
      if (!f) return false;
      if (filterPeriode !== 'all' && f.periodeBulan !== filterPeriode) return false;
      if (filterTipe !== 'all' && f.tipe !== filterTipe) return false;
      const desk = String(f.deskripsi || '').toLowerCase();
      if (searchQuery.trim() && !desk.includes(searchQuery.trim().toLowerCase())) return false;
      return true;
    });
  }, [forecasts, filterPeriode, filterTipe, searchQuery]);

  // Default Sort: Pemasukan first, then Pengeluaran
  const sortedForecasts = useMemo(() => {
    return [...filteredForecasts].sort((a, b) => {
      if (a.tipe !== b.tipe) {
        return a.tipe === 'pemasukan' ? -1 : 1;
      }
      const pCompare = (b.periodeBulan || '').localeCompare(a.periodeBulan || '');
      if (pCompare !== 0) return pCompare;
      return String(a.deskripsi || '').localeCompare(String(b.deskripsi || ''));
    });
  }, [filteredForecasts]);

  // Aggregated totals for filtered items
  const totalTargetFiltered = useMemo(() => {
    return filteredForecasts.reduce((sum, f) => sum + (Number(f.nominal) || 0), 0);
  }, [filteredForecasts]);

  const totalRealisasiFiltered = useMemo(() => {
    return filteredForecasts.reduce((sum, f) => {
      const r = transactions
        .filter(t => t.planId === f.id)
        .reduce((s, t) => s + (Number(t.nominal) || 0), 0);
      return sum + r;
    }, 0);
  }, [filteredForecasts, transactions]);

  const totalSisaFiltered = totalTargetFiltered - totalRealisasiFiltered;

  // Selection handlers
  const allVisibleSelected = sortedForecasts.length > 0 && sortedForecasts.every(f => selectedIds.includes(f.id));
  const someVisibleSelected = sortedForecasts.some(f => selectedIds.includes(f.id));

  const handleToggleSelectAll = () => {
    if (allVisibleSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(sortedForecasts.map(f => f.id));
    }
  };

  const handleToggleSelectRow = (id) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleTriggerSingleDelete = (plan) => {
    setDeleteModalState({
      isOpen: true,
      isBatch: false,
      targetItem: plan,
      targetIds: [plan.id],
      items: [{
        name: plan.deskripsi || 'Rencana',
        detail: `${plan.tipe === 'pemasukan' ? 'Pemasukan' : 'Pengeluaran'} • Target: ${formatRupiah(plan.nominal)} (${formatBulan(plan.periodeBulan)})`
      }]
    });
  };

  const handleTriggerBatchDelete = () => {
    const selectedPlans = (forecasts || []).filter(f => selectedIds.includes(f.id));
    setDeleteModalState({
      isOpen: true,
      isBatch: true,
      targetItem: null,
      targetIds: selectedIds,
      items: selectedPlans.map(f => ({
        name: f.deskripsi || 'Rencana',
        detail: `${f.tipe === 'pemasukan' ? 'Pemasukan' : 'Pengeluaran'} • Target: ${formatRupiah(f.nominal)} (${formatBulan(f.periodeBulan)})`
      }))
    });
  };

  const handleConfirmDelete = () => {
    if (deleteModalState.isBatch) {
      if (onDeleteForecastsBatch) {
        onDeleteForecastsBatch(deleteModalState.targetIds);
      } else {
        deleteModalState.targetIds.forEach(id => onDeleteForecast(id));
      }
      setSelectedIds([]);
    } else if (deleteModalState.targetItem) {
      onDeleteForecast(deleteModalState.targetItem.id);
      setSelectedIds(prev => prev.filter(id => id !== deleteModalState.targetItem.id));
    }
    setDeleteModalState({ isOpen: false, isBatch: false, targetItem: null, targetIds: [], items: [] });
  };

  // Form submit: Add new Forecast
  const handleNominalChange = (e) => {
    const raw = e.target.value;
    setNominalDisplay(formatNominalInput(raw));
  };

  const handleForecastSubmit = (e) => {
    e.preventDefault();
    if (isViewer) return;
    const cleanNominal = parseRupiahInput(nominalDisplay);
    if (!deskripsi.trim()) return alert('Masukkan deskripsi rencana.');
    if (!cleanNominal || cleanNominal <= 0) return alert('Nominal harus lebih dari 0.');
    if (!periodeBulan) return alert('Pilih periode bulan.');

    const newForecast = {
      id: `plan-${Date.now()}`,
      tipe,
      deskripsi: deskripsi.trim(),
      nominal: cleanNominal,
      tanggalDibuat: new Date().toISOString().split('T')[0],
      periodeBulan
    };

    onAddForecast(newForecast);
    setDeskripsi('');
    setNominalDisplay('');
    setIsSuccess(true);
    setTimeout(() => setIsSuccess(false), 2500);
  };

  // Edit Modal Handlers
  const handleOpenEditModal = (plan) => {
    if (isViewer) return;
    setEditingPlan({
      id: plan.id,
      deskripsi: plan.deskripsi || '',
      tipe: plan.tipe || 'pengeluaran',
      nominalDisplay: formatNominalInput(plan.nominal),
      periodeBulan: plan.periodeBulan || new Date().toISOString().slice(0, 7)
    });
  };

  const handleSaveEditPlan = (e) => {
    e.preventDefault();
    if (isViewer || !editingPlan) return;
    const cleanNominal = parseRupiahInput(editingPlan.nominalDisplay);
    if (!editingPlan.deskripsi.trim()) return alert('Deskripsi tidak boleh kosong.');
    if (cleanNominal <= 0) return alert('Nominal target harus lebih dari 0.');

    onUpdateForecast(editingPlan.id, {
      deskripsi: editingPlan.deskripsi.trim(),
      tipe: editingPlan.tipe,
      nominal: cleanNominal,
      periodeBulan: editingPlan.periodeBulan
    });
    setEditingPlan(null);
  };

  // Download template
  const handleDownloadTemplate = () => {
    const templateData = [
      {
        "Deskripsi Rencana": "Tagihan Listrik & Internet",
        "Tipe": "pengeluaran",
        "Target Nominal": 5000000,
        "Periode Bulan": "2026-10"
      },
      {
        "Deskripsi Rencana": "Invoice Pelanggan Termin 1",
        "Tipe": "pemasukan",
        "Target Nominal": 25000000,
        "Periode Bulan": "2026-10"
      },
      {
        "Deskripsi Rencana": "Gaji Operasional Lapangan",
        "Tipe": "pengeluaran",
        "Target Nominal": 18000000,
        "Periode Bulan": "2026-10"
      }
    ];
    downloadExcel(templateData, 'Template_Import_Forecast.xlsx', 'Master Forecast');
  };

  // Import Excel
  const handleImportExcel = async (e) => {
    if (isViewer) return;
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const rows = await parseExcelFile(file);
      const gatheredList = [];

      rows.forEach((row, index) => {
        const desk = getRowValue(row, 'Deskripsi Rencana', 'Deskripsi', 'Rencana', 'Nama Rencana', 'Uraian', 'Keterangan');
        const tipeVal = getRowValue(row, 'Tipe', 'Jenis', 'Kategori', 'Tipe Rencana');
        const nominalRaw = getRowValue(row, 'Target Nominal', 'Nominal', 'Jumlah', 'Target', 'Nilai');
        const periodeRaw = getRowValue(row, 'Periode Bulan', 'Periode', 'Bulan', 'Tanggal');

        const cleanTipe = String(tipeVal).trim().toLowerCase().includes('masuk') ? 'pemasukan' : 'pengeluaran';
        const cleanNominal = parseRupiahInput(nominalRaw) || 0;

        let cleanPeriode = String(periodeRaw || '').trim();
        if (/^\d{4}-\d{2}$/.test(cleanPeriode)) {
          // already YYYY-MM
        } else if (cleanPeriode) {
          cleanPeriode = normalizeExcelDate(cleanPeriode).slice(0, 7);
        } else {
          cleanPeriode = new Date().toISOString().slice(0, 7);
        }

        if (desk && String(desk).trim() && cleanNominal > 0) {
          gatheredList.push({
            id: `plan-imp-${Date.now()}-${index}`,
            deskripsi: String(desk).trim(),
            tipe: cleanTipe,
            nominal: cleanNominal,
            periodeBulan: cleanPeriode,
            tanggalDibuat: new Date().toISOString().split('T')[0]
          });
        }
      });

      if (gatheredList.length > 0) {
        if (onAddForecasts) {
          onAddForecasts(gatheredList);
        } else {
          gatheredList.forEach(p => onAddForecast(p));
        }
        alert(`Berhasil mengimpor ${gatheredList.length} rencana forecast dari file Excel!`);
      } else {
        alert('Tidak ada rencana forecast valid yang ditemukan dalam file Excel. Silakan periksa kolom sesuai template.');
      }
    } catch (err) {
      alert('Gagal membaca file Excel: ' + err.message);
    } finally {
      if (e.target) e.target.value = '';
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className={`grid grid-cols-1 ${isViewer ? 'lg:grid-cols-1' : 'lg:grid-cols-3'} gap-6`}>
      
      {/* Form Tambah Forecast (Hanya untuk Admin) */}
      {!isViewer ? (
        <div className="lg:col-span-1 bg-white rounded-2xl border border-slate-200/90 shadow-card p-5 h-fit">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-corporate-100 flex items-center justify-center">
                <Target className="w-5 h-5 text-corporate-700" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 tracking-tight">Setup Forecast</h2>
                <p className="text-xs text-slate-500">Perumusan target kas</p>
              </div>
            </div>
          </div>

          <form onSubmit={handleForecastSubmit} className="mt-4 space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">Tipe Rencana</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setTipe('pemasukan')}
                  className={`flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${tipe === 'pemasukan' ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}
                >
                  <ArrowDownLeft className="w-4 h-4" /> Pemasukan
                </button>
                <button
                  type="button"
                  onClick={() => setTipe('pengeluaran')}
                  className={`flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${tipe === 'pengeluaran' ? 'bg-corporate-800 text-white border-corporate-800 shadow-xs' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}
                >
                  <ArrowUpRight className="w-4 h-4" /> Pengeluaran
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">Deskripsi Rencana</label>
              <input
                type="text"
                value={deskripsi}
                onChange={(e) => setDeskripsi(e.target.value)}
                placeholder="Contoh: Termin 1 Klien A / Biaya Sewa Kantor"
                className="w-full px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-corporate-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">Periode Bulan</label>
              <input
                type="month"
                value={periodeBulan}
                onChange={(e) => setPeriodeBulan(e.target.value)}
                className="w-full px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-corporate-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">Nominal Target</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-xs font-bold text-slate-500">Rp</span>
                <input
                  type="text"
                  value={nominalDisplay}
                  onChange={handleNominalChange}
                  placeholder="0"
                  className="w-full pl-10 pr-3 py-2.5 text-sm font-mono-num font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-corporate-500"
                  required
                />
              </div>
            </div>

            <div className="pt-2">
              {isSuccess && (
                <div className="mb-2 text-xs font-semibold text-emerald-600 flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" /> Forecast disimpan!
                </div>
              )}
              <button 
                type="submit" 
                className="w-full py-2.5 rounded-xl text-sm font-bold text-white bg-corporate-800 hover:bg-corporate-900 flex justify-center items-center gap-2 transition-all cursor-pointer shadow-sm"
              >
                <PlusCircle className="w-4 h-4" /> Simpan Rencana Forecast
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-center gap-3 text-xs text-amber-900 font-semibold">
          <Lock className="w-5 h-5 text-amber-600 shrink-0" />
          <span>Akses Terbatas (Read-Only): Penambahan, pengubahan, dan penghapusan target forecast dikunci untuk akun tamu.</span>
        </div>
      )}

      {/* Daftar Forecast */}
      <div className={`${isViewer ? 'lg:col-span-1' : 'lg:col-span-2'} bg-white rounded-2xl border border-slate-200/90 shadow-card overflow-hidden`}>
        
        {/* Header Action Bar */}
        <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900 tracking-tight">Daftar Rencana Forecast</h2>
            <p className="text-xs text-slate-500 flex items-center gap-1.5">
              <span>Menampilkan: <strong>{filteredForecasts.length}</strong> dari {forecasts.length} Rencana</span>
              {(filterPeriode !== 'all' || filterTipe !== 'all' || searchQuery) && (
                <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded font-bold">Terfilter</span>
              )}
            </p>
          </div>
          {!isViewer && (
            <div className="flex items-center gap-2">
              <button 
                type="button"
                onClick={handleDownloadTemplate}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl shadow-xs hover:bg-emerald-100 transition-all cursor-pointer"
                title="Unduh Template Excel (.xlsx)"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" /> Template Excel
              </button>
              <input 
                type="file" 
                accept=".xlsx, .xls, .csv" 
                className="hidden" 
                ref={fileInputRef} 
                onChange={handleImportExcel} 
              />
              <button 
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-corporate-700 bg-white border border-slate-200 rounded-xl shadow-xs hover:bg-slate-50 transition-all cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" /> Import Excel
              </button>
            </div>
          )}
        </div>

        {/* Baris Filter Periode Bulan & Tipe Rencana */}
        <div className="px-5 py-3.5 bg-slate-50/90 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Filter Periode Bulan */}
            <div className="flex items-center gap-1.5 bg-white border border-slate-300 rounded-xl px-3 py-1.5 shadow-2xs hover:border-corporate-400 transition-colors">
              <Calendar className="w-3.5 h-3.5 text-corporate-600 shrink-0" />
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Periode:</label>
              <select
                value={filterPeriode}
                onChange={(e) => setFilterPeriode(e.target.value)}
                className="text-xs font-bold text-slate-800 bg-transparent outline-none cursor-pointer pr-1"
              >
                <option value="all">Semua Bulan ({availablePeriods.length})</option>
                {availablePeriods.map(p => (
                  <option key={p} value={p}>
                    {formatBulan(p)}
                  </option>
                ))}
              </select>
            </div>

            {/* Filter Tipe Rencana */}
            <div className="flex items-center bg-slate-200/70 p-0.5 rounded-xl border border-slate-200 shadow-2xs">
              <button
                type="button"
                onClick={() => setFilterTipe('all')}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${filterTipe === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
              >
                Semua Tipe
              </button>
              <button
                type="button"
                onClick={() => setFilterTipe('pemasukan')}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${filterTipe === 'pemasukan' ? 'bg-emerald-700 text-white shadow-xs' : 'text-emerald-800 hover:bg-emerald-50/60'}`}
              >
                Pemasukan
              </button>
              <button
                type="button"
                onClick={() => setFilterTipe('pengeluaran')}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${filterTipe === 'pengeluaran' ? 'bg-corporate-800 text-white shadow-xs' : 'text-corporate-700 hover:bg-corporate-50/60'}`}
              >
                Pengeluaran
              </button>
            </div>

            {/* Tombol Reset Filter jika aktif */}
            {(filterPeriode !== 'all' || filterTipe !== 'all' || searchQuery) && (
              <button
                type="button"
                onClick={() => { setFilterPeriode('all'); setFilterTipe('all'); setSearchQuery(''); }}
                className="text-[11px] font-bold text-rose-600 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 border border-rose-200 px-2.5 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1 shadow-2xs"
                title="Hapus semua filter"
              >
                <X className="w-3.5 h-3.5" /> Reset Filter
              </button>
            )}
          </div>

          {/* Kolom Pencarian */}
          <div className="relative min-w-[200px] sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari deskripsi rencana..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-corporate-500 focus:border-corporate-500 outline-none text-slate-800 shadow-2xs"
            />
          </div>
        </div>

        {/* Ringkasan Subtotal Filter Aktif */}
        {(filterPeriode !== 'all' || filterTipe !== 'all' || searchQuery) && (
          <div className="px-5 py-2 bg-corporate-50/50 border-b border-corporate-100 flex flex-wrap items-center justify-between text-xs font-semibold text-corporate-900">
            <div className="flex items-center gap-4">
              <span>Subtotal Target: <strong className="font-mono-num">{formatRupiah(totalTargetFiltered)}</strong></span>
              <span>•</span>
              <span>Realisasi: <strong className="font-mono-num text-emerald-700">{formatRupiah(totalRealisasiFiltered)}</strong></span>
              <span>•</span>
              <span>Sisa Target: <strong className="font-mono-num text-corporate-800">{formatRupiah(totalSisaFiltered)}</strong></span>
            </div>
          </div>
        )}

        {/* Batch Action Bar */}
        {selectedIds.length > 0 && !isViewer && (
          <div className="bg-corporate-900 text-white px-5 py-3 flex flex-wrap items-center justify-between gap-3 shadow-inner border-y border-corporate-800 animate-in slide-in-from-top-1">
            <div className="flex items-center gap-3 text-xs">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="font-bold">{selectedIds.length} rencana forecast dipilih</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSelectedIds([])}
                className="text-xs font-semibold text-corporate-200 hover:text-white px-3 py-1.5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
              >
                Batal Pilih
              </button>
              <button
                type="button"
                onClick={handleTriggerBatchDelete}
                className="flex items-center gap-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 active:bg-rose-800 px-3.5 py-1.5 rounded-lg shadow-sm hover:shadow-rose-600/30 transition-all cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" /> Hapus Terpilih ({selectedIds.length})
              </button>
            </div>
          </div>
        )}

        {/* Table Rencana */}
        <div className="p-0 overflow-x-auto max-h-[600px] overflow-y-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-slate-100/90 text-slate-700 uppercase tracking-wider text-[11px] font-bold border-b border-slate-200">
                <th className="py-3 px-3 text-center w-10">
                  <input
                    type="checkbox"
                    checked={allVisibleSelected}
                    ref={el => { if (el) el.indeterminate = someVisibleSelected && !allVisibleSelected; }}
                    onChange={handleToggleSelectAll}
                    disabled={isViewer || sortedForecasts.length === 0}
                    className="w-4 h-4 rounded border-slate-300 text-corporate-700 focus:ring-corporate-500 cursor-pointer disabled:opacity-40"
                    title="Pilih Semua Rencana Kas"
                  />
                </th>
                <th className="py-3 px-4">Deskripsi Rencana</th>
                <th className="py-3 px-4">Periode</th>
                <th className="py-3 px-4 text-center">Tipe</th>
                <th className="py-3 px-4 text-right">Target Nominal</th>
                <th className="py-3 px-4 text-right text-corporate-800">Realisasi Aktual</th>
                <th className="py-3 px-4 text-right">Sisa Target</th>
                <th className="py-3 px-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {sortedForecasts.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-slate-400 text-sm">
                    <Filter className="w-6 h-6 mx-auto mb-2 text-slate-300" />
                    Tidak ada rencana forecast yang sesuai dengan filter yang dipilih.
                  </td>
                </tr>
              ) : (
                sortedForecasts.map(plan => {
                  const realisasi = transactions
                    .filter(t => t.planId === plan.id)
                    .reduce((sum, t) => sum + (Number(t.nominal) || 0), 0);
                  const sisa = (Number(plan.nominal) || 0) - realisasi;
                  const persen = plan.nominal > 0 ? Math.min(100, Math.round((realisasi / plan.nominal) * 100)) : 0;
                  const isSelected = selectedIds.includes(plan.id);

                  return (
                    <tr 
                      key={plan.id} 
                      className={`transition-colors ${isSelected ? 'bg-corporate-50/70' : 'hover:bg-slate-50/80'}`}
                    >
                      <td className="py-3 px-3 text-center w-10">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelectRow(plan.id)}
                          disabled={isViewer}
                          className="w-4 h-4 rounded border-slate-300 text-corporate-700 focus:ring-corporate-500 cursor-pointer disabled:opacity-40"
                        />
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-900">
                        <div>{plan.deskripsi}</div>
                        {realisasi > 0 && (
                          <div className="w-24 bg-slate-200 rounded-full h-1.5 mt-1.5 overflow-hidden">
                            <div className="bg-corporate-600 h-1.5 rounded-full" style={{ width: `${persen}%` }}></div>
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-500 whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" /> {formatBulan(plan.periodeBulan)}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${plan.tipe === 'pemasukan' ? 'bg-emerald-100 text-emerald-800' : 'bg-corporate-100 text-corporate-800'}`}>
                          {plan.tipe}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono-num font-semibold text-slate-700 whitespace-nowrap text-xs">
                        {formatRupiah(plan.nominal)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono-num font-bold text-corporate-800 whitespace-nowrap text-xs">
                        {formatRupiah(realisasi)}
                        <span className="block text-[10px] text-slate-400 font-normal">{persen}% tercapai</span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono-num font-bold text-xs whitespace-nowrap">
                        <span className={sisa < 0 ? 'text-rose-600' : 'text-slate-600'}>
                          {formatRupiah(sisa)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        {isViewer ? (
                          <span className="text-xs text-slate-400 font-medium">Read-Only</span>
                        ) : (
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => handleOpenEditModal(plan)}
                              className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-colors cursor-pointer"
                              title="Edit Forecast"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleTriggerSingleDelete(plan)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                              title="Hapus Forecast"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Edit Rencana Forecast */}
      {editingPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 bg-corporate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-corporate-200">
                  <Edit3 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold tracking-tight">Edit Rencana Forecast</h3>
                  <p className="text-[11px] text-corporate-200">Perbarui informasi rencana kas</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingPlan(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEditPlan} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">Tipe Rencana</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingPlan(prev => ({ ...prev, tipe: 'pemasukan' }))}
                    className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 border transition-all cursor-pointer ${
                      editingPlan.tipe === 'pemasukan'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <ArrowDownLeft className="w-4 h-4" />
                    <span>Pemasukan</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingPlan(prev => ({ ...prev, tipe: 'pengeluaran' }))}
                    className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 border transition-all cursor-pointer ${
                      editingPlan.tipe === 'pengeluaran'
                        ? 'bg-corporate-800 text-white border-corporate-800 shadow-xs'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <ArrowUpRight className="w-4 h-4" />
                    <span>Pengeluaran</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">Deskripsi Rencana</label>
                <input
                  type="text"
                  value={editingPlan.deskripsi}
                  onChange={(e) => setEditingPlan(prev => ({ ...prev, deskripsi: e.target.value }))}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-corporate-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">Periode Bulan</label>
                <input
                  type="month"
                  value={editingPlan.periodeBulan}
                  onChange={(e) => setEditingPlan(prev => ({ ...prev, periodeBulan: e.target.value }))}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-corporate-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">Target Nominal</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-xs font-bold text-slate-500">Rp</span>
                  <input
                    type="text"
                    value={editingPlan.nominalDisplay}
                    onChange={(e) => setEditingPlan(prev => ({ ...prev, nominalDisplay: formatNominalInput(e.target.value) }))}
                    className="w-full pl-10 pr-3 py-2 text-sm font-mono-num font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-corporate-500"
                    required
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setEditingPlan(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-corporate-800 hover:bg-corporate-900 rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Simpan Perubahan</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Validasi Hapus Data */}
      <ConfirmDeleteModal
        isOpen={deleteModalState.isOpen}
        onClose={() => setDeleteModalState({ isOpen: false, isBatch: false, targetItem: null, targetIds: [], items: [] })}
        onConfirm={handleConfirmDelete}
        title={deleteModalState.isBatch ? 'Validasi Hapus Rencana Terpilih' : 'Validasi Hapus Rencana Kas'}
        itemType="Rencana Kas"
        items={deleteModalState.items}
        isBatch={deleteModalState.isBatch}
        warningText="Tindakan ini tidak dapat dibatalkan. Realisasi transaksi yang terhubung dengan rencana ini akan dialihkan ke status 'Diluar Rencana' (Unplanned)."
      />
    </div>
  );
};
