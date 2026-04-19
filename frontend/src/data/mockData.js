export const menuItems = [
  { id: "dashboard", label: "Genel Bakış", hint: "Durum özeti" },
  { id: "yeni-rapor", label: "Uyum Akışı", hint: "CBAM sürecini başlat" },
  { id: "arsiv", label: "Arşiv", hint: "Geçmiş raporlar" },
  { id: "katsayilar", label: "Katsayılar", hint: "Varsayılan değerler" },
  { id: "ayarlar", label: "Planlar", hint: "Trial, RBAC ve limitler" },
];

export const complianceCards = [
  {
    title: "Eksik Veri (Default Kullanıldı)",
    value: "11",
    meta: "Öncelikli iç takip",
    tone: "bg-clay",
  },
  {
    title: "İç İncelemeye Hazır",
    value: "7",
    meta: "Operasyon ekibi kontrol etmeli",
    tone: "bg-moss",
  },
  {
    title: "Resmi Beyana Uygun",
    value: "4",
    meta: "Doğrulama tamamlandı",
    tone: "bg-pine",
  },
];

export const summaryCards = [
  { title: "Toplam Gömülü Emisyon", value: "482.4 tCO2e", meta: "Son 12 ay", tone: "bg-pine" },
  { title: "Ortalama Veri Güveni", value: "Orta", meta: "Default ve actual karışık", tone: "bg-clay" },
  { title: "Verification Bekleyen", value: "9", meta: "Resmi beyana engel kayıt", tone: "bg-moss" },
];

export const emissionTrend = [
  { month: "Oca", value: 36 },
  { month: "Şub", value: 52 },
  { month: "Mar", value: 44 },
  { month: "Nis", value: 67 },
  { month: "May", value: 59 },
  { month: "Haz", value: 71 },
];

export const archiveRows = [
  {
    ref: "KB-2026-0014",
    company: "Marmara Çelik",
    method: "Default",
    status: "Eksik Veri (Default Kullanıldı)",
    emissions: "72.6 tCO2e",
  },
  {
    ref: "KB-2026-0013",
    company: "Anadolu Alüminyum",
    method: "Actual",
    status: "İç İncelemeye Hazır",
    emissions: "18.9 tCO2e",
  },
  {
    ref: "KB-2026-0012",
    company: "Trakya Metal",
    method: "Mixed",
    status: "Resmi Beyana Uygun",
    emissions: "41.2 tCO2e",
  },
];

export const coefficientRows = [
  { code: "72082520", sector: "Demir-Çelik", origin: "TR", value: "2.670263", route: "BF/BOF" },
  { code: "72071210", sector: "Demir-Çelik", origin: "TR", value: "2.540638", route: "BF/BOF" },
  { code: "76011000", sector: "Alüminyum", origin: "ANY", value: "1.464000", route: "Primary" },
  { code: "76012000", sector: "Alüminyum", origin: "ANY", value: "0.139000", route: "Secondary" },
];

export const highestRiskRecords = [
  {
    ref: "KB-2026-0041",
    company: "Delta Metal",
    reason: "Tamamen default değer kullanıldı",
    confidence: "Düşük Güven",
  },
  {
    ref: "KB-2026-0038",
    company: "Marmara Çelik",
    reason: "Verification raporu bekleniyor",
    confidence: "Orta Güven",
  },
  {
    ref: "KB-2026-0033",
    company: "Ege Alüminyum",
    reason: "Monitoring plan referansı eksik",
    confidence: "Düşük Güven",
  },
  {
    ref: "KB-2026-0029",
    company: "Kuzey Hadde",
    reason: "CN doğrulama sonrası rota yeniden kontrol edilmeli",
    confidence: "Orta Güven",
  },
  {
    ref: "KB-2026-0022",
    company: "Trakya Metal",
    reason: "Precursor verisi gecikmeli",
    confidence: "Orta Güven",
  },
];

export const upcomingDeclarations = [
  { company: "Marmara Çelik", period: "2026 Q2", due: "8 gün kaldı" },
  { company: "Anadolu Alüminyum", period: "2026 Q2", due: "11 gün kaldı" },
  { company: "Delta Metal", period: "2026 Q2", due: "13 gün kaldı" },
];

export const pendingVerifications = [
  { company: "Marmara Çelik", verifier: "Atanmadı", status: "Bekliyor" },
  { company: "Anadolu Alüminyum", verifier: "Green Audit GmbH", status: "Doküman bekleniyor" },
  { company: "Ege Alüminyum", verifier: "Atanmadı", status: "Bekliyor" },
];
