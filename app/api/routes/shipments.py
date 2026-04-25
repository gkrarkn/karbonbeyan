from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse

from app.api.routes.auth import get_current_user
from app.db.database import shipment_repository
from app.models.auth import UserRecord
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
def get_plan_catalog_reference(current_user: UserRecord = Depends(get_current_user)) -> PlanCatalogResponse:
    return get_plan_catalog(reports_count=shipment_repository.count(user_id=current_user.user_id))


@router.post("/shipments", response_model=ShipmentRecord)
def create_shipment(
    payload: ShipmentCreate,
    current_user: UserRecord = Depends(get_current_user),
) -> ShipmentRecord:
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
    return shipment_repository.save(record, user_id=current_user.user_id)


@router.get("/shipments", response_model=list[ShipmentRecord])
def list_shipments(current_user: UserRecord = Depends(get_current_user)) -> list[ShipmentRecord]:
    return shipment_repository.list(user_id=current_user.user_id)


@router.get("/shipments/{shipment_id}", response_model=ShipmentRecord)
def get_shipment(
    shipment_id: str,
    current_user: UserRecord = Depends(get_current_user),
) -> ShipmentRecord:
    record = shipment_repository.get(shipment_id, user_id=current_user.user_id)
    if not record:
        raise HTTPException(status_code=404, detail="Shipment not found")
    return record


@router.delete("/shipments/{shipment_id}", status_code=200)
def delete_shipment(
    shipment_id: str,
    current_user: UserRecord = Depends(get_current_user),
) -> dict:
    deleted = shipment_repository.delete(shipment_id, user_id=current_user.user_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Shipment not found")
    return {"deleted": 1}


@router.get("/shipments/{shipment_id}/pdf")
def download_shipment_pdf(
    shipment_id: str,
    current_user: UserRecord = Depends(get_current_user),
) -> FileResponse:
    record = shipment_repository.get(shipment_id, user_id=current_user.user_id)
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
