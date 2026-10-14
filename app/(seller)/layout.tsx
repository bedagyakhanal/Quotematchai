"use client";

import React, { Suspense, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { toast } from "sonner";
import { useProfile } from "@/hooks/useProfile";
import { AppHeader } from "@/components/layout/AppHeader";
import { Skeleton } from "@/components/ui/skeleton";

function SellerLoadingSkeleton() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <header className="h-16 border-b border-slate-200 bg-white px-6 flex items-center justify-between">
        <Skeleton className="h-6 w-32" />
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-8 w-8 rounded-full" />
        </div>
      </header>
      <main className="flex-1 max-w-6xl w-full mx-auto p-6 space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-28 w-full rounded-xl" />
          <Skeleton className="h-28 w-full rounded-xl" />
        </div>
      </main>
    </div>
  );
}

function SellerGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { role, isSeller, isBuyer, isAuthenticated, isLoading } = useProfile();

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
      return;
    }

    if (!role) {
      router.replace("/onboarding/role");
      return;
    }

    if (isBuyer) {
      toast.info("That page is for sellers, taking you home");
      router.replace("/buyer");
    }
  }, [isLoading, isAuthenticated, role, isBuyer, router, pathname]);

  if (isLoading || !isSeller) {
    return <SellerLoadingSkeleton />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <AppHeader />
      <main className="flex-1">{children}</main>
    </div>
  );
}

export default function SellerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={<SellerLoadingSkeleton />}>
      <SellerGuard>{children}</SellerGuard>
    </Suspense>
  );
}
