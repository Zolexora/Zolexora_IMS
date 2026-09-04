/**
 * Zolexora IMS - Selling Point (POS) Operations Engine
 * Handles Point-of-Sale Billing, Outlet Stock Purchases, and Petty Cash Expenses
 */

// ==========================================
// 1. FETCH SELLING POINT TRANSACTIONS
// ==========================================
function getSellingPointTransactions(limit) {
  const max = limit || 150;
  const result = {
    sales: [],
    purchases: [],
    expenses: []
  };

  try {
    const ss = getWorkbook(WORKBOOKS.SELLING_POINT_TXNS);
    if (!ss) return result;

    // 1. Read SP_Sales
    const salesSheet = ss.getSheetByName('SP_Sales');
    if (salesSheet && salesSheet.getLastRow() > 1) {
      const sData = salesSheet.getDataRange().getValues();
      for (let i = sData.length - 1; i >= 1 && result.sales.length < max; i--) {
        const r = sData[i];
        if (!r[0]) continue;
        result.sales.push({
          id: String(r[0]),
          timestamp: r[1] ? new Date(r[1]).toISOString() : '',
          date: String(r[2] || ''),
          sellingPointCode: String(r[3] || 'SP_001'),
          sellingPointName: String(r[4] || 'Front Counter'),
          billNo: String(r[5] || r[0]),
          customerName: String(r[6] || 'Walk-in Customer'),
          itemCode: String(r[7] || ''),
          itemName: String(r[8] || ''),
          category: String(r[9] || 'General'),
          quantity: Number(r[10]) || 1,
          unit: String(r[11] || 'Pcs'),
          rate: Number(r[12]) || 0,
          taxPercent: Number(r[13]) || 0,
          totalAmount: Number(r[14]) || 0,
          paymentMode: String(r[15] || 'Cash'),
          paymentStatus: String(r[16] || 'Completed'),
          cashier: String(r[17] || 'Staff'),
          notes: String(r[18] || '')
        });
      }
    }

    // 2. Read SP_Purchases
    const purSheet = ss.getSheetByName('SP_Purchases');
    if (purSheet && purSheet.getLastRow() > 1) {
      const pData = purSheet.getDataRange().getValues();
      for (let i = pData.length - 1; i >= 1 && result.purchases.length < max; i--) {
        const r = pData[i];
        if (!r[0]) continue;
        result.purchases.push({
          id: String(r[0]),
          timestamp: r[1] ? new Date(r[1]).toISOString() : '',
          date: String(r[2] || ''),
          sellingPointCode: String(r[3] || 'SP_001'),
          sellingPointName: String(r[4] || 'Front Counter'),
          source: String(r[5] || 'Direct Supplier'),
          itemCode: String(r[6] || ''),
          itemName: String(r[7] || ''),
          category: String(r[8] || 'General'),
          quantity: Number(r[9]) || 1,
          unit: String(r[10] || 'Pcs'),
          costRate: Number(r[11]) || 0,
          taxPercent: Number(r[12]) || 0,
          totalCost: Number(r[13]) || 0,
          invoiceRef: String(r[14] || ''),
          paymentStatus: String(r[15] || 'Paid'),
          receivedBy: String(r[16] || 'Store Keeper'),
          notes: String(r[17] || '')
        });
      }
    }

    // 3. Read SP_Expenses
    const expSheet = ss.getSheetByName('SP_Expenses');
    if (expSheet && expSheet.getLastRow() > 1) {
      const eData = expSheet.getDataRange().getValues();
      for (let i = eData.length - 1; i >= 1 && result.expenses.length < max; i--) {
        const r = eData[i];
        if (!r[0]) continue;
        result.expenses.push({
          id: String(r[0]),
          timestamp: r[1] ? new Date(r[1]).toISOString() : '',
          date: String(r[2] || ''),
          sellingPointCode: String(r[3] || 'SP_001'),
          sellingPointName: String(r[4] || 'Front Counter'),
          category: String(r[5] || 'Petty Cash'),
          amount: Number(r[6]) || 0,
          paymentMode: String(r[7] || 'Cash'),
          paidTo: String(r[8] || 'Vendor'),
          voucherRef: String(r[9] || ''),
          recordedBy: String(r[10] || 'Staff'),
          status: String(r[11] || 'Approved'),
          notes: String(r[12] || '')
        });
      }
    }

    return result;
  } catch (e) {
    console.error('Error fetching selling point transactions: ' + e.message, e);
    return result;
  }
}

