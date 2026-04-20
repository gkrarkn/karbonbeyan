from __future__ import annotations

from datetime import date, datetime
from enum import Enum
from uuid import uuid4

from pydantic import BaseModel, Field


class Sector(str, Enum):
    IRON_STEEL = "iron_steel"
    ALUMINUM = "aluminum"


class MaterialType(str, Enum):
    SLAB = "slab"
    BILLET = "billet"
    COIL = "coil"
    REBAR = "rebar"
    PRIMARY_ALUMINUM = "primary_aluminum"
    SECONDARY_ALUMINUM = "secondary_aluminum"


class EnergySource(str, Enum):
    ELECTRICITY = "electricity"
    NATURAL_GAS = "natural_gas"
    COAL = "coal"
    FUEL_OIL = "fuel_oil"
    COKE_OVEN_GAS = "coke_oven_gas"
    STEAM = "steam"
    HEAT = "heat"


class CalculationMethod(str, Enum):
    ACTUAL = "actual"
    DEFAULT = "default"
    MIXED = "mixed"


class CustomsProcedure(str, Enum):
    RELEASE_FOR_FREE_CIRCULATION = "release_for_free_circulation"
    INWARD_PROCESSING = "inward_processing"
    OUTWARD_PROCESSING = "outward_processing"
    RETURNED_GOODS = "returned_goods"


class VerificationStatus(str, Enum):
    PENDING = "pending"
    VERIFIED = "verified"
    QUALIFIED = "qualified"
    REJECTED = "rejected"


class ComplianceStatus(str, Enum):
    MISSING_DATA_DEFAULT_USED = "missing_data_default_used"
    READY_FOR_INTERNAL_REVIEW = "ready_for_internal_review"
    READY_FOR_OFFICIAL_DECLARATION = "ready_for_official_declaration"


