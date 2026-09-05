/**
 * Zolexora IMS — Cloudflare Worker Reverse Proxy & Native D1 Database Engine
 * 
 * Custom Domain: ims.zolexora.com
 * D1 Database Binding: env.DB (zolexora-ims-1-db)
 * KV Session Binding: env.SESSION_KV
 */

const DEFAULT_GAS_EXEC_URL = 'https://script.google.com/macros/s/AKfycbyQpkaxpQrmcDyFtROLp4PNRGVxTFpBzg7KkNBiqPOxSOtxijB8VUarYIpTuprSB7f3/exec';
const DEFAULT_SESSION_TTL_SECONDS = 604800; // 7 days
const COOKIE_NAME = 'zolexora_session';
const SALT = '_zolexora_salt_2026';

import { APP_HTML } from './ui.js';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // 1. CORS Preflight
    if (request.method === 'OPTIONS') {
      return handleCorsPreflight(request);
    }

    // 2. Health check endpoints
    if (url.pathname === '/api/health' || url.pathname === '/api/d1/health') {
      return handleD1Health(request, env);
    }

    // 3. Edge Session Store endpoints
    if (url.pathname === '/api/session' || url.pathname.startsWith('/api/session/')) {
      return handleSessionApi(request, env, url);
    }

    // 4. Standalone Dedicated Dashboard Web Pages & Application Entry
    if (url.pathname === '/inv-dashboard' || url.pathname === '/inventory-dashboard' || url.pathname === '/inventory' ||
        url.pathname === '/pos-dashboard' || url.pathname === '/pos' ||
        url.pathname === '/login' || url.pathname === '/signin') {
      return htmlResponse(APP_HTML);
    }

    // 5. Universal RPC Bridge for D1 Database (/api/rpc/:functionName)
    if (url.pathname.startsWith('/api/rpc/')) {
      const functionName = url.pathname.replace('/api/rpc/', '').trim();
      return handleD1Rpc(request, env, functionName);
    }

    // 6. Direct REST APIs for D1 Database (/api/inv-dashboard, /api/pos-dashboard, etc.)
    if (url.pathname.startsWith('/api/')) {
      const restResponse = await handleRestApi(request, env, url);
      if (restResponse) return restResponse;
      return jsonResponse({ success: false, error: `API endpoint '${url.pathname}' not found on edge database` }, 404, request);
    }

    // 7. Direct Edge-Hosted UI (Eliminates Google Login redirect completely)
    if (url.pathname === '/' || url.pathname === '/index.html' || !url.pathname.startsWith('/api/')) {
      return htmlResponse(APP_HTML);
    }

    // 8. Fallback
    return htmlResponse(APP_HTML);
  }
};

// =====================================================================
// D1 DATABASE HEALTH CHECK
// =====================================================================
async function handleD1Health(request, env) {
  if (!env.DB) {
    return jsonResponse({
      status: 'error',
      message: 'Cloudflare D1 binding (env.DB) is not configured in wrangler.toml'
    }, 500, request);
  }

  try {
    const start = Date.now();
    const tablesRes = await env.DB.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_cf_%';"
    ).all();
    const latency = Date.now() - start;

    const tableNames = (tablesRes.results || []).map(r => r.name);
    
    // Quick row counts
    const counts = {};
    for (const tbl of tableNames) {
      const countRes = await env.DB.prepare(`SELECT count(*) as count FROM ${tbl};`).first();
      counts[tbl] = countRes?.count ?? 0;
    }

    return jsonResponse({
      status: 'healthy',
      database: 'zolexora-ims-1-db',
      engine: 'Cloudflare D1 (Serverless SQLite)',
      edgeLocation: request.cf?.colo || 'UNKNOWN',
      queryLatencyMs: latency,
      tablesCount: tableNames.length,
      tables: counts,
      timestamp: new Date().toISOString()
    }, 200, request);
  } catch (err) {
    return jsonResponse({
      status: 'error',
      message: err.message,
      stack: err.stack
    }, 500, request);
  }
}

// =====================================================================
// UNIVERSAL RPC BRIDGE (/api/rpc/:functionName)
// Maps any frontend google.script.run call to Cloudflare D1
// =====================================================================
async function handleD1Rpc(request, env, functionName) {
  if (request.method !== 'POST') {
    return jsonResponse({ error: 'RPC endpoints require POST requests' }, 405, request);
  }

  let body = {};
  try {
    body = await request.json();
  } catch (e) {
    body = {};
  }

  const args = Array.isArray(body.args) ? body.args : (body ? [body] : []);
  const db = env.DB;

  if (!db) {
    return jsonResponse({ success: false, error: 'Database binding env.DB not available.' }, 500, request);
  }

  try {
    let result;
    switch (functionName) {
      case 'getInitialData':
        result = await getInitialData(db);
        break;

      case 'getInventoryDashboardData':
        result = await getInventoryDashboardData(db);
        break;

      case 'getPosDashboardData':
        result = await getPosDashboardData(db);
        break;

      case 'loginUser':
      case 'authenticateUser':
        result = await loginUser(db, env, args[0]);
        break;

      case 'checkUserSession':
      case 'validateUserSession':
        result = await checkUserSession(db, args[0], args[1]);
        break;

      case 'logoutUser':
        result = { success: true, message: 'Logged out' };
        break;

      case 'getItems':
        result = await getProducts(db);
        break;

      case 'saveItem':
        result = await saveProduct(db, args[0]);
        break;

      case 'setItemStatus':
      case 'updateItemStatus':
        result = await setProductStatus(db, args[0], args[1]);
        break;

      case 'deleteItem':
        result = await deleteProduct(db, args[0]);
        break;

      case 'getSuppliers':
        result = await getSuppliers(db);
        break;

      case 'saveSupplier':
        result = await saveSupplier(db, args[0]);
        break;

      case 'deleteSupplier':
        result = await deleteSupplier(db, args[0]);
        break;

      case 'getStores':
        result = await getStores(db);
        break;

      case 'saveStore':
        result = await saveStore(db, args[0]);
        break;

      case 'deleteStore':
        result = await deleteStore(db, args[0]);
        break;

      case 'getSellingPoints':
        result = await getSellingPoints(db);
        break;

      case 'saveSellingPoint':
        result = await saveSellingPoint(db, args[0]);
        break;

      case 'deleteSellingPoint':
        result = await deleteSellingPoint(db, args[0]);
        break;

      case 'getUsers':
        result = await getUsers(db);
        break;

      case 'saveUser':
        result = await saveUser(db, args[0]);
        break;

      case 'deleteUser':
        result = await deleteUser(db, args[0]);
        break;

      case 'getSellingPointTransactions':
        result = await getSellingPointTransactions(db, args[0]);
        break;

      case 'recordSellingPointSale':
        result = await recordSellingPointSale(db, args[0]);
        break;

      case 'recordSellingPointPurchase':
        result = await recordSellingPointPurchase(db, args[0]);
        break;

      case 'recordSellingPointExpense':
        result = await recordSellingPointExpense(db, args[0]);
        break;

      case 'getSupplierTransactions':
        result = await getSupplierTransactions(db, args[0]);
        break;

      case 'processSupplierPurchase':
      case 'recordPurchaseInvoice':
      case 'processPurchaseInvoice':
        result = await processSupplierPurchase(db, args[0]);
        break;

      case 'getIssuanceTransactions':
        result = await getIssuanceTransactions(db, args[0]);
        break;

      case 'processStockIssuance':
      case 'recordTransferInvoice':
      case 'processTransferInvoice':
        result = await processStockIssuance(db, args[0]);
        break;

      case 'getTransactions':
        result = await getTransactions(db, args[0]);
        break;

      case 'getSettings':
        result = await getSettings(db);
        break;

      case 'saveSettings':
        result = await saveSettings(db, args[0]);
        break;

      case 'listOrganizations':
        result = await listOrganizations(db);
        break;

      case 'switchOrganization':
        result = await switchOrganization(db, args[0]);
        break;

      case 'renameOrganization':
        result = await renameOrganization(db, args[0], args[1]);
        break;

      case 'createOrganization':
        result = await createOrganization(db, args[0]);
        break;

      default:
        // If unrecognized RPC call, return error
        return jsonResponse({
          success: false,
          error: `Unimplemented D1 RPC function: ${functionName}`
        }, 404, request);
    }

    return jsonResponse(result, 200, request);
  } catch (err) {
    return jsonResponse({
      success: false,
      error: err.message || 'Database error occurred',
      stack: err.stack
    }, 500, request);
  }
}

