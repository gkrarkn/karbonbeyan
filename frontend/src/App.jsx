import { useCallback, useEffect, useMemo, useState } from "react";

import AuthModal from "./components/auth/AuthModal";
import DashboardHome from "./components/DashboardHome";
import Sidebar from "./components/layout/Sidebar";
import Topbar from "./components/layout/Topbar";
import ReportWizard from "./components/report-wizard/ReportWizard";
import { emissionTrend } from "./data/mockData";
import {
  clearToken,
  downloadShipmentPdf,
  getMe,
  getToken,
  listPlans,
  listShipments,
  setToken,
} from "./lib/api";
import { resolveLocale, t, translateComplianceStatus, translateConfidence } from "./lib/i18n";

const validViewIds = new Set(["dashboard", "yeni-rapor", "arsiv", "ayarlar"]);
const LOCALE_KEY = "kb_locale";

function getInitialLocale() {
  if (typeof window === "undefined") {
    return "tr";
  }

  return resolveLocale(window.localStorage.getItem(LOCALE_KEY) || "tr");
}

const sectorLabels = {
  iron_steel: "Demir-Çelik",
  aluminum: "Alüminyum",
  cement: "Çimento",
  fertilizers: "Gübre",
  electricity: "Elektrik",
  hydrogen: "Hidrojen",
};

