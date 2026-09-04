/**
 * Zolexora IMS - Pure Sheet-Driven Product Master & Metrics
 * All calculations and listings are read 100% strictly from Google Sheets
 */

function getItemsInternal(ss) {
  const sheet = ss.getSheetByName('Product_Master') || ss.getSheets()[0];
  if (!sheet) return [];

  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];

  const headers = data[0].map(h => String(h).trim().toLowerCase());
  const codeIdx = headers.findIndex(h => h.includes('item code') || h.includes('code') || h.includes('sku'));
  const descIdx = headers.findIndex(h => h.includes('description') || h.includes('name') || h.includes('item'));
  const catIdx = headers.findIndex(h => h === 'category' || (h.includes('category') && !h.includes('code')));
  const catCodeIdx = headers.findIndex(h => h.includes('category code'));
  const uomIdx = headers.findIndex(h => h.includes('uom') || h.includes('unit'));
  const rateIdx = headers.findIndex(h => h.includes('rate') || h.includes('price') || h.includes('cost'));
  const taxIdx = headers.findIndex(h => h.includes('tax'));
  const minIdx = headers.findIndex(h => h.includes('min'));
  const s001Idx = headers.findIndex(h => h.includes('s_001') || h.includes('store 1') || h.includes('branch 1'));
  const s002Idx = headers.findIndex(h => h.includes('s_002') || h.includes('store 2') || h.includes('branch 2'));
  const centralIdx = headers.findIndex(h => h.includes('central') || h.includes('depot'));
  const totalStockIdx = headers.findIndex(h => h.includes('total stock') || h.includes('current stock') || h.includes('stock'));
  const supIdx = headers.findIndex(h => h.includes('supplier'));
  const statusIdx = headers.findIndex(h => h.includes('status'));

  const items = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const code = codeIdx !== -1 ? String(row[codeIdx] || '').trim() : String(row[0] || '').trim();
    const desc = descIdx !== -1 ? String(row[descIdx] || '').trim() : String(row[1] || '').trim();
    if (!code && !desc) continue;

    const rate = rateIdx !== -1 ? Number(row[rateIdx]) || 0 : 0;
    const tax = taxIdx !== -1 ? Number(row[taxIdx]) || 0 : 0;
    const minStock = minIdx !== -1 ? Number(row[minIdx]) || 0 : 0;
    const stockS001 = s001Idx !== -1 ? Number(row[s001Idx]) || 0 : 0;
    const stockS002 = s002Idx !== -1 ? Number(row[s002Idx]) || 0 : 0;
    const centralStock = centralIdx !== -1 ? Number(row[centralIdx]) || 0 : 0;

    let totalStock = 0;
    if (s001Idx !== -1 || s002Idx !== -1 || centralIdx !== -1) {
      totalStock = stockS001 + stockS002 + centralStock;
    } else if (totalStockIdx !== -1) {
      totalStock = Number(row[totalStockIdx]) || 0;
    }

    const totalValue = totalStock * rate;

    items.push({
      id: code,
      code: code,
      sku: code,
      name: desc,
      description: desc,
      category: catIdx !== -1 ? String(row[catIdx] || 'General') : 'General',
      categoryCode: catCodeIdx !== -1 ? String(row[catCodeIdx] || '') : '',
      unit: uomIdx !== -1 ? String(row[uomIdx] || 'Pcs') : 'Pcs',
      uom: uomIdx !== -1 ? String(row[uomIdx] || 'Pcs') : 'Pcs',
      rate: rate,
      unitCost: rate,
      taxPercent: tax,
      minStock: minStock,
      stockS001: stockS001,
      stockS002: stockS002,
      centralStock: centralStock,
      totalStock: totalStock,
      totalValue: totalValue,
      supplierCode: supIdx !== -1 ? String(row[supIdx] || '') : '',
      supplier: supIdx !== -1 ? String(row[supIdx] || '') : '',
      status: statusIdx !== -1 ? String(row[statusIdx] || 'Active') : 'Active'
    });
  }
  return items;
}

