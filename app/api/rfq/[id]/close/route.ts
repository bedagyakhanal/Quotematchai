import { NextRequest } from "next/server";
import { requireRole } from "@/lib/server/auth";
import { jsonSuccess, handleApiError, ApiAppError } from "@/lib/server/response";
import { RFQ } from "@/types";

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

    // Call Database Agent RPC: close_rfq(p_rfq_id)
    const { data: updatedRfqRow, error } = await supabase.rpc("close_rfq", {
      p_rfq_id: rfqId,
    });

    if (error) {
      throw error;
    }

    const row = updatedRfqRow || (await supabase.from("rfqs").select("*").eq("id", rfqId).single()).data;

    if (!row) {
      throw new ApiAppError("RFQ_NOT_FOUND", "The requested RFQ was not found.", 404);
    }

    const rfq: RFQ = {
      id: row.id,
      buyer_id: row.buyer_id,
      raw_text: row.raw_text || undefined,
      items: row.items,
      delivery_date: row.delivery_date,
      location: row.location,
      status: row.status,
      created_at: row.created_at,
      winner_bid_id: row.winner_bid_id,
    };

    return jsonSuccess<RFQ>(rfq);
  } catch (error) {
    return handleApiError(error, { route: "POST /api/rfq/[id]/close", userId });
  }
}
