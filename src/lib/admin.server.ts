const PRIMARY_ADMIN_EMAILS = new Set(["efronjoao9@gmail.com", "efronjoao969@gmail.com"]);

type AdminContext = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any;
  userId: string;
};

function normalizeEmail(email?: string | null) {
  return (email ?? "").trim().toLowerCase();
}

function isPrimaryAdminEmail(email?: string | null) {
  return PRIMARY_ADMIN_EMAILS.has(normalizeEmail(email));
}

export async function assertCurrentUserIsAdmin(context: AdminContext) {
  const { data: isAdmin, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (error) throw new Error(error.message);
  if (!isAdmin) throw new Error("Apenas administradores podem executar esta ação.");
}

export async function createManagedUser(input: { email: string; password: string; fullName?: string; makeAdmin?: boolean }) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const email = normalizeEmail(input.email);
  const fullName = input.fullName?.trim() || email.split("@")[0];
  const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password: input.password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });
  if (error || !created?.user) throw new Error(error?.message ?? "Falha ao criar utilizador");

  const uid = created.user.id;
  const { error: profileError } = await supabaseAdmin.from("profiles").upsert({ id: uid, email, full_name: fullName }, { onConflict: "id" });
  if (profileError) throw new Error(profileError.message);

  const { error: roleError } = await supabaseAdmin.from("user_roles").upsert({ user_id: uid, role: "user" }, { onConflict: "user_id,role", ignoreDuplicates: true });
  if (roleError) throw new Error(roleError.message);

  if (input.makeAdmin) {
    const { error: adminRoleError } = await supabaseAdmin.from("user_roles").upsert({ user_id: uid, role: "admin" }, { onConflict: "user_id,role", ignoreDuplicates: true });
    if (adminRoleError) throw new Error(adminRoleError.message);
  }

  return { ok: true, id: uid };
}

export async function setManagedUserAdmin(input: { userId: string; makeAdmin: boolean }, actorUserId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: profile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("email")
    .eq("id", input.userId)
    .maybeSingle();
  if (profileError) throw new Error(profileError.message);
  if (!input.makeAdmin && input.userId === actorUserId) throw new Error("Não pode remover o seu próprio acesso de administrador.");
  if (!input.makeAdmin && isPrimaryAdminEmail(profile?.email)) throw new Error("Os administradores principais não podem perder acesso.");

  if (input.makeAdmin) {
    const { error } = await supabaseAdmin.from("user_roles").upsert({ user_id: input.userId, role: "admin" }, { onConflict: "user_id,role", ignoreDuplicates: true });
    if (error) throw new Error(error.message);
    return { ok: true };
  }

  const { error } = await supabaseAdmin.from("user_roles").delete().eq("user_id", input.userId).eq("role", "admin");
  if (error) throw new Error(error.message);
  return { ok: true };
}

export async function updateManagedUserPassword(input: { userId: string; password: string }) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { error } = await supabaseAdmin.auth.admin.updateUserById(input.userId, { password: input.password });
  if (error) throw new Error(error.message);
  return { ok: true };
}

export async function removeManagedUser(input: { userId: string }, actorUserId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  if (input.userId === actorUserId) throw new Error("Não pode remover a sua própria conta.");

  const { data: profile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("email")
    .eq("id", input.userId)
    .maybeSingle();
  if (profileError) throw new Error(profileError.message);
  if (isPrimaryAdminEmail(profile?.email)) throw new Error("Os administradores principais não podem ser removidos.");

  const cleanup = await Promise.all([
    supabaseAdmin.from("download_records").delete().eq("user_id", input.userId),
    supabaseAdmin.from("favorites").delete().eq("user_id", input.userId),
    supabaseAdmin.from("view_history").delete().eq("user_id", input.userId),
    supabaseAdmin.from("sessions_log").delete().eq("user_id", input.userId),
    supabaseAdmin.from("admin_messages").delete().eq("user_id", input.userId),
    supabaseAdmin.from("online_presence").delete().eq("user_id", input.userId),
    supabaseAdmin.from("user_roles").delete().eq("user_id", input.userId),
    supabaseAdmin.from("profiles").delete().eq("id", input.userId),
  ]);
  const cleanupError = cleanup.find((result) => result.error)?.error;
  if (cleanupError) throw new Error(cleanupError.message);

  const { error } = await supabaseAdmin.auth.admin.deleteUser(input.userId);
  if (error) throw new Error(error.message);
  return { ok: true };
}