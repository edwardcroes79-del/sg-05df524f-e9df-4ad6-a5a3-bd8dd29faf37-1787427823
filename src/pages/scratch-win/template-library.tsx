import { SEO } from "@/components/SEO";
import { ScratchTemplateLibraryExperience } from "@/components/scratch-win/ScratchTemplateLibraryExperience";

export default function ScratchWinTemplateLibraryPage() {
  return (
    <>
      <SEO
        title="Royalty Scratch & Win Template Library"
        description="Standalone demo-only Scratch & Win campaign template library using mock data and local state."
      />
      <ScratchTemplateLibraryExperience />
    </>
  );
}