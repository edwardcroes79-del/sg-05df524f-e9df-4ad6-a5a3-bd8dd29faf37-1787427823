import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { 
  LayoutDashboard, 
  Gift, 
  Users, 
  QrCode, 
  Settings, 
  LogOut,
  Menu,
  X,
  ScanLine,
  ShieldAlert,
  CreditCard,
  Bell,
  Zap,
  BarChart3,
  MapPin,
  Palette,
  MessageCircle,
  type LucideIcon
} from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { buildMfaRedirect, getMfaRouteRequirement } from "@/lib/authSecurity";
import { LanguageSelector } from "@/components/LanguageSelector";
import { WhatsAppSupportButton } from "@/components/WhatsAppSupportButton";
import { AccountOnHoldBanner, AccountOnHoldPanel, useAccountRestoredNotice } from "@/components/dashboard/AccountOnHoldPanel";
import { useI18n, type TranslationKey } from "@/contexts/I18nProvider";
import {
  CorporateBrandingProvider,
  fetchCorporateBranding,
  getCorporateBrandingStyle,
  getDefaultCorporateBranding,
  type CorporateBrandingSettings,
} from "@/contexts/CorporateBrandingContext";

type DashboardNavItem = {
  nameKey?: TranslationKey;
  name?: string;
  href: string;
  icon: LucideIcon;
  badgeCount?: number;
  children?: DashboardNavItem[];
};

type DashboardLocation = {
  id: string;
  name: string;
  status: string;
};

type BusinessOverdueReminderInvoice = {
  invoiceId: string;
  businessId: string;
  businessName: string;
  invoiceNumber: string;
  dueDate: string;
  outstandingAmount: number;
  currency: string;
  status: string;
};

type ManualPaymentReminder = {
  id: string;
  businessId: string;
  businessName: string;
  message: string;
  sentAt: string;
  invoiceId: string | null;
  invoiceNumber: string | null;
  dueDate: string | null;
  outstandingAmount: number | null;
  currency: string;
  billingPeriod?: string | null;
  referenceNote?: string | null;
  status: string;
};

function isContractExpiredForDashboard(businessRecord: any) {
  if (!businessRecord?.contract_end_date) return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const contractEnd = new Date(`${businessRecord.contract_end_date}T00:00:00`);
  return businessRecord.contract_status === "expired" || contractEnd <= today;
}

type DashboardLayoutSnapshot = {
  userId: string;
  savedAt: number;
  isSuperAdmin: boolean;
  business: any;
  isExpiredContract: boolean;
  securityAlertsVisible: boolean;
  securityUnreadCount: number;
  quickStampQrEnabled: boolean;
  advancedAnalyticsEnabled: boolean;
  locationsManagementEnabled: boolean;
  corporateBrandingEnabled: boolean;
  corporateBranding: CorporateBrandingSettings | null;
  dashboardLocations: DashboardLocation[];
  activeLocationId: string;
  isTrial: boolean;
  isExpiredTrial: boolean;
  trialDaysLeft: number;
  trialEndDate: string | null;
};

const DASHBOARD_SNAPSHOT_MAX_AGE_MS = 5 * 60 * 1000;
const REMINDER_POLL_INTERVAL_MS = 60 * 1000;
let dashboardLayoutSnapshot: DashboardLayoutSnapshot | null = null;

type BusinessOverdueReminderSnapshot = {
  userId: string;
  businessId: string;
  savedAt: number;
  invoices: BusinessOverdueReminderInvoice[];
  manualReminders: ManualPaymentReminder[];
};

let businessOverdueReminderSnapshot: BusinessOverdueReminderSnapshot | null = null;
const WHATS_NEW_READ_KEY = "whatsNewRead_v2";

