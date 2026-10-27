import React, { useState, useEffect, useMemo } from 'react';
import { Header } from './components/Header';
import { MetricCards } from './components/MetricCards';
import { BankManager } from './components/BankManager';
import { ForecastManager } from './components/ForecastManager';
import { TransactionForm } from './components/TransactionForm';
import { ReconciliationTable } from './components/ReconciliationTable';
import { AnalyticsCharts } from './components/AnalyticsCharts';
import { LoginPage } from './components/LoginPage';
import { UserManagementModal } from './components/UserManagementModal';
import { PrintSummaryModal } from './components/PrintSummaryModal';
import { DEFAULT_USERS } from './data/users';
import { 
  INITIAL_BANKS, 
  INITIAL_FORECASTS, 
  INITIAL_TRANSACTIONS 
} from './data/initialData';
import { subscribeToDoc, saveToDoc } from './services/firebase';
import { isTransferTransaction, getTransferDirection, isOperationalIncome, isOperationalExpense } from './utils/transactionHelper';
import { CheckCircle, ShieldAlert, Lock, Printer } from 'lucide-react';

export function App() {
  const [syncStatus, setSyncStatus] = useState('connecting'); // 'connecting' | 'connected' | 'error'

  const [users, setUsers] = useState(() => {
    try {
      const saved = localStorage.getItem('gpe_users');
      if (!saved) return DEFAULT_USERS;
      const parsed = JSON.parse(saved);
      if (!Array.isArray(parsed) || parsed.length === 0) return DEFAULT_USERS;
      const merged = [...parsed];
      DEFAULT_USERS.forEach(def => {
        if (!merged.some(u => u.email.toLowerCase() === def.email.toLowerCase())) {
          merged.push(def);
        }
      });
      return merged;
    } catch {
      return DEFAULT_USERS;
    }
  });

  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem('gpe_current_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [isPrintSummaryOpen, setIsPrintSummaryOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedMonth, setSelectedMonth] = useState('all');
  
  const [companyName, setCompanyName] = useState(() => {
    return localStorage.getItem('gpe_company_name') || 'PT GRAHA PRIMA ENERGI';
  });

  const [banks, setBanks] = useState(() => {
    const saved = localStorage.getItem('gpe_banks');
    return saved ? JSON.parse(saved) : INITIAL_BANKS;
  });

  const [forecasts, setForecasts] = useState(() => {
    const saved = localStorage.getItem('gpe_forecasts');
    return saved ? JSON.parse(saved) : INITIAL_FORECASTS;
  });

  const [transactions, setTransactions] = useState(() => {
    const saved = localStorage.getItem('gpe_transactions');
    return saved ? JSON.parse(saved) : INITIAL_TRANSACTIONS;
  });

  const [notification, setNotification] = useState(null);

  // Local storage cache backup
  useEffect(() => localStorage.setItem('gpe_users', JSON.stringify(users)), [users]);
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('gpe_current_user', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('gpe_current_user');
    }
  }, [currentUser]);

  useEffect(() => localStorage.setItem('gpe_company_name', companyName), [companyName]);
  useEffect(() => localStorage.setItem('gpe_banks', JSON.stringify(banks)), [banks]);
  useEffect(() => localStorage.setItem('gpe_forecasts', JSON.stringify(forecasts)), [forecasts]);
  useEffect(() => localStorage.setItem('gpe_transactions', JSON.stringify(transactions)), [transactions]);

  // Real-time Cloud Firestore synchronization
  useEffect(() => {
    let unsubscribes = [];

    const handleSyncError = (err) => {
      console.warn('Firebase sync warning:', err);
      setSyncStatus('error');
    };

    try {
      // 1. Subscribe Banks
      const unsubBanks = subscribeToDoc('banks', (data) => {
        if (data && Array.isArray(data) && data.length > 0) {
          setBanks(data);
        } else {
          try {
            const saved = localStorage.getItem('gpe_banks');
            const localBanks = saved ? JSON.parse(saved) : null;
            if (localBanks && Array.isArray(localBanks) && localBanks.length > 0) {
              saveToDoc('banks', localBanks).catch(() => {});
              setBanks(localBanks);
            } else if (data && Array.isArray(data)) {
              setBanks(data);
            }
          } catch {
            if (data && Array.isArray(data)) setBanks(data);
          }
        }
        setSyncStatus('connected');
      }, handleSyncError);
      unsubscribes.push(unsubBanks);

      // 2. Subscribe Forecasts
      const unsubForecasts = subscribeToDoc('forecasts', (data) => {
        if (data && Array.isArray(data) && data.length > 0) {
          setForecasts(data);
        } else {
          try {
            const saved = localStorage.getItem('gpe_forecasts');
            const local = saved ? JSON.parse(saved) : null;
            if (local && Array.isArray(local) && local.length > 0) {
              saveToDoc('forecasts', local).catch(() => {});
              setForecasts(local);
            } else if (data && Array.isArray(data)) {
              setForecasts(data);
            }
          } catch {
            if (data && Array.isArray(data)) setForecasts(data);
          }
        }
        setSyncStatus('connected');
      }, handleSyncError);
      unsubscribes.push(unsubForecasts);

      // 3. Subscribe Transactions
      const unsubTransactions = subscribeToDoc('transactions', (data) => {
        if (data && Array.isArray(data) && data.length > 0) {
          setTransactions(data);
        } else {
          try {
            const saved = localStorage.getItem('gpe_transactions');
            const local = saved ? JSON.parse(saved) : null;
            if (local && Array.isArray(local) && local.length > 0) {
              saveToDoc('transactions', local).catch(() => {});
              setTransactions(local);
            } else if (data && Array.isArray(data)) {
              setTransactions(data);
            }
          } catch {
            if (data && Array.isArray(data)) setTransactions(data);
          }
        }
        setSyncStatus('connected');
      }, handleSyncError);
      unsubscribes.push(unsubTransactions);

      // 4. Subscribe Users
      const unsubUsers = subscribeToDoc('users', (data) => {
        if (data && Array.isArray(data) && data.length > 0) {
          const merged = [...data];
          DEFAULT_USERS.forEach(def => {
            if (!merged.some(u => u.email.toLowerCase() === def.email.toLowerCase())) {
              merged.push(def);
            }
          });
          setUsers(merged);
        } else {
          try {
            const saved = localStorage.getItem('gpe_users');
            const local = saved ? JSON.parse(saved) : null;
            if (local && Array.isArray(local) && local.length > 0) {
              const merged = [...local];
              DEFAULT_USERS.forEach(def => {
                if (!merged.some(u => u.email.toLowerCase() === def.email.toLowerCase())) {
                  merged.push(def);
                }
              });
              saveToDoc('users', merged).catch(() => {});
              setUsers(merged);
              return;
            }
          } catch {}
          saveToDoc('users', DEFAULT_USERS).catch(() => {});
        }
        setSyncStatus('connected');
      }, handleSyncError);
      unsubscribes.push(unsubUsers);

      // 5. Subscribe Company Name
      const unsubSettings = subscribeToDoc('settings', (data) => {
        if (data && data.companyName) {
          setCompanyName(data.companyName);
        } else {
          saveToDoc('settings', { companyName: 'PT GRAHA PRIMA ENERGI' }).catch(() => {});
        }
        setSyncStatus('connected');
      }, handleSyncError);
      unsubscribes.push(unsubSettings);

    } catch (err) {
      console.error('Failed to initialize Firestore listener:', err);
      setSyncStatus('error');
    }

    return () => {
      unsubscribes.forEach(unsub => {
        if (typeof unsub === 'function') unsub();
      });
    };
  }, []);

  const showNotification = (msg, type = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleForceSyncToCloud = async () => {
    try {
      showNotification('Menyinkronkan semua data lokal ke Cloud Firebase...', 'info');
      let count = 0;
      if (banks.length > 0) { await saveToDoc('banks', banks); count++; }
      if (forecasts.length > 0) { await saveToDoc('forecasts', forecasts); count++; }
      if (transactions.length > 0) { await saveToDoc('transactions', transactions); count++; }
      if (users.length > 0) { await saveToDoc('users', users); count++; }
      if (companyName) { await saveToDoc('settings', { companyName }); count++; }
      showNotification('Sukses! Semua data (' + banks.length + ' bank, ' + forecasts.length + ' forecast, ' + transactions.length + ' mutasi) telah tersinkronisasi ke Cloud.', 'success');
    } catch (err) {
      console.error('Manual sync error:', err);
      showNotification('Gagal sinkron: ' + err.message, 'error');
    }
  };

  const handleLogin = (user) => {
    setCurrentUser(user);
    showNotification(`Selamat datang, ${user.name}!`);
  };

  const handleLogout = () => {
    if (window.confirm('Keluar dari sistem?')) {
      setCurrentUser(null);
      showNotification('Anda telah keluar.');
    }
  };

  const handleAddUser = (newUser) => {
    const updated = [...users, newUser];
    setUsers(updated);
    saveToDoc('users', updated).catch(() => {});
    showNotification(`Pengguna ${newUser.name} berhasil didaftarkan.`);
  };

  const handleDeleteUser = (userId) => {
    const updated = users.filter(u => u.id !== userId);
    setUsers(updated);
    saveToDoc('users', updated).catch(() => {});
    showNotification('Pengguna berhasil dihapus.');
  };

  const handleUpdateUser = (userId, updatedFields) => {
    const updated = users.map(u => u.id === userId ? { ...u, ...updatedFields } : u);
    setUsers(updated);
    saveToDoc('users', updated).catch(() => {});
    if (currentUser?.id === userId) {
      setCurrentUser(prev => ({ ...prev, ...updatedFields }));
    }
    showNotification('Data pengguna berhasil diperbarui.');
  };

  // Daftar seluruh periode bulan unik dari transaksi & saldo awal
  const availableDashboardMonths = useMemo(() => {
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

  // Kalkulasi Rollover Saldo Kas & Mutasi yang Disesuaikan dengan Periode Bulan Terpilih
  // PENTING: Mutasi internal transfer antar bank/kas TIDAK masuk ke total pemasukan atau total pengeluaran operasional perusahaan
  const dashboardMetrics = useMemo(() => {
    const totalMasterSaldoAwal = banks.reduce((sum, b) => sum + (Number(b.saldoAwal) || 0), 0);

    if (!selectedMonth || selectedMonth === 'all') {
      // HANYA mutasi operasional (tidak termasuk transfer internal antar bank)
      const masuk = transactions.filter(t => isOperationalIncome(t)).reduce((sum, t) => sum + (Number(t.nominal) || 0), 0);
      const keluar = transactions.filter(t => isOperationalExpense(t)).reduce((sum, t) => sum + (Number(t.nominal) || 0), 0);
      const totalTransfer = transactions.filter(t => isTransferTransaction(t) && getTransferDirection(t) === 'out').reduce((sum, t) => sum + (Number(t.nominal) || 0), 0);
      const transferCount = transactions.filter(t => isTransferTransaction(t) && getTransferDirection(t) === 'out').length;
      const saldoAkhir = totalMasterSaldoAwal + masuk - keluar;
      return {
        isFilteredMonth: false,
        totalSaldoAwal: totalMasterSaldoAwal,
        totalMasuk: masuk,
        totalKeluar: keluar,
        totalTransfer,
        transferCount,
        saldoAkhirKeseluruhan: saldoAkhir
      };
    }

    const startOfTargetMonth = `${selectedMonth}-01`;
    const priorIn = transactions
      .filter(t => isOperationalIncome(t) && t.tanggal && t.tanggal < startOfTargetMonth)
      .reduce((sum, t) => sum + (Number(t.nominal) || 0), 0);
    const priorOut = transactions
      .filter(t => isOperationalExpense(t) && t.tanggal && t.tanggal < startOfTargetMonth)
      .reduce((sum, t) => sum + (Number(t.nominal) || 0), 0);

    // Saldo Awal Bulan Terpilih = Saldo Master Awal + Inflow sebelum bulan M - Outflow sebelum bulan M
    const saldoAwalBulanIni = totalMasterSaldoAwal + priorIn - priorOut;

    // Mutasi Pemasukan & Pengeluaran Khusus pada Bulan M (Eksklusif Operasional)
    const currentIn = transactions
      .filter(t => isOperationalIncome(t) && t.tanggal && t.tanggal.startsWith(selectedMonth))
      .reduce((sum, t) => sum + (Number(t.nominal) || 0), 0);
    const currentOut = transactions
      .filter(t => isOperationalExpense(t) && t.tanggal && t.tanggal.startsWith(selectedMonth))
      .reduce((sum, t) => sum + (Number(t.nominal) || 0), 0);
    const currentTransfer = transactions
      .filter(t => isTransferTransaction(t) && getTransferDirection(t) === 'out' && t.tanggal && t.tanggal.startsWith(selectedMonth))
      .reduce((sum, t) => sum + (Number(t.nominal) || 0), 0);
    const currentTransferCount = transactions
      .filter(t => isTransferTransaction(t) && getTransferDirection(t) === 'out' && t.tanggal && t.tanggal.startsWith(selectedMonth))
      .length;

    // Saldo Akhir Bulan Terpilih = Saldo Awal Bulan Terpilih + Inflow Bulan M - Outflow Bulan M
    const saldoAkhirBulanIni = saldoAwalBulanIni + currentIn - currentOut;

    return {
      isFilteredMonth: true,
      totalSaldoAwal: saldoAwalBulanIni,
      totalMasuk: currentIn,
      totalKeluar: currentOut,
      totalTransfer: currentTransfer,
      transferCount: currentTransferCount,
      saldoAkhirKeseluruhan: saldoAkhirBulanIni
    };
  }, [banks, transactions, selectedMonth]);

  // Saldo per Rekening Bank Disesuaikan dengan Periode Bulan
  // Memperhitungkan mutasi operasional DAN mutasi pemindahan dana antar bank untuk rekening tersebut
  const banksWithPeriodBalances = useMemo(() => {
    return banks.map(b => {
      const masterSaldoAwal = Number(b.saldoAwal) || 0;
      if (!selectedMonth || selectedMonth === 'all') {
        const bIn = transactions.filter(t => t.bankId === b.id && (isOperationalIncome(t) || (isTransferTransaction(t) && getTransferDirection(t) === 'in'))).reduce((s, t) => s + (Number(t.nominal) || 0), 0);
        const bOut = transactions.filter(t => t.bankId === b.id && (isOperationalExpense(t) || (isTransferTransaction(t) && getTransferDirection(t) === 'out'))).reduce((s, t) => s + (Number(t.nominal) || 0), 0);
        const bTrfIn = transactions.filter(t => t.bankId === b.id && isTransferTransaction(t) && getTransferDirection(t) === 'in').reduce((s, t) => s + (Number(t.nominal) || 0), 0);
        const bTrfOut = transactions.filter(t => t.bankId === b.id && isTransferTransaction(t) && getTransferDirection(t) === 'out').reduce((s, t) => s + (Number(t.nominal) || 0), 0);
        return {
          ...b,
          saldoAwalPeriode: masterSaldoAwal,
          totalMasukPeriode: bIn,
          totalKeluarPeriode: bOut,
          transferMasukPeriode: bTrfIn,
          transferKeluarPeriode: bTrfOut,
          saldoAkhirPeriode: masterSaldoAwal + bIn - bOut
        };
      }

      const startOfTargetMonth = `${selectedMonth}-01`;
      const priorIn = transactions.filter(t => t.bankId === b.id && (isOperationalIncome(t) || (isTransferTransaction(t) && getTransferDirection(t) === 'in')) && t.tanggal && t.tanggal < startOfTargetMonth).reduce((s, t) => s + (Number(t.nominal) || 0), 0);
      const priorOut = transactions.filter(t => t.bankId === b.id && (isOperationalExpense(t) || (isTransferTransaction(t) && getTransferDirection(t) === 'out')) && t.tanggal && t.tanggal < startOfTargetMonth).reduce((s, t) => s + (Number(t.nominal) || 0), 0);
      const bSaldoAwal = masterSaldoAwal + priorIn - priorOut;

      const bIn = transactions.filter(t => t.bankId === b.id && (isOperationalIncome(t) || (isTransferTransaction(t) && getTransferDirection(t) === 'in')) && t.tanggal && t.tanggal.startsWith(selectedMonth)).reduce((s, t) => s + (Number(t.nominal) || 0), 0);
      const bOut = transactions.filter(t => t.bankId === b.id && (isOperationalExpense(t) || (isTransferTransaction(t) && getTransferDirection(t) === 'out')) && t.tanggal && t.tanggal.startsWith(selectedMonth)).reduce((s, t) => s + (Number(t.nominal) || 0), 0);
      const bTrfIn = transactions.filter(t => t.bankId === b.id && isTransferTransaction(t) && getTransferDirection(t) === 'in' && t.tanggal && t.tanggal.startsWith(selectedMonth)).reduce((s, t) => s + (Number(t.nominal) || 0), 0);
      const bTrfOut = transactions.filter(t => t.bankId === b.id && isTransferTransaction(t) && getTransferDirection(t) === 'out' && t.tanggal && t.tanggal.startsWith(selectedMonth)).reduce((s, t) => s + (Number(t.nominal) || 0), 0);
      return {
        ...b,
        saldoAwalPeriode: bSaldoAwal,
        totalMasukPeriode: bIn,
        totalKeluarPeriode: bOut,
        transferMasukPeriode: bTrfIn,
        transferKeluarPeriode: bTrfOut,
        saldoAkhirPeriode: bSaldoAwal + bIn - bOut
      };
    });
  }, [banks, transactions, selectedMonth]);

  // Forecast yang relevan dengan periode bulan
  const currentMonthForecasts = useMemo(() => {
    if (!selectedMonth || selectedMonth === 'all') return forecasts;
    return (forecasts || []).filter(f => f.periodeBulan === selectedMonth);
  }, [forecasts, selectedMonth]);

  const planTransactionsMap = useMemo(() => {
    const map = {};
    (forecasts || []).forEach(f => {
      map[f.id] = (transactions || []).filter(t => {
        if (t.planId !== f.id) return false;
        if (selectedMonth && selectedMonth !== 'all' && t.tanggal && !t.tanggal.startsWith(selectedMonth)) return false;
        return true;
      });
    });
    return map;
  }, [forecasts, transactions, selectedMonth]);

  const reconciledForecasts = useMemo(() => {
    return (currentMonthForecasts || []).filter(f => (planTransactionsMap[f.id] || []).length > 0);
  }, [currentMonthForecasts, planTransactionsMap]);

  const totalForecastMasuk = reconciledForecasts
    .filter(f => f.tipe === 'pemasukan')
    .reduce((sum, f) => sum + (Number(f.nominal) || 0), 0);

  const totalForecastKeluar = reconciledForecasts
    .filter(f => f.tipe === 'pengeluaran')
    .reduce((sum, f) => sum + (Number(f.nominal) || 0), 0);

  const proyeksiSaldoAkhir = dashboardMetrics.totalSaldoAwal + totalForecastMasuk - totalForecastKeluar;

  const masterForecastMasuk = (currentMonthForecasts || [])
    .filter(f => f.tipe === 'pemasukan')
    .reduce((sum, f) => sum + (Number(f.nominal) || 0), 0);

  const masterForecastKeluar = (currentMonthForecasts || [])
    .filter(f => f.tipe === 'pengeluaran')
    .reduce((sum, f) => sum + (Number(f.nominal) || 0), 0);

  const handleAddBank = (newBank) => {
    if (currentUser?.role === 'viewer') return;
    setBanks(prev => {
      const updated = [...prev, newBank];
      saveToDoc('banks', updated).catch(() => {});
      return updated;
    });
    showNotification(`Bank ${newBank.name} berhasil ditambahkan.`);
  };

  const handleAddBanks = (newBanksList) => {
    if (currentUser?.role === 'viewer' || !newBanksList?.length) return;
    setBanks(prev => {
      const updated = [...prev, ...newBanksList];
      saveToDoc('banks', updated).catch(() => {});
      return updated;
    });
    showNotification(`Berhasil mengimpor ${newBanksList.length} rekening bank.`);
  };

  
  const handleDeleteBanksBatch = (bankIds) => {
    if (currentUser?.role === 'viewer' || !bankIds?.length) return;
    const idSet = new Set(bankIds);
    const updated = banks.filter(b => !idSet.has(b.id));
    setBanks(updated);
    saveToDoc('banks', updated).catch(() => {});
    showNotification(`${bankIds.length} rekening bank berhasil dihapus.`);
  };

  const handleDeleteBank = (bankId) => {
    if (currentUser?.role === 'viewer') return;
    const updated = banks.filter(b => b.id !== bankId);
    setBanks(updated);
    saveToDoc('banks', updated).catch(() => {});
    showNotification('Bank berhasil dihapus.');
  };

  const handleUpdateBank = (bankId, updatedFields) => {
    if (currentUser?.role === 'viewer') return;
    const updated = banks.map(b => b.id === bankId ? { ...b, ...updatedFields } : b);
    setBanks(updated);
    saveToDoc('banks', updated).catch(() => {});
    showNotification('Bank berhasil diperbarui.');
  };

  const handleAddForecast = (newPlan) => {
    if (currentUser?.role === 'viewer') return;
    setForecasts(prev => {
      const updated = [newPlan, ...prev];
      saveToDoc('forecasts', updated).catch(() => {});
      return updated;
    });
    showNotification('Rencana forecast berhasil didaftarkan.');
  };

  const handleAddForecasts = (newForecastsList) => {
    if (currentUser?.role === 'viewer' || !newForecastsList?.length) return;
    setForecasts(prev => {
      const updated = [...newForecastsList, ...prev];
      saveToDoc('forecasts', updated).catch(() => {});
      return updated;
    });
    showNotification(`Berhasil mengimpor ${newForecastsList.length} rencana forecast.`);
  };

  
  const handleDeleteForecastsBatch = (forecastIds) => {
    if (currentUser?.role === 'viewer' || !forecastIds?.length) return;
    const idSet = new Set(forecastIds);
    const updated = forecasts.filter(f => !idSet.has(f.id));
    const updatedTx = transactions.map(t => idSet.has(t.planId) ? { ...t, planId: 'unplanned' } : t);
    setForecasts(updated);
    setTransactions(updatedTx);
    saveToDoc('forecasts', updated).catch(() => {});
    saveToDoc('transactions', updatedTx).catch(() => {});
    showNotification(`${forecastIds.length} rencana forecast berhasil dihapus.`);
  };

  const handleDeleteForecast = (planId) => {
    if (currentUser?.role === 'viewer') return;
    const updated = forecasts.filter(f => f.id !== planId);
    const updatedTx = transactions.map(t => t.planId === planId ? { ...t, planId: 'unplanned' } : t);
    setForecasts(updated);
    setTransactions(updatedTx);
    saveToDoc('forecasts', updated).catch(() => {});
    saveToDoc('transactions', updatedTx).catch(() => {});
    showNotification('Rencana forecast berhasil dihapus.');
  };

  const handleUpdateForecast = (planId, updatedFields) => {
    if (currentUser?.role === 'viewer') return;
    const updated = forecasts.map(f => f.id === planId ? { ...f, ...updatedFields } : f);
    setForecasts(updated);
    saveToDoc('forecasts', updated).catch(() => {});
    showNotification('Rencana forecast berhasil diperbarui.');
  };

  const handleAddTransaction = (newTx) => {
    if (currentUser?.role === 'viewer') return;
    setTransactions(prev => {
      const updated = [newTx, ...prev];
      saveToDoc('transactions', updated).catch(() => {});
      return updated;
    });
    if (newTx.planId === 'unplanned') {
      showNotification('Transaksi tercatat sebagai Diluar Forecast (Anomali).', 'warning');
    } else {
      showNotification('Transaksi mutasi kas berhasil dicatat.');
    }
  };

  const handleAddTransactions = (newTransactionsList) => {
    if (currentUser?.role === 'viewer' || !newTransactionsList?.length) return;
    setTransactions(prev => {
      const updated = [...newTransactionsList, ...prev];
      saveToDoc('transactions', updated).catch(() => {});
      return updated;
    });
    showNotification(`Berhasil mengimpor ${newTransactionsList.length} mutasi kas.`);
  };

  const handleDeleteTransaction = (txId) => {
    if (currentUser?.role === 'viewer') return;
    const updated = transactions.filter(t => t.id !== txId);
    setTransactions(updated);
    saveToDoc('transactions', updated).catch(() => {});
    showNotification('Transaksi berhasil dihapus.');
  };

  const handleUpdateTransaction = (txId, updatedFields) => {
    if (currentUser?.role === 'viewer') return;
    const updated = transactions.map(t => t.id === txId ? { ...t, ...updatedFields } : t);
    setTransactions(updated);
    saveToDoc('transactions', updated).catch(() => {});
    showNotification('Transaksi aktual berhasil diperbarui.');
  };

  const handleSetCompanyName = (newName) => {
    setCompanyName(newName);
    saveToDoc('settings', { companyName: newName }).catch(() => {});
  };

  const handleDeleteTransactionsBatch = (txIds) => {
    if (currentUser?.role === 'viewer' || !txIds?.length) return;
    const idSet = new Set(txIds);
    const updated = transactions.filter(t => !idSet.has(t.id));
    setTransactions(updated);
    saveToDoc('transactions', updated).catch(() => {});
    showNotification(`${txIds.length} transaksi berhasil dihapus.`);
  };

  const handleResetData = () => {
    if (currentUser?.role !== 'admin') {
      alert('Hanya admin tertinggi yang memiliki wewenang untuk mereset seluruh data sistem.');
      return;
    }

    const resetBanks = banks.map(b => ({
      ...b,
      saldoAwal: 0,
      tanggalSaldoAwal: new Date().toISOString().split('T')[0]
    }));

    setTransactions([]);
    setForecasts([]);
    setBanks(resetBanks);

    saveToDoc('transactions', []).catch(() => {});
    saveToDoc('forecasts', []).catch(() => {});
    saveToDoc('banks', resetBanks).catch(() => {});

    showNotification('Seluruh data transaksi, rencana forecast, dan saldo bank/kas telah direset ke 0.');
  };

  // If user is not logged in, render LoginPage
  if (!currentUser) {
    return (
      <LoginPage 
        onLogin={handleLogin} 
        users={users} 
        companyName={companyName} 
      />
    );
  }

  const isViewer = currentUser.role === 'viewer';

  return (
    <div className="min-h-screen flex flex-col bg-slate-100/90 text-slate-800">
      
      {notification && (
        <div className="fixed bottom-5 right-5 z-50 animate-bounce">
          <div className={`px-4 py-3 rounded-xl shadow-xl flex items-center gap-2.5 text-xs font-bold border ${notification.type === 'warning' ? 'bg-amber-900 text-amber-100 border-amber-700' : 'bg-corporate-950 text-white border-corporate-700'}`}>
            {notification.type === 'warning' ? <ShieldAlert className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
            <span>{notification.msg}</span>
          </div>
        </div>
      )}

      <Header 
        onResetData={handleResetData}
        onForceSync={handleForceSyncToCloud} 
        activeTab={activeTab} 
        setActiveTab={setActiveTab}
        companyName={companyName}
        setCompanyName={handleSetCompanyName}
        currentUser={currentUser}
        onLogout={handleLogout}
        onOpenUserModal={() => setIsUserModalOpen(true)}
        syncStatus={syncStatus}
      />

      <main className="flex-1 max-w-[1440px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        
        {/* Banner Pembatasan Akses untuk Tamu / Viewer */}
        {isViewer && (
          <div className="bg-amber-500/10 border border-amber-400/40 rounded-2xl p-4 flex items-center gap-3 text-amber-900 shadow-xs">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-700 flex items-center justify-center shrink-0">
              <Lock className="w-5 h-5" />
            </div>
            <div className="text-xs">
              <div className="font-bold flex items-center gap-1.5 text-amber-950">
                <span>Mode User Review (Read-Only)</span>
                <span className="text-[10px] bg-amber-200/80 text-amber-900 px-2 py-0.2 rounded-full font-semibold">Hak Akses Review</span>
              </div>
              <p className="text-amber-800/90 mt-0.5">
                Anda login sebagai User Review. Anda dapat meninjau saldo kas, rekapitulasi rencana & mutasi, serta mencetak PDF. Fitur input, edit, dan hapus data dinonaktifkan.
              </p>
            </div>
          </div>
        )}

        {activeTab === 'dashboard' && (
          <>
            {/* Dashboard Header Bar with Print Summary PDF */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs">
              <div>
                <h2 className="text-base font-bold text-slate-900 tracking-tight">Overview Arus Kas & Saldo Keuangan</h2>
                <p className="text-xs text-slate-500">Monitoring transaksi aktual, realisasi target rencana, dan posisi saldo kas berjalan</p>
              </div>
              <button
                type="button"
                onClick={() => setIsPrintSummaryOpen(true)}
                className="flex items-center justify-center gap-2 px-4 py-2 text-xs font-bold text-corporate-900 bg-corporate-50 hover:bg-corporate-100 border border-corporate-200 rounded-xl shadow-xs transition-all cursor-pointer shrink-0"
                title="Cetak ringkasan total transaksi dan saldo terkini bank ke PDF"
              >
                <Printer className="w-4 h-4 text-corporate-700" />
                <span>Cetak Ringkasan PDF</span>
              </button>
            </div>

            <section>
              <MetricCards
                banks={banks}
                forecasts={forecasts}
                transactions={transactions}
                totalSaldoAwalSemuaBank={dashboardMetrics.totalSaldoAwal}
                totalMasuk={dashboardMetrics.totalMasuk}
                totalKeluar={dashboardMetrics.totalKeluar}
                saldoAkhirKeseluruhan={dashboardMetrics.saldoAkhirKeseluruhan}
                totalForecastMasuk={totalForecastMasuk}
                totalForecastKeluar={totalForecastKeluar}
                proyeksiSaldoAkhir={proyeksiSaldoAkhir}
                masterForecastMasuk={masterForecastMasuk}
                masterForecastKeluar={masterForecastKeluar}
                totalTransfer={dashboardMetrics.totalTransfer}
                transferCount={dashboardMetrics.transferCount}
                selectedMonth={selectedMonth}
                onMonthChange={setSelectedMonth}
                availableMonths={availableDashboardMonths}
                banksWithPeriodBalances={banksWithPeriodBalances}
              />
            </section>
            
            <section className="max-w-2xl mx-auto w-full">
              <TransactionForm
                banks={banks}
                forecasts={forecasts}
                transactions={transactions}
                onAddTransaction={handleAddTransaction}
                onAddTransactions={handleAddTransactions}
                currentUser={currentUser}
              />
            </section>

            <section>
              <ReconciliationTable
                banks={banks}
                forecasts={forecasts}
                transactions={transactions}
                onDeleteTransaction={handleDeleteTransaction}
                onDeleteTransactionsBatch={handleDeleteTransactionsBatch}
                onDeleteForecast={handleDeleteForecast}
                onDeleteForecastsBatch={handleDeleteForecastsBatch}
                onUpdateForecast={handleUpdateForecast}
                onUpdateTransaction={handleUpdateTransaction}
                currentUser={currentUser}
                selectedMonth={selectedMonth}
                onMonthChange={setSelectedMonth}
              />
            </section>
          </>
        )}

        {activeTab === 'banks' && (
          <section>
            <BankManager
              companyName={companyName}
              banks={banks}
              transactions={transactions}
              onAddBank={handleAddBank}
              onAddBanks={handleAddBanks}
              onDeleteBank={handleDeleteBank}
              onDeleteBanksBatch={handleDeleteBanksBatch}
              onUpdateBank={handleUpdateBank}
              onAddTransactions={handleAddTransactions}
              currentUser={currentUser}
            />
          </section>
        )}

        {activeTab === 'forecasts' && (
          <section>
            <ForecastManager
              forecasts={forecasts}
              transactions={transactions}
              onAddForecast={handleAddForecast}
              onAddForecasts={handleAddForecasts}
              onDeleteForecast={handleDeleteForecast}
              onDeleteForecastsBatch={handleDeleteForecastsBatch}
              onUpdateForecast={handleUpdateForecast}
              currentUser={currentUser}
            />
          </section>
        )}

        {activeTab === 'analytics' && (
          <section>
            <AnalyticsCharts
              banks={banks}
              transactions={transactions}
              forecasts={forecasts}
              companyName={companyName}
              currentUser={currentUser}
            />
          </section>
        )}

      </main>

      {/* User Management Modal */}
      <UserManagementModal
        isOpen={isUserModalOpen}
        onClose={() => setIsUserModalOpen(false)}
        users={users}
        onAddUser={handleAddUser}
        onUpdateUser={handleUpdateUser}
        onDeleteUser={handleDeleteUser}
        currentUserId={currentUser.id}
        companyName={companyName}
        onUpdateCompanyName={handleSetCompanyName}
        onResetData={handleResetData}
        isAdmin={currentUser?.role === 'admin'}
      />

      {/* Print Dashboard Summary Modal */}
      <PrintSummaryModal
        isOpen={isPrintSummaryOpen}
        onClose={() => setIsPrintSummaryOpen(false)}
        companyName={companyName}
        currentUser={currentUser}
        banks={banks}
        transactions={transactions}
      />

      <footer className="mt-8 bg-navy-950 text-slate-400 border-t border-corporate-900 py-6 text-xs">
        <div className="max-w-7xl mx-auto px-4 text-center">
          {companyName} • Sistem Manajemen Arus Kas
        </div>
      </footer>
    </div>
  );
}

export default App;