function getItems() {
  const ss = getWorkbook(WORKBOOKS.PRODUCT_MASTER);
  return getItemsInternal(ss);
}

function saveItem(itemData) {
  const ss = getWorkbook(WORKBOOKS.PRODUCT_MASTER);
  const sheet = ss.getSheetByName('Product_Master') || ss.getSheets()[0];
  if (!sheet) throw new Error('Product_Master sheet missing');

  const data = sheet.getDataRange().getValues();
  let itemCode = itemData.code || itemData.sku || itemData.id ? String(itemData.code || itemData.sku || itemData.id).trim().toUpperCase() : '';
  const prodName = String(itemData.name || itemData.description || '').trim();
  if (!prodName) throw new Error('Product Name is required.');

  let targetRow = -1;
  if (itemCode && data.length > 1) {
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][0]).toUpperCase() === itemCode) {
        targetRow = i + 1;
        break;
      }
    }
  }

  // Duplicate product name validation (case-insensitive)
  const lowerName = prodName.toLowerCase();
  for (let i = 1; i < data.length; i++) {
    if (i + 1 !== targetRow) {
      if (String(data[i][1]).trim().toLowerCase() === lowerName) {
        throw new Error(`Product name "${prodName}" already exists! Duplicate product names are not allowed.`);
      }
    }
  }

  const category = String(itemData.category || 'General').trim();
  let categoryCode = itemData.categoryCode ? String(itemData.categoryCode).trim().toUpperCase() : '';
  if (!categoryCode) {
    categoryCode = 'CAT_' + category.replace(/[^a-zA-Z0-9]/g, '').slice(0, 4).toUpperCase();
  }

  const nowIso = new Date().toISOString();

  if (targetRow > 1) {
    // EDITING EXISTING ITEM:
    // Price edition is restricted completely! Preserve existing rate, tax, stock, and uom from sheet.
    const existingRow = data[targetRow - 1];
    const preservedUom = existingRow[4] || itemData.unit || itemData.uom || 'Pcs';
    const preservedRate = Number(existingRow[5]) || 0; // Price locked completely!
    const preservedTax = Number(existingRow[6]) || 0;
    const minStock = Number(existingRow[7]) || 0;
    const stockS001 = Number(existingRow[8]) || 0;
    const stockS002 = Number(existingRow[9]) || 0;
    const centralStock = Number(existingRow[10]) || 0;
    const totalStock = stockS001 + stockS002 + centralStock;
    const totalVal = totalStock * preservedRate;
    const supplier = existingRow[13] || '';
    const status = itemData.status || existingRow[14] || 'Active';

    sheet.getRange(targetRow, 1, 1, 16).setValues([[
      itemCode,
      prodName, // ONLY Name & Category are changed!
      category,
      categoryCode,
      preservedUom,
      preservedRate, // Restricted completely!
      preservedTax,
      minStock,
      stockS001,
      stockS002,
      centralStock,
      totalStock,
      totalVal,
      supplier,
      status,
      nowIso
    ]]);

    const items = getItemsInternal(ss);
    return { success: true, itemCode: itemCode, mode: 'updated', status: status, items: items };
  } else {
    // ADDING NEW ITEM:
    if (!itemCode) {
      const catPrefix = categoryCode.replace(/^CAT_/, '').slice(0, 3) || 'GEN';
      itemCode = 'PRD_' + catPrefix + '_' + String(data.length).padStart(3, '0');
    }

    // Check duplicate item code
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][0]).trim().toUpperCase() === itemCode) {
        throw new Error(`Item Code "${itemCode}" already exists! Duplicates are not allowed.`);
      }
    }

    const rate = Number(itemData.rate || itemData.unitCost) || 0;
    const tax = Number(itemData.taxPercent) || 0;
    const minStock = Number(itemData.minStock) || 0;
    const stockS001 = Number(itemData.stockS001) || 0;
    const stockS002 = Number(itemData.stockS002) || 0;
    const centralStock = Number(itemData.centralStock) || 0;
    const totalStock = stockS001 + stockS002 + centralStock;
    const totalVal = totalStock * rate;
    const uom = String(itemData.unit || itemData.uom || 'Pcs').trim();
    const status = itemData.status || 'Active';

    sheet.appendRow([
      itemCode,
      prodName,
      category,
      categoryCode,
      uom,
      rate,
      tax,
      minStock,
      stockS001,
      stockS002,
      centralStock,
      totalStock,
      totalVal,
      itemData.supplierCode || itemData.supplier || '',
      status,
      nowIso
    ]);

    const items = getItemsInternal(ss);
    return { success: true, itemCode: itemCode, mode: 'created', status: status, items: items };
  }
}

