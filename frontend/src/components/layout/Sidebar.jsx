import { menuItems } from "../../data/mockData";
import BrandLogo from "../brand/BrandLogo";

function Sidebar({ activeView, onChangeView, workspaceAccess }) {
  return (
    <aside className="panel flex h-full min-h-[calc(100vh-2rem)] w-full flex-col justify-between overflow-hidden bg-ink text-white lg:max-w-[280px]">
      <div className="space-y-8 p-6">
        <BrandLogo className="w-full justify-start" />

        <div className="rounded-3xl bg-white/8 p-5">
          <div className="text-xs uppercase tracking-[0.28em] text-white/60">KarbonBeyan Vision</div>
          <div className="mt-3 text-2xl font-extrabold leading-tight">
            CBAM uyum sürecinizi
            <span className="block text-sand">yönetin ve riskinizi görün</span>
          </div>
          <p className="mt-3 text-sm text-white/72">
            Veri kalitesi, uygunluk statüsü, doğrulama ve tedarikçi akışını tek yerden yönetin.
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
          <div className="text-sm font-semibold">7 Günlük Full Trial</div>
          <p className="mt-2 text-sm text-white/65">
            {workspaceAccess?.trial_status === "active"
              ? `${workspaceAccess.trial_days_remaining} gün boyunca tüm modüller açık. Supplier Data Collection ve Verification Workspace dahil.`
              : "Trial süresi tamamlandığında plan ve kullanım limiti bazlı erişim devreye girer."}
          </p>
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;
