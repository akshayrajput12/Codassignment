# COD Compass — Operations & Customer Workflow Guide

This document outlines the operational standard operating procedures (SOP) and automated customer communication workflows implemented in COD Compass.

---

### 1. Operations Daily SOP

1. **8:30 AM — Founder & Ops Morning Review (`/overview`):**
   - Review yesterday's COD volume distribution across the 4 action buckets.
   - Inspect the **Financial Bridge** to verify avoided return shipping costs versus genuine margin foregone.
   - Open the **Needs Attention** drawer to inspect orders held for review due to missing postal details or high risk.

2. **9:00 AM — Exception Processing (`/orders`):**
   - Filter by `workflowState = HELD_FOR_REVIEW`.
   - For orders with missing house numbers or landmark ambiguities, warehouse staff initiate a quick manual call.
   - Once resolved, staff log an operational **Manual Override** with a mandatory written reason (e.g., *"Customer verified building number 42 over phone"*).
   - The order immediately transitions to `READY_TO_SHIP` and is released for pick and pack.

3. **Continuous — Automated Customer Outreach:**
   - Orders assigned to `SHIP_AFTER_CONFIRMATION` or `NUDGE_TO_PREPAID` automatically trigger WhatsApp messages.
   - Customers interact via simple one-tap quick replies or free text.

---

### 2. WhatsApp Customer Journey Matrix

| Trigger Event | Timing | Message Content & Intent | Next State |
|---|---|---|---|
| **Order Placed (Confirmation Required)** | $t = 0$ | *"Hi {Name}, please confirm order {ID} for ₹{Amount} before we dispatch it. Is your address correct? Choose Confirm, Update Address, or Cancel."* | `AWAITING_CONFIRMATION` |
| **Order Placed (Prepaid Nudge Eligible)** | $t = 0$ | *"Want to pay online for order {ID}? Pay ₹{Discounted} instead of ₹{Amount} and save ₹30. This demo link expires in 24 hours: {Link}."* | `AWAITING_PREPAID` |
| **Customer replies "Yes" / "Confirm" / "Haan"** | Immediate | *"Thank you for confirming! Your order is scheduled for warehouse dispatch."* | `CONFIRMED_COD` (Ready to ship) |
| **Customer replies "Cancel" / "Nahi chahiye"** | Immediate | *"Order {ID} has been cancelled as requested. You will not be charged. Thank you."* | `CANCELLED` |
| **Customer replies "Keep COD"** | Immediate | *"Got it! Order {ID} will remain Cash on Delivery and is now scheduled for dispatch."* | `CONFIRMED_COD` (Ready to ship) |
| **Customer sends text claiming "Payment Done"** | Immediate | *"Payment verification pending. Our automated gateway is awaiting bank confirmation..."* | Remains `AWAITING_PREPAID` |
| **Customer updates address text** | Immediate | *"We have recorded your address update: '{Text}'. Ops is verifying postal details..."* | `AWAITING_ADDRESS_CORRECTION` |
| **Customer replies "STOP"** | Immediate | *"You have unsubscribed from automated WhatsApp updates."* | Outreach suppressed |
| **Inactivity Reminder** | $t = 6\text{h}$ | *"Reminder: Hi {Name}, your order is awaiting confirmation before dispatch..."* | Remains awaiting |
| **24-Hour Inactivity Window Expiry** | $t = 24\text{h}$ | Discount quote expires; order automatically held for staff follow-up | `TIMED_OUT` & `HELD_FOR_REVIEW` |
| **Verified Mock Payment Gateway Webhook** | Immediate | Webhook verifies token and amount: marks quote `PAID` | `PAID_PREPAID` (Express ship) |

---

### 3. Multi-Language Availability

All customer templates are reviewed and available in three languages:
- **English:** Default corporate and urban customer communication.
- **Hindi:** Full Devanagari script for regional accessibility.
- **Hinglish:** Colloquial Latin-script conversational phrasing (*"Hi {Name}, aapka order dispatch karne se pehle confirm kar dein..."*), widely preferred by Indian D2C shoppers.
