import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Shield, ShieldOff, UserPlus } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/utilizadores")({ component: Users });

function Users() {
  const qc = useQueryClient();
  const [email, setEmail] = useState("");

  const { data: rows } = useQuery({
    queryKey: ["admin_users"],
    queryFn: async () => {
      const [profiles, roles] = await Promise.all([
        supabase.from("profiles").select("*").order("created_at", { ascending: false }),
        supabase.from("user_roles").select("*"),
      ]);
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
    if (isAdmin) {
      const { error } = await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", "admin");
      if (error) return toast.error(error.message);
      toast.success("Admin removido");
    } else {
      const { error } = await supabase.from("user_roles").insert({ user_id: userId, role: "admin" });
      if (error) return toast.error(error.message);
      toast.success("Promovido a admin");
    }
    qc.invalidateQueries({ queryKey: ["admin_users"] });
  }

  return (
    <div className="animate-fade-up space-y-4">
      <h2 className="text-xl font-semibold">Utilizadores</h2>
      <div className="surface-card p-4 flex flex-wrap gap-2 items-center">
        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email para promover a admin" className="flex-1 min-w-64 h-10 rounded-full bg-surface-variant px-4 outline-none focus:ring-2 focus:ring-primary" />
        <button onClick={promote} className="inline-flex items-center gap-2 h-10 px-4 rounded-full bg-primary text-primary-foreground text-sm">
          <UserPlus className="w-4 h-4" /> Promover
        </button>
      </div>

      <div className="surface-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-surface-variant">
            <tr>
              <th className="text-left px-4 py-2">Nome</th>
              <th className="text-left px-4 py-2">Email</th>
              <th className="text-left px-4 py-2">Funções</th>
              <th className="text-left px-4 py-2">Registado</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {!rows || rows.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-8 text-muted-foreground">Sem utilizadores.</td></tr>
            ) : rows.map((u) => {
              const isAdmin = u.roles.includes("admin");
              return (
                <tr key={u.id} className="border-t border-border">
                  <td className="px-4 py-2">{u.full_name || "—"}</td>
                  <td className="px-4 py-2">{u.email}</td>
                  <td className="px-4 py-2">
                    {isAdmin ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary-container text-primary-container-foreground text-xs">Admin</span> : <span className="text-xs text-muted-foreground">Utilizador</span>}
                  </td>
                  <td className="px-4 py-2">{new Date(u.created_at).toLocaleDateString("pt-PT")}</td>
                  <td className="px-4 py-2 text-right">
                    <button onClick={() => toggleAdmin(u.id, isAdmin)} className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-full bg-secondary hover:shadow-elevation-1">
                      {isAdmin ? <><ShieldOff className="w-3 h-3" /> Remover</> : <><Shield className="w-3 h-3" /> Tornar Admin</>}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
