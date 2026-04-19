function EmissionsChart({ data }) {
  const maxValue = Math.max(...data.map((item) => item.value), 1);

  return (
    <div className="panel p-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold text-slate-500">Aylık Emisyon Görünümü</div>
          <h3 className="mt-1 text-xl font-bold text-ink">Toplam gömülü emisyon eğilimi</h3>
        </div>
        <div className="rounded-2xl bg-mist px-3 py-2 text-xs font-semibold text-slate-500">
          Son 6 ay
        </div>
      </div>

      <div className="mt-8 flex h-64 items-end gap-4">
        {data.map((item) => (
          <div key={item.month} className="flex flex-1 flex-col items-center gap-3">
            <div className="text-xs font-semibold text-slate-500">{item.value} t</div>
            <div className="flex h-48 w-full items-end rounded-t-[24px] bg-slate-100 p-1">
              <div
                className="w-full rounded-t-[20px] bg-gradient-to-t from-pine via-moss to-sand transition-all"
                style={{ height: `${(item.value / maxValue) * 100}%` }}
              />
            </div>
            <div className="text-sm font-semibold text-slate-600">{item.month}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default EmissionsChart;
