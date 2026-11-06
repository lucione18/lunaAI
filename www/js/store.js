// store.js - small saved settings (localStorage, safe when blocked) and the song library (IndexedDB)
const mem = new Map();
export const kv = {
  get(k, d) { try { const v = localStorage.getItem("luna." + k); if (v !== null) return JSON.parse(v); } catch (e) { } return mem.has(k) ? mem.get(k) : d; },
  set(k, v) { mem.set(k, v); try { localStorage.setItem("luna." + k, JSON.stringify(v)); } catch (e) { } },
};
let dbp = null;
function db() {
  if (dbp) return dbp;
  dbp = new Promise((res, rej) => {
    try {
      const r = indexedDB.open("luna", 1);
      r.onupgradeneeded = () => r.result.createObjectStore("songs", { keyPath: "id" });
      r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
    } catch (e) { rej(e); }
  });
  return dbp;
}
const memSongs = new Map();
async function tx(mode, fn) {
  const d = await db();
  return new Promise((res, rej) => { const t = d.transaction("songs", mode), s = t.objectStore("songs"); const r = fn(s); t.oncomplete = () => res(r && r.result); t.onerror = () => rej(t.error); });
}
export const songDB = {
  async all() { try { return (await tx("readonly", s => s.getAll())) || []; } catch (e) { return [...memSongs.values()]; } },
  async put(rec) { memSongs.set(rec.id, rec); try { await tx("readwrite", s => s.put(rec)); } catch (e) { } },
  async del(id) { memSongs.delete(id); try { await tx("readwrite", s => s.delete(id)); } catch (e) { } },
  async clear() { memSongs.clear(); try { await tx("readwrite", s => s.clear()); } catch (e) { } },
};
