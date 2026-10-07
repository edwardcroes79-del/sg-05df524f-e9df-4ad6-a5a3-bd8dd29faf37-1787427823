import { useEffect, useMemo, useState } from "react";
import Head from "next/head";
import { Activity, AlertTriangle, BarChart3, Gift, Loader2, MapPin, QrCode, RefreshCw, Stamp, TrendingUp, Users } from "lucide-react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";

type AnalyticsPayload = {
  business_id?: string;
  business_name: string;
  overview: Record<string, number>;
  customer_analytics: Record<string, number>;
  locations: Array<Record<string, any>>;
  programs: Array<Record<string, any>>;
  quick_qr: Record<string, any>;
  cross_location: Record<string, any>;
  trends: Array<Record<string, any>>;
  insights: Array<{ type: string; message: string }>;
};

const ranges = [
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
  { value: "90d", label: "90 days" },
  { value: "12m", label: "12 months" },
  { value: "custom", label: "Custom" },
];

function formatNumber(value: number | string | null | undefined) {
  return Number(value || 0).toLocaleString();
}

function formatPercent(value: number | string | null | undefined) {
  return `${Number(value || 0).toFixed(1)}%`;
}

function maxValue(rows: Array<Record<string, any>>, key: string) {
  return Math.max(1, ...rows.map((row) => Number(row[key] || 0)));
}

