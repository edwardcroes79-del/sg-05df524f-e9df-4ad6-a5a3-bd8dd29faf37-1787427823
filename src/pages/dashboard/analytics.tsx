import { useEffect, useMemo, useState } from "react";
import Head from "next/head";
import { Activity, AlertTriangle, BarChart3, Gift, Loader2, MapPin, QrCode, RefreshCw, Stamp, TrendingUp, Users } from "lucide-react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useI18n, type TranslationKey } from "@/contexts/I18nProvider";

type AnalyticsInsight = {
  type: string;
  message?: string;
  message_key?: TranslationKey;
  values?: Record<string, string | number>;
};

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
  insights: AnalyticsInsight[];
  location_options?: Array<Record<string, any>>;
};

const ranges: Array<{ value: string; labelKey: TranslationKey }> = [
  { value: "7d", labelKey: "dashboard.analytics.range.7d" },
  { value: "30d", labelKey: "dashboard.analytics.range.30d" },
  { value: "90d", labelKey: "dashboard.analytics.range.90d" },
  { value: "12m", labelKey: "dashboard.analytics.range.12m" },
  { value: "custom", labelKey: "dashboard.analytics.range.custom" },
];

const customerMetricLabels: Record<string, TranslationKey> = {
  total_cards: "dashboard.analytics.customerMetric.totalCards",
  active_cards: "dashboard.analytics.customerMetric.activeCards",
  inactive_cards: "dashboard.analytics.customerMetric.inactiveCards",
  customers_with_rewards: "dashboard.analytics.customerMetric.customersWithRewards",
  avg_stamps_per_customer: "dashboard.analytics.customerMetric.averageStampsPerCustomer",
  repeat_customers: "dashboard.analytics.customerMetric.repeatCustomers",
  one_time_customers: "dashboard.analytics.customerMetric.oneTimeCustomers",
};

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
  const { t } = useI18n();
  const [analytics, setAnalytics] = useState<AnalyticsPayload | null>(null);
  const [availableLocations, setAvailableLocations] = useState<Array<Record<string, any>>>([]);
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

  const getCustomerMetricLabel = (key: string) => {
    const translationKey = customerMetricLabels[key];
    return translationKey ? t(translationKey) : key.replaceAll("_", " ");
  };

  const getInsightMessage = (insight: AnalyticsInsight) => {
    const values = insight.values || {};
    const count = Number(values.count || values.stamps || 0);

    if (insight.message_key === "dashboard.analytics.insights.topLocation") {
      const location = typeof values.location === "string" ? values.location.trim() : "";

      if (!location || count <= 0) {
        return t("dashboard.analytics.insights.noTopLocation");
      }
    }

    if (insight.message_key === "dashboard.analytics.insights.topProgram") {
      const program = typeof values.program === "string" ? values.program.trim() : "";

      if (!program || count <= 0) {
        return t("dashboard.analytics.insights.noTopProgram");
      }
    }

    if (insight.message_key) {
      const translatedMessage = t(insight.message_key, values);

      if (translatedMessage === insight.message_key || translatedMessage.startsWith("dashboard.analytics.")) {
        return t("dashboard.analytics.insights.genericFallback");
      }

      return translatedMessage;
    }

    if (insight.message && !insight.message.startsWith("dashboard.analytics.")) {
      return insight.message;
    }

    return t("dashboard.analytics.insights.genericFallback");
  };

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setErrorMessage("");

      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        throw new Error(t("dashboard.analytics.signInRequired"));
      }

      const params = new URLSearchParams({ range });
      if (range === "custom") {
        if (!customStart || !customEnd) {
          setLoading(false);
          setErrorMessage(t("dashboard.analytics.customDateRequired"));
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
      if (!response.ok) throw new Error(result.error || t("dashboard.analytics.loadFailed"));

      const nextAnalytics = result.analytics as AnalyticsPayload;
      setAnalytics(nextAnalytics);
      setAvailableLocations(Array.isArray(nextAnalytics.location_options) ? nextAnalytics.location_options : []);
    } catch (err: any) {
      setErrorMessage(err.message || t("dashboard.analytics.loadFailed"));
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
    const storedLocationIsAvailable = storedLocationId === "all" || availableLocations.some((location) => location.id === storedLocationId);

    if (storedLocationIsAvailable) {
      setLocationId(storedLocationId);
    }

    setHasSyncedActiveLocation(true);
  }, [analytics?.business_id, hasSyncedActiveLocation, availableLocations]);

  useEffect(() => {
    if (range === "custom" && (!customStart || !customEnd)) {
      setLoading(false);
      return;
    }

    void fetchAnalytics();
  }, [range, locationId, customStart, customEnd]);

  const handleLocationScopeChange = (nextLocationId: string) => {
    setLocationId(nextLocationId);

    if (!analytics?.business_id || typeof window === "undefined") return;

    if (nextLocationId === "all") {
      window.localStorage.removeItem(`active_location_${analytics.business_id}`);
      return;
    }

    window.localStorage.setItem(`active_location_${analytics.business_id}`, nextLocationId);
    window.dispatchEvent(new CustomEvent("royalty-active-location-change", {
      detail: { businessId: analytics.business_id, locationId: nextLocationId },
    }));
  };

  const activeLocationLabel = locationId === "all"
    ? t("dashboard.analytics.corporateWide")
    : availableLocations.find((location) => location.id === locationId)?.name || t("dashboard.analytics.corporateWide");

  const handleManualRefresh = () => {
    void fetchAnalytics();
  };

  const overviewCards = [
    { labelKey: "dashboard.analytics.totalCustomers" as TranslationKey, value: analytics?.overview?.total_customers, icon: Users },
    { labelKey: "dashboard.analytics.activeCustomers" as TranslationKey, value: analytics?.overview?.active_customers, icon: Activity },
    { labelKey: "dashboard.analytics.newCustomers" as TranslationKey, value: analytics?.overview?.new_customers, icon: TrendingUp },
    { labelKey: "dashboard.analytics.returningCustomers" as TranslationKey, value: analytics?.overview?.returning_customers, icon: Users },
    { labelKey: "dashboard.analytics.stampsIssued" as TranslationKey, value: analytics?.overview?.stamps_issued, icon: Stamp },
    { labelKey: "dashboard.analytics.rewardsEarned" as TranslationKey, value: analytics?.overview?.rewards_earned, icon: Gift },
    { labelKey: "dashboard.analytics.rewardsRedeemed" as TranslationKey, value: analytics?.overview?.rewards_redeemed, icon: Gift },
    { labelKey: "dashboard.analytics.redemptionRate" as TranslationKey, value: formatPercent(analytics?.overview?.redemption_rate), icon: BarChart3, formatted: true },
  ];

  return (
    <DashboardLayout>
      <Head>
        <title>{t("dashboard.analytics.seoTitle")}</title>
      </Head>

      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-4 border-b border-border pb-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Badge variant="outline" className="mb-3 gap-2 border-primary/30 bg-primary/5 text-primary">
              {t("dashboard.analytics.badge")}
            </Badge>
            <h1 className="font-heading text-3xl font-bold text-foreground">{t("dashboard.analytics.title")}</h1>
            <p className="mt-1 max-w-2xl text-muted-foreground">
              {t("dashboard.analytics.description", { businessName: analytics?.business_name || t("dashboard.analytics.workspaceFallback") })}
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <select className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={range} onChange={(event) => setRange(event.target.value)}>
              {ranges.map((option) => (
                <option key={option.value} value={option.value}>{t(option.labelKey)}</option>
              ))}
            </select>
            {range === "custom" && (
              <>
                <input
                  type="date"
                  className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                  value={customStart}
                  onChange={(event) => setCustomStart(event.target.value)}
                  aria-label={t("dashboard.analytics.customStartLabel")}
                />
                <input
                  type="date"
                  className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                  value={customEnd}
                  onChange={(event) => setCustomEnd(event.target.value)}
                  aria-label={t("dashboard.analytics.customEndLabel")}
                />
              </>
            )}
            <div className="flex items-center rounded-md border border-input bg-muted/40 px-3 text-sm text-muted-foreground">
              <MapPin className="mr-2 h-4 w-4 text-primary" />
              {activeLocationLabel}
            </div>
            <Button type="button" variant="outline" className="gap-2" onClick={handleManualRefresh} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              {t("dashboard.analytics.refresh")}
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="flex min-h-96 items-center justify-center rounded-2xl border bg-card">
            <div className="flex flex-col items-center gap-3 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              {t("dashboard.analytics.loading")}
            </div>
          </div>
        ) : errorMessage ? (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>{t("dashboard.analytics.unavailableTitle")}</AlertTitle>
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        ) : analytics ? (
          <>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {overviewCards.map((card) => {
                const Icon = card.icon;
                return (
                  <Card key={card.labelKey}>
                    <CardContent className="flex items-center justify-between p-5">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">{t(card.labelKey)}</p>
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
                  <CardTitle>{t("dashboard.analytics.customerAnalytics")}</CardTitle>
                  <CardDescription>{t("dashboard.analytics.customerAnalyticsDescription")}</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-3 sm:grid-cols-2">
                  {Object.entries(analytics.customer_analytics || {}).map(([key, value]) => (
                    <div key={key} className="rounded-xl border bg-muted/20 p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{getCustomerMetricLabel(key)}</p>
                      <p className="mt-1 text-2xl font-bold tabular-nums text-foreground">{formatNumber(value)}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>{t("dashboard.analytics.royaltyInsights")}</CardTitle>
                  <CardDescription>{t("dashboard.analytics.royaltyInsightsDescription")}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {analytics.insights?.length ? analytics.insights.map((insight) => (
                    <div key={`${insight.type}-${insight.message_key || insight.message}`} className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm text-foreground">
                      {getInsightMessage(insight)}
                    </div>
                  )) : (
                    <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">{t("dashboard.analytics.noData")}</p>
                  )}
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>{t("dashboard.analytics.locationPerformance")}</CardTitle>
                <CardDescription>{t("dashboard.analytics.locationPerformanceDescription")}</CardDescription>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                {locations.length ? (
                  <table className="w-full min-w-[760px] text-sm">
                    <thead>
                      <tr className="border-b text-left text-muted-foreground">
                        <th className="py-3 pr-4">{t("dashboard.analytics.table.location")}</th>
                        <th className="py-3 pr-4">{t("dashboard.analytics.table.customers")}</th>
                        <th className="py-3 pr-4">{t("dashboard.analytics.table.active")}</th>
                        <th className="py-3 pr-4">{t("dashboard.analytics.table.stamps")}</th>
                        <th className="py-3 pr-4">{t("dashboard.analytics.table.rewards")}</th>
                        <th className="py-3 pr-4">{t("dashboard.analytics.table.redemptions")}</th>
                        <th className="py-3 pr-4">{t("dashboard.analytics.table.retention")}</th>
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
                  <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">{t("dashboard.analytics.noLocationData")}</p>
                )}
              </CardContent>
            </Card>

            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>{t("dashboard.analytics.programPerformance")}</CardTitle>
                  <CardDescription>{t("dashboard.analytics.programPerformanceDescription")}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {analytics.programs?.length ? analytics.programs.map((program) => (
                    <div key={program.id} className="rounded-xl border p-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-semibold text-foreground">{program.name}</p>
                        <Badge variant={program.active ? "default" : "secondary"}>{program.active ? t("dashboard.analytics.status.active") : t("dashboard.analytics.status.inactive")}</Badge>
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-5">
                        <span>{t("dashboard.analytics.members")}: <b>{formatNumber(program.members)}</b></span>
                        <span>{t("dashboard.analytics.table.stamps")}: <b>{formatNumber(program.stamps)}</b></span>
                        <span>{t("dashboard.analytics.completion")}: <b>{formatPercent(program.completion_rate)}</b></span>
                        <span>{t("dashboard.analytics.earned")}: <b>{formatNumber(program.rewards_earned)}</b></span>
                        <span>{t("dashboard.analytics.redeemed")}: <b>{formatPercent(program.redemption_rate)}</b></span>
                      </div>
                    </div>
                  )) : (
                    <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">{t("dashboard.analytics.noProgramData")}</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>{t("dashboard.analytics.quickQrAnalytics")}</CardTitle>
                  <CardDescription>{t("dashboard.analytics.quickQrAnalyticsDescription")}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="rounded-xl border bg-muted/20 p-4"><QrCode className="mb-2 h-4 w-4 text-primary" /><p className="text-xs text-muted-foreground">{t("dashboard.analytics.tokens")}</p><p className="text-2xl font-bold">{formatNumber(analytics.quick_qr?.tokens_generated)}</p></div>
                    <div className="rounded-xl border bg-muted/20 p-4"><QrCode className="mb-2 h-4 w-4 text-primary" /><p className="text-xs text-muted-foreground">{t("dashboard.analytics.used")}</p><p className="text-2xl font-bold">{formatNumber(analytics.quick_qr?.tokens_used)}</p></div>
                    <div className="rounded-xl border bg-muted/20 p-4"><Stamp className="mb-2 h-4 w-4 text-primary" /><p className="text-xs text-muted-foreground">{t("dashboard.analytics.table.stamps")}</p><p className="text-2xl font-bold">{formatNumber(analytics.quick_qr?.stamps_generated)}</p></div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>{t("dashboard.analytics.crossLocationAnalytics")}</CardTitle>
                <CardDescription>{t("dashboard.analytics.crossLocationAnalyticsDescription")}</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 lg:grid-cols-[260px_1fr]">
                <div className="rounded-xl border bg-muted/20 p-5">
                  <p className="text-sm font-medium text-muted-foreground">{t("dashboard.analytics.multiLocationCustomers")}</p>
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
                          <span className="text-sm tabular-nums text-muted-foreground">{t("dashboard.analytics.customerCount", { count: formatNumber(location.customers) })}</span>
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
                    <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">{t("dashboard.analytics.noCrossLocationData")}</p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t("dashboard.analytics.activityTrends")}</CardTitle>
                <CardDescription>{t("dashboard.analytics.activityTrendsDescription")}</CardDescription>
              </CardHeader>
              <CardContent>
                {trends.length ? (
                  <div className="flex h-56 items-end gap-1 overflow-x-auto rounded-xl border bg-muted/20 p-4">
                    {trends.map((row) => (
                      <div key={row.date} className="flex min-w-8 flex-1 flex-col items-center gap-2">
                        <div className="w-full rounded-t bg-primary" style={{ height: `${Math.max(4, (Number(row.stamps || 0) / maxTrendStamps) * 180)}px` }} title={t("dashboard.analytics.trendTitle", { date: row.date, stamps: row.stamps })} />
                        <span className="hidden text-[10px] text-muted-foreground sm:block">{String(row.date).slice(5)}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">{t("dashboard.analytics.noTrendData")}</p>
                )}
              </CardContent>
            </Card>
          </>
        ) : null}
      </div>
    </DashboardLayout>
  );
}