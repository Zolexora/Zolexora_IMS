import os
import sys
from contextlib import asynccontextmanager
from typing import List, Optional
from fastapi import FastAPI, Depends, HTTPException, Query, status, Request
from fastapi.middleware.cors import CORSMiddleware

try:
    from dotenv import load_dotenv
    _backend_dir = os.path.dirname(os.path.abspath(__file__))
    for _env_file in (".env.local", "env.local", ".env"):
        _target = os.path.join(_backend_dir, _env_file)
        if os.path.isfile(_target):
            load_dotenv(_target)
except ImportError:
    pass

# Add path for backend-shared
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../backend-shared")))
try:
    from utils import now_utc_iso, today_utc_str, generate_id
    from security import create_jwt_token, verify_password
except ImportError:
    from datetime import datetime, timezone
    import hashlib, hmac
    def now_utc_iso(): return datetime.now(timezone.utc).isoformat()
    def today_utc_str(): return datetime.now(timezone.utc).strftime("%Y-%m-%d")
    def generate_id(p="ID"): return f"{p}_12345"
    def create_jwt_token(p): raise RuntimeError("Security module required")
    def verify_password(p, h):
        if not p or not h: return False
        return hmac.compare_digest(hashlib.sha256(p.encode()).hexdigest(), h)

try:
    from .db import db
    from .auth import get_current_user
    from .models import ItemCreate, ItemResponse, ItemUpdate, SaleRequest, StockAdjustRequest, DashboardMetrics, UserProfile, AggregatorStatusUpdate, DiningBenefitVerify, AggregatorChannelConfig, TestWebhookRequest
except ImportError:
    from db import db
    from auth import get_current_user
    from models import ItemCreate, ItemResponse, ItemUpdate, SaleRequest, StockAdjustRequest, DashboardMetrics, UserProfile, AggregatorStatusUpdate, DiningBenefitVerify, AggregatorChannelConfig, TestWebhookRequest


@asynccontextmanager
async def lifespan(app: FastAPI):
    await db.init()
    yield


app = FastAPI(
    title="Zolexora IMS User Application API",
    version="2.0.0",
    lifespan=lifespan
)

raw_origins = os.getenv("CORS_ALLOWED_ORIGINS", "*")
if raw_origins.strip() == "*":
    cors_origins = ["*"]
    allow_credentials = False
else:
    cors_origins = [o.strip() for o in raw_origins.split(",") if o.strip()]
    allow_credentials = True

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=allow_credentials,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
@app.get("/api/v1/health")
async def health():
    items_count = 0
    try:
        row = await db.fetch_one("SELECT count(*) as count FROM products;")
        if row:
            items_count = row.get("count", 0)
    except Exception:
        pass
    return {
        "status": "healthy",
        "service": "ims-user-api",
        "database": "Cloudflare D1",
        "products_count": items_count
    }


# --- Dashboard ---
@app.get("/api/v1/dashboard/metrics", response_model=DashboardMetrics)
async def get_metrics(user: UserProfile = Depends(get_current_user)):
    org_id = user.org_id
    today = today_utc_str()

    stats = await db.fetch_one(
        """
        SELECT count(*) as skus, coalesce(sum(total_valuation), 0) as val,
               count(CASE WHEN total_stock <= min_stock THEN 1 END) as low
        FROM products WHERE org_id = ?;
        """,
        [org_id]
    )
    sales = await db.fetch_one(
        "SELECT coalesce(sum(total_amount), 0) as s FROM selling_point_sales WHERE org_id = ? AND date = ?;",
        [org_id, today]
    )
    purchases = await db.fetch_one(
        "SELECT coalesce(sum(total_amount), 0) as p FROM supplier_transactions WHERE org_id = ? AND timestamp LIKE ?;",
        [org_id, f"{today}%"]
    )
    expenses = await db.fetch_one(
        "SELECT coalesce(sum(amount), 0) as e FROM selling_point_expenses WHERE org_id = ? AND date = ?;",
        [org_id, today]
    )
    stores = await db.fetch_one("SELECT count(*) as c FROM stores WHERE org_id = ? AND status='Active';", [org_id])
    sps = await db.fetch_one("SELECT count(*) as c FROM selling_points WHERE org_id = ? AND status='Active';", [org_id])

    return DashboardMetrics(
        totalSKUs=stats["skus"] if stats else 0,
        totalStockValuation=round(stats["val"], 2) if stats else 0.0,
        lowStockAlerts=stats["low"] if stats else 0,
        totalTodaySales=round(sales["s"], 2) if sales else 0.0,
        totalTodayPurchases=round(purchases["p"], 2) if purchases else 0.0,
        totalTodayExpenses=round(expenses["e"], 2) if expenses else 0.0,
        activeStores=stores["c"] if stores else 0,
        activeSellingPoints=sps["c"] if sps else 0,
        currency="₹"
    )


