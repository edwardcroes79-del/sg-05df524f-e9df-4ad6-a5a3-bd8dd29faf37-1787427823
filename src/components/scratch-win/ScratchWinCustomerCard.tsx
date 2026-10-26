import { PointerEvent, useMemo, useState } from "react";
import Link from "next/link";
import { RotateCcw, ShieldCheck, Sparkles, Ticket } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { demoScratchCampaigns, demoScratchOutcomes, ScratchOutcome } from "@/components/scratch-win/scratch-win-demo-data";

export function ScratchWinCustomerCard() {
  const campaign = demoScratchCampaigns[0];
  const [isScratching, setIsScratching] = useState(false);
  const [scratchProgress, setScratchProgress] = useState(0);
  const [playCount, setPlayCount] = useState(0);

  const outcome = useMemo<ScratchOutcome>(() => {
    return demoScratchOutcomes[playCount % demoScratchOutcomes.length];
  }, [playCount]);

  const isRevealed = scratchProgress >= 72;

  const addScratch = () => {
    setScratchProgress((current) => Math.min(100, current + 9));
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!isScratching) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    addScratch();
  };

  const revealResult = () => {
    setScratchProgress(100);
  };

  const resetDemo = () => {
    setPlayCount((current) => current + 1);
    setScratchProgress(0);
    setIsScratching(false);
  };

  return (
    <main className="min-h-screen bg-background px-4 py-6 text-foreground sm:px-6">
      <div className="mx-auto flex max-w-md flex-col gap-5">
        <div className="flex items-center justify-between gap-3">
          <Button asChild variant="outline" size="sm">
            <Link href="/dashboard/scratch-win">Business preview</Link>
          </Button>
          <Badge className="bg-primary text-primary-foreground">DEMO ONLY</Badge>
        </div>

        <section className="space-y-3 text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-primary">Royalty Scratch & Win</p>
          <h1 className="font-serif text-3xl font-bold">Scratch the demo card</h1>
          <p className="text-sm text-muted-foreground">
            This local prototype simulates a customer promotion. No prize is live, secure, saved, or redeemable.
          </p>
        </section>

        <Card className="overflow-hidden border-primary/20 bg-card shadow-xl">
          <div className="p-4" style={{ background: `linear-gradient(135deg, ${campaign.cardColor}, ${campaign.accentColor})` }}>
            <div className="rounded-[1.75rem] bg-white/15 p-4 text-white backdrop-blur">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.25em] text-white/75">Campaign preview</p>
                  <h2 className="mt-2 font-serif text-2xl font-bold">{campaign.name}</h2>
                </div>
                <Sparkles className="h-6 w-6" aria-hidden="true" />
              </div>
              <p className="mt-3 text-sm text-white/85">{campaign.description}</p>
            </div>
          </div>

          <CardContent className="space-y-5 p-5">
            <div className="rounded-3xl border border-dashed border-primary/30 bg-muted p-4">
              <div
                className="relative flex min-h-56 touch-none select-none items-center justify-center overflow-hidden rounded-2xl border border-border bg-background"
                onPointerDown={() => {
                  setIsScratching(true);
                  addScratch();
                }}
                onPointerMove={handlePointerMove}
                onPointerUp={() => setIsScratching(false)}
                onPointerCancel={() => setIsScratching(false)}
                role="img"
                aria-label={isRevealed ? `Demo result revealed: ${outcome.title}` : "Scratch area. Use touch, mouse, or the Reveal result button."}
              >
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-5 text-center">
                  {outcome.type === "win" ? (
                    <Ticket className="h-10 w-10 text-primary" aria-hidden="true" />
                  ) : (
                    <ShieldCheck className="h-10 w-10 text-primary" aria-hidden="true" />
                  )}
                  <p className="font-serif text-2xl font-bold">{outcome.title}</p>
                  <p className="text-sm text-muted-foreground">{outcome.message}</p>
                </div>

                {!isRevealed ? (
                  <div
                    className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-200 p-6 text-center transition-opacity"
                    style={{ opacity: Math.max(0.12, 1 - scratchProgress / 85) }}
                  >
                    <div className="rounded-full bg-white/80 p-4 shadow-sm">
                      <Sparkles className="h-8 w-8 text-primary" aria-hidden="true" />
                    </div>
                    <div>
                      <p className="font-serif text-xl font-bold text-slate-800">Scratch here</p>
                      <p className="text-sm text-slate-600">Drag across the card or reveal accessibly.</p>
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="mt-4 space-y-2">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Demo scratch progress</span>
                  <span>{scratchProgress}%</span>
                </div>
                <Progress value={scratchProgress} />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Button type="button" onClick={revealResult}>
                Reveal result
              </Button>
              <Button type="button" variant="outline" onClick={resetDemo}>
                <RotateCcw className="mr-2 h-4 w-4" aria-hidden="true" />
                Replay demo
              </Button>
            </div>

            {isRevealed ? (
              <div className="rounded-3xl border border-border bg-background p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className="bg-primary text-primary-foreground">DEMO VOUCHER</Badge>
                  <Badge variant="outline">NOT REDEEMABLE</Badge>
                </div>
                {outcome.type === "win" ? (
                  <div className="mt-4 space-y-3">
                    <div>
                      <p className="text-sm text-muted-foreground">Prize title</p>
                      <p className="font-serif text-2xl font-bold">{campaign.prize.title}</p>
                    </div>
                    <div className="rounded-2xl bg-muted p-3">
                      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Fictional code</p>
                      <p className="mt-1 font-mono text-lg font-bold">{outcome.voucherCode}</p>
                    </div>
                    <p className="text-sm text-muted-foreground">Example expiration: {outcome.expiresAt}</p>
                    <p className="text-sm text-muted-foreground">{outcome.instructions}</p>
                  </div>
                ) : (
                  <p className="mt-4 text-sm text-muted-foreground">
                    This simulated non-winning screen does not affect loyalty stamps, rewards, balances, or redemption eligibility.
                  </p>
                )}
              </div>
            ) : null}

            <p className="text-center text-xs text-muted-foreground">
              Randomized outcomes are local simulations for UI testing only and are not secure promotion logic.
            </p>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}