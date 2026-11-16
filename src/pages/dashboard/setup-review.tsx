import { useCallback, useEffect, useState } from "react";
import Head from "next/head";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/router";
import { CheckCircle2, Loader2, MessageSquareWarning } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { LoyaltyCard } from "@/components/LoyaltyCard";
import { TEMPLATE_PRESETS } from "@/lib/cardTemplatePresets";
import { DEFAULT_SETUP_PROGRAM, type SetupBrandingDraft, type SetupProgramDraft } from "@/components/admin-setup/types";

const APPROVED_MESSAGE = "Your Royalty Stamp setup has been approved and activated. Your loyalty card is ready to use!";
const READY_MESSAGE = "Your Royalty Stamp loyalty card setup is ready for review. Please review your card and loyalty program before approving the setup.";

type ReviewPayload = {
  business: { id: string; name: string; logo: string | null; primary_color: string | null; secondary_color: string | null };
  request: {
    id: string;
    status: string;
    readyForReviewAt: string | null;
    reviewRound: number;
    changeRequestFeedback: string | null;
    changesRequestedAt: string | null;
    approvedAt: string | null;
    activatedProgramId: string | null;
  } | null;
  draft: {
    targetProgramId: string | null;
    targetProgram: { id: string; name: string; stamp_target: number; reward_title: string; template_id: string } | null;
    branding: Partial<SetupBrandingDraft>;
    program: Partial<SetupProgramDraft>;
    updatedAt: string;
  } | null;
};

function SummaryRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b py-2.5 text-sm last:border-b-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium text-foreground">{value}</span>
    </div>
  );
}

function Swatch({ color }: { color: string }) {
  return (
    <span className="inline-flex items-center gap-2 font-mono text-xs">
      <span className="h-4 w-4 rounded border" style={{ backgroundColor: color }} />
      {color}
    </span>
  );
}

