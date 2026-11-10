import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';

// Format Rupiah akuntansi Excel resmi dengan 2 angka di belakang koma
const CURRENCY_NUM_FMT = '"Rp "#,##0.00;[Red]("-Rp "#,##0.00);"-"';

/**
 * Menghitung panjang karakter tampilan Rupiah (dengan 2 angka di belakang koma)
 */
function getFormattedCurrencyLen(val) {
  const num = Number(val) || 0;
  if (num === 0) return 3; // "-"
  const formatted = new Intl.NumberFormat('id-ID', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(Math.abs(num));
  return formatted.length + (num < 0 ? 4 : 3); // "Rp " atau "-Rp "
}

/**
 * Menyesuaikan ukuran font secara proporsional berdasarkan panjang teks/nominal agar tidak tertumpuk atau terpotong
 */
function getAdaptiveFontSize(charLen, baseSize = 9.5, minSize = 7.5) {
  if (charLen >= 25) return Math.max(minSize, baseSize - 2);
  if (charLen >= 21) return Math.max(minSize, baseSize - 1.5);
  if (charLen >= 17) return Math.max(minSize, baseSize - 0.5);
  return baseSize;
}

/**
 * Menentukan rentang penggabungan kolom untuk 4 kartu ringkasan agar proporsional dan tidak menumpuk di kolom sempit
 */
function getSummaryCardRanges(colCount) {
  if (colCount >= 10) return [[1, 3], [4, 5], [6, 7], [8, colCount]];
  if (colCount === 9) return [[1, 3], [4, 5], [6, 7], [8, 9]];
  if (colCount === 8) return [[1, 2], [3, 4], [5, 6], [7, 8]];
  if (colCount === 7) return [[1, 3], [4, 4], [5, 5], [6, 7]];
  if (colCount === 6) return [[1, 2], [3, 3], [4, 5], [6, 6]];
  if (colCount === 5) return [[1, 2], [3, 3], [4, 4], [5, 5]];
  return [[1, 1], [2, 2], [3, 3], [4, 4]].filter(([s]) => s <= colCount);
}

/**
 * Merender 4 kartu ringkasan KPI secara rapi dan proporsional melintasi lebar tabel
 */
function renderSummaryCards(worksheet, summaryCards, colCount) {
  const rowSummaryLabel = worksheet.addRow([]);
  const rowSummaryVal = worksheet.addRow([]);
  rowSummaryLabel.height = 20;
  rowSummaryVal.height = 25;

  const ranges = getSummaryCardRanges(colCount);

  summaryCards.forEach((card, idx) => {
    const range = ranges[idx];
    if (!range) return;
    const [startCol, endCol] = range;

    if (endCol > startCol) {
      worksheet.mergeCells(rowSummaryLabel.number, startCol, rowSummaryLabel.number, endCol);
      worksheet.mergeCells(rowSummaryVal.number, startCol, rowSummaryVal.number, endCol);
    }

    const isCurrency = card.isCurrency !== false;
    const valLen = isCurrency ? getFormattedCurrencyLen(card.val) : String(card.val || '').length;
    const valFontSize = getAdaptiveFontSize(valLen, 10, 8);

    for (let c = startCol; c <= endCol; c++) {
      const lblCell = rowSummaryLabel.getCell(c);
      lblCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
      lblCell.border = {
        top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        left: c === startCol ? { style: 'thin', color: { argb: 'FFCBD5E1' } } : undefined,
        right: c === endCol ? { style: 'thin', color: { argb: 'FFCBD5E1' } } : undefined
      };

      const vCell = rowSummaryVal.getCell(c);
      vCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
      vCell.border = {
        bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        left: c === startCol ? { style: 'thin', color: { argb: 'FFCBD5E1' } } : undefined,
        right: c === endCol ? { style: 'thin', color: { argb: 'FFCBD5E1' } } : undefined
      };
    }

    const cellLabel = rowSummaryLabel.getCell(startCol);
    cellLabel.value = card.label;
    cellLabel.font = { name: 'Segoe UI', size: 8.5, color: { argb: 'FF64748B' }, bold: true };
    cellLabel.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true, shrinkToFit: true };

    const cellVal = rowSummaryVal.getCell(startCol);
    if (isCurrency) {
      cellVal.value = Number(card.val) || 0;
      cellVal.numFmt = CURRENCY_NUM_FMT;
    } else {
      cellVal.value = card.val;
    }
    cellVal.font = { name: 'Segoe UI', size: valFontSize, bold: true, color: { argb: card.color } };
    cellVal.alignment = { horizontal: 'center', vertical: 'middle', shrinkToFit: true };
  });
}

/**
 * Menghitung dan menerapkan lebar kolom otomatis sesuai skala data (termasuk angka desimal 2 digit)
 */
