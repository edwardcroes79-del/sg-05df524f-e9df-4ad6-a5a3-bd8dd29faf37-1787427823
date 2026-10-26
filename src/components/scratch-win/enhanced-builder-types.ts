export type EnhancedPrizeType = "free_item" | "percentage_discount" | "fixed_value_voucher" | "custom_prize";

export type EnhancedThemeId = "coral_lagoon" | "sunset_gold" | "ocean_slate";

export interface EnhancedPrize {
  id: string;
  name: string;
  description: string;
  type: EnhancedPrizeType;
  quantity: number;
  displayValue: string;
  expirationDays: number;
}

export interface EnhancedBuilderState {
  campaignName: string;
  description: string;
  visualNote: string;
  businessName: string;
  startDateTime: string;
  endDateTime: string;
  cardTitle: string;
  cardSubtitle: string;
  themeId: EnhancedThemeId;
  terms: string;
  prizes: EnhancedPrize[];
}

export interface EnhancedTheme {
  id: EnhancedThemeId;
  name: string;
  background: string;
  accent: string;
  text: string;
  surface: string;
}

export interface ValidationResult {
  stepErrors: Record<number, string[]>;
  allErrors: string[];
}

export const prizeTypeLabels: Record<EnhancedPrizeType, string> = {
  free_item: "Free item",
  percentage_discount: "Percentage discount",
  fixed_value_voucher: "Fixed-value voucher",
  custom_prize: "Custom prize"
};