export default function SetupReviewPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [review, setReview] = useState<ReviewPayload | null>(null);
  const [loadError, setLoadError] = useState("");
  const [approveOpen, setApproveOpen] = useState(false);
  const [changesOpen, setChangesOpen] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [busy, setBusy] = useState<"approve" | "changes" | null>(null);

  const callApi = useCallback(async (method: "GET" | "POST", body?: Record<string, unknown>) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      void router.push("/auth/login");
      throw new Error("Not authenticated");
    }
    const response = await fetch("/api/business/setup-review", {
      method,
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        Accept: "application/json",
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload.success) throw new Error(payload.error || "Setup review request failed.");
    return payload;
  }, [router]);

  useEffect(() => {
    callApi("GET").then(setReview).catch((error: Error) => setLoadError(error.message));
  }, [callApi]);

  const handleApprove = async () => {
    if (!review?.request || !review.draft) return;
    setBusy("approve");
    try {
      const payload = await callApi("POST", { action: "approve", requestId: review.request.id, draftUpdatedAt: review.draft.updatedAt });
      setReview(payload);
      setApproveOpen(false);
      toast({ title: "Setup activated", description: APPROVED_MESSAGE });
    } catch (error) {
      toast({ title: "Setup not activated", description: (error as Error).message, variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };

  const handleRequestChanges = async () => {
    if (!review?.request) return;
    setBusy("changes");
    try {
      const payload = await callApi("POST", { action: "request_changes", requestId: review.request.id, feedback: feedback.trim() });
      setReview(payload);
      setChangesOpen(false);
      setFeedback("");
      toast({ title: "Change request sent", description: "Royalty Stamp will revise your setup and send it back for review." });
    } catch (error) {
      toast({ title: "Change request not sent", description: (error as Error).message, variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };

  const request = review?.request || null;
  const draft = review?.draft || null;
  const feedbackLength = feedback.trim().length;

  const renderStatus = () => {
    if (request?.status === "completed") {
      return (
        <Alert className="border-emerald-200 bg-emerald-50">
          <CheckCircle2 className="h-4 w-4 text-emerald-700" />
          <AlertTitle>Setup activated</AlertTitle>
          <AlertDescription className="space-y-3">
            <p>{APPROVED_MESSAGE}</p>
            {request.approvedAt && <p className="text-xs text-muted-foreground">Approved {new Date(request.approvedAt).toLocaleString()}</p>}
            <Button asChild size="sm"><Link href="/dashboard/programs">View loyalty programs</Link></Button>
          </AlertDescription>
        </Alert>
      );
    }
    if (request?.status === "changes_requested") {
      return (
        <Alert>
          <MessageSquareWarning className="h-4 w-4" />
          <AlertTitle>Changes requested</AlertTitle>
          <AlertDescription className="space-y-2">
            <p>Royalty Stamp will revise your setup and send it back for review. Your live card has not changed.</p>
            {request.changeRequestFeedback && <p className="rounded-md border bg-muted/30 p-3 text-sm italic">“{request.changeRequestFeedback}”</p>}
          </AlertDescription>
        </Alert>
      );
    }
    return (
      <Card>
        <CardContent className="space-y-3 pt-6 text-sm text-muted-foreground">
          <p>There is no setup waiting for your review.</p>
          <Button asChild variant="outline" size="sm"><Link href="/dashboard/settings">Back to settings</Link></Button>
        </CardContent>
      </Card>
    );
  };

  const renderReview = () => {
    if (!review || !request || !draft) return null;
    const program: SetupProgramDraft = { ...DEFAULT_SETUP_PROGRAM, ...draft.program };
    const template = TEMPLATE_PRESETS.find((preset) => preset.id === program.template_id);
    const logo = draft.branding.logo || review.business.logo || "";
    const brandPrimary = draft.branding.primary_color || review.business.primary_color || "";
    const brandSecondary = draft.branding.secondary_color || review.business.secondary_color || "";
    const previewTarget = program.stamp_target >= 2 && program.stamp_target <= 50 ? program.stamp_target : 10;

    return (
      <>
        <Alert>
          <AlertTitle>{request.reviewRound > 1 ? "Revised setup ready for review" : "Setup ready for review"}</AlertTitle>
          <AlertDescription>{READY_MESSAGE}</AlertDescription>
        </Alert>

        <div className="grid gap-6 lg:grid-cols-[420px_minmax(0,1fr)]">
          <div className="space-y-2">
            <LoyaltyCard
              programName={program.name || "Loyalty program"}
              programDescription={program.description}
              businessName={review.business.name}
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
            <p className="text-center text-xs text-muted-foreground">Read-only preview of the proposed card. Sample progress shown.</p>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Proposed loyalty program</CardTitle>
                <CardDescription>Prepared by Royalty Stamp. Nothing here is live until you approve it.</CardDescription>
              </CardHeader>
              <CardContent>
                <SummaryRow label="Applies to" value={draft.targetProgram ? `Existing program: ${draft.targetProgram.name}` : "A new loyalty program"} />
                <SummaryRow label="Program name" value={program.name} />
                <SummaryRow label="Card template" value={template?.name || program.template_id} />
                <SummaryRow label="Stamps required" value={<span className="tabular-nums">{program.stamp_target}</span>} />
                <SummaryRow label="Reward" value={program.reward_title} />
                <SummaryRow label="Reward description" value={program.reward_description || "—"} />
                <SummaryRow label="Reward expiry" value={program.reward_expiration_days ? `${program.reward_expiration_days} days` : "No expiration"} />
                <SummaryRow label="Card colors" value={<span className="flex flex-col items-end gap-1"><Swatch color={program.bg_color} /><Swatch color={program.primary_color} /></span>} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Business branding</CardTitle></CardHeader>
              <CardContent className="flex flex-wrap items-center gap-6">
                <div className="relative h-16 w-28 overflow-hidden rounded-md border bg-muted/30">
                  {logo ? <Image src={logo} alt={`${review.business.name} logo`} fill sizes="112px" className="object-contain" /> : <span className="flex h-full items-center justify-center text-xs text-muted-foreground">No logo</span>}
                </div>
                <div className="space-y-1 text-sm">
                  {brandPrimary && <Swatch color={brandPrimary} />}
                  {brandSecondary && <div><Swatch color={brandSecondary} /></div>}
                </div>
              </CardContent>
            </Card>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button type="button" className="sm:flex-1" disabled={busy !== null} onClick={() => setApproveOpen(true)}>Approve &amp; Activate Setup</Button>
              <Button type="button" variant="outline" className="sm:flex-1" disabled={busy !== null} onClick={() => setChangesOpen(true)}>Request Changes</Button>
            </div>
          </div>
        </div>

        <AlertDialog open={approveOpen} onOpenChange={setApproveOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Approve and activate this setup?</AlertDialogTitle>
              <AlertDialogDescription>
                The loyalty card and program shown here will become active for {review.business.name}.{" "}
                {draft.targetProgram
                  ? `This updates your existing program "${draft.targetProgram.name}". Customer stamps, rewards and history are kept.`
                  : "This creates a new loyalty program for your business."}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={busy === "approve"}>Cancel</AlertDialogCancel>
              <AlertDialogAction disabled={busy === "approve"} onClick={(event) => { event.preventDefault(); void handleApprove(); }}>
                {busy === "approve" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Approve &amp; Activate
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <Dialog open={changesOpen} onOpenChange={setChangesOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Request changes</DialogTitle>
              <DialogDescription>Tell Royalty Stamp what needs to be corrected. Your live card stays as it is.</DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <Label htmlFor="setup-feedback">What should be changed?</Label>
              <Textarea id="setup-feedback" rows={5} maxLength={1000} value={feedback} onChange={(event) => setFeedback(event.target.value)} placeholder="For example: please use our green logo and reduce the stamps to 8." />
              <p className="text-xs text-muted-foreground tabular-nums">{feedbackLength}/1000 characters · at least 10 required</p>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" disabled={busy === "changes"} onClick={() => setChangesOpen(false)}>Cancel</Button>
              <Button type="button" disabled={busy === "changes" || feedbackLength < 10 || feedbackLength > 1000} onClick={handleRequestChanges}>
                {busy === "changes" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Send request
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    );
  };

  return (
    <DashboardLayout>
      <Head><title>Review My Setup | Royalty Stamp</title></Head>
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-heading font-bold text-foreground">Review My Setup</h1>
            <p className="mt-1 text-muted-foreground">Check the loyalty card Royalty Stamp prepared for your business.</p>
          </div>
          {request && <Badge variant="outline">{request.status === "ready_for_review" ? "Ready for Review" : request.status === "changes_requested" ? "Changes Requested" : request.status.charAt(0).toUpperCase() + request.status.slice(1)}</Badge>}
        </div>

        {loadError ? (
          <Alert variant="destructive"><AlertTitle>Setup review unavailable</AlertTitle><AlertDescription>{loadError}</AlertDescription></Alert>
        ) : !review ? (
          <div className="flex min-h-[40vh] items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : request?.status === "ready_for_review" && draft ? (
          renderReview()
        ) : (
          renderStatus()
        )}
      </div>
    </DashboardLayout>
  );
}