function setItemStatus(itemCode, newStatus) {
  const ss = getWorkbook(WORKBOOKS.PRODUCT_MASTER);
  const sheet = ss.getSheetByName('Product_Master') || ss.getSheets()[0];
  if (!sheet) throw new Error('Product_Master sheet missing');

  const data = sheet.getDataRange().getValues();
  const code = String(itemCode).trim().toUpperCase();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]).trim().toUpperCase() === code) {
      sheet.getRange(i + 1, 15).setValue(newStatus);
      sheet.getRange(i + 1, 16).setValue(new Date().toISOString());
      const items = getItemsInternal(ss);
      return { success: true, itemCode: code, status: newStatus, items: items };
    }
  }
  throw new Error('Item not found: ' + itemCode);
}

function deleteItem(itemCode) {
  const ss = getWorkbook(WORKBOOKS.PRODUCT_MASTER);
  const sheet = ss.getSheetByName('Product_Master') || ss.getSheets()[0];
  if (!sheet) throw new Error('Product_Master sheet missing');

  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]).toUpperCase() === String(itemCode).toUpperCase()) {
      sheet.deleteRow(i + 1);
      const items = getItemsInternal(ss);
      return { success: true, items: items };
    }
  }
  return { success: false, error: 'Item not found in sheet' };
}

function calculateDashboardMetrics(items, supplierTxns, issuanceTxns, storesList) {
  let totalValuation = 0;
  let totalUnits = 0;
  let totalSkus = items.length;
  let lowStockCount = 0;
  let outOfStockCount = 0;

  const categoryMap = {};
  const lowStockItems = [];

  // Initialize store units and valuation purely from the registered stores
  const storeMetrics = {};
  (storesList || []).forEach(st => {
    storeMetrics[st.code] = {
      code: st.code,
      name: st.name,
      units: 0,
      valuation: 0
    };
  });

  items.forEach(item => {
    const total = Number(item.totalStock) || 0;
    const min = Number(item.minStock) || 0;
    const rate = Number(item.rate) || 0;
    const itemVal = total * rate;

    totalUnits += total;
    totalValuation += itemVal;

    // Distribute to registered stores if matching codes exist
    if (storeMetrics['S_001'] && item.stockS001) {
      storeMetrics['S_001'].units += item.stockS001;
      storeMetrics['S_001'].valuation += item.stockS001 * rate;
    }
    if (storeMetrics['S_002'] && item.stockS002) {
      storeMetrics['S_002'].units += item.stockS002;
      storeMetrics['S_002'].valuation += item.stockS002 * rate;
    }
    if (storeMetrics['S_000'] && item.centralStock) {
      storeMetrics['S_000'].units += item.centralStock;
      storeMetrics['S_000'].valuation += item.centralStock * rate;
    }

    if (total === 0) {
      outOfStockCount++;
      lowStockItems.push(item);
    } else if (total <= min) {
      lowStockCount++;
      lowStockItems.push(item);
    }

    const cat = item.category || 'General';
    if (!categoryMap[cat]) {
      categoryMap[cat] = { count: 0, units: 0, value: 0 };
    }
    categoryMap[cat].count += 1;
    categoryMap[cat].units += total;
    categoryMap[cat].value += itemVal;
  });

  const todayStr = new Date().toISOString().slice(0, 10);
  let todayPurchases = 0;
  let todayPurchasesVal = 0;
  let todayIssues = 0;
  let todayIssuesVal = 0;

  supplierTxns.forEach(t => {
    if (t.timestamp && t.timestamp.startsWith(todayStr)) {
      todayPurchases += Number(t.quantity) || 0;
      todayPurchasesVal += Number(t.totalAmount) || 0;
    }
  });

  issuanceTxns.forEach(t => {
    if (t.timestamp && t.timestamp.startsWith(todayStr)) {
      todayIssues += Number(t.quantity) || 0;
      todayIssuesVal += Number(t.totalValue) || 0;
    }
  });

  return {
    totalSkus: totalSkus,
    totalValuation: Math.round(totalValuation),
    totalUnits: totalUnits,
    lowStockCount: lowStockCount,
    outOfStockCount: outOfStockCount,
    stores: storeMetrics,
    categoryBreakdown: categoryMap,
    lowStockItems: lowStockItems.slice(0, 15),
    todaySummary: {
      txnCount: supplierTxns.length + issuanceTxns.length,
      stockIn: todayPurchases,
      stockInValue: todayPurchasesVal,
      stockOut: todayIssues,
      stockOutValue: todayIssuesVal
    }
  };
}

