/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Warga, RW, Iuran, TransaksiIuran, Pengajuan, Laporan, MutasiLog, User, JadwalRonda, KegiatanRutin } from "./types";

// Setup initial preloaded accounts
export const SIMULATED_USERS: User[] = [
  { id: "u0", username: "kadus", nama: "Asep Juhara", role: "Admin", password: "Joe12hara" }, // Kepala Dusun 
  { id: "u1", username: "rw07", nama: "Pak Miftah", role: "User", rwId: "RW 07", password: "rw07m" },
  { id: "u2", username: "rw08", nama: "Pak Darmatin", role: "User", rwId: "RW 08", password: "rw08d" },
  { id: "u3", username: "rw09", nama: "Pak Sulam Nedi", role: "User", rwId: "RW 09", password: "rw09s" },
  { id: "u4", username: "rw13", nama: "Pak Ajang", role: "User", rwId: "RW 13", password: "rw13a" },
  { id: "u5", username: "rw15", nama: "Pak Fuad", role: "User", rwId: "RW 15", password: "rw15f" },
  { id: "u6", username: "rw16", nama: "Pak endang", role: "User", rwId: "RW 16", password: "rw16e" },
  { id: "u7", username: "rw17", nama: "Pak Jajang", role: "User", rwId: "RW 17", password: "rw17j" },
];

export const INITIAL_RWS: RW[] = [
  { id: "RW 07", namaKetua: "Pak Miftah", wilayah: "Dusun 3 Desa Suci", kontak: "0812-9819-2826" },
  { id: "RW 08", namaKetua: "Pak Darmatin", wilayah: "Dusun 3 Desa Suci", kontak: "0852-2175-6060" },
  { id: "RW 09", namaKetua: "Pak Sulam Nedi", wilayah: "Dusun 3 Desa Suci", kontak: "0813-2352-9928" },
  { id: "RW 13", namaKetua: "Pak Ajang", wilayah: "Dusun 3 Desa Suci", kontak: "0895-3206-07565" },
  { id: "RW 15", namaKetua: "Pak Fuad", wilayah: "Dusun 3 Desa Suci", kontak: "0813-2300-1474" },
  { id: "RW 16", namaKetua: "Pak endang", wilayah: "Dusun 3 Desa Suci", kontak: "0819-0011-2233" },
  { id: "RW 17", namaKetua: "Pak Jajang", wilayah: "Dusun 3 Desa Suci", kontak: "0859-7459-8866" },
];

// Helper to compile elegant mock photos as safe Base64-encoded SVG data URIs
// This resolves the issue where Chrome/Safari render un-encoded raw SVGs as completely blank
function svgToBase64(svg: string): string {
  try {
    return "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svg.trim())));
  } catch (e) {
    // Fallback URL encoded
    return "data:image/svg+xml;utf8," + encodeURIComponent(svg.trim());
  }
}

// Safely decode URI components containing percentages (e.g. 100%, 50%) that fail raw decodeURIComponent
function safeDecode(str: string): string {
  try {
    return decodeURIComponent(str);
  } catch (e) {
    return str
      .replace(/%23/g, "#")
      .replace(/%20/g, " ")
      .replace(/%3C/g, "<")
      .replace(/%3E/g, ">")
      .replace(/%22/g, '"')
      .replace(/%27/g, "'")
      .replace(/%2C/g, ",")
      .replace(/%2F/g, "/")
      .replace(/%3D/g, "=")
      .replace(/%3A/g, ":");
  }
}

const rutilahu1Svg = `<svg xmlns='http://www.w3.org/2000/svg' width='400' height='300' viewBox='0 0 400 300'><rect width='100%' height='100%' fill='#fef2f2'/><path d='M80,220 L320,220 L320,140 L80,140 Z' fill='#fee2e2' stroke='#f87171' stroke-width='4'/><path d='M60,140 L200,50 L340,140 Z' fill='#fca5a5' stroke='#ef4444' stroke-width='4'/><rect x='120' y='160' width='40' height='60' fill='#b91c1c'/><rect x='220' y='160' width='50' height='40' fill='#f87171'/><text x='50%' y='85%' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='16' fill='#991b1b'>Kondisi Rumah Rawan Roboh (Rutilahu)</text></svg>`;

