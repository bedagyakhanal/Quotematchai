import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/server/auth";
import { jsonSuccess, handleApiError, ApiAppError } from "@/lib/server/response";
import { RFQ } from "@/types";


export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  let userId: string | undefined;

  try {
    const { user, supabase } = await requireAuth();
    userId = user.id;

    const { id } = await context.params;

    if (!id || id.trim() === "" || id === "undefined") {
      throw new ApiAppError("RFQ_NOT_FOUND", "The requested RFQ was not found.", 404);
    }

    // Query rfqs table. Supabase RLS policies restrict buyers to their own RFQs
    // and sellers to open RFQs or RFQs they have bid on.
    const { data: row, error } = await supabase
      .from("rfqs")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!row) {
      // Do not leak whether the RFQ exists under another user vs doesn't exist at all
      throw new ApiAppError("RFQ_NOT_FOUND", "The requested RFQ was not found.", 404);
    }

    // Check bid count and lowest price for buyer view
    const { data: bids } = await supabase
      .from("bids")
      .select("price")
      .eq("rfq_id", id);

    const bidCount = bids?.length || 0;
    const lowestPrice =
      bids && bids.length > 0
        ? Math.min(...bids.map((b) => Number(b.price)))
        : null;

    const rfq: RFQ = {
      id: row.id,
      buyer_id: row.buyer_id,
      raw_text: row.raw_text || undefined,
      items: row.items,
      delivery_date: row.delivery_date,
      location: row.location,
      status: row.status,
      created_at: row.created_at,
      bid_count: bidCount,
      lowest_price: lowestPrice,
      winner_bid_id: row.winner_bid_id,
    };

    return jsonSuccess<RFQ>(rfq);
  } catch (error) {
    return handleApiError(error, { route: "GET /api/rfq/[id]", userId });
  }
}
