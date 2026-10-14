import { useMemo, useState } from "react";
import { AlertTriangle, FileCheck2, Loader2, RotateCcw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";

type ReconcileRowStatus = "retained" | "invalid" | "duplicate" | "ambiguous" | "outside_program";

type ReconcilePreviewRow = {
  rowNumber: number;
  memberName: string;
  emailAddress: string;
  phoneNumber: string;
  loyaltyProgram: string;
  status: ReconcileRowStatus;
  matchedMembershipId: string | null;
  messages: string[];
};

type ReconcileCandidate = {
  membershipId: string;
  memberName: string;
  emailAddress: string;
  phoneNumber: string;
  currentStamps: number;
  totalStamps: number;
  rewardsEarned: number;
  reason: string;
};

type ReconcilePreview = {
  rows: ReconcilePreviewRow[];
  targetProgramId: string;
  targetProgramName: string;
  currentMemberships: ReconcileCandidate[];
  retainedMemberships: ReconcileCandidate[];
  removalCandidates: ReconcileCandidate[];
  skippedMemberships: ReconcileCandidate[];
  summary: {
    current: number;
    retained: number;
    proposedRemoval: number;
    skipped: number;
    duplicateRows: number;
    invalidRows: number;
    ambiguousRows: number;
    outsideProgramRows: number;
    headersOnlyWorkbook: boolean;
  };
  reconcileToken: string;
};

type ReconcileResult = {
  removedCount: number;
  retainedCount: number;
  skippedCount: number;
  failedCount: number;
};

type ProgramOption = {
  id: string;
  name: string;
};

interface ReconcileMembersDialogProps {
  open: boolean;
  programs: ProgramOption[];
  onOpenChange: (open: boolean) => void;
  onCompleted: () => Promise<void>;
}

function getErrorMessage(status: number, fallback: string) {
  if (status === 401) return "Your session expired. Please sign in again.";
  if (status === 403) return "Member reconciliation is not enabled for this subscription plan.";
  if (status === 413) return fallback || "This workbook is too large to reconcile safely.";
  if (status >= 500) return "The reconciliation could not be processed right now.";
  return fallback || "The reconciliation could not be completed.";
}

export function ReconcileMembersDialog({ open, programs, onOpenChange, onCompleted }: ReconcileMembersDialogProps) {
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [programId, setProgramId] = useState("");
  const [preview, setPreview] = useState<ReconcilePreview | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [confirmationText, setConfirmationText] = useState("");
  const [result, setResult] = useState<ReconcileResult | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const selectedCount = selectedIds.size;
  const hasBlockingRows = useMemo(() => {
    if (!preview) return false;
    return preview.summary.invalidRows > 0 || preview.summary.ambiguousRows > 0 || preview.summary.duplicateRows > 0;
  }, [preview]);

  const reset = () => {
    setFile(null);
    setProgramId("");
    setPreview(null);
    setSelectedIds(new Set());
    setConfirmationText("");
    setResult(null);
  };

  const previewReconciliation = async () => {
    if (!file || !programId || previewing) return;

    if (!file.name.toLowerCase().endsWith(".xlsx")) {
      toast({ title: "Unsupported file", description: "Upload a genuine .xlsx workbook.", variant: "destructive" });
      return;
    }

    try {
      setPreviewing(true);
      setPreview(null);
      setResult(null);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast({ title: "Session required", description: "Please sign in again before reconciling members.", variant: "destructive" });
        return;
      }

      const response = await fetch(`/api/business/member-reconcile-preview?programId=${encodeURIComponent(programId)}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        },
        body: file,
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(getErrorMessage(response.status, typeof payload?.error === "string" ? payload.error : ""));
      }

      setPreview(payload.preview);
      setSelectedIds(new Set((payload.preview?.removalCandidates || []).map((candidate: ReconcileCandidate) => candidate.membershipId)));
      toast({ title: "Reconciliation preview ready", description: "Review proposed removals. No memberships have been removed." });
    } catch (error: any) {
      toast({ title: "Preview failed", description: error.message || "The workbook could not be previewed.", variant: "destructive" });
    } finally {
      setPreviewing(false);
    }
  };

  const confirmRemoval = async () => {
    if (!preview || confirming) return;

    try {
      setConfirming(true);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast({ title: "Session required", description: "Please sign in again before confirming removals.", variant: "destructive" });
        return;
      }

      const response = await fetch("/api/business/member-reconcile-confirm", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          targetProgramId: preview.targetProgramId,
          rows: preview.rows,
          selectedMembershipIds: Array.from(selectedIds),
          reconcileToken: preview.reconcileToken,
          confirmationText,
        }),
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(getErrorMessage(response.status, typeof payload?.error === "string" ? payload.error : ""));
      }

      setResult(payload.result);
      toast({
        title: "Reconciliation complete",
        description: `${payload.result?.removedCount || 0} removed, ${payload.result?.retainedCount || 0} retained, ${payload.result?.skippedCount || 0} skipped, ${payload.result?.failedCount || 0} failed.`,
      });
      await onCompleted();
    } catch (error: any) {
      toast({ title: "Removal failed", description: error.message || "Memberships could not be removed safely.", variant: "destructive" });
    } finally {
      setConfirming(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => {
      onOpenChange(nextOpen);
      if (!nextOpen) reset();
    }}>
      <DialogContent className="max-w-5xl bg-card border-border overflow-y-auto max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="font-heading text-2xl font-bold flex items-center gap-2">
            <FileCheck2 className="text-primary h-6 w-6" /> Reconcile Members
          </DialogTitle>
          <DialogDescription>
            Upload an edited Royalty Stamp export and remove only selected memberships missing from the selected program. Previewing never removes members.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="grid gap-4 md:grid-cols-[1fr_16rem]">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground">Edited Excel export</label>
              <Input type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" disabled={previewing || confirming} onChange={(event) => {
                setFile(event.target.files?.[0] || null);
                setPreview(null);
                setResult(null);
              }} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground">Target loyalty program</label>
              <select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={programId} disabled={previewing || confirming} onChange={(event) => {
                setProgramId(event.target.value);
                setPreview(null);
                setResult(null);
              }}>
                <option value="">Select program</option>
                {programs.map((program) => <option key={program.id} value={program.id}>{program.name}</option>)}
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={reset} disabled={previewing || confirming}>
              <RotateCcw className="mr-2 h-4 w-4" /> Reset
            </Button>
            <Button type="button" onClick={previewReconciliation} disabled={!file || !programId || previewing || confirming} className="gap-2">
              {previewing && <Loader2 className="h-4 w-4 animate-spin" />} Preview differences
            </Button>
          </div>

          {preview && (
            <div className="space-y-4 rounded-xl border bg-muted/20 p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <h3 className="font-heading font-bold text-foreground">Preview for {preview.targetProgramName}</h3>
                  <p className="text-sm text-muted-foreground">{preview.summary.current} current, {preview.summary.retained} retained, {preview.summary.proposedRemoval} proposed removals.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge>Remove: {selectedCount}</Badge>
                  <Badge variant="outline">Skipped: {preview.summary.skipped}</Badge>
                  <Badge variant={hasBlockingRows ? "secondary" : "outline"}>Row issues: {preview.summary.invalidRows + preview.summary.ambiguousRows + preview.summary.duplicateRows}</Badge>
                </div>
              </div>

              {hasBlockingRows && (
                <div className="flex gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  Invalid, duplicate, or ambiguous rows were not used for automatic removal decisions.
                </div>
              )}

              {preview.summary.headersOnlyWorkbook && (
                <div className="flex gap-3 rounded-lg border-2 border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
                  <AlertTriangle className="h-5 w-5 shrink-0" />
                  <div className="space-y-1">
                    <p className="font-bold">Headers-only reconciliation workbook</p>
                    <p>
                      This workbook contains no member rows for {preview.targetProgramName}. If confirmed, {preview.summary.proposedRemoval} selected-program memberships are proposed for removal. Nothing will be removed unless you review the list and type REMOVE {selectedCount}.
                    </p>
                  </div>
                </div>
              )}

              <div className="max-h-72 overflow-auto rounded-lg border bg-background">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">Remove</TableHead>
                      <TableHead>Member</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Reason</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {preview.removalCandidates.map((candidate) => (
                      <TableRow key={candidate.membershipId}>
                        <TableCell>
                          <input
                            type="checkbox"
                            checked={selectedIds.has(candidate.membershipId)}
                            onChange={(event) => {
                              const next = new Set(selectedIds);
                              if (event.target.checked) next.add(candidate.membershipId);
                              else next.delete(candidate.membershipId);
                              setSelectedIds(next);
                              setConfirmationText("");
                            }}
                          />
                        </TableCell>
                        <TableCell>{candidate.memberName}</TableCell>
                        <TableCell>{candidate.emailAddress || "—"}</TableCell>
                        <TableCell>{candidate.phoneNumber || "—"}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{candidate.reason}</TableCell>
                      </TableRow>
                    ))}
                    {preview.removalCandidates.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">No safe removal candidates were found.</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              <div className="rounded-lg border bg-background p-4 space-y-3">
                <p className="text-sm text-muted-foreground">Type <strong>REMOVE {selectedCount}</strong> to confirm the selected membership removals. Customer profiles, stamps, rewards, and history are preserved.</p>
                {preview.summary.headersOnlyWorkbook && (
                  <p className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm font-semibold text-destructive">
                    You are confirming a headers-only reconciliation list. This will remove {selectedCount} selected memberships from {preview.targetProgramName} only.
                  </p>
                )}
                <Input value={confirmationText} onChange={(event) => setConfirmationText(event.target.value)} placeholder={`REMOVE ${selectedCount}`} disabled={confirming || selectedCount === 0} />
                <Button type="button" onClick={confirmRemoval} disabled={confirming || selectedCount === 0 || confirmationText !== `REMOVE ${selectedCount}`} className="w-full gap-2">
                  {confirming && <Loader2 className="h-4 w-4 animate-spin" />} Confirm removal of {selectedCount} memberships
                </Button>
              </div>
            </div>
          )}

          {result && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
              <p className="font-semibold">Final result</p>
              <p>{result.removedCount} removed, {result.retainedCount} retained, {result.skippedCount} skipped, {result.failedCount} failed.</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}