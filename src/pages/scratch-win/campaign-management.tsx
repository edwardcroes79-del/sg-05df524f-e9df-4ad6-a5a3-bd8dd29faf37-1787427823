import { SEO } from "@/components/SEO";
import { CampaignManagementDashboard } from "@/components/scratch-win/CampaignManagementDashboard";

export default function ScratchWinCampaignManagementPage() {
  return (
    <>
      <SEO
        title="Scratch & Win Campaign Management Demo | Royalty Stamp"
        description="Frontend-only campaign management dashboard for Royalty Scratch & Win demo drafts."
      />
      <CampaignManagementDashboard />
    </>
  );
}