function applyAutoColumnWidths(worksheet, columns, rows, grandTotal = {}) {
  columns.forEach((col, idx) => {
    let maxLen = Math.max(col.width || 14, String(col.label || '').length + 4);

    if (col.isNumeric) {
      rows.forEach(r => {
        const len = getFormattedCurrencyLen(r[col.key]) + 4;
        if (len > maxLen) maxLen = len;
      });
      if (grandTotal && grandTotal[col.key] !== undefined) {
        const gtLen = getFormattedCurrencyLen(grandTotal[col.key]) + 5;
        if (gtLen > maxLen) maxLen = gtLen;
      }
      worksheet.getColumn(idx + 1).width = Math.min(Math.max(maxLen, 22), 36);
    } else if (col.wrapText) {
      worksheet.getColumn(idx + 1).width = col.width || 46;
    } else {
      rows.forEach(r => {
        const valStr = r[col.key] !== undefined && r[col.key] !== null ? String(r[col.key]) : '';
        const firstLine = valStr.split('\n')[0] || '';
        if (firstLine.length + 4 > maxLen) {
          maxLen = firstLine.length + 4;
        }
      });
      worksheet.getColumn(idx + 1).width = Math.min(Math.max(maxLen, col.width || 14), 42);
    }
  });
}

/**
 * Memicu unduhan berkas Excel (.xlsx) dari buffer ExcelJS
 */
async function triggerExcelDownload(workbook, fileName) {
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName.endsWith('.xlsx') ? fileName : `${fileName}.xlsx`;
  anchor.click();
  window.URL.revokeObjectURL(url);
}

/**
 * Mengecek apakah sebuah nama kolom merupakan kolom nominal / jumlah uang
 */
function isAmountColumnKey(key) {
  const lower = String(key || '').toLowerCase();
  if (/(^no$|jumlah|count|tx|kode|periode|tanggal|status|persen|%)/.test(lower)) {
    return false;
  }
  return /(rp|nominal|saldo|pemasukan|pengeluaran|masuk|keluar|selisih|net|target|realisasi|amount|total)/.test(lower);
}

/**
 * Downloads data array of objects as an Excel (.xlsx) file dengan styling rapi & format 2 angka di belakang koma
 */
export async function downloadExcel(data, fileName = 'Template.xlsx', sheetName = 'Sheet1') {
  if (!data || data.length === 0) return;

  const keys = Object.keys(data[0] || {});
  const workbook = new ExcelJS.Workbook();
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet(sheetName, {
    pageSetup: {
      orientation: 'landscape',
      paperSize: 9,
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0
    },
    views: [{ showGridLines: true }]
  });

  // Header
  const headerRow = worksheet.addRow(keys);
  headerRow.height = 28;
  keys.forEach((key, idx) => {
    const cell = headerRow.getCell(idx + 1);
    const isAmt = isAmountColumnKey(key);
    cell.font = { name: 'Segoe UI', size: 9.5, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } };
    cell.alignment = { horizontal: isAmt ? 'right' : 'center', vertical: 'middle', wrapText: true };
    cell.border = {
      top: { style: 'medium', color: { argb: 'FF334155' } },
      bottom: { style: 'medium', color: { argb: 'FF334155' } },
      left: { style: 'thin', color: { argb: 'FF334155' } },
      right: { style: 'thin', color: { argb: 'FF334155' } }
    };
  });

  // Data rows
  const colMaxLen = keys.map(k => Math.max(k.length + 4, 14));

  data.forEach((rowObj, rowIdx) => {
    const isOdd = rowIdx % 2 !== 0;
    const bgArgb = isOdd ? 'FFF8FAFC' : 'FFFFFFFF';
    const values = keys.map(k => rowObj[k] !== undefined && rowObj[k] !== null ? rowObj[k] : '');
    const row = worksheet.addRow(values);
    row.height = 21;

    keys.forEach((key, colIdx) => {
      const cell = row.getCell(colIdx + 1);
      const rawVal = rowObj[key];
      const isAmtCol = isAmountColumnKey(key);
      const isNumericVal = typeof rawVal === 'number' && !isNaN(rawVal);

      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgArgb } };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
      };

      if (isAmtCol && isNumericVal) {
        const len = getFormattedCurrencyLen(rawVal);
        if (len + 4 > colMaxLen[colIdx]) colMaxLen[colIdx] = len + 4;
        cell.numFmt = '#,##0.00;[Red]-#,##0.00;"-"';
        cell.font = { name: 'Segoe UI', size: getAdaptiveFontSize(len, 9.5, 7.5), color: { argb: 'FF0F172A' } };
        cell.alignment = { horizontal: 'right', vertical: 'middle', shrinkToFit: true };
      } else {
        const strVal = rawVal !== undefined && rawVal !== null ? String(rawVal) : '';
        if (strVal.length + 4 > colMaxLen[colIdx]) colMaxLen[colIdx] = Math.min(strVal.length + 4, 44);
        const isCenter = /^(no|kode|periode|tanggal|status|tipe|persen|%)/i.test(key);
        cell.font = { name: 'Segoe UI', size: getAdaptiveFontSize(strVal.length, 9.5, 8), color: { argb: 'FF1E293B' } };
        cell.alignment = {
          horizontal: isNumericVal ? 'right' : isCenter ? 'center' : 'left',
          vertical: 'middle',
          wrapText: strVal.length > 35,
          shrinkToFit: strVal.length <= 35
        };
      }
    });
  });

  // Set auto-fit column widths
  keys.forEach((key, idx) => {
    const minW = isAmountColumnKey(key) ? 20 : 12;
    worksheet.getColumn(idx + 1).width = Math.min(Math.max(colMaxLen[idx], minW), 44);
  });

  await triggerExcelDownload(workbook, fileName);
}

/**
 * Exports a professionally styled Excel report identical in appearance and color scheme to the Cash Report PDF
 */
