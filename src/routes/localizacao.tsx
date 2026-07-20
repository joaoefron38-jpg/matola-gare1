import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { MapPin, Navigation, ExternalLink, Route as RouteIcon, Clock } from "lucide-react";
import { toast } from "sonner";

declare global {
  interface Window { google: any; initMatolaMap?: () => void }
}

const DEFAULT_LAT = -25.9689;
const DEFAULT_LNG = 32.4589;

export const Route = createFileRoute("/localizacao")({
  head: () => ({
    meta: [
      { title: "Localização — Matola Gare" },
      { name: "description", content: "Como chegar à Escola Secundária da Matola Gare — Moçambique, Província de Maputo." },
    ],
  }),
  component: Localizacao,
});

function Localizacao() {
  const { data: s } = useQuery({
    queryKey: ["school_info"],
    queryFn: async () => (await supabase.from("school_info").select("*").eq("id", 1).maybeSingle()).data,
  });
  const mapRef = useRef<HTMLDivElement>(null);
  const [loaded, setLoaded] = useState(false);
  const [route, setRoute] = useState<{ distance: string; duration: string; steps: string[] } | null>(null);
  const [calculating, setCalculating] = useState(false);

  const lat = s?.latitude ?? DEFAULT_LAT;
  const lng = s?.longitude ?? DEFAULT_LNG;

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.google?.maps) { setLoaded(true); return; }
    const key = import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY;
    const tracking = import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_TRACKING_ID;
    if (!key) return;
    window.initMatolaMap = () => setLoaded(true);
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${key}&loading=async&callback=initMatolaMap${tracking ? `&channel=${tracking}` : ""}`;
    script.async = true;
    document.head.appendChild(script);
  }, []);

  useEffect(() => {
    if (!loaded || !mapRef.current) return;
    const map = new window.google.maps.Map(mapRef.current, {
      center: { lat, lng }, zoom: 15,
      mapTypeControl: false, streetViewControl: false, fullscreenControl: true,
    });
    new window.google.maps.Marker({ position: { lat, lng }, map, title: s?.name ?? "Escola Secundária da Matola Gare" });
  }, [loaded, lat, lng, s?.name]);

  async function comoChegar() {
    if (!navigator.geolocation) { toast.error("Geolocalização não suportada"); return; }
    setCalculating(true);
    navigator.geolocation.getCurrentPosition(async (pos) => {
      try {
        const origin = `${pos.coords.latitude},${pos.coords.longitude}`;
        const dest = `${lat},${lng}`;
        const res = await fetch("/api/directions", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ origin, destination: dest }),
        });
        if (!res.ok) throw new Error("Falha ao calcular rota");
        const data = await res.json();
        setRoute(data);
      } catch (e) {
        toast.error("Não foi possível calcular a rota");
      } finally { setCalculating(false); }
    }, () => { toast.error("Permissão de localização negada"); setCalculating(false); });
  }

  const mapsHref = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl px-4 py-10">
        <header className="mb-8 animate-fade-up">
          <h1 className="text-3xl md:text-4xl font-bold">Localização</h1>
          <p className="text-muted-foreground mt-1">
            Moçambique · Província de Maputo · Cidade da Matola · Matola Gare
          </p>
        </header>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 surface-card overflow-hidden animate-scale-in">
            <div ref={mapRef} className="w-full aspect-[16/10] bg-surface-variant">
              {!loaded && <div className="w-full h-full grid place-items-center text-muted-foreground">A carregar mapa...</div>}
            </div>
          </div>

          <div className="space-y-4">
            <div className="surface-card p-5 animate-fade-up">
              <div className="flex items-center gap-2 text-primary mb-2"><MapPin className="w-5 h-5" /><span className="font-semibold">Endereço</span></div>
              <p className="text-muted-foreground">{s?.address || "Matola Gare, Cidade da Matola, Província de Maputo, Moçambique"}</p>
            </div>

            <button
              onClick={comoChegar} disabled={calculating}
              className="w-full inline-flex items-center justify-center gap-2 h-12 rounded-full bg-primary text-primary-foreground font-medium hover:shadow-elevation-2 transition-shadow disabled:opacity-50"
            >
              <Navigation className="w-5 h-5" /> {calculating ? "A calcular..." : "Como Chegar"}
            </button>

            <a href={mapsHref} target="_blank" rel="noreferrer" className="w-full inline-flex items-center justify-center gap-2 h-12 rounded-full bg-secondary text-secondary-foreground font-medium hover:shadow-elevation-1">
              <ExternalLink className="w-5 h-5" /> Abrir no Google Maps
            </a>

            {route && (
              <div className="surface-card p-5 animate-fade-up">
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1"><RouteIcon className="w-3 h-3" /> Distância</div>
                    <div className="font-semibold">{route.distance}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="w-3 h-3" /> Tempo</div>
                    <div className="font-semibold">{route.duration}</div>
                  </div>
                </div>
                <div className="text-sm font-semibold mb-2">Direções</div>
                <ol className="text-sm text-muted-foreground space-y-1.5 max-h-64 overflow-y-auto">
                  {route.steps.map((s, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="text-primary font-medium shrink-0">{i + 1}.</span>
                      <span dangerouslySetInnerHTML={{ __html: s }} />
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </div>
        </div>

        <section className="mt-12 surface-card p-6 md:p-8 animate-fade-up">
          <h2 className="text-2xl font-semibold mb-2">Nossa Localização em Moçambique</h2>
          <p className="text-muted-foreground mb-6">
            A escola situa-se em <strong>Matola Gare</strong>, na cidade da Matola, uma das regiões mais dinâmicas da Província de Maputo.
          </p>
          <div className="aspect-[16/9] rounded-2xl overflow-hidden bg-surface-variant">
            <iframe
              title="Moçambique — Matola Gare"
              src={`https://www.google.com/maps?q=${lat},${lng}&z=8&output=embed`}
              className="w-full h-full border-0" loading="lazy" referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        </section>
      </div>
    </AppShell>
  );
}
