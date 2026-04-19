from __future__ import annotations

import math
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.pdfmetrics import stringWidth
from reportlab.pdfbase.ttfonts import TTFont

from app.models.cbam import ShipmentRecord


FONT_REGULAR = "Arial"
FONT_BOLD = "Arial-Bold"
FONT_ITALIC = "Arial-Italic"
FONT_BOLD_ITALIC = "Arial-BoldItalic"


def _ensure_fonts_registered() -> None:
    registered = pdfmetrics.getRegisteredFontNames()
    if FONT_REGULAR not in registered:
        pdfmetrics.registerFont(
            TTFont(FONT_REGULAR, "/System/Library/Fonts/Supplemental/Arial.ttf")
        )
    if FONT_BOLD not in registered:
        pdfmetrics.registerFont(
            TTFont(FONT_BOLD, "/System/Library/Fonts/Supplemental/Arial Bold.ttf")
        )
    if FONT_ITALIC not in registered:
        pdfmetrics.registerFont(
            TTFont(FONT_ITALIC, "/System/Library/Fonts/Supplemental/Arial Italic.ttf")
        )
    if FONT_BOLD_ITALIC not in registered:
        pdfmetrics.registerFont(
            TTFont(
                FONT_BOLD_ITALIC,
                "/System/Library/Fonts/Supplemental/Arial Bold Italic.ttf",
            )
        )


def _draw_box(pdf: canvas.Canvas, x: float, y: float, w: float, h: float, title: str) -> None:
    pdf.setStrokeColor(colors.HexColor("#9CA3AF"))
    pdf.rect(x, y - h, w, h, stroke=1, fill=0)
    pdf.setFillColor(colors.black)
    pdf.setFont(FONT_BOLD, 9)
    pdf.drawString(x + 3 * mm, y - 5 * mm, title)


def _draw_key_value_block(
    pdf: canvas.Canvas, x: float, y: float, title: str, lines: list[str], width: float
) -> float:
    line_height = 5.5 * mm
    height = max(18 * mm, (len(lines) + 2) * line_height)
    _draw_box(pdf, x, y, width, height, title)
    pdf.setFillColor(colors.black)
    pdf.setFont(FONT_REGULAR, 9)
    current_y = y - 11 * mm
    for line in lines:
        pdf.drawString(x + 3 * mm, current_y, line)
        current_y -= line_height
    return y - height - 4 * mm


def _star_points(
    cx: float, cy: float, outer_radius: float, inner_radius: float, spikes: int = 5
) -> list[tuple[float, float]]:
    points: list[tuple[float, float]] = []
    step = 3.141592653589793 / spikes

    for index in range(spikes * 2):
        radius = outer_radius if index % 2 == 0 else inner_radius
        angle = index * step - 3.141592653589793 / 2
        points.append((cx + radius * math.cos(angle), cy + radius * math.sin(angle)))

    return points


def _draw_star(
    pdf: canvas.Canvas, cx: float, cy: float, outer_radius: float, inner_radius: float
) -> None:
    path = pdf.beginPath()
    points = _star_points(cx, cy, outer_radius, inner_radius)
    path.moveTo(*points[0])
    for point in points[1:]:
        path.lineTo(*point)
    path.close()
    pdf.drawPath(path, stroke=0, fill=1)


def _draw_leaf(pdf: canvas.Canvas, center_x: float, center_y: float) -> None:
    pdf.saveState()
    pdf.translate(center_x, center_y)
    pdf.rotate(-32)
    pdf.setFillColor(colors.HexColor("#56B26F"))
    pdf.ellipse(-3.8 * mm, -1.7 * mm, 4.8 * mm, 5.4 * mm, stroke=0, fill=1)
    pdf.setStrokeColor(colors.HexColor("#EAF8EE"))
    pdf.setLineWidth(1.2)
    pdf.line(-0.3 * mm, -1.4 * mm, 1.2 * mm, 2.8 * mm)
    pdf.restoreState()


def _draw_brand_logo(
    pdf: canvas.Canvas, x: float, y: float, w: float, h: float, compact: bool = False
) -> None:
    pdf.setFillColor(colors.HexColor("#0E4FAF"))
    pdf.setStrokeColor(colors.HexColor("#0E4FAF"))
    pdf.roundRect(x, y - h, w, h, 5 * mm, stroke=0, fill=1)

    icon_size = h - 6 * mm
    icon_x = x + 4 * mm
    icon_y = y - h + 3 * mm
    center_x = icon_x + icon_size / 2
    center_y = icon_y + icon_size / 2
    pdf.setFillColor(colors.HexColor("#0B3F91"))
    pdf.circle(center_x, center_y, icon_size / 2, stroke=0, fill=1)

    pdf.setFillColor(colors.HexColor("#F6C343"))
    star_radius = icon_size * 0.33
    for index in range(12):
        angle = (2 * 3.141592653589793 * index) / 12 - 3.141592653589793 / 2
        star_x = center_x + math.cos(angle) * star_radius
        star_y = center_y + math.sin(angle) * star_radius
        _draw_star(pdf, star_x, star_y, 1.2 * mm, 0.52 * mm)

    _draw_leaf(pdf, center_x, center_y)

    if compact:
        return

    text_x = icon_x + icon_size + 4 * mm
    pdf.setFillColor(colors.white)
    pdf.setFont(FONT_BOLD, 15)
    pdf.drawString(text_x, y - 10 * mm, "KarbonBeyan")
    pdf.setFont(FONT_REGULAR, 7.5)
    pdf.setFillColor(colors.Color(1, 1, 1, alpha=0.78))
    pdf.drawString(text_x, y - 15.2 * mm, "CBAM compliance workflow platform")


