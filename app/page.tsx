import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { APP_NAME, APP_TAGLINE } from "@/lib/config";

export default function HomePage() {
  return (
    <main className="flex-1 flex items-center justify-center p-6">
      <Card className="max-w-md w-full border-slate-200 shadow-sm">
        <CardHeader className="text-center pb-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-slate-900 text-white font-bold text-xl mx-auto mb-3">
            QM
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">{APP_NAME}</CardTitle>
          <CardDescription className="text-slate-600 mt-1">{APP_TAGLINE}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-4">
          <div className="grid grid-cols-2 gap-3">
            <Link href="/buyer" className="w-full">
              <Button variant="outline" className="w-full justify-between">
                <span>Buyer Portal</span>
                <ArrowRight className="h-4 w-4 text-slate-400" />
              </Button>
            </Link>
            <Link href="/seller" className="w-full">
              <Button variant="outline" className="w-full justify-between">
                <span>Seller Portal</span>
                <ArrowRight className="h-4 w-4 text-slate-400" />
              </Button>
            </Link>
          </div>
          <div className="pt-2 border-t border-slate-100 flex justify-between text-xs text-slate-400">
            <span>Mock Mode: Active</span>
            <Link href="/login" className="hover:text-slate-700 underline">
              Sign In
            </Link>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
