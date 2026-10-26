import { useMemo, useState } from "react";
import { AlertCircle, ArrowLeft, ArrowRight, CheckCircle2, Image, RotateCcw, Sparkles } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { EnhancedScratchLivePreview } from "@/components/scratch-win/EnhancedScratchLivePreview";
import { EnhancedScratchPrizeManager } from "@/components/scratch-win/EnhancedScratchPrizeManager";
import { demoBusinessOperator, enhancedScratchThemes, initialEnhancedBuilderState } from "@/components/scratch-win/enhanced-builder-demo-data";
import type { EnhancedBuilderState, ValidationResult } from "@/components/scratch-win/enhanced-builder-types";
import { prizeTypeLabels } from "@/components/scratch-win/enhanced-builder-types";

const steps = ["Details", "Schedule", "Prizes", "Experience", "Review"];

function createInitialDraft(): EnhancedBuilderState {
  return {
    ...initialEnhancedBuilderState,
    prizes: initialEnhancedBuilderState.prizes.map((prize) => ({ ...prize }))
  };
}

function validateDraft(draft: EnhancedBuilderState): ValidationResult {
  const stepErrors: Record<number, string[]> = { 0: [], 1: [], 2: [], 3: [], 4: [] };

  if (!draft.campaignName.trim()) stepErrors[0].push("Campaign name is required.");
  if (!draft.description.trim()) stepErrors[0].push("Short description is required.");
  if (!draft.businessName.trim()) stepErrors[0].push("Business display name is required.");

  if (!draft.startDateTime) stepErrors[1].push("Start date and time are required.");
  if (!draft.endDateTime) stepErrors[1].push("End date and time are required.");
  if (draft.startDateTime && draft.endDateTime && new Date(draft.endDateTime).getTime() <= new Date(draft.startDateTime).getTime()) {
    stepErrors[1].push("End date and time must be later than the start.");
  }

  if (draft.prizes.length === 0) stepErrors[2].push("At least one demo prize is required.");
  draft.prizes.forEach((prize, index) => {
    if (!prize.name.trim()) stepErrors[2].push(`Prize ${index + 1} needs a name.`);
    if (!prize.description.trim()) stepErrors[2].push(`Prize ${index + 1} needs a description.`);
    if (Number(prize.quantity) < 0 || Number.isNaN(Number(prize.quantity))) stepErrors[2].push(`Prize ${index + 1} quantity must be zero or higher.`);
    if (Number(prize.expirationDays) < 0 || Number.isNaN(Number(prize.expirationDays))) stepErrors[2].push(`Prize ${index + 1} expiration must be zero or higher.`);
  });

  if (!draft.cardTitle.trim()) stepErrors[3].push("Customer card title is required.");
  if (!draft.cardSubtitle.trim()) stepErrors[3].push("Customer card subtitle is required.");
  if (!draft.terms.trim()) stepErrors[3].push("Demo terms are required.");

  stepErrors[4] = [...stepErrors[0], ...stepErrors[1], ...stepErrors[2], ...stepErrors[3]];

  return {
    stepErrors,
    allErrors: stepErrors[4]
  };
}

function getDemoStatus(draft: EnhancedBuilderState) {
  if (!draft.startDateTime || !draft.endDateTime) return "Demo draft";
  const now = new Date("2026-10-26T12:56:22Z").getTime();
  const start = new Date(draft.startDateTime).getTime();
  const end = new Date(draft.endDateTime).getTime();

  if (Number.isNaN(start) || Number.isNaN(end) || end <= start) return "Demo draft";
  if (now < start) return "Demo scheduled";
  if (now > end) return "Demo ended";
  return "Demo active preview";
}

