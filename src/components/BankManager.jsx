import React, { useState, useRef } from 'react';
import { Building, PlusCircle, CheckCircle2, Trash2, Calendar, Upload, Download, Edit3 } from 'lucide-react';
import { formatRupiah, parseRupiahInput, formatDateIndo } from '../utils/formatters';

export const BankManager = ({ banks, onAddBank, onDeleteBank, onUpdateBank }) => {
  const [bankName, setBankName] = useState('');
  const [bankSaldoDisplay, setBankSaldoDisplay] = useState('');
  const [tanggalSaldo, setTanggalSaldo] = useState(new Date().toISOString().split('T')[0]);
  const [isBankSuccess, setIsBankSuccess] = useState(false);
  const fileInputRef = useRef(null);

  const handleBankSaldoChange = (e) => {
    const raw = e.target.value;
    const num = parseRupiahInput(raw);
    if (num === 0 && raw === '') setBankSaldoDisplay('');
    else setBankSaldoDisplay(new Intl.NumberFormat('id-ID').format(num));
  };

  const handleBankSubmit = (e) => {
    e.preventDefault();
    const cleanNominal = parseRupiahInput(bankSaldoDisplay);
    if (!bankName.trim()) return alert('Masukkan nama bank.');
    
    const newBank = {
      id: `bank-${Date.now()}`,
      name: bankName.trim(),
      saldoAwal: cleanNominal || 0,
      tanggalSaldoAwal: tanggalSaldo || new Date().toISOString().split('T')[0]
    };
    onAddBank(newBank);
    
    setBankName('');
    setBankSaldoDisplay('');
    setIsBankSuccess(true);
    setTimeout(() => setIsBankSuccess(false), 2500);
  };

  const downloadTemplate = () => {
    const csvContent = "Nama Bank,Saldo Awal,Tanggal\nBank BCA,100000000,2026-10-01\nBank Mandiri,50000000,2026-10-02";
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'Template_Import_Bank.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleEditBank = (bank) => {
    const newName = window.prompt('Ubah Nama Bank:', bank.name);
    if (newName === null) return;
    const newSaldoRaw = window.prompt('Ubah Saldo Awal (angka saja):', bank.saldoAwal);
    if (newSaldoRaw === null) return;
    const newSaldo = parseInt(newSaldoRaw.replace(/[^\d]/g, ''), 10);
    
    onUpdateBank(bank.id, { 
      name: newName.trim() || bank.name, 
      saldoAwal: isNaN(newSaldo) ? bank.saldoAwal : newSaldo 
    });
  };

  const handleImportCSV = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target.result;
      const lines = text.split('\n');
      let importedCount = 0;
      
      lines.forEach((line, index) => {
        if (index === 0) return; // skip header
        if (!line.trim()) return;
        
        const [namaCsv, saldoCsv, tglCsv] = line.split(',');
        if (namaCsv && saldoCsv) {
          onAddBank({
            id: `bank-imp-${Date.now()}-${index}`,
            name: namaCsv.trim(),
            saldoAwal: parseInt(saldoCsv.trim().replace(/[^\d]/g, ''), 10) || 0,
            tanggalSaldoAwal: tglCsv ? tglCsv.trim() : new Date().toISOString().split('T')[0],
          });
          importedCount++;
        }
      });
      alert(`Berhasil mengimpor ${importedCount} rekening bank!`);
      e.target.value = '';
    };
    reader.readAsText(file);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      
      {/* Form Tambah Bank */}
      <div className="lg:col-span-1 bg-white rounded-2xl border border-slate-200/90 shadow-card p-5 h-fit">
        <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100">
          <div className="w-9 h-9 rounded-xl bg-corporate-100 flex items-center justify-center">
            <Building className="w-5 h-5 text-corporate-700" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 tracking-tight">Tambah Rekening Bank</h2>
            <p className="text-xs text-slate-500">Daftarkan akun bank baru</p>
          </div>
        </div>

        <form onSubmit={handleBankSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">Nama Bank</label>
            <input
              type="text"
              value={bankName}
              onChange={(e) => setBankName(e.target.value)}
              placeholder="Contoh: Bank BCA"
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-corporate-500"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">Saldo Awal</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-xs font-bold text-slate-500">Rp</span>
              <input
                type="text"
                value={bankSaldoDisplay}
                onChange={handleBankSaldoChange}
                placeholder="0"
                className="w-full pl-10 pr-3 py-2 text-sm font-mono-num font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-corporate-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">Tanggal/Periode Saldo</label>
            <input
              type="date"
              value={tanggalSaldo}
              onChange={(e) => setTanggalSaldo(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-corporate-500"
              required
            />
          </div>
          <div className="pt-2">
            {isBankSuccess && (
              <div className="mb-2 text-xs font-semibold text-emerald-600 flex items-center gap-1"><CheckCircle2 className="w-4 h-4" /> Bank ditambahkan!</div>
            )}
            <button type="submit" className="w-full py-2.5 rounded-xl text-sm font-bold text-white bg-slate-800 hover:bg-slate-900 flex justify-center gap-2 transition-all">
              <PlusCircle className="w-4 h-4" /> Tambah Bank
            </button>
          </div>
        </form>
      </div>

      {/* List Bank */}
      <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/90 shadow-card overflow-hidden">
        <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900 tracking-tight">Daftar Rekening Bank</h2>
            <p className="text-xs text-slate-500">Daftar bank beserta informasi saldo awal</p>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={downloadTemplate}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-xl shadow-sm hover:bg-slate-50 transition-all"
            >
              <Download className="w-3.5 h-3.5" /> Template CSV
            </button>
            <input type="file" accept=".csv" className="hidden" ref={fileInputRef} onChange={handleImportCSV} />
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-corporate-700 bg-white border border-slate-200 rounded-xl shadow-sm hover:bg-slate-50 transition-all"
            >
              <Upload className="w-3.5 h-3.5" /> Import CSV
            </button>
          </div>
        </div>
        <div className="p-0 overflow-x-auto max-h-[600px] overflow-y-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-slate-100/90 text-slate-700 uppercase tracking-wider text-[11px] font-bold border-b border-slate-200">
                <th className="py-3 px-4">Nama Bank</th>
                <th className="py-3 px-4">Periode / Tanggal</th>
                <th className="py-3 px-4 text-right">Saldo Awal Terdaftar</th>
                <th className="py-3 px-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {banks.map(bank => (
                <tr key={bank.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-4 font-bold text-slate-900 flex items-center gap-2">
                    <Building className="w-4 h-4 text-slate-400" /> {bank.name}
                  </td>
                  <td className="py-3 px-4 text-slate-500 text-xs flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" /> {bank.tanggalSaldoAwal ? formatDateIndo(bank.tanggalSaldoAwal) : '-'}
                  </td>
                  <td className="py-3 px-4 text-right font-mono-num font-semibold text-slate-800">
                    {formatRupiah(bank.saldoAwal)}
                  </td>
                  <td className="py-3 px-4 text-center flex items-center justify-center gap-2">
                    <button
                      onClick={() => handleEditBank(bank)}
                      className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
                      title="Edit Bank"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        if (window.confirm(`Hapus bank ${bank.name}? Data transaksi terkait bisa bermasalah.`)) {
                          onDeleteBank(bank.id);
                        }
                      }}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                      title="Hapus Bank"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {banks.length === 0 && (
                <tr>
                  <td colSpan="4" className="py-8 text-center text-slate-400 text-sm">Belum ada bank terdaftar.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
