import express, { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { blogPostsTable, siteSettingsTable, adminAuditLogsTable } from "@workspace/db/schema";
import { eq, desc, lte, and } from "drizzle-orm";
import { requireAuth, requireRole, requireAdminCapability } from "../../middleware/requireAuth";
import { logger } from "../../lib/logger";
import { ObjectStorageService } from "../../lib/objectStorage";
import { z } from "zod/v4";

const objectStorageService = new ObjectStorageService();

const ALLOWED_IMAGE_CONTENT_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

const CreateBlogPostSchema = z.object({
  title: z.string().min(1, "title is required"),
  body: z.string().min(1, "body is required"),
  slug: z.string().optional(),
  seo_description: z.string().nullable().optional(),
  cover_image_url: z.string().nullable().optional(),
  category: z.string().nullable().optional(),
  author: z.string().nullable().optional(),
  tags: z.array(z.string()).nullable().optional(),
  status: z.enum(["draft", "published", "archived"]).optional(),
  published_at: z.string().nullable().optional(),
});

const UpdateBlogPostSchema = z.object({
  title: z.string().min(1, "title must not be empty").optional(),
  body: z.string().min(1, "body must not be empty").optional(),
  slug: z.string().optional(),
  seo_description: z.string().nullable().optional(),
  cover_image_url: z.string().nullable().optional(),
  category: z.string().nullable().optional(),
  author: z.string().nullable().optional(),
  tags: z.array(z.string()).nullable().optional(),
  status: z.enum(["draft", "published", "archived"]).optional(),
  published_at: z.string().nullable().optional(),
});

async function isBlogLocked(): Promise<boolean> {
  const [row] = await db
    .select({ value: siteSettingsTable.value })
    .from(siteSettingsTable)
    .where(eq(siteSettingsTable.key, "blog_locked"))
    .limit(1);
  return row?.value === "true";
}

const router: IRouter = Router();
// Blog and site settings are content surfaces: gated on the "content"
// capability so a data_analyst or finance_admin cannot edit public copy.
const adminOnly = [requireAuth, requireRole("admin"), requireAdminCapability("content")];

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);
}

function validateSlug(slug: string): string | null {
  if (!slug) return "Slug is required";
  if (!SLUG_RE.test(slug)) return "Slug must contain only lowercase letters, numbers, and hyphens (no spaces or special characters)";
  if (slug.length > 80) return "Slug must be 80 characters or fewer";
  return null;
}

function serializePost(post: typeof blogPostsTable.$inferSelect) {
  return {
    ...post,
    tags: post.tags ?? [],
    published_at: post.published_at?.toISOString() ?? null,
    created_at: post.created_at.toISOString(),
    updated_at: post.updated_at.toISOString(),
  };
}

async function logBlogAction(
  adminId: number,
  adminEmail: string,
  action: string,
  entityId?: number,
  ipAddress?: string,
  notes?: string
): Promise<void> {
  try {
    await db.insert(adminAuditLogsTable).values({
      admin_id: adminId,
      admin_email: adminEmail,
      action,
      entity_type: "blog_post",
      entity_id: entityId ?? null,
      ip_address: ipAddress ?? null,
      notes: notes ?? null,
    });
  } catch (err) {
    logger.error({ err }, "Failed to write blog audit log");
  }
}

// ─── GET /api/blog — public, published posts only ────────────────────────────
router.get("/blog", async (_req, res) => {
  if (await isBlogLocked()) {
    return res.status(403).json({ error: "Blog is currently unavailable" });
  }
  const posts = await db
    .select({
      id: blogPostsTable.id,
      slug: blogPostsTable.slug,
      title: blogPostsTable.title,
      seo_description: blogPostsTable.seo_description,
      cover_image_url: blogPostsTable.cover_image_url,
      category: blogPostsTable.category,
      author: blogPostsTable.author,
      tags: blogPostsTable.tags,
      published_at: blogPostsTable.published_at,
      created_at: blogPostsTable.created_at,
    })
    .from(blogPostsTable)
    .where(and(eq(blogPostsTable.status, "published"), lte(blogPostsTable.published_at, new Date())))
    .orderBy(desc(blogPostsTable.published_at));
  return res.json(posts.map((p) => ({
    ...p,
    tags: p.tags ?? [],
    published_at: p.published_at?.toISOString() ?? null,
    created_at: p.created_at.toISOString(),
  })));
});

