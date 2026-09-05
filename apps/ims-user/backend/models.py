from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class UserProfile(BaseModel):
    id: str
    org_id: str
    email: str
    name: str
    role: str
    scope_type: str = "ALL"
    assigned_location: str = "ALL"
    location_name: Optional[str] = None
    status: str = "Active"
    supabase_auth_id: Optional[str] = None


class ItemCreate(BaseModel):
    item_code: str
    description: str
    category: str
    category_code: Optional[str] = None
    uom: str = "Pcs"
    rate: float = 0.0
    tax_percent: float = 0.0
    min_stock: float = 0.0
    stock_s_001: float = 0.0
    stock_s_002: float = 0.0
    central_stock: float = 0.0
    preferred_supplier_code: Optional[str] = None
    status: str = "Active"


class ItemUpdate(BaseModel):
    description: Optional[str] = None
    category: Optional[str] = None
    category_code: Optional[str] = None
    uom: Optional[str] = None
    rate: Optional[float] = None
    tax_percent: Optional[float] = None
    min_stock: Optional[float] = None
    preferred_supplier_code: Optional[str] = None
    status: Optional[str] = None


class ItemResponse(BaseModel):
    item_code: str
    description: str
    category: str
    category_code: Optional[str] = None
    uom: str
    rate: float
    tax_percent: float
    min_stock: float
    stock_s_001: float
    stock_s_002: float
    central_stock: float
    total_stock: float
    total_valuation: float
    preferred_supplier_code: Optional[str] = None
    status: str
    last_updated: str


class SaleItem(BaseModel):
    item_code: str
    quantity: float
    rate: float
    tax_percent: float = 0.0


class SaleRequest(BaseModel):
    selling_point_code: str
    customer_name: Optional[str] = "Walk-in Customer"
    bill_no: Optional[str] = None
    items: List[SaleItem]
    payment_mode: str = "Cash"
    notes: Optional[str] = None


class DashboardMetrics(BaseModel):
    totalSKUs: int = 0
    totalStockValuation: float = 0.0
    lowStockAlerts: int = 0
    totalTodaySales: float = 0.0
    totalTodayPurchases: float = 0.0
    totalTodayExpenses: float = 0.0
    activeStores: int = 0
    activeSellingPoints: int = 0
    currency: str = "₹"
