# Zolexora IMS

**Zolexora IMS** is a pure Google Sheets and Google Drive-driven enterprise Inventory Management System (IMS) built on Google Apps Script and modern web technologies.

---

## 🌟 Key Features

- **Multi-Workbook Architecture**: Decentralized architecture separating Location Master, Product Master, Supplier Directory, Purchase Transactions, Issuances, and System Settings.
- **Dedicated Google Drive Integration**: All files, workbooks, reports, invoices, and backups are strictly organized inside designated Google Drive folder `1lkSx36mqaqnF8gfqNswdSPb0zqY4lvOx`.
- **Live Google Sheets Synchronization**: Reads and writes directly from Google Sheets with transactional concurrency locking.
- **Barcode & QR Code Scanning**: Integrated camera-based barcode/QR scanner and printable barcode labels.
- **Auditing & Analytics**: Real-time stock valuation, consumption tracking, and export to CSV.

---

## 📁 Google Drive Directory Tree Structure

All files and subfolders reside within:
👉 [Google Drive Folder: `1lkSx36mqaqnF8gfqNswdSPb0zqY4lvOx`](https://drive.google.com/drive/folders/1lkSx36mqaqnF8gfqNswdSPb0zqY4lvOx)

```text
📁 1lkSx36mqaqnF8gfqNswdSPb0zqY4lvOx/  (Root Database Folder)
│
├── 📁 01_Master_Databases/
│   ├── 📊 Location_Master             (Sheets: Store, Selling_Point)
│   ├── 📊 Product_Master              (Sheet: Product_Master)
│   └── 📊 Supplier_Master             (Sheet: Supplier_Master)
│
├── 📁 02_Transactions/
│   ├── 📊 Supplier_Transactions       (Stock-In & Purchase Orders)
│   └── 📊 Issuance_Transactions       (Store-to-Department Disbursements)
│
├── 📁 03_Settings_and_Users/
│   └── 📊 Users_and_Settings          (Sheets: Users, Settings)
│
├── 📁 04_Invoices_and_Attachments/
│   ├── 📁 Purchase_Orders/
│   └── 📁 Delivery_Challans/
│
├── 📁 05_Reports_and_Exports/
│   ├── 📁 Daily_Summaries/
│   ├── 📁 Monthly_Valuation/
│   └── 📁 Supplier_Audits/
│
└── 📁 06_System_Backups/
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