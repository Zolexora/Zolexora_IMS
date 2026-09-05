---
name: sbi
description: Complete integration guide and reference for State Bank of India (SBI) Merchant QR, SBI Payments, YONO SBI Merchant, SBI ePay Gateway, Soundbox, and NPCI Dynamic QR for Zolexora IMS.
---

# State Bank of India (SBI) Merchant QR & Payment Integration Skill

This skill provides complete reference documentation, workflows, and tools for integrating **State Bank of India (SBI)** Merchant QR, **YONO SBI Merchant (SBI Payments)**, **BHIM SBI Pay**, **SBI ePay**, and **SBI Soundbox** into Zolexora IMS.

---

## 1. Overview of SBI Merchant Payment Services

State Bank of India provides merchant acquiring and digital collection services through **SBI Payments** (SBI Payment Services Pvt. Ltd. — a joint venture between SBI and Hitachi Payment Services) and **SBI ePay** (SBI's payment aggregator).

### Key Offerings for Retailers & Merchants:
1. **SBI Merchant UPI QR (Static & Dynamic)**:
   - Instant direct-to-bank settlement into your SBI Current Account.
   - **0% MDR** for standard P2M transactions up to ₹2,000; standard RBI tiers for amounts above.
   - **RuPay Credit Card on UPI**: Fully enabled for SBI Merchant accounts (customers can pay using RuPay CC on Google Pay, PhonePe, Paytm, BHIM, Cred, etc.).
2. **YONO SBI Merchant / YONO Vyapar App**:
   - Mobile merchant dashboard for real-time transaction MIS, refunds, and cashier management.
3. **SBI Soundbox (SBI Payments)**:
   - Dedicated GPRS/4G SIM-enabled hardware device providing loud voice chimes in multiple regional languages upon payment receipt.
4. **SBI ePay Payment Gateway**:
   - Web & API payment gateway for cards, netbanking, and server-to-server dynamic QR generation with webhook confirmation.
5. **SBI BharatQR & EDC POS Machines**:
   - All-in-one Android POS terminals supporting chip/PIN, contactless tap, and dynamic QR display.

---

## 2. How to Get an SBI Bank Merchant QR

Merchants with an SBI Current Account can acquire an official Merchant QR in three ways:

### Method A: Instant Digital Registration via YONO SBI Merchant App
1. Download **YONO SBI Merchant** from the Google Play Store or Apple App Store.
2. Enter your registered mobile number linked with your SBI Current Account.
3. Enter OTP and authenticate using your SBI Net Banking credentials or Corporate Internet Banking (CINB).
4. Fill in Business Details: Legal Entity Name, Shop Name, Merchant Category (MCC), and PAN/GSTIN.
5. Your **Merchant Virtual Payment Address (VPA)** and digital QR code are generated immediately.

### Method B: BHIM SBI Pay (Business Tab)
1. Open **BHIM SBI Pay** app.
2. Navigate to the **Business** tab.
3. Select **Enroll as Merchant** and link your SBI Current Account.
4. Set up your customized VPA handle (e.g., `yourbusiness@sbi`).

### Method C: Home Branch Walk-in / SBI Payments Representative
1. Visit your SBI home branch where your Current Account is maintained.
2. Submit the **SBI Merchant Acquiring Application Form** with:
   - Business Registration Proof (GST Certificate, Udyam Aadhar, or Shop & Establishment Act license).
   - Business PAN & Signatory KYC (Aadhaar/PAN).
   - Cancelled cheque of your SBI Current Account.
3. Request:
   - **SBI Standee Static QR** (for counter scan).
   - **Merchant VPA** (for POS dynamic QR integration).
   - **SBI Soundbox** (optional, monthly rental waived for high-volume accounts).
   - **SBI POS Terminal** (optional, Pine Labs or Hitachi Android EDC machine).

---

## 3. SBI Merchant VPA (UPI ID) Handles & Specs

SBI Merchant accounts are assigned VPAs under standard banking handles:

| Handle Format | Service Provider | Example | Usage |
| :--- | :--- | :--- | :--- |
| `username@sbi` | State Bank of India Core UPI | `zolexorastore@sbi` | Counter UPI, Dynamic QR |
| `username@sbiepay` | SBI ePay Aggregator | `zolexora@sbiepay` | PG Checkout & Webhooks |
| `mobile.terminal@sbi` | YONO SBI Merchant App | `9876543210.01@sbi` | Terminal-specific VPA |
| `username@sbiyono` | YONO Vyapar Portal | `zolexora@sbiyono` | Merchant business portal |

### NPCI Dynamic UPI Intent URI Specification
Zolexora IMS constructs dynamic payment intent links conforming to the NPCI UPI Merchant specification:
```text
upi://pay?pa={sbi_vpa}&pn={legal_name}&mc={mcc}&am={amount_2_dec}&cu=INR&tn={transaction_note}
```

* **`pa` (Payee Address)**: Your SBI Merchant VPA (e.g. `zolexora@sbi`).
* **`pn` (Payee Name)**: Registered business name with SBI (URL-encoded).
* **`mc` (Merchant Category Code)**:
  - `5812`: Eating Places & Restaurants
  - `5814`: Fast Food & Specialty Cafes
  - `5411`: Grocery Stores & Supermarkets
  - `5311`: Department & Retail Stores
  - `5691`: Men's & Women's Apparel
  - `5912`: Drug Stores & Pharmacies
* **`am` (Amount)**: Exact bill amount formatted to 2 decimal places (e.g. `450.00`).
* **`cu` (Currency)**: `INR`.
* **`tn` (Transaction Note)**: Order or bill reference (e.g. `Bill_904120`).

---

## 4. RuPay Credit Card on UPI Acceptance

One of the greatest advantages of an official SBI Merchant VPA over a personal savings UPI ID is **RuPay Credit Card acceptance**:
- **Personal UPI IDs (`@oksbi`, `@sbi` on savings accounts)**: Customers **CANNOT** pay using their credit cards; transactions fail with *"Payment not supported by payee account"*.
- **SBI Merchant Current Account VPAs**: Fully support **RuPay Credit Card on UPI** payments. Customers can link their RuPay credit card to GPay/PhonePe/Paytm and pay at your counter.
- **MDR Guidelines**:
  - Transactions up to ₹2,000 via RuPay CC on UPI are subject to 0% MDR for small merchants (annual turnover < ₹20 Lakhs).
  - Standard interchange charges apply for large merchants or transactions above ₹2,000 as per RBI/NPCI directives.

---

## 5. Verification Mechanics in Zolexora IMS

Because Direct Dynamic UPI QR is direct-to-bank without an intermediary aggregator holding your funds, verification in Zolexora IMS is optimized through multiple layers:

1. **Instant Voice Soundbox**:
   - Both physical SBI GPRS Soundbox and built-in Web Speech API announce: *"Received payment of ₹X successfully via UPI"*.
2. **Bank UTR (Unique Transaction Reference)**:
   - When the customer pays, their banking app displays a 12-digit UTR (e.g., `424518920145`).
   - The cashier can optionally input the last 4 to 6 digits into the settlement modal to reconcile the invoice.
3. **SBI YONO Merchant App / Push SMS**:
   - The cashier or store manager receives instant push notification / SMS from `SBI-PAY` with the amount and reference number.
4. **SBI ePay Webhook Integration**:
   - If using SBI ePay gateway credentials, server-to-server HTTP POST callbacks notify `POST /api/v1/payment/sbi/webhook` to automatically mark bills as settled.

---

## 6. Configuring SBI Merchant QR in Zolexora IMS

### Step 1: Open Terminal Settings
1. Navigate to **POS Settings** (`/pos/settings`) in Zolexora IMS.
2. Under **Merchant Payment Rails & Gateways**, select **Direct Dynamic UPI QR**.
3. Fill in:
   - **Merchant UPI Handle (VPA)**: Enter your SBI handle (e.g. `yourbrand@sbi`).
   - **Legal Payee / Business Name**: Enter your name as registered with SBI (e.g. `Zolexora Retail Operations`).
   - **Merchant Category Code (MCC)**: Select your business type (e.g. `5812` for dining/cafe).
   - **Voice Soundbox Audio**: Check **Enable Soundbox voice confirmations**.
4. Click **Save Configuration** (persisted directly to Cloudflare D1 / SQLite database).

### Step 2: Taking Customer Payments
1. In POS Dashboard (`/pos/dashboard`), add items to cart.
2. Select **UPI / QR** as the payment method.
3. The high-resolution Dynamic QR code opens with the exact bill total and your SBI VPA.
4. Customer scans using Google Pay, PhonePe, Paytm, or BHIM.
5. Soundbox chimes and bill settles with zero intermediary deduction.

---

## 7. Useful SBI Merchant Contact Channels
- **SBI Payments Official Portal**: [https://www.sbipayments.com](https://www.sbipayments.com)
- **SBI ePay Gateway**: [https://www.sbiepay.sbi](https://www.sbiepay.sbi)
- **SBI Merchant Support Email**: `merchantdesk@sbipayments.com` / `support.sbiepay@sbi.co.in`
- **Merchant Helpdesk Phone**: `1800 11 2211` / `+91-22-2753 5773`
