import { useCallback, useMemo, useState } from "react";
import { RotateCcw, Sparkles, Ticket } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { ScratchTemplateDraft } from "@/components/scratch-win/template-library-types";
import { useRealisticScratchSurface } from "@/components/scratch-win/useRealisticScratchSurface";

interface IntegratedScratchPreviewCardProps {
  draft: ScratchTemplateDraft;
  onBackToEdit: () => void;
  onChooseAnother: () => void;
}

export function IntegratedScratchPreviewCard({ draft, onBackToEdit, onChooseAnother }: IntegratedScratchPreviewCardProps) {
  const [completionCount, setCompletionCount] = useState(0);

  const resultPrize = useMemo(() => {
    const prize = draft.prizes.find((item) => item.quantity > 0) ?? draft.prizes[0];

    return {
      title: prize?.name || "Demo surprise preview",
      message: prize?.description || "This fictional result is shown for prototype review only.",
      code: `DEMO-${draft.templateId.toUpperCase().replace(/[^A-Z0-9]+/g, "-").slice(0, 14)}-042`,
      value: prize?.displayValue || "Demo value"
    };
  }, [draft.prizes, draft.templateId]);

  const handleComplete = useCallback(() => {
    setCompletionCount((count) => count + 1);
  }, []);

  const {
    canvasRef,
    progress,
    isReady,
    isScratching,
    isComplete,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    revealAccessibly,
    resetSurface
  } = useRealisticScratchSurface({
    threshold: 60,
    brushRadius: 21,
    onComplete: handleComplete
  });

  function resetPreview() {
    setCompletionCount(0);
    resetSurface();
  }

  return (
    <Card className="overflow-hidden border-primary/20 shadow-xl">
      <div className="p-5 text-white" style={{ background: "linear-gradient(135deg, #ff6f7d, #25364a)" }}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Badge className="bg-white/20 text-white hover:bg-white/20">DEMO ONLY — NOT LIVE</Badge>
          <Badge className="bg-white/20 text-white hover:bg-white/20">{isComplete ? "Result revealed" : "Customer preview"}</Badge>
        </div>
        <p className="mt-6 text-xs uppercase tracking-[0.25em] text-white/75">Royalty Scratch & Win</p>
        <h2 className="mt-2 font-serif text-3xl font-bold">{draft.campaignTitle || "Untitled demo campaign"}</h2>
        <p className="mt-3 max-w-xl text-sm text-white/85">{draft.description || "Add a campaign description before testing the customer preview."}</p>
      </div>

      <CardContent className="space-y-5 p-5">
        <div className="rounded-3xl border border-dashed border-primary/30 bg-muted p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <p className="font-medium">Scratch here to reveal your fictional surprise.</p>
              <p className="text-xs text-muted-foreground">
                {isReady ? "Ready for mouse, touch, or keyboard-accessible reveal." : "Preparing realistic scratch surface..."}
              </p>
            </div>
            <Sparkles className={`h-5 w-5 text-primary ${isScratching ? "animate-pulse" : ""}`} aria-hidden="true" />
          </div>

          <div
            className="relative min-h-72 overflow-hidden rounded-[1.5rem] border border-border bg-background shadow-inner"
            aria-label={isComplete ? `Demo result revealed: ${resultPrize.title}` : "Scratch card preview. Use pointer input or the Reveal Result button."}
          >
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center">
              <Ticket className="h-11 w-11 text-primary" aria-hidden="true" />
              <div>
                <p className="font-serif text-2xl font-bold">{resultPrize.title}</p>
                <p className="mt-2 text-sm text-muted-foreground">{resultPrize.message}</p>
              </div>
              <div className="rounded-2xl bg-muted px-4 py-3">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Fictional demo code</p>
                <p className="mt-1 font-mono text-lg font-bold">{resultPrize.code}</p>
              </div>
            </div>

            {!isComplete ? (
              <div className="absolute inset-0">
                <canvas
                  ref={canvasRef}
                  className="h-full w-full cursor-grab touch-none select-none active:cursor-grabbing"
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  onPointerCancel={handlePointerUp}
                  onPointerLeave={handlePointerUp}
                  aria-hidden="true"
                />
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-6 text-center">
                  <div className={`rounded-full border border-white/70 bg-white/75 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition ${isScratching ? "opacity-0" : "opacity-100"}`}>
                    Scratch here to reveal your surprise
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Scratch removed</span>
              <span>{progress}%</span>
            </div>
            <Progress value={progress} />
            <p className="text-xs text-muted-foreground">The result appears after 60% is scratched, or through the accessible reveal button.</p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Button type="button" onClick={revealAccessibly} disabled={isComplete}>Reveal Result</Button>
          <Button type="button" variant="outline" onClick={resetPreview}>
            <RotateCcw className="mr-2 h-4 w-4" aria-hidden="true" />
            Reset scratch card
          </Button>
          <Button type="button" variant="outline" onClick={onBackToEdit}>Return and edit draft</Button>
          <Button type="button" variant="secondary" onClick={onChooseAnother}>Choose another template</Button>
        </div>

        {isComplete ? (
          <div className="rounded-3xl border border-border bg-background p-4" aria-live="polite">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="bg-primary text-primary-foreground">DEMO VOUCHER</Badge>
              <Badge variant="outline">NOT REDEEMABLE</Badge>
            </div>
            <div className="mt-4 space-y-2 text-sm text-muted-foreground">
              <p className="font-serif text-2xl font-bold text-foreground">{resultPrize.title}</p>
              <p>Display value: {resultPrize.value}</p>
              <p>Example expiration: {draft.expirationRule}</p>
              <p>Show this fictional preview during prototype review only. No voucher, prize, stamp, reward, or redemption was created.</p>
              <p className="font-medium text-foreground">Reveal completions this session: {completionCount}</p>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}