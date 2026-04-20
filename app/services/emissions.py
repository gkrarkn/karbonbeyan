from app.models.cbam import (
    CalculationMethod,
    ComplianceStatus,
    ConfidenceLevel,
    DataQualitySummary,
    EmissionResult,
    ShipmentCreate,
)
from app.services.default_values import find_default_value, is_annex_ii_direct_only


def _has_actual_energy_data(payload: ShipmentCreate) -> bool:
    return any(
        energy.emission_factor_tco2_per_mwh is not None for energy in payload.energy_inputs
    )


def _has_actual_precursor_data(payload: ShipmentCreate) -> bool:
    return any(
        precursor.specific_direct_emissions_tco2_per_ton is not None
        for precursor in payload.precursor_inputs
    )


def _build_data_quality_summary(
    *, actual_fields_count: int, default_fields_count: int
) -> DataQualitySummary:
    total = max(actual_fields_count + default_fields_count, 1)
    actual_share = actual_fields_count / total
    default_share = default_fields_count / total

    if actual_share >= 0.85:
        confidence_level = ConfidenceLevel.HIGH
        summary_text = "Veri setinin büyük bölümü actual ölçüm ve doğrulanmış operatör verisine dayanıyor; resmi beyana güçlü şekilde yaklaştınız."
    elif actual_share >= 0.4:
        confidence_level = ConfidenceLevel.MEDIUM
        summary_text = "Kayıt karma veri yapısında; resmi beyan öncesi default kullanılan alanlar azaltılmalı."
    else:
        confidence_level = ConfidenceLevel.LOW
        summary_text = "Bu hesaplama tahmini verilere dayanıyor; resmi beyan için uygun değil ve actual veri ile güçlendirilmeli."

    return DataQualitySummary(
        confidence_level=confidence_level,
        actual_fields_count=actual_fields_count,
        default_fields_count=default_fields_count,
        actual_share=round(actual_share, 4),
        default_share=round(default_share, 4),
        summary_text=summary_text,
    )


def _resolve_compliance_status(
    payload: ShipmentCreate, data_quality: DataQualitySummary
) -> tuple[ComplianceStatus, str]:
    if data_quality.default_fields_count > 0:
        return (
            ComplianceStatus.MISSING_DATA_DEFAULT_USED,
            "Eksik Veri (Default Kullanıldı)",
        )
    if payload.verification.verification_status == "verified":
        return (
            ComplianceStatus.READY_FOR_OFFICIAL_DECLARATION,
            "Resmi Beyana Uygun",
        )
    return (
        ComplianceStatus.READY_FOR_INTERNAL_REVIEW,
        "İç İncelemeye Hazır",
    )


def _confidence_label(confidence_level: ConfidenceLevel) -> str:
    return {
        ConfidenceLevel.HIGH: "Yüksek güven: resmi beyana yakın",
        ConfidenceLevel.MEDIUM: "Orta güven: iç inceleme gerekli",
        ConfidenceLevel.LOW: "Düşük güven: resmi beyan için uygun değil",
    }[confidence_level]


