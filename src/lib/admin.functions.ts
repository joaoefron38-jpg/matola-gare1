import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const schema = z.object({
  email: z.string().trim().email().max(255),
  password: z.string().min(6).max(72),
  fullName: z.string().trim().max(120).optional(),
  makeAdmin: z.boolean().optional(),
});

export const createUserAsAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => schema.parse(input))
  .handler(async ({ data, context }) => {
    const { data: isAdmin, error: roleErr } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (roleErr) throw new Error(roleErr.message);
    if (!isAdmin) throw new Error("Apenas administradores podem criar utilizadores.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: data.fullName ?? data.email.split("@")[0] },
    });
    if (error || !created?.user) throw new Error(error?.message ?? "Falha ao criar utilizador");

    const uid = created.user.id;
    await supabaseAdmin.from("profiles").upsert({
      id: uid,
      email: data.email,
      full_name: data.fullName ?? data.email.split("@")[0],
    });
    await supabaseAdmin.from("user_roles").upsert({ user_id: uid, role: "user" });
    if (data.makeAdmin) {
      await supabaseAdmin.from("user_roles").upsert({ user_id: uid, role: "admin" });
    }
    return { ok: true, id: uid };
  });
