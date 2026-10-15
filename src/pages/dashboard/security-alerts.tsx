import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/router";
import { AlertTriangle, CheckCircle2, Clock, Eye, Loader2, RefreshCw, ShieldAlert, UserRound } from "lucide-react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { SEO } from "@/components/SEO";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";

type SecurityAlert = {
  id: string;
  businessId: string;
  loyaltyProgramId: string;
  customerId: string;
  loyaltyCardId: string | null;
  staffUserId: string | null;
  staffName: string;
  staffEmail: string | null;
  staffIdentifier: string;
  memberName: string;
  memberIdentifier: string;
  programName: string;
  cooldownStartedAt: string;
  cooldownExpiresAt: string;
  firstAttemptAt: string;
  latestAttemptAt: string;
  attemptCount: number;
  reason: string;
  status: string;
  readAt: string | null;
  createdAt: string;
};

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-AW", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default function SecurityAlertsPage() {
  const router = useRouter();
  const [businessId, setBusinessId] = useState("");
  const [alerts, setAlerts] = useState<SecurityAlert[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [selectedAlert, setSelectedAlert] = useState<SecurityAlert | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [markingReadId, setMarkingReadId] = useState("");
  const [error, setError] = useState("");
  const [connectionStatus, setConnectionStatus] = useState<"connecting" | "live" | "polling" | "disconnected">("connecting");
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const unreadAlerts = useMemo(() => alerts.filter((alert) => !alert.readAt), [alerts]);

  const scheduleAuthoritativeRefresh = useCallback((nextBusinessId: string, delayMs = 750) => {
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
    }

    refreshTimerRef.current = setTimeout(() => {
      void loadAlerts(nextBusinessId, true);
    }, delayMs);
  }, []);

  const loadAlerts = useCallback(async (nextBusinessId = businessId, quiet = false) => {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      router.push("/auth/login");
      return;
    }

    if (!nextBusinessId) return;

    if (quiet) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError("");

    try {
      const response = await fetch(`/api/business/security-alerts?businessId=${encodeURIComponent(nextBusinessId)}`, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "Unable to load security alerts");
      }

      setAlerts(payload.alerts || []);
      setUnreadCount(Number(payload.unreadCount || 0));
    } catch (err: any) {
      setError(err.message || "Unable to load security alerts.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [businessId, router]);

  useEffect(() => {
    const initialize = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        router.push("/auth/login");
        return;
      }

      const { data, error: businessError } = await (supabase as any).rpc("get_business_dashboard_access_status");

      if (businessError) {
        setError("Unable to load your business workspace.");
        setLoading(false);
        return;
      }

      const resolvedBusiness = Array.isArray(data) ? data[0] : data;

      if (!resolvedBusiness?.id) {
        setError("No business workspace is available for this account.");
        setLoading(false);
        return;
      }

      setBusinessId(resolvedBusiness.id);
      await loadAlerts(resolvedBusiness.id);
    };

    void initialize();

    return () => {
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
      }
    };
  }, [loadAlerts, router]);

  useEffect(() => {
    if (!businessId) return;

    let pollInterval: ReturnType<typeof setInterval> | null = null;
    let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;

    const channel = supabase
      .channel(`security_alerts_${businessId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "anti_fraud_security_alerts",
          filter: `business_id=eq.${businessId}`,
        },
        () => {
          setConnectionStatus("live");
          scheduleAuthoritativeRefresh(businessId);
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          setConnectionStatus("live");
          scheduleAuthoritativeRefresh(businessId, 0);
          return;
        }

        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
          setConnectionStatus("polling");
          if (reconnectTimeout) {
            clearTimeout(reconnectTimeout);
          }
          reconnectTimeout = setTimeout(() => {
            scheduleAuthoritativeRefresh(businessId, 0);
          }, 1000);
        }
      });

    pollInterval = setInterval(() => {
      void loadAlerts(businessId, true);
    }, connectionStatus === "live" ? 60000 : 15000);

    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === "visible") {
        scheduleAuthoritativeRefresh(businessId, 0);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityOrFocus);
    window.addEventListener("focus", handleVisibilityOrFocus);

    return () => {
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
      }
      if (pollInterval) {
        clearInterval(pollInterval);
      }
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
      document.removeEventListener("visibilitychange", handleVisibilityOrFocus);
      window.removeEventListener("focus", handleVisibilityOrFocus);
      supabase.removeChannel(channel);
    };
  }, [businessId, connectionStatus, loadAlerts, scheduleAuthoritativeRefresh]);

  const markAsRead = async (alert: SecurityAlert) => {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      router.push("/auth/login");
      return;
    }

    setMarkingReadId(alert.id);
    setError("");

    try {
      const response = await fetch("/api/business/security-alerts", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          businessId,
          alertId: alert.id,
        }),
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "Unable to mark alert as read");
      }

      const readAt = payload.alert?.readAt || new Date().toISOString();
      const status = payload.alert?.status || "reviewed";

      setAlerts((current) => current.map((item) => (
        item.id === alert.id ? { ...item, readAt, status } : item
      )));
      setUnreadCount((current) => Math.max(current - (alert.readAt ? 0 : 1), 0));
      setSelectedAlert((current) => current?.id === alert.id ? { ...current, readAt, status } : current);
    } catch (err: any) {
      setError(err.message || "Unable to mark alert as read.");
    } finally {
      setMarkingReadId("");
    }
  };

  return (
    <DashboardLayout>
      <SEO
        title="Security Alerts | Royalty Stamp"
        description="Review anti-fraud cooldown security alerts for repeated blocked stamp attempts."
      />

      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-primary/10 p-3 text-primary">
                <ShieldAlert className="h-6 w-6" />
              </div>
              <div>
                <h1 className="font-heading text-3xl font-bold text-foreground">Security Alerts</h1>
                <p className="text-muted-foreground">
                  Repeated stamp attempts blocked by anti-fraud cooldown protection.
                </p>
              </div>
            </div>
          </div>
          <Button type="button" variant="outline" disabled={loading || refreshing} onClick={() => loadAlerts(businessId, true)}>
            {refreshing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            Refresh
          </Button>
        </div>

        <Alert variant={connectionStatus === "disconnected" ? "destructive" : "default"}>
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>
            {connectionStatus === "live" ? "Live security monitoring" : "Security monitoring fallback active"}
          </AlertTitle>
          <AlertDescription>
            {connectionStatus === "live"
              ? "New and updated security alerts are refreshed automatically from the authorized server state."
              : "Realtime delivery is unavailable or reconnecting, so this page is checking for updates automatically."}
          </AlertDescription>
        </Alert>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardDescription>Unread alerts</CardDescription>
              <CardTitle className="text-3xl">{unreadCount}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardDescription>Total alerts</CardDescription>
              <CardTitle className="text-3xl">{alerts.length}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardDescription>Open repeated attempts</CardDescription>
              <CardTitle className="text-3xl">{alerts.filter((alert) => alert.status === "open").length}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Security alerts unavailable</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Security Activity</CardTitle>
            <CardDescription>
              The first cooldown-blocked attempt is recorded as an event. Alerts appear when the same staff member repeats a blocked attempt for the same member and program in the same cooldown period.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <div className="space-y-3">
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
              </div>
            ) : alerts.length === 0 ? (
              <div className="rounded-xl border border-dashed p-8 text-center">
                <CheckCircle2 className="mx-auto mb-3 h-10 w-10 text-primary" />
                <h3 className="font-semibold text-foreground">No repeated cooldown alerts</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Cooldown-blocked attempts may still be recorded as security events; repeated-attempt alerts will appear here when the Phase 2 trigger is met.
                </p>
              </div>
            ) : (
              alerts.map((alert) => (
                <div key={alert.id} className="rounded-xl border bg-card p-4 shadow-sm">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={alert.readAt ? "outline" : "default"}>{alert.readAt ? "Read" : "Unread"}</Badge>
                        <Badge variant="secondary">{alert.status}</Badge>
                        <Badge variant="outline">{alert.attemptCount} blocked attempts</Badge>
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground">Repeated stamp attempts during cooldown</h3>
                        <p className="text-sm text-muted-foreground">
                          {alert.staffName} attempted to stamp {alert.memberName} again during the active cooldown for {alert.programName}.
                        </p>
                      </div>
                      <div className="grid gap-3 text-sm md:grid-cols-3">
                        <div className="flex gap-2">
                          <UserRound className="mt-0.5 h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="font-medium">Staff</p>
                            <p className="text-muted-foreground">{alert.staffName}</p>
                            {alert.staffEmail && alert.staffEmail !== alert.staffName ? (
                              <p className="text-xs text-muted-foreground">{alert.staffEmail}</p>
                            ) : null}
                          </div>
                        </div>
                        <div>
                          <p className="font-medium">Member</p>
                          <p className="text-muted-foreground">{alert.memberName}</p>
                          <p className="text-xs text-muted-foreground">{alert.memberIdentifier}</p>
                        </div>
                        <div>
                          <p className="font-medium">Latest attempt</p>
                          <p className="text-muted-foreground">{formatDateTime(alert.latestAttemptAt)}</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button type="button" variant="outline" onClick={() => setSelectedAlert(alert)}>
                        <Eye className="mr-2 h-4 w-4" />
                        Review
                      </Button>
                      {!alert.readAt && (
                        <Button type="button" disabled={markingReadId === alert.id} onClick={() => markAsRead(alert)}>
                          {markingReadId === alert.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                          Mark read
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={Boolean(selectedAlert)} onOpenChange={(open) => !open && setSelectedAlert(null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Security alert details</DialogTitle>
            <DialogDescription>Repeated stamp attempts during cooldown.</DialogDescription>
          </DialogHeader>

          {selectedAlert && (
            <div className="space-y-4">
              <div className="grid gap-3 rounded-lg border p-4 text-sm md:grid-cols-2">
                <div>
                  <p className="font-medium">Staff member</p>
                  <p className="text-muted-foreground">{selectedAlert.staffName}</p>
                  {selectedAlert.staffEmail && selectedAlert.staffEmail !== selectedAlert.staffName ? (
                    <p className="text-xs text-muted-foreground">{selectedAlert.staffEmail}</p>
                  ) : null}
                </div>
                <div>
                  <p className="font-medium">Member</p>
                  <p className="text-muted-foreground">{selectedAlert.memberName}</p>
                  <p className="text-xs text-muted-foreground">{selectedAlert.memberIdentifier}</p>
                </div>
                <div>
                  <p className="font-medium">Loyalty program</p>
                  <p className="text-muted-foreground">{selectedAlert.programName}</p>
                </div>
                <div>
                  <p className="font-medium">Blocked attempts</p>
                  <p className="text-muted-foreground">{selectedAlert.attemptCount}</p>
                </div>
                <div>
                  <p className="font-medium">First attempt</p>
                  <p className="text-muted-foreground">{formatDateTime(selectedAlert.firstAttemptAt)}</p>
                </div>
                <div>
                  <p className="font-medium">Most recent attempt</p>
                  <p className="text-muted-foreground">{formatDateTime(selectedAlert.latestAttemptAt)}</p>
                </div>
                <div>
                  <p className="font-medium">Cooldown window</p>
                  <p className="text-muted-foreground">
                    <Clock className="mr-1 inline h-3 w-3" />
                    {formatDateTime(selectedAlert.cooldownStartedAt)} – {formatDateTime(selectedAlert.cooldownExpiresAt)}
                  </p>
                </div>
                <div>
                  <p className="font-medium">Read status</p>
                  <p className="text-muted-foreground">{selectedAlert.readAt ? `Read ${formatDateTime(selectedAlert.readAt)}` : "Unread"}</p>
                </div>
              </div>

              {!selectedAlert.readAt && (
                <Button type="button" disabled={markingReadId === selectedAlert.id} onClick={() => markAsRead(selectedAlert)}>
                  {markingReadId === selectedAlert.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                  Mark alert as read
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}