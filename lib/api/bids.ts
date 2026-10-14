import { Bid, SubmitBidInput } from "@/types";
import { request } from "./client";

/**
 * Fetch all bids submitted for a specific RFQ (Buyer view).
 */
export async function getRfqBids(rfqId: string): Promise<Bid[]> {
  return request<Bid[]>(`/api/rfq/${encodeURIComponent(rfqId)}/bids`, {
    method: "GET",
  });
}

/**
 * Submit or update a seller's bid on an open RFQ.
 */
export async function submitBid(
  rfqId: string,
  input: SubmitBidInput
): Promise<Bid> {
  return request<Bid>(`/api/rfq/${encodeURIComponent(rfqId)}/bids`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}
