/**
 * Transaction Helper Utilities
 * Mutasi antar bank/kas adalah pemindahan dana internal, bukan pemasukan atau pengeluaran operasional.
 */

export const isTransferTransaction = (t) => {
  if (!t) return false;
  if (t.isTransfer === true || t.tipe === 'transfer' || t.tipe === 'transfer_masuk' || t.tipe === 'transfer_keluar') {
    return true;
  }
  if (typeof t.deskripsi === 'string') {
    if (t.deskripsi.startsWith('Transfer Keluar ke [') || t.deskripsi.startsWith('Transfer Masuk dari [')) {
      return true;
    }
  }
  return false;
};

export const getTransferDirection = (t) => {
  if (t.transferDirection === 'in' || t.tipe === 'transfer_masuk') return 'in';
  if (t.transferDirection === 'out' || t.tipe === 'transfer_keluar') return 'out';
  if (typeof t.deskripsi === 'string') {
    if (t.deskripsi.startsWith('Transfer Masuk dari [')) return 'in';
    if (t.deskripsi.startsWith('Transfer Keluar ke [')) return 'out';
  }
  return t.tipe === 'pemasukan' ? 'in' : 'out';
};

// Pemasukan murni perusahaan (bukan transfer antar bank)
export const isOperationalIncome = (t) => {
  if (isTransferTransaction(t)) return false;
  return t.tipe === 'pemasukan';
};

// Pengeluaran murni perusahaan (bukan transfer antar bank)
export const isOperationalExpense = (t) => {
  if (isTransferTransaction(t)) return false;
  return t.tipe === 'pengeluaran';
};

// Klasifikasi Akun Kas vs Akun Bank (Mendukung legacy data tanpa tipeAkun)
export const isKasAccount = (acc) => {
  if (!acc) return false;
  if (acc.tipeAkun === 'kas') return true;
  if (acc.tipeAkun === 'bank') return false;
  
  const name = String(acc.name || '').trim().toLowerCase();
  const id = String(acc.id || '').trim().toLowerCase();
  return (
    name === 'kas' ||
    name.startsWith('kas ') ||
    name.includes(' kas') ||
    name.includes('petty') ||
    name.includes('tunai') ||
    id.startsWith('kas-')
  );
};
