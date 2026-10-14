import { CreateRfqInput, ParsedRfqDraft, RFQ } from "@/types";
import { request } from "./client";

/**
 * Sends free-form raw text to the backend/AI to parse into structured fields.
 */
export async function parseRfqText(
  text: string,
  signal?: AbortSignal
): Promise<ParsedRfqDraft> {
  return request<ParsedRfqDraft>("/api/rfq/parse", {
    method: "POST",
    body: JSON.stringify({ text }),
    signal,
  });
}

/**
 * Confirms and creates a live RFQ.
 */
export async function createRfq(input: CreateRfqInput): Promise<RFQ> {
  return request<RFQ>("/api/rfq", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

/**
 * Buyer dashboard: fetch all RFQs created by the current buyer.
 */
export async function getMyRfqs(): Promise<RFQ[]> {
  return request<RFQ[]>("/api/rfqs?scope=mine", {
    method: "GET",
  });
}

/**
 * Seller inbox: fetch all open RFQs (and RFQs the seller has placed bids on).
 */
export async function getOpenRfqs(): Promise<RFQ[]> {
  return request<RFQ[]>("/api/rfqs?scope=open", {
    method: "GET",
  });
}

/**
 * Fetch a single RFQ by ID.
 */
export async function getRfqById(id: string): Promise<RFQ> {
  return request<RFQ>(`/api/rfq/${encodeURIComponent(id)}`, {
    method: "GET",
  });
}

/**
 * Buyer selects a winning bid for an RFQ (idempotent action).
 */
export async function selectWinner(rfqId: string, bidId: string): Promise<RFQ> {
  return request<RFQ>(`/api/rfq/${encodeURIComponent(rfqId)}/select-winner`, {
    method: "POST",
    body: JSON.stringify({ bidId }),
  });
}
