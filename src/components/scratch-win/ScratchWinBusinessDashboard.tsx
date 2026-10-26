import Link from "next/link";
import { Gift, PlayCircle, Sparkles, Ticket, Trophy } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { demoInventory, demoScratchCampaigns, demoScratchStats } from "@/components/scratch-win/scratch-win-demo-data";
import { ScratchWinCampaignBuilder } from "@/components/scratch-win/ScratchWinCampaignBuilder";

const statusStyles = {
  Draft: "border-muted-foreground/20 bg-muted text-foreground",
  "Demo active": "border-primary/20 bg-primary text-primary-foreground",
  Completed: "border-emerald-200 bg-emerald-50 text-emerald-800"
};

export function ScratchWinBusinessDashboard() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <section className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="bg-primary text-primary-foreground">DEMO ONLY / NOT LIVE</Badge>
            <Badge variant="outline">Optional add-on preview</Badge>
          </div>
          <div className="grid gap-5 lg:grid-cols-[1fr_340px] lg:items-end">
            <div className="space-y-4">
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-primary">Royalty Scratch & Win</p>
              <h1 className="font-serif text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
                A playful add-on prototype for promotional scratch cards.
              </h1>
              <p className="max-w-3xl text-base text-muted-foreground sm:text-lg">
                Preview campaign planning, prize inventory, and the customer scratch experience without saving data or issuing real vouchers.
              </p>
            </div>
            <Card className="border-primary/20 bg-background">
              <CardHeader>
                <CardTitle className="font-serif text-xl">Add-on preview</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <p>Billing, activation, publishing, and prize issuance are intentionally disabled.</p>
                <Button className="w-full" disabled>
                  Add-on preview only
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-4 md:grid-cols-3">
          <MetricCard icon={PlayCircle} label="Total demo plays" value={demoScratchStats.totalPlays.toLocaleString()} />
          <MetricCard icon={Trophy} label="Total demo wins" value={demoScratchStats.totalWins.toLocaleString()} />
          <MetricCard icon={Ticket} label="Demo prizes remaining" value={demoScratchStats.inventoryRemaining.toLocaleString()} />
        </div>

        <div className="grid gap-5 lg:grid-cols-3">
          {demoScratchCampaigns.map((campaign) => {
            const winRate = campaign.plays > 0 ? Math.round((campaign.wins / campaign.plays) * 100) : 0;

            return (
              <Card key={campaign.id} className="overflow-hidden border-border bg-card">
                <div className="h-2" style={{ background: `linear-gradient(90deg, ${campaign.cardColor}, ${campaign.accentColor})` }} />
                <CardHeader className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <Badge className={statusStyles[campaign.status]}>{campaign.status}</Badge>
                    <Badge variant="outline">DEMO</Badge>
                  </div>
                  <CardTitle className="font-serif text-2xl">{campaign.name}</CardTitle>
                  <p className="text-sm text-muted-foreground">{campaign.description}</p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-2xl bg-muted p-3">
                      <p className="text-muted-foreground">Plays</p>
                      <p className="text-xl font-semibold">{campaign.plays}</p>
                    </div>
                    <div className="rounded-2xl bg-muted p-3">
                      <p className="text-muted-foreground">Wins</p>
                      <p className="text-xl font-semibold">{campaign.wins}</p>
                    </div>
                  </div>
                  <div>
                    <div className="mb-2 flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Demo win rate</span>
                      <span className="font-medium">{winRate}%</span>
                    </div>
                    <Progress value={winRate} />
                  </div>
                  <div className="rounded-2xl border border-border p-3">
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Prize example</p>
                    <p className="mt-1 font-semibold">{campaign.prize.title}</p>
                    <p className="text-sm text-muted-foreground">{campaign.prize.description}</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
          <Card className="border-border bg-card">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Gift className="h-5 w-5 text-primary" aria-hidden="true" />
                <CardTitle className="font-serif text-2xl">Prize inventory examples</CardTitle>
              </div>
              <p className="text-sm text-muted-foreground">Fictional inventory only. No prize records are created.</p>
            </CardHeader>
            <CardContent className="space-y-3">
              {demoInventory.map((item) => (
                <div key={`${item.campaign}-${item.prize}`} className="rounded-2xl border border-border p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="font-medium">{item.prize}</p>
                      <p className="text-sm text-muted-foreground">{item.campaign}</p>
                    </div>
                    <Badge variant="outline">
                      {item.remaining}/{item.quantity}
                    </Badge>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="border-primary/20 bg-gradient-to-br from-card to-muted">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" aria-hidden="true" />
                <CardTitle className="font-serif text-2xl">Customer demo</CardTitle>
              </div>
              <p className="text-sm text-muted-foreground">
                Open the standalone mobile-first scratch card preview. It uses local simulated outcomes only.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button asChild>
                <Link href="/scratch-win/demo">Open customer scratch demo</Link>
              </Button>
              <p className="text-xs text-muted-foreground">
                This prototype does not alter stamps, Quick Stamp, QR scanning, balances, rewards, or redemptions.
              </p>
            </CardContent>
          </Card>
        </div>

        <ScratchWinCampaignBuilder />
      </section>
    </main>
  );
}

function MetricCard({ icon: Icon, label, value }: { icon: typeof PlayCircle; label: string; value: string }) {
  return (
    <Card className="border-border bg-card">
      <CardContent className="flex items-center justify-between gap-4 p-5">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-1 font-serif text-3xl font-bold">{value}</p>
        </div>
        <div className="rounded-2xl bg-primary/10 p-3 text-primary">
          <Icon className="h-6 w-6" aria-hidden="true" />
        </div>
      </CardContent>
    </Card>
  );
}