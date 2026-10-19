import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { User as UserIcon, Heart, Clock, LogOut } from "lucide-react";

export const Route = createFileRoute("/perfil")({
  head: () => ({ meta: [
    { title: "Meu Perfil — Matola Gare" },
    { name: "description", content: "Informações da conta e histórico de leitura Matola Gare." },
    { property: "og:title", content: "Meu Perfil — Matola Gare" },
    { property: "og:description", content: "Informações da conta e histórico de leitura Matola Gare." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
    
  ] }),
  component: Perfil,
});

function Perfil() {
  const { user, isAuthenticated, loading, signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !isAuthenticated) navigate({ to: "/auth" });
  }, [loading, isAuthenticated, navigate]);

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => (await supabase.from("profiles").select("*").eq("id", user!.id).maybeSingle()).data,
    enabled: !!user,
  });

  const { data: history } = useQuery({
    queryKey: ["view_history", user?.id],
    queryFn: async () => (await supabase.from("view_history").select("*").eq("user_id", user!.id).order("viewed_at", { ascending: false }).limit(20)).data ?? [],
    enabled: !!user,
  });

  if (!user) return <AppShell><div className="p-10 text-center">A carregar…</div></AppShell>;

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl px-4 py-10">
        <div className="surface-card p-6 md:p-8 animate-fade-up flex flex-col md:flex-row md:items-center gap-4">
          <div className="w-20 h-20 rounded-full bg-primary text-primary-foreground grid place-items-center text-2xl font-bold">
            {(profile?.full_name || user.email || "U").charAt(0).toUpperCase()}
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">{profile?.full_name || "Sem nome"}</h1>
            <p className="text-muted-foreground">{user.email}</p>
          </div>
          <button onClick={signOut} className="inline-flex items-center gap-2 h-10 px-4 rounded-full bg-secondary text-secondary-foreground hover:shadow-elevation-1">
            <LogOut className="w-4 h-4" /> Sair
          </button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 mt-6">
          <Link to="/favoritos" className="surface-card surface-card-hover p-6 flex items-center gap-4">
            <Heart className="w-8 h-8 text-primary" />
            <div><div className="font-semibold">Meus Favoritos</div><div className="text-sm text-muted-foreground">Conteúdos guardados</div></div>
          </Link>
          <div className="surface-card p-6 flex items-center gap-4">
            <UserIcon className="w-8 h-8 text-primary" />
            <div><div className="font-semibold">Conta</div><div className="text-sm text-muted-foreground">{user.email}</div></div>
          </div>
        </div>

        <div className="surface-card mt-6 p-6 animate-fade-up">
          <h2 className="font-semibold flex items-center gap-2 mb-3"><Clock className="w-5 h-5 text-primary" /> Histórico Recente</h2>
          {!history || history.length === 0 ? (
            <p className="text-sm text-muted-foreground">Ainda não visualizou conteúdos.</p>
          ) : (
            <ul className="divide-y divide-border">
              {history.map((h) => (
                <li key={h.id} className="py-2.5 flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium">{h.title || "Item"}</div>
                    <div className="text-xs text-muted-foreground">{new Date(h.viewed_at).toLocaleString("pt-PT")}</div>
                  </div>
                  <span className="text-xs uppercase text-muted-foreground">{h.item_type}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </AppShell>
  );
}
