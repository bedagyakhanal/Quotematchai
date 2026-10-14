"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, KeyRound, ArrowRight, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { APP_NAME, IS_MOCK_MODE } from "@/lib/config";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError("");

    if (!newPassword) {
      setPasswordError("Please enter a new password.");
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError("Password must be at least 6 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords do not match. Please re-enter.");
      return;
    }

    setIsSubmitting(true);
    try {
      if (!IS_MOCK_MODE) {
        const supabase = createBrowserSupabaseClient();
        const { error } = await supabase.auth.updateUser({
          password: newPassword,
        });

        if (error) throw error;

        // Query user's profile to route to correct dashboard
        const {
          data: { user },
        } = await supabase.auth.getUser();

        let destination = "/";
        if (user) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("role")
            .eq("id", user.id)
            .maybeSingle();

          if (profile?.role === "buyer") destination = "/buyer";
          else if (profile?.role === "seller") destination = "/seller";
          else destination = "/onboarding/role";
        }

        setIsSuccess(true);
        toast.success("Password updated successfully!");
        setTimeout(() => {
          router.push(destination);
        }, 1500);
      } else {
        await new Promise((r) => setTimeout(r, 600));
        setIsSuccess(true);
        toast.success("Password updated successfully!");
        setTimeout(() => {
          router.push("/buyer");
        }, 1500);
      }
    } catch (err: any) {
      setPasswordError(err?.message || "Failed to update password. Please try again.");
      toast.error(err?.message || "Could not update password.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 bg-slate-50">
      <Card className="w-full max-w-md border-slate-200 shadow-sm">
        <CardHeader className="text-center pb-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-slate-900 text-white font-bold text-lg mx-auto mb-2">
            <KeyRound className="h-6 w-6 text-emerald-400" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight text-slate-900">
            {isSuccess ? "Password Updated" : "Set New Password"}
          </CardTitle>
          <CardDescription className="text-slate-600 mt-1">
            {isSuccess
              ? "Your password has been changed. Taking you to your dashboard..."
              : `Create a strong new password for your ${APP_NAME} account.`}
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-2">
          {isSuccess ? (
            <div className="py-6 text-center space-y-4 animate-in fade-in-50 duration-200">
              <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl border border-emerald-200 flex items-center justify-center mx-auto">
                <CheckCircle2 className="h-7 w-7" />
              </div>
              <p className="text-sm text-slate-600">
                You can now log in anytime with your new password.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4 pt-2">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">New Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <Input
                    type="password"
                    placeholder="At least 6 characters"
                    value={newPassword}
                    onChange={(e) => {
                      setNewPassword(e.target.value);
                      if (passwordError) setPasswordError("");
                    }}
                    className="pl-9"
                    hasError={Boolean(passwordError)}
                    autoComplete="new-password"
                    autoFocus
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">
                  Confirm New Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <Input
                    type="password"
                    placeholder="Repeat new password"
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      if (passwordError) setPasswordError("");
                    }}
                    className="pl-9"
                    hasError={Boolean(passwordError)}
                    autoComplete="new-password"
                  />
                </div>
                {passwordError && (
                  <p className="text-xs text-red-600 mt-1">{passwordError}</p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full gap-2"
                isLoading={isSubmitting}
                loadingText="Updating password..."
              >
                <span>Save New Password</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
