import { t, translateComplianceStatus, translateConfidence, translateRole } from "../lib/i18n";
import { highestRiskRecords, pendingVerifications, upcomingDeclarations } from "../data/mockData";
import EmissionsChart from "./charts/EmissionsChart";

function getRecommendedActions(locale, shipments) {
  const lowConfidence = shipments.filter(
    (shipment) => shipment.calculation.confidence_level === "low",
  );
  const defaultHeavy = shipments.filter(
    (shipment) => shipment.calculation.data_quality_summary.default_share > 0,
  );
  const pendingVerification = shipments.filter(
    (shipment) => shipment.payload.verification.verification_status === "pending",
  );

  const actions = [];

  if (lowConfidence.length > 0) {
    actions.push({
      title: t(locale, "Üreticiden gerçek emisyon verisi isteyin", "Request real emissions data from the supplier"),
      body: t(
        locale,
        "Düşük güvenli kayıtlar tahmini verilere dayanıyor; resmi beyan öncesi üreticiden gerçek veri alınmalı.",
        "Low-confidence records rely on estimated data; obtain real producer data before formal declaration.",
      ),
    });
  }

  if (defaultHeavy.length > 0) {
    actions.push({
      title: t(locale, "Tahmini değer kullanımını azaltın", "Reduce reliance on estimated values"),
      body: t(
        locale,
        "Tahmini değerle ilerleyen alanları görünür kılın ve bu kayıtları öncelikli iç takip listesine alın.",
        "Identify fields using estimated values and move those records into your priority internal follow-up queue.",
      ),
    });
  }

  if (pendingVerification.length > 0) {
    actions.push({
      title: t(locale, "Bağımsız doğrulamayı planlayın", "Arrange third-party verification"),
      body: t(
        locale,
        "Bağımsız kontrol bekleyen kayıtlar resmi beyanı durdurur; doğrulayıcı ataması ve belge akışı planlanmalı.",
        "Records waiting for independent verification block formal declaration; assign a verifier and plan the evidence flow.",
      ),
    });
  }

  if (actions.length === 0) {
    actions.push(
      {
        title: t(locale, "Tahmini ve gerçek veri farkını görün", "See the gap between estimated and actual data"),
        body: t(
          locale,
          "İlk sevkiyatları içeri aldığınızda sistem veri güvenini ve risk seviyesini otomatik gösterecek.",
          "Once your first shipments are inside, the system will automatically expose confidence and reporting risk.",
        ),
      },
      {
        title: t(locale, "Eksik alanları anında tespit edin", "Spot missing fields instantly"),
        body: t(
          locale,
          "Takımınız hangi kaydın default ile ilerlediğini ve hangisinin güçlendirilmesi gerektiğini tek ekranda görecek.",
          "Your team will see which records rely on defaults and which ones must be strengthened before declaration.",
        ),
      },
      {
        title: t(locale, "Resmi beyana hazır olup olmadığınızı bilin", "Know whether you are ready for formal declaration"),
        body: t(
          locale,
          "Uygunluk statüsü ve verification kuyruğu sayesinde hangi kaydın gerçekten hazır olduğunu net göreceksiniz.",
          "Compliance status and verification queues make it clear which records are actually ready for formal declaration.",
        ),
      },
    );
  }

  return actions.slice(0, 3);
}