const rutilahu2Svg = `<svg xmlns='http://www.w3.org/2000/svg' width='400' height='300' viewBox='0 0 400 300'><rect width='100%' height='100%' fill='#fffbeb'/><rect x='100' y='130' width='200' height='100%' fill='#fef3c7' stroke='#fbbf24' stroke-width='3'/><path d='M80,130 L200,60 L320,130 Z' fill='#f59e0b'/><text x='50%' y='85%' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='15' fill='#92400e'>Dinding Retak dan Atap Bocor</text></svg>`;

const jalanRusakSvg = `<svg xmlns='http://www.w3.org/2000/svg' width='400' height='300' viewBox='0 0 400 300'><rect width='100%' height='100%' fill='#f3f4f6'/><path d='M10,180 Q100,100 200,180 T390,180' fill='none' stroke='#9ca3af' stroke-width='20'/><circle cx='120' cy='150' r='25' fill='#4b5563'/><circle cx='240' cy='170' r='30' fill='#374151'/><circle cx='300' cy='140' r='15' fill='#4b5563'/><text x='50%' y='85%' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='16' fill='#1f2937'>Jalan Berlubang - RW 02</text></svg>`;

const kerjaBaktiSvg = `<svg xmlns='http://www.w3.org/2000/svg' width='400' height='300' viewBox='0 0 400 300'><rect width='100%' height='100%' fill='#ecfdf5'/><circle cx='100' cy='150' r='30' fill='#10b981'/><circle cx='200' cy='150' r='35' fill='#059669'/><circle cx='300' cy='150' r='30' fill='#10b981'/><rect x='80' y='180' width='240' height='40' rx='10' fill='#047857'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='16' fill='#ffffff' font-weight='bold'>Kerja Bakti Bersama</text><text x='50%' y='85%' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='14' fill='#065f46'>Kegiatan Pembersihan Selokan</text></svg>`;

const posyanduSvg = `<svg xmlns='http://www.w3.org/2000/svg' width='400' height='300' viewBox='0 0 400 300'><rect width='100%' height='100%' fill='#eff6ff'/><circle cx='200' cy='140' r='60' fill='#93c5fd'/><path d='M170,140 L230,140 M200,111 L200,169' stroke='#2563eb' stroke-width='16' stroke-linecap='round'/><text x='50%' y='85%' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='15' fill='#1e40af' font-weight='bold'>Kegiatan Bulanan Posyandu</text></svg>`;

export const PRESET_PHOTOS = {
  rutilahu1: svgToBase64(rutilahu1Svg),
  rutilahu2: svgToBase64(rutilahu2Svg),
  jalanRusak: svgToBase64(jalanRusakSvg),
  kerjaBakti: svgToBase64(kerjaBaktiSvg),
  posyandu: svgToBase64(posyanduSvg)
};

