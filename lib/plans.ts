import type { PlanTier } from "@prisma/client";

export const FREE_ACTIVE_LINK_LIMIT = 50;
export const FREE_TRACKED_CLICKS_MONTHLY_LIMIT = 1_000;

export function monthStartUtc(date = new Date()) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1, 0, 0, 0, 0));
}

export function isProPlan(planTier: PlanTier | null | undefined) {
  return planTier === "PRO";
}

export function activeLinksLimitForPlan(planTier: PlanTier) {
  if (isProPlan(planTier)) return null;
  return FREE_ACTIVE_LINK_LIMIT;
}

export function trackedClicksLimitForPlan(planTier: PlanTier) {
  if (isProPlan(planTier)) return null;
  return FREE_TRACKED_CLICKS_MONTHLY_LIMIT;
}

export function canUseAlias(planTier: PlanTier) {
  return isProPlan(planTier);
}

export function canUseExpiry(planTier: PlanTier) {
  return isProPlan(planTier);
}

export function canUseAdvancedAnalytics(planTier: PlanTier) {
  return isProPlan(planTier);
}

export function canCreateMoreActiveLinks(planTier: PlanTier, activeLinks: number) {
  const limit = activeLinksLimitForPlan(planTier);
  if (limit === null) return true;
  return activeLinks < limit;
}

export function canTrackMoreClicks(planTier: PlanTier, trackedClicksThisMonth: number) {
  const limit = trackedClicksLimitForPlan(planTier);
  if (limit === null) return true;
  return trackedClicksThisMonth < limit;
}
