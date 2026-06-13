/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from "react";
import { Warga, RW, User, Gender, WargaStatus } from "../types";
import { PRESET_PHOTOS, logDemographyEvent } from "../dataStore";
import { Plus, Search, Filter, Edit, Trash2, Shield, UserCheck, FileSpreadsheet, Layers, UserX, Image as ImageIcon, Upload, Download, CheckCircle2, AlertCircle, X, HelpCircle } from "lucide-react";
import * as XLSX from "xlsx";

interface WargaPanelProps {
  warga: Warga[];
  rws: RW[];
  currentUser: User;
  onUpdateWarga: (wargaList: Warga[]) => void;
  onLogMutation: (wargaId: number, jenis: any, keterangan: string) => void;
}

export default function WargaPanel({
  warga,
  rws,
  currentUser,
  onUpdateWarga,
  onLogMutation
}: WargaPanelProps) {
  // Filters state
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // Debouncing search input to avoid lag and page crashes on typing
  React.useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      setSearchQuery(searchInput);
    }, 350); // 350ms delay

    return () => clearTimeout(delayDebounceFn);
  }, [searchInput]);

  const [filterRwId, setFilterRwId] = useState<string>(currentUser.role === "User" ? currentUser.rwId || "RW 01" : "Semua");
  const [filterGender, setFilterGender] = useState<string>("Semua");
  const [filterStatus, setFilterStatus] = useState<string>("Aktif");
  const [filterPendidikan, setFilterPendidikan] = useState<string>("Semua");
  const [filterPekerjaan, setFilterPekerjaan] = useState<string>("Semua");
  const [filterAgeRange, setFilterAgeRange] = useState<string>("Semua"); // "Anak", "Produktif", "Lansia"

  // Calculate RT statistics based on selected RW filter
  const rtStats = useMemo(() => {
    const statsMap: { [rt: string]: { l: number; p: number; total: number; rw: string } } = {};
    
    // Source data: show either all warga or filtered by selected RW (guarded)
    const sourceWarga = (warga || []).filter(w => {
      if (!w) return false;
      return filterRwId === "Semua" || w.rwId === filterRwId;
    });

    sourceWarga.forEach(w => {
      if (!w) return;
      const addressStr = w.alamat ? String(w.alamat) : "";
      const match = addressStr.match(/RT\s*[.\-:]?\s*(\d+)/i);
      const rtNum = match ? match[1] : null;
      const rtStr = rtNum ? `RT ${parseInt(rtNum, 10).toString().padStart(2, "0")}` : "Lainnya/Tidak Terisi";
      
      if (!statsMap[rtStr]) {
        statsMap[rtStr] = { l: 0, p: 0, total: 0, rw: w.rwId || "-" };
      }
      
      if (w.jk === "L") {
        statsMap[rtStr].l += 1;
      } else {
        statsMap[rtStr].p += 1;
      }
      statsMap[rtStr].total += 1;
    });

    // Convert to sorted array
    return Object.entries(statsMap)
      .map(([rt, data]) => ({ rt, ...data }))
      .sort((a, b) => {
        if (a.rt.includes("Lainnya")) return 1;
        if (b.rt.includes("Lainnya")) return -1;
        return a.rt.localeCompare(b.rt, undefined, { numeric: true, sensitivity: 'base' });
      });
  }, [warga, filterRwId]);

  // UI state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSplitKkModalOpen, setIsSplitKkModalOpen] = useState(false);
  const [isMergeKkModalOpen, setIsMergeKkModalOpen] = useState(false);
  
  // Selected state for single-record actions
  const [selectedWarga, setSelectedWarga] = useState<Warga | null>(null);

  // Excel Import states
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importRows, setImportRows] = useState<any[]>([]); // parsed list of citizens
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccessMessage, setImportSuccessMessage] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  // Helper to format Excel serial dates or custom strings to YYYY-MM-DD
  const formatExcelDate = (val: any): string => {
    if (val instanceof Date) {
      return val.toISOString().split("T")[0];
    }
    if (typeof val === "string") {
      if (/^\d{4}-\d{2}-\d{2}$/.test(val)) return val;
      const parsed = Date.parse(val);
      if (!isNaN(parsed)) {
        return new Date(parsed).toISOString().split("T")[0];
      }
    } else if (typeof val === "number") {
      // Excel serial date number
      try {
        const dateObj = XLSX.SSF.parse_date_code(val);
        const y = dateObj.y;
        const m = String(dateObj.m).padStart(2, "0");
        const d = String(dateObj.d).padStart(2, "0");
        return `${y}-${m}-${d}`;
      } catch (e) {
        // Fallback
      }
    }
    return "";
  };

  // Helper to clean and format date display (timezone-safe extraction of YYYY-MM-DD)
  const getOnlyDate = (dateStr: any): string => {
    if (!dateStr) return "-";
    const str = String(dateStr).trim();
    const tIndex = str.indexOf("T");
    if (tIndex !== -1) {
      return str.substring(0, tIndex);
    }
    const spaceIndex = str.indexOf(" ");
    if (spaceIndex !== -1) {
      return str.substring(0, spaceIndex);
    }
    return str;
  };

  // Helper to map arbitrary Excel columns dynamically to Warga type
  const mapExcelToWarga = (row: any): Partial<Warga> => {
    const result: Partial<Warga> = {};
    const normalize = (key: string) => key.toLowerCase().replace(/[^a-z0-9]/g, "");

    Object.keys(row).forEach(key => {
      const val = row[key];
      const nKey = normalize(key);

      if (nKey === "nik" || nKey === "nomornik" || nKey === "nonik" || nKey === "nikpenduduk") {
        result.nik = String(val).trim();
      } else if (nKey === "kk" || nKey === "nomorkk" || nKey === "nokk" || nKey === "nomorkartukeluarga") {
        result.kk = String(val).trim();
      } else if (nKey === "nama" || nKey === "namalengkap" || nKey === "nama_lengkap" || nKey === "namapenduduk") {
        result.nama = String(val).trim();
      } else if (nKey === "tempatlahir" || nKey === "tmplahir" || nKey === "tpatlahir") {
        result.tempatLahir = String(val).trim();
      } else if (nKey === "tanggallahir" || nKey === "tgllahir" || nKey === "tgllhr" || nKey === "tanggal_lahir") {
        result.tanggalLahir = formatExcelDate(val);
      } else if (nKey === "jeniskelamin" || nKey === "jk" || nKey === "gender" || nKey === "jkel" || nKey === "sex") {
        const jkStr = String(val).trim().toUpperCase();
        if (jkStr.startsWith("L") || jkStr.includes("LAKI")) {
          result.jk = "L";
        } else if (jkStr.startsWith("P") || jkStr.includes("PEREMPUAN") || jkStr.startsWith("W") || jkStr.includes("WANITA")) {
          result.jk = "P";
        } else {
          result.jk = "L";
        }
      } else if (nKey === "agama" || nKey === "faith") {
        result.agama = String(val).trim();
      } else if (nKey === "pendidikan" || nKey === "sekolah" || nKey === "pend terakhir") {
        result.pendidikan = String(val).trim();
      } else if (nKey === "pekerjaan" || nKey === "kerja" || nKey === "profesi") {
        result.pekerjaan = String(val).trim();
      } else if (nKey === "hubungan" || nKey === "hubu" || nKey === "hubungankeluarga" || nKey === "statushubungan" || nKey === "statusdalamkeluarga") {
        const hubStr = String(val).trim();
        if (/kepala/i.test(hubStr)) result.hubungan = "Kepala Keluarga";
        else if (/suami/i.test(hubStr)) result.hubungan = "Suami";
        else if (/istri/i.test(hubStr)) result.hubungan = "Istri";
        else if (/anak/i.test(hubStr)) result.hubungan = "Anak";
        else if (/orang/i.test(hubStr) || /ortu/i.test(hubStr)) result.hubungan = "Orang Tua";
        else if (/mertua/i.test(hubStr)) result.hubungan = "Mertua";
        else result.hubungan = "Lainnya";
      } else if (nKey === "alamat" || nKey === "domisili" || nKey === "jalan") {
        result.alamat = String(val).trim();
      } else if (nKey === "kontak" || nKey === "nohp" || nKey === "notelp" || nKey === "telepon" || nKey === "telp" || nKey === "hp") {
        result.kontak = String(val).trim();
      } else if (nKey === "rw" || nKey === "rwid" || nKey === "wilayah" || nKey === "rw_id") {
        let rwStr = String(val).trim().toUpperCase();
        if (!rwStr.startsWith("RW")) {
          const match = rwStr.match(/\d+/);
          if (match) {
            const num = parseInt(match[0], 10);
            rwStr = `RW 0${num}`.slice(-5);
          }
        }
        result.rwId = rwStr;
      } else if (nKey === "status" || nKey === "statusdomisili" || nKey === "statuskependudukan") {
        const statusStr = String(val).trim();
        if (/aktif|tetap/i.test(statusStr)) result.status = "Aktif";
        else if (/meninggal|almarhum|wafat/i.test(statusStr)) result.status = "Meninggal";
        else if (/pindah/i.test(statusStr)) result.status = "Pindah";
        else if (/sementara|non/i.test(statusStr)) result.status = "Sementara";
        else result.status = "Aktif";
      } else if (nKey === "catatan" || nKey === "keterangan" || nKey === "catat") {
        result.catatan = String(val).trim();
      }
    });

    return result;
  };

  // Process selected file
  const handleExcelImportChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processImportFile(file);
    }
  };

  const processImportFile = (file: File) => {
    setImportFile(file);
    setImportError(null);
    setImportSuccessMessage(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = evt.target?.result;
        if (!data) {
          setImportError("Gagal membaca file.");
          return;
        }

        const workbook = XLSX.read(data, { type: "binary", cellDates: true });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = XLSX.utils.sheet_to_json<any>(worksheet);

        if (jsonData.length === 0) {
          setImportError("File Excel kosong atau tidak terdeteksi baris data penduduk.");
          return;
        }

        const processedRows = jsonData.map((row, index) => {
          const mapped = mapExcelToWarga(row);
          const rowNum = index + 2;

          const errors: string[] = [];
          const warnings: string[] = [];

          // NIK parsing and check
          const nik = mapped.nik || "";
          if (!nik) {
            errors.push("NIK wajib diisi.");
          } else if (!/^\d{16}$/.test(nik)) {
            errors.push("NIK harus berupa 16 digit angka.");
          } else {
            // Check in list
            const isDupDb = warga.some(w => w.nik === nik);
            if (isDupDb) {
              errors.push("NIK sudah pernah terdaftar di database.");
            }
            // Check in same import file
            const firstIdx = jsonData.findIndex((r: any) => mapExcelToWarga(r).nik === nik);
            if (firstIdx !== index) {
              errors.push(`NIK duplikat dengan baris ${firstIdx + 2} di file.`);
            }
          }

          // KK check
          const kk = mapped.kk || "";
          if (!kk) {
            errors.push("Nomor KK wajib diisi.");
          } else if (!/^\d{16}$/.test(kk)) {
            errors.push("Nomor KK harus berupa 16 digit angka.");
          }

          // Nama Check
          const nama = mapped.nama || "";
          if (!nama) {
            errors.push("Nama Lengkap wajib diisi.");
          }

          // Tanggal Lahir check
          const tanggalLahir = mapped.tanggalLahir || "";
          if (!tanggalLahir) {
            errors.push("Tanggal lahir wajib diisi (Format standard: YYYY-MM-DD).");
          }

          // RW Checks
          let rwId = mapped.rwId || "";
          if (currentUser.role === "User") {
            const enforcedRw = currentUser.rwId || "RW 01";
            if (rwId && rwId !== enforcedRw) {
              warnings.push(`Wilayah disesuaikan ke ${enforcedRw} sesuai batasan Ketua RW.`);
            }
            rwId = enforcedRw;
          } else {
            if (!rwId) {
              rwId = "RW 01";
              warnings.push("Wilayah tidak diset, default disesuaikan ke RW 01.");
            } else if (!/^(RW 0[1-5])$/.test(rwId)) {
              warnings.push(`Wilayah '${rwId}' tidak valid, disesuaikan ke RW 01.`);
              rwId = "RW 01";
            }
          }

          return {
            rowNum,
            nik,
            kk,
            nama,
            tempatLahir: mapped.tempatLahir || "Sukamaju",
            tanggalLahir,
            jk: mapped.jk || "L",
            agama: mapped.agama || "Islam",
            pendidikan: mapped.pendidikan || "SMA",
            pekerjaan: mapped.pekerjaan || "Karyawan Swasta",
            hubungan: mapped.hubungan || "Anak",
            alamat: mapped.alamat || "Dusun Sukamaju",
            kontak: mapped.kontak || "",
            rwId,
            status: mapped.status || "Aktif",
            catatan: mapped.catatan || "",
            errors,
            warnings
          };
        });

        setImportRows(processedRows);
      } catch (err: any) {
        setImportError("Gagal mengurai spreadsheet Excel: " + err.message);
      }
    };
    reader.readAsBinaryString(file);
  };

  // Drag & drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      if (file.name.endsWith(".xlsx") || file.name.endsWith(".xls")) {
        processImportFile(file);
      } else {
        setImportError("Hanya support file Excel dengan format .xlsx atau .xls");
      }
    }
  };

  // Execute actual database saving
  const executeImport = () => {
    const validRows = importRows.filter(r => r.errors.length === 0);
    if (validRows.length === 0) {
      alert("Tidak ada baris data valid untuk diimpor!");
      return;
    }

    let currentMaxId = warga.length > 0 ? Math.max(...warga.map(w => w.id)) : 0;
    const newCitizens: Warga[] = [];

    validRows.forEach(row => {
      currentMaxId++;
      const newCitizen: Warga = {
        id: currentMaxId,
        nik: row.nik,
        kk: row.kk,
        nama: row.nama,
        tempatLahir: row.tempatLahir,
        tanggalLahir: row.tanggalLahir,
        jk: row.jk,
        agama: row.agama,
        pendidikan: row.pendidikan,
        pekerjaan: row.pekerjaan,
        hubungan: row.hubungan,
        alamat: row.alamat,
        kontak: row.kontak,
        rwId: row.rwId,
        status: row.status,
        catatan: row.catatan || "Ditambahkan via Import Excel",
        tanggalInput: new Date().toISOString().split("T")[0]
      };

      newCitizens.push(newCitizen);

      // Trigger LAMPID Audit Mutation Log
      if (row.status === "Aktif") {
        const isInfant = calculateAge(row.tanggalLahir) <= 1;
        const mutationType = isInfant ? "Lahir" : "Pindah Masuk";
        const detail = isInfant
          ? `[Import Excel] Bayi lahir baru: ${row.nama}, KK: ${row.kk}`
          : `[Import Excel] Penduduk pindah datang masuk ke wilayah ${row.rwId}`;
        onLogMutation(currentMaxId, mutationType, detail);
      } else if (row.status === "Sementara") {
        onLogMutation(currentMaxId, "Penduduk Sementara", `[Import Excel] Pencatatan penduduk sementara asal luar wilayah.`);
      }
    });

    onUpdateWarga([...newCitizens, ...warga]);
    setImportSuccessMessage(`Berhasil mengimpor ${validRows.length} penduduk ke dalam Buku Induk Dusun.`);
    setImportRows([]);
    setImportFile(null);

    setTimeout(() => {
      setIsImportModalOpen(false);
      setImportSuccessMessage(null);
    }, 2000);
  };

  // Create & download professional Excel template
  const downloadTemplate = () => {
    const defaultRw = currentUser.role === "User" ? currentUser.rwId || "RW 01" : "RW 01";
    const previewData = [
      {
        "NIK": "3204123456780001",
        "Nomor KK": "3204129876540001",
        "Nama Lengkap": "Dede Sunandar",
        "Tempat Lahir": "Bandung",
        "Tanggal Lahir": "1992-05-18",
        "Jenis Kelamin": "L",
        "Agama": "Islam",
        "Pendidikan": "SMA",
        "Pekerjaan": "Wiraswasta",
        "Hubungan Keluarga": "Kepala Keluarga",
        "Alamat": "RT 03 RW 01 Dusun Sukamaju",
        "Wilayah": defaultRw,
        "Kontak": "081234567890",
        "Status Domisili": "Aktif",
        "Catatan": "Keluarga inti"
      },
      {
        "NIK": "3204123456780002",
        "Nomor KK": "3204129876540001",
        "Nama Lengkap": "Neng Lilis",
        "Tempat Lahir": "Sukamaju",
        "Tanggal Lahir": "1995-09-12",
        "Jenis Kelamin": "P",
        "Agama": "Islam",
        "Pendidikan": "D3",
        "Pekerjaan": "Ibu Rumah Tangga",
        "Hubungan Keluarga": "Istri",
        "Alamat": "RT 03 RW 01 Dusun Sukamaju",
        "Wilayah": defaultRw,
        "Kontak": "",
        "Status Domisili": "Aktif",
        "Catatan": ""
      }
    ];

    const ws = XLSX.utils.json_to_sheet(previewData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Format_Input_Dusun");

    const wscols = [
      { wch: 20 }, // NIK
      { wch: 20 }, // KK
      { wch: 25 }, // Nama
      { wch: 15 }, // Tempat Lahir
      { wch: 15 }, // Tanggal Lahir (YYYY-MM-DD)
      { wch: 15 }, // JK
      { wch: 12 }, // Agama
      { wch: 15 }, // Pendidikan
      { wch: 18 }, // Pekerjaan
      { wch: 20 }, // Hubungan
      { wch: 30 }, // Alamat
      { wch: 10 }, // Wilayah
      { wch: 15 }, // Kontak
      { wch: 15 }, // Status
      { wch: 20 }  // Catatan
    ];
    ws["!cols"] = wscols;

    XLSX.writeFile(wb, `Template_Impor_Penduduk_Sukamaju.xlsx`);
  };

  // Form states (Add / Edit)
  const [formNik, setFormNik] = useState("");
  const [formKk, setFormKk] = useState("");
  const [formNama, setFormNama] = useState("");
  const [formTempatLahir, setFormTempatLahir] = useState("");
  const [formTanggalLahir, setFormTanggalLahir] = useState("");
  const [formJk, setFormJk] = useState<Gender>("L");
  const [formAgama, setFormAgama] = useState("Islam");
  const [formPendidikan, setFormPendidikan] = useState("SMA");
  const [formPekerjaan, setFormPekerjaan] = useState("Karyawan Swasta");
  const [formHubungan, setFormHubungan] = useState("Kepala Keluarga");
  const [formAlamat, setFormAlamat] = useState("");
  const [formKontak, setFormKontak] = useState("");
  const [formRw, setFormRw] = useState(currentUser.role === "User" ? currentUser.rwId || "RW 01" : "RW 01");
  const [formStatus, setFormStatus] = useState<WargaStatus>("Aktif");
  const [formFoto, setFormFoto] = useState("");
  const [formCatatan, setFormCatatan] = useState("");
  const [formError, setFormError] = useState("");

  // Split / Merge family card form states
  const [targetSplitKk, setTargetSplitKk] = useState("");
  const [targetMergeKk, setTargetMergeKk] = useState("");

  // Calculate age helper
  const calculateAge = (dobString: any): number => {
    if (!dobString) return 0;
    const today = new Date();
    const birthDate = new Date(dobString);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return isNaN(age) ? 0 : age;
  };

  // NIK & KK length validation (16 digits)
  const validateNikKk = (nik: string, kk: string, isAdd: boolean, origId?: number): string => {
    if (!/^\d{16}$/.test(nik)) {
      return "NIK harus berupa 16 digit angka.";
    }
    if (!/^\d{16}$/.test(kk)) {
      return "Nomor KK harus berupa 16 digit angka.";
    }
    // Check for NIK uniqueness
    const exists = warga.some(w => w.nik === nik && (isAdd || w.id !== origId));
    if (exists) {
      return "NIK sudah terdaftar di sistem.";
    }
    return "";
  };

  // Handle Photo Upload (Coverts to Base64)
  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 1024 * 1024) {
        setFormError("Ukuran foto tidak boleh melebih 1MB.");
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") {
          setFormFoto(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Open modals with initialized state
  const openAddModal = () => {
    setFormNik("");
    setFormKk("");
    setFormNama("");
    setFormTempatLahir("");
    setFormTanggalLahir("");
    setFormJk("L");
    setFormAgama("Islam");
    setFormPendidikan("SMA");
    setFormPekerjaan("Karyawan Swasta");
    setFormHubungan("Kepala Keluarga");
    setFormAlamat("");
    setFormKontak("");
    setFormRw(currentUser.role === "User" ? currentUser.rwId || "RW 01" : "RW 01");
    setFormStatus("Aktif");
    setFormFoto("");
    setFormCatatan("");
    setFormError("");
    setIsAddModalOpen(true);
  };

  const openEditModal = (item: Warga) => {
    setSelectedWarga(item);
    setFormNik(item.nik);
    setFormKk(item.kk);
    setFormNama(item.nama);
    setFormTempatLahir(item.tempatLahir);
    setFormTanggalLahir(getOnlyDate(item.tanggalLahir));
    setFormJk(item.jk);
    setFormAgama(item.agama);
    setFormPendidikan(item.pendidikan);
    setFormPekerjaan(item.pekerjaan);
    setFormHubungan(item.hubungan);
    setFormAlamat(item.alamat);
    setFormKontak(item.kontak);
    setFormRw(item.rwId);
    setFormStatus(item.status);
    setFormFoto(item.foto || "");
    setFormCatatan(item.catatan || "");
    setFormError("");
    setIsEditModalOpen(true);
  };

  // Submit operations
  const handleAddWarga = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    if (!formNik || !formKk || !formNama || !formTanggalLahir) {
      setFormError("Kolom bertanda bintang (*) wajib diisi.");
      return;
    }

    const valError = validateNikKk(formNik, formKk, true);
    if (valError) {
      setFormError(valError);
      return;
    }

    const newId = warga.length > 0 ? Math.max(...warga.map(w => w.id)) + 1 : 1;
    const newCitizen: Warga = {
      id: newId,
      nik: formNik,
      kk: formKk,
      nama: formNama,
      tempatLahir: formTempatLahir,
      tanggalLahir: formTanggalLahir,
      jk: formJk,
      agama: formAgama,
      pendidikan: formPendidikan,
      pekerjaan: formPekerjaan,
      hubungan: formHubungan,
      alamat: formAlamat,
      kontak: formKontak,
      rwId: formRw,
      status: formStatus,
      foto: formFoto,
      catatan: formCatatan,
      tanggalInput: new Date().toISOString().split("T")[0]
    };

    const updatedWarga = [newCitizen, ...warga];
    onUpdateWarga(updatedWarga);
    
    // Auto trigger LAMPID move-in / lahir check based on status / relation
    if (formStatus === "Aktif") {
      const isInfant = calculateAge(formTanggalLahir) <= 1;
      const mutationType = isInfant ? "Lahir" : "Pindah Masuk";
      const detail = isInfant 
        ? `Registrasi kelahiran bayi baru bernama ${formNama} masuk KK ${formKk}` 
        : `Registrasi penduduk baru pindah masuk wilayah ${formRw}`;
      onLogMutation(newId, mutationType, detail);
    } else if (formStatus === "Sementara") {
      onLogMutation(newId, "Penduduk Sementara", `Pencatatan penduduk non-permanen beralamat asal di luar dusun.`);
    }

    setIsAddModalOpen(false);
  };

  const handleEditWarga = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    if (!selectedWarga) return;

    if (!formNik || !formKk || !formNama || !formTanggalLahir) {
      setFormError("Kolom bertanda bintang (*) wajib diisi.");
      return;
    }

    const valError = validateNikKk(formNik, formKk, false, selectedWarga.id);
    if (valError) {
      setFormError(valError);
      return;
    }

    const statusChanged = selectedWarga.status !== formStatus;

    const updatedWargaList = warga.map(w => {
      if (w.id === selectedWarga.id) {
        return {
          ...w,
          nik: formNik,
          kk: formKk,
          nama: formNama,
          tempatLahir: formTempatLahir,
          tanggalLahir: formTanggalLahir,
          jk: formJk,
          agama: formAgama,
          pendidikan: formPendidikan,
          pekerjaan: formPekerjaan,
          hubungan: formHubungan,
          alamat: formAlamat,
          kontak: formKontak,
          rwId: formRw,
          status: formStatus,
          foto: formFoto,
          catatan: formCatatan
        };
      }
      return w;
    });

    onUpdateWarga(updatedWargaList);

    // Logging demographic transitions (LAMPID audits)
    if (statusChanged) {
      if (formStatus === "Meninggal") {
        onLogMutation(selectedWarga.id, "Meninggal", `Pelaporan berita kematian warga atas nama ${formNama}.`);
      } else if (formStatus === "Pindah") {
        onLogMutation(selectedWarga.id, "Pindah Keluar", `Pelaporan pindah domisili keluar wilayah ke kota tujuan dengan detail: ${formCatatan || "Tanpa catatan"}.`);
      } else if (formStatus === "Aktif") {
        onLogMutation(selectedWarga.id, "Pindah Masuk", `Pengaktifan kembali status kependudukan.`);
      }
    }

    setIsEditModalOpen(false);
    setSelectedWarga(null);
  };

  const handleDeleteWarga = (id: number, name: string) => {
    if (currentUser.role !== "Admin") {
      alert("Hanya Kepala Dusun (Admin) yang dapat menghapus data kependudukan.");
      return;
    }
    if (confirm(`Apakah Anda yakin ingin menghapus data warga "${name}" secara permanen? Tindakan ini tidak dapat dibatalkan.`)) {
      const updated = warga.filter(w => w.id !== id);
      onUpdateWarga(updated);
    }
  };

  // Splitting KK family members
  const handleSplitKk = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWarga || !/^\d{16}$/.test(targetSplitKk)) {
      alert("Nomor KK baru wajib diisi 16-digit angka.");
      return;
    }

    const updatedWargaList = warga.map(w => {
      if (w.id === selectedWarga.id) {
        return {
          ...w,
          kk: targetSplitKk,
          hubungan: "Kepala Keluarga" // splits into being heads of new KK
        };
      }
      return w;
    });

    onUpdateWarga(updatedWargaList);
    onLogMutation(selectedWarga.id, "Pindah Masuk", `Pecah Kartu Keluarga terbentuk KK Baru Nomor: ${targetSplitKk}`);

    setIsSplitKkModalOpen(false);
    setSelectedWarga(null);
    setTargetSplitKk("");
  };

  // Merging KK family members
  const handleMergeKk = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWarga || !/^\d{16}$/.test(targetMergeKk)) {
      alert("Nomor KK target penggabungan wajib diisi 16-digit angka.");
      return;
    }

    const updatedWargaList = warga.map(w => {
      if (w.id === selectedWarga.id) {
        return {
          ...w,
          kk: targetMergeKk,
          hubungan: formHubungan // inherits target family relationship
        };
      }
      return w;
    });

    onUpdateWarga(updatedWargaList);
    onLogMutation(selectedWarga.id, "Pindah Masuk", `Penggabungan (Merge) Kartu Keluarga ke KK Utama Nomor: ${targetMergeKk}`);

    setIsMergeKkModalOpen(false);
    setSelectedWarga(null);
    setTargetMergeKk("");
  };

  // Excel Export logic utilizing SheetsJS 'xlsx'
  const exportToExcel = () => {
    const exportData = filteredWarga.map((w, index) => ({
      "No.": index + 1,
      "NIK": w.nik,
      "Nomor KK": w.kk,
      "Nama Lengkap": w.nama,
      "Tempat Lahir": w.tempatLahir,
      "Tanggal Lahir": getOnlyDate(w.tanggalLahir),
      "Umur": calculateAge(w.tanggalLahir) + " Tahun",
      "Jenis Kelamin": w.jk === "L" ? "Laki-laki" : "Perempuan",
      "Agama": w.agama,
      "Pendidikan": w.pendidikan,
      "Pekerjaan": w.pekerjaan,
      "Hubungan Keluarga": w.hubungan,
      "Alamat": w.alamat,
      "Wilayah": w.rwId,
      "Kontak": w.kontak || "-",
      "Status Domisili": w.status,
      "Tanggal Input": w.tanggalInput
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Buku Penduk Dusun");

    // styling column widths for professional outlook
    const wscols = [
      { wch: 5 },  // No
      { wch: 20 }, // NIK
      { wch: 20 }, // KK
      { wch: 25 }, // Nama
      { wch: 15 }, // Tempat Lahir
      { wch: 15 }, // Tanggal Lahir
      { wch: 10 }, // Umur
      { wch: 15 }, // Jk
      { wch: 12 }, // Agama
      { wch: 15 }, // Pendidikan
      { wch: 18 }, // Pekerjaan
      { wch: 20 }, // Hubungan
      { wch: 30 }, // Alamat
      { wch: 10 }, // RW
      { wch: 15 }, // Kontak
      { wch: 15 }, // Status
      { wch: 15 }  // Tanggal Input
    ];
    ws["!cols"] = wscols;

    XLSX.writeFile(wb, `Buku_Induk_Penduduk_Dusun_${filterRwId}_${new Date().toISOString().split("T")[0]}.xlsx`);
  };

  // Perform filtering with safe type/null guards & useMemo for ultra-high performance on thousands of items
  const filteredWarga = useMemo(() => {
    const lowerQuery = (searchQuery || "").trim().toLowerCase();

    return warga.filter(w => {
      if (!w) return false;

      // 1. Search Query (NIK, Nama, KK, or Alamat/RT) securely guarded against undefined/null values
      let matchesSearch = true;
      if (lowerQuery) {
        const nameStr = (w.nama || "").toLowerCase();
        const nikStr = w.nik ? String(w.nik).toLowerCase() : "";
        const kkStr = w.kk ? String(w.kk).toLowerCase() : "";
        const addressStr = w.alamat ? String(w.alamat).toLowerCase() : "";

        matchesSearch = nameStr.includes(lowerQuery) || 
                        nikStr.includes(lowerQuery) || 
                        kkStr.includes(lowerQuery) ||
                        addressStr.includes(lowerQuery);
      }

      // 2. RW filter
      const matchesRw = filterRwId === "Semua" || w.rwId === filterRwId;

      // 3. Gender filter
      const matchesGender = filterGender === "Semua" || w.jk === filterGender;

      // 4. Status filter
      const matchesStatus = filterStatus === "Semua" || w.status === filterStatus;

      // 5. Pendidikan filter
      const matchesPendidikan = filterPendidikan === "Semua" || w.pendidikan === filterPendidikan;

      // 6. Pekerjaan filter
      const matchesPekerjaan = filterPekerjaan === "Semua" || w.pekerjaan === filterPekerjaan;

      // 7. Age Group filter
      const age = calculateAge(w.tanggalLahir);
      let matchesAge = true;
      if (filterAgeRange === "Anak") {
        matchesAge = age < 15;
      } else if (filterAgeRange === "Produktif") {
        matchesAge = age >= 15 && age < 60;
      } else if (filterAgeRange === "Lansia") {
        matchesAge = age >= 60;
      }

      return matchesSearch && matchesRw && matchesGender && matchesStatus && matchesPendidikan && matchesPekerjaan && matchesAge;
    });
  }, [warga, searchQuery, filterRwId, filterGender, filterStatus, filterPendidikan, filterPekerjaan, filterAgeRange]);

  // Pagination states & logic for instant low-footprint rendering
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 25;

  // Auto reset page to 1 on any filter/search change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterRwId, filterGender, filterStatus, filterPendidikan, filterPekerjaan, filterAgeRange]);

  const totalItems = filteredWarga.length;
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE) || 1;
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, totalItems);

  const paginatedWarga = useMemo(() => {
    return filteredWarga.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredWarga, startIndex]);

  // Unique lists for filters (memoized and safeguarded against malformed or missing warga fields)
  const uniquePendidikan = useMemo(() => {
    if (!warga) return [];
    return Array.from(new Set(warga.filter(w => w && w.pendidikan).map(w => String(w.pendidikan).trim())));
  }, [warga]);

  const uniquePekerjaan = useMemo(() => {
    if (!warga) return [];
    return Array.from(new Set(warga.filter(w => w && w.pekerjaan).map(w => String(w.pekerjaan).trim())));
  }, [warga]);

  return (
    <div className="space-y-6">
      {/* Upper bar actions */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-5 rounded-xl border border-slate-100 shadow-xs">
        <div>
          <h2 className="text-xl font-semibold text-slate-800 font-display">Buku Induk Kependudukan</h2>
          <p className="text-sm text-slate-500 mt-1">
            Mengelola data kependudukan {filterRwId !== "Semua" ? `Wilayah ${filterRwId}` : "Seluruh Dusun (5 RW)"} sesuai UU No. 24/2013.
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => {
              setImportFile(null);
              setImportRows([]);
              setImportError(null);
              setImportSuccessMessage(null);
              setIsImportModalOpen(true);
            }}
            className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white font-medium text-sm px-4 py-2.5 rounded-lg transition-colors cursor-pointer"
          >
            <Upload className="w-4 h-4" />
            Import Excel
          </button>
          <button
            onClick={openAddModal}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm px-4 py-2.5 rounded-lg transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Tambah Penduduk
          </button>
          <button
            onClick={exportToExcel}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm px-4 py-2.5 rounded-lg transition-colors cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Export Excel (.xlsx)
          </button>
        </div>
      </div>

      {/* Structured Filters and Searches */}
      <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-xs space-y-4">
        {/* Row 1: Search & Base filters */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative col-span-1 md:col-span-2">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </span>
            <input
              type="text"
              placeholder="Cari berdasarkan NIK, Nomor KK, atau Nama..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full bg-slate-50 text-slate-800 text-sm pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:border-emerald-500 focus:bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">Wilayah RW</label>
            <select
              value={filterRwId}
              onChange={(e) => setFilterRwId(e.target.value)}
              disabled={currentUser.role === "User"}
              className="w-full bg-slate-50 text-slate-800 text-sm px-3 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:border-emerald-500"
            >
              {currentUser.role === "Admin" && <option value="Semua">Semua RW</option>}
              {rws.map((rw) => (
                <option key={rw.id} value={rw.id}>{rw.id} ({rw.namaKetua})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">Status Domisili</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full bg-slate-50 text-slate-800 text-sm px-3 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:border-emerald-500"
            >
              <option value="Semua">Semua Status</option>
              <option value="Aktif">Status Aktif (Tetap)</option>
              <option value="Sementara">Sementara (Non-Permanen)</option>
              <option value="Meninggal">Almarhum (Meninggal)</option>
              <option value="Pindah">Pindah Keluar</option>
            </select>
          </div>
        </div>

        {/* Row 2: Advance Demography Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 pt-2 border-t border-slate-50">
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">Jenis Kelamin</label>
            <select
              value={filterGender}
              onChange={(e) => setFilterGender(e.target.value)}
              className="w-full bg-slate-50 text-slate-800 text-sm px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:border-emerald-500"
            >
              <option value="Semua">Semua Gender</option>
              <option value="L">Laki-laki (L)</option>
              <option value="P">Perempuan (P)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">Golongan Umur</label>
            <select
              value={filterAgeRange}
              onChange={(e) => setFilterAgeRange(e.target.value)}
              className="w-full bg-slate-50 text-slate-800 text-sm px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:border-emerald-500"
            >
              <option value="Semua">Semua Rentang</option>
              <option value="Anak">Anak-anak (&lt;15 Tahun)</option>
              <option value="Produktif">Usia Produktif (15-59 Tahun)</option>
              <option value="Lansia">Lanjut Usia (60+ Tahun)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">Pendidikan terakhir</label>
            <select
              value={filterPendidikan}
              onChange={(e) => setFilterPendidikan(e.target.value)}
              className="w-full bg-slate-50 text-slate-800 text-sm px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:border-emerald-500"
            >
              <option value="Semua">Semua Pendidikan</option>
              {uniquePendidikan.map((edu) => (
                <option key={edu} value={edu}>{edu}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">Pekerjaan</label>
            <select
              value={filterPekerjaan}
              onChange={(e) => setFilterPekerjaan(e.target.value)}
              className="w-full bg-slate-50 text-slate-800 text-sm px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:border-emerald-500"
            >
              <option value="Semua">Semua Pekerjaan</option>
              {uniquePekerjaan.map((job) => (
                <option key={job} value={job}>{job}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Table/Cards Summary Jumlah Warga per RT */}
      <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-emerald-600" />
            <h3 className="font-semibold text-slate-800 text-sm font-display uppercase tracking-wider">
              Ringkasan Jumlah Penduduk per RT {filterRwId !== "Semua" ? `(${filterRwId})` : ""}
            </h3>
          </div>
          <span className="text-2xs bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full font-mono font-semibold">
            {rtStats.length} RT Terdeteksi
          </span>
        </div>
        
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {rtStats.map((item) => (
            <div 
              key={item.rt} 
              className="p-3 bg-slate-50/70 rounded-lg border border-slate-100 hover:border-emerald-200 transition-colors"
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-display font-bold text-slate-800 text-xs">{item.rt}</span>
                <span className="text-[10px] bg-emerald-150 text-emerald-800 font-bold px-1.5 py-0.5 rounded-full">
                  {item.total} Jiwa
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-500 font-medium">
                <div>
                  <span className="text-emerald-600 font-bold font-mono">L:</span> {item.l}
                </div>
                <div>
                  <span className="text-[purple] font-bold font-mono">P:</span> {item.p}
                </div>
              </div>
            </div>
          ))}
          {rtStats.length === 0 && (
            <div className="col-span-full py-3 text-center text-xs text-slate-400">
              Tidak ada data RT yang terdeteksi untuk filter RW saat ini.
            </div>
          )}
        </div>
      </div>

      {/* Main Citizens Table view */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-400 font-display font-medium text-xs uppercase tracking-wider border-b border-slate-100">
                <th className="px-5 py-4">Foto / Profil</th>
                <th className="px-5 py-4">Identitas Warga (NIK)</th>
                <th className="px-5 py-4">Keluarga (KK)</th>
                <th className="px-5 py-4">Tempat, Tanggal Lahir (Umur)</th>
                <th className="px-5 py-4 text-center">RT</th>
                <th className="px-5 py-4 text-center">RW</th>
                <th className="px-5 py-4 text-center">Status</th>
                <th className="px-5 py-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm text-slate-600">
              {filteredWarga.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-10 text-center text-slate-400">
                    <UserX className="w-10 h-10 mx-auto text-slate-300 stroke-1 mb-2" />
                    Tidak ada data warga yang mencocokkan filter pencarian Anda.
                  </td>
                </tr>
              ) : (
                paginatedWarga.map((w) => {
                  if (!w) return null;
                  const nameStr = w.nama ? String(w.nama).trim() : "Warga Tanpa Nama";
                  const nikStr = w.nik ? String(w.nik).trim() : "-";
                  const kkStr = w.kk ? String(w.kk).trim() : "-";
                  const addressStr = w.alamat ? String(w.alamat).trim() : "-";
                  const placeBirth = w.tempatLahir ? String(w.tempatLahir).trim() : "-";
                  const dateBirth = w.tanggalLahir ? getOnlyDate(w.tanggalLahir) : "-";
                  const age = calculateAge(w.tanggalLahir);
                  const relationStr = w.hubungan ? String(w.hubungan).trim() : "Warga";
                  const genderStr = w.jk === "L" ? "Laki-laki" : "Perempuan";
                  
                  return (
                    <tr key={w.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-5 py-4.5">
                        <div className="flex items-center gap-3">
                          {w.foto ? (
                            <img
                               src={w.foto}
                               alt={nameStr}
                               className="w-10 h-10 rounded-full object-cover border border-slate-200"
                               referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-display text-xs font-bold ${
                              w.jk === "L" ? "bg-emerald-100 text-emerald-700" : "bg-purple-100 text-purple-700"
                            }`}>
                              {nameStr.charAt(0)}
                            </div>
                          )}
                          <div>
                            <span className="block font-semibold text-slate-800 leading-tight">{nameStr}</span>
                            <span className="text-xs text-slate-400 block mt-0.5">{relationStr} &bull; {genderStr}</span>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-4.5 font-mono text-xs font-medium text-slate-800">
                        {nikStr}
                      </td>

                      <td className="px-5 py-4.5">
                        <div className="font-mono text-xs text-slate-500 font-medium mb-0.5">{kkStr}</div>
                        <span className="text-xs text-slate-400 truncate max-w-[150px] block">{addressStr}</span>
                      </td>

                      <td className="px-5 py-4.5">
                        <div>{placeBirth}, {dateBirth}</div>
                        <div className="text-xs text-slate-400 mt-0.5">&#x28;{age} Tahun&#x29;</div>
                      </td>

                      <td className="px-5 py-4.5 text-center font-semibold text-slate-800 bg-slate-50/10">
                        {(() => {
                          const match = addressStr.match(/RT\s*[.\-:]?\s*(\d+)/i);
                          return match ? `RT ${match[1]}` : "-";
                        })()}
                      </td>

                      <td className="px-5 py-4.5 text-center font-semibold text-slate-700">
                        {w.rwId || "-"}
                      </td>

                      <td className="px-5 py-4.5 text-center">
                        <span className={`inline-flex px-2 py-1 rounded text-2xs font-semibold uppercase ${
                          w.status === "Aktif" ? "bg-emerald-100 text-emerald-800" :
                          w.status === "Sementara" ? "bg-blue-100 text-blue-800" :
                          w.status === "Meninggal" ? "bg-rose-100 text-rose-800" : "bg-amber-100 text-amber-800"
                        }`}>
                          {w.status === "Aktif" ? "Aktif" :
                           w.status === "Sementara" ? "Sementara" :
                           w.status === "Meninggal" ? "Almarhum" : "Pindah"}
                        </span>
                      </td>

                      <td className="px-5 py-4.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Split KK tool (only active if multiple people share the same card and citizen is active) */}
                          {w.status === "Aktif" && (
                            <button
                              title="Pecah KK (Keluarga Baru)"
                              onClick={() => { setSelectedWarga(w); setTargetSplitKk(""); setIsSplitKkModalOpen(true); }}
                              className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-md hover:bg-slate-100 cursor-pointer"
                            >
                              <Layers className="w-4 h-4" />
                            </button>
                          )}
                          {/* Merge KK tool */}
                          {w.status === "Aktif" && (
                            <button
                              title="Merge KK (Gabung KK)"
                              onClick={() => { setSelectedWarga(w); setTargetMergeKk(""); setFormHubungan("Anak"); setIsMergeKkModalOpen(true); }}
                              className="p-1.5 text-slate-400 hover:text-teal-600 rounded-md hover:bg-slate-100 cursor-pointer"
                            >
                              <UserCheck className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => openEditModal(w)}
                            className="p-1.5 text-slate-400 hover:text-slate-800 rounded-md hover:bg-slate-100 cursor-pointer"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          {currentUser.role === "Admin" && (
                            <button
                              onClick={() => handleDeleteWarga(w.id, w.nama)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 rounded-md hover:bg-slate-100 cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <div className="bg-slate-50 px-5 py-3.5 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
          <div className="text-slate-500 font-medium text-center sm:text-left">
            Menampilkan <strong className="text-slate-800 font-semibold">{totalItems === 0 ? 0 : startIndex + 1}</strong> s.d <strong className="text-slate-800 font-semibold">{endIndex}</strong> dari <strong className="text-slate-800 font-semibold">{totalItems}</strong> baris cocok (total {warga.length} terdaftar)
          </div>

          {totalPages > 1 && (
            <div className="flex items-center gap-1 flex-wrap justify-center">
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(1)}
                className="px-2.5 py-1.5 rounded-md bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold disabled:opacity-40 disabled:hover:bg-white transition-colors cursor-pointer"
              >
                &laquo;
              </button>
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                className="px-2.5 py-1.5 rounded-md bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold disabled:opacity-40 disabled:hover:bg-white transition-colors cursor-pointer"
              >
                Sebelumnya
              </button>
              
              <span className="px-3 py-1.5 text-slate-700 font-bold bg-slate-100 rounded-md border border-slate-200/60 font-mono">
                {currentPage} / {totalPages}
              </span>

              <button
                type="button"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                className="px-2.5 py-1.5 rounded-md bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold disabled:opacity-40 disabled:hover:bg-white transition-colors cursor-pointer"
              >
                Berikutnya
              </button>
              <button
                type="button"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(totalPages)}
                className="px-2.5 py-1.5 rounded-md bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold disabled:opacity-40 disabled:hover:bg-white transition-colors cursor-pointer"
              >
                &raquo;
              </button>
            </div>
          )}
          
          <span className="font-mono text-slate-400 hidden lg:inline">NIK Terdaftar Dukcapil &bull; Tampilan Rendah Beban</span>
        </div>
      </div>

      {/* Add / REGISTER Modal Form */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl overflow-hidden my-8 border border-slate-100 flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="bg-amber-600 text-white px-6 py-4 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5" />
                <h3 className="font-semibold text-lg font-display">Import Massal Data Penduduk</h3>
              </div>
              <button 
                onClick={() => setIsImportModalOpen(false)} 
                className="text-white/80 hover:text-white text-lg font-bold cursor-pointer"
                aria-label="Tutup"
              >
                &times;
              </button>
            </div>

            {/* Scrollable Container */}
            <div className="p-6 overflow-y-auto space-y-5 flex-1">
              
              {/* Info Deskripsi dan Unduh Template */}
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <span className="font-bold text-sm text-slate-800 flex items-center gap-1.5">
                    <HelpCircle className="w-4 h-4 text-amber-600" />
                    Panduan Unggah Spreadsheet
                  </span>
                  <p className="text-xs text-slate-500 leading-relaxed max-w-2xl">
                    Gunakan file Excel (.xlsx atau .xls). Sistem akan otomatis memetakan kolom seperti <strong className="text-slate-700">NIK, Nomor KK, Nama Lengkap, Tanggal Lahir (YYYY-MM-DD), Jenis Kelamin (L/P)</strong>, dan lain-lain. Klik tombol di kanan untuk mengunduh template yang sesuai.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={downloadTemplate}
                  className="flex items-center gap-2 bg-slate-800 hover:bg-slate-950 text-white font-semibold text-xs px-4 py-2.5 rounded-lg cursor-pointer shrink-0 shadow-sm transition"
                >
                  <Download className="w-3.5 h-3.5" />
                  Unduh Template Excel
                </button>
              </div>

              {/* Upload Dropzone */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => document.getElementById("excel-file-input")?.click()}
                className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                  isDragOver 
                    ? "border-emerald-500 bg-emerald-50/40 text-emerald-700" 
                    : importFile 
                      ? "border-slate-300 bg-slate-50/50 text-slate-700" 
                      : "border-slate-200 hover:border-slate-300 hover:bg-slate-50/30 text-slate-500"
                }`}
              >
                <input
                  id="excel-file-input"
                  type="file"
                  accept=".xlsx, .xls"
                  onChange={handleExcelImportChange}
                  className="hidden"
                />

                <div className={`p-3 rounded-full mb-3 ${importFile ? "bg-emerald-100 text-emerald-600" : "bg-slate-100 text-slate-500"}`}>
                  <Upload className="w-6 h-6" />
                </div>

                {importFile ? (
                  <div className="space-y-1">
                    <p className="font-semibold text-sm text-slate-800">File Terpilih: {importFile.name}</p>
                    <p className="text-2xs text-slate-400">Ukuran file: {(importFile.size / 1024).toFixed(1)} KB - Klik untuk mengganti file</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <p className="font-semibold text-sm text-slate-700">Seret & taruh file Excel di sini, atau klik untuk memilih file</p>
                    <p className="text-2xs text-slate-450 font-medium">Hanya mendukung tipe file spreadsheet .xlsx atau .xls</p>
                  </div>
                )}
              </div>

              {/* Error Alert */}
              {importError && (
                <div className="p-3 bg-rose-50 border border-rose-150 rounded-lg flex items-start gap-2.5 text-xs text-rose-700 leading-relaxed font-semibold">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                  <div>
                    <span className="font-bold block mb-0.5">Kesalahan Unggah File:</span>
                    {importError}
                  </div>
                </div>
              )}

              {/* Success Alert Overlay */}
              {importSuccessMessage && (
                <div className="p-4 bg-emerald-50 border border-emerald-150 rounded-lg flex items-center gap-3 text-xs text-emerald-800 font-bold justify-center">
                  <CheckCircle2 className="w-5 h-5 text-emerald-650 animate-bounce" />
                  <span>{importSuccessMessage}</span>
                </div>
              )}

              {/* Real-time Data Preview & Validation Table */}
              {importRows.length > 0 && !importSuccessMessage && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                      Pratinjau Data Impor ({importRows.length} penduduk terdeteksi)
                    </h4>
                    <div className="flex items-center gap-3 text-xs">
                      <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-full font-semibold border border-emerald-100 flex items-center gap-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                        {importRows.filter(r => r.errors.length === 0).length} Siap Diimpor
                      </span>
                      {importRows.filter(r => r.errors.length > 0).length > 0 && (
                        <span className="px-2.5 py-1 bg-rose-50 text-rose-700 rounded-full font-semibold border border-rose-100 flex items-center gap-1">
                          <span className="h-1.5 w-1.5 rounded-full bg-rose-500"></span>
                          {importRows.filter(r => r.errors.length > 0).length} Dilewatkan (Error)
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="border border-slate-150 rounded-lg overflow-hidden max-h-[300px] overflow-y-auto shadow-inner bg-slate-50">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead className="bg-slate-100 text-slate-600 sticky top-0 font-bold border-b border-slate-200">
                        <tr>
                          <th className="p-2.5 text-center w-12">Baris</th>
                          <th className="p-2.5 w-36">NIK</th>
                          <th className="p-2.5 w-48">Nama Lengkap</th>
                          <th className="p-2.5 w-24 text-center">Wilayah</th>
                          <th className="p-2.5 w-24 text-center">Domisili</th>
                          <th className="p-2.5">Status Validasi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {importRows.map((row, idx) => {
                          const hasError = row.errors.length > 0;
                          const hasWarning = row.warnings.length > 0;

                          return (
                            <tr key={idx} className={`hover:bg-slate-50/50 ${hasError ? "bg-rose-50/20" : ""}`}>
                              <td className="p-2 text-center text-slate-400 font-mono text-[11px]">{row.rowNum}</td>
                              <td className="p-2 font-mono font-medium text-slate-700">{row.nik || <span className="text-slate-300 italic">- kosong -</span>}</td>
                              <td className="p-2 font-semibold text-slate-800">{row.nama || <span className="text-rose-500 italic">- kosong -</span>}</td>
                              <td className="p-2 text-center text-slate-600 font-semibold">{row.rwId}</td>
                              <td className="p-2 text-center">
                                <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                                  row.status === "Aktif" ? "bg-emerald-50 text-emerald-700 border border-emerald-100" :
                                  row.status === "Sementara" ? "bg-amber-50 text-amber-700 border border-amber-100" :
                                  "bg-slate-100 text-slate-600"
                                }`}>
                                  {row.status}
                                </span>
                              </td>
                              <td className="p-2">
                                <div className="space-y-1 text-[11px] leading-snug">
                                  {hasError && row.errors.map((err: string, i: number) => (
                                    <span key={i} className="flex items-center gap-1 text-rose-600 font-semibold">
                                      ❌ {err}
                                    </span>
                                  ))}
                                  {hasWarning && row.warnings.map((war: string, i: number) => (
                                    <span key={i} className="flex items-center gap-1 text-amber-600 font-semibold">
                                      ⚠️ {war}
                                    </span>
                                  ))}
                                  {!hasError && !hasWarning && (
                                    <span className="flex items-center gap-1 text-emerald-600 font-semibold">
                                      ✅ Data Valid & Siap Impor
                                    </span>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

            </div>

            {/* Footer */}
            <div className="bg-slate-50 px-6 py-4 border-t border-slate-150 flex items-center justify-between shrink-0">
              <button
                type="button"
                onClick={() => setIsImportModalOpen(false)}
                className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold text-xs px-4 py-2.5 rounded-lg cursor-pointer transition shadow-xs"
              >
                Batal
              </button>

              <button
                type="button"
                disabled={importRows.length === 0 || importRows.filter(r => r.errors.length === 0).length === 0}
                onClick={executeImport}
                className={`flex items-center gap-2 font-bold text-xs px-5 py-2.5 rounded-lg cursor-pointer transition shadow-md ${
                  importRows.length === 0 || importRows.filter(r => r.errors.length === 0).length === 0
                    ? "bg-slate-200 text-slate-400 cursor-not-allowed shadow-none"
                    : "bg-amber-600 hover:bg-amber-700 text-white"
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
                Impor Sekarang ({importRows.filter(r => r.errors.length === 0).length} Penduduk)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / REGISTER Modal Form */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden my-8 border border-slate-100">
            <div className="bg-emerald-600 text-white px-6 py-4 flex items-center justify-between">
              <h3 className="font-semibold text-lg font-display">Registrasi Penduduk Baru</h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-white/80 hover:text-white text-lg font-bold cursor-pointer">&times;</button>
            </div>

            <form onSubmit={handleAddWarga} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-100 text-rose-700 text-xs rounded-lg">
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Nomor NIK *</label>
                  <input
                    type="text"
                    maxLength={16}
                    placeholder="16-digit NIK unik"
                    value={formNik}
                    onChange={(e) => setFormNik(e.target.value.replace(/\D/g, ""))}
                    className="w-full bg-slate-50 text-slate-800 text-sm px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:border-emerald-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Nomor Kartu Keluarga (KK) *</label>
                  <input
                    type="text"
                    maxLength={16}
                    placeholder="16-digit KK No."
                    value={formKk}
                    onChange={(e) => setFormKk(e.target.value.replace(/\D/g, ""))}
                    className="w-full bg-slate-50 text-slate-800 text-sm px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:border-emerald-500 focus:bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Nama Lengkap *</label>
                  <input
                    type="text"
                    placeholder="Nama lengkap sesuai KTP"
                    value={formNama}
                    onChange={(e) => setFormNama(e.target.value)}
                    className="w-full bg-slate-50 text-slate-800 text-sm px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:border-emerald-500 focus:bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Tempat Lahir</label>
                  <input
                    type="text"
                    placeholder="Kandang/Kota"
                    value={formTempatLahir}
                    onChange={(e) => setFormTempatLahir(e.target.value)}
                    className="w-full bg-slate-50 text-slate-800 text-sm px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:border-emerald-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Tanggal Lahir *</label>
                  <input
                    type="date"
                    value={formTanggalLahir}
                    onChange={(e) => setFormTanggalLahir(e.target.value)}
                    className="w-full bg-slate-50 text-slate-800 text-sm px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:border-emerald-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Jenis Kelamin</label>
                  <div className="flex gap-4 items-center h-9">
                    <label className="inline-flex items-center text-sm">
                      <input
                        type="radio"
                        name="add-gender"
                        checked={formJk === "L"}
                        onChange={() => setFormJk("L")}
                        className="mr-1.5 accent-emerald-600"
                      />
                      Laki-laki
                    </label>
                    <label className="inline-flex items-center text-sm">
                      <input
                        type="radio"
                        name="add-gender"
                        checked={formJk === "P"}
                        onChange={() => setFormJk("P")}
                        className="mr-1.5 accent-emerald-600"
                      />
                      Perempuan
                    </label>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Agama</label>
                  <select
                    value={formAgama}
                    onChange={(e) => setFormAgama(e.target.value)}
                    className="w-full bg-slate-50 text-slate-800 text-sm px-3 py-2.5 rounded-lg border border-slate-200 focus:outline-none"
                  >
                    <option value="Islam">Islam</option>
                    <option value="Kristen Protestan">Kristen Protestan</option>
                    <option value="Katolik">Katolik</option>
                    <option value="Hindu">Hindu</option>
                    <option value="Buddha">Buddha</option>
                    <option value="Khonghucu">Khonghucu</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Pendidikan terakhir</label>
                  <input
                    type="text"
                    placeholder="SD/SMA/S1, dll"
                    value={formPendidikan}
                    onChange={(e) => setFormPendidikan(e.target.value)}
                    className="w-full bg-slate-50 text-slate-800 text-sm px-3 py-2 rounded-lg border border-slate-200 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Pekerjaan</label>
                  <input
                    type="text"
                    placeholder="Petani/Karyawan, dll"
                    value={formPekerjaan}
                    onChange={(e) => setFormPekerjaan(e.target.value)}
                    className="w-full bg-slate-50 text-slate-800 text-sm px-3 py-2 rounded-lg border border-slate-200"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Hubungan dalam Keluarga</label>
                  <select
                    value={formHubungan}
                    onChange={(e) => setFormHubungan(e.target.value)}
                    className="w-full bg-slate-50 text-slate-800 text-sm px-3 py-2.5 rounded-lg border border-slate-200 focus:outline-none"
                  >
                    <option value="Kepala Keluarga">Kepala Keluarga</option>
                    <option value="Suami">Suami</option>
                    <option value="Istri">Istri</option>
                    <option value="Anak">Anak</option>
                    <option value="Orang Tua">Orang Tua</option>
                    <option value="Mertua">Mertua</option>
                    <option value="Lainnya">Lainnya</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Wilayah RW</label>
                  <select
                    value={formRw}
                    onChange={(e) => setFormRw(e.target.value)}
                    disabled={currentUser.role === "User"}
                    className="w-full bg-slate-50 text-slate-800 text-sm px-3 py-2.5 rounded-lg border border-slate-200 focus:outline-none"
                  >
                    {rws.map((rw) => (
                      <option key={rw.id} value={rw.id}>{rw.id} ({rw.namaKetua})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Kontak Telepon / WA</label>
                  <input
                    type="text"
                    placeholder="08xxxxxxxxxx"
                    value={formKontak}
                    onChange={(e) => setFormKontak(e.target.value)}
                    className="w-full bg-slate-50 text-slate-800 text-sm px-3 py-2 rounded-lg border border-slate-200 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Status Kependudukan</label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as WargaStatus)}
                    className="w-full bg-slate-50 text-slate-800 text-sm px-3 py-2.5 rounded-lg border border-slate-200 focus:outline-none"
                  >
                    <option value="Aktif">Aktif (Penduduk Tetap)</option>
                    <option value="Sementara">Sementara (Non-Permanen)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Alamat Lengkap Dusun (RT/RW/Kontak)</label>
                <textarea
                  placeholder="Mis. Dusun Sukamaju RT 02 RW 03, Kel. Sukamaju"
                  value={formAlamat}
                  onChange={(e) => setFormAlamat(e.target.value)}
                  className="w-full bg-slate-50 text-slate-800 text-sm px-3 py-2 rounded-lg border border-slate-200 focus:outline-none"
                  rows={2}
                />
              </div>

              {/* Photo Upload Box */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Unggah Foto Profil Penduduk</label>
                <div className="flex items-center gap-4 border border-dashed border-slate-200 p-4 rounded-lg bg-slate-50">
                  <div className="flex h-14 w-14 bg-slate-200 rounded-full flex-shrink-0 items-center justify-center text-slate-500 overflow-hidden border">
                    {formFoto ? (
                      <img src={formFoto} className="w-full h-full object-cover" alt="Preview" referrerPolicy="no-referrer" />
                    ) : (
                      <ImageIcon className="w-6 h-6 stroke-1 text-slate-400" />
                    )}
                  </div>
                  <div className="text-left">
                    <input
                      type="file"
                      accept="image/jpeg,image/png"
                      onChange={handlePhotoChange}
                      className="text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-slate-200 file:text-slate-700 hover:file:bg-slate-300"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">Hanya didukung format JPEG/PNG. Maksimal ukuran file 1MB.</p>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-3 text-sm">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-500 font-medium rounded-lg hover:bg-slate-50 cursor-pointer"
                >
                  Batalkan
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 cursor-pointer"
                >
                  Daftarkan Warga
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal Form */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden my-8 border border-slate-100">
            <div className="bg-slate-800 text-white px-6 py-4 flex items-center justify-between">
              <h3 className="font-semibold text-lg font-display">Mutasi / Sunting Data Penduduk</h3>
              <button onClick={() => setIsEditModalOpen(false)} className="text-white/80 hover:text-white text-lg font-bold cursor-pointer">&times;</button>
            </div>

            <form onSubmit={handleEditWarga} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-100 text-rose-700 text-xs rounded-lg">
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Nomor NIK *</label>
                  <input
                    type="text"
                    maxLength={16}
                    value={formNik}
                    onChange={(e) => setFormNik(e.target.value.replace(/\D/g, ""))}
                    className="w-full bg-slate-100 text-slate-600 text-sm px-3 py-2 rounded-lg border border-slate-200 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Nomor Kartu Keluarga (KK) *</label>
                  <input
                    type="text"
                    maxLength={16}
                    value={formKk}
                    onChange={(e) => setFormKk(e.target.value.replace(/\D/g, ""))}
                    className="w-full bg-slate-50 text-slate-800 text-sm px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:border-slate-500 focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Nama Lengkap *</label>
                <input
                  type="text"
                  value={formNama}
                  onChange={(e) => setFormNama(e.target.value)}
                  className="w-full bg-slate-50 text-slate-800 text-sm px-3 py-2 rounded-lg border border-slate-200"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Tempat Lahir</label>
                  <input
                    type="text"
                    value={formTempatLahir}
                    onChange={(e) => setFormTempatLahir(e.target.value)}
                    className="w-full bg-slate-50 text-slate-800 text-sm px-3 py-2 rounded-lg border border-slate-200"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Tanggal Lahir *</label>
                  <input
                    type="date"
                    value={formTanggalLahir}
                    onChange={(e) => setFormTanggalLahir(e.target.value)}
                    className="w-full bg-slate-50 text-slate-800 text-sm px-3 py-2 rounded-lg border border-slate-200"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Jenis Kelamin</label>
                  <div className="flex gap-4 items-center h-9">
                    <label className="inline-flex items-center text-sm">
                      <input
                        type="radio"
                        name="edit-gender"
                        checked={formJk === "L"}
                        onChange={() => setFormJk("L")}
                        className="mr-1.5"
                      />
                      Laki-laki
                    </label>
                    <label className="inline-flex items-center text-sm">
                      <input
                        type="radio"
                        name="edit-gender"
                        checked={formJk === "P"}
                        onChange={() => setFormJk("P")}
                        className="mr-1.5"
                      />
                      Perempuan
                    </label>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Agama</label>
                  <select
                    value={formAgama}
                    onChange={(e) => setFormAgama(e.target.value)}
                    className="w-full bg-slate-50 text-slate-800 text-sm px-3 py-2.5 rounded-lg border border-slate-200"
                  >
                    <option value="Islam">Islam</option>
                    <option value="Kristen Protestan">Kristen Protestan</option>
                    <option value="Katolik">Katolik</option>
                    <option value="Hindu">Hindu</option>
                    <option value="Buddha">Buddha</option>
                    <option value="Khonghucu">Khonghucu</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Pendidikan terakhir</label>
                  <input
                    type="text"
                    value={formPendidikan}
                    onChange={(e) => setFormPendidikan(e.target.value)}
                    className="w-full bg-slate-50 text-slate-800 text-sm px-3 py-2 rounded-lg border border-slate-200"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Pekerjaan</label>
                  <input
                    type="text"
                    value={formPekerjaan}
                    onChange={(e) => setFormPekerjaan(e.target.value)}
                    className="w-full bg-slate-50 text-slate-800 text-sm px-3 py-2 rounded-lg border border-slate-200"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Hubungan dalam Keluarga</label>
                  <select
                    value={formHubungan}
                    onChange={(e) => setFormHubungan(e.target.value)}
                    className="w-full bg-slate-50 text-slate-800 text-sm px-3 py-2.5 rounded-lg border border-slate-200 focus:outline-none"
                  >
                    <option value="Kepala Keluarga">Kepala Keluarga</option>
                    <option value="Suami">Suami</option>
                    <option value="Istri">Istri</option>
                    <option value="Anak">Anak</option>
                    <option value="Orang Tua">Orang Tua</option>
                    <option value="Mertua">Mertua</option>
                    <option value="Lainnya">Lainnya</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Wilayah RW</label>
                  <select
                    value={formRw}
                    onChange={(e) => setFormRw(e.target.value)}
                    disabled={currentUser.role === "User"}
                    className="w-full bg-slate-50 text-slate-800 text-sm px-3 py-2.5 rounded-lg border border-slate-200 focus:outline-none"
                  >
                    {rws.map((rw) => (
                      <option key={rw.id} value={rw.id}>{rw.id} ({rw.namaKetua})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 font-sans">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Kontak Telepon / WA</label>
                  <input
                    type="text"
                    value={formKontak}
                    onChange={(e) => setFormKontak(e.target.value)}
                    className="w-full bg-slate-50 text-slate-800 text-sm px-3 py-2 rounded-lg border border-slate-200 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Status Kependudukan (PENTING untuk Mutasi LAMPID)</label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as WargaStatus)}
                    className="w-full bg-slate-50 text-slate-800 text-sm px-3 py-2.5 rounded-lg border border-slate-300 focus:outline-none"
                  >
                    <option value="Aktif">Status Aktif (Kependudukan Tetap)</option>
                    <option value="Sementara">Sementara (Non-Permanen)</option>
                    <option value="Meninggal">Almarhum (Meninggal)</option>
                    <option value="Pindah">Pindah Keluar (Mutasi Keluar)</option>
                  </select>
                  <p className="text-[10px] text-amber-600 font-medium mt-1">Mengubah status ke 'Almarhum/Meninggal' atau 'Pindah Keluar' otomatis tercatat ke buku mutasi (LAMPID).</p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Alamat Lengkap RT/RW</label>
                <textarea
                  value={formAlamat}
                  onChange={(e) => setFormAlamat(e.target.value)}
                  className="w-full bg-slate-50 text-slate-800 text-sm px-3 py-2 rounded-lg border border-slate-200"
                  rows={2}
                />
              </div>

              {formStatus === "Pindah" && (
                <div>
                  <label className="block text-xs font-semibold text-amber-700 mb-1 font-display">Tujuan Pindah Keluar *</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Pindah ke Kabupaten Boyolali RT 05 RW 01"
                    value={formCatatan}
                    onChange={(e) => setFormCatatan(e.target.value)}
                    className="w-full bg-amber-50/50 text-slate-800 text-sm px-3 py-2 rounded-lg border border-amber-200 focus:outline-none focus:border-amber-500"
                  />
                </div>
              )}

              {/* Photo Upload Box Edit */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Unggah Foto Profil Penduduk</label>
                <div className="flex items-center gap-4 border border-dashed border-slate-200 p-4 rounded-lg bg-slate-50">
                  <div className="flex h-14 w-14 bg-slate-200 rounded-full flex-shrink-0 items-center justify-center text-slate-500 overflow-hidden border">
                    {formFoto ? (
                      <img src={formFoto} className="w-full h-full object-cover" alt="Preview" referrerPolicy="no-referrer" />
                    ) : (
                      <ImageIcon className="w-6 h-6 stroke-1 text-slate-400" />
                    )}
                  </div>
                  <div className="text-left">
                    <input
                      type="file"
                      accept="image/jpeg,image/png"
                      onChange={handlePhotoChange}
                      className="text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-slate-200 file:text-slate-700 hover:file:bg-slate-300"
                    />
                    <p className="text-[10px] text-slate-400 mt-1 font-mono">Hanya format JPEG/PNG. Maks 1MB.</p>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-3 text-sm">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-500 font-medium rounded-lg hover:bg-slate-50 cursor-pointer"
                >
                  Batalkan
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-slate-800 text-white font-medium rounded-lg hover:bg-slate-900 cursor-pointer"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Split Family Card (Pecah KK) Modal */}
      {isSplitKkModalOpen && selectedWarga && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden border border-slate-100 p-6 space-y-4">
            <h3 className="text-lg font-semibold text-slate-800 font-display flex items-center gap-2">
              <Layers className="w-5 h-5 text-indigo-600" />
              Pecah Kartu Keluarga (KK Baru)
            </h3>
            <p className="text-sm text-slate-500 leading-relaxed">
              Memisahkan warga atas nama <strong className="text-slate-700">{selectedWarga.nama}</strong> dari Kartu Keluarga induk <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-xs">{selectedWarga.kk}</span> untuk mendirikan Kartu Keluarga (KK) baru.
            </p>

            <form onSubmit={handleSplitKk} className="space-y-4 pt-2">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Nomor Kartu Keluarga Baru (16-Digit) *</label>
                <input
                  type="text"
                  maxLength={16}
                  required
                  placeholder="337412xxxxxxxxxx"
                  value={targetSplitKk}
                  onChange={(e) => setTargetSplitKk(e.target.value.replace(/\D/g, ""))}
                  className="w-full bg-slate-50 font-mono text-sm px-3.5 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:border-indigo-500 focus:bg-white"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2 text-sm">
                <button
                  type="button"
                  onClick={() => setIsSplitKkModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-500 rounded-lg hover:bg-slate-50 cursor-pointer"
                >
                  Batalkan
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 cursor-pointer"
                >
                  Proses Pecah KK
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Merge Family Card (Merge KK) Modal */}
      {isMergeKkModalOpen && selectedWarga && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden border border-slate-100 p-6 space-y-4">
            <h3 className="text-lg font-semibold text-slate-800 font-display flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-teal-600" />
              Gabung Kartu Keluarga (Merge KK)
            </h3>
            <p className="text-sm text-slate-500 leading-relaxed">
              Memasukkan warga bernama <strong className="text-slate-700">{selectedWarga.nama}</strong> (KK Lama: <span className="font-mono text-xs">{selectedWarga.kk}</span>) ke dalam Kartu Keluarga (KK) keluarga lain yang sudah terdaftar.
            </p>

            <form onSubmit={handleMergeKk} className="space-y-4 pt-2">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Nomor KK Target Penggabungan (16-Digit) *</label>
                <input
                  type="text"
                  maxLength={16}
                  required
                  placeholder="Masukkan 16 digit KK tujuan"
                  value={targetMergeKk}
                  onChange={(e) => setTargetMergeKk(e.target.value.replace(/\D/g, ""))}
                  className="w-full bg-slate-50 font-mono text-sm px-3.5 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:border-teal-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Hubungan Anggota Keluarga Baru *</label>
                <select
                  value={formHubungan}
                  onChange={(e) => setFormHubungan(e.target.value)}
                  className="w-full bg-slate-50 text-sm px-3.5 py-2.5 rounded-lg border border-slate-200 focus:outline-none"
                >
                  <option value="Suami">Suami</option>
                  <option value="Istri">Istri</option>
                  <option value="Anak">Anak</option>
                  <option value="Orang Tua">Orang Tua</option>
                  <option value="Mertua">Mertua</option>
                  <option value="Lainnya">Lainnya</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-2 text-sm">
                <button
                  type="button"
                  onClick={() => setIsMergeKkModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-500 rounded-lg hover:bg-slate-50 cursor-pointer"
                >
                  Batalkan
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-medium rounded-lg cursor-pointer"
                >
                  Gabungkan KK
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
