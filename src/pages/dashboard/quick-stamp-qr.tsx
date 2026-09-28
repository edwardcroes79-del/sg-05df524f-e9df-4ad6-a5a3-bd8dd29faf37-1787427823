import { useCallback, useEffect, useMemo, useState } from "react";
import Head from "next/head";
import { AlertTriangle, Loader2, QrCode, RefreshCw, ShieldCheck, Timer, Zap } from "lucide-react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { QuickStampFullScreen } from "@/components/dashboard/QuickStampFullScreen";

type QuickStampToken = {
  token: string;
  expiresAt: string;
  businessId: string;
  loyaltyProgramId: string;
  ttlSeconds: number;
};

type LoyaltyProgramOption = {
  id: string;
  name: string;
  stamp_target: number;
  reward_title: string;
};

function getSecondsRemaining(expiresAt: string | null) {
  if (!expiresAt) return 0;
  return Math.max(0, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 1000));
}

function formatCountdown(totalSeconds: number) {
  const safeSeconds = Math.max(0, totalSeconds);
  const minutes = Math.floor(safeSeconds / 60).toString().padStart(2, "0");
  const seconds = (safeSeconds % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}

export default function QuickStampQrPage() {
  const { toast } = useToast();
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [programs, setPrograms] = useState<LoyaltyProgramOption[]>([]);
  const [selectedProgramId, setSelectedProgramId] = useState("");
  const [tokenData, setTokenData] = useState<QuickStampToken | null>(null);
  const [secondsRemaining, setSecondsRemaining] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isFullScreen, setIsFullScreen] = useState(false);

  const selectedProgram = programs.find((program) => program.id === selectedProgramId) || null;

  const qrUrl = useMemo(() => {
    if (!tokenData?.token || typeof window === "undefined") return "";
    return `${window.location.origin}/quick-stamp/${tokenData.token}`;
  }, [tokenData?.token]);

  const qrImageUrl = useMemo(() => {
    if (!qrUrl) return "";
    return `https://api.qrserver.com/v1/create-qr-code/?size=520x520&margin=14&data=${encodeURIComponent(qrUrl)}`;
  }, [qrUrl]);

  const refreshToken = useCallback(async (resolvedBusinessId: string, programId: string) => {
    if (!programId) {
      setTokenData(null);
      setSecondsRemaining(0);
      setErrorMessage("Select an active loyalty program to generate a Quick Stamp QR.");
      setLoading(false);
      return;
    }

    setRefreshing(true);
    setErrorMessage("");

    try {
      const { data, error } = await (supabase as any).rpc("generate_quick_stamp_qr_token", {
        p_business_id: resolvedBusinessId,
        p_loyalty_program_id: programId,
      });

      if (error) throw error;
      if (!data?.success) {
        throw new Error(data?.message || "Quick Stamp QR token could not be generated");
      }

      setTokenData({
        token: data.token,
        expiresAt: data.expires_at,
        businessId: data.business_id,
        loyaltyProgramId: data.loyalty_program_id,
        ttlSeconds: Number(data.ttl_seconds || 60),
      });
      setSecondsRemaining(getSecondsRemaining(data.expires_at));
    } catch (err: any) {
      setErrorMessage(err.message || "Quick Stamp QR is unavailable");
      setTokenData(null);
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    const loadBusiness = async () => {
      const { data: workspaceRows, error } = await (supabase as any).rpc("get_business_dashboard_access_status");

      if (!mounted) return;

      if (error) {
        setErrorMessage(error.message);
        setLoading(false);
        return;
      }

      const resolvedBusiness = Array.isArray(workspaceRows) ? workspaceRows[0] : workspaceRows;

      if (!resolvedBusiness?.id) {
        setErrorMessage("Business workspace was not found.");
        setLoading(false);
        return;
      }

      const { data: programRows, error: programError } = await supabase
        .from("loyalty_programs")
        .select("id, name, stamp_target, reward_title")
        .eq("business_id", resolvedBusiness.id)
        .eq("active", true)
        .order("created_at", { ascending: true });

      if (!mounted) return;

      if (programError) {
        setErrorMessage(programError.message);
        setLoading(false);
        return;
      }

      const activePrograms = (programRows || []) as LoyaltyProgramOption[];
      const firstProgram = activePrograms[0];

      setBusinessId(resolvedBusiness.id);
      setPrograms(activePrograms);

      if (!firstProgram) {
        setErrorMessage("Create and activate a loyalty program before using Quick Stamp QR.");
        setLoading(false);
        return;
      }

      setSelectedProgramId(firstProgram.id);
      await refreshToken(resolvedBusiness.id, firstProgram.id);
    };

    void loadBusiness();

    return () => {
      mounted = false;
    };
  }, [refreshToken]);

  useEffect(() => {
    if (!tokenData?.expiresAt || !businessId || !selectedProgramId) return;

    const timer = window.setInterval(() => {
      const remaining = getSecondsRemaining(tokenData.expiresAt);
      setSecondsRemaining(remaining);

      if (remaining <= 0) {
        void refreshToken(businessId, selectedProgramId);
      }
    }, 1000);

    return () => window.clearInterval(timer);
  }, [businessId, refreshToken, selectedProgramId, tokenData?.expiresAt]);

  const handleProgramChange = async (programId: string) => {
    setSelectedProgramId(programId);
    setTokenData(null);
    if (businessId) {
      await refreshToken(businessId, programId);
    }
  };

  const handleManualRefresh = async () => {
    if (!businessId || !selectedProgramId) return;
    await refreshToken(businessId, selectedProgramId);
    toast({
      title: "Quick Stamp QR refreshed",
      description: "A new 60-second QR is now active. The previous QR is no longer valid.",
    });
  };

  const progressValue = tokenData?.ttlSeconds ? (secondsRemaining / tokenData.ttlSeconds) * 100 : 0;
  const countdownLabel = formatCountdown(secondsRemaining);
  const canDisplayQr = Boolean(qrImageUrl && tokenData && !errorMessage);

  return (
    <DashboardLayout>
      <Head>
        <title>Quick Stamp QR | Aruba Royalty Stamp</title>
      </Head>

      {isFullScreen && canDisplayQr ? (
        <QuickStampFullScreen
          qrImageUrl={qrImageUrl}
          countdownLabel={countdownLabel}
          progressValue={progressValue}
          businessName="Quick Stamp QR"
          programName={selectedProgram?.name || "Active loyalty program"}
          onExit={() => setIsFullScreen(false)}
        />
      ) : null}

      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Badge variant="outline" className="mb-3 w-fit gap-1 border-primary/30 bg-primary/5 text-primary">
              <Zap className="h-3.5 w-3.5" />
              Optional Add-on
            </Badge>
            <h1 className="font-heading text-3xl font-bold text-foreground">Quick Stamp QR</h1>
            <p className="mt-1 max-w-2xl text-muted-foreground">
              Customers can scan this QR to receive their loyalty stamp.
            </p>
          </div>

          <Button type="button" variant="outline" className="gap-2" onClick={handleManualRefresh} disabled={!businessId || !selectedProgramId || refreshing}>
            {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Refresh QR
          </Button>
        </div>

        <Alert className="border-primary/20 bg-primary/5 text-foreground">
          <ShieldCheck className="h-4 w-4 text-primary" />
          <AlertTitle>Customer flow enabled</AlertTitle>
          <AlertDescription>
            Customers who scan this QR must be logged in, belong to the selected loyalty program, and confirm before one real stamp is issued.
          </AlertDescription>
        </Alert>

        <div className="grid gap-6 lg:grid-cols-[1fr_0.85fr]">
          <Card className="overflow-hidden border-primary/20 shadow-sm">
            <CardHeader className="border-b bg-primary/[0.03]">
              <CardTitle className="flex items-center gap-2">
                <QrCode className="h-5 w-5 text-primary" />
                Rotating Quick Stamp QR
              </CardTitle>
              <CardDescription>
                Show this screen at your counter. The current QR is valid for 60 seconds and then automatically refreshes.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5 p-6">
              <div className="space-y-2">
                <label htmlFor="quickStampProgram" className="text-sm font-semibold text-foreground">
                  Loyalty Program
                </label>
                <select
                  id="quickStampProgram"
                  className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={selectedProgramId}
                  onChange={(event) => void handleProgramChange(event.target.value)}
                  disabled={loading || refreshing || programs.length === 0}
                >
                  {programs.map((program) => (
                    <option key={program.id} value={program.id}>
                      {program.name} · {program.stamp_target} stamps
                    </option>
                  ))}
                </select>
                {selectedProgram ? (
                  <p className="text-xs text-muted-foreground">
                    Customers will receive 1 stamp toward {selectedProgram.reward_title}.
                  </p>
                ) : null}
              </div>

              {loading ? (
                <div className="flex min-h-[360px] items-center justify-center">
                  <div className="flex flex-col items-center gap-3 text-muted-foreground">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    Generating secure QR...
                  </div>
                </div>
              ) : errorMessage ? (
                <div className="rounded-2xl border border-dashed p-8 text-center">
                  <AlertTriangle className="mx-auto h-10 w-10 text-amber-600" />
                  <h2 className="mt-4 font-heading text-xl font-bold text-foreground">Quick Stamp QR unavailable</h2>
                  <p className="mt-2 text-sm text-muted-foreground">{errorMessage}</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-5">
                  <div className="w-full rounded-[2rem] border border-primary/20 bg-white p-4 shadow-xl shadow-primary/10 sm:w-fit sm:p-6">
                    {qrImageUrl ? (
                      <img src={qrImageUrl} alt="Quick Stamp QR token" className="mx-auto aspect-square h-80 w-80 rounded-3xl sm:h-[26rem] sm:w-[26rem] lg:h-[28rem] lg:w-[28rem]" />
                    ) : null}
                  </div>

                  <div className="w-full max-w-lg space-y-4 text-center">
                    <div className="rounded-2xl border bg-primary/5 px-5 py-4">
                      <p className="flex items-center justify-center gap-2 text-sm font-semibold text-foreground">
                        <Timer className="h-4 w-4 text-primary" />
                        Expires in
                      </p>
                      <p className="mt-1 font-mono text-4xl font-extrabold tracking-tight text-primary">{countdownLabel}</p>
                    </div>
                    <Progress value={progressValue} />
                    <Button
                      type="button"
                      className="w-full gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
                      onClick={() => setIsFullScreen(true)}
                      disabled={!canDisplayQr}
                    >
                      <Zap className="h-4 w-4" />
                      Display Full Screen
                    </Button>
                    <p className="text-sm font-medium text-foreground">Scan to receive your loyalty stamp</p>
                    <p className="break-all rounded-lg bg-muted p-3 font-mono text-xs text-muted-foreground">
                      {qrUrl}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Validation Rules</CardTitle>
              <CardDescription>
                The scan flow validates every requirement server-side before issuing a stamp.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-muted-foreground">
              <div className="rounded-xl border bg-muted/20 p-4">
                <p className="font-semibold text-foreground">Approved add-on required</p>
                <p>Token generation and scan redemption are denied unless Quick Stamp QR is active for this business.</p>
              </div>
              <div className="rounded-xl border bg-muted/20 p-4">
                <p className="font-semibold text-foreground">Program membership required</p>
                <p>The customer must already have an active loyalty card for the selected program before a stamp is issued.</p>
              </div>
              <div className="rounded-xl border bg-muted/20 p-4">
                <p className="font-semibold text-foreground">Shared stamp transaction logic</p>
                <p>The customer scan flow calls the same transactional stamp engine used by staff issuing, including rate limits and reward creation.</p>
              </div>
              <div className="rounded-xl border bg-muted/20 p-4">
                <p className="font-semibold text-foreground">Repeat-scan protection</p>
                <p>Quick Stamp QR also checks recent transaction history before issuing, so refreshed tokens cannot be used for unlimited rapid self-stamping.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}