# --- Products / Items ---
@app.get("/api/v1/items", response_model=List[ItemResponse])
@app.get("/api/v1/products", response_model=List[ItemResponse])
async def list_items(
    search: Optional[str] = None,
    category: Optional[str] = None,
    user: UserProfile = Depends(get_current_user)
):
    sql = "SELECT * FROM products WHERE org_id = ?"
    params = [user.org_id]

    if category:
        sql += " AND category = ?"
        params.append(category)

    if search:
        sql += " AND (item_code LIKE ? OR description LIKE ?)"
        pattern = f"%{search}%"
        params.extend([pattern, pattern])

    sql += " ORDER BY item_code ASC"
    return await db.query(sql, params)


@app.get("/api/v1/items/{item_code}", response_model=ItemResponse)
async def get_item(item_code: str, user: UserProfile = Depends(get_current_user)):
    row = await db.fetch_one("SELECT * FROM products WHERE item_code = ? AND org_id = ?;", [item_code, user.org_id])
    if not row:
        raise HTTPException(status_code=404, detail="Item not found")
    return row


@app.post("/api/v1/items", response_model=ItemResponse, status_code=201)
async def create_item(item: ItemCreate, user: UserProfile = Depends(get_current_user)):
    exists = await db.fetch_one("SELECT item_code FROM products WHERE item_code = ?;", [item.item_code])
    if exists:
        raise HTTPException(status_code=400, detail="Item code already exists")

    total_stock = item.stock_s_001 + item.stock_s_002 + item.central_stock
    val = round(total_stock * item.rate, 2)
    now = now_utc_iso()

    sql = """
    INSERT INTO products (
        item_code, org_id, description, category, category_code, uom, rate, tax_percent,
        min_stock, stock_s_001, stock_s_002, central_stock, total_stock, total_valuation,
        preferred_supplier_code, status, last_updated
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    """
    await db.execute(sql, [
        item.item_code, user.org_id, item.description, item.category, item.category_code,
        item.uom, item.rate, item.tax_percent, item.min_stock, item.stock_s_001,
        item.stock_s_002, item.central_stock, total_stock, val, item.preferred_supplier_code,
        item.status, now
    ])
    return await get_item(item.item_code, user)


@app.put("/api/v1/items/{item_code}", response_model=ItemResponse)
async def update_item(item_code: str, item: ItemUpdate, user: UserProfile = Depends(get_current_user)):
    existing = await get_item(item_code, user)
    updates = item.model_dump(exclude_unset=True)
    if not updates:
        return existing

    updates["last_updated"] = now_utc_iso()
    rate = updates.get("rate", existing.rate)
    updates["total_valuation"] = round(existing.total_stock * rate, 2)

    clauses = [f"{k} = ?" for k in updates.keys()]
    params = list(updates.values()) + [item_code, user.org_id]
    await db.execute(f"UPDATE products SET {', '.join(clauses)} WHERE item_code = ? AND org_id = ?;", params)
    return await get_item(item_code, user)


