import { useEffect, useState } from "react";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useLanguage } from "@/lib/i18n";
import { LockGate } from "@/components/LockGate";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { format } from "date-fns";
import { Calendar, Clock, Search, User, X, Check } from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface BlogPost {
  id: number;
  slug: string;
  title: string;
  seo_description: string | null;
  cover_image_url: string | null;
  category: string | null;
  author: string | null;
  tags: string[];
  published_at: string | null;
  created_at: string;
}

function estimateReadTime(description: string | null): number {
  if (!description) return 3;
  return Math.max(2, Math.ceil(description.split(/\s+/).length / 40));
}

const CATEGORY_COLORS: Record<string, string> = {
  "Industry News": "bg-blue-100 text-blue-700",
  "Case Study": "bg-violet-100 text-violet-700",
  "Regulatory": "bg-amber-100 text-amber-700",
  "Technology": "bg-cyan-100 text-cyan-700",
  "Company News": "bg-green-100 text-green-700",
};

const ALL_CATEGORIES = ["All", "Industry News", "Case Study", "Regulatory", "Technology", "Company News"] as const;

function CategoryBadge({ category }: { category: string | null }) {
  if (!category) return null;
  const cls = CATEGORY_COLORS[category] ?? "bg-primary/20 text-primary";
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider border-0 ${cls}`}>
      {category}
    </span>
  );
}

export default function Blog() {
  const { t, locale } = useLanguage();
  const b = t.blog;
  const { blog_locked } = useSiteSettings();

  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState("");

  const [email, setEmail] = useState("");
  const [subscribeState, setSubscribeState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [subscribeMessage, setSubscribeMessage] = useState("");

  // This form used to be inert — no handler, no route, no table. Every address
  // anyone typed was silently discarded on submit.
  async function handleSubscribe(e: React.FormEvent) {
    e.preventDefault();
    setSubscribeState("sending");
    try {
      const res = await fetch(`${BASE}/api/newsletter/subscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, source: "blog", locale }),
      });
      const body = (await res.json().catch(() => null)) as { message?: string; error?: string } | null;
      if (!res.ok) throw new Error(body?.error ?? "failed");
      setSubscribeMessage(body?.message ?? "");
      setSubscribeState("done");
    } catch (err) {
      setSubscribeMessage(err instanceof Error && err.message !== "failed" ? err.message : b.subscribeError);
      setSubscribeState("error");
    }
  }

  useEffect(() => {
    if (blog_locked) {
      setLoading(false);
      return;
    }
    fetch(`${BASE}/api/blog`)
      .then((r) => {
        if (!r.ok) return null;
        return r.json();
      })
      .then((data) => {
        if (Array.isArray(data)) setPosts(data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [blog_locked]);

  return (
    <LockGate locked={blog_locked}>
      <div className="flex flex-col min-h-screen">
        <section className="bg-[#0a1628] text-white py-16 px-4">
          <div className="container mx-auto max-w-3xl">
            <div className="text-xs font-semibold tracking-widest uppercase text-primary mb-4">{b.tag}</div>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
              {b.title}
            </h1>
            <p className="text-gray-400 text-lg leading-relaxed">
              {b.subtitle}
            </p>
          </div>
        </section>

        <section className="bg-primary py-5 px-4">
          <div className="container mx-auto flex flex-col sm:flex-row items-center gap-4 justify-between max-w-3xl">
            <div className="text-primary-foreground text-sm">
              <p className="font-medium">{b.newsletterText}</p>
              {subscribeState === "done" && (
                <p className="text-xs mt-1 opacity-90">{subscribeMessage}</p>
              )}
              {subscribeState === "error" && (
                <p className="text-xs mt-1 text-red-100">{subscribeMessage}</p>
              )}
            </div>
            {subscribeState === "done" ? (
              <div className="flex items-center gap-2 text-primary-foreground text-sm font-semibold shrink-0">
                <Check className="w-4 h-4" /> {b.subscribed}
              </div>
            ) : (
              <form onSubmit={handleSubscribe} className="flex gap-2 w-full sm:w-auto">
                <Input
                  type="email"
                  required
                  placeholder={b.emailPlaceholder}
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  disabled={subscribeState === "sending"}
                  className="bg-white text-foreground h-9 text-sm w-48"
                />
                <Button
                  type="submit"
                  variant="secondary"
                  disabled={subscribeState === "sending"}
                  className="h-9 text-sm font-semibold shrink-0"
                >
                  {subscribeState === "sending" ? b.subscribing : b.subscribe}
                </Button>
              </form>
            )}
          </div>
        </section>

        <section className="container mx-auto px-4 py-10 max-w-3xl">
          {!loading && posts.length > 0 && (
            <div className="mb-8 space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <Input
                  type="search"
                  placeholder="Search articles…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-9 h-10"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    aria-label="Clear search"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            <div className="flex flex-wrap gap-2">
              {ALL_CATEGORIES.map((cat) => {
                const isActive = activeCategory === cat;
                const colorCls = cat === "All"
                  ? isActive ? "bg-primary text-white border-primary" : "bg-white text-muted-foreground border-border hover:border-primary/50 hover:text-primary"
                  : isActive
                    ? `${CATEGORY_COLORS[cat] ?? "bg-primary/20 text-primary"} border-transparent font-semibold`
                    : "bg-white text-muted-foreground border-border hover:border-primary/50 hover:text-foreground";
                return (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`px-3 py-1.5 rounded-full text-sm border transition-colors cursor-pointer ${colorCls}`}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>
            </div>
          )}
          {loading ? (
            <div className="grid md:grid-cols-2 gap-6">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="border rounded-xl overflow-hidden">
                  <Skeleton className="h-44 w-full" />
                  <div className="p-5 space-y-2">
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : posts.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <p className="text-lg font-medium mb-2">No articles published yet</p>
              <p className="text-sm">Check back soon for freeze-drying insights and industry news.</p>
            </div>
          ) : (
            (() => {
              const q = searchQuery.trim().toLowerCase();
              const filtered = posts.filter((p) => {
                const matchCategory = activeCategory === "All" || p.category === activeCategory;
                const matchSearch = !q ||
                  p.title.toLowerCase().includes(q) ||
                  (p.seo_description ?? "").toLowerCase().includes(q) ||
                  (p.author ?? "").toLowerCase().includes(q) ||
                  (p.tags ?? []).some(tag => tag.toLowerCase().includes(q));
                return matchCategory && matchSearch;
              });
              const noResults = filtered.length === 0;
              const emptyMessage = q
                ? `No articles match "${searchQuery}"${activeCategory !== "All" ? ` in ${activeCategory}` : ""}`
                : `No articles in this category yet`;
              return noResults ? (
                <div className="text-center py-16 text-muted-foreground">
                  <p className="text-lg font-medium mb-2">{emptyMessage}</p>
                  <p className="text-sm flex items-center justify-center gap-3">
                    {q && (
                      <button className="underline hover:text-primary" onClick={() => setSearchQuery("")}>Clear search</button>
                    )}
                    {activeCategory !== "All" && (
                      <button className="underline hover:text-primary" onClick={() => setActiveCategory("All")}>View all categories</button>
                    )}
                  </p>
                </div>
              ) : (
            <div className="grid md:grid-cols-2 gap-6">
              {filtered.map((post) => {
                const readMins = estimateReadTime(post.seo_description);
                return (
                  <Link key={post.id} href={`/blog/${post.slug}`}>
                    <div className="border rounded-xl overflow-hidden hover:border-primary/40 hover:shadow-md transition-all group cursor-pointer h-full flex flex-col">
                      <div className="h-36 relative overflow-hidden bg-primary/10">
                        {post.cover_image_url ? (
                          <img
                            src={post.cover_image_url}
                            alt={post.title}
                            className="w-full h-full object-cover"
                            onError={e => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                          />
                        ) : null}
                        <div className="absolute bottom-0 left-0 p-3">
                          <CategoryBadge category={post.category} />
                        </div>
                      </div>
                      <div className="p-5 flex-1 flex flex-col">
                        <h3 className="font-bold text-lg mb-2 group-hover:text-primary transition-colors leading-snug line-clamp-2">
                          {post.title}
                        </h3>
                        {post.seo_description && (
                          <p className="text-muted-foreground text-sm leading-relaxed mb-3 line-clamp-3 flex-1">
                            {post.seo_description}
                          </p>
                        )}
                        {post.tags && post.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-3">
                            {post.tags.slice(0, 3).map(tag => (
                              <span key={tag} className="text-[10px] bg-muted text-muted-foreground rounded px-1.5 py-0.5">{tag}</span>
                            ))}
                            {post.tags.length > 3 && <span className="text-[10px] text-muted-foreground">+{post.tags.length - 3}</span>}
                          </div>
                        )}
                        <div className="flex items-center justify-between text-xs text-muted-foreground mt-auto pt-3 border-t">
                          <span className="flex items-center gap-1">
                            {post.author ? (
                              <>
                                <User className="w-3 h-3" />
                                {post.author}
                              </>
                            ) : post.published_at ? (
                              <>
                                <Calendar className="w-3 h-3" />
                                {format(new Date(post.published_at), "MMM d, yyyy")}
                              </>
                            ) : null}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {readMins} min read
                          </span>
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
              );
            })()
          )}
        </section>
      </div>
    </LockGate>
  );
}
