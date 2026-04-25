import { useEffect, useMemo, useState } from "react";

import { loginUser, registerUser } from "../../lib/api";
import { t } from "../../lib/i18n";

const sectorOptions = [
  { value: "iron_steel", tr: "Demir-Çelik", en: "Iron and Steel" },
  { value: "aluminum", tr: "Alüminyum", en: "Aluminium" },
  { value: "cement", tr: "Çimento", en: "Cement" },
  { value: "fertilizers", tr: "Gübre", en: "Fertilizers" },
  { value: "electricity", tr: "Elektrik", en: "Electricity" },
  { value: "hydrogen", tr: "Hidrojen", en: "Hydrogen" },
  { value: "other", tr: "Diğer", en: "Other" },
];

const exportOptions = [
  { value: "yes", tr: "Evet", en: "Yes" },
  { value: "planning", tr: "Hazırlık aşamasında", en: "Planning phase" },
  { value: "no", tr: "Hayır", en: "No" },
];

const producerDataOptions = [
  {
    value: "regular",
    tr: "Evet, düzenli topluyoruz",
    en: "Yes, we collect it regularly",
  },
  {
    value: "partial",
    tr: "Kısmen, bazı tesislerde var",
    en: "Partially, only for some facilities",
  },
  {
    value: "none",
    tr: "Hayır, henüz toplamıyoruz",
    en: "No, not yet",
  },
];

const shipmentVolumeOptions = [
  { value: "1-10", tr: "1-10 sevkiyat / ay", en: "1-10 shipments / month" },
  { value: "11-50", tr: "11-50 sevkiyat / ay", en: "11-50 shipments / month" },
  { value: "51-150", tr: "51-150 sevkiyat / ay", en: "51-150 shipments / month" },
  { value: "150+", tr: "150+ sevkiyat / ay", en: "150+ shipments / month" },
];

const initialLoginForm = {
  email: "",
  password: "",
};

const initialSignupForm = {
  fullName: "",
  email: "",
  password: "",
  phone: "",
  companyName: "",
  taxCountry: "Türkiye",
  address: "",
  city: "",
  country: "Türkiye",
  sector: "iron_steel",
  exportsToEu: "yes",
  monthlyVolume: "1-10",
  destinationMarkets: "",
  facilityCount: "1",
  producerDataStatus: "none",
};

function ModalField({ label, children, hint }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      {children}
      {hint ? <span className="mt-2 block text-xs text-slate-500">{hint}</span> : null}
    </label>
  );
}