// ==========================================
// 2. RECORD SELLING POINT SALE (POS)
// ==========================================
function recordSellingPointSale(saleData) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
  } catch (e) {
    throw new Error('Server busy with concurrent transaction. Please retry.');
  }

  try {
    const ss = getWorkbook(WORKBOOKS.SELLING_POINT_TXNS);
    let sheet = ss.getSheetByName('SP_Sales');
    if (!sheet) {
      sheet = ss.insertSheet('SP_Sales');
      sheet.appendRow([
        'Sale ID', 'Timestamp', 'Date', 'Selling Point Code', 'Selling Point Name',
        'Bill No', 'Customer Name', 'Item Code', 'Item Name', 'Category',
        'Quantity', 'UOM', 'Rate', 'Tax %', 'Total Amount',
        'Payment Mode', 'Payment Status', 'Cashier', 'Notes'
      ]);
      formatHeaderRow(sheet, 19);
    }

    const now = new Date();
    const nowIso = now.toISOString();
    const dateStr = saleData.date || Utilities.formatDate(now, 'Asia/Kolkata', 'yyyy-MM-dd');
    const dateCode = Utilities.formatDate(now, 'Asia/Kolkata', 'yyyyMMdd');
    const randCode = Math.floor(1000 + Math.random() * 9000);
    const saleId = 'SALE_' + dateCode + '_' + randCode;
    const billNo = String(saleData.billNo || ('POS-' + dateCode.slice(4) + '-' + randCode)).trim();

    const spCode = String(saleData.sellingPointCode || 'SP_001').trim();
    const spName = String(saleData.sellingPointName || 'Front Counter').trim();
    const customer = String(saleData.customerName || 'Walk-in Guest').trim();
    const itemCode = String(saleData.itemCode || '').trim().toUpperCase();
    const itemName = String(saleData.itemName || 'Direct Item').trim();
    const category = String(saleData.category || 'Retail Sales').trim();
    const qty = Math.abs(Number(saleData.quantity)) || 1;
    const unit = String(saleData.unit || 'Pcs').trim();
    const rate = Number(saleData.rate) || 0;
    const taxPct = Number(saleData.taxPercent) || 0;
    const totalAmount = Number(saleData.totalAmount) || (qty * rate * (1 + taxPct / 100));
    const payMode = String(saleData.paymentMode || 'Cash').trim();
    const payStatus = String(saleData.paymentStatus || 'Completed').trim();
    const cashier = String(saleData.cashier || 'Cashier').trim();
    const notes = String(saleData.notes || '').trim();

    sheet.appendRow([
      saleId,
      nowIso,
      dateStr,
      spCode,
      spName,
      billNo,
      customer,
      itemCode,
      itemName,
      category,
      qty,
      unit,
      rate,
      taxPct,
      totalAmount,
      payMode,
      payStatus,
      cashier,
      notes
    ]);

    // If itemCode exists in Product_Master, deduct stock from store
    try {
      if (itemCode) {
        deductStoreStockForSale(itemCode, qty, spCode);
      }
    } catch (stockErr) {
      console.warn('Could not auto-deduct stock for sale: ' + stockErr.message);
    }

    return {
      success: true,
      saleId: saleId,
      billNo: billNo,
      totalAmount: totalAmount,
      message: `Sale ${billNo} for ${totalAmount.toFixed(2)} recorded successfully.`
    };
  } finally {
    lock.releaseLock();
  }
}

