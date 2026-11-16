import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { ArrowLeft, Clock, Loader2, ShieldAlert } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { LoyaltyCard } from "@/components/LoyaltyCard";
import { SetupProgramPanel } from "@/components/admin-setup/SetupProgramPanel";
import { SetupDesignPanel } from "@/components/admin-setup/SetupDesignPanel";
import { DEFAULT_SETUP_PROGRAM, programFromLive, type SetupAssetKind, type SetupBrandingDraft, type SetupProgramDraft, type SetupWorkspace } from "@/components/admin-setup/types";

type ApiError = Error & { status?: number };

function formatCountdown(totalSeconds: number) {
  const safe = Math.max(0, totalSeconds);
  return `${String(Math.floor(safe / 60)).padStart(2, "0")}:${String(safe % 60).padStart(2, "0")}`;
}

function readFileAsBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] || "");
    reader.onerror = () => reject(new Error("Unable to read the selected file."));
    reader.readAsDataURL(file);
  });
}

export default function SetupWorkspacePage() {
  const router = useRouter();
  const { toast } = useToast();
  const sessionId = typeof router.query.sessionId === "string" ? router.query.sessionId : "";
  const [workspace, setWorkspace] = useState<SetupWorkspace | null>(null);
  const [blockedReason, setBlockedReason] = useState("");
  const [targetProgramId, setTargetProgramId] = useState("new");
  const [program, setProgram] = useState<SetupProgramDraft>(DEFAULT_SETUP_PROGRAM);
  const [branding, setBranding] = useState<SetupBrandingDraft>({ logo: "", primary_color: "", secondary_color: "" });
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [readyOpen, setReadyOpen] = useState(false);
  const [markingReady, setMarkingReady] = useState(false);
  const [ending, setEnding] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);

  const callApi = useCallback(async (method: string, body?: Record<string, unknown>) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      void router.push("/auth/login");
      throw new Error("Not authenticated");
    }
    const response = await fetch("/api/admin/setup-workspace", {
      method,
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        "x-setup-session": sessionId,
        Accept: "application/json",
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload.success) {
      const error: ApiError = new Error(payload.error || "Setup workspace request failed.");
      error.status = response.status;
      throw error;
    }
    return payload;
  }, [router, sessionId]);

  const handleFailure = useCallback((error: unknown, title: string) => {
    const apiError = error as ApiError;
    if (apiError.status === 401 || apiError.status === 403 || apiError.status === 404) {
      setBlockedReason(apiError.message);
      return;
    }
    toast({ title, description: apiError.message, variant: "destructive" });
  }, [toast]);

  const applyWorkspace = useCallback((next: SetupWorkspace) => {
    setWorkspace(next);
    const firstLive = next.livePrograms[0];
    const base = firstLive ? programFromLive(firstLive) : DEFAULT_SETUP_PROGRAM;
    if (next.draft) {
      setTargetProgramId(next.draft.targetProgramId || "new");
      setProgram({ ...base, ...next.draft.program } as SetupProgramDraft);
    } else {
      setTargetProgramId(firstLive ? firstLive.id : "new");
      setProgram(base);
    }
    setBranding({
      logo: next.draft?.branding.logo ?? next.business.logo,
      primary_color: next.draft?.branding.primary_color ?? next.business.primary_color,
      secondary_color: next.draft?.branding.secondary_color ?? next.business.secondary_color,
    });
    setDirty(false);
  }, []);

  useEffect(() => {
    if (!router.isReady || !sessionId) return;
    callApi("GET")
      .then((payload) => applyWorkspace(payload.workspace))
      .catch((error) => setBlockedReason((error as ApiError).message));
  }, [router.isReady, sessionId, callApi, applyWorkspace]);

  useEffect(() => {
    if (!workspace) return;
    const expiresAt = new Date(workspace.session.expiresAt).getTime();
    const tick = () => {
      const remaining = Math.floor((expiresAt - Date.now()) / 1000);
      setSecondsLeft(remaining);
      if (remaining <= 0) setBlockedReason("This setup session has expired.");
    };
    tick();
    const interval = window.setInterval(tick, 1000);
    return () => window.clearInterval(interval);
  }, [workspace]);

  const updateProgram = (patch: Partial<SetupProgramDraft>) => {
    setProgram((current) => ({ ...current, ...patch }));
    setDirty(true);
  };

  const updateBranding = (patch: Partial<SetupBrandingDraft>) => {
    setBranding((current) => ({ ...current, ...patch }));
    setDirty(true);
  };

  const handleTargetChange = (value: string) => {
    setTargetProgramId(value);
    const live = workspace?.livePrograms.find((entry) => entry.id === value);
    if (live) setProgram(programFromLive(live));
    setDirty(true);
  };

  const handleUpload = async (kind: SetupAssetKind, file: File) => {
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: "Image too large", description: "Images must be 2 MB or smaller.", variant: "destructive" });
      return null;
    }
    try {
      const data = await readFileAsBase64(file);
      const payload = await callApi("POST", { action: "upload", kind, contentType: file.type, data });
      return String(payload.url);
    } catch (error) {
      handleFailure(error, "Upload failed");
      return null;
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = await callApi("PUT", { targetProgramId: targetProgramId === "new" ? null : targetProgramId, program, branding });
      applyWorkspace(payload.workspace);
      toast({ title: "Draft saved", description: "Changes are saved as a draft. Nothing is live yet." });
    } catch (error) {
      handleFailure(error, "Draft not saved");
    } finally {
      setSaving(false);
    }
  };

  const handleMarkReady = async () => {
    setMarkingReady(true);
    try {
      await callApi("POST", { action: "ready_for_review" });
      toast({ title: "Setup ready for review", description: "The setup session has been closed." });
      void router.push("/admin");
    } catch (error) {
      handleFailure(error, "Could not mark ready for review");
    } finally {
      setMarkingReady(false);
      setReadyOpen(false);
    }
  };

  const handleEndSession = async () => {
    setEnding(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      await fetch("/api/admin/setup-session", {
        method: "DELETE",
        headers: { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      }).catch(() => null);
    }
    void router.push("/admin");
  };

  if (blockedReason) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-4">
        <Card className="w-full max-w-md">
          <CardContent className="space-y-4 pt-6 text-center">
            <ShieldAlert className="mx-auto h-10 w-10 text-destructive" />
            <h1 className="text-lg font-semibold">Setup workspace unavailable</h1>
            <p className="text-sm text-muted-foreground">{blockedReason}</p>
            <Button asChild variant="outline"><Link href="/admin">Back to Superadmin</Link></Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  if (!workspace) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </main>
    );
  }

  const disabled = saving || markingReady || ending;
  const previewTarget = program.stamp_target >= 2 && program.stamp_target <= 50 ? program.stamp_target : 10;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-20 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-3">
            <Button asChild variant="ghost" size="sm"><Link href="/admin"><ArrowLeft className="mr-2 h-4 w-4" />Superadmin</Link></Button>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Remote business setup</p>
              <h1 className="text-lg font-semibold leading-tight">{workspace.business.name}</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="gap-1.5 font-mono tabular-nums">
              <Clock className="h-3.5 w-3.5" />
              {secondsLeft === null ? "--:--" : formatCountdown(secondsLeft)}
            </Badge>
            <Button type="button" variant="outline" size="sm" disabled={ending} onClick={handleEndSession}>
              {ending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}End session
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-6 px-4 py-6">
        <Alert>
          <AlertTitle>Draft only</AlertTitle>
          <AlertDescription>
            Changes here are saved as a pending setup draft. The business&apos;s live card, loyalty program and branding are not changed until the business approves the setup.
          </AlertDescription>
        </Alert>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
          <Card>
            <CardContent className="pt-6">
              <Tabs defaultValue="program">
                <TabsList className="mb-6">
                  <TabsTrigger value="program">Loyalty program</TabsTrigger>
                  <TabsTrigger value="design">Card design &amp; branding</TabsTrigger>
                </TabsList>
                <TabsContent value="program">
                  <SetupProgramPanel
                    program={program}
                    onChange={updateProgram}
                    livePrograms={workspace.livePrograms}
                    targetProgramId={targetProgramId}
                    onTargetChange={handleTargetChange}
                    canUseRewardExpiration={workspace.entitlements.canUseRewardExpiration}
                    disabled={disabled}
                  />
                </TabsContent>
                <TabsContent value="design">
                  <SetupDesignPanel
                    program={program}
                    onChange={updateProgram}
                    branding={branding}
                    onBrandingChange={updateBranding}
                    hasPremiumTemplates={workspace.entitlements.hasPremiumTemplates}
                    onUpload={handleUpload}
                    disabled={disabled}
                  />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          <div className="space-y-4 lg:sticky lg:top-24 lg:self-start">
            <LoyaltyCard
              programName={program.name || "Program name"}
              programDescription={program.description}
              businessName={workspace.business.name}
              stampTarget={previewTarget}
              currentStamps={Math.min(3, previewTarget)}
              rewardTitle={program.reward_title}
              rewardDescription={program.reward_description}
              customization={{
                template_id: program.template_id,
                bg_color: program.bg_color,
                primary_color: program.primary_color,
                secondary_color: program.secondary_color,
                text_color: program.text_color,
                stamp_icon: program.stamp_icon,
                reward_icon: program.reward_icon,
                card_logo_url: program.card_logo_url || undefined,
                card_banner_url: program.card_banner_url || undefined,
              }}
            />
            <Card>
              <CardContent className="space-y-3 pt-6">
                <p className="text-xs text-muted-foreground">
                  {workspace.draft ? `Draft last saved ${new Date(workspace.draft.updatedAt).toLocaleString()}` : "No draft saved yet."}
                  {dirty ? " Unsaved changes." : ""}
                </p>
                <Button type="button" className="w-full" disabled={disabled} onClick={handleSave}>
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save draft
                </Button>
                <Button type="button" variant="outline" className="w-full" disabled={disabled || dirty || !workspace.draft} onClick={() => setReadyOpen(true)}>
                  Mark Setup Ready for Review
                </Button>
                {(dirty || !workspace.draft) && (
                  <p className="text-xs text-muted-foreground">Save the draft before marking the setup ready for review.</p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <AlertDialog open={readyOpen} onOpenChange={setReadyOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mark setup ready for review?</AlertDialogTitle>
            <AlertDialogDescription>
              The request moves to Ready for Review and this setup session closes. Nothing is published to the business&apos;s live card or program.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={markingReady}>Cancel</AlertDialogCancel>
            <AlertDialogAction disabled={markingReady} onClick={(event) => { event.preventDefault(); void handleMarkReady(); }}>
              {markingReady && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Mark ready
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}