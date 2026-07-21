import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { Mail, Lock, User as UserIcon } from "lucide-react";
import { toast } from "sonner";


export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Entrar — Matola Gare" }] }),
  component: Auth,
});

const emailSchema = z.string().trim().email("Email inválido").max(255);
const passwordSchema = z.string().min(6, "Mínimo 6 caracteres").max(72);

function Auth() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      emailSchema.parse(email); passwordSchema.parse(password);
    } catch (err: any) { toast.error(err.errors?.[0]?.message ?? "Dados inválidos"); return; }
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: { full_name: name },
          },
        });
        if (error) throw error;
        toast.success("Conta criada! Verifique o email para confirmar.");
        setMode("login");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Bem-vindo!");
        navigate({ to: "/" });
      }
    } catch (e: any) { toast.error(e.message ?? "Falha na autenticação"); }
    finally { setLoading(false); }
  }

  async function google() {
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (r.error) toast.error(r.error.message ?? "Falha no Google");
    else if (!r.redirected) navigate({ to: "/" });
  }

  return (
    <AppShell>
      <div className="min-h-[70vh] grid place-items-center px-4 py-10">
        <div className="w-full max-w-md surface-card p-8 animate-scale-in">
          <div className="text-center mb-6">
            <div className="w-14 h-14 rounded-2xl bg-primary text-primary-foreground grid place-items-center font-bold text-xl mx-auto mb-3">MG</div>
            <h1 className="text-2xl font-bold">{mode === "login" ? "Entrar" : "Criar Conta"}</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {mode === "login" ? "Aceda à plataforma da escola" : "Junte-se à comunidade Matola Gare"}
            </p>
          </div>

          <button onClick={google} className="w-full h-11 rounded-full border border-border font-medium hover:bg-accent flex items-center justify-center gap-2 transition-colors mb-4">
            <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
            Continuar com Google
          </button>

          <div className="flex items-center gap-3 text-xs text-muted-foreground my-4">
            <div className="flex-1 h-px bg-border" /> ou <div className="flex-1 h-px bg-border" />
          </div>

          <form onSubmit={onSubmit} className="space-y-3">
            {mode === "signup" && (
              <div className="relative">
                <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome completo" className="w-full h-11 pl-10 pr-4 rounded-full bg-surface-variant border border-transparent focus:border-primary outline-none" />
              </div>
            )}
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" required className="w-full h-11 pl-10 pr-4 rounded-full bg-surface-variant border border-transparent focus:border-primary outline-none" />
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Senha" required className="w-full h-11 pl-10 pr-4 rounded-full bg-surface-variant border border-transparent focus:border-primary outline-none" />
            </div>
            <button type="submit" disabled={loading} className="w-full h-11 rounded-full bg-primary text-primary-foreground font-medium hover:shadow-elevation-2 transition-shadow disabled:opacity-50">
              {loading ? "..." : mode === "login" ? "Entrar" : "Criar Conta"}
            </button>
          </form>

          <button onClick={() => setMode(mode === "login" ? "signup" : "login")} className="w-full mt-4 text-sm text-muted-foreground hover:text-foreground">
            {mode === "login" ? "Não tem conta? Criar" : "Já tem conta? Entrar"}
          </button>

          <div className="text-center mt-6">
            <Link to="/" className="text-sm text-primary hover:underline">← Voltar ao início</Link>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
