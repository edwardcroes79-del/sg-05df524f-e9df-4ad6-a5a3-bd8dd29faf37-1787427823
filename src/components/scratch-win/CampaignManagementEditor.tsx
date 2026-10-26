import { ChangeEvent, useMemo, useState } from "react";
import { Plus, Save, Trash2, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { scratchCampaignTemplates } from "@/components/scratch-win/template-library-data";
import type { ScratchCampaignTemplate, ScratchTemplatePrize } from "@/components/scratch-win/template-library-types";
import { createManagedCampaignFromTemplate, validateManagedCampaign } from "@/components/scratch-win/campaign-management-data";
import type { ManagedScratchCampaign } from "@/components/scratch-win/campaign-management-types";

interface CampaignManagementEditorProps {
  initialCampaign: ManagedScratchCampaign;
  onSave: (campaign: ManagedScratchCampaign) => void;
  onCancel: () => void;
}

export function CampaignManagementEditor({ initialCampaign, onSave, onCancel }: CampaignManagementEditorProps) {
  const [campaign, setCampaign] = useState<ManagedScratchCampaign>(initialCampaign);
  const validation = useMemo(() => validateManagedCampaign(campaign), [campaign]);
  const totalPrizeQuantity = useMemo(() => campaign.prizes.reduce((total, prize) => total + Math.max(0, prize.quantity), 0), [campaign.prizes]);

  function updateCampaign(field: keyof ManagedScratchCampaign, value: string) {
    setCampaign((current) => ({ ...current, [field]: value, updatedAt: "2026-10-26T13:32:39Z" }));
  }

  function selectTemplate(templateId: string) {
    const template = scratchCampaignTemplates.find((item) => item.id === templateId);
    if (!template) {
      return;
    }

    if (!window.confirm("Apply this template to the local draft? Current local fields and prizes will be replaced.")) {
      return;
    }

    const replacement = createManagedCampaignFromTemplate(template, campaign.id, campaign.status);
    setCampaign({
      ...replacement,
      createdAt: campaign.createdAt,
      updatedAt: "2026-10-26T13:32:39Z"
    });
  }

  function updatePrize(prizeId: string, field: keyof ScratchTemplatePrize, value: string) {
    setCampaign((current) => ({
      ...current,
      updatedAt: "2026-10-26T13:32:39Z",
      prizes: current.prizes.map((prize) => {
        if (prize.id !== prizeId) {
          return prize;
        }

        if (field === "quantity") {
          return { ...prize, quantity: Math.max(0, Number(value) || 0) };
        }

        return { ...prize, [field]: value };
      })
    }));
  }

  function addPrize() {
    setCampaign((current) => ({
      ...current,
      prizes: [
        ...current.prizes,
        {
          id: `${current.id}-prize-${current.prizes.length + 1}`,
          name: "New fictional prize",
          description: "Describe a demo-only prize preview.",
          quantity: 1,
          displayValue: "Demo value"
        }
      ]
    }));
  }

  function removePrize(prizeId: string) {
    if (!window.confirm("Remove this fictional prize from the local draft?")) {
      return;
    }

    setCampaign((current) => ({
      ...current,
      prizes: current.prizes.filter((prize) => prize.id !== prizeId)
    }));
  }

  function save() {
    const nextValidation = validateManagedCampaign(campaign);
    if (!nextValidation.isValid) {
      return;
    }

    onSave({ ...campaign, updatedAt: "2026-10-26T13:32:39Z" });
  }

  return (
    <Card className="border-primary/20 shadow-lg">
      <CardHeader>
        <div className="flex flex-wrap items-center gap-2">
          <Badge className="bg-primary text-primary-foreground">DEMO ONLY — NOT LIVE</Badge>
          <Badge variant="outline">{campaign.status}</Badge>
        </div>
        <CardTitle className="font-serif text-2xl">Campaign draft editor</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          <FormField label="Campaign name" value={campaign.campaignName} onChange={(value) => updateCampaign("campaignName", value)} />
          <FormField label="Customer-facing title" value={campaign.customerTitle} onChange={(value) => updateCampaign("customerTitle", value)} />
          <div className="md:col-span-2">
            <Label htmlFor="managed-description">Description</Label>
            <Textarea id="managed-description" value={campaign.description} onChange={(event: ChangeEvent<HTMLTextAreaElement>) => updateCampaign("description", event.target.value)} className="mt-2 min-h-24" />
          </div>
          <div>
            <Label htmlFor="managed-template">Template</Label>
            <select id="managed-template" value={campaign.templateId} onChange={(event) => selectTemplate(event.target.value)} className="mt-2 h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
              {scratchCampaignTemplates.map((template: ScratchCampaignTemplate) => (
                <option key={template.id} value={template.id}>{template.name}</option>
              ))}
            </select>
          </div>
          <FormField label="Visual tone / theme" value={campaign.visualTone} onChange={(value) => updateCampaign("visualTone", value)} />
          <FormField label="Gradient CSS" value={campaign.gradient} onChange={(value) => updateCampaign("gradient", value)} />
          <FormField label="Accent color" value={campaign.accent} onChange={(value) => updateCampaign("accent", value)} />
          <FormField label="Optional start date" type="date" value={campaign.startDate} onChange={(value) => updateCampaign("startDate", value)} />
          <FormField label="Optional end date" type="date" value={campaign.endDate} onChange={(value) => updateCampaign("endDate", value)} />
        </div>

        <section className="space-y-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="font-serif text-xl font-bold">Fictional prize inventory</h3>
              <p className="text-sm text-muted-foreground">{totalPrizeQuantity} illustrative units configured locally.</p>
            </div>
            <Button type="button" variant="outline" onClick={addPrize}>
              <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
              Add prize
            </Button>
          </div>

          {campaign.prizes.map((prize) => (
            <Card key={prize.id} className="border-dashed">
              <CardContent className="grid gap-3 p-4 lg:grid-cols-[1fr_110px_auto]">
                <div className="grid gap-3 md:grid-cols-3">
                  <FormField label="Prize name" value={prize.name} onChange={(value) => updatePrize(prize.id, "name", value)} />
                  <FormField label="Description" value={prize.description} onChange={(value) => updatePrize(prize.id, "description", value)} />
                  <FormField label="Display value" value={prize.displayValue} onChange={(value) => updatePrize(prize.id, "displayValue", value)} />
                </div>
                <FormField label="Quantity" type="number" value={String(prize.quantity)} onChange={(value) => updatePrize(prize.id, "quantity", value)} />
                <Button type="button" variant="outline" onClick={() => removePrize(prize.id)} className="self-end">
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                  <span className="sr-only">Remove prize</span>
                </Button>
              </CardContent>
            </Card>
          ))}
        </section>

        {!validation.isValid ? (
          <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
            <p className="font-semibold">Fix these local draft issues before saving:</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              {validation.messages.map((message) => <li key={message}>{message}</li>)}
            </ul>
          </div>
        ) : null}

        <div className="flex flex-col gap-3 sm:flex-row">
          <Button type="button" onClick={save} disabled={!validation.isValid}>
            <Save className="mr-2 h-4 w-4" aria-hidden="true" />
            Save local draft
          </Button>
          <Button type="button" variant="outline" onClick={onCancel}>
            <X className="mr-2 h-4 w-4" aria-hidden="true" />
            Cancel without saving
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function FormField({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (value: string) => void; type?: string }) {
  const id = `campaign-management-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;

  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} type={type} min={type === "number" ? 0 : undefined} value={value} onChange={(event: ChangeEvent<HTMLInputElement>) => onChange(event.target.value)} className="mt-2" />
    </div>
  );
}