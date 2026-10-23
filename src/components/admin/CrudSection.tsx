import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { notifyPublication } from "@/lib/push.functions";
import { Plus, Trash2, Save, X, Pencil } from "lucide-react";
import { toast } from "sonner";
import { FileUpload } from "./FileUpload";

const NOTIFY_TABLES = new Set(["library_items", "knowledge_items", "gallery_items", "news_items"]);

export type Field = {
  name: string;
  label: string;
  type?: "text" | "textarea" | "url" | "date" | "datetime" | "checkbox" | "number";
  required?: boolean;
  upload?: { accept?: string; folder?: string };
};

export function CrudSection<T extends Record<string, any>>({
  table, title, fields, orderBy = "created_at",
}: {
  table: string;
  title: string;
  fields: Field[];
  orderBy?: string;
}) {
  const qc = useQueryClient();
  const notify = useServerFn(notifyPublication);
  const [editing, setEditing] = useState<T | null>(null);
  const [creating, setCreating] = useState(false);

  const { data } = useQuery({
    queryKey: [table],
    queryFn: async () => {
      const { data, error } = await (supabase.from(table as any).select("*").order(orderBy, { ascending: false }));
      if (error) throw error;
      return (data ?? []) as unknown as T[];
    },
  });

  async function save(row: any) {
    const clean: any = {};
    for (const f of fields) {
      const v = row[f.name];
      if (f.type === "checkbox") clean[f.name] = !!v;
      else if (f.type === "datetime") clean[f.name] = v ? new Date(v).toISOString() : new Date().toISOString();
      else if (f.type === "number") clean[f.name] = v === "" || v == null ? null : Number(v);
      else clean[f.name] = v === "" ? null : v;
    }
    if (row.id) {
      const { error } = await supabase.from(table as any).update(clean).eq("id", row.id);
      if (error) return toast.error(error.message);
      toast.success("Atualizado");
    } else {
      const title = ["title", "name", "caption"].map((k) => clean[k]).find((v) => typeof v === "string" && v.trim()) ?? "";
      const { error } = await supabase.from(table as any).insert(clean);
      if (error) return toast.error(error.message);
      toast.success("Criado");
      if (NOTIFY_TABLES.has(table)) {
        notify({ data: { table, title } })
          .then((r) => { if (r && r.sent > 0) toast.info(`Notificação enviada para ${r.sent} dispositivo(s)`); })
          .catch(() => {});
      }
    }
    setEditing(null); setCreating(false);
    qc.invalidateQueries({ queryKey: [table] });
  }

  async function del(id: string) {
    if (!confirm("Eliminar este item?")) return;
    const { error } = await supabase.from(table as any).delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Eliminado");
    qc.invalidateQueries({ queryKey: [table] });
  }

  return (
    <div className="animate-fade-up">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">{title}</h2>
        <button onClick={() => { setCreating(true); setEditing({} as T); }} className="inline-flex items-center gap-2 h-10 px-4 rounded-full bg-primary text-primary-foreground text-sm hover:shadow-elevation-2">
          <Plus className="w-4 h-4" /> Adicionar
        </button>
      </div>

      {(editing || creating) && (
        <FormPanel fields={fields} initial={editing ?? {}} onCancel={() => { setEditing(null); setCreating(false); }} onSave={save} />
      )}

      <div className="mt-4 space-y-3">
        {!data || data.length === 0 ? (
          <div className="surface-card py-8 text-center text-muted-foreground">Sem registos.</div>
        ) : (
          data.map((row) => (
            <div key={row.id} className="surface-card p-4 flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="min-w-0 flex-1 space-y-1">
                {fields.slice(0, 3).map((f, i) => {
                  const value = f.type === "checkbox" ? (row[f.name] ? "Sim" : "Não") : String(row[f.name] ?? "—");
                  return (
                    <div key={f.name} className={i === 0 ? "font-medium break-words" : "text-sm text-muted-foreground line-clamp-2 break-words"}>
                      {i === 0 ? value : `${f.label}: ${value}`}
                    </div>
                  );
                })}
              </div>
              <div className="flex gap-2 shrink-0">
                <button onClick={() => { setEditing(row); setCreating(false); window.scrollTo({ top: 0, behavior: "smooth" }); }} className="inline-flex items-center gap-1.5 h-10 px-4 rounded-full bg-secondary text-secondary-foreground text-sm">
                  <Pencil className="w-4 h-4" /> Editar
                </button>
                <button onClick={() => del(row.id)} className="inline-flex items-center gap-1.5 h-10 px-4 rounded-full bg-destructive/10 text-destructive text-sm">
                  <Trash2 className="w-4 h-4" /> Apagar
                </button>
              </div>
            </div>
          ))
        )}
      </div>

    </div>
  );
}