function getInitialData() {
  const activeOrg = getActiveOrganization();
  const orgList = listOrganizations();

  // If no active organization has been selected or created, return onboarding state
  if (!activeOrg) {
    return {
      success: true,
      hasOrganization: false,
      activeOrganization: null,
      organizations: orgList,
      workbooksInfo: {
        rootFolder: { id: DEFAULT_DRIVE_FOLDER_ID, name: 'Zolexora IMS Database', url: 'https://drive.google.com/drive/folders/' + DEFAULT_DRIVE_FOLDER_ID },
        folder: { id: DEFAULT_DRIVE_FOLDER_ID, name: 'Zolexora IMS Database', url: 'https://drive.google.com/drive/folders/' + DEFAULT_DRIVE_FOLDER_ID },
        workbooks: []
      },
      metrics: {},
      items: [],
      suppliers: [],
      stores: [],
      sellingPoints: [],
      users: [],
      settings: { HOTEL_NAME: 'Zolexora IMS', CURRENCY_SYMBOL: '₹' },
      supplierTransactions: [],
      issuanceTransactions: [],
      recentTransactions: [],
      sellingPointTransactions: { sales: [], purchases: [], expenses: [] }
    };
  }

  // Current active organization
  const currentOrg = activeOrg;

  const workbooksInfo = getWorkbooksInfo();
  const prodWb = getWorkbook(WORKBOOKS.PRODUCT_MASTER);
  const items = getItemsInternal(prodWb);
  const suppliers = getSuppliers();
  const stores = getStores();
  const sellingPoints = getSellingPoints();
  const users = getUsers();
  const settings = getSettings();
  const supplierTxns = getSupplierTransactions(50);
  const issuanceTxns = getIssuanceTransactions(50);
  const metrics = calculateDashboardMetrics(items, supplierTxns, issuanceTxns, stores);
  const sellingPointTxns = getSellingPointTransactions(100);

  return {
    success: true,
    hasOrganization: true,
    activeOrganization: currentOrg,
    organizations: orgList,
    workbooksInfo: workbooksInfo,
    metrics: metrics,
    items: items,
    suppliers: suppliers,
    stores: stores,
    sellingPoints: sellingPoints,
    users: users,
    settings: settings,
    supplierTransactions: supplierTxns,
    issuanceTransactions: issuanceTxns,
    recentTransactions: issuanceTxns,
    sellingPointTransactions: sellingPointTxns
  };
}

