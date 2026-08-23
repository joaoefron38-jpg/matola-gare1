import { toast } from "sonner";

function guessName(url: string, title: string) {
  try {
    const path = new URL(url, window.location.origin).pathname;
    const last = decodeURIComponent(path.split("/").filter(Boolean).pop() ?? "");
    if (last && /\.[a-z0-9]{2,5}$/i.test(last)) return last;
    const ext = last.match(/\.[a-z0-9]{2,5}$/i)?.[0] ?? "";
    return `${title.replace(/[^\p{L}\p{N}\s-_]/gu, "").trim() || "documento"}${ext}`;
  } catch {
    return "documento";
  }
}

/** Força o download real do ficheiro (mostra a barra/janela de download do dispositivo). */
export async function downloadFile(url: string, title = "documento") {
  const name = guessName(url, title);
  const id = toast.loading("A preparar o download…");
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(String(res.status));
    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = objectUrl;
    a.download = name;
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(objectUrl), 10_000);
    toast.success("Download iniciado", { id });
  } catch {
    toast.dismiss(id);
    // fallback: deixa o navegador tratar
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
