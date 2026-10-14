"use client";

import React, { useState, useMemo } from "react";
import { RefreshCw, Search } from "lucide-react";
import { toast } from "sonner";
import { PageShell } from "@/components/layout/PageShell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/feedback/EmptyState";
import { SellerRfqCard } from "@/components/seller/SellerRfqCard";
import {
  SellerFeedControls,
  SellerSortOption,
} from "@/components/seller/SellerFeedControls";
import { useOpenRfqsQuery } from "@/lib/queries";

export default function SellerInboxPage() {
  const { data: rfqs, isLoading, isError, refetch } = useOpenRfqsQuery();

  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SellerSortOption>("newest");

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
      description="Live marketplace feed of contractor requests. Submit your quotes quickly to win contracts."
      actions={
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            refetch();
            toast.info("Refreshed latest opportunities.");
          }}
          className="gap-1.5"
          title="Refresh open RFQs"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          <span>Refresh</span>
        </Button>
      }
    >
      <div className="space-y-4">
        {/* Search & Sort Controls */}
        <SellerFeedControls
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          sortBy={sortBy}
          onSortChange={setSortBy}
          totalCount={filteredRfqs.length}
        />

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
            description="New RFQs show up here automatically as buyers create them. Auto-checking every 30 seconds."
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
            actionText="Clear Search Filter"
            onAction={() => setSearchQuery("")}
          />
        )}

        {/* RFQ Feed Cards */}
        {!isLoading && !isError && filteredRfqs.length > 0 && (
          <div className="space-y-3">
            {filteredRfqs.map((rfq) => (
              <SellerRfqCard key={rfq.id} rfq={rfq} />
            ))}
          </div>
        )}
      </div>
    </PageShell>
  );
}
