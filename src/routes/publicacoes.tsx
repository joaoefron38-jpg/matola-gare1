import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { AppShell, EmptyState } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { BookOpen, GraduationCap, Images, Newspaper, LayoutGrid, Inbox } from "lucide-react";

export const Route = createFileRoute("/publicacoes")({
  head: () => ({
    meta: [
      { title: "Publicações — Escola Secundária da Matola Gare" },
      { name: "description", content: "Todas as publicações da escola: livros, PDFs, vídeos, fotos e notícias, visíveis para qualquer visitante." },
      { property: "og:title", content: "Publicações — Escola Secundária da Matola Gare" },
      { property: "og:description", content: "Livros, PDFs, vídeos, fotos e notícias publicados pela administração." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Publicacoes,
});

type Row = {
  kind: "library" | "knowledge" | "gallery" | "news";
  id: string;
  title: string;
  subtitle?: string | null;
  image?: string | null;
  date?: string | null;
};

const FILTERS = [
  { key: "all", label: "Tudo", icon: LayoutGrid },
  { key: "library", label: "Biblioteca", icon: BookOpen },
  { key: "knowledge", label: "Vídeos", icon: GraduationCap },
  { key: "gallery", label: "Galeria", icon: Images },
  { key: "news", label: "Notícias", icon: Newspaper },
] as const;

function Publicacoes() {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["key"]>("all");

  const { data, isLoading } = useQuery({
    queryKey: ["publicacoes"],
    queryFn: async (): Promise<Row[]> => {
      const [lib, kn, gal, news] = await Promise.all([
        supabase.from("library_items").select("id,title,description,cover_url,created_at"),
        supabase.from("knowledge_items").select("id,title,description,thumbnail_url,created_at"),
        supabase.from("gallery_items").select("id,title,caption,image_url,created_at"),
        supabase.from("news_items").select("id,title,body,image_url,created_at"),
      ]);
      const rows: Row[] = [
        ...(lib.data ?? []).map((r) => ({ kind: "library" as const, id: r.id, title: r.title, subtitle: r.description, image: r.cover_url, date: r.created_at })),
        ...(kn.data ?? []).map((r) => ({ kind: "knowledge" as const, id: r.id, title: r.title, subtitle: r.description, image: r.thumbnail_url, date: r.created_at })),
        ...(gal.data ?? []).map((r) => ({ kind: "gallery" as const, id: r.id, title: r.title ?? "Foto", subtitle: r.caption, image: r.image_url, date: r.created_at })),
        ...(news.data ?? []).map((r) => ({ kind: "news" as const, id: r.id, title: r.title, subtitle: r.body, image: r.image_url, date: r.created_at })),
      ];
      return rows.sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));
    },
  });

  const rows = (data ?? []).filter((r) => filter === "all" || r.kind === filter);

  return (
    <AppShell>
      <div className="mx-auto max-w-7xl px-4 py-8">
        <header className="mb-6 animate-fade-up">
          <h1 className="text-3xl md:text-4xl font-bold">Publicações</h1>
          <p className="text-muted-foreground mt-1">Tudo o que a administração publicou — aberto a qualquer visitante, sem download obrigatório.</p>
        </header>

        <div className="flex gap-2 overflow-x-auto pb-3 -mx-1 px-1">
          {FILTERS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`shrink-0 inline-flex items-center gap-1.5 h-9 px-4 rounded-full text-sm transition-colors ${
                filter === key ? "bg-primary text-primary-foreground" : "bg-surface-variant hover:bg-accent"
              }`}
            >
              <Icon className="w-4 h-4" /> {label}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mt-4">
            {Array.from({ length: 6 }).map((_, i) => <div key={i} className="surface-card h-60 animate-pulse bg-surface-variant" />)}
          </div>
        ) : rows.length === 0 ? (
          <div className="mt-6">
            <EmptyState icon={Inbox} title="Nada publicado ainda" message="Assim que a administração publicar conteúdos, eles aparecem aqui automaticamente." />
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mt-4">
            {rows.map((r) => (
              <Link
                key={`${r.kind}-${r.id}`}
                to="/ver/$type/$id"
                params={{ type: r.kind, id: r.id }}
                className="surface-card surface-card-hover overflow-hidden group animate-fade-up"
              >
                <div className="aspect-video bg-surface-variant overflow-hidden">
                  {r.image ? (
                    <img src={r.image} alt={r.title} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                  ) : (
                    <div className="w-full h-full grid place-items-center text-muted-foreground">
                      <LayoutGrid className="w-8 h-8" />
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <span className="text-xs text-primary font-medium">{FILTERS.find((f) => f.key === r.kind)?.label}</span>
                  <h2 className="font-semibold leading-tight line-clamp-2 mt-0.5">{r.title}</h2>
                  {r.subtitle && <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{r.subtitle}</p>}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
