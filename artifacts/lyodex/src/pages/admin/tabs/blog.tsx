import { useEffect, useState, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Trash2, Pencil, Upload, Loader2, Save, Tags } from "lucide-react";
import { format } from "date-fns";
import { AdminBlogPost, BASE, BLOG_CATEGORIES, Tab, api, emptyPost } from "../shared";

export function autoSlug(title: string): string {
  return title.toLowerCase().trim()
    .replace(/[àâä]/g, "a").replace(/[éèêë]/g, "e").replace(/[îï]/g, "i")
    .replace(/[ôö]/g, "o").replace(/[ùûü]/g, "u").replace(/ç/g, "c")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

export function blogPostDisplayStatus(p: AdminBlogPost): "draft" | "published" | "scheduled" | "archived" {
  if (p.status === "archived") return "archived";
  if (p.status === "published" && p.published_at) {
    return new Date(p.published_at) <= new Date() ? "published" : "scheduled";
  }
  return "draft";
}

export function BlogAdminTab() {
  const [posts, setPosts] = useState<AdminBlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(emptyPost);
  const [editId, setEditId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [coverUploading, setCoverUploading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const [filterStatus, setFilterStatus] = useState<"all" | "published" | "scheduled" | "draft" | "archived">("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest" | "az">("newest");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredPosts = posts
    .filter(p => {
      const ds = blogPostDisplayStatus(p);
      const statusOk = filterStatus === "all" || ds === filterStatus;
      const categoryOk =
        filterCategory === "all" ||
        (filterCategory === "__none" && !p.category) ||
        p.category === filterCategory;
      const q = searchQuery.trim().toLowerCase();
      const searchOk =
        !q ||
        p.title.toLowerCase().includes(q) ||
        p.body.toLowerCase().includes(q) ||
        (p.seo_description ?? "").toLowerCase().includes(q) ||
        (p.author ?? "").toLowerCase().includes(q) ||
        p.tags.some(t => t.toLowerCase().includes(q));
      return statusOk && categoryOk && searchOk;
    })
    .sort((a, b) => {
      if (sortOrder === "az") return a.title.localeCompare(b.title);
      const aTime = a.published_at ? new Date(a.published_at).getTime() : new Date(a.created_at).getTime();
      const bTime = b.published_at ? new Date(b.published_at).getTime() : new Date(b.created_at).getTime();
      return sortOrder === "newest" ? bTime - aTime : aTime - bTime;
    });

  const uploadCoverImage = async (file: File) => {
    setCoverUploading(true);
    try {
      const res = await fetch(`${BASE}/api/admin/blog/upload-image`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": file.type || "image/jpeg" },
        body: file,
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error ?? `Upload failed (${res.status})`);
      }
      const data = await res.json() as { url: string };
      setForm(f => ({ ...f, cover_image_url: `${BASE}${data.url}` }));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Image upload failed. Please try again.");
    } finally {
      setCoverUploading(false);
      if (coverInputRef.current) coverInputRef.current.value = "";
    }
  };

  const load = () => {
    setLoading(true);
    api("/admin/blog").then(setPosts).catch(console.error).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const openNew = () => {
    setEditId(null);
    setForm(emptyPost);
    setFormError(null);
    setShowForm(true);
  };

  const openEdit = (p: AdminBlogPost) => {
    setEditId(p.id);
    const pdt = p.published_at
      ? new Date(p.published_at).toISOString().slice(0, 16)
      : "";
    setForm({
      title: p.title,
      slug: p.slug,
      slugCustomized: true,
      body: p.body,
      seo_description: p.seo_description ?? "",
      cover_image_url: p.cover_image_url ?? "",
      category: p.category ?? "",
      author: p.author ?? "",
      tagsInput: (p.tags ?? []).join(", "),
      status: p.status,
      publishDateTime: pdt,
    });
    setFormError(null);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.title.trim()) { setFormError("Title is required."); return; }
    if (!form.body.trim()) { setFormError("Body is required."); return; }
    setSaving(true);
    setFormError(null);
    try {
      let publishedAt: string | null = null;
      if (form.publishDateTime) {
        const d = new Date(form.publishDateTime);
        publishedAt = !isNaN(d.getTime()) ? d.toISOString() : null;
      }
      const tags = form.tagsInput
        .split(",")
        .map(t => t.trim())
        .filter(Boolean);
      const payload = {
        title: form.title,
        slug: form.slug,
        body: form.body,
        seo_description: form.seo_description || null,
        cover_image_url: form.cover_image_url || null,
        category: form.category || null,
        author: form.author || null,
        tags,
        status: form.status,
        published_at: publishedAt,
      };
      if (editId) {
        await api(`/admin/blog/${editId}`, "PUT", payload);
      } else {
        await api("/admin/blog", "POST", payload);
      }
      setShowForm(false);
      load();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Save failed. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleQuickStatus = async (p: AdminBlogPost, newStatus: "draft" | "published" | "archived") => {
    try {
      const payload: Record<string, unknown> = { status: newStatus };
      if (newStatus === "published" && !p.published_at) {
        payload.published_at = new Date().toISOString();
      }
      if (newStatus === "draft") {
        payload.published_at = null;
      }
      await api(`/admin/blog/${p.id}`, "PUT", payload);
      load();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this post permanently? This cannot be undone.")) return;
    setDeleting(id);
    try {
      await api(`/admin/blog/${id}`, "DELETE");
      load();
    } catch (err) {
      console.error(err);
    } finally {
      setDeleting(null);
    }
  };

  if (showForm) {
    return (
      <div className="space-y-4 max-w-2xl">
        <div className="flex items-center gap-2 mb-2">
          <Button variant="ghost" size="sm" onClick={() => setShowForm(false)}>← Back</Button>
          <h2 className="text-lg font-semibold">{editId ? "Edit Article" : "New Article"}</h2>
        </div>
        {formError && (
          <div className="bg-destructive/10 text-destructive text-sm rounded px-3 py-2 border border-destructive/20">{formError}</div>
        )}
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium">Title <span className="text-destructive">*</span></label>
            <input
              className="w-full mt-1 border rounded px-3 py-2 text-sm"
              value={form.title}
              onChange={e => {
                const title = e.target.value;
                setForm(f => ({
                  ...f,
                  title,
                  slug: f.slugCustomized ? f.slug : autoSlug(title),
                }));
              }}
              placeholder="Article title"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Slug <span className="text-muted-foreground font-normal text-xs">(auto-generated; edit to override)</span></label>
            <input
              className="w-full mt-1 border rounded px-3 py-2 text-sm font-mono"
              value={form.slug}
              onChange={e => setForm(f => ({ ...f, slug: e.target.value, slugCustomized: true }))}
              placeholder="article-url-slug"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium">Status</label>
              <select
                className="w-full mt-1 border rounded px-3 py-2 text-sm"
                value={form.status}
                onChange={e => setForm(f => ({ ...f, status: e.target.value as "draft" | "published" | "archived" }))}
              >
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="archived">Archived</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">
                Publish Date &amp; Time
                <span className="text-muted-foreground font-normal text-xs ml-1">
                  {form.status === "published" ? "(leave empty to publish immediately)" : "(optional)"}
                </span>
              </label>
              <input
                type="datetime-local"
                className="w-full mt-1 border rounded px-3 py-2 text-sm"
                value={form.publishDateTime}
                onChange={e => setForm(f => ({ ...f, publishDateTime: e.target.value }))}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium">Category</label>
              <select
                className="w-full mt-1 border rounded px-3 py-2 text-sm"
                value={form.category}
                onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
              >
                <option value="">— None —</option>
                {BLOG_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Author</label>
              <input
                className="w-full mt-1 border rounded px-3 py-2 text-sm"
                value={form.author}
                onChange={e => setForm(f => ({ ...f, author: e.target.value }))}
                placeholder="e.g. Jane Smith"
              />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium">Tags <span className="text-muted-foreground font-normal text-xs">(comma-separated)</span></label>
            <input
              className="w-full mt-1 border rounded px-3 py-2 text-sm"
              value={form.tagsInput}
              onChange={e => setForm(f => ({ ...f, tagsInput: e.target.value }))}
              placeholder="e.g. pharma, freeze-drying, GMP"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Featured Image <span className="text-muted-foreground font-normal text-xs">(optional)</span></label>
            <div className="flex gap-2 mt-1">
              <input
                className="flex-1 border rounded px-3 py-2 text-sm"
                value={form.cover_image_url}
                onChange={e => setForm(f => ({ ...f, cover_image_url: e.target.value }))}
                placeholder="https://example.com/image.jpg or upload below"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="shrink-0"
                disabled={coverUploading}
                onClick={() => coverInputRef.current?.click()}
              >
                {coverUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                <span className="ml-1">{coverUploading ? "Uploading…" : "Upload"}</span>
              </Button>
              <input
                ref={coverInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                onChange={e => { const f = e.target.files?.[0]; if (f) uploadCoverImage(f); }}
              />
            </div>
            {form.cover_image_url && (
              <div className="mt-2 relative">
                <img
                  src={form.cover_image_url}
                  alt="Cover preview"
                  className="h-32 w-full object-cover rounded border"
                  onError={e => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                />
                <button
                  type="button"
                  onClick={() => setForm(f => ({ ...f, cover_image_url: "" }))}
                  className="absolute top-1 right-1 bg-black/60 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-black/80"
                  title="Remove image"
                >
                  ×
                </button>
              </div>
            )}
          </div>
          <div>
            <label className="text-sm font-medium">Excerpt / SEO Description</label>
            <input className="w-full mt-1 border rounded px-3 py-2 text-sm" value={form.seo_description} onChange={e => setForm(f => ({ ...f, seo_description: e.target.value }))} placeholder="Short summary shown on the blog listing and in search results" />
          </div>
          <div>
            <label className="text-sm font-medium">Body (Markdown) <span className="text-destructive">*</span></label>
            <textarea className="w-full mt-1 border rounded px-3 py-2 text-sm font-mono h-64 resize-y" value={form.body} onChange={e => setForm(f => ({ ...f, body: e.target.value }))} placeholder="Write your article content in Markdown…" />
          </div>
          <div className="flex gap-2 pt-2">
            <Button onClick={handleSave} disabled={saving || !form.title.trim() || !form.slug.trim()}>
              {saving ? "Saving…" : editId ? "Save Changes" : "Create Post"}
            </Button>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Blog CMS</h2>
          <p className="text-sm text-muted-foreground">
            {filteredPosts.length}{filteredPosts.length !== posts.length ? ` of ${posts.length}` : ""} article{filteredPosts.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Button size="sm" onClick={openNew} className="gap-1"><Plus className="w-4 h-4" /> New Article</Button>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap gap-x-6 gap-y-2 pb-1 border-b">
        <div className="flex items-center gap-1.5 w-full sm:w-auto">
          <input
            type="search"
            placeholder="Search posts…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="h-7 w-48 rounded border border-input bg-background px-2.5 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-[#0F6E56]"
          />
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Status</span>
          {(["all", "published", "scheduled", "draft", "archived"] as const).map(s => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                filterStatus === s
                  ? "bg-[#0F6E56] text-white"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Category</span>
          {(["all", ...BLOG_CATEGORIES, "__none"] as const).map(c => (
            <button
              key={c}
              onClick={() => setFilterCategory(c)}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                filterCategory === c
                  ? "bg-[#0F6E56] text-white"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {c === "all" ? "All" : c === "__none" ? "No category" : c}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Sort</span>
          {([
            { value: "newest", label: "Newest first" },
            { value: "oldest", label: "Oldest first" },
            { value: "az",     label: "A \u2192 Z" },
          ] as const).map(opt => (
            <button
              key={opt.value}
              onClick={() => setSortOrder(opt.value)}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                sortOrder === opt.value
                  ? "bg-[#0F6E56] text-white"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-20" />)}</div>
      ) : filteredPosts.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm">
          {posts.length === 0 ? "No articles yet. Create your first post." : "No posts match the selected filters."}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredPosts.map(p => {
            const ds = blogPostDisplayStatus(p);
            return (
              <Card key={p.id}>
                <CardContent className="p-4 flex items-start justify-between gap-3">
                  {/* Cover thumbnail */}
                  <div className="shrink-0">
                    {p.cover_image_url ? (
                      <img
                        src={p.cover_image_url}
                        alt=""
                        className="w-16 h-12 object-cover rounded border"
                        onError={e => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                      />
                    ) : (
                      <div className="w-16 h-12 rounded border border-dashed bg-muted flex items-center justify-center">
                        <span className="text-[9px] text-muted-foreground text-center leading-tight px-1">No image</span>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm truncate max-w-xs">{p.title}</span>
                      {ds === "published" && <Badge className="text-[10px] bg-green-100 text-green-700 border-0 shrink-0">Published</Badge>}
                      {ds === "scheduled" && <Badge className="text-[10px] bg-blue-100 text-blue-700 border-0 shrink-0">Scheduled</Badge>}
                      {ds === "draft" && <Badge variant="secondary" className="text-[10px] shrink-0">Draft</Badge>}
                      {ds === "archived" && <Badge className="text-[10px] bg-gray-100 text-gray-600 border-0 shrink-0">Archived</Badge>}
                      {p.category && (
                        <Badge variant="outline" className="text-[10px] text-teal-700 border-teal-200 bg-teal-50 shrink-0">{p.category}</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground font-mono mt-0.5">/blog/{p.slug}</p>
                    <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                      {p.author && <span className="text-xs text-muted-foreground">by {p.author}</span>}
                      {p.published_at && (
                        <span className="text-xs text-muted-foreground">
                          {ds === "scheduled" ? "Scheduled: " : "Published: "}
                          {format(new Date(p.published_at), "MMM d, yyyy HH:mm")}
                        </span>
                      )}
                    </div>
                    {p.tags.length > 0 && (
                      <div className="flex gap-1 flex-wrap mt-1">
                        {p.tags.slice(0, 5).map(tag => (
                          <span key={tag} className="text-[10px] bg-muted text-muted-foreground rounded px-1.5 py-0.5">{tag}</span>
                        ))}
                        {p.tags.length > 5 && <span className="text-[10px] text-muted-foreground">+{p.tags.length - 5}</span>}
                      </div>
                    )}
                    {p.seo_description && <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{p.seo_description}</p>}
                  </div>
                  <div className="flex flex-col gap-1.5 shrink-0 items-end">
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(p)} title="Edit"><Pencil className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(p.id)} disabled={deleting === p.id} className="text-destructive hover:text-destructive" title="Delete"><Trash2 className="w-4 h-4" /></Button>
                    </div>
                    <div className="flex gap-1">
                      {(ds === "draft" || ds === "archived") && (
                        <Button variant="outline" size="sm" className="text-[10px] h-6 px-2" onClick={() => handleQuickStatus(p, "published")}>Publish</Button>
                      )}
                      {(ds === "published" || ds === "scheduled") && (
                        <Button variant="outline" size="sm" className="text-[10px] h-6 px-2" onClick={() => handleQuickStatus(p, "draft")}>Unpublish</Button>
                      )}
                      {ds !== "archived" && (
                        <Button variant="outline" size="sm" className="text-[10px] h-6 px-2 text-muted-foreground" onClick={() => handleQuickStatus(p, "archived")}>Archive</Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Tab: Manufacturers ───────────────────────────────────────────────────────
