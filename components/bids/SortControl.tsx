import React from "react";
import { ArrowDownAZ, Zap } from "lucide-react";

export type BidSortOption = "price" | "speed";

export interface SortControlProps {
  value: BidSortOption;
  onChange: (value: BidSortOption) => void;
  className?: string;
}

export function SortControl({ value, onChange, className }: SortControlProps) {
  return (
    <div
      role="group"
      aria-label="Sort bids by"
      className={`inline-flex items-center gap-1 bg-slate-100 p-1 rounded-lg text-xs ${
        className || ""
      }`}
    >
      <span className="px-2 text-slate-500 font-medium">Sort:</span>
      <button
        type="button"
        onClick={() => onChange("price")}
        aria-pressed={value === "price"}
        className={`px-3 py-1.5 rounded-md font-medium transition-colors flex items-center gap-1.5 ${
          value === "price"
            ? "bg-white text-slate-900 shadow-xs font-semibold"
            : "text-slate-600 hover:text-slate-900"
        }`}
      >
        <ArrowDownAZ className="h-3.5 w-3.5" />
        <span>Lowest Price</span>
      </button>

      <button
        type="button"
        onClick={() => onChange("speed")}
        aria-pressed={value === "speed"}
        className={`px-3 py-1.5 rounded-md font-medium transition-colors flex items-center gap-1.5 ${
          value === "speed"
            ? "bg-white text-slate-900 shadow-xs font-semibold"
            : "text-slate-600 hover:text-slate-900"
        }`}
      >
        <Zap className="h-3.5 w-3.5" />
        <span>Fastest Delivery</span>
      </button>
    </div>
  );
}
