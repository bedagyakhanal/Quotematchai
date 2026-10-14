"use client";

import React, { useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  MapPin,
  Calendar,
  Clock,
  Award,
  CheckCircle2,
  RefreshCw,
  Zap,
  TrendingDown,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { PageShell } from "@/components/layout/PageShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { RfqStatusBadge } from "@/components/rfq/RfqStatusBadge";
import { BidStatusBadge } from "@/components/bids/BidStatusBadge";
import { EmptyState } from "@/components/feedback/EmptyState";
import { useRfqQuery, useBidsQuery, useSelectWinnerMutation } from "@/lib/queries";
import { formatCurrency, formatDate, formatLeadTime, formatRelativeTime } from "@/lib/format";
import { Bid } from "@/types";

export default function BuyerRfqDetailPage() {
  const params = useParams();
  const router = useRouter();
  const rfqId = params.id as string;

  const { data: rfq, isLoading: rfqLoading, refetch: refetchRfq } = useRfqQuery(rfqId);
  const isClosed = rfq?.status === "awarded" || rfq?.status === "closed";
  const { data: bids, isLoading: bidsLoading, refetch: refetchBids } = useBidsQuery(rfqId, {
    isClosed,
  });

  const selectWinnerMutation = useSelectWinnerMutation(rfqId);

  // Sorting: 'price' | 'speed'
  const [sortBy, setSortBy] = useState<"price" | "speed">("price");

  // Selection confirmation dialog
  const [selectedBidForAward, setSelectedBidForAward] = useState<Bid | null>(null);
  const [isAwarding, setIsAwarding] = useState(false);

  // Calculate lowest price for comparative % hints
  const lowestPrice = useMemo(() => {
    if (!bids || bids.length === 0) return null;
    return Math.min(...bids.map((b) => b.price));
  }, [bids]);

  // Sorted bids
  const sortedBids = useMemo(() => {
    if (!bids) return [];
    return [...bids].sort((a, b) => {
      if (sortBy === "price") {
        if (a.price !== b.price) return a.price - b.price;
        return a.lead_time_days - b.lead_time_days;
      } else {
        if (a.lead_time_days !== b.lead_time_days) return a.lead_time_days - b.lead_time_days;
        return a.price - b.price;
      }
    });
  }, [bids, sortBy]);

  const handleConfirmWinner = async () => {
    if (!selectedBidForAward || isAwarding) return;
    setIsAwarding(true);
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
    } finally {
      setIsAwarding(false);
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

  if (!rfq) {
    return (
      <PageShell>
        <EmptyState
          title="RFQ Not Found"
          description="The requested RFQ could not be located."
          actionText="Back to My RFQs"
          onAction={() => router.push("/buyer")}
        />
      </PageShell>
    );
  }

  const isAwarded = rfq.status === "awarded";

  return (
    <PageShell
      title="Bid Comparison"
      description={`Review bids and award the contract for RFQ #${rfq.id.slice(-6)}`}
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
            title="Refresh bids"
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
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 sm:p-5 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-emerald-900 text-base">
                Winner Awarded: {rfq.winning_seller_name}
              </h3>
              <p className="text-xs sm:text-sm text-emerald-700 mt-0.5">
                This RFQ was awarded for{" "}
                <strong className="tabular-nums">{formatCurrency(rfq.winning_price)}</strong>.
                Bidding is closed.
              </p>
            </div>
          </div>
        )}

        {/* Top RFQ Summary Card */}
        <Card className="border-slate-200 bg-white shadow-xs">
          <CardHeader className="pb-3 border-b border-slate-100">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <RfqStatusBadge status={rfq.status} />
                <span className="text-xs text-slate-500">
                  Posted {formatRelativeTime(rfq.created_at)}
                </span>
              </div>
              <div className="text-xs text-slate-500 flex items-center gap-1">
                <span>Total Items:</span>
                <strong className="text-slate-800">{rfq.items.length}</strong>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            {/* Item Table/List */}
            <div className="space-y-1.5">
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Requested Materials
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                {rfq.items.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 text-sm flex items-center justify-between"
                  >
                    <span className="font-medium text-slate-800">{item.name}</span>
                    <span className="tabular-nums font-semibold text-slate-900 text-xs px-2 py-0.5 bg-white rounded border border-slate-200">
                      {item.quantity} {item.unit || "units"}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Location & Date */}
            <div className="flex flex-wrap items-center gap-6 text-sm text-slate-600 pt-1 border-t border-slate-100">
              <div className="flex items-center gap-1.5">
                <MapPin className="h-4 w-4 text-slate-400" />
                <span>{rfq.location}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4 text-slate-400" />
                <span>Required by {formatDate(rfq.delivery_date)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Bids Section Header with Sort Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              Incoming Bids ({bids?.length || 0})
            </h2>
            <p className="text-xs text-slate-500">
              {isAwarded
                ? "Bidding is closed for this awarded request."
                : "Select the winning bid to close the RFQ."}
            </p>
          </div>

          {!isAwarded && bids && bids.length > 1 && (
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg text-xs">
              <span className="px-2 text-slate-500 font-medium">Sort:</span>
              <button
                type="button"
                onClick={() => setSortBy("price")}
                className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                  sortBy === "price"
                    ? "bg-white text-slate-900 shadow-xs font-semibold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Lowest Price
              </button>
              <button
                type="button"
                onClick={() => setSortBy("speed")}
                className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                  sortBy === "speed"
                    ? "bg-white text-slate-900 shadow-xs font-semibold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Fastest Lead Time
              </button>
            </div>
          )}
        </div>

        {/* Bids List / Empty State */}
        {bidsLoading && (
          <div className="space-y-3">
            <Skeleton className="h-28 w-full rounded-xl" />
            <Skeleton className="h-28 w-full rounded-xl" />
          </div>
        )}

        {!bidsLoading && (!bids || bids.length === 0) && (
          <EmptyState
            icon={<Clock className="h-6 w-6 text-slate-400" />}
            title="No bids yet"
            description="Bids will appear here as suppliers respond. This page automatically updates every 15 seconds."
            actionText="Refresh Now"
            onAction={() => refetchBids()}
          />
        )}

        {!bidsLoading && sortedBids.length > 0 && (
          <div className="space-y-3">
            {sortedBids.map((bid) => {
              const isSelectedWinner = rfq.winner_bid_id === bid.id;
              const isBestOverall = bid.is_lowest_price && bid.is_fastest;

              // Price difference from lowest
              const priceDiff =
                lowestPrice && bid.price > lowestPrice
                  ? Math.round(((bid.price - lowestPrice) / lowestPrice) * 100)
                  : 0;

              return (
                <Card
                  key={bid.id}
                  className={`transition-all ${
                    isSelectedWinner
                      ? "border-emerald-500 ring-2 ring-emerald-500/10 bg-emerald-50/20"
                      : isAwarded
                      ? "opacity-60 bg-slate-50 border-slate-200"
                      : "border-slate-200 hover:border-slate-400 bg-white shadow-xs"
                  }`}
                >
                  <CardContent className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-2 flex-1 min-w-0">
                      {/* Supplier & Value Badges */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-slate-900 text-base sm:text-lg">
                          {bid.seller_name}
                        </h3>

                        {isBestOverall ? (
                          <Badge className="bg-indigo-600 text-white border-transparent gap-1">
                            <Zap className="h-3 w-3" />
                            Best Overall
                          </Badge>
                        ) : (
                          <>
                            {bid.is_lowest_price && (
                              <Badge className="bg-emerald-600 text-white border-transparent gap-1">
                                <TrendingDown className="h-3 w-3" />
                                Lowest Price
                              </Badge>
                            )}
                            {bid.is_fastest && (
                              <Badge className="bg-blue-600 text-white border-transparent gap-1">
                                <Zap className="h-3 w-3" />
                                Fastest
                              </Badge>
                            )}
                          </>
                        )}

                        {isSelectedWinner && (
                          <Badge variant="won" className="gap-1 font-bold">
                            <Award className="h-3 w-3" />
                            Selected Winner
                          </Badge>
                        )}

                        {isAwarded && !isSelectedWinner && (
                          <BidStatusBadge status="lost" />
                        )}
                      </div>

                      {/* Numbers: Price & Lead Time */}
                      <div className="flex items-center gap-6 text-sm flex-wrap">
                        <div>
                          <span className="text-xs text-slate-500 block">Total Bid</span>
                          <span className="text-xl sm:text-2xl font-bold text-slate-900 tabular-nums">
                            {formatCurrency(bid.price)}
                          </span>
                          {priceDiff > 0 && !isAwarded && (
                            <span className="text-xs text-slate-400 ml-1.5 tabular-nums">
                              (+{priceDiff}% vs lowest)
                            </span>
                          )}
                        </div>

                        <div>
                          <span className="text-xs text-slate-500 block">Lead Time</span>
                          <span className="text-base sm:text-lg font-semibold text-slate-800">
                            {formatLeadTime(bid.lead_time_days)}
                          </span>
                        </div>

                        <div>
                          <span className="text-xs text-slate-500 block">Submitted</span>
                          <span className="text-xs text-slate-600">
                            {formatRelativeTime(bid.created_at)}
                          </span>
                        </div>
                      </div>

                      {/* Supplier Notes */}
                      {bid.notes && (
                        <p className="text-xs sm:text-sm text-slate-600 bg-slate-50 rounded-md p-2.5 border border-slate-100 max-w-2xl">
                          &ldquo;{bid.notes}&rdquo;
                        </p>
                      )}
                    </div>

                    {/* Action Button */}
                    {!isAwarded && (
                      <div className="pt-2 md:pt-0 shrink-0">
                        <Button
                          onClick={() => setSelectedBidForAward(bid)}
                          className="w-full md:w-auto gap-2"
                        >
                          <Award className="h-4 w-4" />
                          <span>Select this bid</span>
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Confirmation Dialog for Winner Selection */}
      <Dialog
        open={Boolean(selectedBidForAward)}
        onOpenChange={(open) => !open && setSelectedBidForAward(null)}
      >
        <DialogHeader>
          <DialogTitle>Award RFQ Contract?</DialogTitle>
          <DialogDescription>
            You are about to award this contract to{" "}
            <strong className="text-slate-900">{selectedBidForAward?.seller_name}</strong>.
          </DialogDescription>
        </DialogHeader>

        {selectedBidForAward && (
          <div className="my-4 p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Agreed Price:</span>
              <strong className="text-slate-900 tabular-nums">
                {formatCurrency(selectedBidForAward.price)}
              </strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Delivery Lead Time:</span>
              <strong className="text-slate-900">
                {formatLeadTime(selectedBidForAward.lead_time_days)}
              </strong>
            </div>

            <div className="pt-2 border-t border-slate-200 flex items-start gap-2 text-amber-700 text-xs">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>
                This closes the RFQ to further bidding and notifies the winning supplier. This
                action cannot be undone.
              </span>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setSelectedBidForAward(null)}
            disabled={isAwarding}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirmWinner}
            isLoading={isAwarding}
            loadingText="Awarding..."
            className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <CheckCircle2 className="h-4 w-4" />
            <span>Confirm & Award</span>
          </Button>
        </DialogFooter>
      </Dialog>
    </PageShell>
  );
}