// ─── GET /api/blog/:slug — public, single post ───────────────────────────────
router.get("/blog/:slug", async (req, res) => {
  if (await isBlogLocked()) {
    return res.status(403).json({ error: "Blog is currently unavailable" });
  }
  const { slug } = req.params;
  const now = new Date();
  const [post] = await db
    .select()
    .from(blogPostsTable)
    .where(and(eq(blogPostsTable.slug, slug), eq(blogPostsTable.status, "published"), lte(blogPostsTable.published_at, now)))
    .limit(1);

  if (!post) {
    return res.status(404).json({ error: "Post not found" });
  }
  return res.json(serializePost(post));
});

// ─── GET /api/admin/blog — all posts (admin) ─────────────────────────────────
router.get("/admin/blog", ...adminOnly, async (_req, res) => {
  const posts = await db
    .select()
    .from(blogPostsTable)
    .orderBy(desc(blogPostsTable.created_at));
  return res.json(posts.map(serializePost));
});

// ─── POST /api/admin/blog — create post ──────────────────────────────────────
router.post("/admin/blog", ...adminOnly, async (req, res) => {
  const parsed = CreateBlogPostSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Validation error" });
  }

  const {
    title,
    slug: rawSlug,
    body,
    seo_description,
    cover_image_url,
    category,
    author,
    tags,
    status,
    published_at,
  } = parsed.data;

  const resolvedStatus = status ?? "draft";

  const slug = rawSlug?.trim() ? slugify(rawSlug.trim()) : slugify(title);
  if (!slug) return res.status(400).json({ error: "Could not generate a valid slug from title" });
  const slugErr = validateSlug(slug);
  if (slugErr) return res.status(400).json({ error: slugErr });

  const existing = await db.select({ id: blogPostsTable.id }).from(blogPostsTable).where(eq(blogPostsTable.slug, slug)).limit(1);
  if (existing.length > 0) return res.status(409).json({ error: "A post with this slug already exists" });

  let publishedAt: Date | null = null;
  if (published_at) {
    const d = new Date(published_at);
    if (!isNaN(d.getTime())) publishedAt = d;
  } else if (resolvedStatus === "published") {
    publishedAt = new Date();
  }

  const [post] = await db
    .insert(blogPostsTable)
    .values({
      slug,
      title: title.trim(),
      body: body,
      seo_description: seo_description?.trim() ?? null,
      cover_image_url: cover_image_url?.trim() || null,
      category: category?.trim() || null,
      author: author?.trim() || null,
      tags: Array.isArray(tags) ? tags.filter(Boolean) : [],
      status: resolvedStatus,
      published_at: publishedAt,
      created_by: req.user!.userId,
    })
    .returning();

  void logBlogAction(req.user!.userId, req.user!.email, "create_blog_post", post.id, req.ip, post.title);
  return res.status(201).json(serializePost(post));
});

// ─── GET /api/admin/blog/:id — single post (admin) ───────────────────────────
router.get("/admin/blog/:id", ...adminOnly, async (req, res) => {
  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });

  const [post] = await db.select().from(blogPostsTable).where(eq(blogPostsTable.id, id)).limit(1);
  if (!post) return res.status(404).json({ error: "Post not found" });
  return res.json(serializePost(post));
});

