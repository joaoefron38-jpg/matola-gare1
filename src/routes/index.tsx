import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { BookOpen, GraduationCap, Images, Newspaper, MapPin, Info, School, Search, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Biblioteca Digital — Escola Secundária da Matola Gare" },
      { name: "description", content: "Plataforma digital escolar: biblioteca, vídeos, galeria, notícias e localização da Escola Secundária da Matola Gare." },
    ],
  }),
  component: Index,
});

const QUICK = [
  { to: "/biblioteca", label: "Biblioteca", desc: "Livros, apostilas e PDFs", icon: BookOpen },
  { to: "/sala-do-conhecimento", label: "Sala do Conhecimento", desc: "Aulas, palestras e vídeos", icon: GraduationCap },
  { to: "/galeria", label: "Galeria", desc: "Fotos e momentos da escola", icon: Images },
  { to: "/noticias", label: "Notícias", desc: "Comunicados e avisos", icon: Newspaper },
  { to: "/visitar", label: "Visitar a Escola", desc: "Missão, visão e contactos", icon: School },
  { to: "/localizacao", label: "Localização", desc: "Como chegar à escola", icon: MapPin },
] as const;

function Index() {
  const [q, setQ] = useState("");
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

      <section className="mx-auto max-w-6xl px-4 pb-16">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {QUICK.map(({ to, label, desc, icon: Icon }, i) => (
            <Link key={to} to={to} className="surface-card surface-card-hover p-6 group animate-fade-up" style={{ animationDelay: `${i * 60}ms` }}>
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-primary-container text-primary-container-foreground grid place-items-center shrink-0">
                  <Icon className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">{label}</h3>
                    <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{desc}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </AppShell>
  );
}
