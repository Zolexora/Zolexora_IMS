/**
 * Zolexora IMS - Supplier & Issuance Transactions Engine
 */

// ==========================================
// 1. SUPPLIER PURCHASES & STOCK IN
// ==========================================
function processSupplierPurchase(txn) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
  } catch (e) {
    throw new Error('Server busy with concurrent transaction. Please retry.');
  }

  try {
    const prodWb = getWorkbook(WORKBOOKS.PRODUCT_MASTER);
    const prodSheet = prodWb.getSheetByName('Product_Master');
    const supTxnWb = getWorkbook(WORKBOOKS.SUPPLIER_TXNS);
    const supTxnSheet = supTxnWb.getSheetByName('Supplier_Transactions');

    const itemCode = String(txn.itemCode || txn.itemId || txn.sku).trim().toUpperCase();
    const prodData = prodSheet.getDataRange().getValues();
    let targetRow = -1;
    let itemRow = null;

    for (let i = 1; i < prodData.length; i++) {
      if (String(prodData[i][0]).toUpperCase() === itemCode) {
        targetRow = i + 1;
        itemRow = prodData[i];
        break;
      }
    }

    if (targetRow === -1 || !itemRow) {
      throw new Error('Product not found for Item Code: ' + itemCode);
    }

    const itemDesc = String(itemRow[1]);
    const itemStatus = String(itemRow[14] || 'Active').trim().toLowerCase();
    if (itemStatus === 'discontinued') {
      throw new Error(`Purchase not allowed! Item "${itemDesc}" (${itemCode}) has been discontinued.`);
    }
    const category = String(itemRow[2]);
    const uom = String(itemRow[4] || 'Pcs');
    let rate = Number(txn.rate) || Number(itemRow[5]) || 0;
    let taxPct = Number(txn.taxPercent) || Number(itemRow[6]) || 0;
    const minStock = Number(itemRow[7]) || 0;
    let stockS001 = Number(itemRow[8]) || 0;
    let stockS002 = Number(itemRow[9]) || 0;
    let centralStock = Number(itemRow[10]) || 0;

    const qty = Math.abs(Number(txn.quantity));
    if (isNaN(qty) || qty <= 0) throw new Error('Quantity must be greater than 0');

    const storeCode = String(txn.storeCode || txn.destLocation || 'S_001').toUpperCase();
    let storeName = txn.storeName || 'Store';

    if (storeCode.includes('S_001') || storeCode.includes('STORE 1')) {
      stockS001 += qty;
      storeName = txn.storeName || 'Store 1 (Main Branch)';
    } else if (storeCode.includes('S_002') || storeCode.includes('STORE 2')) {
      stockS002 += qty;
      storeName = txn.storeName || 'Store 2 (Outlet Branch)';
    } else {
      centralStock += qty;
      storeName = txn.storeName || 'Central Depot Warehouse';
    }

    const totalStock = stockS001 + stockS002 + centralStock;
    const totalVal = totalStock * rate;
    const nowIso = new Date().toISOString();

    // Update Product_Master row
    prodSheet.getRange(targetRow, 6, 1, 8).setValues([[
      rate,
      taxPct,
      minStock,
      stockS001,
      stockS002,
      centralStock,
      totalStock,
      totalVal
    ]]);
    prodSheet.getRange(targetRow, 16).setValue(nowIso);

    // Append to Supplier_Transactions
    const dateCode = Utilities.formatDate(new Date(), 'Asia/Kolkata', 'yyyyMMdd');
    const txnId = 'TXN_SUP_' + dateCode + '_' + Math.floor(1000 + Math.random() * 9000);
    const taxAmt = (qty * rate * taxPct) / 100;
    const totalAmt = (qty * rate) + taxAmt;

    supTxnSheet.appendRow([
      txnId,
      nowIso,
      txn.supplierCode || '',
      txn.supplierName || '',
      itemCode,
      itemDesc,
      category,
      qty,
      uom,
      rate,
      taxPct,
      totalAmt,
      storeCode,
      storeName,
      txn.reference || txn.invoiceRef || '',
      txn.performedBy || txn.receivedBy || 'Store Keeper',
      txn.notes || ''
    ]);

    return {
      success: true,
      transactionId: txnId,
      itemCode: itemCode,
      updatedTotalStock: totalStock,
      updatedValuation: totalVal
    };
  } finally {
    lock.releaseLock();
  }
}