// ─── PUT /api/admin/blog/:id — update post ───────────────────────────────────
router.put("/admin/blog/:id", ...adminOnly, async (req, res) => {
  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });

  const parsed = UpdateBlogPostSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Validation error" });
  }

  const {
    title,
    slug: rawSlug,
    body,
    seo_description,
    cover_image_url,
    category,
    author,
    tags,
    status,
    published_at,
  } = parsed.data;

  const updateData: Partial<typeof blogPostsTable.$inferInsert> = {
    updated_at: new Date(),
  };

  if (title !== undefined) updateData.title = title.trim();
  if (rawSlug !== undefined) {
    const rawTrimmed = rawSlug.trim();
    const newSlug = rawTrimmed ? slugify(rawTrimmed) : (title ? slugify(title) : undefined);
    if (newSlug) {
      const slugErr = validateSlug(newSlug);
      if (slugErr) return res.status(400).json({ error: slugErr });
      const existing = await db.select({ id: blogPostsTable.id }).from(blogPostsTable)
        .where(eq(blogPostsTable.slug, newSlug)).limit(1);
      if (existing.length > 0 && existing[0].id !== id) {
        return res.status(409).json({ error: "A post with this slug already exists" });
      }
      updateData.slug = newSlug;
    }
  }
  if (body !== undefined) updateData.body = body;
  if (seo_description !== undefined) updateData.seo_description = seo_description?.trim() || null;
  if (cover_image_url !== undefined) updateData.cover_image_url = cover_image_url?.trim() || null;
  if (category !== undefined) updateData.category = category?.trim() || null;
  if (author !== undefined) updateData.author = author?.trim() || null;
  if (tags !== undefined) updateData.tags = Array.isArray(tags) ? tags.filter(Boolean) : [];
  if (status !== undefined && ["draft", "published", "archived"].includes(status)) {
    updateData.status = status;
  }
  if (published_at !== undefined) {
    if (published_at === null) {
      updateData.published_at = null;
    } else {
      const d = new Date(published_at);
      updateData.published_at = isNaN(d.getTime()) ? null : d;
    }
  }

  // Publishing safeguard: never allow published posts to have null published_at.
  // When admin publishes with no date (undefined) or clears it (null), preserve the
  // existing published_at if one exists, or default to now.
  if (updateData.status === "published") {
    if (updateData.published_at === undefined || updateData.published_at === null) {
      const [existing] = await db
        .select({ published_at: blogPostsTable.published_at })
        .from(blogPostsTable)
        .where(eq(blogPostsTable.id, id))
        .limit(1);
      updateData.published_at = existing?.published_at ?? new Date();
    }
  }

  const [post] = await db
    .update(blogPostsTable)
    .set(updateData)
    .where(eq(blogPostsTable.id, id))
    .returning();

  if (!post) return res.status(404).json({ error: "Post not found" });
  void logBlogAction(req.user!.userId, req.user!.email, "update_blog_post", id, req.ip,
    `status=${post.status}${updateData.title ? ` title=${updateData.title}` : ""}`);
  return res.json(serializePost(post));
});

// ─── DELETE /api/admin/blog/:id — delete post ────────────────────────────────
router.delete("/admin/blog/:id", ...adminOnly, async (req, res) => {
  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });

  const [post] = await db.select({ title: blogPostsTable.title }).from(blogPostsTable).where(eq(blogPostsTable.id, id)).limit(1);
  if (!post) return res.status(404).json({ error: "Post not found" });

  await db.delete(blogPostsTable).where(eq(blogPostsTable.id, id));
  void logBlogAction(req.user!.userId, req.user!.email, "delete_blog_post", id, req.ip, post.title);
  return res.json({ ok: true });
});

// ─── POST /api/admin/blog/upload-image — cover image upload (admin) ──────────
router.post(
  "/admin/blog/upload-image",
  ...adminOnly,
  express.raw({ type: "*/*", limit: "10mb" }),
  async (req, res) => {
    if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
      return res.status(400).json({ error: "Missing or empty file body" });
    }

    const contentType = (req.headers["content-type"] ?? "").split(";")[0].trim();
    if (!ALLOWED_IMAGE_CONTENT_TYPES.has(contentType)) {
      return res.status(400).json({ error: "Unsupported file type. Allowed: JPEG, PNG, WebP" });
    }

    if (req.body.length > 10 * 1024 * 1024) {
      return res.status(413).json({ error: "File exceeds maximum allowed size of 10 MB" });
    }

    try {
      const relativePath = await objectStorageService.uploadPublicImageEntity(req.body, contentType);
      return res.json({ url: `/api/storage/public-objects${relativePath}` });
    } catch (error) {
      logger.error({ err: error }, "Error uploading blog cover image");
      return res.status(500).json({ error: "Failed to upload image" });
    }
  },
);

export default router;