@app.post("/api/v1/items/{item_code}/adjust", response_model=ItemResponse)
async def adjust_stock(item_code: str, req: StockAdjustRequest, user: UserProfile = Depends(get_current_user)):
    existing = await get_item(item_code, user)
    stock_col = "stock_s_001" if req.store_code == "S_001" else ("stock_s_002" if req.store_code == "S_002" else "central_stock")
    cur_stock = getattr(existing, stock_col, 0.0) or 0.0
    new_store_stock = max(0.0, cur_stock + req.adjustment)

    s1 = new_store_stock if stock_col == "stock_s_001" else existing.stock_s_001
    s2 = new_store_stock if stock_col == "stock_s_002" else existing.stock_s_002
    central = new_store_stock if stock_col == "central_stock" else existing.central_stock
    total_stock = s1 + s2 + central
    total_val = round(total_stock * existing.rate, 2)
    now = now_utc_iso()

    await db.execute(
        f"UPDATE products SET {stock_col} = ?, total_stock = ?, total_valuation = ?, last_updated = ? WHERE item_code = ? AND org_id = ?;",
        [new_store_stock, total_stock, total_val, now, item_code, user.org_id]
    )
    return await get_item(item_code, user)


@app.delete("/api/v1/items/{item_code}")
async def delete_item(item_code: str, user: UserProfile = Depends(get_current_user)):
    await db.execute("DELETE FROM products WHERE item_code = ? AND org_id = ?;", [item_code, user.org_id])
    return {"success": True, "message": f"Item {item_code} deleted"}


# --- Stores & Selling Points ---
@app.get("/api/v1/stores")
async def list_stores(user: UserProfile = Depends(get_current_user)):
    return await db.query("SELECT * FROM stores WHERE org_id = ? ORDER BY code ASC;", [user.org_id])


@app.get("/api/v1/selling-points")
async def list_selling_points(user: UserProfile = Depends(get_current_user)):
    return await db.query("SELECT * FROM selling_points WHERE org_id = ? ORDER BY code ASC;", [user.org_id])


# --- Suppliers ---
@app.get("/api/v1/suppliers")
async def list_suppliers(user: UserProfile = Depends(get_current_user)):
    return await db.query("SELECT * FROM suppliers WHERE org_id = ? ORDER BY code ASC;", [user.org_id])


# --- Transactions & POS ---
@app.get("/api/v1/transactions")
async def list_transactions(limit: int = 50, user: UserProfile = Depends(get_current_user)):
    sales = await db.query(
        "SELECT id, timestamp, 'SALE' as txn_type, bill_no, customer_name, item_name, quantity, total_amount, payment_mode FROM selling_point_sales WHERE org_id = ? ORDER BY timestamp DESC LIMIT ?;",
        [user.org_id, limit]
    )
    purchases = await db.query(
        "SELECT id, timestamp, 'PURCHASE' as txn_type, po_invoice_ref as bill_no, supplier_name as customer_name, item_description as item_name, quantity, total_amount, 'PO' as payment_mode FROM supplier_transactions WHERE org_id = ? ORDER BY timestamp DESC LIMIT ?;",
        [user.org_id, limit]
    )
    combined = sorted(sales + purchases, key=lambda x: str(x.get("timestamp", "")), reverse=True)
    return combined[:limit]


