import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useTheme } from "@/hooks/use-theme";
import { supabase } from "@/integrations/supabase/client";
import {
  BookOpen, GraduationCap, Images, Newspaper, MapPin, Info, Menu, X, Search,
  Moon, Sun, LogOut, LayoutDashboard,
} from "lucide-react";

const NAV = [
  { to: "/biblioteca", label: "Biblioteca", icon: BookOpen },
  { to: "/sala-do-conhecimento", label: "Sala do Conhecimento", icon: GraduationCap },
  { to: "/galeria", label: "Galeria", icon: Images },
  { to: "/noticias", label: "Notícias", icon: Newspaper },
  { to: "/localizacao", label: "Localização", icon: MapPin },
  { to: "/sobre", label: "Sobre", icon: Info },
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isAdmin, user, signOut } = useAuth();
  const { theme, mounted, toggle } = useTheme();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const navigate = useNavigate();

  // Presence heartbeat
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    const ping = async () => {
      if (cancelled) return;
      await supabase.from("online_presence").upsert({
        user_id: user.id, last_seen_at: new Date().toISOString(), email: user.email ?? null,
      });
    };
    ping();
    const iv = setInterval(ping, 30000);
    return () => { cancelled = true; clearInterval(iv); };
  }, [user]);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-background/80 border-b border-border">
        <div className="mx-auto max-w-7xl px-4 h-16 flex items-center gap-3">
          <button
            className="md:hidden p-2 rounded-full hover:bg-accent"
            onClick={() => setOpen((v) => !v)}
            aria-label="Menu"
          >
            {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <Link to="/" className="flex items-center gap-2 shrink-0">
            <div className="w-9 h-9 rounded-xl bg-primary text-primary-foreground grid place-items-center font-bold shadow-elevation-1">
              MG
            </div>
            <span className="hidden sm:block font-semibold tracking-tight">Matola Gare</span>
          </Link>

          <form
            className="flex-1 max-w-xl mx-auto"
            onSubmit={(e) => {
              e.preventDefault();
              if (q.trim()) navigate({ to: "/pesquisa", search: { q } });
            }}
          >
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Pesquisar na plataforma..."
                className="w-full h-11 pl-11 pr-4 rounded-full bg-surface-variant border border-transparent focus:border-primary focus:bg-card focus:shadow-elevation-2 outline-none transition-all"
              />
            </div>
          </form>

          <div className="flex items-center gap-1">
            <button onClick={toggle} className="p-2 rounded-full hover:bg-accent" aria-label="Alternar tema">
              {mounted ? (theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />) : <Sun className="w-5 h-5 opacity-0" />}
            </button>

            {isAdmin && (
              <Link
                to="/admin"
                className="hidden sm:inline-flex items-center gap-2 h-10 px-4 rounded-full bg-primary-container text-primary-container-foreground hover:shadow-elevation-2 transition-shadow text-sm font-medium"
              >
                <LayoutDashboard className="w-4 h-4" /> Painel
              </Link>
            )}
            {isAuthenticated && (
              <button onClick={signOut} className="hidden md:inline-flex p-2 rounded-full hover:bg-accent" aria-label="Sair">
                <LogOut className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        <nav className="hidden md:block border-t border-border">
          <div className="mx-auto max-w-7xl px-4 flex items-center gap-1 overflow-x-auto">
            {NAV.map(({ to, label, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                className="inline-flex items-center gap-2 px-4 py-3 text-sm text-muted-foreground hover:text-foreground border-b-2 border-transparent hover:border-primary transition-colors whitespace-nowrap"
                activeProps={{ className: "text-primary border-primary font-medium" }}
              >
                <Icon className="w-4 h-4" /> {label}
              </Link>
            ))}
          </div>
        </nav>

        {open && (
          <div className="md:hidden border-t border-border bg-background animate-fade-in">
            <div className="p-2 flex flex-col">
              {NAV.map(({ to, label, icon: Icon }) => (
                <Link
                  key={to}
                  to={to}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-accent"
                >
                  <Icon className="w-5 h-5 text-primary" /> {label}
                </Link>
              ))}
              {isAuthenticated && (
                <>
                  {isAdmin && (
                    <Link to="/admin" onClick={() => setOpen(false)} className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-accent">
                      <LayoutDashboard className="w-5 h-5" /> Painel Admin
                    </Link>
                  )}
                  <button onClick={() => { signOut(); setOpen(false); }} className="text-left flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-accent">
                    <LogOut className="w-5 h-5" /> Sair
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-border mt-16">
        <div className="mx-auto max-w-7xl px-4 py-8 grid gap-4 md:grid-cols-3 items-center">
          <div>
            <div className="font-semibold">Escola Secundária da Matola Gare</div>
            <div className="text-sm text-muted-foreground">Matola Gare · Província de Maputo · Moçambique</div>
          </div>
          <div className="text-sm text-muted-foreground text-center">
            <Link to="/sobre" className="hover:text-foreground">Sobre</Link> ·{" "}
            <Link to="/visitar" className="hover:text-foreground">Visitar a Escola</Link> ·{" "}
            <Link to="/localizacao" className="hover:text-foreground">Localização</Link> ·{" "}
            <Link to="/auth" className="hover:text-foreground opacity-70">Administração</Link>
            <Link to="/localizacao" className="hover:text-foreground">Localização</Link>
          </div>
          <div className="text-sm text-muted-foreground md:text-right">
            Créditos · <span className="font-medium text-foreground">efRon QR</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export function EmptyState({ title, message, icon: Icon }: { title: string; message: string; icon?: React.ComponentType<{ className?: string }> }) {
  const I = Icon ?? BookOpen;
  return (
    <div className="mx-auto max-w-lg text-center py-20 animate-fade-up">
      <div className="mx-auto w-20 h-20 rounded-full bg-primary-container text-primary-container-foreground grid place-items-center mb-6">
        <I className="w-9 h-9" />
      </div>
      <h2 className="text-2xl font-semibold mb-2">{title}</h2>
      <p className="text-muted-foreground">{message}</p>
    </div>
  );
}
