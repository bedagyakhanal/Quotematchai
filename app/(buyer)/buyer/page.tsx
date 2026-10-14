"use client";

import Link from "next/link";
import { Plus, MapPin, Calendar, Users, DollarSign, ArrowRight, Award } from "lucide-react";
import { PageShell } from "@/components/layout/PageShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { RfqStatusBadge } from "@/components/rfq/RfqStatusBadge";
import { EmptyState } from "@/components/feedback/EmptyState";
import { useMyRfqsQuery } from "@/lib/queries";
import { formatCurrency, formatDate } from "@/lib/format";
import { RFQItem } from "@/types";

function formatItemsSummary(items: RFQItem[]): string {
  if (!items || items.length === 0) return "No items specified";
  const first = `${items[0].quantity} ${items[0].unit ? items[0].unit + " " : ""}${items[0].name}`;
  if (items.length === 1) return first;
  if (items.length === 2) {
    return `${first}, ${items[1].quantity} ${items[1].unit ? items[1].unit + " " : ""}${items[1].name}`;
  }
  return `${first}, ${items[1].name} +${items.length - 2} more`;
}

export default function BuyerDashboardPage() {
  const { data: rfqs, isLoading, isError, refetch } = useMyRfqsQuery();

  return (
    <PageShell
      title="My RFQs"
      description="Manage your requests for quotes, review incoming supplier bids, and select winners."
      actions={
        <Link href="/buyer/new">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            <span>New RFQ</span>
          </Button>
        </Link>
      }
    >
      {/* Loading state */}
      {isLoading && (
        <div className="space-y-4">
          <Skeleton className="h-32 w-full rounded-xl" />
          <Skeleton className="h-32 w-full rounded-xl" />
          <Skeleton className="h-32 w-full rounded-xl" />
        </div>
      )}

      {/* Error state */}
      {isError && !isLoading && (
        <Card className="border-red-200 bg-red-50/50 p-6 text-center">
          <h3 className="font-semibold text-red-900">Unable to load your RFQs</h3>
          <p className="text-sm text-red-700 mt-1">
            There was a problem loading your requests. Please try again.
          </p>
          <Button variant="outline" size="sm" onClick={() => refetch()} className="mt-4">
            Retry
          </Button>
        </Card>
      )}

      {/* Empty state */}
      {!isLoading && !isError && (!rfqs || rfqs.length === 0) && (
        <EmptyState
          title="No RFQs created yet"
          description="Create your first request for quote by describing the materials and delivery date you need."
          actionText="Create New RFQ"
          onAction={() => window.location.assign("/buyer/new")}
        />
      )}

      {/* RFQ List */}
      {!isLoading && !isError && rfqs && rfqs.length > 0 && (
        <div className="space-y-3.5">
          {rfqs.map((rfq) => {
            const hasBids = (rfq.bid_count || 0) > 0;
            const isAwarded = rfq.status === "awarded";

            return (
              <Link
                key={rfq.id}
                href={`/buyer/rfq/${rfq.id}`}
                className="block group"
              >
                <Card className="transition-all hover:border-slate-400 hover:shadow-xs">
                  <CardContent className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-2 flex-1 min-w-0">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <RfqStatusBadge status={rfq.status} />
                        <h3 className="font-semibold text-slate-900 text-base sm:text-lg truncate group-hover:text-blue-600 transition-colors">
                          {formatItemsSummary(rfq.items)}
                        </h3>
                      </div>

                      <div className="flex items-center gap-4 text-xs sm:text-sm text-slate-500 flex-wrap">
                        <span className="flex items-center gap-1.5">
                          <MapPin className="h-3.5 w-3.5 text-slate-400" />
                          <span className="truncate max-w-[200px]">{rfq.location}</span>
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5 text-slate-400" />
                          <span>Delivery by {formatDate(rfq.delivery_date)}</span>
                        </span>
                      </div>

                      {/* Awarded Winner Banner */}
                      {isAwarded && rfq.winning_seller_name && (
                        <div className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200 mt-1">
                          <Award className="h-3.5 w-3.5" />
                          <span>
                            Awarded to <strong>{rfq.winning_seller_name}</strong> for{" "}
                            <strong className="tabular-nums">
                              {formatCurrency(rfq.winning_price)}
                            </strong>
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Stats & Actions */}
                    <div className="flex items-center justify-between md:justify-end gap-6 pt-3 md:pt-0 border-t md:border-t-0 border-slate-100">
                      <div className="text-left md:text-right">
                        <div className="flex items-center md:justify-end gap-1 text-xs text-slate-500">
                          <Users className="h-3.5 w-3.5" />
                          <span>
                            {rfq.bid_count} {rfq.bid_count === 1 ? "bid" : "bids"}
                          </span>
                        </div>
                        <div className="text-sm font-semibold text-slate-900 tabular-nums">
                          {hasBids
                            ? `Lowest: ${formatCurrency(rfq.lowest_price)}`
                            : "Awaiting bids"}
                        </div>
                      </div>

                      <div className="text-slate-400 group-hover:text-slate-700 group-hover:translate-x-0.5 transition-all">
                        <ArrowRight className="h-5 w-5" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </PageShell>
  );
}
