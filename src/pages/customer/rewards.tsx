import { useEffect, useState } from "react";
import Head from "next/head";
import { CustomerLayout } from "@/components/customer/CustomerLayout";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Gift, CheckCircle, Clock, Calendar } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import QRCode from "react-qr-code";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const RewardCountdown = ({ expiresAt }: { expiresAt: string | null }) => {
  const [timeLeft, setTimeLeft] = useState<string>("");
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    if (!expiresAt) return;
    
    const updateCountdown = () => {
      const now = new Date().getTime();
      const expiration = new Date(expiresAt).getTime();
      const diff = expiration - now;

      if (diff <= 0) {
        setIsExpired(true);
        setTimeLeft("");
        return;
      }

      setIsExpired(false);
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((diff / 1000 / 60) % 60);

      if (days > 0) {
        setTimeLeft(`${days} day${days !== 1 ? 's' : ''} ${hours} hour${hours !== 1 ? 's' : ''}`);
      } else if (hours > 0) {
        setTimeLeft(`${hours} hour${hours !== 1 ? 's' : ''} ${minutes} minute${minutes !== 1 ? 's' : ''}`);
      } else if (minutes > 0) {
        setTimeLeft(`${minutes} minute${minutes !== 1 ? 's' : ''}`);
      } else {
        setTimeLeft(`Less than 1 minute`);
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 15000); 
    return () => clearInterval(interval);
  }, [expiresAt]);

  if (!expiresAt) {
    return (
      <div className="font-bold text-foreground flex items-center gap-1.5">
        <span>♾️</span>
        <span>No expiration</span>
      </div>
    );
  }

  if (isExpired) {
    return (
      <div className="mt-1">
        <p className="text-sm font-bold text-destructive flex items-center gap-1">
          ⏰ Reward Expired
        </p>
        <p className="text-[10px] text-muted-foreground mt-0.5">
          This reward can no longer be redeemed.
        </p>
      </div>
    );
  }

  return (
    <div className="font-bold text-amber-600 flex items-center gap-1.5">
      <span>⏳</span>
      <span>{timeLeft} remaining</span>
    </div>
  );
};

