import { ChangeEvent, useMemo, useState } from "react";
import { ArrowLeft, Eye, RotateCcw, Save, Sparkles, Ticket } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScratchTemplateGallery } from "@/components/scratch-win/ScratchTemplateGallery";
import { createDraftFromTemplate, scratchCampaignTemplates } from "@/components/scratch-win/template-library-data";
import type { ScratchCampaignTemplate, ScratchTemplateDraft, ScratchTemplatePrize, TemplateLibraryMode } from "@/components/scratch-win/template-library-types";

export function ScratchTemplateLibraryExperience() {
  const [previewTemplate, setPreviewTemplate] = useState<ScratchCampaignTemplate>(scratchCampaignTemplates[0]);
  const [draft, setDraft] = useState<ScratchTemplateDraft | null>(null);
  const [mode, setMode] = useState<TemplateLibraryMode>("gallery");

  const selectedTemplate = useMemo(
    () => scratchCampaignTemplates.find((template) => template.id === draft?.templateId) ?? null,
    [draft]
  );

  const totalPrizeQuantity = useMemo(
    () => draft?.prizes.reduce((total, prize) => total + Math.max(0, prize.quantity), 0) ?? 0,
    [draft]
  );

  function useTemplate(template: ScratchCampaignTemplate) {
    setPreviewTemplate(template);
    setDraft(createDraftFromTemplate(template));
    setMode("draft");
  }

  function discardDraft() {
    if (!draft) {
      setMode("gallery");
      return;
    }

    if (window.confirm("Discard this local demo draft? Nothing has been saved or activated.")) {
      setDraft(null);
      setMode("gallery");
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
        <header className="grid gap-6 rounded-[2rem] border border-border bg-card p-6 shadow-sm lg:grid-cols-[1.3fr_0.7fr] lg:p-8">
          <div>
            <Badge className="mb-4 bg-primary text-primary-foreground">DEMO ONLY / NOT LIVE</Badge>
            <h1 className="font-serif text-3xl font-bold tracking-tight sm:text-5xl">Royalty Scratch & Win template library</h1>
            <p className="mt-4 max-w-3xl text-base text-muted-foreground sm:text-lg">
              Select an illustrative campaign template, preview the suggested prizes, and create an editable local draft. Templates are mock data only and do not persist after reload.
            </p>
          </div>
          <Card className="border-primary/25 bg-primary/5">
            <CardContent className="space-y-3 p-5">
              <div className="flex items-center gap-2 font-semibold">
                <Sparkles className="h-5 w-5 text-primary" aria-hidden="true" />
                Add-on prototype status
              </div>
              <p className="text-sm text-muted-foreground">
                No campaign publishing, legal odds approval, billing, database persistence, voucher issuance, or live prize selection is active.
              </p>
            </CardContent>
          </Card>
        </header>

        {mode === "gallery" ? (
          <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
            <ScratchTemplateGallery
              templates={scratchCampaignTemplates}
              selectedTemplateId={previewTemplate.id}
              onPreviewTemplate={setPreviewTemplate}
              onUseTemplate={useTemplate}
            />
            <TemplatePreviewPanel template={previewTemplate} onUseTemplate={useTemplate} />
          </div>
        ) : null}

        {mode === "draft" && draft ? (
          <div className="space-y-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <Button type="button" variant="outline" onClick={() => setMode("gallery")} className="sm:w-fit">
                <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
                Back to template gallery
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
                    <Badge variant="outline">Local draft</Badge>
                    <Badge className="bg-primary text-primary-foreground">NOT SAVED</Badge>
                    {selectedTemplate ? <Badge variant="secondary">{selectedTemplate.name}</Badge> : null}
                  </div>
                  <CardTitle className="font-serif text-2xl">Editable campaign draft</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid gap-4 md:grid-cols-2">
                    <Field label="Campaign title" value={draft.campaignTitle} onChange={(value) => updateDraft("campaignTitle", value)} />
                    <Field label="Suggested duration" value={draft.duration} onChange={(value) => updateDraft("duration", value)} />
                    <div className="md:col-span-2">
                      <Label htmlFor="template-description">Campaign description</Label>
                      <Textarea
                        id="template-description"
                        value={draft.description}
                        onChange={(event: ChangeEvent<HTMLTextAreaElement>) => updateDraft("description", event.target.value)}
                        className="mt-2 min-h-24"
                      />
                    </div>
                    <Field label="Demo expiration rule" value={draft.expirationRule} onChange={(value) => updateDraft("expirationRule", value)} />
                    <Field label="Visual tone" value={draft.visualTone} onChange={(value) => updateDraft("visualTone", value)} />
                  </div>

                  <section className="space-y-3">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <h2 className="font-serif text-xl font-bold">Illustrative prizes</h2>
                        <p className="text-sm text-muted-foreground">Edit mock prize labels and quantities for this session only.</p>
                      </div>
                      <Badge variant="outline">{totalPrizeQuantity} demo units</Badge>
                    </div>
                    <div className="space-y-3">
                      {draft.prizes.map((prize) => (
                        <Card key={prize.id} className="border-dashed">
                          <CardContent className="grid gap-3 p-4 md:grid-cols-[1fr_110px]">
                            <div className="grid gap-3">
                              <Field label="Prize name" value={prize.name} onChange={(value) => updatePrize(prize.id, "name", value)} />
                              <Field label="Prize description" value={prize.description} onChange={(value) => updatePrize(prize.id, "description", value)} />
                              <Field label="Display value" value={prize.displayValue} onChange={(value) => updatePrize(prize.id, "displayValue", value)} />
                            </div>
                            <div>
                              <Label htmlFor={`${prize.id}-quantity`}>Quantity</Label>
                              <Input
                                id={`${prize.id}-quantity`}
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
                    </div>
                  </section>

                  <div className="rounded-2xl border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
                    <Save className="mr-2 inline h-4 w-4 text-primary" aria-hidden="true" />
                    This is a local prototype draft only. It is not stored, published, activated, billed, or connected to real vouchers.
                  </div>
                </CardContent>
              </Card>

              <DraftPreviewPanel draft={draft} totalPrizeQuantity={totalPrizeQuantity} />
            </div>
          </div>
        ) : null}
      </div>
    </main>
  );
}

function TemplatePreviewPanel({ template, onUseTemplate }: { template: ScratchCampaignTemplate; onUseTemplate: (template: ScratchCampaignTemplate) => void }) {
  return (
    <aside className="xl:sticky xl:top-6">
      <Card className="overflow-hidden">
        <div className="p-6 text-white" style={{ background: template.gradient }}>
          <Badge className="bg-white/20 text-white hover:bg-white/20">DEMO TEMPLATE</Badge>
          <h2 className="mt-8 font-serif text-3xl font-bold">{template.name}</h2>
          <p className="mt-3 text-sm opacity-90">{template.visualTone}</p>
        </div>
        <CardContent className="space-y-5 p-5">
          <p className="text-sm text-muted-foreground">{template.explanation}</p>
          <PreviewLine label="Suggested title" value={template.suggestedTitle} />
          <PreviewLine label="Duration" value={template.suggestedDuration} />
          <PreviewLine label="Expiration" value={template.expirationRule} />
          <div>
            <h3 className="font-semibold">Sample prizes</h3>
            <div className="mt-3 space-y-2">
              {template.prizes.map((prize) => (
                <div key={prize.id} className="rounded-xl border border-border p-3">
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-medium">{prize.name}</p>
                    <Badge variant="secondary">{prize.quantity}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{prize.description}</p>
                </div>
              ))}
            </div>
          </div>
          <Button type="button" onClick={() => onUseTemplate(template)} className="w-full">Use This Template</Button>
        </CardContent>
      </Card>
    </aside>
  );
}

function DraftPreviewPanel({ draft, totalPrizeQuantity }: { draft: ScratchTemplateDraft; totalPrizeQuantity: number }) {
  return (
    <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
      <Card className="overflow-hidden">
        <div className="p-5 text-white" style={{ background: "linear-gradient(135deg, #ff6f7d, #25364a)" }}>
          <Badge className="bg-white/20 text-white hover:bg-white/20">LIVE PREVIEW / DEMO ONLY</Badge>
          <h2 className="mt-8 font-serif text-2xl font-bold">{draft.campaignTitle || "Untitled demo campaign"}</h2>
          <p className="mt-2 text-sm opacity-90">{draft.description}</p>
        </div>
        <CardContent className="space-y-4 p-5">
          <PreviewLine label="Duration" value={draft.duration} />
          <PreviewLine label="Expiration" value={draft.expirationRule} />
          <PreviewLine label="Prize quantity" value={`${totalPrizeQuantity} illustrative units`} />
          <div className="rounded-[1.5rem] border border-border bg-background p-4">
            <div className="flex items-center gap-2">
              <Ticket className="h-5 w-5 text-primary" aria-hidden="true" />
              <h3 className="font-semibold">Customer scratch-card preview</h3>
            </div>
            <div className="mt-4 rounded-2xl border border-dashed border-primary/50 bg-primary/10 p-5 text-center">
              <Eye className="mx-auto h-8 w-8 text-primary" aria-hidden="true" />
              <p className="mt-3 font-serif text-xl font-bold">{draft.campaignTitle}</p>
              <p className="mt-2 text-sm text-muted-foreground">Tap, scratch, or reveal result. Simulated locally only.</p>
            </div>
          </div>
          <div>
            <h3 className="font-semibold">Demo terms</h3>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
              <li>No prize odds have been legally reviewed or activated.</li>
              <li>No vouchers are generated, stored, or redeemable.</li>
              <li>This draft disappears after reload unless manually recreated.</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </aside>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  const id = label.toLowerCase().replace(/[^a-z0-9]+/g, "-");

  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} value={value} onChange={(event: ChangeEvent<HTMLInputElement>) => onChange(event.target.value)} className="mt-2" />
    </div>
  );
}

function PreviewLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-muted/50 p-3">
      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{label}</p>
      <p className="mt-1 font-medium">{value}</p>
    </div>
  );
}