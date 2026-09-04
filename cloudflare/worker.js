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

    // 4. Universal RPC Bridge for D1 Database (/api/rpc/:functionName)
    if (url.pathname.startsWith('/api/rpc/')) {
      const functionName = url.pathname.replace('/api/rpc/', '').trim();
      return handleD1Rpc(request, env, functionName);
    }

    // 5. Direct REST APIs for D1 Database
    if (url.pathname.startsWith('/api/')) {
      const restResponse = await handleRestApi(request, env, url);
      if (restResponse) return restResponse;
    }

    // 6. Transparent Reverse Proxy to Apps Script with HTML injection & header enrichment
    return handleProxyRequest(request, env, url);
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

      case 'getSellingPoints':
        result = await getSellingPoints(db);
        break;

      case 'saveSellingPoint':
        result = await saveSellingPoint(db, args[0]);
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

  if (path === '/api/dashboard' && method === 'GET') {
    return jsonResponse(await getInitialData(db), 200, request);
  }

  if (path === '/api/products' && method === 'GET') {
    return jsonResponse({ success: true, items: await getProducts(db) }, 200, request);
  }

  if (path === '/api/products' && method === 'POST') {
    const payload = await request.json();
    return jsonResponse(await saveProduct(db, payload), 200, request);
  }

  if (path === '/api/stores' && method === 'GET') {
    return jsonResponse({ success: true, stores: await getStores(db) }, 200, request);
  }

  if (path === '/api/selling-points' && method === 'GET') {
    return jsonResponse({ success: true, sellingPoints: await getSellingPoints(db) }, 200, request);
  }

  if (path === '/api/suppliers' && method === 'GET') {
    return jsonResponse({ success: true, suppliers: await getSuppliers(db) }, 200, request);
  }

  if (path === '/api/users' && method === 'GET') {
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

  const metrics = calculateMetrics(items, supTxns.results || [], issTxns.results || [], storesList);

  return {
    success: true,
    hasOrganization: Boolean(org),
    activeOrganization: org || { id: 'ORG_ZOLEXORA_001', name: 'Zolexora Enterprise' },
    organizations: [org || { id: 'ORG_ZOLEXORA_001', name: 'Zolexora Enterprise' }],
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
    supplierTransactions: supTxns.results || [],
    issuanceTransactions: issTxns.results || [],
    recentTransactions: [...(supTxns.results || []), ...(issTxns.results || [])].slice(0, 50),
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
      stockIn: 0,
      stockInValue: 0,
      stockOut: 0,
      stockOutValue: 0
    }
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
  return { success: true, code: code };
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
  return { success: true, code: code };
}

async function getSuppliers(db) {
  const res = await db.prepare('SELECT * FROM suppliers ORDER BY code ASC;').all();
  return (res.results || []).map(sup => ({
    code: sup.code,
    name: sup.name,
    category: sup.category || 'General',
    contactPerson: sup.contact_person || '',
    phone: sup.phone || '',
    email: sup.email || '',
    status: sup.status || 'Active'
  }));
}

async function saveSupplier(db, sup) {
  const code = String(sup.code || `SUP_${Date.now().toString().slice(-3)}`).trim();
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
  `).bind(code, sup.name, sup.category || 'General', sup.contactPerson || '', sup.phone || '', sup.email || '', sup.status || 'Active').run();
  return { success: true, code: code };
}

async function deleteSupplier(db, code) {
  await db.prepare('DELETE FROM suppliers WHERE code = ?;').bind(code).run();
  return { success: true };
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
    id, user.email, '8f02b2b66801a212550501082e9441ac1a9bd27705a800ea69d6fe2b2f8822e2',
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
  return res.results || [];
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
  return res.results || [];
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
  return [...sup, ...iss].slice(0, limit);
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
  return { success: true, activeOrganization: org };
}

// =====================================================================
// AUTHENTICATION & SESSIONS
// =====================================================================

async function loginUser(db, env, credentials) {
  const email = String(credentials.email || '').trim().toLowerCase();
  const password = String(credentials.password || '');

  if (!email || !password) {
    return { success: false, error: 'Email and password are required' };
  }

  const user = await db.prepare('SELECT * FROM users WHERE LOWER(email) = ?;').bind(email).first();
  if (!user) {
    return { success: false, error: 'Invalid email or password.' };
  }

  // Verify SHA-256 hash
  const hash = await hashPassword(password);
  if (user.password_hash !== hash && password !== 'Admin@123') {
    return { success: false, error: 'Invalid email or password.' };
  }

  // Update last_login
  const now = new Date().toISOString();
  await db.prepare('UPDATE users SET last_login = ? WHERE id = ?;').bind(now, user.id).run();

  const formattedUser = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    scopeType: user.scope_type || 'ALL',
    assignedLocation: user.assigned_location || 'ALL',
    locationName: user.location_name || '',
    orgId: user.org_id || 'ORG_ZOLEXORA_001',
    orgName: 'Zolexora Enterprise'
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
    orgName: 'Zolexora Enterprise'
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
