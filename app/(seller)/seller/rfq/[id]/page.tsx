"use client";

import React, { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Clock, Award, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { PageShell } from "@/components/layout/PageShell";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/feedback/EmptyState";
import { RfqSummaryCard } from "@/components/rfq/RfqSummaryCard";
import { BidForm } from "@/components/bids/BidForm";
import { useRfqQuery, useSubmitBidMutation, useBidsQuery } from "@/lib/queries";
import { useProfile } from "@/hooks/useProfile";
import { SubmitBidInput } from "@/types";

export default function SellerRfqDetailPage() {
  const params = useParams();
  const router = useRouter();
  const rfqId = params.id as string;
  const { profile } = useProfile();

  const { data: rfq, isLoading: rfqLoading, refetch: refetchRfq } = useRfqQuery(rfqId);
  const isClosed = rfq?.status === "awarded" || rfq?.status === "closed";

  // Bids for this RFQ (to find this seller's bid)
  const { data: bids } = useBidsQuery(rfqId, { isClosed });
  const submitBidMutation = useSubmitBidMutation(rfqId);

  // Find current seller's bid
  const myBid = bids?.find((b) => b.seller_id === profile?.id) || null;

  const [isLocallyClosed, setIsLocallyClosed] = useState(false);

  const handleSubmitBid = async (input: SubmitBidInput) => {
    try {
      await submitBidMutation.mutateAsync(input);
      toast.success(
        myBid ? "Your bid was successfully updated!" : "Your formal bid was submitted!"
      );
      refetchRfq();
    } catch (err: any) {
      if (err?.code === "RFQ_CLOSED") {
        setIsLocallyClosed(true);
        toast.error("This RFQ was just awarded to another supplier. Your bid cannot be modified.");
        refetchRfq();
      } else {
        toast.error(err?.message || "Failed to submit bid. Please check your inputs.");
      }
    }
  };

  if (rfqLoading) {
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
          title="Opportunity Not Found"
          description="The requested RFQ could not be located or has expired."
          actionText="Back to Open Opportunities"
          onAction={() => router.push("/seller")}
        />
      </PageShell>
    );
  }

  const isAwarded = rfq.status === "awarded" || isLocallyClosed;
  const didIWin = myBid?.status === "won";

  return (
    <PageShell
      title="RFQ Specifications"
      description={`Review project requirements and submit your price quote for RFQ #${rfq.id.slice(-6)}`}
      actions={
        <Link href="/seller">
          <Button variant="outline" size="sm" className="gap-1.5">
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Opportunities</span>
          </Button>
        </Link>
      }
    >
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Award Status Banner (If awarded) */}
        {isAwarded && (
          <div
            className={`p-4 sm:p-5 rounded-xl border flex items-center gap-3.5 shadow-xs animate-in fade-in-50 duration-200 ${
              didIWin
                ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                : "bg-slate-100 border-slate-200 text-slate-700"
            }`}
          >
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                didIWin ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-500"
              }`}
            >
              {didIWin ? <Award className="h-5 w-5" /> : <Clock className="h-5 w-5" />}
            </div>
            <div>
              <h3 className="font-bold text-base">
                {didIWin ? "Congratulations! Your Bid Was Selected" : "RFQ Awarded & Closed"}
              </h3>
              <p className="text-xs sm:text-sm mt-0.5">
                {didIWin
                  ? "The buyer awarded the contract to your company. Check your email for purchase order confirmation."
                  : "The buyer selected another quote for this project. Bidding is now closed."}
              </p>
            </div>
          </div>
        )}

        {/* Structured RFQ Specifications Card */}
        <RfqSummaryCard rfq={rfq} />

        {/* Bid Submission Form */}
        <BidForm
          existingBid={myBid}
          isLocked={isAwarded}
          isSubmitting={submitBidMutation.isPending}
          onSubmit={handleSubmitBid}
        />
      </div>
    </PageShell>
  );
}