export default function CustomerRewardsPage() {
  const [loading, setLoading] = useState(true);
  const [rewards, setRewards] = useState<any[]>([]);
  const [customerId, setCustomerId] = useState<string | null>(null);
  
  // Temporary QR Modal State
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [activeReward, setActiveReward] = useState<any | null>(null);
  const [qrToken, setQrToken] = useState<string | null>(null);
  const [qrLoading, setQrLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  
  const { toast } = useToast();

  useEffect(() => {
    fetchRewards();
  }, []);

  useEffect(() => {
    if (!customerId) return;

    const channel = supabase.channel(`customer_rewards_${customerId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'rewards', filter: `customer_id=eq.${customerId}` },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            toast({
              title: "🎉 Reward Unlocked!",
              description: "You've earned a new reward!",
              duration: 5000,
              className: "bg-green-500 text-white border-none",
            });
          }
          fetchRewards();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [customerId]);

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
        setCustomerId(customerData.id);
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

  // QR Token Generation Logic
  const generateQrToken = async (reward: any) => {
    try {
      setQrLoading(true);
      setQrToken(null);
      setTimeLeft(0);
      
      const { data, error } = await supabase.rpc('generate_reward_qr_token', {
        p_reward_id: reward.id
      });

      if (error) throw error;
      
      // The RPC returns a single UUID string, not an object
      if (data) {
        setQrToken(data as string);
        setActiveReward(reward);
        setTimeLeft(60);
        setQrModalOpen(true);
      }
    } catch (err: any) {
      console.error("Error generating QR token:", err);
      toast({
        variant: "destructive",
        title: "Error",
        description: err.message || "Failed to generate temporary QR code.",
      });
    } finally {
      setQrLoading(false);
    }
  };

  // Countdown Timer Effect
  useEffect(() => {
    if (timeLeft <= 0 || !qrModalOpen) return;
    
    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);
    
    return () => clearInterval(timer);
  }, [timeLeft, qrModalOpen]);

  // Clean up timer when modal closes
  const handleModalClose = (open: boolean) => {
    setQrModalOpen(open);
    if (!open) {
      setQrToken(null);
      setTimeLeft(0);
      setActiveReward(null);
    }
  };

  const now = new Date();
  
  const availableRewards = rewards.filter(
    (r) => r.status === "available" && (!r.expires_at || new Date(r.expires_at) > now)
  );
  
  const redeemedRewards = rewards.filter(
    (r) => r.status === "redeemed" || r.status === "expired" || (r.status === "available" && r.expires_at && new Date(r.expires_at) <= now)
  );

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
                        <CardTitle className="text-lg mt-1 flex items-center gap-2">
                          🎁 Reward Available
                        </CardTitle>
                        <div className="font-medium text-foreground text-base">
                          {reward.reward_title}
                        </div>
                        <CardDescription className="text-xs mt-2 space-y-1.5">
                          <RewardCountdown expiresAt={reward.expires_at} />
                          <div className="text-muted-foreground">Earned on {new Date(reward.earned_at).toLocaleDateString()}</div>
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="pt-2 flex flex-col items-center justify-center">
                        <Button 
                          onClick={() => generateQrToken(reward)}
                          disabled={qrLoading}
                          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-6 rounded-xl shadow-md"
                        >
                          SHOW REWARD QR
                        </Button>
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
                History ({redeemedRewards.length})
              </h2>

              {redeemedRewards.length === 0 ? (
                <Card className="border-dashed bg-card/50">
                  <CardContent className="p-8 text-center text-muted-foreground text-sm">
                    No redemption history available yet.
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4">
                  {redeemedRewards.map((reward) => {
                    const isExpired = reward.status === "expired" || (reward.status === "available" && reward.expires_at && new Date(reward.expires_at) <= now);
                    
                    return (
                      <Card key={reward.id} className="opacity-75 bg-muted/10 border-border/50">
                        <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-muted rounded-full">
                              {isExpired ? <Clock className="h-5 w-5 text-muted-foreground" /> : <Gift className="h-5 w-5 text-muted-foreground" />}
                            </div>
                            <div>
                              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                {reward.businesses?.business_name}
                              </p>
                              <h4 className="font-medium text-foreground">{reward.reward_title}</h4>
                              
                              {isExpired ? (
                                <div className="mt-2">
                                  <p className="text-sm font-bold text-destructive flex items-center gap-1">
                                    ⏰ Reward Expired
                                  </p>
                                  <p className="text-[10px] text-muted-foreground mt-0.5">
                                    This reward is no longer available for redemption.
                                  </p>
                                </div>
                              ) : (
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  Code: <span className="font-mono font-semibold">{reward.reward_code}</span>
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="text-left sm:text-right shrink-0">
                            <Badge variant="outline" className={isExpired ? "bg-destructive/10 text-destructive border-none font-medium" : "bg-muted text-muted-foreground border-none font-medium"}>
                              {isExpired ? "EXPIRED" : reward.status.toUpperCase()}
                            </Badge>
                            {reward.redeemed_at && !isExpired && (
                              <div className="flex items-center sm:justify-end gap-1 text-xs text-muted-foreground mt-1">
                                <Calendar className="h-3.5 w-3.5" />
                                <span>{new Date(reward.redeemed_at).toLocaleDateString()}</span>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Temporary Reward QR Modal */}
      <Dialog open={qrModalOpen} onOpenChange={handleModalClose}>
        <DialogContent className="sm:max-w-md text-center">
          <DialogHeader>
            <DialogTitle className="text-center font-heading text-2xl flex items-center justify-center gap-2">
              <Gift className="h-6 w-6 text-primary" />
              REWARD READY
            </DialogTitle>
            <DialogDescription className="text-center">
              Show this QR code to the cashier to redeem your reward.
            </DialogDescription>
          </DialogHeader>

          {activeReward && (
            <div className="flex flex-col items-center justify-center py-6 space-y-6">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  {activeReward.businesses?.business_name}
                </p>
                <h3 className="text-xl font-bold mt-1 text-foreground">
                  {activeReward.reward_title}
                </h3>
              </div>

              {timeLeft > 0 && qrToken ? (
                <>
                  <div className="bg-white p-4 rounded-xl border-2 shadow-sm inline-block">
                    <QRCode 
                      value={`REWARD_TOKEN:${qrToken}`} 
                      size={200}
                      level="H"
                      fgColor="#0F172A"
                    />
                  </div>
                  
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Expires in</p>
                    <p className="font-mono text-3xl font-bold text-foreground tracking-widest">
                      00:{timeLeft.toString().padStart(2, '0')}
                    </p>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center space-y-4 py-8">
                  <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center border-4 border-border">
                    <Clock className="w-10 h-10 text-muted-foreground opacity-50" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-bold text-lg text-foreground">QR CODE EXPIRED</h4>
                    <p className="text-sm text-muted-foreground">This QR code has expired for security.</p>
                  </div>
                  <Button 
                    onClick={() => generateQrToken(activeReward)}
                    disabled={qrLoading}
                    variant="outline"
                    className="mt-4"
                  >
                    GENERATE NEW QR
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </CustomerLayout>
  );
}