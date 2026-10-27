// Indonesian Currency & Date Formatting Utilities (2 Decimals Support)

export const formatRupiah = (value) => {
  if (value === null || value === undefined || isNaN(value)) return 'Rp 0,00';
  const num = Number(value);
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
};

export const formatNominalInput = (raw) => {
  if (raw === null || raw === undefined) return '';

  let isNegative = false;
  let intPart = '';
  let decPart = null;

  if (typeof raw === 'number') {
    if (isNaN(raw)) return '';
    isNegative = raw < 0;
    const parts = String(Math.abs(raw)).split('.');
    intPart = parts[0];
    decPart = parts[1] ? parts[1].slice(0, 2) : null;
  } else {
    let str = String(raw).trim();
    if (str === '') return '';

    // Remove currency prefix and characters
    str = str.replace(/Rp\s?/gi, '').trim();
    if (!str) return '';

    isNegative = str.startsWith('-');
    if (isNegative) str = str.slice(1);

    // Desimal HANYA diubah secara manual jika pengguna mengetik tanda koma ','
    // Titik '.' selalu diperlakukan sebagai pemisah ribuan, tidak pernah otomatis jadi desimal
    if (str.includes(',')) {
      const parts = str.split(',');
      intPart = parts[0].replace(/\D/g, '');
      decPart = parts.slice(1).join('').replace(/\D/g, '').slice(0, 2);
    } else {
      intPart = str.replace(/\D/g, '');
    }
  }

  if (!intPart && decPart === null) return '';

  const formattedInt = intPart ? new Intl.NumberFormat('id-ID').format(Number(intPart)) : '0';
  const prefix = isNegative ? '-' : '';

  if (decPart !== null) {
    return `${prefix}${formattedInt},${decPart}`;
  }
  return `${prefix}${formattedInt}`;
};

export const parseRupiahInput = (str) => {
  if (typeof str === 'number') return isNaN(str) ? 0 : Math.round(str * 100) / 100;
  if (!str) return 0;
  let s = String(str).trim();
  s = s.replace(/Rp\s?/gi, '').trim();

  let isNegative = s.startsWith('-');
  if (isNegative) s = s.slice(1);

  let val = 0;
  if (s.includes(',')) {
    const parts = s.split(',');
    const intPart = parts[0].replace(/\D/g, '') || '0';
    const decPart = parts.slice(1).join('').replace(/\D/g, '').slice(0, 2) || '0';
    val = parseFloat(`${intPart}.${decPart}`);
  } else {
    const intPart = s.replace(/\D/g, '') || '0';
    val = parseInt(intPart, 10);
  }

  if (isNaN(val)) return 0;
  if (isNegative) val = -val;
  return Math.round(val * 100) / 100;
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

export const formatMonthIndo = (monthStr) => {
  if (!monthStr) return '-';
  try {
    const [year, month] = monthStr.split('-');
    const d = new Date(Number(year), parseInt(month, 10) - 1, 1);
    return new Intl.DateTimeFormat('id-ID', {
      month: 'long',
      year: 'numeric'
    }).format(d);
  } catch (e) {
    return monthStr;
  }
};
