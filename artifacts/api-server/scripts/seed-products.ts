/**
 * Seed LyoDex subscription plans in Stripe.
 * Run with: pnpm --filter @workspace/api-server exec tsx scripts/seed-products.ts
 * Safe to run multiple times — checks for existing products first.
 */
import { getUncachableStripeClient } from "../src/stripeClient";

const PLANS = [
  {
    name: "Bronze",
    description: "For growing operators and active buyers. Up to 20 bids/month, priority placement.",
    amount_cad: 7900, // $79.00 CAD in cents
    metadata: { tier: "bronze", bids_per_month: "20" },
  },
  {
    name: "Silver",
    description: "Advanced analytics and priority visibility. Up to 50 bids/month.",
    amount_cad: 14900, // $149.00 CAD
    metadata: { tier: "silver", bids_per_month: "50" },
  },
  {
    name: "Gold",
    description: "Full platform access and premium market intelligence. Unlimited bids.",
    amount_cad: 24900, // $249.00 CAD
    metadata: { tier: "gold", bids_per_month: "unlimited" },
  },
];

async function seedProducts() {
  const stripe = await getUncachableStripeClient();
  console.log("Seeding LyoDex subscription plans in Stripe...\n");

  for (const plan of PLANS) {
    const existing = await stripe.products.search({
      query: `name:'${plan.name}' AND active:'true'`,
    });

    if (existing.data.length > 0) {
      console.log(`✓ ${plan.name} plan already exists (${existing.data[0].id})`);
      const prices = await stripe.prices.list({ product: existing.data[0].id, active: true });
      prices.data.forEach((p) => console.log(`  price: ${p.id}  $${(p.unit_amount! / 100).toFixed(2)}/mo`));
      continue;
    }

    const product = await stripe.products.create({
      name: plan.name,
      description: plan.description,
      metadata: plan.metadata,
    });

    const price = await stripe.prices.create({
      product: product.id,
      unit_amount: plan.amount_cad,
      currency: "cad",
      recurring: { interval: "month" },
    });

    console.log(`✓ Created: ${plan.name}  (${product.id})`);
    console.log(`  price: ${price.id}  $${(plan.amount_cad / 100).toFixed(2)} CAD/mo`);
  }

  console.log("\nDone! Use the price IDs above in Stripe checkout sessions.");
}

seedProducts().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
