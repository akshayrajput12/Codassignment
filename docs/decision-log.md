# COD Compass — Architectural & Operational Decision Log

This document records the foundational decisions made during the architecture, modeling, and implementation of COD Compass for the D2C Haircare take-home assignment.

---

### Decision 1: Accounting Convention for Delivered Gross Margin
- **Date:** 2026-10-31
- **Decision:** Interpret 62% gross margin as product COGS margin before outbound logistics.
- **Considered Alternatives:**
  1. *Include shipping/packaging in 62%:* Delivered contribution $G(v) = 0.62 \times v$.
  2. *Deduct shipping and packaging:* Delivered contribution $G(v) = 0.62 \times v - \text{forwardShipping}(65) - \text{packaging}(25)$.
- **Chosen Approach:** Alternative 2 ($G(v) = 0.62 \times v - 90$). At AOV ₹649, $G = ₹312.38$. An editable toggle is also exposed in the Policy Engine for sensitivity analysis.
- **Reason:** In D2C unit economics, "Gross Margin" on Shopify typically accounts only for Raw Materials/COGS. Outbound fulfillment and pick/pack are variable operating expenses incurred upon dispatch. Treating them as separate ensures we do not double-count or under-count fulfillment costs when comparing delivered vs RTO orders.
- **Evidence:** Brief states: "Forward shipping: ₹65, Return shipping: ₹65, Packaging + handling: ₹25. Average order value is ₹649. Our gross margin on a delivered order is about 62%."
- **Downside:** Reduces net margin on low-ticket orders (<₹300) to thin or negative levels.
- **Revisit Trigger:** Brand finance team provides audited P&L chart of accounts confirming whether fulfillment is booked within COGS.

---

### Decision 2: Treatment of Meta Customer Acquisition Cost (CAC)
- **Date:** 2026-10-31
- **Decision:** Treat Meta CAC (₹300+) as a sunk cost for the pre-shipment shipping decision.
- **Considered Alternatives:**
  1. Deduct ₹300 from order contribution if shipped.
  2. Deduct ₹300 from cancellation EV as "wasted ad spend".
  3. Treat CAC as sunk, but track and display Marketing CAC exposure in the dashboard.
- **Chosen Approach:** Alternative 3. The ₹300 ad spend occurred when the customer clicked the ad and placed the order. It is sunk before the order reaches the warehouse. We must not penalize cancellation by subtracting ₹300 from cancellation while also counting lost contribution. Instead, we show Marketing CAC Exposure as a distinct risk metric.
- **Reason:** Mathematically, subtracting a sunk cost from both sides of an incremental decision equation cancels out: $(EV_{\text{ship}} - CAC) - (EV_{\text{cancel}} - CAC) = EV_{\text{ship}} - EV_{\text{cancel}}$. Penalizing cancellation arbitrarily distorts optimal decision boundaries.
- **Evidence:** Head of Marketing noted: "We spend ₹300+ to acquire each new customer... If we cancel their first order, we've wasted that money."
- **Downside:** Marketing may feel the raw cancellation count understates their frustration.
- **Revisit Trigger:** Introduction of verified Customer Lifetime Value (LTV) cohorts where repeat purchases offset initial CAC.

---

### Decision 3: Pincode Sparsity & Shrinkage Estimator
- **Date:** 2026-10-31
- **Decision:** Use an Empirical Bayesian smoothed estimator with shrinkage rather than raw historical pincode RTO rates.
- **Considered Alternatives:**
  1. Direct pincode lookup with blanket cancellation for pincodes with >40% RTO.
  2. Machine learning classification (e.g. XGBoost) with target-encoded pincodes.
  3. Smoothed shrinkage estimator: $p_{\text{group}} = \frac{r_{\text{group}} + k \cdot p_{\text{global}}}{n_{\text{group}} + k}$.
