import { SEO } from "@/components/SEO";
import { EnhancedScratchCampaignWizard } from "@/components/scratch-win/EnhancedScratchCampaignWizard";

export default function ScratchWinEnhancedBuilderPage() {
  return (
    <>
      <SEO
        title="Enhanced Scratch & Win Builder Demo | Royalty Stamp Aruba"
        description="A demo-only guided Scratch & Win campaign builder prototype with local state and mock prizes."
      />
      <EnhancedScratchCampaignWizard />
    </>
  );
}