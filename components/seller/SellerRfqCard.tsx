import React from "react";
import Link from "next/link";
import { MapPin, Calendar, Users, ArrowRight, Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RfqStatusBadge } from "@/components/rfq/RfqStatusBadge";
import { formatDate, formatRelativeTime, getDaysRemaining } from "@/lib/format";
import { RFQ, RFQItem } from "@/types";

export interface SellerRfqCardProps {
  rfq: RFQ;
}

function formatItemsSummary(items: RFQItem[]): string {
  if (!items || items.length === 0) return "No items specified";
  const first = `${items[0].quantity} ${items[0].unit ? items[0].unit + " " : ""}${items[0].name}`;
  if (items.length === 1) return first;
  if (items.length === 2) {
    return `${first}, ${items[1].quantity} ${items[1].unit ? items[1].unit + " " : ""}${items[1].name}`;
  }
  return `${first}, ${items[1].name} +${items.length - 2} more`;
}

export function SellerRfqCard({ rfq }: SellerRfqCardProps) {
  const daysLeft = getDaysRemaining(rfq.delivery_date);
  const isUrgent = daysLeft !== null && daysLeft <= 2;
  const hasPlacedBid = Boolean(rfq.my_bid_id);
  const isAwarded = rfq.status === "awarded";

  return (
    <Link href={`/seller/rfq/${rfq.id}`} className="block group">
      <Card
        className={`transition-all ${
          hasPlacedBid
            ? "bg-slate-50/80 border-slate-200 hover:border-slate-300"
            : "bg-white border-slate-200 hover:border-slate-400 hover:shadow-xs"
        }`}
      >
        <CardContent className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2 flex-1 min-w-0">
            {/* Badges & Item Summary */}
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

            {/* Location, Date & Relative Urgency */}
            <div className="flex items-center gap-4 text-xs sm:text-sm text-slate-500 flex-wrap">
              <span className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                <span className="truncate max-w-[220px]">{rfq.location}</span>
              </span>

              <span className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                <span>Needed by {formatDate(rfq.delivery_date)}</span>
              </span>

              {daysLeft !== null && (
                <span
                  className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${
                    isUrgent
                      ? "bg-red-50 text-red-700 border border-red-200"
                      : "bg-slate-100 text-slate-600 border border-slate-200"
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

          {/* Right: Meta & CTA Button */}
          <div className="flex items-center justify-between md:justify-end gap-6 pt-3 md:pt-0 border-t md:border-t-0 border-slate-100 shrink-0">
            <div className="text-left md:text-right">
              <div className="text-xs text-slate-500 flex items-center md:justify-end gap-1">
                <Users className="h-3.5 w-3.5" />
                <span>
                  {rfq.bid_count} {rfq.bid_count === 1 ? "bid" : "bids"}
                </span>
              </div>
              <div className="text-xs text-slate-400 mt-0.5 flex items-center md:justify-end gap-1">
                <Clock className="h-3 w-3" />
                <span>Posted {formatRelativeTime(rfq.created_at)}</span>
              </div>
            </div>

            <Button
              variant={hasPlacedBid ? "outline" : "default"}
              size="sm"
              className="gap-1.5"
            >
              <span>{hasPlacedBid ? "Review Bid" : "Quote This"}</span>
              <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
