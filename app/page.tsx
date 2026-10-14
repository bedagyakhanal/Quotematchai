"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useProfile } from "@/hooks/useProfile";

export default function RootPage() {
  const router = useRouter();
  const { role, isAuthenticated, isLoading } = useProfile();

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated) {
      router.replace("/login");
      return;
    }

    if (!role) {
      router.replace("/onboarding/role");
      return;
    }

    if (role === "buyer") {
      router.replace("/buyer");
    } else if (role === "seller") {
      router.replace("/seller");
    }
  }, [isLoading, isAuthenticated, role, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-slate-800" />
        <p className="text-sm font-medium text-slate-600">Directing to your portal...</p>
      </div>
    </div>
  );
}
