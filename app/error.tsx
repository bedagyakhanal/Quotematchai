"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RotateCcw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log unexpected errors
    console.error("Application error:", error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50 text-center">
      <div className="max-w-md w-full space-y-4">
        <div className="w-16 h-16 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
          <AlertTriangle className="h-8 w-8" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Something went wrong
        </h1>
        <p className="text-sm text-slate-600">
          An unexpected issue occurred while rendering this page. Your data is safe.
        </p>
        <div className="pt-2 flex items-center justify-center gap-3">
          <Button onClick={() => reset()} variant="default" className="gap-2">
            <RotateCcw className="h-4 w-4" />
            <span>Try Again</span>
          </Button>
          <Link href="/">
            <Button variant="outline" className="gap-2">
              <Home className="h-4 w-4" />
              <span>Go Home</span>
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
