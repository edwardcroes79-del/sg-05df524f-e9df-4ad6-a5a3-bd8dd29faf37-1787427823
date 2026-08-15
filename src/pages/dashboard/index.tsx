import { useEffect, useState } from "react";
import Head from "next/head";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, CreditCard, Stamp, Gift, Activity } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardOverview() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    customers: 0,
    activeCards: 0,
    stampsIssued: 0,
    rewardsEarned: 0,
    rewardsRedeemed: 0,
  });
  const [recentActivity, setRecentActivity] = useState<any[]>([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data: business } = await supabase
        .from("businesses")
        .select("id")
        .eq("owner_id", session.user.id)
        .single();

      if (!business) return;

      // Real Data Fetching
      const [
        { count: activeCards },
        { count: stampsIssued },
        { count: rewardsEarned },
        { count: rewardsRedeemed },
        { data: activityData }
      ] = await Promise.all([
        supabase.from("customer_loyalty_cards").select("*", { count: "exact", head: true }).eq("business_id", business.id).eq("status", "active"),
        supabase.from("stamp_transactions").select("*", { count: "exact", head: true }).eq("business_id", business.id),
        supabase.from("rewards").select("*", { count: "exact", head: true }).eq("business_id", business.id),
        supabase.from("rewards").select("*", { count: "exact", head: true }).eq("business_id", business.id).eq("status", "redeemed"),
        supabase.from("stamp_transactions")
          .select("id, created_at, stamp_number")
          .eq("business_id", business.id)
          .order("created_at", { ascending: false })
          .limit(5)
      ]);

      setStats({
        customers: activeCards || 0, // In V1, active cards approximate unique customers
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
    { title: "Total Customers", value: stats.customers, icon: Users, color: "text-blue-500" },
    { title: "Active Cards", value: stats.activeCards, icon: CreditCard, color: "text-indigo-500" },
    { title: "Stamps Issued", value: stats.stampsIssued, icon: Stamp, color: "text-primary" },
    { title: "Rewards Earned", value: stats.rewardsEarned, icon: Gift, color: "text-amber-500" },
    { title: "Rewards Redeemed", value: stats.rewardsRedeemed, icon: Activity, color: "text-emerald-500" },
  ];

  return (
    <DashboardLayout>
      <Head>
        <title>Dashboard | Aruba Royalty Stamp</title>
      </Head>

      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-heading font-bold text-foreground">Dashboard Overview</h1>
          <p className="text-muted-foreground mt-2">Real-time metrics for your loyalty programs.</p>
        </div>

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
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : recentActivity.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No activity yet.</p>
                <p className="text-sm mt-1">Start scanning QR codes to issue stamps!</p>
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
                        <p className="font-medium text-foreground">Stamp #{activity.stamp_number} Issued</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(activity.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}