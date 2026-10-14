import {
  ParsedRfqDraft,
  RFQ,
  Bid,
  Profile,
  Role,
  ApiErrorCode,
} from "@/types";
import { mockDb } from "./db";

// Helper for simulated latency
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function getSimulatedLatency(): number {
  return Math.floor(Math.random() * (700 - 300 + 1)) + 300;
}

// Checks query param or session storage for testing failure modes
export function getMockFailureMode(): string | null {
  if (typeof window === "undefined") return null;
  const urlParams = new URLSearchParams(window.location.search);
  const param = urlParams.get("mockFail");
  if (param) return param.toLowerCase();
  return sessionStorage.getItem("quotematch_mock_fail");
}

export function setMockFailureMode(mode: string | null) {
  if (typeof window === "undefined") return;
  if (mode) {
    sessionStorage.setItem("quotematch_mock_fail", mode);
  } else {
    sessionStorage.removeItem("quotematch_mock_fail");
  }
}

export async function mockHandleRequest(
  url: string,
  options?: RequestInit
): Promise<{ ok: true; data: any } | { ok: false; error: { code: ApiErrorCode; message: string } }> {
  await delay(getSimulatedLatency());

  // Check simulated failure triggers
  const failureMode = getMockFailureMode();
  if (failureMode) {
    if (failureMode === "ai_timeout" && url.includes("/api/rfq/parse")) {
      await delay(1200);
      return {
        ok: false,
        error: { code: "AI_TIMEOUT", message: "AI parsing service timed out." },
      };
    }
    if (failureMode === "rate_limited") {
      return {
        ok: false,
        error: {
          code: "RATE_LIMITED",
          message: "Too many requests. Please wait a moment before trying again.",
        },
      };
    }
    if (failureMode === "ai_parse_failed" && url.includes("/api/rfq/parse")) {
      return {
        ok: false,
        error: {
          code: "AI_PARSE_FAILED",
          message: "We couldn't structure that automatically. Please review or enter manually.",
        },
      };
    }
    if (failureMode === "offline") {
      return {
        ok: false,
        error: {
          code: "NETWORK_ERROR",
          message: "You appear to be offline. Your typed text has been preserved.",
        },
      };
    }
  }

  const method = (options?.method || "GET").toUpperCase();
  const urlObj = new URL(url, "http://localhost");
  const pathname = urlObj.pathname;

  // -------------------------------------------------------------
  // GET /api/profile
  // -------------------------------------------------------------
  if (pathname === "/api/profile" && method === "GET") {
    return { ok: true, data: mockDb.getCurrentUser() };
  }

  // -------------------------------------------------------------
  // POST /api/profile/role
  // -------------------------------------------------------------
  if (pathname === "/api/profile/role" && method === "POST") {
    const body = options?.body ? JSON.parse(options.body as string) : {};
    const role = body.role as Role;
    if (!role || (role !== "buyer" && role !== "seller")) {
      return {
        ok: false,
        error: { code: "VALIDATION_ERROR", message: "Invalid role specified." },
      };
    }

    const current = mockDb.getCurrentUser();
    if (current.role && current.role !== role) {
      // Role is permanent
      return {
        ok: false,
        error: {
          code: "ROLE_ALREADY_SET",
          message: "Role is already set and cannot be changed.",
        },
      };
    }

    const updated = mockDb.setRoleForCurrentUser(role);
    return { ok: true, data: updated };
  }

  // -------------------------------------------------------------
  // POST /api/rfq/parse (AI Parser)
  // -------------------------------------------------------------
  if (pathname === "/api/rfq/parse" && method === "POST") {
    const body = options?.body ? JSON.parse(options.body as string) : {};
    const text: string = (body.text || "").trim();

    if (!text) {
      return {
        ok: false,
        error: { code: "VALIDATION_ERROR", message: "Please enter your request text." },
      };
    }

    // Check for obvious gibberish or non-sensical single word
    if (text.length < 5 || (!text.includes(" ") && !/\d/.test(text))) {
      const draft: ParsedRfqDraft = {
        items: [{ name: text, quantity: 1, unit: "units" }],
        deliveryDate: "",
        location: "",
        missingFields: ["deliveryDate", "location"],
        assumptions: [],
      };
      return { ok: true, data: draft };
    }

    // Realistic smart extraction mock
    const lower = text.toLowerCase();
    const items: Array<{ name: string; quantity: number; unit?: string }> = [];
    const missingFields: string[] = [];
    const assumptions: string[] = [];

    // Bricks detection
    const brickMatch = text.match(/(\d+)\s*(?:standard\s*)?(?:red\s*)?(?:clay\s*)?bricks?/i);
    if (brickMatch) {
      items.push({
        name: "Standard red clay bricks",
        quantity: parseInt(brickMatch[1], 10),
        unit: "pieces",
      });
    }

    // Cement detection
    const cementMatch = text.match(/(\d+)\s*(?:bags?\s*of\s*)?cement/i);
    if (cementMatch) {
      items.push({
        name: "Portland cement",
        quantity: parseInt(cementMatch[1], 10),
        unit: "bags (94lb)",
      });
    }

    // Drywall detection
    const drywallMatch = text.match(/(\d+)\s*(?:sheets?\s*of\s*)?(?:1\/2\s*inch\s*)?drywall/i);
    if (drywallMatch) {
      items.push({
        name: "1/2 inch drywall sheets",
        quantity: parseInt(drywallMatch[1], 10),
        unit: "sheets (4x8)",
      });
    }

    // Sand / gravel detection
    const sandMatch = text.match(/(\d+)\s*(?:tons?\s*of\s*)?(?:masonry\s*)?sand/i);
    if (sandMatch) {
      items.push({
        name: "Masonry sand",
        quantity: parseInt(sandMatch[1], 10),
        unit: "tons",
      });
    }

    // Fallback if no known patterns matched
    if (items.length === 0) {
      const genericQtyMatch = text.match(/(\d+)\s+([a-zA-Z\s]+)/);
      if (genericQtyMatch) {
        items.push({
          name: genericQtyMatch[2].trim(),
          quantity: parseInt(genericQtyMatch[1], 10),
          unit: "units",
        });
      } else {
        items.push({
          name: text.slice(0, 40),
          quantity: 1,
          unit: "units",
        });
        missingFields.push("quantity");
      }
    }

    // Location detection
    let location = "";
    if (lower.includes("downtown")) {
      location = "Downtown Central Business District";
    } else if (lower.includes("westside")) {
      location = "Westside Industrial Park, 452 9th Ave";
    } else if (lower.includes("midtown")) {
      location = "Midtown Jobsite, 1200 Broadway";
    } else {
      const locMatch = text.match(/(?:delivered to|to|at)\s+([^,.]+)/i);
      if (locMatch && locMatch[1].trim().length > 3) {
        location = locMatch[1].trim();
      } else {
        missingFields.push("location");
      }
    }

    // Date detection
    let deliveryDate = "";
    const futureDate = new Date();
    if (lower.includes("friday")) {
      futureDate.setDate(futureDate.getDate() + ((5 + 7 - futureDate.getDay()) % 7 || 7));
      deliveryDate = futureDate.toISOString().split("T")[0];
      assumptions.push(`Assumed Friday = ${deliveryDate}`);
    } else if (lower.includes("monday")) {
      futureDate.setDate(futureDate.getDate() + ((1 + 7 - futureDate.getDay()) % 7 || 7));
      deliveryDate = futureDate.toISOString().split("T")[0];
      assumptions.push(`Assumed Monday = ${deliveryDate}`);
    } else if (lower.includes("tomorrow")) {
      futureDate.setDate(futureDate.getDate() + 1);
      deliveryDate = futureDate.toISOString().split("T")[0];
      assumptions.push(`Assumed Tomorrow = ${deliveryDate}`);
    } else {
      // Default to 5 days out if mentioned "soon" or leave missing
      if (lower.includes("soon") || lower.includes("urgent")) {
        futureDate.setDate(futureDate.getDate() + 3);
        deliveryDate = futureDate.toISOString().split("T")[0];
        assumptions.push(`Urgent request: suggested delivery in 3 days (${deliveryDate})`);
      } else {
        missingFields.push("deliveryDate");
      }
    }

    const draft: ParsedRfqDraft = {
      items,
      deliveryDate,
      location,
      missingFields,
      assumptions,
    };

    return { ok: true, data: draft };
  }

  // -------------------------------------------------------------
  // POST /api/rfq (Create RFQ)
  // -------------------------------------------------------------
  if (pathname === "/api/rfq" && method === "POST") {
    const body = options?.body ? JSON.parse(options.body as string) : {};
    if (!body.items || body.items.length === 0) {
      return {
        ok: false,
        error: { code: "VALIDATION_ERROR", message: "Add at least one item." },
      };
    }
    if (!body.deliveryDate || !body.location) {
      return {
        ok: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Delivery date and location are required.",
        },
      };
    }

    const created = mockDb.addRfq({
      raw_text: body.rawText,
      items: body.items,
      delivery_date: body.deliveryDate,
      location: body.location,
    });

    return { ok: true, data: created };
  }

  // -------------------------------------------------------------
  // GET /api/rfqs?scope=mine | scope=open
  // -------------------------------------------------------------
  if (pathname === "/api/rfqs" && method === "GET") {
    const scope = urlObj.searchParams.get("scope");
    const allRfqs = mockDb.getRfqs();

    if (scope === "mine") {
      // Buyer dashboard: all RFQs created by this buyer
      const user = mockDb.getCurrentUser();
      const mine = allRfqs.filter((r) => r.buyer_id === user.id);
      return { ok: true, data: mine };
    }

    if (scope === "open") {
      // Seller feed: open RFQs + ones the seller already bid on
      const user = mockDb.getCurrentUser();
      const openOrBid = allRfqs.filter((r) => {
        if (r.status === "open") return true;
        // Also show awarded/closed if this seller participated
        return r.my_bid_id !== null;
      });
      return { ok: true, data: openOrBid };
    }

    return { ok: true, data: allRfqs };
  }

  // -------------------------------------------------------------
  // Matches /api/rfq/[id]/select-winner
  // -------------------------------------------------------------
  const selectWinnerMatch = pathname.match(/^\/api\/rfq\/([^/]+)\/select-winner$/);
  if (selectWinnerMatch && method === "POST") {
    const rfqId = selectWinnerMatch[1];
    const body = options?.body ? JSON.parse(options.body as string) : {};
    const bidId = body.bidId;

    if (!bidId) {
      return {
        ok: false,
        error: { code: "VALIDATION_ERROR", message: "bidId is required." },
      };
    }

    try {
      const updated = mockDb.selectWinner(rfqId, bidId);
      return { ok: true, data: updated };
    } catch (err: any) {
      if (err.message === "RFQ_NOT_FOUND") {
        return {
          ok: false,
          error: { code: "RFQ_NOT_FOUND", message: "This RFQ was not found." },
        };
      }
      if (err.message === "BID_NOT_FOUND") {
        return {
          ok: false,
          error: { code: "BID_NOT_FOUND", message: "This bid was not found." },
        };
      }
      return {
        ok: false,
        error: { code: "UNKNOWN_ERROR", message: "Could not select winner." },
      };
    }
  }

  // -------------------------------------------------------------
  // Matches /api/rfq/[id]/bids
  // -------------------------------------------------------------
  const bidsMatch = pathname.match(/^\/api\/rfq\/([^/]+)\/bids$/);
  if (bidsMatch) {
    const rfqId = bidsMatch[1];

    if (method === "GET") {
      const bids = mockDb.getBidsForRfq(rfqId);
      return { ok: true, data: bids };
    }

    if (method === "POST") {
      const body = options?.body ? JSON.parse(options.body as string) : {};
      const rfq = mockDb.getRfq(rfqId);

      if (!rfq) {
        return {
          ok: false,
          error: { code: "RFQ_NOT_FOUND", message: "RFQ does not exist." },
        };
      }

      if (rfq.status !== "open") {
        return {
          ok: false,
          error: {
            code: "RFQ_CLOSED",
            message: "This RFQ has already been awarded and is closed for new bids.",
          },
        };
      }

      const bid = mockDb.upsertBid(rfqId, {
        price: Number(body.price),
        leadTimeDays: Number(body.leadTimeDays),
        notes: body.notes,
      });

      return { ok: true, data: bid };
    }
  }

  // -------------------------------------------------------------
  // Matches /api/rfq/[id] (Single RFQ Detail)
  // -------------------------------------------------------------
  const singleRfqMatch = pathname.match(/^\/api\/rfq\/([^/]+)$/);
  if (singleRfqMatch && method === "GET") {
    const rfqId = singleRfqMatch[1];
    const rfq = mockDb.getRfq(rfqId);
    if (!rfq) {
      return {
        ok: false,
        error: { code: "RFQ_NOT_FOUND", message: "RFQ not found." },
      };
    }
    return { ok: true, data: rfq };
  }

  return {
    ok: false,
    error: {
      code: "UNKNOWN_ERROR",
      message: `No mock route matched for ${method} ${pathname}`,
    },
  };
}
