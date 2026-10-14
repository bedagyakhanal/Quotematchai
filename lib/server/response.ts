import { NextResponse } from "next/server";
import { z } from "zod";
import { ApiErrorCode, ApiResponse } from "@/types";

export class ApiAppError extends Error {
  code: ApiErrorCode;
  status: number;

  constructor(code: ApiErrorCode, message: string, status = 400) {
    super(message);
    this.name = "ApiAppError";
    this.code = code;
    this.status = status;
  }
}

/**
 * Creates a standard JSON success response matching ApiResponse<T>
 */
export function jsonSuccess<T>(data: T, status = 200): NextResponse<ApiResponse<T>> {
  return NextResponse.json({ ok: true, data }, { status });
}

/**
 * Creates a standard JSON error response matching ApiResponse<never>
 */
export function jsonError(
  code: ApiErrorCode,
  message: string,
  status = 400
): NextResponse<ApiResponse<never>> {
  return NextResponse.json({ ok: false, error: { code, message } }, { status });
}

/**
 * Known Postgres error codes raised as verbatim exception messages by Database Agent functions.
 * Note: Postgres assigns error.code = 'P0001' to all user-raised exceptions;
 * therefore, we switch on error.message, NEVER error.code.
 */
const KNOWN_DB_MESSAGES: Record<string, { code: ApiErrorCode; status: number; message: string }> = {
  UNAUTHORIZED: {
    code: "UNAUTHORIZED",
    status: 401,
    message: "Authentication required. Please sign in.",
  },
  FORBIDDEN: {
    code: "FORBIDDEN",
    status: 403,
    message: "You do not have permission to access or modify this resource.",
  },
  WRONG_ROLE: {
    code: "WRONG_ROLE",
    status: 403,
    message: "This action is restricted to buyers/sellers.",
  },
  ROLE_ALREADY_SET: {
    code: "ROLE_ALREADY_SET",
    status: 409,
    message: "Your role has already been set and cannot be changed.",
  },
  RFQ_NOT_FOUND: {
    code: "RFQ_NOT_FOUND",
    status: 404,
    message: "The requested RFQ was not found.",
  },
  BID_NOT_FOUND: {
    code: "BID_NOT_FOUND",
    status: 404,
    message: "The specified bid was not found.",
  },
  RFQ_CLOSED: {
    code: "RFQ_CLOSED",
    status: 409,
    message: "This RFQ is already awarded or closed.",
  },
};

/**
 * Universal error boundary handler for all Route Handlers.
 * Maps Postgres exceptions, Zod validation errors, deadlocks, and internal errors
 * to the shared ApiResponse envelope.
 */
export function handleApiError(
  error: unknown,
  context?: { route: string; userId?: string }
): NextResponse<ApiResponse<never>> {
  // 1. Explicit ApiAppError thrown intentionally in application code
  if (error instanceof ApiAppError) {
    return jsonError(error.code, error.message, error.status);
  }

  // 2. Zod validation failure
  if (error instanceof z.ZodError) {
    const formatted = error.issues
      .map((issue) => issue.message || `${issue.path.join(".")}: Invalid value`)
      .join("; ");
    return jsonError("VALIDATION_ERROR", formatted || "Invalid input provided.", 400);
  }

  // 3. Database & System exceptions
  if (error && typeof error === "object") {
    const err = error as { message?: string; code?: string; details?: string };
    const rawMessage = err.message ? err.message.trim() : "";
    const rawCode = err.code ? err.code.trim() : "";

    // Check Postgres 40P01 deadlock
    if (rawCode === "40P01") {
      console.warn(`[Deadlock 40P01 at ${context?.route || "unknown"}]`, {
        userId: context?.userId,
        details: err.details,
      });
      return jsonError(
        "INTERNAL_ERROR",
        "The database is busy processing a concurrent update. Please try again.",
        503
      );
    }

    // Check known DB exception message (error.code is 'P0001', error.message is the exception key)
    if (rawMessage && KNOWN_DB_MESSAGES[rawMessage]) {
      const mapped = KNOWN_DB_MESSAGES[rawMessage];
      return jsonError(mapped.code, mapped.message, mapped.status);
    }

    // Postgres unique constraint violation (e.g. 23505)
    if (rawCode === "23505") {
      return jsonError(
        "VALIDATION_ERROR",
        "A record with this information already exists.",
        409
      );
    }
  }

  // 4. Unexpected / Unhandled Error (Log full diagnostic context server-side, never leak to client)
  console.error(`[Unhandled Server Error at ${context?.route || "unknown"}]`, {
    userId: context?.userId,
    error,
  });

  return jsonError("INTERNAL_ERROR", "Something went wrong. Please try again.", 500);
}
