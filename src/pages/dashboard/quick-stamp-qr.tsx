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
import { useI18n } from "@/contexts/I18nProvider";

type QuickStampToken = {
  token: string;
  expiresAt: string;
  businessId: string;
  loyaltyProgramId: string;
  locationId: string | null;
  ttlSeconds: number;
};

type LoyaltyProgramOption = {
  id: string;
  name: string;
  stamp_target: number;
  reward_title: string;
};

type BusinessLocationOption = {
  id: string;
  status?: string | null;
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

async function resolveAuthorizedLocationId(businessId: string) {
  if (typeof window === "undefined") {
    return { locationId: "", accessibleIds: [] as string[] };
  }

  const storedLocationId = window.localStorage.getItem(`active_location_${businessId}`) || "";
  const normalizedStoredLocationId = storedLocationId === "all" ? "" : storedLocationId;

  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return { locationId: "", accessibleIds: [] as string[] };
    }

    const { data: ownedBusiness } = await supabase
      .from("businesses")
      .select("id")
      .eq("id", businessId)
      .eq("owner_id", session.user.id)
      .maybeSingle();

    if (ownedBusiness) {
      return { locationId: normalizedStoredLocationId, accessibleIds: normalizedStoredLocationId ? [normalizedStoredLocationId] : [] };
    }

    const { data: membership } = await supabase
      .from("business_users")
      .select("id")
      .eq("business_id", businessId)
      .eq("user_id", session.user.id)
      .eq("status", "active")
      .limit(1)
      .maybeSingle();

    if (!membership?.id) {
      return { locationId: "", accessibleIds: [] as string[] };
    }

    const { data: assignments } = await supabase
      .from("business_user_locations")
      .select("location_id, status")
      .eq("business_user_id", membership.id)
      .eq("business_id", businessId)
      .eq("status", "active");

    const accessibleIds = (assignments || [])
      .filter((assignment: { location_id?: string | null; status?: string | null }) => assignment?.location_id && assignment.status !== "inactive")
      .map((assignment: { location_id?: string | null }) => String(assignment.location_id));

    if (normalizedStoredLocationId && accessibleIds.includes(normalizedStoredLocationId)) {
      return { locationId: normalizedStoredLocationId, accessibleIds };
    }

    return { locationId: accessibleIds.length === 1 ? accessibleIds[0] : "", accessibleIds };
  } catch {
    return { locationId: "", accessibleIds: [] as string[] };
  }
}

