import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const getVapidPublicKey = createServerFn({ method: "GET" }).handler(async () => {
  const key = process.env["PUSH_VAPID_PUBLIC_KEY"];
  if (!key) throw new Error("Notificações não configuradas no servidor.");
  return key;
});

const SECTION_BY_TABLE: Record<string, { label: string; path: string }> = {
  library_items: { label: "Biblioteca", path: "/biblioteca" },
  knowledge_items: { label: "Sala do Conhecimento", path: "/sala-do-conhecimento" },
  gallery_items: { label: "Galeria", path: "/galeria" },
  news_items: { label: "Notícias", path: "/noticias" },
};

/** Envia uma notificação de nova publicação para todos os navegadores subscritos. */
export const notifyPublication = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({
      table: z.string().min(1).max(60),
      title: z.string().max(300).default(""),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!isAdmin) throw new Error("Apenas administradores podem notificar.");

    const section = SECTION_BY_TABLE[data.table];
    if (!section) return { sent: 0, failed: 0 };

    const publicKey = process.env["PUSH_VAPID_PUBLIC_KEY"];
    const privateKey = process.env["PUSH_VAPID_PRIVATE_KEY"];
    if (!publicKey || !privateKey) return { sent: 0, failed: 0 };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: subs, error } = await supabaseAdmin
      .from("push_subscriptions")
      .select("id,endpoint,p256dh,auth");
    if (error) throw new Error(error.message);
    if (!subs?.length) return { sent: 0, failed: 0 };

    const payload = JSON.stringify({
      title: "Nova publicação na Biblioteca Digital",
      body: data.title ? `${section.label}: ${data.title}` : `Nova publicação em ${section.label}.`,
      url: section.path,
    });

    const { ApplicationServerKeys, generatePushHTTPRequest } = await import("webpush-webcrypto");
    const keys = await ApplicationServerKeys.fromJSON({ publicKey, privateKey });

    let sent = 0;
    let failed = 0;
    const staleIds: string[] = [];

    await Promise.allSettled(
      subs.map(async (sub: { id: string; endpoint: string; p256dh: string; auth: string }) => {
        try {
          const { endpoint, body, headers } = await generatePushHTTPRequest({
            applicationServerKeys: keys,
            payload,
            target: { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            adminContact: "efronjoao9@gmail.com",
            ttl: 24 * 60 * 60,
            urgency: "normal",
          });
          const response = await fetch(endpoint, { method: "POST", headers, body });
          if (response.ok) {
            sent += 1;
          } else if (response.status === 404 || response.status === 410) {
            staleIds.push(sub.id);
          } else {
            failed += 1;
          }
        } catch {
          failed += 1;
        }
      }),
    );

    if (staleIds.length) await supabaseAdmin.from("push_subscriptions").delete().in("id", staleIds);

    return { sent, failed };
  });
