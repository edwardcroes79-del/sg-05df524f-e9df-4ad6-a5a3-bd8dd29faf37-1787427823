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
import { Loader2, Shield, Building2, Users, CreditCard, Power, Edit2, Save, Ban, CheckCircle, Clock, XCircle, Eye, LogOut, Trash2, Globe, ShieldCheck, ShieldAlert, Key, Mail, PlusCircle, Archive, Bell } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { buildMfaRedirect, getMfaRouteRequirement } from "@/lib/authSecurity";
import { LanguageSelector } from "@/components/LanguageSelector";
import { useI18n } from "@/contexts/I18nProvider";

function asMetadataObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

type SuperAdminNotification = {
  id: string;
  sourceType: string;
  sourceId: string;
  type: string;
  businessName: string;
  description: string;
  createdAt: string;
  status: "pending" | "approved" | "rejected" | "cancelled" | "resolved";
  destination: "payments" | "addons" | "merchants";
  relatedRecord: any;
};

function notificationKey(sourceType: string, sourceId: string) {
  return `${sourceType}:${sourceId}`;
}

function formatDateForInput(date: Date) {
  return date.toISOString().slice(0, 10);
}

function addCalendarMonths(dateValue: string, months: number) {
  const [year, month, day] = dateValue.split("-").map(Number);
  const targetMonthIndex = month - 1 + months;
  const targetYear = year + Math.floor(targetMonthIndex / 12);
  const normalizedMonthIndex = ((targetMonthIndex % 12) + 12) % 12;
  const lastDayOfTargetMonth = new Date(targetYear, normalizedMonthIndex + 1, 0).getDate();
  const clampedDay = Math.min(day, lastDayOfTargetMonth);
  return formatDateForInput(new Date(Date.UTC(targetYear, normalizedMonthIndex, clampedDay)));
}

function getEffectiveContractStatus(contractStatus?: string | null, contractEndDate?: string | null, renewalDate?: string | null) {
  if (!contractEndDate) return null;

  const today = formatDateForInput(new Date());
  if (contractEndDate < today) return "expired";
  if (renewalDate && renewalDate <= today) return "expiring";
  return contractStatus || "active";
}

function getContractStatusBadgeVariant(status?: string | null) {
  if (status === "expired") return "destructive";
  if (status === "expiring") return "secondary";
  return "default";
}

