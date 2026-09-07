// One-off: prove the deployed webhook reads the RAW body / verifies signatures.
// Sends a correctly-signed UNHANDLED event type -> handler should hit its
// default branch and return 200 with no side effects.
//   200 => raw-body + signature verification WORK
//   400 => "Invalid signature" => the host pre-parsed the body (gate fails)
import Stripe from "stripe";

const secret = process.env.STRIPE_WEBHOOK_SECRET;
const url =
  process.env.WEBHOOK_URL || "https://www.casedive.ca/api/stripe-webhook";
if (!secret) {
  console.error("Missing STRIPE_WEBHOOK_SECRET");
  process.exit(1);
}

const stripe = new Stripe("sk_test_placeholder_no_network_needed");
const payload = JSON.stringify({
  id: "evt_raw_body_probe",
  object: "event",
  type: "invoice.payment_succeeded", // unhandled -> default branch -> 200, no side effects
  data: { object: {} },
});
const header = stripe.webhooks.generateTestHeaderString({ payload, secret });

const res = await fetch(url, {
  method: "POST",
  headers: { "content-type": "application/json", "stripe-signature": header },
  body: payload,
});
const body = (await res.text()).slice(0, 200);
console.log(`HTTP ${res.status} -> ${body}`);