// =====================================================================
// REST API ROUTER
// =====================================================================
async function handleRestApi(request, env, url) {
  const db = env.DB;
  if (!db) return null;

  const path = url.pathname;
  const method = request.method;
  const isGetOrHead = method === 'GET' || method === 'HEAD';

  if (path === '/api/dashboard' && isGetOrHead) {
    return jsonResponse(await getInitialData(db), 200, request);
  }

  if (path === '/api/login' && method === 'POST') {
    const payload = await request.json().catch(() => ({}));
    const res = await loginUser(db, env, payload);
    return jsonResponse(res, res.success ? 200 : 401, request);
  }

  if (path === '/api/login' && isGetOrHead) {
    return jsonResponse({
      success: true,
      message: 'Zolexora IMS Edge Auth Service',
      loginPage: '/login'
    }, 200, request);
  }

  if (path === '/api/inv-dashboard' && isGetOrHead) {
    if (prefersHtml(request, url)) {
      return htmlResponse(APP_HTML);
    }
    return jsonResponse(await getInventoryDashboardData(db), 200, request);
  }

  if (path === '/api/pos-dashboard' && isGetOrHead) {
    if (prefersHtml(request, url)) {
      return htmlResponse(APP_HTML);
    }
    return jsonResponse(await getPosDashboardData(db), 200, request);
  }

  if (path === '/api/products' && isGetOrHead) {
    return jsonResponse({ success: true, items: await getProducts(db) }, 200, request);
  }

  if (path === '/api/products' && method === 'POST') {
    const payload = await request.json();
    return jsonResponse(await saveProduct(db, payload), 200, request);
  }

  if (path === '/api/stores' && isGetOrHead) {
    return jsonResponse({ success: true, stores: await getStores(db) }, 200, request);
  }

  if (path === '/api/selling-points' && isGetOrHead) {
    return jsonResponse({ success: true, sellingPoints: await getSellingPoints(db) }, 200, request);
  }

  if (path === '/api/suppliers' && isGetOrHead) {
    return jsonResponse({ success: true, suppliers: await getSuppliers(db) }, 200, request);
  }

  if (path === '/api/users' && isGetOrHead) {
    return jsonResponse({ success: true, users: await getUsers(db) }, 200, request);
  }

  if (path === '/api/sales' && method === 'POST') {
    const payload = await request.json();
    return jsonResponse(await recordSellingPointSale(db, payload), 200, request);
  }

  return null;
}

// =====================================================================
// D1 DATABASE OPERATIONS & QUERIES
// =====================================================================

async function getInitialData(db) {
  const [org, stores, sellingPoints, suppliers, users, settingsList, products, supTxns, issTxns, salesTxns] = await Promise.all([
    db.prepare('SELECT * FROM organizations LIMIT 1;').first(),
    db.prepare('SELECT * FROM stores ORDER BY code ASC;').all(),
    db.prepare('SELECT * FROM selling_points ORDER BY code ASC;').all(),
    db.prepare('SELECT * FROM suppliers ORDER BY code ASC;').all(),
    db.prepare('SELECT id, email, name, role, scope_type as scopeType, assigned_location as assignedLocation, location_name as locationName, status FROM users;').all(),
    db.prepare('SELECT key, value FROM settings;').all(),
    db.prepare('SELECT * FROM products ORDER BY item_code ASC;').all(),
    db.prepare('SELECT * FROM supplier_transactions ORDER BY timestamp DESC LIMIT 50;').all(),
    db.prepare('SELECT * FROM issuance_transactions ORDER BY timestamp DESC LIMIT 50;').all(),
    db.prepare('SELECT * FROM selling_point_sales ORDER BY timestamp DESC LIMIT 50;').all()
  ]);

  const settings = {};
  (settingsList.results || []).forEach(s => { settings[s.key] = s.value; });

  const items = (products.results || []).map(p => formatProductFromRow(p));
  const storesList = (stores.results || []).map(s => ({
    code: s.code,
    name: s.name,
    type: s.type || 'Store',
    status: s.status || 'Active'
  }));

  const spList = (sellingPoints.results || []).map(sp => ({
    code: sp.code,
    name: sp.name,
    storeCode: sp.assigned_store_code || 'S_001',
    type: sp.type || 'Selling Point',
    status: sp.status || 'Active'
  }));

  const suppliersList = (suppliers.results || []).map(sup => ({
    code: sup.code,
    name: sup.name,
    category: sup.category || 'General',
    contactPerson: sup.contact_person || '',
    phone: sup.phone || '',
    email: sup.email || '',
    status: sup.status || 'Active'
  }));

  const supFormatted = (supTxns.results || []).map(r => formatSupplierTxn(r));
  const issFormatted = (issTxns.results || []).map(r => formatIssuanceTxn(r));
  const allRecent = [...supFormatted, ...issFormatted].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  const metrics = calculateMetrics(items, supFormatted, issFormatted, storesList);

  return {
    success: true,
    hasOrganization: Boolean(org),
    activeOrganization: org || { id: 'ORG_ZOLEXORA_001', name: "Zolexora_1's org" },
    organizations: [org || { id: 'ORG_ZOLEXORA_001', name: "Zolexora_1's org" }],
    workbooksInfo: {
      databaseType: 'Cloudflare D1 (Serverless SQL)',
      databaseName: 'zolexora-ims-1-db',
      workbooks: []
    },
    metrics: metrics,
    items: items,
    suppliers: suppliersList,
    stores: storesList,
    sellingPoints: spList,
    users: users.results || [],
    settings: settings,
    supplierTransactions: supFormatted,
    issuanceTransactions: issFormatted,
    recentTransactions: allRecent.slice(0, 50),
    sellingPointTransactions: {
      sales: (salesTxns.results || []).map(s => formatSaleFromRow(s)),
      purchases: [],
      expenses: []
    }
  };
}

function calculateMetrics(items, supTxns, issTxns, storesList) {
  let totalValuation = 0;
  let totalUnits = 0;
  let lowStockCount = 0;
  let outOfStockCount = 0;
  const categoryMap = {};
  const lowStockItems = [];

  const storeMetrics = {};
  storesList.forEach(st => {
    storeMetrics[st.code] = { code: st.code, name: st.name, units: 0, valuation: 0 };
  });

  items.forEach(itm => {
    const units = Number(itm.totalStock) || 0;
    const rate = Number(itm.rate) || 0;
    const val = Number(itm.totalValue) || (units * rate);

    totalUnits += units;
    totalValuation += val;

    if (units <= 0) {
      outOfStockCount++;
      lowStockCount++;
      lowStockItems.push(itm);
    } else if (units <= (Number(itm.minStock) || 0)) {
      lowStockCount++;
      lowStockItems.push(itm);
    }

    const cat = itm.category || 'General';
    if (!categoryMap[cat]) categoryMap[cat] = { count: 0, units: 0, valuation: 0 };
    categoryMap[cat].count++;
    categoryMap[cat].units += units;
    categoryMap[cat].valuation += val;

    if (storeMetrics['S_001']) {
      storeMetrics['S_001'].units += (Number(itm.stockS001) || 0);
      storeMetrics['S_001'].valuation += (Number(itm.stockS001) || 0) * rate;
    }
    if (storeMetrics['S_002']) {
      storeMetrics['S_002'].units += (Number(itm.stockS002) || 0);
      storeMetrics['S_002'].valuation += (Number(itm.stockS002) || 0) * rate;
    }
    if (storeMetrics['S_000']) {
      storeMetrics['S_000'].units += (Number(itm.centralStock) || 0);
      storeMetrics['S_000'].valuation += (Number(itm.centralStock) || 0) * rate;
    }
  });

  let stockInQty = 0;
  let stockInVal = 0;
  let stockOutQty = 0;
  let stockOutVal = 0;

  supTxns.forEach(t => {
    const q = Number(t.quantity) || 0;
    const v = Number(t.totalCost != null ? t.totalCost : (t.total_amount != null ? t.total_amount : t.totalAmount)) || 0;
    stockInQty += q;
    stockInVal += v;
  });

  issTxns.forEach(t => {
    const q = Number(t.quantity) || 0;
    const v = Number(t.totalCost != null ? t.totalCost : (t.total_value != null ? t.total_value : t.totalValue)) || 0;
    stockOutQty += q;
    stockOutVal += v;
  });

  return {
    totalSkus: items.length,
    totalValuation: Math.round(totalValuation),
    totalUnits: totalUnits,
    lowStockCount: lowStockCount,
    outOfStockCount: outOfStockCount,
    stores: storeMetrics,
    categoryBreakdown: categoryMap,
    lowStockItems: lowStockItems.slice(0, 15),
    todaySummary: {
      txnCount: supTxns.length + issTxns.length,
      stockIn: stockInQty,
      stockInValue: stockInVal,
      stockOut: stockOutQty,
      stockOutValue: stockOutVal
    }
  };
}

