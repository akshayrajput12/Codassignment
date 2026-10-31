# COD Compass Implementation Plan

> **For Agent:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build "COD Compass", a complete production-grade explainable Cash-on-Delivery (COD) decision engine and workbench for D2C e-commerce with Next.js App Router, SQLite/Drizzle, Gemini LLM integration, WhatsApp chat simulator, founder dashboard, non-technical policy editor, automated replay analysis, and full documentation suite (founder memo, decision log, AI usage log, system design).

**Architecture:** Layered modular architecture adhering to `bh-ats-engineering-rules` and `bhmr-design-system`. Server-first Next.js App Router with SQLite persistence via Drizzle ORM. Domain logic is pure (economics, risk estimator, decision rules, conversation state machine). Dedicated adapters for Gemini structured outputs with deterministic offline fixtures. Component tree strictly follows design tokens with DM Serif Display + Poppins typography and accessible Radix/Motion UI.

**Tech Stack:** Next.js 14+ (App Router), React 18/19, TypeScript strict, Tailwind CSS, Lucide React, Motion for React, SQLite (`better-sqlite3`), Drizzle ORM, PapaParse, Zod, Vitest, `@google/genai` (official SDK), `@react-pdf/renderer` or PDF generation script.

---

### Phase Breakdown

- **Phase 1: Project Initialization & Data Audit**
  - Initialize Next.js project with TypeScript, Tailwind, Lucide, Vitest, Drizzle ORM, better-sqlite3.
  - Implement data audit script (`scripts/analyze.ts`) to verify `orders_sample.csv` (2,018 raw -> 1,988 deduplicated -> 1,987 resolved, RTO rate 28.43%, pincode sparsity, first-time vs repeat, meta vs direct, AOV ₹920 vs ₹649).
  - Generate verified `artifacts/data-quality.json` and `artifacts/findings.json`.
  - Establish `docs/decision-log.md` and `docs/ai-usage-log.md`.

- **Phase 2: Core Domain Logic & Economics (Pure & TDD)**
  - Implement Money & Contribution math (`domain/economics/`):
    - `L = 65 + 65 + 25 + (0.08 * 180) = ₹169.40`
    - `G(v) = 0.62 * v - 65 - 25 = ₹312.38` (at ₹649)
    - `EV_ship(v, p) = (1 - p) * G(v) - p * L`
    - Break-even risk: `p_break = G / (G + L) ≈ 64.84%`
    - Prepaid discount economics: `EV_prepaid(v, p_prepaid, d) = (1 - p_prepaid) * (G(v) - d) - p_prepaid * L`
    - Net impact bridge reconciliation: `net = avoidedRto - foregoneGenuine + otherPolicyEffects`.
  - Implement Risk Estimator (`domain/risk/`):
    - Empirical Bayesian shrinkage / smoothed estimator: `p = (r + k * p_global) / (n + k)`
    - Chronological split: April–July training, August validation, September test/replay.
  - Implement Policy Schema & Defaults (`domain/policy/`).
  - Unit tests in `tests/unit/economics.test.ts` and `tests/unit/risk.test.ts`.

- **Phase 3: Database & Decision Engine Vertical Slice**
  - Drizzle ORM schema for SQLite (`server/db/schema.ts`):
    - `orders`, `outcomes`, `policies`, `decisions`, `conversations`, `messages`, `quotes`, `scheduled_jobs`, `events`, `imports`.
  - Seed database (`scripts/seed.ts`) with historical orders and synthetic interactive fixtures.
  - Decision engine (`domain/decisions/evaluate.ts`):
    - 4 actions: `SHIP_AS_IS`, `SHIP_AFTER_CONFIRMATION`, `NUDGE_TO_PREPAID`, `HOLD_CANCEL`.
    - Plain-English reason generation based on exact evidence.
    - Zero auto-cancellation for first-time orders or low-support pincodes.
  - Order evaluation API (`app/api/orders/route.ts`, `app/api/orders/[id]/decision/route.ts`).
  - Unit and integration tests.

