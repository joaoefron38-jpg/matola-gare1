import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { MapPin, Images, GraduationCap, Clock, Mail, Phone } from "lucide-react";

export const Route = createFileRoute("/visitar")({
  head: () => ({ meta: [
    { title: "Visitar a Escola — Matola Gare" },
    { name: "description", content: "Conheça a Escola Secundária da Matola Gare: história, missão, visão, horário e contactos." },
    { property: "og:title", content: "Visitar a Escola — Matola Gare" },
    { property: "og:description", content: "Conheça a Escola Secundária da Matola Gare: história, missão, visão, horário e contactos." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
    
  ] }),
  component: Visitar,
});

function Visitar() {
  const { data: s } = useQuery({
    queryKey: ["school_info"],
    queryFn: async () => (await supabase.from("school_info").select("*").eq("id", 1).maybeSingle()).data,
  });
  const { data: gallery } = useQuery({
    queryKey: ["gallery_top"],
    queryFn: async () => (await supabase.from("gallery_items").select("*").order("created_at", { ascending: false }).limit(6)).data ?? [],
  });

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl px-4 py-10">
        <header className="mb-10 text-center animate-fade-up">
          <h1 className="text-4xl md:text-5xl font-bold">
            <span className="text-gradient-primary">Visitar a Escola</span>
          </h1>
          <p className="text-muted-foreground mt-3 max-w-2xl mx-auto">
            {s?.name ?? "Escola Secundária da Matola Gare"} — um espaço de aprendizagem e crescimento.
          </p>
        </header>

        <div className="grid gap-5 md:grid-cols-3">
          <div className="surface-card p-6 animate-fade-up md:col-span-2">
            <h2 className="font-semibold mb-2">História</h2>
            <p className="text-muted-foreground whitespace-pre-line">{s?.history || "Ainda não definido."}</p>
          </div>
          <div className="space-y-5">
            <div className="surface-card p-5 animate-fade-up">
              <div className="flex items-center gap-2 text-primary mb-1"><Clock className="w-4 h-4" /><span className="text-sm font-medium">Horário</span></div>
              <div>{s?.schedule || "Ainda não definido."}</div>
            </div>
            <div className="surface-card p-5 animate-fade-up">
              <div className="flex items-center gap-2 text-primary mb-1"><Mail className="w-4 h-4" /><span className="text-sm font-medium">Email</span></div>
              <div className="truncate">{s?.email || "—"}</div>
            </div>
            <div className="surface-card p-5 animate-fade-up">
              <div className="flex items-center gap-2 text-primary mb-1"><Phone className="w-4 h-4" /><span className="text-sm font-medium">Telefone</span></div>
              <div>{s?.phone || "—"}</div>
            </div>
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-2 mt-5">
          <div className="surface-card p-6 animate-fade-up">
            <h2 className="font-semibold mb-2">Missão</h2>
            <p className="text-muted-foreground whitespace-pre-line">{s?.mission || "Ainda não definido."}</p>
          </div>
          <div className="surface-card p-6 animate-fade-up">
            <h2 className="font-semibold mb-2">Visão</h2>
            <p className="text-muted-foreground whitespace-pre-line">{s?.vision || "Ainda não definido."}</p>
          </div>
        </div>

        <section className="mt-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-semibold flex items-center gap-2"><Images className="w-6 h-6 text-primary" /> Galeria</h2>
            <Link to="/galeria" className="text-sm text-primary hover:underline">Ver tudo</Link>
          </div>
          {gallery && gallery.length > 0 ? (
            <div className="grid gap-3 grid-cols-2 md:grid-cols-3">
              {gallery.map((g) => (
                <img key={g.id} src={g.image_url} alt="" loading="lazy" className="aspect-square object-cover w-full rounded-2xl surface-card" />
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">Ainda não existem imagens publicadas.</p>
          )}
        </section>

        <div className="mt-10 grid gap-5 md:grid-cols-2">
          <Link to="/localizacao" className="surface-card surface-card-hover p-6 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-primary-container text-primary-container-foreground grid place-items-center"><MapPin className="w-6 h-6" /></div>
            <div>
              <div className="font-semibold">Como chegar</div>
              <div className="text-sm text-muted-foreground">Localização e rota inteligente</div>
            </div>
          </Link>
          <Link to="/sala-do-conhecimento" className="surface-card surface-card-hover p-6 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-primary-container text-primary-container-foreground grid place-items-center"><GraduationCap className="w-6 h-6" /></div>
            <div>
              <div className="font-semibold">Sala do Conhecimento</div>
              <div className="text-sm text-muted-foreground">Vídeos, aulas e palestras</div>
            </div>
          </Link>
        </div>
      </div>
    </AppShell>
  );
}
