# COD Compass — System Design & Architecture Specification

### High-Level Architecture Overview

COD Compass is an explainable decision intelligence workbench and operational control plane designed for direct-to-consumer (D2C) brands operating high-volume Cash on Delivery (COD) channels.

```
                              [ Shopify / ERP Webhook ]
                                          │
                                          ▼
                                ┌───────────────────┐
                                │   Order Intake    │
                                └─────────┬─────────┘
                                          │
                                          ▼
                         ┌─────────────────────────────────┐
                         │   Stage 1: Eligibility & Audit  │
                         │   - Validate critical addresses │
                         │   - Check phone & postal format │
                         └────────────────┬────────────────┘
                                          │
                                          ▼
                         ┌─────────────────────────────────┐
                         │   Stage 2: Empirical Risk Model │
                         │   - Global prior (28.08%)       │
                         │   - Buyer cohort shrinkage k=20 │
                         │   - Pincode smoothing k=30      │
                         └────────────────┬────────────────┘
                                          │
                                          ▼
                         ┌─────────────────────────────────┐
                         │   Stage 3: Decision Engine      │
                         │   - 4-Action EV Comparison      │
                         │   - Plain-English Reason Gen    │
                         │   - Guardrail Policy Enforcer   │
                         └────────────────┬────────────────┘
                                          │
            ┌─────────────────┬───────────┴───────────┬─────────────────┐
            │                 │                       │                 │
            ▼                 ▼                       ▼                 ▼
     [ 1. SHIP_AS_IS ]  [ 2. CONFIRM ]          [ 3. NUDGE ]     [ 4. HOLD_CANCEL ]
            │                 │                       │                 │
      Ready to Ship     WhatsApp Flow           ₹30 Discount       Held for Review /
      Warehouse Pick     (YES / NO / STOP)       Mock Payment       Manual Call Ops
```

---

### Core Components & Layering

1. **Routing Layer (`app/`):**
   - Thin, server-first Next.js App Router handlers and pages adhering strictly to `bh-ats-engineering-rules`.
   - `/overview`: Founder daily dashboard and financial bridge.
   - `/orders`: Full inbox with filters, pagination, search, order creation modal, and decision drawer.
   - `/conversations`: Interactive WhatsApp chat simulator with virtual clock controls.
   - `/policy`: Non-technical rules workbench with real-time cohort impact preview.
   - `/evidence`: Reproducible data quality audit and replay exports.

2. **Domain Logic Layer (`domain/`):**
   - Pure, stateless TypeScript modules without side effects or database dependencies:
     - `domain/economics/`: Money arithmetic, delivered contribution $G(v)$, RTO loss $L$, EV of shipping, EV of prepaid discount, break-even risk, and financial bridge reconciliation.
     - `domain/risk/`: Empirical Bayesian smoothed shrinkage estimator.
     - `domain/policy/`: Zod schemas and validation rules for non-technical thresholds.
     - `domain/decisions/`: Decision engine combining risk, economics, and guardrails to produce actions and plain-English reasons.
     - `domain/conversations/`: WhatsApp state machine, reviewed multi-language templates (English, Hindi, Hinglish), and virtual clock logic.

3. **Persistence Layer (`server/db/`):**
   - SQLite backed by `better-sqlite3` and `drizzle-orm`.
   - Tables: `orders`, `outcomes`, `policies`, `decisions`, `conversations`, `messages`, `quotes`, `events`, `scheduled_jobs`, `imports`.

4. **AI & Integration Layer (`server/ai/`):**
   - Server-side Gemini adapter (`gemini-1.5-flash`) via official Google Gen AI SDK.
   - Strictly bounded to (A) address/name parsing and (B) ambiguous customer reply intent classification.
   - Automatic local in-memory cache and deterministic offline fixture fallback for keyless operation.

---

### WhatsApp State Machine & Payment Verification Sequence

```mermaid
sequenceDiagram
    autonumber
    actor Customer
    participant WhatsApp as WhatsApp Simulator
    participant Engine as COD Compass Engine
    participant Gateway as Mock Payment Gateway

    Engine->>WhatsApp: Send Initial Nudge ("Pay online & save ₹30")
    WhatsApp->>Customer: Delivers WhatsApp Message with Link

    alt Case 1: Customer claims paid in chat text
        Customer->>WhatsApp: Types "I paid via UPI / check screenshot"
        WhatsApp->>Engine: Inbound text message
        Engine-->>WhatsApp: System Reply: "Payment verification pending with bank"
        Note over Engine: Order status remains AWAITING_PREPAID
    else Case 2: Customer clicks link & completes checkout
        Customer->>Gateway: Enters UPI / Card on secure checkout
        Gateway->>Engine: Signed Webhook Callback (POST /api/mock-payments)
        Note over Engine: Cryptographically validates token & quote
        Engine->>Engine: Transition quote to PAID & order to PAID_PREPAID
        Engine-->>WhatsApp: Confirmation Message: "Payment verified! Dispatched as Prepaid"
    else Case 3: 24 Hours Elapse without payment or reply
        Note over Engine: Virtual Clock advances +24h
        Engine->>Engine: Expire discount quote & transition order to TIMED_OUT / HELD
        Engine-->>WhatsApp: System notification: "Window expired; held for review"
    end
```

---

### Database Schema (ERD)

- **`orders`**: Canonical order information (ID, datetime, customer details, address, value, prior history, UTM source).
- **`outcomes`**: Resolved ground truth delivery status (`DELIVERED`, `RTO`, `IN_TRANSIT`).
- **`policies`**: Immutable versioned configuration JSON and activation flags.
- **`decisions`**: Persisted evaluation record (action, workflow state, probability, risk band, explanation, reason codes, EV snapshot).
- **`conversations`**: Active WhatsApp thread state (`state`, `language`, `virtual_now`, `outreach_suppressed`).
- **`messages`**: Inbound and outbound chat bubbles (`direction`, `body`, `intent`, `timestamp`).
- **`quotes`**: Fixed-discount prepaid checkout tokens with 24-hour expiration (`original_amount`, `discount_amount`, `final_amount`, `status`, `token`).