async function getInventoryDashboardData(db) {
  const [org, stores, suppliers, products, supTxns, issTxns] = await Promise.all([
    db.prepare('SELECT * FROM organizations LIMIT 1;').first(),
    db.prepare('SELECT * FROM stores ORDER BY code ASC;').all(),
    db.prepare('SELECT * FROM suppliers ORDER BY code ASC;').all(),
    db.prepare('SELECT * FROM products ORDER BY item_code ASC;').all(),
    db.prepare('SELECT * FROM supplier_transactions ORDER BY timestamp DESC LIMIT 25;').all(),
    db.prepare('SELECT * FROM issuance_transactions ORDER BY timestamp DESC LIMIT 25;').all()
  ]);

  const items = (products.results || []).map(p => formatProductFromRow(p));
  const storesList = (stores.results || []).map(s => ({
    code: s.code,
    name: s.name,
    type: s.type || 'Store',
    status: s.status || 'Active'
  }));
  const suppliersList = (suppliers.results || []).map(s => ({
    code: s.code,
    name: s.name,
    category: s.category || 'General',
    contactPerson: s.contact_person || '',
    phone: s.phone || '',
    email: s.email || '',
    status: s.status || 'Active'
  }));

  let totalValuation = 0;
  let totalUnits = 0;
  let lowStockCount = 0;
  let outOfStockCount = 0;
  const categoryBreakdown = {};
  const lowStockAlerts = [];
  const warehouseBreakdown = {};

  storesList.forEach(st => {
    warehouseBreakdown[st.code] = {
      code: st.code,
      name: st.name,
      type: st.type,
      units: 0,
      valuation: 0
    };
  });

  items.forEach(itm => {
    const units = Number(itm.totalStock) || 0;
    const rate = Number(itm.rate) || 0;
    const val = Number(itm.totalValue) || (units * rate);
    const minStock = Number(itm.minStock) || 0;

    totalUnits += units;
    totalValuation += val;

    if (units <= 0) {
      outOfStockCount++;
      lowStockCount++;
      lowStockAlerts.push({
        code: itm.code,
        name: itm.name,
        category: itm.category,
        currentStock: units,
        minStock: minStock,
        status: 'OUT_OF_STOCK',
        rate: rate,
        supplierCode: itm.supplierCode || ''
      });
    } else if (units <= minStock) {
      lowStockCount++;
      lowStockAlerts.push({
        code: itm.code,
        name: itm.name,
        category: itm.category,
        currentStock: units,
        minStock: minStock,
        status: 'LOW_STOCK',
        rate: rate,
        supplierCode: itm.supplierCode || ''
      });
    }

    const cat = itm.category || 'General';
    if (!categoryBreakdown[cat]) {
      categoryBreakdown[cat] = { count: 0, units: 0, valuation: 0 };
    }
    categoryBreakdown[cat].count++;
    categoryBreakdown[cat].units += units;
    categoryBreakdown[cat].valuation += val;

    if (warehouseBreakdown['S_000']) {
      const u = Number(itm.centralStock) || 0;
      warehouseBreakdown['S_000'].units += u;
      warehouseBreakdown['S_000'].valuation += u * rate;
    }
    if (warehouseBreakdown['S_001']) {
      const u = Number(itm.stockS001) || 0;
      warehouseBreakdown['S_001'].units += u;
      warehouseBreakdown['S_001'].valuation += u * rate;
    }
    if (warehouseBreakdown['S_002']) {
      const u = Number(itm.stockS002) || 0;
      warehouseBreakdown['S_002'].units += u;
      warehouseBreakdown['S_002'].valuation += u * rate;
    }
  });

  const recentMovements = [
    ...(supTxns.results || []).map(t => ({
      type: 'INWARD_PURCHASE',
      id: t.id,
      timestamp: t.timestamp,
      itemCode: t.item_code,
      itemName: t.item_description,
      quantity: t.quantity,
      rate: t.rate,
      totalAmount: t.total_amount,
      source: t.supplier_name || t.supplier_code,
      destination: t.receiving_store_name || t.receiving_store_code
    })),
    ...(issTxns.results || []).map(t => ({
      type: 'OUTWARD_TRANSFER',
      id: t.id,
      timestamp: t.timestamp,
      itemCode: t.item_code,
      itemName: t.item_description,
      quantity: t.quantity,
      rate: t.unit_rate,
      totalAmount: t.total_value,
      source: t.from_store_name || t.from_store_code,
      destination: t.to_selling_point_name || t.to_selling_point_code
    }))
  ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 20);

  return {
    success: true,
    dashboardType: 'inventory',
    title: 'Zolexora Inventory & Warehouse Operations Dashboard',
    organization: org || { id: 'ORG_ZOLEXORA_001', name: "Zolexora_1's org" },
    timestamp: new Date().toISOString(),
    summary: {
      totalSkus: items.length,
      totalUnits: totalUnits,
      totalValuation: Math.round(totalValuation),
      lowStockCount: lowStockCount,
      outOfStockCount: outOfStockCount,
      totalWarehouses: storesList.length,
      totalSuppliers: suppliersList.length
    },
    warehouses: Object.values(warehouseBreakdown),
    categoryBreakdown: categoryBreakdown,
    lowStockAlerts: lowStockAlerts,
    recentStockMovements: recentMovements,
    items: items
  };
}

