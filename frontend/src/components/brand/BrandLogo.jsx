import { resolveLocale } from "../../lib/i18n";

function TurkishMark({ compact, dark }) {
  const kColor = dark ? "#FFFFFF" : "#0F2740";
  return (
    <svg viewBox="0 0 200 200" className={`${compact ? "h-10 w-10" : "h-16 w-16"} shrink-0`} aria-hidden="true">
      <defs>
        <linearGradient id="kb-tr-arc" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={dark ? "#4FC3F7" : "#0F2740"} />
          <stop offset="55%" stopColor="#1B9E4A" />
          <stop offset="100%" stopColor="#8BDB5A" />
        </linearGradient>
        <linearGradient id="kb-tr-leaf" x1="20%" y1="0%" x2="80%" y2="100%">
          <stop offset="0%" stopColor="#166E38" />
          <stop offset="100%" stopColor="#7FD34E" />
        </linearGradient>
      </defs>
      <path d="M22 20 L22 180 L48 180 L48 110 L120 180 L152 180 L76 98 L152 20 L120 20 L48 90 L48 20 Z" fill={kColor} />
      <path
        d="M163 62 A 80 80 0 1 1 62 163"
        fill="none"
        stroke="url(#kb-tr-arc)"
        strokeWidth="15"
        strokeLinecap="round"
      />
      <path
        d="M124 38 C96 40,72 56,60 86 C80 84,96 75,118 56 C116 70,108 84,94 95 C81 105,65 111,53 113 C57 123,66 131,78 135 C102 127,120 107,122 80 C124 62,118 47,124 38 Z"
        fill="url(#kb-tr-leaf)"
      />
      <path d="M66 107 C82 94,96 84,116 68" stroke="rgba(255,255,255,0.35)" strokeWidth="5" strokeLinecap="round" fill="none" />
    </svg>
  );
}

function EnglishMark({ compact, dark }) {
  const kColor = dark ? "#FFFFFF" : "#0F2740";
  return (
    <svg viewBox="0 0 200 200" className={`${compact ? "h-10 w-10" : "h-16 w-16"} shrink-0`} aria-hidden="true">
      <defs>
        <linearGradient id="kb-en-hex" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={dark ? "#4FC3F7" : "#0F2740"} />
          <stop offset="100%" stopColor="#7FD34E" />
        </linearGradient>
        <linearGradient id="kb-en-leaf" x1="20%" y1="0%" x2="80%" y2="100%">
          <stop offset="0%" stopColor="#166E38" />
          <stop offset="100%" stopColor="#7FD34E" />
        </linearGradient>
      </defs>
      <path
        d="M58 14 L142 14 L184 90 L142 166 L58 166 L16 90 Z"
        fill="none"
        stroke="url(#kb-en-hex)"
        strokeWidth="12"
        strokeLinejoin="round"
      />
      <path d="M44 46 L44 154 L68 154 L68 108 L128 154 L156 154 L92 98 L156 46 L128 46 L68 90 L68 46 Z" fill={kColor} />
      <path
        d="M118 112 C96 114,78 128,72 154 C90 152,105 143,118 126 C117 138,111 150,100 159 C90 167,77 171,66 172 C70 180,79 185,90 187 C114 180,130 160,132 138 C133 124,127 116,118 112 Z"
        fill="url(#kb-en-leaf)"
      />
      <path d="M80 162 C92 153,104 145,116 130" stroke="rgba(255,255,255,0.35)" strokeWidth="5" strokeLinecap="round" fill="none" />
    </svg>
  );
}

function BrandLogo({ compact = false, dark = false, className = "", locale = "tr" }) {
  const activeLocale = resolveLocale(locale);
  const isEnglish = activeLocale === "en";

  const titleColor = dark ? "text-white" : "text-[#0F2740]";
  const taglineColor = dark ? "text-white/70" : "text-[#0F2740]";
  const dividerColor = dark ? "border-white/20" : "border-[#0F2740]/30";

  return (
    <div className={`inline-flex items-center gap-2.5 ${className}`}>
      {isEnglish
        ? <EnglishMark compact={compact} dark={dark} />
        : <TurkishMark compact={compact} dark={dark} />}

      <div className="min-w-0">
        <div className={`${compact ? "text-[1.3rem]" : "text-[1.9rem]"} font-black uppercase leading-none tracking-[0.05em] ${titleColor}`}>
          KARBON<span className="text-[#2F9A49]">BEYAN</span>
        </div>
        {/* tagline only shown in full (non-compact) mode */}
        {!compact && (
          isEnglish ? (
            <>
              <div className={`my-1 border-t ${dividerColor}`} />
              <div className={`text-[0.65rem] uppercase tracking-[0.13em] ${taglineColor}`}>
                CBAM COMPLIANCE <span className="px-1 text-[#2F9A49]">•</span> CARBON COST <span className="px-1 text-[#2F9A49]">•</span> RISK MANAGEMENT
              </div>
              <div className={`mt-0.5 text-[0.6rem] italic tracking-[0.06em] text-[#2F9A49]`}>
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
