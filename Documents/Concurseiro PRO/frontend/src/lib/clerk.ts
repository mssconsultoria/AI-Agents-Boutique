import { clerkClient } from "@clerk/nextjs/server";
import { PlanTier } from "./plans";

// Time constants
const TRIAL_DURATION_DAYS = 7;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

export interface UserPlanMetadata {
  tier: PlanTier;
  trialStartedAt?: string; // ISO timestamp
  trialEndsAt?: string; // ISO timestamp
  questionsUsedToday: number;
  stripeCustomerId?: string;
  subscriptionStatus?: "active" | "past_due" | "canceled" | "none";
}

/**
 * Get user's plan metadata from Clerk publicMetadata
 * Returns default gratis tier if not set
 */
export async function getUserPlanMetadata(
  userId: string
): Promise<UserPlanMetadata> {
  const client = await clerkClient();
  const user = await client.users.getUser(userId);

  const metadata = (user.publicMetadata || {}) as Partial<UserPlanMetadata>;

  return {
    tier: metadata.tier || "gratis",
    trialStartedAt: metadata.trialStartedAt,
    trialEndsAt: metadata.trialEndsAt,
    questionsUsedToday: metadata.questionsUsedToday || 0,
    stripeCustomerId: metadata.stripeCustomerId,
    subscriptionStatus: metadata.subscriptionStatus || "none",
  };
}

/**
 * Update user's plan metadata in Clerk
 */
export async function updateUserPlanMetadata(
  userId: string,
  updates: Partial<UserPlanMetadata>
): Promise<UserPlanMetadata> {
  const current = await getUserPlanMetadata(userId);
  const updated = { ...current, ...updates };

  const client = await clerkClient();
  await client.users.updateUser(userId, {
    publicMetadata: updated,
  });

  return updated;
}

/**
 * Start trial period for a newly signed-up user
 * Sets trial to 7 days from now
 */
export async function startUserTrial(userId: string): Promise<void> {
  const now = new Date();
  const endsAt = new Date(now.getTime() + TRIAL_DURATION_DAYS * MS_PER_DAY);

  await updateUserPlanMetadata(userId, {
    tier: "trial",
    trialStartedAt: now.toISOString(),
    trialEndsAt: endsAt.toISOString(),
  });
}

/**
 * Check if user's trial period is still valid
 * Returns { isTrialActive: boolean, daysRemaining: number }
 */
export async function checkTrialStatus(
  userId: string
): Promise<{ isTrialActive: boolean; daysRemaining: number }> {
  const metadata = await getUserPlanMetadata(userId);

  if (!metadata.trialEndsAt) {
    return { isTrialActive: false, daysRemaining: 0 };
  }

  const endsAt = new Date(metadata.trialEndsAt);

  // Validate date parsing
  if (isNaN(endsAt.getTime())) {
    console.error(
      `Invalid trial end date for user ${userId}: ${metadata.trialEndsAt}`
    );
    return { isTrialActive: false, daysRemaining: 0 };
  }

  const now = new Date();
  const daysRemaining = Math.ceil(
    (endsAt.getTime() - now.getTime()) / MS_PER_DAY
  );

  return {
    isTrialActive: daysRemaining > 0,
    daysRemaining: Math.max(0, daysRemaining),
  };
}

/**
 * Move user from trial to gratis plan
 * Called when trial expires or user explicitly downgrades
 */
export async function expireTrialAndDowngrade(userId: string): Promise<void> {
  await updateUserPlanMetadata(userId, {
    tier: "gratis",
    trialStartedAt: undefined,
    trialEndsAt: undefined,
    questionsUsedToday: 0,
  });
}

/**
 * Increment daily question counter for user
 * Resets at midnight UTC (handled by middleware/scheduled task)
 */
export async function incrementQuestionsUsed(
  userId: string,
  count: number = 1
): Promise<number> {
  const metadata = await getUserPlanMetadata(userId);
  const newCount = metadata.questionsUsedToday + count;

  await updateUserPlanMetadata(userId, {
    questionsUsedToday: newCount,
  });

  return newCount;
}

/**
 * Link Stripe customer to user in Clerk
 * Called after successful customer creation in Stripe
 */
export async function linkStripeCustomer(
  userId: string,
  stripeCustomerId: string
): Promise<void> {
  await updateUserPlanMetadata(userId, {
    stripeCustomerId,
  });
}

/**
 * Reset daily question counter (called by scheduled task at midnight UTC)
 */
export async function resetDailyQuestionCounter(userId: string): Promise<void> {
  await updateUserPlanMetadata(userId, {
    questionsUsedToday: 0,
  });
}
