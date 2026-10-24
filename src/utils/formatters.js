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
  let str = String(raw).trim();
  if (str === '') return '';

  // Remove currency prefix or letters, keep digits, dot, comma, minus
  str = str.replace(/Rp\s?/gi, '').replace(/[^\d.,-]/g, '');
  if (!str) return '';

  let isNegative = str.startsWith('-');
  if (isNegative) str = str.slice(1);

  let intPart = '';
  let decPart = null;

  if (str.includes(',')) {
    const parts = str.split(',');
    intPart = parts[0].replace(/\D/g, '');
    decPart = parts.slice(1).join('').replace(/\D/g, '').slice(0, 2);
  } else if (str.includes('.')) {
    if (str.endsWith('.')) {
      intPart = str.slice(0, -1).replace(/\D/g, '');
      decPart = '';
    } else {
      const parts = str.split('.');
      if (parts.length === 2 && parts[1].length <= 2) {
        intPart = parts[0].replace(/\D/g, '');
        decPart = parts[1].replace(/\D/g, '').slice(0, 2);
      } else {
        intPart = str.replace(/\D/g, '');
      }
    }
  } else {
    intPart = str.replace(/\D/g, '');
  }

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

  if (s.includes('.') && s.includes(',')) {
    if (s.lastIndexOf(',') > s.lastIndexOf('.')) {
      // Indonesian format: 1.000.000,50 -> remove dots, replace comma with dot
      s = s.replace(/\./g, '').replace(',', '.');
    } else {
      // US format: 1,000,000.50 -> remove commas
      s = s.replace(/,/g, '');
    }
  } else if (s.includes(',')) {
    if (/,\d{1,2}$/.test(s)) {
      s = s.replace(',', '.');
    } else {
      s = s.replace(/,/g, '');
    }
  } else if (s.includes('.')) {
    if (/\.\d{3}$/.test(s) && !/\.\d{1,2}$/.test(s)) {
      s = s.replace(/\./g, '');
    }
  }

  s = s.replace(/[^0-9.]/g, '');
  let val = parseFloat(s);
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
