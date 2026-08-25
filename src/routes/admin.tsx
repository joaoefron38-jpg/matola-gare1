import { createFileRoute, Link, useNavigate, Outlet, useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { LayoutDashboard, FileText, Users, MapPin, Info, Images, GraduationCap, BookOpen, Newspaper, Circle, MessageSquare, ArrowRight, PlusCircle } from "lucide-react";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Painel — Matola Gare" }, { name: "robots", content: "noindex" }] }),
  component: AdminLayout,
});

const TABS = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/admin/chat", label: "Chat Admin", icon: MessageSquare },
  { to: "/admin/biblioteca", label: "Biblioteca", icon: BookOpen },
  { to: "/admin/sala", label: "Sala", icon: GraduationCap },
  { to: "/admin/galeria", label: "Galeria", icon: Images },
  { to: "/admin/noticias", label: "Notícias", icon: Newspaper },
  { to: "/admin/escola", label: "Escola", icon: Info },
  { to: "/admin/localizacao", label: "Localização", icon: MapPin },
  { to: "/admin/utilizadores", label: "Utilizadores", icon: Users },
] as const;

const QUICK_ACTIONS = [
  { to: "/admin/biblioteca", label: "Publicar livro", desc: "Adicionar PDF, capa e download", icon: BookOpen },
  { to: "/admin/sala", label: "Publicar vídeo", desc: "Aulas e materiais da sala", icon: GraduationCap },
  { to: "/admin/noticias", label: "Criar notícia", desc: "Avisos com data simples", icon: Newspaper },
  { to: "/admin/utilizadores", label: "Gerir utilizadores", desc: "Criar, promover ou remover", icon: Users },
] as const;

function AdminLayout() {
  const { isAdmin, loading, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const path = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (loading) return;
    if (!isAuthenticated) navigate({ to: "/auth" });
    else if (!isAdmin) navigate({ to: "/" });
  }, [loading, isAuthenticated, isAdmin, navigate]);

  const isDashboard = path === "/admin" || path === "/admin/";

  return (
    <AppShell>
      <div className="mx-auto max-w-7xl px-4 py-8">
        <header className="mb-6 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Painel de Administração</h1>
            <p className="text-sm text-muted-foreground">Gerir conteúdos, utilizadores e configurações.</p>
          </div>
        </header>

        <div className="flex gap-1 overflow-x-auto border-b border-border mb-6">
          {TABS.map(({ to, label, icon: Icon }) => (
            <Link key={to} to={to} className="inline-flex items-center gap-2 px-4 py-2.5 text-sm border-b-2 border-transparent text-muted-foreground hover:text-foreground whitespace-nowrap"
              activeProps={{ className: "text-primary border-primary font-medium" }}
              activeOptions={{ exact: to === "/admin" }}>
              <Icon className="w-4 h-4" /> {label}
            </Link>
          ))}
        </div>

        {isDashboard ? <Dashboard /> : <Outlet />}
      </div>
    </AppShell>
  );
}

function Dashboard() {
  const { data: stats } = useQuery({
    queryKey: ["admin_stats"],
    refetchInterval: 15000,
    queryFn: async () => {
      const [lib, kn, gal, news, users, presence] = await Promise.all([
        supabase.from("library_items").select("id", { count: "exact", head: true }),
        supabase.from("knowledge_items").select("id", { count: "exact", head: true }),
        supabase.from("gallery_items").select("id", { count: "exact", head: true }),
        supabase.from("news_items").select("id", { count: "exact", head: true }),
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("online_presence").select("*").gte("last_seen_at", new Date(Date.now() - 60_000).toISOString()),
      ]);
      return {
        library: lib.count ?? 0, knowledge: kn.count ?? 0, gallery: gal.count ?? 0,
        news: news.count ?? 0, users: users.count ?? 0,
        online: presence.data ?? [],
      };
    },
  });

  const { data: recentLogins } = useQuery({
    queryKey: ["recent_logins"],
    queryFn: async () => (await supabase.from("sessions_log").select("*").order("logged_at", { ascending: false }).limit(10)).data ?? [],
  });

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {QUICK_ACTIONS.map(({ to, label, desc, icon: Icon }) => (
          <Link key={to} to={to} className="surface-card surface-card-hover p-4 flex items-center gap-3 group">
            <div className="w-11 h-11 rounded-2xl bg-primary-container text-primary-container-foreground grid place-items-center shrink-0">
              <Icon className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-medium flex items-center gap-1">
                {label} <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
              </div>
              <p className="text-xs text-muted-foreground line-clamp-1">{desc}</p>
            </div>
          </Link>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard label="Biblioteca" value={stats?.library ?? 0} icon={BookOpen} />
        <StatCard label="Sala do Conhecimento" value={stats?.knowledge ?? 0} icon={GraduationCap} />
        <StatCard label="Galeria" value={stats?.gallery ?? 0} icon={Images} />
        <StatCard label="Notícias" value={stats?.news ?? 0} icon={Newspaper} />
        <StatCard label="Utilizadores" value={stats?.users ?? 0} icon={Users} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="surface-card p-6">
          <h2 className="font-semibold flex items-center gap-2 mb-3">
            <Circle className="w-3 h-3 fill-success text-success animate-pulse" /> Utilizadores Online ({stats?.online.length ?? 0})
          </h2>
          {(stats?.online.length ?? 0) === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum utilizador online no momento.</p>
          ) : (
            <ul className="divide-y divide-border">
              {stats!.online.map((o) => (
                <li key={o.user_id} className="py-2 flex items-center justify-between text-sm">
                  <span>{o.email || o.user_id.slice(0, 8)}</span>
                  <span className="text-xs text-muted-foreground">{new Date(o.last_seen_at).toLocaleTimeString("pt-PT")}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="surface-card p-6">
          <h2 className="font-semibold flex items-center gap-2 mb-3"><Users className="w-4 h-4 text-primary" /> Logins Recentes</h2>
          {!recentLogins || recentLogins.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sem registos.</p>
          ) : (
            <ul className="divide-y divide-border">
              {recentLogins.map((l) => (
                <li key={l.id} className="py-2 flex items-center justify-between text-sm">
                  <span className="truncate">{l.email || "—"}</span>
                  <span className="text-xs text-muted-foreground">{new Date(l.logged_at).toLocaleString("pt-PT")}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="surface-card p-6">
        <h2 className="font-semibold flex items-center gap-2 mb-4"><PlusCircle className="w-4 h-4 text-primary" /> Navegação rápida</h2>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {TABS.filter((tab) => tab.to !== "/admin").map(({ to, label, icon: Icon }) => (
            <Link key={to} to={to} className="flex items-center justify-between gap-3 rounded-xl bg-surface-variant px-4 py-3 text-sm hover:shadow-elevation-1 transition-shadow">
              <span className="inline-flex items-center gap-2"><Icon className="w-4 h-4 text-primary" /> {label}</span>
              <ArrowRight className="w-4 h-4 text-muted-foreground" />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon: Icon }: { label: string; value: number; icon: React.ComponentType<{ className?: string }> }) {
  return (
    <div className="surface-card p-5 flex items-center gap-4">
      <div className="w-11 h-11 rounded-2xl bg-primary-container text-primary-container-foreground grid place-items-center">
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <div className="text-2xl font-bold">{value}</div>
        <div className="text-xs text-muted-foreground">{label}</div>
      </div>
    </div>
  );
}
