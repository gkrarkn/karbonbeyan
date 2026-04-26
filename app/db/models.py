from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, Integer, String, Text
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    pass


class UserORM(Base):
    __tablename__ = "users"

    user_id: Mapped[str] = mapped_column(String(64), primary_key=True)
    email: Mapped[str] = mapped_column(String(255), nullable=False, unique=True, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False, default="")
    company_name: Mapped[str] = mapped_column(String(255), nullable=False, default="")
    active_plan: Mapped[str] = mapped_column(String(32), nullable=False, default="")
    subscription_status: Mapped[str] = mapped_column(String(32), nullable=False, default="trial")
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)


class ShipmentORM(Base):
    __tablename__ = "shipments"

    shipment_id: Mapped[str] = mapped_column(String(64), primary_key=True)
    user_id: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    payload_json: Mapped[str] = mapped_column(Text, nullable=False)
    calculation_json: Mapped[str] = mapped_column(Text, nullable=False)
    declaration_pdf_path: Mapped[str] = mapped_column(Text, nullable=False)


class DefaultValueORM(Base):
    __tablename__ = "default_values"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    sector: Mapped[str] = mapped_column(String(64), nullable=False)
    cn_code: Mapped[str] = mapped_column(String(16), nullable=False, index=True)
    material_type: Mapped[str] = mapped_column(String(64), nullable=False)
    origin_country: Mapped[str] = mapped_column(String(16), nullable=False)
    production_route: Mapped[str] = mapped_column(String(128), nullable=False)
    default_benchmark_tco2_per_ton: Mapped[float] = mapped_column(nullable=False)
    specific_direct_emissions_tco2_per_ton: Mapped[float] = mapped_column(nullable=False)
    specific_indirect_emissions_tco2_per_ton: Mapped[float] = mapped_column(nullable=False)
    specific_total_emissions_tco2_per_ton: Mapped[float] = mapped_column(nullable=False)
    value_year: Mapped[int] = mapped_column(nullable=False)
    source_quality: Mapped[str] = mapped_column(String(128), nullable=False)
    source_note: Mapped[str] = mapped_column(Text, nullable=False)
