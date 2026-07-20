import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Save } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/escola")({ component: EscolaAdmin });

const FIELDS: { key: string; label: string; area?: boolean }[] = [
  { key: "name", label: "Nome da escola" },
  { key: "history", label: "História", area: true },
  { key: "mission", label: "Missão", area: true },
  { key: "vision", label: "Visão", area: true },
  { key: "values_text", label: "Valores", area: true },
  { key: "goals", label: "Objetivos", area: true },
  { key: "team", label: "Equipa diretiva", area: true },
  { key: "email", label: "Email" },
  { key: "phone", label: "Telefone" },
  { key: "whatsapp", label: "WhatsApp" },
  { key: "address", label: "Endereço" },
  { key: "schedule", label: "Horário" },
  { key: "facebook", label: "Facebook (URL)" },
  { key: "instagram", label: "Instagram (URL)" },
  { key: "youtube", label: "YouTube (URL)" },
  { key: "intro_video_url", label: "Vídeo institucional (URL)" },
];

function EscolaAdmin() {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["school_info"],
    queryFn: async () => (await supabase.from("school_info").select("*").eq("id", 1).maybeSingle()).data,
  });
  const [form, setForm] = useState<any>({});
  useEffect(() => { if (data) setForm(data); }, [data]);

  async function save() {
    const { error } = await supabase.from("school_info").upsert({ ...form, id: 1 });
    if (error) return toast.error(error.message);
    toast.success("Informações guardadas");
    qc.invalidateQueries({ queryKey: ["school_info"] });
  }

  return (
    <div className="animate-fade-up space-y-4">
      <h2 className="text-xl font-semibold">Informações da Escola</h2>
      <div className="surface-card p-5 grid gap-3 md:grid-cols-2">
        {FIELDS.map((f) => (
          <label key={f.key} className={`text-sm ${f.area ? "md:col-span-2" : ""}`}>
            <span className="block mb-1 text-muted-foreground">{f.label}</span>
            {f.area ? (
              <textarea rows={4} value={form[f.key] ?? ""} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} className="w-full rounded-xl bg-surface-variant p-3 outline-none focus:ring-2 focus:ring-primary" />
            ) : (
              <input value={form[f.key] ?? ""} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} className="w-full h-10 rounded-full bg-surface-variant px-4 outline-none focus:ring-2 focus:ring-primary" />
            )}
          </label>
        ))}
      </div>
      <button onClick={save} className="inline-flex items-center gap-2 h-11 px-6 rounded-full bg-primary text-primary-foreground font-medium hover:shadow-elevation-2">
        <Save className="w-4 h-4" /> Guardar Alterações
      </button>
    </div>
  );
}
