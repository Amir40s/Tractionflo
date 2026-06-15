export type PricingPlanStatus = "active" | "hidden";

export type PricingPlan = {
  id: string;
  name: string;
  description: string;
  monthlyPrice: number;
  status: PricingPlanStatus;
  features: string[];
  cta: string;
};

export const defaultPricingPlans: PricingPlan[] = [
  {
    id: "starter",
    name: "Starter Plan",
    description: "For creators starting Instagram automation.",
    monthlyPrice: 99,
    status: "active",
    features: ["1 Instagram account", "AI replies", "Basic analytics", "Email support"],
    cta: "Start Starter",
  },
  {
    id: "pro",
    name: "Pro Plan",
    description: "For creators ready to automate sales conversations.",
    monthlyPrice: 249,
    status: "active",
    features: ["3 Instagram accounts", "Lead qualification", "Agent permissions", "Priority support"],
    cta: "Upgrade to Pro",
  },
  {
    id: "founder",
    name: "Founder Plan",
    description: "For teams scaling multi-agent Instagram operations.",
    monthlyPrice: 499,
    status: "active",
    features: ["Unlimited agents", "Advanced analytics", "Revenue tracking", "Dedicated onboarding"],
    cta: "Unlock Founder",
  },
];

function normalizePlanId(value: unknown, fallback: string) {
  if (typeof value !== "string") {
    return fallback;
  }

  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalized || fallback;
}

function normalizeString(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function normalizePrice(value: unknown, fallback: number) {
  const numericValue =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value.replace(/[$,\s]/g, ""))
        : Number.NaN;

  return Number.isFinite(numericValue) && numericValue >= 0 ? Math.round(numericValue) : fallback;
}

function normalizeFeatures(value: unknown, fallback: string[]) {
  if (!Array.isArray(value)) {
    return fallback;
  }

  const features = value
    .map((feature) => (typeof feature === "string" ? feature.trim() : ""))
    .filter(Boolean)
    .slice(0, 8);

  return features.length > 0 ? features : fallback;
}

export function normalizePricingPlans(value: unknown): PricingPlan[] {
  const rawPlans = Array.isArray(value) && value.length > 0 ? value : defaultPricingPlans;

  return rawPlans.slice(0, 6).map((planValue, index) => {
    const plan = typeof planValue === "object" && planValue !== null ? (planValue as Record<string, unknown>) : {};
    const fallback = defaultPricingPlans[index] || defaultPricingPlans[defaultPricingPlans.length - 1];

    return {
      id: normalizePlanId(plan.id, fallback.id),
      name: normalizeString(plan.name, fallback.name),
      description: normalizeString(plan.description, fallback.description),
      monthlyPrice: normalizePrice(plan.monthlyPrice ?? plan.price, fallback.monthlyPrice),
      status: plan.status === "hidden" ? "hidden" : "active",
      features: normalizeFeatures(plan.features, fallback.features),
      cta: normalizeString(plan.cta, fallback.cta),
    };
  });
}

export function findPricingPlan(plans: PricingPlan[], planId: string) {
  const normalizedPlanId = normalizePlanId(planId, "");
  return plans.find((plan) => plan.id === normalizedPlanId);
}
