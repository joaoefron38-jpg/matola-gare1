export type TransferStatus = "queued" | "downloading" | "done" | "failed";

export type Transfer = {
  id: string;
  title: string;
  name: string;
  url: string;
  status: TransferStatus;
  /** 0-100, ou null quando o tamanho total é desconhecido */
  progress: number | null;
  received: number;
  total: number | null;
  error?: string;
  at: number;
};

const EVENT = "mg-transfers-changed";
let transfers: Transfer[] = [];

function emit() {
  transfers = [...transfers];
  if (typeof window !== "undefined") window.dispatchEvent(new Event(EVENT));
}

export function listTransfers(): Transfer[] {
  return transfers;
}

export function subscribeTransfers(cb: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(EVENT, cb);
  return () => window.removeEventListener(EVENT, cb);
}

export function startTransfer(input: { title: string; name: string; url: string }): string {
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  transfers = [
    { id, ...input, status: "queued", progress: 0, received: 0, total: null, at: Date.now() },
    ...transfers.filter((t) => t.status !== "done").slice(0, 20),
    ...transfers.filter((t) => t.status === "done").slice(0, 5),
  ];
  emit();
  return id;
}

export function updateTransfer(id: string, patch: Partial<Transfer>) {
  transfers = transfers.map((t) => (t.id === id ? { ...t, ...patch } : t));
  emit();
}

export function removeTransfer(id: string) {
  transfers = transfers.filter((t) => t.id !== id);
  emit();
}

export function clearFinishedTransfers() {
  transfers = transfers.filter((t) => t.status === "queued" || t.status === "downloading");
  emit();
}

export function formatBytes(n: number | null): string {
  if (n === null || !Number.isFinite(n)) return "—";
  if (n < 1024) return `${n} B`;
  const units = ["KB", "MB", "GB"];
  let v = n / 1024;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) { v /= 1024; i++; }
  return `${v.toFixed(v < 10 ? 1 : 0)} ${units[i]}`;
}
