import { NextRequest } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/server/auth";
import { checkRateLimit } from "@/lib/server/rate-limiter";
import { parseRfqWithAI } from "@/lib/server/ai-parser";
import { jsonSuccess, jsonError, handleApiError, ApiAppError } from "@/lib/server/response";
import { ParsedRfqDraft } from "@/types";

const parseRequestSchema = z.object({
  text: z
    .string()
    .trim()
    .min(1, "Request text cannot be empty or whitespace-only.")
    .max(2000, "Request text cannot exceed 2000 characters."),
});

export async function POST(req: NextRequest) {
  let userId: string | undefined;

  try {
    // 1. Role verification: caller must be an authenticated buyer
    const { user } = await requireRole("buyer");
    userId = user.id;

    // 2. Validate body before calling rate limiter or AI model (don't burn limits on bad input)
    let body: any;
    try {
      body = await req.json();
    } catch {
      throw new ApiAppError(
        "VALIDATION_ERROR",
        "Invalid JSON request body.",
        400
      );
    }

    const { text } = parseRequestSchema.parse(body);

    // 3. Rate limiting check (5 requests per minute per user ID)
    const rateLimit = checkRateLimit(userId, 5, 60 * 1000);
    if (!rateLimit.allowed) {
      return jsonError(
        "RATE_LIMITED",
        `Too many parsing requests. Please wait ${rateLimit.retryAfterSeconds || 60} seconds before trying again.`,
        429
      );
    }

    // 4. Invoke AI parsing engine (with 12s hard timeout and single corrective retry)
    const parsedDraft: ParsedRfqDraft = await parseRfqWithAI(text);

    return jsonSuccess<ParsedRfqDraft>(parsedDraft);
  } catch (error) {
    return handleApiError(error, { route: "POST /api/rfq/parse", userId });
  }
}
