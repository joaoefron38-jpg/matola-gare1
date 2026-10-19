import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { createUserAsAdmin, removeUserAsAdmin, setUserAdminAsAdmin, updateUserPasswordAsAdmin } from "@/lib/admin.functions";
import { Shield, ShieldOff, UserPlus, UserCog, Trash2, KeyRound, Search } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/admin/utilizadores")({ component: Users });

function Users() {
  const qc = useQueryClient();
  const [email, setEmail] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPass, setNewPass] = useState("");
  const [newName, setNewName] = useState("");
  const [newIsAdmin, setNewIsAdmin] = useState(false);
  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState("");
  const [passwords, setPasswords] = useState<Record<string, string>>({});
  const createFn = useServerFn(createUserAsAdmin);
  const setAdminFn = useServerFn(setUserAdminAsAdmin);
  const removeFn = useServerFn(removeUserAsAdmin);
  const resetPasswordFn = useServerFn(updateUserPasswordAsAdmin);

  const { data: rows } = useQuery({
    queryKey: ["admin_users"],
    queryFn: async () => {
      const [profiles, roles] = await Promise.all([
        supabase.from("profiles").select("*").order("created_at", { ascending: false }),
        supabase.from("user_roles").select("*"),
      ]);
      if (profiles.error) throw profiles.error;
      if (roles.error) throw roles.error;
      const roleMap = new Map<string, string[]>();
      (roles.data ?? []).forEach((r) => {
        const arr = roleMap.get(r.user_id) ?? [];
        arr.push(r.role); roleMap.set(r.user_id, arr);
      });
      return (profiles.data ?? []).map((p) => ({ ...p, roles: roleMap.get(p.id) ?? [] }));
    },
  });

  async function promote() {
    if (!email.trim()) return;
    const { data, error } = await supabase.rpc("promote_admin_by_email", { _email: email.trim() });
    if (error) return toast.error(error.message);
    if (data) { toast.success(`${email} promovido a administrador`); setEmail(""); qc.invalidateQueries({ queryKey: ["admin_users"] }); }
    else toast.error("Utilizador não encontrado");
  }

  async function toggleAdmin(userId: string, isAdmin: boolean) {
    try {
      await setAdminFn({ data: { userId, makeAdmin: !isAdmin } });
      toast.success(isAdmin ? "Admin removido" : "Promovido a admin");
      qc.invalidateQueries({ queryKey: ["admin_users"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao alterar função");
    }
  }

  async function deleteUser(userId: string, label: string) {
    if (!confirm(`Remover definitivamente ${label}?`)) return;
    try {
      await removeFn({ data: { userId } });
      toast.success("Utilizador removido");
      qc.invalidateQueries({ queryKey: ["admin_users"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao remover utilizador");
    }
  }

  async function resetPassword(userId: string) {
    const password = passwords[userId]?.trim() ?? "";
    if (password.length < 6) { toast.error("A nova senha deve ter 6+ caracteres"); return; }
    try {
      await resetPasswordFn({ data: { userId, password } });
      setPasswords((current) => ({ ...current, [userId]: "" }));
      toast.success("Senha atualizada");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao atualizar senha");
    }
  }

  async function createUser() {
    if (!newEmail.trim() || newPass.length < 6) { toast.error("Email válido e senha com 6+ caracteres"); return; }
    setCreating(true);
    try {
      await createFn({ data: { email: newEmail.trim(), password: newPass, fullName: newName.trim() || undefined, makeAdmin: newIsAdmin } });
      toast.success(newIsAdmin ? "Administrador criado" : "Utilizador criado");
      setNewEmail(""); setNewPass(""); setNewName(""); setNewIsAdmin(false);
      qc.invalidateQueries({ queryKey: ["admin_users"] });
    } catch (e: any) { toast.error(e.message ?? "Falha ao criar"); }
    finally { setCreating(false); }
  }

  const filtered = (rows ?? []).filter((u) => {
    const s = search.trim().toLowerCase();
    if (!s) return true;
    return `${u.full_name ?? ""} ${u.email ?? ""}`.toLowerCase().includes(s);
  });

  return (
    <div className="animate-fade-up space-y-4">
      <h2 className="text-xl font-semibold">Utilizadores</h2>

      <form onSubmit={(event) => { event.preventDefault(); void createUser(); }} className="surface-card p-4 space-y-3">
        <div className="text-sm font-medium flex items-center gap-2"><UserCog className="w-4 h-4" /> Criar novo utilizador (com email e senha)</div>
        <div className="grid gap-2 md:grid-cols-4">
          <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Nome completo" className="h-10 rounded-full bg-surface-variant px-4 outline-none focus:ring-2 focus:ring-primary" />
          <input value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="Email" type="email" required autoComplete="off" className="min-w-0 h-10 rounded-full bg-surface-variant px-4 outline-none focus:ring-2 focus:ring-primary" />
          <input value={newPass} onChange={(e) => setNewPass(e.target.value)} placeholder="Senha (6+)" type="password" required minLength={6} autoComplete="new-password" className="min-w-0 h-10 rounded-full bg-surface-variant px-4 outline-none focus:ring-2 focus:ring-primary" />
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 text-sm flex-1">
              <input type="checkbox" checked={newIsAdmin} onChange={(e) => setNewIsAdmin(e.target.checked)} /> Admin
            </label>
            <Button type="submit" disabled={creating} className="h-10 rounded-full">
              <UserPlus className="w-4 h-4" /> {creating ? "..." : "Criar"}
            </Button>
          </div>
        </div>
      </form>

      <div className="surface-card p-4 flex flex-wrap gap-2 items-center">
        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email para promover a admin (utilizador existente)" className="flex-1 min-w-64 h-10 rounded-full bg-surface-variant px-4 outline-none focus:ring-2 focus:ring-primary" />
        <button onClick={promote} className="inline-flex items-center gap-2 h-10 px-4 rounded-full bg-primary text-primary-foreground text-sm">
          <UserPlus className="w-4 h-4" /> Promover
        </button>
      </div>

      <div className="surface-card p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Pesquisar utilizador por nome ou email" className="w-full h-10 rounded-full bg-surface-variant pl-10 pr-4 outline-none focus:ring-2 focus:ring-primary" />
        </div>
      </div>


      <div className="space-y-3">
            {filtered.length === 0 ? (
              <div className="surface-card py-8 text-center text-muted-foreground">Sem utilizadores.</div>
            ) : filtered.map((u) => {
              const isAdmin = u.roles.includes("admin");
              const label = u.email || u.full_name || "este utilizador";
              return (
                <article key={u.id} className="surface-card p-4 flex flex-col gap-3">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-medium truncate">{u.full_name || "Sem nome"}</div>
                      <div className="text-sm text-muted-foreground truncate">{u.email}</div>
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        {isAdmin ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary-container text-primary-container-foreground">Admin</span> : <span>Utilizador</span>}
                        <span>Registado: {new Date(u.created_at).toLocaleDateString("pt-PT")}</span>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button onClick={() => toggleAdmin(u.id, isAdmin)} className="inline-flex items-center gap-1 text-xs px-3 py-2 rounded-full bg-secondary hover:shadow-elevation-1">
                      {isAdmin ? <><ShieldOff className="w-3 h-3" /> Remover</> : <><Shield className="w-3 h-3" /> Tornar Admin</>}
                      </button>
                      <button onClick={() => deleteUser(u.id, label)} className="inline-flex items-center gap-1 text-xs px-3 py-2 rounded-full bg-destructive/10 text-destructive hover:shadow-elevation-1">
                        <Trash2 className="w-3 h-3" /> Remover utilizador
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                    <input
                      value={passwords[u.id] ?? ""}
                      onChange={(e) => setPasswords((current) => ({ ...current, [u.id]: e.target.value }))}
                      placeholder="Nova senha (opcional)"
                      type="password"
                      className="h-10 rounded-full bg-surface-variant px-4 outline-none focus:ring-2 focus:ring-primary flex-1"
                    />
                    <button onClick={() => resetPassword(u.id)} className="inline-flex items-center justify-center gap-1.5 h-10 px-4 rounded-full bg-surface-variant text-sm">
                      <KeyRound className="w-4 h-4" /> Alterar senha
                    </button>
                  </div>
                </article>
              );
            })}
      </div>
    </div>
  );
}
