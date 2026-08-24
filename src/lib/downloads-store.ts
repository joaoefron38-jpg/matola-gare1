export type DownloadKind = "video" | "image" | "audio" | "document";

export type DownloadEntry = {
  id: string;
  title: string;
  url: string;
  name: string;
  kind: DownloadKind;
  at: string;
};

const LEGACY_KEY = "mg_downloads_v1";
const SCOPE_KEY = "mg_downloads_scope";

/** Define o dono atual do histórico de downloads (id do utilizador ou null = visitante). */
export function setDownloadsScope(userId: string | null) {
  if (typeof window === "undefined") return;
  const next = userId ?? "guest";
  if (localStorage.getItem(SCOPE_KEY) === next) return;
  localStorage.setItem(SCOPE_KEY, next);
  window.dispatchEvent(new Event("mg-downloads-changed"));
}

function scope(): string {
  if (typeof window === "undefined") return "guest";
  return localStorage.getItem(SCOPE_KEY) || "guest";
}

function storeKey(): string {
  return `${LEGACY_KEY}:${scope()}`;
}


export function kindFromUrl(url: string, name = ""): DownloadKind {
  const s = `${url} ${name}`.toLowerCase();
  if (/\.(mp4|webm|ogv|mov|m4v)(\?|$)/.test(s)) return "video";
  if (/\.(png|jpe?g|gif|webp|avif|bmp|svg)(\?|$)/.test(s)) return "image";
  if (/\.(mp3|wav|ogg|m4a|aac|webm)(\?|$)/.test(s)) return "audio";
  return "document";
}

export function listDownloads(): DownloadEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    const arr = raw ? (JSON.parse(raw) as DownloadEntry[]) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function write(list: DownloadEntry[]) {
  localStorage.setItem(KEY, JSON.stringify(list.slice(0, 200)));
  window.dispatchEvent(new Event("mg-downloads-changed"));
}

export function recordDownload(entry: Omit<DownloadEntry, "id" | "at" | "kind"> & { kind?: DownloadKind }) {
  if (typeof window === "undefined") return;
  const list = listDownloads().filter((d) => d.url !== entry.url);
  list.unshift({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    at: new Date().toISOString(),
    kind: entry.kind ?? kindFromUrl(entry.url, entry.name),
    ...entry,
  });
  write(list);
}

export function removeDownload(id: string) {
  write(listDownloads().filter((d) => d.id !== id));
}

export function clearDownloads() {
  write([]);
}
