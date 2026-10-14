import { User } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { ApiAppError } from "@/lib/server/response";
import { Profile, Role } from "@/types";

export interface AuthContext {
  user: User;
  profile: Profile;
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>;
}

/**
 * Extracts the authenticated user from the current Supabase session.
 * Returns null if no active session exists.
 */
export async function getSessionUser(): Promise<{
  user: User | null;
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>;
}> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return { user: null, supabase };
  }

  return { user, supabase };
}

/**
 * Requires an active authenticated session.
 * Throws UNAUTHORIZED (401) if no session exists.
 */
export async function requireAuth(): Promise<{
  user: User;
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>;
}> {
  const { user, supabase } = await getSessionUser();

  if (!user) {
    throw new ApiAppError(
      "UNAUTHORIZED",
      "Authentication required. Please sign in.",
      401
    );
  }

  return { user, supabase };
}

/**
 * Requires an active authenticated session AND a matching profile role.
 * Throws UNAUTHORIZED (401) if no session.
 * Throws WRONG_ROLE (403) if the profile has no role or a different role.
 */
export async function requireRole(expectedRole: Role): Promise<AuthContext> {
  const { user, supabase } = await requireAuth();

  const { data: profileRow, error } = await supabase
    .from("profiles")
    .select("id, email, display_name, role")
    .eq("id", user.id)
    .single();

  if (error || !profileRow) {
    // If profile not found in DB, user has no established role
    throw new ApiAppError(
      "WRONG_ROLE",
      `This action is restricted to ${expectedRole}s. Please complete role selection first.`,
      403
    );
  }

  if (profileRow.role !== expectedRole) {
    throw new ApiAppError(
      "WRONG_ROLE",
      `This action is restricted to ${expectedRole}s. Your account is registered as a ${profileRow.role || "pending role"}.`,
      403
    );
  }

  const profile: Profile = {
    id: profileRow.id,
    email: profileRow.email,
    display_name: profileRow.display_name,
    role: profileRow.role as Role,
  };

  return { user, profile, supabase };
}
