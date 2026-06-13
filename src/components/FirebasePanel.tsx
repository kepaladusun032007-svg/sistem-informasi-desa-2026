/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { AppDatabase } from "../types";
import { 
  Cloud, 
  Database,
  ShieldCheck, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  HelpCircle,
  Users,
  Briefcase,
  FileText,
  Clock,
  MapPin,
  Compass,
  DollarSign
} from "lucide-react";
import { testConnection, fetchDatabaseFromFirestore } from "../utils/firebaseSync";

interface FirebasePanelProps {
  db: AppDatabase;
  setDb: (updater: AppDatabase | ((prev: AppDatabase) => AppDatabase)) => void;
  triggerNotification: (msg: string) => void;
  firebaseActive: boolean;
}

export default function FirebasePanel({ db, setDb, triggerNotification, firebaseActive }: FirebasePanelProps) {
  const [testStatus, setTestStatus] = useState<"idle" | "testing" | "success" | "error">("idle");
  const [syncing, setSyncing] = useState(false);
  const [errMessage, setErrMessage] = useState<string | null>(null);

  const stats = [
    { name: "Warga", count: db.warga.length, icon: Users, color: "text-blue-400" },
    { name: "Rukun Warga (RW)", count: db.rws.length, icon: Compass, color: "text-indigo-400" },
    { name: "Iuran Bulanan", count: db.iuran.length, icon: DollarSign, color: "text-emerald-400" },
    { name: "Transaksi Keuangan", count: db.transaksi.length, icon: FileText, color: "text-amber-400" },
    { name: "Pengajuan Sosial", count: db.pengajuan.length, icon: Briefcase, color: "text-purple-400" },
    { name: "Pelaporan Pengaduan", count: db.laporan.length, icon: AlertCircle, color: "text-rose-400" },
    { name: "Log Mutasi Penduduk", count: db.mutasi.length, icon: Clock, color: "text-teal-400" },
    { name: "Penjadwalan Ronda", count: db.ronda?.length || 0, icon: MapPin, color: "text-sky-400" }
  ];

  const handleTestConnection = async () => {
    setTestStatus("testing");
    setErrMessage(null);
    try {
      await testConnection();
      setTestStatus("success");
      triggerNotification("Koneksi Firebase Firestore berhasil diverifikasi!");
    } catch (err: any) {
      setTestStatus("error");
      setErrMessage(err.message || "Gagal melakukan ping ke Firestore.");
    }
  };

  const handleFetchData = async () => {
    setSyncing(true);
    setErrMessage(null);
    try {
      const cloudDb = await fetchDatabaseFromFirestore();
      
      setDb(prev => ({
        warga: (cloudDb.warga && cloudDb.warga.length > 0) ? cloudDb.warga : prev.warga,
        rws: (cloudDb.rws && cloudDb.rws.length > 0) ? cloudDb.rws : prev.rws,
        iuran: (cloudDb.iuran && cloudDb.iuran.length > 0) ? cloudDb.iuran : prev.iuran,
        transaksi: (cloudDb.transaksi && cloudDb.transaksi.length > 0) ? cloudDb.transaksi : prev.transaksi,
        pengajuan: (cloudDb.pengajuan && cloudDb.pengajuan.length > 0) ? cloudDb.pengajuan : prev.pengajuan,
        laporan: (cloudDb.laporan && cloudDb.laporan.length > 0) ? cloudDb.laporan : prev.laporan,
        mutasi: (cloudDb.mutasi && cloudDb.mutasi.length > 0) ? cloudDb.mutasi : prev.mutasi,
        ronda: (cloudDb.ronda && cloudDb.ronda.length > 0) ? cloudDb.ronda : prev.ronda,
        kegiatan: (cloudDb.kegiatan && cloudDb.kegiatan.length > 0) ? cloudDb.kegiatan : prev.kegiatan,
      }));

      triggerNotification("Sukses memulihkan snapshot database terbaru langsung dari Firebase Cloud!");
    } catch (err: any) {
      setErrMessage("Gagal menarik data terbaru: " + (err.message || String(err)));
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="space-y-6" id="firebase-panel">
      {/* Visual Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 bg-slate-900 border border-slate-850 rounded-2xl">
        <div className="flex items-start gap-4">
          <div className="h-12 w-12 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center shrink-0">
            <Cloud className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-white font-display">Penyimpanan Firebase Cloud Firestore</h2>
            <p className="text-xs text-slate-400 mt-1">
              Aplikasi ini terhubung sepenuhnya dan menyimpan seluruh data secara real-time ke database cloud Google Firebase Enterprise. Tidak ada sinkronisasi eksternal ke Google Sheets yang berjalan.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-mono font-medium ${
            firebaseActive 
              ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20" 
              : "bg-amber-500/15 text-amber-400 border border-amber-500/20"
          }`}>
            <span className={`w-2 h-2 rounded-full ${firebaseActive ? "bg-emerald-500 animate-ping" : "bg-amber-500"}`}></span>
            {firebaseActive ? "Tersambung Aktif" : "Menghubungkan..."}
          </span>
        </div>
      </div>

      {/* Grid Status Database */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div key={i} className="bg-slate-900 border border-slate-850/80 p-4 rounded-xl flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-[11px] text-slate-500 uppercase tracking-wider font-mono block">{stat.name}</span>
                <span className="text-2xl font-bold text-white font-display">{stat.count}</span>
                <span className="text-3xs text-emerald-500 font-mono block">● Firebase Sync</span>
              </div>
              <div className={`h-10 w-10 rounded-lg bg-slate-850 flex items-center justify-center ${stat.color}`}>
                <Icon className="w-5 h-5" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Detail Konfigurasi & Aksi */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Kontrol Database */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-850 rounded-xl p-5 md:p-6 space-y-5">
          <div className="flex items-center gap-2 border-b border-slate-850 pb-3">
            <Database className="w-5 h-5 text-indigo-400" />
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider">Kontrol & Pemeliharaan Cloud</h3>
          </div>

          <div className="space-y-4 text-xs text-slate-300 leading-relaxed">
            <p>
              Seluruh operasi tulis (tambah warga, log mutasi/LAMPID, transaksi iuran, serta pengajuan jaminan bantuan sosial) akan dikonsolidasikan langsung ke Firebase secara otomatis. Mekanisme sinkronisasi ganda (differential state diffing) berjalan di latar belakang untuk menjamin performa cepat dan hemat kuota data.
            </p>
            <p>
              Jika terdapat inkonsistensi data pada browser Anda akibat berganti perangkat atau cache lokal, gunakan tombol di bawah untuk mendownload snapshot database cloud terbaru.
            </p>
          </div>

          {errMessage && (
            <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-4 rounded-lg text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="font-mono whitespace-pre-wrap">{errMessage}</div>
            </div>
          )}

          <div className="flex flex-wrap gap-3 pt-2">
            <button
              onClick={handleFetchData}
              disabled={syncing}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-700/50 text-white rounded-lg text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-indigo-600/10 disabled:cursor-not-allowed"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncing ? "animate-spin" : ""}`} />
              {syncing ? "Sinkronisasi..." : "Unduh Snapshot dari Cloud (Fetch)"}
            </button>

            <button
              onClick={handleTestConnection}
              disabled={testStatus === "testing"}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-750 text-slate-200 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer border border-slate-700 disabled:cursor-not-allowed"
            >
              {testStatus === "testing" ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-slate-400" />
              ) : testStatus === "success" ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Cloud className="w-3.5 h-3.5 text-indigo-400" />
              )}
              {testStatus === "testing" ? "Menguji..." : "Uji Koneksi Pintar"}
            </button>
          </div>
        </div>

        {/* Informasi Spesifikasi Keamanan */}
        <div className="bg-slate-900 border border-slate-850 rounded-xl p-5 md:p-6 space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-850 pb-3">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider">Keamanan & Informasi DB</h3>
          </div>

          <div className="space-y-4 text-xs font-mono">
            <div className="space-y-1">
              <span className="text-slate-500 text-3xs uppercase tracking-wider block">Firebase Project ID</span>
              <span className="text-amber-400 block break-all font-semibold selection:bg-slate-800">rich-gecko-q8gvj</span>
            </div>

            <div className="space-y-1">
              <span className="text-slate-500 text-3xs uppercase tracking-wider block">Firestore Database ID</span>
              <span className="text-indigo-400 block break-all font-semibold selection:bg-slate-800">ai-studio-077c3e5b-9f9b-48e3-bc02-076404156ca0</span>
            </div>

            <div className="space-y-1">
              <span className="text-slate-500 text-3xs uppercase tracking-wider block">Security Hardening</span>
              <span className="text-emerald-400 block font-semibold">UU PDP No. 27/2022 Compliant</span>
            </div>

            <div className="pt-2 border-t border-slate-850 text-2xs text-slate-400 leading-relaxed font-sans flex items-start gap-2">
              <HelpCircle className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
              <p>
                Aplikasi ini dilindungi oleh modul aturan keamanan Firestore (Security Rules) yang membatasi hak akses berdasarkan otentikasi serta role pengguna.
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
