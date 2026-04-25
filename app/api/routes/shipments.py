from pathlib import Path

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse

from app.db.database import shipment_repository
from app.models.cbam import (
    CNCodeValidationResult,
    DefaultValueRecord,
    PlanCatalogResponse,
    ShipmentCreate,
    ShipmentRecord,
)
from app.services.default_values import validate_cn_code
from app.services.emissions import calculate_shipment_emissions
from app.services.pdf_generator import build_cbam_declaration_pdf
from app.services.plans import get_plan_catalog

router = APIRouter(tags=["shipments"])


@router.get("/reference/cn-codes/{cn_code}", response_model=CNCodeValidationResult)
def validate_cn_code_reference(cn_code: str) -> CNCodeValidationResult:
    return validate_cn_code(cn_code)


@router.get("/reference/default-values", response_model=list[DefaultValueRecord])
def list_default_values_reference() -> list[DefaultValueRecord]:
    return shipment_repository.list_default_values()


@router.get("/reference/plans", response_model=PlanCatalogResponse)
def get_plan_catalog_reference() -> PlanCatalogResponse:
    return get_plan_catalog()


@router.post("/shipments", response_model=ShipmentRecord)
def create_shipment(payload: ShipmentCreate) -> ShipmentRecord:
    try:
        calculation = calculate_shipment_emissions(payload)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    draft_record = ShipmentRecord(
        payload=payload,
        calculation=calculation,
        declaration_pdf_path="",
    )
    pdf_path = build_cbam_declaration_pdf(draft_record)
    record = draft_record.model_copy(update={"declaration_pdf_path": pdf_path})
    return shipment_repository.save(record)


@router.get("/shipments", response_model=list[ShipmentRecord])
def list_shipments() -> list[ShipmentRecord]:
    return shipment_repository.list()


@router.get("/shipments/{shipment_id}", response_model=ShipmentRecord)
def get_shipment(shipment_id: str) -> ShipmentRecord:
    record = shipment_repository.get(shipment_id)
    if not record:
        raise HTTPException(status_code=404, detail="Shipment not found")
    return record


@router.delete("/shipments", status_code=200)
def delete_all_shipments() -> dict:
    count = shipment_repository.delete_all()
    return {"deleted": count}


@router.delete("/shipments/{shipment_id}", status_code=200)
def delete_shipment(shipment_id: str) -> dict:
    deleted = shipment_repository.delete(shipment_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Shipment not found")
    return {"deleted": 1}


@router.get("/shipments/{shipment_id}/pdf")
def download_shipment_pdf(shipment_id: str) -> FileResponse:
    record = shipment_repository.get(shipment_id)
    if not record:
        raise HTTPException(status_code=404, detail="Shipment not found")

    pdf_path = Path(record.declaration_pdf_path)
    if not pdf_path.exists():
        raise HTTPException(status_code=404, detail="PDF file not found")

    filename = f"karbonbeyan_cbam_{shipment_id}.pdf"
    return FileResponse(
        path=pdf_path,
        media_type="application/pdf",
        filename=filename,
    )
