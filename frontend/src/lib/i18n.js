export const locales = {
  tr: "TR",
  en: "EN",
};

export function resolveLocale(locale) {
  if (typeof locale !== "string") {
    return "tr";
  }

  return locale.toLowerCase().startsWith("en") ? "en" : "tr";
}

export function getMenuItems(locale) {
  if (locale === "en") {
    return [
      { id: "dashboard", label: "Overview", hint: "Status summary" },
      { id: "yeni-rapor", label: "Workflow", hint: "Start a CBAM process" },
      { id: "arsiv", label: "Archive", hint: "Past reports" },
      { id: "ayarlar", label: "Plans", hint: "Trial, RBAC and limits" },
    ];
  }

  return [
    { id: "dashboard", label: "Genel Bakış", hint: "Durum özeti" },
    { id: "yeni-rapor", label: "Uyum Akışı", hint: "CBAM sürecini başlat" },
    { id: "arsiv", label: "Arşiv", hint: "Geçmiş raporlar" },
    { id: "ayarlar", label: "Planlar", hint: "Trial, RBAC ve limitler" },
  ];
}

export function t(locale, tr, en) {
  return resolveLocale(locale) === "en" ? en : tr;
}

const statusMap = {
  "Eksik Veri (Default Kullanıldı)": "Missing Data (Default Used)",
  "İç İncelemeye Hazır": "Ready for Internal Review",
  "Resmi Beyana Uygun": "Ready for Official Declaration",
  Bekliyor: "Pending",
  "Doküman bekleniyor": "Documents pending",
};

const confidenceMap = {
  "Yüksek": "High",
  "Orta": "Medium",
  "Düşük": "Low",
  "Düşük Güven": "Low Confidence",
  "Orta Güven": "Medium Confidence",
  "Yüksek Güven": "High Confidence",
  "Yüksek güven: resmi beyana yakın": "High confidence: close to formal declaration",
  "Orta güven: iç inceleme gerekli": "Medium confidence: internal review required",
  "Düşük güven: resmi beyan için uygun değil": "Low confidence: not ready for formal declaration",
};

const roleMap = {
  "Firma yöneticisi": "Company Admin",
  "Firma Yöneticisi": "Company Admin",
  "Kurumsal çalışma alanı": "Corporate workspace",
};

export function translateComplianceStatus(locale, label) {
  return resolveLocale(locale) === "en" ? statusMap[label] || label : label;
}

export function translateConfidence(locale, label) {
  return resolveLocale(locale) === "en" ? confidenceMap[label] || label : label;
}

export function translateRole(locale, label) {
  return resolveLocale(locale) === "en" ? roleMap[label] || label : label;
}
