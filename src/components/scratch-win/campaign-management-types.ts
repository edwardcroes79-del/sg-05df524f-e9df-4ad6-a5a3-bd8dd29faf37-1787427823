import type { ScratchTemplateDraft, ScratchTemplatePrize } from "@/components/scratch-win/template-library-types";

export type ManagedCampaignStatus = "Draft" | "Demo Active" | "Archived";
export type ManagedCampaignFilter = "All" | ManagedCampaignStatus;

export interface ManagedScratchCampaign {
  id: string;
  campaignName: string;
  customerTitle: string;
  description: string;
  templateId: string;
  visualTone: string;
  gradient: string;
  accent: string;
  prizes: ScratchTemplatePrize[];
  startDate: string;
  endDate: string;
  status: ManagedCampaignStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ManagedCampaignValidation {
  isValid: boolean;
  messages: string[];
}

export function toScratchTemplateDraft(campaign: ManagedScratchCampaign): ScratchTemplateDraft {
  return {
    templateId: campaign.templateId,
    campaignTitle: campaign.customerTitle,
    description: campaign.description,
    duration: campaign.startDate && campaign.endDate ? `${campaign.startDate} to ${campaign.endDate}` : "Optional demo schedule not set",
    expirationRule: "Fictional demo vouchers expire based on the selected local campaign draft. Not legally reviewed.",
    visualTone: campaign.visualTone,
    prizes: campaign.prizes.map((prize) => ({ ...prize }))
  };
}