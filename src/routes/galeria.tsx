import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { AppShell, EmptyState } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { Images, X } from "lucide-react";

export const Route = createFileRoute("/galeria")({
  head: () => ({ meta: [
    { title: "Galeria — Matola Gare" },
    { name: "description", content: "Galeria de fotos e vídeos da Escola Secundária da Matola Gare." },
    { property: "og:title", content: "Galeria — Matola Gare" },
    { property: "og:description", content: "Galeria de fotos e vídeos da Escola Secundária da Matola Gare." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
    
  ] }),
  component: Galeria,
});

function Galeria() {
  const [selected, setSelected] = useState<string | null>(null);
  const { data, isLoading } = useQuery({
    queryKey: ["gallery_items"],
    queryFn: async () => {
      const { data, error } = await supabase.from("gallery_items").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <AppShell>
      <div className="mx-auto max-w-7xl px-4 py-10">
        <header className="mb-8 animate-fade-up">
          <h1 className="text-3xl md:text-4xl font-bold">Galeria</h1>
          <p className="text-muted-foreground mt-1">Momentos, eventos e espaços da escola.</p>
        </header>
        {isLoading ? (
          <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => <div key={i} className="aspect-square rounded-2xl bg-surface-variant animate-pulse" />)}
          </div>
        ) : !data || data.length === 0 ? (
          <EmptyState icon={Images} title="Galeria vazia" message="Ainda não foram adicionadas imagens à galeria." />
        ) : (
          <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {data.map((g, i) => (
              <button
                key={g.id}
                onClick={() => setSelected(g.image_url)}
                className="group relative aspect-square overflow-hidden rounded-2xl surface-card animate-fade-up"
                style={{ animationDelay: `${i * 40}ms` }}
              >
                <img src={g.image_url} alt={g.title ?? ""} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                {g.caption && (
                  <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/70 to-transparent text-primary-foreground text-sm">
                    {g.caption}
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm grid place-items-center p-4 animate-fade-in" onClick={() => setSelected(null)}>
          <button className="absolute top-4 right-4 p-3 rounded-full bg-card/20 hover:bg-card/40 text-primary-foreground" aria-label="Fechar">
            <X className="w-6 h-6" />
          </button>
          <img src={selected} alt="" className="max-w-full max-h-full rounded-2xl animate-scale-in" />
        </div>
      )}
    </AppShell>
  );
}