// Seed Warga
const PARSED_INITIAL_WARGA: Warga[] = [
  // RW 03 (Ibu Siti Aminah is Ketua)
  {
    id: 1,
    nik: "3374121205800001",
    kk: "3374122006150001",
    nama: "Ahmad Susanto",
    tempatLahir: "Semarang",
    tanggalLahir: "1980-05-12",
    jk: "L",
    agama: "Islam",
    pendidikan: "S1 Teknik",
    pekerjaan: "Wiraswasta",
    hubungan: "Kepala Keluarga",
    alamat: "RT 01 RW 03, Dusun Sukamaju",
    kontak: "0812-7766-5544",
    rwId: "RW 03",
    status: "Aktif",
    tanggalInput: "2026-01-10",
  },
  {
    id: 2,
    nik: "3374124308820002",
    kk: "3374122006150001",
    nama: "Siti Rahmawati",
    tempatLahir: "Semarang",
    tanggalLahir: "1982-08-03",
    jk: "P",
    agama: "Islam",
    pendidikan: "SMA",
    pekerjaan: "Ibu Rumah Tangga",
    hubungan: "Istri",
    alamat: "RT 01 RW 03, Dusun Sukamaju",
    kontak: "",
    rwId: "RW 03",
    status: "Aktif",
    tanggalInput: "2026-01-10",
  },
  {
    id: 3,
    nik: "3374120912100003",
    kk: "3374122006150001",
    nama: "Budi Pratama",
    tempatLahir: "Semarang",
    tanggalLahir: "2010-12-09",
    jk: "L",
    agama: "Islam",
    pendidikan: "SMP",
    pekerjaan: "Pelajar",
    hubungan: "Anak",
    alamat: "RT 01 RW 03, Dusun Sukamaju",
    kontak: "",
    rwId: "RW 03",
    status: "Aktif",
    tanggalInput: "2026-01-10",
  },

  // RW 01 (Pak Ahmad's residents)
  {
    id: 4,
    nik: "3374121402750001",
    kk: "3374121511120005",
    nama: "Herman Kartiko",
    tempatLahir: "Kendal",
    tanggalLahir: "1975-02-14",
    jk: "L",
    agama: "Kristen Protestan",
    pendidikan: "Diploma III",
    pekerjaan: "Karyawan Swasta",
    hubungan: "Kepala Keluarga",
    alamat: "RT 03 RW 01, Dusun Sukamaju",
    kontak: "0813-2211-0099",
    rwId: "RW 01",
    status: "Aktif",
    tanggalInput: "2026-02-15",
  },
  {
    id: 5,
    nik: "3374126207790001",
    kk: "3374121511120005",
    nama: "Evi Susilowati",
    tempatLahir: "Semarang",
    tanggalLahir: "1979-07-22",
    jk: "P",
    agama: "Kristen Protestan",
    pendidikan: "SMA",
    pekerjaan: "Karyawan Swasta",
    hubungan: "Istri",
    alamat: "RT 03 RW 01, Dusun Sukamaju",
    kontak: "",
    rwId: "RW 01",
    status: "Aktif",
    tanggalInput: "2026-02-15",
  },

  // RW 02 (Ibu Ratna's residents - one needy family for social assistance demo)
  {
    id: 6,
    nik: "3374121804600001",
    kk: "3374121112990009",
    nama: "Mbah Harjo",
    tempatLahir: "Semarang",
    tanggalLahir: "1960-04-18",
    jk: "L",
    agama: "Islam",
    pendidikan: "SD",
    pekerjaan: "Buruh Harian Lepas",
    hubungan: "Kepala Keluarga",
    alamat: "RT 01 RW 02, Dusun Sukamaju",
    kontak: "0815-5555-4444",
    rwId: "RW 02",
    status: "Aktif",
    tanggalInput: "2026-01-20",
  },
  {
    id: 7,
    nik: "3374124911650002",
    kk: "3374121112990009",
    nama: "Mbah Saminah",
    tempatLahir: "Demak",
    tanggalLahir: "1965-11-09",
    jk: "P",
    agama: "Islam",
    pendidikan: "SD",
    pekerjaan: "Petani",
    hubungan: "Istri",
    alamat: "RT 01 RW 02, Dusun Sukamaju",
    kontak: "",
    rwId: "RW 02",
    status: "Aktif",
    tanggalInput: "2026-01-20",
  },

  // RW 04 (Pak Bambang status)
  {
    id: 8,
    nik: "3374121111880001",
    kk: "3374120909180008",
    nama: "Sugeng Riyadi",
    tempatLahir: "Solo",
    tanggalLahir: "1988-11-11",
    jk: "L",
    agama: "Islam",
    pendidikan: "SMA",
    pekerjaan: "PNS",
    hubungan: "Kepala Keluarga",
    alamat: "RT 02 RW 04, Dusun Sukamaju",
    kontak: "0812-9900-8811",
    rwId: "RW 04",
    status: "Aktif",
    tanggalInput: "2026-01-25",
  },
  
  // RW 05 (Ibu Dewi status)
  {
    id: 9,
    nik: "3374120202920002",
    kk: "3374120101150005",
    nama: "Joko Widodo Susilo",
    tempatLahir: "Semarang",
    tanggalLahir: "1992-02-02",
    jk: "L",
    agama: "Katolik",
    pendidikan: "S1 Ekonomi",
    pekerjaan: "Wiraswasta",
    hubungan: "Kepala Keluarga",
    alamat: "RT 04 RW 05, Dusun Sukamaju",
    kontak: "0856-1122-3344",
    rwId: "RW 05",
    status: "Aktif",
    tanggalInput: "2026-03-05",
  },
  // Temporary residents / Penduduk Sementara
  {
    id: 10,
    nik: "3318112310950005",
    kk: "3318112209140003",
    nama: "Rian Prasetyo",
    tempatLahir: "Pati",
    tanggalLahir: "1995-10-23",
    jk: "L",
    agama: "Islam",
    pendidikan: "D4 Teknik",
    pekerjaan: "Kontraktor Proyek",
    hubungan: "Lainnya",
    alamat: "Kost Pondok Indah RT 02 RW 03, Sukamaju",
    kontak: "0823-8888-2221",
    rwId: "RW 03",
    status: "Sementara",
    catatan: "KTP Asal Pati. Tinggal sementara untuk pengerjaan proyek tol selama 6 bulan.",
    tanggalInput: "2026-03-12",
  }
];

