// One-off: point the Stripe webhook at the canonical www host.
// casedive.ca 307-redirects to www.casedive.ca and Stripe does NOT follow
// redirects, so the endpoint URL must be the final host. Updating (vs delete +
// recreate) keeps the SAME signing secret, so STRIPE_WEBHOOK_SECRET in Vercel
// stays valid.
import Stripe from "stripe";

const key = process.env.STRIPE_SECRET_KEY;
if (!key) {
  console.error("Missing STRIPE_SECRET_KEY");
  process.exit(1);
}
const stripe = new Stripe(key);

const TARGET = "https://www.casedive.ca/api/stripe-webhook";
const list = await stripe.webhookEndpoints.list({ limit: 100 });
const ep = list.data.find((e) => e.url.includes("casedive.ca/api/stripe-webhook"));

if (!ep) {
  console.error("No casedive webhook endpoint found.");
  process.exit(1);
}
if (ep.url === TARGET) {
  console.log(`Already correct: ${TARGET}`);
} else {
  const updated = await stripe.webhookEndpoints.update(ep.id, { url: TARGET });
  console.log(`Updated webhook ${updated.id}: ${updated.url}`);
  console.log("Signing secret unchanged — no Vercel env change needed.");
}
