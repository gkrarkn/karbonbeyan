from __future__ import annotations

import math
import os
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

FONT_ASSETS_DIR = Path(__file__).resolve().parents[1] / "assets" / "fonts"

FONT_CANDIDATES = {
    FONT_REGULAR: [
        str(FONT_ASSETS_DIR / "Arial.ttf"),
        "/System/Library/Fonts/Supplemental/Arial.ttf",
        "/usr/share/fonts/truetype/msttcorefonts/Arial.ttf",
        "/usr/share/fonts/truetype/liberation2/LiberationSans-Regular.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    ],
    FONT_BOLD: [
        str(FONT_ASSETS_DIR / "Arial-Bold.ttf"),
        "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
        "/usr/share/fonts/truetype/msttcorefonts/Arial_Bold.ttf",
        "/usr/share/fonts/truetype/liberation2/LiberationSans-Bold.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    ],
    FONT_ITALIC: [
        str(FONT_ASSETS_DIR / "Arial-Italic.ttf"),
        "/System/Library/Fonts/Supplemental/Arial Italic.ttf",
        "/usr/share/fonts/truetype/msttcorefonts/Arial_Italic.ttf",
        "/usr/share/fonts/truetype/liberation2/LiberationSans-Italic.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Oblique.ttf",
    ],
    FONT_BOLD_ITALIC: [
        str(FONT_ASSETS_DIR / "Arial-BoldItalic.ttf"),
        "/System/Library/Fonts/Supplemental/Arial Bold Italic.ttf",
        "/usr/share/fonts/truetype/msttcorefonts/Arial_Bold_Italic.ttf",
        "/usr/share/fonts/truetype/liberation2/LiberationSans-BoldItalic.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-BoldOblique.ttf",
    ],
}


def _is_english(record: ShipmentRecord) -> bool:
    return (record.payload.declaration_assets.output_language or "tr").lower().startswith("en")


def _pdf_text(record: ShipmentRecord, tr: str, en: str) -> str:
    return en if _is_english(record) else tr


def _confidence_label(record: ShipmentRecord) -> str:
    label = record.calculation.confidence_label
    if not _is_english(record):
        return label
    return {
        "Yüksek Güven": "High Confidence",
        "Orta Güven": "Medium Confidence",
        "Düşük Güven": "Low Confidence",
    }.get(label, label)


def _status_label(record: ShipmentRecord) -> str:
    label = record.calculation.compliance_status_label
    if not _is_english(record):
        return label
    return {
        "Eksik Veri (Default Kullanıldı)": "Missing Data (Default Used)",
        "İç İncelemeye Hazır": "Ready for Internal Review",
        "Resmi Beyana Uygun": "Ready for Official Declaration",
    }.get(label, label)


def _data_quality_summary(record: ShipmentRecord) -> str:
    if not _is_english(record):
        return record.calculation.data_quality_summary.summary_text

    level = record.calculation.confidence_level.value
    return {
        "high": "Most of the dataset is supported by actual measurements and verified operator data.",
        "medium": "The report uses a mixed data structure; some fields were completed with default values.",
        "low": "The report relies mainly on default values; actual data is recommended before formal submission.",
    }.get(level, record.calculation.data_quality_summary.summary_text)


def _find_font_path(candidates: list[str]) -> str | None:
    for candidate in candidates:
        if os.path.exists(candidate):
            return candidate
    return None


def _ensure_fonts_registered() -> None:
    global FONT_REGULAR, FONT_BOLD, FONT_ITALIC, FONT_BOLD_ITALIC

    registered = set(pdfmetrics.getRegisteredFontNames())
    fallback_aliases = {
        "FONT_REGULAR": "Helvetica",
        "FONT_BOLD": "Helvetica-Bold",
        "FONT_ITALIC": "Helvetica-Oblique",
        "FONT_BOLD_ITALIC": "Helvetica-BoldOblique",
    }
    font_variables = {
        "FONT_REGULAR": FONT_REGULAR,
        "FONT_BOLD": FONT_BOLD,
        "FONT_ITALIC": FONT_ITALIC,
        "FONT_BOLD_ITALIC": FONT_BOLD_ITALIC,
    }

    for variable_name, font_name in list(font_variables.items()):
        if font_name in registered:
            continue
        font_path = _find_font_path(FONT_CANDIDATES[font_name])
        if font_path:
            pdfmetrics.registerFont(TTFont(font_name, font_path))
            registered.add(font_name)
            continue
        fallback = fallback_aliases[variable_name]
        globals()[variable_name] = fallback


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
        _pdf_text(record, "Yetkili CBAM Beyan Sahibi", "Authorised CBAM Declarant"),
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
        _pdf_text(record, "İthalat Detayları", "Import Details"),
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
        _pdf_text(record, "Üretim Tesisi", "Producing Installation"),
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
        _pdf_text(record, "Eşya ve Metodoloji", "Goods and Methodology"),
        [
            _pdf_text(record, "Sektör", "Sector") + f": {record.payload.goods.sector.value}",
            _pdf_text(record, "Malzeme", "Material") + f": {record.payload.goods.material_type.value}",
            _pdf_text(record, "Üretim rotası", "Production route") + f": {record.payload.production.production_route}",
            _pdf_text(record, "Uygulanan hesaplama yöntemi", "Calculation method applied") + f": {record.calculation.calculation_method_applied}",
            _pdf_text(record, "Varsayılan değer kaynağı", "Default value source") + f": {record.calculation.default_value_source or 'n/a'}",
            _pdf_text(record, "Uygunluk durumu", "Compliance status") + f": {_status_label(record)}",
            _pdf_text(record, "Veri güveni", "Confidence level") + f": {_confidence_label(record)}",
        ],
        width - 2 * margin,
    )

    table_y = y
    table_h = 36 * mm
    _draw_box(
        pdf,
        margin,
        table_y,
        width - 2 * margin,
        table_h,
        _pdf_text(record, "Gömülü Emisyon Özeti", "Embedded Emissions Summary"),
    )
    pdf.setFont(FONT_BOLD, 9)
    headers = [
        _pdf_text(record, "Üretilen ton", "Produced t"),
        _pdf_text(record, "Doğrudan enerji", "Direct energy"),
        _pdf_text(record, "Doğrudan proses", "Direct process"),
        _pdf_text(record, "Dolaylı", "Indirect"),
        _pdf_text(record, "Prekürsör", "Precursor"),
        _pdf_text(record, "Toplam", "Total"),
        _pdf_text(record, "Özgül", "Specific"),
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
        _pdf_text(record, "Menşede ödenen karbon fiyatı", "Carbon price paid in origin")
        + f": EUR {record.payload.carbon_price.carbon_price_paid_eur:.2f}",
    )
    y = table_y - table_h - 4 * mm

    y = _draw_key_value_block(
        pdf,
        margin,
        y,
        _pdf_text(record, "Veri Kalitesi Özeti", "Data Quality Summary"),
        [
            _pdf_text(record, "Veri güveni", "Confidence level") + f": {_confidence_label(record)}",
            _pdf_text(record, "Actual alanlar", "Actual fields") + f": {record.calculation.data_quality_summary.actual_fields_count}",
            _pdf_text(record, "Default alanlar", "Default fields") + f": {record.calculation.data_quality_summary.default_fields_count}",
            _pdf_text(record, "Actual payı", "Actual share") + f": %{record.calculation.data_quality_summary.actual_share * 100:.0f}",
            _pdf_text(record, "Default payı", "Default share") + f": %{record.calculation.data_quality_summary.default_share * 100:.0f}",
            _pdf_text(record, "Not", "Note") + f": {_data_quality_summary(record)}",
        ],
        width - 2 * margin,
    )

    left_w = (width - 2 * margin) * 0.5
    right_w = (width - 2 * margin) - left_w - 4 * mm
    y_left = _draw_key_value_block(
        pdf,
        margin,
        y,
        _pdf_text(record, "Doğrulama ve Kanıtlar", "Verification and Evidence"),
        [
            _pdf_text(record, "Durum", "Status") + f": {record.payload.verification.verification_status.value}",
            _pdf_text(record, "Doğrulayıcı", "Verifier") + f": {record.payload.verification.verifier_name or _pdf_text(record, 'Bekliyor', 'Pending')}",
            _pdf_text(record, "Akreditasyon no", "Accreditation no") + f": {record.payload.verification.verifier_accreditation_number or _pdf_text(record, 'Bekliyor', 'Pending')}",
            _pdf_text(record, "İzleme planı", "Monitoring plan") + f": {record.payload.methodology.monitoring_plan_reference or _pdf_text(record, 'Sunulmadı', 'Not provided')}",
        ],
        left_w,
    )
    signature_x = margin + left_w + 4 * mm
    signature_h = 38 * mm
    _draw_box(pdf, signature_x, y, right_w, signature_h, _pdf_text(record, "Kaşe / İmza", "Stamp / Signature"))
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
    pdf.drawString(
        signature_x + 7 * mm,
        y - 26 * mm,
        _pdf_text(record, "Tarih / Kaşe", "Date / Stamp") + ": __________________",
    )
    pdf.setFillColor(colors.black)
    _draw_wrapped_text(
        pdf,
        _pdf_text(
            record,
            "E-imza ile imzalanabilir veya ıslak imza/kaşe yapılarak taranabilir.",
            "This document can be signed with an e-signature or signed/stamped physically and scanned.",
        ),
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
        _pdf_text(
            record,
            "Bu rapor, KarbonBeyan yazılımı tarafından AB 2023/956 sayılı yönetmeliğine uygun metodolojiler kullanılarak hazırlanmış bir ön-beyan özetidir. Girilen verilerin doğruluğu ve resmi gümrük beyan sorumluluğu kullanıcıya aittir.",
            "This report is a pre-declaration summary prepared by KarbonBeyan using methodologies aligned with EU Regulation 2023/956. The accuracy of the entered data and the responsibility for any formal customs declaration remain with the user.",
        ),
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
