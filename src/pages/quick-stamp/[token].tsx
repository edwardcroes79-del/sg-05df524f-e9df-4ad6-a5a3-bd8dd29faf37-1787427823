import { useCallback, useEffect, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { AlertTriangle, CheckCircle2, Gift, Loader2, LogIn, Stamp, Zap } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

type QuickStampContext = {
  success: boolean;
  message?: string;
  requires_login?: boolean;
  has_membership?: boolean;
  business_name?: string;
  business_logo?: string;
  business_primary_color?: string;
  program_name?: string;
  stamp_target?: number;
  reward_title?: string;
  current_stamps?: number;
  total_stamps?: number;
};

type StampResult = {
  success: boolean;
  message?: string;
  reward_earned?: boolean;
  new_stamps?: number;
  total_stamps?: number;
};

const EXPIRED_MESSAGE = "QR Code expired. Please scan the current QR code.";

export default function QuickStampCustomerPage() {
  const router = useRouter();
  const { token } = router.query;
  const { toast } = useToast();

  const [context, setContext] = useState<QuickStampContext | null>(null);
  const [stampResult, setStampResult] = useState<StampResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [issuing, setIssuing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const tokenValue = typeof token === "string" ? token : "";

  const loadContext = useCallback(async () => {
    if (!tokenValue) return;

    setLoading(true);
    setErrorMessage("");

    try {
      const { data: sessionData } = await supabase.auth.getSession();

      if (!sessionData.session) {
        await router.replace(`/auth/customer?returnUrl=${encodeURIComponent(`/quick-stamp/${tokenValue}`)}`);
        return;
      }

      const { data, error } = await (supabase as any).rpc("get_quick_stamp_qr_context", {
        p_token: tokenValue,
      });

      if (error) throw error;

      if (!data?.success) {
        setErrorMessage(data?.message || EXPIRED_MESSAGE);
        setContext(null);
        return;
      }

      setContext(data);
    } catch (err: any) {
      setErrorMessage(err.message || EXPIRED_MESSAGE);
      setContext(null);
    } finally {
      setLoading(false);
    }
  }, [router, tokenValue]);

  useEffect(() => {
    void loadContext();
  }, [loadContext]);

  const handleGetStamp = async () => {
    if (!tokenValue) return;

    setIssuing(true);
    setErrorMessage("");

    try {
      const { data, error } = await (supabase as any).rpc("quick_stamp_qr_issue_stamp", {
        p_token: tokenValue,
      });

      if (error) throw error;
      if (!data?.success) {
        setErrorMessage(data?.message || EXPIRED_MESSAGE);
        return;
      }

      setStampResult(data);
      setContext((previous) => previous ? {
        ...previous,
        current_stamps: Number(data.new_stamps ?? previous.current_stamps ?? 0),
        total_stamps: Number(data.total_stamps ?? previous.total_stamps ?? 0),
      } : previous);

      toast({
        title: "Stamp added",
        description: data.reward_earned ? "Your stamp was saved and you unlocked a reward." : "Your stamp was saved to your loyalty card.",
      });
    } catch (err: any) {
      setErrorMessage(err.message || EXPIRED_MESSAGE);
    } finally {
      setIssuing(false);
    }
  };

  const accentColor = context?.business_primary_color || "hsl(var(--primary))";
  const stampTarget = Number(context?.stamp_target || 0);
  const currentStamps = Number(stampResult?.new_stamps ?? context?.current_stamps ?? 0);
  const progressValue = stampTarget > 0 ? Math.min(100, (currentStamps / stampTarget) * 100) : 0;

  return (
    <>
      <Head>
        <title>Quick Stamp | Aruba Royalty Stamp</title>
      </Head>

      <main className="min-h-screen bg-[radial-gradient(circle_at_top,_hsl(var(--primary)/0.12),_transparent_34rem),hsl(var(--background))] px-4 py-8">
        <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-md flex-col justify-center">
          <div className="mb-6 text-center">
            <Badge variant="outline" className="mb-3 gap-1 border-primary/30 bg-primary/5 text-primary">
              <Zap className="h-3.5 w-3.5" />
              Quick Stamp QR
            </Badge>
            <h1 className="font-heading text-3xl font-bold text-foreground">Collect your stamp</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Confirm the business and loyalty program before receiving your stamp.
            </p>
          </div>

          <Card className="overflow-hidden border-primary/15 shadow-xl shadow-primary/5">
            {loading ? (
              <CardContent className="flex min-h-80 items-center justify-center p-8">
                <div className="flex flex-col items-center gap-3 text-muted-foreground">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  Validating QR code...
                </div>
              </CardContent>
            ) : errorMessage ? (
              <CardContent className="p-8 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                  <AlertTriangle className="h-7 w-7" />
                </div>
                <h2 className="mt-5 font-heading text-2xl font-bold text-foreground">QR unavailable</h2>
                <p className="mt-2 text-sm text-muted-foreground">{errorMessage}</p>
                <Button asChild className="mt-6 w-full">
                  <Link href="/customer">Open My Wallet</Link>
                </Button>
              </CardContent>
            ) : stampResult?.success ? (
              <CardContent className="p-8 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
                  <CheckCircle2 className="h-9 w-9" />
                </div>
                <h2 className="mt-5 font-heading text-2xl font-bold text-foreground">Stamp saved</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Your loyalty card at {context?.business_name} was updated successfully.
                </p>

                <div className="mt-6 rounded-2xl border bg-muted/20 p-4 text-left">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-foreground">{context?.program_name}</span>
                    <span className="font-mono font-bold text-primary">
                      {currentStamps}/{stampTarget}
                    </span>
                  </div>
                  <Progress value={progressValue} className="mt-3" />
                  <p className="mt-2 text-xs text-muted-foreground">
                    Total stamps collected: {Number(stampResult.total_stamps || 0)}
                  </p>
                </div>

                {stampResult.reward_earned ? (
                  <Alert className="mt-5 border-emerald-500/20 bg-emerald-500/10 text-emerald-950">
                    <Gift className="h-4 w-4 text-emerald-700" />
                    <AlertTitle>Reward unlocked</AlertTitle>
                    <AlertDescription>Your reward is now available in your customer wallet.</AlertDescription>
                  </Alert>
                ) : null}

                <Button asChild className="mt-6 w-full">
                  <Link href="/customer/cards">View My Loyalty Cards</Link>
                </Button>
              </CardContent>
            ) : (
              <>
                <CardHeader className="text-center">
                  {context?.business_logo ? (
                    <img
                      src={context.business_logo}
                      alt={context.business_name || "Business logo"}
                      className="mx-auto h-20 w-20 rounded-2xl border object-cover shadow-sm"
                      style={{ borderColor: accentColor }}
                    />
                  ) : (
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl text-white shadow-sm" style={{ backgroundColor: accentColor }}>
                      <Stamp className="h-8 w-8" />
                    </div>
                  )}
                  <CardTitle className="pt-2 text-2xl">{context?.business_name}</CardTitle>
                  <CardDescription>{context?.program_name}</CardDescription>
                </CardHeader>

                <CardContent className="space-y-5 px-6">
                  {!context?.has_membership ? (
                    <Alert className="border-amber-500/20 bg-amber-500/10 text-amber-950">
                      <LogIn className="h-4 w-4 text-amber-700" />
                      <AlertTitle>Membership required</AlertTitle>
                      <AlertDescription>
                        You need an active loyalty card for this program before using Quick Stamp QR.
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <>
                      <div className="rounded-2xl border bg-muted/20 p-5 text-center">
                        <p className="text-sm text-muted-foreground">You&apos;re about to receive</p>
                        <p className="mt-1 font-heading text-3xl font-extrabold text-foreground">1 stamp</p>
                      </div>

                      <div className="rounded-2xl border bg-card p-4">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium text-foreground">Current progress</span>
                          <span className="font-mono font-bold text-primary">
                            {currentStamps}/{stampTarget}
                          </span>
                        </div>
                        <Progress value={progressValue} className="mt-3" />
                        <p className="mt-2 text-xs text-muted-foreground">
                          Reward: {context?.reward_title || "Program reward"}
                        </p>
                      </div>
                    </>
                  )}
                </CardContent>

                <CardFooter className="flex flex-col gap-3 border-t bg-muted/10 p-6">
                  <Button
                    type="button"
                    className="h-12 w-full text-base"
                    onClick={handleGetStamp}
                    disabled={issuing || !context?.has_membership}
                    style={{ backgroundColor: context?.has_membership ? accentColor : undefined }}
                  >
                    {issuing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving Stamp...
                      </>
                    ) : (
                      "Get My Stamp"
                    )}
                  </Button>
                  <Button asChild type="button" variant="ghost" className="w-full">
                    <Link href="/customer/cards">Open My Cards</Link>
                  </Button>
                </CardFooter>
              </>
            )}
          </Card>
        </div>
      </main>
    </>
  );
}