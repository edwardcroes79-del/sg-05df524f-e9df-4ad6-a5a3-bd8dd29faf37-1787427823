export type PlanEntitlementValueType = "boolean" | "number" | "text";

export interface PlanEntitlementDefinition {
  key: string;
  label: string;
  description: string;
  valueType: PlanEntitlementValueType;
  defaultValue: boolean | number | string;
  publicVisible: boolean;
}

export const STANDARD_PLAN_ENTITLEMENTS = [
  {
    key: "premium_templates",
    label: "Premium Design Presets & Templates",
    description: "Allow premium loyalty card templates.",
    valueType: "boolean",
    defaultValue: true,
    publicVisible: true,
  },
  {
    key: "reward_expiration",
    label: "Reward Expiration",
    description: "Allow businesses to set reward expiration periods.",
    valueType: "boolean",
    defaultValue: true,
    publicVisible: true,
  },
  {
    key: "custom_card_branding",
    label: "Custom Card Branding",
    description: "Allow branded loyalty card customization.",
    valueType: "boolean",
    defaultValue: true,
    publicVisible: true,
  },
  {
    key: "advanced_analytics",
    label: "Advanced Analytics",
    description: "Allow advanced analytics dashboards.",
    valueType: "boolean",
    defaultValue: true,
    publicVisible: true,
  },
  {
    key: "quick_stamp_qr",
    label: "Quick QR Access",
    description: "Include Quick QR through the plan instead of requiring the AWG 10 add-on.",
    valueType: "boolean",
    defaultValue: true,
    publicVisible: true,
  },
  {
    key: "location_management",
    label: "Location Management",
    description: "Allow location management screens and APIs.",
    valueType: "boolean",
    defaultValue: true,
    publicVisible: true,
  },
  {
    key: "multi_location_management",
    label: "Multi-location Management",
    description: "Allow Corporate multi-location operations.",
    valueType: "boolean",
    defaultValue: true,
    publicVisible: true,
  },
  {
    key: "staff_location_assignment",
    label: "Staff-location Assignment",
    description: "Allow assigning staff to business locations.",
    valueType: "boolean",
    defaultValue: true,
    publicVisible: true,
  },
  {
    key: "location_manager",
    label: "Location Manager Role",
    description: "Allow location manager functionality.",
    valueType: "boolean",
    defaultValue: true,
    publicVisible: true,
  },
  {
    key: "location_analytics",
    label: "Location Analytics",
    description: "Allow per-location analytics views.",
    valueType: "boolean",
    defaultValue: true,
    publicVisible: true,
  },
  {
    key: "cross_location_analytics",
    label: "Cross-location Analytics",
    description: "Allow cross-location analytics comparisons.",
    valueType: "boolean",
    defaultValue: true,
    publicVisible: true,
  },
  {
    key: "location_leaderboard",
    label: "Location Leaderboard",
    description: "Allow Corporate location leaderboard reporting.",
    valueType: "boolean",
    defaultValue: true,
    publicVisible: true,
  },
  {
    key: "corporate_branding",
    label: "Corporate Branding",
    description: "Allow Corporate-level branding controls.",
    valueType: "boolean",
    defaultValue: true,
    publicVisible: true,
  },
  {
    key: "location_specific_quick_qr",
    label: "Location-specific Quick QR",
    description: "Allow Quick QR to carry location context.",
    valueType: "boolean",
    defaultValue: true,
    publicVisible: true,
  },
  {
    key: "vip_member_identification",
    label: "VIP Member Identification",
    description: "Advertise VIP member identification as a plan feature.",
    valueType: "boolean",
    defaultValue: true,
    publicVisible: true,
  },
  {
    key: "excel_member_export",
    label: "Excel Member Export",
    description: "Advertise Excel member export as a plan feature.",
    valueType: "boolean",
    defaultValue: true,
    publicVisible: true,
  },
  {
    key: "excel_member_import",
    label: "Excel Member Import",
    description: "Allow secure Excel member import with preview and confirmation.",
    valueType: "boolean",
    defaultValue: true,
    publicVisible: true,
  },
  {
    key: "bulk_member_import",
    label: "Bulk Member Import",
    description: "Advertise bulk member import as a plan feature.",
    valueType: "boolean",
    defaultValue: true,
    publicVisible: true,
  },
  {
    key: "bulk_member_management",
    label: "Bulk Member Management",
    description: "Advertise bulk member management as a plan feature.",
    valueType: "boolean",
    defaultValue: true,
    publicVisible: true,
  },
  {
    key: "bulk_member_removal",
    label: "Bulk Member Removal",
    description: "Allow Excel member reconciliation with safe bulk membership removal.",
    valueType: "boolean",
    defaultValue: true,
    publicVisible: true,
  },
  {
    key: "search_stamp_staff_access",
    label: "Search Stamp access control for staff, configurable by the Business Admin",
    description: "Advertise configurable staff access control for Search Stamp.",
    valueType: "boolean",
    defaultValue: true,
    publicVisible: true,
  },
  {
    key: "max_locations",
    label: "Maximum Locations",
    description: "Server-side limit for active locations.",
    valueType: "number",
    defaultValue: 0,
    publicVisible: true,
  },
] as const satisfies readonly PlanEntitlementDefinition[];

export type StandardPlanEntitlementKey = typeof STANDARD_PLAN_ENTITLEMENTS[number]["key"];

export const STANDARD_PLAN_ENTITLEMENT_KEYS = STANDARD_PLAN_ENTITLEMENTS.map((entitlement) => entitlement.key);

export const PUBLIC_PLAN_ENTITLEMENT_KEYS = STANDARD_PLAN_ENTITLEMENTS
  .filter((entitlement) => entitlement.publicVisible)
  .map((entitlement) => entitlement.key);

export function getPlanEntitlementLabel(key: string) {
  return STANDARD_PLAN_ENTITLEMENTS.find((entitlement) => entitlement.key === key)?.label || null;
}