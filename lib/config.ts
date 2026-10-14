export const APP_NAME = "QuoteMatch";
export const APP_TAGLINE = "Frictionless AI-powered marketplace for contractors & suppliers";

export const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ||
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.NODE_ENV === "production"
    ? "https://quotematchai.netlify.app"
    : "http://localhost:3000");

export const DEFAULT_CURRENCY = "USD";
export const VOICE_LANGUAGE = "en-US";

export const RFQ_TEXT_MAX_LENGTH = 2000;
export const BID_NOTES_MAX_LENGTH = 1000;

export const POLLING_INTERVAL_BIDS_MS = 15000; // ~15s
export const POLLING_INTERVAL_RFQS_MS = 30000; // ~30s

export const AI_PARSE_TIMEOUT_MS = 10000; // 10s client timeout

/**
 * Mocks are enabled if NEXT_PUBLIC_USE_MOCKS is 'true' or not set in dev
 */
export const IS_MOCK_MODE =
  process.env.NEXT_PUBLIC_USE_MOCKS === "true" ||
  process.env.NEXT_PUBLIC_USE_MOCKS === undefined;
