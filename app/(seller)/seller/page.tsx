"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import {
  Search,
  MapPin,
  Calendar,
  Users,
  ArrowRight,
  RefreshCw,
  Clock,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { PageShell } from "@/components/layout/PageShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/feedback/EmptyState";
import { RfqStatusBadge } from "@/components/rfq/RfqStatusBadge";
import { BidStatusBadge } from "@/components/bids/BidStatusBadge";
import { useOpenRfqsQuery } from "@/lib/queries";
import { formatDate, formatRelativeTime, getDaysRemaining } from "@/lib/format";
import { RFQ, RFQItem } from "@/types";

function formatItemsSummary(items: RFQItem[]): string {
  if (!items || items.length === 0) return "No items specified";
  const first = `${items[0].quantity} ${items[0].unit ? items[0].unit + " " : ""}${items[0].name}`;
  if (items.length === 1) return first;
  if (items.length === 2) {
    return `${first}, ${items[1].quantity} ${items[1].unit ? items[1].unit + " " : ""}${items[1].name}`;
  }
  return `${first}, ${items[1].name} +${items.length - 2} more`;
}

export default function SellerInboxPage() {
  const { data: rfqs, isLoading, isError, refetch } = useOpenRfqsQuery();

  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"newest" | "delivery">("newest");

  // Filter and sort RFQs
  const filteredRfqs = useMemo(() => {
    if (!rfqs) return [];

    let list = rfqs.filter((r) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const matchLoc = r.location.toLowerCase().includes(q);
      const matchItems = r.items.some((i) => i.name.toLowerCase().includes(q));
      return matchLoc || matchItems;
    });

    return list.sort((a, b) => {
      // Prioritize unbid RFQs first
      const aHasBid = a.my_bid_id !== null && a.my_bid_id !== undefined;
      const bHasBid = b.my_bid_id !== null && b.my_bid_id !== undefined;
      if (aHasBid !== bHasBid) {
        return aHasBid ? 1 : -1;
      }

      if (sortBy === "newest") {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      } else {
        return new Date(a.delivery_date).getTime() - new Date(b.delivery_date).getTime();
      }
    });
  }, [rfqs, searchQuery, sortBy]);

  return (
    <PageShell
      title="Open RFQ Opportunities"
      description="Live marketplace feed of construction requests. Submit your quotes quickly to win contracts."
      actions={
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            refetch();
            toast.info("Refreshed latest opportunities.");
          }}
          className="gap-1.5"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          <span>Refresh</span>
        </Button>
      }
    >
      <div className="space-y-4">
        {/* Search & Sort Controls */}
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:max-w-md">
            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search by material or location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-white"
            />
          </div>

          <div className="flex items-center gap-1.5 self-end sm:self-auto text-xs">
            <span className="text-slate-500 font-medium">Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="h-9 rounded-md border border-slate-200 bg-white px-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900"
            >
              <option value="newest">Newest First</option>
              <option value="delivery">Delivery Date Soonest</option>
            </select>
          </div>
        </div>

        {/* Loading Skeletons */}
        {isLoading && (
          <div className="space-y-3">
            <Skeleton className="h-28 w-full rounded-xl" />
            <Skeleton className="h-28 w-full rounded-xl" />
            <Skeleton className="h-28 w-full rounded-xl" />
          </div>
        )}

        {/* Error State */}
        {isError && !isLoading && (
          <Card className="border-red-200 bg-red-50/50 p-6 text-center">
            <h3 className="font-semibold text-red-900">Unable to load open RFQs</h3>
            <p className="text-sm text-red-700 mt-1">
              Please check your connection and try again.
            </p>
            <Button variant="outline" size="sm" onClick={() => refetch()} className="mt-4">
              Retry
            </Button>
          </Card>
        )}

        {/* Empty State: No RFQs in system */}
        {!isLoading && !isError && (!rfqs || rfqs.length === 0) && (
          <EmptyState
            title="No open requests right now"
            description="New RFQs show up here automatically as buyers create them. Check back in a few moments."
            actionText="Refresh Feed"
            onAction={() => refetch()}
          />
        )}

        {/* Empty State: Search filter yielded 0 hits */}
        {!isLoading && !isError && rfqs && rfqs.length > 0 && filteredRfqs.length === 0 && (
          <EmptyState
            icon={<Search className="h-6 w-6 text-slate-400" />}
            title="No matching RFQs"
            description={`No requests matched "${searchQuery}". Try different search terms or clear your filter.`}
            actionText="Clear Search"
            onAction={() => setSearchQuery("")}
          />
        )}

        {/* RFQ Feed */}
        {!isLoading && !isError && filteredRfqs.length > 0 && (
          <div className="space-y-3">
            {filteredRfqs.map((rfq) => {
              const daysLeft = getDaysRemaining(rfq.delivery_date);
              const isUrgent = daysLeft !== null && daysLeft <= 2;
              const hasPlacedBid = Boolean(rfq.my_bid_id);
              const isAwarded = rfq.status === "awarded";

              return (
                <Link
                  key={rfq.id}
                  href={`/seller/rfq/${rfq.id}`}
                  className="block group"
                >
                  <Card
                    className={`transition-all ${
                      hasPlacedBid
                        ? "bg-slate-50/80 border-slate-200 hover:border-slate-300"
                        : "bg-white border-slate-200 hover:border-slate-400 hover:shadow-xs"
                    }`}
                  >
                    <CardContent className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="space-y-2 flex-1 min-w-0">
                        {/* Title & Status Badges */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <RfqStatusBadge status={rfq.status} />

                          {/* My Bid Status Chip */}
                          {hasPlacedBid && (
                            <Badge
                              variant="outline"
                              className={
                                rfq.my_bid_status === "won"
                                  ? "bg-emerald-50 text-emerald-800 border-emerald-300 font-bold"
                                  : rfq.my_bid_status === "lost"
                                  ? "bg-slate-100 text-slate-600 border-slate-300"
                                  : "bg-blue-50 text-blue-800 border-blue-300 font-semibold"
                              }
                            >
                              {rfq.my_bid_status === "won"
                                ? "Bid Won"
                                : rfq.my_bid_status === "lost"
                                ? "Not Selected"
                                : "Bid Placed"}
                            </Badge>
                          )}

                          <h3 className="font-semibold text-slate-900 text-base sm:text-lg truncate group-hover:text-blue-600 transition-colors">
                            {formatItemsSummary(rfq.items)}
                          </h3>
                        </div>

                        {/* Location, Date & Urgency */}
                        <div className="flex items-center gap-4 text-xs sm:text-sm text-slate-500 flex-wrap">
                          <span className="flex items-center gap-1.5">
                            <MapPin className="h-3.5 w-3.5 text-slate-400" />
                            <span className="truncate max-w-[220px]">{rfq.location}</span>
                          </span>

                          <span className="flex items-center gap-1.5">
                            <Calendar className="h-3.5 w-3.5 text-slate-400" />
                            <span>Needed by {formatDate(rfq.delivery_date)}</span>
                          </span>

                          {daysLeft !== null && (
                            <span
                              className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                isUrgent
                                  ? "bg-red-50 text-red-700 border border-red-200"
                                  : "bg-slate-100 text-slate-600"
                              }`}
                            >
                              {daysLeft <= 0
                                ? "Due today"
                                : daysLeft === 1
                                ? "Due tomorrow"
                                : `in ${daysLeft} days`}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Right: Meta & CTA */}
                      <div className="flex items-center justify-between md:justify-end gap-6 pt-3 md:pt-0 border-t md:border-t-0 border-slate-100 shrink-0">
                        <div className="text-left md:text-right">
                          <div className="text-xs text-slate-500 flex items-center md:justify-end gap-1">
                            <Users className="h-3.5 w-3.5" />
                            <span>
                              {rfq.bid_count} {rfq.bid_count === 1 ? "bid" : "bids"} placed
                            </span>
                          </div>
                          <div className="text-xs text-slate-400 mt-0.5">
                            Posted {formatRelativeTime(rfq.created_at)}
                          </div>
                        </div>

                        <Button
                          variant={hasPlacedBid ? "outline" : "default"}
                          size="sm"
                          className="gap-1.5"
                        >
                          <span>{hasPlacedBid ? "Review Bid" : "Quote This"}</span>
                          <ArrowRight className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </PageShell>
  );
}
