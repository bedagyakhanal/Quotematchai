import React from "react";
import { MapPin, Calendar, Clock, Layers } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { RfqStatusBadge } from "./RfqStatusBadge";
import { formatDate, formatRelativeTime } from "@/lib/format";
import { RFQ } from "@/types";

export interface RfqSummaryCardProps {
  rfq: RFQ;
}

export function RfqSummaryCard({ rfq }: RfqSummaryCardProps) {
  return (
    <Card className="border-slate-200 bg-white shadow-xs">
      <CardHeader className="pb-3 border-b border-slate-100">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2.5">
            <RfqStatusBadge status={rfq.status} />
            <span className="text-xs text-slate-500 flex items-center gap-1">
              <Clock className="h-3.5 w-3.5 text-slate-400" />
              <span>Posted {formatRelativeTime(rfq.created_at)}</span>
            </span>
          </div>

          <div className="text-xs text-slate-500 flex items-center gap-1">
            <Layers className="h-3.5 w-3.5 text-slate-400" />
            <span>
              {rfq.items.length} {rfq.items.length === 1 ? "line item" : "line items"}
            </span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-4 space-y-4">
        {/* Item Pills */}
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
                <span className="font-medium text-slate-800 truncate mr-2">
                  {item.name}
                </span>
                <span className="tabular-nums font-semibold text-slate-900 text-xs px-2 py-0.5 bg-white rounded border border-slate-200 shrink-0">
                  {item.quantity} {item.unit || "units"}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Location & Delivery Date */}
        <div className="flex flex-wrap items-center gap-6 text-sm text-slate-600 pt-1 border-t border-slate-100">
          <div className="flex items-center gap-1.5">
            <MapPin className="h-4 w-4 text-slate-400 shrink-0" />
            <span className="font-medium text-slate-800">{rfq.location}</span>
          </div>

          <div className="flex items-center gap-1.5">
            <Calendar className="h-4 w-4 text-slate-400 shrink-0" />
            <span>
              Required by <strong className="text-slate-800">{formatDate(rfq.delivery_date)}</strong>
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
