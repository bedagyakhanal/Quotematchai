# QuoteMatch — AI-Powered Construction RFQ Marketplace

> **Guiding Principle**: It is the builder's responsibility to make the product frictionless. It is never the user's job to figure out how the app works. Treat every moment of confusion as a bug.

QuoteMatch is a high-velocity marketplace connecting **Buyers** (general contractors) with **Sellers** (building material suppliers):
1. **One-Time Role Onboarding**: Sign in and select Buyer or Seller once. Users never land on a screen not meant for them.
2. **AI-Structured RFQ Creation**: Speak or type naturally (e.g. *"I need 500 bricks and 10 bags of cement delivered downtown by Friday"*). AI structures items, quantities, delivery date, and location.
3. **Competitive Supplier Bidding**: Suppliers view open opportunities and place structured bids (price, lead time, notes).
4. **Intuitive Decision Engine**: Buyers compare bids side-by-side with clear indicators (*Lowest price*, *Fastest*, *Best overall*, *X% above lowest*) and award the winner with one clear, confirmed action.

---

## Tech Stack & Architecture

- **Framework**: Next.js 16 (App Router, strict TypeScript)
- **Styling**: Tailwind CSS + custom design tokens (Geist font, tabular numbers for currency and quantities, 44px minimum tap targets)
- **Server State & Caching**: TanStack Query (`@tanstack/react-query`) with automatic background refetching (15s for active bids, 30s for open RFQs) and window focus refetching
- **Forms & Validation**: `react-hook-form` + `zod`
- **Voice Recognition**: Native browser Web Speech API (`SpeechRecognition` / `webkitSpeechRecognition`) with feature detection, live transcription streaming, and graceful fallbacks
- **Toasts & Feedback**: `sonner` rich notifications and accessible custom modal dialogs
- **Zero Raw Errors**: Client unwrap envelope `{ ok: true, data } | { ok: false, error: { code, message } }` with friendly inline recovery

---

## Getting Started

### 1. Prerequisites
- Node.js >= 18.17 (tested on Node v26)
- npm >= 9

### 2. Installation
```bash
git clone https://github.com/bedagyakhanal/Quotematchai.git
cd Quotematchai
npm install
```

### 3. Environment Variables
Copy the template file to `.env.local`:
```bash
cp .env.example .env.local
```

| Variable | Default | Purpose |
|---|---|---|
| `NEXT_PUBLIC_USE_MOCKS` | `true` | When `true`, intercepts all `/api/` calls with the in-memory mock engine. Set to `false` when connecting to the real backend. |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://mock.supabase.co` | Supabase project URL for authentication. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `mock-anon-key` | Supabase anon key for authentication. |

### 4. Running the Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## How Mock Mode Works

When `NEXT_PUBLIC_USE_MOCKS=true` (the default), all network requests are serviced by the in-memory database (`lib/mocks/db.ts`) and mock handler (`lib/mocks/handlers.ts`) with **300ms–700ms realistic network jitter**.

### Seed Data
The mock database includes:
- **1 Buyer**: `Apex Construction` (`buyer@quotematch.test`)
- **2 Sellers**: `Metro Building Supplies` and `Rapid Logistics & Stone`
- **RFQ 1 (`rfq_1`)**: Open, 0 bids (for testing zero-state polling and empty UI)
- **RFQ 2 (`rfq_2`)**: Open, 2 competing bids (Metro has lowest price at $1,150; Rapid has fastest delivery in 1 day)
- **RFQ 3 (`rfq_3`)**: Already awarded with winner banner (Rapid Logistics won at $450)

### Testing Failure Modes & Edge Cases
You can test resilient UI states at any time by appending `?mockFail=<mode>` to the URL or via the browser console:

- **AI Parsing Timeout**: `http://localhost:3000/buyer/new?mockFail=ai_timeout`
- **Rate Limiting (with countdown)**: `http://localhost:3000/buyer/new?mockFail=rate_limited`
- **AI Parse Failed**: `http://localhost:3000/buyer/new?mockFail=ai_parse_failed`
- **Network Disconnection / Offline**: `http://localhost:3000/buyer/new?mockFail=offline`

---

## Project Structure

