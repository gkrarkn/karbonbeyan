import { getMenuItems, t } from "../../lib/i18n";
import BrandLogo from "../brand/BrandLogo";

function Sidebar({ activeView, onChangeView, workspaceAccess, locale }) {
  const menuItems = getMenuItems(locale);
  return (
    <aside className="panel flex h-full min-h-[calc(100vh-2rem)] w-full flex-col justify-between overflow-hidden bg-ink text-white lg:max-w-[280px]">
      <div className="space-y-8 p-6">
        <BrandLogo compact dark locale={locale} className="w-full justify-start" />

        <div className="rounded-3xl bg-white/8 p-5">
          <div className="text-xs uppercase tracking-[0.28em] text-white/60">KarbonBeyan Vision</div>
          <div className="mt-3 text-2xl font-extrabold leading-tight">
            {t(locale, "CBAM/SKDM uyum sürecinizi", "Manage your CBAM process")}
            <span className="block text-sand">yönetin ve riskinizi görün</span>
          </div>
          <p className="mt-3 text-sm text-white/72">
            {t(
              locale,
              "Veri kalitesi, uygunluk statüsü, doğrulama ve tedarikçi akışını tek yerden yönetin.",
              "Control data quality, compliance status, verification and supplier flows from one place.",
            )}
          </p>
        </div>

        <nav className="space-y-2">
          {menuItems.map((item) => {
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onChangeView(item.id)}
                className={`w-full rounded-2xl px-4 py-4 text-left transition ${
                  isActive ? "bg-white text-ink" : "bg-white/6 text-white hover:bg-white/10"
                }`}
              >
                <div className="text-base font-semibold">{item.label}</div>
                <div className={`mt-1 text-sm ${isActive ? "text-slate-500" : "text-white/55"}`}>
                  {item.hint}
                </div>
              </button>
            );
          })}
        </nav>
      </div>

      <div className="border-t border-white/10 p-6">
        <div className="rounded-2xl bg-white/8 p-4">
          <div className="text-sm font-semibold">{t(locale, "7 Günlük Full Trial", "7-Day Full Trial")}</div>
          <p className="mt-2 text-sm text-white/65">
            {workspaceAccess?.trial_status === "active"
              ? t(
                  locale,
                  `${workspaceAccess.trial_days_remaining} gün boyunca tüm modüller açık. Supplier Data Collection ve Verification Workspace dahil.`,
                  `All modules are open for ${workspaceAccess.trial_days_remaining} more days, including Supplier Data Collection and Verification Workspace.`,
                )
              : t(
                  locale,
                  "Trial süresi doldu. Rapor çıktısı için aktif plan gerekir.",
                  "Trial expired. An active plan is required for report output.",
                )}
          </p>
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;
