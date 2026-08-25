import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const listMyDownloadRecords = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("download_records")
      .select("id,title,url,name,kind,status,received,total,created_at,updated_at")
      .eq("user_id", context.userId)
      .order("updated_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const upsertMyDownloadRecord = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({
    title: z.string().trim().min(1).max(240),
    url: z.string().trim().url().max(4096),
    name: z.string().trim().min(1).max(240),
    kind: z.enum(["video", "image", "audio", "document"]),
    status: z.enum(["queued", "downloading", "done", "failed"]),
    received: z.number().int().nonnegative().optional(),
    total: z.number().int().nonnegative().nullable().optional(),
  }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("download_records").upsert({
      user_id: context.userId,
      title: data.title,
      url: data.url,
      name: data.name,
      kind: data.kind,
      status: data.status,
      received: data.received ?? 0,
      total: data.total ?? null,
    }, { onConflict: "user_id,url" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const verifyMyDownloadRecord = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("download_records")
      .select("id,title,url,name,kind,status")
      .eq("user_id", context.userId)
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row || row.status !== "done") throw new Error("Este ficheiro ainda não foi descarregado por esta conta.");
    return row;
  });

export const removeMyDownloadRecord = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("download_records")
      .delete()
      .eq("user_id", context.userId)
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const clearMyDownloadRecords = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { error } = await context.supabase
      .from("download_records")
      .delete()
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });