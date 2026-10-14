import React from "react";
import { CheckCircle2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { formatCurrency, formatLeadTime } from "@/lib/format";
import { Bid } from "@/types";

export interface SelectBidDialogProps {
  bid: Bid | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isLoading: boolean;
}

export function SelectBidDialog({
  bid,
  isOpen,
  onClose,
  onConfirm,
  isLoading,
}: SelectBidDialogProps) {
  if (!bid) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !isLoading && onClose()}>
      <DialogHeader>
        <DialogTitle>Award RFQ Contract?</DialogTitle>
        <DialogDescription>
          You are selecting <strong className="text-slate-900">{bid.seller_name}</strong> as the
          winner for this request.
        </DialogDescription>
      </DialogHeader>

      <div className="my-4 p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-2.5 text-sm">
        <div className="flex justify-between items-center">
          <span className="text-slate-500">Agreed Price:</span>
          <strong className="text-slate-900 text-lg tabular-nums">
            {formatCurrency(bid.price)}
          </strong>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-slate-500">Delivery Lead Time:</span>
          <strong className="text-slate-900">
            {formatLeadTime(bid.lead_time_days)}
          </strong>
        </div>

        {bid.notes && (
          <div className="pt-2 border-t border-slate-200 text-xs text-slate-600">
            <span className="font-semibold block text-slate-700 mb-0.5">Supplier Notes:</span>
            <p className="italic bg-white p-2 rounded border border-slate-100">
              &ldquo;{bid.notes}&rdquo;
            </p>
          </div>
        )}

        <div className="pt-2 border-t border-slate-200 flex items-start gap-2 text-amber-800 bg-amber-50/60 p-2.5 rounded-md text-xs">
          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
          <span>
            This closes bidding immediately and marks all other bids as not selected. This
            action cannot be undone.
          </span>
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onClose} disabled={isLoading}>
          Cancel
        </Button>
        <Button
          onClick={onConfirm}
          isLoading={isLoading}
          loadingText="Awarding Contract..."
          className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
        >
          <CheckCircle2 className="h-4 w-4" />
          <span>Confirm & Award</span>
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
