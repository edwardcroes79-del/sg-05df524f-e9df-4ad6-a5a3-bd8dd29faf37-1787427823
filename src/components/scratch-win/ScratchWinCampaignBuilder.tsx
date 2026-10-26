import { useMemo, useState } from "react";
import { AlertCircle, Eye, Palette } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface BuilderState {
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  prizeName: string;
  prizeDescription: string;
  quantity: string;
  losingOutcome: string;
  cardColor: string;
  accentColor: string;
}

const defaultBuilder: BuilderState = {
  name: "Palm Prize Preview",
  description: "A fictional Scratch & Win concept for loyal island guests.",
  startDate: "2026-11-01",
  endDate: "2026-11-30",
  prizeName: "Demo Smoothie Upgrade",
  prizeDescription: "A non-redeemable prize preview for campaign planning.",
  quantity: "25",
  losingOutcome: "Thanks for playing this demo. Try again on your next visit.",
  cardColor: "#ff6f7d",
  accentColor: "#08a8a8"
};

export function ScratchWinCampaignBuilder() {
  const [draft, setDraft] = useState<BuilderState>(defaultBuilder);

  const errors = useMemo(() => {
    const nextErrors: string[] = [];

    if (!draft.name.trim()) nextErrors.push("Campaign name is required for the preview.");
    if (!draft.prizeName.trim()) nextErrors.push("Prize name is required for the demo card.");
    if (Number(draft.quantity) < 1 || Number.isNaN(Number(draft.quantity))) {
      nextErrors.push("Demo prize quantity must be at least 1.");
    }
    if (draft.startDate && draft.endDate && draft.startDate > draft.endDate) {
      nextErrors.push("End date must be after the start date.");
    }

    return nextErrors;
  }, [draft]);

  const updateDraft = (field: keyof BuilderState, value: string) => {
    setDraft((current) => ({ ...current, [field]: value }));
  };

  return (
    <Card className="border-primary/20 bg-card shadow-sm">
      <CardHeader className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge className="bg-primary text-primary-foreground">DEMO ONLY</Badge>
          <Badge variant="outline">Local preview builder</Badge>
        </div>
        <CardTitle className="font-serif text-2xl text-foreground">Campaign builder</CardTitle>
        <p className="text-sm text-muted-foreground">
          Build a local campaign preview. Nothing is saved, published, billed, or connected to a database.
        </p>
      </CardHeader>
      <CardContent className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="scratch-name">Campaign name</Label>
            <Input id="scratch-name" value={draft.name} onChange={(event) => updateDraft("name", event.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="scratch-description">Campaign description</Label>
            <Textarea
              id="scratch-description"
              value={draft.description}
              onChange={(event) => updateDraft("description", event.target.value)}
              rows={3}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="scratch-start">Start date</Label>
              <Input id="scratch-start" type="date" value={draft.startDate} onChange={(event) => updateDraft("startDate", event.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="scratch-end">End date</Label>
              <Input id="scratch-end" type="date" value={draft.endDate} onChange={(event) => updateDraft("endDate", event.target.value)} />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="scratch-prize">Prize name</Label>
              <Input id="scratch-prize" value={draft.prizeName} onChange={(event) => updateDraft("prizeName", event.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="scratch-quantity">Demo prize quantity</Label>
              <Input
                id="scratch-quantity"
                type="number"
                min="1"
                value={draft.quantity}
                onChange={(event) => updateDraft("quantity", event.target.value)}
              />
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="scratch-prize-description">Prize description</Label>
            <Textarea
              id="scratch-prize-description"
              value={draft.prizeDescription}
              onChange={(event) => updateDraft("prizeDescription", event.target.value)}
              rows={2}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="scratch-losing">Demo non-winning outcome</Label>
            <Textarea
              id="scratch-losing"
              value={draft.losingOutcome}
              onChange={(event) => updateDraft("losingOutcome", event.target.value)}
              rows={2}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="scratch-card-color">Card color</Label>
              <Input id="scratch-card-color" type="color" value={draft.cardColor} onChange={(event) => updateDraft("cardColor", event.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="scratch-accent-color">Brand accent</Label>
              <Input id="scratch-accent-color" type="color" value={draft.accentColor} onChange={(event) => updateDraft("accentColor", event.target.value)} />
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {errors.length > 0 ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Preview validation</AlertTitle>
              <AlertDescription>{errors.join(" ")}</AlertDescription>
            </Alert>
          ) : null}

          <div className="rounded-3xl border border-border bg-background p-4">
            <div
              className="overflow-hidden rounded-2xl p-5 text-white shadow-lg"
              style={{ background: `linear-gradient(135deg, ${draft.cardColor}, ${draft.accentColor})` }}
            >
              <div className="flex items-center justify-between gap-3">
                <Badge className="bg-white/20 text-white hover:bg-white/20">DEMO / NOT LIVE</Badge>
                <Palette className="h-5 w-5" aria-hidden="true" />
              </div>
              <div className="mt-10 space-y-3">
                <p className="text-sm uppercase tracking-[0.3em] text-white/80">Scratch & Win</p>
                <h3 className="font-serif text-3xl font-bold">{draft.name || "Untitled campaign"}</h3>
                <p className="text-sm text-white/85">{draft.description || "Add a campaign description."}</p>
              </div>
              <div className="mt-8 rounded-2xl bg-white/18 p-4 backdrop-blur">
                <p className="text-xs uppercase tracking-[0.2em] text-white/75">Demo prize</p>
                <p className="mt-1 text-lg font-semibold">{draft.prizeName || "Prize name required"}</p>
                <p className="text-sm text-white/80">{draft.prizeDescription}</p>
              </div>
            </div>
          </div>

          <Button type="button" className="w-full" disabled={errors.length > 0}>
            <Eye className="mr-2 h-4 w-4" aria-hidden="true" />
            Preview locally only
          </Button>
          <p className="text-xs text-muted-foreground">
            This button does not save, publish, bill, issue prizes, or write data. It only confirms the local preview is valid.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}