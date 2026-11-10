import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';

/**
 * Downloads data array of objects as an Excel (.xlsx) file
 */
export function downloadExcel(data, fileName = 'Template.xlsx', sheetName = 'Sheet1') {
  if (!data || data.length === 0) return;
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

  // Auto-fit column widths
  const maxProps = Object.keys(data[0] || {});
  worksheet['!cols'] = maxProps.map(key => {
    let maxLen = key.length;
    data.forEach(row => {
      const val = row[key] !== undefined && row[key] !== null ? String(row[key]) : '';
      if (val.length > maxLen) maxLen = val.length;
    });
    return { wch: Math.max(maxLen + 4, 14) };
  });

  const validFileName = fileName.endsWith('.xlsx') ? fileName : `${fileName}.xlsx`;
  XLSX.writeFile(workbook, validFileName);
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

  // 4. Metadata details (Periode, Tipe Mutasi, Format, Urutan)
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

  // 7 & 8. Mini Summary Cards (Identical to PDF Summary Boxes)
  const summaryCards = [
    { label: 'Total Mutasi Transaksi:', val: summary.totalTransaksi || 0, color: 'FF0F172A' },
    { label: 'Total Pemasukan:', val: summary.pemasukan || 0, color: 'FF047857' },
    { label: 'Total Pengeluaran:', val: summary.pengeluaran || 0, color: 'FFBE123C' },
    { label: 'Net Mutasi:', val: summary.netMutasi || 0, color: (summary.netMutasi || 0) >= 0 ? 'FF047857' : 'FFBE123C' }
  ];

  const rowSummaryLabel = worksheet.addRow([]);
  const rowSummaryVal = worksheet.addRow([]);
  rowSummaryLabel.height = 16;
  rowSummaryVal.height = 22;

  summaryCards.forEach((card, idx) => {
    const colIndex = idx + 1;
    if (colIndex <= colCount) {
      const cellLabel = rowSummaryLabel.getCell(colIndex);
      cellLabel.value = card.label;
      cellLabel.font = { name: 'Segoe UI', size: 8.5, color: { argb: 'FF64748B' }, bold: true };
      cellLabel.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
      cellLabel.alignment = { horizontal: 'center', vertical: 'middle' };
      cellLabel.border = {
        top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        right: { style: 'thin', color: { argb: 'FFCBD5E1' } }
      };

      const cellVal = rowSummaryVal.getCell(colIndex);
      cellVal.value = Number(card.val) || 0;
      cellVal.numFmt = '"Rp "#,##0;[Red]("-Rp "#,##0);"-"';
      cellVal.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: card.color } };
      cellVal.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
      cellVal.alignment = { horizontal: 'center', vertical: 'middle' };
      cellVal.border = {
        bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        right: { style: 'thin', color: { argb: 'FFCBD5E1' } }
      };
    }
  });

  // 9. Blank spacing
  worksheet.addRow([]);

  // 10. Table Headers
  const headerValues = columns.map(c => c.label);
  const rowHeader = worksheet.addRow(headerValues);
  rowHeader.height = 28;

  columns.forEach((col, idx) => {
    const cell = rowHeader.getCell(idx + 1);
    const bgArgb = col.headerColor || 'FF0F172A';
    cell.font = { name: 'Segoe UI', size: 9.5, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.alignment = { horizontal: col.align || 'left', vertical: 'middle', wrapText: true };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgArgb } };
    cell.border = {
      top: { style: 'medium', color: { argb: 'FF334155' } },
      bottom: { style: 'medium', color: { argb: 'FF334155' } },
      left: { style: 'thin', color: { argb: 'FF334155' } },
      right: { style: 'thin', color: { argb: 'FF334155' } }
    };
  });

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
    let lineCount = 1;

    columns.forEach((col, colIdx) => {
      const cell = row.getCell(colIdx + 1);
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgArgb } };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
      };
      cell.alignment = {
        horizontal: col.align || 'left',
        vertical: 'top',
        wrapText: col.wrapText || false
      };

      if (col.isNumeric) {
        cell.numFmt = '"Rp "#,##0;[Red]("-Rp "#,##0);"-"';
        cell.font = { name: 'Segoe UI', size: 9, bold: col.bold || false, color: { argb: col.fontColor || 'FF0F172A' } };
      } else if (col.key === 'no') {
        cell.font = { name: 'Segoe UI', size: 9, color: { argb: 'FF64748B' } };
      } else if (col.key === 'tanggal') {
        cell.font = { name: 'Segoe UI', size: 9, bold: true, color: { argb: 'FF1E293B' } };
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
        const lines = textVal.split('\n').length;
        if (lines > lineCount) lineCount = lines;
      } else {
        cell.font = { name: 'Segoe UI', size: 9, color: { argb: 'FF1E293B' } };
      }
    });

    row.height = Math.max(20, Math.min(lineCount * 14 + 6, 160));
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
  rowTotal.height = 26;

  // Merge columns 1 to 3 (No, Tanggal, Rekening) for GRAND TOTAL label
  worksheet.mergeCells(rowTotal.number, 1, rowTotal.number, 3);
  const grandTotalLabelCell = rowTotal.getCell(1);
  grandTotalLabelCell.value = 'GRAND TOTAL';
  grandTotalLabelCell.alignment = { horizontal: 'center', vertical: 'middle' };
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
      cell.numFmt = '"Rp "#,##0;[Red]("-Rp "#,##0);"-"';
      cell.alignment = { horizontal: 'right', vertical: 'middle' };
      cell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FFFDE68A' } }; // Amber highlight matching PDF
    }
  });

  // Set explicit column widths
  columns.forEach((col, idx) => {
    worksheet.getColumn(idx + 1).width = col.width || 18;
  });

  // Write and trigger download in browser
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
    // Excel serial date conversion (Windows 1900 date system)
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
        
        // Parse rows with defval
        const rawJson = XLSX.utils.sheet_to_json(worksheet, { 
          defval: '',
          raw: false
        });

        if (!rawJson || rawJson.length === 0) {
          return resolve([]);
        }

        // Clean headers: trim whitespace and normalize keys
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

  // 7 & 8. Mini Summary Cards (4 Cards)
  const summaryCards = [
    { label: 'Total Rencana Target:', val: summary.totalTarget || 0, color: 'FF0F172A', isCurrency: true },
    { label: 'Total Realisasi Aktual:', val: summary.totalRealisasi || 0, color: 'FF047857', isCurrency: true },
    { label: 'Sisa Target Berjalan:', val: summary.totalSisa || 0, color: 'FF155E75', isCurrency: true },
    { label: 'Persentase Capaian:', val: summary.persenTercapai || '0%', color: 'FFBE123C', isCurrency: false }
  ];

  const rowSummaryLabel = worksheet.addRow([]);
  const rowSummaryVal = worksheet.addRow([]);
  rowSummaryLabel.height = 16;
  rowSummaryVal.height = 22;

  summaryCards.forEach((card, idx) => {
    const colIndex = idx + 1;
    if (colIndex <= colCount) {
      const cellLabel = rowSummaryLabel.getCell(colIndex);
      cellLabel.value = card.label;
      cellLabel.font = { name: 'Segoe UI', size: 8.5, color: { argb: 'FF64748B' }, bold: true };
      cellLabel.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
      cellLabel.alignment = { horizontal: 'center', vertical: 'middle' };
      cellLabel.border = {
        top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        right: { style: 'thin', color: { argb: 'FFCBD5E1' } }
      };

      const cellVal = rowSummaryVal.getCell(colIndex);
      if (card.isCurrency) {
        cellVal.value = Number(card.val) || 0;
        cellVal.numFmt = '"Rp "#,##0;[Red]("-Rp "#,##0);"-"';
      } else {
        cellVal.value = card.val;
      }
      cellVal.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: card.color } };
      cellVal.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
      cellVal.alignment = { horizontal: 'center', vertical: 'middle' };
      cellVal.border = {
        bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        right: { style: 'thin', color: { argb: 'FFCBD5E1' } }
      };
    }
  });

  // 9. Blank spacing
  worksheet.addRow([]);

  // 10. Table Headers
  const headerValues = columns.map(c => c.label);
  const rowHeader = worksheet.addRow(headerValues);
  rowHeader.height = 28;

  columns.forEach((col, idx) => {
    const cell = rowHeader.getCell(idx + 1);
    const bgArgb = col.headerColor || 'FF0F172A';
    cell.font = { name: 'Segoe UI', size: 9.5, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.alignment = { horizontal: col.align || 'left', vertical: 'middle', wrapText: true };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgArgb } };
    cell.border = {
      top: { style: 'medium', color: { argb: 'FF334155' } },
      bottom: { style: 'medium', color: { argb: 'FF334155' } },
      left: { style: 'thin', color: { argb: 'FF334155' } },
      right: { style: 'thin', color: { argb: 'FF334155' } }
    };
  });

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
    row.height = 22;

    columns.forEach((col, colIdx) => {
      const cell = row.getCell(colIdx + 1);
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgArgb } };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
      };
      cell.alignment = {
        horizontal: col.align || 'left',
        vertical: 'middle',
        wrapText: col.wrapText || false
      };

      if (col.isNumeric) {
        cell.numFmt = '"Rp "#,##0;[Red]("-Rp "#,##0);"-"';
        cell.font = { name: 'Segoe UI', size: 9, bold: col.bold || false, color: { argb: col.fontColor || 'FF0F172A' } };
      } else if (col.key === 'no') {
        cell.font = { name: 'Segoe UI', size: 9, color: { argb: 'FF64748B' } };
      } else if (col.key === 'deskripsi') {
        cell.font = { name: 'Segoe UI', size: 9, bold: true, color: { argb: 'FF1E293B' } };
      } else if (col.key === 'tipe') {
        const isMasuk = String(cell.value).toLowerCase() === 'pemasukan';
        cell.font = { name: 'Segoe UI', size: 9, bold: true, color: { argb: isMasuk ? 'FF047857' : 'FFBE123C' } };
      } else if (col.key === 'status') {
        const statusStr = String(cell.value);
        const isSuccess = statusStr.includes('Penuh');
        cell.font = { name: 'Segoe UI', size: 8.5, bold: true, color: { argb: isSuccess ? 'FF047857' : 'FFD97706' } };
      } else {
        cell.font = { name: 'Segoe UI', size: 9, color: { argb: 'FF1E293B' } };
      }
    });
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
  rowTotal.height = 26;

  // Merge columns 1 to 4 (No, Deskripsi, Periode, Tipe) for label
  worksheet.mergeCells(rowTotal.number, 1, rowTotal.number, 4);
  const grandTotalLabelCell = rowTotal.getCell(1);
  grandTotalLabelCell.value = 'GRAND TOTAL RENCANA FORECAST';
  grandTotalLabelCell.alignment = { horizontal: 'center', vertical: 'middle' };
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
      cell.numFmt = '"Rp "#,##0;[Red]("-Rp "#,##0);"-"';
      cell.alignment = { horizontal: 'right', vertical: 'middle' };
      cell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FFFDE68A' } }; // Amber highlight
    } else if (col.key === 'persentase') {
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FFFDE68A' } };
    }
  });

  // Set column widths
  columns.forEach((col, idx) => {
    worksheet.getColumn(idx + 1).width = col.width || 18;
  });

  // Write and trigger download in browser
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

  // 7 & 8. Mini Summary Cards (4 Cards)
  const summaryCards = [
    { label: 'Total Saldo Awal Terdaftar:', val: summary.totalSaldoAwal || 0, color: 'FF0F172A' },
    { label: 'Total Akumulasi Masuk (+):', val: summary.totalMasuk || 0, color: 'FF047857' },
    { label: 'Total Akumulasi Keluar (-):', val: summary.totalKeluar || 0, color: 'FFBE123C' },
    { label: 'Total Saldo Akhir Likuiditas:', val: summary.saldoAkhir || 0, color: (summary.saldoAkhir || 0) >= 0 ? 'FF047857' : 'FFBE123C' }
  ];

  const rowSummaryLabel = worksheet.addRow([]);
  const rowSummaryVal = worksheet.addRow([]);
  rowSummaryLabel.height = 16;
  rowSummaryVal.height = 22;

  summaryCards.forEach((card, idx) => {
    const colIndex = idx + 1;
    if (colIndex <= colCount) {
      const cellLabel = rowSummaryLabel.getCell(colIndex);
      cellLabel.value = card.label;
      cellLabel.font = { name: 'Segoe UI', size: 8.5, color: { argb: 'FF64748B' }, bold: true };
      cellLabel.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
      cellLabel.alignment = { horizontal: 'center', vertical: 'middle' };
      cellLabel.border = {
        top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        right: { style: 'thin', color: { argb: 'FFCBD5E1' } }
      };

      const cellVal = rowSummaryVal.getCell(colIndex);
      cellVal.value = Number(card.val) || 0;
      cellVal.numFmt = '"Rp "#,##0;[Red]("-Rp "#,##0);"-"';
      cellVal.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: card.color } };
      cellVal.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
      cellVal.alignment = { horizontal: 'center', vertical: 'middle' };
      cellVal.border = {
        bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        right: { style: 'thin', color: { argb: 'FFCBD5E1' } }
      };
    }
  });

  // 9. Blank spacing
  worksheet.addRow([]);

  // 10. Table Headers
  const headerValues = columns.map(c => c.label);
  const rowHeader = worksheet.addRow(headerValues);
  rowHeader.height = 28;

  columns.forEach((col, idx) => {
    const cell = rowHeader.getCell(idx + 1);
    const bgArgb = col.headerColor || 'FF0F172A';
    cell.font = { name: 'Segoe UI', size: 9.5, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.alignment = { horizontal: col.align || 'left', vertical: 'middle', wrapText: true };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgArgb } };
    cell.border = {
      top: { style: 'medium', color: { argb: 'FF334155' } },
      bottom: { style: 'medium', color: { argb: 'FF334155' } },
      left: { style: 'thin', color: { argb: 'FF334155' } },
      right: { style: 'thin', color: { argb: 'FF334155' } }
    };
  });

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
    row.height = 22;

    columns.forEach((col, colIdx) => {
      const cell = row.getCell(colIdx + 1);
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgArgb } };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
      };
      cell.alignment = {
        horizontal: col.align || 'left',
        vertical: 'middle',
        wrapText: col.wrapText || false
      };

      if (col.isNumeric) {
        cell.numFmt = '"Rp "#,##0;[Red]("-Rp "#,##0);"-"';
        cell.font = { name: 'Segoe UI', size: 9, bold: col.bold || false, color: { argb: col.fontColor || 'FF0F172A' } };
      } else if (col.key === 'no') {
        cell.font = { name: 'Segoe UI', size: 9, color: { argb: 'FF64748B' } };
      } else if (col.key === 'bankName') {
        cell.font = { name: 'Segoe UI', size: 9, bold: true, color: { argb: 'FF1E293B' } };
      } else if (col.key === 'tipeAkun') {
        const isKas = String(cell.value).toLowerCase() === 'kas';
        cell.font = { name: 'Segoe UI', size: 9, bold: true, color: { argb: isKas ? 'FFD97706' : 'FF2563EB' } };
      } else {
        cell.font = { name: 'Segoe UI', size: 9, color: { argb: 'FF1E293B' } };
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
  rowTotal.height = 26;

  // Merge columns 1 to 5 (No, BankName, TipeAkun, NoRekening, AtasNama) for label
  worksheet.mergeCells(rowTotal.number, 1, rowTotal.number, 5);
  const grandTotalLabelCell = rowTotal.getCell(1);
  grandTotalLabelCell.value = 'GRAND TOTAL KAS & BANK';
  grandTotalLabelCell.alignment = { horizontal: 'center', vertical: 'middle' };
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
      cell.numFmt = '"Rp "#,##0;[Red]("-Rp "#,##0);"-"';
      cell.alignment = { horizontal: 'right', vertical: 'middle' };
      cell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FFFDE68A' } }; // Amber highlight
    }
  });

  // Set column widths
  columns.forEach((col, idx) => {
    worksheet.getColumn(idx + 1).width = col.width || 18;
  });

  // Write and trigger download in browser
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName.endsWith('.xlsx') ? fileName : `${fileName}.xlsx`;
  anchor.click();
  window.URL.revokeObjectURL(url);
}