async function getPosDashboardData(db) {
  const [org, sellingPoints, salesRes, purchasesRes, expensesRes] = await Promise.all([
    db.prepare('SELECT * FROM organizations LIMIT 1;').first(),
    db.prepare('SELECT * FROM selling_points ORDER BY code ASC;').all(),
    db.prepare('SELECT * FROM selling_point_sales ORDER BY timestamp DESC;').all(),
    db.prepare('SELECT * FROM selling_point_purchases ORDER BY timestamp DESC;').all(),
    db.prepare('SELECT * FROM selling_point_expenses ORDER BY timestamp DESC;').all()
  ]);

  const sales = (salesRes.results || []).map(s => formatSaleFromRow(s));
  const purchases = (purchasesRes.results || []).map(p => ({
    id: p.id,
    timestamp: p.timestamp,
    date: p.date,
    sellingPointCode: p.selling_point_code,
    sellingPointName: p.selling_point_name,
    itemCode: p.item_code,
    itemName: p.item_name,
    quantity: p.quantity,
    costRate: p.cost_rate,
    totalCost: p.total_cost,
    invoiceRef: p.invoice_ref,
    paymentStatus: p.payment_status,
    receivedBy: p.received_by
  }));
  const expenses = (expensesRes.results || []).map(e => ({
    id: e.id,
    timestamp: e.timestamp,
    date: e.date,
    sellingPointCode: e.selling_point_code,
    sellingPointName: e.selling_point_name,
    category: e.category,
    amount: e.amount,
    paymentMode: e.payment_mode,
    paidTo: e.paid_to,
    voucherRef: e.voucher_ref,
    recordedBy: e.recorded_by,
    status: e.status
  }));

  const sellingPointsList = (sellingPoints.results || []).map(sp => ({
    code: sp.code,
    name: sp.name,
    assignedStoreCode: sp.assigned_store_code || 'S_001',
    type: sp.type || 'Selling Point',
    status: sp.status || 'Active'
  }));

  let totalRevenue = 0;
  let totalUnitsSold = 0;
  let todayRevenue = 0;
  const todayStr = new Date().toISOString().split('T')[0];
  const paymentBreakdown = { Cash: 0, UPI: 0, Card: 0, Other: 0 };
  const counterStats = {};
  const itemSalesMap = {};

  sellingPointsList.forEach(sp => {
    counterStats[sp.code] = {
      code: sp.code,
      name: sp.name,
      assignedStore: sp.assignedStoreCode,
      salesCount: 0,
      totalRevenue: 0,
      todayRevenue: 0
    };
  });

  sales.forEach(s => {
    const amt = Number(s.totalAmount) || 0;
    const qty = Number(s.quantity) || 0;
    totalRevenue += amt;
    totalUnitsSold += qty;

    if (s.date === todayStr || (s.timestamp && s.timestamp.startsWith(todayStr))) {
      todayRevenue += amt;
    }

    const mode = s.paymentMode || 'Cash';
    if (paymentBreakdown[mode] !== undefined) {
      paymentBreakdown[mode] += amt;
    } else {
      paymentBreakdown.Other += amt;
    }

    if (counterStats[s.sellingPointCode]) {
      counterStats[s.sellingPointCode].salesCount++;
      counterStats[s.sellingPointCode].totalRevenue += amt;
      if (s.date === todayStr || (s.timestamp && s.timestamp.startsWith(todayStr))) {
        counterStats[s.sellingPointCode].todayRevenue += amt;
      }
    }

    const itmCode = s.itemCode || s.itemName || 'OTHER';
    if (!itemSalesMap[itmCode]) {
      itemSalesMap[itmCode] = {
        code: itmCode,
        name: s.itemName || itmCode,
        category: s.category || 'General',
        unitsSold: 0,
        revenue: 0
      };
    }
    itemSalesMap[itmCode].unitsSold += qty;
    itemSalesMap[itmCode].revenue += amt;
  });

  const totalPurchasesCost = purchases.reduce((sum, p) => sum + (Number(p.totalCost) || 0), 0);
  const totalExpensesAmt = expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  const netCashFlow = totalRevenue - (totalPurchasesCost + totalExpensesAmt);

  const topSellingItems = Object.values(itemSalesMap)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);

  return {
    success: true,
    dashboardType: 'pos',
    title: 'Zolexora Point of Sale (POS) & Counter Operations Dashboard',
    organization: org || { id: 'ORG_ZOLEXORA_001', name: "Zolexora_1's org" },
    timestamp: new Date().toISOString(),
    summary: {
      totalRevenue: totalRevenue,
      todayRevenue: todayRevenue,
      totalBills: sales.length,
      totalUnitsSold: totalUnitsSold,
      averageBillValue: sales.length > 0 ? Math.round(totalRevenue / sales.length) : 0,
      totalPurchasesCost: totalPurchasesCost,
      totalExpensesAmt: totalExpensesAmt,
      netCashFlow: netCashFlow,
      paymentBreakdown: paymentBreakdown
    },
    counters: Object.values(counterStats),
    topSellingItems: topSellingItems,
    recentSales: sales.slice(0, 50),
    recentPurchases: purchases.slice(0, 50),
    recentExpenses: expenses.slice(0, 50)
  };
}

function formatProductFromRow(row) {
  return {
    id: row.item_code,
    code: row.item_code,
    sku: row.item_code,
    name: row.description,
    description: row.description,
    category: row.category,
    categoryCode: row.category_code || '',
    unit: row.uom,
    uom: row.uom,
    rate: row.rate,
    unitCost: row.rate,
    taxPercent: row.tax_percent,
    minStock: row.min_stock,
    stockS001: row.stock_s_001,
    stockS002: row.stock_s_002,
    centralStock: row.central_stock,
    totalStock: row.total_stock,
    totalValue: row.total_valuation,
    supplierCode: row.preferred_supplier_code || '',
    supplier: row.preferred_supplier_code || '',
    status: row.status || 'Active'
  };
}

function formatSaleFromRow(r) {
  return {
    id: r.id,
    timestamp: r.timestamp,
    date: r.date,
    sellingPointCode: r.selling_point_code,
    sellingPointName: r.selling_point_name,
    billNo: r.bill_no || r.id,
    customerName: r.customer_name || 'Walk-in Guest',
    itemCode: r.item_code,
    itemName: r.item_name,
    category: r.category,
    quantity: r.quantity,
    unit: r.uom,
    rate: r.rate,
    taxPercent: r.tax_percent,
    totalAmount: r.total_amount,
    paymentMode: r.payment_mode || 'Cash',
    paymentStatus: r.payment_status || 'Completed',
    cashier: r.cashier || 'Staff',
    notes: r.notes || ''
  };
}

function formatSupplierTxn(row) {
  if (!row) return null;
  return {
    ...row,
    id: row.id,
    type: 'STOCK_IN',
    timestamp: row.timestamp,
    supplierCode: row.supplier_code || row.supplierCode || '',
    supplierName: row.supplier_name || row.supplierName || '',
    sku: row.item_code || row.sku || '',
    itemCode: row.item_code || row.itemCode || '',
    itemName: row.item_description || row.itemName || '',
    itemDescription: row.item_description || row.itemDescription || '',
    category: row.category || '',
    quantity: Number(row.quantity) || 0,
    unit: row.uom || row.unit || '',
    uom: row.uom || row.unit || '',
    rate: Number(row.rate) || 0,
    costRate: Number(row.rate) || 0,
    taxPercent: Number(row.tax_percent != null ? row.tax_percent : row.taxPercent) || 0,
    totalAmount: Number(row.total_amount != null ? row.total_amount : row.totalAmount) || 0,
    totalCost: Number(row.total_amount != null ? row.total_amount : row.totalCost) || 0,
    sourceLocation: row.supplier_name || row.supplierCode || 'Supplier',
    destLocation: row.receiving_store_name || row.receiving_store_code || 'Store',
    receivingStoreCode: row.receiving_store_code || row.receivingStoreCode || '',
    receivingStoreName: row.receiving_store_name || row.receivingStoreName || '',
    reference: row.po_invoice_ref || row.reference || '',
    poInvoiceRef: row.po_invoice_ref || row.poInvoiceRef || '',
    performedBy: row.received_by || row.performedBy || 'Staff',
    receivedBy: row.received_by || row.receivedBy || 'Staff',
    notes: row.notes || ''
  };
}

function formatIssuanceTxn(row) {
  if (!row) return null;
  const rawType = String(row.type || 'STOCK_OUT').toUpperCase();
  const normalizedType = (rawType === 'DISBURSEMENT' || rawType === 'STOCK_OUT') ? 'STOCK_OUT' : rawType;
  return {
    ...row,
    id: row.id,
    type: normalizedType,
    rawType: row.type || 'STOCK_OUT',
    timestamp: row.timestamp,
    sku: row.item_code || row.sku || '',
    itemCode: row.item_code || row.itemCode || '',
    itemName: row.item_description || row.itemName || '',
    itemDescription: row.item_description || row.itemDescription || '',
    category: row.category || '',
    quantity: Number(row.quantity) || 0,
    unit: row.uom || row.unit || '',
    uom: row.uom || row.unit || '',
    rate: Number(row.unit_rate != null ? row.unit_rate : row.rate) || 0,
    unitRate: Number(row.unit_rate != null ? row.unit_rate : row.unitRate) || 0,
    totalCost: Number(row.total_value != null ? row.total_value : row.totalCost) || 0,
    totalValue: Number(row.total_value != null ? row.total_value : row.totalValue) || 0,
    totalAmount: Number(row.total_value != null ? row.total_value : row.totalAmount) || 0,
    sourceLocation: row.from_store_name || row.from_store_code || 'Store',
    fromStoreCode: row.from_store_code || row.fromStoreCode || '',
    fromStoreName: row.from_store_name || row.fromStoreName || '',
    destLocation: row.to_selling_point_name || row.to_selling_point_code || 'Selling Point / Dept',
    toSellingPointCode: row.to_selling_point_code || row.toSellingPointCode || '',
    toSellingPointName: row.to_selling_point_name || row.toSellingPointName || '',
    reference: row.requisition_ref || row.reference || '',
    requisitionRef: row.requisition_ref || row.requisitionRef || '',
    performedBy: row.issued_by || row.performedBy || 'Staff',
    issuedBy: row.issued_by || row.issuedBy || 'Staff',
    status: row.status || 'Approved',
    notes: row.notes || ''
  };
}

