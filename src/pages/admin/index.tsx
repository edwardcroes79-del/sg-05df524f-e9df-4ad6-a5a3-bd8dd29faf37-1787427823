import { useEffect, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Shield, Building2, Users, CreditCard, Power, Edit2, Save, Ban, CheckCircle, Clock, XCircle, Eye, LogOut, Trash2, Globe, ShieldCheck, ShieldAlert, Key, Mail, PlusCircle, Archive } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { buildMfaRedirect, getMfaRouteRequirement } from "@/lib/authSecurity";

function asMetadataObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

export default function AdminDashboard() {
  const router = useRouter();
  const { toast } = useToast();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [addons, setAddons] = useState<any[]>([]);
  const [businessAddonSubscriptions, setBusinessAddonSubscriptions] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [globalStats, setGlobalStats] = useState({
    totalBusinesses: 0,
    activeSubscribers: 0,
    totalCustomers: 0,
    totalStamps: 0,
    activeTrials: 0,
    expiredTrials: 0,
  });

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      toast({
        title: "Logged Out",
        description: "Successfully signed out of the Super Admin Portal.",
      });
      router.push("/");
    } catch (err: any) {
      toast({
        title: "Logout Error",
        description: err.message,
        variant: "destructive",
      });
    }
  };

  // Edit states
  const availablePlanEntitlements = [
    { key: "premium_templates", label: "Premium Templates", description: "Allow premium loyalty card templates." },
    { key: "reward_expiration", label: "Reward Expiration", description: "Allow businesses to set reward expiration periods." },
    { key: "custom_card_branding", label: "Custom Card Branding", description: "Allow branded card customization." },
  ];

  const emptyPlanFormData = {
    id: "",
    name: "",
    description: "",
    price_awg: 0,
    annual_price_awg: "",
    status: "active",
    display_order: 100,
    badge: "",
    max_loyalty_programs: 1,
    max_customers: 300,
    max_staff: 1,
    is_trial: false,
    trial_days: 14,
    includes_premium_templates: false,
    features: [] as string[],
    entitlements: {
      premium_templates: false,
      reward_expiration: true,
      custom_card_branding: false,
    },
  };

  const [editingPlan, setEditingPlan] = useState<any | null>(null);
  const [isCreatingPlan, setIsCreatingPlan] = useState(false);
  const [savingPlan, setSavingPlan] = useState(false);
  const [planFormData, setPlanFormData] = useState(emptyPlanFormData);

  const emptyAddonFormData = {
    id: "",
    name: "",
    slug: "",
    description: "",
    addon_type: "customer_capacity",
    capacity_amount: 100,
    monthly_price_awg: 0,
    status: "active",
    display_order: 100,
    provider: "",
    provider_product_id: "",
    provider_price_id: "",
  };

  const [editingAddon, setEditingAddon] = useState<any | null>(null);
  const [isCreatingAddon, setIsCreatingAddon] = useState(false);
  const [savingAddon, setSavingAddon] = useState(false);
  const [addonFormData, setAddonFormData] = useState(emptyAddonFormData);

  const [businessAddonFormData, setBusinessAddonFormData] = useState({
    business_id: "",
    addon_id: "",
    quantity: 1,
    current_period_end: "",
  });
  const [assigningBusinessAddon, setAssigningBusinessAddon] = useState(false);
  const [cancellingBusinessAddonId, setCancellingBusinessAddonId] = useState<string | null>(null);
  const [reviewingAddonRequestId, setReviewingAddonRequestId] = useState<string | null>(null);

  // Payment review states
  const [reviewingPayment, setReviewingPayment] = useState<any | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [processing, setProcessing] = useState(false);

  // Customer deletion states
  const [customerToDelete, setCustomerToDelete] = useState<any | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Business deletion states
  const [businessToDelete, setBusinessToDelete] = useState<any | null>(null);
  const [deletingBusiness, setDeletingBusiness] = useState(false);
  const [approving, setApproving] = useState<string | null>(null);
  const [retryingEmail, setRetryingEmail] = useState<string | null>(null);
  const [retryingAdminEmail, setRetryingAdminEmail] = useState<string | null>(null);

  // Website settings states
  const [footerSettings, setFooterSettings] = useState({
    aboutText: "",
    copyrightText: "",
  });
  const [savingSettings, setSavingSettings] = useState(false);

  // Website Pages state
  const [pages, setPages] = useState<any[]>([]);
  const [editingPage, setEditingPage] = useState<any | null>(null);
  const [savingPage, setSavingPage] = useState(false);

  // Bank Details state
  const [bankDetails, setBankDetails] = useState({
    bankName: "",
    accountHolder: "",
    accountNumber: "",
    iban: "",
    swiftBic: "",
    bankAddress: "",
    paymentReference: "",
    additionalInstructions: "",
  });
  const [savingBankDetails, setSavingBankDetails] = useState(false);

  // 2FA States
  const [mfaFactors, setMfaFactors] = useState<any[]>([]);
  const [pendingFactorId, setPendingFactorId] = useState<string | null>(null);
  const [isEnrollingMfa, setIsEnrollingMfa] = useState(false);
  const [mfaQrCode, setMfaQrCode] = useState("");
  const [mfaSecret, setMfaSecret] = useState("");
  const [mfaFactorId, setMfaFactorId] = useState("");
  const [mfaVerifyCode, setMfaVerifyCode] = useState("");
  const [mfaLoading, setMfaLoading] = useState(false);

  useEffect(() => {
    checkAdmin();
  }, []);

  const checkAdmin = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/auth/login");
        return;
      }

      const mfaRequirement = await getMfaRouteRequirement();
      if (mfaRequirement.required) {
        router.replace(buildMfaRedirect(router.asPath));
        return;
      }

      const { data: profile, error } = await supabase
        .from("profiles")
        .select("is_super_admin, role")
        .eq("id", user.id)
        .single();

      if (error || (!profile?.is_super_admin && profile?.role !== 'super_admin')) {
        setIsAdmin(false);
        router.push("/dashboard");
        return;
      }

      setIsAdmin(true);
      await fetchAdminData();
      await fetchMfaFactors();
    } catch (err) {
      console.error(err);
      router.push("/dashboard");
    } finally {
      setLoading(false);
    }
  };

  const fetchMfaFactors = async () => {
    const { data, error } = await supabase.auth.mfa.listFactors();
    if (!error && data && data.totp) {
      setMfaFactors(data.totp.filter((f: any) => f.status === 'verified'));
      const unverified = data.totp.find((f: any) => f.status === 'unverified');
      setPendingFactorId(unverified ? unverified.id : null);
    }
  };

  const handleCancelPendingSetup = async (factorIdToCancel?: string) => {
    const targetId = factorIdToCancel || pendingFactorId;
    if (!targetId) return;
    setMfaLoading(true);
    try {
      const { error } = await supabase.auth.mfa.unenroll({ factorId: targetId });
      if (error) throw error;
      toast({ title: "Setup Canceled", description: "The pending 2FA setup was safely removed." });
      setPendingFactorId(null);
      setIsEnrollingMfa(false);
      await fetchMfaFactors();
    } catch (err: any) {
      toast({ title: "Failed to cancel", description: err.message, variant: "destructive" });
    } finally {
      setMfaLoading(false);
    }
  };

  const handleEnableMfa = async () => {
    setMfaLoading(true);
    try {
      const { data, error } = await supabase.auth.mfa.enroll({ 
        factorType: 'totp',
        friendlyName: 'Super Admin (Royalty Stamp)'
      });
      if (error) throw error;
      
      setMfaQrCode(data.totp.qr_code);
      setMfaSecret(data.totp.secret);
      setMfaFactorId(data.id);
      setPendingFactorId(data.id);
      setIsEnrollingMfa(true);
    } catch (err: any) {
      toast({ title: "Setup Failed", description: err.message, variant: "destructive" });
    } finally {
      setMfaLoading(false);
    }
  };

  const handleVerifyMfaSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setMfaLoading(true);
    try {
      const challenge = await supabase.auth.mfa.challenge({ factorId: mfaFactorId });
      if (challenge.error) throw challenge.error;
      const verify = await supabase.auth.mfa.verify({ factorId: mfaFactorId, challengeId: challenge.data.id, code: mfaVerifyCode });
      if (verify.error) throw verify.error;
      toast({ title: "2FA Enabled", description: "Two-factor authentication secured on your account." });
      setIsEnrollingMfa(false);
      setMfaVerifyCode("");
      await fetchMfaFactors();
    } catch (err: any) {
      toast({ title: "Verification Failed", description: err.message || "Invalid code.", variant: "destructive" });
    } finally {
      setMfaLoading(false);
    }
  };

  const handleDisableMfa = async (factorId: string) => {
    if (!window.confirm("Are you sure you want to disable 2FA? This will reduce your account security.")) return;
    setMfaLoading(true);
    try {
      const { error } = await supabase.auth.mfa.unenroll({ factorId });
      if (error) throw error;
      toast({ title: "2FA Disabled", description: "Two-factor authentication has been removed." });
      await fetchMfaFactors();
    } catch (err: any) {
      toast({ title: "Failed to Disable", description: err.message, variant: "destructive" });
    } finally {
      setMfaLoading(false);
    }
  };

  const fetchAdminData = async () => {
    try {
      // 1. Fetch Subscription Plans through the secure Super Admin API so metadata and entitlements stay database-driven.
      let plansData: any[] = [];
      const { data: { session } } = await supabase.auth.getSession();

      if (session) {
        const plansResponse = await fetch("/api/admin/plans", {
          headers: {
            "Authorization": `Bearer ${session.access_token}`,
          },
        });

        if (plansResponse.ok) {
          const plansResult = await plansResponse.json();
          plansData = plansResult.plans || [];
        } else {
          const plansResult = await plansResponse.json().catch(() => ({}));
          throw new Error(plansResult.error || "Failed to load subscription plans");
        }
      }

      setPlans(plansData);

      let addonsData: any[] = [];
      if (session) {
        const addonsResponse = await fetch("/api/admin/addons", {
          headers: {
            "Authorization": `Bearer ${session.access_token}`,
          },
        });

        if (addonsResponse.ok) {
          const addonsResult = await addonsResponse.json();
          addonsData = addonsResult.addons || [];
        } else {
          const addonsResult = await addonsResponse.json().catch(() => ({}));
          throw new Error(addonsResult.error || "Failed to load subscription add-ons");
        }
      }

      setAddons(addonsData);

      let businessAddonsData: any[] = [];
      if (session) {
        const businessAddonsResponse = await fetch("/api/admin/business-addons", {
          headers: {
            "Authorization": `Bearer ${session.access_token}`,
          },
        });

        if (businessAddonsResponse.ok) {
          const businessAddonsResult = await businessAddonsResponse.json();
          businessAddonsData = businessAddonsResult.businessAddons || [];
        } else {
          const businessAddonsResult = await businessAddonsResponse.json().catch(() => ({}));
          throw new Error(businessAddonsResult.error || "Failed to load business add-on subscriptions");
        }
      }

      setBusinessAddonSubscriptions(businessAddonsData);

      // 2. Fetch Businesses
      const { data: bizData } = await supabase
        .from("businesses")
        .select(`
          id,
          business_name,
          slug,
          status,
          subscription_plan,
          created_at,
          owner_id,
          trial_start,
          trial_end,
          approval_email_status,
          approval_email_error,
          admin_notify_status,
          admin_notify_error,
          email_logs (
            id, email_type, status, attempt_count, error_message, sent_at
          )
        `)
        .order("created_at", { ascending: false });
      setBusinesses(bizData || []);

      // 3. Fetch Payments
      const { data: paymentsData } = await supabase
        .from("subscription_payments")
        .select(`
          *,
          businesses!inner(business_name, slug)
        `)
        .order("created_at", { ascending: false });
      setPayments(paymentsData || []);

      // 4. Fetch Customers
      const { data: customersData } = await supabase
        .from("customers")
        .select("id, user_id, name, email, phone, avatar, created_at")
        .order("created_at", { ascending: false })
        .limit(100);
      setCustomers(customersData || []);

      // 5. Fetch Platform Stats
      const [
        { count: totalBiz },
        { count: totalCust },
        { count: totalStamps }
      ] = await Promise.all([
        supabase.from("businesses").select("*", { count: "exact", head: true }),
        supabase.from("customers").select("*", { count: "exact", head: true }),
        supabase.from("stamp_transactions").select("*", { count: "exact", head: true })
      ]);

      const trialPlanIds = (plansData || []).filter(p => p.is_trial).map(p => p.id);
      const now = new Date();
      let activeTrials = 0;
      let expiredTrials = 0;

      (bizData || []).forEach(biz => {
        if (biz.subscription_plan && trialPlanIds.includes(biz.subscription_plan)) {
          if (biz.trial_end && new Date(biz.trial_end) < now) {
            expiredTrials++;
          } else {
            activeTrials++;
          }
        }
      });

      setGlobalStats({
        totalBusinesses: totalBiz || 0,
        activeSubscribers: bizData?.filter(b => b.subscription_plan && b.status === "active").length || 0,
        totalCustomers: totalCust || 0,
        totalStamps: totalStamps || 0,
        activeTrials,
        expiredTrials,
      });

      // 6. Fetch Website/Footer Settings
      const { data: footerData } = await supabase
        .from("website_settings")
        .select("value")
        .eq("key", "footer")
        .maybeSingle();

      if (footerData && footerData.value) {
        const val = footerData.value as any;
        setFooterSettings({
          aboutText: val.aboutText || "",
          copyrightText: val.copyrightText || "",
        });
      }

      // 7. Fetch Website Pages
      const { data: pagesData } = await supabase
        .from("website_pages")
        .select("*")
        .order("title");
      if (pagesData) setPages(pagesData);

      // 8. Fetch Bank Details
      const { data: bankData } = await supabase
        .from("website_settings")
        .select("value")
        .eq("key", "bank_details")
        .maybeSingle();

      if (bankData && bankData.value) {
        const val = bankData.value as any;
        setBankDetails({
          bankName: val.bankName || "",
          accountHolder: val.accountHolder || "",
          accountNumber: val.accountNumber || "",
          iban: val.iban || "",
          swiftBic: val.swiftBic || "",
          bankAddress: val.bankAddress || "",
          paymentReference: val.paymentReference || "",
          additionalInstructions: val.additionalInstructions || "",
        });
      }

    } catch (err) {
      console.error("Error fetching admin data:", err);
    }
  };

  const handleToggleBusinessStatus = async (bizId: string, currentStatus: string) => {
    const nextStatus = currentStatus === "active" ? "suspended" : "active";
    try {
      const { error } = await supabase
        .from("businesses")
        .update({ status: nextStatus })
        .eq("id", bizId);

      if (error) throw error;

      toast({
        title: `Business ${nextStatus === "suspended" ? "Suspended" : "Activated"}`,
        description: "The status update has been successfully saved.",
      });

      await fetchAdminData();
    } catch (err: any) {
      toast({
        title: "Error updating status",
        description: err.message,
        variant: "destructive",
      });
    }
  };

  const handleApproveBusiness = async (bizId: string) => {
    try {
      setApproving(bizId);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const response = await fetch("/api/admin/approve-business", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ businessId: bizId, origin: window.location.origin }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to approve business");
      }

      toast({
        title: "Business Approved",
        description: result.emailSent 
          ? "The business is now active and the approval email has been sent."
          : "The business is now active, but the approval email failed to send (SMTP timeout).",
        variant: result.emailSent ? "default" : "destructive",
      });

      await fetchAdminData();
    } catch (err: any) {
      toast({
        title: "Approval Failed",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setApproving(null);
    }
  };

  const handleRetryEmail = async (bizId: string) => {
    try {
      setRetryingEmail(bizId);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const response = await fetch("/api/admin/approve-business", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ businessId: bizId, retryEmail: true, origin: window.location.origin }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to resend email");
      }

      toast({
        title: result.emailSent ? "Email Resent" : "Email Failed",
        description: result.emailSent 
          ? "The approval email was successfully resent."
          : `Email failed: ${result.error || 'Unknown error occurred.'}`,
        variant: result.emailSent ? "default" : "destructive",
      });

      await fetchAdminData();
    } catch (err: any) {
      toast({
        title: "Retry Failed",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setRetryingEmail(null);
    }
  };

  const handleRetryAdminNotification = async (bizId: string) => {
    try {
      setRetryingAdminEmail(bizId);
      
      const response = await fetch("/api/admin/notify-registration", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessId: bizId, retryEmail: true, origin: window.location.origin }),
      });

      const result = await response.json();

      if (!result.success && !result.emailSent) {
        throw new Error(result.error || "Failed to resend admin notification");
      }

      toast({
        title: result.emailSent ? "Notification Resent" : "Notification Failed",
        description: result.emailSent
          ? "The admin notification was successfully resent."
          : `Email failed: ${result.error || 'Unknown error occurred.'}`,
        variant: result.emailSent ? "default" : "destructive",
      });

      await fetchAdminData();
    } catch (err: any) {
      toast({
        title: "Retry Failed",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setRetryingAdminEmail(null);
    }
  };

  const handleChangePlan = async (bizId: string, planId: string) => {
    try {
      const selectedPlan = plans.find(p => p.id === planId);
      const updateData: any = { subscription_plan: planId };
      
      if (selectedPlan?.is_trial) {
        const now = new Date();
        const end = new Date();
        end.setDate(now.getDate() + (selectedPlan.trial_days || 14));
        updateData.trial_start = now.toISOString();
        updateData.trial_end = end.toISOString();
      }

      const { error } = await supabase
        .from("businesses")
        .update(updateData)
        .eq("id", bizId);

      if (error) throw error;

      toast({
        title: "Subscription Updated",
        description: `Successfully changed plan to ${planId.toUpperCase()}`,
      });

      await fetchAdminData();
    } catch (err: any) {
      toast({
        title: "Error updating plan",
        description: err.message,
        variant: "destructive",
      });
    }
  };

  const handleEditPlanClick = (plan: any) => {
    const entitlementMap = (plan.entitlements || []).reduce((acc: Record<string, boolean>, entitlement: any) => {
      if (entitlement.value_type === "boolean") {
        acc[entitlement.key] = Boolean(entitlement.boolean_value);
      }
      return acc;
    }, {});

    setEditingPlan(plan);
    setIsCreatingPlan(false);
    setPlanFormData({
      id: plan.id,
      name: plan.name,
      description: plan.description || "",
      price_awg: Number(plan.price_awg || 0),
      annual_price_awg: plan.annual_price_awg === null || plan.annual_price_awg === undefined ? "" : String(plan.annual_price_awg),
      status: plan.status || (plan.is_active ? "active" : "inactive"),
      display_order: Number(plan.display_order || 100),
      badge: plan.badge || "",
      max_loyalty_programs: plan.max_loyalty_programs,
      max_customers: plan.max_customers,
      max_staff: plan.max_staff || 1,
      is_trial: plan.is_trial || false,
      trial_days: plan.trial_days || 14,
      includes_premium_templates: plan.includes_premium_templates || Boolean(entitlementMap.premium_templates),
      features: Array.isArray(plan.features) ? plan.features : [],
      entitlements: {
        premium_templates: Boolean(entitlementMap.premium_templates ?? plan.includes_premium_templates),
        reward_expiration: Boolean(entitlementMap.reward_expiration ?? true),
        custom_card_branding: Boolean(entitlementMap.custom_card_branding ?? plan.includes_premium_templates),
      },
    });
  };

  const handleCreatePlanClick = () => {
    setEditingPlan(null);
    setIsCreatingPlan(true);
    setPlanFormData(emptyPlanFormData);
  };

  const savePlanThroughApi = async (method: "POST" | "PATCH") => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error("Not authenticated");

    const entitlements = [
      ...availablePlanEntitlements.map((feature) => ({
        key: feature.key,
        value_type: "boolean",
        boolean_value: Boolean(planFormData.entitlements[feature.key as keyof typeof planFormData.entitlements]),
      })),
      {
        key: "max_loyalty_programs",
        value_type: "number",
        number_value: Number(planFormData.max_loyalty_programs),
      },
      {
        key: "max_customers",
        value_type: "number",
        number_value: Number(planFormData.max_customers),
      },
      {
        key: "max_staff",
        value_type: "number",
        number_value: Number(planFormData.max_staff),
      },
    ];

    const response = await fetch("/api/admin/plans", {
      method,
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        id: method === "PATCH" ? planFormData.id : planFormData.id || undefined,
        name: planFormData.name,
        description: planFormData.description,
        price_awg: Number(planFormData.price_awg),
        annual_price_awg: planFormData.annual_price_awg === "" ? null : Number(planFormData.annual_price_awg),
        status: planFormData.status,
        display_order: Number(planFormData.display_order),
        badge: planFormData.badge,
        max_loyalty_programs: Number(planFormData.max_loyalty_programs),
        max_customers: Number(planFormData.max_customers),
        max_staff: Number(planFormData.max_staff),
        is_trial: planFormData.is_trial,
        trial_days: Number(planFormData.trial_days),
        includes_premium_templates: Boolean(planFormData.entitlements.premium_templates),
        features: planFormData.features,
        entitlements,
      }),
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.error || "Failed to save plan");
    }

    setPlans(result.plans || []);
  };

  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!editingPlan && !isCreatingPlan) return;

    if (planFormData.max_staff < 0) {
      toast({ title: "Invalid Limit", description: "Staff limit cannot be negative.", variant: "destructive" });
      return;
    }

    if (!planFormData.name.trim()) {
      toast({ title: "Plan name required", description: "Enter a plan name before saving.", variant: "destructive" });
      return;
    }

    try {
      setSavingPlan(true);
      await savePlanThroughApi(isCreatingPlan ? "POST" : "PATCH");

      toast({
        title: isCreatingPlan ? "Plan Created" : "Plan Updated",
        description: `${planFormData.name} has been saved with database-driven limits and features.`,
      });

      setEditingPlan(null);
      setIsCreatingPlan(false);
      setPlanFormData(emptyPlanFormData);
      await fetchAdminData();
    } catch (err: any) {
      toast({
        title: "Error saving plan",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setSavingPlan(false);
    }
  };

  const handleUpdatePlanStatus = async (plan: any, nextStatus: "active" | "inactive" | "archived") => {
    try {
      setSavingPlan(true);

      const entitlementMap = (plan.entitlements || []).reduce((acc: Record<string, boolean>, entitlement: any) => {
        if (entitlement.value_type === "boolean") {
          acc[entitlement.key] = Boolean(entitlement.boolean_value);
        }
        return acc;
      }, {});

      setPlanFormData({
        id: plan.id,
        name: plan.name,
        description: plan.description || "",
        price_awg: Number(plan.price_awg || 0),
        annual_price_awg: plan.annual_price_awg === null || plan.annual_price_awg === undefined ? "" : String(plan.annual_price_awg),
        status: nextStatus,
        display_order: Number(plan.display_order || 100),
        badge: plan.badge || "",
        max_loyalty_programs: plan.max_loyalty_programs,
        max_customers: plan.max_customers,
        max_staff: plan.max_staff || 1,
        is_trial: plan.is_trial || false,
        trial_days: plan.trial_days || 14,
        includes_premium_templates: Boolean(entitlementMap.premium_templates ?? plan.includes_premium_templates),
        features: Array.isArray(plan.features) ? plan.features : [],
        entitlements: {
          premium_templates: Boolean(entitlementMap.premium_templates ?? plan.includes_premium_templates),
          reward_expiration: Boolean(entitlementMap.reward_expiration ?? true),
          custom_card_branding: Boolean(entitlementMap.custom_card_branding ?? plan.includes_premium_templates),
        },
      });

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const response = await fetch("/api/admin/plans", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          id: plan.id,
          name: plan.name,
          description: plan.description || "",
          price_awg: Number(plan.price_awg || 0),
          annual_price_awg: plan.annual_price_awg,
          status: nextStatus,
          display_order: Number(plan.display_order || 100),
          badge: plan.badge || "",
          max_loyalty_programs: Number(plan.max_loyalty_programs || 1),
          max_customers: Number(plan.max_customers || 300),
          max_staff: Number(plan.max_staff || 1),
          is_trial: Boolean(plan.is_trial),
          trial_days: Number(plan.trial_days || 14),
          includes_premium_templates: Boolean(entitlementMap.premium_templates ?? plan.includes_premium_templates),
          features: Array.isArray(plan.features) ? plan.features : [],
          entitlements: [
            ...availablePlanEntitlements.map((feature) => ({
              key: feature.key,
              value_type: "boolean",
              boolean_value: Boolean(entitlementMap[feature.key] ?? (feature.key === "premium_templates" ? plan.includes_premium_templates : feature.key === "reward_expiration")),
            })),
            { key: "max_loyalty_programs", value_type: "number", number_value: Number(plan.max_loyalty_programs || 1) },
            { key: "max_customers", value_type: "number", number_value: Number(plan.max_customers || 300) },
            { key: "max_staff", value_type: "number", number_value: Number(plan.max_staff || 1) },
          ],
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Failed to update plan status");
      }

      setPlans(result.plans || []);
      toast({
        title: nextStatus === "archived" ? "Plan Archived" : nextStatus === "active" ? "Plan Activated" : "Plan Deactivated",
        description: `${plan.name} is now ${nextStatus}. Existing assigned businesses are not moved.`,
      });
    } catch (err: any) {
      toast({
        title: "Plan status update failed",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setSavingPlan(false);
    }
  };

  const handleEditAddonClick = (addon: any) => {
    setEditingAddon(addon);
    setIsCreatingAddon(false);
    setAddonFormData({
      id: addon.id,
      name: addon.name,
      slug: addon.slug || "",
      description: addon.description || "",
      addon_type: addon.addon_type || "customer_capacity",
      capacity_amount: Number(addon.capacity_amount || 100),
      monthly_price_awg: Number(addon.monthly_price_awg || 0),
      status: addon.status || "active",
      display_order: Number(addon.display_order || 100),
      provider: addon.provider || "",
      provider_product_id: addon.provider_product_id || "",
      provider_price_id: addon.provider_price_id || "",
    });
  };

  const handleCreateAddonClick = () => {
    setEditingAddon(null);
    setIsCreatingAddon(true);
    setAddonFormData(emptyAddonFormData);
  };

  const saveAddonThroughApi = async (method: "POST" | "PATCH") => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error("Not authenticated");

    const response = await fetch("/api/admin/addons", {
      method,
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        id: method === "PATCH" ? addonFormData.id : addonFormData.id || undefined,
        name: addonFormData.name,
        slug: addonFormData.slug || undefined,
        description: addonFormData.description,
        addon_type: addonFormData.addon_type,
        capacity_amount: Number(addonFormData.capacity_amount),
        monthly_price_awg: Number(addonFormData.monthly_price_awg),
        status: addonFormData.status,
        display_order: Number(addonFormData.display_order),
        provider: addonFormData.provider,
        provider_product_id: addonFormData.provider_product_id,
        provider_price_id: addonFormData.provider_price_id,
      }),
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.error || "Failed to save add-on");
    }

    setAddons(result.addons || []);
  };

  const handleSaveAddon = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!editingAddon && !isCreatingAddon) return;

    if (!addonFormData.name.trim()) {
      toast({ title: "Add-on name required", description: "Enter an add-on name before saving.", variant: "destructive" });
      return;
    }

    if (Number(addonFormData.capacity_amount) < 1) {
      toast({ title: "Invalid capacity", description: "Customer capacity must be at least 1.", variant: "destructive" });
      return;
    }

    try {
      setSavingAddon(true);
      await saveAddonThroughApi(isCreatingAddon ? "POST" : "PATCH");

      toast({
        title: isCreatingAddon ? "Add-on Created" : "Add-on Updated",
        description: `${addonFormData.name} has been saved. Effective customer limits were not changed in this phase.`,
      });

      setEditingAddon(null);
      setIsCreatingAddon(false);
      setAddonFormData(emptyAddonFormData);
      await fetchAdminData();
    } catch (err: any) {
      toast({
        title: "Error saving add-on",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setSavingAddon(false);
    }
  };

  const handleUpdateAddonStatus = async (addon: any, nextStatus: "active" | "inactive" | "archived") => {
    try {
      setSavingAddon(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const response = await fetch("/api/admin/addons", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          id: addon.id,
          name: addon.name,
          slug: addon.slug,
          description: addon.description || "",
          addon_type: addon.addon_type || "customer_capacity",
          capacity_amount: Number(addon.capacity_amount || 100),
          monthly_price_awg: Number(addon.monthly_price_awg || 0),
          status: nextStatus,
          display_order: Number(addon.display_order || 100),
          provider: addon.provider || "",
          provider_product_id: addon.provider_product_id || "",
          provider_price_id: addon.provider_price_id || "",
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Failed to update add-on status");
      }

      setAddons(result.addons || []);
      toast({
        title: nextStatus === "archived" ? "Add-on Archived" : nextStatus === "active" ? "Add-on Activated" : "Add-on Deactivated",
        description: `${addon.name} is now ${nextStatus}. Existing future subscriptions will remain non-destructive.`,
      });
    } catch (err: any) {
      toast({
        title: "Add-on status update failed",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setSavingAddon(false);
    }
  };

  const handleAssignBusinessAddon = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!businessAddonFormData.business_id || !businessAddonFormData.addon_id) {
      toast({
        title: "Missing selection",
        description: "Select both a business and a customer capacity add-on.",
        variant: "destructive",
      });
      return;
    }

    try {
      setAssigningBusinessAddon(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const response = await fetch("/api/admin/business-addons", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          business_id: businessAddonFormData.business_id,
          addon_id: businessAddonFormData.addon_id,
          quantity: Number(businessAddonFormData.quantity),
          current_period_end: businessAddonFormData.current_period_end || null,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Failed to assign add-on");
      }

      setBusinessAddonSubscriptions(result.businessAddons || []);
      setBusinessAddonFormData({ business_id: "", addon_id: "", quantity: 1, current_period_end: "" });
      toast({
        title: "Add-on Assigned",
        description: "The business customer capacity entitlement now includes this active add-on.",
      });
      await fetchAdminData();
    } catch (err: any) {
      toast({
        title: "Add-on assignment failed",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setAssigningBusinessAddon(false);
    }
  };

  const handleCancelBusinessAddon = async (subscription: any) => {
    try {
      setCancellingBusinessAddonId(subscription.id);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const response = await fetch("/api/admin/business-addons", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          id: subscription.id,
          action: "cancel_at_period_end",
          current_period_end: subscription.current_period_end || null,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Failed to cancel add-on");
      }

      setBusinessAddonSubscriptions(result.businessAddons || []);
      toast({
        title: "Add-on Cancellation Scheduled",
        description: "Existing customer data remains intact. Capacity is reduced after the current period ends.",
      });
      await fetchAdminData();
    } catch (err: any) {
      toast({
        title: "Cancellation failed",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setCancellingBusinessAddonId(null);
    }
  };

  const handleApproveAddonRequest = async (subscription: any) => {
    try {
      setReviewingAddonRequestId(subscription.id);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const now = new Date().toISOString();
      const metadata = asMetadataObject(subscription.metadata);
      const approvedSubscriptionTotal = Number(metadata.requested_new_monthly_total || 0);

      const { error } = await supabase
        .from("business_addon_subscriptions")
        .update({
          status: "active",
          payment_status: "approved",
          starts_at: now,
          current_period_start: now,
          metadata: {
            ...metadata,
            pending_approval: false,
            approved_by: user.id,
            approved_at: now,
            active_as_subscription_component: true,
            approved_subscription_total_awg: approvedSubscriptionTotal,
          },
          updated_at: now,
        })
        .eq("id", subscription.id)
        .eq("business_id", subscription.business_id)
        .eq("status", "inactive")
        .eq("payment_status", "pending");

      if (error) throw error;

      toast({
        title: "Add-on Approved",
        description: "The customer capacity add-on is now active and included in the business subscription total.",
      });
      await fetchAdminData();
    } catch (err: any) {
      toast({
        title: "Add-on approval failed",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setReviewingAddonRequestId(null);
    }
  };

  const handleRejectAddonRequest = async (subscription: any) => {
    try {
      setReviewingAddonRequestId(subscription.id);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const now = new Date().toISOString();
      const metadata = asMetadataObject(subscription.metadata);

      const { error } = await supabase
        .from("business_addon_subscriptions")
        .update({
          status: "cancelled",
          payment_status: "failed",
          ends_at: now,
          metadata: {
            ...metadata,
            pending_approval: false,
            rejected_by: user.id,
            rejected_at: now,
            rejection_status: "rejected",
          },
          updated_at: now,
        })
        .eq("id", subscription.id)
        .eq("business_id", subscription.business_id)
        .eq("status", "inactive")
        .eq("payment_status", "pending");

      if (error) throw error;

      toast({
        title: "Add-on Rejected",
        description: "The request was preserved in history and no capacity was added.",
      });
      await fetchAdminData();
    } catch (err: any) {
      toast({
        title: "Add-on rejection failed",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setReviewingAddonRequestId(null);
    }
  };

  const handleApprovePayment = async (payment: any) => {
    const isAddonApprovalPayment =
      (payment.metadata?.kind === "subscription_change" && payment.metadata?.change_type === "addon_purchase") ||
      payment.metadata?.kind === "addon_purchase";
    const isPlanChangeRequest = payment.metadata?.kind === "subscription_plan_change";

    if (payment.provider === "bank_transfer" && !payment.payment_proof_url && !isAddonApprovalPayment && !isPlanChangeRequest) {
      toast({
        title: "Payment Proof Required",
        description: "Manual bank-transfer subscription payments require uploaded proof before approval.",
        variant: "destructive",
      });
      return;
    }

    try {
      setProcessing(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const reviewedAt = new Date().toISOString();
      const paymentMetadata = asMetadataObject(payment.metadata);

      if (isPlanChangeRequest) {
        const { error: reviewError } = await (supabase as any).rpc("review_subscription_plan_change", {
          p_payment_id: payment.id,
          p_action: "approved",
          p_admin_notes: adminNotes,
        });

        if (reviewError) throw reviewError;

        toast({
          title: payment.metadata?.change_type === "downgrade" ? "Downgrade Approved" : "Plan Change Approved",
          description: `${payment.businesses.business_name} is now on the ${payment.metadata?.requested_plan_name || payment.plan_id} plan. Existing customer and loyalty data was preserved.`,
        });

        setReviewingPayment(null);
        setAdminNotes("");
        await fetchAdminData();
        return;
      }

      // Update payment/request status
      const { error: paymentError } = await supabase
        .from("subscription_payments")
        .update({
          status: "approved",
          admin_notes: adminNotes,
          reviewed_by: user.id,
          reviewed_at: reviewedAt,
          metadata: {
            ...paymentMetadata,
            notification_status: "approved",
            approved_by: user.id,
            approved_at: reviewedAt,
            business_notified_status: "approved",
          },
        })
        .eq("id", payment.id);

      if (paymentError) throw paymentError;

      // Update business subscription plan
      if (payment.metadata?.kind === "subscription_change" && payment.metadata?.change_type === "addon_purchase") {
        const subscriptionIds = Array.isArray(payment.metadata?.requested_addon_subscription_ids)
          ? payment.metadata.requested_addon_subscription_ids
          : [];

        if (subscriptionIds.length === 0) {
          throw new Error("Missing requested add-on subscription references on this payment.");
        }

        const { data: existingSubscriptions, error: subscriptionReadError } = await supabase
          .from("business_addon_subscriptions")
          .select("id, metadata")
          .in("id", subscriptionIds)
          .eq("business_id", payment.business_id);

        if (subscriptionReadError) throw subscriptionReadError;
        if (!existingSubscriptions || existingSubscriptions.length !== subscriptionIds.length) {
          throw new Error("One or more pending add-on subscription records were not found for this business.");
        }

        const now = new Date().toISOString();
        for (const subscription of existingSubscriptions) {
          const { error: addonError } = await supabase
            .from("business_addon_subscriptions")
            .update({
              status: "active",
              payment_status: "approved",
              starts_at: now,
              current_period_start: now,
              metadata: {
                ...asMetadataObject(subscription.metadata),
                pending_payment: false,
                approved_payment_id: payment.id,
                approved_by: user.id,
                approved_at: now,
                active_as_subscription_component: true,
                approved_subscription_total_awg: payment.metadata?.new_monthly_total || payment.amount,
              },
              updated_at: now,
            })
            .eq("id", subscription.id)
            .eq("business_id", payment.business_id);

          if (addonError) throw addonError;
        }

        toast({
          title: "Subscription Change Approved",
          description: `${payment.businesses.business_name}'s add-on is now part of the active subscription.`,
        });
      } else if (isPlanChangeRequest) {
        const requestedPlanId = String(payment.metadata?.requested_plan_id || payment.plan_id || "");
        if (!requestedPlanId) {
          throw new Error("Missing requested plan on this subscription change request.");
        }

        const { error: businessError } = await supabase
          .from("businesses")
          .update({
            subscription_plan: requestedPlanId,
            subscription_status: "active",
            status: "active",
          })
          .eq("id", payment.business_id);

        if (businessError) throw businessError;

        toast({
          title: payment.metadata?.change_type === "downgrade" ? "Downgrade Approved" : "Plan Change Approved",
          description: `${payment.businesses.business_name} is now on the ${payment.metadata?.requested_plan_name || requestedPlanId} plan. Existing customer and loyalty data was preserved.`,
        });
      } else {
        const { error: businessError } = await supabase
          .from("businesses")
          .update({
            subscription_plan: payment.plan_id,
            status: "active",
          })
          .eq("id", payment.business_id);

        if (businessError) throw businessError;

        toast({
          title: "Payment Approved",
          description: `${payment.businesses.business_name} has been upgraded to ${payment.plan_id.toUpperCase()} plan.`,
        });
      }

      setReviewingPayment(null);
      setAdminNotes("");
      await fetchAdminData();
    } catch (err: any) {
      toast({
        title: "Approval Failed",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleRejectPayment = async (payment: any) => {
    if (!adminNotes.trim()) {
      toast({
        title: "Admin Notes Required",
        description: "Please add a rejection reason before rejecting.",
        variant: "destructive",
      });
      return;
    }

    try {
      setProcessing(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const rejectedAt = new Date().toISOString();
      const paymentMetadata = asMetadataObject(payment.metadata);

      if (payment.metadata?.kind === "subscription_plan_change") {
        const { error: reviewError } = await (supabase as any).rpc("review_subscription_plan_change", {
          p_payment_id: payment.id,
          p_action: "rejected",
          p_admin_notes: adminNotes,
        });

        if (reviewError) throw reviewError;

        toast({
          title: "Request Rejected",
          description: "The business has been notified and the current subscription remains unchanged.",
        });

        setReviewingPayment(null);
        setAdminNotes("");
        await fetchAdminData();
        return;
      }

      const { error } = await supabase
        .from("subscription_payments")
        .update({
          status: "rejected",
          admin_notes: adminNotes,
          reviewed_by: user.id,
          reviewed_at: rejectedAt,
          metadata: {
            ...paymentMetadata,
            notification_status: "rejected",
            rejected_by: user.id,
            rejected_at: rejectedAt,
            business_notified_status: "rejected",
          },
        })
        .eq("id", payment.id);

      if (error) throw error;

      if (payment.metadata?.kind === "subscription_change" && payment.metadata?.change_type === "addon_purchase") {
        const subscriptionIds = Array.isArray(payment.metadata?.requested_addon_subscription_ids)
          ? payment.metadata.requested_addon_subscription_ids
          : [];

        if (subscriptionIds.length > 0) {
          const { data: existingSubscriptions, error: subscriptionReadError } = await supabase
            .from("business_addon_subscriptions")
            .select("id, metadata")
            .in("id", subscriptionIds)
            .eq("business_id", payment.business_id);

          if (subscriptionReadError) throw subscriptionReadError;

          for (const subscription of existingSubscriptions || []) {
            const { error: addonError } = await supabase
              .from("business_addon_subscriptions")
              .update({
                status: "cancelled",
                payment_status: "failed",
                ends_at: new Date().toISOString(),
                metadata: {
                  ...asMetadataObject(subscription.metadata),
                  pending_payment: false,
                  rejected_payment_id: payment.id,
                  rejected_by: user.id,
                  rejected_at: new Date().toISOString(),
                  rejection_status: "rejected",
                },
                updated_at: new Date().toISOString(),
              })
              .eq("id", subscription.id)
              .eq("business_id", payment.business_id);

            if (addonError) throw addonError;
          }
        }
      } else if (payment.metadata?.kind === "addon_purchase" && payment.metadata?.business_addon_subscription_id) {
        const { data: existingSubscription, error: subscriptionReadError } = await supabase
          .from("business_addon_subscriptions")
          .select("metadata")
          .eq("id", payment.metadata.business_addon_subscription_id)
          .eq("business_id", payment.business_id)
          .maybeSingle();

        if (subscriptionReadError) throw subscriptionReadError;

        if (existingSubscription) {
          const { error: addonError } = await supabase
            .from("business_addon_subscriptions")
            .update({
              status: "cancelled",
              payment_status: "failed",
              ends_at: new Date().toISOString(),
              metadata: {
                ...asMetadataObject(existingSubscription.metadata),
                pending_payment: false,
                rejected_payment_id: payment.id,
                rejected_by: user.id,
                rejected_at: new Date().toISOString(),
                rejection_status: "rejected",
              },
              updated_at: new Date().toISOString(),
            })
            .eq("id", payment.metadata.business_addon_subscription_id)
            .eq("business_id", payment.business_id);

          if (addonError) throw addonError;
        }
      }

      toast({
        title: "Payment Rejected",
        description: "The business has been notified of the rejection.",
      });

      setReviewingPayment(null);
      setAdminNotes("");
      await fetchAdminData();
    } catch (err: any) {
      toast({
        title: "Rejection Failed",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleOpenAdminPaymentProof = async (payment: any) => {
    if (!payment.payment_proof_url) return;

    try {
      if (payment.payment_proof_url.startsWith("http")) {
        window.open(payment.payment_proof_url, "_blank", "noopener,noreferrer");
        return;
      }

      const { data, error } = await supabase.storage
        .from("payment-proofs")
        .createSignedUrl(payment.payment_proof_url, 120);

      if (error) throw error;
      window.open(data.signedUrl, "_blank", "noopener,noreferrer");
    } catch (err: any) {
      toast({
        title: "Could not open payment proof",
        description: err.message,
        variant: "destructive",
      });
    }
  };

  const handleDeleteCustomer = async () => {
    if (!customerToDelete) return;

    try {
      setDeleting(true);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const response = await fetch("/api/admin/delete-customer", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ customerId: customerToDelete.id }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Failed to delete customer");
      }

      toast({
        title: "Customer Deleted",
        description: result.message || `Successfully removed ${customerToDelete.name} and verified backend deletion.`,
      });

      setCustomerToDelete(null);
      await fetchAdminData();
    } catch (err: any) {
      toast({
        title: "Deletion Failed",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteBusiness = async () => {
    if (!businessToDelete) return;

    try {
      setDeletingBusiness(true);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const response = await fetch("/api/admin/delete-business", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ businessId: businessToDelete.id }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to delete business");
      }

      toast({
        title: "Business Deleted",
        description: `Successfully removed ${businessToDelete.business_name} and all related demo data.`,
      });

      setBusinessToDelete(null);
      await fetchAdminData();
    } catch (err: any) {
      toast({
        title: "Deletion Failed",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setDeletingBusiness(false);
    }
  };

  const handleSaveFooterSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSavingSettings(true);

      const { error } = await supabase
        .from("website_settings")
        .upsert({
          key: "footer",
          value: {
            aboutText: footerSettings.aboutText,
            copyrightText: footerSettings.copyrightText,
          },
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;

      toast({
        title: "Settings Saved",
        description: "Public Website footer content has been updated successfully.",
      });

      await fetchAdminData();
    } catch (err: any) {
      toast({
        title: "Error saving settings",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setSavingSettings(false);
    }
  };

  const handleSaveBankDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!bankDetails.bankName || !bankDetails.accountHolder || !bankDetails.accountNumber) {
      toast({
        title: "Missing Fields",
        description: "Bank Name, Account Holder, and Account Number are required.",
        variant: "destructive"
      });
      return;
    }

    try {
      setSavingBankDetails(true);

      const { error } = await supabase
        .from("website_settings")
        .upsert({
          key: "bank_details",
          value: bankDetails,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;

      toast({
        title: "Bank details saved successfully.",
        description: "The payment instructions have been updated and are ready for client upgrades.",
      });
    } catch (err: any) {
      toast({
        title: "Error saving bank details",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setSavingBankDetails(false);
    }
  };

  if (loading || isAdmin === null) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="animate-spin w-8 h-8 text-primary" />
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Super Admin Panel | Aruba Royalty Stamp</title>
      </Head>

      <div className="min-h-screen bg-background p-6 md:p-12 space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-6">
          <div>
            <div className="flex items-center gap-2 text-primary font-semibold text-sm mb-1 uppercase tracking-wider">
              <Shield className="h-4 w-4" /> Super Admin Portal
            </div>
            <h1 className="text-4xl font-heading font-bold text-foreground">Platform Management</h1>
            <p className="text-muted-foreground mt-1">Configure subscription plans, monitor businesses, and manage limits.</p>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/dashboard">
              <Button variant="outline">Back to Merchant Dashboard</Button>
            </Link>
            <Button variant="destructive" onClick={handleLogout} className="gap-2">
              <LogOut className="h-4 w-4" /> Sign Out
            </Button>
          </div>
        </div>

        {/* Global Statistics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Merchants</CardTitle>
              <Building2 className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{globalStats.totalBusinesses}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Active Subscriptions</CardTitle>
              <CheckCircle className="h-4 w-4 text-emerald-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{globalStats.activeSubscribers}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Customers</CardTitle>
              <Users className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{globalStats.totalCustomers}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Stamps Issued</CardTitle>
              <CreditCard className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{globalStats.totalStamps}</div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="merchants" className="space-y-6">
          <TabsList className="bg-muted p-1 rounded-lg flex-wrap h-auto">
            <TabsTrigger value="merchants">Merchants & Subscriptions</TabsTrigger>
            <TabsTrigger value="payments">Payment Review</TabsTrigger>
            <TabsTrigger value="plans">Subscription Plans & Limits</TabsTrigger>
            <TabsTrigger value="addons">Customer Capacity Add-ons</TabsTrigger>
            <TabsTrigger value="customers">Customers</TabsTrigger>
            <TabsTrigger value="payment_settings">Payment Settings</TabsTrigger>
            <TabsTrigger value="website">Website Settings</TabsTrigger>
            <TabsTrigger value="security">Account Security</TabsTrigger>
          </TabsList>

          <TabsContent value="merchants">
            <Card>
              <CardHeader>
                <CardTitle>Aruban Merchants</CardTitle>
                <CardDescription>
                  Manage active business accounts, plan limits, and suspend/activate services.
                  <div className="flex gap-4 mt-3 font-medium text-sm">
                    <span className="text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-md border border-indigo-100 flex items-center gap-2">
                      <Clock className="h-4 w-4" /> Active Trials: {globalStats.activeTrials}
                    </span>
                    <span className="text-destructive bg-destructive/10 px-2.5 py-1 rounded-md border border-destructive/20 flex items-center gap-2">
                      <Ban className="h-4 w-4" /> Expired Trials: {globalStats.expiredTrials}
                    </span>
                  </div>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Business Name</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Plan</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {businesses.map((biz) => (
                      <TableRow key={biz.id}>
                        <TableCell className="font-semibold">{biz.business_name}</TableCell>
                        <TableCell>{new Date(biz.created_at).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <Badge 
                            variant={biz.status === "active" ? "default" : biz.status === "pending" ? "secondary" : "destructive"}
                            className={biz.status === "pending" ? "bg-amber-100 text-amber-800 hover:bg-amber-100" : "mb-2"}
                          >
                            {biz.status?.toUpperCase()}
                          </Badge>
                          
                          <div className="flex flex-col gap-1.5 mt-2 border-t pt-2">
                            {/* Detailed Email Tracking via Logs */}
                            {(() => {
                              const approvalLog = biz.email_logs?.find((l: any) => l.email_type === 'client_approval');
                              const adminNotifLog = biz.email_logs?.find((l: any) => l.email_type === 'admin_notification');

                              return (
                                <>
                                  <div className="flex flex-col gap-0.5">
                                    <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Approval Email</span>
                                    {approvalLog ? (
                                      approvalLog.status === 'sent' ? (
                                        <div className="text-[11px] text-emerald-600 flex items-center gap-1 font-medium"><CheckCircle className="h-3 w-3" /> Sent</div>
                                      ) : approvalLog.status === 'failed' ? (
                                        <div className="text-[11px] text-destructive flex items-center gap-1 font-medium" title={approvalLog.error_message}><XCircle className="h-3 w-3" /> Failed (Attempt {approvalLog.attempt_count})</div>
                                      ) : (
                                        <div className="text-[11px] text-amber-600 flex items-center gap-1 font-medium"><Clock className="h-3 w-3" /> Pending</div>
                                      )
                                    ) : biz.status === "active" ? (
                                      <div className="text-[11px] text-muted-foreground italic">Missing log</div>
                                    ) : (
                                      <div className="text-[11px] text-muted-foreground">Not triggered</div>
                                    )}
                                  </div>

                                  <div className="flex flex-col gap-0.5 mt-1">
                                    <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Admin Notif</span>
                                    {adminNotifLog ? (
                                      adminNotifLog.status === 'sent' ? (
                                        <div className="text-[11px] text-emerald-600 flex items-center gap-1 font-medium"><CheckCircle className="h-3 w-3" /> Sent</div>
                                      ) : adminNotifLog.status === 'failed' ? (
                                        <div className="text-[11px] text-destructive flex items-center gap-1 font-medium" title={adminNotifLog.error_message}><XCircle className="h-3 w-3" /> Failed (Attempt {adminNotifLog.attempt_count})</div>
                                      ) : (
                                        <div className="text-[11px] text-amber-600 flex items-center gap-1 font-medium"><Clock className="h-3 w-3" /> Pending</div>
                                      )
                                    ) : (
                                      <div className="text-[11px] text-muted-foreground italic">Missing log</div>
                                    )}
                                  </div>
                                </>
                              );
                            })()}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="uppercase font-mono font-bold text-xs">{biz.subscription_plan || "None"}</div>
                          {biz.trial_end && plans.find(p => p.id === biz.subscription_plan)?.is_trial && (
                            <div className="text-[10px] mt-1.5 flex flex-col gap-0.5">
                              <span className="text-muted-foreground">Start: {new Date(biz.trial_start).toLocaleDateString()}</span>
                              {new Date() > new Date(biz.trial_end) ? (
                                <span className="text-destructive font-semibold">Expired: {new Date(biz.trial_end).toLocaleDateString()}</span>
                              ) : (
                                <span className="text-indigo-600 font-semibold">Ends: {new Date(biz.trial_end).toLocaleDateString()}</span>
                              )}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-right flex items-center justify-end gap-2">
                          <select
                            className="bg-background border border-input rounded px-2 py-1 text-xs"
                            value={biz.subscription_plan || ""}
                            onChange={(e) => handleChangePlan(biz.id, e.target.value)}
                          >
                            <option value="">Select Plan</option>
                            {plans
                              .filter((p) => p.status !== "archived" || p.id === biz.subscription_plan)
                              .map(p => (
                                <option key={p.id} value={p.id}>
                                  {p.name}{p.status === "archived" ? " (Archived)" : ""}
                                </option>
                              ))}
                          </select>

                          {biz.status === "pending" && (
                            <Button
                              variant="default"
                              size="sm"
                              className="gap-1 text-xs bg-emerald-600 hover:bg-emerald-700"
                              onClick={() => handleApproveBusiness(biz.id)}
                              disabled={approving === biz.id}
                            >
                              {approving === biz.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle className="h-3.5 w-3.5" />}
                              Approve
                            </Button>
                          )}

                          {biz.email_logs?.find((l: any) => l.email_type === 'client_approval')?.status === "failed" && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-1 text-xs border-destructive/30 hover:bg-destructive/10 text-destructive"
                              onClick={() => handleRetryEmail(biz.id)}
                              disabled={retryingEmail === biz.id}
                            >
                              {retryingEmail === biz.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Mail className="h-3.5 w-3.5" />}
                              Resend Approval
                            </Button>
                          )}

                          {biz.email_logs?.find((l: any) => l.email_type === 'admin_notification')?.status === "failed" && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-1 text-xs border-destructive/30 hover:bg-destructive/10 text-destructive"
                              onClick={() => handleRetryAdminNotification(biz.id)}
                              disabled={retryingAdminEmail === biz.id}
                            >
                              {retryingAdminEmail === biz.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Mail className="h-3.5 w-3.5" />}
                              Resend Notif
                            </Button>
                          )}

                          {/* Fallback buttons for legacy rows without logs yet */}
                          {!biz.email_logs?.length && biz.status === "active" && biz.approval_email_status === "failed" && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-1 text-xs border-destructive/30 hover:bg-destructive/10 text-destructive"
                              onClick={() => handleRetryEmail(biz.id)}
                              disabled={retryingEmail === biz.id}
                            >
                              {retryingEmail === biz.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Mail className="h-3.5 w-3.5" />}
                              Resend Approval
                            </Button>
                          )}
                          {!biz.email_logs?.length && biz.admin_notify_status === "failed" && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-1 text-xs border-destructive/30 hover:bg-destructive/10 text-destructive"
                              onClick={() => handleRetryAdminNotification(biz.id)}
                              disabled={retryingAdminEmail === biz.id}
                            >
                              {retryingAdminEmail === biz.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Mail className="h-3.5 w-3.5" />}
                              Resend Notif
                            </Button>
                          )}

                          <Button
                            variant={biz.status === "active" ? "destructive" : "default"}
                            size="sm"
                            className="gap-1 text-xs"
                            onClick={() => handleToggleBusinessStatus(biz.id, biz.status)}
                          >
                            {biz.status === "active" ? (
                              <>
                                <Ban className="h-3.5 w-3.5" /> Suspend
                              </>
                            ) : (
                              <>
                                <Power className="h-3.5 w-3.5" /> Activate
                              </>
                            )}
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            className="gap-1 text-xs"
                            onClick={() => setBusinessToDelete(biz)}
                          >
                            <Trash2 className="h-3.5 w-3.5" /> Delete
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {businesses.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                          No merchants onboarded yet.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="payments">
            <Card>
              <CardHeader>
                <CardTitle>Payment Review Queue</CardTitle>
                <CardDescription>Review manual subscription payments, subscription plan-change requests, and direct add-on approval requests.</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Business</TableHead>
                      <TableHead>Plan / Add-on</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Reference</TableHead>
                      <TableHead>Submitted</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell className="font-semibold">{payment.businesses?.business_name || "Unknown"}</TableCell>
                        <TableCell className="uppercase font-mono text-xs">
                          {payment.metadata?.kind === "subscription_plan_change"
                            ? payment.metadata?.notification_title || "Subscription Plan Change Request"
                            : payment.metadata?.kind === "subscription_change"
                            ? "Subscription change"
                            : payment.metadata?.kind === "addon_purchase"
                            ? payment.metadata?.addon_name || "Customer capacity add-on"
                            : payment.plan_id}
                        </TableCell>
                        <TableCell className="font-semibold">AWG {payment.amount.toFixed(2)}</TableCell>
                        <TableCell className="font-mono text-xs">{payment.payment_reference}</TableCell>
                        <TableCell>{new Date(payment.created_at).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <Badge 
                            variant={
                              payment.status === "pending" ? "secondary" : 
                              payment.status === "approved" ? "default" : 
                              "destructive"
                            }
                            className="gap-1"
                          >
                            {payment.status === "pending" && <Clock className="h-3 w-3" />}
                            {payment.status === "approved" && <CheckCircle className="h-3 w-3" />}
                            {payment.status === "rejected" && <XCircle className="h-3 w-3" />}
                            {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {payment.status === "pending" && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setReviewingPayment(payment);
                                setAdminNotes("");
                              }}
                            >
                              <Eye className="h-4 w-4 mr-1" /> Review
                            </Button>
                          )}
                          {payment.status !== "pending" && (
                            <span className="text-xs text-muted-foreground">
                              Reviewed {new Date(payment.reviewed_at).toLocaleDateString()}
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                    {payments.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-6 text-muted-foreground">
                          No payment submissions yet.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Payment Review Dialog */}
            {reviewingPayment && (
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle>Review {reviewingPayment.metadata?.kind === "subscription_plan_change" ? "Subscription Plan Change" : "Payment"}: {reviewingPayment.businesses?.business_name}</CardTitle>
                  <CardDescription>
                    {reviewingPayment.metadata?.kind === "subscription_plan_change"
                      ? "Review the requested plan change before it becomes effective."
                      : "Verify payment proof and approve or reject the subscription change."}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Business</p>
                        <p className="font-semibold">{reviewingPayment.businesses?.business_name}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Subscription Change</p>
                        <p className="font-semibold">
                          {reviewingPayment.metadata?.kind === "subscription_plan_change"
                            ? `${reviewingPayment.metadata?.current_plan_name || "Current plan"} → ${reviewingPayment.metadata?.requested_plan_name || reviewingPayment.plan_id}`
                            : reviewingPayment.metadata?.kind === "subscription_change"
                            ? `${reviewingPayment.metadata?.base_plan_name || reviewingPayment.plan_id} + requested add-ons`
                            : reviewingPayment.metadata?.kind === "addon_purchase"
                            ? reviewingPayment.metadata?.addon_name || "Customer capacity add-on"
                            : reviewingPayment.plan_id}
                        </p>
                      </div>
                      {reviewingPayment.metadata?.kind === "subscription_plan_change" && (
                        <div className="rounded-lg border bg-muted/20 p-3 space-y-3">
                          <div className="flex items-center gap-2">
                            <Badge variant={reviewingPayment.metadata?.change_type === "downgrade" ? "secondary" : "default"}>
                              {reviewingPayment.metadata?.change_type === "downgrade" ? "Downgrade Request" : "Upgrade Request"}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              Requested {reviewingPayment.metadata?.requested_at ? new Date(reviewingPayment.metadata.requested_at).toLocaleString() : new Date(reviewingPayment.created_at).toLocaleString()}
                            </span>
                          </div>
                          <div className="grid gap-3 text-sm sm:grid-cols-2">
                            <div>
                              <p className="text-muted-foreground">Current Plan</p>
                              <p className="font-semibold">{reviewingPayment.metadata?.current_plan_name}</p>
                              <p className="text-xs text-muted-foreground">AWG {Number(reviewingPayment.metadata?.current_plan_price_awg || 0).toFixed(2)}/month</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Requested Plan</p>
                              <p className="font-semibold">{reviewingPayment.metadata?.requested_plan_name}</p>
                              <p className="text-xs text-primary font-semibold">AWG {Number(reviewingPayment.metadata?.requested_plan_price_awg || reviewingPayment.amount || 0).toFixed(2)}/month</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Current Entitlements</p>
                              <p className="font-semibold">{Number(reviewingPayment.metadata?.current_entitlements?.max_loyalty_programs || 0).toLocaleString()} Loyalty Programs</p>
                              <p className="text-xs text-muted-foreground">{Number(reviewingPayment.metadata?.current_entitlements?.max_customers || 0).toLocaleString()} Loyalty Members · {Number(reviewingPayment.metadata?.current_entitlements?.max_staff || 0).toLocaleString()} Staff</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Requested Entitlements</p>
                              <p className="font-semibold">{Number(reviewingPayment.metadata?.requested_entitlements?.max_loyalty_programs || 0).toLocaleString()} Loyalty Programs</p>
                              <p className="text-xs text-muted-foreground">{Number(reviewingPayment.metadata?.requested_entitlements?.max_customers || 0).toLocaleString()} Loyalty Members · {Number(reviewingPayment.metadata?.requested_entitlements?.max_staff || 0).toLocaleString()} Staff</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Current Member Count</p>
                              <p className="font-semibold">{Number(reviewingPayment.metadata?.current_member_count || 0).toLocaleString()}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Current Staff Count</p>
                              <p className="font-semibold">{Number(reviewingPayment.metadata?.current_staff_count || 0).toLocaleString()}</p>
                            </div>
                          </div>
                          <p className="text-xs text-muted-foreground border-t pt-2">
                            Existing customers, cards, stamps, and rewards are preserved. If usage is above the new limit, existing data stays safe and new additions follow the existing limit rules.
                          </p>
                        </div>
                      )}
                      <div>
                        <p className="text-sm text-muted-foreground">Amount</p>
                        <p className="font-bold text-xl">AWG {reviewingPayment.amount.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Payment Reference</p>
                        <p className="font-mono font-semibold">{reviewingPayment.payment_reference}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Submitted</p>
                        <p className="font-semibold">{new Date(reviewingPayment.created_at).toLocaleString()}</p>
                      </div>
                    </div>

                    <div>
                      {reviewingPayment.metadata?.kind === "subscription_plan_change" ? (
                        <div className="rounded-lg border bg-muted/20 p-6 text-center space-y-2">
                          <Clock className="h-8 w-8 text-primary mx-auto" />
                          <p className="font-semibold text-foreground">{reviewingPayment.metadata?.notification_title || "Subscription Plan Change Request"}</p>
                          <p className="text-sm text-muted-foreground">No payment proof is required. Super Admin approval applies the requested plan change.</p>
                        </div>
                      ) : reviewingPayment.metadata?.kind === "subscription_change" && reviewingPayment.metadata?.change_type === "addon_purchase" ? (
                        <div className="rounded-lg border bg-muted/20 p-6 text-center space-y-2">
                          <CheckCircle className="h-8 w-8 text-primary mx-auto" />
                          <p className="font-semibold text-foreground">Customer capacity add-on approval</p>
                          <p className="text-sm text-muted-foreground">No payment proof is required for customer-capacity add-on approval.</p>
                        </div>
                      ) : (
                        <>
                          <p className="text-sm text-muted-foreground mb-2">Payment Proof</p>
                          {reviewingPayment.payment_proof_url ? (
                            <div className="border rounded-lg p-6 text-center space-y-3">
                              <CheckCircle className="h-8 w-8 text-emerald-500 mx-auto" />
                              <div>
                                <p className="font-semibold text-foreground">Payment proof uploaded</p>
                                <p className="text-xs text-muted-foreground break-all">
                                  {reviewingPayment.payment_proof_url.startsWith("http")
                                    ? "Legacy public proof URL"
                                    : reviewingPayment.payment_proof_url}
                                </p>
                              </div>
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => handleOpenAdminPaymentProof(reviewingPayment)}
                              >
                                View Payment Proof
                              </Button>
                            </div>
                          ) : (
                            <div className="border rounded-lg p-8 text-center text-muted-foreground">
                              No proof uploaded
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="adminNotes">Admin Review Notes</Label>
                    <textarea
                      id="adminNotes"
                      className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      placeholder="Add notes about this payment verification..."
                      value={adminNotes}
                      onChange={(e) => setAdminNotes(e.target.value)}
                      disabled={processing}
                    />
                  </div>
                </CardContent>
                <CardFooter className="flex justify-end gap-2">
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setReviewingPayment(null);
                      setAdminNotes("");
                    }}
                    disabled={processing}
                  >
                    Cancel
                  </Button>
                  <Button 
                    variant="destructive"
                    onClick={() => handleRejectPayment(reviewingPayment)}
                    disabled={processing || !adminNotes.trim() || (reviewingPayment.provider === "bank_transfer" && !reviewingPayment.payment_proof_url && !(reviewingPayment.metadata?.kind === "subscription_change" && reviewingPayment.metadata?.change_type === "addon_purchase") && reviewingPayment.metadata?.kind !== "addon_purchase" && reviewingPayment.metadata?.kind !== "subscription_plan_change")}
                  >
                    {processing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <XCircle className="h-4 w-4 mr-2" />}
                    {reviewingPayment.metadata?.kind === "subscription_plan_change" ? "Reject Request" : "Reject Payment"}
                  </Button>
                  <Button 
                    onClick={() => handleApprovePayment(reviewingPayment)}
                    disabled={processing || !adminNotes.trim() || (reviewingPayment.provider === "bank_transfer" && !reviewingPayment.payment_proof_url && !(reviewingPayment.metadata?.kind === "subscription_change" && reviewingPayment.metadata?.change_type === "addon_purchase") && reviewingPayment.metadata?.kind !== "addon_purchase" && reviewingPayment.metadata?.kind !== "subscription_plan_change")}
                  >
                    {processing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                    {reviewingPayment.metadata?.kind === "subscription_plan_change"
                      ? reviewingPayment.metadata?.change_type === "downgrade" ? "Approve Downgrade" : "Approve Plan Change"
                      : "Approve & Activate"}
                  </Button>
                </CardFooter>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="plans">
            <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-8">
              <Card>
                <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <CardTitle>Subscription Plan Management</CardTitle>
                    <CardDescription>
                      Create and manage database-driven plans. Archived plans stay valid for assigned businesses but are hidden from new selection.
                    </CardDescription>
                  </div>
                  <Button type="button" onClick={handleCreatePlanClick} className="gap-2 shrink-0">
                    <PlusCircle className="h-4 w-4" /> Create Plan
                  </Button>
                </CardHeader>
                <CardContent className="space-y-4">
                  {plans.map((plan) => {
                    const status = plan.status || (plan.is_active ? "active" : "inactive");
                    const entitlementMap = (plan.entitlements || []).reduce((acc: Record<string, any>, entitlement: any) => {
                      acc[entitlement.key] = entitlement;
                      return acc;
                    }, {});
                    const enabledFeatures = availablePlanEntitlements.filter((feature) => Boolean(entitlementMap[feature.key]?.boolean_value));

                    return (
                      <div key={plan.id} className="p-4 border rounded-lg bg-card flex flex-col gap-4">
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <h4 className="font-heading font-semibold text-foreground">{plan.name}</h4>
                              <span className="text-xs font-mono font-bold text-primary uppercase">({plan.id})</span>
                              {plan.badge && <Badge variant="secondary" className="text-xs">{plan.badge}</Badge>}
                              <Badge
                                variant={status === "active" ? "default" : status === "archived" ? "outline" : "destructive"}
                                className={status === "archived" ? "gap-1 border-amber-300 bg-amber-50 text-amber-700" : "gap-1"}
                              >
                                {status === "archived" && <Archive className="h-3 w-3" />}
                                {status.toUpperCase()}
                              </Badge>
                            </div>
                            {plan.description && (
                              <p className="text-sm text-muted-foreground mt-1 max-w-2xl">{plan.description}</p>
                            )}
                            <p className="text-sm text-muted-foreground mt-2">
                              AWG {Number(plan.price_awg || 0).toFixed(2)}/month
                              {plan.annual_price_awg ? ` · AWG ${Number(plan.annual_price_awg).toFixed(2)}/year` : ""}
                              {" · "}Assigned businesses: {plan.assigned_business_count || 0}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              Programs: {plan.max_loyalty_programs === 9999 ? "Unlimited" : plan.max_loyalty_programs} ·
                              Customers: {plan.max_customers === 999999 ? "Unlimited" : plan.max_customers} ·
                              Staff: {plan.max_staff || 1}
                              {plan.is_trial ? ` · Trial: ${plan.trial_days || 14} days` : ""}
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-2 sm:justify-end">
                            <Button variant="outline" size="sm" onClick={() => handleEditPlanClick(plan)}>
                              <Edit2 className="h-4 w-4 mr-1" /> View / Edit
                            </Button>
                            {status !== "active" && (
                              <Button variant="outline" size="sm" onClick={() => handleUpdatePlanStatus(plan, "active")} disabled={savingPlan}>
                                Activate
                              </Button>
                            )}
                            {status !== "inactive" && status !== "archived" && (
                              <Button variant="outline" size="sm" onClick={() => handleUpdatePlanStatus(plan, "inactive")} disabled={savingPlan}>
                                Deactivate
                              </Button>
                            )}
                            {status !== "archived" && (
                              <Button variant="outline" size="sm" onClick={() => handleUpdatePlanStatus(plan, "archived")} disabled={savingPlan} className="text-amber-700 border-amber-300 hover:bg-amber-50">
                                <Archive className="h-4 w-4 mr-1" /> Archive
                              </Button>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          {enabledFeatures.length > 0 ? (
                            enabledFeatures.map((feature) => (
                              <Badge key={feature.key} variant="secondary" className="text-xs">
                                {feature.label}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-xs text-muted-foreground">No optional feature entitlements enabled.</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {plans.length === 0 && (
                    <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
                      No subscription plans found.
                    </div>
                  )}
                </CardContent>
              </Card>

              {(editingPlan || isCreatingPlan) && (
                <Card>
                  <form onSubmit={handleSavePlan}>
                    <CardHeader>
                      <CardTitle>{isCreatingPlan ? "Create Plan" : `Edit ${editingPlan?.name} Plan`}</CardTitle>
                      <CardDescription>
                        Configure live plan metadata, pricing, limits, trial settings, and existing Royalty Stamp feature entitlements.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-5">
                      <div className="grid sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="planName">Plan Name</Label>
                          <Input
                            id="planName"
                            value={planFormData.name}
                            onChange={(e) => setPlanFormData({ ...planFormData, name: e.target.value })}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="planBadge">Optional Badge</Label>
                          <Input
                            id="planBadge"
                            placeholder="Popular"
                            value={planFormData.badge}
                            onChange={(e) => setPlanFormData({ ...planFormData, badge: e.target.value })}
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="planDescription">Description</Label>
                        <textarea
                          id="planDescription"
                          className="flex min-h-[88px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                          value={planFormData.description}
                          onChange={(e) => setPlanFormData({ ...planFormData, description: e.target.value })}
                          placeholder="Describe who this plan is for."
                        />
                      </div>

                      <div className="grid sm:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="planPrice">Monthly Price (AWG)</Label>
                          <Input
                            id="planPrice"
                            type="number"
                            min="0"
                            step="0.01"
                            value={planFormData.price_awg}
                            onChange={(e) => setPlanFormData({ ...planFormData, price_awg: Number(e.target.value) })}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="annualPrice">Annual Price (AWG)</Label>
                          <Input
                            id="annualPrice"
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="Optional"
                            value={planFormData.annual_price_awg}
                            onChange={(e) => setPlanFormData({ ...planFormData, annual_price_awg: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="displayOrder">Display Order</Label>
                          <Input
                            id="displayOrder"
                            type="number"
                            value={planFormData.display_order}
                            onChange={(e) => setPlanFormData({ ...planFormData, display_order: Number(e.target.value) })}
                            required
                          />
                        </div>
                      </div>

                      <div className="grid sm:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="planStatus">Status</Label>
                          <select
                            id="planStatus"
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
                            value={planFormData.status}
                            onChange={(e) => setPlanFormData({ ...planFormData, status: e.target.value })}
                          >
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                            <option value="archived">Archived</option>
                          </select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="trialToggle">Trial Available</Label>
                          <label className="flex h-10 items-center gap-2 rounded-md border px-3 text-sm">
                            <input
                              id="trialToggle"
                              type="checkbox"
                              checked={planFormData.is_trial}
                              onChange={(e) => setPlanFormData({ ...planFormData, is_trial: e.target.checked })}
                            />
                            Enable trial
                          </label>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="trialDays">Trial Duration</Label>
                          <Input
                            id="trialDays"
                            type="number"
                            min="1"
                            value={planFormData.trial_days}
                            onChange={(e) => setPlanFormData({ ...planFormData, trial_days: Number(e.target.value) })}
                            disabled={!planFormData.is_trial}
                            required={planFormData.is_trial}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 rounded-lg border bg-muted/20 p-4">
                        <div className="space-y-2">
                          <Label htmlFor="planMaxPrograms">Max Loyalty Programs</Label>
                          <Input
                            id="planMaxPrograms"
                            type="number"
                            min="1"
                            value={planFormData.max_loyalty_programs}
                            onChange={(e) => setPlanFormData({ ...planFormData, max_loyalty_programs: Number(e.target.value) })}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="planMaxCustomers">Max Members / Customers</Label>
                          <Input
                            id="planMaxCustomers"
                            type="number"
                            min="1"
                            value={planFormData.max_customers}
                            onChange={(e) => setPlanFormData({ ...planFormData, max_customers: Number(e.target.value) })}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="planMaxStaff">Max Staff</Label>
                          <Input
                            id="planMaxStaff"
                            type="number"
                            min="0"
                            value={planFormData.max_staff}
                            onChange={(e) => setPlanFormData({ ...planFormData, max_staff: Number(e.target.value) })}
                            required
                          />
                        </div>
                      </div>

                      <div className="space-y-3 rounded-lg border p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-semibold text-foreground">Feature Descriptions</h4>
                            <p className="text-xs text-muted-foreground">List items shown on the pricing card.</p>
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setPlanFormData({ ...planFormData, features: [...planFormData.features, ""] })}
                          >
                            <PlusCircle className="h-4 w-4 mr-1" /> Add Feature
                          </Button>
                        </div>
                        <div className="space-y-2">
                          {planFormData.features.map((feature, idx) => (
                            <div key={idx} className="flex items-center gap-2">
                              <Input
                                value={feature}
                                onChange={(e) => {
                                  const newFeatures = [...planFormData.features];
                                  newFeatures[idx] = e.target.value;
                                  setPlanFormData({ ...planFormData, features: newFeatures });
                                }}
                                placeholder="e.g. Priority Support"
                              />
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                className="shrink-0 text-destructive border-destructive/30 hover:bg-destructive/10"
                                onClick={() => {
                                  const newFeatures = planFormData.features.filter((_, i) => i !== idx);
                                  setPlanFormData({ ...planFormData, features: newFeatures });
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                          {planFormData.features.length === 0 && (
                            <p className="text-sm text-muted-foreground italic">No custom features added.</p>
                          )}
                        </div>
                      </div>

                      <div className="space-y-3 rounded-lg border p-4">
                        <div>
                          <h4 className="font-semibold text-foreground">Feature Entitlements</h4>
                          <p className="text-xs text-muted-foreground">Only existing Royalty Stamp feature flags are configurable here.</p>
                        </div>
                        <div className="space-y-3">
                          {availablePlanEntitlements.map((feature) => (
                            <label key={feature.key} className="flex items-start gap-3 rounded-md border bg-background p-3 text-sm">
                              <input
                                type="checkbox"
                                className="mt-1"
                                checked={Boolean(planFormData.entitlements[feature.key as keyof typeof planFormData.entitlements])}
                                onChange={(e) => setPlanFormData({
                                  ...planFormData,
                                  includes_premium_templates: feature.key === "premium_templates" ? e.target.checked : planFormData.includes_premium_templates,
                                  entitlements: {
                                    ...planFormData.entitlements,
                                    [feature.key]: e.target.checked,
                                  },
                                })}
                              />
                              <span>
                                <span className="block font-medium text-foreground">{feature.label}</span>
                                <span className="block text-xs text-muted-foreground">{feature.description}</span>
                              </span>
                            </label>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                    <CardFooter className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                      <Button type="button" variant="outline" onClick={() => { setEditingPlan(null); setIsCreatingPlan(false); }} disabled={savingPlan}>
                        Cancel
                      </Button>
                      <Button type="submit" className="gap-2" disabled={savingPlan}>
                        {savingPlan ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        {isCreatingPlan ? "Create Plan" : "Save Plan"}
                      </Button>
                    </CardFooter>
                  </form>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="addons">
            <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-8">
              <Card>
                <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <CardTitle>Customer Capacity Add-ons</CardTitle>
                    <CardDescription>
                      Manage configurable add-on definitions and assign purchased customer capacity add-ons to businesses.
                    </CardDescription>
                  </div>
                  <Button type="button" onClick={handleCreateAddonClick} className="gap-2 shrink-0">
                    <PlusCircle className="h-4 w-4" /> Create Add-on
                  </Button>
                </CardHeader>
                <CardContent className="space-y-4">
                  {addons.map((addon) => {
                    const status = addon.status || "active";

                    return (
                      <div key={addon.id} className="p-4 border rounded-lg bg-card flex flex-col gap-4">
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <h4 className="font-heading font-semibold text-foreground">{addon.name}</h4>
                              <span className="text-xs font-mono font-bold text-primary uppercase">({addon.id})</span>
                              <Badge
                                variant={status === "active" ? "default" : status === "archived" ? "outline" : "destructive"}
                                className={status === "archived" ? "gap-1 border-amber-300 bg-amber-50 text-amber-700" : "gap-1"}
                              >
                                {status === "archived" && <Archive className="h-3 w-3" />}
                                {status.toUpperCase()}
                              </Badge>
                            </div>
                            {addon.description && (
                              <p className="text-sm text-muted-foreground mt-1 max-w-2xl">{addon.description}</p>
                            )}
                            <p className="text-sm text-muted-foreground mt-2">
                              +{Number(addon.capacity_amount || 0).toLocaleString()} customers · AWG {Number(addon.monthly_price_awg || 0).toFixed(2)}/month
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              Type: {addon.addon_type} · Display order: {addon.display_order}
                              {addon.provider ? ` · Provider: ${addon.provider}` : ""}
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-2 sm:justify-end">
                            <Button variant="outline" size="sm" onClick={() => handleEditAddonClick(addon)}>
                              <Edit2 className="h-4 w-4 mr-1" /> View / Edit
                            </Button>
                            {status !== "active" && (
                              <Button variant="outline" size="sm" onClick={() => handleUpdateAddonStatus(addon, "active")} disabled={savingAddon}>
                                Activate
                              </Button>
                            )}
                            {status !== "inactive" && status !== "archived" && (
                              <Button variant="outline" size="sm" onClick={() => handleUpdateAddonStatus(addon, "inactive")} disabled={savingAddon}>
                                Deactivate
                              </Button>
                            )}
                            {status !== "archived" && (
                              <Button variant="outline" size="sm" onClick={() => handleUpdateAddonStatus(addon, "archived")} disabled={savingAddon} className="text-amber-700 border-amber-300 hover:bg-amber-50">
                                <Archive className="h-4 w-4 mr-1" /> Archive
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {addons.length === 0 && (
                    <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
                      No add-on definitions found.
                    </div>
                  )}
                </CardContent>
              </Card>

              {(editingAddon || isCreatingAddon) && (
                <Card>
                  <form onSubmit={handleSaveAddon}>
                    <CardHeader>
                      <CardTitle>{isCreatingAddon ? "Create Add-on" : `Edit ${editingAddon?.name} Add-on`}</CardTitle>
                      <CardDescription>
                        Configure customer capacity add-on metadata and pricing. Prices are stored in the database, not hard-coded in the app.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-5">
                      <div className="grid sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="addonName">Add-on Name</Label>
                          <Input
                            id="addonName"
                            value={addonFormData.name}
                            onChange={(e) => setAddonFormData({ ...addonFormData, name: e.target.value })}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="addonType">Add-on Type</Label>
                          <select
                            id="addonType"
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
                            value={addonFormData.addon_type}
                            onChange={(e) => setAddonFormData({ ...addonFormData, addon_type: e.target.value })}
                          >
                            <option value="customer_capacity">Customer Capacity</option>
                          </select>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="addonDescription">Description</Label>
                        <textarea
                          id="addonDescription"
                          className="flex min-h-[88px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                          value={addonFormData.description}
                          onChange={(e) => setAddonFormData({ ...addonFormData, description: e.target.value })}
                          placeholder="Describe what this add-on gives the business."
                        />
                      </div>

                      <div className="grid sm:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="addonCapacity">Customer Capacity</Label>
                          <Input
                            id="addonCapacity"
                            type="number"
                            min="1"
                            step="1"
                            value={addonFormData.capacity_amount}
                            onChange={(e) => setAddonFormData({ ...addonFormData, capacity_amount: Number(e.target.value) })}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="addonPrice">Monthly Price (AWG)</Label>
                          <Input
                            id="addonPrice"
                            type="number"
                            min="0"
                            step="0.01"
                            value={addonFormData.monthly_price_awg}
                            onChange={(e) => setAddonFormData({ ...addonFormData, monthly_price_awg: Number(e.target.value) })}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="addonOrder">Display Order</Label>
                          <Input
                            id="addonOrder"
                            type="number"
                            value={addonFormData.display_order}
                            onChange={(e) => setAddonFormData({ ...addonFormData, display_order: Number(e.target.value) })}
                            required
                          />
                        </div>
                      </div>

                      <div className="grid sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="addonStatus">Status</Label>
                          <select
                            id="addonStatus"
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
                            value={addonFormData.status}
                            onChange={(e) => setAddonFormData({ ...addonFormData, status: e.target.value })}
                          >
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                            <option value="archived">Archived</option>
                          </select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="addonSlug">Slug</Label>
                          <Input
                            id="addonSlug"
                            placeholder="Auto-generated if blank"
                            value={addonFormData.slug}
                            onChange={(e) => setAddonFormData({ ...addonFormData, slug: e.target.value })}
                          />
                        </div>
                      </div>

                      <div className="grid sm:grid-cols-3 gap-4 rounded-lg border bg-muted/20 p-4">
                        <div className="space-y-2">
                          <Label htmlFor="addonProvider">Provider</Label>
                          <Input
                            id="addonProvider"
                            placeholder="Optional"
                            value={addonFormData.provider}
                            onChange={(e) => setAddonFormData({ ...addonFormData, provider: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="addonProductId">Provider Product ID</Label>
                          <Input
                            id="addonProductId"
                            placeholder="Optional"
                            value={addonFormData.provider_product_id}
                            onChange={(e) => setAddonFormData({ ...addonFormData, provider_product_id: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="addonPriceId">Provider Price ID</Label>
                          <Input
                            id="addonPriceId"
                            placeholder="Optional"
                            value={addonFormData.provider_price_id}
                            onChange={(e) => setAddonFormData({ ...addonFormData, provider_price_id: e.target.value })}
                          />
                        </div>
                      </div>
                    </CardContent>
                    <CardFooter className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                      <Button type="button" variant="outline" onClick={() => { setEditingAddon(null); setIsCreatingAddon(false); }} disabled={savingAddon}>
                        Cancel
                      </Button>
                      <Button type="submit" className="gap-2" disabled={savingAddon}>
                        {savingAddon ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        {isCreatingAddon ? "Create Add-on" : "Save Add-on"}
                      </Button>
                    </CardFooter>
                  </form>
                </Card>
              )}
              
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Business Customer Capacity Add-ons</CardTitle>
                  <CardDescription>
                    Assign purchased add-ons to businesses. Active approved add-ons increase effective customer capacity server-side until the period ends or the subscription is cancelled.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <form onSubmit={handleAssignBusinessAddon} className="grid md:grid-cols-5 gap-3 rounded-lg border bg-muted/20 p-4">
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="businessAddonBusiness">Business</Label>
                      <select
                        id="businessAddonBusiness"
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
                        value={businessAddonFormData.business_id}
                        onChange={(e) => setBusinessAddonFormData({ ...businessAddonFormData, business_id: e.target.value })}
                        required
                      >
                        <option value="">Select business</option>
                        {businesses.map((business) => (
                          <option key={business.id} value={business.id}>{business.business_name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="businessAddonAddon">Customer Capacity Add-on</Label>
                      <select
                        id="businessAddonAddon"
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
                        value={businessAddonFormData.addon_id}
                        onChange={(e) => setBusinessAddonFormData({ ...businessAddonFormData, addon_id: e.target.value })}
                        required
                      >
                        <option value="">Select add-on</option>
                        {addons
                          .filter((addon) => addon.status === "active" && addon.addon_type === "customer_capacity")
                          .map((addon) => (
                            <option key={addon.id} value={addon.id}>
                              {addon.name} (+{Number(addon.capacity_amount || 0).toLocaleString()})
                            </option>
                          ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="businessAddonQuantity">Quantity</Label>
                      <Input
                        id="businessAddonQuantity"
                        type="number"
                        min="1"
                        value={businessAddonFormData.quantity}
                        onChange={(e) => setBusinessAddonFormData({ ...businessAddonFormData, quantity: Number(e.target.value) })}
                        required
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="businessAddonPeriodEnd">Current Period End</Label>
                      <Input
                        id="businessAddonPeriodEnd"
                        type="datetime-local"
                        value={businessAddonFormData.current_period_end}
                        onChange={(e) => setBusinessAddonFormData({ ...businessAddonFormData, current_period_end: e.target.value })}
                      />
                    </div>
                    <div className="md:col-span-3 flex items-end">
                      <Button type="submit" disabled={assigningBusinessAddon} className="gap-2">
                        {assigningBusinessAddon ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlusCircle className="h-4 w-4" />}
                        Assign Add-on
                      </Button>
                    </div>
                  </form>

                  <div className="space-y-3">
                    {businessAddonSubscriptions.length === 0 ? (
                      <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
                        No business add-on subscriptions assigned yet.
                      </div>
                    ) : (
                      businessAddonSubscriptions.map((subscription) => {
                        const addon = Array.isArray(subscription.subscription_addons) ? subscription.subscription_addons[0] : subscription.subscription_addons;
                        const business = Array.isArray(subscription.businesses) ? subscription.businesses[0] : subscription.businesses;
                        const addedCapacity = Number(addon?.capacity_amount || 0) * Number(subscription.quantity || 1);
                        const metadata = asMetadataObject(subscription.metadata);
                        const planId = String(metadata.base_plan_id || business?.subscription_plan || "");
                        const plan = plans.find((item) => item.id === planId);
                        const basePrice = Number(metadata.base_plan_price_awg ?? plan?.price_awg ?? 0);
                        const currentMonthlyTotal = Number(metadata.current_monthly_total ?? basePrice);
                        const addonMonthlyTotal = Number(metadata.monthly_total_awg ?? (Number(addon?.monthly_price_awg || 0) * Number(subscription.quantity || 1)));
                        const newMonthlyTotal = Number(metadata.requested_new_monthly_total ?? (currentMonthlyTotal + addonMonthlyTotal));
                        const currentCustomerLimit = Number(metadata.current_customer_limit ?? plan?.max_customers ?? 0);
                        const requestedCustomerLimit = Number(metadata.requested_new_customer_limit ?? (currentCustomerLimit + addedCapacity));
                        const isPendingApproval = subscription.status === "inactive" && subscription.payment_status === "pending";
                        const isRejected = subscription.status === "cancelled" && subscription.payment_status === "failed";

                        return (
                          <div key={subscription.id} className="flex flex-col gap-3 rounded-lg border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <h4 className="font-semibold text-foreground">{business?.business_name || "Unknown business"}</h4>
                                <Badge variant={subscription.status === "active" ? "default" : isRejected ? "destructive" : "secondary"}>
                                  {isPendingApproval ? "PENDING APPROVAL" : isRejected ? "REJECTED" : subscription.status.toUpperCase()}
                                </Badge>
                                {subscription.cancel_at_period_end && (
                                  <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-700">
                                    Cancels at period end
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground mt-1">
                                {addon?.name || subscription.addon_id} × {subscription.quantity} = +{addedCapacity.toLocaleString()} customer capacity
                              </p>
                              {isPendingApproval && (
                                <div className="mt-3 grid gap-2 rounded-md border bg-muted/20 p-3 text-xs sm:grid-cols-2 lg:grid-cols-4">
                                  <div>
                                    <p className="text-muted-foreground">Current subscription</p>
                                    <p className="font-semibold text-foreground">AWG {currentMonthlyTotal.toFixed(2)}/month</p>
                                  </div>
                                  <div>
                                    <p className="text-muted-foreground">Requested add-on</p>
                                    <p className="font-semibold text-foreground">AWG {addonMonthlyTotal.toFixed(2)}/month</p>
                                  </div>
                                  <div>
                                    <p className="text-muted-foreground">New total</p>
                                    <p className="font-semibold text-primary">AWG {newMonthlyTotal.toFixed(2)}/month</p>
                                  </div>
                                  <div>
                                    <p className="text-muted-foreground">Customer capacity</p>
                                    <p className="font-semibold text-foreground">{currentCustomerLimit.toLocaleString()} → {requestedCustomerLimit.toLocaleString()}</p>
                                  </div>
                                </div>
                              )}
                              <p className="text-xs text-muted-foreground mt-1">
                                Period end: {subscription.current_period_end ? new Date(subscription.current_period_end).toLocaleString() : "Not set"}
                              </p>
                            </div>
                            {isPendingApproval && (
                              <div className="flex flex-wrap gap-2 sm:justify-end">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="border-destructive/30 text-destructive hover:bg-destructive/10"
                                  onClick={() => handleRejectAddonRequest(subscription)}
                                  disabled={reviewingAddonRequestId === subscription.id}
                                >
                                  {reviewingAddonRequestId === subscription.id ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <XCircle className="h-4 w-4 mr-1" />}
                                  Reject
                                </Button>
                                <Button
                                  size="sm"
                                  onClick={() => handleApproveAddonRequest(subscription)}
                                  disabled={reviewingAddonRequestId === subscription.id}
                                >
                                  {reviewingAddonRequestId === subscription.id ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <CheckCircle className="h-4 w-4 mr-1" />}
                                  Approve Add-on
                                </Button>
                              </div>
                            )}
                            {subscription.status === "active" && !subscription.cancel_at_period_end && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="border-amber-300 text-amber-700 hover:bg-amber-50"
                                onClick={() => handleCancelBusinessAddon(subscription)}
                                disabled={cancellingBusinessAddonId === subscription.id}
                              >
                                {cancellingBusinessAddonId === subscription.id ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                                Cancel at Period End
                              </Button>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="customers">
            <Card>
              <CardHeader>
                <CardTitle>Platform Customers & Users</CardTitle>
                <CardDescription>Manage, deactivate, and permanently delete registered test customer accounts and profiles.</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Customer Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Registered At</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {customers.map((cust) => (
                      <TableRow key={cust.id}>
                        <TableCell className="font-semibold">{cust.name}</TableCell>
                        <TableCell className="font-mono text-xs">{cust.email || "No Email"}</TableCell>
                        <TableCell className="text-xs">{cust.phone || "No Phone"}</TableCell>
                        <TableCell className="text-xs">{new Date(cust.created_at).toLocaleDateString()}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => setCustomerToDelete(cust)}
                            className="gap-1 text-xs"
                          >
                            <Trash2 className="h-3.5 w-3.5" /> Delete User
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {customers.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                          No customer profiles found on the platform.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="payment_settings">
            <Card>
              <form onSubmit={handleSaveBankDetails}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5 text-primary" /> Bank Transfer Details
                  </CardTitle>
                  <CardDescription>
                    Configure the platform's bank account information. This will be displayed to businesses when they select Bank Transfer to pay for subscription upgrades.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="bankName">Bank Name <span className="text-destructive">*</span></Label>
                      <Input id="bankName" value={bankDetails.bankName} onChange={(e) => setBankDetails({...bankDetails, bankName: e.target.value})} required disabled={savingBankDetails} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="accountHolder">Account Holder / Beneficiary <span className="text-destructive">*</span></Label>
                      <Input id="accountHolder" value={bankDetails.accountHolder} onChange={(e) => setBankDetails({...bankDetails, accountHolder: e.target.value})} required disabled={savingBankDetails} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="accountNumber">Account Number <span className="text-destructive">*</span></Label>
                      <Input id="accountNumber" value={bankDetails.accountNumber} onChange={(e) => setBankDetails({...bankDetails, accountNumber: e.target.value})} required disabled={savingBankDetails} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="iban">IBAN</Label>
                      <Input id="iban" value={bankDetails.iban} onChange={(e) => setBankDetails({...bankDetails, iban: e.target.value})} disabled={savingBankDetails} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="swiftBic">SWIFT/BIC</Label>
                      <Input id="swiftBic" value={bankDetails.swiftBic} onChange={(e) => setBankDetails({...bankDetails, swiftBic: e.target.value})} disabled={savingBankDetails} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="bankAddress">Bank Address</Label>
                      <Input id="bankAddress" value={bankDetails.bankAddress} onChange={(e) => setBankDetails({...bankDetails, bankAddress: e.target.value})} disabled={savingBankDetails} />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="paymentReference">Payment Reference Instructions</Label>
                    <Input id="paymentReference" placeholder="e.g. Business Name + Invoice Number" value={bankDetails.paymentReference} onChange={(e) => setBankDetails({...bankDetails, paymentReference: e.target.value})} disabled={savingBankDetails} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="additionalInstructions">Additional Payment Instructions</Label>
                    <textarea 
                      id="additionalInstructions" 
                      className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 text-foreground"
                      placeholder="Any other details the client should know..." 
                      value={bankDetails.additionalInstructions} 
                      onChange={(e) => setBankDetails({...bankDetails, additionalInstructions: e.target.value})} 
                      disabled={savingBankDetails} 
                    />
                  </div>
                </CardContent>
                <CardFooter className="flex justify-end gap-2">
                  <Button type="submit" disabled={savingBankDetails} className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90">
                    {savingBankDetails ? (
                      <><Loader2 className="h-4 w-4 animate-spin" /> Saving...</>
                    ) : (
                      <><Save className="h-4 w-4" /> Save Changes</>
                    )}
                  </Button>
                </CardFooter>
              </form>
            </Card>
          </TabsContent>

          <TabsContent value="website">
            <Card>
              <form onSubmit={handleSaveFooterSettings}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Globe className="h-5 w-5 text-primary" /> Public Website Customization
                  </CardTitle>
                  <CardDescription>Edit content displayed on the public Home Page of Aruba Royalty Stamp.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <h3 className="font-heading font-semibold text-lg border-b pb-2 text-foreground">Footer Settings</h3>
                    
                    <div className="space-y-2">
                      <Label htmlFor="aboutText">Company / Business Description</Label>
                      <textarea
                        id="aboutText"
                        className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 text-foreground"
                        placeholder="Describe the company/platform..."
                        value={footerSettings.aboutText}
                        onChange={(e) => setFooterSettings({ ...footerSettings, aboutText: e.target.value })}
                        required
                        disabled={savingSettings}
                      />
                      <p className="text-xs text-muted-foreground">Appears in the left section of the footer on the main Home Page.</p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="copyrightText">Copyright text</Label>
                      <Input
                        id="copyrightText"
                        value={footerSettings.copyrightText}
                        onChange={(e) => setFooterSettings({ ...footerSettings, copyrightText: e.target.value })}
                        required
                        disabled={savingSettings}
                        placeholder="© 2026 Aruba Royalty Stamp. All rights reserved.Made with Love in Aruba."
                      />
                      <p className="text-xs text-muted-foreground">The full copyright text line displayed at the very bottom of the Home Page.</p>
                    </div>

                    <h3 className="font-heading font-semibold text-lg border-b pb-2 text-foreground mt-8">Legal Pages</h3>
                    <div className="space-y-4">
                      {pages.map(page => (
                        <div key={page.slug} className="flex items-center justify-between p-4 border rounded-lg bg-card">
                          <div>
                            <p className="font-semibold">{page.title}</p>
                            <p className="text-xs text-muted-foreground">/{page.slug}</p>
                          </div>
                          <Button type="button" variant="outline" size="sm" onClick={() => setEditingPage(page)}>
                            Edit Page
                          </Button>
                        </div>
                      ))}
                      {pages.length === 0 && (
                        <p className="text-sm text-muted-foreground">No pages found. The database rows might still be initializing.</p>
                      )}
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-end gap-2">
                  <Button type="submit" disabled={savingSettings} className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90">
                    {savingSettings ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" /> Saving...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4" /> Save Footer Settings
                      </>
                    )}
                  </Button>
                </CardFooter>
              </form>
            </Card>
          </TabsContent>

          <TabsContent value="security">
            <Card className="border-border shadow-sm max-w-3xl">
              <CardHeader className="bg-muted/10 border-b">
                <CardTitle className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-primary" />
                  Super Admin Account Security
                </CardTitle>
                <CardDescription>Add an extra layer of protection to your Super Admin account. Highly recommended.</CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 border rounded-lg">
                  <div>
                    <h3 className="font-semibold flex items-center gap-2 text-lg">
                      Two-Factor Authentication (2FA)
                      {mfaFactors.length > 0 ? (
                        <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold bg-emerald-50 text-emerald-600 border-emerald-200">
                          🟢 2FA Enabled
                        </span>
                      ) : pendingFactorId ? (
                        <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold bg-amber-50 text-amber-600 border-amber-200">
                          🟡 Setup Pending
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold bg-muted text-muted-foreground">
                          ⚪ 2FA Disabled
                        </span>
                      )}
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1 max-w-md">
                      Protect your admin account with TOTP authenticator apps.
                    </p>
                  </div>
                  <div>
                    {mfaFactors.length > 0 ? (
                      <Button variant="destructive" onClick={() => handleDisableMfa(mfaFactors[0].id)} disabled={mfaLoading}>
                        {mfaLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null} Disable 2FA
                      </Button>
                    ) : pendingFactorId && !isEnrollingMfa ? (
                      <Button variant="outline" onClick={() => handleCancelPendingSetup()} disabled={mfaLoading}>
                        {mfaLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null} Cancel Pending Setup
                      </Button>
                    ) : !isEnrollingMfa ? (
                      <Button onClick={handleEnableMfa} disabled={mfaLoading}>
                        {mfaLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null} Enable 2FA
                      </Button>
                    ) : null}
                  </div>
                </div>

                {isEnrollingMfa && (
                  <div className="mt-6 p-6 border rounded-lg bg-muted/20 animate-in fade-in slide-in-from-top-4">
                    <h4 className="font-heading font-bold text-lg mb-4">Complete 2FA Setup</h4>
                    <div className="grid md:grid-cols-2 gap-8">
                      <div className="space-y-4">
                        <div className="flex items-start gap-3">
                          <div className="bg-primary text-white w-6 h-6 rounded-full flex items-center justify-center font-bold text-sm shrink-0 mt-0.5">1</div>
                          <p className="text-sm text-muted-foreground">Open your authenticator app and scan this QR code.</p>
                        </div>
                        <div className="bg-white p-4 border rounded-xl inline-block shadow-sm">
                          <img src={mfaQrCode} alt="2FA QR Code" className="w-40 h-40" />
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground font-medium">Or enter this setup key manually:</p>
                          <code className="text-xs bg-muted px-2 py-1 rounded block w-max break-all select-all font-mono font-semibold">
                            {mfaSecret}
                          </code>
                        </div>
                      </div>
                      <div className="space-y-4">
                        <div className="flex items-start gap-3">
                          <div className="bg-primary text-white w-6 h-6 rounded-full flex items-center justify-center font-bold text-sm shrink-0 mt-0.5">2</div>
                          <p className="text-sm text-muted-foreground">Enter the 6-digit code generated by your app to verify and enable 2FA.</p>
                        </div>
                        <form onSubmit={handleVerifyMfaSetup} className="space-y-4 pt-2">
                          <div className="space-y-2">
                            <Label htmlFor="verificationCode">Verification Code</Label>
                            <Input 
                              id="verificationCode" type="text" inputMode="numeric" pattern="[0-9]*" maxLength={6} placeholder="000 000"
                              className="font-mono text-lg tracking-[0.25em] text-center"
                              value={mfaVerifyCode} onChange={(e) => setMfaVerifyCode(e.target.value)} required disabled={mfaLoading}
                            />
                          </div>
                          <div className="flex gap-2 pt-2">
                            <Button type="button" variant="outline" className="w-full" onClick={() => {
                              setIsEnrollingMfa(false);
                              if (mfaFactorId) handleCancelPendingSetup(mfaFactorId);
                            }} disabled={mfaLoading}>Cancel Setup</Button>
                            <Button type="submit" className="w-full" disabled={mfaVerifyCode.length < 6 || mfaLoading}>
                              {mfaLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Key className="h-4 w-4 mr-2" />} Verify & Enable
                            </Button>
                          </div>
                        </form>
                        <div className="bg-amber-500/10 border border-amber-500/20 p-3 rounded text-xs text-amber-700 mt-4 flex gap-2">
                          <ShieldAlert className="h-4 w-4 shrink-0" />
                          <p><strong>Backup Option:</strong> Please save the manual setup key in a secure password manager. It can be used to recover access if you lose your authenticator app.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Delete Confirmation Dialog */}
      {customerToDelete && (
        <Dialog open={!!customerToDelete} onOpenChange={(open) => !open && setCustomerToDelete(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-destructive flex items-center gap-2">
                <Trash2 className="h-5 w-5" /> Delete this customer?
              </DialogTitle>
              <DialogDescription className="space-y-3 pt-2">
                <p>
                  You are about to permanently delete the test customer <strong className="text-foreground">{customerToDelete.name}</strong> 
                  {customerToDelete.email ? ` (${customerToDelete.email})` : ""}.
                </p>
                <p className="text-xs font-semibold text-destructive uppercase tracking-wider bg-destructive/10 p-2.5 rounded border border-destructive/20">
                  ⚠️ This action is irreversible. All stamp logs, active loyalty cards, and rewards earned by this customer will be permanently deleted from the database.
                </p>
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="flex gap-2 justify-end pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCustomerToDelete(null)}
                disabled={deleting}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={handleDeleteCustomer}
                disabled={deleting}
                className="gap-2"
              >
                {deleting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4" /> Confirm Delete
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Business Delete Confirmation Dialog */}
      {businessToDelete && (
        <Dialog open={!!businessToDelete} onOpenChange={(open) => !open && setBusinessToDelete(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-destructive flex items-center gap-2">
                <Trash2 className="h-5 w-5" /> Delete this business?
              </DialogTitle>
              <DialogDescription className="space-y-3 pt-2">
                <p>
                  You are about to permanently delete the test business <strong className="text-foreground">{businessToDelete.business_name}</strong>.
                </p>
                <p className="text-xs font-semibold text-destructive uppercase tracking-wider bg-destructive/10 p-2.5 rounded border border-destructive/20">
                  ⚠️ This action is irreversible. All related staff accounts, programs, loyalty cards, rewards, QR codes, and stamp transactions will be permanently deleted from the database.
                </p>
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="flex gap-2 justify-end pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setBusinessToDelete(null)}
                disabled={deletingBusiness}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={handleDeleteBusiness}
                disabled={deletingBusiness}
                className="gap-2"
              >
                {deletingBusiness ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4" /> Confirm Delete
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Edit Page Dialog */}
      {editingPage && (
        <Dialog open={!!editingPage} onOpenChange={(open) => !open && setEditingPage(null)}>
          <DialogContent className="sm:max-w-3xl max-h-[90vh] flex flex-col">
            <DialogHeader>
              <DialogTitle>Edit {editingPage.title}</DialogTitle>
              <DialogDescription>Modify the content of the /{editingPage.slug} page. Basic HTML tags are supported (h2, p, strong, ul, li).</DialogDescription>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto py-4 space-y-4">
              <div className="space-y-2">
                <Label>Page Title</Label>
                <Input 
                  value={editingPage.title} 
                  onChange={(e) => setEditingPage({...editingPage, title: e.target.value})} 
                />
              </div>
              <div className="space-y-2">
                <Label>Page Content (HTML)</Label>
                <textarea 
                  className="w-full min-h-[400px] p-3 border rounded-md font-mono text-sm bg-background text-foreground"
                  value={editingPage.content || ""}
                  onChange={(e) => setEditingPage({...editingPage, content: e.target.value})}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditingPage(null)} disabled={savingPage}>Cancel</Button>
              <Button type="button" onClick={async () => {
                try {
                  setSavingPage(true);
                  const { error } = await supabase.from("website_pages").update({
                    title: editingPage.title,
                    content: editingPage.content,
                    updated_at: new Date().toISOString()
                  }).eq("slug", editingPage.slug);
                  if (error) throw error;
                  toast({ title: "Page saved", description: "The page content has been updated successfully." });
                  setEditingPage(null);
                  fetchAdminData();
                } catch(e: any) {
                  toast({ title: "Error saving page", description: e.message, variant: "destructive" });
                } finally {
                  setSavingPage(false);
                }
              }} disabled={savingPage}>
                {savingPage ? "Saving..." : "Save Page"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}