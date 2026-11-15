// Local-first data layer: IndexedDB, mirrored in memory. Same surface can later sync to a server.
import { uid } from './util.js';

const DB_NAME = 'dinsathi';
// ?demo=1: the landing page shows the real app on sample data, kept in memory only
export const DEMO = new URLSearchParams(location.search).has('demo');
const VERSION = 1;
export const STORES = ['books', 'categories', 'wallets', 'txns', 'recurring', 'quick', 'budgets', 'savings', 'deposits', 'people', 'lenden', 'tasks', 'notes', 'alarms', 'notifications', 'settings'];

let idb = null;
const mem = Object.fromEntries(STORES.map((s) => [s, new Map()]));
const listeners = new Set();

function open() {
  return new Promise((res, rej) => {
    const r = indexedDB.open(DB_NAME, VERSION);
    r.onupgradeneeded = () => { for (const s of STORES) if (!r.result.objectStoreNames.contains(s)) r.result.createObjectStore(s, { keyPath: 'id' }); };
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}
const tx = (store, mode, fn) => new Promise((res, rej) => {
  const t = idb.transaction(store, mode); const s = t.objectStore(store); const out = fn(s);
  t.oncomplete = () => res(out?.result ?? out); t.onerror = () => rej(t.error);
});

export async function init() {
  try {
    if (DEMO) return;
    idb = await open();
    for (const s of STORES) {
      const rows = await tx(s, 'readonly', (st) => st.getAll());
      for (const r of rows) mem[s].set(r.id, r);
    }
  } catch (e) {
    console.warn('IndexedDB unavailable, running in memory only', e);
    idb = null;
  }
}

export const all = (store, pred) => { const a = [...mem[store].values()]; return pred ? a.filter(pred) : a; };
export const get = (store, id) => mem[store].get(id);
export async function put(store, obj) {
  const now = new Date().toISOString();
  const rec = { ...obj, id: obj.id || uid(), createdAt: obj.createdAt || now, updatedAt: now };
  mem[store].set(rec.id, rec);
  if (idb) await tx(store, 'readwrite', (s) => s.put(rec));
  emit(store);
  return rec;
}
export async function putMany(store, list) { const out = []; for (const o of list) out.push(await put(store, o)); return out; }
export async function del(store, id) {
  mem[store].delete(id);
  if (idb) await tx(store, 'readwrite', (s) => s.delete(id));
  emit(store);
}
export async function clearAll() {
  for (const s of STORES) { mem[s].clear(); if (idb) await tx(s, 'readwrite', (st) => st.clear()); }
  emit('*');
}
export function exportAll() { return { app: 'dinsathi', version: VERSION, exportedAt: new Date().toISOString(), data: Object.fromEntries(STORES.map((s) => [s, all(s)])) }; }
export async function importAll(json) {
  if (!json || json.app !== 'dinsathi' || !json.data) throw new Error('এটা কথাখাতার ব্যাকআপ ফাইল নয়');
  await clearAll();
  for (const s of STORES) for (const r of json.data[s] || []) { mem[s].set(r.id, r); if (idb) await tx(s, 'readwrite', (st) => st.put(r)); }
  emit('*');
}

export const onChange = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };
function emit(store) { for (const fn of listeners) fn(store); }

// settings: single record
export const settings = () => get('settings', 'app') || {};
export const saveSettings = (patch) => put('settings', { ...settings(), ...patch, id: 'app' });
