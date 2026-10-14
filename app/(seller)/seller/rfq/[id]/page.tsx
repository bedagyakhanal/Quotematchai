"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  MapPin,
  Calendar,
  Clock,
  Send,
  CheckCircle2,
  AlertTriangle,
  Award,
  DollarSign,
} from "lucide-react";
import { toast } from "sonner";
import { PageShell } from "@/components/layout/PageShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/feedback/EmptyState";
import { RfqStatusBadge } from "@/components/rfq/RfqStatusBadge";
import { useRfqQuery, useSubmitBidMutation } from "@/lib/queries";
import { formatDate, formatRelativeTime } from "@/lib/format";
import { BID_NOTES_MAX_LENGTH, DEFAULT_CURRENCY } from "@/lib/config";
import { mockDb } from "@/lib/mocks/db";

export default function SellerRfqDetailPage() {
  const params = useParams();
  const router = useRouter();
  const rfqId = params.id as string;

  const { data: rfq, isLoading, refetch } = useRfqQuery(rfqId);
  const submitBidMutation = useSubmitBidMutation(rfqId);

  // Bid form state
  const [price, setPrice] = useState<string>("");
  const [leadTimeDays, setLeadTimeDays] = useState<string>("");
  const [notes, setNotes] = useState<string>("");

  // Validation errors
  const [priceError, setPriceError] = useState("");
  const [leadTimeError, setLeadTimeError] = useState("");

  const [hasExistingBid, setHasExistingBid] = useState(false);
  const [isAwardedClosed, setIsAwardedClosed] = useState(false);

  // Prefill existing bid if already submitted
  useEffect(() => {
    if (rfq) {
      if (rfq.status === "awarded" || rfq.status === "closed") {
        setIsAwardedClosed(true);
      }

      // Check if current seller already has a bid on this RFQ
      const bids = mockDb.getBidsForRfq(rfq.id);
      const currentUser = mockDb.getCurrentUser();
      const myBid = bids.find((b) => b.seller_id === currentUser.id);

      if (myBid) {
        setHasExistingBid(true);
        setPrice(String(myBid.price));
        setLeadTimeDays(String(myBid.lead_time_days));
        setNotes(myBid.notes || "");
      }
    }
  }, [rfq]);

  const validate = (): boolean => {
    let valid = true;
    setPriceError("");
    setLeadTimeError("");

    const numPrice = parseFloat(price);
    if (!price || isNaN(numPrice) || numPrice <= 0) {
      setPriceError("Please enter a valid price greater than $0.");
      valid = false;
    }

    const numLeadTime = parseInt(leadTimeDays, 10);
    if (leadTimeDays === "" || isNaN(numLeadTime) || numLeadTime < 0 || numLeadTime > 365) {
      setLeadTimeError("Lead time must be between 0 and 365 days.");
      valid = false;
    }

    return valid;
  };

  const handleSubmitBid = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      await submitBidMutation.mutateAsync({
        price: parseFloat(price),
        leadTimeDays: parseInt(leadTimeDays, 10),
        notes: notes.trim(),
      });
      setHasExistingBid(true);
      toast.success(
        hasExistingBid ? "Bid updated successfully!" : "Bid submitted successfully!"
      );
    } catch (err: any) {
      if (err?.code === "RFQ_CLOSED") {
        setIsAwardedClosed(true);
        toast.error("This RFQ was just awarded. Your bid can no longer be changed.");
      } else {
        toast.error(err?.message || "Failed to submit bid.");
      }
    }
  };

  if (isLoading) {
    return (
      <PageShell>
        <div className="space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-44 w-full rounded-xl" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      </PageShell>
    );
  }

  if (!rfq) {
    return (
      <PageShell>
        <EmptyState
          title="RFQ Not Found"
          description="The requested RFQ could not be located."
          actionText="Back to Open RFQs"
          onAction={() => router.push("/seller")}
        />
      </PageShell>
    );
  }

  const isAwarded = rfq.status === "awarded";
  const currentUser = mockDb.getCurrentUser();
  const myBid = mockDb.getBidsForRfq(rfq.id).find((b) => b.seller_id === currentUser.id);
  const didWin = myBid?.status === "won";

  return (
    <PageShell
      title="RFQ Specifications"
      description={`Review project details and submit your competitive quote for RFQ #${rfq.id.slice(-6)}`}
      actions={
        <Link href="/seller">
          <Button variant="outline" size="sm" className="gap-1.5">
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Inbox</span>
          </Button>
        </Link>
      }
    >
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Award Status Banner */}
        {isAwarded && (
          <div
            className={`p-4 sm:p-5 rounded-xl border flex items-center gap-3 ${
              didWin
                ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                : "bg-slate-100 border-slate-200 text-slate-700"
            }`}
          >
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                didWin ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-500"
              }`}
            >
              {didWin ? <Award className="h-5 w-5" /> : <Clock className="h-5 w-5" />}
            </div>
            <div>
              <h3 className="font-bold text-base">
                {didWin ? "Congratulations! Your Bid Won" : "RFQ Awarded & Closed"}
              </h3>
              <p className="text-xs sm:text-sm mt-0.5">
                {didWin
                  ? "The buyer selected your quote. Check your email for purchase order details."
                  : "The buyer selected another bid for this request. Bidding is closed."}
              </p>
            </div>
          </div>
        )}

        {/* Top RFQ Details */}
        <Card className="border-slate-200 shadow-xs">
          <CardHeader className="pb-3 border-b border-slate-100">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <RfqStatusBadge status={rfq.status} />
                <span className="text-xs text-slate-500">
                  Posted {formatRelativeTime(rfq.created_at)}
                </span>
              </div>
              <div className="text-xs text-slate-500">
                <span>{rfq.bid_count || 0} competitors bid so far</span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            {/* Items List */}
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Materials Requested
              </h4>
              <div className="space-y-2">
                {rfq.items.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-between"
                  >
                    <div>
                      <span className="font-semibold text-slate-900 text-base">{item.name}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-bold text-slate-900 tabular-nums">
                        {item.quantity} {item.unit || "units"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Location & Delivery Date */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100 text-sm">
              <div className="flex items-start gap-2 text-slate-600">
                <MapPin className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
                <div>
                  <span className="text-xs text-slate-400 block font-medium">Delivery Destination</span>
                  <span className="font-medium text-slate-800">{rfq.location}</span>
                </div>
              </div>

              <div className="flex items-start gap-2 text-slate-600">
                <Calendar className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
                <div>
                  <span className="text-xs text-slate-400 block font-medium">Required Date</span>
                  <span className="font-medium text-slate-800">{formatDate(rfq.delivery_date)}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Bid Form (or Read-only display if closed) */}
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-3 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">
                  {isAwardedClosed
                    ? "Your Submitted Bid"
                    : hasExistingBid
                    ? "Update Your Bid"
                    : "Submit Your Bid"}
                </CardTitle>
                <CardDescription className="mt-0.5">
                  {isAwardedClosed
                    ? "This RFQ has concluded and bids are locked."
                    : "Include all freight and delivery fees in your total price."}
                </CardDescription>
              </div>

              {hasExistingBid && !isAwardedClosed && (
                <Badge variant="open" className="gap-1 font-medium">
                  <CheckCircle2 className="h-3 w-3" />
                  Bid Active
                </Badge>
              )}
            </div>
          </CardHeader>

          <CardContent className="pt-5">
            <form onSubmit={handleSubmitBid} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Total Price */}
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
                      disabled={isAwardedClosed || submitBidMutation.isPending}
                      className="pl-8 tabular-nums font-semibold text-base"
                      hasError={Boolean(priceError)}
                      required
                    />
                  </div>
                  {priceError ? (
                    <p className="text-xs text-red-600 mt-1">{priceError}</p>
                  ) : (
                    <p className="text-[11px] text-slate-400">Total including delivery & taxes</p>
                  )}
                </div>

                {/* Lead Time in Days */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">
                    Delivery Lead Time (Days)
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
                    disabled={isAwardedClosed || submitBidMutation.isPending}
                    className="tabular-nums"
                    hasError={Boolean(leadTimeError)}
                    required
                  />
                  {leadTimeError ? (
                    <p className="text-xs text-red-600 mt-1">{leadTimeError}</p>
                  ) : (
                    <p className="text-[11px] text-slate-400">Days from order to jobsite drop-off</p>
                  )}
                </div>
              </div>

              {/* Notes */}
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
                  placeholder="e.g. Offloading included via flatbed crane. Premium grade materials."
                  value={notes}
                  maxLength={BID_NOTES_MAX_LENGTH}
                  onChange={(e) => setNotes(e.target.value)}
                  disabled={isAwardedClosed || submitBidMutation.isPending}
                  className="min-h-[80px]"
                />
              </div>

              {/* Submit CTA */}
              {!isAwardedClosed && (
                <div className="pt-2 flex justify-end">
                  <Button
                    type="submit"
                    isLoading={submitBidMutation.isPending}
                    loadingText={hasExistingBid ? "Updating bid..." : "Submitting bid..."}
                    className="w-full sm:w-auto gap-2 px-6"
                  >
                    <Send className="h-4 w-4" />
                    <span>{hasExistingBid ? "Update My Bid" : "Submit Formal Bid"}</span>
                  </Button>
                </div>
              )}
            </form>
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
