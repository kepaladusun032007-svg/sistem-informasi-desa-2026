/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from "react";
import { Warga, RW, Laporan, User, LaporanKategori } from "../types";
import { PRESET_PHOTOS } from "../dataStore";
import { compressImage } from "../utils/imageCompressor";
import { Plus, Check, MapPin, Eye, FileSpreadsheet, Image as ImageIcon, Send, MessageSquare, Archive, ShieldQuestion, Trash2, Edit3, Camera, X, ExternalLink, Download, Printer } from "lucide-react";

interface LaporanPanelProps {
  warga: Warga[];
  rws: RW[];
  laporan: Laporan[];
  currentUser: User;
  onUpdateLaporan: (updatedLaporan: Laporan[]) => void;
}

export default function LaporanPanel({
  warga,
  rws,
  laporan,
  currentUser,
  onUpdateLaporan
}: LaporanPanelProps) {
  // Filters
  const [filterKategori, setFilterKategori] = useState<string>("Semua");
  const [filterRwId, setFilterRwId] = useState<string>(currentUser.role === "User" ? currentUser.rwId || "RW 01" : "Semua");

  // Form states
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [editingLaporanId, setEditingLaporanId] = useState<number | null>(null);
  const [formKategori, setFormKategori] = useState<LaporanKategori>("Kegiatan");
  const [formDeskripsi, setFormDeskripsi] = useState("");
  const [selectedWargaReporter, setSelectedWargaReporter] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [formFotoList, setFormFotoList] = useState<string[]>([]);
  const [selectedRwReportLocation, setSelectedRwReportLocation] = useState<string>(currentUser.role === "User" ? currentUser.rwId || "RW 01" : "RW 01");
  const [formError, setFormError] = useState("");

  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Detailed Modal selected item
  const [selectedDetailLaporan, setSelectedDetailLaporan] = useState<Laporan | null>(null);

  // Administrative Follow-up comments (Admin only)
  const [viewingReport, setViewingReport] = useState<Laporan | null>(null);
  const [commentText, setCommentText] = useState("");

  // Lightbox state for in-app image viewing to bypass Chrome popup filters
  const [activeLightboxImg, setActiveLightboxImg] = useState<string | null>(null);

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
        alert("💡 TIPS CETAK PORTAL SUKAMAJU:\n\nKarena terhalang batasan keamanan Sandbox Browser (iFrame), berkas resmi siap cetak ini TElah BERHASIL DIUNDUH ke komputer Anda sebagai file HTML mandiri!\n\nCara Mencetak:\n1. Buka berkas HTML hasil unduhan tersebut.\n2. Tekan Ctrl+P (Cmd+P di Mac OS) lalu pilih 'Simpan sebagai PDF' atau cetak langsung menggunakan printer fisik Anda.\n\nAlternatif:\nKlik tombol 'Open in New Tab' di kanan atas layar pratinjau Anda untuk menggunakan tombol cetak bawaan secara langsung!");
      }, 500);
    }
  };

  const printSingleLaporan = (item: Laporan) => {
    const reporterWarga = item.wargaId ? warga.find(w => String(w.id).trim() === String(item.wargaId).trim()) : null;
    const rwName = item.rwId || reporterWarga?.rwId || "-";
    
    const formattedDate = new Date(item.tanggal).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric"
    });

    const photoHtml = item.fotoList && item.fotoList.length > 0 
      ? `<div style="margin-top: 15px; page-break-inside: avoid;">
          <span style="font-weight: bold; font-size: 10pt; text-transform: uppercase; color: #475569; display: block; margin-bottom: 5px;">Dokumentasi Foto Lampiran:</span>
          <div style="display: flex; gap: 10px; flex-wrap: wrap;">
            ${item.fotoList.map(foto => `<img src="${foto}" style="width: 140px; height: 100px; object-fit: cover; border-radius: 6px; border: 1px solid #cbd5e1;" />`).join("")}
          </div>
         </div>`
      : "";

    const responseHtml = item.komentarAdmin 
      ? `<div style="margin-top: 15px; padding: 12px; background-color: #f8fafc; border-left: 4px solid #4f46e5; border-radius: 4px; page-break-inside: avoid;">
          <strong style="font-size: 10pt; display: block; color: #1e1b4b; margin-bottom: 4px;">Tanggapan & Tindak Lanjut Administratif:</strong>
          <p style="margin: 0; font-size: 10pt; color: #334155;">${item.komentarAdmin}</p>
         </div>`
      : "";

    const html = `
      <html>
        <head>
          <title>Jurnal Detail Laporan Lpr #${item.id}</title>
          <style>
            body { font-family: 'Inter', system-ui, -apple-system, sans-serif; color: #1e293b; padding: 40px; line-height: 1.5; font-size: 11pt; }
            .header { text-align: center; border-bottom: 3px double #0f172a; padding-bottom: 8px; margin-bottom: 25px; }
            .header h3 { margin: 0; font-size: 13pt; text-transform: uppercase; letter-spacing: 0.5px; color: #475569; font-weight: 500; }
            .header h2 { margin: 4px 0; font-size: 16pt; text-transform: uppercase; font-weight: bold; color: #000; }
            .header p { margin: 0; font-size: 9pt; font-style: italic; color: #64748b; }
            
            .doc-title { text-align: center; margin-bottom: 25px; }
            .doc-title h4 { margin: 0; font-size: 12pt; text-transform: uppercase; font-weight: bold; text-decoration: underline; }
            .doc-title p { margin: 4px 0 0 0; font-size: 10pt; font-family: monospace; color: #475569; }
            
            .section-title { font-weight: bold; font-size: 9.5pt; text-transform: uppercase; color: #475569; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; margin-bottom: 10px; margin-top: 20px; display: block; letter-spacing: 0.5px; }
            
            .grid-info { display: grid; grid-template-columns: 150px 10px 1fr; gap: 6px 12px; font-size: 10.5pt; margin-bottom: 15px; }
            .grid-label { color: #64748b; }
            .grid-value { font-weight: 500; }
            
            .badge { display: inline-block; padding: 3px 8px; border-radius: 4px; font-size: 8.5pt; font-weight: bold; text-transform: uppercase; }
            .badge-diproses { background-color: #eff6ff; color: #1e40af; }
            .badge-selesai { background-color: #ecfdf5; color: #065f46; }
            .badge-ditinjau { background-color: #fffbeb; color: #92400e; }
            
            .desc-box { background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 15px; font-style: italic; font-size: 10.5pt; color: #334155; margin-top: 10px; line-height: 1.6; }
            
            .footer-signs { margin-top: 60px; display: grid; grid-template-columns: 200px 1fr 200px; gap: 20px; text-align: center; font-size: 10.5pt; page-break-inside: avoid; }
            .sign-col { display: flex; flex-direction: column; justify-content: space-between; height: 110px; }
            
            @media print {
              body { padding: 10px; margin: 0; }
              button { display: none; }
              img { max-width: 100%; height: auto !important; }
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
            <h4>BERKAS LAPORAN KEJADIAN & KEGIATAN WARGA</h4>
            <p>Nomor: 310 / ${item.id} / DS-Sukamaju / VI / 2026</p>
          </div>
          
          <span class="section-title">Informasi Laporan Kejadian</span>
          <div class="grid-info">
            <div class="grid-label">ID Registrasi</div><div>:</div><div class="grid-value" style="font-family: monospace; font-weight: bold;">#${item.id}</div>
            <div class="grid-label">Tanggal Pelaporan</div><div>:</div><div class="grid-value">${formattedDate}</div>
            <div class="grid-label">Kategori Laporan</div><div>:</div><div class="grid-value" style="font-weight: bold;">${
              item.kategori === "Kegiatan" ? "Kegiatan RW (Sosialisasi, Kerja Bakti Kelompok)" :
              item.kategori === "Kejadian" ? "Kejadian Darurat & Luar Biasa (Bencana, Musibah)" : "Keluhan & Pengaduan Fasilitas Publik"
            }</div>
            <div class="grid-label">Status Keadaan</div><div>:</div><div class="grid-value">
              <span class="badge ${
                item.status === "Diproses" ? "badge-diproses" :
                item.status === "Selesai" ? "badge-selesai" : "badge-ditinjau"
              }">${
                item.status === "Diproses" ? "Diproses (Baru)" :
                item.status === "Selesai" ? "Selesai / Teratasi" : "Telah Diarsip"
              }</span>
            </div>
          </div>

          <span class="section-title">Biodata Pelapor / Penanggungjawab</span>
          <div class="grid-info">
            <div class="grid-label">Nama Pelapor</div><div>:</div><div class="grid-value" style="font-size:11.5pt; text-transform: uppercase; font-weight:bold;">${reporterWarga ? reporterWarga.nama : "Warga Dusun"}</div>
            <div class="grid-label">Asal Sektor</div><div>:</div><div class="grid-value">${rwName} (Dusun III Sukamaju)</div>
            <div class="grid-label">Nomor NIK</div><div>:</div><div class="grid-value" style="font-family: monospace;">${reporterWarga ? reporterWarga.nik : "-"}</div>
            <div class="grid-label">Pekerjaan</div><div>:</div><div class="grid-value">${reporterWarga ? reporterWarga.pekerjaan : "-"}</div>
          </div>

          <span class="section-title">Pernyataan Deskripsi Kronologi Laporan</span>
          <p style="margin: 0 0 5px 0; font-size: 10pt; color: #475569; font-style: italic;">Ulasan penjelasan dari pelapor di lapangan:</p>
          <div class="desc-box">
            "${item.deskripsi}"
          </div>

          ${photoHtml}
          ${responseHtml}

          <p style="font-size: 9.5pt; margin-top: 30px; line-height: 1.6; color: #475569;">
            Berkas laporan dan berita acara ini dibuat sah demi kejelasan pembukuan agenda kegiatan bulanan serta tindak lanjut kedaruratan di lingkungan pemerintahan Dusun Sukamaju.
          </p>

          <div class="footer-signs">
            <div class="sign-col">
              <div>Pelapor / Penanggungjawab,</div>
              <div style="font-weight: bold; text-decoration: underline; text-transform: uppercase;">${reporterWarga ? reporterWarga.nama : "Warga"}</div>
            </div>
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
    
    printContent(html, `berita_laporan_#${item.id}_Sukamaju`);
  };

  const printListLaporan = () => {
    const formattedDate = new Date().toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric"
    });

    const tableRows = filteredReports.map((item, idx) => {
      const reporterWarga = item.wargaId ? warga.find(w => String(w.id).trim() === String(item.wargaId).trim()) : null;
      const rwName = item.rwId || reporterWarga?.rwId || "-";
      const fotoHtmlCol = item.fotoList && item.fotoList.length > 0
        ? `<div style="display: flex; gap: 4px; flex-wrap: wrap; justify-content: center;">
            ${item.fotoList.map(foto => `<img src="${foto}" style="width: 42px; height: 32px; object-fit: cover; border-radius: 3px; border: 1px solid #cbd5e1;" />`).join("")}
           </div>`
        : `<span style="color: #94a3b8; font-size: 8pt;">Tidak ada</span>`;

      return `
        <tr style="page-break-inside: avoid;">
          <td style="border: 1px solid #cbd5e1; padding: 6px; text-align: center; font-size: 8.5pt;">${idx + 1}</td>
          <td style="border: 1px solid #cbd5e1; padding: 6px; font-size: 8.5pt; font-weight: bold;">${reporterWarga ? reporterWarga.nama : "Warga"}</td>
          <td style="border: 1px solid #cbd5e1; padding: 6px; text-align: center; font-size: 8pt;">${rwName}</td>
          <td style="border: 1px solid #cbd5e1; padding: 6px; font-size: 8pt;">${
            item.kategori === "Kegiatan" ? "Kegiatan RW" :
            item.kategori === "Kejadian" ? "Kejadian Darurat" : "Pengaduan Warga"
          }</td>
          <td style="border: 1px solid #cbd5e1; padding: 6px; text-align: center; font-size: 8pt;">${item.tanggal.substring(0, 10)}</td>
          <td style="border: 1px solid #cbd5e1; padding: 6px; text-align: center; font-size: 8pt; font-weight: bold;">
            ${
              item.status === "Diproses" ? "Diproses (Baru)" :
              item.status === "Selesai" ? "Selesai / Teratasi" : "Telah Diarsip"
            }
          </td>
          <td style="border: 1px solid #cbd5e1; padding: 6px; font-size: 8pt; color: #475569;">${item.deskripsi.substring(0, 80)}${item.deskripsi.length > 80 ? '...' : ''}</td>
          <td style="border: 1px solid #cbd5e1; padding: 4px; text-align: center;">${fotoHtmlCol}</td>
        </tr>
      `;
    }).join("");

    const summaryStats = `
      <div style="display: flex; gap: 15px; margin-bottom: 20px; flex-wrap: wrap; -webkit-print-color-adjust: exact; print-color-adjust: exact;">
        <div style="flex: 1; min-width: 120px; background-color: #f1f5f9; padding: 8px 12px; border-radius: 6px; border: 1px solid #cbd5e1; text-align: center;">
          <span style="font-size: 8pt; text-transform: uppercase; color: #64748b; font-weight: bold; display: block;">Total Laporan</span>
          <strong style="font-size: 14pt; color: #1e293b;">${filteredReports.length} Berita</strong>
        </div>
        <div style="flex: 1; min-width: 120px; background-color: #eff6ff; padding: 8px 12px; border-radius: 6px; border: 1px solid #bfdbfe; text-align: center;">
          <span style="font-size: 8pt; text-transform: uppercase; color: #1e40af; font-weight: bold; display: block;">Baru</span>
          <strong style="font-size: 14pt; color: #1d4ed8;">${filteredReports.filter(item => item.status === "Diproses").length}</strong>
        </div>
        <div style="flex: 1; min-width: 120px; background-color: #fffbeb; padding: 8px 12px; border-radius: 6px; border: 1px solid #fef3c7; text-align: center;">
          <span style="font-size: 8pt; text-transform: uppercase; color: #92400e; font-weight: bold; display: block;">Arsip</span>
          <strong style="font-size: 14pt; color: #b45309;">${filteredReports.filter(item => item.status === "Arsip").length}</strong>
        </div>
        <div style="flex: 1; min-width: 120px; background-color: #ecfdf5; padding: 8px 12px; border-radius: 6px; border: 1px solid #a7f3d0; text-align: center;">
          <span style="font-size: 8pt; text-transform: uppercase; color: #065f46; font-weight: bold; display: block;">Selesai</span>
          <strong style="font-size: 14pt; color: #047857;">${filteredReports.filter(item => item.status === "Selesai").length}</strong>
        </div>
      </div>
    `;

    const html = `
      <html>
        <head>
          <title>Rekapitulasi Kegiatan & Pengaduan Warga</title>
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
            
            .footer-signs { margin-top: 40px; display: grid; grid-template-columns: 1fr 200px; gap: 20px; text-align: center; font-size: 10pt; page-break-inside: avoid; }
            .sign-col { display: flex; flex-direction: column; justify-content: space-between; height: 100px; }
            
            @media print {
              body { padding: 10px; margin: 0; }
              button { display: none; }
              img { max-width: 100%; height: auto !important; }
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
            <h4>LAPORAN REKAPITULASI AGENDA KEGIATAN & PENGADUAN LINGKUNGAN</h4>
            <p>Kategori: ${filterKategori === "Semua" ? "Semua Laporan" : filterKategori} &bull; Dicetak per Tanggal: ${formattedDate}</p>
          </div>

          ${summaryStats}

          <table>
            <thead>
              <tr>
                <th style="width: 4%;">No</th>
                <th style="width: 14%;">Nama Pelapor</th>
                <th style="width: 6%;">Sektor</th>
                <th style="width: 12%;">Kategori Laporan</th>
                <th style="width: 10%;">Tgl Kejadian</th>
                <th style="width: 12%;">Status Laporan</th>
                <th style="width: 28%;">Ulasan Lengkap Pengaduan / Keluhan Lingkungan</th>
                <th style="width: 14%;">Foto Dokumentasi</th>
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

    printContent(html, `rekap_laporan_Sukamaju`);
  };

  // Filtering reports
  const filteredReports = laporan.filter(l => {
    // 1. Kategori Filter (Handle potential case mismatches)
    const matchesKategori = filterKategori === "Semua" || 
      String(l.kategori || "").toLowerCase() === String(filterKategori).toLowerCase();
    // 2. RW Filter / RBAC Check with trim and lower casing for absolute robustness
    let matchesRw = false;
    const itemRwId = String(l.rwId || "").trim().toLowerCase();
    
    if (currentUser.role === "User") {
      // Ketua RW only sees reports in their own RW
      const userRwId = String(currentUser.rwId || "").trim().toLowerCase();
      matchesRw = itemRwId === userRwId;
    } else {
      const matchFilterRwId = String(filterRwId || "").trim().toLowerCase();
      matchesRw = filterRwId === "Semua" || itemRwId === matchFilterRwId;
    }
    return matchesKategori && matchesRw;
  });

  // Filter possible citizens who can be logged as "Pelapor" (Optional)
  const selectableWarga = warga.filter(w => {
    if (currentUser.role === "User" && w.rwId !== currentUser.rwId) return false;
    return w.status === "Aktif";
  });

  const filteredWargaOptions = selectableWarga.filter(w => {
    const nameStr = w.nama ? String(w.nama).toLowerCase() : "";
    const nikStr = w.nik ? String(w.nik).toLowerCase() : "";
    const query = searchQuery ? String(searchQuery).toLowerCase() : "";
    return nameStr.includes(query) || nikStr.includes(query);
  });

  // Handle Photo upload with compression
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (formFotoList.length >= 3) {
        setFormError("Maksimal lampiran hanya diperbolehkan hingga 3 foto.");
        e.target.value = "";
        return;
      }
      try {
        setFormError("");
        const compressedBase64 = await compressImage(file);
        setFormFotoList([...formFotoList, compressedBase64]);
      } catch (err) {
        console.error("Gagal mengompresi gambar:", err);
        setFormError("Gagal memproses gambar. Coba file gambar lain.");
      }
      e.target.value = "";
    }
  };

  // Preset quick upload injects
  const injectPresetPhoto = (presetKey: keyof typeof PRESET_PHOTOS) => {
    if (formFotoList.length >= 3) {
      setFormError("Maksimal lampiran hanya diperbolehkan hingga 3 foto.");
      return;
    }
    setFormFotoList([...formFotoList, PRESET_PHOTOS[presetKey]]);
  };

  const removeFotoFromList = (idx: number) => {
    setFormFotoList(formFotoList.filter((_, i) => i !== idx));
  };

  // Open creation modal
  const openReportModal = () => {
    setEditingLaporanId(null);
    setFormDeskripsi("");
    setFormFotoList([]);
    setSelectedWargaReporter(0);
    setSearchQuery("");
    setFormKategori("Kegiatan");
    setSelectedRwReportLocation(currentUser.role === "User" ? currentUser.rwId || "RW 01" : "RW 01");
    setFormError("");
    setIsReportModalOpen(true);
  };

  // Open Edit modal
  const openEditReportModal = (l: Laporan, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    setEditingLaporanId(l.id);
    setFormKategori(l.kategori);
    setFormDeskripsi(l.deskripsi);
    setSelectedWargaReporter(l.wargaId || 0);

    const reporter = warga.find(w => String(w.id).trim() === String(l.wargaId || '').trim());
    setSearchQuery(reporter ? reporter.nama : "");

    setSelectedRwReportLocation(l.rwId);
    setFormFotoList(l.fotoList || []);
    setFormError("");
    setIsReportModalOpen(true);
  };

  // Save/Create report
  const handleSaveReport = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formDeskripsi) {
      setFormError("Uraian keterangan laporan wajib ditulis.");
      return;
    }

    if (editingLaporanId !== null) {
      // Edit Mode
      const updated = laporan.map(l => {
        if (l.id === editingLaporanId) {
          return {
            ...l,
            rwId: currentUser.role === "User" ? currentUser.rwId || "RW 01" : selectedRwReportLocation,
            wargaId: selectedWargaReporter > 0 ? selectedWargaReporter : undefined,
            kategori: formKategori,
            deskripsi: formDeskripsi,
            fotoList: formFotoList
          };
        }
        return l;
      });
      onUpdateLaporan(updated);
      setEditingLaporanId(null);
      setIsReportModalOpen(false);
      // Synchronize currently viewed detail
      const updatedDetail = updated.find(l => l.id === editingLaporanId);
      if (updatedDetail && selectedDetailLaporan?.id === editingLaporanId) {
        setSelectedDetailLaporan(updatedDetail);
      }
    } else {
      // Create Mode
      const newId = laporan.length > 0 ? Math.max(...laporan.map(l => l.id)) + 1 : 1;
      const newReport: Laporan = {
        id: newId,
        rwId: currentUser.role === "User" ? currentUser.rwId || "RW 01" : selectedRwReportLocation,
        wargaId: selectedWargaReporter > 0 ? selectedWargaReporter : undefined,
        kategori: formKategori,
        deskripsi: formDeskripsi,
        tanggal: new Date().toISOString().replace("T", " ").substring(0, 19),
        fotoList: formFotoList,
        status: "Diproses"
      };
      onUpdateLaporan([newReport, ...laporan]);
      setIsReportModalOpen(false);
    }
  };

  // Submit Comment / Status update by Admin (Kepala Dusun)
  const handleUpdateReportState = (id: number, targetStatus: Laporan["status"]) => {
    const updated = laporan.map(l => {
      if (l.id === id) {
        return {
          ...l,
          status: targetStatus,
          komentarAdmin: commentText || l.komentarAdmin
        };
      }
      return l;
    });

    onUpdateLaporan(updated);
    setViewingReport(null);
    setCommentText("");
    // Sync detailed view
    const updatedDetail = updated.find(l => l.id === id);
    if (updatedDetail && selectedDetailLaporan?.id === id) {
      setSelectedDetailLaporan(updatedDetail);
    }
  };

  // Delete handler
  const handleDeleteReport = (id: number, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    if (confirm("Apakah Anda yakin ingin menghapus laporan ini secara permanen?")) {
      const updated = laporan.filter(l => l.id !== id);
      onUpdateLaporan(updated);
      if (selectedDetailLaporan?.id === id) {
        setSelectedDetailLaporan(null);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Title block */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-5 rounded-xl border border-slate-100 shadow-xs">
        <div>
          <h2 className="text-xl font-semibold text-slate-800 font-display">Laporan Kegiatan & Pengaduan Warga</h2>
          <p className="text-sm text-slate-500 mt-1">
            Portal pendataan kegiatan kemasyarakatan, kejadian darurat, serta penampungan keluhan warga Dusun Sukamaju.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 self-start md:self-auto">
          <button
            onClick={printListLaporan}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-905 text-white font-semibold text-xs px-4 py-2.5 rounded-lg transition-colors cursor-pointer shadow-xs border border-slate-700"
            title="Cetak Rekap PDF Daftar Laporan"
            id="btn-print-list-laporan"
          >
            <Printer className="w-3.5 h-3.5 text-emerald-400" />
            Cetak PDF Rekap
          </button>

          <button
            onClick={openReportModal}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm px-4 py-2.5 rounded-lg transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Kirim Laporan Baru
          </button>
        </div>
      </div>

      {/* Grid filters bar */}
      <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-xs flex flex-wrap gap-4 items-center">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Kategori Laporan:</span>
          <select
            value={filterKategori}
            onChange={(e) => setFilterKategori(e.target.value)}
            className="bg-slate-50 text-slate-700 text-xs px-3 py-1.5 rounded-lg border border-slate-200"
          >
            <option value="Semua">Semua Kategori</option>
            <option value="Kegiatan">Kegiatan RW (Sosialisasi, Kerja Bakti)</option>
            <option value="Kejadian">Kejadian Luar Biasa (Darurat, Bencana)</option>
            <option value="Pengaduan">Pengaduan Warga (Fasilitas Rusak, Keluhan)</option>
          </select>
        </div>

        {currentUser.role === "Admin" && (
          <div className="flex items-center gap-2 border-l border-slate-100 pl-4">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Asal RW:</span>
            <select
              value={filterRwId}
              onChange={(e) => setFilterRwId(e.target.value)}
              className="bg-slate-50 text-slate-700 text-xs px-3 py-1.5 rounded-lg border border-slate-200"
            >
              <option value="Semua">Semua RW</option>
              {rws.map(rw => (
                <option key={rw.id} value={rw.id}>{rw.id} ({rw.namaKetua})</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Main Grid Representation of Laporan List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredReports.length === 0 ? (
          <div className="bg-white col-span-2 p-14 text-center text-slate-400 rounded-xl border border-dashed border-slate-205">
            <ShieldQuestion className="w-9 h-9 mx-auto stroke-1 mb-2.5 text-slate-350" />
            <p className="font-medium text-slate-650">Belum ada laporan kegiatan atau pengaduan tercatat.</p>
            <p className="text-2xs text-slate-450 mt-1">Gunakan tombol 'Kirim Laporan Baru' untuk menyampaikan pelaporan perdana.</p>
          </div>
        ) : (
          filteredReports.map((l) => {
            const reporter = l.wargaId ? warga.find(w => String(w.id).trim() === String(l.wargaId).trim()) : null;
            return (
              <div 
                key={l.id} 
                className="bg-white border border-slate-150 hover:border-emerald-250 rounded-xl shadow-xs hover:shadow-md p-5 flex flex-col justify-between transition-all cursor-pointer group"
                onClick={() => setSelectedDetailLaporan(l)}
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <span className={`inline-block px-2 py-0.5 rounded text-3xs font-semibold uppercase ${
                        l.kategori === "Kegiatan" ? "bg-emerald-100 text-emerald-800" :
                        l.kategori === "Kejadian" ? "bg-rose-100 text-rose-805" : "bg-purple-100 text-purple-808"
                      }`}>
                        {l.kategori === "Kegiatan" ? "Kerja Bakti / Kegiatan RW" :
                         l.kategori === "Kejadian" ? "Kejadian Luar Biasa (Darurat)" : "Pengaduan / Aspirasi"}
                      </span>
                      <p className="text-3xs text-slate-400 font-mono mt-1 flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-slate-300" />
                        Lokasi: {l.rwId} &bull; {l.tanggal}
                      </p>
                    </div>

                    <span className={`inline-block px-2 py-0.5 rounded text-3xs font-bold uppercase ${
                      l.status === "Selesai" ? "bg-emerald-50 text-emerald-700" :
                      l.status === "Arsip" ? "bg-slate-100 text-slate-705" : "bg-amber-100 text-amber-808"
                    }`}>
                      {l.status === "Diproses" ? "Sedang Diproses" :
                       l.status === "Selesai" ? "Selesai Ditindak" : "Diarsip"}
                    </span>
                  </div>

                  <p className="text-xs text-slate-550 mt-3.5 whitespace-pre-wrap leading-relaxed bg-slate-50/75 p-3 rounded-lg border border-slate-100 italic line-clamp-3">
                    "{l.deskripsi}"
                  </p>

                  {/* Sub reporter info */}
                  {reporter && (
                    <span className="text-[10px] text-slate-450 block mt-3">
                      Pelapor: <strong>{reporter.nama}</strong>
                    </span>
                  )}

                  {/* Photos list thumbnails preview */}
                  {l.fotoList && l.fotoList.length > 0 && (
                    <div className="mt-3.5 space-y-1">
                      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Lampiran Dokumentasi:</span>
                      <div className="flex gap-1.5">
                        {l.fotoList.map((foto, fIdx) => (
                          <div key={fIdx} className="h-11 w-16 bg-slate-100 border rounded overflow-hidden">
                            <img src={foto} className="w-full h-full object-cover" alt="Dokumentasi Laporan" referrerPolicy="no-referrer" />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Comments */}
                  {l.komentarAdmin && (
                    <div className="mt-3.5 p-2.5 bg-indigo-50/40 rounded-lg border border-indigo-100 text-xs text-indigo-900 line-clamp-2">
                      <strong>Tanggapan Dusun:</strong> {l.komentarAdmin}
                    </div>
                  )}
                </div>

                {/* Footer action tools */}
                <div 
                  className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between"
                  onClick={(e) => e.stopPropagation()}
                >
                  <span className="text-3xs text-slate-400 font-mono">Kode Laporan: #{l.id}</span>
                  
                  <div className="flex items-center gap-1.5">
                    {/* View details */}
                    <button
                      onClick={() => setSelectedDetailLaporan(l)}
                      className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-slate-50 rounded transition-colors cursor-pointer"
                      title="Lihat Detail Laporan"
                    >
                      <Eye className="w-4 h-4" />
                    </button>

                    {/* Edit is allowed for creator/admin */}
                    {((currentUser.role === "User" && l.rwId === currentUser.rwId && l.status === "Diproses") || currentUser.role === "Admin") && (
                      <button
                        onClick={() => openEditReportModal(l)}
                        className="p-1.5 text-slate-400 hover:text-indigo-650 hover:bg-slate-50 rounded transition-colors cursor-pointer"
                        title="Edit Laporan"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                    )}

                    {/* Delete and Cancel */}
                    {((currentUser.role === "User" && l.rwId === currentUser.rwId && l.status === "Diproses") || currentUser.role === "Admin") && (
                      <button
                        onClick={() => handleDeleteReport(l.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-650 hover:bg-slate-50 rounded transition-colors cursor-pointer"
                        title="Hapus Laporan"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}

                    {currentUser.role === "Admin" && l.status !== "Selesai" && (
                      <button
                        onClick={() => { setViewingReport(l); setCommentText(l.komentarAdmin || ""); }}
                        className="text-[10px] bg-slate-800 hover:bg-slate-900 text-white font-semibold px-3 py-1.5 rounded transition-all cursor-pointer shadow-xs ml-1"
                      >
                        Tanggapi
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Creation & Editing Modal */}
      {isReportModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-100 max-h-[92vh] flex flex-col text-slate-705">
            <div className="bg-indigo-900 text-white px-5 py-4 flex items-center justify-between">
              <h3 className="font-semibold text-base font-display">
                {editingLaporanId !== null ? "Ubah/Edit Laporan & Keluhan" : "Kirim Formulir Laporan Baru"}
              </h3>
              <button 
                onClick={() => setIsReportModalOpen(false)} 
                className="text-white hover:text-white/80 p-1 rounded-full hover:bg-indigo-950 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveReport} className="p-5 space-y-4 overflow-y-auto flex-1">
              {formError && (
                <div className="p-2.5 bg-rose-50 border border-rose-150 text-rose-700 text-xs rounded-lg">{formError}</div>
              )}

              {currentUser.role === "Admin" && (
                <div>
                  <label className="block text-xs font-semibold text-slate-650">Klaim Asal RW Lokasi Kejadian *</label>
                  <select
                    value={selectedRwReportLocation}
                    onChange={(e) => setSelectedRwReportLocation(e.target.value)}
                    className="w-full bg-slate-50 text-slate-800 text-sm px-3 py-2.5 rounded-lg border mt-1"
                  >
                    {rws.map(rw => (
                      <option key={rw.id} value={rw.id}>{rw.id} ({rw.namaKetua})</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-650">Pilih Kategori Laporan *</label>
                <select
                  value={formKategori}
                  onChange={(e) => setFormKategori(e.target.value as LaporanKategori)}
                  className="w-full bg-slate-50 text-slate-800 text-sm px-3 py-2.5 rounded-lg border mt-1"
                >
                  <option value="Kegiatan">Kegiatan RW (Kerja Bakti, Posyandu, Rapat Pleno)</option>
                  <option value="Kejadian">Kejadian Luar Biasa (Kebencanaan, Kebakaran, Musibah Sosial, Keamanan)</option>
                  <option value="Pengaduan">Pengaduan Warga (Fasilitas Umum Rusak, Masalah Sampah, Keluhan Bersama)</option>
                </select>
              </div>

              <div ref={dropdownRef} className="relative z-30">
                <label className="block text-xs font-semibold text-slate-650">Identitas Pelapor Warga (Opsional / Anonim jika Kosong)</label>
                <div className="relative mt-1">
                  <input
                    type="text"
                    placeholder="🔎 Cari nama warga pengadu dari basis data..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setIsDropdownOpen(true);
                    }}
                    onFocus={() => setIsDropdownOpen(true)}
                    className="w-full bg-slate-50 text-slate-800 text-sm px-3.5 py-2.5 pr-10 rounded-lg border focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery("");
                        setSelectedWargaReporter(0);
                        setIsDropdownOpen(true);
                      }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-sm font-bold cursor-pointer"
                    >
                      &times;
                    </button>
                  )}
                </div>

                {isDropdownOpen && (
                  <div className="absolute z-55 mt-1 max-h-40 w-full overflow-auto rounded-lg bg-white py-1 shadow-lg border border-slate-150 text-xs">
                    {filteredWargaOptions.length === 0 ? (
                      <div className="px-4 py-3 text-slate-400 italic text-center">
                        Tidak ada data warga ditemukan
                      </div>
                    ) : (
                      filteredWargaOptions.map((w) => {
                        const isSelected = w.id === selectedWargaReporter;
                        return (
                          <button
                            key={w.id}
                            type="button"
                            onClick={() => {
                              setSelectedWargaReporter(w.id);
                              setSearchQuery(w.nama);
                              setIsDropdownOpen(false);
                            }}
                            className={`w-full text-left px-4 py-2.5 transition-colors cursor-pointer border-b border-slate-50 last:border-0 flex flex-col ${
                              isSelected 
                                ? "bg-indigo-50 text-indigo-900 font-semibold" 
                                : "hover:bg-slate-50 text-slate-700"
                            }`}
                          >
                            <span className="text-xs font-medium">{w.nama}</span>
                            <span className="text-[10px], text-slate-400 mt-0.5">NIK: {w.nik} &bull; {w.rwId}</span>
                          </button>
                        );
                      })
                    )}
                  </div>
                )}

                {selectedWargaReporter > 0 && (
                  (() => {
                    const activeP = selectableWarga.find(w => String(w.id).trim() === String(selectedWargaReporter).trim());
                    if (!activeP) return null;
                    return (
                      <div className="mt-2.5 bg-indigo-50/50 border border-indigo-100 p-2.5 rounded-lg flex items-center justify-between text-xs">
                        <div>
                          <p className="text-slate-800 font-semibold">{activeP.nama}</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">NIK {activeP.nik} &bull; {activeP.rwId} &bull; Status: {activeP.hubungan}</p>
                        </div>
                        <span className="bg-indigo-105 text-indigo-900 text-[9px] font-bold px-2 py-0.5 rounded uppercase">Pelapor Aktif</span>
                      </div>
                    );
                  })()
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-650">Uraian Detail Laporan *</label>
                <textarea
                  required
                  placeholder="Deskripsikan agenda kegiatan, kronologi kejadian luar biasa, atau keluhan infrastruktur sedetail mungkin..."
                  value={formDeskripsi}
                  onChange={(e) => setFormDeskripsi(e.target.value)}
                  rows={4}
                  className="w-full bg-slate-50 text-slate-800 text-sm px-3.5 py-2 rounded-lg border mt-1 focus:outline-none focus:bg-white text-slate-700"
                />
              </div>

              {/* Photo upload attachment with CAMERA and GALLERY options */}
              <div>
                <label className="block text-xs font-semibold text-slate-650 mb-1.5">Unggah Foto Lampiran Laporan (Hingga 3 Foto)</label>
                
                <div className="grid grid-cols-3 gap-2 mb-3.5">
                  {formFotoList.map((foto, idx) => (
                    <div key={idx} className="relative h-16 bg-slate-100 rounded border overflow-hidden">
                      <img src={foto} className="w-full h-full object-cover" alt="Upload Preview" referrerPolicy="no-referrer" />
                      <button
                        type="button"
                        onClick={() => removeFotoFromList(idx)}
                        className="absolute top-1 right-1 bg-red-600 text-white rounded-full h-4.5 w-4.5 text-3xs font-bold leading-none flex items-center justify-center cursor-pointer shadow-xs"
                      >
                        &times;
                      </button>
                    </div>
                  ))}
                  
                  {formFotoList.length < 3 && (
                    <div className="col-span-3">
                      <div className="grid grid-cols-2 gap-2 p-3 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                        {/* Camera */}
                        <label className="flex flex-col items-center justify-center p-3.5 bg-white hover:bg-emerald-50/20 border border-slate-200 hover:border-emerald-500 rounded-lg cursor-pointer transition-all text-center">
                          <input
                            type="file"
                            accept="image/*"
                            capture="environment"
                            onChange={handlePhotoUpload}
                            className="hidden"
                          />
                          <Camera className="w-5 h-5 text-emerald-600 mb-1" />
                          <span className="text-[11px] font-bold text-slate-700">Potret Kamera</span>
                          <span className="text-[9px] text-slate-400 mt-0.5 font-sans">Kamera Langsung</span>
                        </label>

                        {/* Gallery */}
                        <label className="flex flex-col items-center justify-center p-3.5 bg-white hover:bg-indigo-50/20 border border-slate-200 hover:border-indigo-650 rounded-lg cursor-pointer transition-all text-center">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handlePhotoUpload}
                            className="hidden"
                          />
                          <ImageIcon className="w-5 h-5 text-indigo-700 mb-1" />
                          <span className="text-[11px] font-bold text-slate-700">Pilih Gallery</span>
                          <span className="text-[9px] text-slate-400 mt-0.5 font-sans">Kompres Otomatis</span>
                        </label>
                      </div>
                    </div>
                  )}
                </div>

                <div className="bg-slate-50 p-2.5 rounded-lg border text-[11px] text-slate-505 shadow-2xs">
                  <span className="font-semibold block text-slate-650 mb-1">Simulasi Generator Foto Cepat:</span>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => injectPresetPhoto("kerjaBakti")} className="bg-slate-200 hover:bg-slate-300 px-2 py-1 rounded text-2xs cursor-pointer">Foto Kerja Bakti</button>
                    <button type="button" onClick={() => injectPresetPhoto("jalanRusak")} className="bg-slate-200 hover:bg-slate-300 px-2 py-1 rounded text-2xs cursor-pointer">Foto Jalan Rusak</button>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t flex justify-end gap-3 text-sm">
                <button
                  type="button"
                  onClick={() => setIsReportModalOpen(false)}
                  className="px-4 py-2 border text-slate-500 hover:bg-slate-50 rounded-lg cursor-pointer"
                >
                  Batalkan
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-900 hover:bg-indigo-950 text-white font-medium rounded-lg cursor-pointer flex items-center gap-1.5"
                >
                  <Send className="w-4 h-4" />
                  Simpan Laporan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detail overlay Modal */}
      {selectedDetailLaporan && (
        <div className="fixed inset-0 z-40 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-100 max-h-[92vh] flex flex-col text-slate-700 animate-in fade-in-50 zoom-in-95 duration-150">
            <div className="bg-slate-800 text-white px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-indigo-400" />
                <h3 className="font-semibold text-sm font-mono">DRAF JURNAL DETAIL LAPORAN #{selectedDetailLaporan.id}</h3>
              </div>
              <button 
                onClick={() => setSelectedDetailLaporan(null)} 
                className="text-white hover:text-white/80 p-1 rounded-full hover:bg-slate-700 cursor-pointer animate-none"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5 overflow-y-auto flex-1">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className={`inline-block px-2.5 py-0.5 rounded text-3xs font-extrabold uppercase ${
                    selectedDetailLaporan.kategori === "Kegiatan" ? "bg-emerald-100 text-emerald-805" :
                    selectedDetailLaporan.kategori === "Kejadian" ? "bg-rose-105 text-rose-805 animate-pulse" : "bg-purple-100 text-purple-800"
                  }`}>
                    {selectedDetailLaporan.kategori === "Kegiatan" ? "Sosialisasi / Kegiatan RW" :
                     selectedDetailLaporan.kategori === "Kejadian" ? "Kejadian Darurat (911)" : "Pengaduan & Aspirasi Publik"}
                  </span>
                  <p className="text-[10px] text-slate-400 font-mono mt-1">Dikirimkan: {selectedDetailLaporan.tanggal}</p>
                </div>

                <span className={`inline-block px-3 py-1 rounded text-3xs font-black uppercase tracking-widest ${
                  selectedDetailLaporan.status === "Selesai" ? "bg-emerald-100 text-emerald-800" :
                  selectedDetailLaporan.status === "Arsip" ? "bg-slate-150 text-slate-750" : "bg-amber-100 text-amber-900"
                }`}>
                  {selectedDetailLaporan.status === "Diproses" ? "Sedang Diproses" :
                   selectedDetailLaporan.status === "Selesai" ? "Selesai Ditindak lanjuti" : "Diarsip"}
                </span>
              </div>

              {/* Location metadata */}
              <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl space-y-2.5 text-xs text-slate-700">
                <span className="text-[10px] font-bold text-slate-400 tracking-wider block">INFORMASI PELAPOR & WILAYAH</span>
                <div className="grid grid-cols-2 gap-y-2 gap-x-4">
                  <div>
                    <span className="text-slate-400">Wilayah Rujukan:</span>
                    <p className="font-semibold mt-0.5">{selectedDetailLaporan.rwId}</p>
                  </div>
                  <div>
                    <span className="text-slate-400">Status Kejadian:</span>
                    <p className="font-semibold text-amber-800 mt-0.5">{selectedDetailLaporan.status}</p>
                  </div>
                  <div className="col-span-2 border-t pt-2 mt-1">
                    <span className="text-slate-400 block mb-0.5">Pelapor Warga Terdata:</span>
                    {(() => {
                      const rep = selectedDetailLaporan.wargaId ? warga.find(w => String(w.id).trim() === String(selectedDetailLaporan.wargaId).trim()) : null;
                      if (rep) {
                        return <span className="font-bold text-slate-800">{rep.nama} (NIK {rep.nik} &bull; {rep.rwId})</span>;
                      }
                      return <span className="text-slate-450 italic">Anonim (Tanpa Mencantumkan Identitas)</span>;
                    })()}
                  </div>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-400 tracking-wider block">URAIAN DETAIL LAPORAN</span>
                <p className="text-xs text-slate-650 leading-relaxed bg-slate-50 border border-slate-100 rounded-xl p-4 whitespace-pre-wrap italic">
                  "{selectedDetailLaporan.deskripsi}"
                </p>
              </div>

              {/* Documentation photos */}
              {selectedDetailLaporan.fotoList && selectedDetailLaporan.fotoList.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold text-slate-400 tracking-wider block">DOKUMENTASI FOTO BUKTI FOTO ({selectedDetailLaporan.fotoList.length})</span>
                  <div className="grid grid-cols-3 gap-2.5">
                    {selectedDetailLaporan.fotoList.map((foto, idx) => (
                      <div 
                        key={idx} 
                        onClick={() => setActiveLightboxImg(foto)}
                        className="h-20 border rounded-lg overflow-hidden bg-slate-100 cursor-zoom-in hover:opacity-95 shadow-2xs group relative"
                        title="Zoom Foto"
                      >
                        <img src={foto} className="w-full h-full object-cover transition-transform group-hover:scale-105" alt="Lampiran" referrerPolicy="no-referrer" />
                        <div className="absolute inset-0 bg-slate-900/10 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-3xs font-semibold backdrop-blur-xs transition-opacity">Zoom</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Remarks commentary */}
              {selectedDetailLaporan.komentarAdmin && (
                <div className="bg-indigo-50/55 p-4 rounded-xl border border-indigo-100 space-y-1 text-xs text-indigo-950">
                  <span className="text-[10px] uppercase font-bold text-indigo-500 tracking-wider flex items-center gap-1.5 leading-none">
                    <MessageSquare className="w-3.5 h-3.5" />
                    TINDAK LANJUT / TANGGAPAN DARI KEPALA DUSUN
                  </span>
                  <p className="leading-relaxed mt-1">{selectedDetailLaporan.komentarAdmin}</p>
                </div>
              )}
            </div>

            {/* Actions tools footer */}
            <div className="p-4 bg-slate-50 border-t flex flex-wrap items-center justify-between gap-3 text-sm">
              <div className="flex gap-2">
                {((currentUser.role === "User" && selectedDetailLaporan.rwId === currentUser.rwId && selectedDetailLaporan.status === "Diproses") || currentUser.role === "Admin") && (
                  <button
                    onClick={() => { setSelectedDetailLaporan(null); openEditReportModal(selectedDetailLaporan); }}
                    className="px-3.5 py-1.5 bg-slate-150 hover:bg-indigo-100 text-indigo-900 font-bold rounded-lg cursor-pointer transition-colors flex items-center gap-1.5 text-xs"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    Edit Laporan
                  </button>
                )}

                {((currentUser.role === "User" && selectedDetailLaporan.rwId === currentUser.rwId && selectedDetailLaporan.status === "Diproses") || currentUser.role === "Admin") && (
                  <button
                    onClick={() => handleDeleteReport(selectedDetailLaporan.id)}
                    className="px-3.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-lg cursor-pointer transition-colors flex items-center gap-1.5 text-xs"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Hapus Laporan
                  </button>
                )}
              </div>

              <div className="flex gap-2">
                {currentUser.role === "Admin" && selectedDetailLaporan.status !== "Selesai" && (
                  <button
                    onClick={() => { setSelectedDetailLaporan(null); setViewingReport(selectedDetailLaporan); setCommentText(selectedDetailLaporan.komentarAdmin || ""); }}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-lg cursor-pointer"
                  >
                    Tanggapi Laporan
                  </button>
                )}

                <button
                  onClick={() => printSingleLaporan(selectedDetailLaporan)}
                  className="px-4 py-1.5 bg-indigo-650 hover:bg-indigo-750 text-white font-bold text-xs rounded-lg cursor-pointer flex items-center gap-1.5 transition-colors"
                  title="Cetak Berita Laporan dan Surat Keterangan"
                  id="btn-print-single-laporan"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Cetak PDF Laporan
                </button>

                <button
                  onClick={() => setSelectedDetailLaporan(null)}
                  className="px-4 py-1.5 bg-white border border-slate-205 hover:bg-slate-100 font-bold text-slate-700 text-xs rounded-lg cursor-pointer"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tanggapi / Comment Modal boxes */}
      {viewingReport && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 text-slate-700">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden border border-slate-100">
            <div className="bg-slate-800 text-white px-5 py-4 flex items-center justify-between">
              <h3 className="font-semibold text-base font-display">Tindak Lanjut & Tanggapan Dusun</h3>
              <button onClick={() => setViewingReport(null)} className="text-white hover:text-white/80 text-lg font-bold cursor-pointer">&times;</button>
            </div>

            <div className="p-5 space-y-4">
              <div className="bg-slate-50 p-3.5 rounded-lg border space-y-1 text-xs">
                <div><span className="text-slate-400 font-medium">Laporan:</span> <strong className="text-slate-800 italic">"{viewingReport.deskripsi}"</strong></div>
                <div><span className="text-slate-400 font-medium font-sans">Asal RW:</span> <strong className="text-slate-800">{viewingReport.rwId}</strong></div>
              </div>

              <div>
                <label className="block text-2xs font-semibold uppercase tracking-wider text-slate-400">Pemberian Respon & Arahan Tindak Lanjut</label>
                <textarea
                  placeholder="Mis. Tim lapangan desa akan mengunjungi lokasi minggu ini, atau instruksi kerja..."
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  rows={3}
                  className="w-full bg-slate-50 text-slate-800 text-sm px-3.5 py-2.5 rounded-lg border mt-1 focus:outline-none focus:bg-white"
                />
              </div>

              <div className="pt-2 border-t flex justify-between gap-2 text-sm font-semibold">
                <button
                  type="button"
                  onClick={() => handleUpdateReportState(viewingReport.id, "Arsip")}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg cursor-pointer flex items-center gap-1"
                >
                  <Archive className="w-4 h-4" />
                  Arsipkan
                </button>

                <button
                  type="button"
                  onClick={() => handleUpdateReportState(viewingReport.id, "Selesai")}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg cursor-pointer flex items-center gap-1"
                >
                  <Check className="w-4 h-4" />
                  Tandai Selesai
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cross-browser interactive lightbox modal */}
      {activeLightboxImg && (
        <div 
          className="fixed inset-0 z-[110] bg-slate-950/95 flex flex-col items-center justify-center p-4 select-none"
          onClick={() => setActiveLightboxImg(null)}
          id="custom-lightbox-portal"
        >
          {/* Close button with high contrast */}
          <button 
            type="button"
            onClick={(e) => { e.stopPropagation(); setActiveLightboxImg(null); }}
            className="absolute top-4 right-4 bg-slate-800/80 hover:bg-slate-700/80 text-white rounded-full p-3 transition-all duration-150 border border-slate-750 hover:scale-105 shadow-md flex items-center justify-center cursor-pointer"
            title="Tutup Preview"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Main image container */}
          <div 
            className="relative max-w-4xl max-h-[75vh] flex items-center justify-center p-2 bg-slate-900 border border-slate-800 rounded-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <img 
              src={activeLightboxImg} 
              alt="Pratinjau Foto Dokumentasi" 
              className="max-w-full max-h-[70vh] rounded-lg shadow-2xl object-contain"
              referrerPolicy="no-referrer"
            />
          </div>

          {/* Bottom helper actions banner */}
          <div 
            className="mt-6 flex flex-wrap items-center justify-center gap-4 bg-slate-900 px-5 py-3 rounded-full border border-slate-800 text-xs shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <span className="text-slate-400 font-medium">Opsi Foto Dokumentasi:</span>
            <span className="h-3 w-px bg-slate-800 hidden sm:inline" />
            
            {/* Safe Chrome open-in-new-tab using same-origin about:blank buffer */}
            <button
              type="button"
              onClick={() => {
                if (activeLightboxImg.startsWith("data:")) {
                  const win = window.open();
                  if (win) {
                    win.document.write(`
                      <html>
                        <head>
                          <title>Pratinjau Laporan Foto</title>
                          <style>
                            body { margin: 0; background: #020617; display: flex; justify-content: center; align-items: center; min-height: 100vh; }
                            img { max-width: 95%; max-height: 95vh; object-fit: contain; border-radius: 8px; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.8); }
                          </style>
                        </head>
                        <body>
                          <img src="${activeLightboxImg}" alt="Foto Laporan" />
                        </body>
                      </html>
                    `);
                    win.document.close();
                  } else {
                    alert("Pop-up diblokir oleh browser Anda. Izinkan pop-up untuk membuka foto asli.");
                  }
                } else {
                  window.open(activeLightboxImg, "_blank");
                }
              }}
              className="text-indigo-400 hover:text-indigo-300 font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Buka foto asli di tab baru"
            >
              <ExternalLink className="w-4 h-4" />
              Buka di Tab Baru
            </button>

            <span className="h-3 w-px bg-slate-800" />

            {/* Direct down-load to bypass frame constraints */}
            <button
              type="button"
              onClick={() => {
                const link = document.createElement("a");
                link.href = activeLightboxImg;
                link.download = `dokumentasi-laporan-${Date.now()}.png`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
              }}
              className="text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Unduh foto dokumentasi langsung ke perangkat Anda"
            >
              <Download className="w-4 h-4" />
              Unduh Gambar
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