// ==========================================
// 2. ISSUANCE TO SELLING POINTS & DEPARTMENTS
// ==========================================
function processStockIssuance(txn) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
  } catch (e) {
    throw new Error('Server busy with concurrent transaction. Please retry.');
  }

  try {
    const prodWb = getWorkbook(WORKBOOKS.PRODUCT_MASTER);
    const prodSheet = prodWb.getSheetByName('Product_Master');
    const issueWb = getWorkbook(WORKBOOKS.ISSUANCE_TXNS);
    const issueSheet = issueWb.getSheetByName('Issuance_Transactions');

    const itemCode = String(txn.itemCode || txn.itemId || txn.sku).trim().toUpperCase();
    const prodData = prodSheet.getDataRange().getValues();
    let targetRow = -1;
    let itemRow = null;

    for (let i = 1; i < prodData.length; i++) {
      if (String(prodData[i][0]).toUpperCase() === itemCode) {
        targetRow = i + 1;
        itemRow = prodData[i];
        break;
      }
    }

    if (targetRow === -1 || !itemRow) {
      throw new Error('Product not found for Item Code: ' + itemCode);
    }

    const itemDesc = String(itemRow[1]);
    const uom = String(itemRow[4] || 'Pcs');
    const rate = Number(itemRow[5]) || 0;
    let stockS001 = Number(itemRow[8]) || 0;
    let stockS002 = Number(itemRow[9]) || 0;
    let centralStock = Number(itemRow[10]) || 0;

    const qty = Math.abs(Number(txn.quantity));
    if (isNaN(qty) || qty <= 0) throw new Error('Quantity must be greater than 0');

    const fromStore = String(txn.sourceLocation || txn.fromStore || 'S_001').toUpperCase();
    const toSp = String(txn.destLocation || txn.toSellingPoint || 'SP_001');

    // Validate available stock in source store
    if (fromStore.includes('S_001') || fromStore.includes('STORE 1')) {
      if (stockS001 < qty) throw new Error(`Insufficient stock in Store 1 (Available: ${stockS001}, Requested: ${qty})`);
      stockS001 -= qty;
    } else if (fromStore.includes('S_002') || fromStore.includes('STORE 2')) {
      if (stockS002 < qty) throw new Error(`Insufficient stock in Store 2 (Available: ${stockS002}, Requested: ${qty})`);
      stockS002 -= qty;
    } else {
      if (centralStock < qty) throw new Error(`Insufficient stock in Central Depot (Available: ${centralStock}, Requested: ${qty})`);
      centralStock -= qty;
    }

    // If it's a transfer between stores, increase stock in destination
    const type = String(txn.type || 'DISBURSEMENT').toUpperCase();
    if (type === 'TRANSFER') {
      const dest = toSp.toUpperCase();
      if (dest.includes('S_001') || dest.includes('STORE 1')) {
        stockS001 += qty;
      } else if (dest.includes('S_002') || dest.includes('STORE 2')) {
        stockS002 += qty;
      } else {
        centralStock += qty;
      }
    }

    const totalStock = stockS001 + stockS002 + centralStock;
    const totalVal = totalStock * rate;
    const nowIso = new Date().toISOString();

    // Update Product_Master
    prodSheet.getRange(targetRow, 9, 1, 5).setValues([[
      stockS001,
      stockS002,
      centralStock,
      totalStock,
      totalVal
    ]]);
    prodSheet.getRange(targetRow, 16).setValue(nowIso);

    // Append to Issuance_Transactions
    const dateCode = Utilities.formatDate(new Date(), 'Asia/Kolkata', 'yyyyMMdd');
    const issueId = 'ISS_' + dateCode + '_' + Math.floor(1000 + Math.random() * 9000);
    const lineTotal = qty * rate;

    issueSheet.appendRow([
      issueId,
      nowIso,
      type,
      itemCode,
      itemDesc,
      qty,
      uom,
      fromStore,
      txn.fromStoreName || fromStore,
      toSp,
      txn.toSellingPointName || toSp,
      rate,
      lineTotal,
      txn.reference || txn.requisitionRef || '',
      txn.performedBy || txn.issuedBy || 'Store Incharge',
      'Approved',
      txn.notes || ''
    ]);

    return {
      success: true,
      issuanceId: issueId,
      itemCode: itemCode,
      updatedTotalStock: totalStock,
      updatedValuation: totalVal
    };
  } finally {
    lock.releaseLock();
  }
}

