import { RFQItem, Role, RFQStatus, BidStatus } from "./index";

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          display_name: string;
          role: Role | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          display_name?: string;
          role?: Role | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          display_name?: string;
          role?: Role | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      rfqs: {
        Row: {
          id: string;
          buyer_id: string;
          raw_text: string | null;
          items: RFQItem[];
          delivery_date: string;
          location: string;
          status: RFQStatus;
          winner_bid_id: string | null;
          winning_bid_id?: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          buyer_id: string;
          raw_text?: string | null;
          items: RFQItem[];
          delivery_date: string;
          location: string;
          status?: RFQStatus;
          winner_bid_id?: string | null;
          winning_bid_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          buyer_id?: string;
          raw_text?: string | null;
          items?: RFQItem[];
          delivery_date?: string;
          location?: string;
          status?: RFQStatus;
          winner_bid_id?: string | null;
          winning_bid_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "rfqs_buyer_id_fkey";
            columns: ["buyer_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      bids: {
        Row: {
          id: string;
          rfq_id: string;
          seller_id: string;
          price: number;
          lead_time_days: number;
          notes: string | null;
          status: BidStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          rfq_id: string;
          seller_id: string;
          price: number;
          lead_time_days: number;
          notes?: string | null;
          status?: BidStatus;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          rfq_id?: string;
          seller_id?: string;
          price?: number;
          lead_time_days?: number;
          notes?: string | null;
          status?: BidStatus;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "bids_rfq_id_fkey";
            columns: ["rfq_id"];
            isOneToOne: false;
            referencedRelation: "rfqs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "bids_seller_id_fkey";
            columns: ["seller_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Views: {
      buyer_rfq_overview: {
        Row: {
          id: string;
          buyer_id: string;
          raw_text: string | null;
          items: RFQItem[];
          delivery_date: string;
          location: string;
          status: RFQStatus;
          winner_bid_id: string | null;
          winning_bid_id?: string | null;
          winning_seller_name: string | null;
          winning_price: number | null;
          bid_count: number;
          lowest_price: number | null;
          created_at: string;
        };
        Relationships: [];
      };
      seller_inbox: {
        Row: {
          id: string;
          buyer_id: string;
          raw_text: string | null;
          items: RFQItem[];
          delivery_date: string;
          location: string;
          status: RFQStatus;
          my_bid_id: string | null;
          my_bid_status: BidStatus | null;
          bid_count: number;
          created_at: string;
        };
        Relationships: [];
      };
    };
    Functions: {
      set_my_role: {
        Args: { p_role: Role };
        Returns: {
          id: string;
          email: string;
          display_name: string;
          role: Role;
          created_at: string;
          updated_at: string;
        };
      };
      get_bids_for_rfq: {
        Args: { p_rfq_id: string };
        Returns: {
          id: string;
          rfq_id: string;
          seller_id: string;
          seller_name: string;
          price: number;
          lead_time_days: number;
          notes: string | null;
          status: BidStatus;
          created_at: string;
          is_lowest_price: boolean;
          is_fastest: boolean;
        }[];
      };
      select_winner: {
        Args: { p_rfq_id: string; p_bid_id: string };
        Returns: {
          id: string;
          buyer_id: string;
          raw_text: string | null;
          items: RFQItem[];
          delivery_date: string;
          location: string;
          status: RFQStatus;
          winner_bid_id: string | null;
          created_at: string;
          updated_at: string;
        };
      };
      close_rfq: {
        Args: { p_rfq_id: string };
        Returns: {
          id: string;
          buyer_id: string;
          raw_text: string | null;
          items: RFQItem[];
          delivery_date: string;
          location: string;
          status: RFQStatus;
          winner_bid_id: string | null;
          created_at: string;
          updated_at: string;
        };
      };
    };
  };
};
