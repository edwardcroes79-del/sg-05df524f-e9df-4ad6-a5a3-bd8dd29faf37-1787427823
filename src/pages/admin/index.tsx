import { useCallback, useEffect, useRef, useState } from "react";
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
import { Loader2, Shield, Building2, Users, CreditCard, Power, Edit2, Save, Ban, CheckCircle, Clock, XCircle, Eye, LogOut, Trash2, Globe, ShieldCheck, ShieldAlert, Key, Mail, PlusCircle, Archive, Bell, Database, HardDrive, History, Download, PlayCircle, UploadCloud, AlertTriangle, Square } from "lucide-react";
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

function getBackupUploadFileInfo(file: File) {
  return {
    name: file.name || "unknown",
    type: file.type || "empty",
    size: file.size,
    extension: file.name?.includes(".") ? file.name.slice(file.name.lastIndexOf(".")).toLowerCase() : "none",
  };
}

function isRoyaltyStampBackupUploadName(name: string) {
  const normalized = decodeURIComponent(name || "").trim().toLowerCase();
  return normalized.includes(".tar.gz");
}

const activeBackupStatuses = new Set(["queued", "running"]);

function hasActiveBackupJobs(backups: any[]) {
  return backups.some((backup) => activeBackupStatuses.has(String(backup?.status || "").toLowerCase()));
}

function getBackupStatusBadgeVariant(status: string) {
  const normalized = String(status || "").toLowerCase();
  if (normalized === "completed") return "default";
  if (normalized === "failed" || normalized === "abandoned") return "destructive";
  return "secondary";
}

function getBackupUploadContentType(file: File) {
  const normalizedType = (file.type || "").toLowerCase();
  const allowedTypes = new Set(["application/gzip", "application/x-gzip", "application/octet-stream", "application/x-tar", ""]);
  return allowedTypes.has(normalizedType) ? (normalizedType || "application/octet-stream") : "application/octet-stream";
}

