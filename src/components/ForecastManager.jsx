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
  ArrowRight,
  TrendingUp,
  Scale,
  Coins,
  Eye,
  ShieldAlert
} from 'lucide-react';
import { formatRupiah, formatNominalInput, parseRupiahInput } from '../utils/formatters';
import { downloadExcel, parseExcelFile, getRowValue, normalizeExcelDate } from '../utils/excelHelper';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';
import { BlockedDeleteModal } from './BlockedDeleteModal';
import { ForecastTransactionsModal } from './ForecastTransactionsModal';

export const ForecastManager = ({ 
  banks = [],
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
  const [viewingPlanTransactions, setViewingPlanTransactions] = useState(null);
  const [blockedModalState, setBlockedModalState] = useState({
    isOpen: false,
    masterName: '',
    masterType: 'rencana forecast',
    transactionCount: 0,
    items: []
  });

  // Filters & Search
  const [filterPeriode, setFilterPeriode] = useState('all');
  const [filterTipe, setFilterTipe] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Top Summary Metrics
  const summaryForecastMetrics = useMemo(() => {
    const targetMasuk = (forecasts || [])
      .filter(f => f.tipe === 'pemasukan')
      .reduce((sum, f) => sum + (Number(f.nominal) || 0), 0);
    const targetKeluar = (forecasts || [])
      .filter(f => f.tipe === 'pengeluaran')
      .reduce((sum, f) => sum + (Number(f.nominal) || 0), 0);
    const netTarget = targetMasuk - targetKeluar;
    return {
      targetMasuk,
      targetKeluar,
      netTarget
    };
  }, [forecasts]);

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
    const linkedTx = (transactions || []).filter(t => t.planId === plan.id);
    if (linkedTx.length > 0) {
      setBlockedModalState({
        isOpen: true,
        masterName: plan.deskripsi,
        masterType: 'rencana forecast',
        transactionCount: linkedTx.length,
        items: []
      });
      return;
    }

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
    const plansWithTx = selectedPlans
      .map(f => {
        const count = (transactions || []).filter(t => t.planId === f.id).length;
        return { ...f, count };
      })
      .filter(f => f.count > 0);

    if (plansWithTx.length > 0) {
      setBlockedModalState({
        isOpen: true,
        masterName: '',
        masterType: 'rencana forecast',
        transactionCount: plansWithTx.reduce((sum, f) => sum + f.count, 0),
        items: plansWithTx.map(f => ({
          name: f.deskripsi,
          count: f.count,
          detail: `${f.tipe} • ${formatBulan(f.periodeBulan)}`
        }))
      });
      return;
    }

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
    if (isViewer) return;
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

  const handleNominalChange = (e) => {
    setNominalDisplay(formatNominalInput(e.target.value));
  };

  const handleForecastSubmit = (e) => {
    e.preventDefault();
    if (isViewer) return;
    const cleanNominal = parseRupiahInput(nominalDisplay);
    if (!deskripsi.trim() || cleanNominal <= 0) {
      alert('Harap isi deskripsi rencana dan nominal target yang valid.');
      return;
    }

    onAddForecast({
      id: `plan-${Date.now()}`,
      tipe,
      deskripsi: deskripsi.trim(),
      nominal: cleanNominal,
      periodeBulan,
      tanggalDibuat: new Date().toISOString().split('T')[0]
    });

    setDeskripsi('');
    setNominalDisplay('');
    setIsSuccess(true);
    setTimeout(() => setIsSuccess(false), 3000);
  };

  // Open Edit Modal
  const handleOpenEdit = (plan) => {
    if (isViewer) return;
    setEditingPlan({
      ...plan,
      nominalDisplay: formatNominalInput(plan.nominal)
    });
  };

  const handleSaveEditPlan = (e) => {
    e.preventDefault();
    if (isViewer || !editingPlan) return;
    const cleanNominal = parseRupiahInput(editingPlan.nominalDisplay);
    if (!editingPlan.deskripsi.trim() || cleanNominal <= 0) {
      alert('Harap isi deskripsi rencana dan nominal target yang valid.');
      return;
    }

    onUpdateForecast(editingPlan.id, {
      tipe: editingPlan.tipe,
      deskripsi: editingPlan.deskripsi.trim(),
      nominal: cleanNominal,
      periodeBulan: editingPlan.periodeBulan
    });

    setEditingPlan(null);
  };

  // Download Excel Template for Forecasts
  const handleDownloadTemplate = () => {
    const templateData = [
      {
        'Deskripsi Rencana': 'Termin 1 Proyek Pembangunan Gedung A',
        'Tipe Rencana (Pemasukan / Pengeluaran)': 'Pemasukan',
        'Nominal Target': 150000000,
        'Periode Bulan (YYYY-MM)': '2026-10'
      },
      {
        'Deskripsi Rencana': 'Biaya Sewa Kantor & Utilitas Listrik Air',
        'Tipe Rencana (Pemasukan / Pengeluaran)': 'Pengeluaran',
        'Nominal Target': 25000000,
        'Periode Bulan (YYYY-MM)': '2026-10'
      },
      {
        'Deskripsi Rencana': 'Pengadaan Bahan Baku & Operasional Pabrik',
        'Tipe Rencana (Pemasukan / Pengeluaran)': 'Pengeluaran',
        'Nominal Target': 85000000,
        'Periode Bulan (YYYY-MM)': '2026-10'
      }
    ];

    downloadExcel(templateData, 'Template_Master_Forecast_Arus_Kas.xlsx');
  };

  // Import Forecasts from Excel
  const handleImportExcel = async (e) => {
    if (isViewer) return;
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const rows = await parseExcelFile(file);
      const gatheredList = [];

      rows.forEach((row, index) => {
        const desk = getRowValue(row, 'Deskripsi Rencana', 'Deskripsi', 'Rencana', 'Keterangan', 'Nama');
        const tipeVal = getRowValue(row, 'Tipe Rencana (Pemasukan / Pengeluaran)', 'Tipe Rencana', 'Tipe', 'Jenis', 'Kategori');
        const nominalRaw = getRowValue(row, 'Nominal Target', 'Target Nominal', 'Nominal', 'Target', 'Jumlah');
        const periodeRaw = getRowValue(row, 'Periode Bulan (YYYY-MM)', 'Periode Bulan', 'Periode', 'Bulan');

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
    <div className="space-y-6">
      
      {/* Summary Cards Forecast (Menyamakan Layout dengan Master Bank & Kas) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-card p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <ArrowDownLeft className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Target Pemasukan</p>
              <p className="text-lg font-bold font-mono-num text-emerald-700">{formatRupiah(summaryForecastMetrics.targetMasuk)}</p>
            </div>
          </div>
          <span className="text-xs px-2 py-0.5 rounded-md font-bold bg-emerald-100 text-emerald-700">
            {forecasts.filter(f => f.tipe === 'pemasukan').length} Rencana
          </span>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-card p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-700 flex items-center justify-center">
              <ArrowUpRight className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Pagu Pengeluaran</p>
              <p className="text-lg font-bold font-mono-num text-rose-700">{formatRupiah(summaryForecastMetrics.targetKeluar)}</p>
            </div>
          </div>
          <span className="text-xs px-2 py-0.5 rounded-md font-bold bg-rose-100 text-rose-700">
            {forecasts.filter(f => f.tipe === 'pengeluaran').length} Rencana
          </span>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-card p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-corporate-50 text-corporate-700 flex items-center justify-center">
              <Target className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Net Proyeksi Kas</p>
              <p className={`text-lg font-black font-mono-num ${summaryForecastMetrics.netTarget >= 0 ? 'text-corporate-900' : 'text-rose-700'}`}>
                {summaryForecastMetrics.netTarget >= 0 ? '+' : ''}{formatRupiah(summaryForecastMetrics.netTarget)}
              </p>
            </div>
          </div>
          <span className="text-xs px-2 py-0.5 rounded-md font-bold bg-slate-200 text-slate-800">
            {forecasts.length} Total
          </span>
        </div>
      </div>

      <div className="space-y-6">
        
        {/* Form Tambah Forecast (Diletakkan di Atas Daftar Rencana Forecast, Full-Width) */}
        {!isViewer ? (
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-card p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-corporate-100 flex items-center justify-center">
                  <Target className="w-5 h-5 text-corporate-700" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900 tracking-tight">Setup Rencana Forecast</h2>
                  <p className="text-xs text-slate-500">Perumusan target kas operasional atau pagu anggaran rencana kas</p>
                </div>
              </div>

              {/* Toggle Tipe Rencana (Pemasukan vs Pengeluaran) */}
              <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200/80 w-fit">
                <button
                  type="button"
                  onClick={() => setTipe('pemasukan')}
                  className={`py-1.5 px-3 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    tipe === 'pemasukan'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-200/70'
                  }`}
                >
                  <ArrowDownLeft className="w-3.5 h-3.5" />
                  <span>Pemasukan</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTipe('pengeluaran')}
                  className={`py-1.5 px-3 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    tipe === 'pengeluaran'
                      ? 'bg-corporate-800 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-200/70'
                  }`}
                >
                  <ArrowUpRight className="w-3.5 h-3.5" />
                  <span>Pengeluaran</span>
                </button>
              </div>
            </div>

            <form onSubmit={handleForecastSubmit} className="mt-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                    Deskripsi Rencana
                  </label>
                  <input
                    type="text"
                    value={deskripsi}
                    onChange={(e) => setDeskripsi(e.target.value)}
                    placeholder="Contoh: Termin 1 Klien A / Biaya Sewa Kantor"
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-corporate-500 font-semibold"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                    Target Nominal
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-xs font-bold text-slate-500">Rp</span>
                    <input
                      type="text"
                      value={nominalDisplay}
                      onChange={handleNominalChange}
                      placeholder="0"
                      className="w-full pl-10 pr-3 py-2 text-sm font-mono-num font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-corporate-500 text-slate-900"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                    Periode Bulan
                  </label>
                  <input
                    type="month"
                    value={periodeBulan}
                    onChange={(e) => setPeriodeBulan(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-corporate-500 font-medium"
                    required
                  />
                </div>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
                {isSuccess ? (
                  <div className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" /> Rencana forecast berhasil disimpan!
                  </div>
                ) : <div />}
                
                <button 
                  type="submit" 
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-corporate-800 hover:bg-corporate-900 flex justify-center items-center gap-2 transition-all cursor-pointer shadow-sm hover:shadow-md"
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

        {/* Daftar Forecast (Full-Width di Bawah Form) */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-card overflow-hidden">
          
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
                    <td colSpan="8" className="text-center py-12 text-slate-400 text-xs">
                      <Target className="w-8 h-8 mx-auto mb-2 text-slate-300 stroke-[1.5]" />
                      <p className="font-semibold text-slate-600">Tidak ada data rencana forecast yang sesuai.</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">Tambahkan target forecast atau ubah filter pencarian di atas.</p>
                    </td>
                  </tr>
                ) : (
                  sortedForecasts.map((plan) => {
                    // Calculate actual realization from transactions
                    const realisasi = transactions
                      .filter(t => t.planId === plan.id)
                      .reduce((sum, t) => sum + (Number(t.nominal) || 0), 0);
                    
                    const sisa = (Number(plan.nominal) || 0) - realisasi;
                    const persentase = plan.nominal > 0 ? Math.min(Math.round((realisasi / plan.nominal) * 100), 100) : 0;
                    const isSelected = selectedIds.includes(plan.id);

                    return (
                      <tr 
                        key={plan.id} 
                        className={`transition-colors duration-150 ${
                          isSelected ? 'bg-corporate-50/70 hover:bg-corporate-100/60' : 'hover:bg-slate-50/80'
                        }`}
                      >
                        <td className="py-3 px-3 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelectRow(plan.id)}
                            disabled={isViewer}
                            className="w-4 h-4 rounded border-slate-300 text-corporate-700 focus:ring-corporate-500 cursor-pointer disabled:opacity-40"
                          />
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-900">{plan.deskripsi}</div>
                          <div className="text-[11px] text-slate-400">ID: {plan.id}</div>
                        </td>
                        <td className="py-3 px-4 text-xs font-semibold text-slate-600">
                          {formatBulan(plan.periodeBulan)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                            plan.tipe === 'pemasukan' 
                              ? 'bg-emerald-100 text-emerald-800' 
                              : 'bg-corporate-100 text-corporate-800'
                          }`}>
                            {plan.tipe === 'pemasukan' ? <ArrowDownLeft className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
                            <span className="capitalize">{plan.tipe}</span>
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-mono-num font-bold text-slate-900">
                          {formatRupiah(plan.nominal)}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => setViewingPlanTransactions(plan)}
                            className="w-full text-right group/real cursor-pointer"
                            title={`Klik untuk melihat ${transactions.filter(t => t.planId === plan.id).length} transaksi terkait`}
                          >
                            <div className="font-mono-num font-bold text-emerald-700 group-hover/real:text-emerald-800 group-hover/real:underline flex items-center justify-end gap-1">
                              <span>{formatRupiah(realisasi)}</span>
                              <Eye className="w-3.5 h-3.5 opacity-0 group-hover/real:opacity-100 transition-opacity" />
                            </div>
                            <div className="w-full bg-slate-100 h-1.5 rounded-full mt-1.5 overflow-hidden">
                              <div 
                                className={`h-full rounded-full transition-all ${
                                  plan.tipe === 'pemasukan' ? 'bg-emerald-600' : 'bg-corporate-700'
                                }`}
                                style={{ width: `${persentase}%` }}
                              />
                            </div>
                            <div className="text-[10px] text-slate-400 group-hover/real:text-corporate-700 font-normal mt-0.5">
                              {transactions.filter(t => t.planId === plan.id).length} transaksi
                            </div>
                          </button>
                        </td>
                        <td className={`py-3 px-4 text-right font-mono-num font-bold text-xs ${
                          sisa < 0 ? 'text-rose-600' : 'text-slate-600'
                        }`}>
                          {formatRupiah(sisa)}
                          <div className="text-[10px] text-slate-400 font-normal">
                            {persentase}% tercapai
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {/* Tombol Lihat Transaksi Terkait */}
                            <button
                              type="button"
                              onClick={() => setViewingPlanTransactions(plan)}
                              className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-corporate-700 bg-corporate-50 hover:bg-corporate-100 rounded-lg transition-colors cursor-pointer"
                              title={`Lihat ${transactions.filter(t => t.planId === plan.id).length} transaksi terkait rencana ini`}
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span className="hidden xl:inline">Transaksi</span>
                              <span className="bg-corporate-200/80 text-corporate-900 text-[10px] font-bold px-1.5 py-0.2 rounded-full">
                                {transactions.filter(t => t.planId === plan.id).length}
                              </span>
                            </button>

                            {!isViewer ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleOpenEdit(plan)}
                                  className="text-corporate-700 hover:text-corporate-900 p-1.5 rounded-lg hover:bg-corporate-100 transition-colors cursor-pointer"
                                  title="Edit Rencana"
                                >
                                  <Edit3 className="w-4 h-4" />
                                </button>
                                {(() => {
                                  const txCount = (transactions || []).filter(t => t.planId === plan.id).length;
                                  return (
                                    <button
                                      type="button"
                                      onClick={() => handleTriggerSingleDelete(plan)}
                                      className={`p-1.5 rounded-lg transition-colors cursor-pointer relative ${
                                        txCount > 0 
                                          ? 'text-slate-400 hover:text-amber-600 hover:bg-amber-50' 
                                          : 'text-rose-600 hover:text-rose-800 hover:bg-rose-50'
                                      }`}
                                      title={txCount > 0 ? `Terkunci: Memiliki ${txCount} transaksi terkait` : 'Hapus Rencana'}
                                    >
                                      <Trash2 className="w-4 h-4" />
                                      {txCount > 0 && (
                                        <span className="absolute -top-1 -right-1 w-3 h-3 bg-amber-500 text-white rounded-full flex items-center justify-center text-[8px] font-bold shadow-2xs">
                                          <Lock className="w-2 h-2" />
                                        </span>
                                      )}
                                    </button>
                                  );
                                })()}
                              </>
                            ) : (
                              <span className="text-slate-300 p-1.5" title="Terkunci (Hanya Lihat)">
                                <Lock className="w-4 h-4" />
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal Edit Rencana Forecast */}
      {editingPlan && !isViewer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 bg-corporate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-corporate-800 flex items-center justify-center text-amber-400">
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
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-corporate-500 font-semibold"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">Periode Bulan</label>
                <input
                  type="month"
                  value={editingPlan.periodeBulan}
                  onChange={(e) => setEditingPlan(prev => ({ ...prev, periodeBulan: e.target.value }))}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-corporate-500 font-medium"
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
                    className="w-full pl-10 pr-3 py-2 text-sm font-mono-num font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-corporate-500 text-slate-900"
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
        warningText="Tindakan ini tidak dapat dibatalkan. Data rencana forecast akan dihapus permanen."
      />

      {/* Modal Lihat Transaksi Terkait Forecast */}
      <ForecastTransactionsModal
        isOpen={!!viewingPlanTransactions}
        onClose={() => setViewingPlanTransactions(null)}
        forecast={viewingPlanTransactions}
        transactions={transactions}
        banks={banks}
      />

      {/* Modal Peringatan Data Master Terkunci dari Penghapusan */}
      <BlockedDeleteModal
        isOpen={blockedModalState.isOpen}
        onClose={() => setBlockedModalState(prev => ({ ...prev, isOpen: false }))}
        title="Rencana Forecast Tidak Dapat Dihapus"
        masterType={blockedModalState.masterType}
        masterName={blockedModalState.masterName}
        transactionCount={blockedModalState.transactionCount}
        items={blockedModalState.items}
      />
    </div>
  );
};
