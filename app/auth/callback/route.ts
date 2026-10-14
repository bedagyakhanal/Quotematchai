import { type EmailOtpType } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { Database } from "@/types/database.types";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next") ?? "/";

  // Check for errors returned directly by Supabase (e.g. otp_expired, access_denied)
  const authError = searchParams.get("error");
  const authErrorDescription = searchParams.get("error_description");

  // Determine base origin (support reverse proxy / x-forwarded-host)
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto") || "https";
  const isLocalEnv = process.env.NODE_ENV === "development";
  const baseOrigin = isLocalEnv
    ? origin
    : forwardedHost
    ? `${forwardedProto}://${forwardedHost}`
    : origin;

  if (authError || authErrorDescription) {
    const errorUrl = new URL("/login", baseOrigin);
    errorUrl.searchParams.set("error", authError || "auth_error");
    if (authErrorDescription) {
      errorUrl.searchParams.set("error_description", authErrorDescription);
    }
    return NextResponse.redirect(errorUrl);
  }

  if (code || (tokenHash && type)) {
    const cookieStore = await cookies();

    // Prepare redirect response object where cookies will be explicitly set
    const targetUrl = new URL(next, baseOrigin);
    let intermediateResponse = NextResponse.redirect(targetUrl);

    const supabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
              intermediateResponse.cookies.set(name, value, options);
            });
          },
        },
      }
    );

    let exchangeError = null;

    if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      exchangeError = error;
    } else if (tokenHash && type) {
      const { error } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type,
      });
      exchangeError = error;
    }

    if (!exchangeError) {
      // Authenticated! Now query user profile to route directly without flash
      const {
        data: { user },
      } = await supabase.auth.getUser();

      let destination = next && next !== "/" ? next : null;

      if (!destination && user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .maybeSingle();

        if (profile?.role === "buyer") {
          destination = "/buyer";
        } else if (profile?.role === "seller") {
          destination = "/seller";
        } else {
          destination = "/onboarding/role";
        }
      }

      // Final redirect response with all cookies attached
      const finalUrl = new URL(destination || "/", baseOrigin);
      const finalResponse = NextResponse.redirect(finalUrl);

      // Explicitly transfer all cookies set during the exchange into the final response
      intermediateResponse.cookies.getAll().forEach((c) => {
        finalResponse.cookies.set(c);
      });

      return finalResponse;
    }

    console.error("[Auth Callback Error]", exchangeError.message);
    const failUrl = new URL("/login", baseOrigin);
    failUrl.searchParams.set("error", "callback_exchange_failed");
    failUrl.searchParams.set("error_description", exchangeError.message);
    return NextResponse.redirect(failUrl);
  }

  // Missing authentication tokens
  const noTokenUrl = new URL("/login", baseOrigin);
  noTokenUrl.searchParams.set("error", "missing_token");
  noTokenUrl.searchParams.set(
    "error_description",
    "Invalid or expired login link. Please request a new link."
  );
  return NextResponse.redirect(noTokenUrl);
}
