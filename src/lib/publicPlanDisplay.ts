export interface PublicPlanEntitlement {
  key: string;
  value_type: "boolean" | "number" | "text";
  boolean_value: boolean | null;
  number_value: number | null;
  text_value: string | null;
}

export interface PublicSubscriptionPlan {
  id: string;
  name: string;
  description: string | null;
  price_awg: number | string | null;
  annual_price_awg: number | string | null;
  max_loyalty_programs: number | null;
  max_customers: number | null;
  max_staff: number | null;
  features: string[] | null;
  includes_premium_templates: boolean | null;
  is_trial: boolean | null;
  trial_days: number | null;
  status: string | null;
  is_active: boolean | null;
  display_order: number | null;
  badge: string | null;
  entitlements?: PublicPlanEntitlement[] | null;
}

type Translate = (key: string, values?: Record<string, string | number>) => string;

export const publicSubscriptionPlanSelect = `
  id,
  name,
  description,
  price_awg,
  annual_price_awg,
  max_loyalty_programs,
  max_customers,
  max_staff,
  features,
  includes_premium_templates,
  is_trial,
  trial_days,
  status,
  is_active,
  display_order,
  badge,
  entitlements:plan_entitlements (
    key,
    value_type,
    boolean_value,
    number_value,
    text_value
  )
`;

const publicEntitlementKeys = new Set([
  "premium_templates",
  "reward_expiration",
  "custom_card_branding",
  "advanced_analytics",
  "quick_stamp_qr",
  "location_management",
  "multi_location_management",
  "staff_location_assignment",
  "location_manager",
  "location_analytics",
  "cross_location_analytics",
  "location_leaderboard",
  "corporate_branding",
  "location_specific_quick_qr",
  "max_locations",
]);

const internalLimitEntitlementKeys = new Set([
  "max_loyalty_programs",
  "max_customers",
  "max_staff",
]);

function isEnabledEntitlement(entitlement: PublicPlanEntitlement) {
  if (entitlement.value_type === "boolean") return Boolean(entitlement.boolean_value);
  if (entitlement.value_type === "number") return Number(entitlement.number_value || 0) > 0;
  if (entitlement.value_type === "text") return Boolean(entitlement.text_value?.trim());
  return false;
}

function toCustomerFacingFallback(value: string) {
  const cleaned = value
    .replace(/^dashboard\./, "")
    .replace(/^admin\./, "")
    .replace(/^plan\./, "")
    .replace(/[._-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!cleaned) return "Included feature";

  return cleaned
    .split(" ")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function translatedFeatureLabel(t: Translate, key: string, values?: Record<string, string | number>) {
  const translationKey = `publicPricing.feature.${key}`;
  const translated = t(translationKey, values);

  if (!translated || translated === translationKey || translated.includes("dashboard.") || translated.includes("admin.") || translated.includes("plan.")) {
    return toCustomerFacingFallback(key);
  }

  return translated;
}

function formatLimit(value: number | null | undefined, t: Translate) {
  const numericValue = Number(value || 0);
  if (!Number.isFinite(numericValue) || numericValue >= 9999) return t("publicPricing.unlimited");
  return numericValue.toLocaleString();
}

function getFeatureDedupeKey(label: string, fallbackKey?: string) {
  if (fallbackKey) return fallbackKey;

  const normalized = label.toLowerCase().replace(/[^a-z0-9]/g, "");

  if (normalized.includes("premiumdesignpreset") || normalized.includes("premiumtemplate")) return "premium_templates";
  if (normalized.includes("rewardexpiration")) return "reward_expiration";
  if (normalized.includes("customcardbranding") || normalized.includes("brandedloyalty")) return "custom_card_branding";
  if (normalized.includes("advancedanalytics")) return "advanced_analytics";
  if (normalized.includes("quickqr") || normalized.includes("quickstamp")) return "quick_stamp_qr";
  if (normalized.includes("locationmanagement")) return "location_management";
  if (normalized.includes("stafflocation")) return "staff_location_assignment";
  if (normalized.includes("corporatebranding")) return "corporate_branding";

  return normalized;
}

function normalizeDisplayFeature(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";

  if (trimmed.includes(".") || trimmed.includes("_")) {
    return toCustomerFacingFallback(trimmed);
  }

  return trimmed;
}

export function formatPublicPlanFeatures(plan: PublicSubscriptionPlan, t: Translate) {
  const features: string[] = [];
  const seen = new Set<string>();

  const addFeature = (label: string, dedupeKey?: string) => {
    const normalizedLabel = normalizeDisplayFeature(label);
    if (!normalizedLabel) return;

    const key = getFeatureDedupeKey(normalizedLabel, dedupeKey);
    if (seen.has(key)) return;

    seen.add(key);
    features.push(normalizedLabel);
  };

  addFeature(translatedFeatureLabel(t, "loyaltyPrograms", {
    count: formatLimit(plan.max_loyalty_programs, t),
  }), "limit_loyalty_programs");

  addFeature(translatedFeatureLabel(t, "loyaltyMembers", {
    count: formatLimit(plan.max_customers, t),
  }), "limit_loyalty_members");

  addFeature(translatedFeatureLabel(t, "staffAccounts", {
    count: formatLimit(plan.max_staff, t),
  }), "limit_staff_accounts");

  const entitlementRows = Array.isArray(plan.entitlements) ? plan.entitlements : [];
  const entitlementKeys = new Set(entitlementRows.map((entitlement) => entitlement.key));

  if (plan.includes_premium_templates && !entitlementKeys.has("premium_templates")) {
    addFeature(translatedFeatureLabel(t, "premium_templates"), "premium_templates");
  }

  entitlementRows
    .filter((entitlement) => publicEntitlementKeys.has(entitlement.key))
    .filter((entitlement) => !internalLimitEntitlementKeys.has(entitlement.key))
    .filter(isEnabledEntitlement)
    .forEach((entitlement) => {
      if (entitlement.key === "max_locations") {
        addFeature(translatedFeatureLabel(t, "max_locations", {
          count: formatLimit(Number(entitlement.number_value || 0), t),
        }), entitlement.key);
        return;
      }

      addFeature(translatedFeatureLabel(t, entitlement.key), entitlement.key);
    });

  return features;
}