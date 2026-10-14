import React, { useState, useEffect } from "react";
import { Send, CheckCircle2, Lock, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BID_NOTES_MAX_LENGTH, DEFAULT_CURRENCY } from "@/lib/config";
import { Bid, SubmitBidInput } from "@/types";

export interface BidFormProps {
  existingBid?: Bid | null;
  isLocked: boolean;
  isSubmitting: boolean;
  onSubmit: (input: SubmitBidInput) => Promise<void>;
  className?: string;
}

export function BidForm({
  existingBid,
  isLocked,
  isSubmitting,
  onSubmit,
  className,
}: BidFormProps) {
  const [price, setPrice] = useState<string>("");
  const [leadTimeDays, setLeadTimeDays] = useState<string>("");
  const [notes, setNotes] = useState<string>("");

  const [priceError, setPriceError] = useState("");
  const [leadTimeError, setLeadTimeError] = useState("");

  const hasBid = Boolean(existingBid);

  // Sync state if an existing bid loads or changes
  useEffect(() => {
    if (existingBid) {
      setPrice(String(existingBid.price));
      setLeadTimeDays(String(existingBid.lead_time_days));
      setNotes(existingBid.notes || "");
    }
  }, [existingBid]);

  const validate = (): boolean => {
    let isValid = true;
    setPriceError("");
    setLeadTimeError("");

    const numPrice = parseFloat(price);
    if (!price || isNaN(numPrice) || numPrice <= 0) {
      setPriceError("Please enter a price greater than $0.00");
      isValid = false;
    } else {
      // Check max 2 decimals
      const parts = price.split(".");
      if (parts.length > 1 && parts[1].length > 2) {
        setPriceError("Price cannot exceed 2 decimal places");
        isValid = false;
      }
    }

    const numLeadTime = parseInt(leadTimeDays, 10);
    if (
      leadTimeDays === "" ||
      isNaN(numLeadTime) ||
      numLeadTime < 0 ||
      numLeadTime > 365 ||
      leadTimeDays.includes(".")
    ) {
      setLeadTimeError("Lead time must be an integer between 0 and 365 days");
      isValid = false;
    }

    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLocked) return;
    if (!validate()) return;

    await onSubmit({
      price: parseFloat(price),
      leadTimeDays: parseInt(leadTimeDays, 10),
      notes: notes.trim() || undefined,
    });
  };

  return (
    <Card className={`border-slate-200 shadow-sm ${className || ""}`}>
      <CardHeader className="pb-3 border-b border-slate-100">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              {isLocked && <Lock className="h-4 w-4 text-slate-400" />}
              <span>
                {isLocked
                  ? "Your Submitted Bid"
                  : hasBid
                  ? "Update Your Bid"
                  : "Submit Formal Bid"}
              </span>
            </CardTitle>
            <CardDescription className="mt-0.5">
              {isLocked
                ? "This RFQ has concluded and quotes are locked."
                : "Include all materials, shipping, and offloading fees in your price."}
            </CardDescription>
          </div>

          {hasBid && !isLocked && (
            <Badge variant="open" className="gap-1 font-medium text-xs">
              <CheckCircle2 className="h-3 w-3" />
              Bid Placed
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-5">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Price Input */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">
                Total Price ({DEFAULT_CURRENCY})
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-slate-400 font-semibold">$</span>
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="0.00"
                  value={price}
                  onChange={(e) => {
                    setPrice(e.target.value);
                    if (priceError) setPriceError("");
                  }}
                  disabled={isLocked || isSubmitting}
                  className="pl-8 tabular-nums font-semibold text-base"
                  hasError={Boolean(priceError)}
                  required
                />
              </div>
              {priceError ? (
                <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  <span>{priceError}</span>
                </p>
              ) : (
                <p className="text-[11px] text-slate-400">Include delivery in your price</p>
              )}
            </div>

            {/* Lead Time Input */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">
                Lead Time (Days to Jobsite)
              </label>
              <Input
                type="number"
                min="0"
                max="365"
                step="1"
                placeholder="e.g. 2 (0 for same day)"
                value={leadTimeDays}
                onChange={(e) => {
                  setLeadTimeDays(e.target.value);
                  if (leadTimeError) setLeadTimeError("");
                }}
                disabled={isLocked || isSubmitting}
                className="tabular-nums"
                hasError={Boolean(leadTimeError)}
                required
              />
              {leadTimeError ? (
                <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  <span>{leadTimeError}</span>
                </p>
              ) : (
                <p className="text-[11px] text-slate-400">Total days until delivery</p>
              )}
            </div>
          </div>

          {/* Supplier Notes */}
          <div className="space-y-1">
            <div className="flex justify-between items-center text-xs">
              <label className="font-semibold text-slate-700">
                Supplier Notes (Optional)
              </label>
              <span className="text-slate-400 tabular-nums">
                {notes.length}/{BID_NOTES_MAX_LENGTH}
              </span>
            </div>
            <Textarea
              placeholder="e.g. Offloading included via boom truck. Grade-A certified materials."
              value={notes}
              maxLength={BID_NOTES_MAX_LENGTH}
              onChange={(e) => setNotes(e.target.value)}
              disabled={isLocked || isSubmitting}
              className="min-h-[85px] text-sm"
            />
          </div>

          {/* Actions / Submit */}
          {!isLocked && (
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
              <span className="text-xs text-slate-400 order-2 sm:order-1">
                You can revise your bid anytime while the RFQ remains open.
              </span>

              <Button
                type="submit"
                isLoading={isSubmitting}
                loadingText={hasBid ? "Updating quote..." : "Submitting quote..."}
                className="w-full sm:w-auto gap-2 px-6 order-1 sm:order-2"
              >
                <Send className="h-4 w-4" />
                <span>{hasBid ? "Update My Bid" : "Submit Formal Bid"}</span>
              </Button>
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
