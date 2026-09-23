// A small local "drive" for uploaded past-bulletin PDFs, backed by IndexedDB.
// Keeps the raw files in the browser so the editorial system can read them
// back later (e.g. to learn a church's bulletin format), without requiring
// any external account or backend.

const DB_NAME = 'sunday-services-drive';
const DB_VERSION = 1;
const STORE_NAME = 'bulletins';

export interface StoredBulletinFile {
  id: string;
  churchName: string;
  fileName: string;
  mimeType: string;
  size: number;
  uploadedAt: string;
  blob: Blob;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('churchName', 'churchName', { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveBulletinFiles(churchName: string, files: File[]): Promise<void> {
  if (files.length === 0) return;

  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);

    files.forEach((file) => {
      const record: StoredBulletinFile = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        churchName,
        fileName: file.name,
        mimeType: file.type || 'application/pdf',
        size: file.size,
        uploadedAt: new Date().toISOString(),
        blob: file,
      };
      store.put(record);
    });

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export async function listBulletinFiles(churchName?: string): Promise<StoredBulletinFile[]> {
  const db = await openDb();
  const results = await new Promise<StoredBulletinFile[]>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = churchName
      ? store.index('churchName').getAll(churchName)
      : store.getAll();
    request.onsuccess = () => resolve(request.result as StoredBulletinFile[]);
    request.onerror = () => reject(request.error);
  });
  db.close();
  return results;
}