def _calculate_with_actuals(payload: ShipmentCreate) -> EmissionResult:
    indirect_applicable = not is_annex_ii_direct_only(payload.goods.sector.value)
    actual_fields_count = len(payload.energy_inputs) + len(payload.precursor_inputs) + 1
    data_quality = _build_data_quality_summary(
        actual_fields_count=actual_fields_count,
        default_fields_count=0,
    )
    compliance_status, compliance_label = _resolve_compliance_status(payload, data_quality)
    direct_energy_emissions = sum(
        energy.consumed_amount_mwh * (energy.emission_factor_tco2_per_mwh or 0)
        for energy in payload.energy_inputs
        if energy.source != "electricity"
    )
    indirect_emissions = (
        sum(
            energy.consumed_amount_mwh * (energy.emission_factor_tco2_per_mwh or 0)
            for energy in payload.energy_inputs
            if energy.source == "electricity"
        )
        if indirect_applicable
        else 0.0
    )
    precursor_emissions = sum(
        precursor.quantity_tons
        * (
            (precursor.specific_direct_emissions_tco2_per_ton or 0)
            + ((precursor.specific_indirect_emissions_tco2_per_ton or 0) if indirect_applicable else 0)
        )
        for precursor in payload.precursor_inputs
    ) + payload.emissions.precursor_emissions_tco2

    total_embedded_emissions = (
        direct_energy_emissions
        + indirect_emissions
        + precursor_emissions
        + payload.emissions.direct_process_emissions_tco2
    )
    intensity = total_embedded_emissions / payload.production.produced_quantity_tons

    return EmissionResult(
        reporting_scope="annex_iv_actual_values",
        indirect_emissions_applicable=indirect_applicable,
        calculation_method_applied="actual",
        default_value_source=None,
        compliance_status=compliance_status,
        compliance_status_label=compliance_label,
        confidence_level=data_quality.confidence_level,
        confidence_label=_confidence_label(data_quality.confidence_level),
        data_quality_summary=data_quality,
        direct_energy_emissions_tco2=round(direct_energy_emissions, 4),
        direct_process_emissions_tco2=round(
            payload.emissions.direct_process_emissions_tco2, 4
        ),
        indirect_emissions_tco2=round(indirect_emissions, 4),
        precursor_emissions_tco2=round(precursor_emissions, 4),
        non_attributed_emissions_tco2=round(
            payload.emissions.non_attributed_emissions_tco2, 4
        ),
        total_embedded_emissions_tco2=round(total_embedded_emissions, 4),
        specific_embedded_emissions_tco2_per_ton=round(intensity, 6),
        default_value_share=round(payload.methodology.default_value_share, 4),
    )


def _calculate_with_defaults(payload: ShipmentCreate) -> EmissionResult:
    default_value = find_default_value(payload)
    if default_value is None:
        raise ValueError(
            f"No default value configured for {payload.goods.cn_code} from {payload.import_details.country_of_origin}"
        )

    specific_total = default_value["specific_total_emissions_tco2_per_ton"]
    total_embedded = payload.import_details.quantity_tons * specific_total
    indirect_applicable = not is_annex_ii_direct_only(payload.goods.sector.value)
    indirect_specific = default_value["specific_indirect_emissions_tco2_per_ton"]
    indirect_total = payload.import_details.quantity_tons * indirect_specific if indirect_applicable else 0.0
    direct_total = total_embedded - indirect_total
    data_quality = _build_data_quality_summary(
        actual_fields_count=0,
        default_fields_count=3,
    )
    compliance_status, compliance_label = _resolve_compliance_status(payload, data_quality)

    return EmissionResult(
        reporting_scope="article_7_default_values",
        indirect_emissions_applicable=indirect_applicable,
        calculation_method_applied="default",
        default_value_source=f"{default_value['origin_country']}:{default_value['cn_code']}",
        compliance_status=compliance_status,
        compliance_status_label=compliance_label,
        confidence_level=data_quality.confidence_level,
        confidence_label=_confidence_label(data_quality.confidence_level),
        data_quality_summary=data_quality,
        direct_energy_emissions_tco2=0.0,
        direct_process_emissions_tco2=round(direct_total, 4),
        indirect_emissions_tco2=round(indirect_total, 4),
        precursor_emissions_tco2=0.0,
        non_attributed_emissions_tco2=0.0,
        total_embedded_emissions_tco2=round(total_embedded, 4),
        specific_embedded_emissions_tco2_per_ton=round(specific_total, 6),
        default_value_share=1.0,
    )


def calculate_shipment_emissions(payload: ShipmentCreate) -> EmissionResult:
    wants_actuals = payload.methodology.calculation_method in {
        CalculationMethod.ACTUAL,
        CalculationMethod.MIXED,
    }
    has_actuals = _has_actual_energy_data(payload) or _has_actual_precursor_data(payload)
    if wants_actuals and has_actuals:
        return _calculate_with_actuals(payload)
    return _calculate_with_defaults(payload)


def calculate_simple_energy_emission(
    produced_quantity_tons: float,
    consumed_energy_mwh: float,
    emission_factor_tco2_per_mwh: float,
) -> dict[str, float]:
    """
    Basit MVP fonksiyonu:
    Girilen enerji tüketimini AB emisyon katsayısı ile çarpar ve ton başına yoğunluğu döner.
    """
    total_emissions = consumed_energy_mwh * emission_factor_tco2_per_mwh
    intensity = total_emissions / produced_quantity_tons
    return {
        "total_emissions_tco2": round(total_emissions, 4),
        "emissions_intensity_tco2_per_ton": round(intensity, 6),
    }
