import React, { useState } from 'react';
import { 
  Building2,
  Users, 
  X, 
  UserPlus, 
  Trash2, 
  ShieldCheck, 
  Eye, 
  Check, 
  AlertCircle, 
  Briefcase, 
  Edit2, 
  Save, 
  RotateCcw 
} from 'lucide-react';

export function UserManagementModal({
  isOpen,
  onClose,
  users = [],
  onAddUser,
  onUpdateUser,
  onDeleteUser,
  currentUserId,
  companyName = 'PT GRAHA PRIMA ENERGI',
  onUpdateCompanyName,
  onResetData,
  isAdmin = false
}) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('operator');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editingUserId, setEditingUserId] = useState(null);
  const [ptName, setPtName] = useState(companyName);
  const [ptSuccess, setPtSuccess] = useState('');

  // Keep ptName in sync when companyName prop changes
  React.useEffect(() => {
    setPtName(companyName);
  }, [companyName]);

  const handleSavePtName = (e) => {
    e.preventDefault();
    if (!ptName.trim()) return;
    if (onUpdateCompanyName) {
      onUpdateCompanyName(ptName.trim());
      setPtSuccess('Nama PT / Perusahaan berhasil disimpan & disinkronkan!');
      setTimeout(() => setPtSuccess(''), 3500);
    }
  };

  if (!isOpen) return null;

  const handleStartEdit = (user) => {
    setEditingUserId(user.id);
    setName(user.name);
    setEmail(user.email);
    setPassword(user.password);
    setRole(user.role);
    setError('');
    setSuccess('');
  };

  const handleCancelEdit = () => {
    setEditingUserId(null);
    setName('');
    setEmail('');
    setPassword('');
    setRole('operator');
    setError('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!name.trim() || !email.trim() || !password.trim()) {
      setError('Semua kolom wajib diisi.');
      return;
    }

    if (password.length < 6) {
      setError('Kata sandi minimal 6 karakter.');
      return;
    }

    const trimmedEmail = email.trim().toLowerCase();

    // In Edit Mode
    if (editingUserId) {
      const emailExists = users.some(u => u.id !== editingUserId && u.email.toLowerCase() === trimmedEmail);
      if (emailExists) {
        setError('Email tersebut sudah digunakan oleh akun lain.');
        return;
      }

      if (onUpdateUser) {
        onUpdateUser(editingUserId, {
          name: name.trim(),
          email: trimmedEmail,
          password: password.trim(),
          role
        });
      }

      setSuccess(`Akun ${name.trim()} berhasil diperbarui!`);
      handleCancelEdit();
      setTimeout(() => setSuccess(''), 3000);
      return;
    }

    // In Add Mode
    const emailExists = users.some(u => u.email.toLowerCase() === trimmedEmail);
    if (emailExists) {
      setError('Email sudah terdaftar. Gunakan email lain.');
      return;
    }

    const newUser = {
      id: `user-${Date.now()}`,
      name: name.trim(),
      email: trimmedEmail,
      password: password.trim(),
      role,
      createdAt: new Date().toISOString()
    };

    onAddUser(newUser);
    setSuccess(`Akun ${name.trim()} berhasil didaftarkan!`);
    setName('');
    setEmail('');
    setPassword('');
    setRole('operator');
    setTimeout(() => setSuccess(''), 3000);
  };

  const getRoleBadge = (userRole) => {
    switch (userRole) {
      case 'admin':
        return {
          label: 'Admin (Penuh)',
          classes: 'bg-emerald-100 text-emerald-800 border-emerald-300',
          icon: <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />,
          iconBg: 'bg-emerald-50 text-emerald-700'
        };
      case 'operator':
        return {
          label: 'User Pemakai',
          classes: 'bg-blue-100 text-blue-800 border-blue-300',
          icon: <Briefcase className="w-3.5 h-3.5 text-blue-600" />,
          iconBg: 'bg-blue-50 text-blue-700'
        };
      case 'viewer':
      default:
        return {
          label: 'User Review',
          classes: 'bg-amber-100 text-amber-800 border-amber-300',
          icon: <Eye className="w-3.5 h-3.5 text-amber-600" />,
          iconBg: 'bg-amber-50 text-amber-700'
        };
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 max-w-2xl w-full overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-corporate-900 to-corporate-800 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center">
              <Users className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-base leading-tight">Kelola Akun & Pengaturan PT</h3>
              <p className="text-xs text-corporate-200 mt-0.5">Atur nama perusahaan, kredensial login, dan hak akses pengguna</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-corporate-200 hover:text-white hover:bg-white/10 rounded-lg transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          
          {/* Pengaturan Nama Perusahaan / PT */}
          <div className="p-4 rounded-xl border border-corporate-200 bg-gradient-to-br from-corporate-50/70 via-white to-blue-50/40 shadow-xs">
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-corporate-800 text-white flex items-center justify-center shadow-xs">
                  <Building2 className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 flex items-center gap-2">
                    <span>Nama Perusahaan / PT</span>
                    <span className="text-[10px] bg-corporate-100 text-corporate-800 font-semibold px-2 py-0.5 rounded-full">Kop Laporan & Header</span>
                  </h4>
                  <p className="text-[11px] text-slate-500">Nama ini otomatis tampil pada header portal, halaman login, dan kop cetak laporan PDF.</p>
                </div>
              </div>
              {ptSuccess && (
                <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg flex items-center gap-1 animate-fade-in shadow-xs">
                  <Check className="w-3.5 h-3.5 text-emerald-600" /> Tersimpan!
                </span>
              )}
            </div>

            <form onSubmit={handleSavePtName} className="flex flex-col sm:flex-row gap-2 mt-3">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={ptName}
                  onChange={(e) => setPtName(e.target.value)}
                  placeholder="Contoh: PT GRAHA PRIMA ENERGI"
                  className="w-full px-3.5 py-2 text-xs font-bold bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-corporate-500 focus:border-corporate-500 outline-none uppercase tracking-wide text-slate-900 shadow-2xs"
                  required
                />
              </div>
              <button
                type="submit"
                className="px-4 py-2 bg-corporate-800 hover:bg-corporate-900 text-white font-bold text-xs rounded-lg transition-all flex items-center justify-center gap-1.5 shadow-sm cursor-pointer whitespace-nowrap active:scale-[0.98]"
              >
                <Save className="w-3.5 h-3.5" /> Simpan Nama PT
              </button>
            </form>
          </div>
          
          {/* Form Tambah / Edit Akun */}
          <div className={`p-4 rounded-xl border transition-all ${editingUserId ? 'bg-amber-50/60 border-amber-300' : 'bg-slate-50 border-slate-200'}`}>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                {editingUserId ? (
                  <>
                    <Edit2 className="w-4 h-4 text-amber-600" />
                    <span>Mode Edit Akun Pengguna</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4 text-corporate-700" />
                    <span>Tambah Akun Pengguna Baru</span>
                  </>
                )}
              </h4>
              {editingUserId && (
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="text-xs font-bold text-amber-800 hover:text-amber-950 flex items-center gap-1 bg-amber-200/70 hover:bg-amber-200 px-2.5 py-1 rounded-lg cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Batal Edit
                </button>
              )}
            </div>

            {error && (
              <div className="mb-3 p-2 bg-rose-50 border border-rose-200 rounded-lg text-xs font-semibold text-rose-700 flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{error}</span>
              </div>
            )}
            {success && (
              <div className="mb-3 p-2 bg-emerald-50 border border-emerald-200 rounded-lg text-xs font-semibold text-emerald-700 flex items-center gap-1.5">
                <Check className="w-4 h-4" /> {success}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Nama Lengkap / Instansi</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Contoh: Budi Santoso (Finance)"
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-corporate-500 outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Email Login</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="budi@grahaenergi.com"
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-corporate-500 outline-none"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Kata Sandi</label>
                  <input
                    type="text"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimal 6 karakter"
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-corporate-500 outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Tingkat Hak Akses (Role)</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-semibold bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-corporate-500 outline-none cursor-pointer"
                  >
                    <option value="operator">💼 User Pemakai (Bisa Buka Semua Menu Kecuali Kelola User)</option>
                    <option value="viewer">👁️ User Review (Akses Terbatas / Read-Only)</option>
                    <option value="admin">👑 Administrator (Akses Penuh Termasuk Kelola User)</option>
                  </select>
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-blue-50/70 border border-blue-200/80 text-[11px] text-blue-900">
                {role === 'operator' && (
                  <span><strong>Hak Akses User Pemakai:</strong> Dapat mencatat mutasi, mengelola master bank, target forecast, import/export excel, namun <u>tidak dapat mengakses menu Kelola User</u>.</span>
                )}
                {role === 'viewer' && (
                  <span><strong>Hak Akses User Review:</strong> Hanya dapat meninjau dashboard, saldo, tabel rekonsiliasi, dan cetak PDF. Fitur input/edit/hapus dinonaktifkan.</span>
                )}
                {role === 'admin' && (
                  <span><strong>Hak Akses Administrator:</strong> Akses penuh ke seluruh fitur, pengaturan perusahaan, reset data, serta menu <u>Kelola Pengguna</u>.</span>
                )}
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  className={`flex-1 py-2.5 text-white font-bold text-xs rounded-lg transition-all flex items-center justify-center gap-1.5 shadow-sm cursor-pointer ${editingUserId ? 'bg-amber-700 hover:bg-amber-800' : 'bg-corporate-800 hover:bg-corporate-900'}`}
                >
                  {editingUserId ? (
                    <>
                      <Save className="w-3.5 h-3.5" /> Simpan Perubahan Akun
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-3.5 h-3.5" /> Daftarkan Akun
                    </>
                  )}
                </button>
                {editingUserId && (
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="px-4 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs rounded-lg transition-all cursor-pointer"
                  >
                    Batal
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* Daftar Akun Terdaftar */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-3 flex items-center justify-between">
              <span>Daftar Akun Terdaftar ({users.length})</span>
              <span className="text-[10px] text-slate-400 font-normal">Kredensial tersinkron otomatis ke Firebase</span>
            </h4>

            <div className="space-y-2">
              {users.map((u) => {
                const isCurrentUser = u.id === currentUserId;
                const isBeingEdited = u.id === editingUserId;
                const badge = getRoleBadge(u.role);

                return (
                  <div
                    key={u.id}
                    className={`p-3 bg-white border rounded-xl flex items-center justify-between gap-3 shadow-xs transition-all ${isBeingEdited ? 'border-amber-400 bg-amber-50/40 ring-2 ring-amber-200' : 'border-slate-200/90 hover:border-slate-300'}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold ${badge.iconBg}`}>
                        {badge.icon}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-900">{u.name}</span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${badge.classes}`}>
                            {badge.label}
                          </span>
                          {isCurrentUser && (
                            <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded font-semibold">
                              Anda
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                          <span>{u.email}</span>
                          <span>•</span>
                          <span className="font-mono bg-slate-100 px-1 rounded text-slate-600">pass: {u.password}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      {/* Tombol Edit Akun */}
                      <button
                        onClick={() => handleStartEdit(u)}
                        className="p-1.5 text-slate-400 hover:text-corporate-700 hover:bg-corporate-50 rounded-lg transition-all cursor-pointer"
                        title="Edit Akun Pengguna"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>

                      {/* Tombol Hapus Akun */}
                      {!isCurrentUser && u.email !== 'admin@grahaenergi.com' && (
                        <button
                          onClick={() => {
                            if (window.confirm(`Hapus akun "${u.name}" (${u.email})?`)) {
                              onDeleteUser(u.id);
                              if (editingUserId === u.id) handleCancelEdit();
                            }
                          }}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all cursor-pointer"
                          title="Hapus Akun"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

                {/* Zona Khusus Admin: Reset Seluruh Data Sistem ke 0 */}
        {isAdmin && onResetData && (
          <div className="px-6 py-4 bg-rose-50/80 border-t border-rose-200">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center shrink-0 mt-0.5">
                  <RotateCcw className="w-4 h-4 text-rose-600" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-rose-950 uppercase tracking-wider">
                    Zona Khusus Admin Tertinggi: Reset Seluruh Data ke 0
                  </h4>
                  <p className="text-[11px] text-rose-700 leading-relaxed mt-0.5">
                    Mereset semua data transaksi, mutasi kas, rencana forecast, dan saldo awal ke 0. Tindakan ini memerlukan konfirmasi keamanan.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  const confirmed = window.confirm(
                    'PERINGATAN TINGKAT TINGGI:\n\nApakah Anda yakin ingin mereset seluruh data transaksi, rencana forecast, dan saldo ke 0?\n\nSemua catatan mutasi kas akan dihapus permanen. Tindakan ini TIDAK DAPAT dibatalkan.'
                  );
                  if (confirmed) {
                    onResetData();
                    onClose();
                  }
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 shrink-0"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Data ke 0</span>
              </button>
            </div>
          </div>
        )}

        {/* Modal Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer"
          >
            Tutup
          </button>
        </div>

      </div>
    </div>
  );
}
