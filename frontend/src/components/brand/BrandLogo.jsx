import { resolveLocale } from "../../lib/i18n";

function BrandLogo({ compact = false, dark = false, className = "", locale = "tr" }) {
  const activeLocale = resolveLocale(locale);
  const fullLogoSrc = activeLocale === "en" ? "/logo-en.png" : "/logo-tr.png";
  const titleColor = dark ? "text-white" : "text-[#0F2740]";

  if (!compact) {
    return (
      <img
        src={fullLogoSrc}
        alt={
          activeLocale === "en"
            ? "KarbonBeyan - Accurate Data. Lower Risk. Confident Compliance."
            : "KarbonBeyan - CBAM Uyumu, Karbon Maliyeti, Risk Yönetimi"
        }
        className={`h-16 w-auto max-w-full object-contain ${className}`}
      />
    );
  }

  return (
    <div className={`inline-flex items-center gap-2.5 ${className}`}>
      <img
        src="/logo-icon.png"
        alt=""
        className={`${dark ? "rounded-xl bg-white p-1" : ""} h-10 w-10 shrink-0 object-contain`}
        aria-hidden="true"
      />
      <div className={`text-[1.3rem] font-black uppercase leading-none tracking-[0.05em] ${titleColor}`}>
        KARBON<span className="text-[#2F9A49]">BEYAN</span>
      </div>
    </div>
  );
}

export default BrandLogo;
