# COD Compass — Assumptions & Modeling Limitations

This document explicitly lists all operational, economic, and statistical assumptions adopted in COD Compass.

---

### 1. Financial & Economic Assumptions
1. **CAC Treatment:** Customer Acquisition Cost (CAC = ₹300+) is treated strictly as a sunk cost for dispatch decisions. It is tracked as Marketing Exposure rather than deducted arbitrarily from cancellation EV.
2. **Gross Margin Scope:** Default assumes 62% gross margin is before outbound logistics ($G(v) = 0.62v - 90$). A toggle is provided for alternate accounting ($G(v) = 0.62v$).
3. **Resalable Returned Units:** 92% of returned units return undamaged and are returned to inventory. Only 8% incur damage at an average unit cost of ₹180.
4. **Prepaid Risk Assumption:** Converted prepaid orders assume a baseline RTO rate of 4.0% (as observed across company prepaid orders). In practice, high-risk buyers induced to prepay may carry slightly higher return risk (e.g., 6%-8%); the policy engine allows sensitivity testing.
5. **No Hidden Costs:** GST, COD payment gateway collection fees, and reverse courier surcharges are omitted unless explicitly configured in the Policy Engine.

---

### 2. Statistical & Machine Learning Assumptions
1. **Chronological Availability Proxy:** Historical order timestamps (`order_datetime`) are naive; final delivery completion timestamps are not provided in the raw CSV. Training models use April–July 2026 data ($N=1,332$), validation uses August 2026 ($N=326$), and final test/replay uses September 2026 ($N=329$).
2. **Pincode Stationarity:** Pincode risk characteristics are assumed stationary over a 6-month horizon. Bayesian shrinkage ($k=30$) protects low-support areas from noise.
3. **Absence of PII Inference:** Customer names and phone strings are never used to infer gender, religion, caste, or demographic worthiness.

---

### 3. Simulation & Operational Assumptions
1. **Prepaid Conversion Elasticity ($q$):** Headline replay scenarios assume a 25% conversion rate among eligible customers offered the ₹30 discount. If actual conversion is lower (e.g. 10%), net uplift remains positive but smaller.
2. **Customer Confirmation Drop-off:** Modeled scenarios assume a 3% unintended drop-off among genuine buyers due to confirmation friction, and a 40% reduction in uncommitted/fraudulent orders.
3. **Virtual Clock Independence:** Virtual clock time advancement (`+6h`, `+12h`, `+24h`) operates deterministically on server state without altering host machine system time.
