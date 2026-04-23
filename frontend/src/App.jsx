import { useCallback, useEffect, useMemo, useState } from "react";

import AuthModal from "./components/auth/AuthModal";
import DashboardHome from "./components/DashboardHome";
import Sidebar from "./components/layout/Sidebar";
import Topbar from "./components/layout/Topbar";
import ReportWizard from "./components/report-wizard/ReportWizard";
import { emissionTrend } from "./data/mockData";
import {
  downloadShipmentPdf,
  listDefaultValues,
  listPlans,
  listShipments,
} from "./lib/api";
import { t, translateComplianceStatus, translateConfidence } from "./lib/i18n";

const sectorLabels = {
  iron_steel: "Demir-Çelik",
  aluminum: "Alüminyum",
  cement: "Çimento",
  fertilizers: "Gübre",
  electricity: "Elektrik",
  hydrogen: "Hidrojen",
};

const routeLabels = {
  carbon_steel_bf_bof: "BF/BOF",
  carbon_steel_dri_eaf: "DRI/EAF",
  scrap_eaf: "Hurda EAF",
  primary_aluminium: "Primary",
  primary_aluminum: "Primary",
  secondary_aluminium: "Secondary",
  secondary_aluminum: "Secondary",
};

function getSectorLabel(value) {
  return sectorLabels[value] || value || "-";
}

function getRouteLabel(value) {
  return routeLabels[value] || value || "-";
}

function hasFeatureAccess(workspaceAccess, featureKey) {
  if (!workspaceAccess) {
    return false;
  }

  if (workspaceAccess.trial_status === "active") {
    return true;
  }

  return workspaceAccess.accessible_feature_keys.includes(featureKey);
}

function UsageMeter({ label, used = 0, limit = 0 }) {
  const percentage = limit > 0 ? Math.min(Math.round((used / limit) * 100), 100) : 0;

  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm font-semibold text-slate-700">{label}</div>
        <div className="text-sm font-bold text-ink">
          {used} / {limit}
        </div>
      </div>
      <div className="mt-3 h-2 rounded-full bg-white">
        <div className="h-2 rounded-full bg-pine" style={{ width: `${percentage}%` }} />
      </div>
    </div>
  );
}