/**
 * Server entry point to switch active organization
 */
function switchOrganization(orgId) {
  let email = '';
  try {
    email = Session.getActiveUser().getEmail();
  } catch (e) {}

  if (email) {
    const user = findUserByEmail(email);
    if (user && user.role !== 'SuperAdmin' && user.orgId !== orgId) {
      throw new Error('Access Denied: You do not have permission to access another organization.');
    }
  }

  setActiveOrganization(orgId);
  return getInitialData();
}

/**
 * Server entry point to create and provision a new organization
 */
function createNewOrganization(orgData) {
  provisionOrganization(orgData);
  return getInitialData();
}

/**
 * Server entry point for User Sign In
 */
function loginUser(credentials) {
  const authRes = authenticateUser(credentials.email, credentials.password);
  if (!authRes.success) return authRes;

  const data = getInitialData();
  return {
    success: true,
    user: authRes.user,
    data: data
  };
}

/**
 * Server entry point for User Registration & Tenant Provisioning
 */
function registerUser(regData) {
  const regRes = createAccountAndProvision(regData);
  if (!regRes.success) return regRes;

  const data = getInitialData();
  return {
    success: true,
    user: regRes.user,
    data: data,
    message: regRes.message
  };
}

/**
 * Server entry point to validate session on page refresh
 */
function checkUserSession(email, orgId) {
  const sessRes = validateUserSession(email, orgId);
  if (!sessRes.success) return sessRes;

  const data = getInitialData();
  return {
    success: true,
    user: sessRes.user,
    data: data
  };
}

/**
 * Server entry point for Google Authentication & Org Provisioning
 */
function processGoogleAuth(orgDetails) {
  return handleGoogleAuth(orgDetails);
}

/**
 * Server entry point to get current Google user identity
 */
function getGoogleAccountInfo() {
  return getGoogleUserIdentity();
}

/**
 * Server entry point to record multi-item purchase invoice
 */
function recordPurchaseInvoice(invoiceData) {
  const res = processPurchaseInvoice(invoiceData);
  const prodWb = getWorkbook(WORKBOOKS.PRODUCT_MASTER);
  const items = getItemsInternal(prodWb);
  const supTxns = getSupplierTransactions(50);
  const stores = getStores();
  const issuanceTxns = getIssuanceTransactions(50);
  const metrics = calculateDashboardMetrics(items, supTxns, issuanceTxns, stores);
  return {
    success: true,
    invoiceNo: res.invoiceNo,
    date: res.date,
    itemsCount: res.itemsCount,
    payableAmount: res.payableAmount,
    items: items,
    supplierTransactions: supTxns,
    metrics: metrics,
    message: res.message
  };
}

/**
 * Server entry point to record multi-item stock transfer invoice
 */
function recordTransferInvoice(transferData) {
  const res = processTransferInvoice(transferData);
  const prodWb = getWorkbook(WORKBOOKS.PRODUCT_MASTER);
  const items = getItemsInternal(prodWb);
  const supTxns = getSupplierTransactions(50);
  const stores = getStores();
  const issuanceTxns = getIssuanceTransactions(50);
  const metrics = calculateDashboardMetrics(items, supTxns, issuanceTxns, stores);
  return {
    success: true,
    invoiceNo: res.invoiceNo,
    date: res.date,
    itemsCount: res.itemsCount,
    payableAmount: res.payableAmount,
    items: items,
    issuanceTransactions: issuanceTxns,
    metrics: metrics,
    message: res.message
  };
}

/**
 * Server entry point to toggle item active/discontinued status
 */
function updateItemStatus(itemCode, newStatus) {
  const res = setItemStatus(itemCode, newStatus);
  return {
    success: true,
    itemCode: res.itemCode,
    status: res.status,
    items: res.items,
    message: `Item ${res.itemCode} is now marked as ${res.status}.`
  };
}
