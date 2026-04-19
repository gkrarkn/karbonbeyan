import BrandLogo from "../brand/BrandLogo";

function Topbar({ activeView, onStartReport, workspaceAccess }) {
  const titleMap = {
    dashboard: "CBAM Uyum Sürecinizi Yönetin ve Riskinizi Görün",
    "yeni-rapor": "Uyum Akışı",
    arsiv: "Arşiv",
    katsayilar: "Katsayılar",
    ayarlar: "Plan ve Yetkilendirme",
  };

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
                ? `${workspaceAccess.trial_days_remaining} gün full trial aktif`
                : `${workspaceAccess.role_label} · ${workspaceAccess.active_plan}`}
            </div>
          ) : null}
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <button type="button" onClick={onStartReport} className="btn-primary">
          Uyum Sürecini Yönet
        </button>
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-clay text-sm font-bold text-white">
            GD
          </div>
          <div>
            <div className="text-sm font-semibold text-slate-800">Gökhan Demir</div>
            <div className="text-xs text-slate-500">Firma yöneticisi</div>
          </div>
        </div>
      </div>
    </header>
  );
}

export default Topbar;
