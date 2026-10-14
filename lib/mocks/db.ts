import { Profile, RFQ, Bid } from "@/types";

export interface MockStore {
  currentUser: Profile;
  users: Profile[];
  rfqs: RFQ[];
  bids: Bid[];
}

const INITIAL_USERS: Profile[] = [
  {
    id: "usr_buyer_1",
    email: "buyer@quotematch.test",
    display_name: "Apex Construction",
    role: "buyer",
  },
  {
    id: "usr_seller_1",
    email: "metro@supplies.test",
    display_name: "Metro Building Supplies",
    role: "seller",
  },
  {
    id: "usr_seller_2",
    email: "rapid@materials.test",
    display_name: "Rapid Logistics & Stone",
    role: "seller",
  },
];

const INITIAL_RFQS: RFQ[] = [
  {
    id: "rfq_1",
    buyer_id: "usr_buyer_1",
    raw_text:
      "Need 200 sheets of 1/2 inch drywall delivered to Westside Lofts by next Monday",
    items: [
      {
        id: "item_1_1",
        name: "1/2 inch drywall sheets (4x8)",
        quantity: 200,
        unit: "sheets",
      },
    ],
    delivery_date: "2026-10-22",
    location: "Westside Lofts, 452 9th Ave, Downtown",
    status: "open",
    created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
    bid_count: 0,
    lowest_price: null,
  },
  {
    id: "rfq_2",
    buyer_id: "usr_buyer_1",
    raw_text:
      "500 standard red clay bricks and 20 bags of Portland cement delivered to Midtown Jobsite by Friday",
    items: [
      {
        id: "item_2_1",
        name: "Standard red clay bricks",
        quantity: 500,
        unit: "pieces",
      },
      {
        id: "item_2_2",
        name: "Portland cement Type I/II",
        quantity: 20,
        unit: "bags (94lb)",
      },
    ],
    delivery_date: "2026-10-18",
    location: "Midtown Jobsite, 1200 Broadway",
    status: "open",
    created_at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(), // 5 hours ago
    bid_count: 2,
    lowest_price: 1150,
  },
  {
    id: "rfq_3",
    buyer_id: "usr_buyer_1",
    raw_text:
      "30 bags of quick-set concrete mix for curbside delivery to Harbor Dock",
    items: [
      {
        id: "item_3_1",
        name: "Quick-set concrete mix",
        quantity: 30,
        unit: "bags (50lb)",
      },
    ],
    delivery_date: "2026-10-10",
    location: "Harbor Industrial Park, Dock 4",
    status: "awarded",
    created_at: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
    winner_bid_id: "bid_3_1",
    winning_seller_name: "Rapid Logistics & Stone",
    winning_price: 450,
    bid_count: 2,
    lowest_price: 450,
  },
];

const INITIAL_BIDS: Bid[] = [
  // Bids for rfq_2
  {
    id: "bid_2_1",
    rfq_id: "rfq_2",
    seller_id: "usr_seller_1",
    seller_name: "Metro Building Supplies",
    price: 1150,
    lead_time_days: 4,
    notes:
      "Includes curbside forklift offloading. High-durability ASTM C62 grade-SW clay bricks in stock.",
    status: "pending",
    created_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    is_lowest_price: true,
    is_fastest: false,
  },
  {
    id: "bid_2_2",
    rfq_id: "rfq_2",
    seller_id: "usr_seller_2",
    seller_name: "Rapid Logistics & Stone",
    price: 1320,
    lead_time_days: 1,
    notes:
      "Express flatbed delivery guaranteed tomorrow morning by 9 AM. Pre-palletized and shrink-wrapped.",
    status: "pending",
    created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    is_lowest_price: false,
    is_fastest: true,
  },
  // Bids for rfq_3 (awarded)
  {
    id: "bid_3_1",
    rfq_id: "rfq_3",
    seller_id: "usr_seller_2",
    seller_name: "Rapid Logistics & Stone",
    price: 450,
    lead_time_days: 2,
    notes: "Direct dock drop-off completed on time.",
    status: "won",
    created_at: new Date(Date.now() - 40 * 60 * 60 * 1000).toISOString(),
    is_lowest_price: true,
    is_fastest: true,
  },
  {
    id: "bid_3_2",
    rfq_id: "rfq_3",
    seller_id: "usr_seller_1",
    seller_name: "Metro Building Supplies",
    price: 520,
    lead_time_days: 3,
    notes: "Standard commercial freight.",
    status: "lost",
    created_at: new Date(Date.now() - 38 * 60 * 60 * 1000).toISOString(),
    is_lowest_price: false,
    is_fastest: false,
  },
];

// In-memory singleton for mock data
class MockDatabase {
  private store: MockStore;

  constructor() {
    this.store = {
      currentUser: { ...INITIAL_USERS[0] }, // defaults to buyer
      users: [...INITIAL_USERS],
      rfqs: JSON.parse(JSON.stringify(INITIAL_RFQS)),
      bids: JSON.parse(JSON.stringify(INITIAL_BIDS)),
    };
  }

  getCurrentUser(): Profile {
    return { ...this.store.currentUser };
  }

