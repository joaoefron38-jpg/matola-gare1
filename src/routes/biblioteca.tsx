import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { AppShell, EmptyState } from "@/components/AppShell";
import { ContentCard } from "@/components/ContentCard";
import { supabase } from "@/integrations/supabase/client";
import { BookOpen, FolderOpen } from "lucide-react";

export const Route = createFileRoute("/biblioteca")({
  head: () => ({ meta: [
    { title: "Biblioteca — Matola Gare" },
    { name: "description", content: "Livros, apostilas, PDFs e materiais educativos da Escola Secundária da Matola Gare." },
    { property: "og:title", content: "Biblioteca — Matola Gare" },
    { property: "og:description", content: "Livros, apostilas, PDFs e materiais educativos da Escola Secundária da Matola Gare." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },

  ] }),
  component: Biblioteca,
});

function Biblioteca() {
  const [folderId, setFolderId] = useState<string | null>(null);
  const { data, isLoading } = useQuery({
    queryKey: ["library_items"],
    queryFn: async () => {
      const { data, error } = await supabase.from("library_items").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
  const { data: folders } = useQuery({
    queryKey: ["library_folders"],
    queryFn: async () => {
      const { data, error } = await supabase.from("library_folders").select("id,name").order("name", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  const counts = new Map<string, number>();
  for (const it of data ?? []) if (it.folder_id) counts.set(it.folder_id, (counts.get(it.folder_id) ?? 0) + 1);
  const visible = folderId ? (data ?? []).filter((it) => it.folder_id === folderId) : (data ?? []);

  return (
    <AppShell>
      <div className="mx-auto max-w-7xl px-4 py-10">
        <header className="mb-6 animate-fade-up">
          <h1 className="text-3xl md:text-4xl font-bold">Biblioteca</h1>
          <p className="text-muted-foreground mt-1">Explore os conteúdos publicados pela administração.</p>
        </header>
        {!isLoading && (folders?.length ?? 0) > 0 && (
          <div className="mb-6 flex flex-wrap gap-2" role="group" aria-label="Pastas da biblioteca">
            <button
              onClick={() => setFolderId(null)}
              aria-pressed={folderId === null}
              className={`h-9 rounded-full px-4 text-sm transition-colors ${folderId === null ? "bg-primary text-primary-foreground" : "bg-surface-variant text-muted-foreground hover:text-foreground"}`}
            >
              Todos ({data?.length ?? 0})
            </button>
            {folders?.map((f) => (
              <button
                key={f.id}
                onClick={() => setFolderId(f.id)}
                aria-pressed={folderId === f.id}
                className={`inline-flex items-center gap-1.5 h-9 rounded-full px-4 text-sm transition-colors ${folderId === f.id ? "bg-primary text-primary-foreground" : "bg-surface-variant text-muted-foreground hover:text-foreground"}`}
              >
                <FolderOpen className="h-4 w-4" /> {f.name} ({counts.get(f.id) ?? 0})
              </button>
            ))}
          </div>
        )}
        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="surface-card h-72 animate-pulse bg-surface-variant" />
            ))}
          </div>
        ) : visible.length === 0 ? (
          folderId ? (
            <EmptyState
              icon={FolderOpen}
              title="Pasta vazia"
              message="Ainda não há livros nesta pasta. Explore outras pastas ou veja Todos."
            />
          ) : (
            <EmptyState
              icon={BookOpen}
              title="Biblioteca vazia"
              message="Ainda não existem conteúdos publicados. Aguarde novas atualizações da administração."
            />
          )
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {visible.map((it) => (
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
