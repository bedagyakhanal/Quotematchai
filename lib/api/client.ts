import { ApiErrorCode, ApiResponse } from "@/types";
import { IS_MOCK_MODE } from "@/lib/config";
import { mockHandleRequest } from "@/lib/mocks/handlers";

export class ApiError extends Error {
  code: ApiErrorCode;
  status: number;

  constructor(code: ApiErrorCode, message: string, status = 400) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
  }
}

/**
 * Universal typed request wrapper for all client-to-API communication.
 * Unwraps the { ok: true, data } | { ok: false, error } envelope and throws typed ApiError.
 */
export async function request<T>(
  url: string,
  options?: RequestInit
): Promise<T> {
  // ---------------------------------------------------------
  // MOCK MODE INTERCEPTOR
  // ---------------------------------------------------------
  if (IS_MOCK_MODE) {
    // Check if caller aborted
    if (options?.signal?.aborted) {
      throw new ApiError("NETWORK_ERROR", "Request was aborted by the client.", 0);
    }

    try {
      const response = await mockHandleRequest(url, options);
      if (!response.ok) {
        throw new ApiError(response.error.code, response.error.message);
      }
      return response.data as T;
    } catch (err: any) {
      if (err instanceof ApiError) throw err;
      throw new ApiError("UNKNOWN_ERROR", err.message || "An unexpected error occurred.");
    }
  }

  // ---------------------------------------------------------
  // REAL BACKEND API INTERACTION
  // ---------------------------------------------------------
  try {
    const res = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...options?.headers,
      },
    });

    let json: ApiResponse<T>;
    try {
      json = await res.json();
    } catch {
      if (!res.ok) {
        throw new ApiError(
          res.status === 401
            ? "UNAUTHORIZED"
            : res.status === 403
            ? "FORBIDDEN"
            : res.status === 404
            ? "RFQ_NOT_FOUND"
            : "UNKNOWN_ERROR",
          res.statusText || "Server error occurred",
          res.status
        );
      }
      throw new ApiError("UNKNOWN_ERROR", "Invalid response from server.", res.status);
    }

    if (!json.ok) {
      throw new ApiError(json.error.code, json.error.message, res.status);
    }

    return json.data;
  } catch (err: any) {
    if (err instanceof ApiError) {
      throw err;
    }

    if (err.name === "AbortError") {
      throw new ApiError("NETWORK_ERROR", "Request was cancelled.", 0);
    }

    // Network disconnection / offline
    throw new ApiError(
      "NETWORK_ERROR",
      "Network connection failed. Please check your internet connection.",
      0
    );
  }
}