// Seed Mutasi Logs (LAMPID)
const INITIAL_MUTASI_LOGS: MutasiLog[] = [
  {
    id: 1,
    wargaId: 10,
    namaWarga: "Rian Prasetyo",
    nik: "3318112310950005",
    kk: "3318112209140003",
    jenis: "Penduduk Sementara",
    tanggalPeristiwa: "2026-03-12",
    keterangan: "Pendaftaran domisili sementara untuk pekerjaan tol",
    petugasName: "Ibu Siti Aminah (Ketua RW 03)",
    timestamp: "2026-03-12T09:30:00Z"
  }
];

// Seed Dues / Iuran
// Target default iuran RW: Rp 50.000 per bulan
const INITIAL_IURAN: Iuran[] = [
  { id: 1, wargaId: 1, bulanTahun: "2026-05", jumlah: 50000, totalDibayar: 50000, statusBayar: "Lunas" },
  { id: 2, wargaId: 1, bulanTahun: "2026-06", jumlah: 50000, totalDibayar: 50000, statusBayar: "Lunas" },
  { id: 3, wargaId: 4, bulanTahun: "2026-05", jumlah: 50000, totalDibayar: 50000, statusBayar: "Lunas" },
  { id: 4, wargaId: 4, bulanTahun: "2026-06", jumlah: 50000, totalDibayar: 0, statusBayar: "Belum Bayar" },
  { id: 5, wargaId: 6, bulanTahun: "2026-05", jumlah: 50000, totalDibayar: 20000, statusBayar: "Kurang" },
  { id: 6, wargaId: 6, bulanTahun: "2026-06", jumlah: 50000, totalDibayar: 0, statusBayar: "Belum Bayar" },
  { id: 7, wargaId: 8, bulanTahun: "2026-05", jumlah: 50000, totalDibayar: 50000, statusBayar: "Lunas" },
  { id: 8, wargaId: 8, bulanTahun: "2026-06", jumlah: 50000, totalDibayar: 50000, statusBayar: "Lunas" },
  { id: 9, wargaId: 9, bulanTahun: "2026-06", jumlah: 50000, totalDibayar: 50000, statusBayar: "Lunas" },
];

