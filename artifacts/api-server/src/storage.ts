import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

export class Storage {
  async listProducts(active = true) {
    const result = await db.execute(
      sql`SELECT * FROM stripe.products WHERE active = ${active} ORDER BY created DESC`
    );
    return result.rows;
  }

  async getProduct(productId: string) {
    const result = await db.execute(
      sql`SELECT * FROM stripe.products WHERE id = ${productId}`
    );
    return result.rows[0] ?? null;
  }

  async getPricesForProduct(productId: string) {
    const result = await db.execute(
      sql`SELECT * FROM stripe.prices WHERE product = ${productId} AND active = true ORDER BY unit_amount`
    );
    return result.rows;
  }

  async listProductsWithPrices() {
    const result = await db.execute(sql`
      SELECT
        p.id          AS product_id,
        p.name        AS product_name,
        p.description AS product_description,
        p.metadata    AS product_metadata,
        p.active      AS product_active,
        pr.id         AS price_id,
        pr.unit_amount,
        pr.currency,
        pr.recurring,
        pr.active     AS price_active
      FROM stripe.products p
      LEFT JOIN stripe.prices pr ON pr.product = p.id AND pr.active = true
      ORDER BY p.created DESC, pr.unit_amount
    `);

    const map = new Map<string, any>();
    for (const row of result.rows) {
      if (!map.has(row.product_id as string)) {
        map.set(row.product_id as string, {
          id: row.product_id,
          name: row.product_name,
          description: row.product_description,
          metadata: row.product_metadata,
          active: row.product_active,
          prices: [],
        });
      }
      if (row.price_id) {
        map.get(row.product_id as string).prices.push({
          id: row.price_id,
          unit_amount: row.unit_amount,
          currency: row.currency,
          recurring: row.recurring,
          active: row.price_active,
        });
      }
    }
    return Array.from(map.values());
  }
}

export const storage = new Storage();
