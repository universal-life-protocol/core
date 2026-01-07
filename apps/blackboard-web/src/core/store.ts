import type { ULPTrace } from "./types";

const DB_NAME = "ulp_blackboard";
const DB_VERSION = 1;
const STORE = "traces";

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const os = db.createObjectStore(STORE, { keyPath: "id" });
        os.createIndex("ts", "ts", { unique: false });
        os.createIndex("template", "template", { unique: false });
        os.createIndex("kind", "kind", { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export class TraceStore {
  private dbp: Promise<IDBDatabase>;

  constructor() {
    this.dbp = openDB();
  }

  async put(trace: ULPTrace): Promise<"inserted" | "duplicate"> {
    const db = await this.dbp;
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      const os = tx.objectStore(STORE);

      const getReq = os.get(trace.id);
      getReq.onsuccess = () => {
        if (getReq.result) {
          resolve("duplicate");
          return;
        }
        const putReq = os.add(trace);
        putReq.onsuccess = () => resolve("inserted");
        putReq.onerror = () => reject(putReq.error);
      };
      getReq.onerror = () => reject(getReq.error);
    });
  }

  async listRecent(limit = 100): Promise<ULPTrace[]> {
    const db = await this.dbp;
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const os = tx.objectStore(STORE);
      const idx = os.index("ts");

      const results: ULPTrace[] = [];
      const req = idx.openCursor(null, "prev");
      req.onsuccess = () => {
        const cur = req.result;
        if (!cur || results.length >= limit) {
          resolve(results);
          return;
        }
        results.push(cur.value as ULPTrace);
        cur.continue();
      };
      req.onerror = () => reject(req.error);
    });
  }
}