const INITIAL_TRANSACTIONS: TransaksiIuran[] = [
  { id: 1, iuranId: 1, wargaId: 1, tanggal: "2026-05-02 09:15:00", jenis: "Masuk", jumlah: 50000, keterangan: "Iuran Bulanan Mei - Ahmad S." },
  { id: 2, iuranId: 2, wargaId: 1, tanggal: "2026-06-04 10:00:00", jenis: "Masuk", jumlah: 50000, keterangan: "Iuran Bulanan Juni - Ahmad S." },
  { id: 3, iuranId: 3, wargaId: 4, tanggal: "2026-05-05 14:00:00", jenis: "Masuk", jumlah: 50000, keterangan: "Iuran Bulanan Mei - Herman K." },
  { id: 4, iuranId: 5, wargaId: 6, tanggal: "2026-05-10 11:30:00", jenis: "Masuk", jumlah: 20000, keterangan: "Cicilan Iuran Mei - Mbah Harjo" },
  { id: 5, iuranId: 7, wargaId: 8, tanggal: "2026-05-01 08:00:00", jenis: "Masuk", jumlah: 50000, keterangan: "Iuran Pertama Mei - Sugeng R." },
  { id: 6, iuranId: 8, wargaId: 8, tanggal: "2026-06-02 08:30:00", jenis: "Masuk", jumlah: 50000, keterangan: "Iuran Bulanan Juni - Sugeng R." },
  { id: 7, iuranId: 9, wargaId: 9, tanggal: "2026-06-03 16:45:00", jenis: "Masuk", jumlah: 50000, keterangan: "Iuran Bulanan Juni - Joko W." },
  // Outflow transaction for RW expenses
  { id: 8, iuranId: 0, wargaId: 0, tanggal: "2026-06-05 19:00:00", jenis: "Keluar", jumlah: 120000, keterangan: "Pembelian Alat Kebersihan RW 03" },
];

// Seed Pengajuan Bantuan
const INITIAL_PENGAJUAN: Pengajuan[] = [
  {
    id: 1,
    wargaId: 6, // Mbah Harjo
    rwId: "RW 02",
    jenis: "Rutilahu",
    deskripsi: "Renovasi atap rumah bocor parah dan kayu penyangga lapuk termakan usia, khawatir roboh jika hujan deras.",
    tanggal: "2026-06-01 10:00:00",
    status: "Kirim",
    fotoList: [PRESET_PHOTOS.rutilahu1, PRESET_PHOTOS.rutilahu2],
    komentar: "Mohon segera diverifikasi tim lapangan, kondisi sangat mendesak."
  },
  {
    id: 2,
    wargaId: 1, // Ahmad Susanto (making request for infrastructure project)
    rwId: "RW 03",
    status: "Setuju",
    jenis: "Pembangunan",
    deskripsi: "Peningkatan saluran drainase RT 01 RW 03 untuk mencegah genangan air saat musim pancaroba.",
    tanggal: "2026-05-20 08:30:00",
    fotoList: [PRESET_PHOTOS.posyandu],
    komentar: "Disetujui. Alokasi dana dusun triwulan II sebesar Rp 15.000.000."
  }
];

// Seed Reports (Laporan Kegiatan / Pengaduan)
const INITIAL_LAPORAN: Laporan[] = [
  {
    id: 1,
    rwId: "RW 03",
    wargaId: 1,
    kategori: "Kegiatan",
    deskripsi: "RW 03 bersinergi menggelar kerja bakti minggu pagi guna membersihkan bahu jalan dan selokan air menjelang musim hujan.",
    tanggal: "2026-06-07 07:00:00",
    fotoList: [PRESET_PHOTOS.kerjaBakti],
    status: "Selesai",
    komentarAdmin: "Terima kasih atas kekompakan warga RW 03. Pertahankan semangat gotong royong!"
  },
  {
    id: 2,
    rwId: "RW 02",
    wargaId: 6,
    kategori: "Pengaduan",
    deskripsi: "Melaporkan titik ambles di jalur perbatasan RT 02 RW 02 akibat truk muatan pasir. Mengancam keselamatan warga.",
    tanggal: "2026-06-05 14:00:00",
    fotoList: [PRESET_PHOTOS.jalanRusak],
    status: "Diproses",
    komentarAdmin: "Akan dilaporkan ke dinas PU desa untuk penimbunan awal menggunakan kerikil esok hari."
  }
];

