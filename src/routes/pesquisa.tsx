import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
import { ContentCard } from "@/components/ContentCard";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { Search } from "lucide-react";

export const Route = createFileRoute("/pesquisa")({
  validateSearch: (s: Record<string, unknown>) => ({ q: typeof s.q === "string" ? s.q : "" }),
  head: () => ({ meta: [{ title: "Pesquisar — Matola Gare" }] }),
  component: Pesquisa,
});

function Pesquisa() {
  const { q } = Route.useSearch();
  const navigate = useNavigate();
  const [query, setQuery] = useState(q);
  useEffect(() => setQuery(q), [q]);

  const { data } = useQuery({
    queryKey: ["search", q],
    queryFn: async () => {
      if (!q) return { library: [], knowledge: [], news: [] };
      const pattern = `%${q}%`;
      const [lib, kn, nw] = await Promise.all([
        supabase.from("library_items").select("*").or(`title.ilike.${pattern},description.ilike.${pattern}`).limit(20),
        supabase.from("knowledge_items").select("*").or(`title.ilike.${pattern},description.ilike.${pattern}`).limit(20),
        supabase.from("news_items").select("*").or(`title.ilike.${pattern},body.ilike.${pattern}`).limit(20),
      ]);
      return { library: lib.data ?? [], knowledge: kn.data ?? [], news: nw.data ?? [] };
    },
    enabled: !!q,
  });

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl px-4 py-10">
        <form onSubmit={(e) => { e.preventDefault(); navigate({ to: "/pesquisa", search: { q: query } }); }} className="mb-8">
          <div className="relative max-w-2xl">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Pesquisar..." className="w-full h-12 pl-12 pr-4 rounded-full bg-card border border-border shadow-elevation-1 outline-none focus:border-primary" />
          </div>
        </form>
        {!q ? (
          <p className="text-muted-foreground">Escreva algo para pesquisar.</p>
        ) : (
          <>
            <Section title="Biblioteca" items={(data?.library ?? []).map((it: any) => ({
              type: "library" as const, id: it.id, title: it.title, description: it.description, image: it.cover_url,
              bookLink: it.book_link, pdfLink: it.pdf_link, externalLink: it.external_link, allowDownload: it.allow_download,
            }))} />
            <Section title="Sala do Conhecimento" items={(data?.knowledge ?? []).map((it: any) => ({
              type: "knowledge" as const, id: it.id, title: it.title, description: it.description, image: it.thumbnail_url,
              videoLink: it.video_url, externalLink: it.external_link, pdfLink: it.pdf_link,
            }))} />
            {(data?.news ?? []).length > 0 && (
              <div className="mt-8">
                <h2 className="text-xl font-semibold mb-3">Notícias</h2>
                <div className="space-y-3">
                  {data!.news.map((n: any) => (
                    <div key={n.id} className="surface-card p-5">
                      <div className="font-semibold">{n.title}</div>
                      <div className="text-sm text-muted-foreground line-clamp-2">{n.body}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {(data?.library.length ?? 0) === 0 && (data?.knowledge.length ?? 0) === 0 && (data?.news.length ?? 0) === 0 && (
              <p className="text-muted-foreground">Sem resultados para "{q}".</p>
            )}
          </>
        )}
      </div>
    </AppShell>
  );
}

function Section({ title, items }: { title: string; items: any[] }) {
  if (items.length === 0) return null;
  return (
    <div className="mt-6">
      <h2 className="text-xl font-semibold mb-3">{title}</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((it) => <ContentCard key={it.id} item={it} />)}
      </div>
    </div>
  );
}
