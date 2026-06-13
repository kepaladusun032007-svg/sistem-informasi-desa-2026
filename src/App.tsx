/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { 
  getDatabase, 
  saveDatabase, 
  SIMULATED_USERS, 
  INITIAL_RWS,
  logDemographyEvent
} from "./dataStore";
import { Warga, RW, Iuran, TransaksiIuran, Pengajuan, Laporan, MutasiLog, User, JadwalRonda, KegiatanRutin, AppDatabase } from "./types";
import { 
  testConnection, 
  fetchDatabaseFromFirestore, 
  seedFirestoreIfEmpty, 
  syncLocalDatabaseToFirestore 
} from "./utils/firebaseSync";


// Import Panels
import WargaPanel from "./components/WargaPanel";
import MutasiPanel from "./components/MutasiPanel";
import IuranPanel from "./components/IuranPanel";
import PengajuanPanel from "./components/PengajuanPanel";
import LaporanPanel from "./components/LaporanPanel";
import ProfilRwPanel from "./components/ProfilRwPanel";
import FirebasePanel from "./components/FirebasePanel";
import AgendaPanel from "./components/AgendaPanel";

// Lucide Icons
import { 
  Home, 
  Users, 
  TrendingUp, 
  Coins, 
  FileText, 
  AlertTriangle, 
  Users2, 
  MapPin, 
  LogOut, 
  ChevronRight, 
  Menu, 
  X,
  Lock,
  User as UserIcon,
  HelpCircle,
  Cloud,
  Database,
  RefreshCw,
  Wifi,
  CheckCircle2,
  BookOpen
} from "lucide-react";

// Robustly coerces and normalizes sheetsData to guarantee consistent TypeScript types
function normalizeDatabaseTypes(sheetsData: any): any {
  if (!sheetsData) return sheetsData;
  const result: any = {};
  
  // 1. Warga
  if (Array.isArray(sheetsData.warga)) {
    result.warga = sheetsData.warga.map((w: any) => ({
      ...w,
      id: Number(w.id),
      kk: String(w.kk || "").trim(),
      nik: String(w.nik || "").trim(),
      rwId: String(w.rwId || "").trim()
    }));
  }
  
  // 2. RW
  if (Array.isArray(sheetsData.rws)) {
    result.rws = sheetsData.rws.map((r: any) => ({
      ...r,
      id: String(r.id || "").trim()
    }));
  }
  
  // 3. Iuran
  if (Array.isArray(sheetsData.iuran)) {
    result.iuran = sheetsData.iuran.map((i: any) => ({
      ...i,
      id: Number(i.id),
      wargaId: Number(i.wargaId),
      jumlah: Number(i.jumlah),
      totalDibayar: Number(i.totalDibayar)
    }));
  }
  
  // 4. Transaksi
  if (Array.isArray(sheetsData.transaksi)) {
    result.transaksi = sheetsData.transaksi.map((t: any) => ({
      ...t,
      id: Number(t.id),
      iuranId: Number(t.iuranId),
      wargaId: Number(t.wargaId),
      jumlah: Number(t.jumlah)
    }));
  }
  
  // 5. Pengajuan
  if (Array.isArray(sheetsData.pengajuan)) {
    result.pengajuan = sheetsData.pengajuan.map((p: any) => {
      let fotoList = p.fotoList;
      if (typeof fotoList === "string") {
        try {
          fotoList = JSON.parse(fotoList);
        } catch (e) {
          fotoList = [];
        }
      }
      if (!Array.isArray(fotoList)) {
        fotoList = [];
      }
      return {
        ...p,
        id: Number(p.id),
        wargaId: Number(p.wargaId),
        rwId: String(p.rwId || "").trim(),
        fotoList: fotoList
      };
    });
  }
  
  // 6. Laporan
  if (Array.isArray(sheetsData.laporan)) {
    result.laporan = sheetsData.laporan.map((l: any) => {
      let fotoList = l.fotoList;
      if (typeof fotoList === "string") {
        try {
          fotoList = JSON.parse(fotoList);
        } catch (e) {
          fotoList = [];
        }
      }
      if (!Array.isArray(fotoList)) {
        fotoList = [];
      }
      return {
        ...l,
        id: Number(l.id),
        wargaId: l.wargaId ? Number(l.wargaId) : undefined,
        rwId: String(l.rwId || "").trim(),
        fotoList: fotoList
      };
    });
  }
  
  // 7. Mutasi
  if (Array.isArray(sheetsData.mutasi)) {
    result.mutasi = sheetsData.mutasi.map((m: any) => ({
      ...m,
      id: Number(m.id),
      wargaId: Number(m.wargaId)
    }));
  }
  
  // Preserve properties that aren't arrays
  for (const key of Object.keys(sheetsData)) {
    if (!result[key] && sheetsData[key] !== undefined) {
      result[key] = sheetsData[key];
    }
  }
  
  return result;
}

