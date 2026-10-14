import React from "react";
import { Search, X, ArrowUpDown } from "lucide-react";
import { Input } from "@/components/ui/input";

export type SellerSortOption = "newest" | "delivery";

export interface SellerFeedControlsProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  sortBy: SellerSortOption;
  onSortChange: (sort: SellerSortOption) => void;
  totalCount: number;
}

export function SellerFeedControls({
  searchQuery,
  onSearchChange,
  sortBy,
  onSortChange,
  totalCount,
}: SellerFeedControlsProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
      {/* Search Input with Clear Button */}
      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400 pointer-events-none" />
        <Input
          type="text"
          placeholder="Filter by materials or delivery location..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9 pr-8 bg-white h-10 text-sm"
          aria-label="Filter RFQ opportunities"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => onSearchChange("")}
            className="absolute right-2.5 top-3 text-slate-400 hover:text-slate-600 p-0.5 rounded"
            aria-label="Clear search query"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Sort Select */}
      <div className="flex items-center gap-2 self-end sm:self-auto text-xs">
        <ArrowUpDown className="h-3.5 w-3.5 text-slate-400" />
        <span className="text-slate-500 font-medium">Sort by:</span>
        <select
          value={sortBy}
          onChange={(e) => onSortChange(e.target.value as SellerSortOption)}
          className="h-10 rounded-md border border-slate-200 bg-white px-3 text-xs text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-slate-900"
          aria-label="Sort RFQ opportunities by"
        >
          <option value="newest">Newest First</option>
          <option value="delivery">Delivery Date Soonest</option>
        </select>
      </div>
    </div>
  );
}
