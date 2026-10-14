"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Mail, Lock, ArrowRight, CheckCircle2, RotateCcw, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { APP_NAME, IS_MOCK_MODE } from "@/lib/config";
import { useProfile } from "@/hooks/useProfile";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { getProfile } from "@/lib/api/profile";
import { queryKeys } from "@/lib/queries";

function LoginContent() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const nextUrl = searchParams.get("next") || "/";
  const { profile, role, isAuthenticated, isLoading } = useProfile();

  // Tab mode: 'magic' or 'password'
  const [authMethod, setAuthMethod] = useState<"magic" | "password">("magic");
  const [isSignUp, setIsSignUp] = useState(false);

  // Form fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");

  // States
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [awaitingVerification, setAwaitingVerification] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Cooldown timer for magic link resend
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const interval = setInterval(() => {
      setResendCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [resendCooldown]);

  // Check for error parameters passed back from auth callback / magic link
  useEffect(() => {
    const errorParam = searchParams.get("error");
    const errorDesc = searchParams.get("error_description");
    if (errorDesc) {
      toast.error(errorDesc);
    } else if (errorParam) {
      toast.error("Authentication link expired or invalid. Please request a new one.");
    }
  }, [searchParams]);

  // Listen for active Supabase auth events (including magic link tokens parsed from URL hash)
  useEffect(() => {
    if (IS_MOCK_MODE) return;
    const supabase = createBrowserSupabaseClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if ((event === "SIGNED_IN" || event === "TOKEN_REFRESHED") && session?.user) {
        const { data: prof } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", session.user.id)
          .maybeSingle();

        queryClient.invalidateQueries({ queryKey: queryKeys.profile });

        if (nextUrl && nextUrl !== "/") {
          router.push(nextUrl);
        } else if (prof?.role === "buyer") {
          router.push("/buyer");
        } else if (prof?.role === "seller") {
          router.push("/seller");
        } else {
          router.push("/onboarding/role");
        }
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [nextUrl, queryClient, router]);

  // If already authenticated with a role, redirect to appropriate destination
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      if (!role) {
        router.push("/onboarding/role");
      } else if (nextUrl && nextUrl !== "/") {
        router.push(nextUrl);
      } else {
        router.push(role === "buyer" ? "/buyer" : "/seller");
      }
    }
  }, [isAuthenticated, role, isLoading, nextUrl, router]);

  const validate = (): boolean => {
    let valid = true;
    setEmailError("");
    setPasswordError("");

    if (!email.trim()) {
      setEmailError("Please enter your email address.");
      valid = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setEmailError("Please enter a valid email address.");
      valid = false;
    }

    if (authMethod === "password") {
      if (!password) {
        setPasswordError("Password is required.");
        valid = false;
      } else if (password.length < 6) {
        setPasswordError("Password must be at least 6 characters.");
        valid = false;
      }
    }

    return valid;
  };

  const handleMagicLinkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      if (!IS_MOCK_MODE) {
        const supabase = createBrowserSupabaseClient();
        const callbackUrl = new URL("/auth/callback", window.location.origin);
        if (nextUrl && nextUrl !== "/") {
          callbackUrl.searchParams.set("next", nextUrl);
        }

        const { error } = await supabase.auth.signInWithOtp({
          email: email.trim(),
          options: {
            emailRedirectTo: callbackUrl.toString(),
            shouldCreateUser: true,
          },
        });
        if (error) throw error;
      } else {
        await new Promise((r) => setTimeout(r, 600));
      }

      setMagicLinkSent(true);
      setResendCooldown(60);
      toast.success("Magic link sent! Check your inbox.");
    } catch (err: any) {
      const msg = err?.message || "Could not send magic link. Please check your connection.";
      if (err?.code === "over_email_send_rate_limit" || msg.toLowerCase().includes("rate limit")) {
        setEmailError("Email rate limit reached. Please wait a few minutes or switch to the Password tab.");
        toast.error("Email rate limit reached. You can sign in with your password in the meantime.");
      } else {
        setEmailError(msg);
        toast.error(msg);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      let destination = nextUrl && nextUrl !== "/" ? nextUrl : null;

      if (!IS_MOCK_MODE) {
        const supabase = createBrowserSupabaseClient();
        if (isSignUp) {
          const { data, error } = await supabase.auth.signUp({
            email: email.trim(),
            password,
          });
          if (error) throw error;

          if (!data?.session) {
            setAwaitingVerification(true);
            toast.info("Please verify your email to select a role.");
            return;
          }

          if (!destination) {
            destination = "/onboarding/role";
          }
        } else {
          const { data, error } = await supabase.auth.signInWithPassword({
            email: email.trim(),
            password,
          });
          if (error) throw error;

          if (data?.user?.id && !destination) {
            const { data: prof } = await supabase
              .from("profiles")
              .select("role")
              .eq("id", data.user.id)
              .maybeSingle();

            if (prof?.role === "buyer") {
              destination = "/buyer";
            } else if (prof?.role === "seller") {
              destination = "/seller";
            } else {
              destination = "/onboarding/role";
            }
          }
        }

        queryClient.invalidateQueries({ queryKey: queryKeys.profile });
      } else {
        await new Promise((r) => setTimeout(r, 600));
        if (!destination) {
          destination = role === "buyer" ? "/buyer" : role === "seller" ? "/seller" : "/onboarding/role";
        }
      }

      toast.success(isSignUp ? "Account created successfully!" : "Signed in successfully!");
      router.push(destination || "/");
    } catch (err: any) {
      setPasswordError(err?.message || "Incorrect email or password. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 bg-slate-50">
      <Card className="w-full max-w-md border-slate-200 shadow-sm">
        <CardHeader className="text-center pb-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-slate-900 text-white font-bold text-lg mx-auto mb-2">
            QM
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight text-slate-900">
            {isSignUp ? `Create your ${APP_NAME} account` : `Sign in to ${APP_NAME}`}
          </CardTitle>
          <CardDescription className="text-slate-600 mt-1">
            {isSignUp
              ? "Join contractors and suppliers getting quotes fast."
              : "Enter your email to sign in or get a magic link."}
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-2">
          {awaitingVerification ? (
            <div className="py-6 text-center space-y-4 animate-in fade-in-50 duration-200">
              <div className="w-14 h-14 bg-amber-50 text-amber-600 rounded-2xl border border-amber-200 flex items-center justify-center mx-auto">
                <Mail className="h-7 w-7" />
              </div>
              <div className="space-y-1.5">
                <h3 className="font-bold text-slate-900 text-lg">Verify your email to select a role</h3>
                <p className="text-xs sm:text-sm text-slate-600 max-w-xs mx-auto">
                  We&apos;ve sent a verification link to <strong className="text-slate-800">{email}</strong>.
                  Please check your inbox and verify your email before selecting your role.
                </p>
              </div>

              <div className="pt-2 flex flex-col gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setAwaitingVerification(false);
                    setIsSignUp(false);
                  }}
                  className="w-full"
                >
                  Return to Sign In
                </Button>
              </div>
            </div>
          ) : magicLinkSent ? (
            <div className="py-6 text-center space-y-4 animate-in fade-in-50 duration-200">
              <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 text-lg">Check your inbox</h3>
                <p className="text-sm text-slate-600 mt-1">
                  We sent a sign-in link to <strong className="text-slate-800">{email}</strong>.
                  Click the link to sign in instantly.
                </p>
              </div>

              <div className="pt-2 flex flex-col gap-2">
                <Button
                  variant="outline"
                  onClick={handleMagicLinkSubmit}
                  disabled={resendCooldown > 0 || isSubmitting}
                  className="w-full"
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend magic link"}
                </Button>
                <button
                  type="button"
                  onClick={() => setMagicLinkSent(false)}
                  className="text-xs text-slate-500 hover:text-slate-800 underline mt-2"
                >
                  Use a different email or password
                </button>
              </div>
            </div>
          ) : (
            <Tabs
              value={authMethod}
              onValueChange={(val) => setAuthMethod(val as "magic" | "password")}
              className="mt-2"
            >
              <TabsList className="grid grid-cols-2">
                <TabsTrigger value="magic">Magic Link</TabsTrigger>
                <TabsTrigger value="password">Password</TabsTrigger>
              </TabsList>

              {/* Magic Link Tab */}
              <TabsContent value="magic">
                <form onSubmit={handleMagicLinkSubmit} className="space-y-4 pt-2">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">Work Email</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                      <Input
                        type="email"
                        placeholder="you@company.com"
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value);
                          if (emailError) setEmailError("");
                        }}
                        className="pl-9"
                        hasError={Boolean(emailError)}
                        autoComplete="email"
                        autoFocus
                      />
                    </div>
                    {emailError && <p className="text-xs text-red-600 mt-1">{emailError}</p>}
                  </div>

                  <Button
                    type="submit"
                    className="w-full gap-2"
                    isLoading={isSubmitting}
                    loadingText="Sending link..."
                  >
                    <span>Send Magic Link</span>
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </form>
              </TabsContent>

              {/* Password Tab */}
              <TabsContent value="password">
                <form onSubmit={handlePasswordSubmit} className="space-y-4 pt-2">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">Work Email</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                      <Input
                        type="email"
                        placeholder="you@company.com"
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value);
                          if (emailError) setEmailError("");
                        }}
                        className="pl-9"
                        hasError={Boolean(emailError)}
                        autoComplete="email"
                      />
                    </div>
                    {emailError && <p className="text-xs text-red-600 mt-1">{emailError}</p>}
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">Password</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                      <Input
                        type="password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => {
                          setPassword(e.target.value);
                          if (passwordError) setPasswordError("");
                        }}
                        className="pl-9"
                        hasError={Boolean(passwordError)}
                        autoComplete={isSignUp ? "new-password" : "current-password"}
                      />
                    </div>
                    {passwordError && <p className="text-xs text-red-600 mt-1">{passwordError}</p>}
                  </div>

                  <Button
                    type="submit"
                    className="w-full gap-2"
                    isLoading={isSubmitting}
                    loadingText={isSignUp ? "Creating account..." : "Signing in..."}
                  >
                    <span>{isSignUp ? "Create account" : "Sign in"}</span>
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          )}

          {/* Single Sign-up vs Sign-in Toggle */}
          <div className="mt-6 pt-4 border-t border-slate-100 text-center text-xs text-slate-600">
            {isSignUp ? (
              <span>
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={() => setIsSignUp(false)}
                  className="font-semibold text-slate-900 hover:underline"
                >
                  Sign in
                </button>
              </span>
            ) : (
              <span>
                Don&apos;t have an account?{" "}
                <button
                  type="button"
                  onClick={() => setIsSignUp(true)}
                  className="font-semibold text-slate-900 hover:underline"
                >
                  Create one now
                </button>
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50">
          <Loader2 className="h-8 w-8 animate-spin text-slate-800" />
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}