def _draw_wrapped_text(
    pdf: canvas.Canvas,
    text: str,
    x: float,
    y: float,
    max_width: float,
    font_name: str = FONT_REGULAR,
    font_size: float = 8,
    line_gap: float = 3.8 * mm,
) -> float:
    words = text.split()
    lines: list[str] = []
    current_line = ""

    for word in words:
        candidate = word if not current_line else f"{current_line} {word}"
        if stringWidth(candidate, font_name, font_size) <= max_width:
            current_line = candidate
        else:
            if current_line:
                lines.append(current_line)
            current_line = word
    if current_line:
        lines.append(current_line)

    pdf.setFont(font_name, font_size)
    pdf.setFillColor(colors.black)
    current_y = y
    for line in lines:
        pdf.drawString(x, current_y, line)
        current_y -= line_gap

    return current_y


def build_cbam_declaration_pdf(record: ShipmentRecord, output_dir: str = "generated") -> str:
    _ensure_fonts_registered()
    Path(output_dir).mkdir(parents=True, exist_ok=True)
    pdf_path = Path(output_dir) / f"cbam_declaration_{record.shipment_id}.pdf"

    pdf = canvas.Canvas(str(pdf_path), pagesize=A4)
    width, height = A4
    margin = 15 * mm
    y = height - 18 * mm

    pdf.setStrokeColor(colors.HexColor("#1F2937"))
    pdf.setFillColor(colors.black)
    pdf.setLineWidth(1)
    pdf.line(margin, y - 4 * mm, width - margin, y - 4 * mm)

    logo_w = 62 * mm
    logo_h = 20 * mm
    _draw_brand_logo(pdf, margin, y, logo_w, logo_h)

    pdf.setFont(FONT_BOLD, 16)
    pdf.drawRightString(width - margin, y - 4 * mm, "KarbonBeyan | CBAM Declaration Draft")
    pdf.setFillColor(colors.black)
    pdf.setFont(FONT_REGULAR, 9)
    pdf.drawRightString(
        width - margin,
        y - 10 * mm,
        f"Definitive regime reference year: {record.payload.reporting.declaration_year}",
    )
    pdf.drawRightString(width - margin, y - 15 * mm, f"Record ID: {record.shipment_id}")
    y -= 26 * mm

    y = _draw_key_value_block(
        pdf,
        margin,
        y,
        "Authorised CBAM Declarant",
        [
            f"Name: {record.payload.declarant.declarant_name}",
            f"EORI: {record.payload.declarant.declarant_eori}",
            f"CBAM account: {record.payload.declarant.cbam_account_number}",
            f"Member State: {record.payload.declarant.member_state_of_establishment}",
        ],
        (width - 2 * margin) / 2 - 3 * mm,
    )
    _draw_key_value_block(
        pdf,
        margin + (width - 2 * margin) / 2 + 3 * mm,
        y + 46 * mm,
        "Import Details",
        [
            f"Reference: {record.payload.import_details.shipment_reference}",
            f"Import date: {record.payload.import_details.import_date}",
            f"Origin: {record.payload.import_details.country_of_origin}",
            f"CN code: {record.payload.goods.cn_code}",
        ],
        (width - 2 * margin) / 2 - 3 * mm,
    )

    y -= 2 * mm
    y = _draw_key_value_block(
        pdf,
        margin,
        y,
        "Producing Installation",
        [
            f"Installation: {record.payload.facility.installation_name}",
            f"Installation ID: {record.payload.facility.installation_id}",
            f"Location: {record.payload.facility.city}, {record.payload.facility.country_code}",
            f"Operator: {record.payload.facility.operator.operator_name}",
        ],
        width - 2 * margin,
    )

    y = _draw_key_value_block(
        pdf,
        margin,
        y,
        "Goods and Methodology",
        [
            f"Sector: {record.payload.goods.sector.value}",
            f"Material: {record.payload.goods.material_type.value}",
            f"Production route: {record.payload.production.production_route}",
            f"Calculation method applied: {record.calculation.calculation_method_applied}",
            f"Default value source: {record.calculation.default_value_source or 'n/a'}",
            f"Compliance status: {record.calculation.compliance_status_label}",
            f"Confidence level: {record.calculation.confidence_label}",
        ],
        width - 2 * margin,
    )

    table_y = y
    table_h = 36 * mm
    _draw_box(pdf, margin, table_y, width - 2 * margin, table_h, "Embedded Emissions Summary")
    pdf.setFont(FONT_BOLD, 9)
    headers = [
        "Produced t",
        "Direct energy",
        "Direct process",
        "Indirect",
        "Precursor",
        "Total",
        "Specific",
    ]
    col_x = [margin + 3 * mm, margin + 28 * mm, margin + 54 * mm, margin + 82 * mm, margin + 104 * mm, margin + 127 * mm, margin + 149 * mm]
    for idx, header in enumerate(headers):
        pdf.drawString(col_x[idx], table_y - 10 * mm, header)
    pdf.setFillColor(colors.black)
    pdf.setFont(FONT_REGULAR, 9)
    values = [
        f"{record.payload.production.produced_quantity_tons:.3f}",
        f"{record.calculation.direct_energy_emissions_tco2:.3f}",
        f"{record.calculation.direct_process_emissions_tco2:.3f}",
        f"{record.calculation.indirect_emissions_tco2:.3f}",
        f"{record.calculation.precursor_emissions_tco2:.3f}",
        f"{record.calculation.total_embedded_emissions_tco2:.3f}",
        f"{record.calculation.specific_embedded_emissions_tco2_per_ton:.6f}",
    ]
    for idx, value in enumerate(values):
        pdf.drawString(col_x[idx], table_y - 18 * mm, value)
    pdf.drawString(
        margin + 3 * mm,
        table_y - 27 * mm,
        f"Carbon price paid in origin: EUR {record.payload.carbon_price.carbon_price_paid_eur:.2f}",
    )
    y = table_y - table_h - 4 * mm

    y = _draw_key_value_block(
        pdf,
        margin,
        y,
        "Veri Kalitesi Özeti",
        [
            f"Confidence level: {record.calculation.confidence_label}",
            f"Actual fields: {record.calculation.data_quality_summary.actual_fields_count}",
            f"Default fields: {record.calculation.data_quality_summary.default_fields_count}",
            f"Actual share: %{record.calculation.data_quality_summary.actual_share * 100:.0f}",
            f"Default share: %{record.calculation.data_quality_summary.default_share * 100:.0f}",
            f"Note: {record.calculation.data_quality_summary.summary_text}",
        ],
        width - 2 * margin,
    )

    left_w = (width - 2 * margin) * 0.5
    right_w = (width - 2 * margin) - left_w - 4 * mm
    y_left = _draw_key_value_block(
        pdf,
        margin,
        y,
        "Verification and Evidence",
        [
            f"Status: {record.payload.verification.verification_status.value}",
            f"Verifier: {record.payload.verification.verifier_name or 'Pending'}",
            f"Accreditation no: {record.payload.verification.verifier_accreditation_number or 'Pending'}",
            f"Monitoring plan: {record.payload.methodology.monitoring_plan_reference or 'Not provided'}",
        ],
        left_w,
    )
    signature_x = margin + left_w + 4 * mm
    signature_h = 38 * mm
    _draw_box(pdf, signature_x, y, right_w, signature_h, "Stamp / Signature")
    pdf.setFillColor(colors.black)
    pdf.setFont(FONT_REGULAR, 9)
    pdf.drawString(
        signature_x + 7 * mm,
        y - 12 * mm,
        f"Name: {record.payload.declaration_assets.signatory_name or '________________'}",
    )
    pdf.drawString(
        signature_x + 7 * mm,
        y - 19 * mm,
        f"Title: {record.payload.declaration_assets.signatory_title or '________________'}",
    )
    pdf.drawString(signature_x + 7 * mm, y - 26 * mm, "Date / Stamp: __________________")
    pdf.setFillColor(colors.black)
    _draw_wrapped_text(
        pdf,
        "E-imza ile imzalanabilir veya ıslak imza/kaşe yapılarak taranabilir.",
        signature_x + 7 * mm,
        y - 32 * mm,
        right_w - 14 * mm,
        font_name=FONT_ITALIC,
        font_size=7.5,
        line_gap=3.3 * mm,
    )

    note_y = min(y_left, y - signature_h) - 3 * mm
    pdf.setFillColor(colors.black)
    pdf.setFont(FONT_ITALIC, 8)
    note_y = _draw_wrapped_text(
        pdf,
        "Bu rapor, KarbonBeyan yazılımı tarafından AB 2023/956 sayılı yönetmeliğine uygun metodolojiler kullanılarak hazırlanmış bir ön-beyan özetidir. Girilen verilerin doğruluğu ve resmi gümrük beyan sorumluluğu kullanıcıya aittir.",
        margin,
        note_y,
        width - 2 * margin,
        font_name=FONT_ITALIC,
        font_size=7.5,
        line_gap=3.2 * mm,
    )
    pdf.setFillColor(colors.black)
    pdf.setFont(FONT_ITALIC, 7.5)
    pdf.drawString(
        margin,
        note_y - 1.5 * mm,
        "KarbonBeyan draft output prepared for workflow support and internal review.",
    )

    pdf.showPage()
    pdf.save()
    return str(pdf_path)
