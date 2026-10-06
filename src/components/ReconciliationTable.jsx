import React, { useState } from 'react';
import { FileSpreadsheet, ChevronDown, ChevronRight, AlertTriangle, ArrowDownLeft, ArrowUpRight, Trash2, Search, Download, Info, Building, Calendar, Edit3 } from 'lucide-react';
import { formatRupiah, formatDateIndo } from '../utils/formatters';

export const ReconciliationTable = ({ 
  banks, 
  forecasts, 
  transactions, 
  onDeleteTransaction, 
  onDeleteForecast,
  onUpdateForecast,
  onUpdateTransaction 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'pemasukan', 'pengeluaran', 'anomali'
  const [filterBankId, setFilterBankId] = useState('all');
  const [expandedPlans, setExpandedPlans] = useState({});

  const toggleExpand = (planId) => {
    setExpandedPlans((prev) => ({ ...prev, [planId]: !prev[planId] }));
  };

  const getBankName = (bId) => {
    return banks.find(b => b.id === bId)?.name || 'Unknown Bank';
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

  const planTransactionsMap = {};
  forecasts.forEach((f) => {
    planTransactionsMap[f.id] = transactions.filter((t) => t.planId === f.id);
  });

  const unplannedTransactions = transactions.filter(
    (t) => t.planId === 'unplanned' || !forecasts.some((f) => f.id === t.planId)
  );

  const filteredForecasts = forecasts.filter((f) => {
    const matchesSearch = f.deskripsi.toLowerCase().includes(searchTerm.toLowerCase());
    if (!matchesSearch) return false;
    
    if (filterBankId !== 'all') {
       const hasTxInBank = (planTransactionsMap[f.id] || []).some(t => t.bankId === filterBankId);
       if (!hasTxInBank) return false;
    }
    
    if (activeTab === 'anomali') return false;
    if (activeTab === 'pemasukan' && f.tipe !== 'pemasukan') return false;
    if (activeTab === 'pengeluaran' && f.tipe !== 'pengeluaran') return false;
    return true;
  });

  const filteredUnplanned = unplannedTransactions.filter((t) => {
    const matchesSearch = t.deskripsi.toLowerCase().includes(searchTerm.toLowerCase());
    if (!matchesSearch) return false;
    if (filterBankId !== 'all' && t.bankId !== filterBankId) return false;
    if (activeTab === 'pemasukan' && t.tipe !== 'pemasukan') return false;
    if (activeTab === 'pengeluaran' && t.tipe !== 'pengeluaran') return false;
    return true;
  });

  const handleEditForecast = (e, plan) => {
    e.stopPropagation();
    const newDeskripsi = window.prompt('Ubah Deskripsi Forecast:', plan.deskripsi);
    if (newDeskripsi === null) return;
    const newNominalRaw = window.prompt('Ubah Target Nominal (angka saja):', plan.nominal);
    if (newNominalRaw === null) return;
    const newNominal = parseInt(newNominalRaw.replace(/[^\d]/g, ''), 10);
    
    onUpdateForecast(plan.id, { 
      deskripsi: newDeskripsi.trim() || plan.deskripsi, 
      nominal: isNaN(newNominal) ? plan.nominal : newNominal 
    });
  };

  const handleEditTransaction = (e, tx) => {
    e.stopPropagation();
    const newDeskripsi = window.prompt('Ubah Deskripsi Transaksi:', tx.deskripsi);
    if (newDeskripsi === null) return;
    const newNominalRaw = window.prompt('Ubah Nominal Aktual (angka saja):', tx.nominal);
    if (newNominalRaw === null) return;
    const newNominal = parseInt(newNominalRaw.replace(/[^\d]/g, ''), 10);
  
    onUpdateTransaction(tx.id, { 
      deskripsi: newDeskripsi.trim() || tx.deskripsi, 
      nominal: isNaN(newNominal) ? tx.nominal : newNominal 
    });
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-card overflow-hidden">
      
      <div className="p-5 border-b border-slate-200/80 bg-slate-50/50">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-corporate-900 text-corporate-100 flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 tracking-tight">Tabel Rekonsiliasi Kas</h2>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <select
              value={filterBankId}
              onChange={(e) => setFilterBankId(e.target.value)}
              className="px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl"
            >
              <option value="all">Semua Rekening Bank</option>
              {banks.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>

            <div className="flex items-center p-1 bg-slate-200/70 rounded-xl text-xs font-semibold text-slate-600">
              <button onClick={() => setActiveTab('all')} className={`px-2.5 py-1 rounded-lg ${activeTab === 'all' ? 'bg-white text-slate-900 shadow-sm' : ''}`}>Semua</button>
              <button onClick={() => setActiveTab('anomali')} className={`px-2.5 py-1 rounded-lg flex items-center gap-1 ${activeTab === 'anomali' ? 'bg-rose-600 text-white shadow-sm' : 'text-rose-700'}`}>
                <AlertTriangle className="w-3 h-3" /> Anomali Saja
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs sm:text-sm">
          <thead>
            <tr className="bg-slate-100/90 text-slate-700 uppercase tracking-wider text-[11px] font-bold border-b border-slate-200">
              <th className="py-3 px-4">Deskripsi Rencana & Periode</th>
              <th className="py-3 px-4 text-center">Tipe</th>
              <th className="py-3 px-4 text-right">Target Forecast</th>
              <th className="py-3 px-4 text-right">Realisasi Aktual</th>
              <th className="py-3 px-4 text-right">Selisih</th>
              <th className="py-3 px-4 text-center">Aksi / Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">

            {activeTab !== 'anomali' && filteredForecasts.map((plan) => {
              const subTransactions = planTransactionsMap[plan.id] || [];
              const actual = subTransactions.reduce((sum, t) => sum + t.nominal, 0);
              const isExpanded = !!expandedPlans[plan.id];
              const isPemasukan = plan.tipe === 'pemasukan';
              const diff = isPemasukan ? actual - plan.nominal : plan.nominal - actual;

              return (
                <React.Fragment key={plan.id}>
                  <tr className="hover:bg-slate-50/80 bg-white font-medium cursor-pointer" onClick={() => toggleExpand(plan.id)}>
                    <td className="py-3.5 px-4">
                      <div className="flex items-start gap-2.5">
                        <button className="p-1 mt-0.5">{isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}</button>
                        <div>
                          <div className="font-bold text-slate-900">{plan.deskripsi}</div>
                          <div className="flex items-center gap-1 text-[11px] text-slate-500 mt-1">
                            <Calendar className="w-3 h-3" /> Periode: {formatBulan(plan.periodeBulan)}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full ${isPemasukan ? 'bg-emerald-50 text-emerald-800' : 'bg-corporate-50 text-corporate-800'}`}>
                        {isPemasukan ? 'Pemasukan' : 'Pengeluaran'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono-num font-bold">{formatRupiah(plan.nominal)}</td>
                    <td className="py-3.5 px-4 text-right font-mono-num font-bold">{formatRupiah(actual)}</td>
                    <td className="py-3.5 px-4 text-right font-mono-num font-bold">
                      {isPemasukan ? 
                        (diff >= 0 ? <span className="text-emerald-700">+{formatRupiah(diff)}</span> : <span className="text-amber-600">-{formatRupiah(Math.abs(diff))}</span>) :
                        (diff >= 0 ? <span className="text-corporate-700">+{formatRupiah(diff)}</span> : <span className="text-rose-600">-{formatRupiah(Math.abs(diff))}</span>)
                      }
                    </td>
                    <td className="py-3.5 px-4 text-center flex items-center justify-center gap-2">
                      <button
                        onClick={(e) => handleEditForecast(e, plan)}
                        className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
                        title="Edit Rencana"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (window.confirm(`Hapus rencana "${plan.deskripsi}"?`)) onDeleteForecast(plan.id);
                        }}
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                        title="Hapus Rencana"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                  
                  {isExpanded && subTransactions.map((tx) => (
                    <tr key={tx.id} className="bg-slate-50/70 text-slate-700">
                      <td colSpan="3" className="py-2 pl-12 pr-4 flex items-center gap-2">
                        {tx.deskripsi} <span className="text-[10px] bg-slate-200 px-1 rounded flex items-center gap-1"><Building className="w-3 h-3"/> {getBankName(tx.bankId)}</span>
                      </td>
                      <td className="py-2 px-4 text-right font-mono-num">{formatRupiah(tx.nominal)}</td>
                      <td className="py-2 px-4 text-right"></td>
                      <td className="py-2 px-4 text-center flex items-center justify-center gap-2">
                        <button
                          onClick={(e) => handleEditTransaction(e, tx)}
                          className="p-1 text-slate-400 hover:text-blue-600 rounded-lg transition-colors"
                          title="Edit Aktual"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (window.confirm(`Hapus transaksi "${tx.deskripsi}"?`)) onDeleteTransaction(tx.id);
                          }}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded-lg transition-colors"
                          title="Hapus Aktual"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </React.Fragment>
              );
            })}

            {/* Transaksi Diluar Forecast (Anomali) */}
            {filteredUnplanned.length > 0 && (
              <>
                <tr className="bg-rose-100/80 border-t-2 border-rose-300">
                  <td colSpan="6" className="py-2.5 px-4 font-bold text-rose-950 text-xs">
                    <AlertTriangle className="w-4 h-4 inline mr-2 text-rose-600" /> TRANSAKSI TAMBAHAN (DILUAR FORECAST)
                  </td>
                </tr>
                {filteredUnplanned.map((tx) => (
                  <tr key={tx.id} className="bg-rose-50/95 hover:bg-rose-100/70 border-l-4 border-l-rose-500 text-rose-950">
                    <td className="py-3 px-4">
                      <div className="font-extrabold flex items-center gap-2">
                        {tx.deskripsi}
                      </div>
                      <div className="flex items-center gap-1 text-[11px] text-rose-700 mt-1">
                        <Building className="w-3 h-3" /> {getBankName(tx.bankId)}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-rose-200/90 text-rose-900 border border-rose-300">
                        {tx.tipe === 'pemasukan' ? 'Pemasukan' : 'Pengeluaran'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono-num font-semibold text-rose-400">—</td>
                    <td className="py-3 px-4 text-right font-mono-num font-extrabold">{formatRupiah(tx.nominal)}</td>
                    <td className="py-3 px-4 text-right font-mono-num font-bold">-{formatRupiah(tx.nominal)}</td>
                    <td className="py-3 px-4 text-center flex items-center justify-center gap-2">
                      <button
                        onClick={(e) => handleEditTransaction(e, tx)}
                        className="p-1.5 text-rose-400 hover:text-blue-700 rounded-lg hover:bg-blue-50 transition-colors"
                        title="Edit Anomali"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (window.confirm(`Hapus transaksi anomali "${tx.deskripsi}"?`)) onDeleteTransaction(tx.id);
                        }}
                        className="p-1.5 text-rose-400 hover:text-rose-700 rounded-lg hover:bg-rose-200 transition-colors"
                        title="Hapus Anomali"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </>
            )}

          </tbody>
        </table>
      </div>

    </div>
  );
};