- **Chosen Approach:** Alternative 3 with shrinkage parameter $k = 20$ for cohorts and $k = 30$ for pincodes.
- **Reason:** The dataset audit reveals 1,066 distinct pincodes, of which 1,036 (97.19%) have fewer than 5 orders. A pincode with 1 order that happened to RTO has an empirical rate of 100%, but this is pure statistical noise. Blocking it would unfairly harm genuine buyers.
- **Evidence:** Verified data audit: 1,036 / 1,066 pincodes have $N < 5$.
- **Downside:** Slightly slower adaptation to genuine hyper-local delivery collapses (e.g. courier strike in a specific pin).
- **Revisit Trigger:** Accumulation of $>50,000$ historical orders with at least 50 orders per primary pincode cluster.

---

### Decision 4: Automatic Cancellation Default
- **Date:** 2026-10-31
- **Decision:** Hard-disable automatic cancellation by default in all policies.
- **Considered Alternatives:**
  1. Automatically cancel orders where predicted RTO > 60%.
  2. Automatically cancel repeat RTO abusers only.
  3. Route high-risk orders to `HOLD_FOR_REVIEW` or WhatsApp confirmation, requiring manual human confirmation to cancel.
- **Chosen Approach:** Alternative 3. Auto-cancellation switch is OFF by default in the policy engine.
- **Reason:** Reconciles the dispute between Head of Operations and Head of Marketing. Cancellation is irreversible and destroys customer goodwill and marketing CAC. High risk orders are held for review or confirmed via WhatsApp, giving customers a chance to clarify addresses.
- **Evidence:** Break-even risk calculation proves an order at ₹649 has positive expected contribution up to 64.84% RTO risk.
- **Downside:** Requires operational staff to process a review queue.
- **Revisit Trigger:** Operational review queue backlog exceeding 24-hour turnaround SLA.

---

### Decision 5: WhatsApp Pre-shipment Confirmation & Prepaid Discount Economics
- **Date:** 2026-10-31
- **Decision:** Offer a flat ₹30 discount (approx 4.6% on ₹649 AOV) with a 24-hour expiry to nudge COD buyers to online prepaid payment.
- **Considered Alternatives:**
  1. 10% discount across the board (₹65 on ₹649).
  2. ₹50 flat discount.
  3. ₹30 flat discount with EV-safe cap and minimum ticket threshold.
- **Chosen Approach:** Alternative 3.
- **Reason:** Direct RTO cost is ₹169.40. Prepaid orders historically have only a 4% RTO rate versus 28% for COD (a 24 percentage point reduction). Converting an order saves an expected $0.24 \times (312.38 + 169.40) = ₹115.63$ in gross risk. Offering ₹30 leaves an expected net gain of ₹86.83 per converted order. Offering 10% (₹65) or ₹50 erodes too much margin on low-ticket items (<₹400).
- **Evidence:** Math: $Uplift = (p_{\text{COD}} - p_{\text{Prepaid}})(G + L) - (1 - p_{\text{Prepaid}}) \cdot d = 0.24 \times (312.38 + 169.40) - 0.96 \times 30 = ₹86.83$.
- **Downside:** Requires an integrated payment gateway callback mechanism.
- **Revisit Trigger:** A/B test results measuring actual conversion elasticity ($q$) across ₹20, ₹30, and ₹50 discount offers.

---

### Decision 6: Gemini LLM Boundary & Offline Fallback
- **Date:** 2026-10-31
- **Decision:** Restrict Gemini strictly to (A) address/name parsing and (B) ambiguous reply intent classification. Never allow the LLM to decide shipping status, calculate economics, or mark payments as received.
- **Considered Alternatives:**
  1. End-to-end LLM agent deciding whether to ship, hold, or cancel.
  2. Bounded Gemini integration with Zod schema validation and deterministic local mock fixture fallback.
- **Chosen Approach:** Alternative 2.
- **Reason:** Deterministic arithmetic and statistical rules ensure 100% reproducibility, zero prompt injection risk for payment approvals, and instantaneous zero-cost execution for standard orders. Offline fallback ensures the entire application runs without an API key.
- **Evidence:** Assignment prompt: "Use an LLM where it actually helps... Do not use an LLM for things simple code or maths can do better. Tell us where you drew that line and why."
- **Downside:** Requires maintaining structured schemas and regex pre-filters for quick replies.
- **Revisit Trigger:** Introduction of free-form multi-lingual voice note transcriptions from delivery agents.
