import { SEO } from "@/components/SEO";
import { RealisticScratchCardDemo } from "@/components/scratch-win/RealisticScratchCardDemo";

export default function ScratchWinRealisticDemoPage() {
  return (
    <>
      <SEO
        title="Realistic Scratch-Off Demo | Royalty Stamp Aruba"
        description="A standalone demo-only canvas scratch-off experience for Royalty Scratch & Win."
      />
      <RealisticScratchCardDemo />
    </>
  );
}