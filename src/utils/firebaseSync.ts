/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { 
  collection, 
  doc, 
  getDocs, 
  getDocFromServer, 
  setDoc, 
  deleteDoc, 
  writeBatch
} from "firebase/firestore";
import { db, auth } from "../firebase";
import { AppDatabase, Warga, RW, Iuran, TransaksiIuran, Pengajuan, Laporan, MutasiLog, JadwalRonda, KegiatanRutin, User } from "../types";

// Operation types for error context
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
  }
}

// Structured error helper conforming exactly to instructions
export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid || null,
      email: auth.currentUser?.email || null,
      emailVerified: auth.currentUser?.emailVerified || null,
      isAnonymous: auth.currentUser?.isAnonymous || null,
      tenantId: auth.currentUser?.tenantId || null,
    },
    operationType,
    path
  };
  console.error("Firestore Error: ", JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// 1. Connection Test on app boot
export async function testConnection() {
  try {
    await getDocFromServer(doc(db, "test", "connection"));
    console.log("Firebase Connection verified successfully.");
  } catch (error) {
    if (error instanceof Error && error.message.includes("the client is offline")) {
      console.error("Please check your Firebase configuration: Client appears offline.");
    }
    // We don't bubble this up to prevent disrupting completely offline operation
  }
}

// Helper to check if a collection is empty
async function isCollectionEmpty(collectionName: string): Promise<boolean> {
  try {
    const qSnap = await getDocs(collection(db, collectionName));
    return qSnap.empty;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, collectionName);
    return true;
  }
}

// 2. Fetch full database from Firestore
export async function fetchDatabaseFromFirestore(): Promise<Partial<AppDatabase>> {
  const resolvedDb: Partial<AppDatabase> & { users?: User[] } = {};
  
  const collectionsToLoad = [
    { key: "warga", path: "warga" },
    { key: "rws", path: "rws" },
    { key: "iuran", path: "iuran" },
    { key: "transaksi", path: "transaksi" },
    { key: "pengajuan", path: "pengajuan" },
    { key: "laporan", path: "laporan" },
    { key: "mutasi", path: "mutasi" },
    { key: "ronda", path: "ronda" },
    { key: "kegiatan", path: "kegiatan" },
    { key: "users", path: "users" }
  ];

  for (const item of collectionsToLoad) {
    try {
      const qSnap = await getDocs(collection(db, item.path));
      const documentsList = qSnap.docs.map(dDoc => {
        const data = dDoc.data();
        // Restore proper numeric ID structures
        if (typeof data.id === "string" && !isNaN(Number(data.id))) {
          data.id = Number(data.id);
        }
        return data;
      });
      
      // Coerce back to exact Array type to respect existing interfaces
      (resolvedDb as any)[item.key] = documentsList;
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, item.path);
    }
  }

  return resolvedDb;
}

// 3. Seed Firestore collections asynchronously with local database contents if empty
export async function seedFirestoreIfEmpty(localDb: AppDatabase, preloadedUsers: User[]) {
  const seedsMap = [
    { name: "users", data: preloadedUsers, idExtractor: (x: User) => x.id },
    { name: "warga", data: localDb.warga, idExtractor: (x: Warga) => String(x.id) },
    { name: "rws", data: localDb.rws, idExtractor: (x: RW) => x.id },
    { name: "iuran", data: localDb.iuran, idExtractor: (x: Iuran) => String(x.id) },
    { name: "transaksi", data: localDb.transaksi, idExtractor: (x: TransaksiIuran) => String(x.id) },
    { name: "pengajuan", data: localDb.pengajuan, idExtractor: (x: Pengajuan) => String(x.id) },
    { name: "laporan", data: localDb.laporan, idExtractor: (x: Laporan) => String(x.id) },
    { name: "mutasi", data: localDb.mutasi, idExtractor: (x: MutasiLog) => String(x.id) },
    { name: "ronda", data: localDb.ronda || [], idExtractor: (x: JadwalRonda) => String(x.id) },
    { name: "kegiatan", data: localDb.kegiatan || [], idExtractor: (x: KegiatanRutin) => String(x.id) }
  ];

  for (const seed of seedsMap) {
    const emptyCollection = await isCollectionEmpty(seed.name);
    if (emptyCollection && seed.data && seed.data.length > 0) {
      console.log(`Seeding empty collection: '${seed.name}' with ${seed.data.length} records.`);
      try {
        const batch = writeBatch(db);
        seed.data.forEach((item: any) => {
          const docId = seed.idExtractor(item);
          const docRef = doc(collection(db, seed.name), docId);
          batch.set(docRef, item);
        });
        await batch.commit();
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, seed.name);
      }
    }
  }
}

// 4. Save a single record/document back to Firestore (upsert)
export async function saveRecordToFirestore(collectionName: string, docId: string, data: any) {
  try {
    const docRef = doc(collection(db, collectionName), docId);
    await setDoc(docRef, data);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${collectionName}/${docId}`);
  }
}

// 5. Delete a single document from Firestore
export async function deleteRecordFromFirestore(collectionName: string, docId: string) {
  try {
    const docRef = doc(collection(db, collectionName), docId);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${collectionName}/${docId}`);
  }
}

// 6. Diff and synchronize local states to Firestore
export async function syncLocalDatabaseToFirestore(prev: any, next: any) {
  const keysMap = [
    { key: "warga", collection: "warga", idExtractor: (item: any) => String(item.id) },
    { key: "rws", collection: "rws", idExtractor: (item: any) => String(item.id) },
    { key: "iuran", collection: "iuran", idExtractor: (item: any) => String(item.id) },
    { key: "transaksi", collection: "transaksi", idExtractor: (item: any) => String(item.id) },
    { key: "pengajuan", collection: "pengajuan", idExtractor: (item: any) => String(item.id) },
    { key: "laporan", collection: "laporan", idExtractor: (item: any) => String(item.id) },
    { key: "mutasi", collection: "mutasi", idExtractor: (item: any) => String(item.id) },
    { key: "ronda", collection: "ronda", idExtractor: (item: any) => String(item.id) },
    { key: "kegiatan", collection: "kegiatan", idExtractor: (item: any) => String(item.id) },
  ];

  for (const config of keysMap) {
    const prevList = prev[config.key] || [];
    const nextList = next[config.key] || [];

    // Find items added or modified
    for (const nextItem of nextList) {
      const nextId = config.idExtractor(nextItem);
      const prevItem = prevList.find((p: any) => config.idExtractor(p) === nextId);

      if (!prevItem || JSON.stringify(prevItem) !== JSON.stringify(nextItem)) {
        await saveRecordToFirestore(config.collection, nextId, nextItem);
      }
    }

    // Find items deleted
    for (const prevItem of prevList) {
      const prevId = config.idExtractor(prevItem);
      const stillExists = nextList.some((n: any) => config.idExtractor(n) === prevId);

      if (!stillExists) {
        await deleteRecordFromFirestore(config.collection, prevId);
      }
    }
  }
}

