# COD Compass — Mathematical Methodology & Formulation

This document details the financial equations, statistical risk estimators, and decision formulas implemented in COD Compass.

---

### 1. Unit Economics & Contribution Accounting

#### A. Expected RTO Direct Cash Loss ($L$)
When a COD package returns to origin, the brand incurs irreversible outbound and return logistics, packaging labor and materials, and damaged goods loss:
$$L = \text{Forward Shipping} + \text{Return Shipping} + \text{Packaging} + (\text{Damage Rate} \times \text{Product Cost})$$
$$L = 65 + 65 + 25 + (0.08 \times 180) = 155 + 14.40 = \mathbf{₹169.40}$$

#### B. Delivered Gross Contribution ($G(v)$)
Under the default standard D2C accounting convention, the stated 62% gross margin represents Product COGS margin before outbound logistics. At order value $v$:
$$G(v) = 0.62 \times v - \text{Forward Shipping} - \text{Packaging}$$
$$G(v) = 0.62 \times v - 65 - 25 = 0.62 \times v - 90$$
For an order of value $v = ₹649$:
$$G(649) = 0.62 \times 649 - 90 = 402.38 - 90 = \mathbf{₹312.38}$$

*(Note: If an alternate accounting interpretation is enabled where fulfillment is already booked inside 62%, $G(v) = 0.62 \times v = ₹402.38$.)*

---

### 2. Expected Value of Dispatch & Break-Even Risk

#### A. Expected Value of Shipping COD ($EV_{\text{ship}}$)
$$EV_{\text{ship}}(v, p) = (1 - p) \cdot G(v) - p \cdot L$$
Where:
- $p$ is the predicted probability of RTO
- $1 - p$ is the probability of successful delivery
At the brief's benchmark ($v = ₹649, p = 0.28$):
$$EV_{\text{ship}} = 0.72 \times 312.38 - 0.28 \times 169.40 = 224.9136 - 47.4320 = \mathbf{+₹177.4816}$$

#### B. Economic Break-Even Cancellation Threshold ($p_{\text{break}}$)
Pre-shipment cancellation yields an immediate incremental fulfillment contribution of ₹0. Therefore, cancellation is economically superior to shipping **only when expected shipping contribution is negative**:
$$EV_{\text{ship}} < 0 \iff (1 - p) G - p L < 0$$
$$p_{\text{break}} = \frac{G}{G + L}$$
At $v = ₹649, G = ₹312.38, L = ₹169.40$:
$$p_{\text{break}} = \frac{312.38}{312.38 + 169.40} = \frac{312.38}{481.78} \approx \mathbf{64.84\%}$$
An order with 30% or 40% return risk still produces substantial positive cash contribution. Cancelling it loses more money in foregone margin than it saves in shipping.

---

### 3. Prepaid Discount Economics

#### A. Converted Prepaid Expected Value ($EV_{\text{prepaid}}$)
Prepaid orders have an observed return rate of only 4% ($p_{\text{prepaid}} = 0.04$). Offering a flat discount $d = ₹30$:
$$EV_{\text{prepaid}}(v, p_{\text{prepaid}}, d) = (1 - p_{\text{prepaid}}) \cdot [G(v) - d] - p_{\text{prepaid}} \cdot L$$
At $v = ₹649, p_{\text{prepaid}} = 0.04, d = ₹30$:
$$EV_{\text{prepaid}} = (1 - 0.04) \cdot [312.38 - 30] - 0.04 \cdot 169.40$$
$$EV_{\text{prepaid}} = 0.96 \times 282.38 - 6.776 = 271.0848 - 6.776 = \mathbf{₹264.3088}$$

#### B. Incremental Uplift Per Converted Order
$$\text{Uplift} = EV_{\text{prepaid}} - EV_{\text{ship}} = 264.3088 - 177.4816 = \mathbf{+₹86.8272}$$

#### C. Theoretical Discount Ceiling
The maximum discount where prepaid EV remains greater than or equal to COD EV is:
$$d_{\text{max}} = \frac{(p_{\text{COD}} - p_{\text{prepaid}})(G + L)}{1 - p_{\text{prepaid}}} = \frac{(0.28 - 0.04)(312.38 + 169.40)}{0.96} = \frac{0.24 \times 481.78}{0.96} = \mathbf{₹120.445}$$
We recommend a conservative pilot offer of **₹30**, which captures ₹86.83 of unit profit while staying well below the theoretical ₹120.45 ceiling.

---

### 4. Empirical Bayesian Shrinkage Risk Model

To avoid catastrophic errors in sparse delivery locations (where 97.19% of pincodes have fewer than 5 past orders), we calculate risk using an Empirical Bayes shrinkage formula:
$$p_{\text{group}} = \frac{r_{\text{group}} + k \cdot p_{\text{global}}}{n_{\text{group}} + k}$$
Where:
- $r_{\text{group}}$ is observed returns in that category
- $n_{\text{group}}$ is total observed orders in that category
- $p_{\text{global}}$ is the national prior (28.08% from training split)
- $k$ is the shrinkage pseudo-count parameter ($k=20$ for customer cohorts, $k=30$ for pincodes).

If a pincode has only 1 order and 1 return ($r=1, n=1$):
$$p_{\text{shrunk}} = \frac{1 + 30 \times 0.2808}{1 + 30} = \frac{9.424}{31} \approx \mathbf{30.4\%}$$
The model shrinks the estimate safely to 30.4% rather than treating the location as 100% fraudulent.
