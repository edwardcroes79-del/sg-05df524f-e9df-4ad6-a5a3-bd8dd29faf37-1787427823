import { useEffect, useState } from "react";
import Head from "next/head";
import { CustomerLayout } from "@/components/customer/CustomerLayout";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Gift, CheckCircle, Clock, Calendar } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import QRCode from "react-qr-code";

export default function CustomerRewardsPage() {
  const [loading, setLoading] = useState(true);
  const [rewards, setRewards] = useState<any[]>([]);

  useEffect(() => {
    fetchRewards();
  }, []);

  const fetchRewards = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data: customerData } = await supabase
        .from("customers")
        .select("id")
        .eq("user_id", session.user.id)
        .single();

      if (customerData) {
        const { data: rewardsData } = await supabase
          .from("rewards")
          .select(`
            *,
            loyalty_programs (name),
            businesses (business_name, primary_color)
          `)
          .eq("customer_id", customerData.id)
          .order("status", { ascending: true })
          .order("earned_at", { ascending: false });
        
        if (rewardsData) setRewards(rewardsData);
      }
    } catch (err) {
      console.error("Error fetching rewards:", err);
    } finally {
      setLoading(false);
    }
  };

  const availableRewards = rewards.filter((r) => r.status === "available");
  const redeemedRewards = rewards.filter((r) => r.status === "redeemed" || r.status === "expired");

  return (
    <CustomerLayout>
      <Head>
        <title>My Rewards | Royalty Stamp</title>
      </Head>

      <div className="space-y-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-heading font-bold text-foreground">My Rewards</h1>
          <p className="text-muted-foreground mt-1">Scan the QR code below at the store to claim your free reward.</p>
        </div>

        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        ) : (
          <div className="space-y-8">
            {/* Available Rewards Section */}
            <div className="space-y-4">
              <h2 className="text-lg font-semibold flex items-center gap-2 text-foreground">
                <Clock className="h-5 w-5 text-amber-500" />
                Available Rewards ({availableRewards.length})
              </h2>

              {availableRewards.length === 0 ? (
                <Card className="border-dashed bg-card/50">
                  <CardContent className="p-10 text-center text-muted-foreground">
                    <Gift className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-sm">No available rewards to redeem right now.</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-6 sm:grid-cols-2">
                  {availableRewards.map((reward) => (
                    <Card key={reward.id} className="border-primary/30 shadow-sm relative overflow-hidden flex flex-col justify-between">
                      <div className="absolute top-0 left-0 w-full h-1 bg-primary" />
                      <CardHeader className="pb-2">
                        <div className="flex justify-between items-start gap-2">
                          <span className="text-xs font-semibold text-primary uppercase tracking-wider">
                            {reward.businesses?.business_name}
                          </span>
                          <Badge variant="default" className="bg-green-500/10 text-green-600 border-none font-medium hover:bg-green-500/10">
                            Available
                          </Badge>
                        </div>
                        <CardTitle className="text-lg mt-1">{reward.reward_title}</CardTitle>
                        <CardDescription className="text-xs">
                          Earned on {new Date(reward.earned_at).toLocaleDateString()}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="pt-2 flex flex-col items-center justify-center">
                        <div className="bg-white p-3 rounded-lg border shadow-sm flex flex-col items-center">
                          <QRCode 
                            value={`REWARD:${reward.reward_code}`} 
                            size={120}
                            level="H"
                            fgColor="#0F172A"
                          />
                          <p className="font-mono text-sm font-bold tracking-widest mt-3 bg-muted px-3 py-1 rounded">
                            {reward.reward_code}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            {/* Redeemed / History Section */}
            <div className="space-y-4">
              <h2 className="text-lg font-semibold flex items-center gap-2 text-foreground">
                <CheckCircle className="h-5 w-5 text-emerald-500" />
                Redemption History ({redeemedRewards.length})
              </h2>

              {redeemedRewards.length === 0 ? (
                <Card className="border-dashed bg-card/50">
                  <CardContent className="p-8 text-center text-muted-foreground text-sm">
                    No redemption history available yet.
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4">
                  {redeemedRewards.map((reward) => (
                    <Card key={reward.id} className="opacity-75 bg-muted/10 border-border/50">
                      <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="p-2.5 bg-muted rounded-full">
                            <Gift className="h-5 w-5 text-muted-foreground" />
                          </div>
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                              {reward.businesses?.business_name}
                            </p>
                            <h4 className="font-medium text-foreground">{reward.reward_title}</h4>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              Code: <span className="font-mono font-semibold">{reward.reward_code}</span>
                            </p>
                          </div>
                        </div>
                        <div className="text-left sm:text-right shrink-0">
                          <Badge variant="outline" className="bg-muted text-muted-foreground border-none font-medium">
                            {reward.status.toUpperCase()}
                          </Badge>
                          {reward.redeemed_at && (
                            <div className="flex items-center sm:justify-end gap-1 text-xs text-muted-foreground mt-1">
                              <Calendar className="h-3.5 w-3.5" />
                              <span>{new Date(reward.redeemed_at).toLocaleDateString()}</span>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </CustomerLayout>
  );
}