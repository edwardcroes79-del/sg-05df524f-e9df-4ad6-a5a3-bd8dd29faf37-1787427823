import { getPlanEntitlementLabel, PUBLIC_PLAN_ENTITLEMENT_KEYS, STANDARD_PLAN_ENTITLEMENTS } from "@/lib/planEntitlements";

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
  visibility: string | null;
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
  visibility,
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

const publicEntitlementKeys: ReadonlySet<string> = new Set(PUBLIC_PLAN_ENTITLEMENT_KEYS);
const entitlementDisplayOrder = new Map(STANDARD_PLAN_ENTITLEMENTS.map((entitlement, index) => [entitlement.key, index]));

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

function translatedFeatureLabel(t: Translate, key: string, values?: Record<string, string | number>, language = "en") {
  const translationKey = `publicPricing.feature.${key}`;
  const translated = t(translationKey, values);

  if (!translated || translated === translationKey || translated.includes("dashboard.") || translated.includes("admin.") || translated.includes("plan.")) {
    return translatedEntitlementFallback(key, language, values) || getPlanEntitlementLabel(key) || toCustomerFacingFallback(key);
  }

  return translated;
}

function translatedEntitlementFallback(key: string, language: string, values?: Record<string, string | number>) {
  const count = values?.count;
  const englishLabels: Record<string, string> = {
    vip_member_identification: "VIP Member Identification",
    excel_member_export: "Excel Member Export",
    bulk_member_import: "Bulk Member Import",
    bulk_member_management: "Bulk Member Management",
    search_stamp_staff_access: "Search Stamp access control for staff",
  };

  const spanishLabels: Record<string, string> = {
    vip_member_identification: "Identificación de miembros VIP",
    excel_member_export: "Exportación de miembros a Excel",
    bulk_member_import: "Importación masiva de miembros",
    bulk_member_management: "Gestión masiva de miembros",
    search_stamp_staff_access: "Control de acceso a Search Stamp para personal",
  };

  const papiamentoLabels: Record<string, string> = {
    vip_member_identification: "Identificacion di miembro VIP",
    excel_member_export: "Exportacion di miembronan pa Excel",
    bulk_member_import: "Importacion masivo di miembronan",
    bulk_member_management: "Manejo masivo di miembronan",
    search_stamp_staff_access: "Control di acceso na Search Stamp pa personal",
  };

  if (key === "max_locations" && count !== undefined) {
    if (language === "es") return `${count} ubicaciones`;
    if (language === "pa") return `${count} ubicacion`;
    return `${count} locations`;
  }

  if (language === "es") return spanishLabels[key] || "";
  if (language === "pa") return papiamentoLabels[key] || "";
  return englishLabels[key] || "";
}

function formatLimit(value: number | null | undefined) {
  const numericValue = Number(value || 0);
  if (!Number.isFinite(numericValue)) return "0";
  return numericValue.toLocaleString();
}

function getNumericLimit(value: number | null | undefined) {
  const numericValue = Number(value || 0);
  if (!Number.isFinite(numericValue)) return 0;
  return numericValue;
}

function getHomepageDisplayLimits(plan: PublicSubscriptionPlan) {
  const normalizedName = plan.name.toLowerCase().replace(/[^a-z0-9]/g, "");
  const baseLimits = {
    maxLoyaltyPrograms: getNumericLimit(plan.max_loyalty_programs),
    maxCustomers: getNumericLimit(plan.max_customers),
    maxStaff: getNumericLimit(plan.max_staff),
  };

  if (normalizedName.includes("free") && normalizedName.includes("trial")) {
    return {
      ...baseLimits,
      maxStaff: 0,
    };
  }

  if (normalizedName === "starter") {
    return {
      ...baseLimits,
      maxStaff: 1,
    };
  }

  if (normalizedName === "business") {
    return {
      ...baseLimits,
      maxStaff: 5,
    };
  }

  if (normalizedName === "professional") {
    return {
      ...baseLimits,
      maxStaff: 10,
    };
  }

  if (normalizedName === "corporate") {
    return {
      ...baseLimits,
      maxStaff: 50,
    };
  }

  return baseLimits;
}

function isCorporateHomepagePlan(plan: PublicSubscriptionPlan) {
  return plan.name.toLowerCase().replace(/[^a-z0-9]/g, "") === "corporate";
}

function translatedCountFeatureLabel(
  t: Translate,
  singularKey: string,
  pluralKey: string,
  count: number,
  dedupeFallbackKey: string,
  language: string
) {
  return translatedFeatureLabel(t, count === 1 ? singularKey : pluralKey, {
    count: count.toLocaleString(),
  }, language) || toCustomerFacingFallback(dedupeFallbackKey);
}