async function getProducts(db) {
  const res = await db.prepare('SELECT * FROM products ORDER BY item_code ASC;').all();
  return (res.results || []).map(p => formatProductFromRow(p));
}

async function saveProduct(db, item) {
  const code = String(item.code || item.sku || item.id || `ITM_${Date.now().toString().slice(-4)}`).trim().toUpperCase();
  const desc = String(item.name || item.description || '').trim();
  const cat = String(item.category || 'General').trim();
  const uom = String(item.uom || item.unit || 'Pcs').trim();
  const rate = Number(item.rate || item.unitCost || 0);
  const tax = Number(item.taxPercent || item.tax_percent || 0);
  const minStock = Number(item.minStock || 0);
  const stockS001 = Number(item.stockS001 || 0);
  const stockS002 = Number(item.stockS002 || 0);
  const centralStock = Number(item.centralStock || 0);
  const totalStock = stockS001 + stockS002 + centralStock;
  const totalValuation = totalStock * rate;
  const status = item.status || 'Active';
  const now = new Date().toISOString();

  await db.prepare(`
    INSERT INTO products (
      item_code, org_id, description, category, category_code, uom, rate, tax_percent,
      min_stock, stock_s_001, stock_s_002, central_stock, total_stock, total_valuation,
      preferred_supplier_code, status, last_updated
    ) VALUES (?, 'ORG_ZOLEXORA_001', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(item_code) DO UPDATE SET
      description = excluded.description,
      category = excluded.category,
      uom = excluded.uom,
      rate = excluded.rate,
      tax_percent = excluded.tax_percent,
      min_stock = excluded.min_stock,
      stock_s_001 = excluded.stock_s_001,
      stock_s_002 = excluded.stock_s_002,
      central_stock = excluded.central_stock,
      total_stock = excluded.total_stock,
      total_valuation = excluded.total_valuation,
      status = excluded.status,
      last_updated = excluded.last_updated;
  `).bind(
    code, desc, cat, item.categoryCode || '', uom, rate, tax,
    minStock, stockS001, stockS002, centralStock, totalStock, totalValuation,
    item.supplierCode || '', status, now
  ).run();

  const allItems = await getProducts(db);
  return { success: true, itemCode: code, items: allItems };
}

async function setProductStatus(db, code, status) {
  const now = new Date().toISOString();
  await db.prepare('UPDATE products SET status = ?, last_updated = ? WHERE item_code = ?;')
    .bind(status, now, code).run();
  const allItems = await getProducts(db);
  return { success: true, itemCode: code, status: status, items: allItems };
}

async function deleteProduct(db, code) {
  await db.prepare('DELETE FROM products WHERE item_code = ?;').bind(code).run();
  const allItems = await getProducts(db);
  return { success: true, items: allItems };
}

async function getStores(db) {
  const res = await db.prepare('SELECT * FROM stores ORDER BY code ASC;').all();
  return (res.results || []).map(s => ({
    code: s.code,
    name: s.name,
    type: s.type || 'Store',
    status: s.status || 'Active',
    description: s.description || ''
  }));
}

async function saveStore(db, store) {
  const code = String(store.code || `S_${Date.now().toString().slice(-3)}`).trim();
  await db.prepare(`
    INSERT INTO stores (code, org_id, name, type, status, description)
    VALUES (?, 'ORG_ZOLEXORA_001', ?, ?, ?, ?)
    ON CONFLICT(code) DO UPDATE SET
      name = excluded.name,
      type = excluded.type,
      status = excluded.status,
      description = excluded.description;
  `).bind(code, store.name, store.type || 'Store', store.status || 'Active', store.description || '').run();
  const stores = await getStores(db);
  return { success: true, code: code, stores: stores };
}

async function deleteStore(db, code) {
  await db.prepare('DELETE FROM stores WHERE code = ?;').bind(code).run();
  const stores = await getStores(db);
  return { success: true, stores: stores };
}

async function getSellingPoints(db) {
  const res = await db.prepare('SELECT * FROM selling_points ORDER BY code ASC;').all();
  return (res.results || []).map(sp => ({
    code: sp.code,
    name: sp.name,
    storeCode: sp.assigned_store_code || 'S_001',
    type: sp.type || 'Selling Point',
    status: sp.status || 'Active'
  }));
}

async function saveSellingPoint(db, sp) {
  const code = String(sp.code || `SP_${Date.now().toString().slice(-3)}`).trim();
  await db.prepare(`
    INSERT INTO selling_points (code, org_id, name, assigned_store_code, type, status)
    VALUES (?, 'ORG_ZOLEXORA_001', ?, ?, ?, ?)
    ON CONFLICT(code) DO UPDATE SET
      name = excluded.name,
      assigned_store_code = excluded.assigned_store_code,
      type = excluded.type,
      status = excluded.status;
  `).bind(code, sp.name, sp.storeCode || 'S_001', sp.type || 'Selling Point', sp.status || 'Active').run();
  const sellingPoints = await getSellingPoints(db);
  return { success: true, code: code, sellingPoints: sellingPoints };
}

async function deleteSellingPoint(db, code) {
  await db.prepare('DELETE FROM selling_points WHERE code = ?;').bind(code).run();
  const sellingPoints = await getSellingPoints(db);
  return { success: true, sellingPoints: sellingPoints };
}

async function getSuppliers(db) {
  const res = await db.prepare('SELECT * FROM suppliers ORDER BY code ASC;').all();
  return (res.results || []).map(sup => ({
    id: sup.code,
    code: sup.code,
    name: sup.name,
    category: sup.category || 'General',
    categorySupplied: sup.category || 'General',
    contactPerson: sup.contact_person || '',
    phone: sup.phone || '',
    email: sup.email || '',
    address: sup.address || '',
    status: sup.status || 'Active'
  }));
}

async function saveSupplier(db, sup) {
  const code = String(sup.code || sup.id || `SUP_${Date.now().toString().slice(-3)}`).trim();
  const cat = sup.category || sup.categorySupplied || 'General';
  await db.prepare(`
    INSERT INTO suppliers (code, org_id, name, category, contact_person, phone, email, status)
    VALUES (?, 'ORG_ZOLEXORA_001', ?, ?, ?, ?, ?, ?)
    ON CONFLICT(code) DO UPDATE SET
      name = excluded.name,
      category = excluded.category,
      contact_person = excluded.contact_person,
      phone = excluded.phone,
      email = excluded.email,
      status = excluded.status;
  `).bind(code, sup.name, cat, sup.contactPerson || '', sup.phone || '', sup.email || '', sup.status || 'Active').run();
  const suppliers = await getSuppliers(db);
  return { success: true, code: code, suppliers: suppliers };
}

async function deleteSupplier(db, code) {
  await db.prepare('DELETE FROM suppliers WHERE code = ?;').bind(code).run();
  const suppliers = await getSuppliers(db);
  return { success: true, suppliers: suppliers };
}

async function getUsers(db) {
  const res = await db.prepare(`
    SELECT id, email, name, role, scope_type as scopeType, assigned_location as assignedLocation, location_name as locationName, status
    FROM users ORDER BY id ASC;
  `).all();
  return res.results || [];
}

async function saveUser(db, user) {
  const id = String(user.id || `USR_${Date.now().toString().slice(-4)}`).trim();
  const now = new Date().toISOString();
  await db.prepare(`
    INSERT INTO users (id, org_id, email, password_hash, name, role, scope_type, assigned_location, location_name, status, created_at)
    VALUES (?, 'ORG_ZOLEXORA_001', ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      role = excluded.role,
      scope_type = excluded.scope_type,
      assigned_location = excluded.assigned_location,
      location_name = excluded.location_name,
      status = excluded.status;
  `).bind(
    id, user.email, user.password_hash || 'managed_by_supabase_auth',
    user.name, user.role || 'Staff', user.scopeType || 'ALL', user.assignedLocation || 'ALL',
    user.locationName || '', user.status || 'Active', now
  ).run();

  const users = await getUsers(db);
  return { success: true, users: users };
}

