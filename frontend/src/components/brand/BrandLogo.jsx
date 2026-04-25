import { resolveLocale } from "../../lib/i18n";

function TurkishMark({ compact, dark, uid }) {
  const kColor = dark ? "#FFFFFF" : "#0F2740";
  const arcId = `kb-tr-arc-${uid}`;
  const leafId = `kb-tr-leaf-${uid}`;
  return (
    <svg viewBox="0 0 200 200" className={`${compact ? "h-12 w-12" : "h-20 w-20"} shrink-0`} aria-hidden="true">
      <defs>
        <linearGradient id={arcId} x1="100%" y1="100%" x2="0%" y2="0%">
          <stop offset="0%" stopColor={dark ? "#7FD34E" : "#0F2740"} />
          <stop offset="45%" stopColor="#1B9E4A" />
          <stop offset="100%" stopColor="#7FD34E" />
        </linearGradient>
        <linearGradient id={leafId} x1="30%" y1="0%" x2="70%" y2="100%">
          <stop offset="0%" stopColor="#1A7A3C" />
          <stop offset="100%" stopColor="#7FD34E" />
        </linearGradient>
      </defs>
      {/* K — bold strokes, round caps */}
      <g stroke={kColor} strokeLinecap="round" strokeLinejoin="round" fill="none">
        <line x1="36" y1="18" x2="36" y2="182" strokeWidth="28" />
        <line x1="50" y1="100" x2="148" y2="18" strokeWidth="24" />
        <line x1="50" y1="100" x2="148" y2="182" strokeWidth="24" />
      </g>
      {/* Arc ~300°, gap at bottom — circle center (80,100) r=75 */}
      <path
        d="M 117 165 A 75 75 0 1 0 43 165"
        fill="none"
        stroke={`url(#${arcId})`}
        strokeWidth="13"
        strokeLinecap="round"
      />
      {/* Leaf */}
      <path
        d="M108 42 C82 44,58 60,48 90 C70 88,88 79,110 58 C108 73,100 88,86 100 C73 110,57 115,46 117 C50 127,60 134,72 138 C97 130,116 110,118 82 C120 63,114 48,108 42 Z"
        fill={`url(#${leafId})`}
      />
      <path d="M64 112 C80 98,96 86,110 66" stroke="rgba(255,255,255,0.45)" strokeWidth="4" strokeLinecap="round" fill="none" />
    </svg>
  );
}

function EnglishMark({ compact, dark, uid }) {
  const kColor = dark ? "#FFFFFF" : "#0F2740";
  const hexId = `kb-en-hex-${uid}`;
  const leafId = `kb-en-leaf-${uid}`;
  return (
    <svg viewBox="0 0 200 200" className={`${compact ? "h-12 w-12" : "h-20 w-20"} shrink-0`} aria-hidden="true">
      <defs>
        <linearGradient id={hexId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={dark ? "#4FC3F7" : "#0F2740"} />
          <stop offset="100%" stopColor="#7FD34E" />
        </linearGradient>
        <linearGradient id={leafId} x1="30%" y1="0%" x2="70%" y2="100%">
          <stop offset="0%" stopColor="#1A7A3C" />
          <stop offset="100%" stopColor="#7FD34E" />
        </linearGradient>
      </defs>
      {/* Flat-top hexagon */}
      <path
        d="M58 14 L142 14 L184 90 L142 166 L58 166 L16 90 Z"
        fill="none"
        stroke={`url(#${hexId})`}
        strokeWidth="12"
        strokeLinejoin="round"
      />
      {/* K — bold strokes */}
      <g stroke={kColor} strokeLinecap="round" strokeLinejoin="round" fill="none">
        <line x1="54" y1="46" x2="54" y2="154" strokeWidth="24" />
        <line x1="68" y1="100" x2="152" y2="46" strokeWidth="20" />
        <line x1="68" y1="100" x2="152" y2="154" strokeWidth="20" />
      </g>
      {/* Leaf */}
      <path
        d="M118 112 C96 114,78 128,72 154 C90 152,105 143,118 126 C117 138,111 150,100 159 C90 167,77 171,66 172 C70 180,79 185,90 187 C114 180,130 160,132 138 C133 124,127 116,118 112 Z"
        fill={`url(#${leafId})`}
      />
      <path d="M80 162 C92 153,104 145,116 130" stroke="rgba(255,255,255,0.45)" strokeWidth="4" strokeLinecap="round" fill="none" />
    </svg>
  );
}

function BrandLogo({ compact = false, dark = false, className = "", locale = "tr" }) {
  const activeLocale = resolveLocale(locale);
  const isEnglish = activeLocale === "en";
  const uid = `${compact ? "c" : "f"}${dark ? "d" : "l"}`;

  const titleColor = dark ? "text-white" : "text-[#0F2740]";
  const taglineColor = dark ? "text-white/70" : "text-[#0F2740]";
  const dividerColor = dark ? "border-white/20" : "border-[#0F2740]/30";

  return (
    <div className={`inline-flex items-center gap-2.5 ${className}`}>
      {isEnglish
        ? <EnglishMark compact={compact} dark={dark} uid={uid} />
        : <TurkishMark compact={compact} dark={dark} uid={uid} />}

      <div className="min-w-0">
        <div className={`${compact ? "text-[1.3rem]" : "text-[1.9rem]"} font-black uppercase leading-none tracking-[0.05em] ${titleColor}`}>
          KARBON<span className="text-[#2F9A49]">BEYAN</span>
        </div>
        {!compact && (
          isEnglish ? (
            <>
              <div className={`my-1 border-t ${dividerColor}`} />
              <div className={`text-[0.65rem] uppercase tracking-[0.13em] ${taglineColor}`}>
                CBAM COMPLIANCE <span className="px-1 text-[#2F9A49]">•</span> CARBON COST <span className="px-1 text-[#2F9A49]">•</span> RISK MANAGEMENT
              </div>
              <div className="mt-0.5 text-[0.6rem] italic tracking-[0.06em] text-[#2F9A49]">
                Accurate Data. Lower Risk. Confident Compliance.
              </div>
            </>
          ) : (
            <div className={`mt-1 text-[0.65rem] uppercase tracking-[0.13em] ${taglineColor}`}>
              CBAM UYUMU <span className="px-1 text-[#2F9A49]">|</span> KARBON MALİYETİ <span className="px-1 text-[#2F9A49]">|</span> RİSK YÖNETİMİ
            </div>
          )
        )}
      </div>
    </div>
  );
}

export default BrandLogo;
