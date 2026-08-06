/**
 * Seed the operator directory with real, publicly verifiable companies.
 *
 * RULES THIS SCRIPT FOLLOWS — they are the point of it:
 *
 *   1. Every company below was confirmed on its OWN website. Nothing here comes
 *      from memory or from a directory that might itself be wrong.
 *   2. `source_urls` records exactly which page each entry was read from, and
 *      `last_verified_date` records when. Anyone can re-check the work.
 *   3. Fields that were NOT stated on the source are left at 0 / null / empty.
 *      Capacity, price and turnaround are almost never published, so they are
 *      almost always blank. The UI renders those as "not disclosed" rather than
 *      as a number, because "$0/kg" would be a price the company never quoted.
 *   4. `verification_status` is "partially_verified" for all of them: their
 *      existence, location and services are confirmed from a public source, but
 *      LyoDex has audited nobody and none of them has agreed to be listed.
 *   5. `available` is false — nobody has told us their current capacity status,
 *      and claiming a company is "available now" would be inventing.
 *   6. Coordinates are CITY-LEVEL. Where only a city is known, the marker sits
 *      on the city, not on a fabricated street address.
 *
 * Re-running is safe: entries are matched on website_url and updated, not
 * duplicated.
 *
 * Usage:  DATABASE_URL='postgresql://…' node scripts/admin/seed-verified-operators.mjs
 */
import pg from "pg";

const VERIFIED_ON = "2026-08-04";

const OPERATORS = [
  {
    name: "Groupe Sublima inc.",
    location: "Saint-Isidore-de-Laprairie, QC, Canada",
    city: "Saint-Isidore-de-Laprairie",
    country: "CA",
    website_url: "https://sublima.co",
    description:
      "Quebec freeze-drying company processing fruits, vegetables, medicinal plants, nutraceuticals and cosmetics. Sources most of its fruit from Quebec growers.",
    gps_lat: 45.31, gps_lng: -73.68,
    certifications: [],
    food_market_focus: true,
    pharmaceutical_focus: false,
    source_urls: ["https://sublima.co/en/", "https://alimentsduquebec.com/en/certified-products/business/groupe-sublima-inc"],
    contact_page_url: "https://sublima.co/en/contact/",
  },
  {
    name: "Supreme Freeze Dry",
    location: "Coquitlam, BC, Canada",
    city: "Coquitlam",
    country: "CA",
    website_url: "https://supremefreezedry.com",
    description:
      "Toll processing and contract freeze-drying for food products (no meat): fruits, vegetables, spices, powders, nuts and grains. Also offers milling, grinding and packaging.",
    gps_lat: 49.28, gps_lng: -122.79,
    certifications: [],
    food_market_focus: true,
    pharmaceutical_focus: false,
    source_urls: ["https://supremefreezedry.com/toll-processing/", "https://supremefreezedry.com/about/"],
    contact_email: "info@supremefreezedry.com",
    contact_page_url: "https://supremefreezedry.com/toll-processing/",
  },
  {
    name: "Canadian Centre of Freeze-Drying (CCFD)",
    location: "Quebec, Canada",
    city: null,
    country: "CA",
    website_url: "https://happyyak.ca",
    description:
      "Contract freeze-drying for food, nutraceutical and pet food industries — fruits, vegetables, proteins, dairy and complex formulations. Operating since 1996.",
    // Province-level only: the source page does not state a city.
    gps_lat: 46.81, gps_lng: -71.21,
    certifications: ["HACCP"],
    food_market_focus: true,
    pharmaceutical_focus: false,
    source_urls: ["https://happyyak.ca/pages/canadian-freeze-drying-centre"],
    contact_email: "info@happyyak.ca",
    phone: "450-263-0967",
  },
  {
    name: "Van Drunen Farms",
    location: "Momence, IL, United States",
    city: "Momence",
    country: "US",
    website_url: "https://www.vandrunenfarms.com",
    description:
      "Contract drying services — you supply the raw ingredients, they perform the processing. Works with fruit, vegetable, herb and grain-based ingredients using freeze-drying, drum-drying and IQF.",
    gps_lat: 41.17, gps_lng: -87.66,
    certifications: [],
    food_market_focus: true,
    pharmaceutical_focus: false,
    source_urls: ["https://www.vandrunenfarms.com/custom-solutions", "https://www.vandrunenfarms.com/contact"],
    phone: "815-472-6853",
    contact_page_url: "https://www.vandrunenfarms.com/contact",
  },
  {
    name: "Flatiron Food Factory",
    location: "Loveland, CO, United States",
    city: "Loveland",
    country: "US",
    website_url: "https://www.flatironfood.com",
    description:
      "Co-packing and tolling services. Freeze-dried meats (beef, chicken, turkey, pork), organ meats, confections and novelties, plus custom milling. USDA-inspected facility.",
    gps_lat: 40.40, gps_lng: -105.07,
    certifications: [],
    food_market_focus: true,
    pharmaceutical_focus: false,
    source_urls: ["https://www.flatironfood.com/"],
    phone: "970-775-8677",
  },
  {
    name: "Innovative Freeze-Dried Food, LLC",
    location: "Ferndale, WA, United States",
    city: "Ferndale",
    country: "US",
    website_url: "https://innovativefdf.com",
    description:
      "Contract manufacturing and private label. Produces bulk ingredients — whole fruits and vegetables in various cuts, granules, powders, and products derived from purees and concentrates.",
    gps_lat: 48.85, gps_lng: -122.59,
    certifications: [],
    food_market_focus: true,
    pharmaceutical_focus: false,
    source_urls: ["https://innovativefdf.com/about-us/"],
    phone: "866-285-4042",
  },
  {
    name: "Freeze-Dry Foods GmbH",
    location: "Greven, Germany",
    city: "Greven",
    country: "Germany",
    website_url: "https://www.freeze-dry-foods.com",
    description:
      "Contract drying and co-manufacturing — dries customer raw materials to specification, plus packaging services. Handles herbs, spices, vegetables, fruits, superfoods, candy and cheese, including organic. Part of THRIVE FREEZEDRY.",
    gps_lat: 52.09, gps_lng: 7.61,
    certifications: [],
    food_market_focus: true,
    pharmaceutical_focus: false,
    source_urls: ["https://www.freeze-dry-foods.com/en/dienstleistung"],
    contact_email: "info@freeze-dry-foods.com",
    phone: "+49 2571 507-0",
  },
];

