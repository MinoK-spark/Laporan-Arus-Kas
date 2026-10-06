import React from 'react';
import { Building2, Calendar, RefreshCw, Printer, LayoutDashboard, Building, Target, Edit3 } from 'lucide-react';
import { formatDateIndo } from '../utils/formatters';

export const Header = ({ onResetData, activeTab, setActiveTab, companyName, setCompanyName }) => {
  const currentDate = new Date().toISOString().split('T')[0];

  const handleEditCompanyName = () => {
    const newName = window.prompt('Ubah Nama Perusahaan:', companyName);
    if (newName && newName.trim()) {
      setCompanyName(newName.trim());
    }
  };

  return (
    <header className="bg-gradient-to-r from-navy-950 via-corporate-900 to-corporate-800 text-white shadow-xl sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 border-b border-corporate-700/50">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          
          <div className="flex items-center space-x-3.5">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-corporate-500 to-blue-600 flex items-center justify-center shadow-lg shadow-corporate-900/40 border border-corporate-400/30">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold tracking-widest uppercase bg-corporate-800/80 text-corporate-200 px-2.5 py-0.5 rounded-full border border-corporate-700/60">
                  Internal Finance
                </span>
                <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 font-medium bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-800/50">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  Multi-Bank System
                </span>
              </div>
              <div className="flex items-center gap-2 mt-0.5 group">
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
                  {companyName}
                </h1>
                <button 
                  onClick={handleEditCompanyName}
                  className="p-1.5 text-corporate-300 hover:text-white hover:bg-corporate-800 rounded-lg opacity-0 group-hover:opacity-100 transition-all focus:opacity-100"
                  title="Ubah Nama Perusahaan"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <div className="hidden sm:flex items-center gap-2 bg-navy-900/80 border border-corporate-700/60 rounded-lg px-3 py-1.5 text-xs text-slate-300">
              <Calendar className="w-3.5 h-3.5 text-corporate-400" />
              <span>Hari ini: <strong className="text-white">{formatDateIndo(currentDate)}</strong></span>
            </div>

            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 text-xs font-semibold bg-corporate-800/90 hover:bg-corporate-700 border border-corporate-600/70 text-corporate-100 px-3 py-2 rounded-lg transition-all"
            >
              <Printer className="w-3.5 h-3.5 text-blue-300" />
              <span className="hidden sm:inline">Cetak PDF</span>
            </button>

            <button
              onClick={onResetData}
              className="flex items-center gap-1.5 text-xs font-semibold bg-slate-800/90 hover:bg-rose-900/60 border border-slate-700 hover:border-rose-700/60 text-slate-200 hover:text-rose-200 px-3 py-2 rounded-lg transition-all"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Reset Data</span>
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <nav className="flex space-x-1 py-3 overflow-x-auto">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-lg transition-colors whitespace-nowrap ${activeTab === 'dashboard' ? 'bg-corporate-700 text-white' : 'text-corporate-200 hover:bg-corporate-800'}`}
          >
            <LayoutDashboard className="w-4 h-4" /> Dashboard & Transaksi
          </button>
          <button
            onClick={() => setActiveTab('banks')}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-lg transition-colors whitespace-nowrap ${activeTab === 'banks' ? 'bg-corporate-700 text-white' : 'text-corporate-200 hover:bg-corporate-800'}`}
          >
            <Building className="w-4 h-4" /> Master Bank
          </button>
          <button
            onClick={() => setActiveTab('forecasts')}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-lg transition-colors whitespace-nowrap ${activeTab === 'forecasts' ? 'bg-corporate-700 text-white' : 'text-corporate-200 hover:bg-corporate-800'}`}
          >
            <Target className="w-4 h-4" /> Master Forecast
          </button>
        </nav>
      </div>
    </header>
  );
};
