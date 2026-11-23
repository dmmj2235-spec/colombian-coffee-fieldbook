export type ManualPage = { id: string; title: string; html: string; kind: string };
export type ManualDocument = { pages: ManualPage[]; header: string; savedAt?: string };
const DB = 'ap-manual-cafetero';
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB, 1);
    request.onupgradeneeded = () => request.result.createObjectStore('documents');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
export async function readManual(): Promise<ManualDocument | undefined> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('documents', 'readonly');
    const request = tx.objectStore('documents').get('manual');
    request.onsuccess = () => resolve(request.result as ManualDocument | undefined);
    request.onerror = () => reject(request.error);
    tx.oncomplete = () => db.close();
  });
}
export async function writeManual(doc: ManualDocument): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('documents', 'readwrite');
    tx.objectStore('documents').put(doc, 'manual');
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}
export function keepChangesLast(pages: ManualPage[]): ManualPage[] {
  return [...pages.filter(p => p.kind !== 'changes'), ...pages.filter(p => p.kind === 'changes')];
}
export function validManual(value: unknown): value is ManualDocument {
  if (!value || typeof value !== 'object') return false;
  const doc = value as Partial<ManualDocument>;
  return typeof doc.header === 'string' && Array.isArray(doc.pages) && doc.pages.length > 0 && doc.pages.every(p => typeof p.id === 'string' && typeof p.title === 'string' && typeof p.html === 'string' && typeof p.kind === 'string') && new Set(doc.pages.map(p => p.id)).size === doc.pages.length;
}
export function downloadFile(content: string, type: string, name: string) {
  const url = URL.createObjectURL(new Blob([content], {type}));
  const a = document.createElement('a'); a.href = url; a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
