// index.js
// Local-only index using IndexedDB

export function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open("locals-only", 1);

    req.onupgradeneeded = e => {
      const db = e.target.result;
      db.createObjectStore("records", { keyPath: "rid" });
    };

    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function storeRecord(db, record) {
  const tx = db.transaction("records", "readwrite");
  tx.objectStore("records").put(record);
  return tx.complete;
}

export async function getAllRecords(db) {
  const tx = db.transaction("records", "readonly");
  const store = tx.objectStore("records");
  return new Promise(resolve => {
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result);
  });
}