- **Phase 4: WhatsApp Conversation Simulator & Virtual Clock**
  - Conversation state machine (`domain/conversations/machine.ts`):
    - States: `AWAITING_CONFIRMATION`, `AWAITING_ADDRESS_CORRECTION`, `AWAITING_PREPAID`, `CONFIRMED_COD`, `PAID_PREPAID`, `HELD_FOR_REVIEW`, `TIMED_OUT`, `CANCELLED`.
  - Message templates (English, Hindi, Hinglish) for confirmation and prepaid discount quote.
  - Event handler for incoming replies (`yes`, `no`, `keep COD`, address correction, `STOP`, ambiguous, timeout).
  - Virtual Clock service (`server/clock.ts`) for `+6h`, `+12h`, `+24h` time travel.
  - Mock Payment gateway webhook simulator (`app/api/mock-payments/route.ts`).
  - Tests covering race conditions, idempotency, "payment done" text rejection, 24h timeout.

- **Phase 5: Gemini LLM Integration & Offline Fallback**
  - Official `@google/genai` integration with structured schema output (`server/ai/`):
    - Task A: Address & Name Assessment (detect missing house/flat number, landmarks, Hinglish phrasing, placeholder names).
    - Task B: Reply Intent Classification (classify ambiguous replies into confirm, reject, cod_preference, address_correction, opt_out).
  - Resilient design: local cache, 8s timeout, graceful offline fixture fallback when `GEMINI_API_KEY` is not provided.
  - Zero auto-actions based purely on LLM output.

- **Phase 6: September Replay & Policy Engine**
  - Historical frozen-policy replay engine (`scripts/replay.ts` and `server/services/replay.ts`).
  - Replay September 2026 cohort (329 resolved orders).
  - Non-technical Policy Editor API (`app/api/policy/`): draft, preview diff against cohort, versioning, rollback, activation.

- **Phase 7: BHMR High-Craft UI & Founder Dashboard**
  - Design tokens (`--canvas: #fafaf8`, `--ink: #111111`, `--accent: #f0440b`, DM Serif Display + Poppins).
  - `/overview`: Morning screen for founder:
    - Date switcher (Historical September 2026 demo vs True Yesterday empty state).
    - 4 bucket summary tiles with share and click-to-filter.
    - Financial bridge strip (Avoided RTO, Foregone Genuine, Net ₹).
    - 3 Key Data Insights cards with exact numbers.
    - Needs Attention drawer (timed out, ambiguous address, high risk).
  - `/orders`: Full inbox with filters, pagination, search, order creation modal, decision drawer with plain-English reasons and EV comparison.
  - `/conversations`: WhatsApp interactive chat simulator with interactive smartphone shell, quick reply pills, free text input, virtual clock toolbar, mock payment panel.
  - `/policy`: Interactive rules editor with real-time financial impact preview, threshold sliders, discount cap config, version history.
  - `/evidence`: Data quality audit viewer, historical vs replay comparisons, CSV export.

- **Phase 8: Comprehensive Documentation & Submission Deliverables**
  - `docs/founder-memo.md` and generated PDF `docs/founder-memo.pdf`: Executive memo answering all 5 prompt questions with verified figures.
  - `docs/system-design.md`: Architecture diagrams, sequence flows, data models.
  - `docs/workflow.md`: Operations and WhatsApp communication workflows.
  - `docs/decision-log.md`: Detailed logs of key architectural, statistical, and operational choices.
  - `docs/ai-usage-log.md`: Transparent record of AI tools used, including 2-3 genuine edge cases/mistakes caught and corrected.
  - `docs/methodology.md`: In-depth financial formulas, risk model math, EV proofs.
  - `README.md`: Polished, reviewer-friendly guide to run in under 10 minutes.

- **Phase 9: Comprehensive End-to-End Verification**
  - Run typecheck, linting, unit tests, integration tests.
  - Verify all offline and demo flows.
