# COD Compass — Explainable COD Decision Workbench

> **An AI-powered, unit-economics-driven pre-shipment decision engine for D2C brands.**  
> Designed to solve the Return to Origin (RTO) crisis while reconciling the operational conflict between Logistics and Marketing.

---

## ⚡ Reviewer Quickstart (Under 10 Minutes)

Run the full production workbench locally with **zero external dependencies or paid API keys**:

```bash
# 1. Install dependencies
npm install

# 2. Set up local environment (uses offline fixture mode by default)
cp .env.example .env.local

# 3. Seed SQLite database with historical orders and interactive fixtures
npm run seed

# 4. Start the development server
npm run dev
```

Open **[http://localhost:3000](http://localhost:3000)** in your browser.

> **Windows PowerShell equivalent of copying environment:**  
> `Copy-Item .env.example .env.local`

---

## 🎯 Assignment Completion Matrix & Evidence

| Assignment Requirement | Implementation in COD Compass | Reviewer Evidence & Links |
|---|---|---|
| **Part 1 — Decision Engine (4 Actions)** | Pure domain decision engine evaluating: (1) Ship as-is, (2) Ship after confirmation, (3) Nudge to prepaid, (4) Hold / cancel. | [Decision Logic](file:///d:/assigmnet/domain/decisions/evaluate.ts), [`/orders`](http://localhost:3000/orders) |
| **Plain-English Reasons** | Every order receives an explainable plain-English explanation citing exact evidence. | [Drawer Inspection](file:///d:/assigmnet/components/orders/OrdersClient.tsx) |
| **Non-Technical Policy Editor** | Real-time threshold sliders, cost inputs, discount caps, and instant cohort impact preview. | [Policy Workbench](file:///d:/assigmnet/components/policy/PolicyClient.tsx), [`/policy`](http://localhost:3000/policy) |
| **Part 2 — WhatsApp Simulator** | Interactive smartphone mockup with English, Hindi, and Hinglish reviewed templates, quick replies, and free text. | [Simulator Engine](file:///d:/assigmnet/domain/conversations/machine.ts), [`/conversations`](http://localhost:3000/conversations) |
| **24h Timeout & 6h Reminder** | Virtual clock controls (`+6h`, `+12h`, `+24h`) simulating timeout without waiting in real time. | [Virtual Clock](file:///d:/assigmnet/server/services/conversation-service.ts) |
| **Prepaid Discount Math** | Exact mathematical formulation proving ₹30 discount delivers **+₹86.83 net gain** per converted customer. | [Methodology Doc](file:///d:/assigmnet/docs/methodology.md) |
| **Part 3 — Founder Morning Screen** | Daily dashboard answering the 4 bucket counts, avoided RTO ₹, foregone genuine contribution ₹, and net ₹ impact. | [Dashboard UI](file:///d:/assigmnet/components/overview/OverviewClient.tsx), [`/overview`](http://localhost:3000/overview) |
| **Honest Date Handling** | Distinguishes between historical September replay and true yesterday (29 Oct 2026) empty state. | [Replay Engine](file:///d:/assigmnet/server/services/replay.ts) |
| **Part 4 — Founder Business Memo** | 1–2 page executive memorandum answering all 5 prompt questions with verified data findings. | [Founder Memo PDF](file:///d:/assigmnet/docs/founder-memo.pdf), [Markdown Source](file:///d:/assigmnet/docs/founder-memo.md) |
| **Decision Log** | Running record of architectural choices, considered alternatives, evidence, and downsides. | [Decision Log](file:///d:/assigmnet/docs/decision-log.md) |
| **AI Usage Log** | Tools used and 2–3 real edge-case mistakes/weak outputs caught and corrected. | [AI Usage Log](file:///d:/assigmnet/docs/ai-usage-log.md) |

---

## 📊 Core Data Findings (Reproduced from `orders_sample.csv`)

Run `npm run analyze` to re-verify these audit figures from source bytes:

1. **Pincode Sparsity (97.19% with <5 orders):**  
   Out of 1,066 distinct pincodes, **1,036 have fewer than 5 orders**. A blanket "bad pincode blacklist" cancels viable delivery zones on statistical noise ($N=1$). COD Compass uses **Empirical Bayesian Shrinkage** ($k=30$) to prevent false bans.
2. **First-Time Buyer Lift:**  
   First-time buyers carry **30.23% RTO** vs 22.97% for repeat buyers (+7.27% lift). Yet **1,043 first-time orders delivered successfully**. Wholesale auto-cancellation would eliminate 73% of company revenue and waste ₹440,000+ in Meta ad spend.
3. **Meta Ads vs. Direct Navigation:**  
   Meta traffic exhibits **31.24% RTO** vs **22.92% on Direct traffic** (+8.32% lift). Meta impulse shoppers require pre-dispatch intent confirmation, not ad shutdown.
4. **Empirical AOV Discrepancy:**  
   Actual mean resolved order value is **₹919.96** (vs the ₹649 planning benchmark), expanding unit margins and raising the break-even risk threshold.

---

## 💰 The Operations vs. Marketing Trade-Off in Money (₹)

1. **Meta CAC (₹300+) is a Sunk Cost:**  
   Ad spend happened before the warehouse decision. Deducting CAC from cancellation creates a double penalty. It is tracked separately as **Marketing Exposure**.
2. **True Cancellation Break-Even is ~64.8%, NOT 28%:**  
   At ₹649 AOV, delivered contribution before marketing is $G = 0.62(649) - 65 - 25 = ₹312.38$. Direct RTO loss is $L = ₹169.40$. Shipping has positive expected value as long as:
   $$p < \frac{G}{G + L} = \frac{312.38}{312.38 + 169.40} \approx \mathbf{64.84\%}$$
   An order with 35% risk still produces **+₹143.76 expected profit**. Cancelling it throws away ₹312 in cash margin.
3. **The ₹30 Prepaid Discount Math:**  
   Converting COD (28% RTO) to prepaid (4% RTO) avoids 24% return risk, saving $0.24 \times (312.38 + 169.40) = ₹115.63$ in gross risk. Offering a ₹30 discount costs ₹28.80 on delivered units, generating **+₹86.83 net gain per converted order**.

---

## 🛠️ Tech Stack & Architecture

- **Framework:** Next.js 14+ (App Router, Server-First Architecture)
- **Language:** TypeScript strict (`strict: true`, no implicit `any`)
- **Design System:** BHMR Studios design tokens (`--canvas: #fafaf8`, `--ink: #111111`, `--accent: #f0440b`, DM Serif Display + Poppins)
- **Database:** SQLite with `better-sqlite3` and `drizzle-orm`
- **AI Integration:** Google Gemini API (`gemini-1.5-flash`) with structured output schemas and deterministic offline fixtures
- **Testing:** Vitest test suite covering economics, risk model, decision branches, and state machine

---

## 📋 Available NPM Scripts

```bash
# Start local development server
npm run dev

# Run automated unit test suite (33 tests)
npm run test

# Perform strict TypeScript typecheck
npm run typecheck

# Execute dataset audit & regenerate artifacts
npm run analyze

# Replay September 2026 cohort with frozen policy
npm run replay

# Seed SQLite database with orders and demo fixtures
npm run seed

# Compile Founder Memo PDF
npm run generate:memo
```

---

## 🧭 5-Minute Reviewer Walkthrough Script

1. **Dashboard (`/overview`):** Open the morning screen. Toggle between "September Replay" (populated cohort) and "Yesterday" (honest empty state). Observe the reconciled financial bridge and 3 key findings cards.
2. **Orders Inbox (`/orders`):** Search for any order or click an order to open the Decision Drawer. Inspect the plain-English reason and 4-action EV comparison. Click "Evaluate New Order" to test real-time intake.
3. **WhatsApp Simulator (`/conversations`):** Select `DEMO-CONFIRM-1` or `DEMO-NUDGE-1`. Test quick-reply pills (`Yes, confirm`, `No, cancel`). Click `+6h Reminder` and `+24h Timeout` to watch virtual clock state transitions. Click "Simulate Customer Payment" to test verified webhook callbacks.
4. **Policy Editor (`/policy`):** Adjust risk sliders or discount caps. Click "Preview Cohort Impact" to see instant live financial diffs against September orders.
5. **Evidence & Exports (`/evidence`):** Inspect data lineage and download the clean September Replay CSV.