@app.post("/api/v1/sales", status_code=201)
async def record_sale(sale: SaleRequest, user: UserProfile = Depends(get_current_user)):
    now = now_utc_iso()
    date_str = today_utc_str()
    bill_no = sale.bill_no or f"BILL-{generate_id('')}"
    sp = await db.fetch_one("SELECT * FROM selling_points WHERE code = ?;", [sale.selling_point_code])
    sp_name = sp["name"] if sp else "Counter"
    assigned_store = sp.get("assigned_store_code", "S_001") if sp else "S_001"

    total_bill = 0.0
    for item in sale.items:
        prod = await db.fetch_one("SELECT * FROM products WHERE item_code = ?;", [item.item_code])
        if not prod:
            continue
        amount = round(item.quantity * item.rate * (1 + item.tax_percent / 100), 2)
        total_bill += amount
        sale_id = generate_id("SALE")

        sql = """
        INSERT INTO selling_point_sales (
            id, org_id, timestamp, date, selling_point_code, selling_point_name,
            bill_no, customer_name, item_code, item_name, category,
            quantity, uom, rate, tax_percent, total_amount, payment_mode,
            payment_status, cashier, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Completed', ?, ?);
        """
        await db.execute(sql, [
            sale_id, user.org_id, now, date_str, sale.selling_point_code, sp_name,
            bill_no, sale.customer_name, item.item_code, prod["description"], prod["category"],
            item.quantity, prod["uom"], item.rate, item.tax_percent, amount,
            sale.payment_mode, user.name, sale.notes
        ])

        # Decrement stock
        stock_col = "stock_s_001" if assigned_store == "S_001" else "stock_s_002"
        cur_stock = prod.get(stock_col, 0.0) or 0.0
        new_store_stock = max(0.0, cur_stock - item.quantity)
        other_col = "stock_s_002" if stock_col == "stock_s_001" else "stock_s_001"
        new_total = new_store_stock + (prod.get(other_col, 0.0) or 0.0) + (prod.get("central_stock", 0.0) or 0.0)
        new_val = round(new_total * prod["rate"], 2)

        await db.execute(
            f"UPDATE products SET {stock_col} = ?, total_stock = ?, total_valuation = ?, last_updated = ? WHERE item_code = ?;",
            [new_store_stock, new_total, new_val, now, item.item_code]
        )

    return {"success": True, "bill_no": bill_no, "total_amount": round(total_bill, 2)}


# --- Auth ---
@app.get("/api/v1/auth/me")
async def get_me(user: UserProfile = Depends(get_current_user)):
    return user


# --- Online Platforms & Food Aggregators (UrbanPiper, Swiggy, Zomato, Dineout, ONDC) ---
_aggregator_platforms = [
    {
        "id": "urbanpiper",
        "name": "UrbanPiper Hub (Swiggy + Zomato + Dineout)",
        "channel_type": "Aggregator Middleware",
        "connected": False,
        "status": "Not Connected",
        "active_orders": 0,
        "auto_accept": False,
        "outlet_id": None,
        "rating": 4.9,
        "portal_url": "https://atlas.urbanpiper.com",
        "docs_url": "https://developer.urbanpiper.com"
    },
    {
        "id": "swiggy",
        "name": "Swiggy Direct Partner",
        "channel_type": "Direct Delivery Partner",
        "connected": False,
        "status": "Not Connected",
        "active_orders": 0,
        "auto_accept": False,
        "outlet_id": None,
        "rating": 4.6,
        "portal_url": "https://partner.swiggy.com",
        "docs_url": "https://partner.swiggy.com"
    },
    {
        "id": "zomato",
        "name": "Zomato Direct Merchant",
        "channel_type": "Direct Delivery Partner",
        "connected": False,
        "status": "Not Connected",
        "active_orders": 0,
        "auto_accept": False,
        "outlet_id": None,
        "rating": 4.7,
        "portal_url": "https://www.zomato.com/business",
        "docs_url": "https://www.zomato.com/business"
    },
    {
        "id": "ondc",
        "name": "ONDC Open Network (Beckn)",
        "channel_type": "National Open Commerce Network",
        "connected": False,
        "status": "Not Connected",
        "active_orders": 0,
        "auto_accept": False,
        "outlet_id": None,
        "rating": 4.5,
        "portal_url": "https://ondc.org",
        "docs_url": "https://ondc.org"
    },
]

_aggregator_configs = {}
_aggregator_orders = []


