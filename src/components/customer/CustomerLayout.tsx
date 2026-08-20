import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { supabase } from "@/integrations/supabase/client";
import { 
  LayoutDashboard, 
  CreditCard, 
  Gift, 
  History, 
  User, 
  Settings, 
  LogOut,
  Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { buildMfaRedirect, getMfaRouteRequirement } from "@/lib/authSecurity";

interface CustomerLayoutProps {
  children: React.ReactNode;
}

export function CustomerLayout({ children }: CustomerLayoutProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [customer, setCustomer] = useState<any>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      const lastQrPath = typeof window !== "undefined" ? localStorage.getItem("last_qr_path") : null;
      if (lastQrPath) {
        router.push(`/auth/customer?returnUrl=${encodeURIComponent(lastQrPath)}`);
      } else {
        router.push("/auth/login");
      }
      return;
    }

    const mfaRequirement = await getMfaRouteRequirement();
    if (mfaRequirement.required) {
      router.replace(buildMfaRedirect(router.asPath));
      return;
    }

    // Retrieve or create customer profile
    const { data: customerData } = await supabase
      .from("customers")
      .select("id, user_id, name, email, phone, avatar, created_at")
      .eq("user_id", session.user.id)
      .maybeSingle();

    if (!customerData) {
      const { data: newCustomer, error } = await supabase
        .from("customers")
        .insert({
          user_id: session.user.id,
          name: session.user.user_metadata?.full_name || session.user.email?.split("@")[0] || "Customer",
          email: session.user.email
        })
        .select("id, user_id, name, email, phone, avatar, created_at")
        .single();
      
      if (!error && newCustomer) {
        setCustomer(newCustomer);
      }
    } else {
      setCustomer(customerData);
    }
    setLoading(false);
  };

  const handleLogout = async () => {
    const lastQrPath = typeof window !== "undefined" ? localStorage.getItem("last_qr_path") : null;
    await supabase.auth.signOut();
    if (lastQrPath) {
      router.push(`/auth/customer?returnUrl=${encodeURIComponent(lastQrPath)}`);
    } else {
      router.push("/auth/login");
    }
  };

  const navItems = [
    { name: "Dashboard", href: "/customer", icon: LayoutDashboard },
    { name: "My Cards", href: "/customer/cards", icon: CreditCard },
    { name: "Rewards", href: "/customer/rewards", icon: Gift },
    { name: "Activity", href: "/customer/activity", icon: History },
    { name: "Profile", href: "/customer/profile", icon: User },
    { name: "Settings", href: "/customer/settings", icon: Settings },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground text-sm font-medium">Verifying account...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row pb-16 md:pb-0">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 border-r bg-card shrink-0 h-screen sticky top-0">
        <div className="p-6 border-b">
          <Link href="/customer" className="flex items-center gap-2">
            <Gift className="h-6 w-6 text-primary" />
            <span className="font-heading font-bold text-lg text-foreground">Royalty Customer</span>
          </Link>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const isActive = router.pathname === item.href;
            const Icon = item.icon;
            return (
              <Link key={item.name} href={item.href}>
                <span className={`
                  flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all cursor-pointer
                  ${isActive 
                    ? "bg-primary/10 text-primary font-semibold" 
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"}
                `}>
                  <Icon className="h-5 w-5" />
                  {item.name}
                </span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t">
          <Button 
            variant="ghost" 
            className="w-full justify-start gap-3 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            onClick={handleLogout}
          >
            <LogOut className="h-5 w-5" />
            Sign Out
          </Button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-h-screen overflow-x-hidden">
        {/* Mobile Top Bar */}
        <header className="md:hidden h-16 border-b bg-card px-4 flex items-center justify-between sticky top-0 z-10">
          <Link href="/customer" className="flex items-center gap-2">
            <Gift className="h-5 w-5 text-primary" />
            <span className="font-heading font-bold text-base text-foreground">Royalty Customer</span>
          </Link>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={handleLogout}
            className="text-muted-foreground hover:text-destructive"
          >
            <LogOut className="h-5 w-5" />
          </Button>
        </header>

        {/* Dynamic Page Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto w-full">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 border-t bg-card/95 backdrop-blur-md flex items-center justify-around px-2 z-10">
        {navItems.map((item) => {
          const isActive = router.pathname === item.href;
          const Icon = item.icon;
          return (
            <Link key={item.name} href={item.href} className="flex-1">
              <span className={`
                flex flex-col items-center justify-center py-2 text-[10px] font-medium transition-all
                ${isActive ? "text-primary font-semibold" : "text-muted-foreground"}
              `}>
                <Icon className="h-5 w-5 mb-0.5" />
                {item.name.replace("My ", "")}
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}