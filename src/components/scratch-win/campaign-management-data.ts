import { scratchCampaignTemplates } from "@/components/scratch-win/template-library-data";
import type { ScratchCampaignTemplate } from "@/components/scratch-win/template-library-types";
import type { ManagedCampaignStatus, ManagedCampaignValidation, ManagedScratchCampaign } from "@/components/scratch-win/campaign-management-types";

const demoCreatedAt = "2026-10-26T13:32:39Z";

export function createManagedCampaignFromTemplate(template: ScratchCampaignTemplate, id: string, status: ManagedCampaignStatus = "Draft"): ManagedScratchCampaign {
  return {
    id,
    campaignName: `${template.name} demo draft`,
    customerTitle: template.suggestedTitle,
    description: template.suggestedDescription,
    templateId: template.id,
    visualTone: template.visualTone,
    gradient: template.gradient,
    accent: template.accent,
    prizes: template.prizes.map((prize) => ({ ...prize })),
    startDate: "",
    endDate: "",
    status,
    createdAt: demoCreatedAt,
    updatedAt: demoCreatedAt
  };
}

export function createBlankManagedCampaign(id: string): ManagedScratchCampaign {
  const template = scratchCampaignTemplates.find((item) => item.id === "start-from-scratch") ?? scratchCampaignTemplates[0];
  return createManagedCampaignFromTemplate(template, id, "Draft");
}

export const initialManagedScratchCampaigns: ManagedScratchCampaign[] = [
  {
    ...createManagedCampaignFromTemplate(scratchCampaignTemplates[0], "campaign-cafe-welcome", "Demo Active"),
    campaignName: "Café welcome week",
    startDate: "2026-10-28",
    endDate: "2026-11-11"
  },
  {
    ...createManagedCampaignFromTemplate(scratchCampaignTemplates[2], "campaign-retail-weekend", "Draft"),
    campaignName: "Retail weekend scratch preview",
    startDate: "2026-11-01",
    endDate: "2026-11-10"
  },
  {
    ...createManagedCampaignFromTemplate(scratchCampaignTemplates[4], "campaign-birthday-archive", "Archived"),
    campaignName: "Birthday month idea",
    startDate: "2026-10-01",
    endDate: "2026-10-21"
  }
];

export function duplicateManagedCampaign(campaign: ManagedScratchCampaign, id: string): ManagedScratchCampaign {
  return {
    ...campaign,
    id,
    campaignName: `${campaign.campaignName} copy`,
    status: "Draft",
    createdAt: demoCreatedAt,
    updatedAt: demoCreatedAt,
    prizes: campaign.prizes.map((prize) => ({ ...prize, id: `${id}-${prize.id}` }))
  };
}

export function validateManagedCampaign(campaign: ManagedScratchCampaign): ManagedCampaignValidation {
  const messages: string[] = [];

  if (!campaign.campaignName.trim()) {
    messages.push("Campaign name is required.");
  }

  if (!campaign.customerTitle.trim()) {
    messages.push("Customer-facing title is required.");
  }

  if (!campaign.description.trim()) {
    messages.push("Description is required.");
  }

  if (campaign.prizes.length === 0) {
    messages.push("Add at least one fictional prize.");
  }

  campaign.prizes.forEach((prize, index) => {
    if (!prize.name.trim()) {
      messages.push(`Prize ${index + 1} needs a name.`);
    }

    if (prize.quantity < 0) {
      messages.push(`Prize ${index + 1} cannot have a negative quantity.`);
    }
  });

  if (campaign.startDate && campaign.endDate && campaign.endDate <= campaign.startDate) {
    messages.push("End date must be later than start date.");
  }

  return {
    isValid: messages.length === 0,
    messages
  };
}