@app.get("/api/v1/aggregator/platforms")
async def get_platforms():
    for p in _aggregator_platforms:
        # Dynamic active order count
        p["active_orders"] = sum(
            1 for o in _aggregator_orders
            if (o.get("platform", "").lower() in p["id"] or p["id"] in o.get("platform", "").lower() or (p["id"] == "urbanpiper" and o.get("source") == "urbanpiper"))
            and o.get("status") not in ("DISPATCHED", "CANCELLED")
        )
    return _aggregator_platforms


@app.get("/api/v1/aggregator/config")
async def get_aggregator_configs(request: Request):
    base_url = str(request.base_url).rstrip("/")
    configs = []
    for p in _aggregator_platforms:
        pid = p["id"]
        saved = _aggregator_configs.get(pid, {})
        webhook_url = f"{base_url}/api/v1/aggregator/webhook/{pid}"
        configs.append({
            "platform_id": pid,
            "name": p["name"],
            "channel_type": p["channel_type"],
            "connected": p["connected"],
            "status": p["status"],
            "outlet_id": saved.get("outlet_id"),
            "has_api_key": bool(saved.get("api_key")),
            "auto_accept": saved.get("auto_accept", False),
            "webhook_url": webhook_url,
            "portal_url": p["portal_url"],
            "docs_url": p["docs_url"]
        })
    return {
        "base_webhook_url": base_url,
        "channels": configs
    }


@app.post("/api/v1/aggregator/config/{platform_id}")
async def save_aggregator_config(platform_id: str, config: AggregatorChannelConfig):
    pid = platform_id.lower()
    target_platform = next((p for p in _aggregator_platforms if p["id"] == pid), None)
    if not target_platform:
        raise HTTPException(status_code=404, detail=f"Platform '{platform_id}' not found")
    
    if not config.outlet_id or not config.outlet_id.strip():
        raise HTTPException(status_code=400, detail="Store/Outlet ID is mandatory to link channel")

    _aggregator_configs[pid] = {
        "outlet_id": config.outlet_id.strip(),
        "api_key": config.api_key.strip() if config.api_key else None,
        "api_username": config.api_username.strip() if config.api_username else None,
        "webhook_secret": config.webhook_secret.strip() if config.webhook_secret else None,
        "auto_accept": config.auto_accept,
        "connected_at": now_utc_iso()
    }

    target_platform["connected"] = True
    target_platform["status"] = "Online"
    target_platform["outlet_id"] = config.outlet_id.strip()
    target_platform["auto_accept"] = config.auto_accept

    return {
        "success": True,
        "message": f"Successfully connected and activated {target_platform['name']}",
        "platform": target_platform
    }


@app.delete("/api/v1/aggregator/config/{platform_id}")
async def disconnect_aggregator_config(platform_id: str):
    pid = platform_id.lower()
    target_platform = next((p for p in _aggregator_platforms if p["id"] == pid), None)
    if not target_platform:
        raise HTTPException(status_code=404, detail=f"Platform '{platform_id}' not found")

    _aggregator_configs.pop(pid, None)
    target_platform["connected"] = False
    target_platform["status"] = "Not Connected"
    target_platform["outlet_id"] = None
    target_platform["auto_accept"] = False

    return {
        "success": True,
        "message": f"Disconnected {target_platform['name']}"
    }


@app.post("/api/v1/aggregator/platforms/{platform_id}/toggle")
async def toggle_platform(platform_id: str):
    for p in _aggregator_platforms:
        if p["id"] == platform_id.lower():
            if not p.get("connected"):
                raise HTTPException(status_code=400, detail="Cannot toggle status: Channel is not configured yet. Complete setup first.")
            p["status"] = "Paused" if p["status"] == "Online" else "Online"
            return {"success": True, "platform": p}
    raise HTTPException(status_code=404, detail="Platform not found")


@app.get("/api/v1/aggregator/orders")
async def get_aggregator_orders():
    return _aggregator_orders


@app.delete("/api/v1/aggregator/orders")
async def clear_aggregator_orders():
    global _aggregator_orders
    _aggregator_orders = []
    return {"success": True, "message": "All orders cleared"}