function summarizeBackupValidationFailure(report: any, fallback = "Backup validation failed.") {
  const errors = Array.isArray(report?.errors) ? report.errors.filter(Boolean) : [];
  if (errors.length > 0) return errors.slice(0, 3).join(" ");

  const failedChecks = Array.isArray(report?.checks)
    ? report.checks.filter((check: any) => check?.status === "failed")
    : [];

  if (failedChecks.length > 0) {
    return failedChecks
      .slice(0, 3)
      .map((check: any) => `${check.name}: ${check.details}`)
      .join(" ");
  }

  return fallback;
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

  // Backups states
  const [backups, setBackups] = useState<any[]>([]);
  const [runningBackup, setRunningBackup] = useState(false);
  const [backupPolling, setBackupPolling] = useState(false);
  const [lastBackupPollAt, setLastBackupPollAt] = useState<string | null>(null);
  const backupPollingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const backupPollInFlightRef = useRef(false);
  const backupPollingGraceUntilRef = useRef(0);
  const [deletingBackupId, setDeletingBackupId] = useState<string | null>(null);
  const [downloadingBackupId, setDownloadingBackupId] = useState<string | null>(null);
  const [cancellingBackupId, setCancellingBackupId] = useState<string | null>(null);
  const [viewingBackup, setViewingBackup] = useState<any | null>(null);
  const [validatingBackup, setValidatingBackup] = useState(false);
  const [backupValidationReport, setBackupValidationReport] = useState<any | null>(null);
  const [restoreConfirmation, setRestoreConfirmation] = useState("");
  const [restoringBackup, setRestoringBackup] = useState<"dry_run" | "restore" | null>(null);
  const [restoreReport, setRestoreReport] = useState<any | null>(null);

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

  const stopBackupPolling = useCallback(() => {
    if (backupPollingIntervalRef.current) {
      clearInterval(backupPollingIntervalRef.current);
      backupPollingIntervalRef.current = null;
    }
    backupPollingGraceUntilRef.current = 0;
    setBackupPolling(false);
  }, []);

  const fetchBackupStatuses = useCallback(async () => {
    if (backupPollInFlightRef.current) return null;

    try {
      backupPollInFlightRef.current = true;
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Super Admin session is required to poll backup status.");

      const response = await fetch("/api/admin/backups", {
        headers: {
          "Authorization": `Bearer ${session.access_token}`,
        },
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Failed to refresh backup status.");

      const nextBackups = result.backups || [];
      const hasActiveBackups = hasActiveBackupJobs(nextBackups);
      setBackups(nextBackups);
      setRunningBackup(hasActiveBackups);
      setLastBackupPollAt(new Date().toISOString());

      if (!hasActiveBackups && Date.now() > backupPollingGraceUntilRef.current) {
        stopBackupPolling();
      }

      return hasActiveBackups;
    } catch (err) {
      console.error("Backup status polling failed:", err);
      return null;
    } finally {
      backupPollInFlightRef.current = false;
    }
  }, [stopBackupPolling]);

  const startBackupPolling = useCallback((graceMs = 0) => {
    if (graceMs > 0) {
      backupPollingGraceUntilRef.current = Math.max(backupPollingGraceUntilRef.current, Date.now() + graceMs);
    }

    if (backupPollingIntervalRef.current) return;

    setBackupPolling(true);
    void fetchBackupStatuses();
    backupPollingIntervalRef.current = setInterval(() => {
      void fetchBackupStatuses();
    }, 4000);
  }, [fetchBackupStatuses]);

  useEffect(() => {
    if (isAdmin !== true) return;

    if (hasActiveBackupJobs(backups)) {
      startBackupPolling();
      return;
    }

    if (Date.now() > backupPollingGraceUntilRef.current) {
      stopBackupPolling();
    }
  }, [backups, isAdmin, startBackupPolling, stopBackupPolling]);

  useEffect(() => {
    return () => {
      stopBackupPolling();
    };
  }, [stopBackupPolling]);

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

      // 9. Fetch Backups
      let backupsData: any[] = [];
      if (session) {
        const backupsResponse = await fetch("/api/admin/backups", {
          headers: {
            "Authorization": `Bearer ${session.access_token}`,
          },
        });
        if (backupsResponse.ok) {
          const backupsResult = await backupsResponse.json();
          backupsData = backupsResult.backups || [];
        }
      }
      setBackups(backupsData);
      const activeBackups = hasActiveBackupJobs(backupsData);
      setRunningBackup(activeBackups);
      if (activeBackups) {
        startBackupPolling();
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
        description: "Select both a business and an active assignable add-on.",
        variant: "destructive",
      });
      return;
    }

    const selectedAddon = addons.find((addon) => addon.id === businessAddonFormData.addon_id);
    const assignmentQuantity = isQuickStampAddon(selectedAddon) ? 1 : Number(businessAddonFormData.quantity);

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
          quantity: assignmentQuantity,
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
        description: isQuickStampAddon(selectedAddon)
          ? "Quick Stamp QR feature access is now active for this business."
          : "The business customer capacity entitlement now includes this active add-on.",
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

  const handleRunBackup = async () => {
    let latestActiveStatus: boolean | null = null;

    try {
      setRunningBackup(true);
      startBackupPolling(15000);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error(t("admin.common.notAuthenticated"));

      const response = await fetch("/api/admin/backups/run", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${session.access_token}`,
          "Accept": "application/json",
        },
      });
      const responseText = await response.text();
      const contentType = response.headers.get("content-type") || "";

      if (!contentType.includes("application/json")) {
        throw new Error(`Backup endpoint /api/admin/backups/run returned ${response.status} ${response.statusText || ""} with ${contentType || "unknown content type"} instead of JSON.`);
      }

      const result = JSON.parse(responseText);
      if (!response.ok) throw new Error(result.error || "Backup failed");

      toast({ title: "Backup completed", description: "The backup package was created successfully." });
      latestActiveStatus = await fetchBackupStatuses();
    } catch (err: any) {
      toast({ title: "Backup failed", description: err.message, variant: "destructive" });
      latestActiveStatus = await fetchBackupStatuses();
    } finally {
      if (latestActiveStatus === false) {
        setRunningBackup(false);
      }
    }
  };

  const handleDeleteBackup = async (id: string) => {
    if (!window.confirm("Are you sure you want to permanently delete this backup record and its associated backup files? This cannot be undone.")) return;
    try {
      setDeletingBackupId(id);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error(t("admin.common.notAuthenticated"));

      const response = await fetch(`/api/admin/backups/${id}/delete`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${session.access_token}` },
      });
      if (!response.ok) {
         const result = await response.json().catch(() => ({}));
         throw new Error(result.error || "Delete failed");
      }

      toast({ title: "Backup deleted", description: "The backup package was removed." });
      await fetchAdminData();
    } catch (err: any) {
      toast({ title: "Delete failed", description: err.message, variant: "destructive" });
    } finally {
      setDeletingBackupId(null);
    }
  };

  const handleCancelBackup = async (id: string) => {
    if (!window.confirm("Stop this running backup and clean up any incomplete backup files?")) return;

    try {
      setCancellingBackupId(id);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error(t("admin.common.notAuthenticated"));

      const response = await fetch(`/api/admin/backups/${id}/cancel`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${session.access_token}` },
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Cancel failed");

      toast({ title: "Backup cancelled", description: "The backup job was stopped and incomplete files were cleaned up." });
      await fetchBackupStatuses();
    } catch (err: any) {
      toast({ title: "Cancel failed", description: err.message, variant: "destructive" });
    } finally {
      setCancellingBackupId(null);
    }
  };

  const handleDownloadBackup = async (id: string) => {
    try {
      setDownloadingBackupId(id);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error(t("admin.common.notAuthenticated"));

      const response = await fetch(`/api/admin/backups/${id}/download`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${session.access_token}`,
          "Accept": "application/gzip",
        },
      });

      if (!response.ok) {
        const contentType = response.headers.get("content-type") || "";
        const errorBody = contentType.includes("application/json")
          ? await response.json().catch(() => ({}))
          : { error: await response.text().catch(() => "Download failed") };
        throw new Error(errorBody.error || "Download failed");
      }

      const contentType = response.headers.get("content-type") || "";
      if (!contentType.includes("gzip") && !contentType.includes("octet-stream")) {
        throw new Error(`Backup download returned ${contentType || "unknown content type"} instead of a .tar.gz archive.`);
      }

      const disposition = response.headers.get("content-disposition") || "";
      const fileNameMatch = disposition.match(/filename="([^"]+)"/);
      const fileName = fileNameMatch?.[1] || `royalty-stamp-backup-${id}.tar.gz`;
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(objectUrl);
      toast({ title: "Backup downloaded", description: `${fileName} is ready to upload and validate.` });
    } catch (err: any) {
      toast({ title: "Download failed", description: err.message, variant: "destructive" });
    } finally {
      setDownloadingBackupId(null);
    }
  };

  const handleValidateBackupUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    const fileInfo = getBackupUploadFileInfo(file);
    if (!isRoyaltyStampBackupUploadName(file.name)) {
      toast({
        title: "Invalid file type",
        description: `Upload a Royalty Stamp .tar.gz backup package. Received name="${fileInfo.name}", type="${fileInfo.type}", size=${fileInfo.size} bytes, extension="${fileInfo.extension}".`,
        variant: "destructive",
      });
      return;
    }

    try {
      setValidatingBackup(true);
      setBackupValidationReport(null);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error(t("admin.common.notAuthenticated"));

      const uploadContentType = getBackupUploadContentType(file);
      const response = await fetch("/api/admin/backups/validate-upload", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${session.access_token}`,
          "Content-Type": uploadContentType,
          "X-Backup-Filename": encodeURIComponent(file.name),
          "X-Backup-Client-Type": encodeURIComponent(file.type || ""),
          "X-Backup-Client-Size": String(file.size),
        },
        body: file,
      });
      const responseText = await response.text();
      const contentType = response.headers.get("content-type") || "";

      if (!contentType.includes("application/json")) {
        throw new Error(`Backup validation endpoint returned ${response.status} ${response.statusText || ""} with ${contentType || "unknown content type"} instead of JSON.`);
      }

      const result = JSON.parse(responseText);
      if (!response.ok && !result.report) throw new Error(result.error || "Backup validation failed");

      setBackupValidationReport(result.report);
      const validationFailureSummary = summarizeBackupValidationFailure(result.report, result.error || "The uploaded backup failed validation.");
      toast({
        title: result.report?.valid ? "Validated — Ready to Restore" : "Backup rejected",
        description: result.report?.valid ? "The uploaded backup is compatible, intact, and ready for a restore dry run. Restore was not started." : validationFailureSummary,
        variant: result.report?.valid ? "default" : "destructive",
      });
    } catch (err: any) {
      toast({ title: "Validation failed", description: err.message, variant: "destructive" });
    } finally {
      setValidatingBackup(false);
    }
  };

  const handleRestoreBackupUpload = async (event: React.ChangeEvent<HTMLInputElement>, mode: "dry_run" | "restore") => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (!file.name.endsWith(".tar.gz")) {
      toast({ title: "Invalid file type", description: "Upload a Royalty Stamp .tar.gz backup package.", variant: "destructive" });
      return;
    }

    const confirmationPhrase = "RESTORE ROYALTY STAMP BACKUP";
    if (mode === "restore" && restoreConfirmation !== confirmationPhrase) {
      toast({
        title: "Restore confirmation required",
        description: `Type ${confirmationPhrase} exactly before restoring production data.`,
        variant: "destructive",
      });
      return;
    }

    if (mode === "restore" && !window.confirm("This will restore production database records and Storage files from the uploaded backup after creating a safety backup. Continue?")) {
      return;
    }

    try {
      setRestoringBackup(mode);
      setRestoreReport(null);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error(t("admin.common.notAuthenticated"));

      const response = await fetch("/api/admin/backups/restore-upload", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${session.access_token}`,
          "Content-Type": "application/gzip",
          "X-Backup-Filename": encodeURIComponent(file.name),
          "X-Restore-Mode": mode,
          "X-Restore-Confirmation": encodeURIComponent(mode === "restore" ? restoreConfirmation : confirmationPhrase),
        },
        body: file,
      });

      const result = await response.json();
      if (!response.ok && !result.report) throw new Error(result.error || "Backup restore failed");

      setRestoreReport(result.report);
      toast({
        title: result.report?.valid ? (mode === "restore" ? "Restore completed" : "Dry run completed") : "Restore blocked",
        description: result.report?.valid
          ? mode === "restore"
            ? "Production restore completed and was logged."
            : "The backup passed restore validation without modifying production data."
          : "The backup was rejected before production data was modified.",
        variant: result.report?.valid ? "default" : "destructive",
      });

      if (mode === "restore" && result.report?.valid) {
        setRestoreConfirmation("");
        await fetchAdminData();
      }
    } catch (err: any) {
      toast({ title: mode === "restore" ? "Restore failed" : "Dry run failed", description: err.message, variant: "destructive" });
    } finally {
      setRestoringBackup(null);
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
    <div className="min-h-screen bg-background">
      <Head>
        <title>{t("admin.seoTitle")}</title>
      </Head>

      <div className="min-h-screen bg-background p-4 md:p-12">
        <div className="mx-auto flex min-h-[calc(100dvh-2rem)] w-full max-w-[1600px] flex-col space-y-8 overflow-x-hidden md:min-h-[calc(100vh-6rem)]">
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

          <Tabs value={activeAdminTab} onValueChange={setActiveAdminTab} className="flex min-h-0 flex-1 flex-col space-y-6">
            <TabsList className="bg-muted p-1 rounded-lg flex-wrap h-auto shrink-0 overflow-x-auto">
              <TabsTrigger value="merchants">{t("admin.tabs.merchants")}</TabsTrigger>
              <TabsTrigger value="payments">{t("admin.tabs.payments")}</TabsTrigger>
              <TabsTrigger value="plans">{t("admin.tabs.plans")}</TabsTrigger>
              <TabsTrigger value="addons">{t("admin.tabs.addons")}</TabsTrigger>
              <TabsTrigger value="customers">{t("admin.tabs.customers")}</TabsTrigger>
              <TabsTrigger value="payment_settings">{t("admin.tabs.paymentSettings")}</TabsTrigger>
              <TabsTrigger value="website">{t("admin.tabs.website")}</TabsTrigger>
              <TabsTrigger value="security">{t("admin.tabs.security")}</TabsTrigger>
              <TabsTrigger value="backups">{t("admin.tabs.backups")}</TabsTrigger>
            </TabsList>

            <TabsContent value="merchants" className="min-h-0">
              <div className="overflow-x-auto overscroll-contain">
                <Card className="min-w-[1100px] md:min-w-0">
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
            </div>
          </TabsContent>

          <TabsContent value="payments" className="min-h-0 space-y-6 pb-8">
            {reviewingPayment && (
              <Card className="border-primary/30 bg-primary/5">
                <CardHeader>
                  <CardTitle>Review payment request</CardTitle>
                  <CardDescription>
                    {reviewingPayment.businesses?.business_name || "Selected business"} · {reviewingPayment.provider || "provider"} · AWG {Number(reviewingPayment.amount || 0).toFixed(2)}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-3 md:grid-cols-3">
                    <div className="rounded-lg bg-background p-3">
                      <p className="text-xs text-muted-foreground">Status</p>
                      <p className="font-semibold uppercase">{reviewingPayment.status}</p>
                    </div>
                    <div className="rounded-lg bg-background p-3">
                      <p className="text-xs text-muted-foreground">Plan</p>
                      <p className="font-semibold">{reviewingPayment.metadata?.requested_plan_name || reviewingPayment.plan_id || "-"}</p>
                    </div>
                    <div className="rounded-lg bg-background p-3">
                      <p className="text-xs text-muted-foreground">Created</p>
                      <p className="font-semibold">{new Date(reviewingPayment.created_at).toLocaleString(locale)}</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="admin-notes">Admin notes</Label>
                    <textarea
                      id="admin-notes"
                      className="min-h-24 w-full rounded-md border border-input bg-background p-3 text-sm text-foreground"
                      value={adminNotes}
                      onChange={(event) => setAdminNotes(event.target.value)}
                      placeholder="Add approval or rejection notes"
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {reviewingPayment.payment_proof_url && (
                      <Button type="button" variant="outline" onClick={() => handleOpenAdminPaymentProof(reviewingPayment)}>
                        <Eye className="mr-2 h-4 w-4" /> Open proof
                      </Button>
                    )}
                    <Button type="button" onClick={() => handleApprovePayment(reviewingPayment)} disabled={processing}>
                      {processing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
                      Approve
                    </Button>
                    <Button type="button" variant="destructive" onClick={() => handleRejectPayment(reviewingPayment)} disabled={processing}>
                      {processing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <XCircle className="mr-2 h-4 w-4" />}
                      Reject
                    </Button>
                    <Button type="button" variant="outline" onClick={() => { setReviewingPayment(null); setAdminNotes(""); }}>
                      Cancel
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle>{t("admin.payments.title")}</CardTitle>
                <CardDescription>Review real subscription and add-on payment records from Supabase.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto overscroll-contain">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Business</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Provider</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {payments.map((payment) => (
                        <TableRow key={payment.id}>
                          <TableCell className="font-semibold">{payment.businesses?.business_name || payment.metadata?.business_name || "Unknown business"}</TableCell>
                          <TableCell>{payment.metadata?.change_type || payment.metadata?.kind || payment.payment_type || "-"}</TableCell>
                          <TableCell>{payment.provider || "-"}</TableCell>
                          <TableCell>AWG {Number(payment.amount || 0).toFixed(2)}</TableCell>
                          <TableCell>
                            <Badge variant={payment.status === "approved" ? "default" : payment.status === "rejected" ? "destructive" : "secondary"}>
                              {String(payment.status || "pending").toUpperCase()}
                            </Badge>
                          </TableCell>
                          <TableCell>{new Date(payment.created_at).toLocaleString(locale)}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              {payment.payment_proof_url && (
                                <Button type="button" variant="outline" size="sm" onClick={() => handleOpenAdminPaymentProof(payment)}>
                                  <Eye className="h-4 w-4" />
                                </Button>
                              )}
                              <Button type="button" size="sm" onClick={() => { setReviewingPayment(payment); setAdminNotes(payment.admin_notes || ""); }}>
                                Review
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                      {payments.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={7} className="py-6 text-center text-muted-foreground">No payment records available yet.</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="plans" className="min-h-0 space-y-6 pb-8">
            <Card>
              <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <CardTitle>Subscription Plans & Limits</CardTitle>
                  <CardDescription>Manage database-backed plan prices, limits, and feature entitlements.</CardDescription>
                </div>
                <Button type="button" onClick={handleCreatePlanClick}>
                  <PlusCircle className="mr-2 h-4 w-4" /> Create plan
                </Button>
              </CardHeader>
              {(editingPlan || isCreatingPlan) && (
                <CardContent>
                  <form onSubmit={handleSavePlan} className="grid gap-4 rounded-xl border bg-muted/30 p-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Plan ID</Label>
                      <Input value={planFormData.id} onChange={(event) => setPlanFormData((current) => ({ ...current, id: event.target.value }))} disabled={Boolean(editingPlan)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Name</Label>
                      <Input value={planFormData.name} onChange={(event) => setPlanFormData((current) => ({ ...current, name: event.target.value }))} />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label>Description</Label>
                      <Input value={planFormData.description} onChange={(event) => setPlanFormData((current) => ({ ...current, description: event.target.value }))} />
                    </div>
                    <div className="space-y-2">
                      <Label>Monthly price AWG</Label>
                      <Input type="number" value={planFormData.price_awg} onChange={(event) => setPlanFormData((current) => ({ ...current, price_awg: Number(event.target.value) }))} />
                    </div>
                    <div className="space-y-2">
                      <Label>Annual price AWG</Label>
                      <Input type="number" value={planFormData.annual_price_awg} onChange={(event) => setPlanFormData((current) => ({ ...current, annual_price_awg: event.target.value }))} />
                    </div>
                    <div className="space-y-2">
                      <Label>Max loyalty programs</Label>
                      <Input type="number" value={planFormData.max_loyalty_programs} onChange={(event) => setPlanFormData((current) => ({ ...current, max_loyalty_programs: Number(event.target.value) }))} />
                    </div>
                    <div className="space-y-2">
                      <Label>Max customers</Label>
                      <Input type="number" value={planFormData.max_customers} onChange={(event) => setPlanFormData((current) => ({ ...current, max_customers: Number(event.target.value) }))} />
                    </div>
                    <div className="space-y-2">
                      <Label>Max staff</Label>
                      <Input type="number" value={planFormData.max_staff} onChange={(event) => setPlanFormData((current) => ({ ...current, max_staff: Number(event.target.value) }))} />
                    </div>
                    <div className="space-y-2">
                      <Label>Status</Label>
                      <select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={planFormData.status} onChange={(event) => setPlanFormData((current) => ({ ...current, status: event.target.value }))}>
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                        <option value="archived">Archived</option>
                      </select>
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label>Features</Label>
                      <Input value={planFormData.features.join(", ")} onChange={(event) => setPlanFormData((current) => ({ ...current, features: event.target.value.split(",").map((item) => item.trim()).filter(Boolean) }))} placeholder="Comma-separated feature list" />
                    </div>
                    <div className="flex flex-wrap gap-4 md:col-span-2">
                      {availablePlanEntitlements.map((feature) => (
                        <label key={feature.key} className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={Boolean(planFormData.entitlements[feature.key as keyof typeof planFormData.entitlements])}
                            onChange={(event) => setPlanFormData((current) => ({
                              ...current,
                              entitlements: { ...current.entitlements, [feature.key]: event.target.checked },
                            }))}
                          />
                          {feature.label}
                        </label>
                      ))}
                    </div>
                    <div className="flex gap-2 md:col-span-2">
                      <Button type="submit" disabled={savingPlan}>{savingPlan ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />} Save plan</Button>
                      <Button type="button" variant="outline" onClick={() => { setEditingPlan(null); setIsCreatingPlan(false); setPlanFormData(emptyPlanFormData); }}>Cancel</Button>
                    </div>
                  </form>
                </CardContent>
              )}
              <CardContent>
                <div className="overflow-x-auto overscroll-contain">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Plan</TableHead>
                        <TableHead>Price</TableHead>
                        <TableHead>Limits</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {plans.map((plan) => (
                        <TableRow key={plan.id}>
                          <TableCell>
                            <div className="font-semibold">{plan.name}</div>
                            <div className="text-xs text-muted-foreground">{plan.id}</div>
                          </TableCell>
                          <TableCell>AWG {Number(plan.price_awg || 0).toFixed(2)}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{plan.max_customers} customers · {plan.max_loyalty_programs} programs · {plan.max_staff || 1} staff</TableCell>
                          <TableCell><Badge variant={(plan.status || (plan.is_active ? "active" : "inactive")) === "active" ? "default" : "secondary"}>{plan.status || (plan.is_active ? "active" : "inactive")}</Badge></TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button type="button" variant="outline" size="sm" onClick={() => handleEditPlanClick(plan)}><Edit2 className="h-4 w-4" /></Button>
                              <Button type="button" variant="outline" size="sm" onClick={() => handleUpdatePlanStatus(plan, "active")}>Activate</Button>
                              <Button type="button" variant="outline" size="sm" onClick={() => handleUpdatePlanStatus(plan, "inactive")}>Disable</Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                      {plans.length === 0 && (
                        <TableRow><TableCell colSpan={5} className="py-6 text-center text-muted-foreground">No plans available yet.</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="addons" className="min-h-0 space-y-6 pb-8">
            <Card>
              <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <CardTitle>Customer Capacity Add-ons</CardTitle>
                  <CardDescription>Manage real add-ons and business add-on subscriptions.</CardDescription>
                </div>
                <Button type="button" onClick={handleCreateAddonClick}>
                  <PlusCircle className="mr-2 h-4 w-4" /> Create add-on
                </Button>
              </CardHeader>
              {(editingAddon || isCreatingAddon) && (
                <CardContent>
                  <form onSubmit={handleSaveAddon} className="grid gap-4 rounded-xl border bg-muted/30 p-4 md:grid-cols-2">
                    <div className="space-y-2"><Label>Name</Label><Input value={addonFormData.name} onChange={(event) => setAddonFormData((current) => ({ ...current, name: event.target.value }))} /></div>
                    <div className="space-y-2"><Label>Slug</Label><Input value={addonFormData.slug} onChange={(event) => setAddonFormData((current) => ({ ...current, slug: event.target.value }))} /></div>
                    <div className="space-y-2 md:col-span-2"><Label>Description</Label><Input value={addonFormData.description} onChange={(event) => setAddonFormData((current) => ({ ...current, description: event.target.value }))} /></div>
                    <div className="space-y-2"><Label>Type</Label><select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={addonFormData.addon_type} onChange={(event) => setAddonFormData((current) => ({ ...current, addon_type: event.target.value }))}><option value="customer_capacity">Customer capacity</option><option value="quick_stamp_qr">Quick Stamp QR</option></select></div>
                    <div className="space-y-2"><Label>Capacity amount</Label><Input type="number" value={addonFormData.capacity_amount} onChange={(event) => setAddonFormData((current) => ({ ...current, capacity_amount: Number(event.target.value) }))} /></div>
                    <div className="space-y-2"><Label>Monthly price AWG</Label><Input type="number" value={addonFormData.monthly_price_awg} onChange={(event) => setAddonFormData((current) => ({ ...current, monthly_price_awg: Number(event.target.value) }))} /></div>
                    <div className="space-y-2"><Label>Status</Label><select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={addonFormData.status} onChange={(event) => setAddonFormData((current) => ({ ...current, status: event.target.value }))}><option value="active">Active</option><option value="inactive">Inactive</option><option value="archived">Archived</option></select></div>
                    <div className="flex gap-2 md:col-span-2">
                      <Button type="submit" disabled={savingAddon}>{savingAddon ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />} Save add-on</Button>
                      <Button type="button" variant="outline" onClick={() => { setEditingAddon(null); setIsCreatingAddon(false); setAddonFormData(emptyAddonFormData); }}>Cancel</Button>
                    </div>
                  </form>
                </CardContent>
              )}
              <CardContent>
                <div className="overflow-x-auto overscroll-contain">
                  <Table>
                    <TableHeader><TableRow><TableHead>Add-on</TableHead><TableHead>Metric</TableHead><TableHead>Price</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {addons.map((addon) => (
                        <TableRow key={addon.id}>
                          <TableCell><div className="font-semibold">{addon.name}</div><div className="text-xs text-muted-foreground">{addon.slug || addon.id}</div></TableCell>
                          <TableCell>{getAddonDisplayMetric(addon, 1, t)}</TableCell>
                          <TableCell>AWG {Number(addon.monthly_price_awg || 0).toFixed(2)}</TableCell>
                          <TableCell><Badge variant={addon.status === "active" ? "default" : "secondary"}>{addon.status}</Badge></TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button type="button" variant="outline" size="sm" onClick={() => handleEditAddonClick(addon)}><Edit2 className="h-4 w-4" /></Button>
                              <Button type="button" variant="outline" size="sm" onClick={() => handleUpdateAddonStatus(addon, "active")}>Activate</Button>
                              <Button type="button" variant="outline" size="sm" onClick={() => handleUpdateAddonStatus(addon, "inactive")}>Disable</Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                      {addons.length === 0 && <TableRow><TableCell colSpan={5} className="py-6 text-center text-muted-foreground">No add-ons available yet.</TableCell></TableRow>}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Assign add-on to business</CardTitle>
                <CardDescription>Assign only active real add-ons to real businesses.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleAssignBusinessAddon} className="grid gap-4 md:grid-cols-4">
                  <select className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={businessAddonFormData.business_id} onChange={(event) => setBusinessAddonFormData((current) => ({ ...current, business_id: event.target.value }))}>
                    <option value="">Select business</option>
                    {businesses.map((business) => <option key={business.id} value={business.id}>{business.business_name}</option>)}
                  </select>
                  <select className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={businessAddonFormData.addon_id} onChange={(event) => setBusinessAddonFormData((current) => ({ ...current, addon_id: event.target.value }))}>
                    <option value="">Select add-on</option>
                    {addons.filter((addon) => addon.status === "active").map((addon) => <option key={addon.id} value={addon.id}>{addon.name}</option>)}
                  </select>
                  <Input type="number" min={1} value={businessAddonFormData.quantity} onChange={(event) => setBusinessAddonFormData((current) => ({ ...current, quantity: Number(event.target.value) }))} />
                  <Button type="submit" disabled={assigningBusinessAddon}>{assigningBusinessAddon ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />} Assign</Button>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Business add-on subscriptions</CardTitle><CardDescription>Approve, reject, or schedule cancellation for real add-on subscriptions.</CardDescription></CardHeader>
              <CardContent>
                <div className="overflow-x-auto overscroll-contain">
                  <Table>
                    <TableHeader><TableRow><TableHead>Business</TableHead><TableHead>Add-on</TableHead><TableHead>Status</TableHead><TableHead>Payment</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {businessAddonSubscriptions.map((subscription) => {
                        const addon = Array.isArray(subscription.subscription_addons) ? subscription.subscription_addons[0] : subscription.subscription_addons;
                        const business = Array.isArray(subscription.businesses) ? subscription.businesses[0] : subscription.businesses;
                        return (
                          <TableRow key={subscription.id}>
                            <TableCell className="font-semibold">{business?.business_name || "Unknown business"}</TableCell>
                            <TableCell>{addon?.name || subscription.addon_id}</TableCell>
                            <TableCell><Badge variant={subscription.status === "active" ? "default" : "secondary"}>{subscription.status}</Badge></TableCell>
                            <TableCell><Badge variant={subscription.payment_status === "approved" ? "default" : subscription.payment_status === "failed" ? "destructive" : "secondary"}>{subscription.payment_status}</Badge></TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                {subscription.status === "inactive" && subscription.payment_status === "pending" && (
                                  <>
                                    <Button type="button" size="sm" onClick={() => handleApproveAddonRequest(subscription)} disabled={reviewingAddonRequestId === subscription.id}>Approve</Button>
                                    <Button type="button" variant="destructive" size="sm" onClick={() => handleRejectAddonRequest(subscription)} disabled={reviewingAddonRequestId === subscription.id}>Reject</Button>
                                  </>
                                )}
                                {subscription.status === "active" && (
                                  <Button type="button" variant="outline" size="sm" onClick={() => handleCancelBusinessAddon(subscription)} disabled={cancellingBusinessAddonId === subscription.id}>Cancel</Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                      {businessAddonSubscriptions.length === 0 && <TableRow><TableCell colSpan={5} className="py-6 text-center text-muted-foreground">No business add-ons available yet.</TableCell></TableRow>}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="customers" className="min-h-0 space-y-6 pb-8">
            <Card>
              <CardHeader>
                <CardTitle>{t("admin.customers.title")}</CardTitle>
                <CardDescription>Real customer accounts currently stored in Supabase.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto overscroll-contain">
                  <Table>
                    <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Email</TableHead><TableHead>Phone</TableHead><TableHead>Created</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {customers.map((customer) => (
                        <TableRow key={customer.id}>
                          <TableCell className="font-semibold">{customer.name || "Unnamed customer"}</TableCell>
                          <TableCell>{customer.email || "-"}</TableCell>
                          <TableCell>{customer.phone || "-"}</TableCell>
                          <TableCell>{new Date(customer.created_at).toLocaleString(locale)}</TableCell>
                          <TableCell className="text-right">
                            <Button type="button" variant="destructive" size="sm" onClick={() => setCustomerToDelete(customer)}>
                              <Trash2 className="mr-2 h-4 w-4" /> Delete
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                      {customers.length === 0 && <TableRow><TableCell colSpan={5} className="py-6 text-center text-muted-foreground">No customers available yet.</TableCell></TableRow>}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="payment_settings" className="min-h-0 space-y-6 pb-8">
            <Card>
              <CardHeader>
                <CardTitle>Payment Settings</CardTitle>
                <CardDescription>Bank transfer instructions shown to businesses during subscription payment flows.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSaveBankDetails} className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2"><Label>Bank name</Label><Input value={bankDetails.bankName} onChange={(event) => setBankDetails((current) => ({ ...current, bankName: event.target.value }))} /></div>
                  <div className="space-y-2"><Label>Account holder</Label><Input value={bankDetails.accountHolder} onChange={(event) => setBankDetails((current) => ({ ...current, accountHolder: event.target.value }))} /></div>
                  <div className="space-y-2"><Label>Account number</Label><Input value={bankDetails.accountNumber} onChange={(event) => setBankDetails((current) => ({ ...current, accountNumber: event.target.value }))} /></div>
                  <div className="space-y-2"><Label>IBAN</Label><Input value={bankDetails.iban} onChange={(event) => setBankDetails((current) => ({ ...current, iban: event.target.value }))} /></div>
                  <div className="space-y-2"><Label>SWIFT/BIC</Label><Input value={bankDetails.swiftBic} onChange={(event) => setBankDetails((current) => ({ ...current, swiftBic: event.target.value }))} /></div>
                  <div className="space-y-2"><Label>Payment reference</Label><Input value={bankDetails.paymentReference} onChange={(event) => setBankDetails((current) => ({ ...current, paymentReference: event.target.value }))} /></div>
                  <div className="space-y-2 md:col-span-2"><Label>Bank address</Label><Input value={bankDetails.bankAddress} onChange={(event) => setBankDetails((current) => ({ ...current, bankAddress: event.target.value }))} /></div>
                  <div className="space-y-2 md:col-span-2">
                    <Label>Additional instructions</Label>
                    <textarea className="min-h-28 w-full rounded-md border border-input bg-background p-3 text-sm" value={bankDetails.additionalInstructions} onChange={(event) => setBankDetails((current) => ({ ...current, additionalInstructions: event.target.value }))} />
                  </div>
                  <div className="md:col-span-2">
                    <Button type="submit" disabled={savingBankDetails}>{savingBankDetails ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />} Save payment settings</Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="website" className="min-h-0 space-y-6 pb-8">
            <Card>
              <CardHeader>
                <CardTitle>Website Settings</CardTitle>
                <CardDescription>Update public website footer copy and editable legal/content pages.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSaveFooterSettings} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Footer about text</Label>
                    <textarea className="min-h-28 w-full rounded-md border border-input bg-background p-3 text-sm" value={footerSettings.aboutText} onChange={(event) => setFooterSettings((current) => ({ ...current, aboutText: event.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Copyright text</Label>
                    <Input value={footerSettings.copyrightText} onChange={(event) => setFooterSettings((current) => ({ ...current, copyrightText: event.target.value }))} />
                  </div>
                  <Button type="submit" disabled={savingSettings}>{savingSettings ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />} Save website settings</Button>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Website pages</CardTitle><CardDescription>Edit existing public content pages.</CardDescription></CardHeader>
              <CardContent>
                <div className="overflow-x-auto overscroll-contain">
                  <Table>
                    <TableHeader><TableRow><TableHead>Title</TableHead><TableHead>Slug</TableHead><TableHead>Updated</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {pages.map((page) => (
                        <TableRow key={page.slug}>
                          <TableCell className="font-semibold">{page.title}</TableCell>
                          <TableCell>/{page.slug}</TableCell>
                          <TableCell>{page.updated_at ? new Date(page.updated_at).toLocaleString(locale) : "-"}</TableCell>
                          <TableCell className="text-right"><Button type="button" variant="outline" size="sm" onClick={() => setEditingPage(page)}><Edit2 className="mr-2 h-4 w-4" /> Edit</Button></TableCell>
                        </TableRow>
                      ))}
                      {pages.length === 0 && <TableRow><TableCell colSpan={4} className="py-6 text-center text-muted-foreground">No editable pages available yet.</TableCell></TableRow>}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security" className="min-h-0 space-y-6 pb-8">
            <Card>
              <CardHeader>
                <CardTitle>Account Security</CardTitle>
                <CardDescription>Manage Super Admin multi-factor authentication.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="rounded-xl border bg-muted/30 p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="font-semibold">Verified MFA factors</p>
                      <p className="text-sm text-muted-foreground">{mfaFactors.length > 0 ? `${mfaFactors.length} verified factor(s) enabled.` : "No verified MFA factor is enabled yet."}</p>
                    </div>
                    <Button type="button" onClick={handleEnableMfa} disabled={mfaLoading || isEnrollingMfa}>
                      {mfaLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Key className="mr-2 h-4 w-4" />}
                      Enroll TOTP
                    </Button>
                  </div>
                </div>

                {isEnrollingMfa && (
                  <form onSubmit={handleVerifyMfaSetup} className="space-y-4 rounded-xl border border-primary/30 bg-primary/5 p-4">
                    <div>
                      <p className="font-semibold">Verify new authenticator app</p>
                      <p className="text-sm text-muted-foreground">Scan the QR code, then enter the 6-digit verification code.</p>
                    </div>
                    {mfaQrCode && <img src={mfaQrCode} alt="MFA QR code" className="h-48 w-48 rounded-lg border bg-white p-2" />}
                    {mfaSecret && <p className="break-all rounded-md bg-background p-2 font-mono text-xs">{mfaSecret}</p>}
                    <div className="space-y-2">
                      <Label>Verification code</Label>
                      <Input value={mfaVerifyCode} onChange={(event) => setMfaVerifyCode(event.target.value)} inputMode="numeric" />
                    </div>
                    <div className="flex gap-2">
                      <Button type="submit" disabled={mfaLoading}>{mfaLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />} Verify</Button>
                      <Button type="button" variant="outline" onClick={() => handleCancelPendingSetup()} disabled={mfaLoading}>Cancel setup</Button>
                    </div>
                  </form>
                )}

                <div className="space-y-3">
                  {mfaFactors.map((factor) => (
                    <div key={factor.id} className="flex flex-col gap-3 rounded-xl border p-4 md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className="font-semibold">{factor.friendly_name || factor.factor_type || "TOTP factor"}</p>
                        <p className="text-sm text-muted-foreground">Status: {factor.status}</p>
                      </div>
                      <Button type="button" variant="destructive" onClick={() => handleDisableMfa(factor.id)} disabled={mfaLoading}>Disable</Button>
                    </div>
                  ))}
                  {pendingFactorId && !isEnrollingMfa && (
                    <div className="flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className="font-semibold text-amber-900">Pending MFA setup</p>
                        <p className="text-sm text-amber-800">An unfinished MFA enrollment is waiting to be cancelled or completed.</p>
                      </div>
                      <Button type="button" variant="outline" onClick={() => handleCancelPendingSetup()} disabled={mfaLoading}>Cancel pending setup</Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="backups" className="min-h-0">
            <div className="space-y-6 pb-8">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Automatic Backups</CardTitle>
                    <Clock className="h-4 w-4 text-primary" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-xl font-bold text-emerald-600">Active</div>
                    <p className="text-xs text-muted-foreground">Daily at 03:00 UTC</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Last Successful</CardTitle>
                    <CheckCircle className="h-4 w-4 text-emerald-500" />
                  </CardHeader>
                  <CardContent>
                    {(() => {
                      const lastSuccessful = backups.find(b => b.status === "completed");
                      return (
                        <>
                          <div className="text-lg font-bold">{lastSuccessful ? new Date(lastSuccessful.completed_at || lastSuccessful.created_at).toLocaleString() : "None"}</div>
                          {lastSuccessful && (
                            <p className="text-xs text-muted-foreground">{(lastSuccessful.package_size_bytes / 1024 / 1024).toFixed(2)} MB</p>
                          )}
                        </>
                      );
                    })()}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Last Failed</CardTitle>
                    <XCircle className="h-4 w-4 text-destructive" />
                  </CardHeader>
                  <CardContent>
                    {(() => {
                      const lastFailed = backups.find(b => b.status === "failed");
                      return (
                        <div className="text-lg font-bold">{lastFailed ? new Date(lastFailed.created_at).toLocaleString() : "None"}</div>
                      );
                    })()}
                  </CardContent>
                </Card>
                <Card className="bg-primary/5 border-primary/20">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-primary">Manual Backup</CardTitle>
                    <Database className="h-4 w-4 text-primary" />
                  </CardHeader>
                  <CardContent>
                    <Button onClick={handleRunBackup} disabled={runningBackup} className="w-full gap-2">
                      {runningBackup ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlayCircle className="h-4 w-4" />}
                      {runningBackup ? "Backing up..." : "Backup Now"}
                    </Button>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Backup History</CardTitle>
                  <CardDescription>
                    View, download, and manage system backups.
                    {backupPolling && (
                      <span className="ml-2 inline-flex items-center gap-1 text-primary">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Auto-checking status every 4 seconds
                      </span>
                    )}
                    {!backupPolling && lastBackupPollAt && (
                      <span className="ml-2 text-muted-foreground">
                        Last checked {new Date(lastBackupPollAt).toLocaleTimeString()}
                      </span>
                    )}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date / Time</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Package Size</TableHead>
                        <TableHead>Records</TableHead>
                        <TableHead>Storage Files</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {backups.map((backup) => (
                        <TableRow key={backup.id}>
                          <TableCell className="font-semibold">
                            {new Date(backup.created_at).toLocaleString()}
                          </TableCell>
                          <TableCell>
                            <Badge variant={getBackupStatusBadgeVariant(backup.status)}>
                              {String(backup.status || "unknown").toUpperCase()}
                            </Badge>
                            {(backup.status === "failed" || backup.status === "cancelled" || backup.status === "abandoned") && backup.error_message && (
                               <p className="text-xs text-destructive mt-1 max-w-[200px] truncate" title={backup.error_message}>{backup.error_message}</p>
                            )}
                          </TableCell>
                          <TableCell>
                            {backup.package_size_bytes ? `${(backup.package_size_bytes / 1024 / 1024).toFixed(2)} MB` : "-"}
                          </TableCell>
                          <TableCell>
                            {backup.manifest?.row_counts?.total_rows?.toLocaleString() || "-"}
                          </TableCell>
                          <TableCell>
                            {backup.manifest?.object_counts?.total_objects?.toLocaleString() || "-"}
                          </TableCell>
                          <TableCell className="text-right flex items-center justify-end gap-2">
                            <Button variant="outline" size="sm" onClick={() => setViewingBackup(backup)}>
                              <Eye className="h-4 w-4" />
                            </Button>
                            {backup.status === "completed" && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDownloadBackup(backup.id)}
                                disabled={downloadingBackupId === backup.id}
                                aria-label="Download backup package"
                              >
                                {downloadingBackupId === backup.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                              </Button>
                            )}
                            {backup.status === "running" && (
                              <Button variant="outline" size="sm" onClick={() => handleCancelBackup(backup.id)} disabled={cancellingBackupId === backup.id}>
                                {cancellingBackupId === backup.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Square className="h-4 w-4" />}
                              </Button>
                            )}
                            {["completed", "failed", "cancelled", "abandoned"].includes(backup.status) && (
                              <Button 
                                variant="destructive" 
                                size="sm" 
                                onClick={() => handleDeleteBackup(backup.id)}
                                disabled={deletingBackupId === backup.id}
                              >
                                {deletingBackupId === backup.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                      {backups.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">
                            No backups found.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Upload & Validate Backup</CardTitle>
                  <CardDescription>Validate a previously downloaded Royalty Stamp .tar.gz package before any future restore. This does not modify production data.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-col gap-3 rounded-xl border border-dashed border-primary/30 bg-primary/5 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-start gap-3">
                      <div className="rounded-lg bg-primary/10 p-2 text-primary">
                        <UploadCloud className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-semibold text-foreground">Validate backup package</p>
                        <p className="text-sm text-muted-foreground">Checks version, manifest, required exports, safe paths, and SHA-256 checksums. Restore remains disabled.</p>
                      </div>
                    </div>
                    <Label className="inline-flex h-10 cursor-pointer items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90">
                      {validatingBackup ? (
                        <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Validating...</span>
                      ) : (
                        <span className="flex items-center gap-2"><UploadCloud className="h-4 w-4" /> Upload Backup</span>
                      )}
                      <Input
                        type="file"
                        accept=".tar.gz,application/gzip,application/x-gzip"
                        className="hidden"
                        disabled={validatingBackup}
                        onChange={handleValidateBackupUpload}
                      />
                    </Label>
                  </div>

                  {backupValidationReport && (
                    <div className={`rounded-xl border p-4 ${backupValidationReport.valid ? "border-emerald-200 bg-emerald-50" : "border-destructive/30 bg-destructive/5"}`}>
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            {backupValidationReport.valid ? <ShieldCheck className="h-5 w-5 text-emerald-600" /> : <ShieldAlert className="h-5 w-5 text-destructive" />}
                            <h3 className="font-heading text-lg font-semibold">{backupValidationReport.valid ? "Validated — Ready to Restore" : "Backup rejected"}</h3>
                          </div>
                          <p className="mt-1 text-sm text-muted-foreground">{backupValidationReport.file_name}</p>
                        </div>
                        <Badge variant={backupValidationReport.valid ? "default" : "destructive"}>
                          {backupValidationReport.valid ? "Ready to Restore" : "Blocked"}
                        </Badge>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
                        <div className="rounded-lg bg-background/70 p-3">
                          <p className="text-xs text-muted-foreground">Version</p>
                          <p className="font-mono text-sm font-semibold">{backupValidationReport.backup_version || "-"}</p>
                        </div>
                        <div className="rounded-lg bg-background/70 p-3">
                          <p className="text-xs text-muted-foreground">Records</p>
                          <p className="font-mono text-sm font-semibold">{Number(backupValidationReport.total_records || 0).toLocaleString()}</p>
                        </div>
                        <div className="rounded-lg bg-background/70 p-3">
                          <p className="text-xs text-muted-foreground">Files</p>
                          <p className="font-mono text-sm font-semibold">{Number(backupValidationReport.total_files || 0).toLocaleString()}</p>
                        </div>
                        <div className="rounded-lg bg-background/70 p-3">
                          <p className="text-xs text-muted-foreground">Package</p>
                          <p className="font-mono text-sm font-semibold">{(Number(backupValidationReport.file_size_bytes || 0) / 1024 / 1024).toFixed(2)} MB</p>
                        </div>
                      </div>

                      {backupValidationReport.errors?.length > 0 && (
                        <div className="mt-4 rounded-lg border border-destructive/20 bg-background/70 p-3">
                          <p className="mb-2 text-sm font-semibold text-destructive">Validation errors</p>
                          <ul className="list-disc space-y-1 pl-5 text-sm text-destructive">
                            {backupValidationReport.errors.map((error: string) => <li key={error}>{error}</li>)}
                          </ul>
                        </div>
                      )}

                      <div className="mt-4 space-y-2">
                        <p className="text-sm font-semibold text-foreground">Validation checks</p>
                        <div className="grid gap-2 md:grid-cols-2">
                          {backupValidationReport.checks?.map((check: any) => (
                            <div key={`${check.name}-${check.details}`} className="rounded-lg border bg-background/70 p-3">
                              <div className="flex items-center justify-between gap-2">
                                <p className="text-sm font-semibold">{check.name}</p>
                                <Badge variant={check.status === "passed" ? "default" : check.status === "warning" ? "secondary" : "destructive"}>{check.status}</Badge>
                              </div>
                              <p className="mt-1 text-xs text-muted-foreground">{check.details}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="border-destructive/30">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-destructive">
                    <AlertTriangle className="h-5 w-5" /> Safe Restore
                  </CardTitle>
                  <CardDescription>
                    Run a restore dry run first, then restore only after explicit confirmation. Every restore validates the backup again before writing and creates a safety backup when technically possible.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                    <p className="font-semibold">Production safety rules</p>
                    <ul className="mt-2 list-disc space-y-1 pl-5">
                      <li>Dry run validates and reports restore impact without modifying production data.</li>
                      <li>Production restore requires the exact confirmation phrase.</li>
                      <li>Authentication credentials and secrets are not restored from uploaded backups.</li>
                    </ul>
                  </div>

                  <div className="grid gap-4 lg:grid-cols-2">
                    <div className="rounded-xl border bg-background p-4">
                      <div className="flex items-start gap-3">
                        <div className="rounded-lg bg-primary/10 p-2 text-primary">
                          <ShieldCheck className="h-5 w-5" />
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold">Restore dry run</p>
                          <p className="mt-1 text-sm text-muted-foreground">Validate restore order, database records, Storage files, manifest, and checksums without modifying production.</p>
                          <Label className="mt-4 inline-flex h-10 cursor-pointer items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium shadow-sm transition-colors hover:bg-muted">
                            {restoringBackup === "dry_run" ? (
                              <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Checking...</span>
                            ) : (
                              <span className="flex items-center gap-2"><UploadCloud className="h-4 w-4" /> Upload for Dry Run</span>
                            )}
                            <Input
                              type="file"
                              accept=".tar.gz,application/gzip,application/x-gzip"
                              className="hidden"
                              disabled={Boolean(restoringBackup)}
                              onChange={(event) => handleRestoreBackupUpload(event, "dry_run")}
                            />
                          </Label>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4">
                      <div className="flex items-start gap-3">
                        <div className="rounded-lg bg-destructive/10 p-2 text-destructive">
                          <AlertTriangle className="h-5 w-5" />
                        </div>
                        <div className="flex-1 space-y-3">
                          <div>
                            <p className="font-semibold text-destructive">Production restore</p>
                            <p className="mt-1 text-sm text-muted-foreground">Creates a safety backup, then restores database records and Storage files from the uploaded package.</p>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="restore-confirmation">Type RESTORE ROYALTY STAMP BACKUP</Label>
                            <Input
                              id="restore-confirmation"
                              value={restoreConfirmation}
                              onChange={(event) => setRestoreConfirmation(event.target.value)}
                              placeholder="RESTORE ROYALTY STAMP BACKUP"
                              disabled={Boolean(restoringBackup)}
                            />
                          </div>
                          <Label className="inline-flex h-10 cursor-pointer items-center justify-center rounded-md bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground shadow transition-colors hover:bg-destructive/90">
                            {restoringBackup === "restore" ? (
                              <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Restoring...</span>
                            ) : (
                              <span className="flex items-center gap-2"><UploadCloud className="h-4 w-4" /> Upload & Restore</span>
                            )}
                            <Input
                              type="file"
                              accept=".tar.gz,application/gzip,application/x-gzip"
                              className="hidden"
                              disabled={Boolean(restoringBackup) || restoreConfirmation !== "RESTORE ROYALTY STAMP BACKUP"}
                              onChange={(event) => handleRestoreBackupUpload(event, "restore")}
                            />
                          </Label>
                        </div>
                      </div>
                    </div>
                  </div>

                  {restoreReport && (
                    <div className={`rounded-xl border p-4 ${restoreReport.valid ? "border-emerald-200 bg-emerald-50" : "border-destructive/30 bg-destructive/5"}`}>
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            {restoreReport.valid ? <ShieldCheck className="h-5 w-5 text-emerald-600" /> : <ShieldAlert className="h-5 w-5 text-destructive" />}
                            <h3 className="font-heading text-lg font-semibold">{restoreReport.valid ? "Restore report" : "Restore blocked"}</h3>
                          </div>
                          <p className="mt-1 text-sm text-muted-foreground">Job ID: {restoreReport.restore_job_id}</p>
                          {restoreReport.safety_backup_job_id && (
                            <p className="mt-1 text-sm text-muted-foreground">Safety backup: {restoreReport.safety_backup_job_id}</p>
                          )}
                        </div>
                        <Badge variant={restoreReport.valid ? "default" : "destructive"}>{restoreReport.restore_mode}</Badge>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
                        <div className="rounded-lg bg-background/70 p-3">
                          <p className="text-xs text-muted-foreground">Records restored</p>
                          <p className="font-mono text-sm font-semibold">{Number(restoreReport.restored_records || 0).toLocaleString()}</p>
                        </div>
                        <div className="rounded-lg bg-background/70 p-3">
                          <p className="text-xs text-muted-foreground">Files restored</p>
                          <p className="font-mono text-sm font-semibold">{Number(restoreReport.restored_files || 0).toLocaleString()}</p>
                        </div>
                        <div className="rounded-lg bg-background/70 p-3">
                          <p className="text-xs text-muted-foreground">Tables checked</p>
                          <p className="font-mono text-sm font-semibold">{Number(restoreReport.table_results?.length || 0).toLocaleString()}</p>
                        </div>
                        <div className="rounded-lg bg-background/70 p-3">
                          <p className="text-xs text-muted-foreground">Buckets checked</p>
                          <p className="font-mono text-sm font-semibold">{Number(restoreReport.storage_results?.length || 0).toLocaleString()}</p>
                        </div>
                      </div>

                      {restoreReport.errors?.length > 0 && (
                        <div className="mt-4 rounded-lg border border-destructive/20 bg-background/70 p-3">
                          <p className="mb-2 text-sm font-semibold text-destructive">Restore errors</p>
                          <ul className="list-disc space-y-1 pl-5 text-sm text-destructive">
                            {restoreReport.errors.map((error: string) => <li key={error}>{error}</li>)}
                          </ul>
                        </div>
                      )}

                      <div className="mt-4 grid gap-4 lg:grid-cols-2">
                        <div>
                          <p className="mb-2 text-sm font-semibold text-foreground">Database restore plan</p>
                          <div className="max-h-56 overflow-y-auto rounded-lg border bg-background/70">
                            {restoreReport.table_results?.map((table: any) => (
                              <div key={table.table} className="flex items-center justify-between border-b px-3 py-2 text-sm last:border-b-0">
                                <span className="truncate text-muted-foreground">{table.table}</span>
                                <span className="font-mono">{Number(table.records_restored || table.records_seen || 0).toLocaleString()}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div>
                          <p className="mb-2 text-sm font-semibold text-foreground">Storage restore plan</p>
                          <div className="max-h-56 overflow-y-auto rounded-lg border bg-background/70">
                            {restoreReport.storage_results?.map((bucket: any) => (
                              <div key={bucket.bucket} className="flex items-center justify-between border-b px-3 py-2 text-sm last:border-b-0">
                                <span className="truncate text-muted-foreground">{bucket.bucket}</span>
                                <span className="font-mono">{Number(bucket.files_restored || bucket.files_seen || 0).toLocaleString()} files</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Backup Details Dialog */}
      {viewingBackup && (
        <Dialog open={!!viewingBackup} onOpenChange={(open) => !open && setViewingBackup(null)}>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>Backup Details</DialogTitle>
              <DialogDescription className="font-mono text-xs mt-1">ID: {viewingBackup.id}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto pr-2">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                 <div>
                   <p className="text-xs text-muted-foreground mb-1">Status</p>
                   <Badge variant={viewingBackup.status === "completed" ? "default" : viewingBackup.status === "failed" || viewingBackup.status === "abandoned" ? "destructive" : "secondary"}>
                     {viewingBackup.status.toUpperCase()}
                   </Badge>
                 </div>
                 <div>
                   <p className="text-xs text-muted-foreground">Started At</p>
                   <p className="text-sm font-semibold">{viewingBackup.started_at ? new Date(viewingBackup.started_at).toLocaleString() : "-"}</p>
                 </div>
                 <div>
                   <p className="text-xs text-muted-foreground">Completed At</p>
                   <p className="text-sm font-semibold">{viewingBackup.completed_at ? new Date(viewingBackup.completed_at).toLocaleString() : "-"}</p>
                 </div>
                 <div>
                   <p className="text-xs text-muted-foreground">Package Size</p>
                   <p className="text-sm font-semibold">{viewingBackup.package_size_bytes ? `${(viewingBackup.package_size_bytes / 1024 / 1024).toFixed(2)} MB` : "-"}</p>
                 </div>
                 <div>
                   <p className="text-xs text-muted-foreground">Records</p>
                   <p className="text-sm font-semibold">{viewingBackup.manifest?.row_counts?.total_rows?.toLocaleString() || "-"}</p>
                 </div>
                 <div>
                   <p className="text-xs text-muted-foreground">Files</p>
                   <p className="text-sm font-semibold">{viewingBackup.manifest?.object_counts?.total_objects?.toLocaleString() || "-"}</p>
                 </div>
              </div>
              
              {viewingBackup.error_message && (
                <div className="bg-destructive/10 text-destructive p-3 rounded-md text-sm border border-destructive/20">
                  <span className="font-bold block mb-1">Error Message</span>
                  {viewingBackup.error_message}
                </div>
              )}

              {viewingBackup.manifest && (
                <div className="space-y-5">
                  <div>
                    <h4 className="font-semibold border-b pb-2 mb-3">Database Tables</h4>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                      {Object.entries(viewingBackup.manifest.row_counts?.table_counts || {}).map(([table, count]: any) => (
                         <div key={table} className="flex justify-between border-b border-border/50 pb-1">
                           <span className="text-muted-foreground truncate" title={table}>{table}</span>
                           <span className="font-mono">{count.toLocaleString()}</span>
                         </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold border-b pb-2 mb-3">Storage Buckets</h4>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                      {Object.entries(viewingBackup.manifest.object_counts?.bucket_counts || {}).map(([bucket, data]: any) => (
                         <div key={bucket} className="flex justify-between border-b border-border/50 pb-1">
                           <span className="text-muted-foreground truncate" title={bucket}>{bucket}</span>
                           <span className="font-mono text-right">{data.count.toLocaleString()} files<br/><span className="text-[10px] text-muted-foreground">({(data.bytes / 1024 / 1024).toFixed(2)} MB)</span></span>
                         </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setViewingBackup(null)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

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
    </div>
    </div>
  );
}