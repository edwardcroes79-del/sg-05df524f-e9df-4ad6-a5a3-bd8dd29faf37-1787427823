import { Monitor, Smartphone, Sparkles, Ticket } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { EnhancedBuilderState, EnhancedTheme, ValidationResult } from "@/components/scratch-win/enhanced-builder-types";
import { prizeTypeLabels } from "@/components/scratch-win/enhanced-builder-types";

interface EnhancedScratchLivePreviewProps {
  draft: EnhancedBuilderState;
  theme: EnhancedTheme;
  previewMode: "mobile" | "desktop";
  validation: ValidationResult;
  onPreviewModeChange: (mode: "mobile" | "desktop") => void;
  status: string;
}

export function EnhancedScratchLivePreview({ draft, theme, previewMode, validation, onPreviewModeChange, status }: EnhancedScratchLivePreviewProps) {
  const totalQuantity = draft.prizes.reduce((sum, prize) => sum + Math.max(0, Number(prize.quantity) || 0), 0);

  return (
    <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
      <Card className="border-primary/20 bg-card">
        <CardHeader className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="bg-primary text-primary-foreground">DEMO ONLY / NOT LIVE</Badge>
            <Badge variant="outline">{status}</Badge>
          </div>
          <CardTitle className="font-serif text-2xl">Live preview</CardTitle>
          <p className="text-sm text-muted-foreground">Updates immediately from local state. It does not persist after reload.</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-2 rounded-2xl bg-muted p-1">
            <button
              type="button"
              className={`rounded-xl px-3 py-2 text-sm font-medium transition ${previewMode === "mobile" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"}`}
              onClick={() => onPreviewModeChange("mobile")}
            >
              <Smartphone className="mr-2 inline h-4 w-4" aria-hidden="true" />
              Mobile
            </button>
            <button
              type="button"
              className={`rounded-xl px-3 py-2 text-sm font-medium transition ${previewMode === "desktop" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"}`}
              onClick={() => onPreviewModeChange("desktop")}
            >
              <Monitor className="mr-2 inline h-4 w-4" aria-hidden="true" />
              Desktop
            </button>
          </div>

          <div className={previewMode === "mobile" ? "mx-auto max-w-xs" : "max-w-full"}>
            <div className="overflow-hidden rounded-[2rem] border border-border bg-background shadow-lg">
              <div className="p-5" style={{ background: `linear-gradient(135deg, ${theme.background}, ${theme.accent})`, color: theme.text }}>
                <div className="flex items-center justify-between gap-3">
                  <Badge className="bg-white/20 text-white hover:bg-white/20">DEMO</Badge>
                  <Sparkles className="h-5 w-5" aria-hidden="true" />
                </div>
                <div className="mt-8 space-y-2">
                  <p className="text-xs uppercase tracking-[0.3em] opacity-80">{draft.businessName || "Demo business"}</p>
                  <h3 className="font-serif text-3xl font-bold">{draft.cardTitle || "Scratch card title"}</h3>
                  <p className="text-sm opacity-85">{draft.cardSubtitle || "Customer subtitle preview"}</p>
                </div>
              </div>

              <div className="space-y-4 p-5">
                <div className="rounded-2xl border border-dashed border-primary/30 bg-muted p-6 text-center">
                  <Ticket className="mx-auto h-9 w-9 text-primary" aria-hidden="true" />
                  <p className="mt-3 font-serif text-xl font-bold">Scratch surface preview</p>
                  <p className="mt-1 text-sm text-muted-foreground">Accessible reveal button appears in the customer prototype.</p>
                </div>

                <div>
                  <p className="text-sm font-semibold">Campaign</p>
                  <p className="text-sm text-muted-foreground">{draft.campaignName || "Untitled campaign"}</p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {draft.startDateTime || "No start"} → {draft.endDateTime || "No end"}
                  </p>
                </div>

                <div className="space-y-2">
                  {draft.prizes.map((prize) => (
                    <div key={prize.id} className="rounded-2xl border border-border p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium">{prize.name || "Unnamed prize"}</p>
                          <p className="text-xs text-muted-foreground">{prizeTypeLabels[prize.type]}</p>
                        </div>
                        <Badge variant="outline">{Math.max(0, Number(prize.quantity) || 0)} demo</Badge>
                      </div>
                      <p className="mt-2 text-sm text-muted-foreground">{prize.description || "Prize description missing."}</p>
                    </div>
                  ))}
                </div>

                <div className="rounded-2xl bg-muted p-3 text-sm text-muted-foreground">
                  <p className="font-medium text-foreground">Demo terms</p>
                  <p className="mt-1">{draft.terms}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-2 rounded-2xl border border-border p-4 text-sm">
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Selected theme</span>
              <span className="font-medium">{theme.name}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Configured quantity</span>
              <span className="font-medium">{totalQuantity}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Validation</span>
              <span className="font-medium">{validation.allErrors.length === 0 ? "Ready for local preview" : `${validation.allErrors.length} issue(s)`}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </aside>
  );
}