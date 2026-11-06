import { useRef, useState } from "react";
import { Upload, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const TEN_YEARS = 60 * 60 * 24 * 365 * 10;
const MAX_MB = 100;

function contentTypeFor(file: File) {
  if (file.type && file.type !== "application/octet-stream") return file.type;
  const extension = file.name.split(".").pop()?.toLowerCase();
  if (extension === "pdf") return "application/pdf";
  if (extension === "epub") return "application/epub+zip";
  return file.type || "application/octet-stream";
}

function uploadErrorMessage(xhr: XMLHttpRequest) {
  let detail = "";
  try {
    const body = JSON.parse(xhr.responseText) as { message?: string; error?: string };
    detail = body.message ?? body.error ?? "";
  } catch {
    detail = xhr.responseText;
  }

  if (xhr.status === 413 || /too large|exceeds.*size|payload too large/i.test(detail)) {
    return `O ficheiro ultrapassa o limite de ${MAX_MB} MB. Reduza o PDF e tente novamente.`;
  }
  if (xhr.status === 401 || xhr.status === 403) {
    return "A sessão do painel expirou ou não tem permissão para carregar ficheiros. Entre novamente e tente outra vez.";
  }
  if (xhr.status === 415) return "Este formato de ficheiro não é aceite pelo armazenamento.";

  const safeDetail = detail.trim().slice(0, 220);
  return safeDetail
    ? `Não foi possível carregar o ficheiro (${xhr.status}): ${safeDetail}`
    : `O armazenamento recusou o ficheiro (código ${xhr.status}). Tente novamente.`;
}

export function FileUpload({
  accept = "image/*",
  folder = "uploads",
  onUploaded,
}: {
  accept?: string;
  folder?: string;
  onUploaded: (url: string) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [fileName, setFileName] = useState("");

  async function handle(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_MB * 1024 * 1024) {
      toast.error(`Ficheiro demasiado grande (${(file.size / 1024 / 1024).toFixed(0)} MB). O máximo é ${MAX_MB} MB.`);
      if (ref.current) ref.current.value = "";
      return;
    }
    setBusy(true);
    setProgress(0);
    setFileName(file.name);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "bin";
      const path = `${folder}/${crypto.randomUUID()}.${ext}`;
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error("A sessão do painel expirou. Entre novamente e tente carregar o ficheiro.");
      const encodedPath = path.split("/").map(encodeURIComponent).join("/");
      const baseUrl = import.meta.env.VITE_SUPABASE_URL.replace(/\/$/, "");
      const url = `${baseUrl}/storage/v1/object/media/${encodedPath}`;
      const contentType = contentTypeFor(file);

      // XHR dá progresso real (o cliente de armazenamento não expõe progresso),
      // e mostra ao utilizador que o carregamento está a correr em vez de congelar a tela.
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", url);
         xhr.setRequestHeader("Authorization", `Bearer ${token}`);
        xhr.setRequestHeader("apikey", import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY);
        xhr.setRequestHeader("x-upsert", "false");
        xhr.setRequestHeader("cache-control", "31536000");
         xhr.setRequestHeader("content-type", contentType);
        xhr.timeout = 180000;
        xhr.upload.onprogress = (ev) => {
          if (ev.lengthComputable) setProgress(Math.round((ev.loaded / ev.total) * 100));
        };
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) resolve();
           else reject(new Error(uploadErrorMessage(xhr)));
        };
        xhr.onerror = () => reject(new Error("Falha de rede ao carregar o ficheiro. Verifique a ligação e tente novamente."));
        xhr.ontimeout = () => reject(new Error("O carregamento demorou demasiado. Tente novamente, de preferência com um ficheiro mais pequeno."));
        xhr.send(file);
      });

      const { data, error: sErr } = await supabase.storage.from("media").createSignedUrl(path, TEN_YEARS);
      if (sErr || !data) throw sErr ?? new Error("Falha ao gerar URL");
      onUploaded(data.signedUrl);
      toast.success("Ficheiro carregado");
    } catch (err: any) {
      toast.error(err?.message ?? "Erro ao carregar ficheiro");
    } finally {
      setBusy(false);
      setProgress(0);
      setFileName("");
      if (ref.current) ref.current.value = "";
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2">
        <input ref={ref} type="file" accept={accept} onChange={handle} className="hidden" />
        <button
          type="button"
          onClick={() => ref.current?.click()}
          disabled={busy}
          className="inline-flex items-center gap-2 h-9 px-3 rounded-full bg-secondary text-secondary-foreground text-xs hover:shadow-elevation-1 disabled:opacity-50"
        >
          {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
          {busy ? `A carregar ${progress}%…` : "Carregar ficheiro"}
        </button>
        {busy && fileName && <span className="text-xs text-muted-foreground truncate max-w-40">{fileName}</span>}
      </div>
      {busy && (
        <div className="h-1.5 w-40 rounded-full bg-surface-variant overflow-hidden">
          <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
        </div>
      )}
    </div>
  );
}
