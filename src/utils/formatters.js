// Indonesian Currency & Date Formatting Utilities

export const formatRupiah = (value) => {
  if (value === null || value === undefined || isNaN(value)) return 'Rp 0';
  const rounded = Math.round(Number(value));
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(rounded);
};

export const parseRupiahInput = (str) => {
  if (typeof str === 'number') return str;
  if (!str) return 0;
  // Strip non-digits
  const clean = str.replace(/[^\d]/g, '');
  return clean ? parseInt(clean, 10) : 0;
};

export const formatDateIndo = (dateStr) => {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    }).format(d);
  } catch (e) {
    return dateStr;
  }
};
