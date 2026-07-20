import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Share2, Heart, Download, ExternalLink, FileText, BookOpen, Play } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";

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
  const primaryLink =
    item.videoLink || item.bookLink || item.externalLink || item.pdfLink || undefined;

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

  async function share() {
    const url = primaryLink || window.location.href;
    try {
      if (navigator.share) await navigator.share({ title: item.title, text: item.description ?? "", url });
      else { await navigator.clipboard.writeText(url); toast.success("Link copiado"); }
    } catch { /* cancelled */ }
  }

  const Icon = item.type === "knowledge" ? Play : BookOpen;

  return (
    <article className="surface-card surface-card-hover overflow-hidden flex flex-col animate-fade-up">
      <div className="aspect-video bg-surface-variant relative overflow-hidden">
        {item.image ? (
          <img src={item.image} alt={item.title} loading="lazy" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full grid place-items-center text-muted-foreground">
            <Icon className="w-10 h-10" />
          </div>
        )}
      </div>
      <div className="p-4 flex-1 flex flex-col gap-2">
        <h3 className="font-semibold leading-tight line-clamp-2">{item.title}</h3>
        {item.description && <p className="text-sm text-muted-foreground line-clamp-3">{item.description}</p>}
        <div className="mt-auto pt-3 flex flex-wrap gap-2">
          {primaryLink && (
            <a
              href={primaryLink} target="_blank" rel="noreferrer" onClick={logView}
              className="inline-flex items-center gap-1.5 h-9 px-4 rounded-full bg-primary text-primary-foreground text-sm font-medium hover:shadow-elevation-2 transition-shadow"
            >
              {item.type === "knowledge" ? <><Play className="w-4 h-4" /> Assistir</> : <><ExternalLink className="w-4 h-4" /> Abrir</>}
            </a>
          )}
          {item.pdfLink && item.type === "library" && (
            <a href={item.pdfLink} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 h-9 px-3 rounded-full bg-secondary text-secondary-foreground text-sm hover:shadow-elevation-1">
              <FileText className="w-4 h-4" /> PDF
            </a>
          )}
          {item.allowDownload && (item.pdfLink || item.bookLink) && (
            <a href={item.pdfLink || item.bookLink!} download className="inline-flex items-center gap-1.5 h-9 px-3 rounded-full bg-surface-variant text-sm hover:shadow-elevation-1">
              <Download className="w-4 h-4" /> Baixar
            </a>
          )}
          <button onClick={share} className="ml-auto p-2 rounded-full hover:bg-accent" aria-label="Compartilhar">
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
