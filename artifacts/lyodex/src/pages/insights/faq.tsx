import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { HelpCircle, ChevronDown, ArrowRight, Search } from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { FAQ } from "@/content/faq";
import { PageMotif } from "@/components/PageMotif";

/**
 * FAQ — the page most likely to be quoted by a generative search engine.
 *
 * Three decisions follow from that, and they pull against ordinary UI habits:
 *
 * Every answer is in the HTML on first paint, not revealed on click. The
 * accordion here only collapses the *visual* height; the text is always in the
 * DOM and always in the JSON-LD. An answer hidden behind a fetch or a conditional
 * render is an answer no crawler ever reads.
 *
 * The FAQPage structured data is generated from the same source as the visible
 * text, never hand-maintained alongside it. Structured data that disagrees with
 * the page is worse than none: search engines treat the mismatch as an attempt
 * to game them.
 *
 * Answers are short and lead with the fact. A passage that buries the number in
 * its third sentence does not get extracted.
 */

export default function Faq() {
  const { locale } = useLanguage();
  const { platform_fee_percent } = useSiteSettings();
  const [open, setOpen] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");

  const content = FAQ[locale] ?? FAQ.en;
  const feeLabel = locale === "en" ? `${platform_fee_percent}%` : `${platform_fee_percent} %`;

  // The commission appears in two answers. Substituting here keeps the copy from
  // advertising a rate the server does not charge.
  const sections = useMemo(
    () => content.sections.map(s => ({
      ...s,
      items: s.items.map(i => ({ ...i, a: i.a.replaceAll("{fee}", feeLabel) })),
    })),
    [content, feeLabel],
  );

  const allItems = useMemo(() => sections.flatMap(s => s.items), [sections]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sections;
    return sections
      .map(s => ({ ...s, items: s.items.filter(i => `${i.q} ${i.a}`.toLowerCase().includes(q)) }))
      .filter(s => s.items.length > 0);
  }, [sections, query]);

  const T = {
    fr: {
      title: "Questions fréquentes",
      subtitle: "Lyophilisation alimentaire et fonctionnement de LyoDex",
      search: "Rechercher dans la FAQ…",
      none: "Aucune question ne correspond à cette recherche.",
      ctaTitle: "Votre question n'est pas ici ?",
      ctaBody: "Publiez une demande et les opérateurs capables d'y répondre vous contacteront directement.",
      ctaButton: "Publier une demande",
      expandAll: "Tout déplier",
      collapseAll: "Tout replier",
    },
    en: {
      title: "Frequently asked questions",
      subtitle: "Food freeze-drying, and how LyoDex works",
      search: "Search the FAQ…",
      none: "No question matches that search.",
      ctaTitle: "Question not answered here?",
      ctaBody: "Post a request and the operators able to answer it will contact you directly.",
      ctaButton: "Post a request",
      expandAll: "Expand all",
      collapseAll: "Collapse all",
    },
    es: {
      title: "Preguntas frecuentes",
      subtitle: "Liofilización de alimentos y funcionamiento de LyoDex",
      search: "Buscar en las preguntas…",
      none: "Ninguna pregunta coincide con esa búsqueda.",
      ctaTitle: "¿Su pregunta no está aquí?",
      ctaBody: "Publique una solicitud y los operadores capaces de responderla lo contactarán directamente.",
      ctaButton: "Publicar una solicitud",
      expandAll: "Desplegar todo",
      collapseAll: "Plegar todo",
    },
  }[locale] ?? {
    title: "Frequently asked questions", subtitle: "", search: "Search…", none: "No match.",
    ctaTitle: "", ctaBody: "", ctaButton: "", expandAll: "", collapseAll: "",
  };

  const allOpen = open.size === allItems.length;

  const toggle = (id: string) =>
    setOpen(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });

  // Structured data, built from the rendered answers so the two cannot drift.
  useEffect(() => {
    const el = document.createElement("script");
    el.type = "application/ld+json";
    el.id = "faq-jsonld";
    el.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      inLanguage: locale,
      mainEntity: allItems.map(i => ({
        "@type": "Question",
        name: i.q,
        acceptedAnswer: { "@type": "Answer", text: i.a },
      })),
    });
    document.head.appendChild(el);

    const prevTitle = document.title;
    document.title = `${T.title} — LyoDex`;

    return () => {
      document.getElementById("faq-jsonld")?.remove();
      document.title = prevTitle;
    };
  }, [allItems, locale, T.title]);

  // Deep link support: /faq#cout-service-lyophilisation opens that answer.
  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (hash && allItems.some(i => i.id === hash)) {
      setOpen(prev => new Set(prev).add(hash));
      requestAnimationFrame(() => {
        document.getElementById(hash)?.scrollIntoView({ block: "center", behavior: "smooth" });
      });
    }
  }, [allItems]);

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <section className="border-b py-10 px-4 relative overflow-hidden">
        <PageMotif kind="grid" />
        <div className="container mx-auto max-w-4xl">
          <div className="flex items-center gap-2 text-primary mb-2">
            <HelpCircle className="w-5 h-5" />
            <span className="eyebrow">LyoDex</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2">{T.title}</h1>
          <p className="text-muted-foreground mb-5 prose-measure">{T.subtitle}</p>
          <p className="text-sm text-muted-foreground prose-measure">{content.intro}</p>

          <div className="flex flex-wrap gap-3 items-center mt-6">
            <div className="relative flex-1 min-w-[240px] max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="search"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder={T.search}
                aria-label={T.search}
                className="w-full h-10 pl-9 pr-3 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <button
              onClick={() => setOpen(allOpen ? new Set() : new Set(allItems.map(i => i.id)))}
              className="text-sm text-muted-foreground hover:text-foreground underline underline-offset-4"
            >
              {allOpen ? T.collapseAll : T.expandAll}
            </button>
          </div>
        </div>
      </section>

      <section className="container mx-auto max-w-4xl px-4 py-10 flex-1">
        {filtered.length === 0 ? (
          <p className="text-center text-muted-foreground py-16">{T.none}</p>
        ) : (
          filtered.map(section => (
            <div key={section.id} className="mb-10">
              <h2 className="text-xl font-bold tracking-tight mb-4">{section.title}</h2>

              <div className="divide-y border rounded-lg overflow-hidden bg-card">
                {section.items.map(item => {
                  const isOpen = open.has(item.id) || query.trim().length > 0;
                  return (
                    <article key={item.id} id={item.id} className="scroll-mt-24">
                      <h3>
                        <button
                          onClick={() => toggle(item.id)}
                          aria-expanded={isOpen}
                          className="w-full flex items-start justify-between gap-4 text-left px-5 py-4 hover:bg-muted/40 transition-colors"
                        >
                          <span className="font-semibold text-[15px] leading-snug">{item.q}</span>
                          <ChevronDown
                            className={`w-4 h-4 shrink-0 mt-1 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`}
                          />
                        </button>
                      </h3>
                      {/*
                        Always rendered. Collapsing is done with CSS height rather
                        than by unmounting, so the answer is present for crawlers
                        and for in-page find even while visually closed.
                      */}
                      <div
                        className={`grid transition-[grid-template-rows] duration-200 ${isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
                      >
                        <div className="overflow-hidden">
                          <div className="px-5 pb-4 -mt-1">
                            <p className="text-sm text-muted-foreground leading-relaxed prose-measure">{item.a}</p>
                            {item.link && (
                              <Link
                                href={item.link.href}
                                className="inline-flex items-center gap-1 text-sm text-primary font-medium mt-2.5 hover:underline"
                              >
                                {item.link.label} <ArrowRight className="w-3.5 h-3.5" />
                              </Link>
                            )}
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          ))
        )}

        <div className="border rounded-lg bg-muted/20 px-6 py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="font-semibold mb-1">{T.ctaTitle}</p>
            <p className="text-sm text-muted-foreground prose-measure">{T.ctaBody}</p>
          </div>
          <Link
            href="/request"
            className="shrink-0 inline-flex items-center gap-2 rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-semibold hover:opacity-90"
          >
            {T.ctaButton} <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}
