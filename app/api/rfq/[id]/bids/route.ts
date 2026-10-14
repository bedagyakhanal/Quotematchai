import { NextRequest } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/server/auth";
import { jsonSuccess, handleApiError, ApiAppError } from "@/lib/server/response";
import { Bid, submitBidSchema } from "@/types";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * GET /api/rfq/[id]/bids: Buyer retrieves all bids submitted for their RFQ.
 */

export async function GET(
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

    // Call Database Agent RPC: get_bids_for_rfq
    const { data: rows, error } = await supabase.rpc("get_bids_for_rfq", {
      p_rfq_id: rfqId,
    });

    if (error) {
      throw error;
    }

    const bids: Bid[] = (rows || []).map((row) => ({
      id: row.id,
      rfq_id: row.rfq_id,
      seller_id: row.seller_id,
      seller_name: row.seller_name,
      price: Number(row.price),
      lead_time_days: Number(row.lead_time_days),
      notes: row.notes || undefined,
      status: row.status,
      created_at: row.created_at,
      is_lowest_price: Boolean(row.is_lowest_price),
      is_fastest: Boolean(row.is_fastest),
    }));

    return jsonSuccess<Bid[]>(bids);
  } catch (error) {
    return handleApiError(error, { route: "GET /api/rfq/[id]/bids", userId });
  }
}

/**
 * POST /api/rfq/[id]/bids: Seller submits or updates a bid on an open RFQ.
 * Includes explicit 40P01 deadlock handling with a single automatic retry.
 */
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  let userId: string | undefined;

  try {
    const { user, supabase } = await requireRole("seller");
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

    const validated = submitBidSchema.parse(body);

    // Upsert operation helper with deadlock handling
    const executeUpsert = async () => {
      return await supabase
        .from("bids")
        .upsert(
          {
            rfq_id: rfqId,
            seller_id: user.id,
            price: validated.price,
            lead_time_days: validated.leadTimeDays,
            notes: validated.notes || null,
            status: "pending",
          },
          { onConflict: "rfq_id,seller_id" }
        )
        .select("*")
        .single();
    };

    let result = await executeUpsert();

    // Catch 40P01 deadlock: retry exactly once after short jittered backoff (50-150ms)
    if (result.error && (result.error as any).code === "40P01") {
      console.warn(
        `[Deadlock 40P01 in POST /api/rfq/${rfqId}/bids] Retrying once after jitter...`
      );
      const jitterMs = Math.floor(Math.random() * 100) + 50;
      await delay(jitterMs);
      result = await executeUpsert();

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

    const savedRow = result.data;
    const bid: Bid = {
      id: savedRow.id,
      rfq_id: savedRow.rfq_id,
      seller_id: savedRow.seller_id,
      seller_name: user.user_metadata?.display_name || user.email?.split("@")[0] || "Seller",
      price: Number(savedRow.price),
      lead_time_days: Number(savedRow.lead_time_days),
      notes: savedRow.notes || undefined,
      status: savedRow.status,
      created_at: savedRow.created_at,
    };

    return jsonSuccess<Bid>(bid, 200);
  } catch (error) {
    return handleApiError(error, { route: "POST /api/rfq/[id]/bids", userId });
  }
}
