import { useCallback, useState } from "react";
import Link from "next/link";
import { RotateCcw, ShieldCheck, Sparkles, Ticket } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { realisticScratchPrize } from "@/components/scratch-win/realistic-scratch-demo-data";
import { useRealisticScratchSurface } from "@/components/scratch-win/useRealisticScratchSurface";

export function RealisticScratchCardDemo() {
  const [hasAnnouncedCompletion, setHasAnnouncedCompletion] = useState(false);

  const handleComplete = useCallback(() => {
    setHasAnnouncedCompletion(true);
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

  function replayDemo() {
    setHasAnnouncedCompletion(false);
    resetSurface();
  }

  return (
    <main className="min-h-screen bg-background px-4 py-6 text-foreground sm:px-6 lg:py-10">
      <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
        <section className="space-y-5">
          <Button asChild variant="outline" size="sm" className="w-fit">
            <Link href="/scratch-win/demo">Original scratch demo</Link>
          </Button>

          <div className="rounded-[2rem] border border-border bg-card p-6 shadow-sm">
            <Badge className="bg-primary text-primary-foreground">DEMO ONLY / NOT LIVE</Badge>
            <p className="mt-6 text-sm font-semibold uppercase tracking-[0.3em] text-primary">Royalty Scratch & Win</p>
            <h1 className="mt-3 font-serif text-4xl font-bold tracking-tight sm:text-5xl">Realistic scratch-off prototype</h1>
            <p className="mt-4 text-base text-muted-foreground">
              A standalone canvas-based customer experience using mock data and local state only. It does not create campaigns, vouchers, stamps, rewards, or redemptions.
            </p>
          </div>

          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="space-y-3 p-5">
              <div className="flex items-center gap-2 font-semibold">
                <ShieldCheck className="h-5 w-5 text-primary" aria-hidden="true" />
                Safety boundaries
              </div>
              <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
                {realisticScratchPrize.terms.map((term) => (
                  <li key={term}>{term}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </section>

        <section className="mx-auto w-full max-w-md">
          <Card className="overflow-hidden border-primary/20 bg-card shadow-xl">
            <div className="p-4" style={{ background: "linear-gradient(135deg, #ff6f7d, #25364a)" }}>
              <div className="rounded-[1.75rem] bg-white/15 p-4 text-white backdrop-blur">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.25em] text-white/75">{realisticScratchPrize.businessName}</p>
                    <h2 className="mt-2 font-serif text-2xl font-bold">{realisticScratchPrize.campaignTitle}</h2>
                  </div>
                  <Sparkles className="h-6 w-6" aria-hidden="true" />
                </div>
                <p className="mt-3 text-sm text-white/85">{realisticScratchPrize.campaignSubtitle}</p>
              </div>
            </div>

            <CardContent className="space-y-5 p-5">
              <div className="rounded-3xl border border-dashed border-primary/30 bg-muted p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium">{realisticScratchPrize.instruction}</p>
                    <p className="text-xs text-muted-foreground">
                      {isReady ? "Ready for mouse or touch scratching." : "Preparing scratch surface..."}
                    </p>
                  </div>
                  <Badge variant={isComplete ? "default" : "outline"}>{isComplete ? "Revealed" : "Ready"}</Badge>
                </div>

                <div
                  className="relative min-h-64 overflow-hidden rounded-[1.5rem] border border-border bg-background shadow-inner"
                  aria-label={isComplete ? `Demo result revealed: ${realisticScratchPrize.resultTitle}` : "Scratch card with metallic coating. Use pointer input or the Reveal Result button."}
                >
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center">
                    <Ticket className="h-11 w-11 text-primary" aria-hidden="true" />
                    <div>
                      <p className="font-serif text-2xl font-bold">{realisticScratchPrize.resultTitle}</p>
                      <p className="mt-2 text-sm text-muted-foreground">{realisticScratchPrize.resultMessage}</p>
                    </div>
                    <div className="rounded-2xl bg-muted px-4 py-3">
                      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Fictional code</p>
                      <p className="mt-1 font-mono text-lg font-bold">{realisticScratchPrize.voucherCode}</p>
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
                  <p className="text-xs text-muted-foreground">The full result appears automatically after 60% of the coating is removed.</p>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <Button type="button" onClick={revealAccessibly} disabled={isComplete}>
                  Reveal Result
                </Button>
                <Button type="button" variant="outline" onClick={replayDemo}>
                  <RotateCcw className="mr-2 h-4 w-4" aria-hidden="true" />
                  Reset coating
                </Button>
              </div>

              {isComplete ? (
                <div className="rounded-3xl border border-border bg-background p-4" aria-live="polite">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className="bg-primary text-primary-foreground">DEMO VOUCHER</Badge>
                    <Badge variant="outline">NOT REDEEMABLE</Badge>
                  </div>
                  <div className="mt-4 space-y-3 text-sm text-muted-foreground">
                    <p className="font-serif text-2xl font-bold text-foreground">{realisticScratchPrize.resultTitle}</p>
                    <p>{realisticScratchPrize.expiration}</p>
                    <p>{realisticScratchPrize.redemptionInstructions}</p>
                    {hasAnnouncedCompletion ? <p className="font-medium text-foreground">Result revealed once for this local session.</p> : null}
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </section>
      </div>
    </main>
  );
}