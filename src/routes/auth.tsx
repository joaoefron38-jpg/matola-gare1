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
            <p className="text-xs text-muted-foreground mt-3">
              Não precisa de conta para consultar os conteúdos. <Link to="/" className="text-primary hover:underline">Explorar como visitante →</Link>
            </p>
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
