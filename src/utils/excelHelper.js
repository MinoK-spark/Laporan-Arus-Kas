import * as XLSX from 'xlsx';

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
