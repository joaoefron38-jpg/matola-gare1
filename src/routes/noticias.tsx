import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AppShell, EmptyState } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { Newspaper, Share2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/noticias")({
  head: () => ({ meta: [
    { title: "Notícias e Avisos — Matola Gare" },
    { name: "description", content: "Comunicados, avisos e novidades da Escola Secundária da Matola Gare." },
    { property: "og:title", content: "Notícias e Avisos — Matola Gare" },
    { property: "og:description", content: "Comunicados, avisos e novidades da Escola Secundária da Matola Gare." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
    
  ] }),
  component: Noticias,
});

function Noticias() {
  const { data, isLoading } = useQuery({
    queryKey: ["news_items"],
    queryFn: async () => {
      const { data, error } = await supabase.from("news_items").select("*").order("published_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  async function share(title: string, body: string) {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const url = `${origin}/noticias`;
    const summary = body.replace(/\s+/g, " ").trim().slice(0, 180);
    const shareText = `${title}\n\n${summary}${summary.length === 180 ? "…" : ""}\n\nEscola Secundária da Matola Gare`;
    try {
      if (navigator.share) {
        await navigator.share({ title: `${title} — Matola Gare`, text: shareText, url });
      } else {
        await navigator.clipboard.writeText(`${shareText}\n${url}`);
        toast.success("Notícia copiada");
      }
    } catch {}
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl px-4 py-10">
        <header className="mb-8 animate-fade-up">
          <h1 className="text-3xl md:text-4xl font-bold">Notícias e Avisos</h1>
          <p className="text-muted-foreground mt-1">Fique por dentro das novidades da escola.</p>
        </header>
        {isLoading ? (
          <div className="space-y-4">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="surface-card h-40 animate-pulse bg-surface-variant" />)}</div>
        ) : !data || data.length === 0 ? (
          <EmptyState icon={Newspaper} title="Sem notícias" message="Ainda não existem notícias ou avisos publicados." />
        ) : (
          <div className="space-y-4">
            {data.map((n, i) => (
              <article key={n.id} className="surface-card overflow-hidden animate-fade-up" style={{ animationDelay: `${i * 60}ms` }}>
                {n.image_url && <img src={n.image_url} alt={n.title} loading="lazy" className="w-full aspect-[3/1] object-cover" />}
                <div className="p-6">
                  <div className="text-xs text-muted-foreground mb-2">
                    {new Date(n.published_at).toLocaleDateString("pt-PT", { day: "2-digit", month: "long", year: "numeric" })}
                  </div>
                  <h2 className="text-xl font-semibold mb-2">{n.title}</h2>
                  <p className="text-muted-foreground whitespace-pre-line">{n.body}</p>
                  <button onClick={() => share(n.title, n.body)} className="mt-4 inline-flex items-center gap-2 h-9 px-4 rounded-full bg-secondary text-secondary-foreground text-sm hover:shadow-elevation-1">
                    <Share2 className="w-4 h-4" /> Compartilhar
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