export function EnhancedScratchCampaignWizard() {
  const [draft, setDraft] = useState<EnhancedBuilderState>(() => createInitialDraft());
  const [currentStep, setCurrentStep] = useState(0);
  const [previewMode, setPreviewMode] = useState<"mobile" | "desktop">("mobile");
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const validation = useMemo(() => validateDraft(draft), [draft]);
  const selectedTheme = enhancedScratchThemes.find((theme) => theme.id === draft.themeId) ?? enhancedScratchThemes[0];
  const status = getDemoStatus(draft);
  const totalQuantity = draft.prizes.reduce((sum, prize) => sum + Math.max(0, Number(prize.quantity) || 0), 0);

  const updateDraft = <Key extends keyof EnhancedBuilderState>(field: Key, value: EnhancedBuilderState[Key]) => {
    setDraft((current) => ({ ...current, [field]: value }));
  };

  const goToStep = (step: number) => {
    setCurrentStep(Math.max(0, Math.min(steps.length - 1, step)));
  };

  const resetDemo = () => {
    setDraft(createInitialDraft());
    setCurrentStep(0);
    setPreviewMode("mobile");
    setShowResetConfirm(false);
  };

  return (
    <main className="min-h-screen bg-background text-foreground">
      <section className="border-b border-border bg-card">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="bg-primary text-primary-foreground">DEMO ONLY / NOT LIVE</Badge>
            <Badge variant="outline">Separate enhanced builder route</Badge>
          </div>
          <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_320px] lg:items-end">
            <div className="space-y-3">
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-primary">Royalty Scratch & Win</p>
              <h1 className="font-serif text-4xl font-bold tracking-tight sm:text-5xl">Guided campaign builder prototype</h1>
              <p className="max-w-3xl text-base text-muted-foreground sm:text-lg">
                Create a simulated campaign, manage multiple demo prizes, and preview the customer experience without saving or activating anything.
              </p>
            </div>
            <Card className="border-primary/20 bg-background">
              <CardContent className="space-y-2 p-4 text-sm">
                <p className="font-semibold">{demoBusinessOperator.name}</p>
                <p className="text-muted-foreground">{demoBusinessOperator.role} · {demoBusinessOperator.location}</p>
                <p className="text-xs text-muted-foreground">Mock operator data only. No authentication or database lookup occurs.</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[1fr_430px] lg:px-8">
        <div className="space-y-6">
          <Card className="border-border bg-card">
            <CardContent className="p-4">
              <div className="grid gap-2 sm:grid-cols-5">
                {steps.map((step, index) => {
                  const hasErrors = validation.stepErrors[index]?.length > 0;
                  const isActive = currentStep === index;

                  return (
                    <button
                      key={step}
                      type="button"
                      onClick={() => goToStep(index)}
                      className={`rounded-2xl border px-3 py-3 text-left text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                        isActive ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background text-foreground hover:border-primary/40"
                      }`}
                    >
                      <span className="block text-xs opacity-75">Step {index + 1}</span>
                      <span className="font-semibold">{step}</span>
                      {hasErrors ? <span className="mt-1 block text-xs opacity-80">Needs attention</span> : null}
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card className="border-primary/20 bg-card">
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <CardTitle className="font-serif text-2xl">{steps[currentStep]}</CardTitle>
                  <p className="mt-1 text-sm text-muted-foreground">All fields are local state and reset on reload.</p>
                </div>
                <Badge variant="outline">{status}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              {validation.stepErrors[currentStep]?.length ? (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Demo validation</AlertTitle>
                  <AlertDescription>{validation.stepErrors[currentStep].join(" ")}</AlertDescription>
                </Alert>
              ) : null}

              {currentStep === 0 ? (
                <CampaignDetailsStep draft={draft} updateDraft={updateDraft} />
              ) : null}

              {currentStep === 1 ? (
                <ScheduleStep draft={draft} updateDraft={updateDraft} status={status} />
              ) : null}

              {currentStep === 2 ? (
                <EnhancedScratchPrizeManager prizes={draft.prizes} onChange={(prizes) => updateDraft("prizes", prizes)} />
              ) : null}

              {currentStep === 3 ? (
                <CustomerExperienceStep draft={draft} updateDraft={updateDraft} selectedThemeName={selectedTheme.name} />
              ) : null}

              {currentStep === 4 ? (
                <ReviewStep draft={draft} validation={validation} status={status} totalQuantity={totalQuantity} />
              ) : null}

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-5">
                <Button type="button" variant="outline" onClick={() => goToStep(currentStep - 1)} disabled={currentStep === 0}>
                  <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
                  Back
                </Button>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="outline" onClick={() => setShowResetConfirm(true)}>
                    <RotateCcw className="mr-2 h-4 w-4" aria-hidden="true" />
                    Reset demo
                  </Button>
                  <Button type="button" onClick={() => goToStep(currentStep + 1)} disabled={currentStep === steps.length - 1}>
                    Next
                    <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
                  </Button>
                </div>
              </div>

              {showResetConfirm ? (
                <div className="rounded-2xl border border-primary/30 bg-primary/10 p-4">
                  <p className="font-semibold">Reset the local demo?</p>
                  <p className="mt-1 text-sm text-muted-foreground">This clears only the current browser-session draft. Nothing has been saved anywhere.</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button type="button" onClick={resetDemo}>Confirm reset</Button>
                    <Button type="button" variant="outline" onClick={() => setShowResetConfirm(false)}>Cancel</Button>
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>

        <EnhancedScratchLivePreview
          draft={draft}
          theme={selectedTheme}
          previewMode={previewMode}
          validation={validation}
          onPreviewModeChange={setPreviewMode}
          status={status}
        />
      </section>
    </main>
  );
}

function CampaignDetailsStep({ draft, updateDraft }: { draft: EnhancedBuilderState; updateDraft: <Key extends keyof EnhancedBuilderState>(field: Key, value: EnhancedBuilderState[Key]) => void }) {
  return (
    <div className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor="enhanced-campaign-name">Campaign name</Label>
        <Input id="enhanced-campaign-name" value={draft.campaignName} onChange={(event) => updateDraft("campaignName", event.target.value)} />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="enhanced-description">Short description</Label>
        <Textarea id="enhanced-description" value={draft.description} onChange={(event) => updateDraft("description", event.target.value)} rows={3} />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="enhanced-visual">Optional campaign image or visual placeholder</Label>
        <div className="grid gap-3 rounded-2xl border border-dashed border-primary/30 bg-muted p-4 sm:grid-cols-[80px_1fr] sm:items-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-background text-primary">
            <Image className="h-8 w-8" aria-hidden="true" />
          </div>
          <Input id="enhanced-visual" value={draft.visualNote} onChange={(event) => updateDraft("visualNote", event.target.value)} />
        </div>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="enhanced-business">Business display name</Label>
        <Input id="enhanced-business" value={draft.businessName} onChange={(event) => updateDraft("businessName", event.target.value)} />
      </div>
    </div>
  );
}

function ScheduleStep({ draft, updateDraft, status }: { draft: EnhancedBuilderState; updateDraft: <Key extends keyof EnhancedBuilderState>(field: Key, value: EnhancedBuilderState[Key]) => void; status: string }) {
  return (
    <div className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="enhanced-start">Start date and time</Label>
          <Input id="enhanced-start" type="datetime-local" value={draft.startDateTime} onChange={(event) => updateDraft("startDateTime", event.target.value)} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="enhanced-end">End date and time</Label>
          <Input id="enhanced-end" type="datetime-local" value={draft.endDateTime} onChange={(event) => updateDraft("endDateTime", event.target.value)} />
        </div>
      </div>
      <div className="rounded-2xl border border-border bg-muted p-4">
        <p className="font-semibold">Demo status</p>
        <p className="mt-1 text-sm text-muted-foreground">{status}. Status is calculated locally from form values and is not a live campaign state.</p>
      </div>
    </div>
  );
}

function CustomerExperienceStep({ draft, updateDraft, selectedThemeName }: { draft: EnhancedBuilderState; updateDraft: <Key extends keyof EnhancedBuilderState>(field: Key, value: EnhancedBuilderState[Key]) => void; selectedThemeName: string }) {
  return (
    <div className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor="enhanced-card-title">Card title</Label>
        <Input id="enhanced-card-title" value={draft.cardTitle} onChange={(event) => updateDraft("cardTitle", event.target.value)} />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="enhanced-card-subtitle">Card subtitle</Label>
        <Textarea id="enhanced-card-subtitle" value={draft.cardSubtitle} onChange={(event) => updateDraft("cardSubtitle", event.target.value)} rows={2} />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="enhanced-theme">Mock color theme</Label>
        <select
          id="enhanced-theme"
          className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
          value={draft.themeId}
          onChange={(event) => updateDraft("themeId", event.target.value as EnhancedBuilderState["themeId"])}
        >
          {enhancedScratchThemes.map((theme) => (
            <option key={theme.id} value={theme.id}>{theme.name}</option>
          ))}
        </select>
        <p className="text-sm text-muted-foreground">Selected: {selectedThemeName}</p>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="enhanced-terms">Demo campaign terms</Label>
        <Textarea id="enhanced-terms" value={draft.terms} onChange={(event) => updateDraft("terms", event.target.value)} rows={3} />
      </div>
    </div>
  );
}

function ReviewStep({ draft, validation, status, totalQuantity }: { draft: EnhancedBuilderState; validation: ValidationResult; status: string; totalQuantity: number }) {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <ReviewMetric label="Demo status" value={status} />
        <ReviewMetric label="Prize types" value={String(draft.prizes.length)} />
        <ReviewMetric label="Total quantity" value={String(totalQuantity)} />
      </div>
      <div className="rounded-2xl border border-border p-4">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-primary" aria-hidden="true" />
          <p className="font-semibold">Campaign summary</p>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">{draft.campaignName} · {draft.businessName}</p>
        <p className="mt-1 text-sm text-muted-foreground">{draft.description}</p>
      </div>
      <div className="space-y-2">
        {draft.prizes.map((prize) => (
          <div key={prize.id} className="rounded-2xl border border-border p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-semibold">{prize.name || "Unnamed prize"}</p>
              <Badge variant="outline">{prizeTypeLabels[prize.type]}</Badge>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{prize.description || "Missing description."}</p>
            <p className="mt-2 text-xs text-muted-foreground">{Math.max(0, Number(prize.quantity) || 0)} demo quantity · expires after {Math.max(0, Number(prize.expirationDays) || 0)} days</p>
          </div>
        ))}
      </div>
      {validation.allErrors.length > 0 ? (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Incomplete demo setup</AlertTitle>
          <AlertDescription>{validation.allErrors.join(" ")}</AlertDescription>
        </Alert>
      ) : (
        <Alert>
          <Sparkles className="h-4 w-4" />
          <AlertTitle>Ready for local demo preview</AlertTitle>
          <AlertDescription>This is still not live, saved, redeemable, billable, or connected to any database.</AlertDescription>
        </Alert>
      )}
    </div>
  );
}

function ReviewMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-muted p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 font-serif text-2xl font-bold">{value}</p>
    </div>
  );
}