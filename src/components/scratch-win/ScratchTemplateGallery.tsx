import { CheckCircle2, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { ScratchCampaignTemplate } from "@/components/scratch-win/template-library-types";

interface ScratchTemplateGalleryProps {
  templates: ScratchCampaignTemplate[];
  selectedTemplateId: string | null;
  onPreviewTemplate: (template: ScratchCampaignTemplate) => void;
  onUseTemplate: (template: ScratchCampaignTemplate) => void;
}

export function ScratchTemplateGallery({ templates, selectedTemplateId, onPreviewTemplate, onUseTemplate }: ScratchTemplateGalleryProps) {
  return (
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {templates.map((template) => {
        const selected = selectedTemplateId === template.id;

        return (
          <Card key={template.id} className={`overflow-hidden border transition hover:-translate-y-1 hover:shadow-lg ${selected ? "border-primary shadow-md" : "border-border"}`}>
            <div className="h-28 p-4 text-white" style={{ background: template.gradient }}>
              <div className="flex items-start justify-between gap-3">
                <Badge className="bg-white/20 text-white hover:bg-white/20">{template.category}</Badge>
                {selected ? <CheckCircle2 className="h-5 w-5" aria-hidden="true" /> : <Sparkles className="h-5 w-5" aria-hidden="true" />}
              </div>
              <p className="mt-6 text-sm font-semibold" style={{ color: template.accent === "#ffffff" ? "#ffffff" : template.accent }}>
                {template.visualTone}
              </p>
            </div>
            <CardContent className="space-y-4 p-5">
              <div>
                <h3 className="font-serif text-xl font-bold">{template.name}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{template.explanation}</p>
              </div>
              <div className="grid gap-2 text-sm">
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">Duration</span>
                  <span className="font-medium">{template.suggestedDuration}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">Demo prizes</span>
                  <span className="font-medium">{template.prizes.length}</span>
                </div>
              </div>
              <div className="grid gap-2">
                <Button type="button" onClick={() => onUseTemplate(template)}>Use This Template</Button>
                <Button type="button" variant="outline" onClick={() => onPreviewTemplate(template)}>Preview details</Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </section>
  );
}