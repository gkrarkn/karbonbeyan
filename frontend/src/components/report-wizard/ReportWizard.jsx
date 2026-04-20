import { useEffect, useMemo, useState } from "react";

import { createShipment, downloadShipmentPdf, validateCnCode } from "../../lib/api";
import { t } from "../../lib/i18n";
import StepIndicator from "./StepIndicator";

function getSteps(locale) {
  return [
    { id: "urun", title: t(locale, "Ürün ve Sevkiyat", "Product and Shipment"), description: t(locale, "CN kodu, menşe, miktar", "CN code, origin, quantity") },
    { id: "tesis", title: t(locale, "Tesis Bilgileri", "Facility Details"), description: t(locale, "Kuruluş ve operatör detayları", "Installation and operator details") },
    { id: "uretim", title: t(locale, "Üretim ve Yöntem", "Production and Method"), description: t(locale, "Rota, period, actual/default", "Route, period, actual/default") },
    { id: "dogrula", title: t(locale, "Kontrol ve Gönder", "Review and Submit"), description: t(locale, "Özet, PDF ve hesaplama", "Summary, PDF and calculation") },
  ];
}

const initialForm = {
  shipmentReference: "TR-2026-0001",
  cnCode: "72082520",
  goodsDescription: "Sıcak haddelenmiş çelik rulo",
  quantityTons: "1250",
  countryOfOrigin: "TR",
  importDate: "2026-05-01",
  installationName: "Marmara Steel Works",
  installationId: "TR-CBAM-STEEL-01",
  city: "Kocaeli",
  operatorName: "Marmara Steel A.Ş.",
  operatorEmail: "cbam@marmarasteel.example",
  declarationYear: "2026",
  productionRoute: "carbon_steel_bf_bof",
  productionMethod: "hot_rolled_flat_products",
  calculationMethod: "default",
  producedQuantityTons: "1250",
  hasActualData: "hayir",
  declarantName: "Firma Yetkilisi",
  declarantEori: "DE123456789000",
  cbamAccountNumber: "CBAM-DE-2026-000045",
  memberState: "DE",
  importerName: "İthalatçı Firma",
  importerEori: "DE123456789000",
};

const glossary = {
  bf_bof: "BF/BOF, yüksek fırın ve bazik oksijen fırını hattını ifade eder. Primer çelik üretiminde kullanılır.",
  secondary_aluminium: "Secondary Aluminium, hurda bazlı geri kazanılmış alüminyum üretim rotasıdır.",
  monitoring_plan: "Monitoring Plan, emisyon verisinin nasıl toplandığını ve hangi kanıtlarla desteklendiğini açıklayan yöntem dokümanıdır.",
};

function Tooltip({ term }) {
  return (
    <span className="group relative inline-flex items-center">
      <span className="ml-2 inline-flex h-5 w-5 cursor-help items-center justify-center rounded-full bg-slate-200 text-[11px] font-bold text-slate-700">
        i
      </span>
      <span className="pointer-events-none absolute left-0 top-7 z-10 hidden w-64 rounded-2xl bg-ink px-3 py-2 text-xs font-medium text-white shadow-xl group-hover:block">
        {glossary[term]}
      </span>
    </span>
  );
}

function FormField({ label, children, hint, tooltip }) {
  return (
    <label className="block">
      <span className="label flex items-center">
        {label}
        {tooltip ? <Tooltip term={tooltip} /> : null}
      </span>
      {children}
      {hint ? <span className="mt-2 block text-xs text-slate-500">{hint}</span> : null}
    </label>
  );
}

