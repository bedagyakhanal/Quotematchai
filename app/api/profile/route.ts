import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/server/auth";
import { jsonSuccess, handleApiError } from "@/lib/server/response";
import { Profile } from "@/types";


export async function GET(req: NextRequest) {
  try {
    const { user, supabase } = await requireAuth();

    const { data: profileRow, error } = await supabase
      .from("profiles")
      .select("id, email, display_name, role")
      .eq("id", user.id)
      .maybeSingle();

    if (error) {
      throw error;
    }

    const profile: Profile = profileRow
      ? {
          id: profileRow.id,
          email: profileRow.email,
          display_name: profileRow.display_name,
          role: profileRow.role,
        }
      : {
          id: user.id,
          email: user.email || "",
          display_name:
            user.user_metadata?.display_name ||
            user.email?.split("@")[0] ||
            "User",
          role: null,
        };

    return jsonSuccess<Profile>(profile);
  } catch (error) {
    return handleApiError(error, { route: "GET /api/profile" });
  }
}
