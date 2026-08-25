import { toast } from "sonner";
import { recordDownload, kindFromUrl } from "./downloads-store";
import { startTransfer, updateTransfer } from "./download-progress";
import { upsertMyDownloadRecord } from "./downloads.functions";

function guessName(url: string, title: string) {
  try {
    const path = new URL(url, window.location.origin).pathname;
    const last = decodeURIComponent(path.split("/").filter(Boolean).pop() ?? "");
    if (last && /\.[a-z0-9]{2,5}$/i.test(last)) return last;
    const ext = last.match(/\.[a-z0-9]{2,5}$/i)?.[0] ?? "";
    return `${title.replace(/[^\p{L}\p{N}\s_-]/gu, "").trim() || "documento"}${ext}`;
  } catch {
    return "documento";
  }
}

/** Força o download real do ficheiro (mostra a barra/janela de download do dispositivo). */
export async function downloadFile(url: string, title = "documento") {
  const name = guessName(url, title);
  const kind = kindFromUrl(url, name);
  const transferId = startTransfer({ title, name, url });
  const id = toast.loading("A preparar o download…");
  let received = 0;
  let total: number | null = null;
  let lastServerSync = 0;

  const syncRecord = async (status: "queued" | "downloading" | "done" | "failed") => {
    try {
      await upsertMyDownloadRecord({ data: { title, url, name, kind, status, received, total } });
    } catch {
      // Visitantes continuam a conseguir descarregar; apenas contas autenticadas ficam validadas no servidor.
    }
  };

  try {
    updateTransfer(transferId, { status: "queued", progress: 0 });
    await syncRecord("queued");
    const res = await fetch(url);
    if (!res.ok) throw new Error(String(res.status));
    total = parseContentLength(res.headers.get("content-length"));
    updateTransfer(transferId, { status: "downloading", total, progress: total ? 0 : null });
    await syncRecord("downloading");

    const blob = await readBlobWithProgress(res, (nextReceived) => {
      received = nextReceived;
      const progress = total ? Math.min(100, Math.round((received / total) * 100)) : null;
      updateTransfer(transferId, { status: "downloading", received, total, progress });
      const now = Date.now();
      if (now - lastServerSync > 2000) {
        lastServerSync = now;
        syncRecord("downloading");
      }
    });

    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = objectUrl;
    a.download = name;
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(objectUrl), 10_000);
    received = blob.size || received;
    if (total === null && blob.size > 0) total = blob.size;
    updateTransfer(transferId, { status: "done", received, total, progress: 100 });
    recordDownload({ title, url, name, kind });
    await syncRecord("done");
    toast.success("Download iniciado", { id });
  } catch {
    updateTransfer(transferId, { status: "failed", received, total, error: "Falha ao descarregar" });
    await syncRecord("failed");
    toast.dismiss(id);
    toast.error("Falha no download. O dispositivo vai tentar abrir o ficheiro.");
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.target = "_blank";
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
  }
}

function parseContentLength(value: string | null): number | null {
  if (!value) return null;
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

async function readBlobWithProgress(response: Response, onProgress: (received: number) => void): Promise<Blob> {
  if (!response.body) {
    const blob = await response.blob();
    onProgress(blob.size);
    return blob;
  }

  const reader = response.body.getReader();
  const chunks: BlobPart[] = [];
  let received = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    received += value.byteLength;
    onProgress(received);
  }

  return new Blob(chunks, { type: response.headers.get("content-type") ?? "application/octet-stream" });
}
