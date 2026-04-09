import Stripe from "stripe";

// Initialize Stripe server-side client (Node.js only)
// This will be called from API routes, NOT from the browser
export function createStripeClient(): Stripe {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("STRIPE_SECRET_KEY environment variable is not set");
  }
  return new Stripe(process.env.STRIPE_SECRET_KEY);
}

/**
 * Create a Stripe checkout session for subscription
 * Called from /api/checkout route
 */
export async function createCheckoutSession(
  customerId: string,
  priceId: string,
  returnUrl: string,
  successUrl: string
): Promise<string> {
  const stripe = createStripeClient();

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    mode: "subscription",
    success_url: successUrl,
    cancel_url: returnUrl,
    billing_address_collection: "auto",
    allow_promotion_codes: true,
  });

  if (!session.url) {
    throw new Error("Failed to create Stripe checkout session");
  }

  return session.url;
}

/**
 * Create a Stripe customer portal session for managing subscriptions
 * Called from /api/portal route
 */
export async function createPortalSession(
  customerId: string,
  returnUrl: string
): Promise<string> {
  const stripe = createStripeClient();

  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });

  return session.url;
}

/**
 * Get customer subscriptions from Stripe
 * Used to determine active subscription and plan
 */
export async function getCustomerSubscriptions(
  customerId: string
): Promise<Stripe.Subscription[]> {
  const stripe = createStripeClient();

  const subscriptions = await stripe.subscriptions.list({
    customer: customerId,
    limit: 10,
    status: "all",
  });

  return subscriptions.data;
}

/**
 * Map Stripe price ID to plan tier
 * Reverse lookup for determining user's plan from subscription
 */
export function getPlanTierFromPriceId(priceId: string): string {
  if (priceId === process.env.STRIPE_PRICE_ESSENTIAL) {
    return "essencial";
  }
  if (priceId === process.env.STRIPE_PRICE_PREMIUM) {
    return "premium";
  }
  return "gratis";
}
