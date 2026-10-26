import { SEO } from "@/components/SEO";
import { IntegratedScratchCustomerJourney } from "@/components/scratch-win/IntegratedScratchCustomerJourney";

export default function ScratchWinCustomerJourneyPage() {
  return (
    <>
      <SEO
        title="Scratch & Win Customer Journey Demo | Royalty Stamp Aruba"
        description="A cohesive demo-only Scratch & Win customer journey using templates, local draft customization, and realistic scratch-card preview."
      />
      <IntegratedScratchCustomerJourney />
    </>
  );
}