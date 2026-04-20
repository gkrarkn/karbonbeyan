import { useState } from "react";

import { t, translateComplianceStatus, translateConfidence, translateRole } from "../lib/i18n";
import { highestRiskRecords, pendingVerifications, upcomingDeclarations } from "../data/mockData";
import EmissionsChart from "./charts/EmissionsChart";

function DashboardHome({
  trendData,
  shipments,
  loading,
  error,
  workspaceAccess,
  locale,
  onStartReport,
  onRequestQuote,
}) {
  const [quoteForm, setQuoteForm] = useState({
    name: "",
    company: "",
    email: "",
    message: "",
  });
  const hasLiveShipments = shipments.length > 0;
  const pendingShipments = shipments.filter(
    (shipment) => shipment.payload.verification.verification_status === "pending",
  );
  const riskyShipments = shipments
    .filter((shipment) => shipment.calculation.confidence_level !== "high")
    .sort(
      (left, right) =>
        right.calculation.data_quality_summary.default_share -
        left.calculation.data_quality_summary.default_share,
    );

  const complianceCounts = shipments.reduce(
    (accumulator, shipment) => {
      const status = shipment.calculation.compliance_status_label;
      accumulator[status] = (accumulator[status] || 0) + 1;
      return accumulator;
    },
    {
      "Eksik Veri (Default Kullanıldı)": 0,
      "İç İncelemeye Hazır": 0,
      "Resmi Beyana Uygun": 0,
    },
  );

  const totalEmissions = shipments
    .reduce((sum, shipment) => sum + Number(shipment.calculation.total_embedded_emissions_tco2 || 0), 0)
    .toFixed(1);

  const avgConfidence =
    shipments.length > 0
      ? shipments.filter((shipment) => shipment.calculation.confidence_level === "high").length > shipments.length / 2
        ? t(locale, "Yüksek", "High")
        : shipments.filter((shipment) => shipment.calculation.confidence_level === "low").length > shipments.length / 2
          ? t(locale, "Düşük", "Low")
          : t(locale, "Orta", "Medium")
      : t(locale, "Orta", "Medium");

  const handleQuoteChange = (field, value) => {
    setQuoteForm((current) => ({ ...current, [field]: value }));
  };

  return (
    <div className="space-y-6">
      <section className="panel overflow-hidden">
        <div className="grid gap-6 bg-[linear-gradient(135deg,#0E4FAF_0%,#0B3F91_55%,#0B2447_100%)] p-6 text-white xl:grid-cols-[1.2fr_0.8fr]">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.3em] text-white/65">KarbonBeyan Vision</div>
            <h2 className="mt-3 text-3xl font-extrabold">{t(locale, "CBAM Uyum Sürecinizi Yönetin ve Riskinizi Görün", "Manage Your CBAM Process and See Your Risk")}</h2>
            <p className="mt-3 max-w-2xl text-sm text-white/75">
              {t(locale, "Hesap üretmekten öte; uygunluk statüsü, veri güveni, doğrulama kuyruğu ve tedarikçi akışını tek kontrol merkezinden yönetin.", "Go beyond calculations and manage compliance status, confidence, verification queues and supplier flows from one control center.")}
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <button type="button" onClick={onStartReport} className="rounded-2xl bg-white px-5 py-3 text-sm font-bold text-[#0E4FAF] shadow-sm transition hover:translate-y-[-1px]">
                {t(locale, "Ücretsiz Başla", "Start Free")}
              </button>
              <button
                type="button"
                onClick={() =>
                  document.getElementById("quote-request-section")?.scrollIntoView({ behavior: "smooth", block: "start" })
                }
                className="rounded-2xl border border-white/25 bg-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/15"
              >
                {t(locale, "Teklif Al", "Request a Quote")}
              </button>
            </div>
            {!hasLiveShipments && !loading ? (
              <div className="mt-4 inline-flex rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-white/85">
                {t(locale, "İlk canlı kayıt geldiğinde dashboard metrikleri otomatik dolacaktır.", "Dashboard metrics will auto-populate when the first live record arrives.")}
              </div>
            ) : null}
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-1">
            <div className="rounded-3xl bg-white/10 p-4 backdrop-blur">
              <div className="text-xs uppercase tracking-[0.24em] text-white/60">{t(locale, "Trial Durumu", "Trial Status")}</div>
              <div className="mt-2 text-xl font-extrabold">
                {workspaceAccess?.trial_status === "active" ? t(locale, `${workspaceAccess.trial_days_remaining} gün full erişim`, `${workspaceAccess.trial_days_remaining} days full access`) : t(locale, "Plan bazlı erişim aktif", "Plan-based access active")}
              </div>
              <div className="mt-2 text-sm text-white/75">
                {t(locale, "Supplier Data Collection dahil tüm Pro modüller şu an açık.", "All Pro modules, including Supplier Data Collection, are currently enabled.")}
              </div>
            </div>
            <div className="rounded-3xl bg-white/10 p-4 backdrop-blur">
              <div className="text-xs uppercase tracking-[0.24em] text-white/60">{t(locale, "Yetki ve Plan", "Access and Plan")}</div>
              <div className="mt-2 text-xl font-extrabold">{translateRole(locale, workspaceAccess?.role_label || t(locale, "Firma Yöneticisi", "Company Admin"))}</div>
              <div className="mt-2 text-sm text-white/75">
                {t(locale, "Aktif seviye", "Current level")}: {(workspaceAccess?.active_plan || "growth").toUpperCase()}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section
        id="quote-request-section"
        className="panel overflow-hidden border border-[#0E4FAF]/10 bg-[linear-gradient(180deg,#ffffff_0%,#f5f8ff_100%)] p-6"
      >
        <div className="grid gap-6 xl:grid-cols-[1fr_1.1fr]">
          <div>
            <div className="text-sm font-semibold text-[#0E4FAF]">
              {t(locale, "Kurumsal Paketler", "Enterprise Plans")}
            </div>
            <h3 className="mt-2 text-3xl font-extrabold text-ink">
              {t(locale, "Yükseltmek için teklif isteyin", "Request a quote to upgrade")}
            </h3>
            <p className="mt-3 max-w-xl text-sm text-slate-600">
              {t(
                locale,
                "Tedarikçi veri toplama, çok kullanıcılı ekip yapısı, doğrulama akışları ve kurumsal onboarding için ekibimiz sizinle doğrudan temas kursun.",
                "Let our team contact you directly for supplier data collection, multi-user workspaces, verification flows and enterprise onboarding.",
              )}
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              {[
                t(locale, "Kurumsal onboarding", "Enterprise onboarding"),
                t(locale, "Çoklu kullanıcı ve rol", "Multi-user roles"),
                t(locale, "Supplier Data Collection", "Supplier Data Collection"),
              ].map((item) => (
                <div key={item} className="rounded-2xl bg-white px-4 py-4 text-sm font-semibold text-slate-700 shadow-sm">
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
            <div className="text-sm font-semibold text-slate-500">
              {t(locale, "Teklif Formu", "Quote Request Form")}
            </div>
            <div className="mt-1 text-xl font-bold text-ink">
              {t(locale, "Kurumsal satış ekibine ulaşın", "Reach the enterprise sales team")}
            </div>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <input
                className="field"
                value={quoteForm.name}
                onChange={(event) => handleQuoteChange("name", event.target.value)}
                placeholder={t(locale, "Ad Soyad", "Full Name")}
              />
              <input
                className="field"
                value={quoteForm.company}
                onChange={(event) => handleQuoteChange("company", event.target.value)}
                placeholder={t(locale, "Firma", "Company")}
              />
              <input
                className="field sm:col-span-2"
                value={quoteForm.email}
                onChange={(event) => handleQuoteChange("email", event.target.value)}
                placeholder={t(locale, "Kurumsal E-posta", "Business Email")}
              />
              <textarea
                className="field min-h-[128px] resize-y sm:col-span-2"
                value={quoteForm.message}
                onChange={(event) => handleQuoteChange("message", event.target.value)}
                placeholder={t(
                  locale,
                  "Aylık rapor hacmi, ekip büyüklüğü veya tedarikçi akışı ihtiyacınızı kısaca yazın.",
                  "Briefly describe your monthly report volume, team size or supplier workflow needs.",
                )}
              />
            </div>
            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-slate-500">
                {t(
                  locale,
                  "Formu gönderdiğinizde teklif talebiniz e-posta olarak satış kanalına düşer.",
                  "When you submit the form, your quote request is sent by email to the sales channel.",
                )}
              </p>
              <button
                type="button"
                onClick={() => onRequestQuote?.(quoteForm)}
                className="btn-primary whitespace-nowrap"
              >
                {t(locale, "Teklif Al", "Request a Quote")}
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        {[
          {
            title: "Eksik Veri (Default Kullanıldı)",
            value: complianceCounts["Eksik Veri (Default Kullanıldı)"],
            meta: "Öncelikli iç takip",
            tone: "bg-clay",
          },
          {
            title: "İç İncelemeye Hazır",
            value: complianceCounts["İç İncelemeye Hazır"],
            meta: "Operasyon ekibi kontrol etmeli",
            tone: "bg-moss",
          },
          {
            title: "Resmi Beyana Uygun",
            value: complianceCounts["Resmi Beyana Uygun"],
            meta: "Doğrulama tamamlandı",
            tone: "bg-pine",
          },
        ].map((card) => (
          <article key={card.title} className="panel overflow-hidden">
            <div className={`h-2 ${card.tone}`} />
            <div className="p-6">
              <div className="text-sm font-semibold text-slate-500">{card.title}</div>
              <div className="mt-3 text-3xl font-extrabold text-ink">{card.value}</div>
              <div className="mt-2 text-sm text-slate-500">{card.meta}</div>
            </div>
          </article>
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        {[
          { title: t(locale, "Toplam Gömülü Emisyon", "Total Embedded Emissions"), value: `${totalEmissions} tCO2e`, meta: t(locale, "Canlı kayıtlar", "Live records"), tone: "bg-pine" },
          { title: t(locale, "Ortalama Veri Güveni", "Average Data Confidence"), value: avgConfidence, meta: t(locale, "Shipment kayıtlarından hesaplandı", "Calculated from shipment records"), tone: "bg-clay" },
          {
            title: t(locale, "Verification Bekleyen", "Pending Verification"),
            value: pendingShipments.length,
            meta: t(locale, "Resmi beyana engel kayıt", "Blocking official declaration"),
            tone: "bg-moss",
          },
        ].map((card) => (
          <article key={card.title} className="panel overflow-hidden">
            <div className={`h-2 ${card.tone}`} />
            <div className="p-6">
              <div className="text-sm font-semibold text-slate-500">{card.title}</div>
              <div className="mt-3 text-3xl font-extrabold text-ink">{card.value}</div>
              <div className="mt-2 text-sm text-slate-500">{card.meta}</div>
            </div>
          </article>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.45fr_0.95fr]">
        <EmissionsChart data={trendData} />

        <div className="panel p-6">
          <div className="text-sm font-semibold text-slate-500">En Riskli 5 Kayıt</div>
          <h3 className="mt-1 text-xl font-bold text-ink">Öncelikli müdahale listesi</h3>
          <div className="mt-5 space-y-4">
            {(hasLiveShipments
              ? riskyShipments.slice(0, 5).map((shipment) => ({
                  ref: shipment.payload.import_details.shipment_reference,
                  company: shipment.payload.facility.installation_name,
                  reason: shipment.calculation.data_quality_summary.summary_text,
                  confidence: shipment.calculation.confidence_label,
                }))
              : highestRiskRecords
            ).map((row) => (
              <div key={row.ref} className="rounded-2xl bg-mist p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-semibold text-ink">{row.company}</div>
                  <div className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600">
                    {translateConfidence(locale, row.confidence)}
                  </div>
                </div>
                <div className="mt-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                  {row.ref}
                </div>
                <p className="mt-2 text-sm text-slate-600">{row.reason}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        <div className="panel p-6">
          <div className="text-sm font-semibold text-slate-500">Beyan Dönemi Yaklaşanlar</div>
          <h3 className="mt-1 text-xl font-bold text-ink">Takvim baskısı olan kayıtlar</h3>
          <div className="mt-5 space-y-4">
            {(hasLiveShipments
              ? shipments.slice(0, 3).map((shipment) => ({
                  company: shipment.payload.facility.installation_name,
                  period: `${shipment.payload.reporting.declaration_year}`,
                  due: "Takvimlenmeli",
                }))
              : upcomingDeclarations
            ).map((row) => (
              <div key={`${row.company}-${row.period}`} className="rounded-2xl bg-slate-50 p-4">
                <div className="text-sm font-semibold text-ink">{row.company}</div>
                <div className="mt-2 text-sm text-slate-600">{row.period}</div>
                <div className="mt-1 text-sm font-semibold text-clay">{row.due}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="panel p-6">
          <div className="text-sm font-semibold text-slate-500">Verification Bekleyenler</div>
          <h3 className="mt-1 text-xl font-bold text-ink">Doğrulayıcı aksiyonu gerekli</h3>
          <div className="mt-5 space-y-4">
            {(pendingShipments.slice(0, 3).map((shipment) => ({
              company: shipment.payload.facility.installation_name,
              verifier: shipment.payload.verification.verifier_name || "Atanmadı",
              status: "Bekliyor",
            })).length > 0
              ? pendingShipments.slice(0, 3).map((shipment) => ({
                  company: shipment.payload.facility.installation_name,
                  verifier: shipment.payload.verification.verifier_name || "Atanmadı",
                  status: "Bekliyor",
                }))
              : pendingVerifications
            ).map((row) => (
              <div key={`${row.company}-${row.status}`} className="rounded-2xl bg-slate-50 p-4">
                <div className="text-sm font-semibold text-ink">{row.company}</div>
                <div className="mt-2 text-sm text-slate-600">Verifier: {row.verifier}</div>
                <div className="mt-1 text-sm font-semibold text-slate-700">{translateComplianceStatus(locale, row.status)}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="panel p-6">
          <div className="text-sm font-semibold text-slate-500">Veri Güveni</div>
          <h3 className="mt-1 text-xl font-bold text-ink">Actual vs Default dağılımı</h3>
          <div className="mt-6 space-y-4">
            <div className="rounded-2xl bg-mist p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-700">Actual alanlar</span>
                <span className="text-sm font-bold text-pine">
                  %{hasLiveShipments ? Math.round((shipments.reduce((sum, shipment) => sum + shipment.calculation.data_quality_summary.actual_share, 0) / shipments.length) * 100) : 0}
                </span>
              </div>
              <div className="mt-3 h-3 rounded-full bg-white">
                <div
                  className="h-3 rounded-full bg-pine"
                  style={{
                    width: `${hasLiveShipments ? Math.round((shipments.reduce((sum, shipment) => sum + shipment.calculation.data_quality_summary.actual_share, 0) / shipments.length) * 100) : 0}%`,
                  }}
                />
              </div>
            </div>
            <div className="rounded-2xl bg-mist p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-700">Default alanlar</span>
                <span className="text-sm font-bold text-clay">
                  %{hasLiveShipments ? Math.round((shipments.reduce((sum, shipment) => sum + shipment.calculation.data_quality_summary.default_share, 0) / shipments.length) * 100) : 0}
                </span>
              </div>
              <div className="mt-3 h-3 rounded-full bg-white">
                <div
                  className="h-3 rounded-full bg-clay"
                  style={{
                    width: `${hasLiveShipments ? Math.round((shipments.reduce((sum, shipment) => sum + shipment.calculation.data_quality_summary.default_share, 0) / shipments.length) * 100) : 0}%`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="panel p-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold text-slate-500">{t(locale, "Son Kayıtlar", "Latest Records")}</div>
            <h3 className="mt-1 text-xl font-bold text-ink">{t(locale, "Arşivden son raporlar", "Recent reports from the archive")}</h3>
          </div>
          <button type="button" className="btn-secondary">
            Tümünü Gör
          </button>
        </div>

        {loading ? <p className="mt-6 text-sm text-slate-500">Kayıtlar yükleniyor...</p> : null}
        {!loading && error ? <p className="mt-6 text-sm font-medium text-clay">{error}</p> : null}
        {!loading && shipments.length > 0 ? (
          <div className="mt-6 overflow-x-auto">
            <table className="min-w-full text-left">
              <thead>
                <tr className="border-b border-slate-200 text-sm text-slate-500">
                  <th className="pb-3 font-semibold">Referans</th>
                  <th className="pb-3 font-semibold">Firma</th>
                  <th className="pb-3 font-semibold">Yöntem</th>
                  <th className="pb-3 font-semibold">Durum</th>
                  <th className="pb-3 font-semibold">Emisyon</th>
                </tr>
              </thead>
              <tbody>
                {shipments.slice(0, 5).map((shipment) => (
                  <tr key={shipment.shipment_id} className="border-b border-slate-100 text-sm text-slate-700">
                    <td className="py-4 font-semibold">{shipment.payload.import_details.shipment_reference}</td>
                    <td className="py-4">{shipment.payload.facility.installation_name}</td>
                    <td className="py-4">{shipment.calculation.calculation_method_applied}</td>
                    <td className="py-4">{translateComplianceStatus(locale, shipment.calculation.compliance_status_label)}</td>
                    <td className="py-4">{shipment.calculation.total_embedded_emissions_tco2} tCO2e</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>
    </div>
  );
}

export default DashboardHome;
