import type { EnhancedBuilderState, EnhancedTheme } from "@/components/scratch-win/enhanced-builder-types";

export const enhancedScratchThemes: EnhancedTheme[] = [
  {
    id: "coral_lagoon",
    name: "Coral Lagoon",
    background: "#ff6f7d",
    accent: "#08a8a8",
    text: "#ffffff",
    surface: "bg-primary/10"
  },
  {
    id: "sunset_gold",
    name: "Sunset Gold",
    background: "#f8d06b",
    accent: "#25364a",
    text: "#25364a",
    surface: "bg-amber-50"
  },
  {
    id: "ocean_slate",
    name: "Ocean Slate",
    background: "#25364a",
    accent: "#ff6f7d",
    text: "#ffffff",
    surface: "bg-slate-50"
  }
];

export const initialEnhancedBuilderState: EnhancedBuilderState = {
  campaignName: "Palm Prize Weekend",
  description: "A fictional guided Scratch & Win campaign for loyal café guests in Aruba.",
  visualNote: "Use the tropical counter display artwork placeholder.",
  businessName: "Demo Business: Oranjestad Coffee House",
  startDateTime: "2026-11-06T09:00",
  endDateTime: "2026-11-20T18:00",
  cardTitle: "Scratch for a Palm Prize",
  cardSubtitle: "Reveal a simulated prize preview after your visit.",
  themeId: "coral_lagoon",
  terms: "Demo-only terms: no purchase record, stamp balance, voucher, or reward is created.",
  prizes: [
    {
      id: "demo-prize-1",
      name: "Demo Smoothie Upgrade",
      description: "Fictional free upgrade preview for campaign planning.",
      type: "free_item",
      quantity: 25,
      displayValue: "Free upgrade",
      expirationDays: 14
    },
    {
      id: "demo-prize-2",
      name: "Demo 15% Visit Bonus",
      description: "Non-redeemable percentage discount example.",
      type: "percentage_discount",
      quantity: 40,
      displayValue: "15%",
      expirationDays: 10
    }
  ]
};

export const demoBusinessOperator = {
  name: "Marlon Tromp",
  role: "Owner preview",
  location: "Oranjestad, Aruba"
};