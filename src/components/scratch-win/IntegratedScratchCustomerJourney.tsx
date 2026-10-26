import { ChangeEvent, useMemo, useState } from "react";
import { ArrowLeft, Eye, RotateCcw, Save, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScratchTemplateGallery } from "@/components/scratch-win/ScratchTemplateGallery";
import { IntegratedScratchPreviewCard } from "@/components/scratch-win/IntegratedScratchPreviewCard";
import { createDraftFromTemplate, scratchCampaignTemplates } from "@/components/scratch-win/template-library-data";
import type { ScratchCampaignTemplate, ScratchTemplateDraft, ScratchTemplatePrize } from "@/components/scratch-win/template-library-types";

type JourneyStep = "templates" | "customize" | "preview";

export function IntegratedScratchCustomerJourney() {
  const [step, setStep] = useState<JourneyStep>("templates");
  const [previewTemplate, setPreviewTemplate] = useState<ScratchCampaignTemplate>(scratchCampaignTemplates[0]);
  const [draft, setDraft] = useState<ScratchTemplateDraft | null>(null);

  const totalPrizeQuantity = useMemo(
    () => draft?.prizes.reduce((total, prize) => total + Math.max(0, prize.quantity), 0) ?? 0,
    [draft]
  );

  const validationMessages = useMemo(() => {
    const messages: string[] = [];

    if (!draft?.campaignTitle.trim()) {
      messages.push("Campaign title is required for the preview.");
    }

    if (!draft?.description.trim()) {
      messages.push("Campaign description is required for customer context.");
    }

    if (!draft || draft.prizes.length === 0) {
      messages.push("At least one fictional prize is required.");
    }

    if (draft && totalPrizeQuantity <= 0) {
      messages.push("Prize quantities should include at least one illustrative unit.");
    }

    return messages;
  }, [draft, totalPrizeQuantity]);

  function selectTemplate(template: ScratchCampaignTemplate) {
    if (draft && !window.confirm("Switch templates and replace the current local draft? Nothing has been saved or activated.")) {
      return;
    }

    setPreviewTemplate(template);
    setDraft(createDraftFromTemplate(template));
    setStep("customize");
  }

  function discardDraft() {
    if (window.confirm("Discard this local demo draft and return to templates?")) {
      setDraft(null);
      setStep("templates");
    }
  }

  function updateDraft(field: keyof Omit<ScratchTemplateDraft, "templateId" | "prizes">, value: string) {
    setDraft((current) => current ? { ...current, [field]: value } : current);
  }

  function updatePrize(prizeId: string, field: keyof ScratchTemplatePrize, value: string) {
    setDraft((current) => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        prizes: current.prizes.map((prize) => {
          if (prize.id !== prizeId) {
            return prize;
          }

          if (field === "quantity") {
            return { ...prize, quantity: Math.max(0, Number(value) || 0) };
          }

          return { ...prize, [field]: value };
        })
      };
    });
  }

  return (
    <main className="min-h-screen bg-background px-4 py-8 text-foreground sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <header className="grid gap-6 rounded-[2rem] border border-border bg-card p-6 shadow-sm lg:grid-cols-[1.2fr_0.8fr] lg:p-8">
          <div>
            <Badge className="mb-4 bg-primary text-primary-foreground">DEMO ONLY — NOT LIVE</Badge>
            <h1 className="font-serif text-3xl font-bold tracking-tight sm:text-5xl">Scratch & Win customer journey demo</h1>
            <p className="mt-4 max-w-3xl text-base text-muted-foreground sm:text-lg">
              Choose a campaign template, customize a local draft, and preview the realistic scratch-card customer experience. Nothing is saved, issued, published, or redeemable.
            </p>
          </div>
          <Card className="border-primary/25 bg-primary/5">
            <CardContent className="space-y-3 p-5">
              <div className="flex items-center gap-2 font-semibold">
                <Sparkles className="h-5 w-5 text-primary" aria-hidden="true" />
                Prototype boundaries
              </div>
              <p className="text-sm text-muted-foreground">
                Uses existing template mock data and the existing canvas scratch hook. No database, billing, voucher issuance, stamp logic, or production integration is active.
              </p>
            </CardContent>
          </Card>
        </header>

        <StepRail step={step} />

        {step === "templates" ? (
          <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
            <ScratchTemplateGallery
              templates={scratchCampaignTemplates}
              selectedTemplateId={previewTemplate.id}
              onPreviewTemplate={setPreviewTemplate}
              onUseTemplate={selectTemplate}
            />
            <TemplateSummary template={previewTemplate} onUseTemplate={selectTemplate} />
          </div>
        ) : null}

        {step === "customize" && draft ? (
          <div className="space-y-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <Button type="button" variant="outline" onClick={() => setStep("templates")} className="sm:w-fit">
                <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
                Choose another template
              </Button>
              <Button type="button" variant="destructive" onClick={discardDraft} className="sm:w-fit">
                <RotateCcw className="mr-2 h-4 w-4" aria-hidden="true" />
                Discard local draft
              </Button>
            </div>

            <div className="grid gap-6 lg:grid-cols-[1fr_420px]">
              <Card>
                <CardHeader>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">Editable local draft</Badge>
                    <Badge className="bg-primary text-primary-foreground">NOT SAVED</Badge>
                  </div>
                  <CardTitle className="font-serif text-2xl">Customize demo campaign</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid gap-4 md:grid-cols-2">
                    <Field label="Campaign title" value={draft.campaignTitle} onChange={(value) => updateDraft("campaignTitle", value)} />
                    <Field label="Visual tone / colors" value={draft.visualTone} onChange={(value) => updateDraft("visualTone", value)} />
                    <div className="md:col-span-2">
                      <Label htmlFor="integrated-description">Campaign description</Label>
                      <Textarea
                        id="integrated-description"
                        value={draft.description}
                        onChange={(event: ChangeEvent<HTMLTextAreaElement>) => updateDraft("description", event.target.value)}
                        className="mt-2 min-h-24"
                      />
                    </div>
                    <Field label="Demo duration" value={draft.duration} onChange={(value) => updateDraft("duration", value)} />
                    <Field label="Demo expiration rule" value={draft.expirationRule} onChange={(value) => updateDraft("expirationRule", value)} />
                  </div>

                  <section className="space-y-3">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <h2 className="font-serif text-xl font-bold">Fictional prizes</h2>
                        <p className="text-sm text-muted-foreground">These values feed the preview only and are never issued.</p>
                      </div>
                      <Badge variant="outline">{totalPrizeQuantity} demo units</Badge>
                    </div>
                    {draft.prizes.map((prize) => (
                      <Card key={prize.id} className="border-dashed">
                        <CardContent className="grid gap-3 p-4 md:grid-cols-[1fr_110px]">
                          <div className="grid gap-3">
                            <Field label="Prize name" value={prize.name} onChange={(value) => updatePrize(prize.id, "name", value)} />
                            <Field label="Prize description" value={prize.description} onChange={(value) => updatePrize(prize.id, "description", value)} />
                            <Field label="Display value" value={prize.displayValue} onChange={(value) => updatePrize(prize.id, "displayValue", value)} />
                          </div>
                          <div>
                            <Label htmlFor={`${prize.id}-integrated-quantity`}>Quantity</Label>
                            <Input
                              id={`${prize.id}-integrated-quantity`}
                              type="number"
                              min={0}
                              value={prize.quantity}
                              onChange={(event: ChangeEvent<HTMLInputElement>) => updatePrize(prize.id, "quantity", event.target.value)}
                              className="mt-2"
                            />
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </section>

                  {validationMessages.length > 0 ? (
                    <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
                      <p className="font-semibold">Preview warnings</p>
                      <ul className="mt-2 list-disc space-y-1 pl-5">
                        {validationMessages.map((message) => <li key={message}>{message}</li>)}
                      </ul>
                    </div>
                  ) : null}

                  <div className="flex flex-col gap-3 sm:flex-row">
                    <Button type="button" onClick={() => setStep("preview")} disabled={!draft}>
                      <Eye className="mr-2 h-4 w-4" aria-hidden="true" />
                      Preview customer scratch card
                    </Button>
                    <Button type="button" variant="outline" onClick={() => setStep("templates")}>Back to templates</Button>
                  </div>
                </CardContent>
              </Card>

              <DraftSummary draft={draft} totalPrizeQuantity={totalPrizeQuantity} />
            </div>
          </div>
        ) : null}

        {step === "preview" && draft ? (
          <div className="mx-auto max-w-2xl">
            <IntegratedScratchPreviewCard
              key={`${draft.templateId}-${draft.campaignTitle}-${draft.prizes.map((prize) => `${prize.id}:${prize.name}:${prize.quantity}`).join("|")}`}
              draft={draft}
              onBackToEdit={() => setStep("customize")}
              onChooseAnother={() => setStep("templates")}
            />
          </div>
        ) : null}
      </div>
    </main>
  );
}

function StepRail({ step }: { step: JourneyStep }) {
  const steps: { id: JourneyStep; label: string }[] = [
    { id: "templates", label: "Choose template" },
    { id: "customize", label: "Customize draft" },
    { id: "preview", label: "Scratch preview" }
  ];

  return (
    <nav aria-label="Scratch and Win demo journey" className="grid gap-3 sm:grid-cols-3">
      {steps.map((item) => (
        <div key={item.id} className={`rounded-2xl border p-4 text-sm ${step === item.id ? "border-primary bg-primary/10 text-foreground" : "border-border bg-card text-muted-foreground"}`}>
          <p className="font-semibold">{item.label}</p>
          <p className="mt-1 text-xs">DEMO ONLY / NOT LIVE</p>
        </div>
      ))}
    </nav>
  );
}

function TemplateSummary({ template, onUseTemplate }: { template: ScratchCampaignTemplate; onUseTemplate: (template: ScratchCampaignTemplate) => void }) {
  return (
    <aside className="xl:sticky xl:top-6">
      <Card className="overflow-hidden">
        <div className="p-6 text-white" style={{ background: template.gradient }}>
          <Badge className="bg-white/20 text-white hover:bg-white/20">Template preview</Badge>
          <h2 className="mt-8 font-serif text-3xl font-bold">{template.name}</h2>
          <p className="mt-3 text-sm opacity-90">{template.explanation}</p>
        </div>
        <CardContent className="space-y-4 p-5">
          <SummaryLine label="Suggested campaign" value={template.suggestedTitle} />
          <SummaryLine label="Duration" value={template.suggestedDuration} />
          <SummaryLine label="Demo expiration" value={template.expirationRule} />
          <Button type="button" onClick={() => onUseTemplate(template)} className="w-full">Use This Template</Button>
        </CardContent>
      </Card>
    </aside>
  );
}

function DraftSummary({ draft, totalPrizeQuantity }: { draft: ScratchTemplateDraft; totalPrizeQuantity: number }) {
  return (
    <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
      <Card className="overflow-hidden">
        <div className="p-5 text-white" style={{ background: "linear-gradient(135deg, #ff6f7d, #25364a)" }}>
          <Badge className="bg-white/20 text-white hover:bg-white/20">Local preview</Badge>
          <h2 className="mt-8 font-serif text-2xl font-bold">{draft.campaignTitle || "Untitled demo campaign"}</h2>
          <p className="mt-2 text-sm opacity-90">{draft.description || "Missing customer-facing description."}</p>
        </div>
        <CardContent className="space-y-4 p-5">
          <SummaryLine label="Visual tone" value={draft.visualTone} />
          <SummaryLine label="Duration" value={draft.duration} />
          <SummaryLine label="Prize quantity" value={`${totalPrizeQuantity} illustrative units`} />
          <div className="rounded-2xl border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
            <Save className="mr-2 inline h-4 w-4 text-primary" aria-hidden="true" />
            Draft values are held in local component state only and disappear after reload.
          </div>
        </CardContent>
      </Card>
    </aside>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  const id = `integrated-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;

  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} value={value} onChange={(event: ChangeEvent<HTMLInputElement>) => onChange(event.target.value)} className="mt-2" />
    </div>
  );
}

function SummaryLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-muted/50 p-3">
      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{label}</p>
      <p className="mt-1 font-medium">{value || "Not provided"}</p>
    </div>
  );
}