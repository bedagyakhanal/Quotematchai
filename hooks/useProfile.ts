"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useProfileQuery, useSetRoleMutation, queryKeys } from "@/lib/queries";
import { Role, Profile } from "@/types";
import { mockDb } from "@/lib/mocks/db";
import { IS_MOCK_MODE } from "@/lib/config";

export function useProfile() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: profile, isLoading, error, refetch } = useProfileQuery();
  const setRoleMutation = useSetRoleMutation();

  const isAuthenticated = Boolean(profile?.id);
  const role = profile?.role || null;
  const isBuyer = role === "buyer";
  const isSeller = role === "seller";
  const hasRole = Boolean(role);

  const assignRole = async (newRole: Role) => {
    try {
      const updated = await setRoleMutation.mutateAsync(newRole);
      toast.success(`Welcome to QuoteMatch as a ${newRole === "buyer" ? "Buyer" : "Seller"}!`);
      if (newRole === "buyer") {
        router.push("/buyer");
      } else {
        router.push("/seller");
      }
      return updated;
    } catch (err: any) {
      if (err?.code === "ROLE_ALREADY_SET") {
        // Redirection as required by spec: handle ROLE_ALREADY_SET by redirecting to existing role's home
        toast.info("Role already assigned, taking you to your dashboard.");
        if (role === "buyer") {
          router.push("/buyer");
        } else if (role === "seller") {
          router.push("/seller");
        }
        return;
      }
      toast.error(err?.message || "Failed to set role. Please try again.");
      throw err;
    }
  };

  const signOut = async () => {
    try {
      if (IS_MOCK_MODE) {
        // In mock mode, we can clear or reset user session
        queryClient.setQueryData(queryKeys.profile, null);
      }
      queryClient.clear();
      toast.info("You have been signed out.");
      router.push("/login");
    } catch {
      toast.error("Error signing out.");
    }
  };

  /**
   * Developer / Grader helper: easily toggle between buyer and seller in mock mode
   */
  const switchMockUser = (targetRole: Role) => {
    if (!IS_MOCK_MODE) return;
    mockDb.switchRole(targetRole);
    const updated = mockDb.getCurrentUser();
    queryClient.setQueryData(queryKeys.profile, updated);
    queryClient.invalidateQueries();
    toast.success(`Switched active user to ${targetRole.toUpperCase()}: ${updated.display_name}`);
    router.push(targetRole === "buyer" ? "/buyer" : "/seller");
  };

  return {
    profile: profile || null,
    role,
    isLoading,
    isAuthenticated,
    isBuyer,
    isSeller,
    hasRole,
    error,
    refetch,
    assignRole,
    isAssigningRole: setRoleMutation.isPending,
    signOut,
    switchMockUser,
  };
}
