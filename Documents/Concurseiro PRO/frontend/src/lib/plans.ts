// Subscription tier definitions with features, pricing, and trial logic

export type PlanTier = "gratis" | "essencial" | "premium" | "trial";
export type PlanId = PlanTier; // Alias for middleware compatibility

export interface PlanFeatures {
  name: string;
  description: string;
  price: number; // in cents (e.g., 2990 = R$29.90)
  billingCycle: "monthly" | "annual" | "none";
  questionsPerDay: number;
  features: string[];
  stripePrice?: string; // Stripe price ID from env
  isDynamic?: boolean; // For annual pricing (calculated)
}

export const PLANS: Record<PlanTier, PlanFeatures> = {
  trial: {
    name: "Acesso Completo (Trial)",
    description: "Primeiros 7 dias: acesso a todos os cursos e analytics",
    price: 0,
    billingCycle: "none",
    questionsPerDay: 999, // Unlimited during trial
    features: [
      "Acesso a todos os concursos",
      "Analytics PRO completo",
      "Questões ilimitadas por dia",
      "Sem limites de tempo",
    ],
  },
  gratis: {
    name: "Grátis",
    description: "Acesso limitado com 5 questões por dia",
    price: 0,
    billingCycle: "none",
    questionsPerDay: 5,
    features: [
      "Acesso aos concursos populares",
      "5 questões por dia",
      "Dashboard básico",
      "Sem analytics avançado",
    ],
  },
  essencial: {
    name: "Essencial",
    description: "Ideal para concurseiros iniciantes",
    price: 2990, // R$29.90
    billingCycle: "monthly",
    questionsPerDay: 50,
    features: [
      "Acesso a todos os concursos",
      "50 questões por dia",
      "Dashboard com estatísticas básicas",
      "Suporte por email",
      "Atualizações de editais em tempo real",
    ],
    stripePrice: process.env.STRIPE_PRICE_ESSENTIAL || "",
  },
  premium: {
    name: "Premium",
    description: "Máxima performance com analytics completo",
    price: 4990, // R$49.90
    billingCycle: "monthly",
    questionsPerDay: 999, // Unlimited
    features: [
      "Acesso a todos os concursos",
      "Questões ilimitadas por dia",
      "Analytics PRO completo",
      "Dashboard executivo com previsões",
      "Suporte prioritário 24/7",
      "Relatórios personalizados",
      "Integração com terceiros",
    ],
    stripePrice: process.env.STRIPE_PRICE_PREMIUM || "",
  },
};

/**
 * Calculate annual discount for a monthly plan
 * Assumes 2 months free per year (annual = monthly * 10)
 */
export function getAnnualPrice(monthlyPrice: number): number {
  return monthlyPrice * 10;
}

/**
 * Check if a user can access a feature based on their plan
 */
export function canAccessFeature(
  userPlan: PlanTier,
  featureName: string
): boolean {
  const plan = PLANS[userPlan];
  return plan.features.includes(featureName);
}

/**
 * Check if user has exceeded daily question limit
 * Returns { allowed: boolean, used: number, limit: number }
 */
export function checkQuestionQuota(
  userPlan: PlanTier,
  questionsUsedToday: number
): { allowed: boolean; used: number; limit: number } {
  const limit = PLANS[userPlan].questionsPerDay;
  return {
    allowed: questionsUsedToday < limit,
    used: questionsUsedToday,
    limit,
  };
}

/**
 * Format plan price for display (R$ format)
 */
export function formatPrice(priceInCents: number, locale = "pt-BR"): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "BRL",
  }).format(priceInCents / 100);
}

/**
 * Get all non-trial plans for pricing page
 */
export function getPricingPlans(): (PlanFeatures & { id: PlanTier })[] {
  return (["gratis", "essencial", "premium"] as const).map((tier) => ({
    id: tier,
    ...PLANS[tier],
  }));
}

/**
 * Get Stripe price for a specific plan tier with validation
 * Throws if price is not configured for the plan
 */
export function getCheckoutPrice(planTier: PlanTier): string {
  const plan = PLANS[planTier];
  if (!plan.stripePrice) {
    throw new Error(`No Stripe price configured for plan: ${planTier}`);
  }
  return plan.stripePrice;
}

/**
 * Validate that required Stripe environment variables are set
 * Should be called on application startup
 */
export function validateStripeConfig(): void {
  if (!process.env.STRIPE_PRICE_ESSENTIAL) {
    throw new Error("STRIPE_PRICE_ESSENTIAL environment variable is not set");
  }
  if (!process.env.STRIPE_PRICE_PREMIUM) {
    throw new Error("STRIPE_PRICE_PREMIUM environment variable is not set");
  }
}

/**
 * Check if a trial is still active based on the expiration date
 */
export function isTrialActive(trialEndsAt: string | undefined): boolean {
  if (!trialEndsAt) return false;
  try {
    const endDate = new Date(trialEndsAt);
    return endDate > new Date();
  } catch {
    return false;
  }
}

/**
 * Determine if a user can access a specific route based on their plan and trial status
 * Used by middleware for paywall enforcement
 */
export function canAccessRoute(
  plan: PlanId,
  trialActive: boolean,
  pathname: string
): boolean {
  // Trial users can access everything
  if (trialActive) return true;

  // Free users can only access dashboard
  if (plan === "gratis") {
    return pathname === "/dashboard" || pathname === "/";
  }

  // Essential and Premium users can access dashboard and analytics
  if (plan === "essencial" || plan === "premium") {
    return true;
  }

  // Default deny
  return false;
}
