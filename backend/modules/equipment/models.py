"""
Equipment models - Marketplace de equipamentos agrícolas.
"""

from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Text, JSON, UniqueConstraint
from sqlalchemy.orm import relationship

from backend.core.database import Base


class Product(Base):
    """Produto do marketplace."""

    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    slug = Column(String(255), unique=True, index=True, nullable=False)
    price = Column(Float, nullable=False)
    original_price = Column(Float, nullable=True)
    category = Column(String(100), nullable=False, index=True)
    description = Column(Text, nullable=True)
    specs = Column(JSON, nullable=True)  # {key: value} pairs
    rating = Column(Float, default=0)
    reviews_count = Column(Integer, default=0)
    stock = Column(Integer, default=0)
    images = Column(JSON, nullable=True)  # [url1, url2, ...]
    badge = Column(String(50), nullable=True)  # "Mais Vendido", "Novo", etc.
    free_shipping = Column(Boolean, default=False)
    seller = Column(String(255), nullable=True)
    origin = Column(String(100), nullable=True)
    is_active = Column(Boolean, default=True)

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    def __repr__(self):
        return f"<Product(id={self.id}, name='{self.name}')>"


class CartItem(Base):
    """Item no carrinho do usuário."""

    __tablename__ = "cart_items"
    __table_args__ = (UniqueConstraint("user_id", "product_id", name="uq_cart_user_product"),)

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    product_id = Column(Integer, ForeignKey("products.id", ondelete="CASCADE"), nullable=False)
    quantity = Column(Integer, nullable=False, default=1)

    product = relationship("Product", lazy="joined")

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class Favorite(Base):
    """Produto favorito do usuário."""

    __tablename__ = "favorites"
    __table_args__ = (UniqueConstraint("user_id", "product_id", name="uq_fav_user_product"),)

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    product_id = Column(Integer, ForeignKey("products.id", ondelete="CASCADE"), nullable=False)

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class Order(Base):
    """Pedido de compra."""

    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    order_number = Column(String(50), unique=True, nullable=False, index=True)
    status = Column(String(50), nullable=False, default="confirmado")  # confirmado, producao, inspecao, embarque, transito, desembaraco, entregue
    total = Column(Float, nullable=False)
    shipping_address = Column(JSON, nullable=True)
    payment_method = Column(String(100), nullable=True)
    tracking_code = Column(String(100), nullable=True)
    estimated_delivery = Column(DateTime, nullable=True)

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    items = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan", lazy="joined")
    status_history = relationship("OrderStatusHistory", back_populates="order", cascade="all, delete-orphan", lazy="joined")

    def __repr__(self):
        return f"<Order(id={self.id}, number='{self.order_number}')>"


class OrderItem(Base):
    """Item de um pedido."""

    __tablename__ = "order_items"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id", ondelete="CASCADE"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id", ondelete="SET NULL"), nullable=True)
    product_name = Column(String(255), nullable=False)
    quantity = Column(Integer, nullable=False)
    unit_price = Column(Float, nullable=False)

    order = relationship("Order", back_populates="items")


class OrderStatusHistory(Base):
    """Histórico de status de pedido."""

    __tablename__ = "order_status_history"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id", ondelete="CASCADE"), nullable=False)
    status = Column(String(50), nullable=False)
    description = Column(Text, nullable=True)
    occurred_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    order = relationship("Order", back_populates="status_history")
