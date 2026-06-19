import express, { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import { Readable } from "stream";
import { z } from "zod/v4";
import { db } from "@workspace/db";
import { operatorsTable, pendingUploadsTable } from "@workspace/db/schema";
import { eq, and, lt, sql } from "drizzle-orm";
import rateLimit from "express-rate-limit";
import { ObjectStorageService, ObjectNotFoundError } from "../lib/objectStorage";
import { requireAuth, requireRole } from "../middleware/requireAuth";

const ALLOWED_CONTENT_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/tiff",
]);

const ALLOWED_IMAGE_CONTENT_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const MAX_UPLOAD_SIZE_BYTES = 50 * 1024 * 1024;
const MAX_CERT_DOCS_PER_OPERATOR = 20;

const uploadRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 20,
  keyGenerator: (req: Request) => String((req.user as { userId?: number } | undefined)?.userId ?? "anon"),
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Upload rate limit exceeded. Try again later." },
  skip: (req: Request) => (req.user as { role?: string } | undefined)?.role === "admin",
});

function validateUploadContentType(req: Request, res: Response, next: NextFunction): void {
  const contentType = (req.headers["content-type"] ?? "").split(";")[0].trim();
  if (!ALLOWED_CONTENT_TYPES.has(contentType)) {
    res.status(400).json({ error: "Unsupported file type. Allowed: PDF, JPEG, PNG, WebP, TIFF" });
    return;
  }
  next();
}

const router: IRouter = Router();
const objectStorageService = new ObjectStorageService();

/**
 * POST /storage/uploads
 *
 * Server-proxied file upload for certification documents.
 * The client sends the raw file body directly to this endpoint.
 * Content-Type, file size, per-user DB quota, and rate limits are
 * all enforced server-side before the file reaches object storage.
 *
 * Replaces the two-step presigned-URL flow to close the storage
 * exhaustion vulnerability (signed PUT URLs were unconstrained).
 */
router.post(
  "/storage/uploads",
  requireAuth,
  requireRole("operator", "admin"),
  validateUploadContentType,
  uploadRateLimit,
  express.raw({ type: "*/*", limit: `${MAX_UPLOAD_SIZE_BYTES}` }),
  async (req: Request, res: Response) => {
    if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
      res.status(400).json({ error: "Missing or empty file body" });
      return;
    }

    if (req.body.length > MAX_UPLOAD_SIZE_BYTES) {
      res.status(413).json({ error: "File exceeds maximum allowed size of 50 MB" });
      return;
    }

    const contentType = (req.headers["content-type"] ?? "").split(";")[0].trim();
    const user = req.user!;

    if (user.role === "operator") {
      const [incremented] = await db
        .update(operatorsTable)
        .set({ upload_count: sql`${operatorsTable.upload_count} + 1` })
        .where(
          and(
            eq(operatorsTable.user_id, user.userId),
            lt(operatorsTable.upload_count, MAX_CERT_DOCS_PER_OPERATOR),
          ),
        )
        .returning({ upload_count: operatorsTable.upload_count });

      if (!incremented) {
        res.status(422).json({ error: "Maximum number of certification documents reached" });
        return;
      }

      let objectPath: string;
      try {
        objectPath = await objectStorageService.uploadObjectEntity(req.body, contentType);
      } catch (error) {
        await db
          .update(operatorsTable)
          .set({ upload_count: sql`GREATEST(${operatorsTable.upload_count} - 1, 0)` })
          .where(eq(operatorsTable.user_id, user.userId));
        req.log.error({ err: error }, "Error uploading file to object storage");
        res.status(500).json({ error: "Failed to upload file" });
        return;
      }

      try {
        await db.insert(pendingUploadsTable).values({ user_id: user.userId, object_path: objectPath });
      } catch (error) {
        await objectStorageService.deleteObjectEntity(objectPath).catch(() => {});
        await db
          .update(operatorsTable)
          .set({ upload_count: sql`GREATEST(${operatorsTable.upload_count} - 1, 0)` })
          .where(eq(operatorsTable.user_id, user.userId));
        req.log.error({ err: error }, "Error recording pending upload");
        res.status(500).json({ error: "Failed to record upload" });
        return;
      }

      res.json({ objectPath });
      return;
    }

    try {
      const objectPath = await objectStorageService.uploadObjectEntity(req.body, contentType);
      res.json({ objectPath });
    } catch (error) {
      req.log.error({ err: error }, "Error uploading file to object storage");
      res.status(500).json({ error: "Failed to upload file" });
    }
  },
);