// Combine all into state object
export interface AppDatabase {
  warga: Warga[];
  rws: RW[];
  iuran: Iuran[];
  transaksi: TransaksiIuran[];
  pengajuan: Pengajuan[];
  laporan: Laporan[];
  mutasi: MutasiLog[];
  ronda?: JadwalRonda[];
  kegiatan?: KegiatanRutin[];
}

export const INITIAL_RONDA_LIST: JadwalRonda[] = [
  { id: 1, rwId: "RW 03", hari: "Senin", wargaIds: [1, 3], lokasiSektor: "RT 01 & RT 02 Pos Kamling Utara", jamMulai: "22:00", jamSelesai: "04:00", keterangan: "Sedia senter, jas hujan, dan jas ronda" },
  { id: 2, rwId: "RW 03", hari: "Rabu", wargaIds: [1], lokasiSektor: "RT 03 Pos Kamling Selatan", jamMulai: "22:00", jamSelesai: "03:00", keterangan: "Ronda keliling perumahan warga" },
  { id: 3, rwId: "RW 01", hari: "Kamis", wargaIds: [4], lokasiSektor: "RT 02 Pos Utama RW 01", jamMulai: "21:30", jamSelesai: "04:00", keterangan: "Wajib lapor berkala via WhatsApp grup" },
  { id: 4, rwId: "RW 02", hari: "Sabtu", wargaIds: [6], lokasiSektor: "RT 01 Pos Siaga RW 02", jamMulai: "22:00", jamSelesai: "04:00", keterangan: "Fokus penjagaan akhir pekan" },
  { id: 5, rwId: "RW 03", hari: "Minggu", wargaIds: [3], lokasiSektor: "RT 01 Pos Kamling Utara", jamMulai: "22:00", jamSelesai: "04:00", keterangan: "Fokus penjagaan malam Senin" }
];

export const INITIAL_KEGIATAN_LIST: KegiatanRutin[] = [
  { id: 1, rwId: "RW 03", nama: "Posyandu Balita Melati III", kategori: "Kesehatan", frekuensi: "Setiap hari Sabtu ke-2 tiap bulan", lokasi: "Balai Pertemuan RW 03", waktu: "08:00 - 11:30 WIB", penanggungJawab: "Ibu Kader PKK RW 03", deskripsi: "Pemeriksaan tumbuh kembang, imunisasi, dan pembagian makanan tambahan (PMT) balita." },
  { id: 2, rwId: "RW 01", nama: "Pengajian Rutin Bulanan", kategori: "Keagamaan", frekuensi: "Setiap Malam Jum'at Pertama", lokasi: "Masjid Al-Hikmah RW 01", waktu: "19:30 WIB - Selesai", penanggungJawab: "Pengurus DKM Al-Hikmah", deskripsi: "Tausiyah agama beserta pembacaan Yasin dan Tahlil bersama warga." },
  { id: 3, rwId: "Semua RW", nama: "Minggu Bersih Gotong Royong", kategori: "Gotong Royong", frekuensi: "Minggu terakhir setiap bulan", lokasi: "Seluruh Saluran Udara & Drainase", waktu: "07:00 WIB - Selesai", penanggungJawab: "Aparat Desa & RT/RW", deskripsi: "Pembasmi jentik nyamuk dan pembersihan lingkungan serentak mengantisipasi mampetnya saluran air." },
  { id: 4, rwId: "RW 02", nama: "Posyandu Lansia Sehat Sejahtera", kategori: "Kesehatan", frekuensi: "Setiap hari Rabu pertengahan bulan", lokasi: "Rumah Ibu Ketua RW 02", waktu: "09:00 - 12:00 WIB", penanggungJawab: "Kader Posyandu RW 02", deskripsi: "Cek kesehatan tekanan darah, kadar gula darah, kolesterol, dan senam santai lansia." },
  { id: 5, rwId: "RW 03", nama: "Rapat Koordinasi Pengurus RT/RW", kategori: "Rapat / Musyawarah", frekuensi: "Satu kali setiap bulan", lokasi: "Joglo Utama Dusun Sukamaju", waktu: "19:30 WIB - Selesai", penanggungJawab: "Ketua RW 03", deskripsi: "Pembahasan evaluasi keamanan lingkungan, rekonsiliasi iuran bulanan, dan program kemasyarakatan." }
];