function AuthModal({
  open,
  mode,
  locale,
  onClose,
  onModeChange,
  onAuthSuccess,
}) {
  const [loginForm, setLoginForm] = useState(initialLoginForm);
  const [signupForm, setSignupForm] = useState(initialSignupForm);
  const [step, setStep] = useState(1);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [authError, setAuthError] = useState("");

  useEffect(() => {
    if (!open) return;
    setLoginForm(initialLoginForm);
    setSignupForm(initialSignupForm);
    setStep(1);
    setSubmitted(false);
    setSubmitting(false);
    setAuthError("");
  }, [open, mode]);

  const localizedSectorOptions = useMemo(
    () =>
      sectorOptions.map((option) => ({
        ...option,
        label: t(locale, option.tr, option.en),
      })),
    [locale],
  );
  const localizedExportOptions = useMemo(
    () =>
      exportOptions.map((option) => ({
        ...option,
        label: t(locale, option.tr, option.en),
      })),
    [locale],
  );
  const localizedProducerDataOptions = useMemo(
    () =>
      producerDataOptions.map((option) => ({
        ...option,
        label: t(locale, option.tr, option.en),
      })),
    [locale],
  );
  const localizedShipmentVolumeOptions = useMemo(
    () =>
      shipmentVolumeOptions.map((option) => ({
        ...option,
        label: t(locale, option.tr, option.en),
      })),
    [locale],
  );

  if (!open) {
    return null;
  }

  const updateLogin = (field) => (event) => {
    setLoginForm((current) => ({ ...current, [field]: event.target.value }));
  };

  const updateSignup = (field) => (event) => {
    setSignupForm((current) => ({ ...current, [field]: event.target.value }));
  };

  const handleLoginSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setAuthError("");
    try {
      const result = await loginUser({ email: loginForm.email, password: loginForm.password });
      onAuthSuccess?.({ token: result.access_token, user: result.user });
    } catch (err) {
      setAuthError(err.message || t(locale, "Giriş başarısız.", "Login failed."));
    } finally {
      setSubmitting(false);
    }
  };

  const handleSignupContinue = (event) => {
    event.preventDefault();
    setAuthError("");
    setStep(2);
  };

  const handleSignupSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setAuthError("");
    try {
      const result = await registerUser({
        email: signupForm.email,
        password: signupForm.password,
        full_name: signupForm.fullName,
        company_name: signupForm.companyName,
      });
      setSubmitted(true);
      onAuthSuccess?.({ token: result.access_token, user: result.user });
    } catch (err) {
      setAuthError(err.message || t(locale, "Kayıt başarısız.", "Registration failed."));
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm">
      <div className="panel w-full max-w-3xl overflow-hidden border border-white/60 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
              {t(locale, "KarbonBeyan Erişim", "KarbonBeyan Access")}
            </div>
            <div className="mt-1 text-xl font-extrabold text-ink">
              {mode === "login"
                ? t(locale, "Hesabınıza giriş yapın", "Log in to your workspace")
                : t(locale, "Hızlı kayıt ile ücretsiz başlayın", "Start free with a quick sign up")}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
          >
            {t(locale, "Kapat", "Close")}
          </button>
        </div>

        <div className="border-b border-slate-100 px-5 py-4">
          <div className="inline-flex rounded-2xl border border-slate-200 bg-slate-50 p-1">
            <button
              type="button"
              onClick={() => onModeChange?.("login")}
              className={`rounded-xl px-4 py-2 text-sm font-semibold ${
                mode === "login" ? "bg-ink text-white" : "text-slate-600"
              }`}
            >
              {t(locale, "Giriş Yap", "Login")}
            </button>
            <button
              type="button"
              onClick={() => onModeChange?.("signup")}
              className={`rounded-xl px-4 py-2 text-sm font-semibold ${
                mode === "signup" ? "bg-pine text-white" : "text-slate-600"
              }`}
            >
              {t(locale, "Üye Ol", "Sign Up")}
            </button>
          </div>
        </div>

        <div className="max-h-[78vh] overflow-y-auto px-5 py-5">
          {mode === "login" ? (
            <form className="space-y-4" onSubmit={handleLoginSubmit}>
              <div className="grid gap-4">
                <ModalField label={t(locale, "Kurumsal E-posta", "Business Email")}>
                  <input
                    className="field"
                    type="email"
                    value={loginForm.email}
                    onChange={updateLogin("email")}
                    placeholder={t(locale, "ornek@firma.com", "name@company.com")}
                    required
                  />
                </ModalField>
                <ModalField label={t(locale, "Şifre", "Password")}>
                  <input
                    className="field"
                    type="password"
                    value={loginForm.password}
                    onChange={updateLogin("password")}
                    placeholder="••••••••"
                    required
                  />
                </ModalField>
              </div>
              {authError ? (
                <p className="rounded-2xl bg-clay/10 px-4 py-3 text-sm font-medium text-clay">{authError}</p>
              ) : null}
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <button type="submit" disabled={submitting} className="btn-primary disabled:opacity-60">
                  {submitting ? t(locale, "Giriş yapılıyor...", "Logging in...") : t(locale, "Giriş Yap", "Login")}
                </button>
                <button
                  type="button"
                  onClick={() => onModeChange?.("signup")}
                  className="text-sm font-semibold text-[#0E4FAF]"
                >
                  {t(locale, "Hesabınız yok mu? Üye olun", "No account yet? Sign up")}
                </button>
              </div>
            </form>
          ) : submitted ? (
            <div className="space-y-5">
              <div className="rounded-[28px] bg-[linear-gradient(135deg,#0E4FAF_0%,#0B3F91_55%,#0B2447_100%)] p-6 text-white">
                <div className="text-xs font-semibold uppercase tracking-[0.24em] text-white/65">
                  {t(locale, "Kurulum Tamamlandı", "Setup Complete")}
                </div>
                <div className="mt-2 text-3xl font-extrabold">
                  {t(locale, "7 günlük ücretsiz denemeniz hazır", "Your 7-day free trial is ready")}
                </div>
                <p className="mt-3 max-w-2xl text-sm text-white/75">
                  {t(
                    locale,
                    "KarbonBeyan çalışma alanınız oluşturuldu. Şimdi dashboard'a geçip ilk kayıtlarınızı almaya başlayabilirsiniz.",
                    "Your KarbonBeyan workspace is ready. You can now enter the dashboard and start capturing your first records.",
                  )}
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <button type="button" onClick={onClose} className="btn-primary">
                  {t(locale, "Panele Geç", "Go to Workspace")}
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="text-sm font-semibold text-slate-500"
                >
                  {t(locale, "Daha sonra devam et", "Continue later")}
                </button>
              </div>
            </div>
          ) : (
            <form className="space-y-6" onSubmit={step === 1 ? handleSignupContinue : handleSignupSubmit}>
              <div className="flex items-center gap-3">
                {[1, 2].map((stepIndex) => {
                  const active = step === stepIndex;
                  const completed = step > stepIndex;
                  return (
                    <div key={stepIndex} className="flex items-center gap-3">
                      <div
                        className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold ${
                          active ? "bg-pine text-white" : completed ? "bg-[#0E4FAF] text-white" : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {stepIndex}
                      </div>
                      <div className="text-sm font-semibold text-slate-600">
                        {stepIndex === 1
                          ? t(locale, "Hesap", "Account")
                          : t(locale, "Firma ve Operasyon", "Company and Operations")}
                      </div>
                      {stepIndex === 1 ? <div className="h-px w-10 bg-slate-200" /> : null}
                    </div>
                  );
                })}
              </div>

              {step === 1 ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  <ModalField label={t(locale, "Ad Soyad", "Full Name")}>
                    <input
                      className="field"
                      value={signupForm.fullName}
                      onChange={updateSignup("fullName")}
                      placeholder={t(locale, "Adınız ve soyadınız", "Your full name")}
                      required
                    />
                  </ModalField>
                  <ModalField label={t(locale, "Telefon", "Phone")}>
                    <input
                      className="field"
                      value={signupForm.phone}
                      onChange={updateSignup("phone")}
                      placeholder={t(locale, "+90 5xx xxx xx xx", "+90 5xx xxx xx xx")}
                      required
                    />
                  </ModalField>
                  <ModalField label={t(locale, "Kurumsal E-posta", "Business Email")}>
                    <input
                      className="field"
                      type="email"
                      value={signupForm.email}
                      onChange={updateSignup("email")}
                      placeholder={t(locale, "ornek@firma.com", "name@company.com")}
                      required
                    />
                  </ModalField>
                  <ModalField label={t(locale, "Şifre", "Password")}>
                    <input
                      className="field"
                      type="password"
                      value={signupForm.password}
                      onChange={updateSignup("password")}
                      placeholder="••••••••"
                      required
                    />
                  </ModalField>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  <ModalField label={t(locale, "Firma Adı", "Company Name")}>
                    <input
                      className="field"
                      value={signupForm.companyName}
                      onChange={updateSignup("companyName")}
                      placeholder={t(locale, "Firma unvanı", "Company legal name")}
                      required
                    />
                  </ModalField>
                  <ModalField label={t(locale, "Sektör", "Sector")}>
                    <select className="field" value={signupForm.sector} onChange={updateSignup("sector")}>
                      {localizedSectorOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </ModalField>
                  <ModalField label={t(locale, "Vergi Ülkesi", "Tax Country")}>
                    <input
                      className="field"
                      value={signupForm.taxCountry}
                      onChange={updateSignup("taxCountry")}
                      placeholder={t(locale, "Vergi ülkesi", "Tax country")}
                    />
                  </ModalField>
                  <ModalField label={t(locale, "Ülke", "Country")}>
                    <input
                      className="field"
                      value={signupForm.country}
                      onChange={updateSignup("country")}
                      placeholder={t(locale, "Ülke", "Country")}
                    />
                  </ModalField>
                  <ModalField label={t(locale, "Şehir", "City")}>
                    <input
                      className="field"
                      value={signupForm.city}
                      onChange={updateSignup("city")}
                      placeholder={t(locale, "Şehir", "City")}
                    />
                  </ModalField>
                  <ModalField label={t(locale, "Tesis Sayısı", "Number of Facilities")}>
                    <input
                      className="field"
                      value={signupForm.facilityCount}
                      onChange={updateSignup("facilityCount")}
                      placeholder="1"
                    />
                  </ModalField>
                  <ModalField label={t(locale, "Firma Adresi", "Company Address")} hint={t(locale, "Kısa ve anlaşılır adres yeterlidir.", "A short and clear address is enough.")}>
                    <textarea
                      className="field min-h-[110px] resize-y"
                      value={signupForm.address}
                      onChange={updateSignup("address")}
                      placeholder={t(locale, "Adres", "Address")}
                    />
                  </ModalField>
                  <div className="space-y-4">
                    <ModalField label={t(locale, "AB'ye ihracat yapıyor musunuz?", "Are you exporting to the EU?")}>
                      <select className="field" value={signupForm.exportsToEu} onChange={updateSignup("exportsToEu")}>
                        {localizedExportOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </ModalField>
                    <ModalField label={t(locale, "Aylık CBAM kapsamlı sevkiyat", "Monthly CBAM shipment volume")}>
                      <select className="field" value={signupForm.monthlyVolume} onChange={updateSignup("monthlyVolume")}>
                        {localizedShipmentVolumeOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </ModalField>
                  </div>
                  <ModalField
                    label={t(locale, "Hedef AB ülkeleri", "Target EU countries")}
                    hint={t(locale, "Örn. Almanya, İtalya, Hollanda", "For example Germany, Italy, Netherlands")}
                  >
                    <input
                      className="field"
                      value={signupForm.destinationMarkets}
                      onChange={updateSignup("destinationMarkets")}
                      placeholder={t(locale, "Virgülle ayırarak yazın", "Separate with commas")}
                    />
                  </ModalField>
                  <ModalField
                    label={t(locale, "Üreticiden doğrulanmış emisyon verisi topluyor musunuz?", "Do you collect verified producer emissions data?")}
                    hint={t(
                      locale,
                      "Buradaki ifade, tedarikçiden veya tesisten gelen doğrulanmış üretici verisini anlatır.",
                      "This refers to verified producer data coming from the supplier or the installation.",
                    )}
                  >
                    <select className="field" value={signupForm.producerDataStatus} onChange={updateSignup("producerDataStatus")}>
                      {localizedProducerDataOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </ModalField>
                </div>
              )}

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                {step === 2 ? (
                  <button type="button" onClick={() => setStep(1)} className="btn-secondary">
                    {t(locale, "Geri", "Back")}
                  </button>
                ) : (
                  <div className="text-xs text-slate-500">
                    {t(
                      locale,
                      "Kayıt birkaç dakikadan kısa sürer. İlk aşamada sadece gerekli alanları topluyoruz.",
                      "Sign-up takes less than a few minutes. We only collect the fields needed for the first setup.",
                    )}
                  </div>
                )}
                <button type="submit" disabled={submitting} className="btn-primary disabled:opacity-60">
                  {submitting
                    ? t(locale, "Kaydediliyor...", "Saving...")
                    : step === 1
                      ? t(locale, "Devam Et", "Continue")
                      : t(locale, "Ücretsiz Denemeyi Başlat", "Start Free Trial")}
                </button>
              </div>
              {authError && step === 2 ? (
                <p className="rounded-2xl bg-clay/10 px-4 py-3 text-sm font-medium text-clay">{authError}</p>
              ) : null}
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default AuthModal;