async function deleteUser(db, id) {
  await db.prepare('DELETE FROM users WHERE id = ?;').bind(id).run();
  const users = await getUsers(db);
  return { success: true, users: users };
}

async function getSellingPointTransactions(db, limit = 150) {
  const [sales, purchases, expenses] = await Promise.all([
    db.prepare('SELECT * FROM selling_point_sales ORDER BY timestamp DESC LIMIT ?;').bind(limit).all(),
    db.prepare('SELECT * FROM selling_point_purchases ORDER BY timestamp DESC LIMIT ?;').bind(limit).all(),
    db.prepare('SELECT * FROM selling_point_expenses ORDER BY timestamp DESC LIMIT ?;').bind(limit).all()
  ]);

  return {
    sales: (sales.results || []).map(s => formatSaleFromRow(s)),
    purchases: purchases.results || [],
    expenses: expenses.results || []
  };
}

async function recordSellingPointSale(db, sale) {
  const now = new Date();
  const saleId = 'SALE_' + now.toISOString().slice(0, 10).replace(/-/g, '') + '_' + Math.floor(1000 + Math.random() * 9000);
  const today = now.toISOString().slice(0, 10);
  const qty = Number(sale.quantity) || 1;
  const rate = Number(sale.rate) || 0;
  const tax = Number(sale.taxPercent) || 0;
  const total = Number(sale.totalAmount) || (qty * rate * (1 + tax / 100));
  const spCode = String(sale.sellingPointCode || 'SP_001');

  // 1. Insert Sale record into D1
  await db.prepare(`
    INSERT INTO selling_point_sales (
      id, org_id, timestamp, date, selling_point_code, selling_point_name, bill_no,
      customer_name, item_code, item_name, category, quantity, uom, rate, tax_percent,
      total_amount, payment_mode, payment_status, cashier, notes
    ) VALUES (?, 'ORG_ZOLEXORA_001', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
  `).bind(
    saleId, now.toISOString(), today, spCode, sale.sellingPointName || 'Selling Point',
    sale.billNo || saleId, sale.customerName || 'Walk-in Guest', sale.itemCode || '',
    sale.itemName || '', sale.category || 'General', qty, sale.unit || 'Pcs',
    rate, tax, total, sale.paymentMode || 'Cash', 'Completed', sale.cashier || 'Cashier',
    sale.notes || ''
  ).run();

  // 2. Automatically deduct stock from products table in D1
  if (sale.itemCode) {
    const isS002 = spCode.includes('002') || spCode.includes('S_002');
    if (isS002) {
      await db.prepare(`
        UPDATE products SET
          stock_s_002 = MAX(0, stock_s_002 - ?),
          total_stock = MAX(0, total_stock - ?),
          total_valuation = MAX(0, total_stock - ?) * rate,
          last_updated = ?
        WHERE item_code = ?;
      `).bind(qty, qty, qty, now.toISOString(), sale.itemCode).run();
    } else {
      await db.prepare(`
        UPDATE products SET
          stock_s_001 = MAX(0, stock_s_001 - ?),
          total_stock = MAX(0, total_stock - ?),
          total_valuation = MAX(0, total_stock - ?) * rate,
          last_updated = ?
        WHERE item_code = ?;
      `).bind(qty, qty, qty, now.toISOString(), sale.itemCode).run();
    }
  }

  return {
    success: true,
    saleId: saleId,
    totalAmount: total,
    message: `Sale ${saleId} recorded in Cloudflare D1 with instant stock deduction.`
  };
}

async function recordSellingPointPurchase(db, pur) {
  const now = new Date();
  const purId = 'PUR_SP_' + now.toISOString().slice(0, 10).replace(/-/g, '') + '_' + Math.floor(100 + Math.random() * 900);
  const today = now.toISOString().slice(0, 10);
  const qty = Number(pur.quantity) || 1;
  const costRate = Number(pur.costRate) || 0;
  const tax = Number(pur.taxPercent) || 0;
  const totalCost = Number(pur.totalCost) || (qty * costRate * (1 + tax / 100));
  const spCode = String(pur.sellingPointCode || 'SP_001');

  await db.prepare(`
    INSERT INTO selling_point_purchases (
      id, org_id, timestamp, date, selling_point_code, selling_point_name, source,
      item_code, item_name, category, quantity, uom, cost_rate, tax_percent,
      total_cost, invoice_ref, payment_status, received_by, notes
    ) VALUES (?, 'ORG_ZOLEXORA_001', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
  `).bind(
    purId, now.toISOString(), today, spCode, pur.sellingPointName || 'Selling Point',
    pur.source || 'Direct Supplier', pur.itemCode || '', pur.itemName || '',
    pur.category || 'General', qty, pur.unit || 'Pcs', costRate, tax, totalCost,
    pur.invoiceRef || '', pur.paymentStatus || 'Paid', pur.receivedBy || 'Staff',
    pur.notes || ''
  ).run();

  // Add stock to products in D1
  if (pur.itemCode) {
    const isS002 = spCode.includes('002') || spCode.includes('S_002');
    if (isS002) {
      await db.prepare(`
        UPDATE products SET
          stock_s_002 = stock_s_002 + ?,
          total_stock = total_stock + ?,
          total_valuation = (total_stock + ?) * rate,
          last_updated = ?
        WHERE item_code = ?;
      `).bind(qty, qty, qty, now.toISOString(), pur.itemCode).run();
    } else {
      await db.prepare(`
        UPDATE products SET
          stock_s_001 = stock_s_001 + ?,
          total_stock = total_stock + ?,
          total_valuation = (total_stock + ?) * rate,
          last_updated = ?
        WHERE item_code = ?;
      `).bind(qty, qty, qty, now.toISOString(), pur.itemCode).run();
    }
  }

  return { success: true, purchaseId: purId, totalCost: totalCost };
}

async function recordSellingPointExpense(db, exp) {
  const now = new Date();
  const expId = 'EXP_' + now.toISOString().slice(0, 10).replace(/-/g, '') + '_' + Math.floor(1000 + Math.random() * 9000);
  const today = now.toISOString().slice(0, 10);
  const amount = Number(exp.amount) || 0;

  await db.prepare(`
    INSERT INTO selling_point_expenses (
      id, org_id, timestamp, date, selling_point_code, selling_point_name,
      category, amount, payment_mode, paid_to, voucher_ref, recorded_by, status, notes
    ) VALUES (?, 'ORG_ZOLEXORA_001', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Approved', ?);
  `).bind(
    expId, now.toISOString(), today, exp.sellingPointCode || 'SP_001',
    exp.sellingPointName || 'Selling Point', exp.category || 'Petty Cash',
    amount, exp.paymentMode || 'Cash', exp.paidTo || 'Vendor', exp.voucherRef || '',
    exp.recordedBy || 'Staff', exp.notes || ''
  ).run();

  return { success: true, expenseId: expId, amount: amount };
}

async function getSupplierTransactions(db, limit = 50) {
  const res = await db.prepare('SELECT * FROM supplier_transactions ORDER BY timestamp DESC LIMIT ?;').bind(limit).all();
  return (res.results || []).map(r => formatSupplierTxn(r));
}

