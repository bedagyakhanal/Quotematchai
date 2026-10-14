"use client";

import React, { useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  RefreshCw,
  Clock,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { PageShell } from "@/components/layout/PageShell";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { RfqSummaryCard } from "@/components/rfq/RfqSummaryCard";
import { BidCard } from "@/components/bids/BidCard";
import { SortControl, BidSortOption } from "@/components/bids/SortControl";
import { SelectBidDialog } from "@/components/bids/SelectBidDialog";
import { EmptyState } from "@/components/feedback/EmptyState";
import { useRfqQuery, useBidsQuery, useSelectWinnerMutation } from "@/lib/queries";
import { formatCurrency } from "@/lib/format";
import { Bid } from "@/types";

export default function BuyerRfqDetailPage() {
  const params = useParams();
  const router = useRouter();
  const rfqId = params.id as string;

  const {
    data: rfq,
    isLoading: rfqLoading,
    isError: rfqError,
    refetch: refetchRfq,
  } = useRfqQuery(rfqId);

  const isClosed = rfq?.status === "awarded" || rfq?.status === "closed";

  const {
    data: bids,
    isLoading: bidsLoading,
    refetch: refetchBids,
  } = useBidsQuery(rfqId, {
    isClosed,
  });

  const selectWinnerMutation = useSelectWinnerMutation(rfqId);

  // Sorting state: 'price' | 'speed'
  const [sortBy, setSortBy] = useState<BidSortOption>("price");

  // Selection modal state
  const [selectedBidForAward, setSelectedBidForAward] = useState<Bid | null>(null);

  // Calculate lowest price across all bids for relative +X% hints
  const lowestPrice = useMemo(() => {
    if (!bids || bids.length === 0) return null;
    return Math.min(...bids.map((b) => b.price));
  }, [bids]);

  // Identify winning bid details from loaded bids or rfq
  const winningBid = useMemo(() => {
    if (!bids || bids.length === 0) return null;
    return bids.find((b) => b.id === rfq?.winner_bid_id || b.status === "won") || null;
  }, [bids, rfq?.winner_bid_id]);

  const winningSellerName =
    winningBid?.seller_name || rfq?.winning_seller_name || "Winning Supplier";
  const winningPrice =
    winningBid?.price ?? rfq?.winning_price ?? null;

  // Clean sort with deterministic tie-breaking
  const sortedBids = useMemo(() => {
    if (!bids) return [];
    return [...bids].sort((a, b) => {
      if (sortBy === "price") {
        // Primary: price (low to high). Secondary tie-breaker: fastest lead time
        if (a.price !== b.price) return a.price - b.price;
        return a.lead_time_days - b.lead_time_days;
      } else {
        // Primary: lead time (fastest days). Secondary tie-breaker: lowest price
        if (a.lead_time_days !== b.lead_time_days) return a.lead_time_days - b.lead_time_days;
        return a.price - b.price;
      }
    });
  }, [bids, sortBy]);

  const handleConfirmWinner = async () => {
    if (!selectedBidForAward || selectWinnerMutation.isPending) return;

    try {
      await selectWinnerMutation.mutateAsync(selectedBidForAward.id);
      toast.success(`Awarded to ${selectedBidForAward.seller_name}! The RFQ is now closed.`);
      setSelectedBidForAward(null);
    } catch (err: any) {
      if (err?.code === "RFQ_CLOSED") {
        toast.error("This RFQ was already awarded by another session.");
        refetchRfq();
        refetchBids();
        setSelectedBidForAward(null);
      } else {
        toast.error(err?.message || "Could not award bid.");
      }
    }
  };

  if (rfqLoading) {
    return (
      <PageShell>
        <div className="space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-44 w-full rounded-xl" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      </PageShell>
    );
  }

  if (rfqError || !rfq) {
    return (
      <PageShell>
        <EmptyState
          title="RFQ Not Found"
          description="The requested RFQ could not be located or may have been deleted."
          actionText="Back to My RFQs"
          onAction={() => router.push("/buyer")}
        />
      </PageShell>
    );
  }

  const isAwarded = rfq.status === "awarded";
  const hasMultipleBids = Boolean(bids && bids.length > 1);

  return (
    <PageShell
      title="Bid Comparison"
      description={`Evaluate proposals and award your contract for RFQ #${rfq.id.slice(-6)}`}
      actions={
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              refetchRfq();
              refetchBids();
              toast.info("Refreshed latest bids.");
            }}
            className="gap-1.5"
            title="Refresh latest bids"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
          <Link href="/buyer">
            <Button variant="ghost" size="sm" className="gap-1">
              <ArrowLeft className="h-4 w-4" />
              <span>Back</span>
            </Button>
          </Link>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Awarded Banner */}
        {isAwarded && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 sm:p-5 flex items-center gap-3.5 shadow-xs animate-in fade-in-50 duration-200">
            <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-emerald-950 text-base">
                Contract Awarded to {winningSellerName}
              </h3>
              <p className="text-xs sm:text-sm text-emerald-800 mt-0.5">
                Awarded for a total of{" "}
                <strong className="tabular-nums font-semibold">
                  {formatCurrency(winningPrice)}
                </strong>
                . Bidding is now closed for this request.
              </p>
            </div>
          </div>
        )}

        {/* Top Sticky Summary Card */}
        <RfqSummaryCard rfq={rfq} />

        {/* Bids Section Header with Sort Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-slate-900">
                Incoming Bids ({bids?.length || 0})
              </h2>
              {!isClosed && (
                <span className="text-[11px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                  Auto-updates ~15s
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {isAwarded
                ? "This request has concluded."
                : hasMultipleBids
                ? "Compare supplier quotes by price or lead time to award the contract."
                : "Suppliers have been notified. Bids will appear below."}
            </p>
          </div>

          {/* Sort Control (Only if open and more than 1 bid) */}
          {!isAwarded && hasMultipleBids && (
            <SortControl value={sortBy} onChange={setSortBy} />
          )}
        </div>

        {/* Loading Skeletons */}
        {bidsLoading && (
          <div className="space-y-3">
            <Skeleton className="h-32 w-full rounded-xl" />
            <Skeleton className="h-32 w-full rounded-xl" />
          </div>
        )}

        {/* Zero Bids Empty State */}
        {!bidsLoading && (!bids || bids.length === 0) && (
          <EmptyState
            icon={<Clock className="h-6 w-6 text-slate-400" />}
            title="No bids yet"
            description="Bids will appear here as suppliers submit quotes. This page refreshes automatically."
            actionText="Refresh Now"
            onAction={() => refetchBids()}
          />
        )}

        {/* Bids List */}
        {!bidsLoading && sortedBids.length > 0 && (
          <div className="space-y-3">
            {sortedBids.map((bid) => (
              <BidCard
                key={bid.id}
                bid={bid}
                lowestPrice={lowestPrice}
                isSelectedWinner={rfq.winner_bid_id === bid.id}
                isRfqAwarded={isAwarded}
                onSelectBid={(b) => setSelectedBidForAward(b)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Confirmation Dialog for Winner Selection */}
      <SelectBidDialog
        bid={selectedBidForAward}
        isOpen={Boolean(selectedBidForAward)}
        onClose={() => setSelectedBidForAward(null)}
        onConfirm={handleConfirmWinner}
        isLoading={selectWinnerMutation.isPending}
      />
    </PageShell>
  );
}