/**
 * Universal dispatcher for frontend modal calls
 */
function processStockTransaction(txn) {
  const type = String(txn.type).toUpperCase();
  if (type === 'STOCK_IN') {
    return processSupplierPurchase(txn);
  } else {
    return processStockIssuance(txn);
  }
}

// ==========================================
// 3. READ TRANSACTIONS
// ==========================================
function getSupplierTransactions(limit) {
  try {
    const ss = getWorkbook(WORKBOOKS.SUPPLIER_TXNS);
    const sheet = ss.getSheetByName('Supplier_Transactions');
    if (!sheet) return [];

    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) return [];

    const list = [];
    const max = limit || 100;
    for (let i = data.length - 1; i >= 1 && list.length < max; i--) {
      const r = data[i];
      if (!r[0]) continue;
      list.push({
        id: String(r[0]),
        timestamp: r[1] ? new Date(r[1]).toISOString() : '',
        supplierCode: String(r[2]),
        supplierName: String(r[3]),
        itemCode: String(r[4]),
        itemName: String(r[5]),
        category: String(r[6]),
        quantity: Number(r[7]) || 0,
        unit: String(r[8]),
        rate: Number(r[9]) || 0,
        taxPercent: Number(r[10]) || 0,
        totalAmount: Number(r[11]) || 0,
        storeCode: String(r[12]),
        storeName: String(r[13]),
        reference: String(r[14] || ''),
        performedBy: String(r[15] || ''),
        notes: String(r[16] || '')
      });
    }
    return list;
  } catch (e) {
    return [];
  }
}

function getIssuanceTransactions(limit) {
  try {
    const ss = getWorkbook(WORKBOOKS.ISSUANCE_TXNS);
    const sheet = ss.getSheetByName('Issuance_Transactions');
    if (!sheet) return [];

    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) return [];

    const list = [];
    const max = limit || 100;
    for (let i = data.length - 1; i >= 1 && list.length < max; i--) {
      const r = data[i];
      if (!r[0]) continue;
      list.push({
        id: String(r[0]),
        timestamp: r[1] ? new Date(r[1]).toISOString() : '',
        type: String(r[2]),
        itemCode: String(r[3]),
        itemName: String(r[4]),
        sku: String(r[3]),
        quantity: Number(r[5]) || 0,
        unit: String(r[6]),
        fromStoreCode: String(r[7]),
        sourceLocation: String(r[8] || r[7]),
        toSellingPointCode: String(r[9]),
        destLocation: String(r[10] || r[9]),
        rate: Number(r[11]) || 0,
        unitPrice: Number(r[11]) || 0,
        totalCost: Number(r[12]) || 0,
        reference: String(r[13] || ''),
        performedBy: String(r[14] || ''),
        status: String(r[15] || 'Approved'),
        notes: String(r[16] || '')
      });
    }
    return list;
  } catch (e) {
    return [];
  }
}

function getTransactions(limit) {
  return getIssuanceTransactions(limit || 100);
}

/**
 * Server endpoint to fetch comprehensive transactions for reporting
 */