function getFeatureDedupeKey(label: string, fallbackKey?: string) {
  if (fallbackKey) return fallbackKey;

  const normalized = label.toLowerCase().replace(/[^a-z0-9]/g, "");

  if (normalized.includes("loyaltyprogram") || normalized.includes("programadifidelidad")) return "limit_loyalty_programs";
  if (normalized.includes("loyaltymember") || normalized.includes("miembrodefidelidad") || normalized.includes("miembrodifidelidad")) return "limit_loyalty_members";
  if (normalized.includes("adminaccount") || normalized.includes("cuentadeadministrador") || normalized.includes("cuentadiadmin")) return "limit_admin_account";
  if (normalized.includes("staffaccount") || normalized.includes("staffaccounts") || normalized.includes("cuentadepersonal") || normalized.includes("cuentadipersonal")) return "limit_staff_accounts";
  if (/^\d+locations?$/.test(normalized) || /^\d+ubicacion/.test(normalized)) return "max_locations";
  if (normalized.includes("premiumdesignpreset") || normalized.includes("premiumtemplate")) return "premium_templates";
  if (normalized.includes("rewardexpiration")) return "reward_expiration";
  if (normalized.includes("customcardbranding") || normalized.includes("brandedloyalty")) return "custom_card_branding";
  if (normalized.includes("advancedanalytics")) return "advanced_analytics";
  if (normalized.includes("quickqr") || normalized.includes("quickstamp")) return "quick_stamp_qr";
  if (normalized.includes("locationmanagement")) return "location_management";
  if (normalized.includes("stafflocation")) return "staff_location_assignment";
  if (normalized.includes("corporatebranding")) return "corporate_branding";
  if (normalized.includes("vipmemberidentification")) return "vip_member_identification";
  if (normalized.includes("excelmemberexport")) return "excel_member_export";
  if (normalized.includes("bulkmemberimport")) return "bulk_member_import";
  if (normalized.includes("bulkmembermanagement")) return "bulk_member_management";
  if (normalized.includes("searchstampaccesscontrol")) return "search_stamp_staff_access";

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

export function translatePlanText(text: string | null | undefined, language: string): string {
  if (!text) return "";
  const trimmed = text.trim();
  const lower = trimmed.toLowerCase();

  if (language === "en") {
    if (lower === "prueba gratis" || lower === "gratis prueba") return "Free Trial";
    if (lower === "cuminsamento") return "Starter";
    if (lower === "negoshi" || lower === "negocio") return "Business";
    if (lower === "profesional") return "Professional";
    if (lower === "corporativo") return "Corporate";
    if (lower === "empresa") return "Enterprise";

    if (lower === "presetnan y templatenan premium di diseño") return "Premium design presets and templates";
    if (lower === "expiracion di recompensa") return "Reward expiration";
    if (lower === "marca personalisa di carta") return "Custom card branding";
    if (lower === "sin cuenta di personal") return "No staff accounts included";
    if (lower.includes("analitica avansa")) return "Advanced Analytics";
    if (lower.includes("acceso quick qr")) return "Quick QR access";
    if (lower.includes("manejo di ubicacion")) return "Location Management";
    if (lower.includes("asignacion di personal")) return "Staff-location Assignment";
    if (lower.includes("marca corporate")) return "Corporate Branding";
    
    const match = lower.match(/^(\d+)\s+(.+)$/);
    if (match) {
      const num = parseInt(match[1], 10);
      const rest = match[2].trim();
      
      if (rest === "programa di fidelidad" || rest === "programanan di fidelidad") return num === 1 ? `1 loyalty program` : `${num} loyalty programs`;
      if (rest === "miembro di fidelidad" || rest === "miembronan di fidelidad") return num === 1 ? `1 loyalty member` : `${num} loyalty members`;
      if (rest === "cuenta di admin" || rest === "cuentanan di admin") return num === 1 ? `1 admin account` : `${num} admin accounts`;
      if (rest === "cuenta di personal" || rest === "cuentanan di personal") return num === 1 ? `1 staff account` : `${num} staff accounts`;
      if (rest === "ubicacion" || rest === "ubicacionnan") return num === 1 ? `1 location` : `${num} locations`;
    }
  }

  if (language === "es") {
    if (lower === "prueba gratis" || lower === "gratis prueba") return "Prueba Gratis";
    if (lower === "cuminsamento") return "Starter";
    if (lower === "negoshi") return "Negocio";
    if (lower === "profesional") return "Profesional";
    if (lower === "corporativo") return "Corporativo";
    if (lower === "empresa") return "Enterprise";

    if (lower === "presetnan y templatenan premium di diseño") return "Presets y plantillas premium de diseño";
    if (lower === "expiracion di recompensa") return "Vencimiento de recompensas";
    if (lower === "marca personalisa di carta") return "Marca personalizada de tarjeta";
    if (lower === "sin cuenta di personal") return "Sin cuentas de personal";
    if (lower.includes("analitica avansa")) return "Analítica avanzada";
    if (lower.includes("acceso quick qr")) return "Acceso Quick QR";
    if (lower.includes("manejo di ubicacion")) return "Gestión de ubicaciones";
    if (lower.includes("asignacion di personal")) return "Asignación de personal";
    if (lower.includes("marca corporate")) return "Marca Corporate";

    const match = lower.match(/^(\d+)\s+(.+)$/);
    if (match) {
      const num = parseInt(match[1], 10);
      const rest = match[2].trim();
      
      if (rest === "programa di fidelidad" || rest === "programanan di fidelidad") return num === 1 ? `1 programa de fidelidad` : `${num} programas de fidelidad`;
      if (rest === "miembro di fidelidad" || rest === "miembronan di fidelidad") return num === 1 ? `1 miembro de fidelidad` : `${num} miembros de fidelidad`;
      if (rest === "cuenta di admin" || rest === "cuentanan di admin") return num === 1 ? `1 cuenta de administrador` : `${num} cuentas de administrador`;
      if (rest === "cuenta di personal" || rest === "cuentanan di personal") return num === 1 ? `1 cuenta de personal` : `${num} cuentas de personal`;
      if (rest === "ubicacion" || rest === "ubicacionnan") return num === 1 ? `1 ubicación` : `${num} ubicaciones`;
    }
  }
  
  return trimmed;
}

export function formatPublicPlanFeatures(plan: PublicSubscriptionPlan, t: Translate, language: string) {
  const features: string[] = [];
  const seen = new Set<string>();
  const displayLimits = {
    maxLoyaltyPrograms: getNumericLimit(plan.max_loyalty_programs),
    maxCustomers: getNumericLimit(plan.max_customers),
    maxStaff: getNumericLimit(plan.max_staff),
  };

  const entitlementRows = (Array.isArray(plan.entitlements) ? plan.entitlements : [])
    .slice()
    .sort((a, b) => (entitlementDisplayOrder.get(a.key) ?? 999) - (entitlementDisplayOrder.get(b.key) ?? 999));

  const addFeature = (label: string, dedupeKey?: string) => {
    const translatedLabel = translatePlanText(label, language);
    const normalizedLabel = normalizeDisplayFeature(translatedLabel);
    if (!normalizedLabel) return;

    const key = getFeatureDedupeKey(normalizedLabel, dedupeKey);
    if (seen.has(key)) return;

    seen.add(key);
    features.push(normalizedLabel);
  };

  addFeature(translatedCountFeatureLabel(
    t,
    "loyaltyProgram",
    "loyaltyPrograms",
    displayLimits.maxLoyaltyPrograms,
    "loyaltyPrograms",
    language
  ), "limit_loyalty_programs");

  addFeature(translatedCountFeatureLabel(
    t,
    "loyaltyMember",
    "loyaltyMembers",
    displayLimits.maxCustomers,
    "loyaltyMembers",
    language
  ), "limit_loyalty_members");

  addFeature(translatedFeatureLabel(t, "adminAccount", undefined, language), "limit_admin_account");

  if (displayLimits.maxStaff === 0) {
    addFeature(language === "es" ? "Sin cuentas de personal" : language === "pa" ? "Sin cuenta di personal" : "No staff accounts included", "limit_staff_accounts");
  } else {
    addFeature(translatedCountFeatureLabel(
      t,
      "staffAccount",
      "staffAccounts",
      displayLimits.maxStaff,
      "staffAccounts",
      language
    ), "limit_staff_accounts");
  }

  const maxLocationsEntitlement = entitlementRows.find((entitlement) => entitlement.key === "max_locations" && isEnabledEntitlement(entitlement));
  const maxLocations = Number(maxLocationsEntitlement?.number_value || 0);
  if (maxLocations > 0) {
    addFeature(translatedFeatureLabel(t, "max_locations", {
      count: formatLimit(maxLocations),
    }, language), "max_locations");
  }

  if (Array.isArray(plan.features)) {
    plan.features.forEach((feature) => addFeature(feature));
  }

  const entitlementKeys = new Set(entitlementRows.map((entitlement) => entitlement.key));

  if (plan.includes_premium_templates && !entitlementKeys.has("premium_templates")) {
    addFeature(translatedFeatureLabel(t, "premium_templates", undefined, language), "premium_templates");
  }

  entitlementRows
    .filter((entitlement) => publicEntitlementKeys.has(entitlement.key))
    .filter((entitlement) => !internalLimitEntitlementKeys.has(entitlement.key))
    .filter(isEnabledEntitlement)
    .forEach((entitlement) => {
      if (entitlement.key === "max_locations") {
        addFeature(translatedFeatureLabel(t, "max_locations", {
          count: formatLimit(Number(entitlement.number_value || 0)),
        }, language), entitlement.key);
        return;
      }

      addFeature(translatedFeatureLabel(t, entitlement.key, undefined, language), entitlement.key);
    });

  return features;
}