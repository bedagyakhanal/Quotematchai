import { NextRequest } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/server/auth";
import { jsonSuccess, handleApiError, ApiAppError } from "@/lib/server/response";
import { getServerCurrentDate } from "@/lib/server/ai-parser";
import { rfqItemSchema, RFQ } from "@/types";

const createRfqServerSchema = z.object({
  rawText: z.string().optional(),
  items: z.array(rfqItemSchema).min(1, "At least one item is required."),
  deliveryDate: z
    .string()
    .min(1, "Delivery date is required.")
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Delivery date must be in YYYY-MM-DD format."),
  location: z.string().trim().min(1, "Delivery location is required."),
});

export async function POST(req: NextRequest) {
  let userId: string | undefined;

  try {
    const { user, supabase } = await requireRole("buyer");
    userId = user.id;

    let body: any;
    try {
      body = await req.json();
    } catch {
      throw new ApiAppError("VALIDATION_ERROR", "Invalid JSON request body.", 400);
    }

    const validated = createRfqServerSchema.parse(body);

    // Enforce business rule: reject past delivery dates on server
    const today = getServerCurrentDate();
    if (validated.deliveryDate < today) {
      throw new ApiAppError(
        "VALIDATION_ERROR",
        `Delivery date cannot be in the past. Today is ${today}.`,
        400
      );
    }

    // Insert into rfqs table (RLS enforces buyer_id = auth.uid())
    const { data: newRfq, error } = await supabase
      .from("rfqs")
      .insert({
        buyer_id: user.id,
        raw_text: validated.rawText || null,
        items: validated.items,
        delivery_date: validated.deliveryDate,
        location: validated.location,
        status: "open",
      })
      .select("*")
      .single();

    if (error) {
      throw error;
    }

    const rfq: RFQ = {
      id: newRfq.id,
      buyer_id: newRfq.buyer_id,
      raw_text: newRfq.raw_text || undefined,
      items: newRfq.items,
      delivery_date: newRfq.delivery_date,
      location: newRfq.location,
      status: newRfq.status,
      created_at: newRfq.created_at,
      bid_count: 0,
      lowest_price: null,
      winner_bid_id: newRfq.winner_bid_id,
    };

    return jsonSuccess<RFQ>(rfq, 201);
  } catch (error) {
    return handleApiError(error, { route: "POST /api/rfq", userId });
  }
}
