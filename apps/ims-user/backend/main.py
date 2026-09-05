import os
import sys
from contextlib import asynccontextmanager
from typing import List, Optional
from fastapi import FastAPI, Depends, HTTPException, Query, status
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
    def now_utc_iso(): return datetime.now(timezone.utc).isoformat()
    def today_utc_str(): return datetime.now(timezone.utc).strftime("%Y-%m-%d")
    def generate_id(p="ID"): return f"{p}_12345"
    def create_jwt_token(p): return "dev_token"
    def verify_password(p, h): return True

try:
    from .db import db
    from .auth import get_current_user
    from .models import ItemCreate, ItemResponse, ItemUpdate, SaleRequest, StockAdjustRequest, DashboardMetrics, UserProfile
except ImportError:
    from db import db
    from auth import get_current_user
    from models import ItemCreate, ItemResponse, ItemUpdate, SaleRequest, StockAdjustRequest, DashboardMetrics, UserProfile


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


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