async function loadSecurityAlertsSummary(businessId: string, accessToken: string) {
  try {
    const response = await fetch(`/api/business/security-alerts?businessId=${encodeURIComponent(businessId)}&limit=1&summary=1`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      return { visible: false, unreadCount: 0 };
    }

    const payload = await response.json();
    return { visible: true, unreadCount: Number(payload.unreadCount || 0) };
  } catch (securityAlertError) {
    console.error("Security alerts summary error:", securityAlertError);
    return { visible: false, unreadCount: 0 };
  }
}

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { toast } = useToast();
  const { t } = useI18n();
  const [business, setBusiness] = useState<any>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [hasNoBusiness, setHasNoBusiness] = useState(false);
  const [isExpiredContract, setIsExpiredContract] = useState(false);
  const [quickStampQrEnabled, setQuickStampQrEnabled] = useState(false);
  const [advancedAnalyticsEnabled, setAdvancedAnalyticsEnabled] = useState(false);
  const [locationsManagementEnabled, setLocationsManagementEnabled] = useState(false);
  const [corporateBrandingEnabled, setCorporateBrandingEnabled] = useState(false);
  const [securityAlertsVisible, setSecurityAlertsVisible] = useState(false);
  const [securityUnreadCount, setSecurityUnreadCount] = useState(0);
  const [corporateBranding, setCorporateBranding] = useState<CorporateBrandingSettings | null>(null);
  const [dashboardLocations, setDashboardLocations] = useState<DashboardLocation[]>([]);
  const [activeLocationId, setActiveLocationId] = useState("");
  
  // Trial states
  const [isExpiredTrial, setIsExpiredTrial] = useState(false);
  const [isTrial, setIsTrial] = useState(false);
  const [trialDaysLeft, setTrialDaysLeft] = useState(0);
  const [trialEndDate, setTrialEndDate] = useState<string | null>(null);
  const [overdueReminderInvoices, setOverdueReminderInvoices] = useState<BusinessOverdueReminderInvoice[]>([]);
  const [overdueReminderOpen, setOverdueReminderOpen] = useState(false);
  const [dismissingOverdueReminder, setDismissingOverdueReminder] = useState(false);
  const [manualPaymentReminders, setManualPaymentReminders] = useState<ManualPaymentReminder[]>([]);
  const [manualPaymentReminderOpen, setManualPaymentReminderOpen] = useState(false);
  const [dismissingManualReminderId, setDismissingManualReminderId] = useState<string | null>(null);
  const dismissedManualReminderIdsRef = useRef<Set<string>>(new Set());

  const [isWhatsNewOpen, setIsWhatsNewOpen] = useState(false);
  const [hasReadWhatsNew, setHasReadWhatsNew] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const read = localStorage.getItem(WHATS_NEW_READ_KEY);
      if (read) setHasReadWhatsNew(true);
    }
    checkUserAndBusiness();
  }, []);

  const handleOpenWhatsNew = () => {
    setIsWhatsNewOpen(true);
    setHasReadWhatsNew(true);
    if (typeof window !== "undefined") {
      localStorage.setItem(WHATS_NEW_READ_KEY, "true");
    }
  };
  
  const fetchSecurityAlertsSummary = async (businessId: string, accessToken: string) => {
    const summary = await loadSecurityAlertsSummary(businessId, accessToken);
    setSecurityAlertsVisible(summary.visible);
    setSecurityUnreadCount(summary.unreadCount);
  };

  const applySnapshot = (snapshot: DashboardLayoutSnapshot) => {
    setIsSuperAdmin(snapshot.isSuperAdmin);
    setBusiness(snapshot.business);
    setHasNoBusiness(false);
    setIsExpiredContract(snapshot.isExpiredContract);
    setSecurityAlertsVisible(snapshot.securityAlertsVisible);
    setSecurityUnreadCount(snapshot.securityUnreadCount);
    setQuickStampQrEnabled(snapshot.quickStampQrEnabled);
    setAdvancedAnalyticsEnabled(snapshot.advancedAnalyticsEnabled);
    setLocationsManagementEnabled(snapshot.locationsManagementEnabled);
    setCorporateBrandingEnabled(snapshot.corporateBrandingEnabled);
    setCorporateBranding(snapshot.corporateBranding);
    setDashboardLocations(snapshot.dashboardLocations);
    setActiveLocationId(snapshot.activeLocationId);
    setIsTrial(snapshot.isTrial);
    setIsExpiredTrial(snapshot.isExpiredTrial);
    setTrialDaysLeft(snapshot.trialDaysLeft);
    setTrialEndDate(snapshot.trialEndDate);
    setLoading(false);
  };

  const applyOverdueReminderInvoices = (invoices: BusinessOverdueReminderInvoice[]) => {
    setOverdueReminderInvoices(invoices);
    setOverdueReminderOpen(invoices.length > 0);
  };

  const applyManualPaymentReminders = (reminders: ManualPaymentReminder[]) => {
    const visibleReminders = reminders.filter((reminder) => !dismissedManualReminderIdsRef.current.has(reminder.id));
    setManualPaymentReminders(visibleReminders);
    setManualPaymentReminderOpen(visibleReminders.length > 0);
  };

  const fetchBusinessOverdueReminder = async (businessId: string, userId: string, accessToken: string, force = false) => {
    const cachedSnapshot = businessOverdueReminderSnapshot;
    const hasFreshSnapshot = Boolean(
      !force &&
      cachedSnapshot &&
      cachedSnapshot.userId === userId &&
      cachedSnapshot.businessId === businessId &&
      Date.now() - cachedSnapshot.savedAt < DASHBOARD_SNAPSHOT_MAX_AGE_MS
    );

    if (hasFreshSnapshot && cachedSnapshot) {
      applyOverdueReminderInvoices(cachedSnapshot.invoices);
      applyManualPaymentReminders(cachedSnapshot.manualReminders);
      return;
    }

    try {
      const response = await fetch("/api/business/overdue-reminder", {
        cache: "no-store",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json",
        },
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.success) {
        throw new Error(result.error || "Overdue reminder check failed.");
      }

      const invoices = Array.isArray(result.invoices)
        ? result.invoices.filter((invoice: BusinessOverdueReminderInvoice) => invoice.businessId === businessId)
        : [];

      const manualReminders = Array.isArray(result.manualReminders)
        ? result.manualReminders.filter((reminder: ManualPaymentReminder) => reminder.businessId === businessId)
        : [];

      businessOverdueReminderSnapshot = {
        userId,
        businessId,
        savedAt: Date.now(),
        invoices,
        manualReminders,
      };

      applyOverdueReminderInvoices(invoices);
      applyManualPaymentReminders(manualReminders);
    } catch (reminderError) {
      console.error("Business overdue reminder check failed:", reminderError);
      if (!force) {
        applyOverdueReminderInvoices([]);
        applyManualPaymentReminders([]);
      }
    }
  };

  const handleDismissOverdueReminder = async () => {
    if (!business?.id || overdueReminderInvoices.length === 0) {
      setOverdueReminderOpen(false);
      return;
    }

    try {
      setDismissingOverdueReminder(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const response = await fetch("/api/business/overdue-reminder", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
          Accept: "application/json",
        },
        body: JSON.stringify({
          businessId: business.id,
          invoiceIds: overdueReminderInvoices.map((invoice) => invoice.invoiceId),
        }),
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.success) {
        throw new Error(result.error || "Could not dismiss overdue invoice reminder.");
      }

      businessOverdueReminderSnapshot = {
        userId: session.user.id,
        businessId: business.id,
        savedAt: Date.now(),
        invoices: [],
        manualReminders: manualPaymentReminders,
      };

      setOverdueReminderInvoices([]);
      setOverdueReminderOpen(false);
    } catch (dismissError: any) {
      toast({
        title: "Reminder dismissal failed",
        description: dismissError.message,
        variant: "destructive",
      });
    } finally {
      setDismissingOverdueReminder(false);
    }
  };

  const handleDismissManualPaymentReminder = async (reminderId: string) => {
    try {
      setDismissingManualReminderId(reminderId);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const response = await fetch("/api/business/overdue-reminder", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
          Accept: "application/json",
        },
        body: JSON.stringify({ manualReminderId: reminderId }),
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.success) {
        throw new Error(result.error || "Could not dismiss manual payment reminder.");
      }

      dismissedManualReminderIdsRef.current.add(reminderId);
      const nextReminders = manualPaymentReminders.filter((reminder) => reminder.id !== reminderId);
      businessOverdueReminderSnapshot = business?.id ? {
        userId: session.user.id,
        businessId: business.id,
        savedAt: Date.now(),
        invoices: overdueReminderInvoices,
        manualReminders: nextReminders,
      } : null;

      setManualPaymentReminders(nextReminders);
      setManualPaymentReminderOpen(nextReminders.length > 0);
    } catch (dismissError: any) {
      toast({
        title: "Manual reminder dismissal failed",
        description: dismissError.message,
        variant: "destructive",
      });
    } finally {
      setDismissingManualReminderId(null);
    }
  };

  useEffect(() => {
    if (!business?.id || !currentUserId) return;

    const businessId = business.id;
    const userId = currentUserId;
    let cancelled = false;

    const checkReminders = async (force: boolean) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session || cancelled) return;
      await fetchBusinessOverdueReminder(businessId, userId, session.access_token, force);
    };

    void checkReminders(false);

    const intervalId = window.setInterval(() => {
      if (document.visibilityState === "visible") void checkReminders(true);
    }, REMINDER_POLL_INTERVAL_MS);

    const handleFocus = () => void checkReminders(true);
    const handleVisibility = () => {
      if (document.visibilityState === "visible") void checkReminders(true);
    };

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [business?.id, currentUserId]);

  const checkUserAndBusiness = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      dashboardLayoutSnapshot = null;
      router.push("/auth/login");
      return;
    }

    setCurrentUserId(session.user.id);

    const mfaRequirement = await getMfaRouteRequirement();
    if (mfaRequirement.required) {
      router.replace(buildMfaRedirect(router.asPath));
      return;
    }

    const cachedSnapshot = dashboardLayoutSnapshot;
    const hasFreshSnapshot = Boolean(
      cachedSnapshot &&
      cachedSnapshot.userId === session.user.id &&
      Date.now() - cachedSnapshot.savedAt < DASHBOARD_SNAPSHOT_MAX_AGE_MS
    );

    if (hasFreshSnapshot && cachedSnapshot) {
      applySnapshot(cachedSnapshot);
    }

    try {
      const [profileResult, workspaceResult] = await Promise.all([
        supabase
          .from("profiles")
          .select("is_super_admin")
          .eq("id", session.user.id)
          .maybeSingle(),
        (supabase as any).rpc("get_business_dashboard_access_status"),
      ]);

      const isSuperAdminUser = Boolean(profileResult.data?.is_super_admin);
      setIsSuperAdmin(isSuperAdminUser);

      if (workspaceResult.error) {
        console.error("Dashboard access status error:", workspaceResult.error);
      }

      const workspaceRows = workspaceResult.data;
      const resolvedBusiness = Array.isArray(workspaceRows) ? workspaceRows[0] : workspaceRows;

      if (!resolvedBusiness) {
        dashboardLayoutSnapshot = null;
        setHasNoBusiness(true);
        setLoading(false);
        return;
      }

      const isExpiredContractValue =
        resolvedBusiness.access_state === "contract_expired" || isContractExpiredForDashboard(resolvedBusiness);

      setBusiness(resolvedBusiness);
      setHasNoBusiness(false);
      setIsExpiredContract(isExpiredContractValue);

      const entitlementKeys = ["quick_stamp_qr", "advanced_analytics", "corporate_branding", "location_management"] as const;

      const entitlementsPromise = Promise.all(entitlementKeys.map(async (key) => {
        const { data, error } = await (supabase as any).rpc("get_business_boolean_entitlement", {
          p_business_id: resolvedBusiness.id,
          p_key: key,
          p_fallback: false,
        });

        if (error) {
          console.error(`Dashboard entitlement check failed for ${key}:`, error);
          return [key, false] as const;
        }

        return [key, Boolean(data)] as const;
      }));

      const brandingPromise = entitlementsPromise.then(async (entries) => {
        const entitlements = Object.fromEntries(entries) as Record<typeof entitlementKeys[number], boolean>;

        if (!entitlements.corporate_branding) {
          return { branding: null as CorporateBrandingSettings | null, enabled: false };
        }

        try {
          const brandingResult = await fetchCorporateBranding(resolvedBusiness.id, session.access_token);
          const canUseCorporateBranding = brandingResult.status === "available";
          return {
            branding: canUseCorporateBranding ? brandingResult.branding : null,
            enabled: canUseCorporateBranding && brandingResult.can_manage,
          };
        } catch (brandingError) {
          console.error("Corporate branding load error:", brandingError);
          return { branding: null as CorporateBrandingSettings | null, enabled: false };
        }
      });

      const securityAlertsAccessPromise = Promise.all([
        supabase
          .from("businesses")
          .select("owner_id")
          .eq("id", resolvedBusiness.id)
          .maybeSingle(),
        supabase
          .from("business_users")
          .select("role, status")
          .eq("business_id", resolvedBusiness.id)
          .eq("user_id", session.user.id)
          .eq("status", "active")
          .in("role", ["owner", "admin", "corporate_admin"])
          .maybeSingle(),
      ]).then(([businessOwnerResult, managerRoleResult]) => {
        if (businessOwnerResult.error || managerRoleResult.error) {
          return false;
        }

        return Boolean(
          isSuperAdminUser ||
          businessOwnerResult.data?.owner_id === session.user.id ||
          managerRoleResult.data
        );
      });

      const locationsPromise = entitlementsPromise.then(async (entries) => {
        const entitlements = Object.fromEntries(entries) as Record<typeof entitlementKeys[number], boolean>;
        
        if (!entitlements.location_management) {
          return null;
        }

        try {
          const locationResponse = await fetch(`/api/business/locations?business_id=${resolvedBusiness.id}`, {
            headers: {
              Authorization: `Bearer ${session.access_token}`,
            },
          });

          if (!locationResponse.ok) {
            return null;
          }

          return await locationResponse.json();
        } catch (locationError) {
          console.error("Dashboard authorized location switcher error:", locationError);
          return null;
        }
      });

      const [
        canLoadSecurityAlerts,
        quickStampResult,
        entitlementEntries,
        brandingValue,
        locationBody,
        planResult,
      ] = await Promise.all([
        securityAlertsAccessPromise,
        (supabase as any).rpc("business_has_active_quick_stamp_qr", {
          p_business_id: resolvedBusiness.id,
        }),
        entitlementsPromise,
        brandingPromise,
        locationsPromise,
        supabase
          .from("subscription_plans")
          .select("is_trial, trial_days")
          .eq("id", resolvedBusiness.subscription_plan || "starter")
          .maybeSingle(),
      ]);

      const securitySummary = canLoadSecurityAlerts
        ? await loadSecurityAlertsSummary(resolvedBusiness.id, session.access_token)
        : { visible: false, unreadCount: 0 };

      if (quickStampResult.error) {
        console.error("Quick Issue Stamp access error:", quickStampResult.error);
      }

      const featureEntitlements = Object.fromEntries(entitlementEntries) as Record<typeof entitlementKeys[number], boolean>;
      const quickStampEnabledValue = Boolean(quickStampResult.data) || featureEntitlements.quick_stamp_qr;

      let locationsEnabledValue = false;
      let availableLocations: DashboardLocation[] = [];
      let activeLocationValue = "";

      if (locationBody) {
        availableLocations = ((locationBody.locations || []) as DashboardLocation[])
          .filter((location) => location.status !== "inactive");
        const hasLocationManagement = Number(locationBody.maxLocations || 0) > 0;
        locationsEnabledValue = hasLocationManagement && resolvedBusiness.owner_id === session.user.id;

        if (typeof window !== "undefined" && availableLocations.length > 0) {
          const storedLocationId = window.localStorage.getItem(`active_location_${resolvedBusiness.id}`) || "";
          activeLocationValue = storedLocationId === "all" || availableLocations.some((location) => location.id === storedLocationId)
            ? storedLocationId || "all"
            : availableLocations[0].id;

          if (!hasFreshSnapshot || cachedSnapshot?.activeLocationId !== activeLocationValue) {
            publishActiveLocationChange(resolvedBusiness.id, activeLocationValue);
          }
        }
      }

      let isTrialValue = false;
      let isExpiredTrialValue = false;
      let trialDaysLeftValue = 0;
      let trialEndDateValue: string | null = null;
      const planData = planResult.data;

      if (planData?.is_trial && resolvedBusiness.trial_end) {
        isTrialValue = true;
        const now = new Date();
        const trialEnd = new Date(resolvedBusiness.trial_end);
        trialEndDateValue = trialEnd.toLocaleDateString(undefined, {
          month: "long",
          day: "numeric",
          year: "numeric",
        });

        if (now > trialEnd) {
          isExpiredTrialValue = true;
        } else {
          const diffTime = trialEnd.getTime() - now.getTime();
          trialDaysLeftValue = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
        }
      }

      const nextSnapshot: DashboardLayoutSnapshot = {
        userId: session.user.id,
        savedAt: Date.now(),
        isSuperAdmin: isSuperAdminUser,
        business: resolvedBusiness,
        isExpiredContract: isExpiredContractValue,
        securityAlertsVisible: securitySummary.visible,
        securityUnreadCount: securitySummary.unreadCount,
        quickStampQrEnabled: quickStampEnabledValue,
        advancedAnalyticsEnabled: featureEntitlements.advanced_analytics,
        locationsManagementEnabled: locationsEnabledValue,
        corporateBrandingEnabled: brandingValue.enabled,
        corporateBranding: brandingValue.branding,
        dashboardLocations: availableLocations,
        activeLocationId: activeLocationValue,
        isTrial: isTrialValue,
        isExpiredTrial: isExpiredTrialValue,
        trialDaysLeft: trialDaysLeftValue,
        trialEndDate: trialEndDateValue,
      };

      dashboardLayoutSnapshot = nextSnapshot;
      applySnapshot(nextSnapshot);
    } catch (err) {
      console.error("Dashboard layout error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    dashboardLayoutSnapshot = null;
    await supabase.auth.signOut();
    router.push("/");
  };

  const publishActiveLocationChange = (businessId: string, locationId: string) => {
    window.localStorage.setItem(`active_location_${businessId}`, locationId);
    window.dispatchEvent(new CustomEvent("royalty-active-location-change", {
      detail: { businessId, locationId },
    }));
  };

  const handleActiveLocationChange = (locationId: string) => {
    if (!business?.id) return;
    publishActiveLocationChange(business.id, locationId);
    setActiveLocationId(locationId);
  };

  useEffect(() => {
    if (!business?.id || typeof window === "undefined") return;

    const handleExternalLocationChange = (event: Event) => {
      const detail = (event as CustomEvent<{ businessId?: string; locationId?: string }>).detail;
      if (detail?.businessId !== business.id) return;

      const nextLocationId = detail.locationId || "all";
      if (nextLocationId === "all" || dashboardLocations.some((location) => location.id === nextLocationId)) {
        setActiveLocationId(nextLocationId);
      }
    };

    window.addEventListener("royalty-active-location-change", handleExternalLocationChange);
    return () => window.removeEventListener("royalty-active-location-change", handleExternalLocationChange);
  }, [business?.id, dashboardLocations]);

  const activeLocationSwitcher = dashboardLocations.length > 0 ? (
    <label className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
      <MapPin className="h-4 w-4 text-primary" />
      <span className="hidden xl:inline">{t("dashboard.locationSwitcher.label" as TranslationKey)}</span>
      <select
        className="h-9 max-w-[210px] rounded-md border border-input bg-background px-2 text-sm font-medium text-foreground"
        value={activeLocationId}
        onChange={(event) => handleActiveLocationChange(event.target.value)}
        aria-label={t("dashboard.locationSwitcher.label" as TranslationKey)}
      >
        <option value="all">{t("dashboard.analytics.corporateWide" as TranslationKey)}</option>
        {dashboardLocations.map((location) => (
          <option key={location.id} value={location.id}>{location.name}</option>
        ))}
      </select>
    </label>
  ) : null;

  const navItems: DashboardNavItem[] = [
    { nameKey: "dashboard.nav.overview", href: "/dashboard", icon: LayoutDashboard },
    ...(advancedAnalyticsEnabled ? [{ nameKey: "dashboard.nav.advancedAnalytics" as TranslationKey, href: "/dashboard/analytics", icon: BarChart3 }] : []),
    ...(locationsManagementEnabled ? [{ nameKey: "dashboard.nav.locations" as TranslationKey, href: "/dashboard/locations", icon: MapPin }] : []),
    ...(corporateBrandingEnabled ? [{ nameKey: "dashboard.nav.corporateBranding" as TranslationKey, href: "/dashboard/corporate-branding", icon: Palette }] : []),
    {
      nameKey: "dashboard.nav.stampsRewards",
      href: "/dashboard/scan",
      icon: ScanLine,
      children: [
        { nameKey: "dashboard.nav.issueStamp", href: "/dashboard/scan", icon: ScanLine },
        { nameKey: "dashboard.nav.redeemReward", href: "/dashboard/scan", icon: Gift },
        ...(quickStampQrEnabled ? [{ nameKey: "dashboard.nav.quickQr" as TranslationKey, href: "/dashboard/quick-stamp-qr", icon: Zap }] : []),
      ],
    },
    { nameKey: "dashboard.nav.loyaltyPrograms", href: "/dashboard/programs", icon: Gift },
    { nameKey: "dashboard.nav.customers", href: "/dashboard/customers", icon: Users },
    { nameKey: "dashboard.nav.qrCodes", href: "/dashboard/qr", icon: QrCode },
    { nameKey: "dashboard.nav.billing", href: "/dashboard/billing", icon: CreditCard },
    { nameKey: "dashboard.nav.staff", href: "/dashboard/staff", icon: Users },
    ...(securityAlertsVisible ? [{ name: "Security Alerts", href: "/dashboard/security-alerts", icon: ShieldAlert, badgeCount: securityUnreadCount }] : []),
    { nameKey: "dashboard.nav.settings", href: "/dashboard/settings", icon: Settings },
  ];

  const corporateBrandingStyle = getCorporateBrandingStyle(corporateBranding);
  const corporateLogoUrl = corporateBranding?.logo_url || "";
  const corporatePrimaryColor = corporateBranding?.primary_color || undefined;
  const isOnHold = business?.status === "on_hold";
  const isHoldAllowedPath = router.pathname.startsWith("/dashboard/billing") || router.pathname.startsWith("/dashboard/settings");

  useAccountRestoredNotice(business?.id, Boolean(business?.id) && !isOnHold && business?.status === "active");

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Skeleton className="h-12 w-12 rounded-full" />
          <p className="text-muted-foreground font-medium">{t("common.loadingWorkspace")}</p>
        </div>
      </div>
    );
  }
  
  if (hasNoBusiness) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center space-y-6">
        <div className="p-4 bg-destructive/10 rounded-full text-destructive">
          <ShieldAlert className="h-16 w-16" />
        </div>
        <div className="max-w-md space-y-3">
          <h1 className="text-3xl font-heading font-bold text-foreground">{t("dashboard.accessDenied.title")}</h1>
          <p className="text-muted-foreground">
            {t("dashboard.accessDenied.description")}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-4 pt-4">
          <Button onClick={() => router.push("/onboarding")} className="bg-primary text-white font-bold px-8">
            {t("dashboard.accessDenied.createBusiness")}
          </Button>
          <Button onClick={handleLogout} variant="outline" className="px-8">
            {t("common.signOut")}
          </Button>
        </div>
      </div>
    );
  }

  // Handle Expired Contract Blocking
  if (isExpiredContract && !isOnHold) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center space-y-6">
        <div className="p-4 bg-destructive/10 rounded-full text-destructive">
          <ShieldAlert className="h-16 w-16" />
        </div>
        <div className="max-w-md space-y-3">
          <h1 className="text-3xl font-heading font-bold text-foreground">{t("dashboard.contractExpired.title")}</h1>
          <p className="text-muted-foreground">
            {t("dashboard.contractExpired.description")}
          </p>
        </div>
        <Button onClick={handleLogout} variant="outline">{t("common.signOut")}</Button>
      </div>
    );
  }

  // Handle Expired Trial Blocking
  if (isExpiredTrial && !isOnHold && !router.pathname.includes("/dashboard/billing")) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center space-y-6">
        <div className="p-4 bg-amber-500/10 rounded-full text-amber-500">
          <ShieldAlert className="h-16 w-16" />
        </div>
        <div className="max-w-md space-y-3">
          <h1 className="text-3xl font-heading font-bold text-foreground">{t("dashboard.trialExpired.title")}</h1>
          <p className="text-muted-foreground">
            {t("dashboard.trialExpired.description")}
          </p>
        </div>
        <div className="flex items-center gap-4 pt-4">
          <Button onClick={handleLogout} variant="outline">{t("common.signOut")}</Button>
          <Link href="/dashboard/billing">
            <Button className="bg-primary text-white hover:bg-primary/90 font-bold px-8 shadow-md">{t("dashboard.trialExpired.upgrade")}</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (business?.status === "suspended") {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center space-y-6">
        <div className="p-4 bg-destructive/10 rounded-full text-destructive">
          <ShieldAlert className="h-16 w-16" />
        </div>
        <div className="max-w-md space-y-2">
          <h1 className="text-3xl font-heading font-bold text-foreground">{t("dashboard.suspended.title")}</h1>
          <p className="text-muted-foreground">
            {t("dashboard.suspended.description")}
          </p>
        </div>
        <Button onClick={handleLogout} variant="outline">{t("common.signOut")}</Button>
      </div>
    );
  }

  if (business?.status === "pending") {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center space-y-6">
        <div className="p-4 bg-amber-500/10 rounded-full text-amber-500">
          <ShieldAlert className="h-16 w-16" />
        </div>
        <div className="max-w-md space-y-2">
          <h1 className="text-3xl font-heading font-bold text-foreground">{t("dashboard.pending.title")}</h1>
          <p className="text-muted-foreground">
            {t("dashboard.pending.description")}
          </p>
        </div>
        <Button onClick={handleLogout} variant="outline">{t("common.signOut")}</Button>
      </div>
    );
  }

  return (
    <CorporateBrandingProvider value={corporateBranding}>
      <div className="min-h-screen bg-background flex" style={corporateBrandingStyle}>
        {/* Mobile Sidebar Overlay */}
        {isMobileOpen && (
          <div 
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={() => setIsMobileOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside className={`
          fixed inset-y-0 left-0 z-50 w-64 bg-card border-r border-border transform transition-transform duration-200 ease-in-out flex flex-col
          lg:relative lg:translate-x-0
          ${isMobileOpen ? "translate-x-0" : "-translate-x-full"}
        `}>
          <div className="p-6 flex items-center justify-between border-b border-border">
            <Link href="/dashboard" className="flex items-center gap-2">
              {corporateLogoUrl ? (
                <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded bg-background ring-1 ring-border">
                  <img src={corporateLogoUrl} alt={business?.business_name || "Corporate logo"} className="h-full w-full object-contain p-1" />
                </span>
              ) : (
                <div className="w-8 h-8 bg-primary rounded flex items-center justify-center text-primary-foreground font-bold text-xl shrink-0" style={{ backgroundColor: corporatePrimaryColor }}>
                  {business?.business_name?.charAt(0) || "A"}
                </div>
              )}
              <div className="flex flex-col min-w-0">
                <span className="font-heading font-semibold text-foreground truncate block">
                  {business?.business_name}
                </span>
                {business?.subscription_plan === 'business' && (
                  <span className="text-[9px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded w-max mt-0.5 tracking-wider uppercase">
                    {t("dashboard.plan.business")}
                  </span>
                )}
                {business?.subscription_plan === 'enterprise' && (
                  <span className="text-[9px] font-bold text-amber-700 bg-amber-500/10 px-1.5 py-0.5 rounded w-max mt-0.5 tracking-wider uppercase border border-amber-500/20 font-serif">
                    ★ {t("dashboard.plan.enterprise")}
                  </span>
                )}
              </div>
            </Link>
            <button className="lg:hidden" onClick={() => setIsMobileOpen(false)}>
              <X className="h-5 w-5 text-muted-foreground" />
            </button>
          </div>

          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {isSuperAdmin && (
              <Link href="/admin">
                <span className={`
                  flex items-center gap-3 px-3 py-2.5 mb-4 rounded-md text-sm font-semibold transition-colors bg-amber-500/10 text-amber-600 hover:bg-amber-500/20
                `}>
                  <ShieldAlert className="h-5 w-5" />
                  {t("dashboard.nav.superAdminPanel")}
                </span>
              </Link>
            )}

            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = router.pathname === item.href || router.pathname.startsWith(`${item.href}/`);
              const children = "children" in item ? item.children : undefined;

              if (children?.length) {
                const isGroupActive = isActive || children.some((child) => router.pathname === child.href || router.pathname.startsWith(`${child.href}/`));

                return (
                  <div key={item.nameKey} className="space-y-1">
                    <Link href={item.href}>
                      <span className={`
                        flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors
                        ${isGroupActive 
                          ? "bg-primary/10 text-primary" 
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"}
                      `}>
                        <Icon className="h-5 w-5" />
                        {item.nameKey ? t(item.nameKey) : item.name}
                        {item.badgeCount ? (
                          <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">
                            {item.badgeCount > 99 ? "99+" : item.badgeCount}
                          </span>
                        ) : null}
                      </span>
                    </Link>

                    <div className="ml-4 space-y-1 border-l border-border pl-3">
                      {children.map((child) => {
                        const ChildIcon = child.icon;
                        const isChildActive = router.pathname === child.href || router.pathname.startsWith(`${child.href}/`);

                        return (
                          <Link key={child.nameKey} href={child.href}>
                            <span className={`
                              flex items-center gap-2 rounded-md px-3 py-2 text-xs font-semibold transition-colors
                              ${isChildActive 
                                ? "bg-primary/10 text-primary" 
                                : "text-muted-foreground hover:bg-muted hover:text-foreground"}
                            `}>
                              <ChildIcon className="h-4 w-4" />
                              {child.nameKey ? t(child.nameKey) : child.name}
                            </span>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                );
              }

              return (
                <Link key={item.href} href={item.href}>
                  <span className={`
                    flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors
                    ${isActive 
                      ? "bg-primary/10 text-primary" 
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"}
                  `}>
                    <Icon className="h-5 w-5" />
                    {item.nameKey ? t(item.nameKey) : item.name}
                    {item.badgeCount ? (
                      <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">
                        {item.badgeCount > 99 ? "99+" : item.badgeCount}
                      </span>
                    ) : null}
                  </span>
                </Link>
              );
            })}
          </nav>
          
          <div className="p-4 border-t border-border bg-card mt-auto shrink-0">
            <button
              onClick={() => {
                window.dispatchEvent(new CustomEvent("show-whatsapp"));
                setIsMobileOpen(false);
              }}
              className="flex w-full items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <MessageCircle className="h-5 w-5" />
              Contact Support
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Top Header Mobile */}
          <header className="lg:hidden flex items-center justify-between p-4 border-b border-border bg-card">
            <div className="flex items-center gap-2 overflow-hidden">
              {corporateLogoUrl ? (
                <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded bg-background ring-1 ring-border">
                  <img src={corporateLogoUrl} alt={business?.business_name || "Corporate logo"} className="h-full w-full object-contain p-1" />
                </span>
              ) : (
                <div className="w-8 h-8 bg-primary rounded flex items-center justify-center text-primary-foreground font-bold text-xl shrink-0" style={{ backgroundColor: corporatePrimaryColor }}>
                  {business?.business_name?.charAt(0) || "A"}
                </div>
              )}
              <span className="font-heading font-semibold text-foreground truncate">
                {business?.business_name}
              </span>
            </div>
            <div className="flex items-center gap-4 shrink-0">
              <LanguageSelector compact />
              {activeLocationSwitcher}
              <button onClick={handleOpenWhatsNew} className="relative">
                <Bell className={`h-5 w-5 text-foreground ${!hasReadWhatsNew ? 'animate-bell-shake' : ''}`} />
                {!hasReadWhatsNew && (
                  <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground font-bold">1</span>
                )}
              </button>
              <button onClick={handleLogout} className="text-muted-foreground hover:text-destructive">
                <LogOut className="h-5 w-5" />
              </button>
              <button onClick={() => setIsMobileOpen(true)}>
                <Menu className="h-6 w-6 text-foreground" />
              </button>
            </div>
          </header>

          {/* Top Header Desktop */}
          <header className="hidden lg:flex items-center justify-end p-4 border-b border-border bg-card">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                className="relative flex items-center gap-2 text-muted-foreground hover:text-foreground"
                onClick={handleOpenWhatsNew}
              >
                <Bell className={`h-4 w-4 ${!hasReadWhatsNew ? 'animate-bell-shake text-primary' : ''}`} />
                <span className="text-sm font-medium">{t("dashboard.whatsNew")}</span>
                {!hasReadWhatsNew && (
                  <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground font-bold">1</span>
                )}
              </Button>
              <LanguageSelector compact />
              {activeLocationSwitcher}
              <Button
                variant="ghost"
                className="flex items-center gap-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                onClick={handleLogout}
              >
                <LogOut className="h-4 w-4" />
                <span className="text-sm font-medium">{t("common.signOut")}</span>
              </Button>
            </div>
          </header>

          {isTrial && !isExpiredTrial && (
            <div className="bg-indigo-600 px-4 py-2.5 flex items-center justify-between gap-4 text-indigo-50 shadow-sm z-10">
              <div className="flex flex-wrap items-center gap-2 text-sm font-medium">
                <Gift className="h-4 w-4" /> 
                {t("dashboard.trial.endsSoon")} <span className="font-bold">{t("dashboard.trial.daysRemaining", { days: trialDaysLeft })}</span>
                {trialEndDate && <span className="text-indigo-100">· {trialEndDate}</span>}
              </div>
              <Link href="/dashboard/billing">
                <span className="text-xs font-bold uppercase tracking-wide bg-white/20 hover:bg-white/30 transition-colors px-3 py-1 rounded-full cursor-pointer">{t("dashboard.trial.upgradePlan")}</span>
              </Link>
            </div>
          )}

          <div className="flex-1 overflow-y-auto p-4 md:p-8">
            {isOnHold && !isHoldAllowedPath ? (
              <AccountOnHoldPanel businessId={business.id} />
            ) : (
              <>
                {isOnHold && <AccountOnHoldBanner />}
                {children}
              </>
            )}
          </div>
        </main>

        {/* What's New Sheet */}
        <Sheet open={isWhatsNewOpen} onOpenChange={setIsWhatsNewOpen}>
          <SheetContent className="overflow-y-auto w-full sm:max-w-md z-[60]">
            <SheetHeader className="mb-6">
              <SheetTitle className="flex items-center gap-2 text-2xl font-heading">
                <Bell className="h-6 w-6 text-primary" />
                {t("dashboard.whatsNew")}
              </SheetTitle>
            </SheetHeader>

            <div className="space-y-8">
              <div>
                <div className="space-y-4">
                  <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">🛠️</span>
                        <h4 className="font-semibold text-foreground">{t("dashboard.whatsNew.setupAssistance.title" as TranslationKey)}</h4>
                      </div>
                      <span className="text-[10px] font-bold bg-primary text-primary-foreground px-2 py-1 rounded-full uppercase">
                        {t("common.new")}
                      </span>
                    </div>

                    <div className="space-y-3">
                      <p className="text-sm font-semibold text-foreground">
                        {t("dashboard.whatsNew.setupAssistance.description" as TranslationKey)}
                      </p>

                      <div className="pt-2 space-y-2">
                        <div className="flex items-start gap-2 text-sm text-muted-foreground">
                          <span className="text-primary mt-0.5">•</span>
                          <span>{t("dashboard.whatsNew.setupAssistance.highlightRequest" as TranslationKey)}</span>
                        </div>
                        <div className="flex items-start gap-2 text-sm text-muted-foreground">
                          <span className="text-primary mt-0.5">•</span>
                          <span>{t("dashboard.whatsNew.setupAssistance.highlightConfigure" as TranslationKey)}</span>
                        </div>
                        <div className="flex items-start gap-2 text-sm text-muted-foreground">
                          <span className="text-primary mt-0.5">•</span>
                          <span>{t("dashboard.whatsNew.setupAssistance.highlightBranding" as TranslationKey)}</span>
                        </div>
                        <div className="flex items-start gap-2 text-sm text-muted-foreground">
                          <span className="text-primary mt-0.5">•</span>
                          <span>{t("dashboard.whatsNew.setupAssistance.highlightApprove" as TranslationKey)}</span>
                        </div>
                      </div>

                      <div className="pt-3">
                        <Button asChild size="sm">
                          <Link href="/dashboard/settings">{t("dashboard.whatsNew.setupAssistance.cta" as TranslationKey)}</Link>
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </SheetContent>
        </Sheet>

        <Dialog
          open={overdueReminderOpen && overdueReminderInvoices.length > 0}
          onOpenChange={(open) => {
            if (!open && !dismissingOverdueReminder) {
              void handleDismissOverdueReminder();
            }
          }}
        >
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Outstanding Invoice Reminder</DialogTitle>
              <DialogDescription>
                Your subscription invoice is overdue. Please contact Royalty Stamp administration to settle your outstanding invoice.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              {overdueReminderInvoices.map((invoice) => (
                <div key={invoice.invoiceId} className="space-y-2 rounded-xl border bg-muted/30 p-4 text-sm">
                  <div className="flex justify-between gap-4">
                    <span className="text-muted-foreground">Invoice number</span>
                    <span className="font-mono text-right">{invoice.invoiceNumber}</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-muted-foreground">Due date</span>
                    <span className="font-semibold text-right">{invoice.dueDate || "-"}</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-muted-foreground">Outstanding amount</span>
                    <span className="font-semibold text-right">{invoice.currency || "AWG"} {Number(invoice.outstandingAmount || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-muted-foreground">Status</span>
                    <span className="rounded-full bg-destructive px-2 py-0.5 text-xs font-semibold uppercase text-destructive-foreground">Overdue</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-end pt-2">
              <Button type="button" onClick={handleDismissOverdueReminder} disabled={dismissingOverdueReminder}>
                {dismissingOverdueReminder ? "Closing..." : "Close"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog
          open={manualPaymentReminderOpen && manualPaymentReminders.length > 0}
          onOpenChange={(open) => {
            if (!open && !dismissingManualReminderId && manualPaymentReminders[0]) {
              void handleDismissManualPaymentReminder(manualPaymentReminders[0].id);
            }
          }}
        >
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Payment Reminder</DialogTitle>
              <DialogDescription>
                A manual payment reminder from Royalty Stamp administration.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {manualPaymentReminders.slice(0, 1).map((reminder) => (
                <div key={reminder.id} className="space-y-4">
                  <div className="whitespace-pre-line rounded-xl border bg-muted/30 p-4 text-sm text-foreground">
                    {reminder.message}
                  </div>
                  <div className="space-y-2 rounded-xl border bg-background p-4 text-sm">
                    <div className="flex justify-between gap-4">
                      <span className="text-muted-foreground">Sent date</span>
                      <span className="font-semibold text-right">{new Date(reminder.sentAt).toLocaleString()}</span>
                    </div>
                    {reminder.invoiceNumber && (
                      <div className="flex justify-between gap-4">
                        <span className="text-muted-foreground">Invoice number</span>
                        <span className="font-mono text-right">{reminder.invoiceNumber}</span>
                      </div>
                    )}
                    {reminder.dueDate && (
                      <div className="flex justify-between gap-4">
                        <span className="text-muted-foreground">Due date</span>
                        <span className="font-semibold text-right">{reminder.dueDate}</span>
                      </div>
                    )}
                    {reminder.billingPeriod && (
                      <div className="flex justify-between gap-4">
                        <span className="text-muted-foreground">Billing period</span>
                        <span className="font-semibold text-right">{reminder.billingPeriod}</span>
                      </div>
                    )}
                    {reminder.outstandingAmount !== null && (
                      <div className="flex justify-between gap-4">
                        <span className="text-muted-foreground">Outstanding amount</span>
                        <span className="font-semibold text-right">{reminder.currency || "AWG"} {Number(reminder.outstandingAmount || 0).toFixed(2)}</span>
                      </div>
                    )}
                    {reminder.referenceNote && (
                      <div className="flex justify-between gap-4">
                        <span className="text-muted-foreground">Reference</span>
                        <span className="font-semibold text-right">{reminder.referenceNote}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex justify-end pt-2">
                    <Button
                      type="button"
                      onClick={() => handleDismissManualPaymentReminder(reminder.id)}
                      disabled={dismissingManualReminderId === reminder.id}
                    >
                      {dismissingManualReminderId === reminder.id ? "Closing..." : "Close"}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </DialogContent>
        </Dialog>

        {/* Floating WhatsApp Support Button */}
        <WhatsAppSupportButton />
      </div>
    </CorporateBrandingProvider>
  );
}