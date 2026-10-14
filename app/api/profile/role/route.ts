import { NextRequest } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/server/auth";
import { jsonSuccess, handleApiError } from "@/lib/server/response";
import { Profile } from "@/types";

const setRoleSchema = z.object({
  role: z.enum(["buyer", "seller"], {
    message: "Role must be either 'buyer' or 'seller'.",
  }),
});

export async function POST(req: NextRequest) {
  let userId: string | undefined;

  try {
    const json = await req.json();
    const { role } = setRoleSchema.parse(json);

    const { user, supabase } = await requireAuth();
    userId = user.id;

    // Call Database Agent's set_my_role RPC
    const { data: updatedProfile, error } = await supabase.rpc("set_my_role", {
      p_role: role,
    });

    if (error) {
      throw error;
    }

    const profile: Profile = {
      id: updatedProfile.id,
      email: updatedProfile.email,
      display_name: updatedProfile.display_name,
      role: updatedProfile.role,
    };

    return jsonSuccess<Profile>(profile);
  } catch (error) {
    return handleApiError(error, { route: "POST /api/profile/role", userId });
  }
}
