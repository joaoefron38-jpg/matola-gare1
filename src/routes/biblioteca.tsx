import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AppShell, EmptyState } from "@/components/AppShell";
import { ContentCard } from "@/components/ContentCard";
import { supabase } from "@/integrations/supabase/client";
import { BookOpen } from "lucide-react";

export const Route = createFileRoute("/biblioteca")({
  head: () => ({
    meta: [
      { title: "Biblioteca — Matola Gare" },
      { name: "description", content: "Livros, apostilas, PDFs e materiais educativos da Escola Secundária da Matola Gare." },
    ],
  }),
  component: Biblioteca,
});

function Biblioteca() {
  const { data, isLoading } = useQuery({
    queryKey: ["library_items"],
    queryFn: async () => {
      const { data, error } = await supabase.from("library_items").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <AppShell>
      <div className="mx-auto max-w-7xl px-4 py-10">
        <header className="mb-8 animate-fade-up">
          <h1 className="text-3xl md:text-4xl font-bold">Biblioteca</h1>
          <p className="text-muted-foreground mt-1">Explore os conteúdos publicados pela administração.</p>
        </header>
        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="surface-card h-72 animate-pulse bg-surface-variant" />
            ))}
          </div>
        ) : !data || data.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title="Biblioteca vazia"
            message="Ainda não existem conteúdos publicados. Aguarde novas atualizações da administração."
          />
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {data.map((it) => (
              <ContentCard key={it.id} item={{
                type: "library", id: it.id, title: it.title, description: it.description, image: it.cover_url,
                bookLink: it.book_link, pdfLink: it.pdf_link, externalLink: it.external_link, allowDownload: it.allow_download,
              }} />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
