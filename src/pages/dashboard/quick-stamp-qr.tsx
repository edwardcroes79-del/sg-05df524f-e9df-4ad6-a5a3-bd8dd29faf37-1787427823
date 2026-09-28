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

type QuickStampToken = {
  token: string;
  expiresAt: string;
  businessId: string;
  ttlSeconds: number;
};

function getSecondsRemaining(expiresAt: string | null) {
  if (!expiresAt) return 0;
  return Math.max(0, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 1000));
}

export default function QuickStampQrPage() {
  const { toast } = useToast();
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [tokenData, setTokenData] = useState<QuickStampToken | null>(null);
  const [secondsRemaining, setSecondsRemaining] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const qrUrl = useMemo(() => {
    if (!tokenData?.token || typeof window === "undefined") return "";
    return `${window.location.origin}/quick-stamp/${tokenData.token}`;
  }, [tokenData?.token]);

  const qrImageUrl = useMemo(() => {
    if (!qrUrl) return "";
    return `https://api.qrserver.com/v1/create-qr-code/?size=320x320&margin=12&data=${encodeURIComponent(qrUrl)}`;
  }, [qrUrl]);

  const refreshToken = useCallback(async (resolvedBusinessId: string) => {
    setRefreshing(true);
    setErrorMessage("");

    try {
      const { data, error } = await (supabase as any).rpc("generate_quick_stamp_qr_token", {
        p_business_id: resolvedBusinessId,
      });

      if (error) throw error;
      if (!data?.success) {
        throw new Error(data?.message || "Quick Stamp QR token could not be generated");
      }

      setTokenData({
        token: data.token,
        expiresAt: data.expires_at,
        businessId: data.business_id,
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

      setBusinessId(resolvedBusiness.id);
      await refreshToken(resolvedBusiness.id);
    };

    void loadBusiness();

    return () => {
      mounted = false;
    };
  }, [refreshToken]);

  useEffect(() => {
    if (!tokenData?.expiresAt || !businessId) return;

    const timer = window.setInterval(() => {
      const remaining = getSecondsRemaining(tokenData.expiresAt);
      setSecondsRemaining(remaining);

      if (remaining <= 0) {
        void refreshToken(businessId);
      }
    }, 1000);

    return () => window.clearInterval(timer);
  }, [businessId, refreshToken, tokenData?.expiresAt]);

  const handleManualRefresh = async () => {
    if (!businessId) return;
    await refreshToken(businessId);
    toast({
      title: "Quick Stamp QR refreshed",
      description: "A new 60-second token has been generated.",
    });
  };

  const progressValue = tokenData?.ttlSeconds ? (secondsRemaining / tokenData.ttlSeconds) * 100 : 0;

  return (
    <DashboardLayout>
      <Head>
        <title>Quick Stamp QR | Aruba Royalty Stamp</title>
      </Head>

      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Badge variant="outline" className="mb-3 w-fit gap-1 border-primary/30 bg-primary/5 text-primary">
              <Zap className="h-3.5 w-3.5" />
              Optional Add-on
            </Badge>
            <h1 className="font-heading text-3xl font-bold text-foreground">Quick Stamp QR</h1>
            <p className="mt-1 max-w-2xl text-muted-foreground">
              Display a secure short-lived QR token for the approved Quick Stamp QR add-on. Tokens expire after 60 seconds and refresh automatically.
            </p>
          </div>

          <Button type="button" variant="outline" className="gap-2" onClick={handleManualRefresh} disabled={!businessId || refreshing}>
            {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Refresh Token
          </Button>
        </div>

        <Alert className="border-amber-300 bg-amber-50 text-amber-950">
          <AlertTriangle className="h-4 w-4 text-amber-700" />
          <AlertTitle>Phase 1 foundation only</AlertTitle>
          <AlertDescription>
            This QR creates real 60-second tokens for approved businesses. The customer scanning flow is intentionally not built in this phase.
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
                The QR route contains a one-time short-lived token. It does not permanently authorize stamp issuance.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              {loading ? (
                <div className="flex min-h-[360px] items-center justify-center">
                  <div className="flex flex-col items-center gap-3 text-muted-foreground">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    Generating secure token...
                  </div>
                </div>
              ) : errorMessage ? (
                <div className="rounded-2xl border border-dashed p-8 text-center">
                  <ShieldCheck className="mx-auto h-10 w-10 text-muted-foreground" />
                  <h2 className="mt-4 font-heading text-xl font-bold text-foreground">Quick Stamp QR unavailable</h2>
                  <p className="mt-2 text-sm text-muted-foreground">{errorMessage}</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-5">
                  <div className="rounded-3xl border bg-white p-4 shadow-sm">
                    {qrImageUrl ? (
                      <img src={qrImageUrl} alt="Quick Stamp QR token" className="h-72 w-72 rounded-2xl" />
                    ) : null}
                  </div>

                  <div className="w-full max-w-md space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2 font-medium text-foreground">
                        <Timer className="h-4 w-4 text-primary" />
                        Token expires in
                      </span>
                      <span className="font-mono text-lg font-bold text-primary">{secondsRemaining}s</span>
                    </div>
                    <Progress value={progressValue} />
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
              <CardTitle>Security Rules</CardTitle>
              <CardDescription>
                This add-on reuses the existing business access and stamp security model.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-muted-foreground">
              <div className="rounded-xl border bg-muted/20 p-4">
                <p className="font-semibold text-foreground">Approved add-on required</p>
                <p>Token generation is denied unless Super Admin has approved and activated Quick Stamp QR for this business.</p>
              </div>
              <div className="rounded-xl border bg-muted/20 p-4">
                <p className="font-semibold text-foreground">60-second token lifetime</p>
                <p>Each refresh deletes the previous active token for this staff user and creates a new expiring token.</p>
              </div>
              <div className="rounded-xl border bg-muted/20 p-4">
                <p className="font-semibold text-foreground">No separate stamp system</p>
                <p>Future scan handling must call the existing secure stamp issuance RPC. This page does not issue stamps.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}