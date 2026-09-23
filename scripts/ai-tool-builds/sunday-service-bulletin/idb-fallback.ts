// Sandboxed AI Tool pages run with an opaque origin, where IndexedDB throws a
// SecurityError. The bulletin editor stores uploaded past-bulletin PDFs there,
// so fall back to an in-memory IndexedDB: uploads then work for the session.
import { IDBKeyRange as MemoryIDBKeyRange, indexedDB as memoryIndexedDB } from 'fake-indexeddb';

function indexedDbUsable(): boolean {
  try {
    const request = window.indexedDB.open('__light_church_probe__');
    request.onsuccess = () => request.result.close();
    return true;
  } catch {
    return false;
  }
}

if (!indexedDbUsable()) {
  Object.defineProperty(window, 'indexedDB', { value: memoryIndexedDB, configurable: true });
  Object.defineProperty(window, 'IDBKeyRange', { value: MemoryIDBKeyRange, configurable: true });
}
