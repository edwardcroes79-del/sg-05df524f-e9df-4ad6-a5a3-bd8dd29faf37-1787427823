export interface RealisticScratchPrize {
  campaignTitle: string;
  campaignSubtitle: string;
  businessName: string;
  instruction: string;
  resultTitle: string;
  resultMessage: string;
  voucherCode: string;
  expiration: string;
  redemptionInstructions: string;
  terms: string[];
}

export const realisticScratchPrize: RealisticScratchPrize = {
  campaignTitle: "Island Surprise Scratch",
  campaignSubtitle: "A realistic canvas prototype for customer-facing Scratch & Win previews.",
  businessName: "Royalty Stamp Demo Merchant",
  instruction: "Scratch here to reveal your surprise.",
  resultTitle: "Demo Treat Unlocked",
  resultMessage: "You revealed a fictional prize preview. This is not saved, issued, redeemable, or live.",
  voucherCode: "DEMO-SILVER-ARUBA-042",
  expiration: "Example expiration: 14 demo days after reveal",
  redemptionInstructions: "Show this fictional preview to understand the customer flow. No merchant should redeem this code.",
  terms: [
    "DEMO ONLY / NOT LIVE.",
    "No real prize, voucher, stamp, balance, reward, or redemption is created.",
    "Scratch progress is simulated locally in the browser and is not secure promotion logic.",
    "The result is fixed mock data for this prototype route."
  ]
};