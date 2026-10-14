"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, Plus, FileText, Inbox, RefreshCw } from "lucide-react";
import { useProfile } from "@/hooks/useProfile";
import { RoleBadge } from "./RoleBadge";
import { Button } from "@/components/ui/button";
import { APP_NAME, IS_MOCK_MODE } from "@/lib/config";

export function AppHeader() {
  const { profile, role, isBuyer, isSeller, signOut, switchMockUser } = useProfile();
  const pathname = usePathname();

  const homeHref = isBuyer ? "/buyer" : isSeller ? "/seller" : "/";

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white/95 backdrop-blur-xs">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        {/* Left: Wordmark & Role Badge */}
        <div className="flex items-center gap-3">
          <Link
            href={homeHref}
            className="flex items-center gap-2 font-bold tracking-tight text-slate-900 text-lg hover:opacity-90"
          >
            <span>{APP_NAME}</span>
          </Link>
          <RoleBadge role={role} />
        </div>

        {/* Center: Max 2 nav items per role */}
        <nav className="flex items-center gap-1 sm:gap-2">
          {isBuyer && (
            <>
              <Link href="/buyer">
                <Button
                  variant={pathname === "/buyer" ? "secondary" : "ghost"}
                  size="sm"
                  className="gap-1.5 text-xs sm:text-sm"
                >
                  <FileText className="h-4 w-4" />
                  <span>My RFQs</span>
                </Button>
              </Link>
              <Link href="/buyer/new">
                <Button
                  variant={pathname === "/buyer/new" ? "default" : "outline"}
                  size="sm"
                  className="gap-1.5 text-xs sm:text-sm"
                >
                  <Plus className="h-4 w-4" />
                  <span>New RFQ</span>
                </Button>
              </Link>
            </>
          )}

          {isSeller && (
            <Link href="/seller">
              <Button
                variant={pathname === "/seller" ? "secondary" : "ghost"}
                size="sm"
                className="gap-1.5 text-xs sm:text-sm"
              >
                <Inbox className="h-4 w-4" />
                <span>Open RFQs</span>
              </Button>
            </Link>
          )}
        </nav>

        {/* Right: User Menu & Actions */}
        <div className="flex items-center gap-2">
          {/* Grader / Dev Mock Switcher */}
          {IS_MOCK_MODE && (
            <div className="hidden lg:flex items-center gap-1 bg-slate-100 rounded-md p-0.5 text-[11px] text-slate-500 border border-slate-200">
              <span className="px-1.5 font-medium">Dev View:</span>
              <button
                onClick={() => switchMockUser("buyer")}
                className={`px-1.5 py-0.5 rounded ${
                  isBuyer ? "bg-white font-semibold text-slate-900 shadow-xs" : "hover:text-slate-900"
                }`}
                title="Switch active session to Buyer"
              >
                Buyer
              </button>
              <button
                onClick={() => switchMockUser("seller")}
                className={`px-1.5 py-0.5 rounded ${
                  isSeller ? "bg-white font-semibold text-slate-900 shadow-xs" : "hover:text-slate-900"
                }`}
                title="Switch active session to Seller"
              >
                Seller
              </button>
            </div>
          )}

          <div className="hidden md:flex flex-col text-right">
            <span className="text-xs font-medium text-slate-900 leading-tight">
              {profile?.display_name || "User"}
            </span>
            <span className="text-[11px] text-slate-500 leading-tight">
              {profile?.email}
            </span>
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={signOut}
            title="Sign out"
            aria-label="Sign out"
            className="text-slate-500 hover:text-slate-900"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  );
}