function FormPanel({ fields, initial, onCancel, onSave }: { fields: Field[]; initial: any; onCancel: () => void; onSave: (r: any) => void }) {
  const [row, setRow] = useState<any>(initial);
  return (
    <div className="surface-card p-5">
      <div className="grid gap-3 md:grid-cols-2">
        {fields.map((f) => (
          <label key={f.name} className={`text-sm ${f.type === "textarea" ? "md:col-span-2" : ""}`}>
            <span className="block mb-1 text-muted-foreground">{f.label}{f.required && " *"}</span>
            {f.type === "textarea" ? (
              <textarea value={row[f.name] ?? ""} onChange={(e) => setRow({ ...row, [f.name]: e.target.value })} rows={4} className="w-full rounded-xl bg-surface-variant p-3 outline-none focus:ring-2 focus:ring-primary" />
            ) : f.type === "datetime" ? (
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="datetime-local"
                  value={toLocalInput(row[f.name])}
                  onChange={(e) => setRow({ ...row, [f.name]: e.target.value })}
                  className="h-11 rounded-full bg-surface-variant px-4 outline-none focus:ring-2 focus:ring-primary"
                />
                <button
                  type="button"
                  onClick={() => setRow({ ...row, [f.name]: toLocalInput(new Date().toISOString()) })}
                  className="h-11 px-4 rounded-full bg-secondary text-secondary-foreground text-sm"
                >
                  Agora
                </button>
              </div>
            ) : f.type === "checkbox" ? (
              <input type="checkbox" checked={!!row[f.name]} onChange={(e) => setRow({ ...row, [f.name]: e.target.checked })} className="w-5 h-5" />
            ) : (
              <div className="space-y-2">
                <input type={f.type ?? "text"} value={row[f.name] ?? ""} onChange={(e) => setRow({ ...row, [f.name]: e.target.value })} className="w-full h-10 rounded-full bg-surface-variant px-4 outline-none focus:ring-2 focus:ring-primary" placeholder={f.upload ? "Cole um URL ou carregue um ficheiro" : ""} />
                {f.upload && (
                  <FileUpload
                    accept={f.upload.accept}
                    folder={f.upload.folder ?? f.name}
                    onUploaded={(url) => setRow({ ...row, [f.name]: url })}
                  />
                )}
                {f.upload && row[f.name] && f.upload.accept?.startsWith("image") && (
                  <img src={row[f.name]} alt="" className="mt-1 h-24 w-auto rounded-lg object-cover" />
                )}
              </div>
            )}
          </label>
        ))}
      </div>
      <div className="flex gap-2 mt-4 justify-end">
        <button onClick={onCancel} className="inline-flex items-center gap-2 h-10 px-4 rounded-full bg-secondary text-secondary-foreground text-sm"><X className="w-4 h-4" /> Cancelar</button>
        <button onClick={() => onSave(row)} className="inline-flex items-center gap-2 h-10 px-4 rounded-full bg-primary text-primary-foreground text-sm"><Save className="w-4 h-4" /> Guardar</button>
      </div>
    </div>
  );
}

/** Converte ISO -> valor aceito por <input type="datetime-local"> (hora local). */
function toLocalInput(value?: string | null) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return typeof value === "string" ? value.slice(0, 16) : "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
