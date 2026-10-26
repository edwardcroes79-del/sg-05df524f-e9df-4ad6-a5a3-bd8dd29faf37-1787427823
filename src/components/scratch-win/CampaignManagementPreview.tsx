import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { IntegratedScratchPreviewCard } from "@/components/scratch-win/IntegratedScratchPreviewCard";
import type { ManagedScratchCampaign } from "@/components/scratch-win/campaign-management-types";
import { toScratchTemplateDraft } from "@/components/scratch-win/campaign-management-types";

interface CampaignManagementPreviewProps {
  campaign: ManagedScratchCampaign;
  onBackToManage: () => void;
  onEdit: () => void;
}

export function CampaignManagementPreview({ campaign, onBackToManage, onEdit }: CampaignManagementPreviewProps) {
  const draft = toScratchTemplateDraft(campaign);

  return (
    <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
      <Card className="h-fit border-primary/20">
        <CardContent className="space-y-4 p-5">
          <Badge className="bg-primary text-primary-foreground">DEMO ONLY — NOT LIVE</Badge>
          <div>
            <h2 className="font-serif text-2xl font-bold">{campaign.campaignName}</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              This preview is a new-file-only alternative because the existing customer route does not accept external draft props without editing that existing route.
            </p>
          </div>
          <div className="rounded-2xl bg-muted/50 p-4 text-sm">
            <p className="text-muted-foreground">Local status</p>
            <p className="font-semibold">{campaign.status}</p>
          </div>
          <div className="rounded-2xl bg-muted/50 p-4 text-sm">
            <p className="text-muted-foreground">Schedule</p>
            <p className="font-semibold">{campaign.startDate || "No start date"} → {campaign.endDate || "No end date"}</p>
          </div>
          <div className="rounded-2xl bg-muted/50 p-4 text-sm">
            <p className="text-muted-foreground">Fictional prizes</p>
            <p className="font-semibold">{campaign.prizes.length} prize types</p>
          </div>
        </CardContent>
      </Card>
      <IntegratedScratchPreviewCard draft={draft} onBackToEdit={onEdit} onChooseAnother={onBackToManage} />
    </div>
  );
}