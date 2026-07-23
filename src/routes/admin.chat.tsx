import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Send, Mic, Square, Trash2, Circle, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/chat")({ component: AdminChat });

type Msg = {
  id: string;
  user_id: string;
  email: string | null;
  full_name: string | null;
  content: string | null;
  audio_url: string | null;
  created_at: string;
};

function AdminChat() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordSecs, setRecordSecs] = useState(0);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const listRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<number | null>(null);

  const { data: messages = [] } = useQuery({
    queryKey: ["admin_chat"],
    queryFn: async () => {
      const { data } = await supabase
        .from("admin_messages")
        .select("*")
        .order("created_at", { ascending: true })
        .limit(200);
      return (data ?? []) as Msg[];
    },
  });

  const { data: onlineAdmins = [] } = useQuery({
    queryKey: ["admin_online"],
    refetchInterval: 15000,
    queryFn: async () => {
      const since = new Date(Date.now() - 60_000).toISOString();
      const { data: presence } = await supabase
        .from("online_presence")
        .select("*")
        .gte("last_seen_at", since);
      if (!presence?.length) return [];
      const ids = presence.map((p) => p.user_id);
      const { data: roles } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "admin")
        .in("user_id", ids);
      const adminSet = new Set((roles ?? []).map((r) => r.user_id));
      return presence.filter((p) => adminSet.has(p.user_id));
    },
  });

  // Realtime subscription
  useEffect(() => {
    const ch = supabase
      .channel("admin_messages_rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "admin_messages" }, () => {
        qc.invalidateQueries({ queryKey: ["admin_chat"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "online_presence" }, () => {
        qc.invalidateQueries({ queryKey: ["admin_online"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [qc]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages.length]);

  async function send(payload: { content?: string; audio_url?: string }) {
    if (!user) return;
    setSending(true);
    try {
      const { error } = await supabase.from("admin_messages").insert({
        user_id: user.id,
        email: user.email ?? null,
        full_name: (user.user_metadata as any)?.full_name ?? null,
        content: payload.content ?? null,
        audio_url: payload.audio_url ?? null,
      });
      if (error) throw error;
      setText("");
    } catch (e: any) {
      toast.error(e.message ?? "Falha ao enviar");
    } finally {
      setSending(false);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    await send({ content: text.trim() });
  }

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/mp4";
      const rec = new MediaRecorder(stream, { mimeType: mime });
      chunksRef.current = [];
      rec.ondataavailable = (ev) => { if (ev.data.size) chunksRef.current.push(ev.data); };
      rec.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: mime });
        if (blob.size < 800) { toast.error("Gravação muito curta"); return; }
        try {
          setSending(true);
          const ext = mime.includes("mp4") ? "m4a" : "webm";
          const path = `admin-chat/${crypto.randomUUID()}.${ext}`;
          const { error: upErr } = await supabase.storage.from("media").upload(path, blob, {
            contentType: mime, upsert: false,
          });
          if (upErr) throw upErr;
          const { data: signed, error: sErr } = await supabase.storage
            .from("media").createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
          if (sErr || !signed) throw sErr ?? new Error("URL falhou");
          await send({ audio_url: signed.signedUrl });
        } catch (err: any) {
          toast.error(err.message ?? "Falha no áudio");
        } finally {
          setSending(false);
        }
      };
      rec.start();
      mediaRef.current = rec;
      setRecording(true);
      setRecordSecs(0);
      timerRef.current = window.setInterval(() => setRecordSecs((s) => s + 1), 1000);
    } catch (e: any) {
      toast.error("Sem acesso ao microfone");
    }
  }

  function stopRecording(cancel = false) {
    const rec = mediaRef.current;
    if (!rec) return;
    if (cancel) { chunksRef.current = []; }
    rec.stop();
    mediaRef.current = null;
    setRecording(false);
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  }

  async function deleteMsg(id: string) {
    const { error } = await supabase.from("admin_messages").delete().eq("id", id);
    if (error) toast.error(error.message);
  }

  return (
    <div className="animate-fade-up grid gap-4 lg:grid-cols-[1fr_260px]">
      <div className="surface-card flex flex-col h-[70vh] overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center gap-2">
          <h2 className="font-semibold">Chat Administrativo</h2>
          <span className="text-xs text-muted-foreground">· {messages.length} mensagens</span>
        </div>
        <div ref={listRef} className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-10">Sem mensagens ainda. Diga olá 👋</p>
          ) : messages.map((m) => {
            const mine = m.user_id === user?.id;
            return (
              <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${mine ? "bg-primary text-primary-foreground" : "bg-surface-variant"}`}>
                  <div className={`text-[10px] mb-0.5 ${mine ? "opacity-80" : "text-muted-foreground"}`}>
                    {m.full_name || m.email || "Admin"} · {new Date(m.created_at).toLocaleTimeString("pt-PT",{hour:"2-digit",minute:"2-digit"})}
                  </div>
                  {m.content && <div className="whitespace-pre-wrap break-words">{m.content}</div>}
                  {m.audio_url && (
                    <audio controls src={m.audio_url} className="mt-1 max-w-full" />
                  )}
                  {mine && (
                    <button onClick={() => deleteMsg(m.id)} className="mt-1 text-[10px] opacity-70 hover:opacity-100 inline-flex items-center gap-1">
                      <Trash2 className="w-3 h-3" /> Apagar
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <form onSubmit={onSubmit} className="border-t border-border p-3 flex items-center gap-2">
          {recording ? (
            <>
              <div className="flex-1 flex items-center gap-2 text-sm text-destructive">
                <Circle className="w-3 h-3 fill-destructive text-destructive animate-pulse" />
                A gravar... {recordSecs}s
              </div>
              <button type="button" onClick={() => stopRecording(true)} className="h-10 px-3 rounded-full bg-secondary text-sm">
                Cancelar
              </button>
              <button type="button" onClick={() => stopRecording(false)} className="h-10 w-10 grid place-items-center rounded-full bg-primary text-primary-foreground">
                <Square className="w-4 h-4" />
              </button>
            </>
          ) : (
            <>
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Escreva uma mensagem..."
                className="flex-1 h-10 rounded-full bg-surface-variant px-4 outline-none focus:ring-2 focus:ring-primary"
                disabled={sending}
              />
              <button type="button" onClick={startRecording} disabled={sending} className="h-10 w-10 grid place-items-center rounded-full bg-secondary hover:shadow-elevation-1" aria-label="Gravar áudio">
                <Mic className="w-4 h-4" />
              </button>
              <button type="submit" disabled={sending || !text.trim()} className="h-10 w-10 grid place-items-center rounded-full bg-primary text-primary-foreground disabled:opacity-50" aria-label="Enviar">
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </>
          )}
        </form>
      </div>

      <aside className="surface-card p-4 h-fit">
        <h3 className="font-semibold flex items-center gap-2 mb-3">
          <Circle className="w-3 h-3 fill-success text-success animate-pulse" />
          Admins online ({onlineAdmins.length})
        </h3>
        {onlineAdmins.length === 0 ? (
          <p className="text-xs text-muted-foreground">Nenhum admin online.</p>
        ) : (
          <ul className="space-y-2">
            {onlineAdmins.map((a) => (
              <li key={a.user_id} className="flex items-center gap-2 text-sm">
                <span className="w-2 h-2 rounded-full bg-success" />
                <span className="truncate">{a.email || a.user_id.slice(0, 8)}</span>
              </li>
            ))}
          </ul>
        )}
      </aside>
    </div>
  );
}
