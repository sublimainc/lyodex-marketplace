import { useEffect, useState } from "react";
import { useParams, Link } from "wouter";
import { ArrowLeft, Calendar, Clock, Tag, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { LockGate } from "@/components/LockGate";
import { useSiteSettings } from "@/hooks/useSiteSettings";

const CATEGORY_COLORS: Record<string, string> = {
  "Industry News": "bg-blue-100 text-blue-700",
  "Case Study": "bg-violet-100 text-violet-700",
  "Regulatory": "bg-amber-100 text-amber-700",
  "Technology": "bg-cyan-100 text-cyan-700",
  "Company News": "bg-green-100 text-green-700",
};

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface BlogPost {
  id: number;
  slug: string;
  title: string;
  body: string;
  seo_description: string | null;
  cover_image_url: string | null;
  category: string | null;
  author: string | null;
  tags: string[];
  published_at: string | null;
  created_at: string;
}

function safeHref(url: string): string {
  try {
    const parsed = new URL(url, "https://example.com");
    if (parsed.protocol === "javascript:" || parsed.protocol === "data:" || parsed.protocol === "vbscript:") {
      return "#";
    }
    return url;
  } catch {
    return "#";
  }
}

function renderMarkdown(text: string): string {
  const escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return escaped
    .replace(/^### (.+)$/gm, "<h3 class=\"text-xl font-bold mt-6 mb-2\">$1</h3>")
    .replace(/^## (.+)$/gm, "<h2 class=\"text-2xl font-bold mt-8 mb-3\">$1</h2>")
    .replace(/^# (.+)$/gm, "<h1 class=\"text-3xl font-bold mt-8 mb-4\">$1</h1>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/`(.+?)`/g, "<code class=\"bg-muted px-1 py-0.5 rounded text-sm font-mono\">$1</code>")
    .replace(/\[(.+?)\]\((.+?)\)/g, (_, label, url) => `<a href="${safeHref(url).replace(/"/g, "&quot;").replace(/'/g, "&#39;")}" class="text-primary underline" target="_blank" rel="noopener noreferrer">${label}</a>`)
    .replace(/^---$/gm, "<hr class=\"my-6 border-border\" />")
    .replace(/^- (.+)$/gm, "<li class=\"ml-4 list-disc\">$1</li>")
    .replace(/^(\d+)\. (.+)$/gm, "<li class=\"ml-4 list-decimal\">$2</li>")
    .replace(/\n\n/g, "</p><p class=\"mb-4\">")
    .replace(/\n/g, "<br />")
    .replace(/^/, "<p class=\"mb-4\">")
    .replace(/$/, "</p>");
}

export default function BlogPostPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const { blog_locked } = useSiteSettings();
  const [post, setPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!slug || blog_locked) return;

    document.title = "Blog | LyoDex";
    setLoading(true);
    fetch(`${BASE}/api/blog/${slug}`)
      .then((r) => {
        if (r.status === 404 || r.status === 403) { setNotFound(true); setLoading(false); return null; }
        return r.json();
      })
      .then((data) => {
        if (data) {
          setPost(data);
          document.title = `${data.title} | LyoDex Blog`;
          const desc = data.seo_description ?? data.title;
          let metaDesc = document.querySelector("meta[name='description']");
          if (!metaDesc) {
            metaDesc = document.createElement("meta");
            metaDesc.setAttribute("name", "description");
            document.head.appendChild(metaDesc);
          }
          metaDesc.setAttribute("content", desc);
        }
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [slug, blog_locked]);

  if (blog_locked) {
    return <LockGate locked>{null}</LockGate>;
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-16 max-w-3xl">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-3/4" />
          <div className="h-4 bg-muted rounded w-1/4" />
          <div className="space-y-2 mt-8">
            {[1,2,3,4,5].map(i => <div key={i} className="h-4 bg-muted rounded" />)}
          </div>
        </div>
      </div>
    );
  }

  if (notFound || !post) {
    return (
      <div className="container mx-auto px-4 py-16 max-w-3xl text-center">
        <h1 className="text-2xl font-bold mb-4">Post not found</h1>
        <p className="text-muted-foreground mb-6">This article may have been removed or the URL is incorrect.</p>
        <Link href="/blog" className="text-primary hover:underline flex items-center gap-1 justify-center">
          <ArrowLeft className="w-4 h-4" /> Back to Blog
        </Link>
      </div>
    );
  }

  const readTime = Math.max(1, Math.ceil(post.body.split(/\s+/).length / 200));

  return (
    <div className="flex flex-col min-h-screen">
      {post.cover_image_url && (
        <div className="w-full max-h-72 overflow-hidden">
          <img
            src={post.cover_image_url}
            alt={post.title}
            className="w-full h-72 object-cover"
            onError={e => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
          />
        </div>
      )}
      <section className="bg-[#0a1628] text-white py-14 px-4">
        <div className="container mx-auto max-w-3xl">
          <Link href="/blog" className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white mb-6 transition-colors w-fit">
            <ArrowLeft className="w-4 h-4" /> Back to Blog
          </Link>
          {post.category && (
            <div className="mb-3">
              <Badge className={`border-0 text-xs font-semibold uppercase tracking-wider ${CATEGORY_COLORS[post.category] ?? "bg-primary/20 text-primary"}`}>
                {post.category}
              </Badge>
            </div>
          )}
          <h1 className="text-3xl md:text-4xl font-bold leading-tight mb-4">{post.title}</h1>
          {post.seo_description && (
            <p className="text-gray-400 text-lg leading-relaxed mb-4">{post.seo_description}</p>
          )}
          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-400">
            {post.author && (
              <span className="flex items-center gap-1.5">
                <User className="w-4 h-4" />
                {post.author}
              </span>
            )}
            {post.published_at && (
              <span className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4" />
                {format(new Date(post.published_at), "MMMM d, yyyy")}
              </span>
            )}
            <span className="flex items-center gap-1.5">
              <Clock className="w-4 h-4" />
              {readTime} min read
            </span>
          </div>
          {post.tags && post.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4">
              <Tag className="w-3.5 h-3.5 text-gray-500 mt-0.5 shrink-0" />
              {post.tags.map(tag => (
                <span key={tag} className="text-xs bg-white/10 text-gray-300 rounded px-2 py-0.5">{tag}</span>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="container mx-auto px-4 py-10 max-w-3xl">
        <div
          className="prose prose-sm max-w-none text-foreground leading-relaxed"
          dangerouslySetInnerHTML={{ __html: renderMarkdown(post.body) }}
        />
      </section>

      <section className="border-t mt-8 py-8 px-4">
        <div className="container mx-auto max-w-3xl">
          <Link href="/blog" className="flex items-center gap-1.5 text-primary hover:underline text-sm w-fit">
            <ArrowLeft className="w-4 h-4" /> All articles
          </Link>
        </div>
      </section>
    </div>
  );
}
