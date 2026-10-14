import { NextRequest } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/server/auth";
import { jsonSuccess, handleApiError, ApiAppError } from "@/lib/server/response";
import { RFQ } from "@/types";

const selectWinnerSchema = z.object({
  bidId: z.string().min(1, "Bid ID is required."),
});

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  let userId: string | undefined;

  try {
    const { user, supabase } = await requireRole("buyer");
    userId = user.id;

    const { id: rfqId } = await context.params;
    if (!rfqId) {
      throw new ApiAppError("RFQ_NOT_FOUND", "The requested RFQ was not found.", 404);
    }

    let body: any;
    try {
      body = await req.json();
    } catch {
      throw new ApiAppError("VALIDATION_ERROR", "Invalid JSON request body.", 400);
    }

    const { bidId } = selectWinnerSchema.parse(body);

    // Call Database Agent RPC: select_winner with 40P01 deadlock handling
    const executeSelectWinner = async () => {
      return await supabase.rpc("select_winner", {
        p_rfq_id: rfqId,
        p_bid_id: bidId,
      });
    };

    let result = await executeSelectWinner();

    // Catch 40P01 deadlock: retry exactly once after short jittered backoff (50-150ms)
    if (result.error && (result.error as any).code === "40P01") {
      console.warn(
        `[Deadlock 40P01 in POST /api/rfq/${rfqId}/select-winner] Retrying once after jitter...`
      );
      const jitterMs = Math.floor(Math.random() * 100) + 50;
      await delay(jitterMs);
      result = await executeSelectWinner();

      if (result.error && (result.error as any).code === "40P01") {
        throw new ApiAppError(
          "INTERNAL_ERROR",
          "The database is busy processing a concurrent update. Please try again.",
          503
        );
      }
    }

    if (result.error) {
      throw result.error;
    }

    // Fetch the updated RFQ record to return
    const { data: updatedRfqRow, error: fetchError } = await supabase
      .from("rfqs")
      .select("*")
      .eq("id", rfqId)
      .single();

    if (fetchError || !updatedRfqRow) {
      throw fetchError || new ApiAppError("RFQ_NOT_FOUND", "The requested RFQ was not found.", 404);
    }

    // Look up winning bid to get seller_name and price
    let winningSellerName: string | undefined;
    let winningPrice: number | null = null;
    const winnerBidId = updatedRfqRow.winner_bid_id || updatedRfqRow.winning_bid_id || bidId;

    if (winnerBidId) {
      const { data: rfqBids } = await supabase.rpc("get_bids_for_rfq", {
        p_rfq_id: rfqId,
      });
      const winBid = (rfqBids || []).find((b: any) => b.id === winnerBidId);
      if (winBid) {
        winningPrice = Number(winBid.price);
        winningSellerName = winBid.seller_name;
      } else {
        const { data: singleBid } = await supabase
          .from("bids")
          .select("price, seller_id")
          .eq("id", winnerBidId)
          .maybeSingle();

        if (singleBid) {
          winningPrice = Number(singleBid.price);
          const { data: winProfile } = await supabase
            .from("profiles")
            .select("display_name")
            .eq("id", singleBid.seller_id)
            .maybeSingle();
          winningSellerName = winProfile?.display_name || undefined;
        }
      }
    }

    const rfq: RFQ = {
      id: updatedRfqRow.id,
      buyer_id: updatedRfqRow.buyer_id,
      raw_text: updatedRfqRow.raw_text || undefined,
      items: updatedRfqRow.items,
      delivery_date: updatedRfqRow.delivery_date,
      location: updatedRfqRow.location,
      status: updatedRfqRow.status,
      created_at: updatedRfqRow.created_at,
      winner_bid_id: winnerBidId,
      winning_bid_id: winnerBidId,
      winning_seller_name: winningSellerName,
      winning_price: winningPrice,
    };

    return jsonSuccess<RFQ>(rfq);
  } catch (error) {
    return handleApiError(error, {
      route: "POST /api/rfq/[id]/select-winner",
      userId,
    });
  }
}
