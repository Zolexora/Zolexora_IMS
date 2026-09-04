# Zolexora IMS — Cloud Inventory SaaS

**Zolexora IMS** is a modern, pure Google Sheets and Google Drive-powered multi-tenant **Software-as-a-Service (SaaS)** Inventory Management Web Application built on Google Apps Script and modern responsive web technologies.

---

## 🌟 SaaS Platform Capabilities

- **Multi-Tenant Architecture**: Each client organization or business tenant enjoys an isolated, dedicated database workspace inside Google Drive.
- **Automated Tenant Database Provisioning**: In seconds, a new tenant database is provisioned with 6 structured subdirectories and clean Google Sheets workbooks.
- **Cross-Industry Support**: Built for Hospitality & Hotels, Restaurants & F&B, Retail & E-Commerce, Warehousing & Logistics, Corporate Offices, and Healthcare.
- **Dynamic Multi-Tenant Switcher**: Seamlessly switch between client organizations or spin up new tenant databases with 1 click.
- **Enterprise Concurrency Locking**: Multi-user real-time transactions with transactional concurrency locks directly on Google Sheets.
- **Barcode & QR Engine**: Live camera scanning and printable asset barcodes.
- **Dual-Dashboard Architecture**: Dedicated top-level switching between **Inventory - Store** (central procurements, warehouse stocks, distributions) and **Selling Point** (POS billing, inward purchases, operating expenses).
- **Synchronized Store & Selling Point Selectors**: Contextual dropdowns in top header and dashboard banners allowing instant switching/filtering across Stores (`S_000`, `S_001`, `S_002`) and Selling Points (`SP_001`, `SP_002`, `SP_003`, `SP_004`).
- **Live Google Drive & Sheets Integration**: All tenant databases, reports, invoices, and backups are strictly organized in dedicated Google Drive storage.

---

## 🌳 Multi-Tenant Google Drive Directory Architecture

All tenant databases and resources reside within the root cloud storage:  
👉 [Root Drive Database: `1lkSx36mqaqnF8gfqNswdSPb0zqY4lvOx`](https://drive.google.com/drive/folders/1lkSx36mqaqnF8gfqNswdSPb0zqY4lvOx)

```text
📁 1lkSx36mqaqnF8gfqNswdSPb0zqY4lvOx/  (Root Cloud Database)
│
└── 📁 [Tenant Organization Name]/      (e.g., Acme Retail, Zolexora Resorts)
    │
    ├── 📁 01_Master_Databases/
    │   ├── 📊 Location_Master         (Sheets: Store, Selling_Point)
    │   ├── 📊 Product_Master          (Sheet: Product_Master)
    │   └── 📊 Supplier_Master         (Sheet: Supplier_Master - 28 Vendors)
    │
    ├── 📁 02_Transactions/
    │   ├── 📊 Supplier_Transactions   (Stock-In & Purchase Orders)
    │   ├── 📊 Issuance_Transactions   (Store-to-Department Disbursements)
    │   └── 📊 Selling_Point_Transactions (Sheets: SP_Sales, SP_Purchases, SP_Expenses)
    │
    ├── 📁 03_Settings_and_Users/
    │   └── 📊 Users_and_Settings      (Sheets: Users, Settings)
    │
    ├── 📁 04_Invoices_and_Attachments/
    │   ├── 📁 Purchase_Orders/        (Uploaded PO PDFs / Challans)
    │   └── 📁 Delivery_Challans/      (Goods Receipt documentation)
    │
    ├── 📁 05_Reports_and_Exports/
    │   ├── 📁 Daily_Summaries/        (Daily consumption snapshots)
    │   ├── 📁 Monthly_Valuation/      (Inventory valuation reports)
    │   └── 📁 Supplier_Audits/        (Vendor performance audits)
    │
    └── 📁 06_System_Backups/          (Automated periodic sheet archives)
```

---

## 🛠 Tech Stack

- **Backend**: Google Apps Script (V8 runtime), Google DriveApp, Google SpreadsheetApp
- **Frontend**: HTML5, Tailwind CSS, Material Symbols, FontAwesome, Chart.js, HTML5-QRCode
- **Deployment & Tooling**: `@google/clasp`, Git / GitHub

---

## 💻 Development & Deployment

### Push changes to Google Apps Script:
```bash
clasp push -f
```

### Pull latest remote changes:
```bash
clasp pull
```

### Push code to GitHub:
```bash
git add .
git commit -m "Your commit message"
git push origin main
```