  setCurrentUser(user: Profile) {
    this.store.currentUser = { ...user };
  }

  switchRole(role: "buyer" | "seller") {
    if (role === "buyer") {
      this.store.currentUser = { ...this.store.users[0] };
    } else {
      this.store.currentUser = { ...this.store.users[1] };
    }
  }

  setRoleForCurrentUser(role: "buyer" | "seller"): Profile {
    this.store.currentUser.role = role;
    const existing = this.store.users.find(
      (u) => u.id === this.store.currentUser.id
    );
    if (existing) {
      existing.role = role;
    }
    return { ...this.store.currentUser };
  }

  getRfqs(): RFQ[] {
    return this.store.rfqs.map((rfq) => {
      const rfqBids = this.store.bids.filter((b) => b.rfq_id === rfq.id);
      const lowest = rfqBids.length
        ? Math.min(...rfqBids.map((b) => b.price))
        : null;
      const myBid = rfqBids.find(
        (b) => b.seller_id === this.store.currentUser.id
      );

      return {
        ...rfq,
        bid_count: rfqBids.length,
        lowest_price: lowest,
        my_bid_id: myBid?.id || null,
        my_bid_status: myBid?.status || null,
      };
    });
  }

  getRfq(id: string): RFQ | null {
    const rfqs = this.getRfqs();
    return rfqs.find((r) => r.id === id) || null;
  }

  addRfq(rfqData: Omit<RFQ, "id" | "created_at" | "status" | "bid_count" | "lowest_price">): RFQ {
    const newRfq: RFQ = {
      ...rfqData,
      id: `rfq_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      status: "open",
      created_at: new Date().toISOString(),
      buyer_id: this.store.currentUser.id,
      bid_count: 0,
      lowest_price: null,
    };
    this.store.rfqs.unshift(newRfq);
    return newRfq;
  }

  getBidsForRfq(rfqId: string): Bid[] {
    const rfqBids = this.store.bids.filter((b) => b.rfq_id === rfqId);
    if (!rfqBids.length) return [];

    const minPrice = Math.min(...rfqBids.map((b) => b.price));
    const minLeadTime = Math.min(...rfqBids.map((b) => b.lead_time_days));

    return rfqBids.map((b) => ({
      ...b,
      is_lowest_price: b.price === minPrice,
      is_fastest: b.lead_time_days === minLeadTime,
    }));
  }

  upsertBid(
    rfqId: string,
    data: { price: number; leadTimeDays: number; notes?: string }
  ): Bid {
    const existingIndex = this.store.bids.findIndex(
      (b) => b.rfq_id === rfqId && b.seller_id === this.store.currentUser.id
    );

    if (existingIndex >= 0) {
      const updated: Bid = {
        ...this.store.bids[existingIndex],
        price: data.price,
        lead_time_days: data.leadTimeDays,
        notes: data.notes,
      };
      this.store.bids[existingIndex] = updated;
      return updated;
    }

    const newBid: Bid = {
      id: `bid_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      rfq_id: rfqId,
      seller_id: this.store.currentUser.id,
      seller_name: this.store.currentUser.display_name,
      price: data.price,
      lead_time_days: data.leadTimeDays,
      notes: data.notes,
      status: "pending",
      created_at: new Date().toISOString(),
    };
    this.store.bids.push(newBid);

    // Update RFQ bid count & lowest price
    const rfq = this.store.rfqs.find((r) => r.id === rfqId);
    if (rfq) {
      const bids = this.store.bids.filter((b) => b.rfq_id === rfqId);
      rfq.bid_count = bids.length;
      rfq.lowest_price = Math.min(...bids.map((b) => b.price));
    }

    return newBid;
  }

  selectWinner(rfqId: string, bidId: string): RFQ {
    const rfq = this.store.rfqs.find((r) => r.id === rfqId);
    if (!rfq) {
      throw new Error("RFQ_NOT_FOUND");
    }

    // Idempotent: if already awarded to this bid, succeed
    if (rfq.status === "awarded" && rfq.winner_bid_id === bidId) {
      return rfq;
    }

    const winningBid = this.store.bids.find(
      (b) => b.id === bidId && b.rfq_id === rfqId
    );
    if (!winningBid) {
      throw new Error("BID_NOT_FOUND");
    }

    // Update all bids for this RFQ: winning bid -> won, others -> lost
    this.store.bids.forEach((b) => {
      if (b.rfq_id === rfqId) {
        b.status = b.id === bidId ? "won" : "lost";
      }
    });

    rfq.status = "awarded";
    rfq.winner_bid_id = bidId;
    rfq.winning_seller_name = winningBid.seller_name;
    rfq.winning_price = winningBid.price;

    return rfq;
  }

  reset() {
    this.store = {
      currentUser: { ...INITIAL_USERS[0] },
      users: [...INITIAL_USERS],
      rfqs: JSON.parse(JSON.stringify(INITIAL_RFQS)),
      bids: JSON.parse(JSON.stringify(INITIAL_BIDS)),
    };
  }
}

export const mockDb = new MockDatabase();
