import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Share2, Heart, Download, BookOpen, Play } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { downloadFile } from "@/lib/download";



export type CardAction = {
  type: "library" | "knowledge";
  id: string;
  title: string;
  description?: string | null;
  image?: string | null;
  bookLink?: string | null;
  pdfLink?: string | null;
  externalLink?: string | null;
  videoLink?: string | null;
  allowDownload?: boolean;
};

export function ContentCard({ item }: { item: CardAction }) {
  const { user } = useAuth();
  const [fav, setFav] = useState(false);
  const shareUrl = `/ver/${item.type}/${item.id}`;


  async function toggleFav() {
    if (!user) {
      toast.error("Faça login para favoritar");
      return;
    }
    if (fav) {
      await supabase.from("favorites").delete().eq("user_id", user.id).eq("item_type", item.type).eq("item_id", item.id);
      setFav(false);
    } else {
      await supabase.from("favorites").insert({ user_id: user.id, item_type: item.type, item_id: item.id });
      setFav(true);
      toast.success("Adicionado aos favoritos");
    }
  }

  async function logView() {
    if (!user) return;
    await supabase.from("view_history").insert({
      user_id: user.id, item_type: item.type, item_id: item.id, title: item.title,
    });
  }

  async function share(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const url = `${window.location.origin}${shareUrl}`;
    const shareData: ShareData = {
      title: item.title || "Matola Gare",
      text: item.description ? `${item.title} — ${item.description}` : item.title,
      url,
    };

    try {
      if (navigator.share && (!navigator.canShare || navigator.canShare(shareData))) {
        await navigator.share(shareData);
        toast.success("Partilha aberta");
      } else {
        await navigator.clipboard.writeText(`${shareData.title}\n${url}`);
        toast.success("Link copiado para a área de transferência");
      }
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        // utilizador cancelou — não mostrar erro
        return;
      }
      try {
        await navigator.clipboard.writeText(url);
        toast.success("Link copiado para a área de transferência");
      } catch {
        toast.error("Não foi possível partilhar. Copie o link manualmente.");
      }
    }
  }

  const Icon = item.type === "knowledge" ? Play : BookOpen;

  const isVideo = item.type === "knowledge" && !!item.videoLink;
  const videoEmbed = isVideo ? toEmbedUrl(item.videoLink!) : null;
  const isDirectVideo = !!item.videoLink && /\.(mp4|webm|ogg)(\?.*)?$/i.test(item.videoLink);

  return (
    <article className="surface-card surface-card-hover overflow-hidden flex flex-col animate-fade-up">
      <div className="aspect-video bg-black relative overflow-hidden">
        {isDirectVideo ? (
          <video src={item.videoLink!} autoPlay muted loop playsInline preload="metadata" poster={item.image ?? undefined} className="w-full h-full object-cover" />
        ) : videoEmbed ? (
          <iframe
            src={videoEmbed}
            title={item.title}
            allow="autoplay; encrypted-media; picture-in-picture"
            allowFullScreen
            loading="lazy"
            className="w-full h-full"
          />
        ) : item.image ? (
          <img src={item.image} alt={item.title} loading="lazy" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full grid place-items-center text-muted-foreground bg-surface-variant">
            <Icon className="w-10 h-10" />
          </div>
        )}
      </div>
      <div className="p-4 flex-1 flex flex-col gap-2">
        <h3 className="font-semibold leading-tight line-clamp-2">{item.title}</h3>
        {item.description && <p className="text-sm text-muted-foreground line-clamp-3">{item.description}</p>}
        <div className="mt-auto pt-3 flex flex-wrap gap-2">
          <Link
            to="/ver/$type/$id" params={{ type: item.type, id: item.id }} onClick={logView}
            className="inline-flex items-center gap-1.5 h-9 px-4 rounded-full bg-primary text-primary-foreground text-sm font-medium hover:shadow-elevation-2 transition-shadow"
          >
            {item.type === "knowledge" ? <><Play className="w-4 h-4" /> Assistir</> : <><BookOpen className="w-4 h-4" /> Ler aqui</>}
          </Link>
          {item.allowDownload && (item.pdfLink || item.bookLink) && (
            <button
              onClick={() => downloadFile((item.pdfLink || item.bookLink)!, item.title)}
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded-full bg-surface-variant text-sm hover:shadow-elevation-1"
            >
              <Download className="w-4 h-4" /> Baixar
            </button>
          )}


          <button onClick={(e) => share(e)} className="ml-auto p-2 rounded-full hover:bg-accent" aria-label="Compartilhar">
            <Share2 className="w-4 h-4" />
          </button>
          <button onClick={toggleFav} className="p-2 rounded-full hover:bg-accent" aria-label="Favoritar">
            <Heart className={`w-4 h-4 ${fav ? "fill-tertiary text-tertiary" : ""}`} />
          </button>
        </div>
      </div>
    </article>
  );
}

function toEmbedUrl(url: string): string | null {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, "");
    let id: string | null = null;
    if (host === "youtu.be") id = u.pathname.slice(1);
    else if (host.endsWith("youtube.com")) {
      if (u.pathname === "/watch") id = u.searchParams.get("v");
      else if (u.pathname.startsWith("/embed/")) id = u.pathname.split("/")[2];
      else if (u.pathname.startsWith("/shorts/")) id = u.pathname.split("/")[2];
    }
    if (id) return `https://www.youtube.com/embed/${id}?autoplay=1&mute=1&loop=1&playlist=${id}&controls=1&modestbranding=1&rel=0&playsinline=1`;
    if (host.includes("vimeo.com")) {
      const vid = u.pathname.split("/").filter(Boolean).pop();
      if (vid) return `https://player.vimeo.com/video/${vid}?autoplay=1&muted=1&loop=1&background=0`;
    }
    return null;
  } catch { return null; }
}