// Helper: Deduct stock from assigned store when a sale occurs
function deductStoreStockForSale(itemCode, qty, spCode) {
  const prodWb = getWorkbook(WORKBOOKS.PRODUCT_MASTER);
  const prodSheet = prodWb.getSheetByName('Product_Master');
  if (!prodSheet) return;

  const data = prodSheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]).toUpperCase() === itemCode) {
      const rowNum = i + 1;
      let stockS001 = Number(data[i][8]) || 0;
      let stockS002 = Number(data[i][9]) || 0;
      let central = Number(data[i][10]) || 0;
      const rate = Number(data[i][5]) || 0;

      if (spCode.includes('002') || spCode.includes('S_002')) {
        stockS002 = Math.max(0, stockS002 - qty);
      } else {
        stockS001 = Math.max(0, stockS001 - qty);
      }

      const totalStock = stockS001 + stockS002 + central;
      const totalVal = totalStock * rate;

      prodSheet.getRange(rowNum, 9, 1, 5).setValues([[
        stockS001,
        stockS002,
        central,
        totalStock,
        totalVal
      ]]);
      prodSheet.getRange(rowNum, 16).setValue(new Date().toISOString());
      break;
    }
  }
}

// ==========================================
// 3. RECORD SELLING POINT PURCHASE (INWARD)
// ==========================================
function recordSellingPointPurchase(purData) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
  } catch (e) {
    throw new Error('Server busy with concurrent transaction. Please retry.');
  }

  try {
    const ss = getWorkbook(WORKBOOKS.SELLING_POINT_TXNS);
    let sheet = ss.getSheetByName('SP_Purchases');
    if (!sheet) {
      sheet = ss.insertSheet('SP_Purchases');
      sheet.appendRow([
        'Purchase ID', 'Timestamp', 'Date', 'Selling Point Code', 'Selling Point Name',
        'Source', 'Item Code', 'Item Name', 'Category', 'Quantity',
        'UOM', 'Cost Rate', 'Tax %', 'Total Cost', 'Invoice Ref',
        'Payment Status', 'Received By', 'Notes'
      ]);
      formatHeaderRow(sheet, 18);
    }

    const now = new Date();
    const nowIso = now.toISOString();
    const dateStr = purData.date || Utilities.formatDate(now, 'Asia/Kolkata', 'yyyy-MM-dd');
    const dateCode = Utilities.formatDate(now, 'Asia/Kolkata', 'yyyyMMdd');
    const purId = 'PUR_SP_' + dateCode + '_' + Math.floor(1000 + Math.random() * 9000);

    const spCode = String(purData.sellingPointCode || 'SP_001').trim();
    const spName = String(purData.sellingPointName || 'Front Counter').trim();
    const source = String(purData.source || purData.supplierName || 'Direct Vendor').trim();
    const itemCode = String(purData.itemCode || '').trim().toUpperCase();
    const itemName = String(purData.itemName || 'Direct Purchase Item').trim();
    const category = String(purData.category || 'Supplies').trim();
    const qty = Math.abs(Number(purData.quantity)) || 1;
    const unit = String(purData.unit || 'Pcs').trim();
    const costRate = Number(purData.costRate) || Number(purData.rate) || 0;
    const taxPct = Number(purData.taxPercent) || 0;
    const totalCost = Number(purData.totalCost) || (qty * costRate * (1 + taxPct / 100));
    const invRef = String(purData.invoiceRef || purData.reference || '').trim();
    const payStatus = String(purData.paymentStatus || 'Paid').trim();
    const recBy = String(purData.receivedBy || 'Staff Incharge').trim();
    const notes = String(purData.notes || '').trim();

    sheet.appendRow([
      purId,
      nowIso,
      dateStr,
      spCode,
      spName,
      source,
      itemCode,
      itemName,
      category,
      qty,
      unit,
      costRate,
      taxPct,
      totalCost,
      invRef,
      payStatus,
      recBy,
      notes
    ]);

    // Also increase stock if it's an existing catalog item
    try {
      if (itemCode) {
        addStoreStockForPurchase(itemCode, qty, spCode);
      }
    } catch (stockErr) {
      console.warn('Could not auto-add stock for purchase: ' + stockErr.message);
    }

    return {
      success: true,
      purchaseId: purId,
      totalCost: totalCost,
      message: `Purchase entry ${purId} for ${totalCost.toFixed(2)} recorded successfully.`
    };
  } finally {
    lock.releaseLock();
  }
}

