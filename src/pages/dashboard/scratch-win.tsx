import { SEO } from "@/components/SEO";
import { ScratchWinBusinessDashboard } from "@/components/scratch-win/ScratchWinBusinessDashboard";

export default function ScratchWinDashboardPage() {
  return (
    <>
      <SEO
        title="Royalty Scratch & Win Demo | Royalty Stamp Aruba"
        description="A demo-only Scratch & Win add-on prototype for Royalty Stamp."
      />
      <ScratchWinBusinessDashboard />
    </>
  );
}