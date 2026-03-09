"""
Equipment schemas - Pydantic models.
"""

from datetime import datetime
from typing import Any, Optional
from pydantic import BaseModel, Field


# ---- Products ----

class ProductResponse(BaseModel):
    id: int
    name: str
    slug: str
    price: float
    original_price: Optional[float] = None
    category: str
    description: Optional[str] = None
    specs: Optional[dict[str, Any]] = None
    rating: float = 0
    reviews_count: int = 0
    stock: int = 0
    images: Optional[list[str]] = None
    badge: Optional[str] = None
    free_shipping: bool = False
    seller: Optional[str] = None
    origin: Optional[str] = None

    model_config = {"from_attributes": True}


class ProductListResponse(BaseModel):
    items: list[ProductResponse]
    total: int
    page: int
    per_page: int


class ProductCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    slug: str = Field(..., min_length=1, max_length=255)
    price: float = Field(..., gt=0)
    original_price: Optional[float] = None
    category: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = None
    specs: Optional[dict[str, Any]] = None
    rating: float = 0
    reviews_count: int = 0
    stock: int = 0
    images: Optional[list[str]] = None
    badge: Optional[str] = None
    free_shipping: bool = False
    seller: Optional[str] = None
    origin: Optional[str] = None


# ---- Cart ----

class CartItemResponse(BaseModel):
    id: int
    product_id: int
    quantity: int
    product: ProductResponse

    model_config = {"from_attributes": True}


class CartAddRequest(BaseModel):
    product_id: int
    quantity: int = Field(1, ge=1, le=99)


class CartUpdateRequest(BaseModel):
    quantity: int = Field(..., ge=1, le=99)


# ---- Favorites ----

class FavoriteResponse(BaseModel):
    id: int
    product_id: int
    created_at: datetime

    model_config = {"from_attributes": True}


# ---- Orders ----

class OrderItemResponse(BaseModel):
    id: int
    product_id: Optional[int] = None
    product_name: str
    quantity: int
    unit_price: float

    model_config = {"from_attributes": True}


class OrderStatusHistoryResponse(BaseModel):
    id: int
    status: str
    description: Optional[str] = None
    occurred_at: datetime

    model_config = {"from_attributes": True}


class OrderResponse(BaseModel):
    id: int
    order_number: str
    status: str
    total: float
    shipping_address: Optional[dict[str, Any]] = None
    payment_method: Optional[str] = None
    tracking_code: Optional[str] = None
    estimated_delivery: Optional[datetime] = None
    created_at: datetime
    items: list[OrderItemResponse] = []
    status_history: list[OrderStatusHistoryResponse] = []

    model_config = {"from_attributes": True}


class OrderCreateRequest(BaseModel):
    shipping_address: Optional[dict[str, Any]] = None
    payment_method: Optional[str] = None