// Helper: Add stock when direct purchase arrives at selling point
function addStoreStockForPurchase(itemCode, qty, spCode) {
  const prodWb = getWorkbook(WORKBOOKS.PRODUCT_MASTER);
  const prodSheet = prodWb.getSheetByName('Product_Master');
  if (!prodSheet) return;

  const data = prodSheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]).toUpperCase() === itemCode) {
      const rowNum = i + 1;
      let stockS001 = Number(data[i][8]) || 0;
      let stockS002 = Number(data[i][9]) || 0;
      let central = Number(data[i][10]) || 0;
      const rate = Number(data[i][5]) || 0;

      if (spCode.includes('002') || spCode.includes('S_002')) {
        stockS002 += qty;
      } else {
        stockS001 += qty;
      }

      const totalStock = stockS001 + stockS002 + central;
      const totalVal = totalStock * rate;

      prodSheet.getRange(rowNum, 9, 1, 5).setValues([[
        stockS001,
        stockS002,
        central,
        totalStock,
        totalVal
      ]]);
      prodSheet.getRange(rowNum, 16).setValue(new Date().toISOString());
      break;
    }
  }
}

// ==========================================
// 4. RECORD SELLING POINT EXPENSE (PETTY CASH)
// ==========================================
function recordSellingPointExpense(expData) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
  } catch (e) {
    throw new Error('Server busy with concurrent transaction. Please retry.');
  }

  try {
    const ss = getWorkbook(WORKBOOKS.SELLING_POINT_TXNS);
    let sheet = ss.getSheetByName('SP_Expenses');
    if (!sheet) {
      sheet = ss.insertSheet('SP_Expenses');
      sheet.appendRow([
        'Expense ID', 'Timestamp', 'Date', 'Selling Point Code', 'Selling Point Name',
        'Category', 'Amount', 'Payment Mode', 'Paid To', 'Voucher Ref',
        'Recorded By', 'Status', 'Notes'
      ]);
      formatHeaderRow(sheet, 13);
    }

    const now = new Date();
    const nowIso = now.toISOString();
    const dateStr = expData.date || Utilities.formatDate(now, 'Asia/Kolkata', 'yyyy-MM-dd');
    const dateCode = Utilities.formatDate(now, 'Asia/Kolkata', 'yyyyMMdd');
    const expId = 'EXP_' + dateCode + '_' + Math.floor(1000 + Math.random() * 9000);

    const spCode = String(expData.sellingPointCode || 'SP_001').trim();
    const spName = String(expData.sellingPointName || 'Front Counter').trim();
    const category = String(expData.category || 'Petty Cash').trim();
    const amount = Math.abs(Number(expData.amount)) || 0;
    const payMode = String(expData.paymentMode || 'Cash').trim();
    const paidTo = String(expData.paidTo || 'Vendor').trim();
    const voucherRef = String(expData.voucherRef || ('VCH-' + dateCode.slice(4) + '-' + Math.floor(100 + Math.random() * 900))).trim();
    const recordedBy = String(expData.recordedBy || 'Manager').trim();
    const status = String(expData.status || 'Approved').trim();
    const notes = String(expData.notes || '').trim();

    sheet.appendRow([
      expId,
      nowIso,
      dateStr,
      spCode,
      spName,
      category,
      amount,
      payMode,
      paidTo,
      voucherRef,
      recordedBy,
      status,
      notes
    ]);

    return {
      success: true,
      expenseId: expId,
      voucherRef: voucherRef,
      amount: amount,
      message: `Expense voucher ${voucherRef} for ${amount.toFixed(2)} recorded successfully.`
    };
  } finally {
    lock.releaseLock();
  }
}

// ==========================================
// 5. FETCH REFRESH DATA ENDPOINT
// ==========================================
function fetchSellingPointData() {
  const data = getSellingPointTransactions(200);
  const sellingPoints = getSellingPoints();
  return {
    success: true,
    data: data,
    sellingPoints: sellingPoints
  };
}