export async function exportStyledCashReport({
  companyName = 'PT GRAHA PRIMA ENERGI',
  reportTitle = 'LAPORAN MUTASI ARUS KAS',
  metadata = {},
  summary = {},
  columns = [],
  rows = [],
  grandTotal = {},
  fileName = 'Laporan_Kas.xlsx'
}) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = companyName || 'PT Graha Prima Energi';
  workbook.lastModifiedBy = metadata?.dicetakOleh || 'Staff Finance';
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet('Laporan Kas', {
    pageSetup: {
      orientation: 'landscape',
      paperSize: 9, // A4
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0
    },
    views: [{ showGridLines: true }]
  });

  const colCount = Math.max(columns.length, 6);

  // 1. Spacing row
  worksheet.addRow([]);

  // 2. Company Name Header
  const rowCompany = worksheet.addRow([companyName.toUpperCase()]);
  worksheet.mergeCells(rowCompany.number, 1, rowCompany.number, colCount);
  rowCompany.getCell(1).font = { name: 'Segoe UI', size: 14, bold: true, color: { argb: 'FF0F172A' } };
  rowCompany.getCell(1).alignment = { horizontal: 'left', vertical: 'middle' };
  rowCompany.height = 24;

  // 3. Report Title Header
  const rowTitle = worksheet.addRow([reportTitle]);
  worksheet.mergeCells(rowTitle.number, 1, rowTitle.number, colCount);
  rowTitle.getCell(1).font = { name: 'Segoe UI', size: 11, bold: true, color: { argb: 'FF1E293B' } };
  rowTitle.getCell(1).alignment = { horizontal: 'left', vertical: 'middle' };
  rowTitle.height = 20;

  // 4. Metadata details
  const metaText = `Periode: ${metadata.periode || '-'}   •   Tipe Mutasi: ${metadata.tipeMutasi || '-'}   •   Urutan Keterangan: ${metadata.urutanKeterangan || '-'}   •   Format: ${metadata.format || '-'}`;
  const rowMeta = worksheet.addRow([metaText]);
  worksheet.mergeCells(rowMeta.number, 1, rowMeta.number, colCount);
  rowMeta.getCell(1).font = { name: 'Segoe UI', size: 9, italic: true, color: { argb: 'FF475569' } };
  rowMeta.getCell(1).alignment = { horizontal: 'left', vertical: 'middle' };
  rowMeta.height = 18;

  // 5. Print & Auditor Info
  const printText = `Tanggal Cetak: ${metadata.tanggalCetak || '-'}   •   Waktu: ${metadata.waktu || '-'} WIB   •   Dicetak Oleh: ${metadata.dicetakOleh || 'Staff Finance'}   •   Format: A4 Landscape`;
  const rowPrint = worksheet.addRow([printText]);
  worksheet.mergeCells(rowPrint.number, 1, rowPrint.number, colCount);
  rowPrint.getCell(1).font = { name: 'Segoe UI', size: 8.5, color: { argb: 'FF64748B' } };
  rowPrint.getCell(1).alignment = { horizontal: 'left', vertical: 'middle' };
  rowPrint.height = 16;

  // 6. Blank spacing
  worksheet.addRow([]);

  // 7 & 8. Mini Summary Cards (Merged spans agar tidak menumpuk)
  renderSummaryCards(worksheet, [
    { label: 'Total Mutasi Transaksi:', val: summary.totalTransaksi || 0, color: 'FF0F172A', isCurrency: true },
    { label: 'Total Pemasukan:', val: summary.pemasukan || 0, color: 'FF047857', isCurrency: true },
    { label: 'Total Pengeluaran:', val: summary.pengeluaran || 0, color: 'FFBE123C', isCurrency: true },
    { label: 'Net Mutasi:', val: summary.netMutasi || 0, color: (summary.netMutasi || 0) >= 0 ? 'FF047857' : 'FFBE123C', isCurrency: true }
  ], colCount);

  // 9. Blank spacing
  worksheet.addRow([]);

  // 10. Table Headers
  const headerValues = columns.map(c => c.label);
  const rowHeader = worksheet.addRow(headerValues);
  rowHeader.height = 30;

  columns.forEach((col, idx) => {
    const cell = rowHeader.getCell(idx + 1);
    const bgArgb = col.headerColor || 'FF0F172A';
    cell.font = { name: 'Segoe UI', size: 9, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.alignment = { horizontal: col.align || 'left', vertical: 'middle', wrapText: true };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgArgb } };
    cell.border = {
      top: { style: 'medium', color: { argb: 'FF334155' } },
      bottom: { style: 'medium', color: { argb: 'FF334155' } },
      left: { style: 'thin', color: { argb: 'FF334155' } },
      right: { style: 'thin', color: { argb: 'FF334155' } }
    };
  });

  // Auto-calculate widths before rendering rows so wrap calculation is accurate
  applyAutoColumnWidths(worksheet, columns, rows, grandTotal);

  // 11. Data Rows
  rows.forEach((r, rowIdx) => {
    const isOdd = rowIdx % 2 !== 0;
    const bgArgb = isOdd ? 'FFF8FAFC' : 'FFFFFFFF';

    const rowData = columns.map(col => {
      const val = r[col.key];
      if (col.isNumeric) {
        return Number(val) || 0;
      }
      return val !== undefined && val !== null ? val : '';
    });

    const row = worksheet.addRow(rowData);
    let estimatedLineCount = 1;

    columns.forEach((col, colIdx) => {
      const cell = row.getCell(colIdx + 1);
      const colWidth = worksheet.getColumn(colIdx + 1).width || col.width || 18;
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgArgb } };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
      };

      if (col.isNumeric) {
        const valNum = Number(r[col.key]) || 0;
        const formattedLen = getFormattedCurrencyLen(valNum);
        cell.numFmt = CURRENCY_NUM_FMT;
        cell.font = {
          name: 'Segoe UI',
          size: getAdaptiveFontSize(formattedLen, 9, 7.5),
          bold: col.bold || false,
          color: { argb: col.fontColor || 'FF0F172A' }
        };
        cell.alignment = { horizontal: col.align || 'right', vertical: 'top', shrinkToFit: true };
      } else if (col.key === 'no') {
        cell.font = { name: 'Segoe UI', size: 9, color: { argb: 'FF64748B' } };
        cell.alignment = { horizontal: 'center', vertical: 'top', shrinkToFit: true };
      } else if (col.key === 'tanggal') {
        cell.font = { name: 'Segoe UI', size: 9, bold: true, color: { argb: 'FF1E293B' } };
        cell.alignment = { horizontal: 'center', vertical: 'top', shrinkToFit: true };
      } else if (col.key === 'keterangan') {
        const val = r[col.key];
        let textVal = '';
        if (val && typeof val === 'object' && val.richText) {
          cell.value = val;
          textVal = val.richText.map(t => t.text).join('');
        } else {
          cell.font = { name: 'Segoe UI', size: 8.5, italic: true, color: { argb: 'FF334155' } };
          textVal = String(cell.value || '');
        }
        cell.alignment = { horizontal: 'left', vertical: 'top', wrapText: true };

        const lines = textVal.split('\n');
        let wrappedTotal = 0;
        const usableCols = Math.max(colWidth - 4, 24);
        lines.forEach(line => {
          wrappedTotal += Math.max(1, Math.ceil(line.length / usableCols));
        });
        if (wrappedTotal > estimatedLineCount) estimatedLineCount = wrappedTotal;
      } else {
        const strVal = String(r[col.key] || '');
        cell.font = { name: 'Segoe UI', size: getAdaptiveFontSize(strVal.length, 9, 7.5), color: { argb: 'FF1E293B' } };
        cell.alignment = { horizontal: col.align || 'left', vertical: 'top', wrapText: true };
      }
    });

    row.height = Math.max(22, Math.min(estimatedLineCount * 14 + 8, 220));
  });

  // 12. Grand Total Row
  const totalRowData = columns.map(col => {
    if (col.key === 'tanggal') return 'GRAND TOTAL';
    if (col.isNumeric && grandTotal[col.key] !== undefined) {
      return Number(grandTotal[col.key]) || 0;
    }
    return '';
  });

  const rowTotal = worksheet.addRow(totalRowData);
  rowTotal.height = 28;

  worksheet.mergeCells(rowTotal.number, 1, rowTotal.number, 3);
  const grandTotalLabelCell = rowTotal.getCell(1);
  grandTotalLabelCell.value = 'GRAND TOTAL';
  grandTotalLabelCell.alignment = { horizontal: 'center', vertical: 'middle', shrinkToFit: true };
  grandTotalLabelCell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };

  columns.forEach((col, idx) => {
    const cell = rowTotal.getCell(idx + 1);
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } };
    cell.border = {
      top: { style: 'medium', color: { argb: 'FF334155' } },
      bottom: { style: 'double', color: { argb: 'FF334155' } },
      left: { style: 'thin', color: { argb: 'FF334155' } },
      right: { style: 'thin', color: { argb: 'FF334155' } }
    };

    if (col.isNumeric) {
      const valNum = Number(grandTotal[col.key]) || 0;
      const formattedLen = getFormattedCurrencyLen(valNum);
      cell.numFmt = CURRENCY_NUM_FMT;
      cell.alignment = { horizontal: 'right', vertical: 'middle', shrinkToFit: true };
      cell.font = {
        name: 'Segoe UI',
        size: getAdaptiveFontSize(formattedLen, 9.5, 7.5),
        bold: true,
        color: { argb: 'FFFDE68A' }
      };
    }
  });

  await triggerExcelDownload(workbook, fileName);
}