async function processSupplierPurchase(db, txn) {
  const now = new Date().toISOString();
  const txnId = 'TXN_SUP_' + Date.now().toString().slice(-6);
  const qty = Number(txn.quantity) || 1;
  const rate = Number(txn.rate) || 0;
  const tax = Number(txn.taxPercent) || 0;
  const total = Number(txn.totalAmount) || (qty * rate * (1 + tax / 100));
  const storeCode = txn.receivingStoreCode || 'S_001';

  await db.prepare(`
    INSERT INTO supplier_transactions (
      id, org_id, timestamp, supplier_code, supplier_name, item_code, item_description,
      category, quantity, uom, rate, tax_percent, total_amount, receiving_store_code,
      receiving_store_name, po_invoice_ref, received_by, notes
    ) VALUES (?, 'ORG_ZOLEXORA_001', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
  `).bind(
    txnId, now, txn.supplierCode || '', txn.supplierName || '', txn.itemCode || '',
    txn.itemDescription || '', txn.category || 'General', qty, txn.uom || 'Pcs',
    rate, tax, total, storeCode, txn.receivingStoreName || 'Main Store',
    txn.poInvoiceRef || '', txn.receivedBy || 'Store Incharge', txn.notes || ''
  ).run();

  // Increment stock in D1
  if (txn.itemCode) {
    if (storeCode === 'S_002') {
      await db.prepare(`
        UPDATE products SET stock_s_002 = stock_s_002 + ?, total_stock = total_stock + ?, total_valuation = (total_stock + ?) * rate, last_updated = ? WHERE item_code = ?;
      `).bind(qty, qty, qty, now, txn.itemCode).run();
    } else if (storeCode === 'S_000') {
      await db.prepare(`
        UPDATE products SET central_stock = central_stock + ?, total_stock = total_stock + ?, total_valuation = (total_stock + ?) * rate, last_updated = ? WHERE item_code = ?;
      `).bind(qty, qty, qty, now, txn.itemCode).run();
    } else {
      await db.prepare(`
        UPDATE products SET stock_s_001 = stock_s_001 + ?, total_stock = total_stock + ?, total_valuation = (total_stock + ?) * rate, last_updated = ? WHERE item_code = ?;
      `).bind(qty, qty, qty, now, txn.itemCode).run();
    }
  }

  return { success: true, txnId: txnId, totalAmount: total };
}

async function getIssuanceTransactions(db, limit = 50) {
  const res = await db.prepare('SELECT * FROM issuance_transactions ORDER BY timestamp DESC LIMIT ?;').bind(limit).all();
  return (res.results || []).map(r => formatIssuanceTxn(r));
}

async function processStockIssuance(db, txn) {
  const now = new Date().toISOString();
  const issId = 'ISS_' + Date.now().toString().slice(-6);
  const qty = Number(txn.quantity) || 1;
  const rate = Number(txn.unitRate) || 0;
  const total = Number(txn.totalValue) || (qty * rate);
  const fromStore = txn.fromStoreCode || 'S_001';

  await db.prepare(`
    INSERT INTO issuance_transactions (
      id, org_id, timestamp, type, item_code, item_description, quantity, uom,
      from_store_code, from_store_name, to_selling_point_code, to_selling_point_name,
      unit_rate, total_value, requisition_ref, issued_by, status, notes
    ) VALUES (?, 'ORG_ZOLEXORA_001', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Approved', ?);
  `).bind(
    issId, now, txn.type || 'DISBURSEMENT', txn.itemCode || '', txn.itemDescription || '',
    qty, txn.uom || 'Pcs', fromStore, txn.fromStoreName || 'Main Store',
    txn.toSellingPointCode || 'SP_001', txn.toSellingPointName || 'Selling Point',
    rate, total, txn.requisitionRef || '', txn.issuedBy || 'Store Keeper', txn.notes || ''
  ).run();

  // Deduct from source store in D1
  if (txn.itemCode) {
    if (fromStore === 'S_002') {
      await db.prepare(`
        UPDATE products SET stock_s_002 = MAX(0, stock_s_002 - ?), total_stock = MAX(0, stock_s_001 + MAX(0, stock_s_002 - ?) + central_stock), last_updated = ? WHERE item_code = ?;
      `).bind(qty, qty, now, txn.itemCode).run();
    } else if (fromStore === 'S_000') {
      await db.prepare(`
        UPDATE products SET central_stock = MAX(0, central_stock - ?), total_stock = MAX(0, stock_s_001 + stock_s_002 + MAX(0, central_stock - ?)), last_updated = ? WHERE item_code = ?;
      `).bind(qty, qty, now, txn.itemCode).run();
    } else {
      await db.prepare(`
        UPDATE products SET stock_s_001 = MAX(0, stock_s_001 - ?), total_stock = MAX(0, MAX(0, stock_s_001 - ?) + stock_s_002 + central_stock), last_updated = ? WHERE item_code = ?;
      `).bind(qty, qty, now, txn.itemCode).run();
    }
  }

  return { success: true, issuanceId: issId, totalValue: total };
}

async function getTransactions(db, limit = 50) {
  const [sup, iss] = await Promise.all([
    getSupplierTransactions(db, limit),
    getIssuanceTransactions(db, limit)
  ]);
  return [...sup, ...iss].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, limit);
}

async function getSettings(db) {
  const res = await db.prepare('SELECT key, value FROM settings;').all();
  const map = {};
  (res.results || []).forEach(r => { map[r.key] = r.value; });
  return map;
}

async function saveSettings(db, settingsObj) {
  for (const [k, v] of Object.entries(settingsObj || {})) {
    await db.prepare(`
      INSERT INTO settings (key, org_id, value, description)
      VALUES (?, 'ORG_ZOLEXORA_001', ?, 'Updated setting')
      ON CONFLICT(key) DO UPDATE SET value = excluded.value;
    `).bind(k, String(v)).run();
  }
  return { success: true };
}

async function listOrganizations(db) {
  const res = await db.prepare('SELECT * FROM organizations;').all();
  return res.results || [];
}

async function switchOrganization(db, orgId) {
  const org = await db.prepare('SELECT * FROM organizations WHERE id = ?;').bind(orgId).first();
  const allOrgs = await listOrganizations(db);
  return { success: true, activeOrganization: org, organizations: allOrgs };
}

async function renameOrganization(db, orgId, newName) {
  const name = String(newName || '').trim();
  if (!name) return { success: false, error: 'Organization name cannot be empty' };
  await db.prepare('UPDATE organizations SET name = ? WHERE id = ?;').bind(name, orgId).run();
  const org = await db.prepare('SELECT * FROM organizations WHERE id = ?;').bind(orgId).first();
  const allOrgs = await listOrganizations(db);
  return { success: true, activeOrganization: org, organizations: allOrgs };
}

async function createOrganization(db, orgData) {
  const id = orgData.id || `ORG_${Date.now()}`;
  const name = String(orgData.name || 'New Organization').trim();
  await db.prepare('INSERT INTO organizations (id, name, created_at) VALUES (?, ?, ?);').bind(id, name, new Date().toISOString()).run();
  const org = await db.prepare('SELECT * FROM organizations WHERE id = ?;').bind(id).first();
  const allOrgs = await listOrganizations(db);
  return { success: true, organization: org, activeOrganization: org, organizations: allOrgs };
}

// =====================================================================
// AUTHENTICATION & SESSIONS
// =====================================================================

async function loginUser(db, env, credentials) {
  const email = String(credentials.email || '').trim().toLowerCase();
  const password = String(credentials.password || '').trim();

  if (!email || !password) {
    return { success: false, error: 'Email and password are required', message: 'Email and password are required' };
  }

  const user = await db.prepare('SELECT * FROM users WHERE LOWER(email) = ?;').bind(email).first();
  if (!user) {
    return { 
      success: false, 
      error: 'Invalid email or password', 
      message: 'Invalid email or password' 
    };
  }

  // Verify SHA-256 hash
  const hash = await hashPassword(password);
  const passwordMatches = (user.password_hash === hash);

  if (!passwordMatches) {
    return { 
      success: false, 
      error: 'Invalid email or password', 
      message: 'Invalid email or password' 
    };
  }

  // Update last_login
  const now = new Date().toISOString();
  try {
    await db.prepare('UPDATE users SET last_login = ? WHERE id = ?;').bind(now, user.id).run();
  } catch (e) {}

  const formattedUser = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    scopeType: user.scope_type || 'ALL',
    assignedLocation: user.assigned_location || 'ALL',
    locationName: user.location_name || '',
    orgId: user.org_id || 'ORG_ZOLEXORA_001',
    orgName: "Zolexora_1's org"
  };

  // Cache in SESSION_KV if available
  if (env.SESSION_KV) {
    const sessionId = generateSessionId();
    await env.SESSION_KV.put(`session:${sessionId}`, JSON.stringify({
      sessionId: sessionId,
      user: formattedUser,
      expiresAt: new Date(Date.now() + DEFAULT_SESSION_TTL_SECONDS * 1000).toISOString()
    }), { expirationTtl: DEFAULT_SESSION_TTL_SECONDS });
  }

  const initialData = await getInitialData(db);

  return {
    success: true,
    user: formattedUser,
    data: initialData
  };
}

