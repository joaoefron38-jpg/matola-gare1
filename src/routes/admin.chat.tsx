import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Send, Mic, Square, Trash2, Circle, Loader2, Users, ChevronDown, MessageSquare } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/chat")({
  head: () => ({ meta: [
    { title: "Chat Administrativo — Matola Gare" },
    { name: "description", content: "Conversas e mensagens de áudio entre administradores da Matola Gare." },
    { property: "og:title", content: "Chat Administrativo — Matola Gare" },
    { property: "og:description", content: "Comunicação da equipa administrativa da Matola Gare." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }), component: AdminChat,
});

type Msg = { id: string; user_id: string; email: string | null; full_name: string | null; content: string | null; audio_url: string | null; created_at: string };

function AdminChat() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordSecs, setRecordSecs] = useState(0);
  const [showTeam, setShowTeam] = useState(false);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const cancelledRef = useRef(false);
  const chunksRef = useRef<Blob[]>([]);
  const listRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<number | null>(null);

  const { data: messages = [], isPending, isError } = useQuery({
    queryKey: ["admin_chat"],
    queryFn: async () => {
      const { data, error } = await supabase.from("admin_messages").select("*").order("created_at", { ascending: false }).limit(200);
      if (error) throw error;
      return ((data ?? []) as Msg[]).reverse();
    },
  });

  const { data: team = [] } = useQuery({
    queryKey: ["admin_online"], refetchInterval: 30000,
    queryFn: async () => {
      const { data: roles, error: roleError } = await supabase.from("user_roles").select("user_id").eq("role", "admin");
      if (roleError) throw roleError;
      const ids = (roles ?? []).map((r) => r.user_id);
      if (!ids.length) return [];
      const [profiles, presence] = await Promise.all([
        supabase.from("profiles").select("id,email,full_name").in("id", ids),
        supabase.from("online_presence").select("user_id,last_seen_at").in("user_id", ids),
      ]);
      if (profiles.error) throw profiles.error;
      if (presence.error) throw presence.error;
      const seen = new Map((presence.data ?? []).map((p) => [p.user_id, p.last_seen_at]));
      return (profiles.data ?? []).map((p) => ({ ...p, online: p.id === user?.id || new Date(seen.get(p.id) ?? 0).getTime() > Date.now() - 60000 })).sort((a, b) => Number(b.online) - Number(a.online));
    },
  });
  const onlineCount = team.filter((p) => p.online).length;

  useEffect(() => {
    const ch = supabase.channel("admin_messages_rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "admin_messages" }, () => { qc.invalidateQueries({ queryKey: ["admin_chat"] }); })
      .on("postgres_changes", { event: "*", schema: "public", table: "online_presence" }, () => { qc.invalidateQueries({ queryKey: ["admin_online"] }); })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [qc]);

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages.length]);

  useEffect(() => () => {
    cancelledRef.current = true;
    if (mediaRef.current?.state === "recording") mediaRef.current.stop();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

  async function send(payload: { content?: string; audio_url?: string }) {
    if (!user) return;
    setSending(true);
    try {
      const { error } = await supabase.from("admin_messages").insert({
        user_id: user.id, email: user.email ?? null, full_name: user.user_metadata?.full_name ?? null,
        content: payload.content ?? null, audio_url: payload.audio_url ?? null,
      });
      if (error) throw error;
      if (payload.content) setText("");
      await qc.invalidateQueries({ queryKey: ["admin_chat"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao enviar mensagem");
    } finally { setSending(false); }
  }

  async function startRecording() {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") { toast.error("Este dispositivo não permite gravar áudio."); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mime = ["audio/webm", "audio/mp4"].find((type) => MediaRecorder.isTypeSupported(type));
      const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      cancelledRef.current = false;
      chunksRef.current = [];
      rec.ondataavailable = (ev) => { if (ev.data.size) chunksRef.current.push(ev.data); };
      rec.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        if (cancelledRef.current) return;
        const type = rec.mimeType || "audio/webm";
        const blob = new Blob(chunksRef.current, { type });
        if (!blob.size) { toast.error("Gravação vazia"); return; }
        setSending(true);
        try {
          const ext = type.includes("mp4") ? "m4a" : "webm";
          const path = `admin-chat/${crypto.randomUUID()}.${ext}`;
          const { error: uploadError } = await supabase.storage.from("media").upload(path, blob, { contentType: type, upsert: false });
          if (uploadError) throw uploadError;
          const { data: signed, error } = await supabase.storage.from("media").createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
          if (error || !signed) throw error ?? new Error("Não foi possível guardar o áudio");
          await send({ audio_url: signed.signedUrl });
        } catch (e) { toast.error(e instanceof Error ? e.message : "Falha ao enviar áudio"); }
        finally { setSending(false); }
      };
      rec.start(); mediaRef.current = rec; setRecording(true); setRecordSecs(0);
      timerRef.current = window.setInterval(() => setRecordSecs((s) => s + 1), 1000);
    } catch { streamRef.current?.getTracks().forEach((t) => t.stop()); toast.error("Sem acesso ao microfone"); }
  }

  function stopRecording(cancel: boolean) {
    cancelledRef.current = cancel;
    if (mediaRef.current?.state === "recording") mediaRef.current.stop();
    mediaRef.current = null; setRecording(false);
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  }

  async function deleteMsg(id: string) {
    if (!confirm("Apagar esta mensagem?")) return;
    const { error } = await supabase.from("admin_messages").delete().eq("id", id);
    if (error) toast.error(error.message);
    else await qc.invalidateQueries({ queryKey: ["admin_chat"] });
  }

  return (
    <div className="animate-fade-up grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_260px]">
      <section className="flex h-[68dvh] min-h-80 min-w-0 flex-col overflow-hidden rounded-lg border border-border bg-card">
        <header className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
          <div className="min-w-0">
            <h2 className="flex items-center gap-2 font-semibold"><MessageSquare className="h-4 w-4 text-primary" /> Chat Administrativo</h2>
            <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground"><Circle className="h-2 w-2 fill-success text-success" /> {onlineCount} online · {messages.length} mensagens</p>
          </div>
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setShowTeam((s) => !s)} aria-label="Mostrar administradores" aria-expanded={showTeam} title="Administradores"><Users /></Button>
        </header>
        <div ref={listRef} role="log" aria-label="Mensagens do chat" className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3 sm:p-4">
          {isPending ? <div className="grid h-full place-items-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div> : isError ? <div className="py-8 text-center text-sm text-destructive">Não foi possível carregar as mensagens.<Button variant="ghost" onClick={() => qc.invalidateQueries({ queryKey: ["admin_chat"] })}>Tentar novamente</Button></div> : messages.length === 0 ? <div className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground"><MessageSquare className="h-8 w-8" /><p className="text-sm">Ainda não há mensagens.</p></div> : messages.map((m, i) => {
            const mine = m.user_id === user?.id;
            const day = new Date(m.created_at).toLocaleDateString("pt-PT", { day: "numeric", month: "long", year: "numeric" });
            const newDay = i === 0 || new Date(messages[i - 1].created_at).toDateString() !== new Date(m.created_at).toDateString();
            return <div key={m.id}>
              {newDay && <div className="my-4 text-center text-xs text-muted-foreground">{day}</div>}
              <div className={`flex items-end gap-2 ${mine ? "justify-end" : "justify-start"}`}>
                {!mine && <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-primary-container text-xs font-semibold text-primary-container-foreground">{(m.full_name || m.email || "A").slice(0, 1).toUpperCase()}</span>}
                <div className={`min-w-0 max-w-[85%] rounded-lg px-3 py-2 text-sm ${mine ? "bg-primary text-primary-foreground" : "bg-surface-variant"}`}>
                  <p className="mb-1 truncate text-xs font-semibold">{mine ? "Você" : m.full_name || m.email || "Administrador"}</p>
                  {m.content && <div className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]">{m.content}</div>}
                  {m.audio_url && <audio controls preload="none" src={m.audio_url} className="mt-1 w-64 max-w-full" />}
                  <div className="mt-1 flex items-center justify-end gap-2"><time className="text-[10px] opacity-80">{new Date(m.created_at).toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" })}</time>{mine && <Button variant="ghost" size="icon" className="h-6 w-6 text-inherit" onClick={() => deleteMsg(m.id)} aria-label="Apagar mensagem" title="Apagar mensagem"><Trash2 className="h-3 w-3" /></Button>}</div>
                </div>
              </div>
            </div>;
          })}
        </div>
        <form onSubmit={(e) => { e.preventDefault(); if (text.trim() && !sending) void send({ content: text.trim() }); }} className="flex items-center gap-2 border-t border-border p-3">
          {recording ? <>
            <div className="flex min-w-0 flex-1 items-center gap-2 text-sm text-destructive"><Circle className="h-3 w-3 shrink-0 animate-pulse fill-destructive" /> {Math.floor(recordSecs / 60)}:{String(recordSecs % 60).padStart(2, "0")}</div>
            <Button variant="ghost" size="icon" onClick={() => stopRecording(true)} type="button" title="Cancelar áudio" aria-label="Cancelar áudio"><Trash2 /></Button>
            <Button size="icon" onClick={() => stopRecording(false)} type="button" title="Enviar áudio" aria-label="Enviar áudio"><Square /></Button>
          </> : <>
            <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Escreva uma mensagem..." aria-label="Mensagem" className="h-10 min-w-0 flex-1 rounded-lg bg-surface-variant px-3 outline-none focus:ring-2 focus:ring-primary" disabled={sending} />
            <Button variant="secondary" size="icon" type="button" onClick={startRecording} disabled={sending} aria-label="Gravar áudio" title="Gravar áudio"><Mic /></Button>
            <Button size="icon" type="submit" disabled={sending || !text.trim()} aria-label="Enviar" title="Enviar mensagem">{sending ? <Loader2 className="animate-spin" /> : <Send />}</Button>
          </>}
        </form>
      </section>
      <aside className={`${showTeam ? "block" : "hidden"} min-w-0 border-border lg:block lg:border-l lg:pl-4`}>
        <h3 className="mb-4 flex items-center gap-2 font-semibold"><Users className="h-4 w-4 text-primary" /> Administradores ({team.length})<ChevronDown className="ml-auto h-4 w-4 lg:hidden" /></h3>
        <ul className="space-y-4">{team.map((a) => <li key={a.id} className="flex min-w-0 items-center gap-3">
          <span className="relative grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary-container font-semibold text-primary-container-foreground">{(a.full_name || a.email || "A").slice(0, 1).toUpperCase()}<span className={`absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-background ${a.online ? "bg-success" : "bg-muted-foreground"}`} /></span>
          <div className="min-w-0"><p className="truncate text-sm font-medium">{a.full_name || a.email || "Administrador"}{a.id === user?.id ? " (você)" : ""}</p><p className={`text-xs ${a.online ? "text-success" : "text-muted-foreground"}`}>{a.online ? "Online" : "Offline"}</p></div>
        </li>)}</ul>
      </aside>
    </div>
  );
}
