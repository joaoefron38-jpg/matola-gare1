import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AppShell, EmptyState } from "@/components/AppShell";
import { ContentCard } from "@/components/ContentCard";
import { supabase } from "@/integrations/supabase/client";
import { GraduationCap } from "lucide-react";

export const Route = createFileRoute("/sala-do-conhecimento")({
  head: () => ({
    meta: [
      { title: "Sala do Conhecimento — Matola Gare" },
      { name: "description", content: "Vídeos, aulas, palestras e conteúdos educativos da Escola Secundária da Matola Gare." },
    ],
  }),
  component: Sala,
});

function Sala() {
  const { data, isLoading } = useQuery({
    queryKey: ["knowledge_items"],
    queryFn: async () => {
      const { data, error } = await supabase.from("knowledge_items").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <AppShell>
      <div className="mx-auto max-w-7xl px-4 py-10">
        <header className="mb-8 animate-fade-up">
          <h1 className="text-3xl md:text-4xl font-bold">Sala do Conhecimento</h1>
          <p className="text-muted-foreground mt-1">Aulas, palestras, eventos e conteúdos em vídeo.</p>
        </header>
        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => <div key={i} className="surface-card h-72 animate-pulse bg-surface-variant" />)}
          </div>
        ) : !data || data.length === 0 ? (
          <EmptyState icon={GraduationCap} title="Sala vazia" message="Ainda não existem vídeos publicados na Sala do Conhecimento." />
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {data.map((it) => (
              <ContentCard key={it.id} item={{
                type: "knowledge", id: it.id, title: it.title, description: it.description, image: it.thumbnail_url,
                videoLink: it.video_url, externalLink: it.external_link, pdfLink: it.pdf_link,
              }} />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
