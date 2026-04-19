from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path
from typing import Any

from app.models.cbam import (
    CNCodeValidationResult,
    MaterialType,
    Sector,
    ShipmentCreate,
)


DATA_FILE = Path(__file__).resolve().parent.parent / "data" / "cbam_default_values_2026.json"


@lru_cache(maxsize=1)
def load_default_values() -> dict[str, Any]:
    with DATA_FILE.open("r", encoding="utf-8") as file:
        return json.load(file)


SECTOR_LABELS = {
    Sector.IRON_STEEL.value: "Demir-Çelik",
    Sector.ALUMINUM.value: "Alüminyum",
}


def is_annex_ii_direct_only(sector: str) -> bool:
    payload = load_default_values()
    return sector in payload["annex_ii_direct_only_sectors"]


def find_default_value(payload: ShipmentCreate) -> dict[str, Any] | None:
    defaults = load_default_values()["defaults"]
    target_origin = payload.import_details.country_of_origin
    target_code = payload.goods.cn_code
    target_material = payload.goods.material_type.value
    target_sector = payload.goods.sector.value

    def matches(item: dict[str, Any], allow_origin_any: bool = False) -> bool:
        origin_match = item["origin_country"] == target_origin or (
            allow_origin_any and item["origin_country"] == "ANY"
        )
        return (
            item["sector"] == target_sector
            and item["cn_code"] == target_code
            and item["material_type"] == target_material
            and origin_match
        )

    for item in defaults:
        if matches(item):
            return item
    for item in defaults:
        if matches(item, allow_origin_any=True):
            return item
    return None


def validate_cn_code(cn_code: str) -> CNCodeValidationResult:
    defaults = load_default_values()["defaults"]
    matches = [item for item in defaults if item["cn_code"] == cn_code]

    if not matches:
        return CNCodeValidationResult(
            cn_code=cn_code,
            is_cbam_covered=False,
            message="Bu kod şu anki CBAM düzenlemesi kapsamında değildir.",
        )

    first = matches[0]
    origins = sorted({item["origin_country"] for item in matches})
    sector_value = first["sector"]
    material_value = first["material_type"]
    return CNCodeValidationResult(
        cn_code=cn_code,
        is_cbam_covered=True,
        detected_sector=Sector(sector_value),
        detected_material_type=MaterialType(material_value),
        detected_sector_label=SECTOR_LABELS.get(sector_value, sector_value),
        supported_origins=origins,
        message=f"Bu kod CBAM kapsamındadır. Sistem sektörü otomatik olarak {SECTOR_LABELS.get(sector_value, sector_value)} olarak tanıdı.",
    )
