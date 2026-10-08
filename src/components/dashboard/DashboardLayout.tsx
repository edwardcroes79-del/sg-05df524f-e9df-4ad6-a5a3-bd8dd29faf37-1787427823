import { useEffect, useState } from "react";
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
  type LucideIcon
} from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { buildMfaRedirect, getMfaRouteRequirement } from "@/lib/authSecurity";
import { LanguageSelector } from "@/components/LanguageSelector";
import { useI18n, type TranslationKey } from "@/contexts/I18nProvider";

type DashboardNavItem = {
  nameKey?: TranslationKey;
  name?: string;
  href: string;
  icon: LucideIcon;
  children?: DashboardNavItem[];
};

type DashboardLocation = {
  id: string;
  name: string;
  status: string;
};

function isContractExpiredForDashboard(businessRecord: any) {
  if (!businessRecord?.contract_end_date) return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const contractEnd = new Date(`${businessRecord.contract_end_date}T00:00:00`);
  return businessRecord.contract_status === "expired" || contractEnd <= today;
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
  const [dashboardLocations, setDashboardLocations] = useState<DashboardLocation[]>([]);
  const [activeLocationId, setActiveLocationId] = useState("");
  
  // Trial states
  const [isExpiredTrial, setIsExpiredTrial] = useState(false);
  const [isTrial, setIsTrial] = useState(false);
  const [trialDaysLeft, setTrialDaysLeft] = useState(0);

  // What's New states
  const [isWhatsNewOpen, setIsWhatsNewOpen] = useState(false);
  const [comingSoonModalOpen, setComingSoonModalOpen] = useState(false);
  const [hasReadWhatsNew, setHasReadWhatsNew] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const read = localStorage.getItem("whatsNewRead_v1");
      if (read) setHasReadWhatsNew(true);
    }
    checkUserAndBusiness();
  }, []);

  const handleOpenWhatsNew = () => {
    setIsWhatsNewOpen(true);
    setHasReadWhatsNew(true);
    if (typeof window !== "undefined") {
      localStorage.setItem("whatsNewRead_v1", "true");
    }
  };

  useEffect(() => {
    if (!business?.id || !business?.owner_id || !currentUserId) return;
    if (business.owner_id !== currentUserId) return;

    const channel = supabase
      .channel(`owner_stamp_notifications_${business.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "stamp_transactions",
          filter: `business_id=eq.${business.id}`,
        },
        (payload) => {
          const transaction = payload.new as {
            staff_user_id?: string | null;
            customer_id?: string | null;
          };

          if (!transaction.staff_user_id || transaction.staff_user_id === currentUserId) {
            return;
          }

          void (async () => {
            const [{ data: staffProfile }, { data: customer }] = await Promise.all([
              supabase
                .from("profiles")
                .select("full_name, email")
                .eq("id", transaction.staff_user_id)
                .maybeSingle(),
              transaction.customer_id
                ? supabase
                    .from("customers")
                    .select("name")
                    .eq("id", transaction.customer_id)
                    .maybeSingle()
                : Promise.resolve({ data: null }),
            ]);

            const staffName = staffProfile?.full_name || staffProfile?.email || t("dashboard.notifications.staffFallback");
            const customerName = customer?.name || "";

            toast({
              title: t("dashboard.notifications.stampIssuedTitle"),
              description: customerName
                ? t("dashboard.notifications.stampIssuedDescriptionWithCustomer", { staffName, customerName })
                : t("dashboard.notifications.stampIssuedDescription", { staffName }),
            });
          })();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [business?.id, business?.owner_id, currentUserId, toast]);

  const checkUserAndBusiness = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      router.push("/auth/login");
      return;
    }

    setCurrentUserId(session.user.id);

    const mfaRequirement = await getMfaRouteRequirement();
    if (mfaRequirement.required) {
      router.replace(buildMfaRedirect(router.asPath));
      return;
    }

    // Check if is super admin
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_super_admin")
      .eq("id", session.user.id)
      .maybeSingle();

    if (profile?.is_super_admin) {
      setIsSuperAdmin(true);
    }

    try {
      const { data: workspaceRows, error: workspaceError } = await (supabase as any)
        .rpc("get_business_dashboard_access_status");

      if (workspaceError) {
        console.error("Dashboard access status error:", workspaceError);
      }

      const resolvedBusiness = Array.isArray(workspaceRows) ? workspaceRows[0] : workspaceRows;

      if (!resolvedBusiness) {
        setHasNoBusiness(true);
        setLoading(false);
        return;
      }

      setBusiness(resolvedBusiness);
      setIsExpiredContract(
        resolvedBusiness.access_state === "contract_expired" || isContractExpiredForDashboard(resolvedBusiness)
      );

      const { data: hasQuickStampAddon, error: quickStampAccessError } = await (supabase as any)
        .rpc("business_has_active_quick_stamp_qr", {
          p_business_id: resolvedBusiness.id,
        });

      if (quickStampAccessError) {
        console.error("Quick Issue Stamp access error:", quickStampAccessError);
      }

      setQuickStampQrEnabled(Boolean(hasQuickStampAddon) || resolvedBusiness.subscription_plan === "mega_plan");
      setAdvancedAnalyticsEnabled(resolvedBusiness.subscription_plan === "mega_plan");
      setLocationsManagementEnabled(resolvedBusiness.subscription_plan === "mega_plan" && resolvedBusiness.owner_id === session.user.id);
      setCorporateBrandingEnabled(resolvedBusiness.subscription_plan === "mega_plan" && resolvedBusiness.owner_id === session.user.id);

      if (resolvedBusiness.subscription_plan === "mega_plan") {
        const { data: locationRows, error: locationError } = await (supabase as any)
          .from("business_locations")
          .select("id, name, status")
          .eq("business_id", resolvedBusiness.id)
          .neq("status", "inactive")
          .order("name", { ascending: true });

        if (locationError) {
          console.error("Dashboard location switcher error:", locationError);
        }

        const availableLocations = (locationRows || []) as DashboardLocation[];
        setDashboardLocations(availableLocations);

        if (typeof window !== "undefined" && availableLocations.length > 0) {
          const storedLocationId = window.localStorage.getItem(`active_location_${resolvedBusiness.id}`) || "";
          const nextLocationId = storedLocationId === "all" || availableLocations.some((location) => location.id === storedLocationId)
            ? storedLocationId || "all"
            : availableLocations[0].id;
          publishActiveLocationChange(resolvedBusiness.id, nextLocationId);
          setActiveLocationId(nextLocationId);
        }
      } else {
        setDashboardLocations([]);
        setActiveLocationId("");
      }

      // Fetch Plan data to check for trial status
      const { data: planData } = await supabase
        .from("subscription_plans")
        .select("is_trial, trial_days")
        .eq("id", resolvedBusiness.subscription_plan || 'starter')
        .maybeSingle();

      if (planData?.is_trial && resolvedBusiness.trial_end) {
        setIsTrial(true);
        const now = new Date();
        const trialEnd = new Date(resolvedBusiness.trial_end);
        
        if (now > trialEnd) {
          setIsExpiredTrial(true);
        } else {
          const diffTime = Math.abs(trialEnd.getTime() - now.getTime());
          setTrialDaysLeft(Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
        }
      }
    } catch (err) {
      console.error("Dashboard layout error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
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
    { nameKey: "dashboard.nav.settings", href: "/dashboard/settings", icon: Settings },
  ];

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
  if (isExpiredContract) {
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
  if (isExpiredTrial && !router.pathname.includes("/dashboard/billing")) {
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
    <div className="min-h-screen bg-background flex">
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
            <div className="w-8 h-8 bg-primary rounded flex items-center justify-center text-primary-foreground font-bold text-xl shrink-0">
              {business?.business_name?.charAt(0) || "A"}
            </div>
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
                </span>
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header Mobile */}
        <header className="lg:hidden flex items-center justify-between p-4 border-b border-border bg-card">
          <div className="flex items-center gap-2 overflow-hidden">
            <div className="w-8 h-8 bg-primary rounded flex items-center justify-center text-primary-foreground font-bold text-xl shrink-0">
              {business?.business_name?.charAt(0) || "A"}
            </div>
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
                <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground font-bold">3</span>
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
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground font-bold">3</span>
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
          <div className="bg-indigo-600 px-4 py-2.5 flex items-center justify-between text-indigo-50 shadow-sm z-10">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Gift className="h-4 w-4" /> 
              {t("dashboard.trial.endsSoon")} <span className="font-bold">{t("dashboard.trial.daysRemaining", { days: trialDaysLeft })}</span>
            </div>
            <Link href="/dashboard/billing">
              <span className="text-xs font-bold uppercase tracking-wide bg-white/20 hover:bg-white/30 transition-colors px-3 py-1 rounded-full cursor-pointer">{t("dashboard.trial.upgradePlan")}</span>
            </Link>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          {children}
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
                {/* Stamp Correction Announcement (COMING SOON) */}
                <div 
                  className="p-4 rounded-xl border border-border bg-card hover:border-primary/50 hover:shadow-sm transition-all cursor-pointer group"
                  onClick={() => setComingSoonModalOpen(true)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">↩️</span>
                      <h4 className="font-semibold text-foreground group-hover:text-primary transition-colors">{t("dashboard.whatsNew.stampCorrection.title" as TranslationKey)}</h4>
                    </div>
                    <span className="text-[10px] font-bold bg-muted text-muted-foreground px-2 py-1 rounded-full uppercase">
                      {t("common.comingSoon")}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {t("dashboard.whatsNew.stampCorrection.description" as TranslationKey)}
                  </p>
                </div>

                {/* New Languages Announcement (NEW) */}
                <div 
                  className="p-4 rounded-xl border border-primary/20 bg-primary/5 shadow-sm"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">🌎</span>
                      <h4 className="font-semibold text-foreground">{t("dashboard.whatsNew.languages.title" as TranslationKey)}</h4>
                    </div>
                    <span className="text-[10px] font-bold bg-primary text-primary-foreground px-2 py-1 rounded-full uppercase">
                      {t("common.new")}
                    </span>
                  </div>
                  
                  <div className="space-y-3">
                    <p className="text-sm font-semibold text-foreground">
                      {t("dashboard.whatsNew.languages.description" as TranslationKey)}
                    </p>
                  </div>
                </div>

                {/* Quick Issue Stamp Announcement (NEW) */}
                <div 
                  className="p-4 rounded-xl border border-primary/20 bg-primary/5 shadow-sm"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">⚡</span>
                      <h4 className="font-semibold text-foreground">{t("dashboard.whatsNew.quickIssue.title")}</h4>
                    </div>
                    <span className="text-[10px] font-bold bg-primary text-primary-foreground px-2 py-1 rounded-full uppercase">
                      {t("common.new")}
                    </span>
                  </div>
                  
                  <div className="space-y-3">
                    <p className="text-sm font-semibold text-foreground">
                      {t("dashboard.whatsNew.quickIssue.description")}
                    </p>
                    
                    <div className="pt-2 space-y-2">
                      <div className="flex items-start gap-2 text-sm text-muted-foreground">
                        <span className="text-primary mt-0.5">📱</span>
                        <span><strong>{t("dashboard.whatsNew.quickIssue.displayQrTitle")}</strong> - {t("dashboard.whatsNew.quickIssue.displayQrDescription")}</span>
                      </div>
                      <div className="flex items-start gap-2 text-sm text-muted-foreground">
                        <span className="text-primary mt-0.5">📷</span>
                        <span><strong>{t("dashboard.whatsNew.quickIssue.customerScansTitle")}</strong> - {t("dashboard.whatsNew.quickIssue.customerScansDescription")}</span>
                      </div>
                      <div className="flex items-start gap-2 text-sm text-muted-foreground">
                        <span className="text-primary mt-0.5">⏱️</span>
                        <span><strong>{t("dashboard.whatsNew.quickIssue.securityTitle")}</strong> - {t("dashboard.whatsNew.quickIssue.securityDescription")}</span>
                      </div>
                      <div className="flex items-start gap-2 text-sm text-muted-foreground">
                        <span className="text-primary mt-0.5">🧩</span>
                        <span><strong>{t("dashboard.whatsNew.quickIssue.addonTitle")}</strong> - {t("dashboard.whatsNew.quickIssue.addonDescription")}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Available Add-ons Announcement (NEW) */}
                <div 
                  className="p-4 rounded-xl border border-primary/20 bg-primary/5 shadow-sm"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">🧩</span>
                      <h4 className="font-semibold text-foreground">{t("dashboard.whatsNew.addons.title")}</h4>
                    </div>
                    <span className="text-[10px] font-bold bg-primary text-primary-foreground px-2 py-1 rounded-full uppercase">
                      {t("common.new")}
                    </span>
                  </div>
                  
                  <div className="space-y-3">
                    <p className="text-sm font-semibold text-foreground">
                      {t("dashboard.whatsNew.addons.description")}
                    </p>
                    <p className="text-sm text-muted-foreground italic">
                      {t("dashboard.whatsNew.addons.quote")}
                    </p>
                    
                    <div className="pt-2 space-y-2">
                      <div className="flex items-start gap-2 text-sm text-muted-foreground">
                        <span className="text-primary mt-0.5">➕</span>
                        <span><strong>{t("dashboard.whatsNew.addons.moreCustomersTitle")}</strong> - {t("dashboard.whatsNew.addons.moreCustomersDescription")}</span>
                      </div>
                      <div className="flex items-start gap-2 text-sm text-muted-foreground">
                        <span className="text-primary mt-0.5">💳</span>
                        <span><strong>{t("dashboard.whatsNew.addons.keepPlanTitle")}</strong> - {t("dashboard.whatsNew.addons.keepPlanDescription")}</span>
                      </div>
                      <div className="flex items-start gap-2 text-sm text-muted-foreground">
                        <span className="text-primary mt-0.5">📈</span>
                        <span><strong>{t("dashboard.whatsNew.addons.flexibleGrowthTitle")}</strong> - {t("dashboard.whatsNew.addons.flexibleGrowthDescription")}</span>
                      </div>
                      <div className="flex items-start gap-2 text-sm text-muted-foreground">
                        <span className="text-primary mt-0.5">⚡</span>
                        <span><strong>{t("dashboard.whatsNew.addons.simpleApprovalTitle")}</strong> - {t("dashboard.whatsNew.addons.simpleApprovalDescription")}</span>
                      </div>
                    </div>

                    <div className="pt-2 mt-2 border-t border-primary/10">
                      <p className="text-xs font-semibold text-foreground mb-2">{t("dashboard.whatsNew.addons.availableOptions")}</p>
                      <div className="flex flex-wrap gap-2">
                        <span className="text-[10px] font-medium bg-background border rounded px-2 py-1">{t("dashboard.whatsNew.addons.option100")}</span>
                        <span className="text-[10px] font-medium bg-background border rounded px-2 py-1">{t("dashboard.whatsNew.addons.option250")}</span>
                        <span className="text-[10px] font-medium bg-background border rounded px-2 py-1">{t("dashboard.whatsNew.addons.option500")}</span>
                        <span className="text-[10px] font-medium bg-background border rounded px-2 py-1">{t("dashboard.whatsNew.addons.option1000")}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Reward Expiration Announcement (NEW) */}
                <div 
                  className="p-4 rounded-xl border border-primary/20 bg-primary/5 shadow-sm"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">🎁</span>
                      <h4 className="font-semibold text-foreground">{t("dashboard.whatsNew.rewardExpiration.title")}</h4>
                    </div>
                    <span className="text-[10px] font-bold bg-primary text-primary-foreground px-2 py-1 rounded-full uppercase">
                      {t("common.new")}
                    </span>
                  </div>
                  
                  <div className="space-y-3">
                    <p className="text-sm font-semibold text-foreground">
                      {t("dashboard.whatsNew.rewardExpiration.description")}
                    </p>
                    <p className="text-sm text-muted-foreground italic">
                      {t("dashboard.whatsNew.rewardExpiration.quote")}
                    </p>
                    
                    <div className="pt-2 space-y-2">
                      <div className="flex items-start gap-2 text-sm text-muted-foreground">
                        <span className="text-primary mt-0.5">⏰</span>
                        <span><strong>{t("dashboard.whatsNew.rewardExpiration.setTitle")}</strong> - {t("dashboard.whatsNew.rewardExpiration.setDescription")}</span>
                      </div>
                      <div className="flex items-start gap-2 text-sm text-muted-foreground">
                        <span className="text-primary mt-0.5">🎁</span>
                        <span><strong>{t("dashboard.whatsNew.rewardExpiration.flexibleTitle")}</strong> - {t("dashboard.whatsNew.rewardExpiration.flexibleDescription")}</span>
                      </div>
                      <div className="flex items-start gap-2 text-sm text-muted-foreground">
                        <span className="text-primary mt-0.5">🔒</span>
                        <span><strong>{t("dashboard.whatsNew.rewardExpiration.protectionTitle")}</strong> - {t("dashboard.whatsNew.rewardExpiration.protectionDescription")}</span>
                      </div>
                      <div className="flex items-start gap-2 text-sm text-muted-foreground">
                        <span className="text-primary mt-0.5">📅</span>
                        <span><strong>{t("dashboard.whatsNew.rewardExpiration.clearDatesTitle")}</strong> - {t("dashboard.whatsNew.rewardExpiration.clearDatesDescription")}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Feature 1 */}
                <div 
                  className="p-4 rounded-xl border border-border bg-card hover:border-primary/50 hover:shadow-sm transition-all cursor-pointer group"
                  onClick={() => setComingSoonModalOpen(true)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">🆕</span>
                      <h4 className="font-semibold text-foreground group-hover:text-primary transition-colors">{t("dashboard.whatsNew.birthday.title")}</h4>
                    </div>
                    <span className="text-[10px] font-bold bg-muted text-muted-foreground px-2 py-1 rounded-full uppercase">
                      {t("common.comingSoon")}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {t("dashboard.whatsNew.birthday.description")}
                  </p>
                </div>

                {/* Feature 2 */}
                <div 
                  className="p-4 rounded-xl border border-border bg-card hover:border-primary/50 hover:shadow-sm transition-all cursor-pointer group"
                  onClick={() => setComingSoonModalOpen(true)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">🎁</span>
                      <h4 className="font-semibold text-foreground group-hover:text-primary transition-colors">{t("dashboard.whatsNew.bonusStamps.title")}</h4>
                    </div>
                    <span className="text-[10px] font-bold bg-muted text-muted-foreground px-2 py-1 rounded-full uppercase">
                      {t("common.comingSoon")}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {t("dashboard.whatsNew.bonusStamps.description")}
                  </p>
                </div>

                {/* Feature 3 */}
                <div 
                  className="p-4 rounded-xl border border-border bg-card hover:border-primary/50 hover:shadow-sm transition-all group"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">🔊</span>
                      <h4 className="font-semibold text-foreground group-hover:text-primary transition-colors">{t("dashboard.whatsNew.stampSounds.title")}</h4>
                    </div>
                    <span className="text-[10px] font-bold bg-primary text-primary-foreground px-2 py-1 rounded-full uppercase">
                      {t("common.new")}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {t("dashboard.whatsNew.stampSounds.description")}
                  </p>
                </div>

                {/* Feature 4 */}
                <div 
                  className="p-4 rounded-xl border border-border bg-card hover:border-primary/50 hover:shadow-sm transition-all group"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">🎨</span>
                      <h4 className="font-semibold text-foreground group-hover:text-primary transition-colors">{t("dashboard.whatsNew.customBanner.title")}</h4>
                    </div>
                    <span className="text-[10px] font-bold bg-primary text-primary-foreground px-2 py-1 rounded-full uppercase">
                      {t("common.new")}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {t("dashboard.whatsNew.customBanner.description")}
                  </p>
                </div>

                {/* Feature 5 */}
                <div 
                  className="p-4 rounded-xl border border-border bg-card hover:border-primary/50 hover:shadow-sm transition-all group"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">📷</span>
                      <h4 className="font-semibold text-foreground group-hover:text-primary transition-colors">{t("dashboard.whatsNew.rewardScan.title")}</h4>
                    </div>
                    <span className="text-[10px] font-bold bg-primary text-primary-foreground px-2 py-1 rounded-full uppercase">
                      {t("common.new")}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {t("dashboard.whatsNew.rewardScan.description")}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Coming Soon Modal */}
      <Dialog open={comingSoonModalOpen} onOpenChange={setComingSoonModalOpen}>
        <DialogContent className="sm:max-w-md text-center p-6 z-[70]">
          <DialogHeader>
            <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <span className="text-2xl">🚀</span>
            </div>
            <DialogTitle className="text-2xl font-heading text-center">{t("dashboard.comingSoonModal.title")}</DialogTitle>
            <DialogDescription className="text-center text-base pt-2">
              {t("dashboard.comingSoonModal.description")}
            </DialogDescription>
          </DialogHeader>
          <div className="mt-6 flex justify-center w-full">
            <Button type="button" onClick={() => setComingSoonModalOpen(false)} className="w-full sm:w-auto px-8">
              {t("common.gotIt")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}