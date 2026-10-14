"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ShoppingCart, Store, ArrowRight, AlertCircle, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Role } from "@/types";
import { useProfile } from "@/hooks/useProfile";
import { APP_NAME } from "@/lib/config";

export default function RoleOnboardingPage() {
  const router = useRouter();
  const { role, hasRole, isLoading, assignRole } = useProfile();
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);

  // If role is already set, redirect immediately away as per specification
  useEffect(() => {
    if (!isLoading && hasRole) {
      if (role === "buyer") {
        router.replace("/buyer");
      } else if (role === "seller") {
        router.replace("/seller");
      }
    }
  }, [hasRole, role, isLoading, router]);

  const handleSelectRole = async (targetRole: Role) => {
    if (selectedRole) return; // Prevent double submit
    setSelectedRole(targetRole);
    try {
      await assignRole(targetRole);
    } catch {
      setSelectedRole(null);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-slate-800" />
          <p className="text-sm text-slate-500">Checking your account...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 bg-slate-50">
      <div className="w-full max-w-2xl space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-slate-900 text-white font-bold text-lg mx-auto mb-1">
            QM
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            Welcome to {APP_NAME}
          </h1>
          <p className="text-slate-600 text-sm sm:text-base max-w-md mx-auto">
            Choose your role to get started. Your role determines your dashboard and tools.
          </p>

          {/* Permanent Role Notice */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-xs font-medium mt-1">
            <AlertCircle className="h-3.5 w-3.5" />
            <span>You can&apos;t change this later.</span>
          </div>
        </div>

        {/* Two Equal Role Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 pt-2">
          {/* Buyer Card */}
          <Card
            onClick={() => !selectedRole && handleSelectRole("buyer")}
            className={`group cursor-pointer border-2 transition-all p-6 relative overflow-hidden flex flex-col justify-between ${
              selectedRole === "buyer"
                ? "border-slate-900 ring-2 ring-slate-900/10 bg-slate-50"
                : "border-slate-200 hover:border-slate-400 bg-white hover:shadow-md"
            }`}
          >
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center group-hover:scale-105 transition-transform">
                <ShoppingCart className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900">I&apos;m a Buyer</h3>
                <p className="text-slate-600 text-sm mt-1">
                  I need materials and want competitive quotes from verified suppliers.
                </p>
              </div>
              <ul className="text-xs text-slate-500 space-y-1.5 pt-2">
                <li className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
                  Request materials with voice or text
                </li>
                <li className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
                  Compare bids by price and speed
                </li>
                <li className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
                  Award winners with one clear action
                </li>
              </ul>
            </div>

            <div className="pt-6 flex items-center justify-between font-semibold text-sm text-slate-900">
              <span>{selectedRole === "buyer" ? "Setting up..." : "Select Buyer"}</span>
              {selectedRole === "buyer" ? (
                <Loader2 className="h-4 w-4 animate-spin text-slate-900" />
              ) : (
                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              )}
            </div>
          </Card>

          {/* Seller Card */}
          <Card
            onClick={() => !selectedRole && handleSelectRole("seller")}
            className={`group cursor-pointer border-2 transition-all p-6 relative overflow-hidden flex flex-col justify-between ${
              selectedRole === "seller"
                ? "border-slate-900 ring-2 ring-slate-900/10 bg-slate-50"
                : "border-slate-200 hover:border-slate-400 bg-white hover:shadow-md"
            }`}
          >
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Store className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900">I&apos;m a Seller</h3>
                <p className="text-slate-600 text-sm mt-1">
                  I supply materials and want to bid on open buyer requests.
                </p>
              </div>
              <ul className="text-xs text-slate-500 space-y-1.5 pt-2">
                <li className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  Browse open RFQs in real-time
                </li>
                <li className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  Submit structured bids in seconds
                </li>
                <li className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  Win contracts with transparent status
                </li>
              </ul>
            </div>

            <div className="pt-6 flex items-center justify-between font-semibold text-sm text-slate-900">
              <span>{selectedRole === "seller" ? "Setting up..." : "Select Seller"}</span>
              {selectedRole === "seller" ? (
                <Loader2 className="h-4 w-4 animate-spin text-slate-900" />
              ) : (
                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
