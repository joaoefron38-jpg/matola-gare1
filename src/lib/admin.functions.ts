import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import {
  assertCurrentUserIsAdmin,
  createManagedUser,
  removeManagedUser,
  setManagedUserAdmin,
  updateManagedUserPassword,
} from "./admin.server";

export const createUserAsAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({
    email: z.string().trim().email().max(255),
    password: z.string().min(6).max(72),
    fullName: z.string().trim().max(120).optional(),
    makeAdmin: z.boolean().optional(),
  }).parse(input))
  .handler(async ({ data, context }) => {
    await assertCurrentUserIsAdmin(context);
    return createManagedUser(data);
  });

export const setUserAdminAsAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({
    userId: z.string().uuid(),
    makeAdmin: z.boolean(),
  }).parse(input))
  .handler(async ({ data, context }) => {
    await assertCurrentUserIsAdmin(context);
    return setManagedUserAdmin(data, context.userId);
  });

export const updateUserPasswordAsAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({
    userId: z.string().uuid(),
    password: z.string().min(6).max(72),
  }).parse(input))
  .handler(async ({ data, context }) => {
    await assertCurrentUserIsAdmin(context);
    return updateManagedUserPassword(data);
  });

export const removeUserAsAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ userId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertCurrentUserIsAdmin(context);
    return removeManagedUser(data, context.userId);
  });
