import React, { useState, useRef, useMemo } from 'react';
import { 
  Building,
  FileText, 
  Wallet, 
  ArrowLeftRight, 
  PlusCircle, 
  CheckCircle2, 
  Trash2, 
  Calendar, 
  Upload, 
  Edit3, 
  Lock, 
  FileSpreadsheet, 
  X, 
  ArrowRight,
  Landmark,
  Coins,
  ShieldAlert
} from 'lucide-react';
import { formatRupiah, formatNominalInput, parseRupiahInput, formatDateIndo } from '../utils/formatters';
import { downloadExcel, parseExcelFile, getRowValue, normalizeExcelDate } from '../utils/excelHelper';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';
import { BlockedDeleteModal } from './BlockedDeleteModal';
import { BankAccountReportModal } from './BankAccountReportModal';
import { isTransferTransaction, getTransferDirection, isOperationalIncome, isOperationalExpense, isKasAccount } from '../utils/transactionHelper';

export const BankManager = ({ 
  banks = [], 
  transactions = [], 
  onAddBank, 
  onAddBanks, 
  onDeleteBank, 
  onDeleteBanksBatch, 
  onUpdateBank, 
  onAddTransactions,
  currentUser,
  companyName = 'PT GRAHA PRIMA ENERGI'
}) => {
  const isViewer = currentUser?.role === 'viewer';

  // Form states for creating bank / kas
  const [tipeAkun, setTipeAkun] = useState('bank'); // 'bank' or 'kas'
  const [bankName, setBankName] = useState('');
  const [bankSaldoDisplay, setBankSaldoDisplay] = useState('');
  const [tanggalSaldo, setTanggalSaldo] = useState(new Date().toISOString().split('T')[0]);
  const [isBankSuccess, setIsBankSuccess] = useState(false);
  const fileInputRef = useRef(null);

  // Filter tab: 'all', 'bank', 'kas'
  const [activeTab, setActiveTab] = useState('all');
  const [filterPeriode, setFilterPeriode] = useState('all');
  const [reportModalAccount, setReportModalAccount] = useState(null);
  const [blockedModalState, setBlockedModalState] = useState({
    isOpen: false,
    masterName: '',
    masterType: 'rekening bank/kas',
    transactionCount: 0,
    items: []
  });

  // Available unique periods
  const availablePeriods = useMemo(() => {
    const set = new Set();
    banks.forEach(b => {
      if (b.tanggalSaldoAwal) set.add(b.tanggalSaldoAwal.slice(0, 7));
    });
    transactions.forEach(t => {
      if (t.tanggal) set.add(t.tanggal.slice(0, 7));
    });
    const d = new Date();
    set.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    return Array.from(set).sort().reverse();
  }, [banks, transactions]);

  const formatBulan = (yyyymm) => {
    if (!yyyymm || yyyymm === 'all') return 'Semua Periode';
    try {
      const [year, month] = yyyymm.split('-');
      const date = new Date(year, parseInt(month) - 1);
      return new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' }).format(date);
    } catch {
      return yyyymm;
    }
  };

  // Selection & Batch Delete States
  const [selectedIds, setSelectedIds] = useState([]);
  // Edit Account Modal State
  const [editingAccount, setEditingAccount] = useState(null);

  const [deleteModalState, setDeleteModalState] = useState({
    isOpen: false,
    isBatch: false,
    targetItem: null,
    targetIds: [],
    items: []
  });

  // Transfer Antar Bank / Kas States
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [transferFromId, setTransferFromId] = useState('');
  const [transferToId, setTransferToId] = useState('');
  const [transferNominalDisplay, setTransferNominalDisplay] = useState('');
  const [transferDate, setTransferDate] = useState(new Date().toISOString().split('T')[0]);
  const [transferNote, setTransferNote] = useState('');
  const [transferError, setTransferError] = useState('');
  const [isTransferSuccess, setIsTransferSuccess] = useState(false);

  // Per-account running balance calculations with monthly accumulation support
  // Memperhitungkan mutasi operasional DAN mutasi pemindahan dana antar bank untuk rekening tersebut
  const accountsWithBalances = useMemo(() => {
    return banks.map(bank => {
      const masterSaldoAwal = Number(bank.saldoAwal) || 0;

      if (!filterPeriode || filterPeriode === 'all') {
        const totalMasuk = transactions
          .filter(t => t.bankId === bank.id && (isOperationalIncome(t) || (isTransferTransaction(t) && getTransferDirection(t) === 'in')))
          .reduce((sum, t) => sum + (Number(t.nominal) || 0), 0);

        const totalKeluar = transactions
          .filter(t => t.bankId === bank.id && (isOperationalExpense(t) || (isTransferTransaction(t) && getTransferDirection(t) === 'out')))
          .reduce((sum, t) => sum + (Number(t.nominal) || 0), 0);

        const opMasuk = transactions.filter(t => t.bankId === bank.id && isOperationalIncome(t)).reduce((s, t) => s + (Number(t.nominal) || 0), 0);
        const opKeluar = transactions.filter(t => t.bankId === bank.id && isOperationalExpense(t)).reduce((s, t) => s + (Number(t.nominal) || 0), 0);
        const trfMasuk = transactions.filter(t => t.bankId === bank.id && isTransferTransaction(t) && getTransferDirection(t) === 'in').reduce((s, t) => s + (Number(t.nominal) || 0), 0);
        const trfKeluar = transactions.filter(t => t.bankId === bank.id && isTransferTransaction(t) && getTransferDirection(t) === 'out').reduce((s, t) => s + (Number(t.nominal) || 0), 0);

        const saldoAkhir = masterSaldoAwal + totalMasuk - totalKeluar;

        return {
          ...bank,
          saldoAwalPeriode: masterSaldoAwal,
          totalMasuk,
          totalKeluar,
          opMasuk,
          opKeluar,
          trfMasuk,
          trfKeluar,
          saldoAkhir
        };
      }

      // Filter periode spesifik (e.g. "2026-10")
      const startOfTargetMonth = `${filterPeriode}-01`;
      const priorIn = transactions
        .filter(t => t.bankId === bank.id && (isOperationalIncome(t) || (isTransferTransaction(t) && getTransferDirection(t) === 'in')) && t.tanggal && t.tanggal < startOfTargetMonth)
        .reduce((sum, t) => sum + (Number(t.nominal) || 0), 0);
      const priorOut = transactions
        .filter(t => t.bankId === bank.id && (isOperationalExpense(t) || (isTransferTransaction(t) && getTransferDirection(t) === 'out')) && t.tanggal && t.tanggal < startOfTargetMonth)
        .reduce((sum, t) => sum + (Number(t.nominal) || 0), 0);

      const saldoAwalPeriode = masterSaldoAwal + priorIn - priorOut;

      const totalMasuk = transactions
        .filter(t => t.bankId === bank.id && (isOperationalIncome(t) || (isTransferTransaction(t) && getTransferDirection(t) === 'in')) && t.tanggal && t.tanggal.startsWith(filterPeriode))
        .reduce((sum, t) => sum + (Number(t.nominal) || 0), 0);

      const totalKeluar = transactions
        .filter(t => t.bankId === bank.id && (isOperationalExpense(t) || (isTransferTransaction(t) && getTransferDirection(t) === 'out')) && t.tanggal && t.tanggal.startsWith(filterPeriode))
        .reduce((sum, t) => sum + (Number(t.nominal) || 0), 0);

      const opMasuk = transactions.filter(t => t.bankId === bank.id && isOperationalIncome(t) && t.tanggal && t.tanggal.startsWith(filterPeriode)).reduce((s, t) => s + (Number(t.nominal) || 0), 0);
      const opKeluar = transactions.filter(t => t.bankId === bank.id && isOperationalExpense(t) && t.tanggal && t.tanggal.startsWith(filterPeriode)).reduce((s, t) => s + (Number(t.nominal) || 0), 0);
      const trfMasuk = transactions.filter(t => t.bankId === bank.id && isTransferTransaction(t) && getTransferDirection(t) === 'in' && t.tanggal && t.tanggal.startsWith(filterPeriode)).reduce((s, t) => s + (Number(t.nominal) || 0), 0);
      const trfKeluar = transactions.filter(t => t.bankId === bank.id && isTransferTransaction(t) && getTransferDirection(t) === 'out' && t.tanggal && t.tanggal.startsWith(filterPeriode)).reduce((s, t) => s + (Number(t.nominal) || 0), 0);

      const saldoAkhir = saldoAwalPeriode + totalMasuk - totalKeluar;

      return {
        ...bank,
        saldoAwalPeriode,
        totalMasuk,
        totalKeluar,
        opMasuk,
        opKeluar,
        trfMasuk,
        trfKeluar,
        saldoAkhir
      };
    });
  }, [banks, transactions, filterPeriode]);

  // Aggregate Metrics
  const summaryMetrics = useMemo(() => {
    let totalBank = 0;
    let totalKas = 0;
    accountsWithBalances.forEach(acc => {
      if (isKasAccount(acc)) {
        totalKas += acc.saldoAkhir;
      } else {
        totalBank += acc.saldoAkhir;
      }
    });
    return {
      totalBank,
      totalKas,
      totalKeseluruhan: totalBank + totalKas
    };
  }, [accountsWithBalances]);

  // Filter accounts by tab
  const filteredAccounts = useMemo(() => {
    if (activeTab === 'bank') {
      return accountsWithBalances.filter(a => !isKasAccount(a));
    }
    if (activeTab === 'kas') {
      return accountsWithBalances.filter(a => isKasAccount(a));
    }
    return accountsWithBalances;
  }, [accountsWithBalances, activeTab]);

  // Selection helpers
  const allBanksSelected = filteredAccounts.length > 0 && filteredAccounts.every(b => selectedIds.includes(b.id));
  const someBanksSelected = filteredAccounts.some(b => selectedIds.includes(b.id));

  const handleToggleSelectAll = () => {
    if (allBanksSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredAccounts.map(b => b.id));
    }
  };

  const handleToggleSelectRow = (id) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleTriggerSingleDelete = (bank) => {
    const linkedTx = (transactions || []).filter(t => 
      t.bankId === bank.id || t.transferToBankId === bank.id || t.relatedBankId === bank.id
    );
    if (linkedTx.length > 0) {
      setBlockedModalState({
        isOpen: true,
        masterName: bank.name,
        masterType: isKasAccount(bank) ? 'akun kas' : 'rekening bank',
        transactionCount: linkedTx.length,
        items: []
      });
      return;
    }

    setDeleteModalState({
      isOpen: true,
      isBatch: false,
      targetItem: bank,
      targetIds: [bank.id],
      items: [{
        name: bank.name,
        detail: `${isKasAccount(bank) ? 'Kas' : 'Bank'} • Saldo Awal: ${formatRupiah(bank.saldoAwal)}`
      }]
    });
  };

  const handleTriggerBatchDelete = () => {
    const selectedBanks = (banks || []).filter(b => selectedIds.includes(b.id));
    const banksWithTx = selectedBanks
      .map(b => {
        const count = (transactions || []).filter(t => 
          t.bankId === b.id || t.transferToBankId === b.id || t.relatedBankId === b.id
        ).length;
        return { ...b, count };
      })
      .filter(b => b.count > 0);

    if (banksWithTx.length > 0) {
      setBlockedModalState({
        isOpen: true,
        masterName: '',
        masterType: 'rekening bank / kas',
        transactionCount: banksWithTx.reduce((sum, b) => sum + b.count, 0),
        items: banksWithTx.map(b => ({
          name: b.name,
          count: b.count,
          detail: `${isKasAccount(b) ? 'Kas' : 'Bank'}`
        }))
      });
      return;
    }

    setDeleteModalState({
      isOpen: true,
      isBatch: true,
      targetItem: null,
      targetIds: selectedIds,
      items: selectedBanks.map(b => ({
        name: b.name,
        detail: `${isKasAccount(b) ? 'Kas' : 'Bank'} • Saldo Awal: ${formatRupiah(b.saldoAwal)}`
      }))
    });
  };

  const handleConfirmDelete = () => {
    if (deleteModalState.isBatch) {
      if (onDeleteBanksBatch) {
        onDeleteBanksBatch(deleteModalState.targetIds);
      } else {
        deleteModalState.targetIds.forEach(id => onDeleteBank(id));
      }
      setSelectedIds([]);
    } else if (deleteModalState.targetItem) {
      onDeleteBank(deleteModalState.targetItem.id);
      setSelectedIds(prev => prev.filter(id => id !== deleteModalState.targetItem.id));
    }
    setDeleteModalState({ isOpen: false, isBatch: false, targetItem: null, targetIds: [], items: [] });
  };

  // Form submit: Create new Bank or Kas account
  const handleBankSaldoChange = (e) => {
    const raw = e.target.value;
    setBankSaldoDisplay(formatNominalInput(raw));
  };

  const handleBankSubmit = (e) => {
    e.preventDefault();
    if (isViewer) return;
    const cleanNominal = parseRupiahInput(bankSaldoDisplay);
    if (!bankName.trim()) {
      return alert(tipeAkun === 'kas' ? 'Masukkan nama akun kas.' : 'Masukkan nama bank.');
    }
    
    const newBank = {
      id: `${tipeAkun === 'kas' ? 'kas' : 'bank'}-${Date.now()}`,
      name: bankName.trim(),
      tipeAkun: tipeAkun, // 'bank' or 'kas'
      saldoAwal: cleanNominal || 0,
      tanggalSaldoAwal: tanggalSaldo || new Date().toISOString().split('T')[0]
    };
    
    onAddBank(newBank);
    
    setBankName('');
    setBankSaldoDisplay('');
    setIsBankSuccess(true);
    setTimeout(() => setIsBankSuccess(false), 2500);
  };

  const handleDownloadTemplate = () => {
    const templateData = [
      {
        "Nama Akun": "Bank BCA",
        "Tipe Akun": "bank",
        "Saldo Awal": 100000000,
        "Tanggal Saldo": "2026-10-01"
      },
      {
        "Nama Akun": "Bank Mandiri",
        "Tipe Akun": "bank",
        "Saldo Awal": 50000000,
        "Tanggal Saldo": "2026-10-02"
      },
      {
        "Nama Akun": "Kas Operasional Kantor",
        "Tipe Akun": "kas",
        "Saldo Awal": 10000000,
        "Tanggal Saldo": "2026-10-01"
      },
      {
        "Nama Akun": "Kas Kecil (Petty Cash)",
        "Tipe Akun": "kas",
        "Saldo Awal": 5000000,
        "Tanggal Saldo": "2026-10-01"
      }
    ];
    downloadExcel(templateData, 'Template_Import_Bank_Kas.xlsx', 'Master Bank & Kas');
  };

  const handleOpenEditModal = (bank) => {
    if (isViewer) return;
    setEditingAccount({
      id: bank.id,
      name: bank.name || '',
      tipeAkun: isKasAccount(bank) ? 'kas' : 'bank',
      saldoDisplay: formatNominalInput(bank.saldoAwal),
      tanggalSaldoAwal: bank.tanggalSaldoAwal || new Date().toISOString().split('T')[0]
    });
  };

  const handleSaveEditAccount = (e) => {
    e.preventDefault();
    if (isViewer || !editingAccount) return;
    const cleanSaldo = parseRupiahInput(editingAccount.saldoDisplay);
    if (!editingAccount.name.trim()) {
      return alert(editingAccount.tipeAkun === 'kas' ? 'Masukkan nama akun kas.' : 'Masukkan nama rekening bank.');
    }

    onUpdateBank(editingAccount.id, {
      name: editingAccount.name.trim(),
      tipeAkun: editingAccount.tipeAkun,
      saldoAwal: cleanSaldo,
      tanggalSaldoAwal: editingAccount.tanggalSaldoAwal
    });
    setEditingAccount(null);
  };

  const handleImportExcel = async (e) => {
    if (isViewer) return;
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const rows = await parseExcelFile(file);
      const newBanksToAdd = [];

      rows.forEach((row, index) => {
        // Robust flexible key lookups
        const nama = getRowValue(row, 'Nama Akun', 'Nama Bank', 'Nama', 'Bank', 'Akun');
        const tipeRaw = String(getRowValue(row, 'Tipe Akun', 'Tipe', 'Jenis', 'Kategori')).toLowerCase();
        const saldoRaw = getRowValue(row, 'Saldo Awal', 'Saldo', 'Nominal', 'Jumlah');
        const tglRaw = getRowValue(row, 'Tanggal Saldo', 'Tanggal', 'Tgl');

        const cleanSaldo = parseRupiahInput(saldoRaw) || 0;
        const cleanTgl = normalizeExcelDate(tglRaw);
        const resolvedTipe = tipeRaw.includes('kas') || String(nama).toLowerCase().includes('kas') ? 'kas' : 'bank';

        if (nama && String(nama).trim()) {
          newBanksToAdd.push({
            id: `${resolvedTipe}-imp-${Date.now()}-${index}`,
            name: String(nama).trim(),
            tipeAkun: resolvedTipe,
            saldoAwal: cleanSaldo,
            tanggalSaldoAwal: cleanTgl
          });
        }
      });

      if (newBanksToAdd.length > 0) {
        if (onAddBanks) {
          onAddBanks(newBanksToAdd);
        } else {
          newBanksToAdd.forEach(b => onAddBank(b));
        }
        alert(`Berhasil mengimpor ${newBanksToAdd.length} akun bank/kas dari file Excel!`);
      } else {
        alert('Tidak ada data bank/kas yang valid ditemukan dalam file Excel. Silakan periksa kolom sesuai template.');
      }
    } catch (err) {
      alert('Gagal membaca file Excel: ' + err.message);
    } finally {
      if (e.target) e.target.value = '';
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Open Transfer Modal with defaults
  const handleOpenTransferModal = () => {
    if (banks.length < 2) {
      return alert('Dibutuhkan minimal 2 akun (Bank atau Kas) untuk melakukan transfer antar akun.');
    }
    setTransferFromId(banks[0]?.id || '');
    setTransferToId(banks[1]?.id || '');
    setTransferNominalDisplay('');
    setTransferNote('');
    setTransferError('');
    setIsTransferModalOpen(true);
  };

  // Submit Inter-account Transfer (creates 2 balanced transactions)
  const handleTransferSubmit = (e) => {
    e.preventDefault();
    if (isViewer) return;
    setTransferError('');

    const nominal = parseRupiahInput(transferNominalDisplay);
    if (nominal <= 0) {
      setTransferError('Nominal transfer harus lebih dari 0.');
      return;
    }

    if (!transferFromId || !transferToId) {
      setTransferError('Silakan pilih akun asal dan akun tujuan transfer.');
      return;
    }

    if (transferFromId === transferToId) {
      setTransferError('Akun asal dan akun tujuan transfer tidak boleh sama.');
      return;
    }

    const fromAcc = banks.find(b => b.id === transferFromId);
    const toAcc = banks.find(b => b.id === transferToId);

    if (!fromAcc || !toAcc) {
      setTransferError('Akun pengirim atau penerima tidak ditemukan.');
      return;
    }

    const tgl = transferDate || new Date().toISOString().split('T')[0];
    const cleanNote = transferNote.trim() ? ` (${transferNote.trim()})` : '';
    const now = Date.now();

    // 1. Pengeluaran dari Akun Asal (Transfer Keluar - Dicatatkan Tersendiri)
    const txOut = {
      id: `tx-trf-out-${now}`,
      bankId: transferFromId,
      targetBankId: transferToId,
      tipe: 'transfer',
      transferDirection: 'out',
      isTransfer: true,
      planId: 'unplanned',
      deskripsi: `Transfer Keluar ke [${toAcc.name}]${cleanNote}`,
      nominal: nominal,
      tanggal: tgl
    };

    // 2. Pemasukan ke Akun Tujuan (Transfer Masuk - Dicatatkan Tersendiri)
    const txIn = {
      id: `tx-trf-in-${now + 1}`,
      bankId: transferToId,
      sourceBankId: transferFromId,
      tipe: 'transfer',
      transferDirection: 'in',
      isTransfer: true,
      planId: 'unplanned',
      deskripsi: `Transfer Masuk dari [${fromAcc.name}]${cleanNote}`,
      nominal: nominal,
      tanggal: tgl
    };

    if (onAddTransactions) {
      onAddTransactions([txOut, txIn]);
    }

    setIsTransferModalOpen(false);
    setTransferNominalDisplay('');
    setTransferNote('');
    alert(`Transfer Berhasil Dicatat!\n\n• Sumber: ${fromAcc.name} (-${formatRupiah(nominal)})\n• Tujuan: ${toAcc.name} (+${formatRupiah(nominal)})\n• Tanggal: ${formatDateIndo(tgl)}`);
  };

  const selectedFromAccount = accountsWithBalances.find(a => a.id === transferFromId);
  const selectedToAccount = accountsWithBalances.find(a => a.id === transferToId);

  return (
    <div className="space-y-6">
      
      {/* Summary Cards Kas & Bank */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-card p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
              <Building className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Saldo Rekening Bank</p>
              <p className="text-lg font-bold font-mono-num text-slate-900">{formatRupiah(summaryMetrics.totalBank)}</p>
            </div>
          </div>
          <span className="text-xs px-2 py-0.5 rounded-md font-bold bg-blue-100 text-blue-700">
            {banks.filter(b => !isKasAccount(b)).length} Bank
          </span>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-card p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Saldo Kas Tunai</p>
              <p className="text-lg font-bold font-mono-num text-emerald-700">{formatRupiah(summaryMetrics.totalKas)}</p>
            </div>
          </div>
          <span className="text-xs px-2 py-0.5 rounded-md font-bold bg-emerald-100 text-emerald-700">
            {banks.filter(b => isKasAccount(b)).length} Kas
          </span>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-card p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
              <Coins className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Kas & Bank</p>
              <p className="text-lg font-black font-mono-num text-slate-900">{formatRupiah(summaryMetrics.totalKeseluruhan)}</p>
            </div>
          </div>
          <span className="text-xs px-2 py-0.5 rounded-md font-bold bg-slate-200 text-slate-800">
            {banks.length} Akun
          </span>
        </div>
      </div>

      <div className="space-y-6">
        
        {/* Form Tambah Bank / Kas (Diletakkan di Atas Daftar Rekening Bank & Kas) */}
        {!isViewer ? (
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-card p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-corporate-100 flex items-center justify-center">
                  {tipeAkun === 'kas' ? (
                    <Wallet className="w-5 h-5 text-emerald-700" />
                  ) : (
                    <Building className="w-5 h-5 text-corporate-700" />
                  )}
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900 tracking-tight">
                    {tipeAkun === 'kas' ? 'Tambah Akun Kas' : 'Tambah Rekening Bank'}
                  </h2>
                  <p className="text-xs text-slate-500">Daftarkan akun kas operasional atau rekening bank baru</p>
                </div>
              </div>

              {/* Toggle Bank vs Kas */}
              <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200/80 w-fit">
                <button
                  type="button"
                  onClick={() => setTipeAkun('bank')}
                  className={`py-1.5 px-3 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    tipeAkun === 'bank'
                      ? 'bg-corporate-700 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-200/70'
                  }`}
                >
                  <Building className="w-3.5 h-3.5" />
                  <span>Rekening Bank</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTipeAkun('kas')}
                  className={`py-1.5 px-3 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    tipeAkun === 'kas'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-200/70'
                  }`}
                >
                  <Wallet className="w-3.5 h-3.5" />
                  <span>Kas Tunai / Kecil</span>
                </button>
              </div>
            </div>

            <form onSubmit={handleBankSubmit} className="mt-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                    {tipeAkun === 'kas' ? 'Nama Akun Kas' : 'Nama Bank'}
                  </label>
                  <input
                    type="text"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    placeholder={tipeAkun === 'kas' ? 'Contoh: Kas Kantor / Petty Cash' : 'Contoh: Bank BCA / Mandiri'}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-corporate-500 font-semibold"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                    Saldo Awal
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-xs font-bold text-slate-500">Rp</span>
                    <input
                      type="text"
                      value={bankSaldoDisplay}
                      onChange={handleBankSaldoChange}
                      placeholder="0"
                      className="w-full pl-10 pr-3 py-2 text-sm font-mono-num font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-corporate-500 text-slate-900"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                    Tanggal Saldo Awal
                  </label>
                  <input
                    type="date"
                    value={tanggalSaldo}
                    onChange={(e) => setTanggalSaldo(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-corporate-500 font-medium"
                    required
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
                <div>
                  {isBankSuccess && (
                    <div className="text-xs font-semibold text-emerald-600 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>{tipeAkun === 'kas' ? 'Akun kas' : 'Rekening bank'} berhasil didaftarkan!</span>
                    </div>
                  )}
                </div>
                <button 
                  type="submit" 
                  className="py-2.5 px-6 rounded-xl text-xs sm:text-sm font-bold text-white bg-corporate-900 hover:bg-navy-950 flex justify-center items-center gap-2 transition-all cursor-pointer shadow-sm active:scale-95 ml-auto"
                >
                  <PlusCircle className="w-4 h-4" /> 
                  <span>{tipeAkun === 'kas' ? 'Tambah Akun Kas' : 'Tambah Rekening Bank'}</span>
                </button>
              </div>
            </form>
          </div>
        ) : (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-center gap-3 text-xs text-amber-900 font-semibold">
            <Lock className="w-5 h-5 text-amber-600 shrink-0" />
            <span>Akses Terbatas (Read-Only): Penambahan, pengubahan, dan penghapusan rekening bank/kas dikunci untuk akun tamu.</span>
          </div>
        )}

        {/* List Bank & Kas (Full Width di Bawah Form Tambah) */}
        <div className="w-full bg-white rounded-2xl border border-slate-200/90 shadow-card overflow-hidden">
          
          {/* Header Action Bar */}
          <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900 tracking-tight">Daftar Rekening Bank & Kas</h2>
              <p className="text-xs text-slate-500">Monitoring saldo awal, mutasi berjalan, dan transfer antar akun</p>
            </div>
            
            <div className="flex flex-wrap items-center gap-2">
              {/* Tombol Transfer Antar Bank / Kas */}
              {!isViewer && (
                <button
                  type="button"
                  onClick={handleOpenTransferModal}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-corporate-700 hover:bg-corporate-800 rounded-xl shadow-xs transition-all cursor-pointer"
                  title="Catat Transfer Antar Akun"
                >
                  <ArrowLeftRight className="w-3.5 h-3.5" /> Transfer Antar Bank/Kas
                </button>
              )}

              {/* Template & Import Excel */}
              {!isViewer && (
                <>
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
                </>
              )}
            </div>
          </div>

          {/* Filter Bar: Tabs & Filter Periode Bulan */}
          <div className="px-5 py-2.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setActiveTab('all')}
                className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  activeTab === 'all'
                    ? 'bg-corporate-700 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-200/60'
                }`}
              >
                Semua Akun ({accountsWithBalances.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('bank')}
                className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1 ${
                  activeTab === 'bank'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-200/60'
                }`}
              >
                <Building className="w-3 h-3" />
                <span>Bank ({accountsWithBalances.filter(a => !isKasAccount(a)).length})</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('kas')}
                className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1 ${
                  activeTab === 'kas'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-200/60'
                }`}
              >
                <Wallet className="w-3 h-3" />
                <span>Kas ({accountsWithBalances.filter(a => isKasAccount(a)).length})</span>
              </button>
            </div>

            {/* Filter Periode Bulan Akumulasi */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 bg-white border border-slate-300 rounded-xl px-2.5 py-1 shadow-2xs hover:border-corporate-400 transition-colors">
                <Calendar className="w-3.5 h-3.5 text-corporate-600 shrink-0" />
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Periode Mutasi:</label>
                <select
                  value={filterPeriode}
                  onChange={(e) => setFilterPeriode(e.target.value)}
                  className="text-xs font-bold text-slate-800 bg-transparent outline-none cursor-pointer pr-1"
                >
                  <option value="all">Semua Periode (All-Time)</option>
                  {availablePeriods.map(p => (
                    <option key={p} value={p}>{formatBulan(p)}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
          
          {/* Batch Action Bar */}
          {selectedIds.length > 0 && !isViewer && (
            <div className="bg-corporate-900 text-white px-5 py-3 flex flex-wrap items-center justify-between gap-3 shadow-inner border-y border-corporate-800 animate-in slide-in-from-top-1">
              <div className="flex items-center gap-3 text-xs">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <span className="font-bold">{selectedIds.length} akun bank/kas dipilih</span>
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

          {/* Table Daftar Akun */}
          <div className="p-0 overflow-x-auto max-h-[600px] overflow-y-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-100/90 text-slate-700 uppercase tracking-wider text-[11px] font-bold border-b border-slate-200">
                  <th className="py-3 px-3 text-center w-10">
                    <input
                      type="checkbox"
                      checked={allBanksSelected}
                      ref={el => { if (el) el.indeterminate = someBanksSelected && !allBanksSelected; }}
                      onChange={handleToggleSelectAll}
                      disabled={isViewer || filteredAccounts.length === 0}
                      className="w-4 h-4 rounded border-slate-300 text-corporate-700 focus:ring-corporate-500 cursor-pointer disabled:opacity-40"
                      title="Pilih Semua"
                    />
                  </th>
                  <th className="py-3 px-4">Nama Akun</th>
                  <th className="py-3 px-3 text-center">Tipe</th>
                  <th className="py-3 px-4">Tanggal Saldo</th>
                  <th className="py-3 px-4 text-right">Saldo Awal</th>
                  <th className="py-3 px-4 text-right text-emerald-700">Mutasi Masuk (+)</th>
                  <th className="py-3 px-4 text-right text-rose-700">Mutasi Keluar (-)</th>
                  <th className="py-3 px-4 text-right text-corporate-900 bg-slate-200/50">Saldo Akhir</th>
                  <th className="py-3 px-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredAccounts.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="py-8 text-center text-slate-400 text-xs">
                      Belum ada akun {activeTab === 'kas' ? 'kas' : activeTab === 'bank' ? 'bank' : 'keuangan'} yang terdaftar.
                    </td>
                  </tr>
                ) : (
                  filteredAccounts.map(account => {
                    const isSelected = selectedIds.includes(account.id);
                    const isKas = isKasAccount(account);

                    return (
                      <tr 
                        key={account.id} 
                        className={`transition-colors ${isSelected ? 'bg-corporate-50/70' : 'hover:bg-slate-50/80'}`}
                      >
                        <td className="py-3 px-3 text-center w-10">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelectRow(account.id)}
                            disabled={isViewer}
                            className="w-4 h-4 rounded border-slate-300 text-corporate-700 focus:ring-corporate-500 cursor-pointer disabled:opacity-40"
                          />
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-900">
                          <div className="flex items-center gap-2">
                            {isKas ? (
                              <Wallet className="w-4 h-4 text-emerald-600 shrink-0" />
                            ) : (
                              <Building className="w-4 h-4 text-blue-600 shrink-0" />
                            )}
                            <span className="break-words font-bold" title={account.name}>{account.name}</span>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-center whitespace-nowrap">
                          <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            isKas 
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                              : 'bg-blue-100 text-blue-800 border border-blue-200'
                          }`}>
                            {isKas ? 'Kas' : 'Bank'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-500 text-xs whitespace-nowrap">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>{account.tanggalSaldoAwal ? formatDateIndo(account.tanggalSaldoAwal) : '-'}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right font-mono-num font-semibold text-slate-700 whitespace-nowrap text-xs">
                          {formatRupiah(account.saldoAwalPeriode !== undefined ? account.saldoAwalPeriode : account.saldoAwal)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono-num font-semibold text-emerald-700 whitespace-nowrap text-xs">
                          {account.totalMasuk > 0 ? `+${formatRupiah(account.totalMasuk)}` : 'Rp 0,00'}
                        </td>
                        <td className="py-3 px-4 text-right font-mono-num font-semibold text-rose-700 whitespace-nowrap text-xs">
                          {account.totalKeluar > 0 ? `-${formatRupiah(account.totalKeluar)}` : 'Rp 0,00'}
                        </td>
                        <td className="py-3 px-4 text-right font-mono-num font-black text-slate-900 whitespace-nowrap bg-slate-50/80 text-xs">
                          {formatRupiah(account.saldoAkhir)}
                        </td>
                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => setReportModalAccount(account)}
                              className="p-1.5 text-corporate-700 hover:text-corporate-900 rounded-lg hover:bg-corporate-100 transition-colors cursor-pointer"
                              title="Lihat Akumulasi Bulanan & Cetak Laporan Rekening (PDF/Excel)"
                            >
                              <FileText className="w-4 h-4 text-corporate-700" />
                            </button>
                            {!isViewer ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditModal(account)}
                                  className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-colors cursor-pointer"
                                  title="Edit Akun"
                                >
                                  <Edit3 className="w-4 h-4" />
                                </button>
                                {(() => {
                                  const txCount = (transactions || []).filter(t => 
                                    t.bankId === account.id || t.transferToBankId === account.id || t.relatedBankId === account.id
                                  ).length;
                                  return (
                                    <button
                                      type="button"
                                      onClick={() => handleTriggerSingleDelete(account)}
                                      className={`p-1.5 rounded-lg transition-colors cursor-pointer relative ${
                                        txCount > 0 
                                          ? 'text-slate-400 hover:text-amber-600 hover:bg-amber-50' 
                                          : 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'
                                      }`}
                                      title={txCount > 0 ? `Terkunci: Memiliki ${txCount} transaksi aktif` : 'Hapus Akun'}
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
                            ) : null}
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

      {/* MODAL TRANSFER ANTAR BANK / KAS */}
      {isTransferModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="px-6 py-4 bg-corporate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-corporate-200">
                  <ArrowLeftRight className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold tracking-tight">Transfer Antar Akun (Bank / Kas)</h3>
                  <p className="text-[11px] text-corporate-200">Membuat 2 jurnal mutasi kas otomatis (pengeluaran & pemasukan)</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsTransferModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleTransferSubmit} className="p-6 space-y-4">
              {transferError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-semibold text-rose-700">
                  {transferError}
                </div>
              )}

              {/* Akun Asal & Akun Tujuan */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Asal */}
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-rose-700">
                    Akun Asal (Pengirim)
                  </label>
                  <select
                    value={transferFromId}
                    onChange={(e) => setTransferFromId(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs font-semibold bg-white border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-corporate-500 cursor-pointer"
                    required
                  >
                    {banks.map(b => (
                      <option key={b.id} value={b.id}>
                        {isKasAccount(b) ? '💵 [Kas]' : '🏦 [Bank]'} {b.name}
                      </option>
                    ))}
                  </select>
                  {selectedFromAccount && (
                    <p className="text-[10px] text-slate-500">
                      Saldo berjalan: <span className="font-bold font-mono-num text-slate-800">{formatRupiah(selectedFromAccount.saldoAkhir)}</span>
                    </p>
                  )}
                </div>

                {/* Tujuan */}
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-emerald-700">
                    Akun Tujuan (Penerima)
                  </label>
                  <select
                    value={transferToId}
                    onChange={(e) => setTransferToId(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs font-semibold bg-white border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-corporate-500 cursor-pointer"
                    required
                  >
                    {banks.map(b => (
                      <option key={b.id} value={b.id} disabled={b.id === transferFromId}>
                        {b.tipeAkun === 'kas' ? '💵 [Kas]' : '🏦 [Bank]'} {b.name} {b.id === transferFromId ? '(Asal)' : ''}
                      </option>
                    ))}
                  </select>
                  {selectedToAccount && (
                    <p className="text-[10px] text-slate-500">
                      Saldo berjalan: <span className="font-bold font-mono-num text-slate-800">{formatRupiah(selectedToAccount.saldoAkhir)}</span>
                    </p>
                  )}
                </div>
              </div>

              {/* Nominal & Tanggal */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                    Nominal Transfer
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-xs font-bold text-slate-500">Rp</span>
                    <input
                      type="text"
                      value={transferNominalDisplay}
                      onChange={(e) => setTransferNominalDisplay(formatNominalInput(e.target.value))}
                      placeholder="0"
                      className="w-full pl-10 pr-3 py-2 text-sm font-mono-num font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-corporate-500"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                    Tanggal Transfer
                  </label>
                  <input
                    type="date"
                    value={transferDate}
                    onChange={(e) => setTransferDate(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-corporate-500"
                    required
                  />
                </div>
              </div>

              {/* Keterangan */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Catatan / Keterangan (Opsional)
                </label>
                <input
                  type="text"
                  value={transferNote}
                  onChange={(e) => setTransferNote(e.target.value)}
                  placeholder="Contoh: Tarik tunai petty cash / Pindah likuiditas dana"
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-corporate-500"
                />
              </div>

              {/* Preview Info */}
              <div className="p-3 bg-corporate-50/60 border border-corporate-100 rounded-xl text-xs text-corporate-900 space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-corporate-950">
                  <ArrowRight className="w-3.5 h-3.5 text-corporate-700" />
                  <span>Dampak Jurnal Mutasi:</span>
                </div>
                <p className="text-[11px] text-slate-600">
                  • 1x Transaksi Pengeluaran tercatat di <b>{selectedFromAccount?.name || 'Akun Asal'}</b>
                </p>
                <p className="text-[11px] text-slate-600">
                  • 1x Transaksi Pemasukan tercatat di <b>{selectedToAccount?.name || 'Akun Tujuan'}</b>
                </p>
              </div>

              {/* Modal Buttons */}
              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsTransferModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-corporate-700 hover:bg-corporate-800 rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <ArrowLeftRight className="w-3.5 h-3.5" />
                  <span>Proses Transfer</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      
      {/* Modal Edit Akun Keuangan (Bank / Kas) */}
      {editingAccount && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 bg-corporate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-corporate-200">
                  <Edit3 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold tracking-tight">Edit Akun Keuangan</h3>
                  <p className="text-[11px] text-corporate-200">Ubah informasi rekening bank atau kas tunai</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingAccount(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEditAccount} className="p-6 space-y-4">
              {/* Pilihan Tipe Akun: Bank atau Kas */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Tipe Akun Keuangan
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingAccount(prev => ({ ...prev, tipeAkun: 'bank' }))}
                    className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 border transition-all cursor-pointer ${
                      editingAccount.tipeAkun === 'bank'
                        ? 'bg-corporate-700 text-white border-corporate-700 shadow-xs'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <Building className="w-4 h-4" />
                    <span>Rekening Bank</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingAccount(prev => ({ ...prev, tipeAkun: 'kas' }))}
                    className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 border transition-all cursor-pointer ${
                      editingAccount.tipeAkun === 'kas'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <Wallet className="w-4 h-4" />
                    <span>Kas Tunai / Kecil</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  {editingAccount.tipeAkun === 'kas' ? 'Nama Akun Kas' : 'Nama Rekening Bank'}
                </label>
                <input
                  type="text"
                  value={editingAccount.name}
                  onChange={(e) => setEditingAccount(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-corporate-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Saldo Awal
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-xs font-bold text-slate-500">Rp</span>
                  <input
                    type="text"
                    value={editingAccount.saldoDisplay}
                    onChange={(e) => setEditingAccount(prev => ({ ...prev, saldoDisplay: formatNominalInput(e.target.value) }))}
                    className="w-full pl-10 pr-3 py-2 text-sm font-mono-num font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-corporate-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Tanggal Saldo Awal
                </label>
                <input
                  type="date"
                  value={editingAccount.tanggalSaldoAwal}
                  onChange={(e) => setEditingAccount(prev => ({ ...prev, tanggalSaldoAwal: e.target.value }))}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-corporate-500"
                  required
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setEditingAccount(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-corporate-700 hover:bg-corporate-800 rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Simpan Perubahan</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Laporan & Akumulasi Bulanan per Akun Bank/Kas */}
      <BankAccountReportModal
        isOpen={!!reportModalAccount}
        onClose={() => setReportModalAccount(null)}
        bank={reportModalAccount}
        transactions={transactions}
        companyName={companyName}
        currentUser={currentUser}
      />

      {/* Modal Validasi Hapus Bank/Kas */}
      <ConfirmDeleteModal
        isOpen={deleteModalState.isOpen}
        onClose={() => setDeleteModalState({ isOpen: false, isBatch: false, targetItem: null, targetIds: [], items: [] })}
        onConfirm={handleConfirmDelete}
        title={deleteModalState.isBatch ? 'Validasi Hapus Akun Keuangan Terpilih' : 'Validasi Hapus Akun Keuangan'}
        itemType="Akun Bank/Kas"
        items={deleteModalState.items}
        isBatch={deleteModalState.isBatch}
        warningText="Tindakan ini tidak dapat dibatalkan. Akun bank/kas akan dihapus secara permanen."
      />

      {/* Modal Peringatan Data Master Terkunci dari Penghapusan */}
      <BlockedDeleteModal
        isOpen={blockedModalState.isOpen}
        onClose={() => setBlockedModalState(prev => ({ ...prev, isOpen: false }))}
        title="Akun Bank / Kas Tidak Dapat Dihapus"
        masterType={blockedModalState.masterType}
        masterName={blockedModalState.masterName}
        transactionCount={blockedModalState.transactionCount}
        items={blockedModalState.items}
      />
    </div>
  );
};
