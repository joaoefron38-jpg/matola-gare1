import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell, EmptyState } from "@/components/AppShell";
import { toast } from "sonner";
import { Download, Trash2, ExternalLink, FileText, Image as ImageIcon, Video, Music } from "lucide-react";
import {
  listDownloads, removeDownload, clearDownloads, type DownloadEntry,
} from "@/lib/downloads-store";

export const Route = createFileRoute("/downloads")({
  head: () => ({
    meta: [
      { title: "Downloads — Biblioteca Digital Matola Gare" },
      { name: "description", content: "Todos os documentos, vídeos e imagens que descarregou na Biblioteca Digital da Escola Secundária da Matola Gare." },
      { property: "og:title", content: "Downloads — Biblioteca Digital Matola Gare" },
      { property: "og:description", content: "Consulte e abra os ficheiros que descarregou na plataforma." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DownloadsPage,
});

const ICONS = { document: FileText, image: ImageIcon, video: Video, audio: Music } as const;

function DownloadsPage() {
  const [items, setItems] = useState<DownloadEntry[]>([]);
  const [playing, setPlaying] = useState<DownloadEntry | null>(null);

  useEffect(() => {
    const sync = () => setItems(listDownloads());
    sync();
    window.addEventListener("mg-downloads-changed", sync);
    window.addEventListener("focus", sync);
    return () => {
      window.removeEventListener("mg-downloads-changed", sync);
      window.removeEventListener("focus", sync);
    };
  }, []);

  async function open(entry: DownloadEntry) {
    // Media abre dentro desta tela
    if (entry.kind !== "document") {
      setPlaying(entry);
      return;
    }
    // Documentos: mostrar as opções de abertura do dispositivo
    const id = toast.loading("A preparar o ficheiro…");
    try {
      const res = await fetch(entry.url);
      if (!res.ok) throw new Error(String(res.status));
      const blob = await res.blob();
      const file = new File([blob], entry.name || "documento", { type: blob.type || "application/octet-stream" });
      if (navigator.canShare?.({ files: [file] }) && navigator.share) {
        toast.dismiss(id);
        await navigator.share({ files: [file], title: entry.title });
        return;
      }
      const objectUrl = URL.createObjectURL(blob);
      toast.dismiss(id);
      window.open(objectUrl, "_blank", "noopener");
      setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
    } catch (err) {
      toast.dismiss(id);
      if (err instanceof Error && err.name === "AbortError") return;
      window.open(entry.url, "_blank", "noopener");
    }
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl px-4 py-10">
        <header className="mb-6 flex flex-wrap items-end justify-between gap-3 animate-fade-up">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold">Downloads</h1>
            <p className="text-muted-foreground mt-1">Tudo o que descarregou aparece aqui, pronto a abrir.</p>
          </div>
          {items.length > 0 && (
            <button
              onClick={() => { if (confirm("Limpar a lista de downloads?")) clearDownloads(); }}
              className="h-10 px-4 rounded-full bg-secondary text-secondary-foreground text-sm"
            >
              Limpar lista
            </button>
          )}
        </header>

        {playing && (
          <div className="surface-card p-4 mb-6 animate-fade-up">
            <div className="flex items-center justify-between gap-3 mb-3">
              <h2 className="font-semibold line-clamp-1">{playing.title}</h2>
              <button onClick={() => setPlaying(null)} className="h-9 px-3 rounded-full bg-secondary text-secondary-foreground text-sm">Fechar</button>
            </div>
            {playing.kind === "video" ? (
              <video src={playing.url} controls autoPlay playsInline className="w-full rounded-xl bg-black aspect-video" />
            ) : playing.kind === "audio" ? (
              <audio src={playing.url} controls autoPlay className="w-full" />
            ) : (
              <img src={playing.url} alt={playing.title} className="w-full rounded-xl object-contain max-h-[70vh] bg-surface-variant" />
            )}
          </div>
        )}

        {items.length === 0 ? (
          <EmptyState icon={Download} title="Sem downloads" message="Ainda não descarregou nenhum ficheiro. Use o botão “Baixar” nas publicações." />
        ) : (
          <ul className="space-y-3">
            {items.map((d, i) => {
              const Icon = ICONS[d.kind] ?? FileText;
              return (
                <li key={d.id} className="surface-card p-4 flex items-center gap-3 animate-fade-up" style={{ animationDelay: `${i * 40}ms` }}>
                  <div className="w-10 h-10 rounded-xl bg-surface-variant grid place-items-center shrink-0">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-medium truncate">{d.title}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {d.name} · {new Date(d.at).toLocaleString("pt-PT", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </div>
                  </div>
                  <button onClick={() => open(d)} className="inline-flex items-center gap-1.5 h-9 px-4 rounded-full bg-primary text-primary-foreground text-sm shrink-0">
                    <ExternalLink className="w-4 h-4" /> Abrir
                  </button>
                  <button onClick={() => removeDownload(d.id)} className="p-2 rounded-full hover:bg-accent text-destructive shrink-0" aria-label="Remover">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </AppShell>
  );
}