export default function CorporateAnalyticsPage() {
  const [analytics, setAnalytics] = useState<AnalyticsPayload | null>(null);
  const [range, setRange] = useState("30d");
  const [locationId, setLocationId] = useState("all");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [hasSyncedActiveLocation, setHasSyncedActiveLocation] = useState(false);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const locations = analytics?.locations || [];
  const trends = analytics?.trends || [];
  const maxTrendStamps = useMemo(() => maxValue(trends, "stamps"), [trends]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setErrorMessage("");

      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        throw new Error("Please sign in to view Corporate Advanced Analytics.");
      }

      const params = new URLSearchParams({ range });
      if (range === "custom") {
        if (!customStart || !customEnd) {
          setLoading(false);
          setErrorMessage("Choose a custom start and end date to load analytics.");
          return;
        }

        params.set("start", customStart);
        params.set("end", customEnd);
      }

      if (locationId !== "all") params.set("location_id", locationId);

      const response = await fetch(`/api/business/analytics?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${sessionData.session.access_token}`,
        },
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Failed to load Corporate Advanced Analytics.");

      setAnalytics(result.analytics);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to load Corporate Advanced Analytics.");
      setAnalytics(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const handleActiveLocationChange = (event: Event) => {
      const detail = (event as CustomEvent<{ businessId?: string; locationId?: string }>).detail;
      if (!detail?.locationId) return;

      setHasSyncedActiveLocation(true);
      setLocationId(detail.locationId);
    };

    window.addEventListener("royalty-active-location-change", handleActiveLocationChange);

    return () => {
      window.removeEventListener("royalty-active-location-change", handleActiveLocationChange);
    };
  }, []);

  useEffect(() => {
    if (hasSyncedActiveLocation || !analytics?.business_id || typeof window === "undefined") return;

    const storedLocationId = window.localStorage.getItem(`active_location_${analytics.business_id}`) || "";
    const storedLocationIsAvailable = storedLocationId && locations.some((location) => location.id === storedLocationId);

    if (storedLocationIsAvailable) {
      setLocationId(storedLocationId);
    }

    setHasSyncedActiveLocation(true);
  }, [analytics?.business_id, hasSyncedActiveLocation, locations]);

  useEffect(() => {
    if (range === "custom" && (!customStart || !customEnd)) {
      setLoading(false);
      return;
    }

    void fetchAnalytics();
  }, [range, locationId, customStart, customEnd]);

  const overviewCards = [
    { label: "Total customers", value: analytics?.overview?.total_customers, icon: Users },
    { label: "Active customers", value: analytics?.overview?.active_customers, icon: Activity },
    { label: "New customers", value: analytics?.overview?.new_customers, icon: TrendingUp },
    { label: "Returning customers", value: analytics?.overview?.returning_customers, icon: Users },
    { label: "Stamps issued", value: analytics?.overview?.stamps_issued, icon: Stamp },
    { label: "Rewards earned", value: analytics?.overview?.rewards_earned, icon: Gift },
    { label: "Rewards redeemed", value: analytics?.overview?.rewards_redeemed, icon: Gift },
    { label: "Redemption rate", value: formatPercent(analytics?.overview?.redemption_rate), icon: BarChart3, formatted: true },
  ];

  return (
    <DashboardLayout>
      <Head>
        <title>Corporate Advanced Analytics | Aruba Royalty Stamp</title>
      </Head>

      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-4 border-b border-border pb-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Badge variant="outline" className="mb-3 gap-2 border-primary/30 bg-primary/5 text-primary">
              <BarChart3 className="h-3.5 w-3.5" />
              Corporate only
            </Badge>
            <h1 className="font-heading text-3xl font-bold text-foreground">Advanced Analytics</h1>
            <p className="mt-1 max-w-2xl text-muted-foreground">
              Real customer, stamp, reward, location, program, and Quick QR metrics for {analytics?.business_name || "your Corporate workspace"}.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <select className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={range} onChange={(event) => setRange(event.target.value)}>
              {ranges.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
            {range === "custom" && (
              <>
                <input
                  type="date"
                  className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                  value={customStart}
                  onChange={(event) => setCustomStart(event.target.value)}
                  aria-label="Custom analytics start date"
                />
                <input
                  type="date"
                  className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                  value={customEnd}
                  onChange={(event) => setCustomEnd(event.target.value)}
                  aria-label="Custom analytics end date"
                />
              </>
            )}
            <select className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={locationId} onChange={(event) => setLocationId(event.target.value)}>
              <option value="all">Corporate-wide</option>
              {locations.map((location) => (
                <option key={location.id} value={location.id}>{location.name}</option>
              ))}
            </select>
            <Button type="button" variant="outline" className="gap-2" onClick={() => void fetchAnalytics()} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Refresh
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="flex min-h-96 items-center justify-center rounded-2xl border bg-card">
            <div className="flex flex-col items-center gap-3 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              Loading real Corporate analytics...
            </div>
          </div>
        ) : errorMessage ? (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Analytics unavailable</AlertTitle>
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        ) : analytics ? (
          <>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {overviewCards.map((card) => {
                const Icon = card.icon;
                return (
                  <Card key={card.label}>
                    <CardContent className="flex items-center justify-between p-5">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">{card.label}</p>
                        <p className="mt-1 text-2xl font-bold tabular-nums text-foreground">
                          {card.formatted ? card.value : formatNumber(card.value)}
                        </p>
                      </div>
                      <div className="rounded-full bg-primary/10 p-3 text-primary">
                        <Icon className="h-5 w-5" />
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
              <Card>
                <CardHeader>
                  <CardTitle>Customer analytics</CardTitle>
                  <CardDescription>Real customer behavior calculated from loyalty cards and stamp activity.</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-3 sm:grid-cols-2">
                  {Object.entries(analytics.customer_analytics || {}).map(([key, value]) => (
                    <div key={key} className="rounded-xl border bg-muted/20 p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{key.replaceAll("_", " ")}</p>
                      <p className="mt-1 text-2xl font-bold tabular-nums text-foreground">{formatNumber(value)}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Royalty insights</CardTitle>
                  <CardDescription>Observations generated only from calculated metrics.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {analytics.insights?.length ? analytics.insights.map((insight) => (
                    <div key={`${insight.type}-${insight.message}`} className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm text-foreground">
                      {insight.message}
                    </div>
                  )) : (
                    <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">No data available yet.</p>
                  )}
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Location performance</CardTitle>
                <CardDescription>Corporate-wide and assigned-location metrics.</CardDescription>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                {locations.length ? (
                  <table className="w-full min-w-[760px] text-sm">
                    <thead>
                      <tr className="border-b text-left text-muted-foreground">
                        <th className="py-3 pr-4">Location</th>
                        <th className="py-3 pr-4">Customers</th>
                        <th className="py-3 pr-4">Active</th>
                        <th className="py-3 pr-4">Stamps</th>
                        <th className="py-3 pr-4">Rewards</th>
                        <th className="py-3 pr-4">Redemptions</th>
                        <th className="py-3 pr-4">Retention</th>
                      </tr>
                    </thead>
                    <tbody>
                      {locations.map((location) => (
                        <tr key={location.id} className="border-b last:border-0">
                          <td className="py-3 pr-4 font-semibold text-foreground"><MapPin className="mr-2 inline h-4 w-4 text-primary" />{location.name}</td>
                          <td className="py-3 pr-4 tabular-nums">{formatNumber(location.customers)}</td>
                          <td className="py-3 pr-4 tabular-nums">{formatNumber(location.active_customers)}</td>
                          <td className="py-3 pr-4 tabular-nums">{formatNumber(location.stamps)}</td>
                          <td className="py-3 pr-4 tabular-nums">{formatNumber(location.rewards_earned)}</td>
                          <td className="py-3 pr-4 tabular-nums">{formatNumber(location.rewards_redeemed)}</td>
                          <td className="py-3 pr-4 tabular-nums">{formatPercent(location.retention)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">No location data available yet.</p>
                )}
              </CardContent>
            </Card>

            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Program performance</CardTitle>
                  <CardDescription>Members, stamps, completion, rewards, and redemption rate by loyalty program.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {analytics.programs?.length ? analytics.programs.map((program) => (
                    <div key={program.id} className="rounded-xl border p-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-semibold text-foreground">{program.name}</p>
                        <Badge variant={program.active ? "default" : "secondary"}>{program.active ? "Active" : "Inactive"}</Badge>
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-5">
                        <span>Members: <b>{formatNumber(program.members)}</b></span>
                        <span>Stamps: <b>{formatNumber(program.stamps)}</b></span>
                        <span>Completion: <b>{formatPercent(program.completion_rate)}</b></span>
                        <span>Earned: <b>{formatNumber(program.rewards_earned)}</b></span>
                        <span>Redeemed: <b>{formatPercent(program.redemption_rate)}</b></span>
                      </div>
                    </div>
                  )) : (
                    <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">No program data available yet.</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Quick QR analytics</CardTitle>
                  <CardDescription>Included Corporate Quick QR activity from real tokens and stamp transactions.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="rounded-xl border bg-muted/20 p-4"><QrCode className="mb-2 h-4 w-4 text-primary" /><p className="text-xs text-muted-foreground">Tokens</p><p className="text-2xl font-bold">{formatNumber(analytics.quick_qr?.tokens_generated)}</p></div>
                    <div className="rounded-xl border bg-muted/20 p-4"><QrCode className="mb-2 h-4 w-4 text-primary" /><p className="text-xs text-muted-foreground">Used</p><p className="text-2xl font-bold">{formatNumber(analytics.quick_qr?.tokens_used)}</p></div>
                    <div className="rounded-xl border bg-muted/20 p-4"><Stamp className="mb-2 h-4 w-4 text-primary" /><p className="text-xs text-muted-foreground">Stamps</p><p className="text-2xl font-bold">{formatNumber(analytics.quick_qr?.stamps_generated)}</p></div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Cross-location analytics</CardTitle>
                <CardDescription>Real customer movement and activity distribution across permitted locations.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 lg:grid-cols-[260px_1fr]">
                <div className="rounded-xl border bg-muted/20 p-5">
                  <p className="text-sm font-medium text-muted-foreground">Multi-location customers</p>
                  <p className="mt-2 text-3xl font-bold tabular-nums text-foreground">
                    {formatNumber(analytics.cross_location?.customers_visiting_multiple_locations)}
                  </p>
                </div>
                <div className="space-y-3">
                  {Array.isArray(analytics.cross_location?.distribution) && analytics.cross_location.distribution.length ? (
                    analytics.cross_location.distribution.map((location: Record<string, any>) => (
                      <div key={location.id} className="rounded-xl border p-4">
                        <div className="flex items-center justify-between gap-3">
                          <span className="font-semibold text-foreground">{location.name}</span>
                          <span className="text-sm tabular-nums text-muted-foreground">{formatNumber(location.customers)} customers</span>
                        </div>
                        <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full bg-primary"
                            style={{
                              width: `${Math.min(100, (Number(location.customers || 0) / Math.max(1, Number(analytics.overview?.active_customers || 0))) * 100)}%`,
                            }}
                          />
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">No cross-location data available yet.</p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Activity trends</CardTitle>
                <CardDescription>Daily real activity for the selected period.</CardDescription>
              </CardHeader>
              <CardContent>
                {trends.length ? (
                  <div className="flex h-56 items-end gap-1 overflow-x-auto rounded-xl border bg-muted/20 p-4">
                    {trends.map((row) => (
                      <div key={row.date} className="flex min-w-8 flex-1 flex-col items-center gap-2">
                        <div className="w-full rounded-t bg-primary" style={{ height: `${Math.max(4, (Number(row.stamps || 0) / maxTrendStamps) * 180)}px` }} title={`${row.date}: ${row.stamps} stamps`} />
                        <span className="hidden text-[10px] text-muted-foreground sm:block">{String(row.date).slice(5)}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">No trend data available yet.</p>
                )}
              </CardContent>
            </Card>
          </>
        ) : null}
      </div>
    </DashboardLayout>
  );
}