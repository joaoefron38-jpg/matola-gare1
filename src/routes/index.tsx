import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { ContentCard } from "@/components/ContentCard";
import { BookOpen, GraduationCap, Images, Newspaper, MapPin, Info, School, Search, ArrowRight, Calendar, Sparkles } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Escola Secundária da Matola Gare" },
      { name: "description", content: "Plataforma digital escolar: biblioteca, vídeos, galeria, notícias e localização da Escola Secundária da Matola Gare *#efRon" },
      { property: "og:title", content: "Escola Secundária da Matola Gare" },
      { property: "og:description", content: "Biblioteca digital escolar com publicações, vídeos, notícias, galeria e localização da Escola Secundária da Matola Gare." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const QUICK = [
  { to: "/biblioteca", label: "Biblioteca", desc: "Livros, apostilas e PDFs", icon: BookOpen, key: "library" },
  { to: "/sala-do-conhecimento", label: "Sala do Conhecimento", desc: "Aulas, palestras e vídeos", icon: GraduationCap, key: "knowledge" },
  { to: "/galeria", label: "Galeria", desc: "Fotos e momentos da escola", icon: Images, key: "gallery" },
  { to: "/noticias", label: "Notícias", desc: "Comunicados e avisos", icon: Newspaper, key: "news" },
  { to: "/visitar", label: "Visitar a Escola", desc: "Missão, visão e contactos", icon: School },
  { to: "/localizacao", label: "Localização", desc: "Como chegar à escola", icon: MapPin },
] as const;

function Index() {
  const [q, setQ] = useState("");

  const { data: highlights } = useQuery({
    queryKey: ["home_highlights"],
    queryFn: async () => {
      const [lib, kn, gal, news] = await Promise.all([
        supabase.from("library_items").select("*").order("created_at", { ascending: false }).limit(4),
        supabase.from("knowledge_items").select("*").order("created_at", { ascending: false }).limit(4),
        supabase.from("gallery_items").select("*").order("created_at", { ascending: false }).limit(6),
        supabase.from("news_items").select("*").order("created_at", { ascending: false }).limit(3),
      ]);
      return {
        library: lib.data ?? [],
        knowledge: kn.data ?? [],
        gallery: gal.data ?? [],
        news: news.data ?? [],
      };
    },
  });

  const { data: counts } = useQuery({
    queryKey: ["home_counts"],
    queryFn: async () => {
      const head = { count: "exact" as const, head: true };
      const [lib, kn, gal, news] = await Promise.all([
        supabase.from("library_items").select("id", head),
        supabase.from("knowledge_items").select("id", head),
        supabase.from("gallery_items").select("id", head),
        supabase.from("news_items").select("id", head),
      ]);
      return {
        library: lib.count ?? 0,
        knowledge: kn.count ?? 0,
        gallery: gal.count ?? 0,
        news: news.count ?? 0,
      } as Record<string, number>;
    },
  });

  const totalItems = counts ? Object.values(counts).reduce((a, b) => a + b, 0) : 0;

  const newestDate = (() => {
    const dates = [
      ...(highlights?.library ?? []),
      ...(highlights?.knowledge ?? []),
      ...(highlights?.gallery ?? []),
      ...(highlights?.news ?? []),
    ].map((r: { created_at: string }) => r.created_at).filter(Boolean).sort().reverse();
    return dates[0] ?? null;
  })();

  const freshCount = (() => {
    const limit = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return [
      ...(highlights?.library ?? []),
      ...(highlights?.knowledge ?? []),
      ...(highlights?.gallery ?? []),
      ...(highlights?.news ?? []),
    ].filter((r: { created_at: string }) => new Date(r.created_at).getTime() > limit).length;
  })();

  const hasAny =
    (highlights?.library.length ?? 0) +
    (highlights?.knowledge.length ?? 0) +
    (highlights?.gallery.length ?? 0) +
    (highlights?.news.length ?? 0) > 0;

  return (
    <AppShell>
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 opacity-70"
             style={{ background: "radial-gradient(60% 60% at 50% 0%, oklch(0.9 0.08 255 / 0.35), transparent 70%)" }} />
        <div className="mx-auto max-w-4xl px-4 pt-16 pb-10 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-container text-primary-container-foreground text-xs font-medium mb-6 animate-fade-in">
            <Info className="w-3.5 h-3.5" /> Escola Secundária da Matola Gare
          </div>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight animate-fade-up">
            <span className="text-gradient-primary">Biblioteca Digital</span>
          </h1>
          <p className="mt-4 text-lg text-muted-foreground animate-fade-up">
            Conteúdos, vídeos, notícias e recursos da nossa escola — num só lugar.
          </p>
          <form
            className="mt-8 max-w-2xl mx-auto animate-scale-in"
            onSubmit={(e) => { e.preventDefault(); if (q.trim()) window.location.href = `/pesquisa?q=${encodeURIComponent(q)}`; }}
          >
            <div className="relative">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Pesquisar livros, vídeos, notícias..."
                className="w-full h-14 pl-14 pr-32 rounded-full bg-card border border-border shadow-elevation-2 hover:shadow-elevation-3 focus:shadow-elevation-3 outline-none focus:border-primary transition-all"
              />
              <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 h-10 px-6 rounded-full bg-primary text-primary-foreground font-medium hover:shadow-elevation-2 transition-shadow">
                Pesquisar
              </button>
            </div>
          </form>
        </div>
      </section>

      {totalItems > 0 && (
        <section className="mx-auto max-w-6xl px-4 pb-6">
          <Link
            to="/publicacoes"
            className="surface-card surface-card-hover flex flex-col sm:flex-row sm:items-center gap-3 p-5 animate-fade-up"
          >
            <div className="w-12 h-12 rounded-2xl bg-primary text-primary-foreground grid place-items-center shrink-0">
              <Sparkles className="w-6 h-6" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-semibold">
                  {totalItems} {totalItems === 1 ? "publicação disponível" : "publicações disponíveis"}
                </h2>
                {freshCount > 0 && (
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-primary-container text-primary-container-foreground">
                    {freshCount} nova{freshCount === 1 ? "" : "s"} esta semana
                  </span>
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">
                {counts?.library ?? 0} livros · {counts?.knowledge ?? 0} vídeos · {counts?.gallery ?? 0} fotos · {counts?.news ?? 0} notícias
                {newestDate ? ` · última atualização ${new Date(newestDate).toLocaleDateString("pt-PT")}` : ""}
              </p>
            </div>
            <span className="inline-flex items-center gap-1 text-sm text-primary font-medium">
              Ver publicações <ArrowRight className="w-4 h-4" />
            </span>
          </Link>
        </section>
      )}

      <section className="mx-auto max-w-6xl px-4 pb-10">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {QUICK.map(({ to, label, desc, icon: Icon, key }, i) => (
            <Link key={to} to={to} className="surface-card surface-card-hover p-6 group animate-fade-up" style={{ animationDelay: `${i * 60}ms` }}>
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-primary-container text-primary-container-foreground grid place-items-center shrink-0">
                  <Icon className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold flex items-center gap-2">
                      {label}
                      {key && (counts?.[key] ?? 0) > 0 && (
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-primary-container text-primary-container-foreground">
                          {counts?.[key]}
                        </span>
                      )}
                    </h3>
                    <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{desc}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {hasAny && (
        <section className="mx-auto max-w-6xl px-4 pb-16 space-y-14">
          {(highlights?.news.length ?? 0) > 0 && (
            <HighlightBlock title="Últimas Notícias" to="/noticias" icon={Newspaper}>
              <div className="grid gap-4 md:grid-cols-3">
                {highlights!.news.map((n) => (
                  <Link key={n.id} to="/noticias" className="surface-card surface-card-hover overflow-hidden group animate-fade-up">
                    {n.image_url ? (
                      <div className="aspect-video overflow-hidden bg-surface-variant">
                        <img src={n.image_url} alt={n.title} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                      </div>
                    ) : null}
                    <div className="p-4">
                      <div className="text-xs text-muted-foreground flex items-center gap-1.5 mb-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {new Date(n.created_at).toLocaleDateString("pt-PT")}
                      </div>
                      <h3 className="font-semibold leading-tight line-clamp-2">{n.title}</h3>
                      {n.body && <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{n.body}</p>}
                    </div>
                  </Link>
                ))}
              </div>
            </HighlightBlock>
          )}

          {(highlights?.knowledge.length ?? 0) > 0 && (
            <HighlightBlock title="Sala do Conhecimento" to="/sala-do-conhecimento" icon={GraduationCap}>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {highlights!.knowledge.map((k) => (
                  <ContentCard
                    key={k.id}
                    item={{
                      type: "knowledge",
                      id: k.id,
                      title: k.title,
                      description: k.description,
                      image: k.thumbnail_url,
                      videoLink: k.video_url,
                      pdfLink: k.pdf_link,
                    }}
                  />
                ))}
              </div>
            </HighlightBlock>
          )}

          {(highlights?.library.length ?? 0) > 0 && (
            <HighlightBlock title="Biblioteca" to="/biblioteca" icon={BookOpen}>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {highlights!.library.map((l) => (
                  <ContentCard
                    key={l.id}
                    item={{
                      type: "library",
                      id: l.id,
                      title: l.title,
                      description: l.description,
                      image: l.cover_url,
                      bookLink: l.book_link,
                      pdfLink: l.pdf_link,
                      externalLink: l.external_link,
                      allowDownload: l.allow_download,
                    }}
                  />
                ))}
              </div>
            </HighlightBlock>
          )}

          {(highlights?.gallery.length ?? 0) > 0 && (
            <HighlightBlock title="Galeria" to="/galeria" icon={Images}>
              <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
                {highlights!.gallery.map((g) => (
                  <Link key={g.id} to="/galeria" className="aspect-square overflow-hidden rounded-2xl bg-surface-variant group animate-fade-up">
                    {g.image_url && (
                      <img src={g.image_url} alt={g.title ?? "Galeria"} loading="lazy" className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                    )}
                  </Link>
                ))}
              </div>
            </HighlightBlock>
          )}
        </section>
      )}
    </AppShell>
  );
}

function HighlightBlock({
  title, to, icon: Icon, children,
}: {
  title: string;
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <div className="animate-fade-up">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl md:text-2xl font-bold flex items-center gap-2">
          <Icon className="w-5 h-5 text-primary" /> {title}
        </h2>
        <Link to={to} className="text-sm text-primary hover:underline inline-flex items-center gap-1">
          Ver tudo <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
      {children}
    </div>
  );
}