function ArchiveView({ shipments, loading, error, locale }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sectorFilter, setSectorFilter] = useState("all");
  const [downloadingId, setDownloadingId] = useState("");

  const statusOptions = useMemo(
    () => [...new Set(shipments.map((shipment) => shipment.calculation.compliance_status_label))],
    [shipments],
  );
  const sectorOptions = useMemo(
    () => [...new Set(shipments.map((shipment) => shipment.payload.goods.sector))],
    [shipments],
  );

  const filteredShipments = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return shipments.filter((shipment) => {
      const matchesSearch =
        query.length === 0 ||
        shipment.payload.import_details.shipment_reference.toLowerCase().includes(query) ||
        shipment.payload.facility.installation_name.toLowerCase().includes(query);
      const matchesStatus =
        statusFilter === "all" || shipment.calculation.compliance_status_label === statusFilter;
      const matchesSector =
        sectorFilter === "all" || shipment.payload.goods.sector === sectorFilter;

      return matchesSearch && matchesStatus && matchesSector;
    });
  }, [searchTerm, shipments, statusFilter, sectorFilter]);

  const handleDownload = async (shipmentId) => {
    setDownloadingId(shipmentId);
    try {
      await downloadShipmentPdf(shipmentId);
    } finally {
      setDownloadingId("");
    }
  };

  return (
    <div className="panel p-6">
      <div className="text-sm font-semibold text-slate-500">{t(locale, "Arşiv", "Archive")}</div>
      <h2 className="mt-1 text-2xl font-extrabold text-ink">
        {t(locale, "Canlı CBAM kayıt arşivi", "Live CBAM records archive")}
      </h2>
      <p className="mt-2 max-w-3xl text-sm text-slate-600">
        {t(
          locale,
          "Uyum durumuna, sektöre ve referansa göre filtreleyin; eski beyan PDF’lerini tek tıkla yeniden indirin.",
          "Filter by compliance status, sector and reference; re-download declaration PDFs with one click.",
        )}
      </p>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1.4fr_1fr_1fr]">
        <input
          className="field"
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          placeholder={t(locale, "Referans veya firma ara", "Search reference or company")}
        />
        <select className="field" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
          <option value="all">{t(locale, "Tüm durumlar", "All statuses")}</option>
          {statusOptions.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
        <select className="field" value={sectorFilter} onChange={(event) => setSectorFilter(event.target.value)}>
          <option value="all">{t(locale, "Tüm sektörler", "All sectors")}</option>
          {sectorOptions.map((sector) => (
            <option key={sector} value={sector}>
              {getSectorLabel(sector)}
            </option>
          ))}
        </select>
      </div>

      {loading ? <p className="mt-4 text-sm text-slate-600">{t(locale, "Kayıtlar yükleniyor...", "Loading records...")}</p> : null}
      {!loading && error ? <p className="mt-4 text-sm font-medium text-clay">{error}</p> : null}
      {!loading && filteredShipments.length === 0 ? (
        <p className="mt-4 text-sm text-slate-600">{t(locale, "Filtrelere uyan kayıt bulunmuyor.", "No records match the selected filters.")}</p>
      ) : null}
      {!loading && filteredShipments.length > 0 ? (
        <div className="mt-6 overflow-x-auto">
          <table className="min-w-full text-left">
            <thead>
              <tr className="border-b border-slate-200 text-sm text-slate-500">
                <th className="pb-3 font-semibold">{t(locale, "Referans", "Reference")}</th>
                <th className="pb-3 font-semibold">{t(locale, "Firma", "Company")}</th>
                <th className="pb-3 font-semibold">{t(locale, "Sektör", "Sector")}</th>
                <th className="pb-3 font-semibold">{t(locale, "Durum", "Status")}</th>
                <th className="pb-3 font-semibold">{t(locale, "Veri Güveni", "Confidence")}</th>
                <th className="pb-3 font-semibold">{t(locale, "Emisyon", "Emissions")}</th>
                <th className="pb-3 font-semibold">{t(locale, "Aksiyon", "Action")}</th>
              </tr>
            </thead>
            <tbody>
              {filteredShipments.map((shipment) => (
                <tr key={shipment.shipment_id} className="border-b border-slate-100 text-sm text-slate-700">
                  <td className="py-4 font-semibold">{shipment.payload.import_details.shipment_reference}</td>
                  <td className="py-4">{shipment.payload.facility.installation_name}</td>
                  <td className="py-4">{getSectorLabel(shipment.payload.goods.sector)}</td>
                  <td className="py-4">{translateComplianceStatus(locale, shipment.calculation.compliance_status_label)}</td>
                  <td className="py-4">{translateConfidence(locale, shipment.calculation.confidence_label)}</td>
                  <td className="py-4">{shipment.calculation.total_embedded_emissions_tco2} tCO2e</td>
                  <td className="py-4">
                    <button
                      type="button"
                      className="btn-secondary px-4 py-2"
                      onClick={() => handleDownload(shipment.shipment_id)}
                      disabled={downloadingId === shipment.shipment_id}
                    >
                      {downloadingId === shipment.shipment_id
                        ? t(locale, "Hazırlanıyor...", "Preparing...")
                        : t(locale, "PDF'i Yeniden İndir", "Download PDF Again")}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}

function CoefficientsView({ coefficients, loading, error, locale }) {
  return (
    <div className="panel p-6">
      <div className="text-sm font-semibold text-slate-500">{t(locale, "Katsayılar", "Coefficients")}</div>
      <h2 className="mt-1 text-2xl font-extrabold text-ink">{t(locale, "Canlı varsayılan değer kataloğu", "Live default values catalog")}</h2>
      <p className="mt-2 max-w-3xl text-sm text-slate-600">
        {t(
          locale,
          "Bu ekran backend’deki referans değer tablosundan beslenir ve hesap motorunun kullandığı default benchmark’ları gösterir.",
          "This screen is fed by the backend reference table and shows the default benchmarks used by the calculation engine.",
        )}
      </p>
      {loading ? <p className="mt-4 text-sm text-slate-600">{t(locale, "Katsayılar yükleniyor...", "Loading coefficients...")}</p> : null}
      {!loading && error ? <p className="mt-4 text-sm font-medium text-clay">{error}</p> : null}
      {!loading && !error && coefficients.length === 0 ? (
        <p className="mt-4 text-sm text-slate-600">{t(locale, "Henüz katsayı kaydı bulunmuyor.", "No coefficient records yet.")}</p>
      ) : null}
      {!loading && coefficients.length > 0 ? (
        <div className="mt-6 overflow-x-auto">
          <table className="min-w-full text-left">
            <thead>
              <tr className="border-b border-slate-200 text-sm text-slate-500">
                <th className="pb-3 font-semibold">{t(locale, "CN Kodu", "CN Code")}</th>
                <th className="pb-3 font-semibold">{t(locale, "Sektör", "Sector")}</th>
                <th className="pb-3 font-semibold">{t(locale, "Menşe", "Origin")}</th>
                <th className="pb-3 font-semibold">{t(locale, "Rota", "Route")}</th>
                <th className="pb-3 font-semibold">{t(locale, "Toplam Değer", "Total Value")}</th>
              </tr>
            </thead>
            <tbody>
              {coefficients.map((row) => (
                <tr key={`${row.cn_code}-${row.origin_country}-${row.production_route}`} className="border-b border-slate-100 text-sm text-slate-700">
                  <td className="py-4 font-semibold">{row.cn_code}</td>
                  <td className="py-4">{getSectorLabel(row.sector)}</td>
                  <td className="py-4">{row.origin_country}</td>
                  <td className="py-4">{getRouteLabel(row.production_route)}</td>
                  <td className="py-4">{row.specific_total_emissions_tco2_per_ton}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}

function SettingsView({ planCatalog, loading, error, locale }) {
  if (loading) {
    return <div className="panel p-6 text-sm text-slate-600">{t(locale, "Plan ve yetkilendirme yükleniyor...", "Loading plans and access rules...")}</div>;
  }

  if (error || !planCatalog) {
    return <div className="panel p-6 text-sm font-medium text-clay">{error || t(locale, "Plan bilgisi alınamadı.", "Plan information could not be loaded.")}</div>;
  }

  const { current_access: currentAccess, plans, trial_days: trialDays } = planCatalog;
  const featureKeys = [...new Set(plans.flatMap((plan) => plan.features.map((feature) => feature.key)))];
  const featureMap = Object.fromEntries(
    plans.flatMap((plan) => plan.features.map((feature) => [feature.key, feature])),
  );

  return (
    <div className="space-y-6">
      <div className="panel p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="text-sm font-semibold text-slate-500">Plan ve Yetkilendirme</div>
            <h2 className="mt-1 text-2xl font-extrabold text-ink">7 günlük full trial ile tüm süreci görün</h2>
            <p className="mt-2 max-w-3xl text-sm text-slate-600">
              Freemium yerine tüm modülleri açan bir trial kurgusu aktif. Trial bittikten sonra kullanım limiti ve RBAC kuralları seçilen plana göre devreye girer.
            </p>
          </div>
          <div className="rounded-3xl bg-[#0E4FAF] px-5 py-4 text-white">
            <div className="text-xs uppercase tracking-[0.24em] text-white/70">Aktif Erişim</div>
            <div className="mt-2 text-lg font-extrabold">{currentAccess.role_label}</div>
            <div className="mt-1 text-sm text-white/80">
              {currentAccess.trial_status === "active"
                ? `${currentAccess.trial_days_remaining}/${trialDays} gün full trial`
                : currentAccess.active_plan}
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        {plans.map((plan) => (
          <article
            key={plan.plan_id}
            className={`panel p-6 ${plan.recommended ? "ring-2 ring-pine/20" : ""}`}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-sm font-semibold text-slate-500">{plan.name}</div>
                <h3 className="mt-1 text-2xl font-extrabold text-ink">EUR {plan.monthly_price_eur}/ay</h3>
              </div>
              {plan.recommended ? (
                <div className="rounded-full bg-pine/10 px-3 py-1 text-xs font-semibold text-pine">Önerilen</div>
              ) : null}
            </div>
            <p className="mt-3 text-sm text-slate-600">{plan.tagline}</p>

            <div className="mt-5 space-y-3">
              <UsageMeter
                label="Rapor / ay"
                used={currentAccess.usage_counters.reports_per_month}
                limit={plan.usage_limits.reports_per_month}
              />
              <UsageMeter
                label="Supplier request"
                used={currentAccess.usage_counters.supplier_requests}
                limit={plan.usage_limits.supplier_requests}
              />
              <UsageMeter
                label="Takım üyesi"
                used={currentAccess.usage_counters.team_members}
                limit={plan.usage_limits.team_members}
              />
            </div>
          </article>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="panel p-6">
          <div className="text-sm font-semibold text-slate-500">RBAC Özellik Matrisi</div>
          <h3 className="mt-1 text-xl font-bold text-ink">Plan bazlı erişim ayrımı</h3>
          <div className="mt-6 overflow-x-auto">
            <table className="min-w-full text-left">
              <thead>
                <tr className="border-b border-slate-200 text-sm text-slate-500">
                  <th className="pb-3 font-semibold">Özellik</th>
                  {plans.map((plan) => (
                    <th key={plan.plan_id} className="pb-3 font-semibold">
                      {plan.name}
                    </th>
                  ))}
                  <th className="pb-3 font-semibold">Şu an</th>
                </tr>
              </thead>
              <tbody>
                {featureKeys.map((featureKey) => (
                  <tr key={featureKey} className="border-b border-slate-100 text-sm text-slate-700">
                    <td className="py-4">
                      <div className="font-semibold">{featureMap[featureKey]?.label}</div>
                      <div className="mt-1 text-xs text-slate-500">{featureMap[featureKey]?.description}</div>
                    </td>
                    {plans.map((plan) => (
                      <td key={`${plan.plan_id}-${featureKey}`} className="py-4">
                        {plan.features.some((feature) => feature.key === featureKey) ? "Var" : "-"}
                      </td>
                    ))}
                    <td className="py-4">
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${hasFeatureAccess(currentAccess, featureKey) ? "bg-pine/10 text-pine" : "bg-slate-100 text-slate-500"}`}>
                        {hasFeatureAccess(currentAccess, featureKey) ? "Erişim açık" : "Kilitli"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="panel p-6">
          <div className="text-sm font-semibold text-slate-500">Kullanım Limiti</div>
          <h3 className="mt-1 text-xl font-bold text-ink">Mevcut trial tüketimi</h3>
          <div className="mt-5 space-y-4">
            <UsageMeter
              label="Rapor / ay"
              used={currentAccess.usage_counters.reports_per_month}
              limit={currentAccess.usage_limits.reports_per_month}
            />
            <UsageMeter
              label="Supplier request"
              used={currentAccess.usage_counters.supplier_requests}
              limit={currentAccess.usage_limits.supplier_requests}
            />
            <UsageMeter
              label="Takım üyesi"
              used={currentAccess.usage_counters.team_members}
              limit={currentAccess.usage_limits.team_members}
            />
          </div>

          <div className="mt-6 rounded-2xl bg-mist p-4">
            <div className="text-sm font-semibold text-ink">Trial kuralı</div>
            <p className="mt-2 text-sm text-slate-600">
              Trial aktifken Supplier Data Collection dahil tüm özellikler açılır. Trial sonrası erişim, plan seviyesi ve rol bazlı yetki kuralına göre filtrelenir.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function App() {
  const [activeView, setActiveView] = useState("dashboard");
  const [locale, setLocale] = useState("tr");
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState("signup");
  const [workspaceProfile, setWorkspaceProfile] = useState(null);
  const [shipments, setShipments] = useState([]);
  const [coefficients, setCoefficients] = useState([]);
  const [planCatalog, setPlanCatalog] = useState(null);
  const [loadingShipments, setLoadingShipments] = useState(true);
  const [loadingCoefficients, setLoadingCoefficients] = useState(true);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [shipmentsError, setShipmentsError] = useState("");
  const [coefficientsError, setCoefficientsError] = useState("");
  const [plansError, setPlansError] = useState("");

  const loadShipments = useCallback(async () => {
    try {
      setLoadingShipments(true);
      setShipmentsError("");
      const shipmentData = await listShipments();
      setShipments(shipmentData);
    } catch (error) {
      setShipmentsError(error.message || "Rapor kayıtları yüklenemedi.");
    } finally {
      setLoadingShipments(false);
    }
  }, []);

  const loadCoefficients = useCallback(async () => {
    try {
      setLoadingCoefficients(true);
      setCoefficientsError("");
      const coefficientData = await listDefaultValues();
      setCoefficients(coefficientData);
    } catch (error) {
      setCoefficientsError(error.message || "Katsayı kataloğu yüklenemedi.");
    } finally {
      setLoadingCoefficients(false);
    }
  }, []);

  const loadPlans = useCallback(async () => {
    try {
      setLoadingPlans(true);
      setPlansError("");
      const planData = await listPlans();
      setPlanCatalog(planData);
    } catch (error) {
      setPlansError(error.message || "Plan kataloğu yüklenemedi.");
    } finally {
      setLoadingPlans(false);
    }
  }, []);

  useEffect(() => {
    loadShipments();
    loadCoefficients();
    loadPlans();
  }, [loadShipments, loadCoefficients, loadPlans]);

  const liveTrend = useMemo(() => {
    if (shipments.length === 0) {
      return emissionTrend.map((entry) => ({ ...entry, value: 0 }));
    }
    return shipments.slice(0, 6).reverse().map((shipment, index) => ({
      month: `K${index + 1}`,
      value: Number(shipment.calculation.total_embedded_emissions_tco2) || 0,
    }));
  }, [shipments]);

  const currentWorkspaceAccess = useMemo(() => {
    if (!planCatalog?.current_access) {
      return null;
    }

    return {
      ...planCatalog.current_access,
      company_name:
        workspaceProfile?.company_name ||
        planCatalog.current_access.company_name ||
        t(locale, "KarbonBeyan Hesabı", "KarbonBeyan Workspace"),
      role_label:
        workspaceProfile?.role_label || planCatalog.current_access.role_label,
    };
  }, [locale, planCatalog, workspaceProfile]);

  const openAuth = useCallback((mode) => {
    setAuthMode(mode);
    setAuthModalOpen(true);
  }, []);

  const handleLoginSuccess = useCallback(
    (payload = {}) => {
      setWorkspaceProfile((current) => ({
        company_name: current?.company_name || t(locale, "KarbonBeyan Hesabı", "KarbonBeyan Workspace"),
        role_label: current?.role_label || t(locale, "Firma Yöneticisi", "Company Admin"),
        email: payload.email || current?.email || "",
      }));
      setActiveView("dashboard");
    },
    [locale],
  );

  const handleSignupSuccess = useCallback(
    (payload = {}) => {
      setWorkspaceProfile({
        company_name: payload.company_name || t(locale, "Yeni Firma", "New Company"),
        role_label: payload.role_label || t(locale, "Firma Yöneticisi", "Company Admin"),
        full_name: payload.full_name || "",
        email: payload.email || "",
        sector: payload.sector || "",
      });
      setActiveView("dashboard");
    },
    [locale],
  );

  const handleRequestQuote = useCallback((payload = {}) => {
    const subject = encodeURIComponent("KarbonBeyan Kurumsal Teklif Talebi");
    const body = encodeURIComponent(
      [
        `Ad Soyad: ${payload.name || "-"}`,
        `Firma: ${payload.company || "-"}`,
        `E-posta: ${payload.email || "-"}`,
        `Talep: ${payload.message || "Kurumsal paket ve yükseltme görüşmesi talep ediyorum."}`,
      ].join("\n"),
    );
    window.location.href = `mailto:gokerarkun@icloud.com?subject=${subject}&body=${body}`;
  }, []);

  const renderView = () => {
    switch (activeView) {
      case "yeni-rapor":
        return <ReportWizard onShipmentCreated={loadShipments} locale={locale} />;
      case "arsiv":
        return <ArchiveView shipments={shipments} loading={loadingShipments} error={shipmentsError} locale={locale} />;
      case "katsayilar":
        return (
          <CoefficientsView
            coefficients={coefficients}
            loading={loadingCoefficients}
            error={coefficientsError}
            locale={locale}
          />
        );
      case "ayarlar":
        return <SettingsView planCatalog={planCatalog} loading={loadingPlans} error={plansError} locale={locale} />;
      default:
        return (
          <DashboardHome
            trendData={liveTrend}
            shipments={shipments}
            plans={planCatalog?.plans || []}
            loading={loadingShipments}
            error={shipmentsError}
            workspaceAccess={currentWorkspaceAccess}
            locale={locale}
            onStartReport={() => openAuth("signup")}
            onRequestQuote={handleRequestQuote}
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(135,169,107,0.28),_transparent_32%),linear-gradient(180deg,#f8faf6_0%,#eef3eb_100%)] p-4 lg:p-6">
      <div className="mx-auto grid max-w-[1600px] gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
        <Sidebar
          activeView={activeView}
          onChangeView={setActiveView}
          workspaceAccess={currentWorkspaceAccess}
          locale={locale}
        />

        <main className="min-w-0">
          <Topbar
            activeView={activeView}
            onLogin={() => openAuth("login")}
            onSignUp={() => openAuth("signup")}
            workspaceAccess={currentWorkspaceAccess}
            locale={locale}
            onLocaleChange={setLocale}
          />
          {renderView()}
        </main>
      </div>

      <AuthModal
        open={authModalOpen}
        mode={authMode}
        locale={locale}
        onClose={() => setAuthModalOpen(false)}
        onModeChange={setAuthMode}
        onLoginSuccess={handleLoginSuccess}
        onSignupSuccess={handleSignupSuccess}
      />
    </div>
  );
}

export default App;