const { DATABASE_URL } = process.env;
if (!DATABASE_URL) {
  console.error("\n  ✗ DATABASE_URL is required.\n");
  process.exit(1);
}

const client = new pg.Client({
  connectionString: DATABASE_URL,
  ssl: DATABASE_URL.includes("localhost") || DATABASE_URL.includes("127.0.0.1")
    ? false
    : { rejectUnauthorized: false },
});

try {
  await client.connect();
  let inserted = 0, updated = 0;

  for (const op of OPERATORS) {
    const { rows: existing } = await client.query(
      "select id from operators where website_url = $1 limit 1",
      [op.website_url],
    );

    // Unstated facts stay unstated: capacity, price and turnaround are 0, which
    // the UI renders as "not disclosed".
    const values = [
      op.name, op.location, op.description,
      0,     // capacity_kg — not published
      0,     // price_per_kg — not published
      0,     // turnaround_days — not published
      op.certifications ?? [],
      false, // available — nobody told us their current status
      op.website_url, op.city, op.country,
      op.gps_lat, op.gps_lng,
      op.source_urls ?? [],
      VERIFIED_ON,
      "partially_verified",
      op.food_market_focus ?? false,
      op.pharmaceutical_focus ?? false,
      op.contact_email ?? null,
      op.phone ?? null,
      op.contact_page_url ?? null,
    ];

    if (existing.length > 0) {
      await client.query(
        `update operators set
           name=$1, location=$2, description=$3, capacity_kg=$4, price_per_kg=$5,
           turnaround_days=$6, certifications=$7, available=$8, website_url=$9,
           city=$10, country=$11, gps_lat=$12, gps_lng=$13, source_urls=$14,
           last_verified_date=$15, verification_status=$16, food_market_focus=$17,
           pharmaceutical_focus=$18, contact_email=$19, phone=$20, contact_page_url=$21
         where id=$22`,
        [...values, existing[0].id],
      );
      updated++;
      console.log(`  ↻ updated  ${op.name}`);
    } else {
      await client.query(
        `insert into operators
           (name, location, description, capacity_kg, price_per_kg, turnaround_days,
            certifications, available, website_url, city, country, gps_lat, gps_lng,
            source_urls, last_verified_date, verification_status, food_market_focus,
            pharmaceutical_focus, contact_email, phone, contact_page_url)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21)`,
        values,
      );
      inserted++;
      console.log(`  + added    ${op.name}`);
    }
  }

  console.log(`\n  ${inserted} added, ${updated} updated.`);
  console.log("  All entries: verification_status = partially_verified, sources recorded,");
  console.log("  capacity/price/turnaround left blank because no source states them.\n");
} catch (err) {
  console.error(`\n  ✗ ${err.message}\n`);
  process.exit(1);
} finally {
  await client.end().catch(() => {});
}