/**
 * Robustly retrieves a value from an Excel row object by checking multiple potential key names,
 * ignoring case, spaces, underscores, and hyphens.
 */
export function getRowValue(row, ...candidateKeys) {
  if (!row || typeof row !== 'object') return '';
  const rowKeys = Object.keys(row);
  for (const candidate of candidateKeys) {
    const target = candidate.toLowerCase().replace(/[\s_\-]/g, '');
    for (const k of rowKeys) {
      const cleanK = k.toLowerCase().replace(/[\s_\-]/g, '');
      if (cleanK === target && row[k] !== undefined && row[k] !== null && row[k] !== '') {
        return row[k];
      }
    }
  }
  return '';
}

/**
 * Normalizes any Excel date value (Date object, Excel serial number, or date string) into YYYY-MM-DD
 */
export function normalizeExcelDate(val) {
  if (!val) return new Date().toISOString().split('T')[0];
  if (val instanceof Date) {
    if (isNaN(val.getTime())) return new Date().toISOString().split('T')[0];
    return val.toISOString().split('T')[0];
  }
  if (typeof val === 'number') {
    const utcDays = Math.floor(val - 25569);
    const date = new Date(utcDays * 86400 * 1000);
    return !isNaN(date.getTime()) ? date.toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
  }
  const str = String(val).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    return str.substring(0, 10);
  }
  const dmyMatch = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (dmyMatch) {
    const day = dmyMatch[1].padStart(2, '0');
    const month = dmyMatch[2].padStart(2, '0');
    const year = dmyMatch[3];
    return `${year}-${month}-${day}`;
  }
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split('T')[0];
  }
  return new Date().toISOString().split('T')[0];
}

