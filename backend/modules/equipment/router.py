"""
Equipment Router - Marketplace de equipamentos agrícolas.
"""

import logging
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, delete

from backend.core.database import get_db
from backend.models.user import User
from backend.api.dependencies.auth import get_current_user, get_optional_current_user, get_current_superuser
from backend.modules.equipment.models import (
    Product, CartItem, Favorite, Order, OrderItem, OrderStatusHistory,
)
from backend.modules.equipment.schemas import (
    ProductResponse, ProductListResponse, ProductCreate,
    CartItemResponse, CartAddRequest, CartUpdateRequest,
    FavoriteResponse,
    OrderResponse, OrderCreateRequest,
)

logger = logging.getLogger(__name__)

router = APIRouter()


# ============================================
# PRODUCTS
# ============================================

@router.get("/products", response_model=ProductListResponse)
async def list_products(
    category: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    sort: Optional[str] = Query("name", description="name, price, -price, rating"),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    """Listar produtos (público)."""
    query = select(Product).where(Product.is_active == True)
    count_query = select(func.count(Product.id)).where(Product.is_active == True)

    if category:
        query = query.where(Product.category == category)
        count_query = count_query.where(Product.category == category)

    if search:
        search_filter = Product.name.ilike(f"%{search}%")
        query = query.where(search_filter)
        count_query = count_query.where(search_filter)

    # Sort
    if sort == "price":
        query = query.order_by(Product.price.asc())
    elif sort == "-price":
        query = query.order_by(Product.price.desc())
    elif sort == "rating":
        query = query.order_by(Product.rating.desc())
    else:
        query = query.order_by(Product.name.asc())

    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    query = query.offset((page - 1) * per_page).limit(per_page)
    result = await db.execute(query)
    items = result.scalars().all()

    return ProductListResponse(
        items=[ProductResponse.model_validate(p) for p in items],
        total=total,
        page=page,
        per_page=per_page,
    )


@router.get("/products/{product_id}", response_model=ProductResponse)
async def get_product(
    product_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Detalhe de um produto (público)."""
    result = await db.execute(select(Product).where(Product.id == product_id, Product.is_active == True))
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="Produto não encontrado")
    return product


@router.post("/products", response_model=ProductResponse, status_code=status.HTTP_201_CREATED)
async def create_product(
    data: ProductCreate,
    current_user: User = Depends(get_current_superuser),
    db: AsyncSession = Depends(get_db),
):
    """Criar produto (admin)."""
    product = Product(**data.model_dump())
    db.add(product)
    await db.flush()
    await db.refresh(product)
    return product


# ============================================
# CART
# ============================================

@router.get("/cart", response_model=list[CartItemResponse])
async def get_cart(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Obter carrinho do usuário."""
    result = await db.execute(
        select(CartItem).where(CartItem.user_id == current_user.id).order_by(CartItem.created_at.desc())
    )
    return result.scalars().all()


@router.post("/cart", response_model=CartItemResponse, status_code=status.HTTP_201_CREATED)
async def add_to_cart(
    data: CartAddRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Adicionar item ao carrinho."""
    # Verify product exists
    product = await db.execute(select(Product).where(Product.id == data.product_id, Product.is_active == True))
    if not product.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Produto não encontrado")

    # Check if already in cart
    existing = await db.execute(
        select(CartItem).where(
            CartItem.user_id == current_user.id,
            CartItem.product_id == data.product_id,
        )
    )
    item = existing.scalar_one_or_none()
    if item:
        item.quantity += data.quantity
    else:
        item = CartItem(user_id=current_user.id, product_id=data.product_id, quantity=data.quantity)
        db.add(item)

    await db.flush()
    await db.refresh(item)
    return item


@router.put("/cart/{item_id}", response_model=CartItemResponse)
async def update_cart_item(
    item_id: int,
    data: CartUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Atualizar quantidade de item no carrinho."""
    result = await db.execute(
        select(CartItem).where(CartItem.id == item_id, CartItem.user_id == current_user.id)
    )
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Item não encontrado no carrinho")
    item.quantity = data.quantity
    await db.flush()
    await db.refresh(item)
    return item


@router.delete("/cart/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_from_cart(
    item_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Remover item do carrinho."""
    result = await db.execute(
        select(CartItem).where(CartItem.id == item_id, CartItem.user_id == current_user.id)
    )
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Item não encontrado no carrinho")
    await db.delete(item)


@router.delete("/cart", status_code=status.HTTP_204_NO_CONTENT)
async def clear_cart(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Limpar carrinho."""
    await db.execute(delete(CartItem).where(CartItem.user_id == current_user.id))


# ============================================
# FAVORITES
# ============================================

@router.get("/favorites", response_model=list[FavoriteResponse])
async def get_favorites(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Listar favoritos."""
    result = await db.execute(
        select(Favorite).where(Favorite.user_id == current_user.id).order_by(Favorite.created_at.desc())
    )
    return result.scalars().all()


@router.post("/favorites/{product_id}", response_model=FavoriteResponse, status_code=status.HTTP_201_CREATED)
async def toggle_favorite(
    product_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Adicionar/remover favorito (toggle)."""
    existing = await db.execute(
        select(Favorite).where(Favorite.user_id == current_user.id, Favorite.product_id == product_id)
    )
    fav = existing.scalar_one_or_none()
    if fav:
        await db.delete(fav)
        await db.flush()
        # Return a "removed" response
        raise HTTPException(status_code=status.HTTP_204_NO_CONTENT)

    fav = Favorite(user_id=current_user.id, product_id=product_id)
    db.add(fav)
    await db.flush()
    await db.refresh(fav)
    return fav


@router.delete("/favorites/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_favorite(
    product_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Remover favorito."""
    result = await db.execute(
        select(Favorite).where(Favorite.user_id == current_user.id, Favorite.product_id == product_id)
    )
    fav = result.scalar_one_or_none()
    if fav:
        await db.delete(fav)


# ============================================
# ORDERS
# ============================================

@router.post("/orders", response_model=OrderResponse, status_code=status.HTTP_201_CREATED)
async def create_order(
    data: OrderCreateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Criar pedido a partir do carrinho."""
    # Get cart items
    cart_result = await db.execute(
        select(CartItem).where(CartItem.user_id == current_user.id)
    )
    cart_items = cart_result.scalars().all()
    if not cart_items:
        raise HTTPException(status_code=400, detail="Carrinho vazio")

    # Generate order number
    import random
    year = datetime.now(timezone.utc).year
    seq = random.randint(1000, 9999)
    order_number = f"PED-{year}-{seq:04d}"

    # Calculate total
    total = sum(item.product.price * item.quantity for item in cart_items)

    # Create order
    order = Order(
        user_id=current_user.id,
        order_number=order_number,
        status="confirmado",
        total=total,
        shipping_address=data.shipping_address,
        payment_method=data.payment_method,
    )
    db.add(order)
    await db.flush()

    # Create order items
    for cart_item in cart_items:
        order_item = OrderItem(
            order_id=order.id,
            product_id=cart_item.product_id,
            product_name=cart_item.product.name,
            quantity=cart_item.quantity,
            unit_price=cart_item.product.price,
        )
        db.add(order_item)

    # Create initial status history
    history = OrderStatusHistory(
        order_id=order.id,
        status="confirmado",
        description="Pedido confirmado com sucesso",
    )
    db.add(history)

    # Clear cart
    await db.execute(delete(CartItem).where(CartItem.user_id == current_user.id))

    await db.flush()
    await db.refresh(order)
    return order


@router.get("/orders", response_model=list[OrderResponse])
async def list_orders(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Listar pedidos do usuário."""
    result = await db.execute(
        select(Order).where(Order.user_id == current_user.id).order_by(Order.created_at.desc())
    )
    return result.scalars().all()


@router.get("/orders/{order_id}", response_model=OrderResponse)
async def get_order(
    order_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Detalhe de um pedido."""
    result = await db.execute(
        select(Order).where(Order.id == order_id, Order.user_id == current_user.id)
    )
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Pedido não encontrado")
    return order