function DashboardHome({
  trendData,
  shipments,
  plans,
  loading,
  error,
  workspaceAccess,
  locale,
  onStartReport,
  onRequestQuote,
}) {
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

  const avgActualShare = hasLiveShipments
    ? Math.round(
        (shipments.reduce((sum, shipment) => sum + shipment.calculation.data_quality_summary.actual_share, 0) /
          shipments.length) *
          100,
      )
    : 0;
  const avgDefaultShare = hasLiveShipments
    ? Math.round(
        (shipments.reduce((sum, shipment) => sum + shipment.calculation.data_quality_summary.default_share, 0) /
          shipments.length) *
          100,
      )
    : 0;

  const avgConfidence =
    shipments.length > 0
      ? shipments.filter((shipment) => shipment.calculation.confidence_level === "high").length > shipments.length / 2
        ? t(locale, "Yüksek", "High")
        : shipments.filter((shipment) => shipment.calculation.confidence_level === "low").length > shipments.length / 2
          ? t(locale, "Düşük", "Low")
          : t(locale, "Orta", "Medium")
      : t(locale, "Orta", "Medium");

  const pricingCards = [
    {
      planId: "starter",
      name: "Starter",
      audience: t(locale, "Küçük ve orta ölçekli ihracatçılar için", "For small and mid-sized exporters"),
      value: t(
        locale,
        "CBAM sürecini başlatır ve ilk karbon maliyeti görünürlüğünü hızlıca sağlar.",
        "Gets your CBAM process started and quickly gives you first carbon cost visibility.",
      ),
      features: [
        t(locale, "Aylık 15 rapora kadar kullanım", "Up to 15 reports per month"),
        t(locale, "1 kullanıcı ile çalışma", "Single-user workspace"),
        t(locale, "PDF rapor alma", "Generate PDF reports"),
        t(locale, "Temel arşiv ve kayıt takibi", "Basic archive and record tracking"),
        t(locale, "Karbon maliyetini hızlı görme", "See carbon cost quickly"),
      ],
      cta: t(locale, "Hemen Başla", "Start Now"),
      action: "signup",
    },
    {
      planId: "growth",
      name: "Growth",
      audience: t(locale, "Daha doğru maliyet ve risk takibi isteyen ekipler için", "For teams that want stronger cost and risk tracking"),
      value: t(
        locale,
        "Operasyon görünürlüğünü artırır, kayıtları önceliklendirir ve riski daha net gösterir.",
        "Improves operational visibility, prioritizes records and makes risk easier to act on.",
      ),
      features: [
        t(locale, "Aylık 75 rapora kadar kullanım", "Up to 75 reports per month"),
        t(locale, "5 kullanıcıya kadar ekip erişimi", "Up to 5 team members"),
        t(locale, "İç kontrol ve inceleme akışı", "Internal review workflow"),
        t(locale, "Daha güçlü risk ve maliyet takibi", "Stronger risk and cost tracking"),
        t(locale, "Gelişmiş arşiv filtreleri", "Advanced archive filters"),
      ],
      cta: t(locale, "Hemen Başla", "Start Now"),
      action: "signup",
      featured: true,
    },
    {
      planId: "pro",
      name: "Pro",
      audience: t(locale, "Kurumsal yapı ve çok kullanıcılı ekipler için", "For enterprise teams and multi-user operations"),
      value: t(
        locale,
        "Gelişmiş kontrol, tedarikçi akışı ve kurumsal süreç yönetimi sağlar.",
        "Adds advanced control, supplier workflows and enterprise process management.",
      ),
      features: [
        t(locale, "Çok kullanıcılı kurumsal yapı", "Enterprise multi-user setup"),
        t(locale, "Tedarikçiden veri toplama akışı", "Supplier data collection flow"),
        t(locale, "API ve entegrasyon desteği", "API and integration support"),
        t(locale, "Kurumsal kurulum ve onboarding", "Enterprise setup and onboarding"),
        t(locale, "İleri seviye süreç görünürlüğü", "Advanced process visibility"),
      ],
      cta: t(locale, "İletişime Geç", "Contact Us"),
      action: "quote",
    },
  ];

  return (
    <div className="space-y-6">
      <section className="panel overflow-hidden">
        <div className="grid gap-6 bg-[linear-gradient(135deg,#0E4FAF_0%,#0B3F91_55%,#0B2447_100%)] p-6 text-white xl:grid-cols-[1.2fr_0.8fr]">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.3em] text-white/65">KarbonBeyan Vision</div>
            <h2 className="mt-3 text-3xl font-extrabold">
              {t(
                locale,
                "AB'ye yaptığınız sevkiyatlarda karbon maliyetinizi görün, raporlama riskinizi azaltın",
                "See the carbon cost of your EU shipments and reduce reporting risk",
              )}
            </h2>
            <p className="mt-3 max-w-2xl text-sm text-white/75">
              {t(
                locale,
                "Tahmini ve gerçek veri farkını görün, eksik alanları anında tespit edin ve resmi beyana hazır olup olmadığınızı tek panelden bilin.",
                "See the gap between estimated and actual data, spot missing fields instantly and know whether you are ready for formal declaration from one panel.",
              )}
            </p>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              {[
                t(locale, "Tahmini ve gerçek veri farkını görün", "See the gap between estimated and actual data"),
                t(locale, "Eksik alanları anında tespit edin", "Spot missing fields instantly"),
                t(locale, "Resmi beyana hazır olup olmadığınızı bilin", "Know whether you are ready for formal declaration"),
              ].map((item) => (
                <div key={item} className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm font-semibold text-white/90">
                  {item}
                </div>
              ))}
            </div>
            <div className="mt-5 flex flex-wrap gap-3">
              <button type="button" onClick={onStartReport} className="rounded-2xl bg-white px-5 py-3 text-sm font-bold text-[#0E4FAF] shadow-sm transition hover:translate-y-[-1px]">
                {t(locale, "Ücretsiz Başla", "Start Free")}
              </button>
              <button
                type="button"
                onClick={() =>
                  document.getElementById("pricing-section")?.scrollIntoView({ behavior: "smooth", block: "start" })
                }
                className="rounded-2xl border border-white/25 bg-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/15"
              >
                {t(locale, "Paketleri Gör", "See Plans")}
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
        id="pricing-section"
        className="panel overflow-hidden border border-[#0E4FAF]/10 bg-[linear-gradient(180deg,#ffffff_0%,#f5f8ff_100%)] p-6"
      >
        <div>
          <div className="text-sm font-semibold text-[#0E4FAF]">{t(locale, "Fiyatlandırma", "Pricing")}</div>
          <h3 className="mt-2 text-3xl font-extrabold text-ink">
            {t(locale, "Size uygun paketi seçin", "Choose the package that fits your team")}
          </h3>
          <p className="mt-3 max-w-3xl text-sm text-slate-600">
            {t(
              locale,
              "CBAM sürecini yönetmek, karbon maliyetini görmek ve riski azaltmak için size uygun paketi seçin.",
              "Choose the package that helps you manage CBAM, see carbon cost and reduce reporting risk.",
            )}
          </p>
        </div>

        <div className="mt-6 grid gap-4 xl:grid-cols-3">
            {pricingCards.map((card) => {
              const plan = (plans || []).find((item) => item.plan_id === card.planId);
              return (
                <article
                  key={card.planId}
                className={`rounded-[28px] border bg-white p-6 shadow-sm ${
                  card.featured
                    ? "border-pine/35 ring-2 ring-pine/20 shadow-[0_24px_60px_rgba(45,78,61,0.16)]"
                    : "border-slate-200"
                }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-[0.24em] text-[#0E4FAF]">
                        {card.name}
                      </div>
                      {card.planId === "pro" ? (
                        <div className="mt-3 text-2xl font-extrabold text-ink">
                          {t(locale, "Fiyat için iletişime geçin", "Contact us for pricing")}
                        </div>
                      ) : (
                        <div className="mt-3 text-3xl font-extrabold text-ink">
                          EUR {plan?.monthly_price_eur ?? "-"}
                          <span className="ml-1 text-sm font-semibold text-slate-400">/ay</span>
                        </div>
                      )}
                    </div>
                  {card.featured ? (
                    <div className="rounded-full bg-pine px-3 py-1 text-xs font-semibold text-white">
                      {t(locale, "En çok tercih edilen", "Most Popular")}
                    </div>
                  ) : null}
                </div>

                <div className="mt-5">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                    {t(locale, "Kimler İçin", "Who It Is For")}
                  </div>
                  <div className="mt-2 text-sm font-semibold text-slate-700">{card.audience}</div>
                </div>

                <div className="mt-5">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                    {t(locale, "Ne Sağlar", "What It Solves")}
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{card.value}</p>
                </div>

                <div className="mt-5 space-y-3">
                  {card.features.map((feature) => (
                    <div key={feature} className="flex items-start gap-3 text-sm text-slate-700">
                      <span className="mt-1 h-2.5 w-2.5 rounded-full bg-pine" />
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>

                <div className="mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      if (card.action === "quote") {
                        onRequestQuote?.({
                          company: workspaceAccess?.company_name || "",
                          message: t(
                            locale,
                            "Pro paket hakkında görüşmek istiyorum.",
                            "I would like to discuss the Pro plan.",
                          ),
                        });
                        return;
                      }

                      onStartReport?.();
                    }}
                    className={`w-full ${card.featured ? "btn-primary" : "btn-secondary"}`}
                  >
                    {card.cta}
                  </button>
                </div>
              </article>
            );
          })}
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
          <h3 className="mt-1 text-xl font-bold text-ink">{t(locale, "Öncelikli müdahale listesi", "Priority intervention list")}</h3>
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
          <div className="text-sm font-semibold text-slate-500">{t(locale, "Veri Güveni", "Data Confidence")}</div>
          <h3 className="mt-1 text-xl font-bold text-ink">{t(locale, "Actual vs Default dağılımı", "Actual vs Default mix")}</h3>
          <div className="mt-6 space-y-4">
            <div className="rounded-2xl bg-mist p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-700">{t(locale, "Actual alanlar", "Actual fields")}</span>
                <span className="text-sm font-bold text-pine">%{avgActualShare}</span>
              </div>
              <div className="mt-3 h-3 rounded-full bg-white">
                <div
                  className="h-3 rounded-full bg-pine"
                  style={{ width: `${avgActualShare}%` }}
                />
              </div>
            </div>
            <div className="rounded-2xl bg-mist p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-700">{t(locale, "Default alanlar", "Default fields")}</span>
                <span className="text-sm font-bold text-clay">%{avgDefaultShare}</span>
              </div>
              <div className="mt-3 h-3 rounded-full bg-white">
                <div
                  className="h-3 rounded-full bg-clay"
                  style={{ width: `${avgDefaultShare}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="panel p-6">
        <div className="text-sm font-semibold text-slate-500">{t(locale, "Şimdi Ne Yapmalıyım?", "What Should I Do Next?")}</div>
        <h3 className="mt-1 text-xl font-bold text-ink">
          {t(locale, "Durumu değil, aksiyonu ve riski görün", "See the action and the risk, not just the status")}
        </h3>
        <div className="mt-5 grid gap-4 xl:grid-cols-3">
          {getRecommendedActions(locale, shipments).map((action) => (
            <div key={action.title} className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <div className="text-base font-bold text-ink">{action.title}</div>
              <p className="mt-2 text-sm leading-6 text-slate-600">{action.body}</p>
            </div>
          ))}
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
