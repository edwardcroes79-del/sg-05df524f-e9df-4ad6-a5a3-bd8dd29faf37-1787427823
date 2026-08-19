import { useEffect, useState } from "react";
import Head from "next/head";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, CreditCard, Stamp, Gift, Activity, Plus, Search, Loader2, Check, Sparkles, X } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

interface CustomerProfile {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  avatar: string | null;
}

interface CustomerLoyaltyCard {
  id: string;
  current_stamps: number;
  total_stamps: number;
  customer: CustomerProfile;
  loyalty_programs: {
    id: string;
    name: string;
    stamp_target: number;
    reward_title: string;
  } | null;
}

export default function DashboardOverview() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [stats, setStats] = useState({
    customers: 0,
    activeCards: 0,
    stampsIssued: 0,
    rewardsEarned: 0,
    rewardsRedeemed: 0,
  });
  const [recentActivity, setRecentActivity] = useState<any[]>([]);

  // Stamp Modal States
  const [isStampModalOpen, setIsStampModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [loadingCards, setLoadingCards] = useState(false);
  const [loyaltyCards, setLoyaltyCards] = useState<CustomerLoyaltyCard[]>([]);
  const [stampingCardId, setStampingCardId] = useState<string | null>(null);
  const [successState, setSuccessState] = useState<{
    customerName: string;
    programName: string;
    newStamps: number;
    target: number;
    rewardEarned: boolean;
  } | null>(null);

  // Upgrade Success State
  const [upgradeSuccessPlan, setUpgradeSuccessPlan] = useState<string | null>(null);
  
  // Trial overview states
  const [trialDetails, setTrialDetails] = useState<{ isTrial: boolean; daysLeft: number; endDate: string | null }>({ isTrial: false, daysLeft: 0, endDate: null });

  useEffect(() => {
    fetchDashboardData();
  }, []);

  useEffect(() => {
    if (!businessId) return;

    const channel = supabase.channel(`business_dashboard_${businessId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'stamp_transactions', filter: `business_id=eq.${businessId}` },
        () => {
          // Refresh the dashboard stats and recent activity when a stamp is issued
          fetchDashboardData();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'rewards', filter: `business_id=eq.${businessId}` },
        () => {
          fetchDashboardData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [businessId]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data: business } = await supabase
        .from("businesses")
        .select("id, subscription_plan, trial_end")
        .eq("owner_id", session.user.id)
        .single();

      if (!business) return;
      setBusinessId(business.id);

      // Detect Plan Upgrade Transition
      const cachedPlan = localStorage.getItem(`last_known_plan_id_${business.id}`);
      if (cachedPlan && cachedPlan !== business.subscription_plan) {
        // Fetch current plan name for confirmation
        const { data: planData } = await supabase
          .from("subscription_plans")
          .select("name, is_trial")
          .eq("id", business.subscription_plan || "starter")
          .single();
        
        if (planData) {
          setUpgradeSuccessPlan(planData.name);
          
          // Check trial details for the dashboard UI
          if (business.subscription_plan === "trial" || planData.is_trial) {
            if (business.trial_end) {
              const endDate = new Date(business.trial_end);
              const diffTime = endDate.getTime() - new Date().getTime();
              const days = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
              setTrialDetails({
                isTrial: true,
                daysLeft: days,
                endDate: endDate.toLocaleDateString()
              });
            }
          }
        }
      } else {
        // Just fetch plan to see if it's a trial
        const { data: planCheck } = await supabase
          .from("subscription_plans")
          .select("is_trial")
          .eq("id", business.subscription_plan || "starter")
          .maybeSingle();

        if (planCheck?.is_trial && business.trial_end) {
          const endDate = new Date(business.trial_end);
          const diffTime = endDate.getTime() - new Date().getTime();
          const days = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
          setTrialDetails({
            isTrial: true,
            daysLeft: days,
            endDate: endDate.toLocaleDateString()
          });
        }
      }
      
      // Update cache
      localStorage.setItem(`last_known_plan_id_${business.id}`, business.subscription_plan || "starter");

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
          .select(`
            id, 
            created_at, 
            stamp_number,
            customer_loyalty_cards (
              customer:customers (
                name
              )
            )
          `)
          .eq("business_id", business.id)
          .order("created_at", { ascending: false })
          .limit(5)
      ]);

      setStats({
        customers: activeCards || 0,
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

  // Fetch Loyalty Cards for fast Customer Stamp selection
  const handleOpenStampModal = async () => {
    setIsStampModalOpen(true);
    setSearchQuery("");
    setSuccessState(null);
    if (!businessId) return;

    try {
      setLoadingCards(true);
      const { data, error } = await supabase
        .from("customer_loyalty_cards")
        .select(`
          id,
          current_stamps,
          total_stamps,
          customer:customers (
            id,
            name,
            email,
            phone,
            avatar
          ),
          loyalty_programs (
            id,
            name,
            stamp_target,
            reward_title
          )
        `)
        .eq("business_id", businessId)
        .eq("status", "active");

      if (error) throw error;
      setLoyaltyCards((data || []).filter(c => c.customer) as unknown as CustomerLoyaltyCard[]);
    } catch (err: any) {
      toast({
        title: "Load Error",
        description: err.message || "Failed to load customer list.",
        variant: "destructive",
      });
    } finally {
      setLoadingCards(false);
    }
  };

  // Add Stamp Action via secure transactional RPC
  const handleAddStamp = async (card: CustomerLoyaltyCard) => {
    if (!businessId) return;
    try {
      setStampingCardId(card.id);
      
      const { data, error } = await (supabase.rpc as any)("issue_stamp_tx", {
        p_customer_id: card.customer.id,
        p_business_id: businessId,
        p_loyalty_program_id: card.loyalty_programs?.id
      });

      if (error) throw error;

      // Extract results from JSONB response
      const res = typeof data === "string" ? JSON.parse(data) : data;
      const isRewardEarned = res?.reward_earned || false;
      const newStampsCount = res?.new_stamps !== undefined ? res.new_stamps : (card.current_stamps + 1);

      setSuccessState({
        customerName: card.customer.name,
        programName: card.loyalty_programs?.name || "Program",
        newStamps: newStampsCount,
        target: card.loyalty_programs?.stamp_target || 10,
        rewardEarned: isRewardEarned,
      });

      toast({
        title: "Stamp Issued!",
        description: `Successfully added stamp for ${card.customer.name}.`,
      });

      // Reload dashboard metrics and activity
      fetchDashboardData();
      
      // Update local loyalty card state
      setLoyaltyCards(prev => prev.map(c => {
        if (c.id === card.id) {
          return {
            ...c,
            current_stamps: newStampsCount,
            total_stamps: c.total_stamps + 1
          };
        }
        return c;
      }));

    } catch (err: any) {
      toast({
        title: "Stamping Failed",
        description: err.message || "Could not complete transaction.",
        variant: "destructive",
      });
    } finally {
      setStampingCardId(null);
    }
  };

  // Filtering on pre-loaded customer cards for real-time responsiveness
  const filteredCards = loyaltyCards.filter((card) => {
    const cust = card.customer;
    const nameMatch = cust.name.toLowerCase().includes(searchQuery.toLowerCase());
    const emailMatch = cust.email?.toLowerCase().includes(searchQuery.toLowerCase()) || false;
    const phoneMatch = cust.phone?.includes(searchQuery) || false;
    const progMatch = card.loyalty_programs?.name.toLowerCase().includes(searchQuery.toLowerCase()) || false;
    return nameMatch || emailMatch || phoneMatch || progMatch;
  });

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
        {/* Top Header Section */}
        <div className="flex flex-col sm:flex-row md:items-center justify-between gap-4 border-b border-border pb-5">
          <div>
            <h1 className="text-3xl font-heading font-bold text-foreground">Dashboard Overview</h1>
            <p className="text-muted-foreground mt-1">Real-time metrics for your loyalty programs.</p>
          </div>
          <div>
            <Button 
              onClick={handleOpenStampModal} 
              size="lg" 
              className="w-full sm:w-auto font-bold gap-2 text-white bg-primary hover:bg-primary/95 shadow-md shadow-primary/20 transition-all duration-150 transform active:scale-[0.98]"
            >
              <Plus className="h-5 w-5" /> Issue Stamp
            </Button>
          </div>
        </div>

        {trialDetails.isTrial && (
          <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm">
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-indigo-900 flex items-center gap-2">
                <Gift className="h-5 w-5 text-indigo-600" /> Free 14-Day Trial
              </h3>
              <p className="text-indigo-700/80 text-sm">
                You have <strong>{trialDetails.daysLeft} days remaining</strong>. Your trial will automatically expire on {trialDetails.endDate}.
              </p>
            </div>
            <Button 
              onClick={() => window.location.href = "/dashboard/billing"}
              className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-md font-semibold"
            >
              Upgrade Plan
            </Button>
          </div>
        )}

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
                <p className="text-sm mt-1">Start issuing stamps or scanning QR codes to begin!</p>
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
                        <p className="font-medium text-foreground">
                          Stamp Issued to {activity.customer_loyalty_cards?.customer?.name || "Customer"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(activity.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div className="text-xs font-mono font-bold text-primary">
                      +{activity.stamp_number || 1}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* EASY STAMP ISSUING FLOW DIALOG */}
      <Dialog open={isStampModalOpen} onOpenChange={setIsStampModalOpen}>
        <DialogContent className="sm:max-w-md bg-card border-border max-h-[90vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="p-6 pb-4 border-b border-border">
            <DialogTitle className="text-2xl font-heading font-bold flex items-center gap-2 text-foreground">
              <Stamp className="h-6 w-6 text-primary" /> Issue Loyalty Stamp
            </DialogTitle>
            <DialogDescription className="text-muted-foreground text-sm">
              Search customers by name, email, or phone to issue a stamp instantly.
            </DialogDescription>
          </DialogHeader>

          {/* Success Overlay Panel */}
          {successState ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-5 animate-in fade-in zoom-in duration-200">
              <div className="p-4 bg-emerald-50 text-emerald-500 rounded-full border-2 border-emerald-100 relative">
                <Check className="h-12 w-12 stroke-[3]" />
                {successState.rewardEarned && (
                  <span className="absolute -top-1.5 -right-1.5 bg-amber-500 text-white p-1 rounded-full text-xs">
                    <Sparkles className="h-4 w-4 animate-spin" />
                  </span>
                )}
              </div>
              <div className="space-y-2">
                <h3 className="font-heading font-bold text-xl text-foreground">Stamp Successfully Added!</h3>
                <p className="text-sm text-muted-foreground">
                  Added stamp for <strong className="text-foreground">{successState.customerName}</strong> in program <strong className="text-foreground">{successState.programName}</strong>.
                </p>
              </div>

              {successState.rewardEarned ? (
                <div className="w-full bg-amber-500/10 border border-amber-500/20 p-4 rounded-xl space-y-1.5">
                  <div className="flex items-center justify-center gap-1.5 text-amber-600 font-bold text-sm">
                    <Sparkles className="h-4 w-4" /> REWARD UNLOCKED! <Sparkles className="h-4 w-4" />
                  </div>
                  <p className="text-xs text-amber-700 font-medium">
                    A reward coupon has been generated and added to the customer's wallet.
                  </p>
                </div>
              ) : (
                <div className="text-center font-bold text-2xl text-primary font-mono bg-primary/5 px-6 py-2.5 rounded-full border border-primary/10">
                  {successState.newStamps} / {successState.target} stamps
                </div>
              )}

              <div className="flex gap-3 w-full pt-4">
                <Button 
                  variant="outline" 
                  className="flex-1" 
                  onClick={() => setSuccessState(null)}
                >
                  Issue Another
                </Button>
                <Button 
                  className="flex-1 text-white bg-primary hover:bg-primary/90" 
                  onClick={() => setIsStampModalOpen(false)}
                >
                  Done
                </Button>
              </div>
            </div>
          ) : (
            <>
              {/* Search Bar */}
              <div className="p-4 border-b border-border bg-muted/20">
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name, email, or phone..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 bg-background"
                    autoFocus
                  />
                  {searchQuery && (
                    <button 
                      onClick={() => setSearchQuery("")} 
                      className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Scrollable Customer List */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[250px] max-h-[350px]">
                {loadingCards ? (
                  <div className="flex flex-col items-center justify-center py-16 gap-2">
                    <Loader2 className="h-8 w-8 text-primary animate-spin" />
                    <p className="text-xs text-muted-foreground">Loading customers roster...</p>
                  </div>
                ) : filteredCards.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground space-y-2">
                    <Users className="h-8 w-8 mx-auto opacity-50" />
                    <p className="text-sm font-semibold">No customers matched.</p>
                    <p className="text-xs">Verify your search keywords or register the customer.</p>
                  </div>
                ) : (
                  filteredCards.map((card) => (
                    <div 
                      key={card.id} 
                      className="flex items-center justify-between p-3.5 border border-border rounded-xl bg-card hover:bg-muted/10 transition-colors"
                    >
                      <div className="flex flex-col min-w-0 pr-2">
                        <span className="font-heading font-semibold text-foreground text-sm truncate">
                          {card.customer.name}
                        </span>
                        <span className="text-xs text-muted-foreground truncate">
                          {card.loyalty_programs?.name || "Loyalty Program"}
                        </span>
                        <div className="flex items-center gap-1.5 mt-1.5">
                          <span className="text-xs font-bold text-primary font-mono">
                            {card.current_stamps} / {card.loyalty_programs?.stamp_target || 10} stamps
                          </span>
                        </div>
                      </div>

                      <Button
                        size="sm"
                        disabled={stampingCardId !== null}
                        onClick={() => handleAddStamp(card)}
                        className="font-bold text-white bg-primary hover:bg-primary/95 px-4 h-9 gap-1 shrink-0"
                      >
                        {stampingCardId === card.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <Plus className="h-3.5 w-3.5" /> Stamp
                          </>
                        )}
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* PLAN UPGRADE SUCCESS DIALOG */}
      <Dialog open={!!upgradeSuccessPlan} onOpenChange={(open) => !open && setUpgradeSuccessPlan(null)}>
        <DialogContent className="sm:max-w-md bg-card border-border text-center p-8 space-y-6">
          <div className="flex flex-col items-center space-y-4">
            <div className="p-4 bg-emerald-50 text-emerald-500 rounded-full border-2 border-emerald-100 animate-bounce">
              <Check className="h-12 w-12 stroke-[3]" />
            </div>
            
            <div className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">
                🎉 Upgrade Success
              </span>
              <h2 className="text-2xl font-heading font-bold text-foreground mt-2">
                Plan Successfully Upgraded!
              </h2>
              <p className="text-sm text-muted-foreground">
                Your business has been upgraded. You now have immediate access to all premium features and elevated plan limits.
              </p>
            </div>
          </div>

          <div className="bg-primary/5 border border-primary/10 rounded-2xl p-5 text-center space-y-1">
            <span className="text-xs text-muted-foreground uppercase font-semibold">Active Plan</span>
            <div className="text-xl font-heading font-bold text-primary flex items-center justify-center gap-1.5">
              <Sparkles className="h-5 w-5 text-amber-500 animate-pulse" />
              {upgradeSuccessPlan}
              <Sparkles className="h-5 w-5 text-amber-500 animate-pulse" />
            </div>
          </div>

          <Button 
            className="w-full font-bold text-white bg-primary hover:bg-primary/95 shadow-md shadow-primary/20 py-6 text-base rounded-xl"
            onClick={() => setUpgradeSuccessPlan(null)}
          >
            Continue to Dashboard
          </Button>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}