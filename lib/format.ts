import { DEFAULT_CURRENCY } from "./config";

/**
 * Format currency with tabular figures styling support
 */
export function formatCurrency(
  amount: number | null | undefined,
  currency = DEFAULT_CURRENCY
): string {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return "—";
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Clean human-readable date format, e.g. "Oct 17, 2026"
 */
export function formatDate(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return "—";
  const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

/**
 * Format relative time (e.g. "2 hours ago", "in 3 days", "Just now")
 */
export function formatRelativeTime(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return "—";
  const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) return "—";

  const now = new Date();
  const diffInSeconds = Math.round((date.getTime() - now.getTime()) / 1000);
  const isFuture = diffInSeconds > 0;
  const absSeconds = Math.abs(diffInSeconds);

  if (absSeconds < 45) {
    return isFuture ? "in a few seconds" : "just now";
  }

  const minutes = Math.round(absSeconds / 60);
  if (minutes < 60) {
    return isFuture ? `in ${minutes}m` : `${minutes}m ago`;
  }

  const hours = Math.round(minutes / 60);
  if (hours < 24) {
    return isFuture ? `in ${hours}h` : `${hours}h ago`;
  }

  const days = Math.round(hours / 24);
  if (days < 30) {
    if (days === 1) return isFuture ? "tomorrow" : "yesterday";
    return isFuture ? `in ${days} days` : `${days} days ago`;
  }

  return formatDate(date);
}

/**
 * Helper to compute remaining days from today until target date
 */
export function getDaysRemaining(dateString: string | null | undefined): number | null {
  if (!dateString) return null;
  const target = new Date(dateString);
  if (isNaN(target.getTime())) return null;

  const now = new Date();
  // Zero out time components for day-level comparison
  const nowDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const targetDay = new Date(target.getFullYear(), target.getMonth(), target.getDate());

  const diffMs = targetDay.getTime() - nowDay.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Format lead time in days (e.g. "Same day", "1 day", "3 days")
 */
export function formatLeadTime(days: number | null | undefined): string {
  if (days === null || days === undefined) return "—";
  if (days === 0) return "Same day";
  if (days === 1) return "1 day";
  return `${days} days`;
}