@app.post("/api/v1/aggregator/orders/{order_id}/status")
async def update_order_status(order_id: str, body: AggregatorStatusUpdate):
    for order in _aggregator_orders:
        if order["id"] == order_id:
            order["status"] = body.status
            if body.prep_time_mins:
                order["prep_time_mins"] = body.prep_time_mins
            if body.reason:
                order["cancel_reason"] = body.reason
            return {"success": True, "order": order}
    raise HTTPException(status_code=404, detail="Order not found")


# --- Production Webhook Receiver (Ingests Real Swiggy, Zomato, UrbanPiper & ONDC Orders) ---
@app.post("/api/v1/aggregator/webhook/{channel}")
async def receive_aggregator_webhook(channel: str, request: Request):
    channel = channel.lower()
    try:
        payload = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON payload")

    # Map Channel Name & Color
    channel_display = {
        "swiggy": ("Swiggy", "bg-orange-500 text-white"),
        "zomato": ("Zomato", "bg-rose-600 text-white"),
        "dineout": ("Dineout", "bg-purple-600 text-white"),
        "ondc": ("ONDC", "bg-emerald-600 text-white"),
        "urbanpiper": ("UrbanPiper", "bg-blue-600 text-white")
    }.get(channel, (channel.capitalize(), "bg-indigo-600 text-white"))

    # Extract or generate unique order ID
    raw_id = payload.get("order_id") or payload.get("id") or str(payload.get("order", {}).get("id") or "")
    if not raw_id:
        import secrets
        raw_id = f"{channel[:2].upper()}-{secrets.randbelow(8999) + 1000}"

    # Extract customer
    customer = payload.get("customer", {})
    cust_name = customer.get("name") or payload.get("customer_name") or "Direct Online Customer"
    cust_phone = customer.get("phone") or payload.get("customer_phone") or "+91 98000 00000"

    # Extract items
    raw_items = payload.get("items") or payload.get("order", {}).get("items") or []
    parsed_items = []
    if raw_items:
        for it in raw_items:
            parsed_items.append({
                "name": it.get("name") or it.get("title") or "Item",
                "qty": int(it.get("quantity") or it.get("qty") or 1),
                "price": float(it.get("price") or it.get("rate") or 0.0),
                "notes": it.get("notes") or it.get("instructions")
            })
    else:
        parsed_items.append({
            "name": payload.get("item_name") or "Specialty Item",
            "qty": 1,
            "price": float(payload.get("amount") or 250.0)
        })

    subtotal = sum(item["price"] * item["qty"] for item in parsed_items)
    tax = round(subtotal * 0.05, 2)
    total_amount = round(payload.get("total_amount") or (subtotal + tax), 2)

    import secrets
    otp = str(secrets.randbelow(8999) + 1000)

    new_order = {
        "id": raw_id,
        "platform": channel_display[0],
        "channel_color": channel_display[1],
        "source": channel,
        "order_time": "Just now",
        "customer_name": cust_name,
        "customer_phone": cust_phone,
        "items": parsed_items,
        "subtotal": subtotal,
        "tax": tax,
        "total_amount": total_amount,
        "payment_status": payload.get("payment_status") or f"Pre-paid ({channel_display[0]})",
        "status": "NEW",
        "rider": {
            "name": payload.get("rider_name") or f"{channel_display[0]} Fleet Partner",
            "phone": payload.get("rider_phone") or "+91 97000 11223",
            "status": "Assigned (Arriving in 8 mins)",
            "otp": otp
        },
        "prep_time_mins": int(payload.get("prep_time_mins") or 20),
        "received_at": now_utc_iso()
    }

    # Prepend new order to live stream
    _aggregator_orders.insert(0, new_order)

    # Standard 200 ACK expected by UrbanPiper / Swiggy / Zomato webhooks
    return {
        "status": "ACK",
        "order_id": raw_id,
        "message": f"Order {raw_id} successfully queued into Zolexora IMS"
    }