/**
 * Parses an Excel (.xlsx / .xls) or CSV file into an array of objects
 * with trimmed keys and parsed date/number values.
 */
export function parseExcelFile(file) {
  return new Promise((resolve, reject) => {
    if (!file) return reject(new Error('File tidak ditemukan.'));

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const buffer = e.target.result;
        const workbook = XLSX.read(buffer, {
          type: 'array',
          cellDates: true,
          dateNF: 'yyyy-mm-dd'
        });

        if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
          return reject(new Error('File Excel tidak memiliki lembar kerja (sheet).'));
        }

        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        const rawJson = XLSX.utils.sheet_to_json(worksheet, {
          defval: '',
          raw: false
        });

        if (!rawJson || rawJson.length === 0) {
          return resolve([]);
        }

        const cleanedJson = rawJson.map(row => {
          const cleanedRow = {};
          Object.keys(row).forEach(key => {
            const cleanKey = key.trim();
            let val = row[key];
            if (typeof val === 'string') {
              val = val.trim();
            }
            cleanedRow[cleanKey] = val;
          });
          return cleanedRow;
        });

        resolve(cleanedJson);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = (err) => reject(err);
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Exports a professionally styled Excel report for Master Forecast
 */
export async function exportStyledForecastReport({
  companyName = 'PT GRAHA PRIMA ENERGI',
  metadata = {},
  summary = {},
  columns = [],
  rows = [],
  grandTotal = {},
  fileName = 'Master_Forecast.xlsx'
}) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = companyName || 'PT Graha Prima Energi';
  workbook.lastModifiedBy = metadata?.dicetakOleh || 'Staff Finance';
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet('Master Forecast', {
    pageSetup: {
      orientation: 'landscape',
      paperSize: 9,
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0
    },
    views: [{ showGridLines: true }]
  });

  const colCount = Math.max(columns.length, 6);

  // 1. Spacing row
  worksheet.addRow([]);

  // 2. Company Name
  const rowCompany = worksheet.addRow([companyName.toUpperCase()]);
  worksheet.mergeCells(rowCompany.number, 1, rowCompany.number, colCount);
  rowCompany.getCell(1).font = { name: 'Segoe UI', size: 14, bold: true, color: { argb: 'FF0F172A' } };
  rowCompany.getCell(1).alignment = { horizontal: 'left', vertical: 'middle' };
  rowCompany.height = 24;

  // 3. Report Title
  const rowTitle = worksheet.addRow(['LAPORAN MASTER RENCANA ARUS KAS (FORECAST)']);
  worksheet.mergeCells(rowTitle.number, 1, rowTitle.number, colCount);
  rowTitle.getCell(1).font = { name: 'Segoe UI', size: 11, bold: true, color: { argb: 'FF1E293B' } };
  rowTitle.getCell(1).alignment = { horizontal: 'left', vertical: 'middle' };
  rowTitle.height = 20;

  // 4. Metadata Details
  const metaText = `Periode: ${metadata.periode || 'Semua Periode'}   •   Tipe Rencana: ${metadata.tipe || 'Semua Tipe'}   •   Cakupan: ${metadata.cakupan || 'Semua Data'}`;
  const rowMeta = worksheet.addRow([metaText]);
  worksheet.mergeCells(rowMeta.number, 1, rowMeta.number, colCount);
  rowMeta.getCell(1).font = { name: 'Segoe UI', size: 9, italic: true, color: { argb: 'FF475569' } };
  rowMeta.getCell(1).alignment = { horizontal: 'left', vertical: 'middle' };
  rowMeta.height = 18;

  // 5. Print & Auditor Info
  const printText = `Tanggal Cetak: ${metadata.tanggalCetak || '-'}   •   Waktu: ${metadata.waktu || '-'} WIB   •   Dicetak Oleh: ${metadata.dicetakOleh || 'Staff Finance'}   •   Format: A4 Landscape`;
  const rowPrint = worksheet.addRow([printText]);
  worksheet.mergeCells(rowPrint.number, 1, rowPrint.number, colCount);
  rowPrint.getCell(1).font = { name: 'Segoe UI', size: 8.5, color: { argb: 'FF64748B' } };
  rowPrint.getCell(1).alignment = { horizontal: 'left', vertical: 'middle' };
  rowPrint.height = 16;

  // 6. Blank spacing
  worksheet.addRow([]);

  // 7 & 8. Mini Summary Cards (Merged spans agar tidak menumpuk)
  renderSummaryCards(worksheet, [
    { label: 'Total Rencana Target:', val: summary.totalTarget || 0, color: 'FF0F172A', isCurrency: true },
    { label: 'Total Realisasi Aktual:', val: summary.totalRealisasi || 0, color: 'FF047857', isCurrency: true },
    { label: 'Sisa Target Berjalan:', val: summary.totalSisa || 0, color: 'FF155E75', isCurrency: true },
    { label: 'Persentase Capaian:', val: summary.persenTercapai || '0%', color: 'FFBE123C', isCurrency: false }
  ], colCount);

  // 9. Blank spacing
  worksheet.addRow([]);

  // 10. Table Headers
  const headerValues = columns.map(c => c.label);
  const rowHeader = worksheet.addRow(headerValues);
  rowHeader.height = 30;

  columns.forEach((col, idx) => {
    const cell = rowHeader.getCell(idx + 1);
    const bgArgb = col.headerColor || 'FF0F172A';
    cell.font = { name: 'Segoe UI', size: 9, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.alignment = { horizontal: col.align || 'left', vertical: 'middle', wrapText: true };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgArgb } };
    cell.border = {
      top: { style: 'medium', color: { argb: 'FF334155' } },
      bottom: { style: 'medium', color: { argb: 'FF334155' } },
      left: { style: 'thin', color: { argb: 'FF334155' } },
      right: { style: 'thin', color: { argb: 'FF334155' } }
    };
  });

  applyAutoColumnWidths(worksheet, columns, rows, grandTotal);

  // 11. Data Rows
  rows.forEach((r, rowIdx) => {
    const isOdd = rowIdx % 2 !== 0;
    const bgArgb = isOdd ? 'FFF8FAFC' : 'FFFFFFFF';

    const rowData = columns.map(col => {
      const val = r[col.key];
      if (col.isNumeric) {
        return Number(val) || 0;
      }
      return val !== undefined && val !== null ? val : '';
    });

    const row = worksheet.addRow(rowData);
    let maxRowLines = 1;

    columns.forEach((col, colIdx) => {
      const cell = row.getCell(colIdx + 1);
      const colWidth = worksheet.getColumn(colIdx + 1).width || col.width || 18;
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgArgb } };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
      };

      if (col.isNumeric) {
        const valNum = Number(r[col.key]) || 0;
        const formattedLen = getFormattedCurrencyLen(valNum);
        cell.numFmt = CURRENCY_NUM_FMT;
        cell.font = {
          name: 'Segoe UI',
          size: getAdaptiveFontSize(formattedLen, 9, 7.5),
          bold: col.bold || false,
          color: { argb: col.fontColor || 'FF0F172A' }
        };
        cell.alignment = { horizontal: col.align || 'right', vertical: 'middle', shrinkToFit: true };
      } else if (col.key === 'no') {
        cell.font = { name: 'Segoe UI', size: 9, color: { argb: 'FF64748B' } };
        cell.alignment = { horizontal: 'center', vertical: 'middle', shrinkToFit: true };
      } else if (col.key === 'deskripsi') {
        const descStr = String(r[col.key] || '');
        cell.font = { name: 'Segoe UI', size: getAdaptiveFontSize(descStr.length, 9, 8), bold: true, color: { argb: 'FF1E293B' } };
        cell.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
        const lines = Math.max(1, Math.ceil(descStr.length / Math.max(colWidth - 4, 24)));
        if (lines > maxRowLines) maxRowLines = lines;
      } else if (col.key === 'tipe') {
        const isMasuk = String(cell.value).toLowerCase() === 'pemasukan';
        cell.font = { name: 'Segoe UI', size: 9, bold: true, color: { argb: isMasuk ? 'FF047857' : 'FFBE123C' } };
        cell.alignment = { horizontal: 'center', vertical: 'middle', shrinkToFit: true };
      } else if (col.key === 'status') {
        const statusStr = String(cell.value);
        const isSuccess = statusStr.includes('Penuh');
        cell.font = { name: 'Segoe UI', size: 8.5, bold: true, color: { argb: isSuccess ? 'FF047857' : 'FFD97706' } };
        cell.alignment = { horizontal: 'center', vertical: 'middle', shrinkToFit: true };
      } else {
        const strVal = String(r[col.key] || '');
        cell.font = { name: 'Segoe UI', size: getAdaptiveFontSize(strVal.length, 9, 7.5), color: { argb: 'FF1E293B' } };
        cell.alignment = { horizontal: col.align || 'center', vertical: 'middle', shrinkToFit: true };
      }
    });

    row.height = Math.max(22, Math.min(maxRowLines * 14 + 6, 120));
  });

  // 12. Grand Total Row
  const totalRowData = columns.map(col => {
    if (col.key === 'deskripsi') return 'GRAND TOTAL RENCANA FORECAST';
    if (col.isNumeric && grandTotal[col.key] !== undefined) {
      return Number(grandTotal[col.key]) || 0;
    }
    if (col.key === 'persentase' && grandTotal.persenTercapai !== undefined) {
      return grandTotal.persenTercapai;
    }
    return '';
  });

  const rowTotal = worksheet.addRow(totalRowData);
  rowTotal.height = 28;

  worksheet.mergeCells(rowTotal.number, 1, rowTotal.number, 4);
  const grandTotalLabelCell = rowTotal.getCell(1);
  grandTotalLabelCell.value = 'GRAND TOTAL RENCANA FORECAST';
  grandTotalLabelCell.alignment = { horizontal: 'center', vertical: 'middle', shrinkToFit: true };
  grandTotalLabelCell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };

  columns.forEach((col, idx) => {
    const cell = rowTotal.getCell(idx + 1);
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } };
    cell.border = {
      top: { style: 'medium', color: { argb: 'FF334155' } },
      bottom: { style: 'double', color: { argb: 'FF334155' } },
      left: { style: 'thin', color: { argb: 'FF334155' } },
      right: { style: 'thin', color: { argb: 'FF334155' } }
    };

    if (col.isNumeric) {
      const valNum = Number(grandTotal[col.key]) || 0;
      const formattedLen = getFormattedCurrencyLen(valNum);
      cell.numFmt = CURRENCY_NUM_FMT;
      cell.alignment = { horizontal: 'right', vertical: 'middle', shrinkToFit: true };
      cell.font = {
        name: 'Segoe UI',
        size: getAdaptiveFontSize(formattedLen, 9.5, 7.5),
        bold: true,
        color: { argb: 'FFFDE68A' }
      };
    } else if (col.key === 'persentase') {
      cell.alignment = { horizontal: 'center', vertical: 'middle', shrinkToFit: true };
      cell.font = { name: 'Segoe UI', size: 9.5, bold: true, color: { argb: 'FFFDE68A' } };
    }
  });

  await triggerExcelDownload(workbook, fileName);
}