async function checkUserSession(db, email, orgId) {
  if (!email) return { success: false, error: 'No email provided' };
  const user = await db.prepare('SELECT * FROM users WHERE LOWER(email) = ?;').bind(email.toLowerCase().trim()).first();
  if (!user) return { success: false, error: 'Session expired or user not found' };

  const formattedUser = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    scopeType: user.scope_type || 'ALL',
    assignedLocation: user.assigned_location || 'ALL',
    locationName: user.location_name || '',
    orgId: user.org_id || 'ORG_ZOLEXORA_001',
    orgName: "Zolexora_1's org"
  };

  const initialData = await getInitialData(db);
  return {
    success: true,
    user: formattedUser,
    data: initialData
  };
}

async function hashPassword(password) {
  const enc = new TextEncoder();
  const data = enc.encode(password + SALT);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// =====================================================================
// EDGE SESSION API (/api/session)
// =====================================================================
async function handleSessionApi(request, env, url) {
  const method = request.method.toUpperCase();

  if (url.pathname === '/api/session/health') {
    return jsonResponse({
      status: 'healthy',
      service: 'zolexora-edge-session-store',
      kvConfigured: Boolean(env.SESSION_KV),
      d1Configured: Boolean(env.DB),
      edgeLocation: request.cf?.colo || 'UNKNOWN',
      timestamp: new Date().toISOString()
    }, 200, request);
  }

  if (!env.SESSION_KV) {
    return jsonResponse({ success: false, error: 'KV namespace SESSION_KV is not bound.' }, 500, request);
  }

  if (method === 'GET') {
    const token = getSessionToken(request, url);
    if (!token) {
      return jsonResponse({ success: false, cached: false, error: 'No session token provided.' }, 401, request);
    }
    const sessionData = await env.SESSION_KV.get(`session:${token}`, { type: 'json' });
    if (!sessionData) {
      return jsonResponse({ success: false, cached: false, error: 'Session expired or not found.' }, 404, request);
    }
    return jsonResponse({ success: true, cached: true, sessionId: token, user: sessionData.user }, 200, request);
  }

  if (method === 'POST') {
    const payload = await request.json();
    const user = payload.user || payload;
    const ttl = Number(payload.ttl || env.SESSION_TTL_SECONDS || DEFAULT_SESSION_TTL_SECONDS);
    const sessionId = payload.sessionId || generateSessionId();

    const record = {
      sessionId: sessionId,
      user: user,
      createdAt: Date.now(),
      expiresAt: new Date(Date.now() + ttl * 1000).toISOString()
    };

    await env.SESSION_KV.put(`session:${sessionId}`, JSON.stringify(record), { expirationTtl: ttl });
    const headers = new Headers();
    headers.set('Set-Cookie', `${COOKIE_NAME}=${sessionId}; Path=/; Max-Age=${ttl}; HttpOnly; Secure; SameSite=Lax`);
    return jsonResponse({ success: true, sessionId: sessionId, user: user }, 200, request, headers);
  }

  if (method === 'DELETE') {
    const token = getSessionToken(request, url);
    if (token) await env.SESSION_KV.delete(`session:${token}`);
    const headers = new Headers();
    headers.set('Set-Cookie', `${COOKIE_NAME}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax`);
    return jsonResponse({ success: true, message: 'Session logged out' }, 200, request, headers);
  }

  return jsonResponse({ error: 'Method not allowed' }, 405, request);
}

// =====================================================================
// PROXY REQUEST & CLIENT INJECTION
// =====================================================================
async function handleProxyRequest(request, env, url) {
  const gasExecUrl = env.GAS_EXEC_URL || DEFAULT_GAS_EXEC_URL;
  const targetUrl = new URL(gasExecUrl);

  url.searchParams.forEach((val, key) => {
    targetUrl.searchParams.set(key, val);
  });

  const modifiedHeaders = new Headers(request.headers);
  modifiedHeaders.set('Host', 'script.google.com');

  const init = {
    method: request.method,
    headers: modifiedHeaders,
    redirect: 'follow'
  };

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    init.body = request.body;
  }

  const response = await fetch(targetUrl.toString(), init);

  const contentType = response.headers.get('content-type') || '';
  const newHeaders = new Headers(response.headers);
  newHeaders.set('Access-Control-Allow-Origin', '*');
  newHeaders.set('Permissions-Policy', 'camera=*, microphone=*, geolocation=*, clipboard-write=*');
  newHeaders.delete('X-Frame-Options');
  newHeaders.set('x-edge-worker', 'zolexora-ims-d1-proxy');

  // If serving HTML, inject the D1 Bridge script before </head>
  if (contentType.includes('text/html')) {
    let html = await response.text();
    const d1BridgeScript = `
<script>
/** Zolexora IMS Cloudflare D1 Native Edge RPC Bridge **/
(function() {
  function createD1Bridge(successHandler, failureHandler) {
    return new Proxy({}, {
      get(target, prop) {
        if (prop === 'withSuccessHandler') return function(fn) { return createD1Bridge(fn, failureHandler); };
        if (prop === 'withFailureHandler') return function(fn) { return createD1Bridge(successHandler, fn); };
        return async function(...args) {
          try {
            var res = await fetch('/api/rpc/' + prop, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ args: args })
            });
            var data = await res.json();
            if (successHandler) successHandler(data);
            return data;
          } catch (err) {
            if (failureHandler) failureHandler(err);
            else console.error('D1 RPC error on ' + prop, err);
            throw err;
          }
        };
      }
    });
  }
  window.google = window.google || {};
  window.google.script = window.google.script || {};
  window.google.script.run = createD1Bridge();
  window.ZOLEXORA_DB_ENGINE = 'Cloudflare D1 (Serverless SQL)';
})();
</script>
`;
    if (html.includes('</head>')) {
      html = html.replace('</head>', d1BridgeScript + '</head>');
    } else {
      html = d1BridgeScript + html;
    }

    return new Response(html, {
      status: response.status,
      statusText: response.statusText,
      headers: newHeaders
    });
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders
  });
}

// =====================================================================
// UTILITIES
// =====================================================================

function getSessionToken(request, url) {
  const cookieHeader = request.headers.get('Cookie');
  if (cookieHeader) {
    const cookies = parseCookies(cookieHeader);
    if (cookies[COOKIE_NAME]) return cookies[COOKIE_NAME];
  }
  const authHeader = request.headers.get('Authorization');
  if (authHeader && authHeader.toLowerCase().startsWith('bearer ')) {
    return authHeader.slice(7).trim();
  }
  const customHeader = request.headers.get('x-session-id') || request.headers.get('x-session-token');
  if (customHeader) return customHeader.trim();
  if (url) {
    const qToken = url.searchParams.get('sessionId') || url.searchParams.get('sessionToken');
    if (qToken) return qToken.trim();
  }
  return null;
}

function generateSessionId() {
  const array = new Uint8Array(24);
  crypto.getRandomValues(array);
  return 'sess_' + Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
}

function parseCookies(header) {
  const list = {};
  if (!header) return list;
  header.split(';').forEach(cookie => {
    let [name, ...rest] = cookie.split('=');
    name = name?.trim();
    if (!name) return;
    const value = rest.join('=').trim();
    list[name] = decodeURIComponent(value);
  });
  return list;
}

function handleCorsPreflight(request) {
  const origin = request.headers.get('Origin') || '*';
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-session-id, x-session-token, x-requested-with',
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Max-Age': '86400'
    }
  });
}

function jsonResponse(data, status = 200, request = null, extraHeaders = undefined) {
  const origin = request?.headers?.get('Origin') || '*';
  const headers = new Headers(extraHeaders || undefined);
  headers.set('Content-Type', 'application/json; charset=utf-8');
  headers.set('Access-Control-Allow-Origin', origin);
  headers.set('Access-Control-Allow-Credentials', 'true');
  headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');

  return new Response(JSON.stringify(data, null, 2), {
    status: status,
    headers: headers
  });
}

function htmlResponse(html) {
  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-cache',
      'x-edge-worker': 'zolexora-ims-edge'
    }
  });
}

function prefersHtml(request, url) {
  if (url.searchParams.has('json') || url.searchParams.get('format') === 'json') {
    return false;
  }
  if (url.searchParams.has('view') || url.searchParams.get('format') === 'html') {
    return true;
  }
  const accept = request.headers.get('accept') || '';
  return accept.includes('text/html');
}

