import { createContext, useContext, useState, useMemo, ReactNode } from "react";
import { Locale, translations, Translations } from "./translations";
import { useSiteSettings } from "@/hooks/useSiteSettings";

interface LanguageContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: Translations;
}

const LanguageContext = createContext<LanguageContextType | null>(null);

/**
 * Replaces `{fee}` throughout a translation tree with the commission rate the
 * server actually charges.
 *
 * The rate used to be written into the copy as a literal "9%". When the fee
 * became configurable that copy would have kept advertising 9% no matter what
 * the server charged — so the placeholder is substituted here, once, rather
 * than at each of the ~37 places the rate is mentioned across three languages.
 */
function substituteFee<T>(node: T, feeLabel: string): T {
  if (typeof node === "string") {
    return (node.includes("{fee}") ? node.replaceAll("{fee}", feeLabel) : node) as unknown as T;
  }
  if (Array.isArray(node)) {
    return node.map(item => substituteFee(item, feeLabel)) as unknown as T;
  }
  if (node !== null && typeof node === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
      out[key] = substituteFee(value, feeLabel);
    }
    return out as unknown as T;
  }
  return node;
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>("en");
  const { platform_fee_percent } = useSiteSettings();

  // French and Spanish put a space before the percent sign.
  const feeLabel = locale === "en" ? `${platform_fee_percent}%` : `${platform_fee_percent} %`;

  // Rebuilt only when the locale or the configured rate changes — not per render.
  const t = useMemo(
    () => substituteFee(translations[locale], feeLabel),
    [locale, feeLabel],
  );

  return (
    <LanguageContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextType {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used inside LanguageProvider");
  return ctx;
}
