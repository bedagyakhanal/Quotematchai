import React, { useState } from "react";
import { Award, Zap, TrendingDown, ChevronDown, ChevronUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BidStatusBadge } from "./BidStatusBadge";
import { formatCurrency, formatLeadTime, formatRelativeTime } from "@/lib/format";
import { Bid } from "@/types";

export interface BidCardProps {
  bid: Bid;
  lowestPrice: number | null;
  isSelectedWinner: boolean;
  isRfqAwarded: boolean;
  onSelectBid: (bid: Bid) => void;
}

export function BidCard({
  bid,
  lowestPrice,
  isSelectedWinner,
  isRfqAwarded,
  onSelectBid,
}: BidCardProps) {
  const [isNotesExpanded, setIsNotesExpanded] = useState(false);

  const isBestOverall = bid.is_lowest_price && bid.is_fastest;

  // Calculate percentage difference from lowest bid
  const priceDifferencePercent =
    lowestPrice && bid.price > lowestPrice
      ? Math.round(((bid.price - lowestPrice) / lowestPrice) * 100)
      : 0;

  const hasLongNotes = bid.notes && bid.notes.length > 120;

  return (
    <Card
      className={`transition-all ${
        isSelectedWinner
          ? "border-emerald-500 ring-2 ring-emerald-500/10 bg-emerald-50/25 shadow-sm"
          : isRfqAwarded
          ? "opacity-60 bg-slate-50 border-slate-200"
          : "border-slate-200 hover:border-slate-400 bg-white shadow-xs"
      }`}
    >
      <CardContent className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-2.5 flex-1 min-w-0">
          {/* Supplier Name & Value Badges */}
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-bold text-slate-900 text-base sm:text-lg">
              {bid.seller_name}
            </h3>

            {isBestOverall ? (
              <Badge className="bg-indigo-600 text-white border-transparent gap-1 font-bold">
                <Zap className="h-3 w-3 fill-current" />
                Best Overall
              </Badge>
            ) : (
              <>
                {bid.is_lowest_price && (
                  <Badge className="bg-emerald-600 text-white border-transparent gap-1 font-semibold">
                    <TrendingDown className="h-3 w-3" />
                    Lowest Price
                  </Badge>
                )}
                {bid.is_fastest && (
                  <Badge className="bg-blue-600 text-white border-transparent gap-1 font-semibold">
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

            {isRfqAwarded && !isSelectedWinner && (
              <BidStatusBadge status="lost" />
            )}
          </div>

          {/* Key Metrics: Price, Lead Time, Submitted Time */}
          <div className="flex items-baseline gap-6 text-sm flex-wrap">
            <div>
              <span className="text-[11px] text-slate-400 block font-medium uppercase tracking-wider">
                Total Price
              </span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-xl sm:text-2xl font-bold text-slate-900 tabular-nums">
                  {formatCurrency(bid.price)}
                </span>
                {priceDifferencePercent > 0 && !isRfqAwarded && (
                  <span className="text-xs text-slate-400 tabular-nums font-medium">
                    (+{priceDifferencePercent}% above lowest)
                  </span>
                )}
              </div>
            </div>

            <div>
              <span className="text-[11px] text-slate-400 block font-medium uppercase tracking-wider">
                Lead Time
              </span>
              <span className="text-base sm:text-lg font-semibold text-slate-800">
                {formatLeadTime(bid.lead_time_days)}
              </span>
            </div>

            <div>
              <span className="text-[11px] text-slate-400 block font-medium uppercase tracking-wider">
                Submitted
              </span>
              <span className="text-xs text-slate-500">
                {formatRelativeTime(bid.created_at)}
              </span>
            </div>
          </div>

          {/* Expandable Notes */}
          {bid.notes && (
            <div className="text-xs sm:text-sm text-slate-600 bg-slate-50 rounded-lg p-2.5 border border-slate-100 max-w-2xl">
              <span className="text-[11px] font-semibold text-slate-500 block mb-0.5">
                Supplier Notes:
              </span>
              <p className="leading-relaxed">
                {hasLongNotes && !isNotesExpanded
                  ? `${bid.notes.slice(0, 120)}...`
                  : bid.notes}
              </p>
              {hasLongNotes && (
                <button
                  type="button"
                  onClick={() => setIsNotesExpanded((prev) => !prev)}
                  className="mt-1 text-xs text-blue-600 hover:text-blue-800 font-medium inline-flex items-center gap-0.5"
                >
                  <span>{isNotesExpanded ? "Show less" : "Read full note"}</span>
                  {isNotesExpanded ? (
                    <ChevronUp className="h-3 w-3" />
                  ) : (
                    <ChevronDown className="h-3 w-3" />
                  )}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Action Button */}
        {!isRfqAwarded && (
          <div className="pt-2 md:pt-0 shrink-0">
            <Button
              onClick={() => onSelectBid(bid)}
              className="w-full md:w-auto gap-2"
              aria-label={`Select ${bid.seller_name}'s bid for ${formatCurrency(bid.price)}`}
            >
              <Award className="h-4 w-4" />
              <span>Select this bid</span>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
