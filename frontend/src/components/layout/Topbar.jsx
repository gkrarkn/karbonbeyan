import BrandLogo from "../brand/BrandLogo";
import { locales, t, translateRole } from "../../lib/i18n";

function Topbar({
  activeView,
  onStartReport,
  onLogin,
  workspaceAccess,
  locale,
  onLocaleChange,
}) {
  const titleMap = {
    dashboard: t(locale, "CBAM Uyum Sürecinizi Yönetin ve Riskinizi Görün", "Manage Your CBAM Process and See Your Risk"),
    "yeni-rapor": t(locale, "Uyum Akışı", "Workflow"),
    arsiv: t(locale, "Arşiv", "Archive"),
    katsayilar: t(locale, "Katsayılar", "Coefficients"),
    ayarlar: t(locale, "Plan ve Yetkilendirme", "Plans and Access"),
  };

  const profileName = workspaceAccess?.company_name || t(locale, "KarbonBeyan Hesabı", "KarbonBeyan Workspace");
  const profileRole = translateRole(
    locale,
    workspaceAccess?.role_label || t(locale, "Kurumsal çalışma alanı", "Corporate workspace"),
  );
  const profileInitials = profileName
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <header className="panel mb-6 flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex items-center gap-4">
        <BrandLogo compact />
        <div>
          <div className="text-xs uppercase tracking-[0.24em] text-slate-400">KarbonBeyan Platform</div>
          <h1 className="text-2xl font-extrabold text-ink">{titleMap[activeView]}</h1>
          {workspaceAccess ? (
            <div className="mt-2 inline-flex items-center rounded-full bg-[#0E4FAF]/8 px-3 py-1 text-xs font-semibold text-[#0E4FAF]">
              {workspaceAccess.trial_status === "active"
                ? t(locale, `${workspaceAccess.trial_days_remaining} gün full trial aktif`, `${workspaceAccess.trial_days_remaining} day full trial active`)
                : `${translateRole(locale, workspaceAccess.role_label)} · ${workspaceAccess.active_plan}`}
            </div>
          ) : null}
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex items-center rounded-2xl border border-slate-200 bg-white p-1">
          {Object.entries(locales).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => onLocaleChange(key)}
              className={`rounded-xl px-3 py-2 text-xs font-semibold ${
                locale === key ? "bg-ink text-white" : "text-slate-500"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <button type="button" onClick={onLogin} className="btn-secondary">
          {t(locale, "Giriş Yap", "Login")}
        </button>
        <button type="button" onClick={onStartReport} className="btn-primary">
          {t(locale, "Ücretsiz Başla", "Start Free")}
        </button>
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-clay text-sm font-bold text-white">
            {profileInitials}
          </div>
          <div>
            <div className="text-sm font-semibold text-slate-800">{profileName}</div>
            <div className="text-xs text-slate-500">{profileRole}</div>
          </div>
        </div>
      </div>
    </header>
  );
}

export default Topbar;
