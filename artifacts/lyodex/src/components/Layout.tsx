import { useState, useRef, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { ArrowRight, Wrench, MapPin, BarChart3, BookOpen, Package, ChevronDown, X, Menu, LogOut, User, LayoutDashboard, Shield, ShieldCheck, Settings, Factory } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LyoDexLogo } from "@/components/LyoDexLogo";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useLanguage } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { NotificationBell } from "@/components/NotificationBell";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";

const ROLE_COLORS: Record<string, string> = {
  buyer: "bg-blue-100 text-blue-700",
  operator: "bg-emerald-100 text-emerald-700",
  admin: "bg-amber-100 text-amber-700",
};

function UserMenu() {
  const { user, logout } = useAuth();
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const [, setLocation] = useLocation();

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  if (!user) return null;

  const roleColor = ROLE_COLORS[user.role] ?? "bg-muted text-muted-foreground";

  const handleLogout = async () => {
    await logout();
    setOpen(false);
    setLocation("/");
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 text-sm font-medium hover:text-primary transition-colors"
      >
        <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
          <User className="w-3.5 h-3.5 text-primary" />
        </div>
        <span className="hidden sm:inline max-w-[120px] truncate">{user.name}</span>
        <span className={`hidden sm:inline text-[10px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wide ${roleColor}`}>
          {user.role}
        </span>
        <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute top-full right-0 mt-2 w-52 rounded-xl border bg-background shadow-lg z-50 overflow-hidden">
          <div className="px-3 py-2.5 border-b">
            <div className="text-sm font-semibold truncate">{user.name}</div>
            <div className="text-xs text-muted-foreground truncate">{user.email}</div>
          </div>
          <Link
            href="/dashboard"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 px-3 py-2.5 text-sm hover:bg-muted/60 transition-colors"
          >
            <LayoutDashboard className="w-4 h-4 text-muted-foreground" /> {t.nav.dashboard}
          </Link>
          {user.role === "admin" && (
            <Link
              href="/admin"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2.5 text-sm hover:bg-muted/60 transition-colors"
            >
              <Shield className="w-4 h-4 text-amber-600" /> Admin panel
            </Link>
          )}
          <Link
            href="/settings"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 px-3 py-2.5 text-sm hover:bg-muted/60 transition-colors"
          >
            <Settings className="w-4 h-4 text-muted-foreground" /> {t.nav.profileSettings}
          </Link>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm hover:bg-muted/60 transition-colors border-t text-destructive"
          >
            <LogOut className="w-4 h-4" /> {t.nav.signOut}
          </button>
        </div>
      )}
    </div>
  );
}

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, loading } = useAuth();
  const { t } = useLanguage();

  const isActive = (path: string) => location === path;

  // Desktop navigation, grouped. Mobile keeps the same grouping as labelled
  // sections rather than one long undifferentiated list.
  const NAV_GROUPS = [
    {
      label: t.nav.groupMarketplace,
      items: [
        { href: "/machinery", label: t.nav.machinery, desc: t.nav.machineryDesc },
        { href: "/product-market", label: t.nav.productMarket, desc: t.nav.productMarketDesc },
        { href: "/manufacturers", label: t.nav.manufacturers, desc: t.nav.manufacturersDesc },
        { href: "/operator-map", label: t.nav.operatorMap, desc: t.nav.operatorMapDesc },
      ],
    },
    {
      label: t.nav.groupInsights,
      items: [
        { href: "/market-intelligence", label: t.nav.marketIntelligence, desc: t.nav.marketIntelligenceDesc },
        { href: "/seasonality", label: t.seasonality.title, desc: t.nav.seasonalityDesc },
        { href: "/blog", label: t.nav.blog, desc: t.nav.blogDesc },
      ],
    },
    {
      label: t.nav.groupAbout,
      items: [
        { href: "/how-it-works", label: t.nav.howItWorks, desc: t.nav.howItWorksDesc },
        { href: "/faq", label: t.nav.faq, desc: t.nav.faqDesc },
        { href: "/trust", label: t.nav.trust, desc: t.nav.trustDesc },
      ],
    },
  ];

  const MOBILE_NAV_SECTIONS = [
    { label: null, items: [{ href: "/operators", label: t.nav.operators }, { href: "/pricing", label: t.nav.pricing }] },
    ...NAV_GROUPS.map(g => ({ label: g.label, items: g.items.map(({ href, label }) => ({ href, label })) })),
  ];

  return (
    <div className="min-h-[100dvh] flex flex-col font-sans bg-background text-foreground">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2 shrink-0" data-testid="link-home">
              <LyoDexLogo size={32} />
              <span className="font-bold text-lg tracking-tight">LyoDex</span>
            </Link>

            {/* Eight flat links overflowed onto a second line once the labels were
                translated ("Machinery & Parts", "Market Intelligence", …). Grouping
                them into three menus keeps the bar to one line in every language
                and gives each destination room for a one-line description. */}
            <nav className="hidden md:flex items-center gap-1 text-sm font-medium">
              <Link
                href="/operators"
                className={`px-3 py-2 rounded-md transition-colors hover:text-primary hover:bg-muted/60 ${isActive("/operators") ? "text-primary" : "text-muted-foreground"}`}
                data-testid="nav-operators"
              >
                {t.nav.operators}
              </Link>

              {NAV_GROUPS.map(group => {
                const groupActive = group.items.some(i => isActive(i.href));
                return (
                  <DropdownMenu key={group.label}>
                    <DropdownMenuTrigger
                      className={`flex items-center gap-1 px-3 py-2 rounded-md transition-colors outline-none hover:text-primary hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring ${groupActive ? "text-primary" : "text-muted-foreground"}`}
                    >
                      {group.label}
                      <ChevronDown className="w-3.5 h-3.5 opacity-60" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-64">
                      {group.items.map(item => (
                        <DropdownMenuItem key={item.href} asChild>
                          <Link href={item.href} className="flex flex-col items-start gap-0.5 cursor-pointer">
                            <span className={`font-medium ${isActive(item.href) ? "text-primary" : ""}`}>
                              {item.label}
                            </span>
                            <span className="text-xs text-muted-foreground leading-snug">{item.desc}</span>
                          </Link>
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                );
              })}

              <Link
                href="/pricing"
                className={`px-3 py-2 rounded-md transition-colors hover:text-primary hover:bg-muted/60 ${isActive("/pricing") ? "text-primary" : "text-muted-foreground"}`}
              >
                {t.nav.pricing}
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            {user?.role === "buyer" && <NotificationBell />}
            {loading ? (
              <div className="w-20 h-8 rounded-md bg-muted animate-pulse" />
            ) : user ? (
              <UserMenu />
            ) : (
              <>
                <Link href="/login" className="hidden md:block" data-testid="nav-login">
                  <Button variant="ghost" className="text-sm font-medium">{t.nav.signIn}</Button>
                </Link>
                <Link href="/register" className="hidden md:block">
                  <Button variant="outline" className="text-sm font-medium">{t.nav.register}</Button>
                </Link>
                <Link href="/request" className="hidden md:block" data-testid="nav-submit-request">
                  <Button className="text-sm font-medium gap-1.5">
                    {t.nav.freeRequest} <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                </Link>
              </>
            )}
            <button className="md:hidden p-1.5 text-muted-foreground" onClick={() => setMobileOpen(o => !o)}>
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {mobileOpen && (
          <div className="md:hidden border-t bg-background px-4 py-4 space-y-4 text-sm font-medium max-h-[calc(100dvh-3.5rem)] overflow-y-auto">
            {MOBILE_NAV_SECTIONS.map((section, i) => (
              <div key={section.label ?? `top-${i}`} className="space-y-1">
                {section.label && (
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground/70 font-semibold pt-1">
                    {section.label}
                  </p>
                )}
                {section.items.map(item => (
                  <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)}
                    className={`block py-1.5 ${isActive(item.href) ? "text-primary" : "text-muted-foreground"}`}>
                    {item.label}
                  </Link>
                ))}
              </div>
            ))}
            <div className="flex gap-2 pt-2 border-t">
              {user ? (
                <>
                  <Link href="/dashboard" onClick={() => setMobileOpen(false)} className="flex-1">
                    <Button variant="outline" className="w-full text-sm">{t.nav.dashboard}</Button>
                  </Link>
                </>
              ) : (
                <>
                  <Link href="/login" onClick={() => setMobileOpen(false)} className="flex-1">
                    <Button variant="outline" className="w-full text-sm">{t.nav.signIn}</Button>
                  </Link>
                  <Link href="/register" onClick={() => setMobileOpen(false)} className="flex-1">
                    <Button className="w-full text-sm">{t.nav.register}</Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </header>

      <main className="flex-1">{children}</main>

      <footer className="bg-[#0a1628] text-gray-300 pt-16 pb-8 mt-0">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-6 gap-8 mb-12">
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2 mb-4">
                <LyoDexLogo size={28} />
                <span className="font-bold text-white text-base">LyoDex</span>
              </div>
              <p className="text-xs text-gray-400 leading-relaxed mb-3">
                {t.footer.tagline}
              </p>
              <p className="text-xs text-gray-500">{t.footer.region}</p>
              <p className="text-xs text-gray-500">{t.footer.languages}</p>
            </div>

            {[
              {
                heading: t.footer.platformHeading,
                links: [
                  { label: t.footer.platform.howItWorks, href: "/how-it-works" },
                  { label: t.footer.platform.forBuyers, href: "/how-it-works" },
                  { label: t.footer.platform.forOperators, href: "/how-it-works#operators" },
                  { label: t.footer.platform.pricing, href: "/pricing" },
                  { label: t.footer.platform.marketIntelligence, href: "/market-intelligence" },
                  { label: t.seasonality.title, href: "/seasonality" },
                  { label: t.footer.platform.machinery, href: "/machinery" },
                ],
              },
              {
                heading: t.footer.trustHeading,
                links: [
                  { label: t.footer.trust.verification, href: "/trust" },
                  { label: t.footer.trust.trustBadges, href: "/trust" },
                  { label: t.footer.trust.disputePolicy, href: "/trust" },
                  { label: t.footer.trust.faq, href: "/trust" },
                ],
              },
              {
                heading: t.footer.companyHeading,
                links: [
                  { label: t.footer.company.about, href: "/" },
                  { label: t.footer.company.contact, href: "/" },
                  { label: t.footer.company.blog, href: "/blog" },
                  { label: t.footer.company.operatorMap, href: "/operator-map" },
                ],
              },
              {
                heading: t.footer.legalHeading,
                links: [
                  { label: t.footer.legal.termsOfService, href: "/" },
                  { label: t.footer.legal.privacyPolicy, href: "/" },
                  { label: t.footer.legal.marketplaceRules, href: "/" },
                  { label: t.footer.legal.disputePolicy, href: "/" },
                ],
              },
            ].map(col => (
              <div key={col.heading}>
                <h4 className="text-white font-semibold text-sm mb-4">{col.heading}</h4>
                <ul className="space-y-2.5">
                  {col.links.map(link => (
                    <li key={link.label}>
                      <Link href={link.href} className="text-xs text-gray-400 hover:text-white transition-colors">
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}

            {/* Contact column */}
            <div>
              <h4 className="text-white font-semibold text-sm mb-4">Contact</h4>
              <ul className="space-y-2.5">
                <li>
                  <a href="mailto:info@lyodex.com" className="text-xs text-gray-400 hover:text-white transition-colors">
                    info@lyodex.com
                  </a>
                  <p className="text-[10px] text-gray-600 mt-0.5">General inquiries</p>
                </li>
                <li>
                  <a href="mailto:support@lyodex.com" className="text-xs text-gray-400 hover:text-white transition-colors">
                    support@lyodex.com
                  </a>
                  <p className="text-[10px] text-gray-600 mt-0.5">Buyer &amp; operator support</p>
                </li>
                <li>
                  <a href="mailto:dispute@lyodex.com" className="text-xs text-gray-400 hover:text-white transition-colors">
                    dispute@lyodex.com
                  </a>
                  <p className="text-[10px] text-gray-600 mt-0.5">Contract disputes</p>
                </li>
                <li>
                  <a href="mailto:audit@lyodex.com" className="text-xs text-gray-400 hover:text-white transition-colors">
                    audit@lyodex.com
                  </a>
                  <p className="text-[10px] text-gray-600 mt-0.5">Compliance &amp; audit</p>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-white/10 pt-8 grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
            {t.footer.stats.map(stat => (
              <div key={stat.label} className="text-center">
                <div className="text-primary font-bold text-xl mb-1">{stat.value}</div>
                <div className="text-xs text-gray-500">{stat.label}</div>
              </div>
            ))}
          </div>

          <div className="border-t border-white/10 pt-6 flex flex-col md:flex-row items-center justify-between gap-3 text-xs text-gray-500">
            <span>© {new Date().getFullYear()} {t.footer.copyright}</span>
            <span>{t.footer.madeIn}</span>
            <div className="flex gap-4">
              <Link href="/" className="hover:text-white transition-colors">{t.footer.privacy}</Link>
              <Link href="/" className="hover:text-white transition-colors">{t.footer.terms}</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
