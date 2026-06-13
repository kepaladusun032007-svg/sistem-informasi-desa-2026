/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Warga, RW, Iuran, User } from "../types";
import { Home, Users, Landmark, MapPin, Phone, UserCheck, Shield, HelpCircle } from "lucide-react";

interface ProfilRwPanelProps {
  warga: Warga[];
  rws: RW[];
  iuran: Iuran[];
  currentUser: User;
}

export default function ProfilRwPanel({
  warga,
  rws,
  iuran,
  currentUser
}: ProfilRwPanelProps) {
  // If Admin, they can select which RW profile to study. If User, they are locked to their own.
  const [selectedRwId, setSelectedRwId] = useState<string>(
    currentUser.role === "User" ? currentUser.rwId || "RW 03" : "RW 03"
  );

  const activeRw = rws.find(r => r.id === selectedRwId) || rws[0];

  // Calculate stats specifically for the selected RW
  const citizensInRw = warga.filter(w => w.rwId === selectedRwId);
  
  const activeCitizensCount = citizensInRw.filter(w => w.status === "Aktif").length;
  const temporaryCitizensCount = citizensInRw.filter(w => w.status === "Sementara").length;
  const deceasedCount = citizensInRw.filter(w => w.status === "Meninggal").length;

  // Count active KK (unique family card numbers among active citizens)
  const uniqueKkNumbers = Array.from(new Set(
    citizensInRw
      .filter(w => w.status === "Aktif")
      .map(w => w.kk)
  ));
  const activeKkCount = uniqueKkNumbers.length;

  // Dues collected in this RW
  // Sum of totalDibayar in this RW
  const totalDuesCollected = iuran
    .filter(i => {
      const citizen = warga.find(w => w.id === i.wargaId);
      return citizen && citizen.rwId === selectedRwId;
    })
    .reduce((sub, curr) => sub + curr.totalDibayar, 0);

  // Format IDR Helper
  const formatRupiah = (num: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0
    }).format(num);
  };

  return (
    <div className="space-y-6">
      {/* Upper select switch bar for Admin / Dusun Head */}
      <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-800 font-display">Profil Wilayah Rukun Warga (RW)</h2>
          <p className="text-sm text-slate-500 mt-1">
            Mengevaluasi rekam geografis, kontak person kepengurusan, serta rangkuman statistik sosial seluruh RW.
          </p>
        </div>

        {currentUser.role === "Admin" ? (
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Pilih Profil RW:</span>
            <select
              value={selectedRwId}
              onChange={(e) => setSelectedRwId(e.target.value)}
              className="bg-slate-50 text-slate-700 text-sm font-semibold px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:border-emerald-500"
            >
              {rws.map(rw => (
                <option key={rw.id} value={rw.id}>{rw.id} ({rw.namaKetua})</option>
              ))}
            </select>
          </div>
        ) : (
          <div className="inline-flex items-center gap-2 bg-slate-50 border px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600">
            <Shield className="w-4 h-4 text-emerald-600" />
            Locked RW: {currentUser.rwId}
          </div>
        )}
      </div>

      {/* Main Grid: Details left, Stats right */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Profile Card & Geographic specifications */}
        <div className="bg-white border border-slate-100 rounded-xl overflow-hidden shadow-xs p-5 space-y-5">
          <div className="flex items-center gap-3.5 pb-4 border-b">
            <div className="h-12 w-12 bg-emerald-50 text-emerald-700 rounded-xl flex items-center justify-center font-display font-black text-lg">
              {activeRw.id.substring(3)}
            </div>
            <div>
              <h3 className="font-bold text-slate-800 font-display text-base">Wilayah {activeRw.id}</h3>
              <p className="text-3xs font-mono font-bold text-slate-405 uppercase tracking-wide">Dusun Sukamaju</p>
            </div>
          </div>

          <div className="space-y-4 text-xs text-slate-600">
            <div className="flex items-start gap-2.5">
              <UserCheck className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
              <div>
                <span className="block font-semibold text-slate-700">Nama Ketua RW:</span>
                <span className="text-sm font-medium mt-0.5 block">{activeRw.namaKetua}</span>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <MapPin className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
              <div>
                <span className="block font-semibold text-slate-700">Wilayah Cakupan Geografis:</span>
                <span className="text-sm mt-0.5 block italic leading-relaxed">"{activeRw.wilayah}"</span>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <Phone className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
              <div>
                <span className="block font-semibold text-slate-700">Kontak Pengurus RW:</span>
                <span className="text-sm font-mono mt-0.5 block">{activeRw.kontak || "No kontak belum diinput"}</span>
              </div>
            </div>
          </div>

          <div className="bg-slate-50 p-4.5 rounded-lg border text-center text-xs text-slate-400">
            <p className="font-semibold text-slate-500 mb-1">Peta Batas Administrasi RW</p>
            <div className="h-28 bg-emerald-100/50 rounded-md border flex items-center justify-center text-emerald-800 font-bold font-mono">
              [ {activeRw.id} MAP AREA ]
            </div>
          </div>
        </div>

        {/* Right Part: 2 columns - Stats blocks and telephone directories */}
        <div className="md:col-span-2 space-y-6">
          
          {/* Statistics widgets */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            
            {/* Active KK counts */}
            <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-2xs flex items-center justify-between">
              <div>
                <span className="text-2xs text-slate-400 font-semibold uppercase tracking-wider block">Kartu Keluarga (KK)</span>
                <span className="text-2xl font-bold font-display text-slate-800 mt-1 block">{activeKkCount} KK</span>
                <span className="text-3xs text-slate-400 mt-2 block">Terdaftar aktif ber-KK</span>
              </div>
              <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
                <Home className="w-5 h-5" />
              </div>
            </div>

            {/* Total active residents */}
            <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-2xs flex items-center justify-between">
              <div>
                <span className="text-2xs text-slate-400 font-semibold uppercase tracking-wider block">Warga Aktif (Tetap)</span>
                <span className="text-2xl font-bold font-display text-slate-800 mt-1 block">{activeCitizensCount} Jiwa</span>
                <span className="text-3xs text-slate-400 mt-2 block">Laki / Perempuan terdaftar</span>
              </div>
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg">
                <Users className="w-5 h-5" />
              </div>
            </div>

            {/* Collected dues */}
            <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-2xs flex items-center justify-between">
              <div>
                <span className="text-2xs text-slate-400 font-semibold uppercase tracking-wider block">Iuran Terkumpul</span>
                <span className="text-base font-bold font-mono text-slate-800 mt-2 block">{formatRupiah(totalDuesCollected)}</span>
                <span className="text-3xs text-slate-400 mt-2.5 block">Akumulasi iuran lunas</span>
              </div>
              <div className="p-3 bg-purple-50 text-purple-600 rounded-lg">
                <Landmark className="w-5 h-5" />
              </div>
            </div>

          </div>

          {/* Citizen telephone directory and index database inside this RW */}
          <div className="bg-white rounded-xl border border-slate-100 shadow-xs overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-semibold text-slate-800 font-display flex items-center gap-1.5">
                <Users className="w-4 h-4 text-emerald-600" />
                Buku Index Warga {activeRw.id}
              </h3>
              <span className="text-xs bg-slate-100 text-slate-500 font-semibold px-2 py-1 rounded">
                Total {citizensInRw.length} Terdaftar
              </span>
            </div>

            <div className="overflow-x-auto max-h-[300px] overflow-y-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead>
                  <tr className="bg-slate-50 text-slate-400 font-display font-medium text-2xs uppercase border-b border-slate-100">
                    <th className="px-5 py-2.5">Warga</th>
                    <th className="px-5 py-2.5">NIK</th>
                    <th className="px-5 py-2.5">Hubungan KK</th>
                    <th className="px-5 py-2.5">Pekerjaan</th>
                    <th className="px-5 py-2.5">Kontak</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {citizensInRw.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-5 py-6 text-center text-slate-400">
                        Tidak ada warga terdaftar di RW ini.
                      </td>
                    </tr>
                  ) : (
                    citizensInRw.map(w => (
                      <tr key={w.id} className="hover:bg-slate-50/30">
                        <td className="px-5 py-3 font-semibold text-slate-800">
                          {w.nama}
                        </td>
                        <td className="px-5 py-3 font-mono text-xs text-slate-500">
                          {w.nik}
                        </td>
                        <td className="px-5 py-3 text-xs text-slate-400">
                          {w.hubungan}
                        </td>
                        <td className="px-5 py-3 text-xs">
                          {w.pekerjaan || "-"}
                        </td>
                        <td className="px-5 py-3 font-mono text-xs text-slate-500">
                          {w.kontak || "-"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
