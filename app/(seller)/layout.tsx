"use client";

import React, { Suspense, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useProfile } from "@/hooks/useProfile";
import { AppHeader } from "@/components/layout/AppHeader";
import { Skeleton } from "@/components/ui/skeleton";

function HeaderSkeleton() {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white/95 backdrop-blur-xs">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Skeleton className="h-6 w-32" />
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-8 w-8 rounded-full" />
        </div>
      </div>
    </header>
  );
}

function SellerLoadingSkeleton() {
  return (
    <div className="max-w-6xl w-full mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-32" />
      </div>
      <div className="space-y-4">
        <Skeleton className="h-28 w-full rounded-xl" />
        <Skeleton className="h-28 w-full rounded-xl" />
      </div>
    </div>
  );
}

function SellerGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { role, isSeller, isBuyer, isAuthenticated, isLoading } = useProfile();

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated) {
      const currentPath = window.location.pathname;
      router.replace(`/login?next=${encodeURIComponent(currentPath)}`);
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
  }, [isLoading, isAuthenticated, role, isBuyer, router]);

  if (isLoading || !isSeller) {
    return <SellerLoadingSkeleton />;
  }

  return <>{children}</>;
}

export default function SellerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Suspense fallback={<HeaderSkeleton />}>
        <AppHeader />
      </Suspense>
      <main className="flex-1">
        <Suspense fallback={<SellerLoadingSkeleton />}>
          <SellerGuard>{children}</SellerGuard>
        </Suspense>
      </main>
    </div>
  );
}
