import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Trash2, Save, X, Pencil } from "lucide-react";
import { toast } from "sonner";

type Field = {
  name: string;
  label: string;
  type?: "text" | "textarea" | "url" | "date" | "checkbox" | "number";
  required?: boolean;
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
      else if (f.type === "number") clean[f.name] = v === "" || v == null ? null : Number(v);
      else clean[f.name] = v === "" ? null : v;
    }
    if (row.id) {
      const { error } = await supabase.from(table as any).update(clean).eq("id", row.id);
      if (error) return toast.error(error.message);
      toast.success("Atualizado");
    } else {
      const { error } = await supabase.from(table as any).insert(clean);
      if (error) return toast.error(error.message);
      toast.success("Criado");
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

      <div className="mt-4 surface-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-surface-variant">
            <tr>
              {fields.slice(0, 3).map((f) => <th key={f.name} className="text-left px-4 py-2 font-medium">{f.label}</th>)}
              <th className="w-32"></th>
            </tr>
          </thead>
          <tbody>
            {!data || data.length === 0 ? (
              <tr><td colSpan={fields.length + 1} className="text-center py-8 text-muted-foreground">Sem registos.</td></tr>
            ) : (
              data.map((row) => (
                <tr key={row.id} className="border-t border-border hover:bg-accent/50">
                  {fields.slice(0, 3).map((f) => (
                    <td key={f.name} className="px-4 py-2 max-w-xs truncate">
                      {f.type === "checkbox" ? (row[f.name] ? "Sim" : "Não") : String(row[f.name] ?? "—")}
                    </td>
                  ))}
                  <td className="px-4 py-2 text-right">
                    <button onClick={() => { setEditing(row); setCreating(false); }} className="p-2 rounded-full hover:bg-accent" aria-label="Editar"><Pencil className="w-4 h-4" /></button>
                    <button onClick={() => del(row.id)} className="p-2 rounded-full hover:bg-destructive/10 text-destructive" aria-label="Eliminar"><Trash2 className="w-4 h-4" /></button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
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
            ) : f.type === "checkbox" ? (
              <input type="checkbox" checked={!!row[f.name]} onChange={(e) => setRow({ ...row, [f.name]: e.target.checked })} className="w-5 h-5" />
            ) : (
              <input type={f.type ?? "text"} value={row[f.name] ?? ""} onChange={(e) => setRow({ ...row, [f.name]: e.target.value })} className="w-full h-10 rounded-full bg-surface-variant px-4 outline-none focus:ring-2 focus:ring-primary" />
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
