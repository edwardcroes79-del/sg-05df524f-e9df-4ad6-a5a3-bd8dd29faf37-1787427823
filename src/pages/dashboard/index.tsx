import { useEffect, useState } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, CreditCard, Stamp, Gift, Activity, Plus, Loader2, Check, Sparkles, FileText, CalendarDays, Clock, AlertTriangle, ShieldCheck } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/contexts/I18nProvider";

interface CustomerProfile {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  avatar: string | null;
}

interface CustomerLoyaltyCard {
  id: string;
  current_stamps: number;
  total_stamps: number;
  customer: CustomerProfile;
  loyalty_programs: {
    id: string;
    name: string;
    stamp_target: number;
    reward_title: string;
  } | null;
}

interface ContractInfo {
  contract_status: string | null;
  contract_term_months: number | null;
  contract_start_date: string | null;
  contract_end_date: string | null;
  renewal_date: string | null;
}

function formatContractDate(dateValue: string | null, fallback: string, locale: string) {
  if (!dateValue) return fallback;

  return new Date(`${dateValue}T00:00:00`).toLocaleDateString(locale, {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function getDateOnly(value: Date) {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

function getDaysRemaining(endDate: string | null) {
  if (!endDate) return null;

  const today = getDateOnly(new Date());
  const contractEnd = getDateOnly(new Date(`${endDate}T00:00:00`));
  const difference = contractEnd.getTime() - today.getTime();

  return Math.max(0, Math.ceil(difference / (1000 * 60 * 60 * 24)));
}

function getEffectiveContractState(contractInfo: ContractInfo | null) {
  if (!contractInfo?.contract_end_date) return "unassigned";

  const today = getDateOnly(new Date());
  const contractEnd = getDateOnly(new Date(`${contractInfo.contract_end_date}T00:00:00`));
  const daysRemaining = getDaysRemaining(contractInfo.contract_end_date);

  if (contractInfo.contract_status === "expired" || contractEnd <= today) return "expired";
  if (contractInfo.contract_status === "expiring" || (daysRemaining !== null && daysRemaining <= 30)) return "expiring";

  return "active";
}

function getContractStatusDisplay(contractInfo: ContractInfo | null, t: ReturnType<typeof useI18n>["t"]) {
  const state = getEffectiveContractState(contractInfo);

  if (state === "expired") {
    return {
      label: t("dashboard.contract.expiredLabel"),
      icon: "🔴",
      className: "bg-destructive/10 text-destructive border-destructive/20",
    };
  }

  if (state === "expiring") {
    return {
      label: t("dashboard.contract.expiringLabel"),
      icon: "🟠",
      className: "bg-amber-500/10 text-amber-700 border-amber-500/20",
    };
  }

  if (state === "active") {
    return {
      label: t("dashboard.contract.activeLabel"),
      icon: "🟢",
      className: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20",
    };
  }

  return {
    label: t("dashboard.contract.notAssignedLabel"),
    icon: "⚪",
    className: "bg-muted text-muted-foreground border-border",
  };
}

export default function DashboardOverview() {
  const router = useRouter();
  const { toast } = useToast();
  const { t, language } = useI18n();
  const locale = language === "es" ? "es-ES" : "en-US";
  const [loading, setLoading] = useState(true);
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [stats, setStats] = useState({
    customers: 0,
    activeCards: 0,
    stampsIssued: 0,
    rewardsEarned: 0,
    rewardsRedeemed: 0,
  });
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [contractInfo, setContractInfo] = useState<ContractInfo | null>(null);

  // Upgrade Success State
  const [upgradeSuccessPlan, setUpgradeSuccessPlan] = useState<string | null>(null);
  
  // Trial overview states
  const [trialDetails, setTrialDetails] = useState<{ isTrial: boolean; daysLeft: number; endDate: string | null }>({ isTrial: false, daysLeft: 0, endDate: null });

  useEffect(() => {
    fetchDashboardData();
  }, []);

  useEffect(() => {
    if (!businessId) return;

    const channel = supabase.channel(`business_dashboard_${businessId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'stamp_transactions', filter: `business_id=eq.${businessId}` },
        () => {
          // Refresh the dashboard stats and recent activity when a stamp is issued
          fetchDashboardData();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'rewards', filter: `business_id=eq.${businessId}` },
        () => {
          fetchDashboardData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [businessId]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      let resolvedBusinessId: string | null = null;
      let subscriptionPlan = "starter";
      let trialEnd = null;

      const { data: membership, error: membershipError } = await supabase
        .from("business_users")
        .select("business_id, role, status")
        .eq("user_id", session.user.id)
        .eq("status", "active")
        .limit(1)
        .maybeSingle();

      if (membership?.business_id) {
        resolvedBusinessId = membership.business_id;
        const { data: bData } = await supabase
          .from("businesses")
          .select("subscription_plan, trial_end, contract_status, contract_term_months, contract_start_date, contract_end_date, renewal_date")
          .eq("id", resolvedBusinessId)
          .single();
        if (bData) {
          subscriptionPlan = bData.subscription_plan;
          trialEnd = bData.trial_end;
          setContractInfo({
            contract_status: bData.contract_status,
            contract_term_months: bData.contract_term_months,
            contract_start_date: bData.contract_start_date,
            contract_end_date: bData.contract_end_date,
            renewal_date: bData.renewal_date,
          });
        }
      } else {
        const { data: ownedBusiness } = await supabase
          .from("businesses")
          .select("id, subscription_plan, trial_end, contract_status, contract_term_months, contract_start_date, contract_end_date, renewal_date")
          .eq("owner_id", session.user.id)
          .limit(1)
          .maybeSingle();

        if (ownedBusiness) {
          resolvedBusinessId = ownedBusiness.id;
          subscriptionPlan = ownedBusiness.subscription_plan;
          trialEnd = ownedBusiness.trial_end;
          setContractInfo({
            contract_status: ownedBusiness.contract_status,
            contract_term_months: ownedBusiness.contract_term_months,
            contract_start_date: ownedBusiness.contract_start_date,
            contract_end_date: ownedBusiness.contract_end_date,
            renewal_date: ownedBusiness.renewal_date,
          });
        }
      }

      if (!resolvedBusinessId) return;
      setBusinessId(resolvedBusinessId);

      // Detect Plan Upgrade Transition
      const cachedPlan = localStorage.getItem(`last_known_plan_id_${resolvedBusinessId}`);
      if (cachedPlan && cachedPlan !== subscriptionPlan) {
        // Fetch current plan name for confirmation
        const { data: planData } = await supabase
          .from("subscription_plans")
          .select("name, is_trial")
          .eq("id", subscriptionPlan || "starter")
          .single();
        
        if (planData) {
          setUpgradeSuccessPlan(planData.name);
          
          // Check trial details for the dashboard UI
          if (subscriptionPlan === "trial" || planData.is_trial) {
            if (trialEnd) {
              const endDate = new Date(trialEnd);
              const diffTime = endDate.getTime() - new Date().getTime();
              const days = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
              setTrialDetails({
                isTrial: true,
                daysLeft: days,
                endDate: endDate.toLocaleDateString(locale)
              });
            }
          }
        }
      } else {
        // Just fetch plan to see if it's a trial
        const { data: planCheck } = await supabase
          .from("subscription_plans")
          .select("is_trial")
          .eq("id", subscriptionPlan || "starter")
          .maybeSingle();

        if (planCheck?.is_trial && trialEnd) {
          const endDate = new Date(trialEnd);
          const diffTime = endDate.getTime() - new Date().getTime();
          const days = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
          setTrialDetails({
            isTrial: true,
            daysLeft: days,
            endDate: endDate.toLocaleDateString(locale)
          });
        }
      }
      
      // Update cache
      localStorage.setItem(`last_known_plan_id_${resolvedBusinessId}`, subscriptionPlan || "starter");

      // Unique Customer Count
      const { data: uniqueCustomersData } = await supabase
        .from("customer_loyalty_cards")
        .select("customer_id")
        .eq("business_id", resolvedBusinessId)
        .eq("status", "active");
        
      const uniqueCustomerCount = uniqueCustomersData ? new Set(uniqueCustomersData.map(c => c.customer_id)).size : 0;

      // Real Data Fetching
      const [
        { count: activeCards },
        { count: stampsIssued },
        { count: rewardsEarned },
        { count: rewardsRedeemed },
        { data: activityData }
      ] = await Promise.all([
        supabase.from("customer_loyalty_cards").select("*", { count: "exact", head: true }).eq("business_id", resolvedBusinessId).eq("status", "active"),
        supabase.from("stamp_transactions").select("*", { count: "exact", head: true }).eq("business_id", resolvedBusinessId),
        supabase.from("rewards").select("*", { count: "exact", head: true }).eq("business_id", resolvedBusinessId),
        supabase.from("rewards").select("*", { count: "exact", head: true }).eq("business_id", resolvedBusinessId).eq("status", "redeemed"),
        supabase.from("stamp_transactions")
          .select(`
            id, 
            created_at, 
            stamp_number,
            customer_loyalty_cards (
              customer:customers (
                name
              )
            )
          `)
          .eq("business_id", resolvedBusinessId)
          .order("created_at", { ascending: false })
          .limit(5)
      ]);

      setStats({
        customers: uniqueCustomerCount,
        activeCards: activeCards || 0,
        stampsIssued: stampsIssued || 0,
        rewardsEarned: rewardsEarned || 0,
        rewardsRedeemed: rewardsRedeemed || 0,
      });

      setRecentActivity(activityData || []);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    { title: t("dashboard.overview.totalCustomers"), value: stats.customers, icon: Users, color: "text-blue-500" },
    { title: t("dashboard.overview.activeCards"), value: stats.activeCards, icon: CreditCard, color: "text-indigo-500" },
    { title: t("dashboard.overview.stampsIssued"), value: stats.stampsIssued, icon: Stamp, color: "text-primary" },
    { title: t("dashboard.overview.rewardsEarned"), value: stats.rewardsEarned, icon: Gift, color: "text-amber-500" },
    { title: t("dashboard.overview.rewardsRedeemed"), value: stats.rewardsRedeemed, icon: Activity, color: "text-emerald-500" },
  ];

  const contractState = getEffectiveContractState(contractInfo);
  const contractStatusDisplay = getContractStatusDisplay(contractInfo, t);
  const contractDaysRemaining = getDaysRemaining(contractInfo?.contract_end_date || null);
  const isContractApproachingExpiration = contractState === "expiring" && contractDaysRemaining !== null && contractDaysRemaining <= 14 && contractDaysRemaining > 0;
  const contractDateFallback = t("dashboard.contract.notAssigned");

  return (
    <DashboardLayout>
      <Head>
        <title>{t("dashboard.overview.seoTitle")}</title>
      </Head>

      <div className="space-y-8">
        {/* Top Header Section */}
        <div className="flex flex-col sm:flex-row md:items-center justify-between gap-4 border-b border-border pb-5">
          <div>
            <h1 className="text-3xl font-heading font-bold text-foreground">{t("dashboard.overview.title")}</h1>
            <p className="text-muted-foreground mt-1">{t("dashboard.overview.description")}</p>
          </div>
          <div>
            <Button 
              onClick={() => router.push("/dashboard/scan")} 
              size="lg" 
              className="w-full sm:w-auto font-bold gap-2 text-white bg-primary hover:bg-primary/95 shadow-md shadow-primary/20 transition-all duration-150 transform active:scale-[0.98]"
            >
              <Plus className="h-5 w-5" /> {t("dashboard.overview.issueStamp")}
            </Button>
          </div>
        </div>

        {trialDetails.isTrial && (
          <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm">
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-indigo-900 flex items-center gap-2">
                <Gift className="h-5 w-5 text-indigo-600" /> {t("dashboard.overview.trialTitle")}
              </h3>
              <p className="text-indigo-700/80 text-sm">
                {t("dashboard.overview.trialDescription", { days: trialDetails.daysLeft, date: trialDetails.endDate || "" })}
              </p>
            </div>
            <Button 
              onClick={() => window.location.href = "/dashboard/billing"}
              className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-md font-semibold"
            >
              {t("dashboard.overview.upgradePlan")}
            </Button>
          </div>
        )}

        <Card className="overflow-hidden border-border/70 shadow-sm">
          <CardHeader className="border-b border-border/60 bg-muted/20">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <CardTitle className="flex items-center gap-2 text-xl">
                <FileText className="h-5 w-5 text-primary" />
                {t("dashboard.contract.title")}
              </CardTitle>
              {loading ? (
                <Skeleton className="h-7 w-28 rounded-full" />
              ) : (
                <Badge variant="outline" className={`w-fit gap-1.5 px-3 py-1 font-semibold ${contractStatusDisplay.className}`}>
                  <span aria-hidden="true">{contractStatusDisplay.icon}</span>
                  {contractStatusDisplay.label}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-5 sm:p-6">
            {loading ? (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
                {Array.from({ length: 5 }).map((_, index) => (
                  <div key={index} className="rounded-xl border border-border/70 bg-card p-4">
                    <Skeleton className="mb-3 h-4 w-20" />
                    <Skeleton className="h-6 w-28" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-5">
                {contractState === "expired" && (
                  <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-4 sm:p-5">
                    <div className="flex flex-col sm:flex-row gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                        <AlertTriangle className="h-5 w-5" />
                      </div>
                      <div className="space-y-1">
                        <h3 className="font-heading text-lg font-bold text-destructive">{t("dashboard.contract.expiredTitle")}</h3>
                        <p className="text-sm text-foreground">
                          {t("dashboard.contract.expiredDescription", { date: formatContractDate(contractInfo?.contract_end_date || null, contractDateFallback, locale) })}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {t("dashboard.contract.renewService")}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {isContractApproachingExpiration && (
                  <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 sm:p-5">
                    <div className="flex flex-col sm:flex-row gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-500/15 text-amber-700">
                        <AlertTriangle className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="font-heading text-lg font-bold text-amber-800">
                          🟠 Contract expires in {t("dashboard.contract.expiresIn", {
                            days: contractDaysRemaining,
                            unit: contractDaysRemaining === 1 ? t("dashboard.contract.day") : t("dashboard.contract.days"),
                          })}
                        </h3>
                        <p className="text-sm text-amber-900/80">
                          {t("dashboard.contract.avoidInterruption", { date: formatContractDate(contractInfo?.contract_end_date || null, contractDateFallback, locale) })}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {contractState === "unassigned" && (
                  <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-4 sm:p-5">
                    <div className="flex flex-col sm:flex-row gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                        <FileText className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="font-heading text-lg font-bold text-foreground">{t("dashboard.contract.notAssignedTitle")}</h3>
                        <p className="text-sm text-muted-foreground">
                          {t("dashboard.contract.notAssignedDescription")}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
                  <div className="rounded-xl border border-border/70 bg-card p-4">
                    <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      <ShieldCheck className="h-4 w-4" />
                      {t("dashboard.contract.status")}
                    </div>
                    <p className="text-lg font-bold text-foreground">
                      {contractStatusDisplay.icon} {contractStatusDisplay.label}
                    </p>
                  </div>

                  <div className="rounded-xl border border-border/70 bg-card p-4">
                    <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      {t("dashboard.contract.term")}
                    </div>
                    <p className="text-lg font-bold text-foreground">
                      {contractInfo?.contract_term_months ? t("dashboard.contract.months", { months: contractInfo.contract_term_months }) : contractDateFallback}
                    </p>
                  </div>

                  <div className="rounded-xl border border-border/70 bg-card p-4">
                    <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      <CalendarDays className="h-4 w-4" />
                      {t("dashboard.contract.startDate")}
                    </div>
                    <p className="text-base font-semibold text-foreground">
                      {formatContractDate(contractInfo?.contract_start_date || null, contractDateFallback, locale)}
                    </p>
                  </div>

                  <div className="rounded-xl border border-border/70 bg-card p-4">
                    <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      <CalendarDays className="h-4 w-4" />
                      {t("dashboard.contract.endDate")}
                    </div>
                    <p className="text-base font-semibold text-foreground">
                      {formatContractDate(contractInfo?.contract_end_date || null, contractDateFallback, locale)}
                    </p>
                  </div>

                  <div className="rounded-xl border border-border/70 bg-card p-4">
                    <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      <Activity className="h-4 w-4" />
                      {t("dashboard.contract.daysRemaining")}
                    </div>
                    <p className="text-lg font-bold text-foreground">
                      {contractDaysRemaining === null ? contractDateFallback : contractDaysRemaining}
                    </p>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground">
                  {t("dashboard.contract.readOnly")}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-6 flex items-center justify-between">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-8 w-16" />
                  </div>
                  <Skeleton className="h-12 w-12 rounded-full" />
                </CardContent>
              </Card>
            ))
          ) : (
            statCards.map((stat, i) => {
              const Icon = stat.icon;
              return (
                <Card key={i}>
                  <CardContent className="p-6 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                      <h3 className="text-3xl font-bold text-foreground mt-1">{stat.value}</h3>
                    </div>
                    <div className={`p-3 rounded-full bg-muted ${stat.color}`}>
                      <Icon className="h-6 w-6" />
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>{t("dashboard.overview.recentActivity")}</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : recentActivity.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>{t("dashboard.overview.noActivity")}</p>
                <p className="text-sm mt-1">{t("dashboard.overview.noActivityDescription")}</p>
              </div>
            ) : (
              <div className="space-y-4">
                {recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-center justify-between p-4 border border-border rounded-lg bg-muted/30">
                    <div className="flex items-center gap-4">
                      <div className="bg-primary/10 p-2 rounded text-primary">
                        <Stamp className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">
                          {t("dashboard.overview.stampIssuedTo", { customerName: activity.customer_loyalty_cards?.customer?.name || t("dashboard.overview.customerFallback") })}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(activity.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div className="text-xs font-mono font-bold text-primary">
                      +{activity.stamp_number || 1}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* PLAN UPGRADE SUCCESS DIALOG */}
      <Dialog open={!!upgradeSuccessPlan} onOpenChange={(open) => !open && setUpgradeSuccessPlan(null)}>
        <DialogContent className="sm:max-w-md bg-card border-border text-center p-8 space-y-6">
          <div className="flex flex-col items-center space-y-4">
            <div className="p-4 bg-emerald-50 text-emerald-500 rounded-full border-2 border-emerald-100 animate-bounce">
              <Check className="h-12 w-12 stroke-[3]" />
            </div>
            
            <div className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">
                {t("dashboard.overview.upgradeSuccessBadge")}
              </span>
              <h2 className="text-2xl font-heading font-bold text-foreground mt-2">
                {t("dashboard.overview.upgradeSuccessTitle")}
              </h2>
              <p className="text-sm text-muted-foreground">
                {t("dashboard.overview.upgradeSuccessDescription")}
              </p>
            </div>
          </div>

          <div className="bg-primary/5 border border-primary/10 rounded-2xl p-5 text-center space-y-1">
            <span className="text-xs text-muted-foreground uppercase font-semibold">{t("dashboard.overview.activePlan")}</span>
            <div className="text-xl font-heading font-bold text-primary flex items-center justify-center gap-1.5">
              <Sparkles className="h-5 w-5 text-amber-500 animate-pulse" />
              {upgradeSuccessPlan}
              <Sparkles className="h-5 w-5 text-amber-500 animate-pulse" />
            </div>
          </div>

          <Button 
            className="w-full font-bold text-white bg-primary hover:bg-primary/95 shadow-md shadow-primary/20 py-6 text-base rounded-xl"
            onClick={() => setUpgradeSuccessPlan(null)}
          >
            {t("dashboard.overview.continueToDashboard")}
          </Button>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}