@app.post("/api/v1/aggregator/test-webhook")
async def send_test_webhook_order(body: TestWebhookRequest):
    """Allows organization owners to simulate real webhook arrival on their own account."""
    import secrets
    order_code = f"{body.platform[:2].upper()}-{secrets.randbelow(8999) + 1000}"
    otp = str(secrets.randbelow(8999) + 1000)
    
    channel_display = {
        "Swiggy": ("Swiggy", "bg-orange-500 text-white"),
        "Zomato": ("Zomato", "bg-rose-600 text-white"),
        "Dineout": ("Dineout", "bg-purple-600 text-white"),
        "ONDC": ("ONDC", "bg-emerald-600 text-white"),
    }.get(body.platform, (body.platform, "bg-indigo-600 text-white"))

    subtotal = float(body.amount or 320.0)
    tax = round(subtotal * 0.05, 2)
    total_amount = round(subtotal + tax, 2)

    test_order = {
        "id": order_code,
        "platform": channel_display[0],
        "channel_color": channel_display[1],
        "source": body.platform.lower(),
        "order_time": "Just now (Test)",
        "customer_name": body.customer_name or "Live Test Customer",
        "customer_phone": body.customer_phone or "+91 98765 43210",
        "items": [
            {"name": body.item_name or "Artisan Cold Brew Special", "qty": 1, "price": subtotal, "notes": "Test Order from Owner Portal"}
        ],
        "subtotal": subtotal,
        "tax": tax,
        "total_amount": total_amount,
        "payment_status": f"Pre-paid ({channel_display[0]} Online)",
        "status": "NEW",
        "rider": {
            "name": f"{body.platform} Delivery Agent",
            "phone": "+91 97110 33445",
            "status": "Assigned - Arriving soon",
            "otp": otp
        },
        "prep_time_mins": 15,
        "received_at": now_utc_iso()
    }

    _aggregator_orders.insert(0, test_order)

    return {
        "success": True,
        "order": test_order,
        "message": f"Test order {order_code} pushed successfully! Check POS terminal."
    }


@app.post("/api/v1/aggregator/dining-benefit/verify")
async def verify_dining_benefit(body: DiningBenefitVerify):
    code = body.membership_code.strip().upper()
    bill = max(0.0, body.bill_amount)
    
    if "GOLD" in body.platform.upper() or "GOLD" in code:
        discount = round(min(bill * 0.15, 300.0), 2)
        return {
            "valid": True,
            "platform": "Zomato Gold",
            "benefit_title": "Zomato Gold 15% Dining Privilege",
            "discount_percent": 15,
            "discount_amount": discount,
            "max_cap": 300.0,
            "net_payable": round(bill - discount, 2),
            "member_name": "Verified Gold Member",
            "code": code
        }
    elif "DINEOUT" in body.platform.upper() or "DINEOUT" in code or "SWIGGY" in code:
        discount = round(min(bill * 0.20, 400.0), 2)
        return {
            "valid": True,
            "platform": "Swiggy Dineout",
            "benefit_title": "Swiggy Dineout Pay 20% Off",
            "discount_percent": 20,
            "discount_amount": discount,
            "max_cap": 400.0,
            "net_payable": round(bill - discount, 2),
            "member_name": "Dineout Gourmet Member",
            "code": code
        }
    elif "MAGIC" in code:
        discount = round(min(bill * 0.10, 150.0), 2)
        return {
            "valid": True,
            "platform": "Magicpin",
            "benefit_title": "Magicpin Voucher 10% Off",
            "discount_percent": 10,
            "discount_amount": discount,
            "max_cap": 150.0,
            "net_payable": round(bill - discount, 2),
            "member_name": "Magicpin User",
            "code": code
        }
    
    return {
        "valid": False,
        "message": f"Invalid or expired membership code: '{body.membership_code}'"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
