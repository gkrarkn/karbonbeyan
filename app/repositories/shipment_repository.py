from __future__ import annotations

from sqlalchemy import create_engine, func, select, text
from sqlalchemy.orm import sessionmaker

from app.db.models import Base, DefaultValueORM, ShipmentORM
from app.models.cbam import (
    DefaultValueRecord,
    EmissionResult,
    ShipmentCreate,
    ShipmentRecord,
)
from app.services.default_values import load_default_values


class ShipmentRepository:
    def __init__(self, database_url: str) -> None:
        self._database_url = database_url
        connect_args = {"check_same_thread": False} if database_url.startswith("sqlite") else {}
        self._engine = create_engine(database_url, future=True, connect_args=connect_args)
        self._session_factory = sessionmaker(
            bind=self._engine,
            autoflush=False,
            autocommit=False,
            future=True,
        )
        Base.metadata.create_all(self._engine)
        self._migrate()
        self._seed_default_values()

    def _migrate(self) -> None:
        with self._engine.connect() as conn:
            try:
                if self._database_url.startswith("sqlite"):
                    result = conn.execute(text("PRAGMA table_info(shipments)"))
                    columns = [row[1] for row in result.fetchall()]
                    if "user_id" not in columns:
                        conn.execute(text("ALTER TABLE shipments ADD COLUMN user_id VARCHAR(64)"))

                    result = conn.execute(text("PRAGMA table_info(users)"))
                    user_columns = [row[1] for row in result.fetchall()]
                    if user_columns:
                        if "hashed_password" not in user_columns:
                            conn.execute(text("ALTER TABLE users ADD COLUMN hashed_password VARCHAR(255) NOT NULL DEFAULT ''"))
                        if "full_name" not in user_columns:
                            conn.execute(text("ALTER TABLE users ADD COLUMN full_name VARCHAR(255) NOT NULL DEFAULT ''"))
                        if "company_name" not in user_columns:
                            conn.execute(text("ALTER TABLE users ADD COLUMN company_name VARCHAR(255) NOT NULL DEFAULT ''"))
                        if "active_plan" not in user_columns:
                            conn.execute(text("ALTER TABLE users ADD COLUMN active_plan VARCHAR(32) NOT NULL DEFAULT ''"))
                        if "subscription_status" not in user_columns:
                            conn.execute(text("ALTER TABLE users ADD COLUMN subscription_status VARCHAR(32) NOT NULL DEFAULT 'trial'"))
                        if "created_at" not in user_columns:
                            conn.execute(text("ALTER TABLE users ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP"))
                    conn.commit()
                else:
                    conn.execute(text("ALTER TABLE shipments ADD COLUMN IF NOT EXISTS user_id VARCHAR(64)"))
                    conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS hashed_password VARCHAR(255) NOT NULL DEFAULT ''"))
                    conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS full_name VARCHAR(255) NOT NULL DEFAULT ''"))
                    conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS company_name VARCHAR(255) NOT NULL DEFAULT ''"))
                    conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS active_plan VARCHAR(32) NOT NULL DEFAULT ''"))
                    conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(32) NOT NULL DEFAULT 'trial'"))
                    conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP"))
                    conn.commit()
            except Exception:
                conn.rollback()

    @staticmethod
    def _to_record(row: ShipmentORM) -> ShipmentRecord:
        return ShipmentRecord(
            shipment_id=row.shipment_id,
            created_at=row.created_at,
            payload=ShipmentCreate.model_validate_json(row.payload_json),
            calculation=EmissionResult.model_validate_json(row.calculation_json),
            declaration_pdf_path=row.declaration_pdf_path,
        )

    @staticmethod
    def _to_default_value_record(row: DefaultValueORM) -> DefaultValueRecord:
        return DefaultValueRecord(
            sector=row.sector,
            cn_code=row.cn_code,
            material_type=row.material_type,
            origin_country=row.origin_country,
            production_route=row.production_route,
            default_benchmark_tco2_per_ton=row.default_benchmark_tco2_per_ton,
            specific_direct_emissions_tco2_per_ton=row.specific_direct_emissions_tco2_per_ton,
            specific_indirect_emissions_tco2_per_ton=row.specific_indirect_emissions_tco2_per_ton,
            specific_total_emissions_tco2_per_ton=row.specific_total_emissions_tco2_per_ton,
            value_year=row.value_year,
            source_quality=row.source_quality,
            source_note=row.source_note,
        )

    def _seed_default_values(self) -> None:
        seed_rows = load_default_values()["defaults"]
        with self._session_factory() as session:
            existing_count = session.scalar(select(func.count()).select_from(DefaultValueORM))
            if existing_count and existing_count > 0:
                return
            for item in seed_rows:
                session.add(
                    DefaultValueORM(
                        sector=item["sector"],
                        cn_code=item["cn_code"],
                        material_type=item["material_type"],
                        origin_country=item["origin_country"],
                        production_route=item["production_route"],
                        default_benchmark_tco2_per_ton=item["default_benchmark_tco2_per_ton"],
                        specific_direct_emissions_tco2_per_ton=item["specific_direct_emissions_tco2_per_ton"],
                        specific_indirect_emissions_tco2_per_ton=item["specific_indirect_emissions_tco2_per_ton"],
                        specific_total_emissions_tco2_per_ton=item["specific_total_emissions_tco2_per_ton"],
                        value_year=item["value_year"],
                        source_quality=item["source_quality"],
                        source_note=item["source_note"],
                    )
                )
            session.commit()

    def save(self, record: ShipmentRecord, user_id: str) -> ShipmentRecord:
        with self._session_factory() as session:
            session.merge(
                ShipmentORM(
                    shipment_id=record.shipment_id,
                    user_id=user_id,
                    created_at=record.created_at,
                    payload_json=record.payload.model_dump_json(),
                    calculation_json=record.calculation.model_dump_json(),
                    declaration_pdf_path=record.declaration_pdf_path,
                )
            )
            session.commit()
        return record

    def get(self, shipment_id: str, user_id: str) -> ShipmentRecord | None:
        with self._session_factory() as session:
            row = session.get(ShipmentORM, shipment_id)
            if not row or row.user_id != user_id:
                return None
            return self._to_record(row)

    def count(self, user_id: str | None = None) -> int:
        with self._session_factory() as session:
            query = select(func.count()).select_from(ShipmentORM)
            if user_id:
                query = query.where(ShipmentORM.user_id == user_id)
            return session.scalar(query) or 0

    def list(self, user_id: str) -> list[ShipmentRecord]:
        with self._session_factory() as session:
            rows = session.execute(
                select(ShipmentORM)
                .where(ShipmentORM.user_id == user_id)
                .order_by(ShipmentORM.created_at.desc())
            ).scalars()
            return [self._to_record(row) for row in rows]

    def delete(self, shipment_id: str, user_id: str) -> bool:
        with self._session_factory() as session:
            row = session.get(ShipmentORM, shipment_id)
            if not row or row.user_id != user_id:
                return False
            session.delete(row)
            session.commit()
            return True

    def delete_all(self, user_id: str) -> int:
        with self._session_factory() as session:
            rows = session.execute(
                select(ShipmentORM).where(ShipmentORM.user_id == user_id)
            ).scalars().all()
            count = len(rows)
            for row in rows:
                session.delete(row)
            session.commit()
            return count

    def list_default_values(self) -> list[DefaultValueRecord]:
        with self._session_factory() as session:
            rows = session.execute(
                select(DefaultValueORM).order_by(DefaultValueORM.sector, DefaultValueORM.cn_code)
            ).scalars()
            return [self._to_default_value_record(row) for row in rows]
