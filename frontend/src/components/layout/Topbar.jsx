import BrandLogo from "../brand/BrandLogo";
import { locales, t, translateRole } from "../../lib/i18n";

function Topbar({
  activeView,
  onHome,
  onLogin,
  onSignUp,
  onLogout,
  currentUser,
  workspaceAccess,
  locale,
  onLocaleChange,
}) {
  const titleMap = {
    dashboard: t(locale, "CBAM/SKDM Uyum Sürecinizi Yönetin ve Riskinizi Görün", "Manage Your CBAM Process and See Your Risk"),
    "yeni-rapor": t(locale, "Uyum Akışı", "Workflow"),
    arsiv: t(locale, "Arşiv", "Archive"),
    ayarlar: t(locale, "Plan ve Yetkilendirme", "Plans and Access"),
  };

  const profileName = currentUser?.company_name || currentUser?.full_name || currentUser?.email || t(locale, "KarbonBeyan Hesabı", "KarbonBeyan Workspace");
  const profileSub = currentUser?.email || translateRole(locale, workspaceAccess?.role_label || t(locale, "Kurumsal çalışma alanı", "Corporate workspace"));
  const profileInitials = profileName.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase();
  const accessBadge = workspaceAccess?.trial_status === "active"
    ? t(locale, `${workspaceAccess.trial_days_remaining} gün full trial aktif`, `${workspaceAccess.trial_days_remaining} day full trial active`)
    : workspaceAccess?.active_plan === "none"
      ? t(locale, "Trial doldu · aktif plan yok", "Trial expired · no active plan")
      : `${translateRole(locale, workspaceAccess?.role_label)} · ${workspaceAccess?.active_plan}`;

  return (
    <header className="panel mb-6 flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex flex-col gap-1">
        <BrandLogo compact locale={locale} />
        <p className="text-sm font-semibold text-slate-600">{titleMap[activeView] || titleMap.dashboard}</p>
        {currentUser && workspaceAccess ? (
          <div className="inline-flex w-fit items-center rounded-full bg-[#0E4FAF]/8 px-3 py-0.5 text-xs font-semibold text-[#0E4FAF]">
            {accessBadge}
          </div>
        ) : null}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <button type="button" onClick={onHome} className="btn-secondary">
          {t(locale, "Ana Sayfa", "Home")}
        </button>

        <div className="flex items-center rounded-2xl border border-slate-200 bg-white p-1">
          {Object.entries(locales).map(([key, label]) => (
            <button key={key} type="button" onClick={() => onLocaleChange(key)}
              className={`rounded-xl px-3 py-2 text-xs font-semibold ${locale === key ? "bg-ink text-white" : "text-slate-500"}`}>
              {label}
            </button>
          ))}
        </div>

        {currentUser ? (
          <>
            <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-clay text-sm font-bold text-white">
                {profileInitials}
              </div>
              <div>
                <div className="text-sm font-semibold text-slate-800">{profileName}</div>
                <div className="text-xs text-slate-500">{profileSub}</div>
              </div>
            </div>
            <button type="button" onClick={onLogout} className="btn-secondary text-sm">
              {t(locale, "Çıkış", "Logout")}
            </button>
          </>
        ) : (
          <>
            <button type="button" onClick={onLogin} className="btn-secondary">
              {t(locale, "Giriş Yap", "Login")}
            </button>
            <button type="button" onClick={onSignUp} className="btn-primary">
              {t(locale, "Hemen Başla", "Start Now")}
            </button>
          </>
        )}
      </div>
    </header>
  );
}

export default Topbar;
