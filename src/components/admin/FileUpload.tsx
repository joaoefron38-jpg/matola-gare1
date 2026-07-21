import { useRef, useState } from "react";
import { Upload, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const TEN_YEARS = 60 * 60 * 24 * 365 * 10;

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

  async function handle(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      const ext = file.name.split(".").pop() || "bin";
      const path = `${folder}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from("media").upload(path, file, {
        cacheControl: "31536000",
        upsert: false,
        contentType: file.type,
      });
      if (error) throw error;
      const { data, error: sErr } = await supabase.storage.from("media").createSignedUrl(path, TEN_YEARS);
      if (sErr || !data) throw sErr ?? new Error("Falha ao gerar URL");
      onUploaded(data.signedUrl);
      toast.success("Ficheiro carregado");
    } catch (err: any) {
      toast.error(err.message ?? "Erro ao carregar ficheiro");
    } finally {
      setBusy(false);
      if (ref.current) ref.current.value = "";
    }
  }

  return (
    <div className="flex items-center gap-2">
      <input ref={ref} type="file" accept={accept} onChange={handle} className="hidden" />
      <button
        type="button"
        onClick={() => ref.current?.click()}
        disabled={busy}
        className="inline-flex items-center gap-2 h-9 px-3 rounded-full bg-secondary text-secondary-foreground text-xs hover:shadow-elevation-1 disabled:opacity-50"
      >
        {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
        {busy ? "A carregar..." : "Carregar ficheiro"}
      </button>
    </div>
  );
}
