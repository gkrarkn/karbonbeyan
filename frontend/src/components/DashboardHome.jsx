import { highestRiskRecords, pendingVerifications, upcomingDeclarations } from "../data/mockData";
import EmissionsChart from "./charts/EmissionsChart";

function DashboardHome({ trendData, shipments, loading, error, workspaceAccess }) {
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
        ? "Yüksek"
        : shipments.filter((shipment) => shipment.calculation.confidence_level === "low").length > shipments.length / 2
          ? "Düşük"
          : "Orta"
      : "Orta";

  return (
    <div className="space-y-6">
      <section className="panel overflow-hidden">
        <div className="grid gap-6 bg-[linear-gradient(135deg,#0E4FAF_0%,#0B3F91_55%,#0B2447_100%)] p-6 text-white xl:grid-cols-[1.2fr_0.8fr]">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.3em] text-white/65">KarbonBeyan Vision</div>
            <h2 className="mt-3 text-3xl font-extrabold">CBAM Uyum Sürecinizi Yönetin ve Riskinizi Görün</h2>
            <p className="mt-3 max-w-2xl text-sm text-white/75">
              Hesap üretmekten öte; uygunluk statüsü, veri güveni, doğrulama kuyruğu ve tedarikçi akışını tek kontrol merkezinden yönetin.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-1">
            <div className="rounded-3xl bg-white/10 p-4 backdrop-blur">
              <div className="text-xs uppercase tracking-[0.24em] text-white/60">Trial Durumu</div>
              <div className="mt-2 text-xl font-extrabold">
                {workspaceAccess?.trial_status === "active"
                  ? `${workspaceAccess.trial_days_remaining} gün full erişim`
                  : "Plan bazlı erişim aktif"}
              </div>
              <div className="mt-2 text-sm text-white/75">
                Supplier Data Collection dahil tüm Pro modüller şu an açık.
              </div>
            </div>
            <div className="rounded-3xl bg-white/10 p-4 backdrop-blur">
              <div className="text-xs uppercase tracking-[0.24em] text-white/60">Yetki ve Plan</div>
              <div className="mt-2 text-xl font-extrabold">{workspaceAccess?.role_label || "Firma Yöneticisi"}</div>
              <div className="mt-2 text-sm text-white/75">
                Aktif seviye: {(workspaceAccess?.active_plan || "growth").toUpperCase()}
              </div>
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
          { title: "Toplam Gömülü Emisyon", value: `${totalEmissions} tCO2e`, meta: "Canlı kayıtlar", tone: "bg-pine" },
          { title: "Ortalama Veri Güveni", value: avgConfidence, meta: "Shipment kayıtlarından hesaplandı", tone: "bg-clay" },
          {
            title: "Verification Bekleyen",
            value: pendingShipments.length,
            meta: "Resmi beyana engel kayıt",
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
            {(shipments.length > 0
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
                    {row.confidence}
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
            {(shipments.length > 0
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
                <div className="mt-1 text-sm font-semibold text-slate-700">{row.status}</div>
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
                  %{shipments.length > 0 ? Math.round((shipments.reduce((sum, shipment) => sum + shipment.calculation.data_quality_summary.actual_share, 0) / shipments.length) * 100) : 63}
                </span>
              </div>
              <div className="mt-3 h-3 rounded-full bg-white">
                <div
                  className="h-3 rounded-full bg-pine"
                  style={{
                    width: `${shipments.length > 0 ? Math.round((shipments.reduce((sum, shipment) => sum + shipment.calculation.data_quality_summary.actual_share, 0) / shipments.length) * 100) : 63}%`,
                  }}
                />
              </div>
            </div>
            <div className="rounded-2xl bg-mist p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-700">Default alanlar</span>
                <span className="text-sm font-bold text-clay">
                  %{shipments.length > 0 ? Math.round((shipments.reduce((sum, shipment) => sum + shipment.calculation.data_quality_summary.default_share, 0) / shipments.length) * 100) : 37}
                </span>
              </div>
              <div className="mt-3 h-3 rounded-full bg-white">
                <div
                  className="h-3 rounded-full bg-clay"
                  style={{
                    width: `${shipments.length > 0 ? Math.round((shipments.reduce((sum, shipment) => sum + shipment.calculation.data_quality_summary.default_share, 0) / shipments.length) * 100) : 37}%`,
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
            <div className="text-sm font-semibold text-slate-500">Son Kayıtlar</div>
            <h3 className="mt-1 text-xl font-bold text-ink">Arşivden son raporlar</h3>
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
                    <td className="py-4">{shipment.calculation.compliance_status_label}</td>
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
