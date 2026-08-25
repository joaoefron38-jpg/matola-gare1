import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AppShell, EmptyState } from "@/components/AppShell";
import { toast } from "sonner";
import { Download, Trash2, ExternalLink, FileText, Image as ImageIcon, Video, Music, Lock, CheckCircle2, Clock3, AlertTriangle } from "lucide-react";
import {
  listDownloads, type DownloadEntry,
} from "@/lib/downloads-store";
import { useAuth } from "@/hooks/use-auth";
import { clearFinishedTransfers, formatBytes, listTransfers, subscribeTransfers, type Transfer } from "@/lib/download-progress";
import { clearMyDownloadRecords, listMyDownloadRecords, removeMyDownloadRecord, verifyMyDownloadRecord } from "@/lib/downloads.functions";


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
const STATUS = {
  queued: { label: "Em fila", icon: Clock3 },
  downloading: { label: "A transferir", icon: Download },
  done: { label: "Concluído", icon: CheckCircle2 },
  failed: { label: "Falhou", icon: AlertTriangle },
} as const;

type DownloadRecord = Awaited<ReturnType<typeof listMyDownloadRecords>>[number];

function DownloadsPage() {
  const { isAuthenticated, loading } = useAuth();
  const qc = useQueryClient();
  const listFn = useServerFn(listMyDownloadRecords);
  const verifyFn = useServerFn(verifyMyDownloadRecord);
  const removeFn = useServerFn(removeMyDownloadRecord);
  const clearFn = useServerFn(clearMyDownloadRecords);
  const [localItems, setLocalItems] = useState<DownloadEntry[]>([]);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [playing, setPlaying] = useState<DownloadRecord | null>(null);

  const { data: records = [], isLoading } = useQuery({
    queryKey: ["my_download_records"],
    enabled: isAuthenticated && !loading,
    queryFn: () => listFn(),
  });


  useEffect(() => {
    const sync = () => setLocalItems(listDownloads());
    sync();
    window.addEventListener("mg-downloads-changed", sync);
    window.addEventListener("focus", sync);
    return () => {
      window.removeEventListener("mg-downloads-changed", sync);
      window.removeEventListener("focus", sync);
    };
  }, []);

  useEffect(() => {
    const sync = () => setTransfers(listTransfers());
    sync();
    return subscribeTransfers(sync);
  }, []);

  async function open(entry: DownloadRecord) {
    if (entry.status !== "done") {
      toast.error("Este ficheiro ainda não terminou o download nesta conta.");
      return;
    }
    let verified: DownloadRecord;
    try {
      verified = await verifyFn({ data: { id: entry.id } }) as DownloadRecord;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível validar este ficheiro.");
      return;
    }
    // Media abre dentro desta tela
    if (verified.kind !== "document") {
      setPlaying(verified);
      return;
    }
    // Documentos: mostrar as opções de abertura do dispositivo
    const id = toast.loading("A preparar o ficheiro…");
    try {
      const res = await fetch(verified.url);
      if (!res.ok) throw new Error(String(res.status));
      const blob = await res.blob();
      const file = new File([blob], verified.name || "documento", { type: blob.type || "application/octet-stream" });
      if (navigator.canShare?.({ files: [file] }) && navigator.share) {
        toast.dismiss(id);
        await navigator.share({ files: [file], title: verified.title });
        return;
      }
      toast.dismiss(id);
      toast.info("Este dispositivo não mostrou opções de abertura para este documento.");
    } catch (err) {
      toast.dismiss(id);
      if (err instanceof Error && err.name === "AbortError") return;
      toast.error("Não foi possível abrir o documento validado.");
    }
  }

  async function removeRecord(id: string) {
    try {
      await removeFn({ data: { id } });
      qc.invalidateQueries({ queryKey: ["my_download_records"] });
      toast.success("Removido da lista");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao remover");
    }
  }

  async function clearRecords() {
    if (!confirm("Limpar a lista de downloads desta conta?")) return;
    try {
      await clearFn();
      qc.invalidateQueries({ queryKey: ["my_download_records"] });
      toast.success("Lista limpa");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao limpar");
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
          {records.length > 0 && (
            <button
              onClick={clearRecords}
              className="h-10 px-4 rounded-full bg-secondary text-secondary-foreground text-sm"
            >
              Limpar lista
            </button>
          )}
        </header>

        {transfers.length > 0 && (
          <section className="surface-card p-4 mb-6 animate-fade-up">
            <div className="flex items-center justify-between gap-3 mb-3">
              <h2 className="font-semibold">Transferências</h2>
              <button onClick={clearFinishedTransfers} className="h-9 px-3 rounded-full bg-secondary text-secondary-foreground text-xs">Limpar concluídos</button>
            </div>
            <div className="space-y-3">
              {transfers.map((t) => <TransferRow key={t.id} transfer={t} />)}
            </div>
          </section>
        )}

        {!loading && !isAuthenticated && (
          <EmptyState icon={Lock} title="Downloads protegidos" message="Entre como utilizador para ver apenas os ficheiros descarregados pela sua conta." />
        )}

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

        {loading || isLoading ? (
          <div className="surface-card h-40 animate-pulse bg-surface-variant" />
        ) : isAuthenticated && records.length === 0 ? (
          <EmptyState icon={Download} title="Sem downloads" message={localItems.length > 0 ? "Os downloads antigos deste dispositivo não foram validados nesta conta. Faça novos downloads para aparecerem aqui." : "Ainda não descarregou nenhum ficheiro com esta conta. Use o botão “Baixar” nas publicações."} />
        ) : isAuthenticated ? (
          <ul className="space-y-3">
            {records.map((d, i) => {
              const Icon = ICONS[d.kind as keyof typeof ICONS] ?? FileText;
              const StatusIcon = STATUS[d.status as keyof typeof STATUS]?.icon ?? Clock3;
              const statusLabel = STATUS[d.status as keyof typeof STATUS]?.label ?? d.status;
              return (
                <li key={d.id} className="surface-card p-4 flex flex-col sm:flex-row sm:items-center gap-3 animate-fade-up" style={{ animationDelay: `${i * 40}ms` }}>
                  <div className="w-10 h-10 rounded-xl bg-surface-variant grid place-items-center shrink-0">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-medium truncate">{d.title}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {d.name} · {new Date(d.updated_at).toLocaleString("pt-PT", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </div>
                    <div className="mt-1 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                      <StatusIcon className="w-3.5 h-3.5" /> {statusLabel}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button onClick={() => open(d)} disabled={d.status !== "done"} className="inline-flex items-center gap-1.5 h-9 px-4 rounded-full bg-primary text-primary-foreground text-sm disabled:opacity-50 disabled:pointer-events-none">
                      <ExternalLink className="w-4 h-4" /> Abrir
                    </button>
                    <button onClick={() => removeRecord(d.id)} className="p-2 rounded-full hover:bg-accent text-destructive" aria-label="Remover">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          null
        )}
      </div>
    </AppShell>
  );
}

function TransferRow({ transfer }: { transfer: Transfer }) {
  const StatusIcon = STATUS[transfer.status]?.icon ?? Clock3;
  const statusLabel = STATUS[transfer.status]?.label ?? transfer.status;
  const progress = transfer.progress ?? (transfer.status === "downloading" ? 35 : transfer.status === "done" ? 100 : 8);
  return (
    <div>
      <div className="flex items-center justify-between gap-3 text-sm">
        <div className="min-w-0">
          <div className="font-medium truncate">{transfer.title}</div>
          <div className="text-xs text-muted-foreground truncate">{formatBytes(transfer.received)} / {formatBytes(transfer.total)}</div>
        </div>
        <div className="inline-flex items-center gap-1.5 text-xs text-muted-foreground shrink-0">
          <StatusIcon className="w-3.5 h-3.5" /> {statusLabel}{transfer.progress !== null ? ` · ${transfer.progress}%` : ""}
        </div>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface-variant">
        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${Math.max(4, Math.min(100, progress))}%` }} />
      </div>
    </div>
  );
}
