export type ScratchTemplateCategory =
  | "Cafe"
  | "Wellness"
  | "Retail"
  | "Dining"
  | "Occasion"
  | "Seasonal"
  | "Appreciation"
  | "Blank";

export interface ScratchTemplatePrize {
  id: string;
  name: string;
  description: string;
  quantity: number;
  displayValue: string;
}

export interface ScratchCampaignTemplate {
  id: string;
  name: string;
  category: ScratchTemplateCategory;
  explanation: string;
  suggestedTitle: string;
  suggestedDescription: string;
  suggestedDuration: string;
  expirationRule: string;
  visualTone: string;
  gradient: string;
  accent: string;
  prizes: ScratchTemplatePrize[];
}

export interface ScratchTemplateDraft {
  templateId: string;
  campaignTitle: string;
  description: string;
  duration: string;
  expirationRule: string;
  visualTone: string;
  prizes: ScratchTemplatePrize[];
}

export type TemplateLibraryMode = "gallery" | "draft";