import React from 'react';
import { 
  Building2, 
  Calendar, 
  RefreshCw, 
  Printer, 
  LayoutDashboard, 
  Building, 
  Target, 
  Edit3, 
  LogOut, 
  Users, 
  Shield, 
  Eye, 
  Briefcase,
  CloudCheck,
  CloudOff,
  Radio,
  BarChart3
} from 'lucide-react';
import { formatDateIndo } from '../utils/formatters';

export const Header = ({ 
  onResetData, 
  activeTab, 
  setActiveTab, 
  companyName, 
  setCompanyName,
  currentUser,
  onLogout,
  onOpenUserModal,
  syncStatus = 'connecting'
}) => {
  const currentDate = new Date().toISOString().split('T')[0];
  const isAdmin = currentUser?.role === 'admin';
  const isOperator = currentUser?.role === 'operator';
  const isViewer = currentUser?.role === 'viewer';

  const handleEditCompanyName = () => {
    if (isViewer) return;
    const newName = window.prompt('Ubah Nama Perusahaan:', companyName);
    if (newName && newName.trim()) {
      setCompanyName(newName.trim());
    }
  };

  return (
    <header className="bg-gradient-to-r from-navy-950 via-corporate-900 to-corporate-800 text-white shadow-xl sticky top-0 z-30">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-3.5 border-b border-corporate-700/50">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          
          {/* Logo & Company Name */}
          <div className="flex items-center space-x-3.5">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-corporate-500 to-blue-600 flex items-center justify-center shadow-lg shadow-corporate-900/40 border border-corporate-400/30 shrink-0">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center flex-wrap gap-1.5 sm:gap-2">
                <span className="text-xs font-bold tracking-widest uppercase bg-corporate-800/80 text-corporate-200 px-2.5 py-0.5 rounded-full border border-corporate-700/60">
                  Internal Finance
                </span>

                {/* Cloud Sync Status Badge */}
                {syncStatus === 'connected' && (
                  <span className="inline-flex items-center gap-1.5 text-[11px] text-emerald-300 font-semibold bg-emerald-950/80 px-2.5 py-0.5 rounded-full border border-emerald-600/50 shadow-xs">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    Cloud Sync Aktif
                  </span>
                )}
                {syncStatus === 'connecting' && (
                  <span className="inline-flex items-center gap-1.5 text-[11px] text-amber-300 font-semibold bg-amber-950/80 px-2.5 py-0.5 rounded-full border border-amber-600/50 shadow-xs">
                    <Radio className="w-3 h-3 text-amber-400 animate-spin" />
                    Menghubungkan Cloud...
                  </span>
                )}
                {syncStatus === 'error' && (
                  <span className="inline-flex items-center gap-1.5 text-[11px] text-rose-300 font-semibold bg-rose-950/80 px-2.5 py-0.5 rounded-full border border-rose-600/50 shadow-xs" title="Menggunakan data lokal di browser">
                    <CloudOff className="w-3 h-3 text-rose-400" />
                    Mode Offline
                  </span>
                )}
                
                {/* User Role Badge (3 Roles) */}
                {isAdmin && (
                  <span className="inline-flex items-center gap-1 text-[11px] text-emerald-300 font-semibold bg-emerald-950/80 px-2.5 py-0.5 rounded-full border border-emerald-700/60 shadow-xs">
                    <Shield className="w-3 h-3 text-emerald-400" />
                    Admin Keuangan
                  </span>
                )}
                {isOperator && (
                  <span className="inline-flex items-center gap-1 text-[11px] text-blue-300 font-semibold bg-blue-950/80 px-2.5 py-0.5 rounded-full border border-blue-700/60 shadow-xs">
                    <Briefcase className="w-3 h-3 text-blue-400" />
                    User Pemakai
                  </span>
                )}
                {isViewer && (
                  <span className="inline-flex items-center gap-1 text-[11px] text-amber-300 font-semibold bg-amber-950/80 px-2.5 py-0.5 rounded-full border border-amber-700/60 shadow-xs">
                    <Eye className="w-3 h-3 text-amber-400" />
                    User Review (Read-Only)
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 mt-0.5 group">
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
                  {companyName}
                </h1>
                {!isViewer && (
                  <button 
                    onClick={handleEditCompanyName}
                    className="p-1.5 text-corporate-300 hover:text-white hover:bg-corporate-800 rounded-lg opacity-0 group-hover:opacity-100 transition-all focus:opacity-100"
                    title="Ubah Nama Perusahaan"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons & User Menu */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
            <div className="hidden lg:flex items-center gap-2 bg-navy-900/80 border border-corporate-700/60 rounded-lg px-3 py-1.5 text-xs text-slate-300">
              <Calendar className="w-3.5 h-3.5 text-corporate-400" />
              <span>Hari ini: <strong className="text-white">{formatDateIndo(currentDate)}</strong></span>
            </div>

            

                        {/* Menu Kelola User: HANYA untuk Admin Tertinggi */}
            {isAdmin && (
              <button
                onClick={onOpenUserModal}
                className="flex items-center gap-1.5 text-xs font-semibold bg-corporate-800/90 hover:bg-corporate-700 border border-corporate-600/70 text-corporate-100 px-3 py-2 rounded-lg transition-all cursor-pointer"
                title="Kelola Akun, Nama Perusahaan & Reset Sistem"
              >
                <Users className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden sm:inline">Kelola User</span>
              </button>
            )}

            {/* User Profile Pill & Logout */}
            <div className="flex items-center gap-1 pl-1 border-l border-corporate-700/60">
              <div className="hidden sm:flex flex-col text-right px-2">
                <span className="text-xs font-bold text-slate-100 leading-tight">{currentUser?.name || 'User'}</span>
                <span className="text-[10px] text-corporate-300">{currentUser?.email}</span>
              </div>
              <button
                onClick={onLogout}
                className="flex items-center gap-1.5 text-xs font-semibold bg-rose-950/70 hover:bg-rose-900 border border-rose-800/60 text-rose-200 px-3 py-2 rounded-lg transition-all cursor-pointer"
                title="Keluar dari Akun"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Keluar</span>
              </button>
            </div>

          </div>
        </div>
      </div>

      {/* Navigation Tabs - User Pemakai & Admin can use all tabs */}
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
        <nav className="flex space-x-1 py-3 overflow-x-auto">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-lg transition-colors whitespace-nowrap cursor-pointer ${activeTab === 'dashboard' ? 'bg-corporate-700 text-white' : 'text-corporate-200 hover:bg-corporate-800'}`}
          >
            <LayoutDashboard className="w-4 h-4" /> Dashboard & Transaksi
          </button>
          
          <button
            onClick={() => setActiveTab('banks')}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-lg transition-colors whitespace-nowrap cursor-pointer ${activeTab === 'banks' ? 'bg-corporate-700 text-white' : 'text-corporate-200 hover:bg-corporate-800'}`}
          >
            <Building className="w-4 h-4" /> Master Bank & Kas {isViewer && <span className="text-[10px] opacity-70">(Lihat)</span>}
          </button>
          <button
            onClick={() => setActiveTab('forecasts')}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-lg transition-colors whitespace-nowrap cursor-pointer ${activeTab === 'forecasts' ? 'bg-corporate-700 text-white' : 'text-corporate-200 hover:bg-corporate-800'}`}
          >
            <Target className="w-4 h-4" /> Master Forecast {isViewer && <span className="text-[10px] opacity-70">(Lihat)</span>}
          </button>
          
          <button
            onClick={() => setActiveTab('analytics')}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-lg transition-colors whitespace-nowrap cursor-pointer ${activeTab === 'analytics' ? 'bg-corporate-700 text-white' : 'text-corporate-200 hover:bg-corporate-800'}`}
          >
            <BarChart3 className="w-4 h-4" /> Grafik & Analisis
          </button>
        </nav>
      </div>
    </header>
  );
};
