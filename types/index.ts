import { z } from "zod";

export type Role = "buyer" | "seller";

export type RFQStatus = "open" | "awarded" | "closed";

export type BidStatus = "pending" | "won" | "lost";

export interface RFQItem {
  id?: string;
  name: string;
  quantity: number;
  unit?: string;
}

export interface RFQ {
  id: string;
  raw_text?: string;
  items: RFQItem[];
  delivery_date: string;
  location: string;
  status: RFQStatus;
  created_at: string;
  buyer_id?: string;
  bid_count?: number;
  lowest_price?: number | null;
  winner_bid_id?: string | null;
  winning_seller_name?: string | null;
  winning_price?: number | null;
  // Seller inbox specific fields
  my_bid_id?: string | null;
  my_bid_status?: BidStatus | null;
}

export interface Bid {
  id: string;
  rfq_id: string;
  seller_id?: string;
  seller_name: string;
  price: number;
  lead_time_days: number;
  notes?: string;
  status: BidStatus;
  created_at: string;
  is_lowest_price?: boolean;
  is_fastest?: boolean;
}

export interface Profile {
  id: string;
  email: string;
  display_name: string;
  role: Role | null;
}

// -------------------------------------------------------------
// AI Parsing Schema & DTO
// -------------------------------------------------------------
export const rfqItemSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Item name is required"),
  quantity: z.coerce.number().positive("Quantity must be greater than 0"),
  unit: z.string().optional(),
});

export const parsedRfqSchema = z.object({
  items: z.array(rfqItemSchema).min(1, "At least one item is required"),
  deliveryDate: z.string().optional().default(""),
  location: z.string().optional().default(""),
  missingFields: z.array(z.string()).default([]),
  assumptions: z.array(z.string()).optional().default([]),
});

export type ParsedRfqDraft = z.infer<typeof parsedRfqSchema>;

export const createRfqSchema = z.object({
  rawText: z.string().optional(),
  items: z.array(rfqItemSchema).min(1, "Add at least one item"),
  deliveryDate: z.string().min(1, "Delivery date is required"),
  location: z.string().min(1, "Delivery location is required"),
});

export type CreateRfqInput = z.infer<typeof createRfqSchema>;

export const submitBidSchema = z.object({
  price: z.coerce
    .number()
    .positive("Price must be greater than 0"),
  leadTimeDays: z.coerce
    .number()
    .int("Lead time must be whole days")
    .min(0, "Lead time cannot be negative")
    .max(365, "Lead time cannot exceed 365 days"),
  notes: z.string().max(1000, "Notes cannot exceed 1000 characters").optional(),
});

export type SubmitBidInput = z.infer<typeof submitBidSchema>;

// -------------------------------------------------------------
// API Response Envelope & Error Codes
// -------------------------------------------------------------
export type ApiErrorCode =
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "WRONG_ROLE"
  | "ROLE_ALREADY_SET"
  | "RFQ_NOT_FOUND"
  | "RFQ_CLOSED"
  | "BID_NOT_FOUND"
  | "VALIDATION_ERROR"
  | "AI_PARSE_FAILED"
  | "AI_TIMEOUT"
  | "RATE_LIMITED"
  | "NETWORK_ERROR"
  | "UNKNOWN_ERROR";

export type ApiResponse<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: ApiErrorCode; message: string } };
