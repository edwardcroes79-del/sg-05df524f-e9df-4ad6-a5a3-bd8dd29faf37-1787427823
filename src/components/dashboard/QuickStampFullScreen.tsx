import { Timer, X, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

type QuickStampFullScreenProps = {
  qrImageUrl: string;
  countdownLabel: string;
  progressValue: number;
  businessName?: string;
  programName?: string;
  onExit: () => void;
};

export function QuickStampFullScreen({
  qrImageUrl,
  countdownLabel,
  progressValue,
  businessName = "Royalty Stamp",
  programName = "Active loyalty program",
  onExit,
}: QuickStampFullScreenProps) {
  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto bg-background">
      <div className="flex min-h-screen flex-col items-center justify-center px-4 py-6 text-center sm:px-8">
        <div className="absolute right-4 top-4 sm:right-6 sm:top-6">
          <Button type="button" variant="outline" className="gap-2 bg-background/90" onClick={onExit}>
            <X className="h-4 w-4" />
            Exit Full Screen
          </Button>
        </div>

        <div className="w-full max-w-5xl space-y-6">
          <div className="space-y-3">
            <div className="mx-auto flex w-fit items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-2 text-sm font-bold text-primary">
              <Zap className="h-4 w-4" />
              Quick Issue Stamp
            </div>
            <div>
              <h1 className="font-heading text-4xl font-black tracking-tight text-foreground sm:text-6xl">
                Customers scan to receive their loyalty stamp.
              </h1>
              <p className="mt-3 text-base font-medium text-muted-foreground sm:text-xl">
                {businessName} · {programName}
              </p>
            </div>
          </div>

          <div className="mx-auto w-fit rounded-[2.5rem] border border-primary/25 bg-white p-4 shadow-2xl shadow-primary/15 sm:p-8">
            <img
              src={qrImageUrl}
              alt="Quick Issue Stamp full-screen token"
              className="aspect-square h-[78vw] max-h-[34rem] min-h-72 w-[78vw] min-w-72 max-w-[34rem] rounded-[2rem]"
            />
          </div>

          <div className="mx-auto w-full max-w-2xl space-y-4">
            <div className="rounded-3xl border border-primary/20 bg-primary/5 px-6 py-5">
              <p className="flex items-center justify-center gap-2 text-base font-bold text-foreground">
                <Timer className="h-5 w-5 text-primary" />
                Expires in
              </p>
              <p className="mt-2 font-mono text-5xl font-black tracking-tight text-primary sm:text-7xl">
                {countdownLabel}
              </p>
            </div>
            <Progress value={progressValue} />
          </div>
        </div>
      </div>
    </div>
  );
}