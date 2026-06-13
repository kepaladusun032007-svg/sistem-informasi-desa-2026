/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from "react";
import { Warga, RW, User, JadwalRonda, KegiatanRutin, KegiatanRutinKat } from "../types";
import { 
  Calendar, 
  Shield, 
  Clock, 
  Plus, 
  Trash2, 
  Edit3, 
  Search, 
  MapPin, 
  Moon, 
  Check, 
  X, 
  Printer, 
  Filter, 
  Info, 
  Users, 
  AlertCircle,
  Hash,
  ChevronRight,
  BookOpen
} from "lucide-react";

interface AgendaPanelProps {
  warga: Warga[];
  rws: RW[];
  ronda: JadwalRonda[];
  kegiatan: KegiatanRutin[];
  currentUser: User;
  onUpdateRonda: (updatedRonda: JadwalRonda[]) => void;
  onUpdateKegiatan: (updatedKegiatan: KegiatanRutin[]) => void;
}

const HARI_LIST = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"] as const;
const KATEGORI_LIST: KegiatanRutinKat[] = ["Kesehatan", "Keagamaan", "Gotong Royong", "Sosial", "Rapat / Musyawarah"];

export default function AgendaPanel({
  warga,
  rws,
  ronda,
  kegiatan,
  currentUser,
  onUpdateRonda,
  onUpdateKegiatan
}: AgendaPanelProps) {
  const [activeSubTab, setActiveSubTab] = useState<"ronda" | "kegiatan">("ronda");

  // Filters
  const [filterRw, setFilterRw] = useState<string>(
    currentUser.role === "User" ? currentUser.rwId || "RW 03" : "Semua"
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [filterKategori, setFilterKategori] = useState<string>("Semua");

  // State Modals
  const [isRondaModalOpen, setIsRondaModalOpen] = useState(false);
  const [isKegiatanModalOpen, setIsKegiatanModalOpen] = useState(false);

  // Ronda Form State
  const [editingRondaId, setEditingRondaId] = useState<number | null>(null);
  const [rondaHari, setRondaHari] = useState<typeof HARI_LIST[number]>("Senin");
  const [rondaRwId, setRondaRwId] = useState<string>(
    currentUser.role === "User" ? currentUser.rwId || "RW 03" : "RW 03"
  );
  const [rondaWargaIds, setRondaWargaIds] = useState<number[]>([]);
  const [rondaLokasiSektor, setRondaLokasiSektor] = useState("");
  const [rondaJamMulai, setRondaJamMulai] = useState("22:00");
  const [rondaJamSelesai, setRondaJamSelesai] = useState("04:00");
  const [rondaKeterangan, setRondaKeterangan] = useState("");
  const [rondaSearchCitizen, setRondaSearchCitizen] = useState("");

  // Kegiatan Form State
  const [editingKegiatanId, setEditingKegiatanId] = useState<number | null>(null);
  const [kegiatanNama, setKegiatanNama] = useState("");
  const [kegiatanRwId, setKegiatanRwId] = useState<string>(
    currentUser.role === "User" ? currentUser.rwId || "RW 03" : "Semua RW"
  );
  const [kegiatanKategori, setKegiatanKategori] = useState<KegiatanRutinKat>("Sosial");
  const [kegiatanFrekuensi, setKegiatanFrekuensi] = useState("");
  const [kegiatanLokasi, setKegiatanLokasi] = useState("");
  const [kegiatanWaktu, setKegiatanWaktu] = useState("");
  const [kegiatanPenanggungJawab, setKegiatanPenanggungJawab] = useState("");
  const [kegiatanDeskripsi, setKegiatanDeskripsi] = useState("");

  // Error State
  const [formError, setFormError] = useState("");

  // Get active residents list based on selected RW for Ronda assignment
  const activeWargaSorted = useMemo(() => {
    return warga
      .filter(w => w.status === "Aktif")
      .sort((a, b) => a.nama.localeCompare(b.nama));
  }, [warga]);

  // Filters calculation
  const filteredRonda = useMemo(() => {
    return ronda.filter(item => {
      const matchRw = filterRw === "Semua" || item.rwId === filterRw;
      const matchQuery = searchQuery === "" || 
        item.hari.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.lokasiSektor.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.keterangan && item.keterangan.toLowerCase().includes(searchQuery.toLowerCase())) ||
        item.wargaIds.some(wId => {
          const person = warga.find(w => w.id === wId);
          return person?.nama.toLowerCase().includes(searchQuery.toLowerCase());
        });
      return matchRw && matchQuery;
    });
  }, [ronda, filterRw, searchQuery, warga]);

  const filteredKegiatan = useMemo(() => {
    return kegiatan.filter(item => {
      const matchRw = filterRw === "Semua" || item.rwId === filterRw || item.rwId === "Semua RW";
      const matchKat = filterKategori === "Semua" || item.kategori === filterKategori;
      const matchQuery = searchQuery === "" ||
        item.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.lokasi.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.penanggungJawab.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.deskripsi.toLowerCase().includes(searchQuery.toLowerCase());
      return matchRw && matchKat && matchQuery;
    });
  }, [kegiatan, filterRw, filterKategori, searchQuery]);

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

  const printContent = (htmlContent: string, fileNamePrefix: string = "agenda") => {
    const isInsideIframe = window.self !== window.top;
    
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
      }, 500);
    } catch (err) {
      console.error("System-level print block:", err);
      if (!isInsideIframe) {
        triggerHtmlDownload(htmlContent, fileNamePrefix);
      }
    }

    if (isInsideIframe) {
      setTimeout(() => {
        alert("💡 TIPS CETAK PORTAL SUKAMAJU:\n\nKarena terhalang batasan keamanan Sandbox Browser (iFrame), berkas laporan agenda resmi siap cetak ini telah BERHASIL DIUNDUH ke komputer Anda sebagai file HTML mandiri!\n\nCara Mencetak:\n1. Buka berkas HTML hasil unduhan tersebut.\n2. Tekan Ctrl+P (Cmd+P di Mac OS) lalu pilih 'Simpan sebagai PDF' atau cetak langsung menggunakan printer fisik Anda.\n\nAlternatif:\nKlik tombol 'Open in New Tab' di kanan atas layar pratinjau Anda untuk menggunakan tombol cetak bawaan secara langsung!");
      }, 500);
    }
  };

  // Printing Ronda Schedule
  const printRondaPDF = () => {
    const formattedDate = new Date().toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric"
    });

    const wilayahText = filterRw === "Semua" ? "Dusun III Sukamaju (Semua RW)" : `Wilayah Lingkungan ${filterRw}`;

    const rondaRows = filteredRonda.map((item, index) => {
      const names = item.wargaIds.map(id => {
        const p = warga.find(w => w.id === id);
        return p ? `&bull; ${p.nama} (${p.kontak || "Tidak ada kontak"})` : "";
      }).filter(n => n !== "").join("<br/>");

      return `
        <tr style="page-break-inside: avoid;">
          <td style="border: 1px solid #94a3b8; padding: 10px; text-align: center; font-weight: bold; font-size: 10pt;">${index + 1}</td>
          <td style="border: 1px solid #94a3b8; padding: 10px; font-weight: bold; color: #1e293b; font-size: 10pt; text-align: center;">${item.hari}</td>
          <td style="border: 1px solid #94a3b8; padding: 10px; font-weight: bold; text-align: center; font-size: 9.5pt; color: #047857;">${item.rwId}</td>
          <td style="border: 1px solid #94a3b8; padding: 10px; font-size: 9.5pt; line-height: 1.5;">${names || "<span style='color: #94a3b8; font-style: italic;'>Belum ada petugas ronda</span>"}</td>
          <td style="border: 1px solid #94a3b8; padding: 10px; font-size: 9.5pt;">
            <strong>Sektor:</strong> ${item.lokasiSektor}<br/>
            <span style="font-size: 8.5pt; color: #475569;">Waktu: ${item.jamMulai} - ${item.jamSelesai} WIB</span>
          </td>
          <td style="border: 1px solid #94a3b8; padding: 10px; font-size: 9pt; color: #475569;">${item.keterangan || "-"}</td>
        </tr>
      `;
    }).join("");

    const html = `
      <html>
        <head>
          <title>Jadwal Ronda Siskamling Dusun Sukamaju</title>
          <style>
            body { font-family: 'Inter', system-ui, -apple-system, sans-serif; color: #0f172a; padding: 30px; line-height: 1.4; }
            .header { text-align: center; border-bottom: 3px double #000; padding-bottom: 10px; margin-bottom: 25px; }
            .header h3 { margin: 0; font-size: 13pt; text-transform: uppercase; letter-spacing: 0.5px; color: #334155; font-weight: 500; }
            .header h2 { margin: 4px 0; font-size: 16pt; text-transform: uppercase; font-weight: bold; color: #000; }
            .header p { margin: 0; font-size: 9pt; font-style: italic; color: #475569; }
            
            .doc-title { text-align: center; margin-bottom: 25px; }
            .doc-title h4 { margin: 0; font-size: 13pt; text-transform: uppercase; font-weight: bold; text-decoration: underline; }
            .doc-title p { margin: 5px 0 0 0; font-size: 9.5pt; color: #334155; }
            
            table { width: 100%; border-collapse: collapse; margin-top: 15px; }
            th { background-color: #f1f5f9; border: 1px solid #94a3b8; padding: 10px; font-size: 9.5pt; font-weight: bold; text-align: center; text-transform: uppercase; }
            
            .pos-info { margin-top: 30px; padding: 12px; border: 1px dashed #64748b; border-radius: 6px; background-color: #f8fafc; font-size: 9pt; line-height: 1.5; }
            .pos-info-title { font-weight: bold; text-transform: uppercase; color: #1e293b; margin-bottom: 4px; display: block; }
            
            .footer-signs { margin-top: 50px; display: grid; grid-template-columns: 1fr 220px; gap: 20px; text-align: center; font-size: 9.5pt; page-break-inside: avoid; }
            .sign-col { display: flex; flex-direction: column; justify-content: space-between; height: 110px; }
            
            @media print {
              body { padding: 10px; margin: 0; }
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
            <h4>JADWAL DINAS RONDA MALAM (SISKAMLING)</h4>
            <p>Wilayah: ${wilayahText} &bull; Dicetak pada tanggal: ${formattedDate}</p>
          </div>

          <table>
            <thead>
              <tr>
                <th style="width: 5%;">No</th>
                <th style="width: 12%;">Hari</th>
                <th style="width: 10%;">Asal RW</th>
                <th style="width: 33%;">Nama Petugas Ronda</th>
                <th style="width: 25%;">Area Sektor & Jam Tugas</th>
                <th style="width: 15%;">Keterangan Tambahan</th>
              </tr>
            </thead>
            <tbody>
              ${rondaRows || `
                <tr>
                  <td colspan="6" style="border: 1px solid #94a3b8; padding: 20px; text-align: center; color: #64748b; font-style: italic;">
                    Tidak ada jadwal tugas ronda malam yang terdaftar untuk filter wilayah ini.
                  </td>
                </tr>
              `}
            </tbody>
          </table>

          <div class="pos-info">
            <span class="pos-info-title">⚠️ INSTRUKSI OPERASIONAL SISKAMLING DUSUN SUKAMAJU:</span>
            1. Setiap petugas wajib hadir di Pos Ronda 15 menit sebelum jam tugas dimulai.<br/>
            2. Melakukan patroli keliling sektor minimal 1 jam sekali secara berpasangan.<br/>
            3. Membawa perlengkapan keselamatan standar (senter, tongkat patroli, jas hujan).<br/>
            4. Jika menemukan kecurigaan atau keadaan darurat, segera hubungi Ketua RT/RW setempat atau Babinsa/Bhabinkamtibmas desa.
          </div>

          <div class="footer-signs">
            <div></div>
            <div class="sign-col">
              <div>Kuningan, ${formattedDate}</div>
              <div>Kepala Dusun III Sukamaju,</div>
              <div style="font-weight: bold; text-decoration: underline; text-transform: uppercase;">BUDI SANTOSO</div>
            </div>
          </div>
        </body>
      </html>
    `;

    printContent(html, `Jadwal_Ronda_Poskamling_${filterRw}_Sukamaju`);
  };

  // Printing Routine Activities
  const printKegiatanPDF = () => {
    const formattedDate = new Date().toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric"
    });

    const kategoriText = filterKategori === "Semua" ? "Semua Kategori" : `Kategori ${filterKategori}`;
    const wilayahText = filterRw === "Semua" ? "Seluruh Dusun Sukamaju" : `Wilayah ${filterRw}`;

    const kegiatanRows = filteredKegiatan.map((item, index) => {
      return `
        <tr style="page-break-inside: avoid;">
          <td style="border: 1px solid #94a3b8; padding: 10px; text-align: center; font-weight: bold; font-size: 9.5pt;">${index + 1}</td>
          <td style="border: 1px solid #94a3b8; padding: 10px; font-weight: bold; color: #0d9488; font-size: 10pt;">${item.nama}</td>
          <td style="border: 1px solid #94a3b8; padding: 10px; text-align: center; font-size: 9pt;">
            <span style="display: block; font-weight: bold; color: #475569;">${item.kategori}</span>
            <span style="font-size: 8pt; color: #64748b; background-color: #f1f5f9; padding: 2px 6px; border-radius: 4px; display: inline-block; margin-top: 4px;">${item.rwId}</span>
          </td>
          <td style="border: 1px solid #94a3b8; padding: 10px; font-size: 9pt; line-height: 1.4;">
            <strong>Frekuensi:</strong> ${item.frekuensi}<br/>
            <strong>Waktu:</strong> ${item.waktu}
          </td>
          <td style="border: 1px solid #94a3b8; padding: 10px; font-size: 9.5pt;">
            <strong>Tempat:</strong> ${item.lokasi}<br/>
            <strong>Pj:</strong> ${item.penanggungJawab}
          </td>
          <td style="border: 1px solid #94a3b8; padding: 10px; font-size: 8.5pt; color: #334155;">${item.deskripsi || "-"}</td>
        </tr>
      `;
    }).join("");

    const html = `
      <html>
        <head>
          <title>Daftar Kegiatan Rutin Dusun Sukamaju</title>
          <style>
            body { font-family: 'Inter', system-ui, -apple-system, sans-serif; color: #0f172a; padding: 30px; line-height: 1.4; }
            .header { text-align: center; border-bottom: 3px double #000; padding-bottom: 10px; margin-bottom: 25px; }
            .header h3 { margin: 0; font-size: 13pt; text-transform: uppercase; letter-spacing: 0.5px; color: #334155; font-weight: 500; }
            .header h2 { margin: 4px 0; font-size: 16pt; text-transform: uppercase; font-weight: bold; color: #000; }
            .header p { margin: 0; font-size: 9pt; font-style: italic; color: #475569; }
            
            .doc-title { text-align: center; margin-bottom: 25px; }
            .doc-title h4 { margin: 0; font-size: 13pt; text-transform: uppercase; font-weight: bold; text-decoration: underline; }
            .doc-title p { margin: 5px 0 0 0; font-size: 9.5pt; color: #334155; }
            
            table { width: 100%; border-collapse: collapse; margin-top: 15px; }
            th { background-color: #f1f5f9; border: 1px solid #94a3b8; padding: 10px; font-size: 9.5pt; font-weight: bold; text-align: center; text-transform: uppercase; }
            
            .footer-signs { margin-top: 50px; display: grid; grid-template-columns: 1fr 220px; gap: 20px; text-align: center; font-size: 9.5pt; page-break-inside: avoid; }
            .sign-col { display: flex; flex-direction: column; justify-content: space-between; height: 110px; }
            
            @media print {
              body { padding: 10px; margin: 0; }
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
            <h4>AGENDA JADWAL KEGIATAN RUTIN MASYARAKAT</h4>
            <p>Filter: ${kategoriText} &bull; Lingkup Wilayah: ${wilayahText} &bull; Cetak: ${formattedDate}</p>
          </div>

          <table>
            <thead>
              <tr>
                <th style="width: 5%;">No</th>
                <th style="width: 20%;">Nama Kegiatan</th>
                <th style="width: 15%;">Kategori & Wilayah</th>
                <th style="width: 23%;">Jadwal & Waktu</th>
                <th style="width: 20%;">Tempat & Penanggung Jawab</th>
                <th style="width: 17%;">Deskripsi Ringkas</th>
              </tr>
            </thead>
            <tbody>
              ${kegiatanRows || `
                <tr>
                  <td colspan="6" style="border: 1px solid #94a3b8; padding: 20px; text-align: center; color: #64748b; font-style: italic;">
                    Tidak ada agenda kegiatan rutin terdaftar untuk fiter ini.
                  </td>
                </tr>
              `}
            </tbody>
          </table>

          <div class="footer-signs">
            <div></div>
            <div class="sign-col">
              <div>Kuningan, ${formattedDate}</div>
              <div>Kepala Dusun III Sukamaju,</div>
              <div style="font-weight: bold; text-decoration: underline; text-transform: uppercase;">BUDI SANTOSO</div>
            </div>
          </div>
        </body>
      </html>
    `;

    printContent(html, `Jadwal_Kegiatan_Masyarakat_${filterRw}_Sukamaju`);
  };

  // ----------------------------------------------------
  // Ronda Actions Handlers
  // ----------------------------------------------------
  const handleOpenRondaCreate = () => {
    setEditingRondaId(null);
    setRondaHari("Senin");
    setRondaRwId(currentUser.role === "User" ? currentUser.rwId || "RW 03" : "RW 03");
    setRondaWargaIds([]);
    setRondaLokasiSektor("");
    setRondaJamMulai("22:00");
    setRondaJamSelesai("04:00");
    setRondaKeterangan("");
    setRondaSearchCitizen("");
    setFormError("");
    setIsRondaModalOpen(true);
  };

  const handleOpenRondaEdit = (item: JadwalRonda) => {
    if (currentUser.role === "User" && item.rwId !== currentUser.rwId) {
      alert("Maaf, Anda hanya dapat mengubah jadwal ronda di wilayah RW Anda sendiri!");
      return;
    }
    setEditingRondaId(item.id);
    setRondaHari(item.hari);
    setRondaRwId(item.rwId);
    setRondaWargaIds([...item.wargaIds]);
    setRondaLokasiSektor(item.lokasiSektor);
    setRondaJamMulai(item.jamMulai);
    setRondaJamSelesai(item.jamSelesai);
    setRondaKeterangan(item.keterangan || "");
    setRondaSearchCitizen("");
    setFormError("");
    setIsRondaModalOpen(true);
  };

  const handleSaveRonda = (e: React.FormEvent) => {
    e.preventDefault();

    if (!rondaLokasiSektor.trim()) {
      setFormError("Sektor atau area patroli siskamling harus diisi!");
      return;
    }

    if (rondaWargaIds.length === 0) {
      setFormError("Minimal pilih satu orang warga sebagai petugas ronda!");
      return;
    }

    let updatedList: JadwalRonda[];
    if (editingRondaId !== null) {
      // Edit
      updatedList = ronda.map(item => {
        if (item.id === editingRondaId) {
          return {
            ...item,
            hari: rondaHari,
            rwId: rondaRwId,
            wargaIds: rondaWargaIds,
            lokasiSektor: rondaLokasiSektor.trim(),
            jamMulai: rondaJamMulai,
            jamSelesai: rondaJamSelesai,
            keterangan: rondaKeterangan.trim()
          };
        }
        return item;
      });
    } else {
      // Create new
      const nextId = ronda.length > 0 ? Math.max(...ronda.map(r => r.id)) + 1 : 1;
      const newItem: JadwalRonda = {
        id: nextId,
        hari: rondaHari,
        rwId: rondaRwId,
        wargaIds: rondaWargaIds,
        lokasiSektor: rondaLokasiSektor.trim(),
        jamMulai: rondaJamMulai,
        jamSelesai: rondaJamSelesai,
        keterangan: rondaKeterangan.trim()
      };
      updatedList = [...ronda, newItem];
    }

    onUpdateRonda(updatedList);
    setIsRondaModalOpen(false);
  };

  const handleDeleteRonda = (id: number, rwId: string) => {
    if (currentUser.role === "User" && rwId !== currentUser.rwId) {
      alert("Maaf, Anda hanya dapat menghapus jadwal ronda di wilayah RW Anda sendiri!");
      return;
    }
    
    if (window.confirm("Apakah Anda yakin ingin menghapus jadwal ronda malam ini?")) {
      const updatedList = ronda.filter(item => item.id !== id);
      onUpdateRonda(updatedList);
    }
  };

  const toggleCitizenForRonda = (citizenId: number) => {
    if (rondaWargaIds.includes(citizenId)) {
      setRondaWargaIds(prev => prev.filter(id => id !== citizenId));
    } else {
      setRondaWargaIds(prev => [...prev, citizenId]);
    }
  };

  // ----------------------------------------------------
  // Kegiatan Actions Handlers
  // ----------------------------------------------------
  const handleOpenKegiatanCreate = () => {
    setEditingKegiatanId(null);
    setKegiatanNama("");
    setKegiatanRwId(currentUser.role === "User" ? currentUser.rwId || "RW 03" : "Semua RW");
    setKegiatanKategori("Sosial");
    setKegiatanFrekuensi("");
    setKegiatanLokasi("");
    setKegiatanWaktu("");
    setKegiatanPenanggungJawab("");
    setKegiatanDeskripsi("");
    setFormError("");
    setIsKegiatanModalOpen(true);
  };

  const handleOpenKegiatanEdit = (item: KegiatanRutin) => {
    if (currentUser.role === "User" && item.rwId !== currentUser.rwId && item.rwId !== "Semua RW") {
      alert("Maaf, Anda hanya dapat mengubah kegiatan koordinasi RW Anda sendiri!");
      return;
    }
    setEditingKegiatanId(item.id);
    setKegiatanNama(item.nama);
    setKegiatanRwId(item.rwId);
    setKegiatanKategori(item.kategori);
    setKegiatanFrekuensi(item.frekuensi);
    setKegiatanLokasi(item.lokasi);
    setKegiatanWaktu(item.waktu);
    setKegiatanPenanggungJawab(item.penanggungJawab);
    setKegiatanDeskripsi(item.deskripsi);
    setFormError("");
    setIsKegiatanModalOpen(true);
  };

  const handleSaveKegiatan = (e: React.FormEvent) => {
    e.preventDefault();

    if (!kegiatanNama.trim()) {
      setFormError("Nama kegiatan wajib diisi!");
      return;
    }

    if (!kegiatanFrekuensi.trim()) {
      setFormError("Jadwal/frekuensi pelaksanaan kegiatan harus diisi!");
      return;
    }

    if (!kegiatanLokasi.trim()) {
      setFormError("Lokasi pelaksanaan kegiatan wajib diisi!");
      return;
    }

    if (!kegiatanWaktu.trim()) {
      setFormError("Waktu pelaksanaan wajib diisi!");
      return;
    }

    if (!kegiatanPenanggungJawab.trim()) {
      setFormError("Nama Instansi/Penanggung Jawab wajib diisi!");
      return;
    }

    let updatedList: KegiatanRutin[];
    if (editingKegiatanId !== null) {
      // Edit
      updatedList = kegiatan.map(item => {
        if (item.id === editingKegiatanId) {
          return {
            ...item,
            nama: kegiatanNama.trim(),
            rwId: kegiatanRwId,
            kategori: kegiatanKategori,
            frekuensi: kegiatanFrekuensi.trim(),
            lokasi: kegiatanLokasi.trim(),
            waktu: kegiatanWaktu.trim(),
            penanggungJawab: kegiatanPenanggungJawab.trim(),
            deskripsi: kegiatanDeskripsi.trim()
          };
        }
        return item;
      });
    } else {
      // Create new
      const nextId = kegiatan.length > 0 ? Math.max(...kegiatan.map(k => k.id)) + 1 : 1;
      const newItem: KegiatanRutin = {
        id: nextId,
        nama: kegiatanNama.trim(),
        rwId: kegiatanRwId,
        kategori: kegiatanKategori,
        frekuensi: kegiatanFrekuensi.trim(),
        lokasi: kegiatanLokasi.trim(),
        waktu: kegiatanWaktu.trim(),
        penanggungJawab: kegiatanPenanggungJawab.trim(),
        deskripsi: kegiatanDeskripsi.trim()
      };
      updatedList = [...kegiatan, newItem];
    }

    onUpdateKegiatan(updatedList);
    setIsKegiatanModalOpen(false);
  };

  const handleDeleteKegiatan = (id: number, rwId: string) => {
    if (currentUser.role === "User" && rwId !== currentUser.rwId && rwId !== "Semua RW") {
      alert("Maaf, Anda hanya dapat menghapus rencana kegiatan di wilayah RW Anda.");
      return;
    }

    if (window.confirm("Apakah Anda yakin ingin menghapus jadwal agenda kegiatan rutin ini?")) {
      const updatedList = kegiatan.filter(item => item.id !== id);
      onUpdateKegiatan(updatedList);
    }
  };

  // Helper categories indicators
  const getKategoriBadgeColor = (kat: KegiatanRutinKat) => {
    switch (kat) {
      case "Kesehatan":
        return "bg-rose-50 text-rose-700 border-rose-200";
      case "Keagamaan":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "Gotong Royong":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "Sosial":
        return "bg-indigo-50 text-indigo-700 border-indigo-200";
      case "Rapat / Musyawarah":
        return "bg-sky-50 text-sky-700 border-sky-200";
      default:
        return "bg-slate-50 text-slate-700 border-slate-200";
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Upper header segment and description */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          <h2 className="text-xl font-semibold text-slate-800 font-display flex items-center gap-2">
            <BookOpen className="w-5.5 h-5.5 text-emerald-600" />
            Agenda & Penjadwalan Warga
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Manajemen agenda siskamling (jadwal ronda) dan kalender kegiatan rutin kemasyarakatan di Dusun III Sukamaju.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => {
              if (activeSubTab === "ronda") {
                printRondaPDF();
              } else {
                printKegiatanPDF();
              }
            }}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-900 text-white font-medium text-xs px-4 py-2.5 rounded-lg transition-colors cursor-pointer"
            title="Cetak Jadwal Laporan Agenda ke PDF"
          >
            <Printer className="w-4 h-4 text-emerald-400" />
            Cetak Cetakan Resmi (PDF)
          </button>

          {activeSubTab === "ronda" ? (
            <button
              onClick={handleOpenRondaCreate}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-xs px-4 py-2.5 rounded-lg transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4 text-slate-950" strokeWidth={2.5} />
              Tambah Jadwal Ronda
            </button>
          ) : (
            <button
              onClick={handleOpenKegiatanCreate}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-xs px-4 py-2.5 rounded-lg transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4 text-slate-950" strokeWidth={2.5} />
              Tambah Kegiatan Rutin
            </button>
          )}
        </div>
      </div>

      {/* Sub tabs navigation */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => {
            setActiveSubTab("ronda");
            setSearchQuery("");
          }}
          className={`px-5 py-3 text-xs font-semibold uppercase tracking-wider border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
            activeSubTab === "ronda"
              ? "border-emerald-600 text-emerald-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Moon className="w-4.5 h-4.5" />
          Jadwal Ronda Malam Siskamling
        </button>
        <button
          onClick={() => {
            setActiveSubTab("kegiatan");
            setSearchQuery("");
          }}
          className={`px-5 py-3 text-xs font-semibold uppercase tracking-wider border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
            activeSubTab === "kegiatan"
              ? "border-emerald-600 text-emerald-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Calendar className="w-4.5 h-4.5" />
          Jadwal Kegiatan Rutin RT/RW
        </button>
      </div>

      {/* Filter and search bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-100 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          
          {/* RW Filter Selector */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Wilayah RW:</span>
            <select
              value={filterRw}
              onChange={(e) => setFilterRw(e.target.value)}
              disabled={currentUser.role === "User"}
              className="bg-slate-50 text-slate-700 text-xs px-3 py-1.5 rounded-lg border border-slate-200 focus:outline-none disabled:opacity-75 disabled:cursor-not-allowed"
            >
              {currentUser.role === "Admin" && <option value="Semua">Semua RW</option>}
              {rws.map(rw => (
                <option key={rw.id} value={rw.id}>{rw.id} ({rw.namaKetua})</option>
              ))}
            </select>
          </div>

          {/* Category Filter selector for Kegiatan only */}
          {activeSubTab === "kegiatan" && (
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Kategori:</span>
              <select
                value={filterKategori}
                onChange={(e) => setFilterKategori(e.target.value)}
                className="bg-slate-50 text-slate-700 text-xs px-3 py-1.5 rounded-lg border border-slate-200 focus:outline-none"
              >
                <option value="Semua">Semua Kategori</option>
                {KATEGORI_LIST.map(kat => (
                  <option key={kat} value={kat}>{kat}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Searching input */}
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder={activeSubTab === "ronda" ? "Cari hari, petugas, sektor..." : "Cari nama kegiatan, lokasi..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 text-xs text-slate-700 pl-9 pr-3 py-1.5 rounded-lg border border-slate-200 focus:border-emerald-500/30 outline-none"
          />
        </div>
      </div>

      {/* Info Warning banner context-based */}
      <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl text-xs text-indigo-800 leading-relaxed flex gap-2.5">
        <Info className="w-4 h-4 text-indigo-650 shrink-0 mt-0.5" />
        <p>
          {currentUser.role === "Admin" ? (
            <span><strong>Mode Otorisasi Kepala Dusun (Admin):</strong> Anda memiliki hak penuh untuk mencatat, mengubah, dan menghapus seluruh kegiatan kemasyarakatan serta regu patroli malam ronda siskamling di seluruh wilayah RW 01-05.</span>
          ) : (
            <span><strong>Mode Otorisasi Ketua {currentUser.rwId}:</strong> Anda dapat mengelola, menambah, dan mengubah agenda rapat kelompok pimpinan serta regu siskamling ronda milik <strong>{currentUser.rwId} pribadi</strong>. Anda tetap leluasa meninjau agenda RW rekan-rekan lain untuk keperluan harmonisasi kerja sama siskamling.</span>
          )}
        </p>
      </div>

      {/* ---------------------------------------------------- */}
      {/* SUBTAB VIEW: JADWAL RONDA MALAM                      */}
      {/* ---------------------------------------------------- */}
      {activeSubTab === "ronda" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredRonda.map((item) => {
            const hasPermission = currentUser.role === "Admin" || currentUser.rwId === item.rwId;
            return (
              <div 
                key={item.id} 
                className="bg-white border border-slate-100 rounded-xl p-4.5 hover:shadow-md hover:border-slate-200 transition-all flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-slate-50">
                    <div className="flex items-center gap-1.5">
                      <div className="h-7 w-7 rounded-lg bg-slate-150 text-slate-700 flex items-center justify-center font-bold text-xs">
                        {item.hari.substring(0, 3)}
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-800 text-sm">{item.hari}</h4>
                        <span className="text-[10px] bg-emerald-50 text-emerald-700 font-bold px-1.5 py-0.5 rounded border border-emerald-100">
                          {item.rwId}
                        </span>
                      </div>
                    </div>
                    
                    {hasPermission && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleOpenRondaEdit(item)}
                          className="p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 rounded-lg transition-colors cursor-pointer"
                          title="Ubah Jadwal Ronda"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteRonda(item.id, item.rwId)}
                          className="p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
                          title="Hapus Jadwal Ronda"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="mt-3.5 space-y-3">
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Pos / Sektor Penjagaan:</span>
                      <p className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                        {item.lokasiSektor}
                      </p>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Jam Dinas Patroli:</span>
                      <p className="text-xs text-slate-600 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        {item.jamMulai} - {item.jamSelesai} WIB
                      </p>
                    </div>

                    <div className="space-y-1.5 pt-1.5 border-t border-slate-50">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block flex items-center gap-1">
                        <Users className="w-3.5 h-3.5 text-slate-400" />
                        Regu Petugas Ronda ({item.wargaIds.length} Orang):
                      </span>
                      <ul className="space-y-1 pl-1">
                        {item.wargaIds.map(wId => {
                          const citizen = warga.find(w => w.id === wId);
                          if (!citizen) return null;
                          return (
                            <li 
                              key={wId} 
                              className="text-xs text-slate-700 flex items-center gap-1 bg-slate-50 px-2 py-1 rounded border border-slate-100"
                            >
                              <div className="h-1.5 w-1.5 bg-emerald-500 rounded-full shrink-0"></div>
                              <span className="font-medium">{citizen.nama}</span>
                              {citizen.kontak && (
                                <span className="text-[9px] text-slate-400 ml-auto font-mono">{citizen.kontak}</span>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  </div>
                </div>

                {item.keterangan && (
                  <div className="bg-slate-50/65 border border-slate-100/85 rounded-lg p-2.5 text-[11px] text-slate-550 leading-relaxed italic">
                    💡 Keterangan: {item.keterangan}
                  </div>
                )}
              </div>
            );
          })}

          {filteredRonda.length === 0 && (
            <div className="col-span-full bg-white rounded-xl border border-slate-100 p-8 text-center text-slate-400">
              <Shield className="w-10 h-10 mx-auto text-slate-300 mb-2.5" />
              <p className="text-sm font-medium">Belum ada dinas ronda yang terjadwal.</p>
              <p className="text-2xs text-slate-400 mt-1">Silakan tambahkan petugas ronda malam baru melalui tombol di kanan atas.</p>
            </div>
          )}
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* SUBTAB VIEW: JADWAL KEGIATAN RUTIN                  */}
      {/* ---------------------------------------------------- */}
      {activeSubTab === "kegiatan" && (
        <div className="space-y-4">
          <div className="overflow-hidden bg-white border border-slate-100 rounded-xl shadow-xs">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-slate-400 font-mono text-[10px] tracking-wider uppercase">
                  <th className="py-3 px-4 text-center w-12"><Hash className="w-3.5 h-3.5 mx-auto" /></th>
                  <th className="py-3 px-4">Nama Kegiatan</th>
                  <th className="py-3 px-4">Kategori & Lingkup</th>
                  <th className="py-3 px-4">Jadwal & Waktu</th>
                  <th className="py-3 px-4">Lokasi & Penanggung Jawab</th>
                  <th className="py-3 px-4">Keterangan / Deskripsi</th>
                  <th className="py-3 px-4 text-right w-24">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-slate-700 text-xs">
                {filteredKegiatan.map((item, idx) => {
                  const hasPermission = currentUser.role === "Admin" || currentUser.rwId === item.rwId || item.rwId === "Semua RW";
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/35 transition-colors">
                      <td className="py-3.5 px-4 text-center font-bold text-slate-400">{idx + 1}</td>
                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-slate-800 text-sm block">{item.nama}</span>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col gap-1 items-start">
                          <span className={`px-2 py-0.5 text-[10px] font-bold border rounded-full ${getKategoriBadgeColor(item.kategori)}`}>
                            {item.kategori}
                          </span>
                          <span className="text-[10px] bg-slate-100 text-slate-600 font-bold px-1.5 py-0.5 rounded">
                            {item.rwId}
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 space-y-1">
                        <span className="font-medium text-slate-700 block flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          {item.frekuensi}
                        </span>
                        <span className="text-slate-500 block flex items-center gap-1 text-[11px]">
                          <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          Jam: {item.waktu}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 space-y-1">
                        <span className="font-medium text-slate-700 block flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                          {item.lokasi}
                        </span>
                        <span className="text-[10px] bg-indigo-50/60 text-indigo-700 px-1.5 py-0.5 rounded inline-block">
                          PJ: {item.penanggungJawab}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 max-w-xs">
                        <p className="text-slate-600 leading-relaxed truncate hover:text-clip hover:overflow-visible hover:whitespace-normal" title={item.deskripsi}>
                          {item.deskripsi || <span className="text-slate-400 italic">Tidak ada deskripsi</span>}
                        </p>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        {hasPermission ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleOpenKegiatanEdit(item)}
                              className="p-1 px-2 border border-slate-200 text-slate-500 hover:border-emerald-500 hover:text-emerald-600 rounded-lg transition-colors cursor-pointer bg-white"
                              title="Ubah Agenda"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteKegiatan(item.id, item.rwId)}
                              className="p-1 px-2 border border-slate-200 text-slate-500 hover:border-rose-500 hover:text-rose-600 rounded-lg transition-colors cursor-pointer bg-white"
                              title="Hapus Agenda"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-400 italic">Hanya Baca</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {filteredKegiatan.length === 0 && (
              <div className="bg-white rounded-xl p-8 text-center text-slate-400">
                <Calendar className="w-10 h-10 mx-auto text-slate-300 mb-2.5" />
                <p className="text-sm font-medium">Belum ada dinas agenda kegiatan rutin terdaftar.</p>
                <p className="text-2xs text-slate-400 mt-1">Silakan tambahkan agenda rutin bulanan baru melalui tombol di kanan atas.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* MODAL WINDOW: RONDA ENTRY MODAL                     */}
      {/* ---------------------------------------------------- */}
      {isRondaModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden relative flex flex-col max-h-[90vh]">
            
            {/* Header */}
            <div className="px-5 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-800 text-sm">
                  {editingRondaId !== null ? "Ubah Jadwal Ronda Malam" : "Tambah Jadwal Ronda Malam Baru"}
                </h3>
                <p className="text-[10px] text-slate-400">Penyusunan siskamling lingkungan warga Sukamaju</p>
              </div>
              <button
                onClick={() => setIsRondaModalOpen(false)}
                className="p-1 px-2 text-slate-400 hover:bg-slate-200 hover:text-slate-800 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveRonda} className="flex-1 overflow-y-auto p-5 space-y-4">
              
              {/* Error Alert */}
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-100 text-rose-700 text-xs rounded-xl flex items-start gap-2 animate-bounce">
                  <AlertCircle className="w-4.5 h-4.5 text-rose-600 shrink-0 mt-0.5" />
                  <span className="font-semibold leading-relaxed">{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                {/* Hari */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-slate-450 uppercase tracking-wider">Pilih Hari Dinas</label>
                  <select
                    className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:bg-white rounded-lg px-3.5 py-2 text-xs text-slate-705 outline-none transition-all cursor-pointer"
                    value={rondaHari}
                    onChange={(e) => setRondaHari(e.target.value as typeof HARI_LIST[number])}
                  >
                    {HARI_LIST.map(h => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                </div>

                {/* RW ID */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-slate-450 uppercase tracking-wider">Lingkup Wilayah RW</label>
                  <select
                    className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:bg-white rounded-lg px-3.5 py-2 text-xs text-slate-705 outline-none transition-all cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed"
                    value={rondaRwId}
                    onChange={(e) => setRondaRwId(e.target.value)}
                    disabled={currentUser.role === "User"}
                  >
                    {rws.map(rw => (
                      <option key={rw.id} value={rw.id}>{rw.id} ({rw.namaKetua})</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Lokasi Pos Sektor */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-slate-450 uppercase tracking-wider">Sektor & Pos Kamling Penjagaan</label>
                <input
                  type="text"
                  placeholder="Contoh: RT 02 Dusun Atas (Pos Ronda Utara)"
                  value={rondaLokasiSektor}
                  onChange={(e) => setRondaLokasiSektor(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:bg-white focus:ring-1 focus:ring-emerald-500 rounded-lg px-3.5 py-2 text-xs text-slate-705 outline-none transition-all"
                />
              </div>

              {/* Jam Mulai & Selesai */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-slate-450 uppercase tracking-wider">Jam Dinas Mulai</label>
                  <input
                    type="time"
                    value={rondaJamMulai}
                    onChange={(e) => setRondaJamMulai(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:bg-white rounded-lg px-3.5 py-2 text-xs text-slate-705 outline-none transition-all"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-slate-450 uppercase tracking-wider">Jam Dinas Selesai</label>
                  <input
                    type="time"
                    value={rondaJamSelesai}
                    onChange={(e) => setRondaJamSelesai(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:bg-white rounded-lg px-3.5 py-2 text-xs text-slate-705 outline-none transition-all"
                  />
                </div>
              </div>

              {/* Regu Petugas Ronda Picker */}
              <div className="space-y-2 border-t border-slate-100 pt-3">
                <div className="flex justify-between items-center">
                  <label className="block text-[10px] font-bold text-slate-450 uppercase tracking-wider">Pilih Regu Petugas Ronda</label>
                  <span className="text-[10px] text-slate-400 font-mono font-bold uppercase">{rondaWargaIds.length} terpilih</span>
                </div>

                <div className="text-2xs text-slate-500 pb-1 flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 inline-block animate-pulse"></span>
                  Gunakan kotak cari untuk mempercepat pencarian warga aktif siskamling:
                </div>

                {/* Autocomplete / searching search input for picking citizens */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Ketikkan nama warga aktif..."
                    value={rondaSearchCitizen}
                    onChange={(e) => setRondaSearchCitizen(e.target.value)}
                    className="w-full bg-slate-50 text-xs text-slate-700 pl-9 pr-3 py-1.5 rounded-lg border border-slate-200 outline-none"
                  />
                </div>

                {/* Selected pills list */}
                {rondaWargaIds.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 p-2 bg-slate-50/50 rounded-lg border border-slate-150">
                    {rondaWargaIds.map(wId => {
                      const person = warga.find(w => w.id === wId);
                      if (!person) return null;
                      return (
                        <span 
                          key={wId}
                          className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-800 text-[10px] font-semibold px-2 py-0.5 rounded border border-emerald-200"
                        >
                          {person.nama}
                          <button
                            type="button"
                            onClick={() => toggleCitizenForRonda(wId)}
                            className="p-0.5 text-emerald-600 hover:text-emerald-900 rounded font-black cursor-pointer"
                          >
                            &times;
                          </button>
                        </span>
                      );
                    })}
                  </div>
                )}

                {/* Full list showing citizens */}
                <div className="border border-slate-150 rounded-lg max-h-40 overflow-y-auto divide-y divide-slate-100 text-xs">
                  {activeWargaSorted
                    .filter(wItem => {
                      // Show residents belonging to selected RW in form
                      const matchesRw = wItem.rwId === rondaRwId;
                      const matchesSearch = rondaSearchCitizen === "" || 
                        wItem.nama.toLowerCase().includes(rondaSearchCitizen.toLowerCase()) ||
                        wItem.nik.includes(rondaSearchCitizen);
                      return matchesRw && matchesSearch;
                    })
                    .map(wItem => {
                      const isChecked = rondaWargaIds.includes(wItem.id);
                      return (
                        <div 
                          key={wItem.id}
                          onClick={() => toggleCitizenForRonda(wItem.id)}
                          className="px-3 py-2 flex items-center justify-between hover:bg-slate-50 cursor-pointer transition-colors"
                        >
                          <div>
                            <span className="font-semibold text-slate-755 block">{wItem.nama}</span>
                            <span className="text-[10px] text-slate-450 block font-mono">{wItem.alamat}</span>
                          </div>
                          <div className={`h-4.5 w-4.5 rounded border flex items-center justify-center transition-all ${
                            isChecked 
                              ? "bg-emerald-600 border-emerald-600 text-white" 
                              : "border-slate-300 bg-white"
                          }`}>
                            {isChecked && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                          </div>
                        </div>
                      );
                    })}

                  {activeWargaSorted.filter(wItem => {
                    const matchesRw = wItem.rwId === rondaRwId;
                    const matchesSearch = rondaSearchCitizen === "" || 
                      wItem.nama.toLowerCase().includes(rondaSearchCitizen.toLowerCase());
                    return matchesRw && matchesSearch;
                  }).length === 0 && (
                    <div className="p-4 text-center text-slate-400 font-medium italic">
                      Tidak menemukan warga aktif di {rondaRwId} untuk kriteria pencarian ini.
                    </div>
                  )}
                </div>
              </div>

              {/* Keterangan */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-slate-450 uppercase tracking-wider">Keterangan / Instruksi Khusus</label>
                <textarea
                  placeholder="Isikan arahan seperti bawa senter, kunci darurat, dsb..."
                  value={rondaKeterangan}
                  onChange={(e) => setRondaKeterangan(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:bg-white rounded-lg px-3.5 py-2 text-xs text-slate-705 outline-none transition-all h-20 resize-none"
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsRondaModalOpen(false)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-650 hover:text-slate-800 font-bold py-2 rounded-lg text-xs transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold py-2 rounded-lg text-xs transition cursor-pointer"
                >
                  {editingRondaId !== null ? "Simpan Perubahan" : "Simpan Penjadwalan"}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* MODAL WINDOW: KEGIATAN ENTRY MODAL                   */}
      {/* ---------------------------------------------------- */}
      {isKegiatanModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden relative flex flex-col max-h-[90vh]">
            
            {/* Header */}
            <div className="px-5 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-800 text-sm">
                  {editingKegiatanId !== null ? "Ubah Jadwal Agenda Kegiatan Rutin" : "Tambah Jadwal Agenda Kegiatan Rutin Baru"}
                </h3>
                <p className="text-[10px] text-slate-400">Kalender agenda rutin RT/RW & Desa Sukamaju</p>
              </div>
              <button
                onClick={() => setIsKegiatanModalOpen(false)}
                className="p-1 px-2 text-slate-400 hover:bg-slate-200 hover:text-slate-800 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveKegiatan} className="flex-1 overflow-y-auto p-5 space-y-4">
              
              {/* Error Alert */}
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-100 text-rose-700 text-xs rounded-xl flex items-start gap-2 animate-bounce">
                  <AlertCircle className="w-4.5 h-4.5 text-rose-600 shrink-0 mt-0.5" />
                  <span className="font-semibold leading-relaxed">{formError}</span>
                </div>
              )}

              {/* Nama Kegiatan */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-slate-450 uppercase tracking-wider">Nama Kegiatan Kemasyarakatan</label>
                <input
                  type="text"
                  placeholder="Contoh: Posyandu Balita Melati III, Senam Sehat Lansia"
                  value={kegiatanNama}
                  onChange={(e) => setKegiatanNama(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:bg-white rounded-lg px-3.5 py-2 text-xs text-slate-705 outline-none transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Kategori */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-slate-450 uppercase tracking-wider">Kategori Program</label>
                  <select
                    className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:bg-white rounded-lg px-3.5 py-2 text-xs text-slate-705 outline-none transition-all cursor-pointer"
                    value={kegiatanKategori}
                    onChange={(e) => setKegiatanKategori(e.target.value as KegiatanRutinKat)}
                  >
                    {KATEGORI_LIST.map(kat => (
                      <option key={kat} value={kat}>{kat}</option>
                    ))}
                  </select>
                </div>

                {/* Lingkup Wilayah */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-slate-450 uppercase tracking-wider">Lingkup Wilayah RT/RW</label>
                  <select
                    className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:bg-white rounded-lg px-3.5 py-2 text-xs text-slate-705 outline-none transition-all cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed"
                    value={kegiatanRwId}
                    onChange={(e) => setKegiatanRwId(e.target.value)}
                    disabled={currentUser.role === "User"}
                  >
                    {currentUser.role === "Admin" && <option value="Semua RW">Semua RW / Lintas Sektoral</option>}
                    {rws.map(rw => (
                      <option key={rw.id} value={rw.id}>{rw.id} ({rw.namaKetua})</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Frekuensi Schedule */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-slate-450 uppercase tracking-wider">Frekuensi Pelaksanaan / Jadwal Rutin</label>
                <input
                  type="text"
                  placeholder="Contoh: Setiap hari Sabtu ke-2 setiap bulannya"
                  value={kegiatanFrekuensi}
                  onChange={(e) => setKegiatanFrekuensi(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:bg-white rounded-lg px-3.5 py-2 text-xs text-slate-705 outline-none transition-all"
                />
              </div>

              {/* Area Lokasi & Jam Waktu */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-slate-450 uppercase tracking-wider">Lokasi / Tempat Pelaksanaan</label>
                  <input
                    type="text"
                    placeholder="Contoh: Balai Pertemuan RW 03"
                    value={kegiatanLokasi}
                    onChange={(e) => setKegiatanLokasi(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:bg-white rounded-lg px-3.5 py-2 text-xs text-slate-705 outline-none transition-all"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-slate-450 uppercase tracking-wider">Waktu Mulai & Durasi</label>
                  <input
                    type="text"
                    placeholder="Contoh: 08:00 - 11:30 WIB"
                    value={kegiatanWaktu}
                    onChange={(e) => setKegiatanWaktu(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:bg-white rounded-lg px-3.5 py-2 text-xs text-slate-705 outline-none transition-all"
                  />
                </div>
              </div>

              {/* PJ / Penanggung Jawab */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-slate-450 uppercase tracking-wider">Penanggung Jawab / Kelompok Kerja (Pokja)</label>
                <input
                  type="text"
                  placeholder="Contoh: Kader PKK RW 03, Pengurus Masjid Al-Ukhuwah"
                  value={kegiatanPenanggungJawab}
                  onChange={(e) => setKegiatanPenanggungJawab(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:bg-white rounded-lg px-3.5 py-2 text-xs text-slate-705 outline-none transition-all"
                />
              </div>

              {/* Deskripsi Kegiatan */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-slate-450 uppercase tracking-wider">Deskripsi Tambahan Program</label>
                <textarea
                  placeholder="Tulis rincian atau persyaratan untuk warga (jika ada)..."
                  value={kegiatanDeskripsi}
                  onChange={(e) => setKegiatanDeskripsi(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:bg-white rounded-lg px-3.5 py-2 text-xs text-slate-705 outline-none transition-all h-24 resize-none"
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsKegiatanModalOpen(false)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-650 hover:text-slate-800 font-bold py-2 rounded-lg text-xs transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold py-2 rounded-lg text-xs transition cursor-pointer"
                >
                  {editingKegiatanId !== null ? "Simpan Perubahan" : "Simpan Kegiatan Rutin"}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