export default function App() {
  // Database State
  const [db, setDb] = useState(() => getDatabase());
  const [firebaseInitialized, setFirebaseInitialized] = useState(false);
  const prevDbRef = useRef<any>(null);


  // Current Active Simulated User Session
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const savedUserId = localStorage.getItem("DUSUN_CURRENT_USER_ID");
    if (savedUserId) {
      const user = SIMULATED_USERS.find(u => u.id === savedUserId);
      if (user) return user;
    }
    return null;
  });

  // Login Form States
  const [loginUserId, setLoginUserId] = useState<string>("u0");
  const [loginPassword, setLoginPassword] = useState<string>("");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [showLoginPassword, setShowLoginPassword] = useState<boolean>(false);

  // Switch User Protection states
  const [promptUserSwitch, setPromptUserSwitch] = useState<User | null>(null);
  const [switchPasswordInput, setSwitchPasswordInput] = useState<string>("");
  const [switchError, setSwitchError] = useState<string | null>(null);
  const [showSwitchPassword, setShowSwitchPassword] = useState<boolean>(false);
  const [showSimulatedCredentials, setShowSimulatedCredentials] = useState<boolean>(false);

  // System Navigation Tabs
  const [activeTab, setActiveTab] = useState<"dashboard" | "warga" | "mutasi" | "iuran" | "pengajuan" | "laporan" | "firebase" | "agenda">("dashboard");

  // Mobile drawer state
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Status Notification Center simulated ticker
  const [notification, setNotification] = useState<string | null>(() => {
    const savedUserId = localStorage.getItem("DUSUN_CURRENT_USER_ID");
    if (savedUserId) {
      const user = SIMULATED_USERS.find(u => u.id === savedUserId);
      if (user) return "Selamat Datang kembali. Anda masuk sebagai: " + user.nama + " (" + user.role + ")";
    }
    return "Selamat Datang di Portal Administrasi Dusun Sukamaju. Silakan masuk untuk mengelola sistem.";
  });

  const triggerNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => {
      setNotification(null);
    }, 5000);
  };

  // 1. Initialize and Sync from Firebase on App Boot
  useEffect(() => {
    async function initFirebaseSync() {
      try {
        await testConnection();
        const baseLocalDb = getDatabase();
        await seedFirestoreIfEmpty(baseLocalDb, SIMULATED_USERS);
        const cloudDb = await fetchDatabaseFromFirestore();

        const mergedDb: AppDatabase = {
          warga: (cloudDb.warga && cloudDb.warga.length > 0) ? cloudDb.warga as Warga[] : baseLocalDb.warga,
          rws: (cloudDb.rws && cloudDb.rws.length > 0) ? cloudDb.rws as RW[] : baseLocalDb.rws,
          iuran: (cloudDb.iuran && cloudDb.iuran.length > 0) ? cloudDb.iuran as Iuran[] : baseLocalDb.iuran,
          transaksi: (cloudDb.transaksi && cloudDb.transaksi.length > 0) ? cloudDb.transaksi as TransaksiIuran[] : baseLocalDb.transaksi,
          pengajuan: (cloudDb.pengajuan && cloudDb.pengajuan.length > 0) ? cloudDb.pengajuan as Pengajuan[] : baseLocalDb.pengajuan,
          laporan: (cloudDb.laporan && cloudDb.laporan.length > 0) ? cloudDb.laporan as Laporan[] : baseLocalDb.laporan,
          mutasi: (cloudDb.mutasi && cloudDb.mutasi.length > 0) ? cloudDb.mutasi as MutasiLog[] : baseLocalDb.mutasi,
          ronda: (cloudDb.ronda && cloudDb.ronda.length > 0) ? cloudDb.ronda as JadwalRonda[] : (baseLocalDb.ronda || []),
          kegiatan: (cloudDb.kegiatan && cloudDb.kegiatan.length > 0) ? cloudDb.kegiatan as KegiatanRutin[] : (baseLocalDb.kegiatan || []),
        };

        prevDbRef.current = JSON.parse(JSON.stringify(mergedDb));
        setDb(mergedDb);
        setFirebaseInitialized(true);
        triggerNotification("Database terhubung & tersinkronisasi aman dengan Google Firebase Cloud!");
      } catch (err) {
        console.error("Gagal inisialisasi sinkronisasi Firebase:", err);
        setFirebaseInitialized(true);
      }
    }
    initFirebaseSync();
  }, []);


  // Sync database changes to LocalStorage and Firebase Firestore automatically
  useEffect(() => {
    saveDatabase(db);

    // Sync local changes to Firebase Firestore (differential upsert/delete)
    if (firebaseInitialized && prevDbRef.current) {
      syncLocalDatabaseToFirestore(prevDbRef.current, db)
        .then(() => {
          prevDbRef.current = JSON.parse(JSON.stringify(db));
        })
        .catch(err => {
          console.error("Gagal sinkronisasi data ke Firebase Firestore:", err);
        });
    }
  }, [db, firebaseInitialized]);

  // Redirect non-admin if they attempt to access direct Firebase cloud panel tab
  useEffect(() => {
    if (activeTab === "firebase" && currentUser && currentUser.role !== "Admin") {
      setActiveTab("dashboard");
    }
  }, [activeTab, currentUser]);

  // Handle updates across subpanels
  const handleUpdateWarga = (updatedWargaList: Warga[]) => {
    setDb(prev => ({
      ...prev,
      warga: updatedWargaList
    }));
    triggerNotification("Data Buku Induk Penduduk berhasil sinkron secara aman.");
  };

  const handleUpdateMutasi = (updatedLogs: MutasiLog[]) => {
    setDb(prev => ({
      ...prev,
      mutasi: updatedLogs
    }));
  };

  const handleUpdateIuran = (updatedIuran: Iuran[], updatedTransactions: TransaksiIuran[]) => {
    setDb(prev => ({
      ...prev,
      iuran: updatedIuran,
      transaksi: updatedTransactions
    }));
    triggerNotification("Transaksi kas bendahara berhasil divalidasi.");
  };

  const handleUpdatePengajuan = (updatedPengajuan: Pengajuan[]) => {
    setDb(prev => ({
      ...prev,
      pengajuan: updatedPengajuan
    }));
    triggerNotification("Status pengajuan jaminan bantuan sosial termutakhirkan.");
  };

  const handleUpdateLaporan = (updatedLaporan: Laporan[]) => {
    setDb(prev => ({
      ...prev,
      laporan: updatedLaporan
    }));
    triggerNotification("Jurnal kliping pelaporan/pengaduan berhasil diubah.");
  };

  const handleUpdateRonda = (updatedRonda: JadwalRonda[]) => {
    setDb(prev => ({
      ...prev,
      ronda: updatedRonda
    }));
    triggerNotification("Jadwal tugas ronda siskamling lingkungan warga terbaharui.");
  };

  const handleUpdateKegiatan = (updatedKegiatan: KegiatanRutin[]) => {
    setDb(prev => ({
      ...prev,
      kegiatan: updatedKegiatan
    }));
    triggerNotification("Agenda jadwal kegiatan rutin sukarela warga berhasil disimpan.");
  };

  const handleSystemLogMutation = (wargaId: number, jenis: any, keterangan: string) => {
    if (!currentUser) return;
    // Audit log mutator helper
    const logTime = new Date().toISOString().replace("T", " ").substring(0, 19);
    setDb(prev => {
      const updated = logDemographyEvent(prev, wargaId, jenis, keterangan, `${currentUser?.nama || ""} (${currentUser?.role === "Admin" ? "Kepala Dusun" : currentUser?.rwId || ""})`);
      return updated;
    });
  };

  // Switcher account callback (triggers password verification modal)
  const handleUserSwitch = (userId: string) => {
    const targetUser = SIMULATED_USERS.find(u => u.id === userId);
    if (targetUser) {
      setPromptUserSwitch(targetUser);
      setSwitchPasswordInput("");
      setSwitchError(null);
      setShowSwitchPassword(false);
    }
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const targetUser = SIMULATED_USERS.find(u => u.id === loginUserId);
    if (targetUser) {
      if (targetUser.password === loginPassword) {
        localStorage.setItem("DUSUN_CURRENT_USER_ID", targetUser.id);
        setCurrentUser(targetUser);
        setLoginPassword("");
        setLoginError(null);
        triggerNotification(`Selamat Datang kembali, ${targetUser.nama}! Anda masuk sebagai ${targetUser.role === "Admin" ? "Kepala Dusun" : `Ketua ${targetUser.rwId}`}.`);
      } else {
        setLoginError("Kata sandi salah! Silakan periksa kembali kata sandi default di panduan.");
      }
    }
  };

  const confirmUserSwitch = () => {
    if (promptUserSwitch) {
      if (promptUserSwitch.password === switchPasswordInput) {
        localStorage.setItem("DUSUN_CURRENT_USER_ID", promptUserSwitch.id);
        setCurrentUser(promptUserSwitch);
        triggerNotification(`Berhasil berganti peran ke: ${promptUserSwitch.nama} (${promptUserSwitch.role === "Admin" ? "Kepala Dusun" : `${promptUserSwitch.rwId} (User)`})`);
        setPromptUserSwitch(null);
        setSwitchPasswordInput("");
        setSwitchError(null);
      } else {
        setSwitchError("Sandi tidak cocok! Silakan periksa kembali.");
      }
    }
  };


  // If there's no authenticated simulation session, render custom full-screen login scene
  if (!currentUser) {
    const currentSelectUser = SIMULATED_USERS.find(u => u.id === loginUserId) || SIMULATED_USERS[0];
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 selection:bg-emerald-500 selection:text-slate-900">
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 md:p-8 space-y-6 relative overflow-hidden">
          {/* Decorative glows */}
          <div className="absolute top-0 left-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl -translate-x-12 -translate-y-12"></div>
          <div className="absolute bottom-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl translate-x-12 translate-y-12"></div>

          {/* Logo & Identity */}
          <div className="text-center relative z-10 space-y-2">
            <div className="inline-flex h-12 w-12 bg-emerald-600/20 text-emerald-400 rounded-xl items-center justify-center border border-emerald-500/30 shadow-inner">
              <Lock className="w-6 h-6 animate-pulse" />
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight font-display">Portal Administrasi Dusun</h2>
            <p className="text-xs text-slate-400">Sistem Informasi, Mutasi LAMPID & Kas Iuran Sukamaju</p>
          </div>

          <form onSubmit={handleLoginSubmit} className="space-y-4 relative z-10">
            {/* User Selector */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Pilih Pengguna / Peran</label>
              <div className="relative">
                <select
                  value={loginUserId}
                  onChange={(e) => {
                    setLoginUserId(e.target.value);
                    setLoginError(null);
                  }}
                  className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700/80 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 font-semibold outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer appearance-none"
                >
                  {SIMULATED_USERS.map((u) => (
                    <option key={u.id} value={u.id} className="bg-slate-900 text-slate-100">
                      {u.nama} ({u.role === "Admin" ? "Kepala Dusun" : `Ketua ${u.rwId}`})
                    </option>
                  ))}
                </select>
                <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500 text-xs">
                  ▼
                </div>
              </div>
            </div>

            {/* Password input */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Kata Sandi</label>
                <button
                  type="button"
                  onClick={() => setShowLoginPassword(!showLoginPassword)}
                  className="text-[10px] text-emerald-400 hover:underline font-semibold"
                >
                  {showLoginPassword ? "Sembunyikan" : "Tampilkan"}
                </button>
              </div>
              <input
                type={showLoginPassword ? "text" : "password"}
                required
                value={loginPassword}
                onChange={(e) => {
                  setLoginPassword(e.target.value);
                  setLoginError(null);
                }}
                placeholder={`Masukkan sandi untuk ${currentSelectUser.nama}...`}
                className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500/60 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-600 outline-none transition-all"
              />
            </div>

            {/* Error badge */}
            {loginError && (
              <div className="p-3 bg-rose-950/40 border border-rose-900/50 rounded-xl text-2xs text-rose-350 font-semibold text-center leading-relaxed">
                ⚠️ {loginError}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold transition-all text-xs py-2.5 rounded-xl flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-950/50 cursor-pointer"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Masuk Sekarang</span>
            </button>
          </form>

          {/* Guidelines / Helper Box */}
          <div className="bg-slate-950/60 border border-slate-850 rounded-xl p-3.5 space-y-2 text-2xs text-slate-400 leading-relaxed font-sans shadow-inner">
            <div className="flex justify-between items-center pb-1">
              <span className="font-bold text-slate-300 block">💡 Kata Sandi Default (Simulasi):</span>
              <button 
                type="button"
                onClick={() => setShowSimulatedCredentials(!showSimulatedCredentials)}
                className="text-[10px] text-emerald-400 hover:underline font-semibold bg-slate-900 px-2 py-0.5 rounded border border-slate-800"
              >
                {showSimulatedCredentials ? "Sembunyikan" : "Tampilkan"}
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
              <div className="p-1.5 bg-slate-900/60 rounded border border-slate-800">
                <span className="text-[9px] text-slate-500 block">User: kadus</span>
                <span className="text-emerald-400 font-bold">{showSimulatedCredentials ? "admin123" : "••••••••"}</span>
              </div>
              <div className="p-1.5 bg-slate-900/60 rounded border border-slate-800">
                <span className="text-[9px] text-slate-500 block">User: rw01</span>
                <span className="text-blue-400 font-bold">{showSimulatedCredentials ? "rw01" : "••••"}</span>
              </div>
              <div className="p-1.5 bg-slate-900/60 rounded border border-slate-800">
                <span className="text-[9px] text-slate-500 block">User: rw02</span>
                <span className="text-blue-400 font-bold">{showSimulatedCredentials ? "rw02" : "••••"}</span>
              </div>
              <div className="p-1.5 bg-slate-900/60 rounded border border-slate-800">
                <span className="text-[9px] text-slate-500 block">User: rw03</span>
                <span className="text-blue-400 font-bold">{showSimulatedCredentials ? "rw03" : "••••"}</span>
              </div>
              <div className="p-1.5 bg-slate-900/60 rounded border border-slate-800">
                <span className="text-[9px] text-slate-500 block">User: rw04</span>
                <span className="text-blue-400 font-bold">{showSimulatedCredentials ? "rw04" : "••••"}</span>
              </div>
              <div className="p-1.5 bg-slate-900/60 rounded border border-slate-800">
                <span className="text-[9px] text-slate-500 block">User: rw05</span>
                <span className="text-blue-400 font-bold">{showSimulatedCredentials ? "rw05" : "••••"}</span>
              </div>
            </div>
            <p className="text-[9px] text-slate-500 mt-1">
              *Pilih salah satu peran di atas, masukkan kata sandi yang sesuai, lalu klik Masuk Sekarang.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Cumulative numbers for general stats
  const totalWargaCount = db.warga.filter(w => w.status === "Aktif").length;
  const totalKkCount = Array.from(new Set(db.warga.filter(w => w.status === "Aktif").map(w => w.kk))).length;
  const outstandingBansosCount = db.pengajuan.filter(p => p.status === "Kirim" || p.status === "Verifikasi").length;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans antialiased">
      
      {/* 1. Global Simulation Switcher & Alert Notification top bar */}
      <div className="bg-slate-900 text-white border-b border-slate-800 text-xs px-4 py-2 flex flex-col md:flex-row md:items-center md:justify-between gap-2.5 z-40">
        <div className="flex items-center gap-2">
          <span className="inline-flex px-1.5 py-0.5 rounded bg-emerald-500 font-bold text-slate-900 text-[10px]">DEVEL_MODE</span>
          <p className="text-slate-300">
            Gunakan selektor di samping untuk mensimulasikan peran otorisasi dwi-fungsi: <span className="font-semibold text-white">Kepala Dusun (Admin)</span> vs <span className="font-semibold text-white">Ketua RW 01-05 (User)</span>.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-slate-400 font-medium">Beralih Peran Simulasi:</span>
          <select
            value={currentUser.id}
            onChange={(e) => handleUserSwitch(e.target.value)}
            className="bg-slate-850 hover:bg-slate-800 text-slate-100 font-semibold px-2 py-1 rounded border border-slate-700 outline-none text-xs rounded-md"
          >
            {SIMULATED_USERS.map(u => (
              <option key={u.id} value={u.id}>
                {u.nama} ({u.role === "Admin" ? "Kepala Dusun" : `${u.rwId} User`})
              </option>
            ))}
          </select>
        </div>
      </div>

      {notification && (
        <div className="bg-emerald-800 text-emerald-100 px-4 py-2 text-2xs text-center font-medium font-sans border-b border-emerald-700 animate-pulse">
          SISTEM UPDATE: {notification}
        </div>
      )}

      {/* Main body wrapper layout */}
      <div className="flex flex-1 relative">
        
        {/* 2. Side navigation layout (collapsible responsive drawer) */}
        {/* Mobile menu toggle button */}
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="md:hidden fixed bottom-5 right-5 z-40 h-12 w-12 bg-emerald-600 hover:bg-emerald-700 shadow-xl text-white rounded-full flex items-center justify-center cursor-pointer"
        >
          {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>

        {/* Sidebar container */}
        <aside className={`
          fixed inset-y-0 left-0 transform md:relative md:translate-x-0 transition-transform duration-300 z-30
          w-64 bg-slate-900 text-slate-400 flex flex-col justify-between border-r border-slate-800 flex-shrink-0
          ${isSidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
        `}>
          <div className="flex flex-col flex-1">
            
            {/* Header Identity of client */}
            <div className="px-6 py-5.5 border-b border-slate-800/80 flex items-center gap-3">
              <div className="h-9 w-9 bg-emerald-600 rounded-lg flex items-center justify-center text-white font-black text-sm italic shadow-xs">
                DS
              </div>
              <div>
                <h1 className="text-sm font-semibold tracking-wide text-white font-display">Dusun Sukamaju</h1>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-slate-500 uppercase font-mono tracking-wider">Dashboard Administrasi</span>
                  <span className={`inline-block w-1.5 h-1.5 rounded-full ${firebaseInitialized ? "bg-emerald-500 animate-pulse" : "bg-amber-500 animate-bounce"}`} title={firebaseInitialized ? "Firebase Cloud Tersinkron" : "Inisialisasi Firebase..."}></span>
                </div>
              </div>
            </div>

            {/* Profile badge */}
            <div className="mx-4 mt-5 p-3.5 bg-slate-850/50 rounded-xl border border-slate-800/60 space-y-1.5 text-xs">
              <span className="text-[10px] font-semibold text-slate-550 uppercase">Peran Aktif</span>
              <div className="flex items-center gap-2.5">
                <div className="h-7 w-7 rounded-full bg-slate-800 flex items-center justify-center text-slate-350 text-2xs font-extrabold border border-slate-700/50">
                  {currentUser.nama.charAt(0)}
                </div>
                <div>
                  <span className="block font-semibold text-slate-250 leading-tight">{currentUser.nama}</span>
                  <span className="text-[10px] text-emerald-400 block mt-0.5">{currentUser.role === "Admin" ? "Kepala Dusun (Admin)" : `Ketua ${currentUser.rwId}`}</span>
                </div>
              </div>
            </div>

            {/* Main navigation listings */}
            <nav className="p-4 space-y-1 mt-4 flex-1">
              {/* Dashboard */}
              <button
                onClick={() => { setActiveTab("dashboard"); setIsSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                  activeTab === "dashboard" 
                    ? "bg-slate-800 text-emerald-400 font-semibold" 
                    : "hover:bg-slate-850/40 hover:text-white"
                }`}
              >
                <Home className="w-4.5 h-4.5" />
                <span>Dashboard & Profil RW</span>
              </button>

              {/* Data Penduduk */}
              <button
                onClick={() => { setActiveTab("warga"); setIsSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                  activeTab === "warga" 
                    ? "bg-slate-800 text-emerald-400 font-semibold" 
                    : "hover:bg-slate-850/40 hover:text-white"
                }`}
              >
                <Users className="w-4.5 h-4.5" />
                <span>Buku Induk Penduduk</span>
              </button>

              {/* Mutasi LAMPID */}
              <button
                onClick={() => { setActiveTab("mutasi"); setIsSidebarOpen(false); }}
                className={`w-full flex items-center justify-between px-4 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                  activeTab === "mutasi" 
                    ? "bg-slate-800 text-emerald-400 font-semibold" 
                    : "hover:bg-slate-850/40 hover:text-white"
                }`}
              >
                <div className="flex items-center gap-3">
                  <TrendingUp className="w-4.5 h-4.5" />
                  <span>Mutasi LAMPID</span>
                </div>
                <span className="text-2xs bg-slate-800 px-1.5 py-0.5 rounded font-bold font-mono text-slate-400">{db.mutasi.length}</span>
              </button>

              {/* Dues / Iuran Kas */}
              <button
                onClick={() => { setActiveTab("iuran"); setIsSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                  activeTab === "iuran" 
                    ? "bg-slate-800 text-emerald-400 font-semibold" 
                    : "hover:bg-slate-850/40 hover:text-white"
                }`}
              >
                <Coins className="w-4.5 h-4.5" />
                <span>Modul Iuran & Kas RW</span>
              </button>

              {/* Social Program assistance */}
              <button
                onClick={() => { setActiveTab("pengajuan"); setIsSidebarOpen(false); }}
                className={`w-full flex items-center justify-between px-4 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                  activeTab === "pengajuan" 
                    ? "bg-slate-800 text-emerald-400 font-semibold" 
                    : "hover:bg-slate-850/40 hover:text-white"
                }`}
              >
                <div className="flex items-center gap-3">
                  <FileText className="w-4.5 h-4.5" />
                  <span>Pengajuan Bansos</span>
                </div>
                {outstandingBansosCount > 0 && (
                  <span className="text-3xs bg-emerald-500 font-black px-1.5 py-0.5 rounded text-slate-900 leading-none">
                    {outstandingBansosCount}
                  </span>
                )}
              </button>

              {/* Reports  */}
              <button
                onClick={() => { setActiveTab("laporan"); setIsSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                  activeTab === "laporan" 
                    ? "bg-slate-800 text-emerald-400 font-semibold" 
                    : "hover:bg-slate-850/40 hover:text-white"
                }`}
              >
                <AlertTriangle className="w-4.5 h-4.5" />
                <span>Kegiatan & Pengaduan</span>
              </button>

              {/* Agenda & Penjadwalan */}
              <button
                onClick={() => { setActiveTab("agenda"); setIsSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                  activeTab === "agenda" 
                    ? "bg-slate-800 text-emerald-400 font-semibold" 
                    : "hover:bg-slate-850/40 hover:text-white"
                }`}
              >
                <BookOpen className="w-4.5 h-4.5" />
                <span>Agenda & Penjadwalan</span>
              </button>

              {/* Firebase Cloud Status */}
              {currentUser.role === "Admin" && (
                <button
                  onClick={() => { setActiveTab("firebase"); setIsSidebarOpen(false); }}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                    activeTab === "firebase" 
                      ? "bg-slate-800 text-emerald-400 font-semibold" 
                      : "hover:bg-slate-850/45 hover:text-white"
                  }`}
                >
                  <Cloud className="w-4.5 h-4.5 text-indigo-400" />
                  <span className="flex-1 text-left">Status Firebase Cloud</span>
                  <span className="h-2 w-2 rounded-full bg-indigo-400 animate-pulse"></span>
                </button>
              )}

              {/* Logout button */}
              <button
                onClick={() => {
                  localStorage.removeItem("DUSUN_CURRENT_USER_ID");
                  setCurrentUser(null);
                  setIsSidebarOpen(false);
                }}
                className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all cursor-pointer mt-4 border-t border-slate-800/80 pt-4 text-rose-400 hover:bg-rose-500/10 hover:text-rose-300"
              >
                <LogOut className="w-4.5 h-4.5" />
                <span>Keluar (Logout)</span>
              </button>
            </nav>

          </div>

          {/* Footer of Sidebar */}
          <div className="p-4 border-t border-slate-800 text-2xs text-slate-500 space-y-1 font-mono text-center">
            <span className="block text-slate-400 font-semibold">UU Pelindungan Data Pribadi</span>
            <span>No. 27/2022 Verified System</span>
          </div>
        </aside>

        {/* 3. Main content arena workspace */}
        <main className="flex-1 p-6 md:p-8 overflow-y-auto space-y-6">
          
          {/* Dashboard Hub Header Card showing quick general numbers (only listed if dashboard tab is active) */}
          {activeTab === "dashboard" && (
            <div className="space-y-6">
              {/* Profile sub-header panel */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-emerald-950 text-emerald-100 p-6 rounded-2xl shadow-sm border border-emerald-800">
                <div className="md:col-span-2 space-y-1">
                  <span className="text-[10px] font-bold tracking-widest text-emerald-300 uppercase block">DUSUN SUKAMAJU ADMINISTRASI</span>
                  <h2 className="text-2xl font-bold text-white font-display">Selamat datang kembali, {currentUser.nama}!</h2>
                  <p className="text-sm text-emerald-200 mt-1 leading-relaxed">
                    Sistem audit kependudukan dan transparansi keuangan 5 wilayah RW. Pantau semua peristiwa LAMPID serta pengajuan bansos warga dalam satu antarmuka terenkripsi.
                  </p>
                </div>

                {/* Info block counts */}
                <div className="bg-white/10 p-4 rounded-xl border border-white/5 text-slate-205 flex flex-col justify-between">
                  <span className="text-2xs text-emerald-250 font-bold uppercase tracking-wide block">Buku Induk Penduduk</span>
                  <div className="mt-4">
                    <span className="text-3xl font-extrabold text-white font-display block leading-none">{totalWargaCount}</span>
                    <span className="text-[10px] text-emerald-300 block mt-1.5">Jiwa Terdaftar Aktif</span>
                  </div>
                </div>

                <div className="bg-white/10 p-4 rounded-xl border border-white/5 text-slate-205 flex flex-col justify-between">
                  <span className="text-2xs text-emerald-250 font-bold uppercase tracking-wide block">Kelompok Keluarga (KK)</span>
                  <div className="mt-4">
                    <span className="text-3xl font-extrabold text-white font-display block leading-none">{totalKkCount}</span>
                    <span className="text-[10px] text-emerald-300 block mt-1.5">Nomor KK Terdaftar Pasif</span>
                  </div>
                </div>
              </div>

              {/* Renders detailed Profile view block */}
              <ProfilRwPanel 
                warga={db.warga}
                rws={db.rws}
                iuran={db.iuran}
                currentUser={currentUser}
              />
            </div>
          )}

          {/* Data Penduduk Panel rendering */}
          {activeTab === "warga" && (
            <WargaPanel 
              warga={db.warga}
              rws={db.rws}
              currentUser={currentUser}
              onUpdateWarga={handleUpdateWarga}
              onLogMutation={handleSystemLogMutation}
            />
          )}

          {/* Mutasi Logs LAMPID Panel rendering */}
          {activeTab === "mutasi" && (
            <MutasiPanel 
              mutasiLogs={db.mutasi}
              rws={db.rws}
              warga={db.warga}
              currentUser={currentUser}
              onUpdateMutasi={handleUpdateMutasi}
            />
          )}

          {/* Iuran bendahara Kas Panel rendering */}
          {activeTab === "iuran" && (
            <IuranPanel 
              warga={db.warga}
              rws={db.rws}
              iuran={db.iuran}
              transaksi={db.transaksi}
              currentUser={currentUser}
              onUpdateDatabase={handleUpdateIuran}
            />
          )}

          {/* Social submissions Program bantuan */}
          {activeTab === "pengajuan" && (
            <PengajuanPanel 
              warga={db.warga}
              rws={db.rws}
              pengajuan={db.pengajuan}
              currentUser={currentUser}
              onUpdatePengajuan={handleUpdatePengajuan}
            />
          )}

          {/* Activities / Incident complaints reports */}
          {activeTab === "laporan" && (
            <LaporanPanel 
              warga={db.warga}
              rws={db.rws}
              laporan={db.laporan}
              currentUser={currentUser}
              onUpdateLaporan={handleUpdateLaporan}
            />
          )}

          {/* Agenda & Penjadwalan Panel rendering */}
          {activeTab === "agenda" && (
            <AgendaPanel 
              warga={db.warga}
              rws={db.rws}
              ronda={db.ronda || []}
              kegiatan={db.kegiatan || []}
              currentUser={currentUser}
              onUpdateRonda={handleUpdateRonda}
              onUpdateKegiatan={handleUpdateKegiatan}
            />
          )}

          {/* Firebase Direct Cloud Panel */}
          {activeTab === "firebase" && (
            <FirebasePanel 
              db={db}
              setDb={setDb}
              triggerNotification={triggerNotification}
              firebaseActive={firebaseInitialized}
            />
          )}

        </main>

      </div>

      {/* 4. Switch Account Password Verification Dialog Modal */}
      {promptUserSwitch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-850 rounded-xl shadow-2xl p-5 md:p-6 space-y-4 relative">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-lg bg-emerald-600/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
                <Lock className="w-4.5 h-4.5" strokeWidth={2.5} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Konfirmasi Hak Akses</h3>
                <p className="text-[10px] text-slate-400">Otorisasi simulasi berganti peran</p>
              </div>
            </div>

            <div className="p-3 bg-slate-950/60 rounded-lg space-y-1 text-xs">
              <span className="text-[10px] text-slate-500 block uppercase font-bold text-[9px]">Target Peran</span>
              <p className="text-slate-200 font-semibold">
                {promptUserSwitch.nama} ({promptUserSwitch.role === "Admin" ? "Kepala Dusun / Admin" : `${promptUserSwitch.rwId} / Ketua RW`})
              </p>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Masukkan Kata Sandi</label>
                <button
                  type="button"
                  onClick={() => setShowSwitchPassword(!showSwitchPassword)}
                  className="text-[10px] text-emerald-400 hover:underline font-semibold"
                >
                  {showSwitchPassword ? "Sembunyikan" : "Tampilkan"}
                </button>
              </div>
              <input
                type={showSwitchPassword ? "text" : "password"}
                autoFocus
                placeholder="Masukkan kata sandi..."
                value={switchPasswordInput}
                onChange={(e) => {
                  setSwitchPasswordInput(e.target.value);
                  setSwitchError(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    confirmUserSwitch();
                  }
                }}
                className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500/40 rounded-lg px-3 py-2 text-xs text-slate-100 outline-none"
              />
            </div>

            {switchError && (
              <div className="p-2.5 bg-rose-950/40 border border-rose-900/50 rounded-lg text-[11px] text-rose-300 font-semibold leading-relaxed">
                ⚠️ {switchError}
              </div>
            )}

            <div className="flex items-center gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => {
                  setPromptUserSwitch(null);
                  setSwitchPasswordInput("");
                  setSwitchError(null);
                }}
                className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-semibold py-1.5 rounded-lg text-xs transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={confirmUserSwitch}
                className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold py-1.5 rounded-lg text-xs transition cursor-pointer"
                id="btn-confirm-switch"
              >
                Ganti Peran
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
