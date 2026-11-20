import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, Loader2, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type AccountHoldState = {
  status: string;
  hold: { id: string; holdType: "manual" | "automatic"; reason: string; placedAt: string } | null;
  pendingRestoration: { id: string; createdAt: string; amount: number | null } | null;
  recentlyRestored: { holdId: string; resolvedAt: string } | null;
  bankDetails: unknown;
};

const MAX_PROOF_BYTES = 5 * 1024 * 1024;
const ALLOWED_PROOF_TYPES = ["image/jpeg", "image/png", "application/pdf"];

async function fetchAccountHoldState(): Promise<AccountHoldState> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Not authenticated");
  const response = await fetch("/api/business/account-hold", {
    headers: { Authorization: `Bearer ${session.access_token}`, Accept: "application/json" },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload.success) throw new Error(payload.error || "Could not load account status.");
  return payload as AccountHoldState;
}

function formatLabel(key: string) {
  return key.replace(/[_-]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function BankDetails({ value }: { value: unknown }) {
  if (!value) {
    return <p className="text-sm text-muted-foreground">Bank payment instructions are not available. Please contact Royalty Stamp support.</p>;
  }
  if (typeof value === "string") {
    return <p className="whitespace-pre-line text-sm text-foreground">{value}</p>;
  }
  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).filter(([, entry]) => entry !== null && entry !== "" && typeof entry !== "object");
    return (
      <dl className="grid gap-2 text-sm sm:grid-cols-2">
        {entries.map(([key, entry]) => (
          <div key={key} className="rounded-md border bg-background p-2">
            <dt className="text-xs text-muted-foreground">{formatLabel(key)}</dt>
            <dd className="font-medium text-foreground break-words">{String(entry)}</dd>
          </div>
        ))}
      </dl>
    );
  }
  return null;
}

export function AccountOnHoldBanner() {
  return (
    <Alert className="mb-6 border-destructive/30 bg-destructive/5">
      <AlertTriangle className="h-4 w-4 text-destructive" />
      <AlertTitle>Your account is on hold</AlertTitle>
      <AlertDescription className="flex flex-wrap items-center gap-3">
        <span>Most dashboard features are paused until payment is approved.</span>
        <Button asChild size="sm" variant="outline"><Link href="/dashboard">Restore my account</Link></Button>
      </AlertDescription>
    </Alert>
  );
}

export function useAccountRestoredNotice(businessId: string | undefined, enabled: boolean) {
  const { toast } = useToast();

  useEffect(() => {
    if (!businessId || !enabled || typeof window === "undefined") return;
    void fetchAccountHoldState()
      .then((state) => {
        const restored = state.recentlyRestored;
        if (!restored) return;
        const key = `accountRestoredSeen_${restored.holdId}`;
        if (window.localStorage.getItem(key)) return;
        window.localStorage.setItem(key, "true");
        toast({ title: "Account restored", description: "Your payment was approved and your account is active again." });
      })
      .catch(() => undefined);
  }, [businessId, enabled, toast]);
}

export function AccountOnHoldPanel({ businessId }: { businessId: string }) {
  const { toast } = useToast();
  const [state, setState] = useState<AccountHoldState | null>(null);
  const [loadError, setLoadError] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [amount, setAmount] = useState("");
  const [reference, setReference] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoadError("");
      setState(await fetchAccountHoldState());
    } catch (error: any) {
      setLoadError(error.message);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!file) return toast({ title: "Payment proof required", description: "Attach a JPG, PNG or PDF receipt.", variant: "destructive" });
    if (!ALLOWED_PROOF_TYPES.includes(file.type) || file.size > MAX_PROOF_BYTES) {
      return toast({ title: "Invalid file", description: "Use a JPG, PNG or PDF file up to 5MB.", variant: "destructive" });
    }
    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      return toast({ title: "Amount required", description: "Enter the amount you paid.", variant: "destructive" });
    }

    setSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");
      const extension = file.name.split(".").pop()?.toLowerCase() || "pdf";
      const proofPath = `${businessId}/account-restoration-${Date.now()}.${extension}`;
      const { error: uploadError } = await supabase.storage.from("payment-proofs").upload(proofPath, file, { contentType: file.type, upsert: false });
      if (uploadError) throw new Error(`Proof upload failed: ${uploadError.message}`);

      const response = await fetch("/api/business/account-hold", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ proofPath, amount: parsedAmount, reference: reference.trim() }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.success) throw new Error(payload.error || "Could not submit restoration request.");

      toast({ title: "Restoration requested", description: "Royalty Stamp will review your payment proof." });
      setFile(null);
      setAmount("");
      setReference("");
      await load();
    } catch (error: any) {
      toast({ title: "Request failed", description: error.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Card className="border-destructive/30">
        <CardHeader>
          <div className="flex items-center gap-3">
            <span className="rounded-full bg-destructive/10 p-2 text-destructive"><AlertTriangle className="h-5 w-5" /></span>
            <div>
              <CardTitle className="font-heading text-2xl">Your account is on hold</CardTitle>
              <CardDescription>
                Stamping and dashboard features are paused. Your customers, loyalty cards, stamps, rewards and history are kept safe.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {loadError && <p className="text-destructive">{loadError}</p>}
          {!state && !loadError && <p className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading account status…</p>}
          {state?.hold && (
            <div className="rounded-md border bg-muted/30 p-3">
              <p className="text-xs text-muted-foreground">Reason · placed {new Date(state.hold.placedAt).toLocaleDateString()}</p>
              <p className="font-medium text-foreground">{state.hold.reason}</p>
            </div>
          )}
          <p className="text-muted-foreground">
            To restore access, pay using the bank details below and upload your payment proof. Billing and Settings remain available.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button asChild size="sm" variant="outline"><Link href="/dashboard/billing">Open Billing</Link></Button>
            <Button asChild size="sm" variant="outline"><Link href="/dashboard/settings">Open Settings</Link></Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Bank payment instructions</CardTitle>
        </CardHeader>
        <CardContent><BankDetails value={state?.bankDetails} /></CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Request account restoration</CardTitle>
          <CardDescription>Royalty Stamp reviews your receipt. Your account returns to Active after approval.</CardDescription>
        </CardHeader>
        <CardContent>
          {state?.pendingRestoration ? (
            <div className="flex items-start gap-3 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
              <CheckCircle2 className="mt-0.5 h-4 w-4" />
              <span>Restoration request submitted on {new Date(state.pendingRestoration.createdAt).toLocaleString()}. It is awaiting review.</span>
            </div>
          ) : (
            <form className="grid gap-4 sm:grid-cols-2" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <Label htmlFor="restoration-amount">Amount paid (AWG)</Label>
                <Input id="restoration-amount" type="number" min="0.01" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="restoration-reference">Payment reference (optional)</Label>
                <Input id="restoration-reference" maxLength={120} value={reference} onChange={(event) => setReference(event.target.value)} />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="restoration-proof">Payment proof (JPG, PNG or PDF, max 5MB)</Label>
                <Input id="restoration-proof" type="file" accept="image/jpeg,image/png,application/pdf" onChange={(event) => setFile(event.target.files?.[0] || null)} required />
              </div>
              <div className="sm:col-span-2">
                <Button type="submit" disabled={submitting || !state?.hold}>
                  {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                  Submit proof & request restoration
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}