/**
 * POST /storage/blog-cover-upload
 *
 * Admin-only endpoint to upload a blog post cover image to public object storage.
 * Accepts JPEG, PNG, or WebP images up to 10 MB.
 * Returns { url } — the public path usable with /storage/public-objects/*.
 */
router.post(
  "/storage/blog-cover-upload",
  requireAuth,
  requireRole("admin"),
  express.raw({ type: "*/*", limit: "10mb" }),
  async (req: Request, res: Response) => {
    if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
      res.status(400).json({ error: "Missing or empty file body" });
      return;
    }

    const contentType = (req.headers["content-type"] ?? "").split(";")[0].trim();
    if (!ALLOWED_IMAGE_CONTENT_TYPES.has(contentType)) {
      res.status(400).json({ error: "Unsupported file type. Allowed: JPEG, PNG, WebP" });
      return;
    }

    if (req.body.length > 10 * 1024 * 1024) {
      res.status(413).json({ error: "File exceeds maximum allowed size of 10 MB" });
      return;
    }

    try {
      const relativePath = await objectStorageService.uploadPublicImageEntity(req.body, contentType);
      res.json({ url: `/api/storage/public-objects${relativePath}` });
    } catch (error) {
      req.log.error({ err: error }, "Error uploading blog cover image");
      res.status(500).json({ error: "Failed to upload image" });
    }
  },
);

/**
 * GET /storage/public-objects/*
 *
 * Serve public assets from PUBLIC_OBJECT_SEARCH_PATHS.
 * These are unconditionally public — no authentication or ACL checks.
 * IMPORTANT: Always provide this endpoint when object storage is set up.
 */
router.get("/storage/public-objects/*filePath", async (req: Request, res: Response) => {
  try {
    const raw = req.params.filePath;
    const filePath = Array.isArray(raw) ? raw.join("/") : raw;
    const file = await objectStorageService.searchPublicObject(filePath);
    if (!file) {
      res.status(404).json({ error: "File not found" });
      return;
    }

    const response = await objectStorageService.downloadObject(file);

    res.status(response.status);
    response.headers.forEach((value, key) => res.setHeader(key, value));

    if (response.body) {
      const nodeStream = Readable.fromWeb(response.body as ReadableStream<Uint8Array>);
      nodeStream.pipe(res);
    } else {
      res.end();
    }
  } catch (error) {
    req.log.error({ err: error }, "Error serving public object");
    res.status(500).json({ error: "Failed to serve public object" });
  }
});

/**
 * GET /storage/objects/*
 *
 * Serve private object entities from PRIVATE_OBJECT_DIR.
 * Access control:
 *   - Admins: can read any object (needed to review cert docs for verification)
 *   - Operators: can only read objects that are registered in their own cert_documents map
 */
router.get("/storage/objects/*path", requireAuth, requireRole("operator", "admin"), async (req: Request, res: Response) => {
  try {
    const raw = req.params.path;
    const wildcardPath = Array.isArray(raw) ? raw.join("/") : raw;
    const objectPath = `/objects/${wildcardPath}`;

    const user = req.user!;

    if (user.role === "operator") {
      const [op] = await db
        .select({ cert_documents: operatorsTable.cert_documents })
        .from(operatorsTable)
        .where(eq(operatorsTable.user_id, user.userId))
        .limit(1);

      if (!op) {
        res.status(403).json({ error: "Forbidden" });
        return;
      }

      const certDocs = (op.cert_documents as Record<string, string> | null) ?? {};
      const ownedPaths = Object.values(certDocs);

      if (!ownedPaths.includes(objectPath)) {
        res.status(403).json({ error: "Forbidden" });
        return;
      }
    }

    const objectFile = await objectStorageService.getObjectEntityFile(objectPath);
    const response = await objectStorageService.downloadObject(objectFile);

    res.status(response.status);
    response.headers.forEach((value, key) => res.setHeader(key, value));

    if (response.body) {
      const nodeStream = Readable.fromWeb(response.body as ReadableStream<Uint8Array>);
      nodeStream.pipe(res);
    } else {
      res.end();
    }
  } catch (error) {
    if (error instanceof ObjectNotFoundError) {
      req.log.warn({ err: error }, "Object not found");
      res.status(404).json({ error: "Object not found" });
      return;
    }
    req.log.error({ err: error }, "Error serving object");
    res.status(500).json({ error: "Failed to serve object" });
  }
});

export default router;
