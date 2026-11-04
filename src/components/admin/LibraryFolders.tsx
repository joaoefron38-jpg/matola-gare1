import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { FolderPlus, Pencil, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";

export type LibraryFolder = { id: string; name: string; created_at?: string };

export function useFolders() {
  return useQuery({
    queryKey: ["library_folders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("library_folders")
        .select("id,name,created_at")
        .order("name", { ascending: true });
      if (error) throw error;
      return (data ?? []) as LibraryFolder[];
    },
  });
}

function invalidateLibrary(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ["library_folders"] });
  qc.invalidateQueries({ queryKey: ["library_items"] });
}

// Gestão de pastas no painel: criar, renomear e eliminar pastas da biblioteca.
export function FolderManager() {
  const qc = useQueryClient();
  const { data: folders, isLoading } = useFolders();
  const { data: items } = useQuery({
    // Chave própria para não colidir com a lista completa de livros no CrudSection.
    queryKey: ["library_items", "folder-counts"],
    queryFn: async () => {
      const { data, error } = await supabase.from("library_items").select("folder_id");
      if (error) throw error;
      return data ?? [];
    },
  });
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  const counts = new Map<string, number>();
  for (const it of items ?? []) if (it.folder_id) counts.set(it.folder_id, (counts.get(it.folder_id) ?? 0) + 1);

  async function create() {
    const trimmed = name.trim();
    if (!trimmed) return toast.error("Escreva o nome da pasta.");
    setBusy(true);
    const { error } = await supabase.from("library_folders").insert({ name: trimmed });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(`Pasta «${trimmed}» criada`);
    setName("");
    invalidateLibrary(qc);
  }

  async function rename(id: string, current: string) {
    const next = window.prompt("Novo nome da pasta:", current)?.trim();
    if (!next || next === current) return;
    const { error } = await supabase.from("library_folders").update({ name: next }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Pasta renomeada");
    invalidateLibrary(qc);
  }

  async function remove(id: string, current: string) {
    if (!window.confirm(`Eliminar a pasta «${current}»? Os livros desta pasta continuam publicados, sem pasta.`)) return;
    const { error } = await supabase.from("library_folders").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Pasta eliminada");
    invalidateLibrary(qc);
  }

  return (
    <div className="animate-fade-up">
      <h2 className="text-xl font-semibold mb-1">Pastas da Biblioteca</h2>
      <p className="text-sm text-muted-foreground mb-3">Organize os livros por disciplina (ex.: Matemática, Física, Português).</p>
      <div className="flex gap-2 mb-4">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") void create(); }}
          placeholder="Nome da nova pasta (ex.: Matemática)"
          maxLength={60}
          className="h-10 flex-1 rounded-full bg-surface-variant px-4 outline-none focus:ring-2 focus:ring-primary"
        />
        <button onClick={() => void create()} disabled={busy} className="inline-flex items-center gap-2 h-10 px-4 rounded-full bg-primary text-primary-foreground text-sm hover:shadow-elevation-2 disabled:opacity-60">
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <FolderPlus className="w-4 h-4" />} Criar pasta
        </button>
      </div>
      {isLoading ? (
        <div className="surface-card py-6 grid place-items-center"><Loader2 className="animate-spin text-primary" /></div>
      ) : !folders || folders.length === 0 ? (
        <div className="surface-card py-6 text-center text-muted-foreground">Ainda não existem pastas. Crie a primeira acima.</div>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2">
          {folders.map((f) => (
            <div key={f.id} className="surface-card p-3 flex items-center gap-2">
              <div className="min-w-0 flex-1">
                <p className="font-medium truncate">{f.name}</p>
                <p className="text-xs text-muted-foreground">{counts.get(f.id) ?? 0} livro(s)</p>
              </div>
              <button onClick={() => void rename(f.id, f.name)} title="Renomear" aria-label={`Renomear ${f.name}`} className="inline-flex items-center gap-1 h-9 px-3 rounded-full bg-secondary text-secondary-foreground text-sm">
                <Pencil className="w-4 h-4" />
              </button>
              <button onClick={() => void remove(f.id, f.name)} title="Eliminar" aria-label={`Eliminar ${f.name}`} className="inline-flex items-center gap-1 h-9 px-3 rounded-full bg-destructive/10 text-destructive text-sm">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Seletor de pasta no formulário de publicação: pasta existente ou criar nova.
export function FolderPicker({ value, newFolderName, onChange }: {
  value: string;
  newFolderName: string;
  onChange: (folderId: string, newFolderName: string) => void;
}) {
  const { data: folders } = useFolders();
  const isNew = value === "__new";
  return (
    <div className="space-y-2">
      <select
        value={value || ""}
        onChange={(e) => {
          const v = e.target.value;
          onChange(v === "" ? "" : v === "__new" ? "__new" : v, "");
        }}
        className="w-full h-10 rounded-full bg-surface-variant px-4 outline-none focus:ring-2 focus:ring-primary"
      >
        <option value="">Sem pasta</option>
        {(folders ?? []).map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
        <option value="__new">➕ Criar nova pasta…</option>
      </select>
      {isNew && (
        <input
          value={newFolderName}
          onChange={(e) => onChange("__new", e.target.value)}
          placeholder="Nome da nova pasta (ex.: Matemática)"
          maxLength={60}
          className="w-full h-10 rounded-full bg-surface-variant px-4 outline-none focus:ring-2 focus:ring-primary"
        />
      )}
    </div>
  );
}
