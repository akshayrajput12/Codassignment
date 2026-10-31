# COD Compass — AI Usage Log

This document records the exact AI tools utilized during the design and development of COD Compass, including explicit verification records and real edge-case mistakes/weak outputs caught and corrected.

---

### AI Tools Utilized
1. **Antigravity Coding Assistant (Gemini 3.8 Flash High):** Architecture execution, Next.js App Router engineering, component authoring, data analysis scripts, and unit/integration test suites.
2. **Google Gemini API (`gemini-1.5-flash`):** Runtime LLM integration for bounded address completeness checking, Hinglish address parsing, and ambiguous WhatsApp customer reply classification.
3. **Master PRD Authoring (ChatGPT / o1-preview):** Preparation of the initial system specification and data schema checks.

---

### Real Examples of AI Weakness / Mistakes Caught and Corrected

#### Example 1: Double-Deduction of Customer Acquisition Cost (CAC) in Cancellation Economics
- **Task:** Formulating the Net Impact and Expected Value equation for cancelling high-risk COD orders.
- **AI Suggestion:** The initial prompt drafting proposed calculating cancellation cost as:
  $$\text{Loss}_{\text{cancel}} = \text{Lost Contribution } G(v) + \text{Wasted Meta CAC } (₹300)$$
- **Why It Was Weak / Incorrect:** Meta CAC was already spent at the top of the funnel when the customer converted via Instagram/Facebook ads. Whether the merchant ships the package or cancels it, the ₹300 acquisition money is already gone. Counting both lost delivered margin and subtracting ₹300 creates an erroneous double-penalty, artificially suppressing cancellation EV and confusing the accounting comparison.
- **How It Was Caught:** Financial model review against sunk-cost accounting principles:
  $$EV_{\text{ship}} - EV_{\text{cancel}} = [(1-p)G(v) - pL - CAC] - [0 - CAC] = (1-p)G(v) - pL$$
- **Correction Applied:** Treated CAC strictly as a sunk cost for dispatch decisions, while creating a distinct "Marketing CAC at Risk" metric on the executive dashboard to address the Head of Marketing's concerns transparently.

---

#### Example 2: Naive Pincode Blacklisting Hallucination
- **Task:** Determining policy rules for risky pincodes based on historical RTO.
- **AI Suggestion:** Suggested filtering for `pincode_rto_rate > 0.40` and automatically routing all matching pincodes to cancellation.
- **Why It Was Weak / Incorrect:** When evaluating the dataset (`orders_sample.csv`), 1,036 out of 1,066 unique pincodes (97.19%) had fewer than 5 orders in the entire 6-month period. Hundreds of pincodes had exactly 1 order that happened to return, giving them an empirical rate of 100%. A naive blacklisting rule would have cancelled valid first-time orders in over 500 pin codes based on pure sample noise ($N=1$).
- **How It Was Caught:** Running the exploratory data audit script (`scripts/analyze.ts`), which computed support distributions across pincodes.
- **Correction Applied:** Implemented Empirical Bayesian shrinkage with a smoothing parameter ($k=30$). Unseen or low-sample pincodes shrink heavily toward the global prior ($28.4\%$), preventing catastrophic false-positive cancellations.

---

#### Example 3: Treating Customer Chat "Payment Done" as Verified Payment
- **Task:** Parsing WhatsApp chat simulator responses for the "Nudge to Prepaid" workflow.
- **AI Suggestion:** The initial reply classification prompt mapped phrases like *"I sent the money"*, *"Payment done via UPI"*, or *"Maine pay kar diya screenshot dekho"* to the status `PAID_PREPAID`.
- **Why It Was Weak / Incorrect:** In real-world e-commerce fraud and Indian D2C operations, buyers frequently send text claims or fake screenshots claiming they paid to bypass COD security. Marking an order paid based purely on customer chat text exposes the business to massive fraud.
- **How It Was Caught:** Threat modeling and review against financial controls in Section 15 of the PRD.
- **Correction Applied:** Strictly decoupled language understanding from financial ledger state. When a customer replies *"Payment done"*, the system replies with an informative message explaining that automated webhook verification is pending, and remains in `AWAITING_PREPAID`. The order can ONLY transition to `PAID_PREPAID` upon receipt of a cryptographically signed mock gateway webhook callback (`/api/mock-payments`).
