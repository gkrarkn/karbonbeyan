from __future__ import annotations

from sqlalchemy import create_engine, func, select
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
        connect_args = {"check_same_thread": False} if database_url.startswith("sqlite") else {}
        self._engine = create_engine(database_url, future=True, connect_args=connect_args)
        self._session_factory = sessionmaker(
            bind=self._engine,
            autoflush=False,
            autocommit=False,
            future=True,
        )
        Base.metadata.create_all(self._engine)
        self._seed_default_values()

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

    def save(self, record: ShipmentRecord) -> ShipmentRecord:
        with self._session_factory() as session:
            session.merge(
                ShipmentORM(
                    shipment_id=record.shipment_id,
                    created_at=record.created_at,
                    payload_json=record.payload.model_dump_json(),
                    calculation_json=record.calculation.model_dump_json(),
                    declaration_pdf_path=record.declaration_pdf_path,
                )
            )
            session.commit()
        return record

    def get(self, shipment_id: str) -> ShipmentRecord | None:
        with self._session_factory() as session:
            row = session.get(ShipmentORM, shipment_id)
            return self._to_record(row) if row else None

    def count(self) -> int:
        with self._session_factory() as session:
            return session.scalar(select(func.count()).select_from(ShipmentORM)) or 0

    def list(self) -> list[ShipmentRecord]:
        with self._session_factory() as session:
            rows = session.execute(
                select(ShipmentORM).order_by(ShipmentORM.created_at.desc())
            ).scalars()
            return [self._to_record(row) for row in rows]

    def delete(self, shipment_id: str) -> bool:
        with self._session_factory() as session:
            row = session.get(ShipmentORM, shipment_id)
            if not row:
                return False
            session.delete(row)
            session.commit()
            return True

    def delete_all(self) -> int:
        with self._session_factory() as session:
            rows = session.execute(select(ShipmentORM)).scalars().all()
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
