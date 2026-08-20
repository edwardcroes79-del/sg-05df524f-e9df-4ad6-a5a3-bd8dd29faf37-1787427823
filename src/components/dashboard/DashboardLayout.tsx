import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
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
  CreditCard
} from "lucide-react";
import { buildMfaRedirect, getMfaRouteRequirement } from "@/lib/authSecurity";

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [business, setBusiness] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  
  // Trial states
  const [isExpiredTrial, setIsExpiredTrial] = useState(false);
  const [isTrial, setIsTrial] = useState(false);
  const [trialDaysLeft, setTrialDaysLeft] = useState(0);

  useEffect(() => {
    checkUserAndBusiness();
  }, []);

  const checkUserAndBusiness = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      router.push("/auth/login");
      return;
    }

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

    const { data: businessData, error } = await supabase
      .from("businesses")
      .select("*")
      .eq("owner_id", session.user.id)
      .maybeSingle();

    let resolvedBusiness = businessData;

    if (!resolvedBusiness) {
      const { data: staffMembership } = await supabase
        .from("business_users")
        .select("role, status, businesses(*)")
        .eq("user_id", session.user.id)
        .eq("status", "active")
        .maybeSingle();

      const staffBusiness = (staffMembership as any)?.businesses;
      resolvedBusiness = Array.isArray(staffBusiness) ? staffBusiness[0] : staffBusiness;
    }

    if (error && error.code !== "PGRST116") {
      router.push("/onboarding");
      return;
    }

    if (!resolvedBusiness) {
      router.push("/onboarding");
      return;
    }

    setBusiness(resolvedBusiness);

    // Fetch Plan data to check for trial status
    const { data: planData } = await supabase
      .from("subscription_plans")
      .select("is_trial, trial_days")
      .eq("id", resolvedBusiness.subscription_plan)
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

    setLoading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  const navItems = [
    { name: "Overview", href: "/dashboard", icon: LayoutDashboard },
    { name: "Issue Stamp", href: "/dashboard/scan", icon: ScanLine },
    { name: "Loyalty Programs", href: "/dashboard/programs", icon: Gift },
    { name: "Customers", href: "/dashboard/customers", icon: Users },
    { name: "QR Codes", href: "/dashboard/qr", icon: QrCode },
    { name: "Billing", href: "/dashboard/billing", icon: CreditCard },
    { name: "Staff", href: "/dashboard/staff", icon: Users },
    { name: "Settings", href: "/dashboard/settings", icon: Settings },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Skeleton className="h-12 w-12 rounded-full" />
          <p className="text-muted-foreground font-medium">Loading workspace...</p>
        </div>
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
          <h1 className="text-3xl font-heading font-bold text-foreground">Your Free Trial Has Ended</h1>
          <p className="text-muted-foreground">
            Your 14-day free trial has expired. To continue issuing stamps, managing rewards, and accessing your dashboard features, please choose a subscription plan.
          </p>
        </div>
        <div className="flex items-center gap-4 pt-4">
          <Button onClick={handleLogout} variant="outline">Sign Out</Button>
          <Link href="/dashboard/billing">
            <Button className="bg-primary text-white hover:bg-primary/90 font-bold px-8 shadow-md">View Plans & Upgrade</Button>
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
          <h1 className="text-3xl font-heading font-bold text-foreground">Account Suspended</h1>
          <p className="text-muted-foreground">
            This business account has been suspended by the platform administrator. Access to stamp issuing, reward redemption, and merchant controls is temporarily disabled.
          </p>
        </div>
        <Button onClick={handleLogout} variant="outline">Sign Out</Button>
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
                  Pro Business
                </span>
              )}
              {business?.subscription_plan === 'enterprise' && (
                <span className="text-[9px] font-bold text-amber-700 bg-amber-500/10 px-1.5 py-0.5 rounded w-max mt-0.5 tracking-wider uppercase border border-amber-500/20 font-serif">
                  ★ Enterprise
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
                Super Admin Panel
              </span>
            </Link>
          )}

          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = router.pathname === item.href || router.pathname.startsWith(`${item.href}/`);
            return (
              <Link key={item.name} href={item.href}>
                <span className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors
                  ${isActive 
                    ? "bg-primary/10 text-primary" 
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"}
                `}>
                  <Icon className="h-5 w-5" />
                  {item.name}
                </span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-border">
          <button 
            onClick={handleLogout}
            className="flex w-full items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
          >
            <LogOut className="h-5 w-5" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header Mobile */}
        <header className="lg:hidden flex items-center justify-between p-4 border-b border-border bg-card">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded flex items-center justify-center text-primary-foreground font-bold text-xl">
              {business?.business_name?.charAt(0) || "A"}
            </div>
            <span className="font-heading font-semibold text-foreground truncate">
              {business?.business_name}
            </span>
          </div>
          <button onClick={() => setIsMobileOpen(true)}>
            <Menu className="h-6 w-6 text-foreground" />
          </button>
        </header>

        {isTrial && !isExpiredTrial && (
          <div className="bg-indigo-600 px-4 py-2.5 flex items-center justify-between text-indigo-50 shadow-sm z-10">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Gift className="h-4 w-4" /> 
              Your Free Trial Ends Soon: <span className="font-bold">{trialDaysLeft} Days Remaining</span>
            </div>
            <Link href="/dashboard/billing">
              <span className="text-xs font-bold uppercase tracking-wide bg-white/20 hover:bg-white/30 transition-colors px-3 py-1 rounded-full cursor-pointer">
                Upgrade Plan
              </span>
            </Link>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}