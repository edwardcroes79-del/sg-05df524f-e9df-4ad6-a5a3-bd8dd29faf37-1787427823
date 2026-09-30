import { useEffect, useState } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Check, Clock, CheckCircle, XCircle, AlertCircle, Loader2, PlusCircle } from "lucide-react";
import { useI18n } from "@/contexts/I18nProvider";

type PaymentRow = {
  id: string;
  business_id: string | null;
  amount: number;
  currency: string | null;
  status: string | null;
  payment_reference: string | null;
  payment_proof_url: string | null;
  admin_notes: string | null;
  reviewed_at: string | null;
  created_at: string;
  metadata?: Record<string, any> | null;
};

export default function BillingPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { t, language } = useI18n();
  const locale = language === "es" ? "es-ES" : "en-US";
  const [loading, setLoading] = useState(true);
  const [isStaff, setIsStaff] = useState(false);
  const [business, setBusiness] = useState<any>(null);
  const [currentPlan, setCurrentPlan] = useState<any>(null);
  const [effectiveCustomerLimit, setEffectiveCustomerLimit] = useState<number | null>(null);
  const [currentMemberCount, setCurrentMemberCount] = useState(0);
  const [availableAddons, setAvailableAddons] = useState<any[]>([]);
  const [activeAddonSubscriptions, setActiveAddonSubscriptions] = useState<any[]>([]);
  const [addonPayments, setAddonPayments] = useState<PaymentRow[]>([]);
  const [subscriptionTotals, setSubscriptionTotals] = useState({
    baseMonthlyPrice: 0,
    activeAddonMonthlyTotal: 0,
    currentSubscriptionTotal: 0,
    nextBillingTotal: 0,
    cancellingAddonMonthlyTotal: 0,
  });
  const [uploadingProofId, setUploadingProofId] = useState<string | null>(null);
  const [addonActionId, setAddonActionId] = useState<string | null>(null);
  const [plans, setPlans] = useState<any[]>([]);
  const [pendingPayments, setPendingPayments] = useState<any[]>([]);
  const [requestingPlanId, setRequestingPlanId] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // Check user role
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", session.user.id)
        .maybeSingle();

      if (profile?.role === "business_staff") {
        setIsStaff(true);
        setLoading(false);
        return;
      }

      // Fetch business
      const { data: businessData } = await supabase
        .from("businesses")
        .select("*")
        .eq("owner_id", session.user.id)
        .single();

      if (!businessData) return;
      setBusiness(businessData);

      // Fetch current plan
      const { data: planData } = await supabase
        .from("subscription_plans")
        .select("*")
        .eq("id", businessData.subscription_plan || "starter")
        .single();
      setCurrentPlan(planData);

      const { data: effectiveLimit } = await (supabase.rpc as any)("get_business_effective_numeric_limit", {
        p_business_id: businessData.id,
        p_key: "max_customers",
        p_fallback: planData?.max_customers ?? 300,
      });
      setEffectiveCustomerLimit(Number(effectiveLimit ?? planData?.max_customers ?? 300));

      const { data: memberRows } = await supabase
        .from("customer_loyalty_cards")
        .select("customer_id")
        .eq("business_id", businessData.id)
        .not("customer_id", "is", null);
      const uniqueMemberCount = new Set((memberRows || []).map((row: any) => row.customer_id)).size;
      setCurrentMemberCount(uniqueMemberCount);

      const addonResponse = await fetch("/api/business/addons", {
        headers: {
          "Authorization": `Bearer ${session.access_token}`,
        },
      });

      if (addonResponse.ok) {
        const addonResult = await addonResponse.json();
        setEffectiveCustomerLimit(Number(addonResult.effectiveCustomerLimit ?? effectiveLimit ?? planData?.max_customers ?? 300));
        setCurrentMemberCount(Number(addonResult.currentMemberCount ?? uniqueMemberCount));
        setAvailableAddons(addonResult.availableAddons || []);
        setActiveAddonSubscriptions(addonResult.businessAddons || []);
        setAddonPayments(addonResult.addonPayments || []);
        setSubscriptionTotals(addonResult.subscriptionTotals || {
          baseMonthlyPrice: Number(planData?.price_awg || 0),
          activeAddonMonthlyTotal: 0,
          currentSubscriptionTotal: Number(planData?.price_awg || 0),
          nextBillingTotal: Number(planData?.price_awg || 0),
          cancellingAddonMonthlyTotal: 0,
        });
      } else {
        const addonResult = await addonResponse.json().catch(() => ({}));
        throw new Error(addonResult.error || t("dashboard.billing.loadAddonsFailed"));
      }

      // Fetch all plans
      const { data: plansData } = await supabase
        .from("subscription_plans")
        .select("*")
        .eq("status", "active")
        .eq("is_active", true)
        .order("display_order", { ascending: true });
      setPlans(plansData || []);

      // Fetch pending payments
      const { data: paymentsData } = await supabase
        .from("subscription_payments")
        .select("*")
        .eq("business_id", businessData.id)
        .order("created_at", { ascending: false });
      setPendingPayments(paymentsData || []);

      setLoading(false);
    } catch (error: any) {
      console.error("Error fetching billing data:", error);
      setLoading(false);
    }
  };

  const handlePlanChange = async (plan: any) => {
    if (!plan || plan.id === business?.subscription_plan) return;

    try {
      setRequestingPlanId(plan.id);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error(t("dashboard.billing.notAuthenticated"));

      const existingPendingPlanChange = pendingPayments.find((payment) =>
        payment.status === "pending" && payment.metadata?.kind === "subscription_plan_change"
      );

      if (existingPendingPlanChange) {
        toast({
          title: t("dashboard.billing.pendingPlanToastTitle"),
          description: t("dashboard.billing.pendingPlanToastDescription"),
        });
        return;
      }

      const response = await fetch("/api/business/plan-change", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ plan_id: plan.id }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || t("dashboard.billing.planChangeFailedFallback"));
      }

      toast({
        title: result.request?.metadata?.change_type === "downgrade" ? t("dashboard.billing.downgradeSubmitted") : t("dashboard.billing.planChangeSubmitted"),
        description: t("dashboard.billing.planChangeDescription"),
      });

      await fetchData();
    } catch (err: any) {
      toast({
        title: t("dashboard.billing.planChangeFailed"),
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setRequestingPlanId(null);
    }
  };

  const refreshAddonOverview = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error(t("dashboard.billing.notAuthenticated"));

    const response = await fetch("/api/business/addons", {
      headers: {
        "Authorization": `Bearer ${session.access_token}`,
      },
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.error || t("dashboard.billing.refreshAddonsFailed"));
    }

    setEffectiveCustomerLimit(Number(result.effectiveCustomerLimit ?? effectiveCustomerLimit ?? currentPlan?.max_customers ?? 300));
    setCurrentMemberCount(Number(result.currentMemberCount ?? currentMemberCount));
    setAvailableAddons(result.availableAddons || []);
    setActiveAddonSubscriptions(result.businessAddons || []);
    setAddonPayments(result.addonPayments || []);
    setSubscriptionTotals(result.subscriptionTotals || subscriptionTotals);
    return result;
  };

  const handlePurchaseAddon = async (addon: any) => {
    try {
      setAddonActionId(addon.id);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error(t("dashboard.billing.notAuthenticated"));

      const response = await fetch("/api/business/addons", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          addon_id: addon.id,
          quantity: 1,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || t("dashboard.billing.addonRequestFailedFallback"));
      }

      setEffectiveCustomerLimit(Number(result.effectiveCustomerLimit ?? effectiveCustomerLimit ?? currentPlan?.max_customers ?? 300));
      setCurrentMemberCount(Number(result.currentMemberCount ?? currentMemberCount));
      setAvailableAddons(result.availableAddons || []);
      setActiveAddonSubscriptions(result.businessAddons || []);
      setAddonPayments(result.addonPayments || []);

      const requestedNewMonthlyTotal = Number(
        result.requestedNewMonthlyTotal ??
        result.requestedAddonSubscription?.metadata?.requested_new_monthly_total ??
        0
      );

      toast({
        title: t("dashboard.billing.subscriptionChangeRequested"),
        description: t("dashboard.billing.pendingPaymentCreated", { amount: requestedNewMonthlyTotal.toFixed(2) }),
      });
    } catch (err: any) {
      toast({
        title: t("dashboard.billing.addonPurchaseFailed"),
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setAddonActionId(null);
    }
  };

  const handleCancelAddon = async (subscription: any) => {
    try {
      setAddonActionId(subscription.id);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error(t("dashboard.billing.notAuthenticated"));

      const response = await fetch("/api/business/addons", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          subscription_id: subscription.id,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || t("dashboard.billing.cancelAddonFailedFallback"));
      }

      setEffectiveCustomerLimit(Number(result.effectiveCustomerLimit ?? effectiveCustomerLimit ?? currentPlan?.max_customers ?? 300));
      setCurrentMemberCount(Number(result.currentMemberCount ?? currentMemberCount));
      setAvailableAddons(result.availableAddons || []);
      setActiveAddonSubscriptions(result.businessAddons || []);
      setAddonPayments(result.addonPayments || []);

      toast({
        title: t("dashboard.billing.cancellationScheduledToast"),
        description: t("dashboard.billing.cancellationScheduledDescription"),
      });
    } catch (err: any) {
      toast({
        title: t("dashboard.billing.cancellationFailed"),
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setAddonActionId(null);
    }
  };

  const handleAddonProofUpload = async (payment: PaymentRow, file: File | null) => {
    if (!file) return;

    if (!file.type.startsWith("image/") && file.type !== "application/pdf") {
      toast({
        title: t("dashboard.billing.invalidFileType"),
        description: t("dashboard.billing.invalidFileDescription"),
        variant: "destructive",
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: t("dashboard.billing.fileTooLarge"),
        description: t("dashboard.billing.fileTooLargeDescription"),
        variant: "destructive",
      });
      return;
    }

    try {
      setUploadingProofId(payment.id);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error(t("dashboard.billing.notAuthenticated"));
      if (!business?.id || payment.business_id !== business.id) {
        throw new Error(t("dashboard.billing.ownProofOnly"));
      }

      const extension = file.name.split(".").pop()?.toLowerCase() || "bin";
      const safeReference = (payment.payment_reference || payment.id).replace(/[^a-zA-Z0-9-]/g, "-");
      const filePath = `${business.id}/${payment.id}-${safeReference}.${extension}`;

      const { error: uploadError } = await supabase.storage
        .from("payment-proofs")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: true,
        });

      if (uploadError) throw uploadError;

      const { error: updateError } = await supabase
        .from("subscription_payments")
        .update({
          payment_proof_url: filePath,
          metadata: {
            ...(payment.metadata || {}),
            proof_uploaded_at: new Date().toISOString(),
            proof_uploaded_by: session.user.id,
            proof_storage_path: filePath,
          },
          updated_at: new Date().toISOString(),
        })
        .eq("id", payment.id)
        .eq("business_id", business.id)
        .eq("status", "pending");

      if (updateError) throw updateError;

      toast({
        title: t("dashboard.billing.proofSubmitted"),
        description: t("dashboard.billing.proofSubmittedDescription"),
      });

      await refreshAddonOverview();
      await fetchData();
    } catch (err: any) {
      toast({
        title: t("dashboard.billing.proofUploadFailed"),
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setUploadingProofId(null);
    }
  };

  const handleOpenPaymentProof = async (payment: PaymentRow) => {
    if (!payment.payment_proof_url) return;

    try {
      if (payment.payment_proof_url.startsWith("http")) {
        window.open(payment.payment_proof_url, "_blank", "noopener,noreferrer");
        return;
      }

      if (!business?.id || payment.business_id !== business.id) {
        throw new Error(t("dashboard.billing.ownProofOnly"));
      }

      const { data, error } = await supabase.storage
        .from("payment-proofs")
        .createSignedUrl(payment.payment_proof_url, 120);

      if (error) throw error;
      window.open(data.signedUrl, "_blank", "noopener,noreferrer");
    } catch (err: any) {
      toast({
        title: t("dashboard.billing.couldNotOpenProof"),
        description: err.message,
        variant: "destructive",
      });
    }
  };

  const formatDate = (value?: string | null) => {
    if (!value) return t("dashboard.billing.notAvailable");
    return new Date(value).toLocaleDateString(locale);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <Clock className="h-4 w-4" />;
      case "approved":
        return <CheckCircle className="h-4 w-4" />;
      case "rejected":
        return <XCircle className="h-4 w-4" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  const getStatusVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case "pending":
        return "secondary";
      case "approved":
        return "default";
      case "rejected":
        return "destructive";
      default:
        return "outline";
    }
  };

  const isQuickStampAddon = (addon: any) =>
    addon?.id === "quick_stamp_qr" || addon?.slug === "quick-stamp-qr" || addon?.addon_type === "quick_stamp_qr";

  const getAddonTitle = (addon: any) =>
    isQuickStampAddon(addon) ? t("dashboard.billing.quickStampTitle") : t("dashboard.billing.customersAddonTitle", { count: Number(addon?.capacity_amount || 0).toLocaleString() });

  const getAddonDescription = (addon: any) =>
    isQuickStampAddon(addon)
      ? (addon?.description || t("dashboard.billing.quickStampDescription"))
      : (addon?.description || addon?.name);

  const getAddonMetric = (addon: any, subscription?: any) => {
    if (isQuickStampAddon(addon)) return t("dashboard.billing.quickStampAccess");
    const addedCapacity = Number(addon?.capacity_amount || 0) * Number(subscription?.quantity || 1);
    return t("dashboard.billing.membersMetric", { count: addedCapacity.toLocaleString() });
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="space-y-8">
          <Skeleton className="h-12 w-64" />
          <div className="grid md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-96" />
            ))}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (isStaff) {
    return (
      <DashboardLayout>
        <Head>
          <title>{t("dashboard.accessDenied.title")} | Dashboard</title>
        </Head>
        <div className="max-w-md mx-auto my-12 text-center">
          <Card className="border-destructive/20 shadow-md">
            <CardHeader className="bg-destructive/5 border-b pb-4">
              <div className="w-12 h-12 bg-destructive/10 text-destructive rounded-full flex items-center justify-center mx-auto mb-2">
                <AlertCircle className="w-6 h-6" />
              </div>
              <CardTitle className="text-xl text-destructive">{t("dashboard.accessDenied.title")}</CardTitle>
              <CardDescription>{t("dashboard.billing.accessDeniedDescription")}</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground leading-relaxed">
                {t("dashboard.billing.accessDeniedBody")}
              </p>
            </CardContent>
            <CardFooter className="bg-muted/30 border-t justify-center py-4">
              <Button onClick={() => router.push("/dashboard")}>{t("dashboard.billing.returnToDashboard")}</Button>
            </CardFooter>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <Head>
        <title>{t("dashboard.billing.seoTitle")}</title>
      </Head>

      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-heading font-bold text-foreground">{t("dashboard.billing.title")}</h1>
          <p className="text-muted-foreground mt-1">{t("dashboard.billing.description")}</p>
        </div>

        {/* Current Plan */}
        {currentPlan && (
          <Card className="border-primary/20 bg-primary/[0.02] shadow-sm relative overflow-hidden">
            {currentPlan.badge && (
              <div className="absolute top-0 right-0 bg-primary text-white text-[9px] font-bold uppercase tracking-widest px-3 py-1 rounded-bl">
                {currentPlan.badge}
              </div>
            )}
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-xl font-heading font-bold">
                  Active Subscription Plan
                  {currentPlan.badge && (
                    <Badge className="bg-primary hover:bg-primary text-white text-[10px] font-bold uppercase tracking-wider">{currentPlan.badge}</Badge>
                  )}
                </CardTitle>
                <Badge variant="default" className="gap-1 bg-emerald-500 hover:bg-emerald-600 text-white font-bold">
                  <Check className="h-3.5 w-3.5" /> {t("dashboard.billing.activated")}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <h3 className="text-3xl font-heading font-extrabold text-foreground">{currentPlan.name}</h3>
                <p className="text-3xl font-heading font-extrabold text-primary">
                  AWG {subscriptionTotals.currentSubscriptionTotal > 0 ? subscriptionTotals.currentSubscriptionTotal.toFixed(2) : currentPlan.price_awg.toFixed(2)}
                  <span className="text-sm text-muted-foreground font-normal">{t("dashboard.billing.monthTotal")}</span>
                </p>
                <p className="text-sm text-muted-foreground">
                  {t("dashboard.billing.basePlan", { amount: Number(currentPlan.price_awg || 0).toFixed(2) })}
                  {subscriptionTotals.activeAddonMonthlyTotal > 0 ? t("dashboard.billing.activeAddonsInline", { amount: subscriptionTotals.activeAddonMonthlyTotal.toFixed(2) }) : ""}
                </p>
                <div className="pt-4 grid sm:grid-cols-2 gap-2 border-t border-dashed mt-4">
                  <p className="text-sm text-muted-foreground flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span>{t("dashboard.billing.upToPrograms", { count: currentPlan.max_loyalty_programs === 9999 ? t("dashboard.customers.unlimited") : currentPlan.max_loyalty_programs })}</span>
                  </p>
                  <p className="text-sm text-muted-foreground flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span>{t("dashboard.billing.upToMembers", { count: currentPlan.max_customers === 999999 ? t("dashboard.customers.unlimited") : currentPlan.max_customers.toLocaleString() })}</span>
                  </p>
                  {effectiveCustomerLimit !== null && effectiveCustomerLimit !== Number(currentPlan.max_customers) && (
                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                      <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                      <span>
                        {t("dashboard.billing.effectiveCapacity", { count: effectiveCustomerLimit >= 999999 ? t("dashboard.customers.unlimited") : effectiveCustomerLimit.toLocaleString() })}
                      </span>
                    </p>
                  )}
                  <p className="text-sm text-muted-foreground flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span>{t("dashboard.billing.upToStaff", { count: currentPlan.max_staff || 1 })}</span>
                  </p>
                  <p className="text-sm text-muted-foreground flex items-center gap-2">
                    <Check className={`h-4 w-4 shrink-0 ${currentPlan.includes_premium_templates ? "text-emerald-500" : "text-muted-foreground/30"}`} />
                    <span className={currentPlan.includes_premium_templates ? "font-semibold text-foreground" : "line-through opacity-50"}>
                      {t("dashboard.billing.premiumTemplates")} {currentPlan.includes_premium_templates ? "✨" : "🔒"}
                    </span>
                  </p>
                  {currentPlan.features?.map((feature: string, idx: number) => (
                    <p key={idx} className="text-sm text-muted-foreground flex items-center gap-2 sm:col-span-2">
                      <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                      <span>{feature}</span>
                    </p>
                  ))}
                </div>
                {effectiveCustomerLimit !== null && currentMemberCount >= effectiveCustomerLimit && effectiveCustomerLimit < 999999 && (
                  <div className="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
                    {t("dashboard.billing.capacityWarning")}
                  </div>
                )}
                {activeAddonSubscriptions.length > 0 && (
                  <div className="mt-4 rounded-lg border bg-muted/20 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">{t("dashboard.billing.activeCapacityAddons")}</p>
                    <div className="space-y-2">
                      {activeAddonSubscriptions.map((subscription) => {
                        const addon = Array.isArray(subscription.subscription_addons) ? subscription.subscription_addons[0] : subscription.subscription_addons;
                        const addedCapacity = Number(addon?.capacity_amount || 0) * Number(subscription.quantity || 1);
                        const subscriptionAmount = Number(addon?.monthly_price_awg || 0) * Number(subscription.quantity || 1);

                        return (
                          <div key={subscription.id} className="flex items-center justify-between gap-3 text-sm">
                            <span className="text-muted-foreground">
                              {addon?.name || subscription.addon_id}
                              {!isQuickStampAddon(addon) ? ` × ${subscription.quantity}` : ""}
                              {subscription.cancel_at_period_end ? t("dashboard.billing.cancelsAtPeriodEnd") : ""}
                            </span>
                            <strong className="text-foreground">{getAddonMetric(addon, subscription)} · AWG {subscriptionAmount.toFixed(2)}/month</strong>
                          </div>
                        );
                      })}
                    </div>
                    {subscriptionTotals.cancellingAddonMonthlyTotal > 0 && (
                      <p className="mt-3 text-xs text-amber-700">
                        {t("dashboard.billing.nextBillingAfterCancellations", { amount: subscriptionTotals.nextBillingTotal.toFixed(2) })}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Customer Capacity Add-ons */}
        {currentPlan && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PlusCircle className="h-5 w-5 text-primary" />
                {t("dashboard.billing.optionalAddons")}
              </CardTitle>
              <CardDescription>
                {t("dashboard.billing.optionalAddonsDescription")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-3 gap-4">
                <div className="rounded-lg border bg-muted/20 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("dashboard.billing.includedInPlan", { planName: currentPlan.name })}</p>
                  <p className="text-2xl font-heading font-bold text-foreground mt-2">
                    {currentPlan.max_customers === 999999 ? t("dashboard.customers.unlimited") : currentPlan.max_customers.toLocaleString()}
                  </p>
                  <p className="text-sm text-muted-foreground">{t("dashboard.billing.baseCustomerCapacity")}</p>
                </div>
                <div className="rounded-lg border bg-muted/20 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("dashboard.billing.currentUsage")}</p>
                  <p className="text-2xl font-heading font-bold text-foreground mt-2">
                    {currentMemberCount.toLocaleString()} / {effectiveCustomerLimit === 999999 ? t("dashboard.customers.unlimited") : (effectiveCustomerLimit ?? currentPlan.max_customers).toLocaleString()}
                  </p>
                  <p className="text-sm text-muted-foreground">{t("dashboard.billing.realMembers")}</p>
                </div>
                <div className="rounded-lg border bg-muted/20 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("dashboard.billing.subscriptionTotal")}</p>
                  <p className="text-2xl font-heading font-bold text-primary mt-2">
                    AWG {(subscriptionTotals.currentSubscriptionTotal || Number(currentPlan.price_awg || 0)).toFixed(2)}
                  </p>
                  <p className="text-sm text-muted-foreground">{t("dashboard.billing.currentMonthlyAmount")}</p>
                </div>
              </div>

              <div>
                <h3 className="font-heading font-semibold text-foreground mb-3">{t("dashboard.billing.availableAddons")}</h3>
                {availableAddons.length === 0 ? (
                  <div className="rounded-lg border border-dashed p-6 text-center text-muted-foreground">
                    {t("dashboard.billing.noAddonsAvailable")}
                  </div>
                ) : (
                  <div className="grid md:grid-cols-4 gap-4">
                    {availableAddons.map((addon) => (
                      <div key={addon.id} className="rounded-lg border bg-card p-4 flex flex-col gap-4">
                        <div>
                          <h4 className="font-heading font-bold text-foreground">{getAddonTitle(addon)}</h4>
                          <p className="text-sm text-muted-foreground mt-1">{getAddonDescription(addon)}</p>
                          <p className="text-xl font-heading font-extrabold text-primary mt-3">
                            AWG {Number(addon.monthly_price_awg || 0).toFixed(2)}
                            <span className="text-xs text-muted-foreground font-normal">{t("dashboard.billing.perMonth")}</span>
                          </p>
                        </div>
                        <Button
                          type="button"
                          className="mt-auto"
                          disabled={addonActionId === addon.id}
                          onClick={() => handlePurchaseAddon(addon)}
                        >
                          {addonActionId === addon.id ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                          {t("dashboard.billing.requestAddon")}
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <h3 className="font-heading font-semibold text-foreground mb-3">{t("dashboard.billing.activeRequestedAddons")}</h3>
                {activeAddonSubscriptions.length === 0 ? (
                  <div className="rounded-lg border border-dashed p-6 text-center text-muted-foreground">
                    {t("dashboard.billing.noAddonsRequested")}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {activeAddonSubscriptions.map((subscription) => {
                      const addon = Array.isArray(subscription.subscription_addons) ? subscription.subscription_addons[0] : subscription.subscription_addons;
                      const addedCapacity = Number(addon?.capacity_amount || 0) * Number(subscription.quantity || 1);
                      const isApprovedActive = subscription.status === "active" && subscription.payment_status === "approved";
                      const isPending = subscription.payment_status === "pending";
                      const isRejected = subscription.payment_status === "failed" || subscription.status === "cancelled";

                      return (
                        <div key={subscription.id} className="rounded-lg border bg-card p-4 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <h4 className="font-heading font-bold text-foreground">{addon?.name || subscription.addon_id}</h4>
                              <Badge variant={isApprovedActive ? "default" : isPending ? "secondary" : isRejected ? "destructive" : "outline"}>
                                {isPending ? t("dashboard.billing.pendingApproval") : isRejected ? t("dashboard.billing.rejected") : subscription.cancel_at_period_end ? t("dashboard.billing.cancellationScheduled") : subscription.status}
                              </Badge>
                            </div>
                            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-3 text-sm">
                              <div>
                                <p className="text-muted-foreground">{isQuickStampAddon(addon) ? t("dashboard.billing.featureAccess") : t("dashboard.billing.capacityAdded")}</p>
                                <p className="font-semibold">{getAddonMetric(addon, subscription)}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">{t("dashboard.billing.monthlyCost")}</p>
                                <p className="font-semibold">AWG {(Number(addon?.monthly_price_awg || 0) * Number(subscription.quantity || 1)).toFixed(2)}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">{isPending ? t("dashboard.billing.requestedDate") : t("dashboard.billing.startDate")}</p>
                                <p className="font-semibold">{formatDate(subscription.starts_at)}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">{t("dashboard.billing.nextBillingDate")}</p>
                                <p className="font-semibold">{formatDate(subscription.current_period_end)}</p>
                              </div>
                            </div>
                          </div>
                          {isApprovedActive && !subscription.cancel_at_period_end && (
                            <Button
                              type="button"
                              variant="outline"
                              className="border-amber-300 text-amber-700 hover:bg-amber-50"
                              disabled={addonActionId === subscription.id}
                              onClick={() => handleCancelAddon(subscription)}
                            >
                              {addonActionId === subscription.id ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                              {t("dashboard.billing.cancelAtPeriodEnd")}
                            </Button>
                          )}
                          {subscription.cancel_at_period_end && (
                            <p className="mt-2 text-xs text-amber-700">
                              {t("dashboard.billing.capacityAvailableUntil", { date: formatDate(subscription.current_period_end) })}
                            </p>
                          )}
                          {isPending && (
                            <p className="text-sm text-muted-foreground lg:max-w-xs">
                              {t("dashboard.billing.addonPendingDescription")}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {addonPayments.length > 0 && (
                <div className="rounded-lg border bg-muted/20 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">{t("dashboard.billing.otherPaymentHistory")}</p>
                  <div className="space-y-2">
                    {addonPayments.slice(0, 5).map((payment) => (
                      <div key={payment.id} className="flex flex-col gap-1 text-sm sm:flex-row sm:items-center sm:justify-between">
                        <span className="text-muted-foreground">
                          {t("dashboard.billing.reference")} {payment.payment_reference || payment.id} · AWG {Number(payment.amount || 0).toFixed(2)}
                        </span>
                        <Badge variant={getStatusVariant(payment.status || "pending")} className="w-max gap-1">
                          {getStatusIcon(payment.status || "pending")}
                          {payment.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Available Plans */}
        <div>
          <h2 className="text-xl font-heading font-semibold mb-4">{t("dashboard.billing.choosePlan")}</h2>
          {pendingPayments.some((payment) => payment.status === "pending" && payment.metadata?.kind === "subscription_plan_change") && (
            <Card className="mb-6 border-amber-300 bg-amber-50/70">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-amber-900">
                  <Clock className="h-5 w-5" />
                  {t("dashboard.billing.downgradePendingTitle")}
                </CardTitle>
                <CardDescription className="text-amber-800">
                  {t("dashboard.billing.downgradePendingDescription")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {pendingPayments
                  .filter((payment) => payment.status === "pending" && payment.metadata?.kind === "subscription_plan_change")
                  .slice(0, 1)
                  .map((payment) => (
                    <div key={payment.id} className="grid gap-3 text-sm sm:grid-cols-3">
                      <div>
                        <p className="text-amber-800/80">{t("dashboard.billing.currentPlan")}</p>
                        <p className="font-semibold text-amber-950">
                          {payment.metadata?.current_plan_name || currentPlan?.name} — AWG {Number(payment.metadata?.current_plan_price_awg || currentPlan?.price_awg || 0).toFixed(2)}/month
                        </p>
                      </div>
                      <div>
                        <p className="text-amber-800/80">{t("dashboard.billing.requestedPlan")}</p>
                        <p className="font-semibold text-amber-950">
                          {payment.metadata?.requested_plan_name || payment.metadata?.plan_name || payment.plan_id} — AWG {Number(payment.metadata?.requested_plan_price_awg || payment.amount || 0).toFixed(2)}/month
                        </p>
                      </div>
                      <div>
                        <p className="text-amber-800/80">{t("dashboard.billing.requested")}</p>
                        <p className="font-semibold text-amber-950">{new Date(payment.created_at).toLocaleString(locale)}</p>
                      </div>
                    </div>
                  ))}
              </CardContent>
            </Card>
          )}
          <div className="grid md:grid-cols-3 gap-6">
            {plans.map((plan) => {
              const isCurrent = plan.id === business?.subscription_plan;
              const isHighlighted = Boolean(plan.badge);

              return (
                <Card 
                  key={plan.id} 
                  className={`flex flex-col relative transition-all duration-300 overflow-hidden ${
                    isCurrent 
                      ? "border-primary ring-2 ring-primary/20 shadow-md scale-[1.02] z-10 bg-primary/[0.01]" 
                      : isHighlighted
                      ? "border-primary/20 hover:border-primary bg-primary/[0.005] shadow-sm hover:shadow-md"
                      : "border-border bg-background shadow-sm hover:border-muted-foreground/30"
                  }`}
                >
                  {plan.badge && (
                    <span className="absolute top-0 right-0 bg-primary text-white text-[9px] font-bold tracking-widest px-3 py-1 rounded-bl uppercase">
                      {plan.badge}
                    </span>
                  )}
                  <CardHeader className="pb-4 pt-6">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-xl font-heading font-extrabold">{plan.name}</CardTitle>
                      {plan.badge && <Badge variant="outline" className="border-primary text-primary bg-primary/5 font-bold">{plan.badge}</Badge>}
                    </div>
                    <CardDescription className="pt-2">
                      <span className="text-3xl font-heading font-extrabold text-foreground">
                        AWG {plan.price_awg.toFixed(2)}
                      </span>
                      <span className="text-muted-foreground text-sm">{t("dashboard.billing.perMonth")}</span>
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3.5 flex-grow pb-6">
                    <p className="text-sm flex items-center gap-2.5">
                      <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                      <span><strong>{plan.max_loyalty_programs === 9999 ? t("dashboard.customers.unlimited") : plan.max_loyalty_programs}</strong> {t("dashboard.billing.loyaltyPrograms")}</span>
                    </p>
                    <p className="text-sm flex items-center gap-2.5">
                      <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                      <span><strong>{plan.max_customers === 999999 ? t("dashboard.customers.unlimited") : plan.max_customers.toLocaleString()}</strong> {t("dashboard.billing.loyaltyMembers")}</span>
                    </p>
                    <p className="text-sm flex items-center gap-2.5">
                      <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                      <span><strong>{plan.max_staff || 1}</strong> {t("dashboard.billing.staffAccounts")}</span>
                    </p>
                    
                    {/* Explicit visual Premium Templates checklist check */}
                    <p className="text-sm flex items-center gap-2.5 pt-2 border-t border-dashed">
                      <Check className={`h-4 w-4 shrink-0 ${plan.includes_premium_templates ? "text-emerald-500" : "text-muted-foreground/20"}`} />
                      <span className={plan.includes_premium_templates ? "font-semibold text-foreground" : "text-muted-foreground/60 line-through"}>
                        {t("dashboard.billing.premiumTemplates")} {!plan.includes_premium_templates && "🔒"}
                      </span>
                    </p>
                    
                    {plan.features?.map((feature: string, idx: number) => (
                      <p key={idx} className="text-sm flex items-center gap-2.5">
                        <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                        <span>{feature}</span>
                      </p>
                    ))}
                  </CardContent>
                  <CardFooter className="pt-4 border-t bg-muted/10">
                    <Button
                      className={`w-full font-bold h-10 ${
                        isCurrent 
                          ? "bg-muted text-muted-foreground border-border hover:bg-muted cursor-default" 
                          : "bg-primary text-white hover:bg-primary/95 shadow-sm"
                      }`}
                      variant={isCurrent ? "outline" : "default"}
                      disabled={isCurrent || requestingPlanId === plan.id || pendingPayments.some((payment) => payment.status === "pending" && payment.metadata?.kind === "subscription_plan_change")}
                      onClick={() => handlePlanChange(plan)}
                    >
                      {requestingPlanId === plan.id ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          {t("dashboard.billing.requesting")}
                        </>
                      ) : isCurrent 
                        ? t("dashboard.billing.activePlan") 
                        : (plan.price_awg < (currentPlan?.price_awg || 0)) 
                        ? t("dashboard.billing.downgradePlan") 
                        : t("dashboard.billing.upgradePlan")
                      }
                    </Button>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Payment History */}
        {pendingPayments.length > 0 && (
          <div>
            <h2 className="text-xl font-heading font-semibold mb-4">{t("dashboard.billing.paymentHistory")}</h2>
            <div className="space-y-4">
              {pendingPayments.map((payment) => (
                <Card key={payment.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">
                        {payment.metadata?.plan_name || t("dashboard.billing.subscriptionPayment")}
                      </CardTitle>
                      <Badge variant={getStatusVariant(payment.status)} className="gap-1">
                        {getStatusIcon(payment.status)}
                        {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
                      </Badge>
                    </div>
                    <CardDescription>
                      {t("dashboard.billing.reference")}: {payment.payment_reference}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid sm:grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">{t("dashboard.billing.amount")}</p>
                        <p className="font-semibold">AWG {payment.amount.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">{t("dashboard.billing.submitted")}</p>
                        <p className="font-semibold">{new Date(payment.created_at).toLocaleDateString(locale)}</p>
                      </div>
                      {payment.reviewed_at && (
                        <div>
                          <p className="text-muted-foreground">{t("dashboard.billing.reviewed")}</p>
                          <p className="font-semibold">{new Date(payment.reviewed_at).toLocaleDateString(locale)}</p>
                        </div>
                      )}
                      {payment.admin_notes && (
                        <div className="sm:col-span-2">
                          <p className="text-muted-foreground">{t("dashboard.billing.adminNotes")}</p>
                          <p className="font-semibold">{payment.admin_notes}</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}