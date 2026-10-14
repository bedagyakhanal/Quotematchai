import Link from "next/link";
import { ArrowLeft, FileQuestion } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50 text-center">
      <div className="max-w-md w-full space-y-4">
        <div className="w-16 h-16 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center mx-auto">
          <FileQuestion className="h-8 w-8" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Page Not Found
        </h1>
        <p className="text-sm text-slate-600">
          We couldn&apos;t find the page or quote you were looking for. It may have been moved or
          closed.
        </p>
        <div className="pt-2">
          <Link href="/">
            <Button className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              <span>Return Home</span>
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
