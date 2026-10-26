import type { ScratchCampaignTemplate, ScratchTemplateDraft } from "@/components/scratch-win/template-library-types";

export const scratchCampaignTemplates: ScratchCampaignTemplate[] = [
  {
    id: "coffee-cafe",
    name: "Coffee & Café Rewards",
    category: "Cafe",
    explanation: "A warm visit-based demo for cafés, bakeries, juice bars, and counter-service concepts.",
    suggestedTitle: "Sip, Scratch & Smile",
    suggestedDescription: "A fictional café campaign where guests preview small treats, upgrades, and visit bonuses.",
    suggestedDuration: "14 demo days",
    expirationRule: "Illustrative prizes expire 10 days after reveal.",
    visualTone: "Espresso warmth with coral highlight",
    gradient: "linear-gradient(135deg, #ff6f7d, #f8d06b)",
    accent: "#25364a",
    prizes: [
      { id: "coffee-1", name: "Demo Pastry Bite", description: "Fictional pastry sample preview.", quantity: 30, displayValue: "Free item" },
      { id: "coffee-2", name: "Demo Upgrade", description: "Illustrative size upgrade only.", quantity: 20, displayValue: "Upgrade" },
      { id: "coffee-3", name: "Demo 10% Visit Bonus", description: "Non-redeemable percentage example.", quantity: 50, displayValue: "10%" }
    ]
  },
  {
    id: "beauty-wellness",
    name: "Beauty & Wellness",
    category: "Wellness",
    explanation: "A calm add-on preview for salons, spas, barbers, clinics, and wellness studios.",
    suggestedTitle: "Reveal Your Glow",
    suggestedDescription: "A fictional wellness campaign with demo service add-ons and self-care rewards.",
    suggestedDuration: "21 demo days",
    expirationRule: "Illustrative prizes expire 14 days after reveal.",
    visualTone: "Soft spa coral with clean lagoon details",
    gradient: "linear-gradient(135deg, #ffe4e8, #08a8a8)",
    accent: "#25364a",
    prizes: [
      { id: "wellness-1", name: "Demo Treatment Add-on", description: "Fictional add-on preview.", quantity: 18, displayValue: "Add-on" },
      { id: "wellness-2", name: "Demo 15% Service Preview", description: "Non-live discount example.", quantity: 24, displayValue: "15%" },
      { id: "wellness-3", name: "Demo Care Kit", description: "Illustrative product kit only.", quantity: 8, displayValue: "Gift" }
    ]
  },
  {
    id: "retail-shopping",
    name: "Retail & Shopping",
    category: "Retail",
    explanation: "A merchandise-focused campaign concept for boutiques, gift shops, and specialty retail.",
    suggestedTitle: "Scratch the Shelf Surprise",
    suggestedDescription: "A fictional shopping campaign with demo discounts, bundles, and surprise perks.",
    suggestedDuration: "10 demo days",
    expirationRule: "Illustrative vouchers expire 7 days after reveal.",
    visualTone: "Bright coral shelf-card energy",
    gradient: "linear-gradient(135deg, #ff6f7d, #25364a)",
    accent: "#f8d06b",
    prizes: [
      { id: "retail-1", name: "Demo AWG 10 Voucher", description: "Fictional fixed-value voucher preview.", quantity: 25, displayValue: "AWG 10" },
      { id: "retail-2", name: "Demo Bundle Perk", description: "Illustrative bundle reward only.", quantity: 12, displayValue: "Bundle" },
      { id: "retail-3", name: "Demo 20% Preview", description: "Non-redeemable discount example.", quantity: 10, displayValue: "20%" }
    ]
  },
  {
    id: "restaurant-dining",
    name: "Restaurant & Dining",
    category: "Dining",
    explanation: "A table-service and takeaway campaign concept for restaurants, bars, and snack shops.",
    suggestedTitle: "Dinner Scratch Surprise",
    suggestedDescription: "A fictional dining campaign with appetizer previews and visit incentives.",
    suggestedDuration: "17 demo days",
    expirationRule: "Illustrative rewards expire 12 days after reveal.",
    visualTone: "Evening ocean-slate with coral service accents",
    gradient: "linear-gradient(135deg, #25364a, #ff6f7d)",
    accent: "#ffffff",
    prizes: [
      { id: "dining-1", name: "Demo Appetizer Preview", description: "Fictional menu-item example.", quantity: 15, displayValue: "Free item" },
      { id: "dining-2", name: "Demo Dessert Bite", description: "Illustrative dessert preview.", quantity: 20, displayValue: "Treat" },
      { id: "dining-3", name: "Demo Table Bonus", description: "Non-live table perk example.", quantity: 10, displayValue: "Bonus" }
    ]
  },
  {
    id: "birthday-special",
    name: "Birthday & Special Occasions",
    category: "Occasion",
    explanation: "A celebratory campaign concept for birthdays, anniversaries, and milestone visits.",
    suggestedTitle: "Birthday Scratch Moment",
    suggestedDescription: "A fictional occasion campaign with celebratory demo rewards and warm messaging.",
    suggestedDuration: "30 demo days",
    expirationRule: "Illustrative rewards expire 21 days after reveal.",
    visualTone: "Confetti coral with sunny cream surfaces",
    gradient: "linear-gradient(135deg, #f8d06b, #ff6f7d)",
    accent: "#25364a",
    prizes: [
      { id: "birthday-1", name: "Demo Celebration Treat", description: "Fictional birthday item preview.", quantity: 30, displayValue: "Treat" },
      { id: "birthday-2", name: "Demo Occasion Voucher", description: "Illustrative voucher only.", quantity: 15, displayValue: "AWG 15" },
      { id: "birthday-3", name: "Demo VIP Note", description: "Mock appreciation message reward.", quantity: 50, displayValue: "Custom" }
    ]
  },
  {
    id: "seasonal-promotions",
    name: "Seasonal Promotions",
    category: "Seasonal",
    explanation: "A time-boxed concept for holiday traffic, tourism moments, and local events.",
    suggestedTitle: "Island Season Scratch",
    suggestedDescription: "A fictional seasonal campaign with demo perks for a limited promotional window.",
    suggestedDuration: "7 demo days",
    expirationRule: "Illustrative prizes expire 5 days after reveal.",
    visualTone: "High-energy coral, gold, and lagoon",
    gradient: "linear-gradient(135deg, #08a8a8, #f8d06b, #ff6f7d)",
    accent: "#25364a",
    prizes: [
      { id: "seasonal-1", name: "Demo Holiday Perk", description: "Fictional seasonal prize preview.", quantity: 40, displayValue: "Perk" },
      { id: "seasonal-2", name: "Demo Limited Bonus", description: "Illustrative limited-window reward.", quantity: 20, displayValue: "Bonus" },
      { id: "seasonal-3", name: "Demo 12% Preview", description: "Non-redeemable percentage example.", quantity: 35, displayValue: "12%" }
    ]
  },
  {
    id: "customer-appreciation",
    name: "Customer Appreciation",
    category: "Appreciation",
    explanation: "A thank-you campaign concept for loyal customers and community moments.",
    suggestedTitle: "Thanks for Being Royal",
    suggestedDescription: "A fictional appreciation campaign with small surprise perks and thank-you rewards.",
    suggestedDuration: "14 demo days",
    expirationRule: "Illustrative rewards expire 10 days after reveal.",
    visualTone: "Royal ocean-slate with friendly coral",
    gradient: "linear-gradient(135deg, #25364a, #08a8a8)",
    accent: "#ff6f7d",
    prizes: [
      { id: "thanks-1", name: "Demo Thank-You Gift", description: "Fictional appreciation item.", quantity: 25, displayValue: "Gift" },
      { id: "thanks-2", name: "Demo Loyal Guest Bonus", description: "Illustrative loyalty perk only.", quantity: 30, displayValue: "Bonus" },
      { id: "thanks-3", name: "Demo Custom Message", description: "Mock personalized note preview.", quantity: 100, displayValue: "Custom" }
    ]
  },
  {
    id: "start-from-scratch",
    name: "Start from Scratch",
    category: "Blank",
    explanation: "A blank local draft for teams that want to explore their own fictional campaign idea.",
    suggestedTitle: "Untitled Scratch Campaign",
    suggestedDescription: "Draft a demo-only campaign concept using illustrative prizes and local state.",
    suggestedDuration: "Custom demo duration",
    expirationRule: "Choose an illustrative expiration rule before any real review.",
    visualTone: "Minimal coral outline with cream workspace",
    gradient: "linear-gradient(135deg, #fffaf3, #ff6f7d)",
    accent: "#25364a",
    prizes: [
      { id: "blank-1", name: "Demo Prize Placeholder", description: "Replace with a fictional prize description.", quantity: 0, displayValue: "Custom" }
    ]
  }
];

export function createDraftFromTemplate(template: ScratchCampaignTemplate): ScratchTemplateDraft {
  return {
    templateId: template.id,
    campaignTitle: template.suggestedTitle,
    description: template.suggestedDescription,
    duration: template.suggestedDuration,
    expirationRule: template.expirationRule,
    visualTone: template.visualTone,
    prizes: template.prizes.map((prize) => ({ ...prize }))
  };
}