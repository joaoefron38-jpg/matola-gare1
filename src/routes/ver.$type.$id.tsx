import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AppShell, EmptyState } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, FileQuestion, Share2, Download } from "lucide-react";
import { toast } from "sonner";

const TABLES: Record<string, string> = {
  library: "library_items",
  knowledge: "knowledge_items",
  gallery: "gallery_items",
  news: "news_items",
};

export const Route = createFileRoute("/ver/$type/$id")({
  head: () => ({
    meta: [
      { title: "Visualizador — Matola Gare" },
      { name: "description", content: "Leia livros, PDFs, veja vídeos e notícias publicados pela Escola Secundária da Matola Gare, sem sair da plataforma." },
      { property: "og:title", content: "Visualizador — Matola Gare" },
      { property: "og:description", content: "Conteúdos publicados pela Escola Secundária da Matola Gare." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Viewer,
});

function inlineUrl(url: string) {
  // evita que o navegador force download em URLs de armazenamento
  return url.replace(/([?&])download=[^&]*/g, "$1").replace(/[?&]$/, "");
}

function Viewer() {
  const { type, id } = Route.useParams();
  const table = TABLES[type];

  const { data, isLoading } = useQuery({
    queryKey: ["viewer", type, id],
    enabled: !!table,
    queryFn: async () => {
      const { data, error } = await supabase.from(table as any).select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return data as any;
    },
  });

  const title = data?.title ?? "Conteúdo";
  const fileUrl: string | undefined = data
    ? inlineUrl(data.book_link || data.pdf_link || data.external_link || "")
    : undefined;
  const videoUrl: string | undefined = data?.video_url ? inlineUrl(data.video_url) : undefined;
  const imageUrl: string | undefined = data?.image_url ? inlineUrl(data.image_url) : undefined;
  const isDirectVideo = !!videoUrl && /\.(mp4|webm|ogg)(\?.*)?$/i.test(videoUrl);

  async function share() {
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ title, text: data?.description ?? "", url });
      else { await navigator.clipboard.writeText(url); toast.success("Link copiado"); }
    } catch { /* cancelado */ }
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-5xl px-4 py-6">
        <div className="flex items-center justify-between gap-3 mb-4">
          <Link to="/publicacoes" className="inline-flex items-center gap-2 h-10 px-4 rounded-full bg-secondary text-secondary-foreground text-sm">
            <ArrowLeft className="w-4 h-4" /> Voltar
          </Link>
          <button onClick={share} className="inline-flex items-center gap-2 h-10 px-4 rounded-full bg-surface-variant text-sm">
            <Share2 className="w-4 h-4" /> Compartilhar
          </button>
        </div>

        {isLoading ? (
          <div className="surface-card h-96 animate-pulse bg-surface-variant" />
        ) : !data ? (
          <EmptyState icon={FileQuestion} title="Conteúdo não encontrado" message="Este item pode ter sido removido pela administração." />
        ) : (
          <article className="space-y-5">
            <header>
              <h1 className="text-2xl md:text-3xl font-bold">{title}</h1>
              {(data.description || data.caption) && (
                <p className="text-muted-foreground mt-1">{data.description ?? data.caption}</p>
              )}
            </header>

            {isDirectVideo ? (
              <video src={videoUrl} controls playsInline poster={data.thumbnail_url ?? undefined} className="w-full rounded-2xl bg-black aspect-video" />
            ) : videoUrl ? (
              <iframe src={toEmbed(videoUrl) ?? videoUrl} title={title} allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen className="w-full aspect-video rounded-2xl bg-black" />
            ) : null}

            {imageUrl && (
              <img src={imageUrl} alt={title} className="w-full rounded-2xl object-contain bg-surface-variant" />
            )}

            {data.body && (
              <div className="surface-card p-5 whitespace-pre-wrap leading-relaxed">{data.body}</div>
            )}

            {fileUrl && (
              <div className="surface-card overflow-hidden">
                <iframe src={fileUrl} title={`Documento: ${title}`} className="w-full h-[75vh] bg-surface-variant" />
              </div>
            )}

            {data.allow_download && fileUrl && (
              <a href={fileUrl} download className="inline-flex items-center gap-2 h-10 px-4 rounded-full bg-primary text-primary-foreground text-sm">
                <Download className="w-4 h-4" /> Baixar
              </a>
            )}
          </article>
        )}
      </div>
    </AppShell>
  );
}

function toEmbed(url: string): string | null {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, "");
    let vid: string | null = null;
    if (host === "youtu.be") vid = u.pathname.slice(1);
    else if (host.endsWith("youtube.com")) {
      if (u.pathname === "/watch") vid = u.searchParams.get("v");
      else if (u.pathname.startsWith("/embed/") || u.pathname.startsWith("/shorts/")) vid = u.pathname.split("/")[2];
    }
    if (vid) return `https://www.youtube.com/embed/${vid}?rel=0&modestbranding=1&playsinline=1`;
    if (host.includes("vimeo.com")) {
      const id = u.pathname.split("/").filter(Boolean).pop();
      if (id) return `https://player.vimeo.com/video/${id}`;
    }
    return null;
  } catch { return null; }
}