/**
 * Exports a professionally styled Excel report for Master Bank & Kas
 */
export async function exportStyledBankReport({
  companyName = 'PT GRAHA PRIMA ENERGI',
  metadata = {},
  summary = {},
  columns = [],
  rows = [],
  grandTotal = {},
  fileName = 'Master_Bank_Kas.xlsx'
}) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = companyName || 'PT Graha Prima Energi';
  workbook.lastModifiedBy = metadata?.dicetakOleh || 'Staff Finance';
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet('Master Bank & Kas', {
    pageSetup: {
      orientation: 'landscape',
      paperSize: 9,
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0
    },
    views: [{ showGridLines: true }]
  });

  const colCount = Math.max(columns.length, 6);

  // 1. Spacing row
  worksheet.addRow([]);

  // 2. Company Name
  const rowCompany = worksheet.addRow([companyName.toUpperCase()]);
  worksheet.mergeCells(rowCompany.number, 1, rowCompany.number, colCount);
  rowCompany.getCell(1).font = { name: 'Segoe UI', size: 14, bold: true, color: { argb: 'FF0F172A' } };
  rowCompany.getCell(1).alignment = { horizontal: 'left', vertical: 'middle' };
  rowCompany.height = 24;

  // 3. Report Title
  const rowTitle = worksheet.addRow(['LAPORAN MASTER REKENING BANK & KAS (TREASURY REPORT)']);
  worksheet.mergeCells(rowTitle.number, 1, rowTitle.number, colCount);
  rowTitle.getCell(1).font = { name: 'Segoe UI', size: 11, bold: true, color: { argb: 'FF1E293B' } };
  rowTitle.getCell(1).alignment = { horizontal: 'left', vertical: 'middle' };
  rowTitle.height = 20;

  // 4. Metadata Details
  const metaText = `Kategori Akun: ${metadata.filterKategori || 'Semua Akun (Kas & Bank)'}   •   Status Likuiditas: Aktif Berjalan`;
  const rowMeta = worksheet.addRow([metaText]);
  worksheet.mergeCells(rowMeta.number, 1, rowMeta.number, colCount);
  rowMeta.getCell(1).font = { name: 'Segoe UI', size: 9, italic: true, color: { argb: 'FF475569' } };
  rowMeta.getCell(1).alignment = { horizontal: 'left', vertical: 'middle' };
  rowMeta.height = 18;

  // 5. Print & Auditor Info
  const printText = `Tanggal Cetak: ${metadata.tanggalCetak || '-'}   •   Waktu: ${metadata.waktu || '-'} WIB   •   Dicetak Oleh: ${metadata.dicetakOleh || 'Staff Finance'}   •   Format: A4 Landscape`;
  const rowPrint = worksheet.addRow([printText]);
  worksheet.mergeCells(rowPrint.number, 1, rowPrint.number, colCount);
  rowPrint.getCell(1).font = { name: 'Segoe UI', size: 8.5, color: { argb: 'FF64748B' } };
  rowPrint.getCell(1).alignment = { horizontal: 'left', vertical: 'middle' };
  rowPrint.height = 16;

  // 6. Blank spacing
  worksheet.addRow([]);

  // 7 & 8. Mini Summary Cards (Merged spans agar tidak menumpuk)
  renderSummaryCards(worksheet, [
    { label: 'Total Saldo Awal Terdaftar:', val: summary.totalSaldoAwal || 0, color: 'FF0F172A', isCurrency: true },
    { label: 'Total Akumulasi Masuk (+):', val: summary.totalMasuk || 0, color: 'FF047857', isCurrency: true },
    { label: 'Total Akumulasi Keluar (-):', val: summary.totalKeluar || 0, color: 'FFBE123C', isCurrency: true },
    { label: 'Total Saldo Akhir Likuiditas:', val: summary.saldoAkhir || 0, color: (summary.saldoAkhir || 0) >= 0 ? 'FF047857' : 'FFBE123C', isCurrency: true }
  ], colCount);

  // 9. Blank spacing
  worksheet.addRow([]);

  // 10. Table Headers
  const headerValues = columns.map(c => c.label);
  const rowHeader = worksheet.addRow(headerValues);
  rowHeader.height = 30;

  columns.forEach((col, idx) => {
    const cell = rowHeader.getCell(idx + 1);
    const bgArgb = col.headerColor || 'FF0F172A';
    cell.font = { name: 'Segoe UI', size: 9, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.alignment = { horizontal: col.align || 'left', vertical: 'middle', wrapText: true };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgArgb } };
    cell.border = {
      top: { style: 'medium', color: { argb: 'FF334155' } },
      bottom: { style: 'medium', color: { argb: 'FF334155' } },
      left: { style: 'thin', color: { argb: 'FF334155' } },
      right: { style: 'thin', color: { argb: 'FF334155' } }
    };
  });

  applyAutoColumnWidths(worksheet, columns, rows, grandTotal);

  // 11. Data Rows
  rows.forEach((r, rowIdx) => {
    const isOdd = rowIdx % 2 !== 0;
    const bgArgb = isOdd ? 'FFF8FAFC' : 'FFFFFFFF';

    const rowData = columns.map(col => {
      const val = r[col.key];
      if (col.isNumeric) {
        return Number(val) || 0;
      }
      return val !== undefined && val !== null ? val : '';
    });

    const row = worksheet.addRow(rowData);
    row.height = 23;

    columns.forEach((col, colIdx) => {
      const cell = row.getCell(colIdx + 1);
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgArgb } };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
      };

      if (col.isNumeric) {
        const valNum = Number(r[col.key]) || 0;
        const formattedLen = getFormattedCurrencyLen(valNum);
        cell.numFmt = CURRENCY_NUM_FMT;
        cell.font = {
          name: 'Segoe UI',
          size: getAdaptiveFontSize(formattedLen, 9, 7.5),
          bold: col.bold || false,
          color: { argb: col.fontColor || 'FF0F172A' }
        };
        cell.alignment = { horizontal: col.align || 'right', vertical: 'middle', shrinkToFit: true };
      } else if (col.key === 'no') {
        cell.font = { name: 'Segoe UI', size: 9, color: { argb: 'FF64748B' } };
        cell.alignment = { horizontal: 'center', vertical: 'middle', shrinkToFit: true };
      } else if (col.key === 'bankName') {
        const strVal = String(r[col.key] || '');
        cell.font = { name: 'Segoe UI', size: getAdaptiveFontSize(strVal.length, 9, 8), bold: true, color: { argb: 'FF1E293B' } };
        cell.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
      } else if (col.key === 'tipeAkun') {
        const isKas = String(cell.value).toLowerCase() === 'kas';
        cell.font = { name: 'Segoe UI', size: 9, bold: true, color: { argb: isKas ? 'FFD97706' : 'FF2563EB' } };
        cell.alignment = { horizontal: 'center', vertical: 'middle', shrinkToFit: true };
      } else {
        const strVal = String(r[col.key] || '');
        cell.font = { name: 'Segoe UI', size: getAdaptiveFontSize(strVal.length, 9, 7.5), color: { argb: 'FF1E293B' } };
        cell.alignment = { horizontal: col.align || 'left', vertical: 'middle', shrinkToFit: true };
      }
    });
  });

  // 12. Grand Total Row
  const totalRowData = columns.map(col => {
    if (col.key === 'bankName') return 'GRAND TOTAL KAS & BANK';
    if (col.isNumeric && grandTotal[col.key] !== undefined) {
      return Number(grandTotal[col.key]) || 0;
    }
    return '';
  });

  const rowTotal = worksheet.addRow(totalRowData);
  rowTotal.height = 28;

  worksheet.mergeCells(rowTotal.number, 1, rowTotal.number, 5);
  const grandTotalLabelCell = rowTotal.getCell(1);
  grandTotalLabelCell.value = 'GRAND TOTAL KAS & BANK';
  grandTotalLabelCell.alignment = { horizontal: 'center', vertical: 'middle', shrinkToFit: true };
  grandTotalLabelCell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };

  columns.forEach((col, idx) => {
    const cell = rowTotal.getCell(idx + 1);
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } };
    cell.border = {
      top: { style: 'medium', color: { argb: 'FF334155' } },
      bottom: { style: 'double', color: { argb: 'FF334155' } },
      left: { style: 'thin', color: { argb: 'FF334155' } },
      right: { style: 'thin', color: { argb: 'FF334155' } }
    };

    if (col.isNumeric) {
      const valNum = Number(grandTotal[col.key]) || 0;
      const formattedLen = getFormattedCurrencyLen(valNum);
      cell.numFmt = CURRENCY_NUM_FMT;
      cell.alignment = { horizontal: 'right', vertical: 'middle', shrinkToFit: true };
      cell.font = {
        name: 'Segoe UI',
        size: getAdaptiveFontSize(formattedLen, 9.5, 7.5),
        bold: true,
        color: { argb: 'FFFDE68A' }
      };
    }
  });

  await triggerExcelDownload(workbook, fileName);
}
