import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { siteSettingsTable, SITE_SETTING_KEYS, type SiteSettingKey } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth, requireRole, requireAdminCapability } from "../../middleware/requireAuth";
import { PLATFORM_FEE_PERCENT } from "../../lib/fees";

const router: IRouter = Router();
// Blog and site settings are content surfaces: gated on the "content"
// capability so a data_analyst or finance_admin cannot edit public copy.
const adminOnly = [requireAuth, requireRole("admin"), requireAdminCapability("content")];

async function getSettings(): Promise<Record<SiteSettingKey, boolean>> {
  const rows = await db.select().from(siteSettingsTable);
  const map: Partial<Record<SiteSettingKey, boolean>> = {};
  for (const row of rows) {
    if (SITE_SETTING_KEYS.includes(row.key as SiteSettingKey)) {
      map[row.key as SiteSettingKey] = row.value === "true";
    }
  }
  const result: Record<SiteSettingKey, boolean> = {
    marketplace_locked: false,
    market_intelligence_locked: false,
    blog_locked: false,
    scheduled_reports_enabled: false,
    scheduled_reports_cadence: false,
    ...map,
  };
  return result;
}

// ─── GET /api/site-settings — public, returns lock flags + pricing ───────────
// The fee percentage is published here so the marketing copy always states the
// rate actually configured on the server. Hardcoding "9%" in the UI while the
// server charges something else would be the same class of bug as the
// fabricated market figures.
router.get("/site-settings", async (_req, res) => {
  const settings = await getSettings();
  res.set("Cache-Control", "public, max-age=30");
  return res.json({ ...settings, platform_fee_percent: PLATFORM_FEE_PERCENT });
});

// ─── GET /api/admin/site-settings — admin only ───────────────────────────────
router.get("/admin/site-settings", ...adminOnly, async (_req, res) => {
  const settings = await getSettings();
  return res.json(settings);
});

// ─── PATCH /api/admin/site-settings/:key — toggle a setting ──────────────────
router.patch("/admin/site-settings/:key", ...adminOnly, async (req, res) => {
  const key = req.params.key as SiteSettingKey;
  if (!SITE_SETTING_KEYS.includes(key)) {
    return res.status(400).json({ error: `Invalid key. Must be one of: ${SITE_SETTING_KEYS.join(", ")}` });
  }

  const { value } = req.body as { value: boolean };
  if (typeof value !== "boolean") {
    return res.status(400).json({ error: "value must be a boolean" });
  }

  await db
    .insert(siteSettingsTable)
    .values({ key, value: String(value), updated_at: new Date() })
    .onConflictDoUpdate({
      target: siteSettingsTable.key,
      set: { value: String(value), updated_at: new Date() },
    });

  return res.json({ ok: true, key, value });
});

export default router;
