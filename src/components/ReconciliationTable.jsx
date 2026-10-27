import React, { useState, useMemo, useEffect } from 'react';
import {
X,
  ArrowUpDown,
 
  FileSpreadsheet, 
  ChevronDown, 
  ChevronRight, 
  AlertTriangle, 
  ArrowDownLeft, 
  ArrowUpRight, 
  Trash2, 
  Search, 
  Download, 
  Info, 
  Building, 
  Calendar, 
  Edit3, 
  Lock,
  CheckCircle2,
  Filter
} from 'lucide-react';
import { formatRupiah, parseRupiahInput, formatDateIndo } from '../utils/formatters';
import { downloadExcel } from '../utils/excelHelper';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';
import { EditTransactionModal } from './EditTransactionModal';
import { EditForecastModal } from './EditForecastModal';

export const ReconciliationTable = ({ 
  banks = [], 
  forecasts = [], 
  transactions = [], 
  onDeleteTransaction, 
  onDeleteTransactionsBatch,
  onDeleteForecast,
  onDeleteForecastsBatch,
  onUpdateForecast,
  onUpdateTransaction,
  currentUser,
  selectedMonth: propSelectedMonth,
  onMonthChange: propOnMonthChange
}) => {
  const isViewer = currentUser?.role === 'viewer';
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'pemasukan', 'pengeluaran', 'anomali'
  const [filterBankId, setFilterBankId] = useState('all');
  const [expandedPlans, setExpandedPlans] = useState({});
  const [editingTx, setEditingTx] = useState(null);
  const [editingForecast, setEditingForecast] = useState(null);

  // Default range tanggal: awal periode (tgl 1 bulan ini) sampai hari ini
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  const [filterStartDate, setFilterStartDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
  });

  const [filterEndDate, setFilterEndDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  const [sortDateOrder, setSortDateOrder] = useState('desc'); // 'desc' | 'asc'

  // Sinkronisasi jika periode bulan diubah dari Dashboard MetricCards
  useEffect(() => {
    if (propSelectedMonth !== undefined && propSelectedMonth !== selectedMonth) {
      setSelectedMonth(propSelectedMonth);
      if (!propSelectedMonth || propSelectedMonth === 'all') {
        setFilterStartDate('');
        setFilterEndDate('');
      } else {
        const [y, m] = propSelectedMonth.split('-');
        const startDate = `${y}-${m}-01`;
        const now = new Date();
        const isCurrentMonth = now.getFullYear() === Number(y) && (now.getMonth() + 1) === Number(m);
        if (isCurrentMonth) {
          setFilterStartDate(startDate);
          setFilterEndDate(`${y}-${m}-${String(now.getDate()).padStart(2, '0')}`);
        } else {
          const lastDay = new Date(Number(y), Number(m), 0).getDate();
          setFilterStartDate(startDate);
          setFilterEndDate(`${y}-${m}-${String(lastDay).padStart(2, '0')}`);
        }
      }
    }
  }, [propSelectedMonth]);

  // Selection state
  const [selectedRowIds, setSelectedRowIds] = useState([]);

  // Delete modal state
  const [deleteModalState, setDeleteModalState] = useState({
    isOpen: false,
    isBatch: false,
    type: null,
    item: null,
    targetIds: [],
    items: [],
    title: '',
    itemType: '',
    warningText: ''
  });

  const toggleExpand = (planId) => {
    setExpandedPlans((prev) => ({ ...prev, [planId]: !prev[planId] }));
  };

  const getBankName = (bId) => {
    return banks.find(b => b.id === bId)?.name || 'Kas / Bank';
  };

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

  const planTransactionsMap = useMemo(() => {
    const map = {};
    forecasts.forEach((f) => {
      map[f.id] = transactions.filter((t) => t.planId === f.id);
    });
    return map;
  }, [forecasts, transactions]);

  const unplannedTransactions = useMemo(() => {
    return transactions.filter(
      (t) => t.planId === 'unplanned' || !forecasts.some((f) => f.id === t.planId)
    );
  }, [transactions, forecasts]);

  const duplicateTxCount = useMemo(() => {
    return transactions.filter((t) => t.isDuplicate).length;
  }, [transactions]);

  const filteredForecasts = useMemo(() => {
    return forecasts.filter((f) => {
      // HANYA TERISI JIKA DATA MUTASI DIINPUT SESUAI FILTER:
      const planTxList = (planTransactionsMap[f.id] || []).filter(t => {
        if (filterBankId !== 'all' && t.bankId !== filterBankId) return false;
        if (filterStartDate && t.tanggal && t.tanggal < filterStartDate) return false;
        if (filterEndDate && t.tanggal && t.tanggal > filterEndDate) return false;
        return true;
      });
      if (planTxList.length === 0) return false;

      const matchesSearch = String(f.deskripsi || '').toLowerCase().includes(searchTerm.toLowerCase());
      if (!matchesSearch) return false;
      
      if (activeTab === 'anomali') return false;
      if (activeTab === 'duplikat') {
        const hasDuplicateTx = planTxList.some(t => t.isDuplicate);
        if (!hasDuplicateTx) return false;
      }
      if (activeTab === 'pemasukan' && f.tipe !== 'pemasukan') return false;
      if (activeTab === 'pengeluaran' && f.tipe !== 'pengeluaran') return false;
      return true;
    });
  }, [forecasts, planTransactionsMap, searchTerm, filterBankId, filterStartDate, filterEndDate, activeTab]);

  const filteredUnplanned = useMemo(() => {
    return unplannedTransactions.filter((t) => {
      const matchesSearch = String(t.deskripsi || '').toLowerCase().includes(searchTerm.toLowerCase());
      if (!matchesSearch) return false;
      if (filterBankId !== 'all' && t.bankId !== filterBankId) return false;
      if (filterStartDate && t.tanggal && t.tanggal < filterStartDate) return false;
      if (filterEndDate && t.tanggal && t.tanggal > filterEndDate) return false;
      if (activeTab === 'duplikat' && !t.isDuplicate) return false;
      if (activeTab === 'pemasukan' && t.tipe !== 'pemasukan') return false;
      if (activeTab === 'pengeluaran' && t.tipe !== 'pengeluaran') return false;
      return true;
    });
  }, [unplannedTransactions, searchTerm, filterBankId, filterStartDate, filterEndDate, activeTab]);

  // Sort: Berdasarkan Tanggal (sortDateOrder) dan Tipe Mutasi
  const sortedForecasts = useMemo(() => {
    return [...filteredForecasts].sort((a, b) => {
      const subA = (planTransactionsMap[a.id] || []).map(t => t.tanggal || '').filter(Boolean).sort();
      const subB = (planTransactionsMap[b.id] || []).map(t => t.tanggal || '').filter(Boolean).sort();
      const dateA = subA.length > 0 ? (sortDateOrder === 'asc' ? subA[0] : subA[subA.length - 1]) : (a.periodeBulan || '');
      const dateB = subB.length > 0 ? (sortDateOrder === 'asc' ? subB[0] : subB[subB.length - 1]) : (b.periodeBulan || '');
      const dateCmp = sortDateOrder === 'asc' ? dateA.localeCompare(dateB) : dateB.localeCompare(dateA);
      if (dateCmp !== 0) return dateCmp;

      if (a.tipe !== b.tipe) {
        return a.tipe === 'pemasukan' ? -1 : 1;
      }
      return 0;
    });
  }, [filteredForecasts, planTransactionsMap, sortDateOrder]);

  const sortedUnplanned = useMemo(() => {
    return [...filteredUnplanned].sort((a, b) => {
      const dateA = a.tanggal || '';
      const dateB = b.tanggal || '';
      const dateCmp = sortDateOrder === 'asc' ? dateA.localeCompare(dateB) : dateB.localeCompare(dateA);
      if (dateCmp !== 0) return dateCmp;

      if (a.tipe !== b.tipe) {
        return a.tipe === 'pemasukan' ? -1 : 1;
      }
      return 0;
    });
  }, [filteredUnplanned, sortDateOrder]);

  // Calculate all selectable IDs currently visible
  const allVisibleIds = useMemo(() => {
    const ids = [];
    if (activeTab !== 'anomali') {
      sortedForecasts.forEach(plan => {
        ids.push(plan.id);
        const subTx = planTransactionsMap[plan.id] || [];
        subTx.forEach(tx => ids.push(tx.id));
      });
    }
    sortedUnplanned.forEach(tx => ids.push(tx.id));
    return ids;
  }, [sortedForecasts, sortedUnplanned, planTransactionsMap, activeTab]);

  const allRowsSelected = allVisibleIds.length > 0 && allVisibleIds.every(id => selectedRowIds.includes(id));
  const someRowsSelected = allVisibleIds.some(id => selectedRowIds.includes(id));

  const handleToggleSelectAll = () => {
    if (allRowsSelected) {
      setSelectedRowIds([]);
    } else {
      setSelectedRowIds([...allVisibleIds]);
    }
  };

  const handleToggleSelectRow = (id, e) => {
    if (e) e.stopPropagation();
    setSelectedRowIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  // Single delete triggers
  const handleTriggerDeletePlan = (e, plan) => {
    e.stopPropagation();
    setDeleteModalState({
      isOpen: true,
      isBatch: false,
      type: 'forecast',
      item: plan,
      targetIds: [plan.id],
      items: [{
        name: plan.deskripsi || 'Rencana Kas',
        detail: `${plan.tipe === 'pemasukan' ? 'Pemasukan' : 'Pengeluaran'} • Target: ${formatRupiah(plan.nominal)} (${formatBulan(plan.periodeBulan)})`
      }],
      title: 'Validasi Hapus Rencana Kas',
      itemType: 'Rencana Kas',
      warningText: "Tindakan ini tidak dapat dibatalkan. Realisasi transaksi terkait akan dialihkan ke status 'Diluar Rencana' (Unplanned)."
    });
  };

  const handleTriggerDeleteTransaction = (e, tx, isAnomali = false) => {
    e.stopPropagation();
    setDeleteModalState({
      isOpen: true,
      isBatch: false,
      type: 'transaction',
      item: tx,
      targetIds: [tx.id],
      items: [{
        name: tx.deskripsi || 'Mutasi Kas',
        detail: `${getBankName(tx.bankId)} • ${formatRupiah(tx.nominal)} • ${formatDateIndo(tx.tanggal)}`
      }],
      title: isAnomali ? 'Validasi Hapus Transaksi Anomali' : 'Validasi Hapus Transaksi Realisasi',
      itemType: 'Transaksi',
      warningText: 'Tindakan ini akan menghapus data transaksi aktual secara permanen dari sistem dan Cloud Firestore.'
    });
  };

  // Batch delete trigger
  const handleTriggerBatchDelete = () => {
    if (selectedRowIds.length === 0) return;

    const itemsToDisplay = [];
    selectedRowIds.forEach(id => {
      const plan = forecasts.find(f => f.id === id);
      if (plan) {
        itemsToDisplay.push({
          name: plan.deskripsi || 'Rencana Kas',
          detail: `[Rencana] ${plan.tipe === 'pemasukan' ? 'Pemasukan' : 'Pengeluaran'} • Target: ${formatRupiah(plan.nominal)}`
        });
      } else {
        const tx = transactions.find(t => t.id === id);
        if (tx) {
          itemsToDisplay.push({
            name: tx.deskripsi || 'Transaksi Kas',
            detail: `[Mutasi] ${getBankName(tx.bankId)} • ${formatRupiah(tx.nominal)} • ${formatDateIndo(tx.tanggal)}`
          });
        }
      }
    });

    setDeleteModalState({
      isOpen: true,
      isBatch: true,
      type: 'batch',
      item: null,
      targetIds: selectedRowIds,
      items: itemsToDisplay,
      title: 'Validasi Hapus Data Rekonsiliasi Terpilih',
      itemType: 'Data Rekonsiliasi',
      warningText: 'Tindakan ini akan menghapus data rencana forecast dan/atau transaksi mutasi aktual yang dipilih secara permanen.'
    });
  };

  // Confirm delete handler
  const handleConfirmDelete = () => {
    if (deleteModalState.isBatch) {
      const planIdsToDelete = deleteModalState.targetIds.filter(id => forecasts.some(f => f.id === id));
      const txIdsToDelete = deleteModalState.targetIds.filter(id => transactions.some(t => t.id === id));

      if (planIdsToDelete.length > 0) {
        if (onDeleteForecastsBatch) {
          onDeleteForecastsBatch(planIdsToDelete);
        } else {
          planIdsToDelete.forEach(id => onDeleteForecast(id));
        }
      }

      if (txIdsToDelete.length > 0) {
        if (onDeleteTransactionsBatch) {
          onDeleteTransactionsBatch(txIdsToDelete);
        } else {
          txIdsToDelete.forEach(id => onDeleteTransaction(id));
        }
      }

      setSelectedRowIds([]);
    } else {
      if (deleteModalState.type === 'forecast' && deleteModalState.item) {
        onDeleteForecast(deleteModalState.item.id);
        setSelectedRowIds(prev => prev.filter(x => x !== deleteModalState.item.id));
      } else if (deleteModalState.type === 'transaction' && deleteModalState.item) {
        onDeleteTransaction(deleteModalState.item.id);
        setSelectedRowIds(prev => prev.filter(x => x !== deleteModalState.item.id));
      }
    }

    setDeleteModalState({
      isOpen: false,
      isBatch: false,
      type: null,
      item: null,
      targetIds: [],
      items: [],
      title: '',
      itemType: '',
      warningText: ''
    });
  };

  // Export Selected to Excel
  const handleExportSelected = () => {
    if (selectedRowIds.length === 0) return;
    const exportRows = [];
    let no = 1;

    // 1. Check selected plans and their sub-transactions
    sortedForecasts.forEach(plan => {
      const subTx = planTransactionsMap[plan.id] || [];
      const actual = subTx.reduce((sum, t) => sum + t.nominal, 0);
      const diff = plan.tipe === 'pemasukan' ? actual - plan.nominal : plan.nominal - actual;

      if (selectedRowIds.includes(plan.id)) {
        exportRows.push({
          "No": no++,
          "Kategori": "Rencana Forecast",
          "Deskripsi": plan.deskripsi,
          "Jenis Mutasi": plan.tipe === 'pemasukan' ? 'Pemasukan' : 'Pengeluaran',
          "Akun Bank / Kas": "-",
          "Tanggal / Periode": plan.periodeBulan ? formatBulan(plan.periodeBulan) : "-",
          "Target Nominal (Rp)": plan.nominal,
          "Realisasi Aktual (Rp)": actual,
          "Selisih (Rp)": diff
        });
      }

      // Check sub transactions
      subTx.forEach(tx => {
        if (selectedRowIds.includes(tx.id)) {
          exportRows.push({
            "No": no++,
            "Kategori": `Realisasi (${plan.deskripsi})`,
            "Deskripsi": tx.deskripsi,
            "Jenis Mutasi": plan.tipe === 'pemasukan' ? 'Pemasukan' : 'Pengeluaran',
            "Akun Bank / Kas": getBankName(tx.bankId),
            "Tanggal / Periode": tx.tanggal ? formatDateIndo(tx.tanggal) : "-",
            "Target Nominal (Rp)": "-",
            "Realisasi Aktual (Rp)": tx.nominal,
            "Selisih (Rp)": "-",
            "Status Duplikat": tx.isDuplicate ? "Duplikat" : "Normal"
          });
        }
      });
    });

    // 2. Check selected unplanned / anomaly
    sortedUnplanned.forEach(tx => {
      if (selectedRowIds.includes(tx.id)) {
        exportRows.push({
          "No": no++,
          "Kategori": "Transaksi Diluar Forecast (Anomali)",
          "Deskripsi": tx.deskripsi,
          "Jenis Mutasi": tx.tipe === 'pemasukan' ? 'Pemasukan' : 'Pengeluaran',
          "Akun Bank / Kas": getBankName(tx.bankId),
          "Tanggal / Periode": tx.tanggal ? formatDateIndo(tx.tanggal) : "-",
          "Target Nominal (Rp)": 0,
          "Realisasi Aktual (Rp)": tx.nominal,
          "Selisih (Rp)": -tx.nominal,
          "Status Duplikat": tx.isDuplicate ? "Duplikat" : "Normal"
        });
      }
    });

    if (exportRows.length === 0) {
      return alert('Tidak ada baris data yang terpilih untuk diexport.');
    }

    downloadExcel(exportRows, 'Rekonsiliasi_Kas_Terpilih.xlsx', 'Rekonsiliasi Terpilih');
  };

    const handleMonthChange = (e) => {
    const val = e.target.value;
    setSelectedMonth(val);
    if (propOnMonthChange) {
      propOnMonthChange(val);
    }
    if (!val || val === 'all') {
      setFilterStartDate('');
      setFilterEndDate('');
      return;
    }
    const [y, m] = val.split('-');
    const startDate = `${y}-${m}-01`;
    const now = new Date();
    const isCurrentMonth = now.getFullYear() === Number(y) && (now.getMonth() + 1) === Number(m);
    if (isCurrentMonth) {
      setFilterStartDate(startDate);
      setFilterEndDate(`${y}-${m}-${String(now.getDate()).padStart(2, '0')}`);
    } else {
      const lastDay = new Date(Number(y), Number(m), 0).getDate();
      setFilterStartDate(startDate);
      setFilterEndDate(`${y}-${m}-${String(lastDay).padStart(2, '0')}`);
    }
  };

  // Export seluruh data yang saat ini difilter di tabel rekonsiliasi
  const handleExportAllData = () => {
    const exportRows = [];
    let no = 1;

    // 1. Export forecast plans and sub-transactions
    sortedForecasts.forEach(plan => {
      const rawSub = (planTransactionsMap[plan.id] || []).filter(t => {
        if (filterBankId !== 'all' && t.bankId !== filterBankId) return false;
        if (filterStartDate && t.tanggal && t.tanggal < filterStartDate) return false;
        if (filterEndDate && t.tanggal && t.tanggal > filterEndDate) return false;
        return true;
      });
      const subTx = [...rawSub].sort((a, b) => {
        const dateA = a.tanggal || '';
        const dateB = b.tanggal || '';
        return sortDateOrder === 'asc' ? dateA.localeCompare(dateB) : dateB.localeCompare(dateA);
      });
      const actual = subTx.reduce((sum, t) => sum + (Number(t.nominal) || 0), 0);
      const diff = plan.nominal - actual;

      // Baris Rencana Forecast
      exportRows.push({
        "No": no++,
        "Kategori": "Rencana Forecast",
        "Deskripsi": plan.deskripsi,
        "Jenis Mutasi": plan.tipe === 'pemasukan' ? 'Pemasukan' : 'Pengeluaran',
        "Akun Bank / Kas": getBankName(plan.bankId),
        "Tanggal / Periode": plan.periodeBulan ? formatMonthIndo(plan.periodeBulan) : "-",
        "Target Nominal (Rp)": plan.nominal,
        "Realisasi Aktual (Rp)": actual,
        "Selisih (Rp)": diff,
        "Status Duplikat": "-"
      });

      // Baris Sub-transaksi
      subTx.forEach(tx => {
        exportRows.push({
          "No": "",
          "Kategori": `  └ Realisasi (${plan.deskripsi})`,
          "Deskripsi": tx.deskripsi,
          "Jenis Mutasi": plan.tipe === 'pemasukan' ? 'Pemasukan' : 'Pengeluaran',
          "Akun Bank / Kas": getBankName(tx.bankId),
          "Tanggal / Periode": tx.tanggal ? formatDateIndo(tx.tanggal) : "-",
          "Target Nominal (Rp)": "-",
          "Realisasi Aktual (Rp)": tx.nominal,
          "Selisih (Rp)": "-",
          "Status Duplikat": tx.isDuplicate ? "Duplikat" : "Normal"
        });
      });
    });

    // 2. Export transaksi diluar forecast (anomali)
    sortedUnplanned.forEach(tx => {
      exportRows.push({
        "No": no++,
        "Kategori": "Transaksi Diluar Forecast (Anomali)",
        "Deskripsi": tx.deskripsi,
        "Jenis Mutasi": tx.tipe === 'pemasukan' ? 'Pemasukan' : 'Pengeluaran',
        "Akun Bank / Kas": getBankName(tx.bankId),
        "Tanggal / Periode": tx.tanggal ? formatDateIndo(tx.tanggal) : "-",
        "Target Nominal (Rp)": 0,
        "Realisasi Aktual (Rp)": tx.nominal,
        "Selisih (Rp)": -tx.nominal,
        "Status Duplikat": tx.isDuplicate ? "Duplikat" : "Normal"
      });
    });

    if (exportRows.length === 0) {
      return alert('Tidak ada data rekonsiliasi yang dapat diexport pada filter ini.');
    }

    const rangeStr = filterStartDate && filterEndDate ? `${filterStartDate}_sd_${filterEndDate}` : 'Semua_Periode';
    downloadExcel(exportRows, `Laporan_Rekonsiliasi_Kas_${rangeStr}.xlsx`, 'Rekonsiliasi Kas');
  };

  // Edit Handlers
  const handleEditForecast = (e, plan) => {
    e.stopPropagation();
    if (isViewer) return;
    setEditingForecast(plan);
  };

  const handleEditTransaction = (e, tx) => {
    e.stopPropagation();
    if (isViewer) return;
    setEditingTx(tx);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-card overflow-hidden">
      
      {/* Header Bar */}
      <div className="p-5 border-b border-slate-200/80 bg-slate-50/50">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-corporate-900 text-corporate-100 flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 tracking-tight">Tabel Rekonsiliasi Kas</h2>
              <p className="text-[11px] text-slate-500 font-medium">Hanya terisi dari rencana dan mutasi kas aktual yang telah diinput</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Pilihan Periode Bulan */}
            <div className="flex items-center gap-1.5 bg-white border border-slate-200 px-2.5 py-1.5 rounded-xl text-xs shadow-xs">
              <Calendar className="w-3.5 h-3.5 text-corporate-600 shrink-0" />
              <span className="text-[10px] font-bold uppercase text-slate-500">Bulan:</span>
              <input
                type="month"
                value={selectedMonth}
                onChange={handleMonthChange}
                className="bg-transparent text-slate-800 font-bold outline-none cursor-pointer text-xs"
                title="Pilih Bulan Periode"
              />
            </div>

            {/* Filter Rentang Tanggal (Default: Awal Periode s/d Hari ini) */}
            <div className="flex items-center gap-1.5 bg-white border border-slate-200 px-2.5 py-1 rounded-xl text-xs shadow-xs">
              <input
                type="date"
                value={filterStartDate}
                onChange={(e) => { setFilterStartDate(e.target.value); setSelectedMonth(''); }}
                className="bg-transparent text-slate-700 outline-none cursor-pointer text-xs font-semibold"
                title="Tanggal Mulai"
              />
              <span className="text-slate-400 font-bold">-</span>
              <input
                type="date"
                value={filterEndDate}
                onChange={(e) => { setFilterEndDate(e.target.value); setSelectedMonth(''); }}
                className="bg-transparent text-slate-700 outline-none cursor-pointer text-xs font-semibold"
                title="Tanggal Sampai"
              />
              {(filterStartDate || filterEndDate) && (
                <button
                  type="button"
                  onClick={() => { setFilterStartDate(''); setFilterEndDate(''); setSelectedMonth('all'); propOnMonthChange?.('all'); }}
                  className="text-slate-400 hover:text-rose-600 p-0.5 rounded cursor-pointer transition-colors"
                  title="Hapus Filter Tanggal"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Sort Tanggal Button */}
            <button
              type="button"
              onClick={() => setSortDateOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer text-slate-700 shadow-xs"
              title={`Urutan Tanggal: ${sortDateOrder === 'desc' ? 'Terbaru ke Terlama' : 'Terlama ke Terbaru'}`}
            >
              <ArrowUpDown className="w-3.5 h-3.5 text-corporate-600" />
              <span>Tanggal: <strong>{sortDateOrder === 'desc' ? 'Terbaru' : 'Terlama'}</strong></span>
            </button>

            {/* Tombol Export Data Excel */}
            <button
              type="button"
              onClick={handleExportAllData}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded-xl shadow-xs transition-all cursor-pointer"
              title="Export seluruh data rekonsiliasi ke Excel"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Excel</span>
            </button>

            {/* Filter Bank/Kas */}
            <select
              value={filterBankId}
              onChange={(e) => setFilterBankId(e.target.value)}
              className="px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl cursor-pointer"
            >
              <option value="all">Semua Rekening & Kas</option>
              {banks.map(b => (
                <option key={b.id} value={b.id}>
                  {b.tipeAkun === 'kas' ? '💵 [Kas]' : '🏦 [Bank]'} {b.name}
                </option>
              ))}
            </select>

            {/* Filter Tab: Semua, Anomali */}
            <div className="flex items-center p-1 bg-slate-200/70 rounded-xl text-xs font-semibold text-slate-600">
              <button 
                onClick={() => setActiveTab('all')} 
                className={`px-2.5 py-1 rounded-lg cursor-pointer transition-all ${activeTab === 'all' ? 'bg-white text-slate-900 shadow-sm' : ''}`}
              >
                Semua
              </button>
              <button 
                onClick={() => setActiveTab('anomali')} 
                className={`px-2.5 py-1 rounded-lg flex items-center gap-1 cursor-pointer transition-all ${activeTab === 'anomali' ? 'bg-rose-600 text-white shadow-sm' : 'text-rose-700'}`}
              >
                <AlertTriangle className="w-3 h-3" /> Anomali Saja
              </button>
              {duplicateTxCount > 0 && (
                <button 
                  onClick={() => setActiveTab('duplikat')} 
                  className={`px-2.5 py-1 rounded-lg flex items-center gap-1 cursor-pointer transition-all ${activeTab === 'duplikat' ? 'bg-amber-500 text-white shadow-sm font-bold' : 'text-amber-700 hover:bg-amber-100/60'}`}
                  title="Tampilkan transaksi yang terdeteksi duplikat"
                >
                  <AlertTriangle className="w-3 h-3 text-amber-500" /> Duplikat ({duplicateTxCount})
                </button>
              )}
            </div>

            {/* Input Search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Cari transaksi..."
                className="pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-corporate-500 outline-none w-40 sm:w-48"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Batch Action Bar saat ada baris yang dipilih */}
      {selectedRowIds.length > 0 && !isViewer && (
        <div className="bg-corporate-900 text-white px-5 py-3 flex flex-wrap items-center justify-between gap-3 shadow-inner border-y border-corporate-800 animate-in slide-in-from-top-1">
          <div className="flex items-center gap-3 text-xs">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="font-bold">{selectedRowIds.length} data rekonsiliasi dipilih</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSelectedRowIds([])}
              className="text-xs font-semibold text-corporate-200 hover:text-white px-3 py-1.5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
            >
              Batal Pilih
            </button>

            {/* Export Excel Terpilih */}
            <button
              type="button"
              onClick={handleExportSelected}
              className="flex items-center gap-1.5 text-xs font-bold text-emerald-950 bg-emerald-400 hover:bg-emerald-300 px-3.5 py-1.5 rounded-lg shadow-sm transition-all cursor-pointer"
              title="Export data terpilih ke file Excel"
            >
              <Download className="w-3.5 h-3.5" /> Export Excel ({selectedRowIds.length})
            </button>

            {/* Hapus Terpilih dengan Validasi */}
            <button
              type="button"
              onClick={handleTriggerBatchDelete}
              className="flex items-center gap-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 active:bg-rose-800 px-3.5 py-1.5 rounded-lg shadow-sm hover:shadow-rose-600/30 transition-all cursor-pointer"
              title="Hapus data terpilih dengan validasi"
            >
              <Trash2 className="w-3.5 h-3.5" /> Hapus Terpilih ({selectedRowIds.length})
            </button>
          </div>
        </div>
      )}

      {/* Table Rekonsiliasi */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs sm:text-sm">
          <thead>
            <tr className="bg-slate-100/90 text-slate-700 uppercase tracking-wider text-[11px] font-bold border-b border-slate-200">
              <th className="py-3 px-3 text-center w-10">
                <input
                  type="checkbox"
                  checked={allRowsSelected}
                  ref={el => { if (el) el.indeterminate = someRowsSelected && !allRowsSelected; }}
                  onChange={handleToggleSelectAll}
                  disabled={isViewer || allVisibleIds.length === 0}
                  className="w-4 h-4 rounded border-slate-300 text-corporate-700 focus:ring-corporate-500 cursor-pointer disabled:opacity-40"
                  title="Pilih Semua Data Rekonsiliasi"
                />
              </th>
              <th className="py-3 px-4">Deskripsi Rencana & Periode</th>
              <th className="py-3 px-4 text-center">Tipe</th>
              <th className="py-3 px-4 text-right">Target Forecast</th>
              <th className="py-3 px-4 text-right">Realisasi Aktual</th>
              <th className="py-3 px-4 text-right">Selisih</th>
              <th className="py-3 px-4 text-center">Aksi / Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {/* Empty State jika belum ada mutasi transaksi yang diinput */}
            {((activeTab !== 'anomali' && sortedForecasts.length === 0 && sortedUnplanned.length === 0) || (activeTab === 'anomali' && sortedUnplanned.length === 0)) && (
              <tr>
                <td colSpan="7" className="py-14 px-4 text-center text-slate-400">
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-400">
                    <FileSpreadsheet className="w-6 h-6 stroke-[1.75]" />
                  </div>
                  <p className="font-bold text-slate-700 text-sm">Belum Ada Data Mutasi Transaksi</p>
                  <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto leading-relaxed">
                    Tabel rekonsiliasi hanya akan terisi secara otomatis jika data mutasi kas telah diinput (melalui formulir transaksi aktual atau import mutasi).
                  </p>
                </td>
              </tr>
            )}

            {/* Render Rencana Forecast yang Memiliki Mutasi */}
            {activeTab !== 'anomali' && sortedForecasts.map((plan) => {
              const rawSub = (planTransactionsMap[plan.id] || []).filter(t => {
                if (filterBankId !== 'all' && t.bankId !== filterBankId) return false;
                if (filterStartDate && t.tanggal && t.tanggal < filterStartDate) return false;
                if (filterEndDate && t.tanggal && t.tanggal > filterEndDate) return false;
                return true;
              });
              const subTransactions = [...rawSub].sort((a, b) => {
                const dateA = a.tanggal || '';
                const dateB = b.tanggal || '';
                return sortDateOrder === 'asc' ? dateA.localeCompare(dateB) : dateB.localeCompare(dateA);
              });
              const actual = subTransactions.reduce((sum, t) => sum + t.nominal, 0);
              const isExpanded = !!expandedPlans[plan.id];
              const isPemasukan = plan.tipe === 'pemasukan';
              const diff = isPemasukan ? actual - plan.nominal : plan.nominal - actual;
              const isPlanSelected = selectedRowIds.includes(plan.id);

              return (
                <React.Fragment key={plan.id}>
                  <tr 
                    className={`hover:bg-slate-50/80 font-medium cursor-pointer transition-colors ${isPlanSelected ? 'bg-corporate-50/70' : 'bg-white'}`} 
                    onClick={() => toggleExpand(plan.id)}
                  >
                    {/* Checkbox Plan */}
                    <td className="py-3.5 px-3 text-center w-10" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={isPlanSelected}
                        onChange={(e) => handleToggleSelectRow(plan.id, e)}
                        disabled={isViewer}
                        className="w-4 h-4 rounded border-slate-300 text-corporate-700 focus:ring-corporate-500 cursor-pointer disabled:opacity-40"
                      />
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex items-start gap-2.5">
                        <button className="p-1 mt-0.5 cursor-pointer">
                          {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        </button>
                        <div>
                          <div className="font-bold text-slate-900">{plan.deskripsi}</div>
                          <div className="flex items-center gap-1 text-[11px] text-slate-500 mt-1">
                            <Calendar className="w-3 h-3" /> Periode: {formatBulan(plan.periodeBulan)}
                            <span className="text-slate-400">•</span>
                            <span className="text-[10px] text-slate-400">{subTransactions.length} mutasi</span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full ${isPemasukan ? 'bg-emerald-50 text-emerald-800' : 'bg-corporate-50 text-corporate-800'}`}>
                        {isPemasukan ? 'Pemasukan' : 'Pengeluaran'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono-num font-bold text-slate-700">{formatRupiah(plan.nominal)}</td>
                    <td className="py-3.5 px-4 text-right font-mono-num font-bold text-slate-900">{formatRupiah(actual)}</td>
                    <td className="py-3.5 px-4 text-right font-mono-num font-bold">
                      {isPemasukan ? 
                        (diff >= 0 ? <span className="text-emerald-700">+{formatRupiah(diff)}</span> : <span className="text-amber-600">-{formatRupiah(Math.abs(diff))}</span>) :
                        (diff >= 0 ? <span className="text-corporate-700">+{formatRupiah(diff)}</span> : <span className="text-rose-600">-{formatRupiah(Math.abs(diff))}</span>)
                      }
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      {isViewer ? (
                        <span className="inline-flex items-center gap-1 text-[11px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full font-medium">
                          <Lock className="w-3 h-3" /> Read-Only
                        </span>
                      ) : (
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={(e) => handleEditForecast(e, plan)}
                            className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-colors cursor-pointer"
                            title="Edit Rencana"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => handleTriggerDeletePlan(e, plan)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Hapus Rencana"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                  
                  {/* Sub-transactions di bawah Rencana */}
                  {isExpanded && subTransactions.map((tx) => {
                    const isTxSelected = selectedRowIds.includes(tx.id);
                    return (
                      <tr 
                        key={tx.id} 
                        className={`transition-colors ${isTxSelected ? 'bg-corporate-100/50' : 'bg-slate-50/80 text-slate-700'}`}
                      >
                        {/* Checkbox Sub-tx */}
                        <td className="py-2.5 px-3 text-center w-10">
                          <input
                            type="checkbox"
                            checked={isTxSelected}
                            onChange={(e) => handleToggleSelectRow(tx.id, e)}
                            disabled={isViewer}
                            className="w-4 h-4 rounded border-slate-300 text-corporate-700 focus:ring-corporate-500 cursor-pointer disabled:opacity-40"
                          />
                        </td>

                        <td colSpan="3" className="py-2.5 pl-10 pr-4">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-slate-900 font-semibold">{tx.deskripsi}</span>
                            {tx.isDuplicate && (
                              <span 
                                className="inline-flex items-center gap-1 text-[10px] bg-amber-100 text-amber-800 border border-amber-300 font-bold px-1.5 py-0.5 rounded shadow-2xs"
                                title={tx.duplicateReason || 'Terdeteksi kesamaan tanggal, rekening, deskripsi, dan nominal dengan data yang ada'}
                              >
                                <AlertTriangle className="w-3 h-3 text-amber-600" /> Duplikat
                              </span>
                            )}
                            <span className="text-[10px] bg-slate-200/80 text-slate-700 px-1.5 py-0.5 rounded flex items-center gap-1 font-semibold">
                              <Building className="w-3 h-3 text-slate-500" /> {getBankName(tx.bankId)}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              ({formatDateIndo(tx.tanggal)})
                            </span>
                          </div>
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono-num font-bold text-slate-900">
                          {formatRupiah(tx.nominal)}
                        </td>
                        <td className="py-2.5 px-4 text-right"></td>
                        <td className="py-2.5 px-4 text-center">
                          {isViewer ? (
                            <span className="text-[11px] text-slate-400 font-medium">-</span>
                          ) : (
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={(e) => handleEditTransaction(e, tx)}
                                className="p-1 text-slate-400 hover:text-blue-600 rounded-lg transition-colors cursor-pointer"
                                title="Edit Aktual"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={(e) => handleTriggerDeleteTransaction(e, tx, false)}
                                className="p-1 text-slate-400 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
                                title="Hapus Aktual"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </React.Fragment>
              );
            })}

            {/* Transaksi Diluar Forecast (Anomali) */}
            {filteredUnplanned.length > 0 && (
              <>
                <tr className="bg-rose-100/80 border-t-2 border-rose-300">
                  <td colSpan="7" className="py-2.5 px-4 font-bold text-rose-950 text-xs">
                    <AlertTriangle className="w-4 h-4 inline mr-2 text-rose-600" /> TRANSAKSI TAMBAHAN (DILUAR FORECAST)
                  </td>
                </tr>
                {sortedUnplanned.map((tx) => {
                  const isUnplannedSelected = selectedRowIds.includes(tx.id);
                  return (
                    <tr 
                      key={tx.id} 
                      className={`border-l-4 border-l-rose-500 text-rose-950 transition-colors ${isUnplannedSelected ? 'bg-rose-200/80' : 'bg-rose-50/95 hover:bg-rose-100/70'}`}
                    >
                      {/* Checkbox Unplanned */}
                      <td className="py-3 px-3 text-center w-10">
                        <input
                          type="checkbox"
                          checked={isUnplannedSelected}
                          onChange={(e) => handleToggleSelectRow(tx.id, e)}
                          disabled={isViewer}
                          className="w-4 h-4 rounded border-rose-300 text-rose-700 focus:ring-rose-500 cursor-pointer disabled:opacity-40"
                        />
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-extrabold flex items-center gap-2 flex-wrap">
                          <span>{tx.deskripsi}</span>
                          {tx.isDuplicate && (
                            <span 
                              className="inline-flex items-center gap-1 text-[10px] bg-amber-100 text-amber-800 border border-amber-300 font-bold px-1.5 py-0.5 rounded shadow-2xs"
                              title={tx.duplicateReason || 'Terdeteksi kesamaan tanggal, rekening, deskripsi, dan nominal dengan data yang ada'}
                            >
                              <AlertTriangle className="w-3 h-3 text-amber-600" /> Duplikat
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px] text-rose-700 mt-1">
                          <Building className="w-3 h-3" /> {getBankName(tx.bankId)}
                          <span className="text-rose-400">•</span>
                          <span>{formatDateIndo(tx.tanggal)}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-rose-200/90 text-rose-900 border border-rose-300">
                          {tx.tipe === 'pemasukan' ? 'Pemasukan' : 'Pengeluaran'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono-num font-semibold text-rose-400">—</td>
                      <td className="py-3 px-4 text-right font-mono-num font-extrabold text-rose-950">{formatRupiah(tx.nominal)}</td>
                      <td className="py-3 px-4 text-right font-mono-num font-bold">-{formatRupiah(tx.nominal)}</td>
                      <td className="py-3 px-4 text-center">
                        {isViewer ? (
                          <span className="inline-flex items-center gap-1 text-[11px] text-rose-400 bg-rose-100 px-2 py-0.5 rounded-full font-medium">
                            <Lock className="w-3 h-3" /> Read-Only
                          </span>
                        ) : (
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={(e) => handleEditTransaction(e, tx)}
                              className="p-1.5 text-rose-400 hover:text-blue-700 rounded-lg hover:bg-blue-50 transition-colors cursor-pointer"
                              title="Edit Anomali"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={(e) => handleTriggerDeleteTransaction(e, tx, true)}
                              className="p-1.5 text-rose-400 hover:text-rose-700 rounded-lg hover:bg-rose-200 transition-colors cursor-pointer"
                              title="Hapus Anomali"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </>
            )}

          </tbody>
        </table>
      </div>

      {/* Modal Validasi Hapus Data (Tunggal & Batch) */}
      {/* Popup Wizard Edit Transaksi */}
      <EditForecastModal
        isOpen={Boolean(editingForecast)}
        onClose={() => setEditingForecast(null)}
        forecast={editingForecast}
        banks={banks}
        onSave={(updatedFields) => {
          if (editingForecast && onUpdateForecast) {
            onUpdateForecast(editingForecast.id, updatedFields);
          }
        }}
        isViewer={isViewer}
      />

      <EditTransactionModal
        isOpen={Boolean(editingTx)}
        onClose={() => setEditingTx(null)}
        transaction={editingTx}
        banks={banks}
        forecasts={forecasts}
        onSave={(updatedFields) => {
          if (editingTx && onUpdateTransaction) {
            onUpdateTransaction(editingTx.id, updatedFields);
          }
        }}
        isViewer={isViewer}
      />

      <ConfirmDeleteModal
        isOpen={deleteModalState.isOpen}
        onClose={() => setDeleteModalState({
          isOpen: false,
          isBatch: false,
          type: null,
          item: null,
          targetIds: [],
          items: [],
          title: '',
          itemType: '',
          warningText: ''
        })}
        onConfirm={handleConfirmDelete}
        title={deleteModalState.title || 'Validasi Hapus Data'}
        itemType={deleteModalState.itemType || 'Data'}
        items={deleteModalState.items}
        isBatch={deleteModalState.isBatch}
        warningText={deleteModalState.warningText}
      />
    </div>
  );
};
