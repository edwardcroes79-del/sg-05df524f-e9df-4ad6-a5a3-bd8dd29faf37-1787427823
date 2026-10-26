export type ScratchCampaignStatus = "Draft" | "Demo active" | "Completed";

export interface ScratchPrize {
  id: string;
  title: string;
  description: string;
  quantity: number;
  remaining: number;
  accent: string;
}

export interface ScratchCampaign {
  id: string;
  name: string;
  description: string;
  status: ScratchCampaignStatus;
  audience: string;
  startDate: string;
  endDate: string;
  plays: number;
  wins: number;
  cardColor: string;
  accentColor: string;
  prize: ScratchPrize;
}

export interface ScratchOutcome {
  type: "win" | "try-again";
  title: string;
  message: string;
  voucherCode?: string;
  expiresAt?: string;
  instructions?: string;
}

export const demoScratchCampaigns: ScratchCampaign[] = [
  {
    id: "sunset-weekend",
    name: "Sunset Weekend Bonus",
    description: "A demo campaign for cafés rewarding weekend visitors with a playful scratch card.",
    status: "Demo active",
    audience: "Returning customers",
    startDate: "2026-11-01",
    endDate: "2026-11-30",
    plays: 428,
    wins: 64,
    cardColor: "#ff6f7d",
    accentColor: "#08a8a8",
    prize: {
      id: "free-pastechi",
      title: "Free Pastechi",
      description: "Demo-only food reward shown as a fictional prize preview.",
      quantity: 75,
      remaining: 24,
      accent: "Coral"
    }
  },
  {
    id: "island-starter",
    name: "Island Starter",
    description: "Draft example for a new merchant testing branded scratch card colors.",
    status: "Draft",
    audience: "New members",
    startDate: "2026-12-02",
    endDate: "2026-12-16",
    plays: 0,
    wins: 0,
    cardColor: "#f8d06b",
    accentColor: "#25364a",
    prize: {
      id: "demo-upgrade",
      title: "Demo Upgrade Coupon",
      description: "Fictional preview coupon for campaign planning only.",
      quantity: 40,
      remaining: 40,
      accent: "Sun"
    }
  },
  {
    id: "harbor-thanks",
    name: "Harbor Thank You",
    description: "Completed example showing historical demo plays without live prize issuance.",
    status: "Completed",
    audience: "VIP customers",
    startDate: "2026-09-05",
    endDate: "2026-09-19",
    plays: 312,
    wins: 37,
    cardColor: "#1d7f8c",
    accentColor: "#ff6f7d",
    prize: {
      id: "mock-dessert",
      title: "Mock Dessert Treat",
      description: "Completed demo prize inventory example.",
      quantity: 50,
      remaining: 13,
      accent: "Lagoon"
    }
  }
];

export const demoScratchOutcomes: ScratchOutcome[] = [
  {
    type: "win",
    title: "Demo prize revealed",
    message: "You revealed a fictional prize for this local prototype.",
    voucherCode: "DEMO-SCRATCH-ARUBA-000",
    expiresAt: "2026-12-31",
    instructions: "Show this non-redeemable demo preview to understand the customer experience."
  },
  {
    type: "try-again",
    title: "Demo try again",
    message: "No prize in this simulated play. This result was generated locally for the prototype."
  }
];

export const demoScratchStats = {
  totalPlays: demoScratchCampaigns.reduce((sum, campaign) => sum + campaign.plays, 0),
  totalWins: demoScratchCampaigns.reduce((sum, campaign) => sum + campaign.wins, 0),
  inventoryRemaining: demoScratchCampaigns.reduce((sum, campaign) => sum + campaign.prize.remaining, 0)
};

export const demoInventory = demoScratchCampaigns.map((campaign) => ({
  campaign: campaign.name,
  prize: campaign.prize.title,
  remaining: campaign.prize.remaining,
  quantity: campaign.prize.quantity
}));