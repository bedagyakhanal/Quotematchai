import { NextRequest } from "next/server";
import { requireRole } from "@/lib/server/auth";
import { jsonSuccess, handleApiError, ApiAppError } from "@/lib/server/response";
import { RFQ } from "@/types";


export async function GET(req: NextRequest) {
  let userId: string | undefined;

  try {
    const { searchParams } = new URL(req.url);
    const scope = searchParams.get("scope");

    if (scope === "mine") {
      // Buyer Dashboard: caller must be a buyer
      const { user, supabase } = await requireRole("buyer");
      userId = user.id;

      const { data: rows, error } = await supabase
        .from("buyer_rfq_overview")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        throw error;
      }

      const rfqs: RFQ[] = (rows || []).map((row) => ({
        id: row.id,
        buyer_id: row.buyer_id,
        raw_text: row.raw_text || undefined,
        items: row.items,
        delivery_date: row.delivery_date,
        location: row.location,
        status: row.status,
        created_at: row.created_at,
        bid_count: Number(row.bid_count || 0),
        lowest_price: row.lowest_price !== null ? Number(row.lowest_price) : null,
        winner_bid_id: row.winner_bid_id,
        winning_seller_name: row.winning_seller_name,
        winning_price: row.winning_price !== null ? Number(row.winning_price) : null,
      }));

      return jsonSuccess<RFQ[]>(rfqs);
    } else if (scope === "open") {
      // Seller Inbox: caller must be a seller
      const { user, supabase } = await requireRole("seller");
      userId = user.id;

      const { data: rows, error } = await supabase
        .from("seller_inbox")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        throw error;
      }

      const rfqs: RFQ[] = (rows || []).map((row: any) => ({
        id: row.rfq_id || row.id,
        buyer_id: row.buyer_id || "",
        raw_text: row.raw_text || undefined,
        items: row.items,
        delivery_date: row.delivery_date,
        location: row.location,
        status: row.status,
        created_at: row.created_at,
        bid_count: Number(row.bid_count || 0),
        my_bid_id: row.my_bid_id,
        my_bid_status: row.my_bid_status,
      }));

      return jsonSuccess<RFQ[]>(rfqs);
    } else {
      throw new ApiAppError(
        "VALIDATION_ERROR",
        "Invalid scope query parameter. Expected scope=mine (for buyers) or scope=open (for sellers).",
        400
      );
    }
  } catch (error) {
    return handleApiError(error, { route: "GET /api/rfqs", userId });
  }
}