```
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx               # Magic link & password tabs, cooldown timer
│   │   └── onboarding/role/page.tsx     # One-time permanent Buyer/Seller choice
│   ├── (buyer)/
│   │   ├── layout.tsx                   # Buyer route guard & skeleton loader
│   │   ├── buyer/page.tsx               # Buyer dashboard (My RFQs)
│   │   ├── buyer/new/page.tsx           # RFQ creator (state machine centerpiece)
│   │   └── buyer/rfq/[id]/page.tsx      # Bid comparison & winner selection
│   ├── (seller)/
│   │   ├── layout.tsx                   # Seller route guard & skeleton loader
│   │   ├── seller/page.tsx              # Seller marketplace feed & search
│   │   └── seller/rfq/[id]/page.tsx     # RFQ details & sticky bid form
│   ├── error.tsx                        # Global error boundary
│   ├── not-found.tsx                    # Branded 404 page
│   └── page.tsx                         # Root role router
├── components/
│   ├── bids/                            # BidStatusBadge, comparison cards
│   ├── feedback/                        # EmptyState, alerts
│   ├── layout/                          # AppHeader, PageShell, RoleBadge
│   ├── rfq/                             # ItemRows, RfqCreator, RfqStatusBadge
│   ├── ui/                              # Accessible primitives (Button, Card, Dialog, Input, etc.)
│   └── voice/                           # MicButton with Web Speech integration
├── hooks/
│   ├── useProfile.ts                    # Single source of truth for session & role
│   └── useSpeechInput.ts                # Web Speech API hook
├── lib/
│   ├── api/                             # Typed API client & endpoint services
│   ├── mocks/                           # In-memory mock database & failure interceptor
│   ├── queries/                         # TanStack Query keys & hooks
│   ├── config.ts                        # App-wide constants (currencies, limits)
│   └── format.ts                        # Currency, date, and lead time formatters
└── types/
    └── index.ts                         # Shared contracts & Zod schemas
```

---

## Edge-Case Verification Checklist

Every edge case specified in the brief has been implemented and tested:

1. [x] **Brand-New User Signup**: Land on role onboarding; refresh keeps user on `/onboarding/role` until role is selected.
2. [x] **Wrong-Role URL Access**: A seller visiting `/buyer` or a buyer visiting `/seller` is redirected with a toast message (*"That page is for buyers/sellers, taking you home"*) with zero flash of wrong content.
3. [x] **Deep Link Preservation**: Logged-out access to `/buyer/rfq/rfq_2` redirects to `/login?next=%2Fbuyer%2Frfq%2Frfq_2` and returns there upon signing in.
4. [x] **AI Parse Failure & Timeouts**: If AI parsing times out or fails, the user is never stuck; raw text is preserved, and dual actions (*"Try again"* vs *"Fill it in manually"*) allow seamless continuation.
5. [x] **Offline Protection**: Network disconnection triggers a calm alert while keeping typed text intact.
6. [x] **Double-Click Prevention**: Post RFQ, Submit Bid, and Select Winner buttons lock with spinners upon first click.
7. [x] **Extreme Data Handling**: Long item names, decimal quantities, and large currency values render with tabular figures and clean text wrapping without breaking layouts.
8. [x] **Bids Edge Cases**: Zero bids view displays a 15-second auto-refreshing empty state; single-bid view allows direct awarding; ties break cleanly by secondary fields.
9. [x] **Concurrency & Race Conditions (Client-Side Reaction)**: If an RFQ is awarded while a seller is typing or submitting a bid, the backend returns `RFQ_CLOSED`. The frontend catches this code gracefully, displays an explanatory banner (*"This RFQ was just awarded. Your bid can't be changed"*), and switches to read-only without discarding typed text. *(Note: True transactional atomicity/locking is guaranteed at the Database/Backend level; the frontend guarantees graceful user-facing reaction).*
10. [x] **Multi-Tab Sync**: When a winner is selected in another tab, refocusing the window automatically refetches the awarded status via TanStack Query window-focus listeners.
11. [x] **Responsive Design**: Tested at 375px (iPhone SE), 768px (tablet), and 1280px+ (desktop). All interactive elements respect minimum 44px tap targets.
12. [x] **Keyboard Navigation & Accessibility**: Full Tab/Enter/Escape operation for modals, form fields, and sort toggles. ARIA labels and live regions included.
13. [x] **Voice Dictation Fallbacks**: Browser speech capability is feature-detected. Unsupported browsers receive an informative tooltip rather than breaking. Microphone permission denials are handled with clear instructions.