function fetchFullReportsData() {
  const supTxns = getSupplierTransactions(2000);
  const issTxns = getIssuanceTransactions(2000);
  return {
    success: true,
    supplierTransactions: supTxns,
    issuanceTransactions: issTxns
  };
}

/**
 * 3. BATCH PURCHASE INVOICE ENTRY
 * Records multi-line item purchase invoice with InvN_ prefix, updates product master stock & appends to Supplier_Transactions
 */
function processPurchaseInvoice(invoiceData) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
  } catch (e) {
    throw new Error('Server busy with concurrent transaction. Please retry.');
  }

  try {
    const prodWb = getWorkbook(WORKBOOKS.PRODUCT_MASTER);
    const prodSheet = prodWb.getSheetByName('Product_Master');
    const supTxnWb = getWorkbook(WORKBOOKS.SUPPLIER_TXNS);
    const supTxnSheet = supTxnWb.getSheetByName('Supplier_Transactions');

    const invoiceNo = String(invoiceData.invoiceNo || ('InvN_' + Utilities.formatDate(new Date(), 'Asia/Kolkata', 'yyyyMMdd_HHmmss'))).trim();
    const invoiceDate = invoiceData.date || Utilities.formatDate(new Date(), 'Asia/Kolkata', 'yyyy-MM-dd');
    const supplierName = String(invoiceData.supplierName || 'Direct / Local Supplier');
    const supplierCode = String(invoiceData.supplierCode || 'SUP_GEN');
    const storeCode = String(invoiceData.storeCode || 'S_000').toUpperCase();
    const storeName = invoiceData.storeName || (storeCode === 'S_001' ? 'Store 1 (Main Branch)' : storeCode === 'S_002' ? 'Store 2 (Outlet Branch)' : 'Central Depot Warehouse');
    const notes = invoiceData.notes || '';
    const performedBy = invoiceData.performedBy || 'Store Manager';
    const items = invoiceData.items || [];

    if (!items || items.length === 0) {
      throw new Error('Invoice must contain at least one item.');
    }

    const prodData = prodSheet.getDataRange().getValues();
    const nowIso = new Date().toISOString();
    const rowsToAppend = [];
    let grandTotal = 0;

    for (let j = 0; j < items.length; j++) {
      const itm = items[j];
      const itemCode = String(itm.itemCode || itm.sku).trim().toUpperCase();
      const qty = Math.abs(Number(itm.quantity));
      if (isNaN(qty) || qty <= 0) continue;

      let targetRow = -1;
      let itemRow = null;

      for (let i = 1; i < prodData.length; i++) {
        if (String(prodData[i][0]).toUpperCase() === itemCode) {
          targetRow = i + 1;
          itemRow = prodData[i];
          break;
        }
      }

      if (targetRow === -1 || !itemRow) {
        throw new Error('Product not found for Item Code: ' + itemCode);
      }

      const itemDesc = String(itemRow[1]);
      const itemStatus = String(itemRow[14] || 'Active').trim().toLowerCase();
      if (itemStatus === 'discontinued') {
        throw new Error(`Purchase not allowed! Item "${itemDesc}" (${itemCode}) has been discontinued.`);
      }
      const category = String(itemRow[2]);
      const uom = String(itemRow[4] || 'Pcs');
      let rate = Number(itm.rate) || Number(itemRow[5]) || 0;
      let taxPct = Number(itm.taxPercent) !== undefined && !isNaN(Number(itm.taxPercent)) ? Number(itm.taxPercent) : (Number(itemRow[6]) || 0);
      const minStock = Number(itemRow[7]) || 0;
      let stockS001 = Number(itemRow[8]) || 0;
      let stockS002 = Number(itemRow[9]) || 0;
      let centralStock = Number(itemRow[10]) || 0;

      if (storeCode.includes('S_001') || storeCode.includes('STORE 1')) {
        stockS001 += qty;
      } else if (storeCode.includes('S_002') || storeCode.includes('STORE 2')) {
        stockS002 += qty;
      } else {
        centralStock += qty;
      }

      const totalStock = stockS001 + stockS002 + centralStock;
      const totalVal = totalStock * rate;
      const lineSubtotal = qty * rate;
      const lineTax = (lineSubtotal * taxPct) / 100;
      const lineTotal = lineSubtotal + lineTax;
      grandTotal += lineTotal;

      // Update in memory prodData array
      itemRow[5] = rate;
      itemRow[6] = taxPct;
      itemRow[8] = stockS001;
      itemRow[9] = stockS002;
      itemRow[10] = centralStock;
      itemRow[11] = totalStock;
      itemRow[12] = totalVal;

      // Write updated product row
      prodSheet.getRange(targetRow, 6, 1, 8).setValues([[
        rate,
        taxPct,
        minStock,
        stockS001,
        stockS002,
        centralStock,
        totalStock,
        totalVal
      ]]);
      prodSheet.getRange(targetRow, 16).setValue(nowIso);

      // Prepare row for Supplier_Transactions
      const txnId = 'TXN_PUR_' + invoiceNo.replace(/[^a-zA-Z0-9_]/g, '') + '_' + (j + 1);
      rowsToAppend.push([
        txnId,
        nowIso,
        supplierCode,
        supplierName,
        itemCode,
        itemDesc,
        category,
        qty,
        uom,
        rate,
        taxPct,
        lineTotal,
        storeCode,
        storeName,
        invoiceNo,
        performedBy,
        notes
      ]);
    }

    // Append rows to Supplier_Transactions
    for (let r = 0; r < rowsToAppend.length; r++) {
      supTxnSheet.appendRow(rowsToAppend[r]);
    }

    return {
      success: true,
      invoiceNo: invoiceNo,
      date: invoiceDate,
      itemsCount: rowsToAppend.length,
      payableAmount: grandTotal,
      message: `Invoice ${invoiceNo} recorded successfully with ${rowsToAppend.length} items.`
    };
  } finally {
    lock.releaseLock();
  }
}

