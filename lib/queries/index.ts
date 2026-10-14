import {
  useMutation,
  useQuery,
  useQueryClient,
  UseQueryOptions,
} from "@tanstack/react-query";
import {
  CreateRfqInput,
  Profile,
  RFQ,
  Bid,
  Role,
  SubmitBidInput,
} from "@/types";
import { getProfile, setRole } from "@/lib/api/profile";
import {
  createRfq,
  getMyRfqs,
  getOpenRfqs,
  getRfqById,
  selectWinner,
} from "@/lib/api/rfq";
import { getRfqBids, submitBid } from "@/lib/api/bids";
import {
  POLLING_INTERVAL_BIDS_MS,
  POLLING_INTERVAL_RFQS_MS,
} from "@/lib/config";

export const queryKeys = {
  profile: ["profile"] as const,
  myRfqs: ["rfqs", "mine"] as const,
  openRfqs: ["rfqs", "open"] as const,
  rfq: (id: string) => ["rfq", id] as const,
  bids: (rfqId: string) => ["rfq", rfqId, "bids"] as const,
};

// -------------------------------------------------------------
// Profile Queries & Mutations
// -------------------------------------------------------------
export function useProfileQuery(options?: Partial<UseQueryOptions<Profile>>) {
  return useQuery<Profile>({
    queryKey: queryKeys.profile,
    queryFn: getProfile,
    staleTime: 1000 * 60 * 5, // 5 mins
    retry: 1,
    ...options,
  });
}

export function useSetRoleMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (role: Role) => setRole(role),
    onSuccess: (updatedProfile) => {
      queryClient.setQueryData(queryKeys.profile, updatedProfile);
      queryClient.invalidateQueries({ queryKey: queryKeys.profile });
    },
  });
}

// -------------------------------------------------------------
// RFQ Queries & Mutations
// -------------------------------------------------------------
export function useMyRfqsQuery() {
  return useQuery<RFQ[]>({
    queryKey: queryKeys.myRfqs,
    queryFn: getMyRfqs,
    staleTime: 1000 * 10,
    refetchOnWindowFocus: true,
  });
}

export function useOpenRfqsQuery() {
  return useQuery<RFQ[]>({
    queryKey: queryKeys.openRfqs,
    queryFn: getOpenRfqs,
    staleTime: 1000 * 10,
    refetchInterval: POLLING_INTERVAL_RFQS_MS,
    refetchOnWindowFocus: true,
  });
}

export function useRfqQuery(id: string) {
  return useQuery<RFQ>({
    queryKey: queryKeys.rfq(id),
    queryFn: () => getRfqById(id),
    enabled: Boolean(id),
    staleTime: 1000 * 10,
    refetchOnWindowFocus: true,
  });
}

export function useCreateRfqMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateRfqInput) => createRfq(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.myRfqs });
      queryClient.invalidateQueries({ queryKey: queryKeys.openRfqs });
    },
  });
}

// -------------------------------------------------------------
// Bid Queries & Mutations
// -------------------------------------------------------------
export function useBidsQuery(rfqId: string, options?: { isClosed?: boolean }) {
  return useQuery<Bid[]>({
    queryKey: queryKeys.bids(rfqId),
    queryFn: () => getRfqBids(rfqId),
    enabled: Boolean(rfqId),
    // Auto refetch every 15s if the RFQ is still open
    refetchInterval: options?.isClosed ? false : POLLING_INTERVAL_BIDS_MS,
    refetchOnWindowFocus: true,
  });
}

export function useSubmitBidMutation(rfqId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: SubmitBidInput) => submitBid(rfqId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.bids(rfqId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.rfq(rfqId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.openRfqs });
    },
  });
}

export function useSelectWinnerMutation(rfqId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (bidId: string) => selectWinner(rfqId, bidId),
    onSuccess: (updatedRfq) => {
      queryClient.setQueryData(queryKeys.rfq(rfqId), updatedRfq);
      queryClient.invalidateQueries({ queryKey: queryKeys.rfq(rfqId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.bids(rfqId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.myRfqs });
      queryClient.invalidateQueries({ queryKey: queryKeys.openRfqs });
    },
  });
}
