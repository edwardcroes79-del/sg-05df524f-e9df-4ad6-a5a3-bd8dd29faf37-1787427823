import { useEffect, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { CustomerLayout } from "@/components/customer/CustomerLayout";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Coffee, Gift, History, HelpCircle, ArrowRight } from "lucide-react";
import QRCode from "react-qr-code";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/contexts/I18nProvider";

export default function CustomerDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [customer, setCustomer] = useState<any>(null);
  const { toast } = useToast();
  const { t } = useI18n();
  const [stats, setGlobalStats] = useState({
    totalCards: 0,
    availableRewards: 0,
    expiredRewards: 0,
    totalRewardsEarned: 0,
    totalStamps: 0,
  });

  useEffect(() => {
    fetchDashboardSummary();
  }, []);

  useEffect(() => {
    if (!customer?.id) return;

    const channel = supabase.channel(`customer_dashboard_${customer.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'customer_loyalty_cards', filter: `customer_id=eq.${customer.id}` },
        (payload) => {
          console.log("🔥 DASHBOARD REALTIME EVENT: customer_loyalty_cards UPDATE", payload);
          // Calculate difference if old record is available to securely update stats, otherwise just refetch
          if (payload.old && payload.new && payload.new.current_stamps !== undefined) {
             const diff = (payload.new.current_stamps || 0) - (payload.old.current_stamps || 0);
             if (diff > 0) {
               setGlobalStats(prev => ({ ...prev, totalStamps: prev.totalStamps + diff }));
             } else {
               fetchDashboardSummary(); // Fallback to full fetch if it resets
             }
          } else {
             fetchDashboardSummary();
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'rewards', filter: `customer_id=eq.${customer.id}` },
        (payload) => {
          console.log("🔥 DASHBOARD REALTIME EVENT: rewards INSERT", payload);
          toast({
            title: t("customer.home.rewardUnlockedTitle"),
            description: t("customer.home.rewardUnlockedDescription"),
            duration: 7000,
            className: "bg-green-500 text-white border-none shadow-lg",
          });
          fetchDashboardSummary();
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'rewards', filter: `customer_id=eq.${customer.id}` },
        (payload) => {
          console.log("🔥 DASHBOARD REALTIME EVENT: rewards UPDATE", payload);
          fetchDashboardSummary();
        }
      )
      .subscribe((status, err) => {
        console.log("Dashboard Realtime Subscription Status:", status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [customer?.id, toast]);

  const fetchDashboardSummary = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data: customerData } = await supabase
        .from("customers")
        .select("id, user_id, name, email, phone, avatar, created_at")
        .eq("user_id", session.user.id)
        .single();

      if (customerData) {
        setCustomer(customerData);

        // Fetch counts and stats
        const [
          { count: cardCount, data: cards },
          { data: rewardsData }
        ] = await Promise.all([
          supabase.from("customer_loyalty_cards").select("current_stamps", { count: "exact" }).eq("customer_id", customerData.id),
          supabase.from("rewards").select("id, status, expires_at").eq("customer_id", customerData.id)
        ]);

        const now = new Date();
        const customerRewards = rewardsData || [];
        const availableRewards = customerRewards.filter((reward) => (
          reward.status === "available" && (!reward.expires_at || new Date(reward.expires_at) > now)
        )).length;
        const expiredRewards = customerRewards.filter((reward) => (
          reward.status === "expired" || (reward.status === "available" && reward.expires_at && new Date(reward.expires_at) <= now)
        )).length;
        const totalStampsEarned = cards?.reduce((sum, item) => sum + (item.current_stamps || 0), 0) || 0;

        setGlobalStats({
          totalCards: cardCount || 0,
          availableRewards,
          expiredRewards,
          totalRewardsEarned: customerRewards.length,
          totalStamps: totalStampsEarned,
        });
      }
    } catch (err) {
      console.error("Error loading customer dashboard summary:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <CustomerLayout>
        <div className="space-y-6">
          <Skeleton className="h-44 w-full" />
          <div className="grid grid-cols-3 gap-4">
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
          </div>
        </div>
      </CustomerLayout>
    );
  }

  return (
    <CustomerLayout>
      <Head>
        <title>{t("customer.home.seoTitle")}</title>
      </Head>

      <div className="space-y-8">
        {/* Welcome Section */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-heading font-bold text-foreground">{t("customer.home.welcome", { name: customer?.name || "" })}</h1>
          <p className="text-muted-foreground mt-1">{t("customer.home.summary")}</p>
        </div>

        {/* Customer ID / Scan Card */}
        <Card className="border-primary/20 bg-card overflow-hidden relative shadow-sm">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-primary" />
          <CardContent className="p-6 sm:p-8 flex flex-col md:flex-row items-center gap-8 justify-between">
            <div className="text-center md:text-left space-y-3">
              <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider">
                <Coffee className="h-3.5 w-3.5" />
                {t("customer.home.activePass")}
              </div>
              <h2 className="text-xl sm:text-2xl font-heading font-bold">{t("customer.home.personalQr")}</h2>
              <p className="text-muted-foreground text-sm max-w-md">
                {t("customer.home.personalQrDescription")}
              </p>
            </div>
            <div className="bg-white p-4 rounded-2xl shadow-md border flex flex-col items-center">
              {customer?.id && (
                <QRCode 
                  value={`CUSTOMER:${customer.id}`}
                  size={140}
                  level="H"
                  fgColor="#0F172A"
                />
              )}
              <p className="text-[10px] text-muted-foreground mt-2 font-mono uppercase tracking-wider">{t("customer.home.customerId", { id: customer?.id?.split("-")[0] || "" })}</p>
            </div>
          </CardContent>
        </Card>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-3 gap-4">
          <Link href="/customer/cards">
            <div className="bg-card hover:bg-muted/10 border border-border/50 p-4 rounded-xl text-center shadow-sm cursor-pointer transition-colors">
              <p className="text-2xl sm:text-3xl font-bold text-foreground">{stats.totalCards}</p>
              <p className="text-[11px] sm:text-xs text-muted-foreground mt-1">{t("customer.home.myCards")}</p>
            </div>
          </Link>
          <Link href="/customer/rewards">
            <div className="bg-card hover:bg-muted/10 border border-border/50 p-4 rounded-xl text-center shadow-sm cursor-pointer transition-colors">
              <p className="text-2xl sm:text-3xl font-bold text-primary">{stats.availableRewards}</p>
              <p className="text-[11px] sm:text-xs text-muted-foreground mt-1">{t("customer.home.availableRewards")}</p>
              <div className="mt-2 flex items-center justify-center gap-2 text-[10px] text-muted-foreground">
                <span>{t("customer.home.expired", { count: stats.expiredRewards })}</span>
                <span aria-hidden="true">•</span>
                <span>{t("customer.home.totalEarned", { count: stats.totalRewardsEarned })}</span>
              </div>
            </div>
          </Link>
          <Link href="/customer/activity">
            <div className="bg-card hover:bg-muted/10 border border-border/50 p-4 rounded-xl text-center shadow-sm cursor-pointer transition-colors">
              <p className="text-2xl sm:text-3xl font-bold text-foreground">{stats.totalStamps}</p>
              <p className="text-[11px] sm:text-xs text-muted-foreground mt-1">{t("customer.home.stampsEarned")}</p>
            </div>
          </Link>
        </div>

        {/* Quick Navigation Cards */}
        <div className="grid sm:grid-cols-2 gap-4">
          <Link href="/customer/cards" className="block group">
            <div className="p-5 border border-border/60 rounded-xl bg-card hover:border-primary/40 transition-all shadow-sm h-full flex flex-col justify-between">
              <div>
                <div className="p-2 bg-primary/10 text-primary w-fit rounded-lg mb-3">
                  <Coffee className="h-5 w-5" />
                </div>
                <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">{t("customer.home.collectStamps")}</h3>
                <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                  {t("customer.home.collectDescription")}
                </p>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-primary font-medium mt-4 group-hover:translate-x-1 transition-transform">
                {t("customer.home.viewCards")} <ArrowRight className="h-3.5 w-3.5" />
              </div>
            </div>
          </Link>

          <Link href="/customer/rewards" className="block group">
            <div className="p-5 border border-border/60 rounded-xl bg-card hover:border-primary/40 transition-all shadow-sm h-full flex flex-col justify-between">
              <div>
                <div className="p-2 bg-green-500/10 text-green-600 w-fit rounded-lg mb-3">
                  <Gift className="h-5 w-5" />
                </div>
                <h3 className="font-semibold text-foreground group-hover:text-green-600 transition-colors">{t("customer.home.claimRewards")}</h3>
                <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                  {t("customer.home.claimDescription")}
                </p>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-green-600 font-medium mt-4 group-hover:translate-x-1 transition-transform">
                {t("customer.home.claimNow")} <ArrowRight className="h-3.5 w-3.5" />
              </div>
            </div>
          </Link>
        </div>
      </div>
    </CustomerLayout>
  );
}