import React, { useState } from 'react';
import { Building2, Lock, Mail, Eye, EyeOff, AlertCircle, ArrowRight } from 'lucide-react';
import { DEFAULT_USERS } from '../data/users';

export function LoginPage({ onLogin, users = [], companyName = 'PT GRAHA PRIMA ENERGI' }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const activeUsers = (Array.isArray(users) && users.length > 0) ? users : DEFAULT_USERS;

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    const trimmedEmail = email.trim().toLowerCase();
    const trimmedPass = password.trim();

    const foundUser = activeUsers.find(
      u => u.email.trim().toLowerCase() === trimmedEmail && u.password.trim() === trimmedPass
    ) || DEFAULT_USERS.find(
      u => u.email.trim().toLowerCase() === trimmedEmail && u.password.trim() === trimmedPass
    );

    if (foundUser) {
      onLogin(foundUser);
    } else {
      setError('Email atau kata sandi tidak sesuai. Silakan periksa kembali kredensial Anda.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-navy-950 via-corporate-900 to-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
      
      {/* Background Decorative Circles */}
      <div className="absolute top-10 left-10 w-96 h-96 bg-corporate-600/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-10 right-10 w-72 h-72 bg-blue-500/10 rounded-full blur-2xl pointer-events-none"></div>

      <div className="max-w-md w-full relative z-10">
        
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-corporate-600 to-blue-500 shadow-xl shadow-corporate-900/60 border border-corporate-400/30 mb-4">
            <Building2 className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">{companyName}</h1>
          <p className="text-xs text-corporate-300 font-medium mt-1">Sistem Manajemen & Rekonsiliasi Arus Kas</p>
        </div>

        {/* Login Card */}
        <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-100 p-7 sm:p-8">
          
          <div className="mb-6 border-b border-slate-100 pb-4">
            <h2 className="text-lg font-bold text-slate-900">Masuk ke Portal Keuangan</h2>
            <p className="text-xs text-slate-500 mt-0.5">Silakan masukkan email dan kata sandi yang terdaftar.</p>
          </div>

          {error && (
            <div className="mb-5 p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-xs font-semibold text-rose-800">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Alamat Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nama@grahaenergi.com"
                  className="w-full pl-10 pr-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-corporate-500 focus:bg-white transition-all outline-none"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Kata Sandi
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-corporate-500 focus:bg-white transition-all outline-none"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-corporate-900 hover:bg-navy-950 text-white font-bold text-sm rounded-xl transition-all shadow-lg shadow-corporate-900/20 flex items-center justify-center gap-2 mt-2 cursor-pointer"
            >
              <span>Masuk Aplikasi</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

        </div>

        <div className="mt-6 text-center text-xs text-slate-400">
          Dilindungi Autentikasi Pengguna & Pembagian 3 Tingkat Hak Akses
        </div>

      </div>
    </div>
  );
}
