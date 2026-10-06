import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { MetricCards } from './components/MetricCards';
import { BankManager } from './components/BankManager';
import { ForecastManager } from './components/ForecastManager';
import { TransactionForm } from './components/TransactionForm';
import { ReconciliationTable } from './components/ReconciliationTable';
import { 
  INITIAL_BANKS,
  INITIAL_FORECASTS, 
  INITIAL_TRANSACTIONS 
} from './data/initialData';
import { CheckCircle, ShieldAlert } from 'lucide-react';

export function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  
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

  useEffect(() => localStorage.setItem('gpe_company_name', companyName), [companyName]);
  useEffect(() => localStorage.setItem('gpe_banks', JSON.stringify(banks)), [banks]);
  useEffect(() => localStorage.setItem('gpe_forecasts', JSON.stringify(forecasts)), [forecasts]);
  useEffect(() => localStorage.setItem('gpe_transactions', JSON.stringify(transactions)), [transactions]);

  const showNotification = (msg, type = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const totalSaldoAwalSemuaBank = banks.reduce((sum, b) => sum + b.saldoAwal, 0);
  const totalMasuk = transactions.filter(t => t.tipe === 'pemasukan').reduce((sum, t) => sum + t.nominal, 0);
  const totalKeluar = transactions.filter(t => t.tipe === 'pengeluaran').reduce((sum, t) => sum + t.nominal, 0);
  const saldoAkhirKeseluruhan = totalSaldoAwalSemuaBank + totalMasuk - totalKeluar;

  const handleAddBank = (newBank) => {
    setBanks(prev => [...prev, newBank]);
    showNotification(`Bank ${newBank.name} berhasil ditambahkan.`);
  };

  const handleDeleteBank = (bankId) => {
    setBanks(prev => prev.filter(b => b.id !== bankId));
    showNotification(`Bank berhasil dihapus.`);
  };

  const handleUpdateBank = (bankId, updatedFields) => {
    setBanks(prev => prev.map(b => b.id === bankId ? { ...b, ...updatedFields } : b));
    showNotification(`Bank berhasil diperbarui.`);
  };

  const handleAddForecast = (newPlan) => {
    setForecasts(prev => [newPlan, ...prev]);
    showNotification(`Rencana forecast berhasil didaftarkan.`);
  };

  const handleDeleteForecast = (planId) => {
    setForecasts(prev => prev.filter(f => f.id !== planId));
    setTransactions(prev => prev.map(t => t.planId === planId ? { ...t, planId: 'unplanned' } : t));
    showNotification(`Rencana forecast berhasil dihapus.`);
  };

  const handleAddTransaction = (newTx) => {
    setTransactions(prev => [newTx, ...prev]);
    if (newTx.planId === 'unplanned') {
      showNotification(`Transaksi tercatat sebagai Diluar Forecast (Anomali).`, 'warning');
    } else {
      showNotification(`Transaksi mutasi kas berhasil dicatat.`);
    }
  };

  const handleDeleteTransaction = (txId) => {
    setTransactions(prev => prev.filter(t => t.id !== txId));
    showNotification(`Transaksi berhasil dihapus.`);
  };

  const handleUpdateForecast = (planId, updatedFields) => {
    setForecasts(prev => prev.map(f => f.id === planId ? { ...f, ...updatedFields } : f));
    showNotification(`Rencana forecast berhasil diperbarui.`);
  };

  const handleUpdateTransaction = (txId, updatedFields) => {
    setTransactions(prev => prev.map(t => t.id === txId ? { ...t, ...updatedFields } : t));
    showNotification(`Transaksi aktual berhasil diperbarui.`);
  };

  const handleResetData = () => {
    if (window.confirm('Kembalikan ke data dummy awal?')) {
      setBanks(INITIAL_BANKS);
      setForecasts(INITIAL_FORECASTS);
      setTransactions(INITIAL_TRANSACTIONS);
      setCompanyName('PT GRAHA PRIMA ENERGI');
      localStorage.clear();
      showNotification('Data telah direset.');
    }
  };

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
        activeTab={activeTab} 
        setActiveTab={setActiveTab}
        companyName={companyName}
        setCompanyName={setCompanyName}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        
        {activeTab === 'dashboard' && (
          <>
            <section>
              <MetricCards
                banks={banks}
                transactions={transactions}
                totalSaldoAwalSemuaBank={totalSaldoAwalSemuaBank}
                totalMasuk={totalMasuk}
                totalKeluar={totalKeluar}
                saldoAkhirKeseluruhan={saldoAkhirKeseluruhan}
              />
            </section>
            
            {/* The transaction form is centered or max-w limited since there's no left column anymore */}
            <section className="max-w-2xl mx-auto w-full">
              <TransactionForm
                banks={banks}
                forecasts={forecasts}
                transactions={transactions}
                onAddTransaction={handleAddTransaction}
              />
            </section>

            <section>
              <ReconciliationTable
                banks={banks}
                forecasts={forecasts}
                transactions={transactions}
                onDeleteTransaction={handleDeleteTransaction}
                onDeleteForecast={handleDeleteForecast}
                onUpdateForecast={handleUpdateForecast}
                onUpdateTransaction={handleUpdateTransaction}
              />
            </section>
          </>
        )}

        {activeTab === 'banks' && (
          <section>
            <BankManager
              banks={banks}
              onAddBank={handleAddBank}
              onDeleteBank={handleDeleteBank}
              onUpdateBank={handleUpdateBank}
            />
          </section>
        )}

        {activeTab === 'forecasts' && (
          <section>
            <ForecastManager
              forecasts={forecasts}
              onAddForecast={handleAddForecast}
              onDeleteForecast={handleDeleteForecast}
              onUpdateForecast={handleUpdateForecast}
            />
          </section>
        )}

      </main>

      <footer className="mt-8 bg-navy-950 text-slate-400 border-t border-corporate-900 py-6 text-xs">
        <div className="max-w-7xl mx-auto px-4 text-center">
          {companyName} • Sistem Manajemen Arus Kas
        </div>
      </footer>
    </div>
  );
}

export default App;