/**
 * 4. BATCH STOCK TRANSFER INVOICE ENTRY
 * Records multi-line item transfer invoice to selling point / store branch
 */
function processTransferInvoice(transferData) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
  } catch (e) {
    throw new Error('Server busy with concurrent transaction. Please retry.');
  }

  try {
    const prodWb = getWorkbook(WORKBOOKS.PRODUCT_MASTER);
    const prodSheet = prodWb.getSheetByName('Product_Master');
    const issueWb = getWorkbook(WORKBOOKS.ISSUANCE_TXNS);
    const issueSheet = issueWb.getSheetByName('Issuance_Transactions');

    const invoiceNo = String(transferData.invoiceNo || ('InvN_TRF_' + Utilities.formatDate(new Date(), 'Asia/Kolkata', 'yyyyMMdd_HHmmss'))).trim();
    const transferDate = transferData.date || Utilities.formatDate(new Date(), 'Asia/Kolkata', 'yyyy-MM-dd');
    const fromStoreCode = String(transferData.fromStoreCode || 'S_000').toUpperCase();
    const fromStoreName = transferData.fromStoreName || (fromStoreCode === 'S_001' ? 'Store 1 (Main Branch)' : fromStoreCode === 'S_002' ? 'Store 2 (Outlet Branch)' : 'Central Depot Warehouse');
    const toSellingPointCode = String(transferData.toSellingPointCode || transferData.sellingPoint || 'SP_001');
    const toSellingPointName = transferData.toSellingPointName || transferData.sellingPointName || 'Selling Point';
    const notes = transferData.notes || '';
    const performedBy = transferData.performedBy || 'Store Keeper';
    const items = transferData.items || [];

    if (!items || items.length === 0) {
      throw new Error('Transfer invoice must contain at least one item.');
    }

    const prodData = prodSheet.getDataRange().getValues();
    const nowIso = new Date().toISOString();
    const rowsToAppend = [];
    let grandTotal = 0;

    for (let j = 0; j < items.length; j++) {
      const itm = items[j];
      const itemCode = String(itm.itemCode || itm.sku).trim().toUpperCase();
      const qty = Math.abs(Number(itm.quantity));
      if (isNaN(qty) || qty <= 0) continue;

      let targetRow = -1;
      let itemRow = null;

      for (let i = 1; i < prodData.length; i++) {
        if (String(prodData[i][0]).toUpperCase() === itemCode) {
          targetRow = i + 1;
          itemRow = prodData[i];
          break;
        }
      }

      if (targetRow === -1 || !itemRow) {
        throw new Error('Product not found for Item Code: ' + itemCode);
      }

      const itemDesc = String(itemRow[1]);
      const uom = String(itemRow[4] || 'Pcs');
      const rate = Number(itm.rate) || Number(itemRow[5]) || 0;
      let stockS001 = Number(itemRow[8]) || 0;
      let stockS002 = Number(itemRow[9]) || 0;
      let centralStock = Number(itemRow[10]) || 0;

      // Deduct from source store
      if (fromStoreCode.includes('S_001') || fromStoreCode.includes('STORE 1')) {
        if (stockS001 < qty) throw new Error(`Insufficient stock in Store 1 for ${itemDesc} (${itemCode}). Available: ${stockS001}, Required: ${qty}`);
        stockS001 -= qty;
      } else if (fromStoreCode.includes('S_002') || fromStoreCode.includes('STORE 2')) {
        if (stockS002 < qty) throw new Error(`Insufficient stock in Store 2 for ${itemDesc} (${itemCode}). Available: ${stockS002}, Required: ${qty}`);
        stockS002 -= qty;
      } else {
        if (centralStock < qty) throw new Error(`Insufficient stock in Central Depot for ${itemDesc} (${itemCode}). Available: ${centralStock}, Required: ${qty}`);
        centralStock -= qty;
      }

      // If destination selling point is another store branch (e.g. S_001 or S_002), add to destination
      const destCode = toSellingPointCode.toUpperCase();
      if (destCode.includes('S_001') || destCode.includes('STORE 1')) {
        stockS001 += qty;
      } else if (destCode.includes('S_002') || destCode.includes('STORE 2')) {
        stockS002 += qty;
      } else if (destCode.includes('S_000') || destCode.includes('CENTRAL')) {
        centralStock += qty;
      }

      const totalStock = stockS001 + stockS002 + centralStock;
      const totalVal = totalStock * rate;
      const lineTotal = qty * rate;
      grandTotal += lineTotal;

      // Update in memory prodData array
      itemRow[8] = stockS001;
      itemRow[9] = stockS002;
      itemRow[10] = centralStock;
      itemRow[11] = totalStock;
      itemRow[12] = totalVal;

      // Write updated product row
      prodSheet.getRange(targetRow, 9, 1, 5).setValues([[
        stockS001,
        stockS002,
        centralStock,
        totalStock,
        totalVal
      ]]);
      prodSheet.getRange(targetRow, 16).setValue(nowIso);

      // Prepare row for Issuance_Transactions
      const txnId = 'TXN_TRF_' + invoiceNo.replace(/[^a-zA-Z0-9_]/g, '') + '_' + (j + 1);
      rowsToAppend.push([
        txnId,
        nowIso,
        'TRANSFER',
        itemCode,
        itemDesc,
        qty,
        uom,
        fromStoreCode,
        fromStoreName,
        toSellingPointCode,
        toSellingPointName,
        rate,
        lineTotal,
        invoiceNo,
        performedBy,
        'Completed',
        notes
      ]);
    }

    // Append rows to Issuance_Transactions
    for (let r = 0; r < rowsToAppend.length; r++) {
      issueSheet.appendRow(rowsToAppend[r]);
    }

    return {
      success: true,
      invoiceNo: invoiceNo,
      date: transferDate,
      itemsCount: rowsToAppend.length,
      payableAmount: grandTotal,
      message: `Transfer invoice ${invoiceNo} recorded successfully with ${rowsToAppend.length} items.`
    };
  } finally {
    lock.releaseLock();
  }
}