function getSectorLabel(value) {
  return sectorLabels[value] || value || "-";
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

const planFeatures = {
  archive_filters: {
    key: "archive_filters",
    label: "Gelişmiş Arşiv Filtreleri",
    description: "Durum, sektör ve referans bazlı filtreleme ile PDF yeniden indirme.",
  },
  verification_workspace: {
    key: "verification_workspace",
    label: "Verification Workspace",
    description: "İç inceleme, verifier takibi ve kanıt paketleme akışı.",
  },
  supplier_data_collection: {
    key: "supplier_data_collection",
    label: "Supplier Data Collection",
    description: "Tedarikçiden actual veri ve kanıt dokümanı toplama modülü.",
  },
  team_collaboration: {
    key: "team_collaboration",
    label: "Takım Çalışması",
    description: "Rol bazlı erişim, görev paylaşımı ve çok kullanıcılı operasyon ekranı.",
  },
  api_access: {
    key: "api_access",
    label: "API Erişimi",
    description: "ERP veya iç sistemlerle veri senkronizasyonu için entegrasyon uçları.",
  },
};

function getPublicPlanCatalog() {
  const starterFeatures = [planFeatures.archive_filters];
  const growthFeatures = [
    ...starterFeatures,
    planFeatures.verification_workspace,
    planFeatures.team_collaboration,
  ];
  const proFeatures = [
    ...growthFeatures,
    planFeatures.supplier_data_collection,
    planFeatures.api_access,
  ];

  return {
    trial_days: 7,
    current_access: {
      role: "company_admin",
      role_label: "Firma Yöneticisi",
      active_plan: "growth",
      trial_status: "active",
      trial_days_remaining: 7,
      accessible_feature_keys: proFeatures.map((feature) => feature.key),
      usage_counters: {
        reports_per_month: 0,
        supplier_requests: 0,
        team_members: 1,
      },
      usage_limits: {
        reports_per_month: 25,
        supplier_requests: 15,
        team_members: 10,
      },
      can_manage_billing: true,
    },
    plans: [
      {
        plan_id: "starter",
        name: "Starter",
        tagline: "İlk CBAM operasyonunu düzenli hale getiren KOBİ paketi.",
        monthly_price_eur: 59,
        usage_limits: {
          reports_per_month: 15,
          supplier_requests: 0,
          team_members: 1,
        },
        features: starterFeatures,
      },
      {
        plan_id: "growth",
        name: "Growth",
        tagline: "İç inceleme ve ekip koordinasyonunu yöneten büyüyen ihracatçılar için.",
        monthly_price_eur: 229,
        usage_limits: {
          reports_per_month: 75,
          supplier_requests: 0,
          team_members: 5,
        },
        features: growthFeatures,
        recommended: true,
      },
      {
        plan_id: "pro",
        name: "Pro",
        tagline: "Çok tesisli yapı, tedarikçi veri toplama ve ileri entegrasyon seviyesi.",
        monthly_price_eur: 599,
        usage_limits: {
          reports_per_month: 250,
          supplier_requests: 100,
          team_members: 20,
        },
        features: proFeatures,
      },
    ],
  };
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
      {!loading && shipments.length === 0 ? (
        <div className="mt-10 flex flex-col items-center gap-3 text-center">
          <div className="text-4xl">📂</div>
          <p className="text-base font-semibold text-slate-700">{t(locale, "Henüz kayıt yok", "No records yet")}</p>
          <p className="text-sm text-slate-500">{t(locale, "İlk CBAM raporunuzu oluşturmak için 'Yeni Rapor' bölümüne gidin.", "Go to 'New Report' to create your first CBAM declaration.")}</p>
        </div>
      ) : !loading && filteredShipments.length === 0 ? (
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

function SettingsView({ planCatalog, loading, error, locale }) {
  if (loading) {
    return <div className="panel p-6 text-sm text-slate-600">{t(locale, "Plan ve yetkilendirme yükleniyor...", "Loading plans and access rules...")}</div>;
  }

  if (error || !planCatalog) {
    return <div className="panel p-6 text-sm font-medium text-clay">{error || t(locale, "Plan bilgisi alınamadı.", "Plan information could not be loaded.")}</div>;
  }

  const { current_access: currentAccess, plans, trial_days: trialDays } = planCatalog;
  const featureKeys = [...new Set(plans.flatMap((plan) => plan.features.map((feature) => feature.key)))];

  const planTaglines = {
    starter: t(locale, "İlk CBAM operasyonunu düzenli hale getiren KOBİ paketi.", "The SME package that organizes your first CBAM operation."),
    growth: t(locale, "İç inceleme ve ekip koordinasyonunu yöneten büyüyen ihracatçılar için.", "For growing exporters managing internal review and team coordination."),
    pro: t(locale, "Çok tesisli yapı, tedarikçi veri toplama ve ileri entegrasyon seviyesi.", "Multi-facility structure, supplier data collection and advanced integration."),
  };

  const featureLabels = {
    archive_filters: {
      label: t(locale, "Gelişmiş Arşiv Filtreleri", "Advanced Archive Filters"),
      description: t(locale, "Durum, sektör ve referans bazlı filtreleme ile PDF yeniden indirme.", "Filter by status, sector and reference; re-download declaration PDFs."),
    },
    verification_workspace: {
      label: t(locale, "Verification Workspace", "Verification Workspace"),
      description: t(locale, "İç inceleme, verifier takibi ve kanıt paketleme akışı.", "Internal review, verifier tracking and evidence packaging flow."),
    },
    supplier_data_collection: {
      label: t(locale, "Supplier Data Collection", "Supplier Data Collection"),
      description: t(locale, "Tedarikçiden actual veri ve kanıt dokümanı toplama modülü.", "Collect actual emission data and supporting documents directly from suppliers."),
    },
    team_collaboration: {
      label: t(locale, "Takım Çalışması", "Team Collaboration"),
      description: t(locale, "Rol bazlı erişim, görev paylaşımı ve çok kullanıcılı operasyon ekranı.", "Role-based access, task sharing and multi-user operation screen."),
    },
    api_access: {
      label: t(locale, "API Erişimi", "API Access"),
      description: t(locale, "ERP veya iç sistemlerle veri senkronizasyonu için entegrasyon uçları.", "Integration endpoints for data sync with ERP or internal systems."),
    },
  };

  const roleLabel = currentAccess.role === "company_admin"
    ? t(locale, "Firma Yöneticisi", "Company Admin")
    : currentAccess.role_label;
  const getPlanPriceDisplay = (plan) => {
    if (locale === "en") {
      if (plan.plan_id === "starter") return "USD 69/mo";
      if (plan.plan_id === "growth") return "USD 269/mo";
    }

    return `EUR ${plan.monthly_price_eur}/${t(locale, "ay", "mo")}`;
  };

  return (
    <div className="space-y-6">
      <div className="panel p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="text-sm font-semibold text-slate-500">{t(locale, "Plan ve Yetkilendirme", "Plans and Access")}</div>
            <h2 className="mt-1 text-2xl font-extrabold text-ink">
              {t(locale, "7 günlük full trial ile tüm süreci görün", "See the full process with a 7-day full trial")}
            </h2>
            <p className="mt-2 max-w-3xl text-sm text-slate-600">
              {t(
                locale,
                "Freemium yerine tüm modülleri açan bir trial kurgusu aktif. Trial bittikten sonra kullanım limiti ve RBAC kuralları seçilen plana göre devreye girer.",
                "A full-access trial is active instead of freemium. After the trial ends, usage limits and RBAC rules apply based on the selected plan.",
              )}
            </p>
          </div>
          <div className="rounded-3xl bg-[#0E4FAF] px-5 py-4 text-white">
            <div className="text-xs uppercase tracking-[0.24em] text-white/70">{t(locale, "Aktif Erişim", "Active Access")}</div>
            <div className="mt-2 text-lg font-extrabold">{roleLabel}</div>
            <div className="mt-1 text-sm text-white/80">
              {currentAccess.trial_status === "active"
                ? `${currentAccess.trial_days_remaining}/${trialDays} ${t(locale, "gün full trial", "day full trial")}`
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
                <h3 className="mt-1 text-2xl font-extrabold text-ink">
                  {plan.plan_id === "pro"
                    ? t(locale, "Fiyat için iletişime geçin", "Contact us for pricing")
                    : getPlanPriceDisplay(plan)}
                </h3>
              </div>
              {plan.recommended ? (
                <div className="rounded-full bg-pine/10 px-3 py-1 text-xs font-semibold text-pine">
                  {t(locale, "Önerilen", "Recommended")}
                </div>
              ) : null}
            </div>
            <p className="mt-3 text-sm text-slate-600">{planTaglines[plan.plan_id] ?? plan.tagline}</p>

            <div className="mt-5 space-y-3">
              <UsageMeter
                label={t(locale, "Rapor / ay", "Reports / mo")}
                used={currentAccess.usage_counters.reports_per_month}
                limit={plan.usage_limits.reports_per_month}
              />
              <UsageMeter
                label={t(locale, "Tedarikçi isteği", "Supplier requests")}
                used={currentAccess.usage_counters.supplier_requests}
                limit={plan.usage_limits.supplier_requests}
              />
              <UsageMeter
                label={t(locale, "Takım üyesi", "Team members")}
                used={currentAccess.usage_counters.team_members}
                limit={plan.usage_limits.team_members}
              />
            </div>
          </article>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="panel p-6">
          <div className="text-sm font-semibold text-slate-500">{t(locale, "RBAC Özellik Matrisi", "RBAC Feature Matrix")}</div>
          <h3 className="mt-1 text-xl font-bold text-ink">{t(locale, "Plan bazlı erişim ayrımı", "Plan-based access control")}</h3>
          <div className="mt-6 overflow-x-auto">
            <table className="min-w-full text-left">
              <thead>
                <tr className="border-b border-slate-200 text-sm text-slate-500">
                  <th className="pb-3 font-semibold">{t(locale, "Özellik", "Feature")}</th>
                  {plans.map((plan) => (
                    <th key={plan.plan_id} className="pb-3 font-semibold">
                      {plan.name}
                    </th>
                  ))}
                  <th className="pb-3 font-semibold">{t(locale, "Şu an", "Now")}</th>
                </tr>
              </thead>
              <tbody>
                {featureKeys.map((featureKey) => (
                  <tr key={featureKey} className="border-b border-slate-100 text-sm text-slate-700">
                    <td className="py-4">
                      <div className="font-semibold">{featureLabels[featureKey]?.label}</div>
                      <div className="mt-1 text-xs text-slate-500">{featureLabels[featureKey]?.description}</div>
                    </td>
                    {plans.map((plan) => (
                      <td key={`${plan.plan_id}-${featureKey}`} className="py-4">
                        {plan.features.some((feature) => feature.key === featureKey) ? t(locale, "Var", "Yes") : "–"}
                      </td>
                    ))}
                    <td className="py-4">
                      {hasFeatureAccess(currentAccess, featureKey) ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-pine px-3 py-1 text-xs font-semibold text-white">
                          <span className="h-1.5 w-1.5 rounded-full bg-white/60" />
                          {t(locale, "Açık", "Active")}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-400">
                          <span className="h-1.5 w-1.5 rounded-full bg-slate-300" />
                          {t(locale, "Kilitli", "Locked")}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="panel p-6">
          <div className="text-sm font-semibold text-slate-500">{t(locale, "Kullanım Limiti", "Usage Limits")}</div>
          <h3 className="mt-1 text-xl font-bold text-ink">{t(locale, "Mevcut trial tüketimi", "Current trial usage")}</h3>
          <div className="mt-5 space-y-4">
            <UsageMeter
              label={t(locale, "Rapor / ay", "Reports / mo")}
              used={currentAccess.usage_counters.reports_per_month}
              limit={currentAccess.usage_limits.reports_per_month}
            />
            <UsageMeter
              label={t(locale, "Tedarikçi isteği", "Supplier requests")}
              used={currentAccess.usage_counters.supplier_requests}
              limit={currentAccess.usage_limits.supplier_requests}
            />
            <UsageMeter
              label={t(locale, "Takım üyesi", "Team members")}
              used={currentAccess.usage_counters.team_members}
              limit={currentAccess.usage_limits.team_members}
            />
          </div>

          <div className="mt-6 rounded-2xl bg-mist p-4">
            <div className="text-sm font-semibold text-ink">{t(locale, "Trial kuralı", "Trial policy")}</div>
            <p className="mt-2 text-sm text-slate-600">
              {t(
                locale,
                "Trial aktifken Supplier Data Collection dahil tüm özellikler açılır. Trial sonrası erişim, plan seviyesi ve rol bazlı yetki kuralına göre filtrelenir.",
                "While the trial is active, all features including Supplier Data Collection are unlocked. After the trial, access is filtered by plan level and role-based permissions.",
              )}
            </p>
          </div>
        </div>
      </div>

    </div>
  );
}

function AuthRequiredView({ locale, onSignUp, onLogin }) {
  return (
    <div className="panel p-6">
      <div className="text-sm font-semibold text-slate-500">{t(locale, "Uyum Akışı", "Workflow")}</div>
      <h2 className="mt-1 text-2xl font-extrabold text-ink">
        {t(locale, "İlk CBAM/SKDM maliyet hesabınızı oluşturmak için giriş yapın", "Sign in to create your first CBAM cost calculation")}
      </h2>
      <p className="mt-2 max-w-2xl text-sm text-slate-600">
        {t(
          locale,
          "Sevkiyat bilgilerinizi girin; sistem karbon maliyetinizi, eksik verileri ve beyana hazırlık durumunuzu göstersin.",
          "Enter your shipment data; the system will show your carbon cost, missing data, and declaration readiness.",
        )}
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <button type="button" className="btn-primary" onClick={onSignUp}>
          {t(locale, "Hemen Başla", "Start Now")}
        </button>
        <button type="button" className="btn-secondary" onClick={onLogin}>
          {t(locale, "Giriş Yap", "Log In")}
        </button>
      </div>
    </div>
  );
}

function App() {
  const [activeView, setActiveView] = useState("dashboard");
  const [locale, setLocale] = useState(getInitialLocale);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState("signup");
  const [currentUser, setCurrentUser] = useState(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [shipments, setShipments] = useState([]);
  const [planCatalog, setPlanCatalog] = useState(null);
  const [loadingShipments, setLoadingShipments] = useState(false);
  const [loadingPlans, setLoadingPlans] = useState(false);
  const [shipmentsError, setShipmentsError] = useState("");
  const [plansError, setPlansError] = useState("");

  const handleChangeView = useCallback((viewId) => {
    setActiveView(validViewIds.has(viewId) ? viewId : "dashboard");
  }, []);

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

  const loadPlans = useCallback(async () => {
    try {
      setLoadingPlans(true);
      setPlansError("");
      const planData = await listPlans();
      setPlanCatalog(planData);
    } catch (error) {
      setPlanCatalog(getPublicPlanCatalog());
      setPlansError("");
    } finally {
      setLoadingPlans(false);
    }
  }, []);

  const loadUserData = useCallback(() => {
    loadShipments();
    loadPlans();
  }, [loadShipments, loadPlans]);

  // Restore session from stored token on mount
  useEffect(() => {
    const token = getToken();
    if (!token) {
      setSessionLoading(false);
      loadPlans();
      return;
    }
    getMe()
      .then((user) => {
        setCurrentUser(user);
        loadUserData();
      })
      .catch(() => {
        clearToken();
      })
      .finally(() => {
        setSessionLoading(false);
      });
  }, [loadPlans, loadUserData]);

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
    if (!planCatalog?.current_access) return null;
    return {
      ...planCatalog.current_access,
      company_name: currentUser?.company_name || t(locale, "KarbonBeyan Hesabı", "KarbonBeyan Workspace"),
      role_label: planCatalog.current_access.role_label,
    };
  }, [locale, planCatalog, currentUser]);

  const openAuth = useCallback((mode) => {
    setAuthMode(mode);
    setAuthModalOpen(true);
  }, []);

  const handleAuthSuccess = useCallback(({ token, user }) => {
    setToken(token);
    setCurrentUser(user);
    setAuthModalOpen(false);
    setActiveView("dashboard");
    loadUserData();
  }, [loadUserData]);

  const handleLogout = useCallback(() => {
    clearToken();
    setCurrentUser(null);
    setShipments([]);
    setPlanCatalog(null);
    setActiveView("dashboard");
  }, []);

  useEffect(() => {
    window.localStorage.setItem(LOCALE_KEY, resolveLocale(locale));
  }, [locale]);

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
    if (!validViewIds.has(activeView)) {
      return (
        <DashboardHome
          trendData={liveTrend}
          shipments={shipments}
          plans={planCatalog?.plans || []}
          loading={loadingShipments}
          error={shipmentsError}
          workspaceAccess={currentWorkspaceAccess}
          locale={locale}
          onStartReport={() => (currentUser ? setActiveView("yeni-rapor") : openAuth("signup"))}
          onRequestQuote={handleRequestQuote}
        />
      );
    }

    switch (activeView) {
      case "yeni-rapor":
        if (!currentUser) {
          return (
            <AuthRequiredView
              locale={locale}
              onSignUp={() => openAuth("signup")}
              onLogin={() => openAuth("login")}
            />
          );
        }
        return <ReportWizard onShipmentCreated={loadShipments} locale={locale} />;
      case "arsiv":
        return <ArchiveView shipments={shipments} loading={loadingShipments} error={shipmentsError} locale={locale} />;
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
            onStartReport={() => (currentUser ? setActiveView("yeni-rapor") : openAuth("signup"))}
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
          onChangeView={handleChangeView}
          workspaceAccess={currentWorkspaceAccess}
          locale={locale}
        />

        <main className="min-w-0">
          <Topbar
            activeView={activeView}
            onHome={() => handleChangeView("dashboard")}
            onLogin={() => openAuth("login")}
            onSignUp={() => openAuth("signup")}
            onLogout={handleLogout}
            currentUser={currentUser}
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
        onAuthSuccess={handleAuthSuccess}
      />
    </div>
  );
}

export default App;
