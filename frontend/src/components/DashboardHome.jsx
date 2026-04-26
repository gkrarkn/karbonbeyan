import { resolveLocale, t, translateComplianceStatus, translateConfidence, translateRole } from "../lib/i18n";
import BrandLogo from "./brand/BrandLogo";
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
          "Tahmini değerler gerçek üretim verinizi yansıtmayabilir. Bu durum ileride maliyet farkı veya uyum riski yaratabilir.",
          "Default values may not reflect your real production data. This can create cost differences or compliance risk later.",
        ),
      },
      {
        title: t(locale, "Eksik alanları anında tespit edin", "Spot missing fields instantly"),
        body: t(
          locale,
          "Eksik veri, yanlış maliyet görünürlüğüne neden olabilir. KarbonBeyan bu alanları görünür hale getirir.",
          "Missing data can lead to inaccurate cost visibility. KarbonBeyan makes those fields visible.",
        ),
      },
      {
        title: t(locale, "Resmi beyana hazır olup olmadığınızı bilin", "Know whether you are ready for formal declaration"),
        body: t(
          locale,
          "Beyana hazır olmayan kayıtları erken görün, riski kapatmak için doğru aksiyonu alın.",
          "See records that are not declaration-ready early and take the right action to close the risk.",
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
  const activeLocale = resolveLocale(locale);
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
      price: 59,
      audience: t(locale, "Küçük ve orta ölçekli ihracatçılar için", "For small and mid-sized exporters"),
      value: t(
        locale,
        "CBAM sürecinizi tek panelde takip etmeye başlayın.",
        "Start tracking your CBAM process from one panel.",
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
      price: 229,
      audience: t(locale, "Daha doğru maliyet ve risk takibi isteyen ekipler için", "For teams that want stronger cost and risk tracking"),
      value: t(
        locale,
        "Tahmini yerine kendi verinize göre daha doğru maliyet görünürlüğü.",
        "See more accurate cost visibility based on your own data instead of defaults.",
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
        "Kurumsal ölçekte CBAM sürecini yönetin.",
        "Manage your CBAM process at enterprise scale.",
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
  const priceDisplayByPlan = {
    starter: activeLocale === "en" ? { currency: "USD", amount: 69 } : null,
    growth: activeLocale === "en" ? { currency: "USD", amount: 269 } : null,
  };
  const howItWorksLabel = activeLocale === "en" ? "How It Works" : "Nasıl Çalışır";
  const outputLabel = activeLocale === "en" ? "Output" : "Çıktı";
  const reportTitle = activeLocale === "en" ? "What Does a CBAM Report Look Like?" : "CBAM Raporu Nasıl Görünüyor?";
  const reportBody = activeLocale === "en"
    ? "See missing data, risky records and estimated calculations in one report."
    : "Eksik verileri, riskli kayıtları ve tahmini hesaplamaları tek raporda görün.";
  const reportCta = activeLocale === "en" ? "Open Report" : "Raporu Aç";
  const reportCtaHint = activeLocale === "en" ? "You can review it in 1 minute" : "1 dakika içinde inceleyebilirsiniz";
  const reportBadge = activeLocale === "en" ? "Real report output" : "Gerçek rapor çıktısı";
  const howItWorksTitle = activeLocale === "en"
    ? "Cost and risk visibility in three steps"
    : "Üç adımda maliyet ve risk görünürlüğü";

  return (
    <div className="space-y-6">
      <section className="panel overflow-hidden">
        <div className="grid gap-6 bg-[linear-gradient(135deg,#0E4FAF_0%,#0B3F91_55%,#0B2447_100%)] p-6 text-white xl:grid-cols-[1.2fr_0.8fr]">
          <div>
            <BrandLogo locale={locale} className="rounded-2xl bg-white px-3 py-2" />
            <div className="mt-5 inline-flex rounded-full bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-white/80">
              {t(locale, "CBAM = Karbon Sınır Düzenleme Mekanizması", "CBAM = Carbon Border Adjustment Mechanism")}
            </div>
            <h2 className="mt-3 text-3xl font-extrabold">
              {t(
                locale,
                "AB sevkiyatlarınızda karbon maliyetinizi doğru hesaplıyor musunuz?",
                "Are you calculating the true carbon cost of your EU shipments?",
              )}
            </h2>
            <p className="mt-3 max-w-2xl text-sm text-white/75">
              {t(
                locale,
                "Tahmini (default) değerlerle ilerliyorsanız CBAM maliyetiniz gerçeği yansıtmayabilir.",
                "If you rely on default values, your CBAM cost may be inaccurate.",
              )}
            </p>
            <p className="mt-2 max-w-2xl text-sm font-semibold text-white/90">
              {t(
                locale,
                "Eksik verileri görün, riskleri tespit edin, beyana hazır olup olmadığınızı anlayın.",
                "See missing data, identify risks, and understand whether you are ready for declaration.",
              )}
            </p>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              {[
                t(locale, "Default veri riskini görün", "See default data risk"),
                t(locale, "Yanlış maliyet ihtimalini azaltın", "Reduce inaccurate cost risk"),
                t(locale, "Beyana hazır olup olmadığınızı anlayın", "Understand declaration readiness"),
              ].map((item) => (
                <div key={item} className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm font-semibold text-white/90">
                  {item}
                </div>
              ))}
            </div>
            <div className="mt-5 flex flex-wrap gap-3">
              <button type="button" onClick={onStartReport} className="rounded-2xl bg-white px-5 py-3 text-sm font-bold text-[#0E4FAF] shadow-sm transition hover:translate-y-[-1px]">
                {t(locale, "Hemen Başla", "Start Now")}
              </button>
              <button
                type="button"
                onClick={() =>
                  document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth", block: "start" })
                }
                className="rounded-2xl border border-white/25 bg-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/15"
              >
                {howItWorksLabel}
              </button>
            </div>
            <div className="mt-4 inline-flex rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-white/85">
              {t(
                locale,
                "Tahmini değer kullanımı CBAM maliyetinizin gerçeği yansıtmamasına neden olabilir.",
                "If you rely on default values, your CBAM cost may be inaccurate.",
              )}
            </div>
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

      <section className="grid gap-4 xl:grid-cols-3">
        {getRecommendedActions(locale, shipments).map((action) => (
          <article key={action.title} className="panel p-6">
            <div className="text-base font-bold text-ink">{action.title}</div>
            <p className="mt-2 text-sm leading-6 text-slate-600">{action.body}</p>
          </article>
        ))}
      </section>

      <section id="how-it-works" className="panel p-6">
        <div className="text-sm font-semibold text-[#0E4FAF]">{howItWorksLabel}</div>
        <h3 className="mt-2 text-3xl font-extrabold text-ink">
          {howItWorksTitle}
        </h3>
        <div className="mt-6 grid gap-4 xl:grid-cols-3">
          {[
            {
              title: t(locale, "Veriyi gir", "Enter your data"),
              result: t(locale, "gerçek maliyeti gör", "see the real cost"),
            },
            {
              title: t(locale, "Sistem hesaplasın", "Let the system calculate"),
              result: t(locale, "eksikleri tespit et", "detect missing data"),
            },
            {
              title: t(locale, "Rapor oluştur", "Generate a report"),
              result: t(locale, "beyana hazır olup olmadığını anla", "understand declaration readiness"),
            },
          ].map((step, index) => (
            <div key={step.title} className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#0E4FAF] text-sm font-bold text-white">
                {index + 1}
              </div>
              <div className="mt-4 text-lg font-extrabold text-ink">{step.title}</div>
              <div className="mt-2 text-sm font-semibold text-pine">{step.result}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="panel grid gap-6 overflow-hidden p-6 xl:grid-cols-[0.9fr_1.1fr]">
        <div>
          <div className="text-sm font-semibold text-[#0E4FAF]">{outputLabel}</div>
          <h3 className="mt-2 text-3xl font-extrabold text-ink">
            {reportTitle}
          </h3>
          <p className="mt-3 text-sm leading-6 text-slate-600">{reportBody}</p>
          <a href="/sample-cbam-report.pdf" target="_blank" rel="noreferrer" className="btn-primary mt-6 inline-flex">
            {reportCta}
          </a>
          <p className="mt-3 text-xs font-semibold text-slate-500">
            {reportCtaHint}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 inline-flex rounded-full bg-pine px-3 py-1 text-xs font-semibold text-white">
            {reportBadge}
          </div>
          <div className="space-y-3 blur-[1.2px]">
            <div className="h-4 w-48 rounded-full bg-slate-200" />
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="h-20 rounded-xl bg-[#0E4FAF]/12" />
              <div className="h-20 rounded-xl bg-pine/15" />
              <div className="h-20 rounded-xl bg-clay/15" />
            </div>
            <div className="h-3 rounded-full bg-slate-200" />
            <div className="h-3 w-11/12 rounded-full bg-slate-200" />
            <div className="h-3 w-9/12 rounded-full bg-slate-200" />
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="h-28 rounded-xl bg-slate-100" />
              <div className="h-28 rounded-xl bg-slate-100" />
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
            {t(locale, "Default veri riskini azaltan planı seçin", "Choose the plan that reduces default data risk")}
          </h3>
          <p className="mt-3 max-w-3xl text-sm text-slate-600">
            {t(
              locale,
              "Kendi verinizle daha doğru maliyet görünürlüğü elde edin, eksikleri erken görün ve CBAM sürecinizi tek yerden yönetin.",
              "Use your own data for more accurate cost visibility, see missing fields early and manage your CBAM process from one place.",
            )}
          </p>
        </div>

        <div className="mt-6 grid gap-4 xl:grid-cols-3">
            {pricingCards.map((card) => {
              const plan = (plans || []).find((item) => item.plan_id === card.planId);
              const displayPrice = priceDisplayByPlan[card.planId] ?? {
                currency: "EUR",
                amount: plan?.monthly_price_eur ?? card.price,
              };
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
                          {displayPrice.currency} {displayPrice.amount}
                          <span className="ml-1 text-sm font-semibold text-slate-400">
                            /{t(locale, "ay", "mo")}
                          </span>
                        </div>
                      )}
                    </div>
                  {card.featured ? (
                    <div className="rounded-full bg-pine px-3 py-1 text-xs font-semibold text-white">
                      {t(locale, "En Çok Tercih Edilen", "Most Preferred")}
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

      {hasLiveShipments && (
        <>
          <section className="grid gap-4 xl:grid-cols-3">
            {[
              { title: "Eksik Veri (Default Kullanıldı)", value: complianceCounts["Eksik Veri (Default Kullanıldı)"], meta: "Öncelikli iç takip", tone: "bg-clay" },
              { title: "İç İncelemeye Hazır", value: complianceCounts["İç İncelemeye Hazır"], meta: "Operasyon ekibi kontrol etmeli", tone: "bg-moss" },
              { title: "Resmi Beyana Uygun", value: complianceCounts["Resmi Beyana Uygun"], meta: "Doğrulama tamamlandı", tone: "bg-pine" },
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
              { title: t(locale, "Verification Bekleyen", "Pending Verification"), value: pendingShipments.length, meta: t(locale, "Resmi beyana engel kayıt", "Blocking official declaration"), tone: "bg-moss" },
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
                {riskyShipments.slice(0, 5).map((shipment) => (
                  <div key={shipment.shipment_id} className="rounded-2xl bg-mist p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-sm font-semibold text-ink">{shipment.payload.facility.installation_name}</div>
                      <div className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600">
                        {translateConfidence(locale, shipment.calculation.confidence_label)}
                      </div>
                    </div>
                    <div className="mt-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                      {shipment.payload.import_details.shipment_reference}
                    </div>
                    <p className="mt-2 text-sm text-slate-600">{shipment.calculation.data_quality_summary.summary_text}</p>
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
                {shipments.slice(0, 3).map((shipment) => (
                  <div key={shipment.shipment_id} className="rounded-2xl bg-slate-50 p-4">
                    <div className="text-sm font-semibold text-ink">{shipment.payload.facility.installation_name}</div>
                    <div className="mt-2 text-sm text-slate-600">{shipment.payload.reporting.declaration_year}</div>
                    <div className="mt-1 text-sm font-semibold text-clay">Takvimlenmeli</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="panel p-6">
              <div className="text-sm font-semibold text-slate-500">Verification Bekleyenler</div>
              <h3 className="mt-1 text-xl font-bold text-ink">Doğrulayıcı aksiyonu gerekli</h3>
              <div className="mt-5 space-y-4">
                {pendingShipments.slice(0, 3).map((shipment) => (
                  <div key={shipment.shipment_id} className="rounded-2xl bg-slate-50 p-4">
                    <div className="text-sm font-semibold text-ink">{shipment.payload.facility.installation_name}</div>
                    <div className="mt-2 text-sm text-slate-600">Verifier: {shipment.payload.verification.verifier_name || t(locale, "Atanmadı", "Unassigned")}</div>
                    <div className="mt-1 text-sm font-semibold text-slate-700">{t(locale, "Bekliyor", "Pending")}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="panel p-6">
              <div className="text-sm font-semibold text-slate-500">{t(locale, "Veri Güveni", "Data Confidence")}</div>
              <h3 className="mt-1 text-xl font-bold text-ink">{t(locale, "Actual vs Default dağılımı", "Actual vs Default mix")}</h3>
              <div className="mt-6 space-y-4">
                {[
                  { label: t(locale, "Actual alanlar", "Actual fields"), pct: avgActualShare, color: "bg-pine", textColor: "text-pine" },
                  { label: t(locale, "Default alanlar", "Default fields"), pct: avgDefaultShare, color: "bg-clay", textColor: "text-clay" },
                ].map((bar) => (
                  <div key={bar.label} className="rounded-2xl bg-mist p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-slate-700">{bar.label}</span>
                      <span className={`text-sm font-bold ${bar.textColor}`}>%{bar.pct}</span>
                    </div>
                    <div className="mt-3 h-3 rounded-full bg-white">
                      <div className={`h-3 rounded-full ${bar.color}`} style={{ width: `${bar.pct}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </>
      )}

      {hasLiveShipments && (
        <>
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
        </>
      )}
    </div>
  );
}

export default DashboardHome;
