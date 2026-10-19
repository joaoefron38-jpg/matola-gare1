import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MapPin, Save } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/localizacao")({ head: () => ({ meta: [
    { title: "Localização — Administração Matola Gare" },
    { name: "description", content: "Definição do endereço e coordenadas da escola." },
    { property: "og:title", content: "Localização — Administração Matola Gare" },
    { property: "og:description", content: "Definição do endereço e coordenadas da escola." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
    { name: "robots", content: "noindex" },
  ] }), component: LocAdmin });

function LocAdmin() {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["school_info"],
    queryFn: async () => (await supabase.from("school_info").select("*").eq("id", 1).maybeSingle()).data,
  });
  const [lat, setLat] = useState<string>("");
  const [lng, setLng] = useState<string>("");
  const [addr, setAddr] = useState<string>("");
  useEffect(() => {
    if (data) { setLat(String(data.latitude ?? "")); setLng(String(data.longitude ?? "")); setAddr(data.address ?? ""); }
  }, [data]);

  async function save() {
    const latN = lat === "" ? null : Number(lat);
    const lngN = lng === "" ? null : Number(lng);
    const { error } = await supabase.from("school_info").upsert({ id: 1, latitude: latN, longitude: lngN, address: addr || null });
    if (error) return toast.error(error.message);
    toast.success("Localização atualizada");
    qc.invalidateQueries({ queryKey: ["school_info"] });
  }

  return (
    <div className="animate-fade-up space-y-4">
      <h2 className="text-xl font-semibold flex items-center gap-2"><MapPin className="w-5 h-5 text-primary" /> Localização da Escola</h2>
      <div className="surface-card p-5 grid gap-3 md:grid-cols-2">
        <label className="text-sm md:col-span-2">
          <span className="block mb-1 text-muted-foreground">Endereço</span>
          <input value={addr} onChange={(e) => setAddr(e.target.value)} className="w-full h-10 rounded-full bg-surface-variant px-4 outline-none focus:ring-2 focus:ring-primary" placeholder="Matola Gare, Cidade da Matola" />
        </label>
        <label className="text-sm">
          <span className="block mb-1 text-muted-foreground">Latitude</span>
          <input value={lat} onChange={(e) => setLat(e.target.value)} className="w-full h-10 rounded-full bg-surface-variant px-4 outline-none focus:ring-2 focus:ring-primary" placeholder="-25.9689" />
        </label>
        <label className="text-sm">
          <span className="block mb-1 text-muted-foreground">Longitude</span>
          <input value={lng} onChange={(e) => setLng(e.target.value)} className="w-full h-10 rounded-full bg-surface-variant px-4 outline-none focus:ring-2 focus:ring-primary" placeholder="32.4589" />
        </label>
      </div>
      <p className="text-xs text-muted-foreground">Dica: obtenha as coordenadas exatas no Google Maps clicando com o botão direito no local.</p>
      <button onClick={save} className="inline-flex items-center gap-2 h-11 px-6 rounded-full bg-primary text-primary-foreground font-medium hover:shadow-elevation-2">
        <Save className="w-4 h-4" /> Guardar
      </button>
    </div>
  );
}