const STORAGE_KEY = "DUSUN_ADMIN_DB_v2";

export function getDatabase(): AppDatabase {
  const data = localStorage.getItem(STORAGE_KEY);
  if (!data) {
    const db: AppDatabase = {
      warga: PARSED_INITIAL_WARGA,
      rws: INITIAL_RWS,
      iuran: INITIAL_IURAN,
      transaksi: INITIAL_TRANSACTIONS,
      pengajuan: INITIAL_PENGAJUAN,
      laporan: INITIAL_LAPORAN,
      mutasi: INITIAL_MUTASI_LOGS,
      ronda: INITIAL_RONDA_LIST,
      kegiatan: INITIAL_KEGIATAN_LIST,
    };
    saveDatabase(db);
    return db;
  }
  try {
    const db = JSON.parse(data);
    
    // Auto-seed if missing
    if (!db.ronda) db.ronda = INITIAL_RONDA_LIST;
    if (!db.kegiatan) db.kegiatan = INITIAL_KEGIATAN_LIST;
    // Safe coercion/normalization of record attributes to prevent strict equality failures
    if (Array.isArray(db.warga)) {
      db.warga = db.warga.map((w: any) => ({
        ...w,
        id: Number(w.id),
        kk: String(w.kk || "").trim(),
        nik: String(w.nik || "").trim()
      }));
    }
    if (Array.isArray(db.pengajuan)) {
      db.pengajuan = db.pengajuan.map((p: any) => {
        let fList = p.fotoList;
        if (typeof fList === "string") {
          try { fList = JSON.parse(fList); } catch (e) { fList = []; }
        }
        const cleanedFotoList = Array.isArray(fList) ? fList.map((foto: any) => {
          if (typeof foto === "string" && foto.startsWith("data:image/svg+xml") && !foto.includes(";base64")) {
            try {
              let rawSvg = "";
              if (foto.includes("utf8,")) {
                rawSvg = safeDecode(foto.split("utf8,")[1]);
              } else if (foto.includes("utf-8,")) {
                rawSvg = safeDecode(foto.split("utf-8,")[1]);
              } else if (foto.includes(",")) {
                rawSvg = safeDecode(foto.split(",")[1]);
              }
              if (rawSvg && rawSvg.trim().startsWith("<svg")) {
                return "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(rawSvg.trim())));
              }
            } catch (err) {
              console.error("Failed to migrate legacy SVG photo:", err);
            }
          }
          return foto;
        }) : [];
        return {
          ...p,
          id: Number(p.id),
          wargaId: Number(p.wargaId),
          rwId: String(p.rwId || "").trim(),
          fotoList: cleanedFotoList
        };
      });
    }
    if (Array.isArray(db.laporan)) {
      db.laporan = db.laporan.map((l: any) => {
        let fList = l.fotoList;
        if (typeof fList === "string") {
          try { fList = JSON.parse(fList); } catch (e) { fList = []; }
        }
        const cleanedFotoList = Array.isArray(fList) ? fList.map((foto: any) => {
          if (typeof foto === "string" && foto.startsWith("data:image/svg+xml") && !foto.includes(";base64")) {
            try {
              let rawSvg = "";
              if (foto.includes("utf8,")) {
                rawSvg = safeDecode(foto.split("utf8,")[1]);
              } else if (foto.includes("utf-8,")) {
                rawSvg = safeDecode(foto.split("utf-8,")[1]);
              } else if (foto.includes(",")) {
                rawSvg = safeDecode(foto.split(",")[1]);
              }
              if (rawSvg && rawSvg.trim().startsWith("<svg")) {
                return "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(rawSvg.trim())));
              }
            } catch (err) {
              console.error("Failed to migrate legacy SVG photo:", err);
            }
          }
          return foto;
        }) : [];
        return {
          ...l,
          id: Number(l.id),
          wargaId: l.wargaId ? Number(l.wargaId) : undefined,
          rwId: String(l.rwId || "").trim(),
          fotoList: cleanedFotoList
        };
      });
    }
    if (Array.isArray(db.iuran)) {
      db.iuran = db.iuran.map((i: any) => ({
        ...i,
        id: Number(i.id),
        wargaId: Number(i.wargaId)
      }));
    }
    if (Array.isArray(db.transaksi)) {
      db.transaksi = db.transaksi.map((t: any) => ({
        ...t,
        id: Number(t.id),
        wargaId: Number(t.wargaId),
        iuranId: Number(t.iuranId)
      }));
    }
    
    // Safe parse checks for seeded arrays
    if (db.ronda && Array.isArray(db.ronda)) {
      db.ronda = db.ronda.map((r: any) => ({
        ...r,
        id: Number(r.id),
        wargaIds: Array.isArray(r.wargaIds) ? r.wargaIds.map(Number) : []
      }));
    }
    
    if (db.kegiatan && Array.isArray(db.kegiatan)) {
      db.kegiatan = db.kegiatan.map((k: any) => ({
        ...k,
        id: Number(k.id)
      }));
    }

    return db;
  } catch (e) {
    console.error("Failed to parse database from LocalStorage", e);
    return {
      warga: PARSED_INITIAL_WARGA,
      rws: INITIAL_RWS,
      iuran: INITIAL_IURAN,
      transaksi: INITIAL_TRANSACTIONS,
      pengajuan: INITIAL_PENGAJUAN,
      laporan: INITIAL_LAPORAN,
      mutasi: INITIAL_MUTASI_LOGS,
      ronda: INITIAL_RONDA_LIST,
      kegiatan: INITIAL_KEGIATAN_LIST,
    };
  }
}