function formatContractDisplayDate(dateValue?: string | null, locale = "en-US", fallback = "unknown date") {
  if (!dateValue) return fallback;
  return new Date(`${dateValue}T00:00:00`).toLocaleDateString(locale, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getContractReminderTitle(reminderType: string) {
  if (reminderType === "expiration") return "Contract Expired";

  const days = reminderType.replace("_days", "").replace("_day", "");
  return `Contract Expiring in ${days} Day${days === "1" ? "" : "s"}`;
}

function getContractReminderDaysText(reminderType: string, t: ReturnType<typeof useI18n>["t"]) {
  if (reminderType === "expiration") return t("admin.contract.zeroDaysRemaining");
  if (reminderType === "1_day") return t("admin.contract.oneDayRemaining");
  return t("admin.contract.daysRemaining", { days: reminderType.replace("_days", "") });
}

function isQuickStampAddon(addon: any) {
  return addon?.id === "quick_stamp_qr" || addon?.slug === "quick-stamp-qr" || addon?.addon_type === "quick_stamp_qr";
}

function getAddonDisplayMetric(addon: any, quantity = 1, t: ReturnType<typeof useI18n>["t"]) {
  if (isQuickStampAddon(addon)) return t("admin.addons.quickStampMetric");
  return t("admin.addons.customerCapacityMetric", { count: (Number(addon?.capacity_amount || 0) * Number(quantity || 1)).toLocaleString() });
}

export default function AdminDashboard() {
  const router = useRouter();
  const { toast } = useToast();
  const { t, language } = useI18n();
  const locale = language === "es" ? "es-ES" : "en-US";
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [addons, setAddons] = useState<any[]>([]);
  const [businessAddonSubscriptions, setBusinessAddonSubscriptions] = useState<any[]>([]);
  const [contractReminders, setContractReminders] = useState<any[]>([]);
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
  const [notificationReads, setNotificationReads] = useState<Record<string, string>>({});
  const [notificationPanelOpen, setNotificationPanelOpen] = useState(false);
  const [activeAdminTab, setActiveAdminTab] = useState("merchants");

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      toast({
        title: t("admin.logout.title"),
        description: t("admin.logout.description"),
      });
      router.push("/");
    } catch (err: any) {
      toast({
        title: t("admin.logout.errorTitle"),
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
  const [assigningContractId, setAssigningContractId] = useState<string | null>(null);
  const [renewingContractId, setRenewingContractId] = useState<string | null>(null);
  const [contractDrafts, setContractDrafts] = useState<Record<string, { term: string; startDate: string }>>({});

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
  const [assigningPlanId, setAssigningPlanId] = useState<string | null>(null);
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
      toast({ title: t("admin.security.setupCanceled"), description: t("admin.security.setupCanceledDescription") });
      setPendingFactorId(null);
      setIsEnrollingMfa(false);
      await fetchMfaFactors();
    } catch (err: any) {
      toast({ title: t("admin.security.cancelFailed"), description: err.message, variant: "destructive" });
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
      toast({ title: t("admin.security.setupFailed"), description: err.message, variant: "destructive" });
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
      toast({ title: t("admin.security.enabledTitle"), description: t("admin.security.enabledDescription") });
      setIsEnrollingMfa(false);
      setMfaVerifyCode("");
      await fetchMfaFactors();
    } catch (err: any) {
      toast({ title: t("admin.security.verificationFailed"), description: err.message || t("admin.security.invalidCode"), variant: "destructive" });
    } finally {
      setMfaLoading(false);
    }
  };

  const handleDisableMfa = async (factorId: string) => {
    if (!window.confirm(t("admin.security.disableConfirm"))) return;
    setMfaLoading(true);
    try {
      const { error } = await supabase.auth.mfa.unenroll({ factorId });
      if (error) throw error;
      toast({ title: t("admin.security.disabledTitle"), description: t("admin.security.disabledDescription") });
      await fetchMfaFactors();
    } catch (err: any) {
      toast({ title: t("admin.security.disableFailed"), description: err.message, variant: "destructive" });
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
          throw new Error(plansResult.error || t("admin.api.failedLoadPlans"));
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
          throw new Error(addonsResult.error || t("admin.api.failedLoadAddons"));
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
          throw new Error(businessAddonsResult.error || t("admin.api.failedLoadBusinessAddons"));
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
          contract_term_months,
          contract_start_date,
          contract_end_date,
          contract_status,
          renewal_date,
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

      const { data: notificationReadsData } = await (supabase as any)
        .from("super_admin_notification_reads")
        .select("source_type, source_id, read_at");

      const readsMap = (notificationReadsData || []).reduce((acc: Record<string, string>, row: any) => {
        acc[notificationKey(row.source_type, row.source_id)] = row.read_at;
        return acc;
      }, {});
      setNotificationReads(readsMap);

      const { data: contractReminderData } = await (supabase as any)
        .from("contract_reminders")
        .select(`
          id,
          business_id,
          contract_end_date,
          reminder_type,
          recipient_type,
          status,
          sent_at,
          created_at,
          businesses (
            id,
            business_name,
            subscription_plan,
            contract_term_months,
            contract_end_date
          )
        `)
        .eq("recipient_type", "super_admin")
        .order("created_at", { ascending: false })
        .limit(50);

      setContractReminders(contractReminderData || []);

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

  const pendingBusinessRegistrations = businesses.filter((business) => business.status === "pending");

  const contractReminderNotifications = contractReminders
    .filter((reminder) => {
      const business = Array.isArray(reminder.businesses) ? reminder.businesses[0] : reminder.businesses;
      return business?.contract_end_date === reminder.contract_end_date;
    })
    .map((reminder) => {
      const business = Array.isArray(reminder.businesses) ? reminder.businesses[0] : reminder.businesses;
      const plan = plans.find((item) => item.id === business?.subscription_plan);
      const planName = plan?.name || business?.subscription_plan || t("admin.common.noPlanAssigned");
      const termText = business?.contract_term_months ? t("admin.contract.monthTerm", { months: business.contract_term_months }) : t("admin.contract.termUnassigned");
      const expirationDate = formatContractDisplayDate(reminder.contract_end_date, locale, t("admin.contract.unknownDate"));
      const isExpired = reminder.reminder_type === "expiration";

      return {
        id: notificationKey("contract_reminder", String(reminder.id)),
        sourceType: "contract_reminder",
        sourceId: String(reminder.id),
        type: reminder.reminder_type === "expiration"
          ? t("admin.contract.expired")
          : t("admin.contract.expiringIn", {
              days: reminder.reminder_type.replace("_days", "").replace("_day", ""),
              plural: reminder.reminder_type === "1_day" ? "" : "s",
            }),
        businessName: business?.business_name || t("admin.common.unknownBusiness"),
        description: isExpired
          ? t("admin.contract.expiredDescription", { planName, termText, expirationDate })
          : t("admin.contract.expiringDescription", {
              planName,
              termText,
              expirationDate,
              daysText: getContractReminderDaysText(reminder.reminder_type, t),
            }),
        createdAt: reminder.sent_at || reminder.created_at,
        status: "pending" as const,
        destination: "merchants" as const,
        relatedRecord: reminder,
      };
    });

  const superAdminNotifications: SuperAdminNotification[] = [
    ...contractReminderNotifications,
    ...businessAddonSubscriptions
      .filter((subscription) => subscription.status === "inactive" && subscription.payment_status === "pending")
      .map((subscription) => {
        const addon = Array.isArray(subscription.subscription_addons) ? subscription.subscription_addons[0] : subscription.subscription_addons;
        const business = Array.isArray(subscription.businesses) ? subscription.businesses[0] : subscription.businesses;
        const addedCapacity = Number(addon?.capacity_amount || 0) * Number(subscription.quantity || 1);

        return {
          id: notificationKey("business_addon_subscription", subscription.id),
          sourceType: "business_addon_subscription",
          sourceId: String(subscription.id),
          type: t("admin.notifications.addonRequest"),
          businessName: business?.business_name || t("admin.common.unknownBusiness"),
          description: isQuickStampAddon(addon)
            ? t("admin.notifications.quickStampRequested")
            : t("admin.notifications.customersRequested", { count: addedCapacity.toLocaleString() }),
          createdAt: subscription.created_at,
          status: "pending" as const,
          destination: "addons" as const,
          relatedRecord: subscription,
        };
      }),
    ...payments
      .filter((payment) => payment.metadata?.kind === "subscription_plan_change")
      .map((payment) => {
        const changeType = payment.metadata?.change_type === "downgrade" ? t("admin.notifications.downgradeRequest") : t("admin.notifications.upgradeRequest");
        const resolvedStatus = payment.status === "approved" ? "approved" : payment.status === "rejected" ? "rejected" : "pending";

        return {
          id: notificationKey("subscription_payment", payment.id),
          sourceType: "subscription_payment",
          sourceId: String(payment.id),
          type: changeType,
          businessName: payment.businesses?.business_name || payment.metadata?.business_name || t("admin.common.unknownBusiness"),
          description: t("admin.notifications.planChangeRequested", {
            currentPlan: payment.metadata?.current_plan_name || t("admin.common.currentPlan"),
            requestedPlan: payment.metadata?.requested_plan_name || payment.plan_id,
          }),
          createdAt: payment.created_at,
          status: resolvedStatus as SuperAdminNotification["status"],
          destination: "payments" as const,
          relatedRecord: payment,
        };
      }),
    ...pendingBusinessRegistrations.map((business) => ({
      id: notificationKey("business_registration", business.id),
      sourceType: "business_registration",
      sourceId: String(business.id),
      type: t("admin.notifications.businessRegistration"),
      businessName: business.business_name || t("admin.common.unknownBusiness"),
      description: t("admin.notifications.awaitingApproval"),
      createdAt: business.created_at,
      status: "pending" as const,
      destination: "merchants" as const,
      relatedRecord: business,
    })),
  ].sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

  const unreadNotificationCount = superAdminNotifications.filter((notification) =>
    notification.status === "pending" && !notificationReads[notification.id]
  ).length;

  const markNotificationsRead = async (notificationsToRead: SuperAdminNotification[]) => {
    if (notificationsToRead.length === 0) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const now = new Date().toISOString();
    const rows = notificationsToRead.map((notification) => ({
      admin_user_id: user.id,
      source_type: notification.sourceType,
      source_id: notification.sourceId,
      read_at: now,
    }));

    const { error } = await (supabase as any)
      .from("super_admin_notification_reads")
      .upsert(rows, { onConflict: "admin_user_id,source_type,source_id" });

    if (!error) {
      setNotificationReads((current) => {
        const next = { ...current };
        notificationsToRead.forEach((notification) => {
          next[notification.id] = now;
        });
        return next;
      });
    }
  };

  const handleToggleNotificationPanel = async () => {
    const nextOpen = !notificationPanelOpen;
    setNotificationPanelOpen(nextOpen);

    if (nextOpen) {
      await markNotificationsRead(superAdminNotifications.filter((notification) =>
        notification.status === "pending" && !notificationReads[notification.id]
      ));
    }
  };

  const handleReviewNotification = async (notification: SuperAdminNotification) => {
    await markNotificationsRead([notification]);
    setNotificationPanelOpen(false);
    setActiveAdminTab(notification.destination);

    if (notification.destination === "payments") {
      setReviewingPayment(notification.relatedRecord);
      setAdminNotes("");
    }

    if (notification.destination === "addons") {
      setReviewingAddonRequestId(null);
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
        title: t("admin.merchants.businessStatusUpdated", { status: nextStatus === "suspended" ? t("admin.merchants.suspend") : t("admin.merchants.activate") }),
        description: t("admin.merchants.statusSaved"),
      });

      await fetchAdminData();
    } catch (err: any) {
      toast({
        title: t("admin.merchants.statusUpdateFailed"),
        description: err.message,
        variant: "destructive",
      });
    }
  };

  const handleApproveBusiness = async (bizId: string) => {
    try {
      setApproving(bizId);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error(t("admin.common.notAuthenticated"));

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
        throw new Error(result.error || t("admin.merchants.approvalFailed"));
      }

      toast({
        title: t("admin.merchants.businessApproved"),
        description: result.emailSent 
          ? t("admin.merchants.approvalEmailSent")
          : t("admin.merchants.approvalEmailFailed"),
        variant: result.emailSent ? "default" : "destructive",
      });

      await fetchAdminData();
    } catch (err: any) {
      toast({
        title: t("admin.merchants.approvalFailed"),
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
      if (!session) throw new Error(t("admin.common.notAuthenticated"));

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
        throw new Error(result.error || t("admin.merchants.notificationFailed"));
      }

      toast({
        title: result.emailSent ? t("admin.merchants.emailResent") : t("admin.merchants.emailFailed"),
        description: result.emailSent 
          ? t("admin.merchants.emailResentDescription")
          : t("admin.merchants.emailFailedDescription", { error: result.error || t("admin.common.unknown") }),
        variant: result.emailSent ? "default" : "destructive",
      });

      await fetchAdminData();
    } catch (err: any) {
      toast({
        title: t("admin.merchants.retryFailed"),
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
        throw new Error(result.error || t("admin.merchants.notificationFailed"));
      }

      toast({
        title: result.emailSent ? t("admin.merchants.notificationResent") : t("admin.merchants.notificationFailed"),
        description: result.emailSent
          ? t("admin.merchants.notificationResentDescription")
          : t("admin.merchants.emailFailedDescription", { error: result.error || t("admin.common.unknown") }),
        variant: result.emailSent ? "default" : "destructive",
      });

      await fetchAdminData();
    } catch (err: any) {
      toast({
        title: t("admin.merchants.retryFailed"),
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
        title: t("admin.merchants.subscriptionUpdated"),
        description: t("admin.merchants.subscriptionUpdatedDescription", { planId: planId.toUpperCase() }),
      });

      await fetchAdminData();
    } catch (err: any) {
      toast({
        title: t("admin.merchants.planUpdateFailed"),
        description: err.message,
        variant: "destructive",
      });
    }
  };

  const handlePlanAssignment = async (bizId: string, planId: string) => {
    try {
      setAssigningPlanId(bizId);
      await handleChangePlan(bizId, planId);
    } finally {
      setAssigningPlanId(null);
    }
  };

  const handleAssignContract = async (bizId: string) => {
    const draft = contractDrafts[bizId];

    if (!draft?.term || !draft?.startDate) {
      toast({
        title: t("admin.contract.detailsRequired"),
        description: t("admin.contract.detailsRequiredDescription"),
        variant: "destructive",
      });
      return;
    }

    const termMonths = Number(draft.term);
    if (![6, 12].includes(termMonths)) {
      toast({
        title: t("admin.contract.invalidTerm"),
        description: t("admin.contract.invalidTermDescription"),
        variant: "destructive",
      });
      return;
    }

    const contractEndDate = addCalendarMonths(draft.startDate, termMonths);
    const renewalDate = addCalendarMonths(contractEndDate, -1);
    const contractStatus = getEffectiveContractStatus("active", contractEndDate, renewalDate) || "active";

    try {
      setAssigningContractId(bizId);

      const { error } = await (supabase as any)
        .from("businesses")
        .update({
          contract_term_months: termMonths,
          contract_start_date: draft.startDate,
          contract_end_date: contractEndDate,
          renewal_date: renewalDate,
          contract_status: contractStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("id", bizId);

      if (error) throw error;

      toast({
        title: t("admin.contract.assigned"),
        description: t("admin.contract.assignedDescription", {
          termMonths,
          endDate: new Date(`${contractEndDate}T00:00:00`).toLocaleDateString(locale),
        }),
      });

      setContractDrafts((current) => {
        const next = { ...current };
        delete next[bizId];
        return next;
      });
      await fetchAdminData();
    } catch (err: any) {
      toast({
        title: t("admin.contract.assignmentFailed"),
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setAssigningContractId(null);
    }
  };

  const handleRenewContract = async (biz: any, termMonths: 6 | 12) => {
    if (!biz?.id) return;

    const today = formatDateForInput(new Date());
    const previousEndDate = biz.contract_end_date || null;
    const renewFromExistingEnd = Boolean(previousEndDate && previousEndDate >= today);
    const baseDate = renewFromExistingEnd ? previousEndDate : today;
    const newEndDate = addCalendarMonths(baseDate, termMonths);
    const nextRenewalDate = addCalendarMonths(newEndDate, -1);
    const newStartDate = renewFromExistingEnd ? (biz.contract_start_date || today) : today;

    try {
      setRenewingContractId(`${biz.id}:${termMonths}`);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error(t("admin.common.notAuthenticated"));

      const { error: businessError } = await (supabase as any)
        .from("businesses")
        .update({
          contract_term_months: termMonths,
          contract_start_date: newStartDate,
          contract_end_date: newEndDate,
          renewal_date: nextRenewalDate,
          contract_status: "active",
          updated_at: new Date().toISOString(),
        })
        .eq("id", biz.id);

      if (businessError) throw businessError;

      const { error: auditError } = await (supabase as any)
        .from("audit_logs")
        .insert({
          admin_user_id: user.id,
          action: "contract_renewed",
          target_type: "business",
          target_id: biz.id,
          metadata: {
            business_name: biz.business_name,
            previous_end_date: previousEndDate,
            renewal_date: today,
            renewal_term_months: termMonths,
            renewal_base_date: baseDate,
            renewal_mode: renewFromExistingEnd ? "early_extension" : "post_expiration_restart",
            new_start_date: newStartDate,
            new_end_date: newEndDate,
            next_renewal_date: nextRenewalDate,
            preserved_business_status: biz.status,
            preserved_subscription_plan: biz.subscription_plan,
          },
        });

      if (auditError) throw auditError;

      toast({
        title: t("admin.contract.renewed"),
        description: t("admin.contract.renewedDescription", {
          businessName: biz.business_name,
          termMonths,
          endDate: new Date(`${newEndDate}T00:00:00`).toLocaleDateString(locale),
        }),
      });

      await fetchAdminData();
    } catch (err: any) {
      toast({
        title: t("admin.contract.renewalFailed"),
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setRenewingContractId(null);
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
    if (!session) throw new Error(t("admin.common.notAuthenticated"));

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
      throw new Error(result.error || t("admin.api.failedSavePlan"));
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
      if (!session) throw new Error(t("admin.common.notAuthenticated"));

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
        throw new Error(result.error || t("admin.api.failedUpdatePlanStatus"));
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
    if (!session) throw new Error(t("admin.common.notAuthenticated"));

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
      throw new Error(result.error || t("admin.api.failedSaveAddon"));
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
      if (!session) throw new Error(t("admin.common.notAuthenticated"));

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
        throw new Error(result.error || t("admin.api.failedUpdateAddonStatus"));
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
      if (!session) throw new Error(t("admin.common.notAuthenticated"));

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
        throw new Error(result.error || t("admin.api.failedAssignAddon"));
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
      if (!session) throw new Error(t("admin.common.notAuthenticated"));

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
        throw new Error(result.error || t("admin.api.failedCancelAddon"));
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
      if (!user) throw new Error(t("admin.common.notAuthenticated"));

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
      if (!user) throw new Error(t("admin.common.notAuthenticated"));

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
        title: t("admin.payments.proofRequired"),
        description: t("admin.payments.proofRequiredDescription"),
        variant: "destructive",
      });
      return;
    }

    try {
      setProcessing(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error(t("admin.common.notAuthenticated"));

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
          title: payment.metadata?.change_type === "downgrade" ? t("admin.payments.downgradeApproved") : t("admin.payments.planChangeApproved"),
          description: t("admin.payments.planChangeApprovedDescription", {
            businessName: payment.businesses.business_name,
            planName: payment.metadata?.requested_plan_name || payment.plan_id,
          }),
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
          title: t("admin.payments.subscriptionChangeApproved"),
          description: t("admin.payments.subscriptionChangeApprovedDescription", { businessName: payment.businesses.business_name }),
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
          title: payment.metadata?.change_type === "downgrade" ? t("admin.payments.downgradeApproved") : t("admin.payments.planChangeApproved"),
          description: t("admin.payments.planChangeApprovedDescription", {
            businessName: payment.businesses.business_name,
            planName: payment.metadata?.requested_plan_name || requestedPlanId,
          }),
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
          title: t("admin.payments.paymentApproved"),
          description: t("admin.payments.paymentApprovedDescription", {
            businessName: payment.businesses.business_name,
            planId: payment.plan_id.toUpperCase(),
          }),
        });
      }

      setReviewingPayment(null);
      setAdminNotes("");
      await fetchAdminData();
    } catch (err: any) {
      toast({
        title: t("admin.payments.approvalFailed"),
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
        title: t("admin.payments.notesRequired"),
        description: t("admin.payments.notesRequiredDescription"),
        variant: "destructive",
      });
      return;
    }

    try {
      setProcessing(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error(t("admin.common.notAuthenticated"));

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
          title: t("admin.payments.requestRejected"),
          description: t("admin.payments.requestRejectedDescription"),
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
        title: t("admin.payments.paymentRejected"),
        description: t("admin.payments.paymentRejectedDescription"),
      });

      setReviewingPayment(null);
      setAdminNotes("");
      await fetchAdminData();
    } catch (err: any) {
      toast({
        title: t("admin.payments.rejectionFailed"),
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
        title: t("admin.payments.couldNotOpenProof"),
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
      if (!session) throw new Error(t("admin.common.notAuthenticated"));

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
        throw new Error(result.error || t("admin.customers.deleteTitle"));
      }

      toast({
        title: t("admin.customers.deleted"),
        description: result.message || t("admin.customers.deletedDescription", { name: customerToDelete.name }),
      });

      setCustomerToDelete(null);
      await fetchAdminData();
    } catch (err: any) {
      toast({
        title: t("admin.delete.failed"),
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
      if (!session) throw new Error(t("admin.common.notAuthenticated"));

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
        throw new Error(result.error || t("admin.businessDelete.title"));
      }

      toast({
        title: t("admin.businessDelete.deleted"),
        description: t("admin.businessDelete.deletedDescription", { businessName: businessToDelete.business_name }),
      });

      setBusinessToDelete(null);
      await fetchAdminData();
    } catch (err: any) {
      toast({
        title: t("admin.delete.failed"),
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
        <title>{t("admin.seoTitle")}</title>
      </Head>

      <div className="min-h-screen bg-background p-6 md:p-12 space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-6">
          <div>
            <div className="flex items-center gap-2 text-primary font-semibold text-sm mb-1 uppercase tracking-wider">
              <Shield className="h-4 w-4" /> {t("admin.portal")}
            </div>
            <h1 className="text-4xl font-heading font-bold text-foreground">{t("admin.title")}</h1>
            <p className="text-muted-foreground mt-1">{t("admin.description")}</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="relative"
                onClick={handleToggleNotificationPanel}
                aria-label={t("admin.notifications.open")}
              >
                <Bell className="h-5 w-5" />
                {unreadNotificationCount > 0 && (
                  <span className="absolute -right-2 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-[10px] font-bold text-destructive-foreground">
                    {unreadNotificationCount}
                  </span>
                )}
              </Button>

              {notificationPanelOpen && (
                <div className="absolute right-0 top-12 z-50 w-[min(24rem,calc(100vw-2rem))] rounded-xl border bg-card p-3 shadow-2xl">
                  <div className="flex items-center justify-between border-b pb-2">
                    <div>
                      <p className="font-heading font-semibold text-foreground">{t("admin.notifications.title")}</p>
                      <p className="text-xs text-muted-foreground">{t("admin.notifications.unreadPending", { count: unreadNotificationCount, plural: unreadNotificationCount === 1 ? "" : "s" })}</p>
                    </div>
                    <Badge variant="secondary">{t("admin.notifications.count", { count: superAdminNotifications.length })}</Badge>
                  </div>
                  <div className="mt-3 max-h-96 space-y-2 overflow-y-auto pr-1">
                    {superAdminNotifications.length === 0 ? (
                      <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                        {t("admin.notifications.empty")}
                      </div>
                    ) : (
                      superAdminNotifications.slice(0, 12).map((notification) => {
                        const isUnread = notification.status === "pending" && !notificationReads[notification.id];
                        const statusIcon = notification.status === "pending" ? Clock : notification.status === "approved" ? CheckCircle : XCircle;
                        const StatusIcon = statusIcon;

                        return (
                          <div
                            key={notification.id}
                            className={`rounded-lg border p-3 ${isUnread ? "border-primary/40 bg-primary/5" : "bg-background"}`}
                          >
                            <div className="flex items-start gap-3">
                              <div className={`mt-0.5 rounded-full p-1.5 ${notification.status === "pending" ? "bg-amber-100 text-amber-700" : notification.status === "approved" ? "bg-emerald-100 text-emerald-700" : "bg-destructive/10 text-destructive"}`}>
                                <StatusIcon className="h-4 w-4" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <p className="text-sm font-semibold text-foreground">{notification.type}</p>
                                  {isUnread && <span className="h-2 w-2 rounded-full bg-destructive" aria-label={t("admin.notifications.unread")} />}
                                </div>
                                <p className="text-sm text-muted-foreground">
                                  <span className="font-medium text-foreground">{notification.businessName}</span> {notification.description}
                                </p>
                                <p className="mt-1 text-xs text-muted-foreground">{new Date(notification.createdAt).toLocaleString(locale)}</p>
                              </div>
                            </div>
                            <div className="mt-3 flex items-center justify-between gap-2">
                              <Badge variant={notification.status === "pending" ? "secondary" : notification.status === "approved" ? "default" : "destructive"} className="text-[10px] uppercase">
                                {notification.sourceType === "contract_reminder" ? t("admin.notifications.actionRequired") : notification.status === "pending" ? t("admin.notifications.pendingReview") : notification.status}
                              </Badge>
                              <Button
                                type="button"
                                size="sm"
                                variant={notification.status === "pending" ? "default" : "outline"}
                                onClick={() => handleReviewNotification(notification)}
                              >
                                {t("admin.notifications.review")}
                              </Button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>
            <Link href="/dashboard">
              <Button variant="outline">{t("admin.backToMerchant")}</Button>
            </Link>
            <Button variant="destructive" onClick={handleLogout} className="gap-2">
              <LogOut className="h-4 w-4" /> {t("common.signOut")}
            </Button>
            <LanguageSelector compact />
          </div>
        </div>

        {/* Global Statistics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{t("admin.stats.totalMerchants")}</CardTitle>
              <Building2 className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{globalStats.totalBusinesses}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{t("admin.stats.activeSubscriptions")}</CardTitle>
              <CheckCircle className="h-4 w-4 text-emerald-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{globalStats.activeSubscribers}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{t("admin.stats.totalCustomers")}</CardTitle>
              <Users className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{globalStats.totalCustomers}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{t("admin.stats.totalStampsIssued")}</CardTitle>
              <CreditCard className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{globalStats.totalStamps}</div>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeAdminTab} onValueChange={setActiveAdminTab} className="space-y-6">
          <TabsList className="bg-muted p-1 rounded-lg flex-wrap h-auto">
            <TabsTrigger value="merchants">{t("admin.tabs.merchants")}</TabsTrigger>
            <TabsTrigger value="payments">{t("admin.tabs.payments")}</TabsTrigger>
            <TabsTrigger value="plans">{t("admin.tabs.plans")}</TabsTrigger>
            <TabsTrigger value="addons">{t("admin.tabs.addons")}</TabsTrigger>
            <TabsTrigger value="customers">{t("admin.tabs.customers")}</TabsTrigger>
            <TabsTrigger value="payment_settings">{t("admin.tabs.paymentSettings")}</TabsTrigger>
            <TabsTrigger value="website">{t("admin.tabs.website")}</TabsTrigger>
            <TabsTrigger value="security">{t("admin.tabs.security")}</TabsTrigger>
          </TabsList>

          <TabsContent value="merchants">
            <Card>
              <CardHeader>
                <CardTitle>{t("admin.merchants.title")}</CardTitle>
                <CardDescription>
                  {t("admin.merchants.description")}
                  <div className="flex gap-4 mt-3 font-medium text-sm">
                    <span className="text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-md border border-indigo-100 flex items-center gap-2">
                      <Clock className="h-4 w-4" /> {t("admin.merchants.activeTrials")} {globalStats.activeTrials}
                    </span>
                    <span className="text-destructive bg-destructive/10 px-2.5 py-1 rounded-md border border-destructive/20 flex items-center gap-2">
                      <Ban className="h-4 w-4" /> {t("admin.merchants.expiredTrials")} {globalStats.expiredTrials}
                    </span>
                  </div>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("admin.merchants.businessName")}</TableHead>
                      <TableHead>{t("admin.merchants.created")}</TableHead>
                      <TableHead>{t("admin.merchants.status")}</TableHead>
                      <TableHead>{t("admin.merchants.plan")}</TableHead>
                      <TableHead>{t("admin.merchants.contractTerm")}</TableHead>
                      <TableHead>{t("admin.merchants.contractDates")}</TableHead>
                      <TableHead>{t("admin.merchants.contractStatus")}</TableHead>
                      <TableHead>{t("admin.merchants.planPrice")}</TableHead>
                      <TableHead>{t("admin.merchants.activeAddons")}</TableHead>
                      <TableHead>{t("admin.merchants.addonTotal")}</TableHead>
                      <TableHead>{t("admin.merchants.totalSubscription")}</TableHead>
                      <TableHead className="text-right">{t("admin.merchants.actions")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {businesses.map((biz) => {
  const bizPlan = plans.find((p) => p.id === biz.subscription_plan);
  const planPrice = Number(bizPlan?.price_awg || 0);
  const emailLogs = Array.isArray(biz.email_logs) ? biz.email_logs : [];
  const approvalEmailLog = emailLogs.find((log: any) => log.email_type === "client_approval");
  const approvalEmailStatus = approvalEmailLog?.status || biz.approval_email_status || (biz.status === "pending" ? "pending" : "pending");
  const approvalEmailError = approvalEmailLog?.error_message || biz.approval_email_error;
  const contractDraft = contractDrafts[biz.id] || { term: "", startDate: "" };
  const effectiveContractStatus = getEffectiveContractStatus(biz.contract_status, biz.contract_end_date, biz.renewal_date);

  const activeAddonSubs = businessAddonSubscriptions.filter(
    (sub) => sub.business_id === biz.id && sub.status === "active" && sub.payment_status === "approved"
  );

  const addonTotal = activeAddonSubs.reduce((total, sub) => {
    const addon = Array.isArray(sub.subscription_addons) ? sub.subscription_addons[0] : sub.subscription_addons;
    return total + (Number(addon?.monthly_price_awg || 0) * Number(sub.quantity || 1));
  }, 0);

  const totalSubscription = planPrice + addonTotal;

  return (
  <TableRow key={biz.id}>
    <TableCell className="font-semibold">{biz.business_name}</TableCell>
    <TableCell>{new Date(biz.created_at).toLocaleDateString()}</TableCell>
    <TableCell>
      <Badge 
        variant={biz.status === "active" ? "default" : biz.status === "pending" ? "secondary" : "destructive"}
      >
        {biz.status.toUpperCase()}
      </Badge>
      <div className="mt-2 flex flex-col gap-1">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          {t("admin.merchants.approvalEmail")}
        </span>
        <Badge
          variant={approvalEmailStatus === "sent" ? "default" : approvalEmailStatus === "failed" ? "destructive" : "secondary"}
          className="w-fit text-[10px] uppercase"
          title={approvalEmailError || undefined}
        >
          {approvalEmailStatus || "pending"}
        </Badge>
      </div>
    </TableCell>
    <TableCell>
      <div className="space-y-2">
        <select
          className="h-9 w-full min-w-[150px] rounded-md border border-input bg-background px-3 py-1 text-xs font-medium text-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
          value={biz.subscription_plan || ""}
          onChange={(event) => handlePlanAssignment(biz.id, event.target.value)}
          disabled={assigningPlanId === biz.id}
          aria-label={`Assign subscription plan for ${biz.business_name}`}
        >
          <option value="" disabled>
            {t("admin.merchants.selectPlan")}
          </option>
          {plans
            .filter((plan) => (plan.status || (plan.is_active ? "active" : "inactive")) === "active" || plan.id === biz.subscription_plan)
            .map((plan) => (
              <option key={plan.id} value={plan.id}>
                {plan.name}
              </option>
            ))}
        </select>
        {assigningPlanId === biz.id && (
          <div className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" />
            {t("admin.merchants.updatingPlan")}
          </div>
        )}
        <div className="uppercase font-mono font-bold text-xs">{biz.subscription_plan || t("admin.common.none")}</div>
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
      </div>
    </TableCell>
    <TableCell>
      <div className="space-y-2 min-w-[150px]">
        <select
          className="h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-xs font-medium text-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
          value={contractDraft.term}
          onChange={(event) => setContractDrafts((current) => ({
            ...current,
            [biz.id]: { ...contractDraft, term: event.target.value },
          }))}
          disabled={assigningContractId === biz.id}
          aria-label={`Assign contract term for ${biz.business_name}`}
        >
          <option value="">Assign term</option>
          <option value="6">{t("admin.contract.months6")}</option>
          <option value="12">{t("admin.contract.months12")}</option>
        </select>
        <Input
          type="date"
          className="h-9 text-xs"
          value={contractDraft.startDate}
          onChange={(event) => setContractDrafts((current) => ({
            ...current,
            [biz.id]: { ...contractDraft, startDate: event.target.value },
          }))}
          disabled={assigningContractId === biz.id}
          aria-label={`Contract start date for ${biz.business_name}`}
        />
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8 w-full gap-1 text-xs"
          onClick={() => handleAssignContract(biz.id)}
          disabled={assigningContractId === biz.id || !contractDraft.term || !contractDraft.startDate}
        >
          {assigningContractId === biz.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
          {t("admin.contract.saveContract")}
        </Button>
        {biz.contract_end_date && (
          <div className="grid grid-cols-2 gap-1">
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8 gap-1 text-[11px]"
              onClick={() => handleRenewContract(biz, 6)}
              disabled={renewingContractId === `${biz.id}:6` || renewingContractId === `${biz.id}:12`}
            >
              {renewingContractId === `${biz.id}:6` ? <Loader2 className="h-3 w-3 animate-spin" /> : <Clock className="h-3 w-3" />}
              {t("admin.contract.renew6")}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8 gap-1 text-[11px]"
              onClick={() => handleRenewContract(biz, 12)}
              disabled={renewingContractId === `${biz.id}:6` || renewingContractId === `${biz.id}:12`}
            >
              {renewingContractId === `${biz.id}:12` ? <Loader2 className="h-3 w-3 animate-spin" /> : <Clock className="h-3 w-3" />}
              {t("admin.contract.renew12")}
            </Button>
          </div>
        )}
        <div className="text-[11px] text-muted-foreground">
          {t("admin.contract.current")} {biz.contract_term_months ? t("dashboard.contract.months", { months: biz.contract_term_months }) : t("admin.common.unassigned")}
        </div>
      </div>
    </TableCell>
    <TableCell>
      {biz.contract_start_date && biz.contract_end_date ? (
        <div className="space-y-1 text-xs">
          <div><span className="text-muted-foreground">{t("admin.contract.start")}</span> {new Date(`${biz.contract_start_date}T00:00:00`).toLocaleDateString(locale)}</div>
          <div><span className="text-muted-foreground">{t("admin.contract.end")}</span> {new Date(`${biz.contract_end_date}T00:00:00`).toLocaleDateString(locale)}</div>
          <div><span className="text-muted-foreground">{t("admin.contract.renewal")}</span> {biz.renewal_date ? new Date(`${biz.renewal_date}T00:00:00`).toLocaleDateString(locale) : t("admin.common.notSet")}</div>
        </div>
      ) : (
        <span className="text-xs text-muted-foreground italic">{t("admin.contract.noContractAssigned")}</span>
      )}
    </TableCell>
    <TableCell>
      {effectiveContractStatus ? (
        <Badge variant={getContractStatusBadgeVariant(effectiveContractStatus)} className="text-[10px] uppercase">
          {effectiveContractStatus}
        </Badge>
      ) : (
        <Badge variant="outline" className="text-[10px] uppercase">
          {t("admin.common.unassigned")}
        </Badge>
      )}
    </TableCell>
    <TableCell className="font-semibold text-foreground">
      {bizPlan ? `AWG ${planPrice.toFixed(2)}` : "-"}
    </TableCell>
    <TableCell>
      {activeAddonSubs.length > 0 ? (
        <div className="flex flex-col gap-1">
          {activeAddonSubs.map(sub => {
            const addon = Array.isArray(sub.subscription_addons) ? sub.subscription_addons[0] : sub.subscription_addons;
            const addedCapacity = Number(addon?.capacity_amount || 0) * Number(sub.quantity || 1);
            return (
              <span key={sub.id} className="text-xs text-muted-foreground whitespace-nowrap">
                {sub.cancel_at_period_end && (
                  <span title={t("admin.merchants.cancelsAtPeriodEnd")}>
                    <Clock className="inline w-3 h-3 text-amber-500 mr-1" aria-hidden="true" />
                  </span>
                )}
                {isQuickStampAddon(addon)
                  ? t("admin.addons.quickStampMetric")
                  : t("admin.merchants.customerAddon", { count: addedCapacity.toLocaleString() })}
              </span>
            );
          })}
        </div>
      ) : (
        <span className="text-xs text-muted-foreground italic">{t("admin.common.none")}</span>
      )}
    </TableCell>
    <TableCell className="text-foreground">
      {activeAddonSubs.length > 0 ? `AWG ${addonTotal.toFixed(2)}` : "-"}
    </TableCell>
    <TableCell className="font-bold text-primary whitespace-nowrap">
      {t("admin.merchants.totalPerMonth", { amount: totalSubscription.toFixed(2) })}
    </TableCell>
    <TableCell className="text-right flex items-center justify-end gap-2">
      {biz.status === "pending" ? (
        <Button
          variant="default"
          size="sm"
          className="gap-1 text-xs"
          onClick={() => handleApproveBusiness(biz.id)}
          disabled={approving === biz.id}
        >
          {approving === biz.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle className="h-3.5 w-3.5" />}
          {t("admin.merchants.approve")}
        </Button>
      ) : (
        <Button
          variant="outline"
          size="sm"
          className="gap-1 text-xs"
          onClick={() => {
            handleToggleBusinessStatus(biz.id, biz.status);
          }}
        >
          {biz.status === "active" ? <Ban className="h-3.5 w-3.5 text-amber-500" /> : <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />}
          {biz.status === "active" ? t("admin.merchants.suspend") : t("admin.merchants.activate")}
        </Button>
      )}
      {biz.status !== "pending" && approvalEmailStatus !== "sent" && (
        <Button
          variant="outline"
          size="sm"
          className="gap-1 text-xs"
          onClick={() => handleRetryEmail(biz.id)}
          disabled={retryingEmail === biz.id}
        >
          {retryingEmail === biz.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Mail className="h-3.5 w-3.5" />}
          {t("admin.merchants.resendApprovalEmail")}
        </Button>
      )}
      <Button
        variant="destructive"
        size="sm"
        className="gap-1 text-xs"
        onClick={() => setBusinessToDelete(biz)}
      >
        <Trash2 className="h-3.5 w-3.5" /> {t("admin.common.delete")}
      </Button>
    </TableCell>
  </TableRow>
  );
})}
{businesses.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={12} className="text-center py-6 text-muted-foreground">
                          {t("admin.merchants.noMerchants")}
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
                <CardTitle>{t("admin.payments.title")}</CardTitle>
                <CardDescription>{t("admin.payments.description")}</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("admin.payments.business")}</TableHead>
                      <TableHead>{t("admin.payments.planAddon")}</TableHead>
                      <TableHead>{t("admin.payments.amount")}</TableHead>
                      <TableHead>{t("admin.payments.reference")}</TableHead>
                      <TableHead>{t("admin.payments.submitted")}</TableHead>
                      <TableHead>{t("admin.payments.status")}</TableHead>
                      <TableHead className="text-right">{t("admin.payments.actions")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell className="font-semibold">{payment.businesses?.business_name || t("admin.common.unknown")}</TableCell>
                        <TableCell className="uppercase font-mono text-xs">
                          {payment.metadata?.kind === "subscription_plan_change"
                            ? payment.metadata?.notification_title || t("admin.payments.subscriptionPlanChange")
                            : payment.metadata?.kind === "subscription_change"
                            ? t("admin.payments.subscriptionChange")
                            : payment.metadata?.kind === "addon_purchase"
                            ? payment.metadata?.addon_name || t("admin.payments.customerCapacityAddon")
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
                              <Eye className="h-4 w-4 mr-1" /> {t("admin.common.review")}
                            </Button>
                          )}
                          {payment.status !== "pending" && (
                            <span className="text-xs text-muted-foreground">
                              {t("admin.common.reviewed")} {new Date(payment.reviewed_at).toLocaleDateString(locale)}
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                    {payments.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-6 text-muted-foreground">
                          {t("admin.payments.noPayments")}
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
                  <CardTitle>{t("admin.payments.reviewTitle", {
                    type: reviewingPayment.metadata?.kind === "subscription_plan_change" ? t("admin.payments.subscriptionPlanChange") : t("admin.payments.payment"),
                    businessName: reviewingPayment.businesses?.business_name || t("admin.common.unknown"),
                  })}</CardTitle>
                  <CardDescription>
                    {reviewingPayment.metadata?.kind === "subscription_plan_change"
                      ? t("admin.payments.reviewPlanChange")
                      : t("admin.payments.reviewPaymentProof")}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <p className="text-sm text-muted-foreground">{t("admin.payments.business")}</p>
                        <p className="font-semibold">{reviewingPayment.businesses?.business_name}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">{t("admin.payments.subscriptionChangeLabel")}</p>
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
                              {reviewingPayment.metadata?.change_type === "downgrade" ? t("admin.notifications.downgradeRequest") : t("admin.notifications.upgradeRequest")}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {t("admin.payments.submitted")} {reviewingPayment.metadata?.requested_at ? new Date(reviewingPayment.metadata.requested_at).toLocaleString(locale) : new Date(reviewingPayment.created_at).toLocaleString(locale)}
                            </span>
                          </div>
                          <div className="grid gap-3 text-sm sm:grid-cols-2">
                            <div>
                              <p className="text-muted-foreground">{t("admin.payments.currentPlan")}</p>
                              <p className="font-semibold">{reviewingPayment.metadata?.current_plan_name}</p>
                              <p className="text-xs text-muted-foreground">AWG {Number(reviewingPayment.metadata?.current_plan_price_awg || 0).toFixed(2)}/month</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">{t("admin.payments.requestedPlan")}</p>
                              <p className="font-semibold">{reviewingPayment.metadata?.requested_plan_name}</p>
                              <p className="text-xs text-primary font-semibold">AWG {Number(reviewingPayment.metadata?.requested_plan_price_awg || reviewingPayment.amount || 0).toFixed(2)}/month</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">{t("admin.payments.currentEntitlements")}</p>
                              <p className="font-semibold">{Number(reviewingPayment.metadata?.current_entitlements?.max_loyalty_programs || 0).toLocaleString()} {t("admin.payments.loyaltyPrograms")}</p>
                              <p className="text-xs text-muted-foreground">{Number(reviewingPayment.metadata?.current_entitlements?.max_customers || 0).toLocaleString()} {t("admin.payments.loyaltyMembers")} · {Number(reviewingPayment.metadata?.current_entitlements?.max_staff || 0).toLocaleString()} {t("admin.payments.staff")}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">{t("admin.payments.requestedEntitlements")}</p>
                              <p className="font-semibold">{Number(reviewingPayment.metadata?.requested_entitlements?.max_loyalty_programs || 0).toLocaleString()} {t("admin.payments.loyaltyPrograms")}</p>
                              <p className="text-xs text-muted-foreground">{Number(reviewingPayment.metadata?.requested_entitlements?.max_customers || 0).toLocaleString()} {t("admin.payments.loyaltyMembers")} · {Number(reviewingPayment.metadata?.requested_entitlements?.max_staff || 0).toLocaleString()} {t("admin.payments.staff")}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">{t("admin.payments.currentMemberCount")}</p>
                              <p className="font-semibold">{Number(reviewingPayment.metadata?.current_member_count || 0).toLocaleString()}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">{t("admin.payments.currentStaffCount")}</p>
                              <p className="font-semibold">{Number(reviewingPayment.metadata?.current_staff_count || 0).toLocaleString()}</p>
                            </div>
                          </div>
                          <p className="text-xs text-muted-foreground border-t pt-2">
                            {t("admin.payments.dataPreserved")}
                          </p>
                        </div>
                      )}
                      <div>
                        <p className="text-sm text-muted-foreground">{t("admin.payments.amount")}</p>
                        <p className="font-bold text-xl">AWG {reviewingPayment.amount.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">{t("admin.payments.reference")}</p>
                        <p className="font-mono font-semibold">{reviewingPayment.payment_reference}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">{t("admin.payments.submitted")}</p>
                        <p className="font-semibold">{new Date(reviewingPayment.created_at).toLocaleString()}</p>
                      </div>
                    </div>

                    <div>
                      {reviewingPayment.metadata?.kind === "subscription_plan_change" ? (
                        <div className="rounded-lg border bg-muted/20 p-6 text-center space-y-2">
                          <Clock className="h-8 w-8 text-primary mx-auto" />
                          <p className="font-semibold text-foreground">{reviewingPayment.metadata?.notification_title || t("admin.payments.subscriptionPlanChange")}</p>
                          <p className="text-sm text-muted-foreground">{t("admin.payments.noProofRequiredPlan")}</p>
                        </div>
                      ) : reviewingPayment.metadata?.kind === "subscription_change" && reviewingPayment.metadata?.change_type === "addon_purchase" ? (
                        <div className="rounded-lg border bg-muted/20 p-6 text-center space-y-2">
                          <CheckCircle className="h-8 w-8 text-primary mx-auto" />
                          <p className="font-semibold text-foreground">{t("admin.payments.customerCapacityAddon")}</p>
                          <p className="text-sm text-muted-foreground">{t("admin.payments.noProofRequiredAddon")}</p>
                        </div>
                      ) : (
                        <>
                          <p className="text-sm text-muted-foreground mb-2">{t("admin.payments.paymentProof")}</p>
                          {reviewingPayment.payment_proof_url ? (
                            <div className="border rounded-lg p-6 text-center space-y-3">
                              <CheckCircle className="h-8 w-8 text-emerald-500 mx-auto" />
                              <div>
                                <p className="font-semibold text-foreground">{t("admin.payments.proofUploaded")}</p>
                                <p className="text-xs text-muted-foreground break-all">
                                  {reviewingPayment.payment_proof_url.startsWith("http")
                                    ? t("admin.payments.legacyProofUrl")
                                    : reviewingPayment.payment_proof_url}
                                </p>
                              </div>
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => handleOpenAdminPaymentProof(reviewingPayment)}
                              >
                                {t("admin.payments.viewProof")}
                              </Button>
                            </div>
                          ) : (
                            <div className="border rounded-lg p-8 text-center text-muted-foreground">
                              {t("admin.payments.noProofUploaded")}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="adminNotes">{t("admin.payments.adminNotes")}</Label>
                    <textarea
                      id="adminNotes"
                      className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      placeholder={t("admin.payments.adminNotesPlaceholder")}
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
                    {t("admin.common.cancel")}
                  </Button>
                  <Button 
                    variant="destructive"
                    onClick={() => handleRejectPayment(reviewingPayment)}
                    disabled={processing || !adminNotes.trim() || (reviewingPayment.provider === "bank_transfer" && !reviewingPayment.payment_proof_url && !(reviewingPayment.metadata?.kind === "subscription_change" && reviewingPayment.metadata?.change_type === "addon_purchase") && reviewingPayment.metadata?.kind !== "addon_purchase" && reviewingPayment.metadata?.kind !== "subscription_plan_change")}
                  >
                    {processing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <XCircle className="h-4 w-4 mr-2" />}
                    {reviewingPayment.metadata?.kind === "subscription_plan_change" ? t("admin.payments.rejectRequest") : t("admin.payments.rejectPayment")}
                  </Button>
                  <Button 
                    onClick={() => handleApprovePayment(reviewingPayment)}
                    disabled={processing || !adminNotes.trim() || (reviewingPayment.provider === "bank_transfer" && !reviewingPayment.payment_proof_url && !(reviewingPayment.metadata?.kind === "subscription_change" && reviewingPayment.metadata?.change_type === "addon_purchase") && reviewingPayment.metadata?.kind !== "addon_purchase" && reviewingPayment.metadata?.kind !== "subscription_plan_change")}
                  >
                    {processing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                    {reviewingPayment.metadata?.kind === "subscription_plan_change"
                      ? reviewingPayment.metadata?.change_type === "downgrade" ? t("admin.payments.approveDowngrade") : t("admin.payments.approvePlanChange")
                      : t("admin.payments.approveActivate")}
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
                              {isQuickStampAddon(addon)
                                ? "Quick Stamp QR feature access"
                                : `+${Number(addon.capacity_amount || 0).toLocaleString()} customers`}
                              {" · "}AWG {Number(addon.monthly_price_awg || 0).toFixed(2)}/month
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
                            <option value="quick_stamp_qr">Quick Stamp QR</option>
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
                  <CardTitle>Business Add-ons</CardTitle>
                  <CardDescription>
                    Assign purchased add-ons to businesses. Active approved customer-capacity add-ons increase effective customer capacity server-side; Quick Stamp QR unlocks the rotating token page when active.
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
                      <Label htmlFor="businessAddonAddon">Add-on</Label>
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
                                {addon?.name || subscription.addon_id} × {subscription.quantity} = {getAddonDisplayMetric(addon, subscription.quantity, t)}
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
                <CardTitle>{t("admin.customers.title")}</CardTitle>
                <CardDescription>{t("admin.customers.description")}</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("admin.customers.name")}</TableHead>
                      <TableHead>{t("admin.customers.email")}</TableHead>
                      <TableHead>{t("admin.customers.phone")}</TableHead>
                      <TableHead>{t("admin.customers.registeredAt")}</TableHead>
                      <TableHead className="text-right">{t("admin.merchants.actions")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {customers.map((cust) => (
                      <TableRow key={cust.id}>
                        <TableCell className="font-semibold">{cust.name}</TableCell>
                        <TableCell className="font-mono text-xs">{cust.email || t("admin.customers.noEmail")}</TableCell>
                        <TableCell className="text-xs">{cust.phone || t("admin.customers.noPhone")}</TableCell>
                        <TableCell className="text-xs">{new Date(cust.created_at).toLocaleDateString()}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => setCustomerToDelete(cust)}
                            className="gap-1 text-xs"
                          >
                            <Trash2 className="h-3.5 w-3.5" /> {t("admin.customers.deleteUser")}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {customers.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                          {t("admin.customers.noCustomers")}
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
                  {t("admin.security.title")}
                </CardTitle>
                <CardDescription>{t("admin.security.description")}</CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 border rounded-lg">
                  <div>
                    <h3 className="font-semibold flex items-center gap-2 text-lg">
                      {t("admin.security.mfaTitle")}
                      {mfaFactors.length > 0 ? (
                        <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold bg-emerald-50 text-emerald-600 border-emerald-200">
                          {t("admin.security.enabled")}
                        </span>
                      ) : pendingFactorId ? (
                        <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold bg-amber-50 text-amber-600 border-amber-200">
                          {t("admin.security.pending")}
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold bg-muted text-muted-foreground">
                          {t("admin.security.disabled")}
                        </span>
                      )}
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1 max-w-md">{t("admin.security.mfaDescription")}</p>
                  </div>
                  <div>
                    {mfaFactors.length > 0 ? (
                      <Button variant="destructive" onClick={() => handleDisableMfa(mfaFactors[0].id)} disabled={mfaLoading}>
                        {mfaLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null} {t("admin.security.disable2fa")}
                      </Button>
                    ) : pendingFactorId && !isEnrollingMfa ? (
                      <Button variant="outline" onClick={() => handleCancelPendingSetup()} disabled={mfaLoading}>
                        {mfaLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null} {t("admin.security.cancelPending")}
                      </Button>
                    ) : !isEnrollingMfa ? (
                      <Button onClick={handleEnableMfa} disabled={mfaLoading}>
                        {mfaLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null} {t("admin.security.enable2fa")}
                      </Button>
                    ) : null}
                  </div>
                </div>

                {isEnrollingMfa && (
                  <div className="mt-6 p-6 border rounded-lg bg-muted/20 animate-in fade-in slide-in-from-top-4">
                    <h4 className="font-heading font-bold text-lg mb-4">{t("admin.security.completeSetup")}</h4>
                    <div className="grid md:grid-cols-2 gap-8">
                      <div className="space-y-4">
                        <div className="flex items-start gap-3">
                          <div className="bg-primary text-white w-6 h-6 rounded-full flex items-center justify-center font-bold text-sm shrink-0 mt-0.5">1</div>
                          <p className="text-sm text-muted-foreground">{t("admin.security.scanQr")}</p>
                        </div>
                        <div className="bg-white p-4 border rounded-xl inline-block shadow-sm">
                          <img src={mfaQrCode} alt={t("admin.security.qrAlt")} className="w-40 h-40" />
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground font-medium">{t("admin.security.manualKey")}</p>
                          <code className="text-xs bg-muted px-2 py-1 rounded block w-max break-all select-all font-mono font-semibold">
                            {mfaSecret}
                          </code>
                        </div>
                      </div>
                      <div className="space-y-4">
                        <div className="flex items-start gap-3">
                          <div className="bg-primary text-white w-6 h-6 rounded-full flex items-center justify-center font-bold text-sm shrink-0 mt-0.5">2</div>
                          <p className="text-sm text-muted-foreground">{t("admin.security.enterCode")}</p>
                        </div>
                        <form onSubmit={handleVerifyMfaSetup} className="space-y-4 pt-2">
                          <div className="space-y-2">
                            <Label htmlFor="verificationCode">{t("admin.security.verificationCode")}</Label>
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
                            }} disabled={mfaLoading}>{t("admin.security.cancelSetup")}</Button>
                            <Button type="submit" className="w-full" disabled={mfaVerifyCode.length < 6 || mfaLoading}>
                              {mfaLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Key className="h-4 w-4 mr-2" />} {t("admin.security.verifyEnable")}
                            </Button>
                          </div>
                        </form>
                        <div className="bg-amber-500/10 border border-amber-500/20 p-3 rounded text-xs text-amber-700 mt-4 flex gap-2">
                          <ShieldAlert className="h-4 w-4 shrink-0" />
                          <p><strong>{t("admin.security.backupOption")}</strong> {t("admin.security.backupText")}</p>
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
                <Trash2 className="h-5 w-5" /> {t("admin.customers.deleteTitle")}
              </DialogTitle>
              <DialogDescription className="space-y-3 pt-2">
                <p>
                  {t("admin.customers.deleteDescription", {
                    name: customerToDelete.name,
                    email: customerToDelete.email ? ` (${customerToDelete.email})` : "",
                  })}
                </p>
                <p className="text-xs font-semibold text-destructive uppercase tracking-wider bg-destructive/10 p-2.5 rounded border border-destructive/20">
                  {t("admin.customers.deleteWarning")}
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
                {t("admin.common.cancel")}
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
                    <Loader2 className="h-4 w-4 animate-spin" /> {t("admin.common.deleting")}
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4" /> {t("admin.common.confirmDelete")}
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
                <Trash2 className="h-5 w-5" /> {t("admin.businessDelete.title")}
              </DialogTitle>
              <DialogDescription className="space-y-3 pt-2">
                <p>
                  {t("admin.businessDelete.description", { businessName: businessToDelete.business_name })}
                </p>
                <p className="text-xs font-semibold text-destructive uppercase tracking-wider bg-destructive/10 p-2.5 rounded border border-destructive/20">
                  {t("admin.businessDelete.warning")}
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
                {t("admin.common.cancel")}
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
                    <Loader2 className="h-4 w-4 animate-spin" /> {t("admin.common.deleting")}
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4" /> {t("admin.common.confirmDelete")}
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