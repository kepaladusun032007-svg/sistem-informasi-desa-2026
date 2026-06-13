/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { MutasiLog, RW, User, Warga } from "../types";
import { PRESET_PHOTOS } from "../dataStore";
import { Baby, Church, ArrowDownRight, ArrowUpRight, Clock, MapPin, ClipboardList, TrendingUp, Printer } from "lucide-react";

interface MutasiPanelProps {
  mutasiLogs: MutasiLog[];
  rws: RW[];
  warga: Warga[];
  currentUser: User;
  onUpdateMutasi: (logs: MutasiLog[]) => void;
}

export default function MutasiPanel({
  mutasiLogs,
  rws,
  warga,
  currentUser,
  onUpdateMutasi
}: MutasiPanelProps) {
  // Filters
  const [filterType, setFilterType] = useState<string>("Semua");
  const [filterMonth, setFilterMonth] = useState<string>("Semua");
  const [filterYear, setFilterYear] = useState<string>("Semua");

  const months = [
    { value: "01", name: "Januari" },
    { value: "02", name: "Februari" },
    { value: "03", name: "Maret" },
    { value: "04", name: "April" },
    { value: "05", name: "Mei" },
    { value: "06", name: "Juni" },
    { value: "07", name: "Juli" },
    { value: "08", name: "Agustus" },
    { value: "09", name: "September" },
    { value: "10", name: "Oktober" },
    { value: "11", name: "November" },
    { value: "12", name: "Desember" }
  ];

  // Filter state for logs based on active user role/RW
  const authLogs = mutasiLogs.filter(log => {
    if (currentUser.role === "User") {
      const citizen = warga.find(w => w.id === log.wargaId);
      if (citizen) {
        return citizen.rwId === (currentUser.rwId || "RW 01");
      }
      return log.keterangan.includes(currentUser.rwId || "RW 01");
    }
    return true;
  });

  // Dynamic Year Option Generator
  const availableYears = Array.from(
    new Set(
      authLogs.map((log) => {
        try {
          return new Date(log.timestamp).getFullYear().toString();
        } catch {
          return "";
        }
      }).filter((y) => y !== "")
    )
  ).sort((a, b) => b.localeCompare(a));

  const currentYearStr = new Date().getFullYear().toString();
  if (!availableYears.includes(currentYearStr)) {
    availableYears.unshift(currentYearStr);
  }

  // Filter state for logs
  const filteredLogs = authLogs.filter(log => {
    // Type Filter
    const matchType = filterType === "Semua" || log.jenis === filterType;
    
    // Month Filter
    let matchMonth = true;
    if (filterMonth !== "Semua") {
      try {
        const logDate = new Date(log.timestamp);
        const logMonth = (logDate.getMonth() + 1).toString().padStart(2, "0");
        matchMonth = logMonth === filterMonth;
      } catch {
        matchMonth = false;
      }
    }

    // Year Filter
    let matchYear = true;
    if (filterYear !== "Semua") {
      try {
        const logDate = new Date(log.timestamp);
        const logYear = logDate.getFullYear().toString();
        matchYear = logYear === filterYear;
      } catch {
        matchYear = false;
      }
    }

    return matchType && matchMonth && matchYear;
  });

  // Helper to trigger isolated iframe-based native printing of styled official documents
  const triggerHtmlDownload = (htmlContent: string, fileNamePrefix: string) => {
    try {
      const blob = new Blob([htmlContent], { type: "text/html;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${fileNamePrefix}_${new Date().toISOString().slice(0, 10)}.html`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("Download fallback failed", e);
    }
  };

  const printContent = (htmlContent: string, fileNamePrefix: string = "dokumen") => {
    const isInsideIframe = window.self !== window.top;
    
    // Always trigger download as a seamless fallback if inside iframe, 
    // and also try printing via iframe to let them print in new tab perfectly
    if (isInsideIframe) {
      triggerHtmlDownload(htmlContent, fileNamePrefix);
    }

    try {
      const iframe = document.createElement("iframe");
      iframe.style.position = "absolute";
      iframe.style.width = "0px";
      iframe.style.height = "0px";
      iframe.style.border = "none";
      document.body.appendChild(iframe);
      
      const doc = iframe.contentWindow?.document;
      if (doc) {
        doc.open();
        doc.write(htmlContent);
        doc.close();
      }
      
      setTimeout(() => {
        try {
          const innerDoc = iframe.contentWindow?.document;
          const imgElements = innerDoc?.querySelectorAll('img') || [];
          const imageCount = imgElements.length;
          
          const runPrint = () => {
            try {
              iframe.contentWindow?.focus();
              iframe.contentWindow?.print();
              setTimeout(() => {
                if (iframe.parentNode) {
                  document.body.removeChild(iframe);
                }
              }, 1500);
            } catch (pErr) {
              console.error("Print call failed", pErr);
              if (iframe.parentNode) {
                document.body.removeChild(iframe);
              }
            }
          };

          if (imageCount === 0) {
            runPrint();
          } else {
            let loadedCount = 0;
            const checkLoad = () => {
              loadedCount++;
              if (loadedCount === imageCount) {
                runPrint();
              }
            };
            imgElements.forEach((img: any) => {
              if (img.complete) {
                checkLoad();
              } else {
                img.onload = checkLoad;
                img.onerror = checkLoad; // don't block print if an image fails to load
              }
            });
            // Set safety fallback timer of 4 seconds so it prints anyway even if loading gets stuck
            setTimeout(() => {
              if (loadedCount < imageCount) {
                runPrint();
              }
            }, 4000);
          }
        } catch (printErr) {
          console.error("Iframe printing failed:", printErr);
          if (!isInsideIframe) {
            triggerHtmlDownload(htmlContent, fileNamePrefix);
          }
          if (iframe.parentNode) {
            document.body.removeChild(iframe);
          }
        }
      }, 500);
    } catch (err) {
      console.error("System-level print block:", err);
      if (!isInsideIframe) {
        triggerHtmlDownload(htmlContent, fileNamePrefix);
      }
    }

    if (isInsideIframe) {
      setTimeout(() => {
        alert("💡 TIPS CETAK PORTAL SUKAMAJU:\n\nKarena terhalang batasan keamanan Sandbox Browser (iFrame), berkas resmi siap cetak ini telah BERHASIL DIUNDUH ke komputer Anda sebagai file HTML mandiri!\n\nCara Mencetak:\n1. Buka berkas HTML hasil unduhan tersebut.\n2. Tekan Ctrl+P (Cmd+P di Mac OS) lalu pilih 'Simpan sebagai PDF' atau cetak langsung menggunakan printer fisik Anda.\n\nAlternatif:\nKlik tombol 'Open in New Tab' di kanan atas layar pratinjau Anda untuk menggunakan tombol cetak bawaan secara langsung!");
      }, 500);
    }
  };

  const printListMutasi = () => {
    const formattedDate = new Date().toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric"
    });

    const getMonthName = (mVal: string) => {
      const found = months.find(m => m.value === mVal);
      return found ? found.name : "Semua Bulan";
    };

    let periodeStr = "Semua Periode";
    if (filterMonth !== "Semua" && filterYear !== "Semua") {
      periodeStr = `${getMonthName(filterMonth)} ${filterYear}`;
    } else if (filterMonth !== "Semua") {
      periodeStr = `${getMonthName(filterMonth)} (Semua Tahun)`;
    } else if (filterYear !== "Semua") {
      periodeStr = `Tahun ${filterYear}`;
    }

    const tableRows = filteredLogs.map((item, idx) => {
      return `
        <tr style="page-break-inside: avoid;">
          <td style="border: 1px solid #cbd5e1; padding: 6px; text-align: center; font-size: 8.5pt;">${idx + 1}</td>
          <td style="border: 1px solid #cbd5e1; padding: 6px; font-size: 8pt; font-family: monospace; text-align: center;">${new Date(item.timestamp).toLocaleString("id-ID").substring(0, 10)}</td>
          <td style="border: 1px solid #cbd5e1; padding: 6px; font-size: 8.5pt; font-weight: bold; color: #0f172a;">${item.namaWarga}</td>
          <td style="border: 1px solid #cbd5e1; padding: 6px; font-size: 8pt; font-family: monospace; color: #334155;">
            <div>NIK: ${item.nik || "-"}</div>
            <div style="color: #64748b; margin-top: 2px;">KK: ${item.kk || "-"}</div>
          </td>
          <td style="border: 1px solid #cbd5e1; padding: 6px; text-align: center; font-size: 8pt; font-weight: bold;">
            <span class="badge ${
              item.jenis === "Lahir" ? "badge-lahir" :
              item.jenis === "Meninggal" ? "badge-meninggal" :
              item.jenis === "Pindah Masuk" ? "badge-masuk" :
              item.jenis === "Pindah Keluar" ? "badge-keluar" : "badge-sementara"
            }">${item.jenis}</span>
          </td>
          <td style="border: 1px solid #cbd5e1; padding: 6px; font-size: 8pt; color: #475569;">${item.keterangan}</td>
          <td style="border: 1px solid #cbd5e1; padding: 6px; text-align: center; font-size: 8pt; color: #64748b;">${item.petugasName || "Sistem"}</td>
        </tr>
      `;
    }).join("");

    const summaryStats = `
      <div style="display: flex; gap: 12px; margin-bottom: 20px; flex-wrap: wrap; -webkit-print-color-adjust: exact; print-color-adjust: exact;">
        <div style="flex: 1; min-width: 110px; background-color: #f1f5f9; padding: 6px 10px; border-radius: 6px; border: 1px solid #cbd5e1; text-align: center;">
          <span style="font-size: 7.5pt; text-transform: uppercase; color: #64748b; font-weight: bold; display: block; margin-bottom: 3px;">Total Mutasi</span>
          <strong style="font-size: 13pt; color: #1e293b;">${filteredLogs.length} Berita</strong>
        </div>
        <div style="flex: 1; min-width: 110px; background-color: #ecfdf5; padding: 6px 10px; border-radius: 6px; border: 1px solid #a7f3d0; text-align: center;">
          <span style="font-size: 7.5pt; text-transform: uppercase; color: #065f46; font-weight: bold; display: block; margin-bottom: 3px;">Lahir (L)</span>
          <strong style="font-size: 13pt; color: #047857;">${filteredLogs.filter(log => log.jenis === "Lahir").length}</strong>
        </div>
        <div style="flex: 1; min-width: 110px; background-color: #fef2f2; padding: 6px 10px; border-radius: 6px; border: 1px solid #fecaca; text-align: center;">
          <span style="font-size: 7.5pt; text-transform: uppercase; color: #991b1b; font-weight: bold; display: block; margin-bottom: 3px;">Mati (M)</span>
          <strong style="font-size: 13pt; color: #b91c1c;">${filteredLogs.filter(log => log.jenis === "Meninggal").length}</strong>
        </div>
        <div style="flex: 1; min-width: 110px; background-color: #eff6ff; padding: 6px 10px; border-radius: 6px; border: 1px solid #bfdbfe; text-align: center;">
          <span style="font-size: 7.5pt; text-transform: uppercase; color: #1e40af; font-weight: bold; display: block; margin-bottom: 3px;">Masuk (P)</span>
          <strong style="font-size: 13pt; color: #1d4ed8;">${filteredLogs.filter(log => log.jenis === "Pindah Masuk").length}</strong>
        </div>
        <div style="flex: 1; min-width: 110px; background-color: #fffbeb; padding: 6px 10px; border-radius: 6px; border: 1px solid #fef3c7; text-align: center;">
          <span style="font-size: 7.5pt; text-transform: uppercase; color: #92400e; font-weight: bold; display: block; margin-bottom: 3px;">Keluar (I)</span>
          <strong style="font-size: 13pt; color: #b45309;">${filteredLogs.filter(log => log.jenis === "Pindah Keluar").length}</strong>
        </div>
        <div style="flex: 1; min-width: 110px; background-color: #f5f3ff; padding: 6px 10px; border-radius: 6px; border: 1px solid #ddd6fe; text-align: center;">
          <span style="font-size: 7.5pt; text-transform: uppercase; color: #5b21b6; font-weight: bold; display: block; margin-bottom: 3px;">Sementara (D)</span>
          <strong style="font-size: 13pt; color: #6d28d9;">${filteredLogs.filter(log => log.jenis === "Penduduk Sementara").length}</strong>
        </div>
      </div>
    `;

    const html = `
      <html>
        <head>
          <title>Rekapitulasi Mutasi Penduduk LAMPID</title>
          <style>
            body { font-family: 'Inter', system-ui, -apple-system, sans-serif; color: #1e293b; padding: 30px; line-height: 1.4; font-size: 9.5pt; }
            .header { text-align: center; border-bottom: 3px double #0f172a; padding-bottom: 8px; margin-bottom: 25px; }
            .header h3 { margin: 0; font-size: 13pt; text-transform: uppercase; letter-spacing: 0.5px; color: #475569; font-weight: 500; }
            .header h2 { margin: 4px 0; font-size: 16pt; text-transform: uppercase; font-weight: bold; color: #000; }
            .header p { margin: 0; font-size: 9pt; font-style: italic; color: #64748b; }
            
            .doc-title { text-align: center; margin-bottom: 20px; }
            .doc-title h4 { margin: 0; font-size: 11.5pt; text-transform: uppercase; font-weight: bold; }
            .doc-title p { margin: 4px 0 0 0; font-size: 9pt; color: #475569; }
            
            table { width: 100%; border-collapse: collapse; margin-top: 15px; margin-bottom: 30px; }
            th { background-color: #f8fafc; border: 1px solid #cbd5e1; padding: 10px 8px; font-size: 9pt; font-weight: bold; text-align: center; color: #334155; }
            
            .badge { display: inline-block; padding: 3px 6px; border-radius: 4px; font-size: 8pt; font-weight: bold; text-transform: uppercase; }
            .badge-lahir { background-color: #ecfdf5; color: #047857; }
            .badge-meninggal { background-color: #fef2f2; color: #b91c1c; }
            .badge-masuk { background-color: #eff6ff; color: #1d4ed8; }
            .badge-keluar { background-color: #fffbeb; color: #b45309; }
            .badge-sementara { background-color: #f5f3ff; color: #6d28d9; }

            .footer-signs { margin-top: 40px; display: grid; grid-template-columns: 1fr 200px; gap: 20px; text-align: center; font-size: 10pt; page-break-inside: avoid; }
            .sign-col { display: flex; flex-direction: column; justify-content: space-between; height: 100px; }
            
            @media print {
              body { padding: 10px; margin: 0; }
              button { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h3>Pemerintah Kabupaten Kuningan</h3>
            <h2>Kantor Desa Sukamaju - Dusun Sukamaju</h2>
            <p>Dusun III Sukamaju, Desa Sukamaju, Kec. Kuningan, Jawa Barat 45553 | Email: dsn3_sukamaju@kuningankab.go.id</p>
          </div>
          
          <div class="doc-title">
            <h4>LAPORAN BULANAN REKAPITULASI MUTASI KEPENDUDUKAN (Buku LAMPID)</h4>
            <p>Filter Peristiwa: ${filterType === "Semua" ? "Semua Peristiwa" : filterType} &bull; Periode: ${periodeStr} &bull; Dicetak per Tanggal: ${formattedDate}</p>
          </div>

          ${summaryStats}

          <table>
            <thead>
              <tr>
                <th style="width: 4%;">No</th>
                <th style="width: 12%;">Tgl Mutasi</th>
                <th style="width: 18%;">Nama Warga</th>
                <th style="width: 18%;">Identitas Diri NIK/KK</th>
                <th style="width: 14%;">Kategori Peristiwa</th>
                <th style="width: 22%;">Keterangan Peristiwa / Mutasi</th>
                <th style="width: 12%;">Operator Petugas</th>
              </tr>
            </thead>
            <tbody>
              ${tableRows}
            </tbody>
          </table>

          <div class="footer-signs">
            <div></div>
            <div class="sign-col">
              <div>Kuningan, ${formattedDate}</div>
              <div>Kepala Dusun Sukamaju,</div>
              <div style="font-weight: bold; text-decoration: underline; text-transform: uppercase;">SURYANA PRATAMA</div>
            </div>
          </div>
        </body>
      </html>
    `;

    const sanitizedFilterType = filterType.toLowerCase().replace(/\s+/g, '_');
    printContent(html, `rekap_mutasi_lampid_${sanitizedFilterType}_bln-${filterMonth}_thn-${filterYear}_Sukamaju`);
  };

  // Calculations utilize already declared authLogs and filteredLogs from upper component scope

  // Calculate demographics stats dynamically
  const lahirCount = authLogs.filter(m => m.jenis === "Lahir").length;
  const meninggalCount = authLogs.filter(m => m.jenis === "Meninggal").length;
  const pindahMasukCount = authLogs.filter(m => m.jenis === "Pindah Masuk").length;
  const pindahKeluarCount = authLogs.filter(m => m.jenis === "Pindah Keluar").length;
  const sementaraCount = warga.filter(w => {
    if (currentUser.role === "User") {
      return w.status === "Sementara" && w.rwId === (currentUser.rwId || "RW 01");
    }
    return w.status === "Sementara";
  }).length;

  const totalMutasi = authLogs.length;

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-xs">
        <h2 className="text-xl font-semibold text-slate-800 font-display">Buku Administrasi Mutasi (LAMPID)</h2>
        <p className="text-sm text-slate-500 mt-1">
          Pencatatan Peristiwa Demografis meliputi Lahir, Mati, Pindah Datang, Pindah Keluar, dan Penduduk Sementara sesuai dengan Permendagri No. 47/2016.
        </p>
      </div>

      {/* Structured LAMPID Stats cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
        {/* LAHIR */}
        <div className="bg-white p-4.5 rounded-xl border border-slate-100 shadow-2xs flex items-center gap-3.5">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg">
            <Baby className="w-5 h-5" />
          </div>
          <div>
            <span className="block text-xs text-slate-400 font-medium font-sans uppercase tracking-wider">Lahir (L)</span>
            <span className="text-xl font-bold text-slate-800 font-display mt-0.5 block">{lahirCount}</span>
          </div>
        </div>

        {/* MATI */}
        <div className="bg-white p-4.5 rounded-xl border border-slate-100 shadow-2xs flex items-center gap-3.5">
          <div className="p-3 bg-rose-50 text-rose-600 rounded-lg">
            <Church className="w-5 h-5" />
          </div>
          <div>
            <span className="block text-xs text-slate-400 font-medium font-sans uppercase tracking-wider">Mati (M)</span>
            <span className="text-xl font-bold text-slate-800 font-display mt-0.5 block">{meninggalCount}</span>
          </div>
        </div>

        {/* PINDAH MASUK */}
        <div className="bg-white p-4.5 rounded-xl border border-slate-100 shadow-2xs flex items-center gap-3.5">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
            <ArrowDownRight className="w-5 h-5" />
          </div>
          <div>
            <span className="block text-xs text-slate-400 font-medium font-sans uppercase tracking-wider">Masuk (P)</span>
            <span className="text-xl font-bold text-slate-800 font-display mt-0.5 block">{pindahMasukCount}</span>
          </div>
        </div>

        {/* PINDAH KELUAR */}
        <div className="bg-white p-4.5 rounded-xl border border-slate-100 shadow-2xs flex items-center gap-3.5">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-lg">
            <ArrowUpRight className="w-5 h-5" />
          </div>
          <div>
            <span className="block text-xs text-slate-400 font-medium font-sans uppercase tracking-wider">Keluar (I)</span>
            <span className="text-xl font-bold text-slate-800 font-display mt-0.5 block">{pindahKeluarCount}</span>
          </div>
        </div>

        {/* PENDUDUK SEMENTARA */}
        <div className="bg-white p-4.5 rounded-xl border border-slate-100 shadow-2xs col-span-2 sm:col-span-1 flex items-center gap-3.5">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg">
            <MapPin className="w-5 h-5" />
          </div>
          <div>
            <span className="block text-xs text-slate-400 font-medium font-sans uppercase tracking-wider">Sementara (D)</span>
            <span className="text-xl font-bold text-slate-800 font-display mt-0.5 block">{sementaraCount}</span>
          </div>
        </div>
      </div>

      {/* Info Warning Banner on Auto-Logging */}
      <div className="bg-slate-800 text-slate-200 text-sm p-4 rounded-xl shadow-xs border border-slate-700 flex items-start gap-3">
        <Clock className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
        <div>
          <strong className="text-white block font-display">Sistem Auto-Logging Kependudukan Aktif</strong>
          Setiap pendaftaran warga baru, pecohan kartu keluarga (Pecah KK), perubahan status almarhum, atau perpindahan pemukiman di tab <span className="font-semibold text-emerald-400 font-display">Data Penduduk</span> akan otomatis didokumentasikan ke dalam jurnal mutasi ini beserta timestamp audit log yang tidak dapat diubah (immutable).
        </div>
      </div>

      {/* Log Output Filter Tab */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h3 className="font-semibold text-slate-800 font-display flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-emerald-600" />
            Riwayat Log Mutasi Penduduk (Buku Mutasi)
          </h3>

          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Kategori:</span>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="bg-slate-50 text-slate-700 text-xs px-3 py-1.5 rounded-lg border border-slate-200 focus:outline-none"
              >
                <option value="Semua">Semua Peristiwa</option>
                <option value="Lahir">Kelahiran (Lahir)</option>
                <option value="Meninggal">Kematian (Meninggal)</option>
                <option value="Pindah Masuk">Penduduk Masuk</option>
                <option value="Pindah Keluar">Penduduk Keluar</option>
                <option value="Penduduk Sementara">Penduduk Sementara</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Bulan:</span>
              <select
                value={filterMonth}
                onChange={(e) => setFilterMonth(e.target.value)}
                className="bg-slate-50 text-slate-700 text-xs px-3 py-1.5 rounded-lg border border-slate-200 focus:outline-none"
              >
                <option value="Semua">Semua Bulan</option>
                {months.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Tahun:</span>
              <select
                value={filterYear}
                onChange={(e) => setFilterYear(e.target.value)}
                className="bg-slate-50 text-slate-700 text-xs px-3 py-1.5 rounded-lg border border-slate-200 focus:outline-none"
              >
                <option value="Semua">Semua Tahun</option>
                {availableYears.map((yr) => (
                  <option key={yr} value={yr}>
                    {yr}
                  </option>
                ))}
              </select>
            </div>

            <button
              id="btn-cetak-mutasi-bulanan"
              onClick={printListMutasi}
              className="bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all shadow-2xs hover:shadow-xs active:scale-[0.98] cursor-pointer"
              title="Cetak Berita & Jurnal Mutasi Penduduk"
            >
              <Printer className="w-3.5 h-3.5 text-emerald-400" />
              <span>Cetak Laporan Bulanan</span>
            </button>
          </div>
        </div>

        {/* Timeline Log Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 text-slate-400 font-display font-medium text-xs uppercase border-b border-slate-100">
                <th className="px-5 py-3">Event / Stempel Waktu</th>
                <th className="px-5 py-3">Warga Bersangkutan</th>
                <th className="px-5 py-3">Identitas (NIK/KK)</th>
                <th className="px-5 py-3">Keterangan Mutasi</th>
                <th className="px-5 py-3">Operator Petugas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm text-slate-600">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-slate-400 font-sans">
                    Belum terdapat peristiwa mutasi terdaftar di kategori ini.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => {
                  return (
                    <tr key={log.id} className="hover:bg-slate-50/50">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`p-1.5 rounded-md ${
                            log.jenis === "Lahir" ? "bg-emerald-100 text-emerald-800" :
                            log.jenis === "Meninggal" ? "bg-rose-100 text-rose-800" :
                            log.jenis === "Pindah Masuk" ? "bg-blue-100 text-blue-800" :
                            log.jenis === "Pindah Keluar" ? "bg-amber-100 text-amber-800" : "bg-indigo-100 text-indigo-800"
                          }`}>
                            {log.jenis === "Lahir" ? <Baby className="w-4 h-4" /> :
                             log.jenis === "Meninggal" ? <Church className="w-4 h-4" /> :
                             log.jenis === "Pindah Masuk" || log.jenis === "Penduduk Sementara" ? <ArrowDownRight className="w-4 h-4" /> :
                             <ArrowUpRight className="w-4 h-4" />}
                          </div>
                          <div>
                            <span className="font-semibold block text-slate-800 leading-tight">{log.jenis}</span>
                            <span className="text-[10px] text-slate-400 font-mono mt-0.5 block">{new Date(log.timestamp).toLocaleString("id-ID")}</span>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-4 font-semibold text-slate-800">
                        {log.namaWarga}
                      </td>

                      <td className="px-5 py-4 text-xs font-mono">
                        <div>NIK: {log.nik}</div>
                        <div className="text-slate-400 mt-0.5">KK: {log.kk}</div>
                      </td>

                      <td className="px-5 py-4 text-slate-500 max-w-xs truncate" title={log.keterangan}>
                        {log.keterangan}
                      </td>

                      <td className="px-5 py-4 text-slate-500 font-medium">
                        {log.petugasName ? log.petugasName : "Sistem Automatis"}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
