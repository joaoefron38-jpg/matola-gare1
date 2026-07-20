import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { Mail, Phone, MapPin, Clock, Facebook, Instagram, Youtube, MessageCircle } from "lucide-react";

export const Route = createFileRoute("/sobre")({
  head: () => ({
    meta: [
      { title: "Sobre a Escola — Matola Gare" },
      { name: "description", content: "História, missão, visão e valores da Escola Secundária da Matola Gare." },
    ],
  }),
  component: Sobre,
});

function Sobre() {
  const { data } = useQuery({
    queryKey: ["school_info"],
    queryFn: async () => {
      const { data } = await supabase.from("school_info").select("*").eq("id", 1).maybeSingle();
      return data;
    },
  });

  const s = data;

  return (
    <AppShell>
      <div className="mx-auto max-w-5xl px-4 py-10">
        <header className="mb-8 animate-fade-up">
          <h1 className="text-3xl md:text-4xl font-bold">Sobre a Escola</h1>
          <p className="text-muted-foreground mt-1">{s?.name ?? "Escola Secundária da Matola Gare"}</p>
        </header>

        {s?.intro_video_url && (
          <div className="surface-card overflow-hidden mb-8 aspect-video animate-scale-in">
            <iframe src={toEmbed(s.intro_video_url)} title="Vídeo institucional" className="w-full h-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
          </div>
        )}

        <div className="grid gap-5 md:grid-cols-2">
          <Section title="História" body={s?.history} />
          <Section title="Missão" body={s?.mission} />
          <Section title="Visão" body={s?.vision} />
          <Section title="Valores" body={s?.values_text} />
          <Section title="Objetivos" body={s?.goals} />
          <Section title="Equipa Diretiva" body={s?.team} />
        </div>

        <section className="mt-10 surface-card p-6 md:p-8 animate-fade-up">
          <h2 className="text-xl font-semibold mb-4">Contactos</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <ContactRow icon={Mail} label="Email" value={s?.email} href={s?.email ? `mailto:${s.email}` : undefined} />
            <ContactRow icon={Phone} label="Telefone" value={s?.phone} href={s?.phone ? `tel:${s.phone}` : undefined} />
            <ContactRow icon={MapPin} label="Endereço" value={s?.address} />
            <ContactRow icon={Clock} label="Horário" value={s?.schedule} />
            <ContactRow icon={Facebook} label="Facebook" value={s?.facebook} href={s?.facebook ?? undefined} />
            <ContactRow icon={Instagram} label="Instagram" value={s?.instagram} href={s?.instagram ?? undefined} />
            <ContactRow icon={Youtube} label="YouTube" value={s?.youtube} href={s?.youtube ?? undefined} />
            <ContactRow icon={MessageCircle} label="WhatsApp" value={s?.whatsapp} href={s?.whatsapp ? `https://wa.me/${s.whatsapp.replace(/\D/g, "")}` : undefined} />
          </div>
        </section>
      </div>
    </AppShell>
  );
}

function Section({ title, body }: { title: string; body?: string | null }) {
  return (
    <div className="surface-card p-6 animate-fade-up">
      <h3 className="font-semibold text-lg mb-2">{title}</h3>
      <p className="text-muted-foreground whitespace-pre-line">{body || "Ainda não definido."}</p>
    </div>
  );
}

function ContactRow({ icon: Icon, label, value, href }: { icon: React.ComponentType<{ className?: string }>; label: string; value?: string | null; href?: string }) {
  const content = (
    <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-accent transition-colors">
      <div className="w-10 h-10 rounded-full bg-primary-container text-primary-container-foreground grid place-items-center shrink-0">
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="truncate">{value || "—"}</div>
      </div>
    </div>
  );
  return href && value ? <a href={href} target="_blank" rel="noreferrer">{content}</a> : content;
}

function toEmbed(url: string): string {
  const yt = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|v\/))([\w-]{11})/);
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`;
  return url;
}