function ReportWizard({ onShipmentCreated, locale = "tr" }) {
  const steps = getSteps(locale);
  const [currentStep, setCurrentStep] = useState(0);
  const [form, setForm] = useState(initialForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitResult, setSubmitResult] = useState(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [cnValidation, setCnValidation] = useState(null);
  const [isValidatingCn, setIsValidatingCn] = useState(false);

  useEffect(() => {
    if (form.cnCode.length !== 8) {
      setCnValidation(null);
      return undefined;
    }

    const timeoutId = window.setTimeout(async () => {
      setIsValidatingCn(true);
      try {
        const result = await validateCnCode(form.cnCode);
        setCnValidation(result);
        if (result.is_cbam_covered && result.detected_sector === "aluminum") {
          setForm((current) => ({
            ...current,
            productionRoute:
              result.detected_material_type === "secondary_aluminum"
                ? "secondary_aluminium"
                : "primary_aluminium",
          }));
        }
      } catch (error) {
        setCnValidation({
          is_cbam_covered: false,
          message: error.message,
        });
      } finally {
        setIsValidatingCn(false);
      }
    }, 350);

    return () => window.clearTimeout(timeoutId);
  }, [form.cnCode]);

  const updateField = (field) => (event) => {
    setForm((current) => ({ ...current, [field]: event.target.value }));
  };

  const nextStep = () => {
    setCurrentStep((current) => Math.min(current + 1, steps.length - 1));
  };

  const prevStep = () => {
    setCurrentStep((current) => Math.max(current - 1, 0));
  };

  const estimatedSpecificEmission = useMemo(() => {
    if (form.cnCode === "76011000") {
      return "1.464000";
    }
    if (form.cnCode === "76012000") {
      return "0.139000";
    }
    return "2.670263";
  }, [form.cnCode]);

  const detectedSectorLabel = cnValidation?.detected_sector_label || t(locale, "Henüz doğrulanmadı", "Not validated yet");
  const confidencePreview =
    form.hasActualData === "evet"
      ? t(locale, "Orta/Yüksek Güven", "Medium/High Confidence")
      : t(locale, "Düşük Güven (Default ağırlıklı)", "Low Confidence (default-weighted)");

  const buildPayload = () => ({
    declarant: {
      declarant_name: form.declarantName,
      declarant_eori: form.declarantEori,
      cbam_account_number: form.cbamAccountNumber,
      member_state_of_establishment: form.memberState,
      importer_name: form.importerName,
      importer_eori: form.importerEori,
    },
    import_details: {
      shipment_reference: form.shipmentReference,
      customs_declaration_number: null,
      import_date: form.importDate,
      customs_procedure: "release_for_free_circulation",
      country_of_origin: form.countryOfOrigin,
      country_of_dispatch: form.countryOfOrigin,
      destination_member_state: form.memberState,
      quantity_tons: Number(form.quantityTons),
      supplementary_unit_quantity: Number(form.quantityTons),
    },
    goods: {
      sector: cnValidation?.detected_sector || (form.cnCode.startsWith("76") ? "aluminum" : "iron_steel"),
      material_type:
        cnValidation?.detected_material_type ||
        (form.cnCode === "76011000"
          ? "primary_aluminum"
          : form.cnCode === "76012000"
            ? "secondary_aluminum"
            : "coil"),
      cn_code: form.cnCode,
      goods_description: form.goodsDescription,
      is_complex_good: false,
      net_mass_kg: Number(form.quantityTons) * 1000,
      origin_installation_country: form.countryOfOrigin,
    },
    facility: {
      installation_id: form.installationId,
      installation_name: form.installationName,
      country_code: form.countryOfOrigin,
      city: form.city,
      address_line: null,
      postal_code: null,
      operator: {
        operator_name: form.operatorName,
        contact_person: form.operatorName,
        email: form.operatorEmail,
        phone: null,
      },
    },
    reporting: {
      reporting_period_start: `${form.declarationYear}-01-01`,
      reporting_period_end: `${form.declarationYear}-12-31`,
      declaration_year: Number(form.declarationYear),
    },
    production: {
      production_method: form.productionMethod,
      production_route: form.productionRoute,
      produced_quantity_tons: Number(form.producedQuantityTons),
      functional_unit: "tonne_of_goods",
      process_description: form.goodsDescription,
    },
    methodology: {
      calculation_method: form.calculationMethod,
      monitoring_plan_reference: null,
      monitoring_plan_version: null,
      measurement_method_description: null,
      data_quality_notes:
        form.hasActualData === "evet"
          ? t(locale, "Kullanıcı actual veri bulunduğunu belirtti; veri güveni iç inceleme sonrası yükseltilebilir.", "The user indicated that actual data exists; confidence can improve after internal review.")
          : t(locale, "Actual veri sağlanmadı; sistem default value fallback ile hesaplayacak.", "No actual data was provided; the system will calculate with the default value fallback."),
      default_value_share: form.hasActualData === "evet" ? 0 : 1,
      uses_actual_electricity_data: false,
      actual_electricity_evidence_reference: null,
    },
    energy_inputs: [],
    precursor_inputs: [],
    emissions: {
      direct_process_emissions_tco2: 0,
      precursor_emissions_tco2: 0,
      non_attributed_emissions_tco2: 0,
    },
    carbon_price: {
      carbon_price_paid_eur: 0,
      carbon_price_scheme: null,
      rebate_or_other_compensation_eur: 0,
      evidence_reference: null,
    },
    verification: {
      verification_status: "pending",
      verifier_name: null,
      verifier_accreditation_number: null,
      verification_report_reference: null,
      verification_date: null,
      installation_visit_performed: null,
    },
    declaration_assets: {
      company_name_for_pdf: form.importerName,
      logo_path: null,
      signatory_name: form.declarantName,
      signatory_title: t(locale, "Yetkili CBAM Beyan Sahibi", "Authorized CBAM Declarant"),
      output_language: locale,
      show_stamp_box: true,
    },
  });

  const handleSubmit = async () => {
    setSubmitError("");
    if (cnValidation && !cnValidation.is_cbam_covered) {
      setSubmitError(t(locale, "Bu kod şu anki CBAM düzenlemesi kapsamında değildir.", "This code is currently outside the CBAM scope."));
      return;
    }
    setIsSubmitting(true);
    try {
      const result = await createShipment(buildPayload());
      setSubmitResult(result);
      if (onShipmentCreated) {
        await onShipmentCreated();
      }
    } catch (error) {
      setSubmitError(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePdfDownload = async () => {
    if (!submitResult?.shipment_id) {
      return;
    }
    setIsDownloading(true);
    setSubmitError("");
    try {
      await downloadShipmentPdf(submitResult.shipment_id);
    } catch (error) {
      setSubmitError(error.message);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="panel p-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="text-sm font-semibold text-slate-500">{t(locale, "Uyum Akışı", "Workflow")}</div>
            <h2 className="mt-1 text-2xl font-extrabold text-ink">
              {t(locale, "CBAM uyum sürecinizi yönetin ve riskinizi görün", "Manage your CBAM process and see your risk")}
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">
              {t(
                locale,
                "İlk aşamada minimum alanları girin; sistem CN kodunu tanır, veri güvenini gösterir, uygunluk statüsünü belirler ve resmi beyan öncesi süreci görünür kılar.",
                "Start with the minimum required fields; the system identifies the CN code, shows data confidence, assigns a compliance status and makes the pre-declaration process visible.",
              )}
            </p>
          </div>
          <div className="rounded-2xl bg-mist px-4 py-3 text-sm font-semibold text-slate-600">
            {t(locale, "Adım", "Step")} {currentStep + 1} / {steps.length}
          </div>
        </div>
      </div>

      <StepIndicator steps={steps} currentStep={currentStep} />

      <div className="panel p-6">
        {currentStep === 0 ? (
          <div className="grid gap-5 md:grid-cols-2">
            <FormField label={t(locale, "Sevkiyat Referansı", "Shipment Reference")}>
              <input className="field" value={form.shipmentReference} onChange={updateField("shipmentReference")} />
            </FormField>
            <FormField label={t(locale, "İthalat Tarihi", "Import Date")}>
              <input type="date" className="field" value={form.importDate} onChange={updateField("importDate")} />
            </FormField>
            <FormField
              label={t(locale, "CN Kodu (GTİP - İlk 8 Hane)", "CN Code (First 8 Digits of Tariff Code)")}
              hint={t(locale, "Bu kodu ihracat faturanızda veya gümrük beyannamenizde bulabilirsiniz.", "You can find this code on your export invoice or customs declaration.")}
            >
              <input className="field" value={form.cnCode} onChange={updateField("cnCode")} />
            </FormField>
            <FormField label={t(locale, "Menşe Ülke", "Country of Origin")}>
              <select className="field" value={form.countryOfOrigin} onChange={updateField("countryOfOrigin")}>
                <option value="TR">{t(locale, "Türkiye", "Turkey")}</option>
                <option value="EG">{t(locale, "Mısır", "Egypt")}</option>
                <option value="UA">{t(locale, "Ukrayna", "Ukraine")}</option>
              </select>
            </FormField>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 md:col-span-2">
              <div className="text-sm font-semibold text-slate-700">{t(locale, "Akıllı Doğrulama", "Smart Validation")}</div>
              <div className="mt-2 text-sm text-slate-600">
                {isValidatingCn
                  ? t(locale, "CN kodu doğrulanıyor...", "Validating CN code...")
                  : cnValidation?.message ||
                    t(locale, "8 haneli CN kodu girildiğinde sektör otomatik algılanır.", "The sector is detected automatically when an 8-digit CN code is entered.")}
              </div>
              <div className="mt-3 flex flex-wrap gap-3">
                <div className="rounded-full bg-white px-3 py-2 text-xs font-semibold text-slate-700">
                  {t(locale, "Algılanan sektör", "Detected sector")}: {detectedSectorLabel}
                </div>
                <div className="rounded-full bg-white px-3 py-2 text-xs font-semibold text-slate-700">
                  {t(locale, "Kapsam", "Coverage")}: {cnValidation?.is_cbam_covered ? t(locale, "CBAM kapsamı içinde", "Within CBAM scope") : t(locale, "Kontrol bekleniyor", "Awaiting validation")}
                </div>
              </div>
            </div>

            <FormField label={t(locale, "Ürün Tanımı", "Goods Description")} hint={t(locale, "Kullanıcının anlayacağı kısa açıklama", "A short description your team will recognize")}>
              <input className="field" value={form.goodsDescription} onChange={updateField("goodsDescription")} />
            </FormField>
            <FormField label={t(locale, "Miktar (ton)", "Quantity (tons)")}>
              <input className="field" value={form.quantityTons} onChange={updateField("quantityTons")} />
            </FormField>
          </div>
        ) : null}

        {currentStep === 1 ? (
          <div className="grid gap-5 md:grid-cols-2">
            <FormField label={t(locale, "Tesis Adı", "Installation Name")}>
              <input className="field" value={form.installationName} onChange={updateField("installationName")} />
            </FormField>
            <FormField label={t(locale, "Tesis Kodu", "Installation ID")}>
              <input className="field" value={form.installationId} onChange={updateField("installationId")} />
            </FormField>
            <FormField label={t(locale, "Şehir", "City")}>
              <input className="field" value={form.city} onChange={updateField("city")} />
            </FormField>
            <FormField label={t(locale, "Operatör / Firma Adı", "Operator / Company Name")}>
              <input className="field" value={form.operatorName} onChange={updateField("operatorName")} />
            </FormField>
            <FormField label={t(locale, "Operatör E-posta", "Operator Email")}>
              <input className="field" value={form.operatorEmail} onChange={updateField("operatorEmail")} />
            </FormField>
          </div>
        ) : null}

        {currentStep === 2 ? (
          <div className="grid gap-5 md:grid-cols-2">
            <FormField label={t(locale, "Beyan Yılı", "Declaration Year")}>
              <input className="field" value={form.declarationYear} onChange={updateField("declarationYear")} />
            </FormField>
            <FormField label={t(locale, "Üretim Rotası", "Production Route")} tooltip="bf_bof">
              <select className="field" value={form.productionRoute} onChange={updateField("productionRoute")}>
                <option value="carbon_steel_bf_bof">{t(locale, "Karbon Çelik BF/BOF", "Carbon Steel BF/BOF")}</option>
                <option value="carbon_steel_dri_eaf">{t(locale, "Karbon Çelik DRI/EAF", "Carbon Steel DRI/EAF")}</option>
                <option value="scrap_eaf">{t(locale, "Hurda EAF", "Scrap EAF")}</option>
                <option value="primary_aluminium">Primary Aluminium</option>
                <option value="secondary_aluminium">Secondary Aluminium</option>
              </select>
            </FormField>
            <FormField label={t(locale, "Üretim Metodu", "Production Method")}>
              <input className="field" value={form.productionMethod} onChange={updateField("productionMethod")} />
            </FormField>
            <FormField label={t(locale, "Üretilen Miktar (ton)", "Produced Quantity (tons)")}>
              <input className="field" value={form.producedQuantityTons} onChange={updateField("producedQuantityTons")} />
            </FormField>
            <FormField label={t(locale, "Hesaplama Yöntemi", "Calculation Method")} tooltip="monitoring_plan">
              <select className="field" value={form.calculationMethod} onChange={updateField("calculationMethod")}>
                <option value="default">Default</option>
                <option value="actual">Actual</option>
                <option value="mixed">Mixed</option>
              </select>
            </FormField>
            <FormField label={t(locale, "Doğrulanmış Actual Veri Var mı?", "Is verified actual data available?")} tooltip="secondary_aluminium">
              <select className="field" value={form.hasActualData} onChange={updateField("hasActualData")}>
                <option value="hayir">{t(locale, "Hayır, default ile ilerle", "No, continue with defaults")}</option>
                <option value="evet">{t(locale, "Evet, actual veri ile ilerleyeceğim", "Yes, I will continue with actual data")}</option>
              </select>
            </FormField>
          </div>
        ) : null}

        {currentStep === 3 ? (
          <div className="grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
            <div className="rounded-3xl bg-mist p-5">
              <div className="text-sm font-semibold text-slate-500">{t(locale, "Özet", "Summary")}</div>
              <div className="mt-4 space-y-3 text-sm text-slate-700">
                <div><span className="font-semibold">{t(locale, "Sevkiyat", "Shipment")}:</span> {form.shipmentReference}</div>
                <div><span className="font-semibold">{t(locale, "CN Kodu", "CN Code")}:</span> {form.cnCode}</div>
                <div><span className="font-semibold">{t(locale, "Algılanan sektör", "Detected sector")}:</span> {detectedSectorLabel}</div>
                <div><span className="font-semibold">{t(locale, "Tesis", "Installation")}:</span> {form.installationName}</div>
                <div><span className="font-semibold">{t(locale, "Metodoloji", "Methodology")}:</span> {form.calculationMethod}</div>
                <div><span className="font-semibold">{t(locale, "Üretim rotası", "Production route")}:</span> {form.productionRoute}</div>
                <div><span className="font-semibold">{t(locale, "Miktar", "Quantity")}:</span> {form.quantityTons} {t(locale, "ton", "tons")}</div>
                <div><span className="font-semibold">{t(locale, "Veri güveni", "Data confidence")}:</span> {submitResult?.calculation?.confidence_label || confidencePreview}</div>
              </div>
            </div>

            <div className="rounded-3xl bg-ink p-5 text-white">
              <div className="text-sm font-semibold text-white/60">{t(locale, "Sistem Tahmini", "System Estimate")}</div>
              <div className="mt-3 text-3xl font-extrabold">{estimatedSpecificEmission} tCO2e/ton</div>
              <p className="mt-3 text-sm text-white/70">
                {t(locale, "Sistem CN kodunu doğrular, veri güvenini hesaplar ve rapora uygunluk statüsü atar.", "The system validates the CN code, calculates data confidence and assigns a compliance status.")}
              </p>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="mt-5 w-full rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-ink disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? t(locale, "Uyum çıktısı hazırlanıyor...", "Preparing compliance output...") : t(locale, "Uyum Kaydını Oluştur", "Create Compliance Record")}
              </button>
              {submitResult ? (
                <div className="mt-4 rounded-2xl bg-white/10 p-4 text-sm text-white">
                  <div className="font-semibold">{t(locale, "Uyum kaydı başarıyla oluşturuldu", "Compliance record created successfully")}</div>
                  <div className="mt-2">{t(locale, "Kayıt No", "Record ID")}: {submitResult.shipment_id}</div>
                  <div className="mt-1">{t(locale, "Durum", "Status")}: {submitResult.calculation.compliance_status_label}</div>
                  <div className="mt-1">{t(locale, "Veri Güveni", "Data Confidence")}: {submitResult.calculation.confidence_label}</div>
                  <div className="mt-1">
                    {t(locale, "Veri Kalitesi", "Data Quality")}: {submitResult.calculation.data_quality_summary.actual_fields_count} actual / {submitResult.calculation.data_quality_summary.default_fields_count} default
                  </div>
                  <button
                    type="button"
                    onClick={handlePdfDownload}
                    disabled={isDownloading}
                    className="mt-4 w-full rounded-2xl border border-white/20 bg-sand px-4 py-3 text-sm font-semibold text-ink disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isDownloading ? t(locale, "PDF hazırlanıyor...", "Preparing PDF...") : t(locale, "PDF İndir", "Download PDF")}
                  </button>
                </div>
              ) : null}
              {submitError ? (
                <div className="mt-4 rounded-2xl bg-red-500/15 p-4 text-sm text-white">
                  {submitError}
                </div>
              ) : null}
            </div>
          </div>
        ) : null}

        <div className="mt-8 flex flex-col gap-3 border-t border-slate-200 pt-6 sm:flex-row sm:justify-between">
          <button type="button" onClick={prevStep} className="btn-secondary" disabled={currentStep === 0}>
            {t(locale, "Geri", "Back")}
          </button>
          <button
            type="button"
            onClick={nextStep}
            className="btn-primary"
            disabled={currentStep === steps.length - 1}
          >
            {t(locale, "Sonraki Adım", "Next Step")}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ReportWizard;