class ConfidenceLevel(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


class DeclarantInfo(BaseModel):
    declarant_name: str
    declarant_eori: str = Field(..., description="EORI of the authorised CBAM declarant")
    cbam_account_number: str = Field(
        ..., description="CBAM account number required for definitive regime declarations"
    )
    member_state_of_establishment: str = Field(
        ..., description="EU Member State where the authorised declarant is established"
    )
    importer_name: str | None = None
    importer_eori: str | None = None
    indirect_customs_representative: str | None = None


class ImportDetails(BaseModel):
    shipment_reference: str
    customs_declaration_number: str | None = None
    import_date: date
    customs_procedure: CustomsProcedure = CustomsProcedure.RELEASE_FOR_FREE_CIRCULATION
    country_of_origin: str = Field(..., description="ISO 3166-1 alpha-2 country code")
    country_of_dispatch: str | None = None
    destination_member_state: str | None = None
    quantity_tons: float = Field(..., gt=0, description="Imported quantity under the customs declaration")
    supplementary_unit_quantity: float | None = Field(
        default=None,
        ge=0,
        description="Supplementary customs unit where required by CN code",
    )


class GoodsIdentification(BaseModel):
    sector: Sector
    material_type: MaterialType
    cn_code: str = Field(..., min_length=8, max_length=8, description="8-digit CN code")
    goods_description: str
    is_complex_good: bool = Field(
        default=False,
        description="Complex goods contain relevant precursor emissions in scope",
    )
    net_mass_kg: float = Field(..., gt=0)
    origin_installation_country: str = Field(
        ..., description="Country where the producing installation is located"
    )


class OperatorContact(BaseModel):
    operator_name: str
    contact_person: str | None = None
    email: str | None = None
    phone: str | None = None


class FacilityInfo(BaseModel):
    installation_id: str = Field(..., description="Installation identifier used in CBAM records")
    installation_name: str
    country_code: str = Field(..., description="ISO 3166-1 alpha-2 country code")
    city: str
    address_line: str | None = None
    postal_code: str | None = None
    operator: OperatorContact
    latitude: float | None = None
    longitude: float | None = None


class ReportingPeriod(BaseModel):
    reporting_period_start: date
    reporting_period_end: date
    declaration_year: int = Field(..., ge=2026, description="Definitive regime declaration year")


class ProductionProcessData(BaseModel):
    production_method: str = Field(
        ...,
        description="Example: electric_arc_furnace, blast_furnace, primary_smelter",
    )
    production_route: str = Field(
        ...,
        description="Production route used for the installation/process mapping",
    )
    produced_quantity_tons: float = Field(..., gt=0)
    functional_unit: str = Field(
        default="tonne_of_goods",
        description="Functional unit used for embedded-emission attribution",
    )
    process_description: str | None = None


class MonitoringMethodology(BaseModel):
    calculation_method: CalculationMethod = CalculationMethod.ACTUAL
    monitoring_plan_reference: str | None = None
    monitoring_plan_version: str | None = None
    measurement_method_description: str | None = None
    data_quality_notes: str | None = None
    default_value_share: float = Field(
        default=0,
        ge=0,
        le=1,
        description="Share of embedded emissions determined using default values",
    )
    uses_actual_electricity_data: bool = False
    actual_electricity_evidence_reference: str | None = None


class EnergyConsumption(BaseModel):
    source: EnergySource
    consumed_amount_mwh: float = Field(..., ge=0)
    emission_factor_tco2_per_mwh: float | None = Field(default=None, ge=0)
    factor_source: str = Field(
        default="EU default factor",
        description="Source of the emission factor used in the calculation",
    )
    source_installation_id: str | None = None


class PrecursorInput(BaseModel):
    precursor_name: str
    precursor_cn_code: str | None = Field(default=None, min_length=8, max_length=8)
    quantity_tons: float = Field(..., ge=0)
    country_of_origin: str | None = None
    production_route: str | None = None
    source_installation_id: str | None = None
    specific_direct_emissions_tco2_per_ton: float | None = Field(default=None, ge=0)
    specific_indirect_emissions_tco2_per_ton: float | None = Field(default=None, ge=0)
    calculation_method: CalculationMethod = CalculationMethod.ACTUAL
    recycled_content_ratio: float | None = Field(default=None, ge=0, le=1)


class EmissionInputs(BaseModel):
    direct_process_emissions_tco2: float = Field(
        default=0,
        ge=0,
        description="Measured process emissions attributable to the goods",
    )
    precursor_emissions_tco2: float = Field(
        default=0,
        ge=0,
        description="Optional aggregated precursor emissions if detailed precursor rows are unavailable",
    )
    non_attributed_emissions_tco2: float = Field(
        default=0,
        ge=0,
        description="Quantitative information on emissions not associated with the reported goods",
    )


class CarbonPriceInfo(BaseModel):
    carbon_price_paid_eur: float = Field(
        default=0,
        ge=0,
        description="Carbon price effectively paid in the country of origin",
    )
    carbon_price_scheme: str | None = None
    rebate_or_other_compensation_eur: float = Field(default=0, ge=0)
    evidence_reference: str | None = None


class VerificationInfo(BaseModel):
    verification_status: VerificationStatus = VerificationStatus.PENDING
    verifier_name: str | None = None
    verifier_accreditation_number: str | None = None
    verification_report_reference: str | None = None
    verification_date: date | None = None
    installation_visit_performed: bool | None = None


class DeclarationAssets(BaseModel):
    company_name_for_pdf: str | None = None
    logo_path: str | None = None
    signatory_name: str | None = None
    signatory_title: str | None = None
    output_language: str = "tr"
    show_stamp_box: bool = True


class DataQualitySummary(BaseModel):
    confidence_level: ConfidenceLevel
    actual_fields_count: int
    default_fields_count: int
    actual_share: float = Field(..., ge=0, le=1)
    default_share: float = Field(..., ge=0, le=1)
    summary_text: str


class CNCodeValidationResult(BaseModel):
    cn_code: str
    is_cbam_covered: bool
    detected_sector: Sector | None = None
    detected_material_type: MaterialType | None = None
    detected_sector_label: str | None = None
    supported_origins: list[str] = Field(default_factory=list)
    message: str


class DefaultValueRecord(BaseModel):
    sector: str
    cn_code: str
    material_type: str
    origin_country: str
    production_route: str
    default_benchmark_tco2_per_ton: float
    specific_direct_emissions_tco2_per_ton: float
    specific_indirect_emissions_tco2_per_ton: float
    specific_total_emissions_tco2_per_ton: float
    value_year: int
    source_quality: str
    source_note: str


class PlanFeatureRecord(BaseModel):
    key: str
    label: str
    description: str


class PlanRecord(BaseModel):
    plan_id: str
    name: str
    tagline: str
    monthly_price_eur: int
    usage_limits: dict[str, int]
    features: list[PlanFeatureRecord]
    recommended: bool = False


class WorkspaceAccessRecord(BaseModel):
    role: str
    role_label: str
    active_plan: str
    trial_status: str
    trial_days_remaining: int
    accessible_feature_keys: list[str]
    usage_counters: dict[str, int]
    usage_limits: dict[str, int]
    can_manage_billing: bool


class PlanCatalogResponse(BaseModel):
    trial_days: int
    current_access: WorkspaceAccessRecord
    plans: list[PlanRecord]


class ShipmentCreate(BaseModel):
    declarant: DeclarantInfo
    import_details: ImportDetails
    goods: GoodsIdentification
    facility: FacilityInfo
    reporting: ReportingPeriod
    production: ProductionProcessData
    methodology: MonitoringMethodology = Field(default_factory=MonitoringMethodology)
    energy_inputs: list[EnergyConsumption] = Field(default_factory=list)
    precursor_inputs: list[PrecursorInput] = Field(default_factory=list)
    emissions: EmissionInputs = Field(default_factory=EmissionInputs)
    carbon_price: CarbonPriceInfo = Field(default_factory=CarbonPriceInfo)
    verification: VerificationInfo = Field(default_factory=VerificationInfo)
    declaration_assets: DeclarationAssets = Field(default_factory=DeclarationAssets)


class EmissionResult(BaseModel):
    reporting_scope: str
    indirect_emissions_applicable: bool
    calculation_method_applied: str
    default_value_source: str | None = None
    compliance_status: ComplianceStatus
    compliance_status_label: str
    confidence_level: ConfidenceLevel
    confidence_label: str
    data_quality_summary: DataQualitySummary
    direct_energy_emissions_tco2: float
    direct_process_emissions_tco2: float
    indirect_emissions_tco2: float
    precursor_emissions_tco2: float
    non_attributed_emissions_tco2: float
    total_embedded_emissions_tco2: float
    specific_embedded_emissions_tco2_per_ton: float
    default_value_share: float


class ShipmentRecord(BaseModel):
    shipment_id: str = Field(default_factory=lambda: str(uuid4()))
    created_at: datetime = Field(default_factory=datetime.utcnow)
    payload: ShipmentCreate
    calculation: EmissionResult
    declaration_pdf_path: str


CBAM_SHIPMENT_EXAMPLE: dict[str, object] = {
    "declarant": {
        "declarant_name": "Example Importer GmbH",
        "declarant_eori": "DE123456789000",
        "cbam_account_number": "CBAM-DE-2026-000045",
        "member_state_of_establishment": "DE",
        "importer_name": "Example Importer GmbH",
        "importer_eori": "DE123456789000",
    },
    "import_details": {
        "shipment_reference": "TR-STEEL-2026-0001",
        "customs_declaration_number": "MRN26DE0001234567",
        "import_date": "2026-02-14",
        "customs_procedure": "release_for_free_circulation",
        "country_of_origin": "TR",
        "country_of_dispatch": "TR",
        "destination_member_state": "DE",
        "quantity_tons": 1250.0,
        "supplementary_unit_quantity": 1250.0,
    },
    "goods": {
        "sector": "iron_steel",
        "material_type": "coil",
        "cn_code": "72082520",
        "goods_description": "Hot-rolled flat steel coils",
        "is_complex_good": True,
        "net_mass_kg": 1250000.0,
        "origin_installation_country": "TR",
    },
    "facility": {
        "installation_id": "TR-CBAM-STEEL-01",
        "installation_name": "Marmara Steel Works",
        "country_code": "TR",
        "city": "Kocaeli",
        "address_line": "Dilovasi Organized Industrial Zone",
        "postal_code": "41455",
        "operator": {
            "operator_name": "Marmara Steel A.S.",
            "contact_person": "Ayse Demir",
            "email": "cbam@marmarasteel.example",
            "phone": "+90-262-555-0000",
        },
    },
    "reporting": {
        "reporting_period_start": "2026-01-01",
        "reporting_period_end": "2026-12-31",
        "declaration_year": 2026,
    },
    "production": {
        "production_method": "electric_arc_furnace",
        "production_route": "eaf_hot_rolling",
        "produced_quantity_tons": 1250.0,
        "functional_unit": "tonne_of_goods",
        "process_description": "Melting, casting and hot rolling of steel coils",
    },
    "methodology": {
        "calculation_method": "actual",
        "monitoring_plan_reference": "MP-TR-STEEL-2026-V1",
        "monitoring_plan_version": "1.0",
        "measurement_method_description": "Mass balance and invoice-backed energy metering",
        "data_quality_notes": "Operator report aligned with verifier evidence pack",
        "default_value_share": 0.0,
        "uses_actual_electricity_data": False,
    },
    "energy_inputs": [
        {
            "source": "electricity",
            "consumed_amount_mwh": 820.0,
            "emission_factor_tco2_per_mwh": 0.42,
            "factor_source": "EU default electricity factor",
        },
        {
            "source": "natural_gas",
            "consumed_amount_mwh": 110.0,
            "emission_factor_tco2_per_mwh": 0.202,
            "factor_source": "EU default fuel factor",
        },
    ],
    "precursor_inputs": [
        {
            "precursor_name": "Hot metal",
            "precursor_cn_code": "72031000",
            "quantity_tons": 980.0,
            "country_of_origin": "TR",
            "production_route": "blast_furnace",
            "source_installation_id": "TR-HM-001",
            "specific_direct_emissions_tco2_per_ton": 1.65,
            "specific_indirect_emissions_tco2_per_ton": 0.0,
            "calculation_method": "actual",
            "recycled_content_ratio": 0.1,
        }
    ],
    "emissions": {
        "direct_process_emissions_tco2": 32.5,
        "precursor_emissions_tco2": 18.0,
        "non_attributed_emissions_tco2": 0.0,
    },
    "carbon_price": {
        "carbon_price_paid_eur": 0.0,
        "carbon_price_scheme": None,
        "rebate_or_other_compensation_eur": 0.0,
        "evidence_reference": None,
    },
    "verification": {
        "verification_status": "pending",
        "verifier_name": None,
        "verifier_accreditation_number": None,
        "verification_report_reference": None,
        "verification_date": None,
        "installation_visit_performed": None,
    },
    "declaration_assets": {
        "company_name_for_pdf": "Example Importer GmbH",
        "logo_path": None,
        "signatory_name": "Max Mustermann",
        "signatory_title": "Authorized CBAM Declarant",
        "show_stamp_box": True,
    },
}