export function saveDatabase(db: AppDatabase) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
}

// Transaction operations Helper
export function addTransaction(db: AppDatabase, tx: Omit<TransaksiIuran, "id">): AppDatabase {
  const newId = db.transaksi.length > 0 ? Math.max(...db.transaksi.map(t => t.id)) + 1 : 1;
  const newTx: TransaksiIuran = { id: newId, ...tx };
  
  const updatedTx = [...db.transaksi, newTx];
  let updatedIuran = [...db.iuran];

  // If transaction is tied to an iuran_id and is "Masuk" (Income)
  if (tx.iuranId > 0 && tx.jenis === "Masuk") {
    updatedIuran = db.iuran.map(i => {
      if (i.id === tx.iuranId) {
        const totalDibayar = i.totalDibayar + tx.jumlah;
        let statusBayar: "Lunas" | "Kurang" | "Belum Bayar" = "Belum Bayar";
        if (totalDibayar >= i.jumlah) statusBayar = "Lunas";
        else if (totalDibayar > 0) statusBayar = "Kurang";
        
        return {
          ...i,
          totalDibayar,
          statusBayar
        };
      }
      return i;
    });
  }

  const updatedDb = { ...db, transaksi: updatedTx, iuran: updatedIuran };
  saveDatabase(updatedDb);
  return updatedDb;
}

// demographic transitions tracker
export function logDemographyEvent(
  db: AppDatabase, 
  wargaId: number, 
  jenis: MutasiLog["jenis"], 
  keterangan: string, 
  petugasName: string
): AppDatabase {
  const currentWarga = db.warga.find(w => w.id === wargaId);
  if (!currentWarga) return db;

  const newLogId = db.mutasi.length > 0 ? Math.max(...db.mutasi.map(m => m.id)) + 1 : 1;
  const newLog: MutasiLog = {
    id: newLogId,
    wargaId,
    namaWarga: currentWarga.nama,
    nik: currentWarga.nik,
    kk: currentWarga.kk,
    jenis,
    tanggalPeristiwa: new Date().toISOString().split("T")[0],
    keterangan,
    petugasName,
    timestamp: new Date().toISOString(),
  };

  const updatedDb = {
    ...db,
    mutasi: [...db.mutasi, newLog]
  };
  saveDatabase(updatedDb);
  return updatedDb;
}
