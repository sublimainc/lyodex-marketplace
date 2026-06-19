import { useLanguage } from "@/lib/i18n";
import { Locale } from "@/lib/translations";

const LOCALES: { code: Locale; label: string }[] = [
  { code: "en", label: "EN" },
  { code: "fr", label: "FR" },
  { code: "es", label: "ES" },
];

export function LanguageSwitcher() {
  const { locale, setLocale } = useLanguage();

  return (
    <div className="flex items-center rounded-md border overflow-hidden text-xs font-semibold">
      {LOCALES.map(({ code, label }, i) => (
        <button
          key={code}
          onClick={() => setLocale(code)}
          className={[
            "px-2.5 py-1.5 transition-colors",
            i > 0 ? "border-l" : "",
            locale === code
              ? "bg-primary text-primary-foreground"
              : "bg-background text-muted-foreground hover:text-foreground hover:bg-muted",
          ].join(" ")}
          aria-pressed={locale === code}
          aria-label={`Switch to ${label}`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