export default function QuickStampQrPage() {
  const { toast } = useToast();
  const { t } = useI18n();
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [businessName, setBusinessName] = useState("Royalty Stamp");
  const [programs, setPrograms] = useState<LoyaltyProgramOption[]>([]);
  const [selectedProgramId, setSelectedProgramId] = useState("");
  const [isRestrictedStaff, setIsRestrictedStaff] = useState(false);
  const [activeLocationId, setActiveLocationId] = useState("");
  const [accessibleLocationIds, setAccessibleLocationIds] = useState<string[]>([]);
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

  const refreshToken = useCallback(async (resolvedBusinessId: string, programId: string, locationIdOverride?: string) => {
    if (!programId) {
      setTokenData(null);
      setSecondsRemaining(0);
      setErrorMessage(t("dashboard.quickStamp.selectProgramError"));
      setLoading(false);
      return;
    }

    setRefreshing(true);
    setErrorMessage("");

    try {
      const tokenParams: {
        p_business_id: string;
        p_loyalty_program_id: string;
        p_location_id?: string;
      } = {
        p_business_id: resolvedBusinessId,
        p_loyalty_program_id: programId,
      };

      if (locationIdOverride !== undefined ? locationIdOverride : activeLocationId) {
        tokenParams.p_location_id = locationIdOverride !== undefined ? locationIdOverride : activeLocationId;
      }

      const { data, error } = await (supabase as any).rpc("generate_quick_stamp_qr_token", tokenParams);

      if (error) throw error;
      if (!data?.success) {
        throw new Error(data?.message || t("dashboard.quickStamp.tokenError"));
      }

      setTokenData({
        token: data.token,
        expiresAt: data.expires_at,
        businessId: data.business_id,
        loyaltyProgramId: data.loyalty_program_id,
        locationId: data.location_id || null,
        ttlSeconds: Number(data.ttl_seconds || 60),
      });
      setSecondsRemaining(getSecondsRemaining(data.expires_at));
    } catch (err: any) {
      setErrorMessage(err.message || t("dashboard.quickStamp.unavailableError"));
      setTokenData(null);
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  }, [activeLocationId, t]);

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
        setErrorMessage(t("dashboard.quickStamp.workspaceNotFound"));
        setLoading(false);
        return;
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!mounted) return;

      if (!session?.user) {
        setErrorMessage(t("dashboard.quickStamp.workspaceNotFound"));
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
      let visiblePrograms = activePrograms;

      const { data: ownedBusiness } = await supabase
        .from("businesses")
        .select("id")
        .eq("id", resolvedBusiness.id)
        .eq("owner_id", session.user.id)
        .maybeSingle();

      if (!mounted) return;

      if (!ownedBusiness) {
        const { data: membership } = await supabase
          .from("business_users")
          .select("role, status")
          .eq("business_id", resolvedBusiness.id)
          .eq("user_id", session.user.id)
          .eq("status", "active")
          .maybeSingle();

        if (!mounted) return;

        if (membership?.role === "staff") {
          setIsRestrictedStaff(true);

          const { data: assignmentRows, error: assignmentError } = await supabase
            .from("staff_loyalty_program_assignments")
            .select("loyalty_program_id")
            .eq("business_id", resolvedBusiness.id)
            .eq("staff_user_id", session.user.id);

          if (!mounted) return;

          if (assignmentError) {
            setErrorMessage("Loyalty card assignments could not be loaded.");
            setLoading(false);
            return;
          }

          const assignedProgramIds = new Set(
            (assignmentRows || []).map((assignment: { loyalty_program_id: string }) => assignment.loyalty_program_id)
          );

          visiblePrograms = activePrograms.filter((program) => assignedProgramIds.has(program.id));
        } else {
          setIsRestrictedStaff(false);
        }
      } else {
        setIsRestrictedStaff(false);
      }

      setPrograms(visiblePrograms);

      if (visiblePrograms.length === 0 && !ownedBusiness) {
        setErrorMessage("No loyalty cards have been assigned to your account. Please contact your Business Admin.");
        setLoading(false);
        return;
      }

      const firstProgram = visiblePrograms[0];

      if (!firstProgram) {
        setErrorMessage(t("dashboard.quickStamp.activateProgramError"));
        setLoading(false);
        return;
      }

      setSelectedProgramId(firstProgram.id);
      await refreshToken(resolvedBusiness.id, firstProgram.id, authorizedLocation.locationId);
    };

    void loadBusiness();

    return () => {
      mounted = false;
    };
  }, [refreshToken]);

  useEffect(() => {
    const handleActiveLocationChange = (event: Event) => {
      const detail = (event as CustomEvent<{ businessId?: string; locationId?: string }>).detail;

      if (!detail?.businessId || detail.businessId !== businessId) return;

      const nextLocationId = detail.locationId === "all" ? "" : detail.locationId || "";
      if (nextLocationId && accessibleLocationIds.length > 0 && !accessibleLocationIds.includes(nextLocationId)) {
        setActiveLocationId(accessibleLocationIds.length === 1 ? accessibleLocationIds[0] : "");
        return;
      }

      setActiveLocationId(nextLocationId);
    };

    window.addEventListener("royalty-active-location-change", handleActiveLocationChange);

    return () => {
      window.removeEventListener("royalty-active-location-change", handleActiveLocationChange);
    };
  }, [businessId, accessibleLocationIds]);

  useEffect(() => {
    if (!businessId || !selectedProgramId) return;

    void refreshToken(businessId, selectedProgramId);
  }, [activeLocationId, businessId, refreshToken, selectedProgramId]);

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
      title: t("dashboard.quickStamp.refreshedTitle"),
      description: t("dashboard.quickStamp.refreshedDescription"),
    });
  };

  const progressValue = tokenData?.ttlSeconds ? (secondsRemaining / tokenData.ttlSeconds) * 100 : 0;
  const countdownLabel = formatCountdown(secondsRemaining);
  const canDisplayQr = Boolean(qrImageUrl && tokenData && !errorMessage);

  return (
    <DashboardLayout>
      <Head>
        <title>{t("dashboard.quickStamp.seoTitle")}</title>
      </Head>

      {isFullScreen && canDisplayQr ? (
        <QuickStampFullScreen
          qrImageUrl={qrImageUrl}
          countdownLabel={countdownLabel}
          progressValue={progressValue}
          businessName={businessName}
          programName={selectedProgram?.name || t("dashboard.quickStamp.defaultProgram")}
          onExit={() => setIsFullScreen(false)}
        />
      ) : null}

      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Badge variant="outline" className="mb-3 w-fit gap-1 border-primary/30 bg-primary/5 text-primary">
              <Zap className="h-3.5 w-3.5" />
              {t("dashboard.quickStamp.addonBadge")}
            </Badge>
            <h1 className="font-heading text-3xl font-bold text-foreground">{t("dashboard.quickStamp.title")}</h1>
            <p className="mt-1 max-w-2xl text-muted-foreground">
              {t("dashboard.quickStamp.description")}
            </p>
            {isRestrictedStaff ? (
              <p className="mt-2 text-sm font-medium text-primary">
                Only loyalty cards assigned to your staff account are available here.
              </p>
            ) : null}
          </div>

          <Button type="button" variant="outline" className="gap-2" onClick={handleManualRefresh} disabled={!businessId || !selectedProgramId || refreshing}>
            {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            {t("dashboard.quickStamp.refreshQr")}
          </Button>
        </div>

        <Alert className="border-primary/20 bg-primary/5 text-foreground">
          <ShieldCheck className="h-4 w-4 text-primary" />
          <AlertTitle>{t("dashboard.quickStamp.customerFlowTitle")}</AlertTitle>
          <AlertDescription>
            {t("dashboard.quickStamp.customerFlowDescription")}
          </AlertDescription>
        </Alert>

        <div className="grid gap-6 lg:grid-cols-[1fr_0.85fr]">
          <Card className="overflow-hidden border-primary/20 shadow-sm">
            <CardHeader className="border-b bg-primary/[0.03]">
              <CardTitle className="flex items-center gap-2">
                <QrCode className="h-5 w-5 text-primary" />
                {t("dashboard.quickStamp.cardTitle")}
              </CardTitle>
              <CardDescription>
                {t("dashboard.quickStamp.cardDescription")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5 p-6">
              <div className="space-y-2">
                <label htmlFor="quickStampProgram" className="text-sm font-semibold text-foreground">
                  {t("dashboard.quickStamp.programLabel")}
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
                      {t("dashboard.quickStamp.programOption", { programName: program.name, stampTarget: program.stamp_target })}
                    </option>
                  ))}
                </select>
                {selectedProgram ? (
                  <p className="text-xs text-muted-foreground">
                    {t("dashboard.quickStamp.programHelp", { rewardTitle: selectedProgram.reward_title })}
                  </p>
                ) : null}
              </div>

              {loading ? (
                <div className="flex min-h-[360px] items-center justify-center">
                  <div className="flex flex-col items-center gap-3 text-muted-foreground">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    {t("dashboard.quickStamp.generating")}
                  </div>
                </div>
              ) : errorMessage ? (
                <div className="rounded-2xl border border-dashed p-8 text-center">
                  <AlertTriangle className="mx-auto h-10 w-10 text-amber-600" />
                  <h2 className="mt-4 font-heading text-xl font-bold text-foreground">{t("dashboard.quickStamp.unavailableTitle")}</h2>
                  <p className="mt-2 text-sm text-muted-foreground">{errorMessage}</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-5">
                  <div className="w-full rounded-[2rem] border border-primary/20 bg-white p-4 shadow-xl shadow-primary/10 sm:w-fit sm:p-6">
                    {qrImageUrl ? (
                      <img src={qrImageUrl} alt={t("dashboard.quickStamp.qrAlt")} className="mx-auto aspect-square h-80 w-80 rounded-3xl sm:h-[26rem] sm:w-[26rem] lg:h-[28rem] lg:w-[28rem]" />
                    ) : null}
                  </div>

                  <div className="w-full max-w-lg space-y-4 text-center">
                    <div className="rounded-2xl border bg-primary/5 px-5 py-4">
                      <p className="flex items-center justify-center gap-2 text-sm font-semibold text-foreground">
                        <Timer className="h-4 w-4 text-primary" />
                        {t("dashboard.quickStamp.expiresIn")}
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
                      {t("dashboard.quickStamp.displayFullScreen")}
                    </Button>
                    <p className="text-sm font-medium text-foreground">{t("dashboard.quickStamp.scanHelp")}</p>
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
              <CardTitle>{t("dashboard.quickStamp.validationTitle")}</CardTitle>
              <CardDescription>
                {t("dashboard.quickStamp.validationDescription")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-muted-foreground">
              <div className="rounded-xl border bg-muted/20 p-4">
                <p className="font-semibold text-foreground">{t("dashboard.quickStamp.validationAddonTitle")}</p>
                <p>{t("dashboard.quickStamp.validationAddonDescription")}</p>
              </div>
              <div className="rounded-xl border bg-muted/20 p-4">
                <p className="font-semibold text-foreground">{t("dashboard.quickStamp.validationMembershipTitle")}</p>
                <p>{t("dashboard.quickStamp.validationMembershipDescription")}</p>
              </div>
              <div className="rounded-xl border bg-muted/20 p-4">
                <p className="font-semibold text-foreground">{t("dashboard.quickStamp.validationTransactionTitle")}</p>
                <p>{t("dashboard.quickStamp.validationTransactionDescription")}</p>
              </div>
              <div className="rounded-xl border bg-muted/20 p-4">
                <p className="font-semibold text-foreground">{t("dashboard.quickStamp.validationRepeatTitle")}</p>
                <p>{t("dashboard.quickStamp.validationRepeatDescription")}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}