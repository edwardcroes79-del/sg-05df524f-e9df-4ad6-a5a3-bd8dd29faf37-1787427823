import { SEO } from "@/components/SEO";
import { ScratchWinCustomerCard } from "@/components/scratch-win/ScratchWinCustomerCard";

export default function ScratchWinDemoPage() {
  return (
    <>
      <SEO
        title="Scratch & Win Demo | Royalty Stamp Aruba"
        description="A mobile-first demo scratch card preview with fictional voucher results."
      />
      <ScratchWinCustomerCard />
    </>
  );
}