import { useEffect, useState } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import QRCode from "react-qr-code";
import { LogOut, Coffee, Gift, History } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function CustomerDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [customer, setCustomer] = useState<any>(null);
  const [cards, setCards] = useState<any[]>([]);
  const [rewards, setRewards] = useState<any[]>([]);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      router.push("/auth/login");
      return;
    }

    // Get customer profile
    const { data: customerData } = await supabase
      .from("customers")
      .select("*")
      .eq("user_id", session.user.id)
      .single();

    if (!customerData) {
      // Create customer profile if it doesn't exist
      const { data: newCustomer } = await supabase
        .from("customers")
        .insert({
          user_id: session.user.id,
          name: session.user.user_metadata?.full_name || session.user.email?.split("@")[0] || "Customer",
          email: session.user.email
        })
        .select()
        .single();
      
      setCustomer(newCustomer);
      fetchData(newCustomer.id);
    } else {
      setCustomer(customerData);
      fetchData(customerData.id);
    }
  };

  const fetchData = async (customerId: string) => {
    // Fetch Cards
    const { data: cardsData } = await supabase
      .from("customer_loyalty_cards")
      .select(`
        *,
        loyalty_programs (*),
        businesses (business_name, primary_color)
      `)
      .eq("customer_id", customerId);
    
    if (cardsData) setCards(cardsData);

    // Fetch Rewards
    const { data: rewardsData } = await supabase
      .from("rewards")
      .select(`
        *,
        loyalty_programs (name),
        businesses (business_name)
      `)
      .eq("customer_id", customerId)
      .order("created_at", { ascending: false });
      
    if (rewardsData) setRewards(rewardsData);
    
    setLoading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-4 flex items-center justify-center">
        <Skeleton className="h-64 w-full max-w-md" />
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>My Loyalty | Aruba Royalty Stamp</title>
      </Head>
      <div className="min-h-screen bg-background pb-20">
        {/* Header */}
        <header className="bg-primary/10 border-b border-primary/20 sticky top-0 z-10 backdrop-blur-md">
          <div className="container mx-auto px-4 h-16 flex items-center justify-between">
            <h1 className="font-heading font-semibold text-xl text-primary flex items-center gap-2">
              <Gift className="h-5 w-5" />
              My Rewards
            </h1>
            <Button variant="ghost" size="icon" onClick={handleLogout} className="text-muted-foreground">
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </header>

        <main className="container mx-auto px-4 py-8 max-w-3xl">
          {/* Customer ID Card */}
          <Card className="mb-8 border-primary/20 bg-card overflow-hidden relative">
            <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
            <CardContent className="p-6 flex flex-col sm:flex-row items-center gap-8">
              <div className="bg-white p-4 rounded-xl shadow-sm border">
                {customer?.id && (
                  <QRCode 
                    value={`CUSTOMER:${customer.id}`}
                    size={160}
                    level="H"
                    fgColor="hsl(var(--foreground))"
                  />
                )}
              </div>
              <div className="text-center sm:text-left">
                <h2 className="text-2xl font-heading font-semibold mb-2">Hello, {customer?.name}</h2>
                <p className="text-muted-foreground mb-4">Show this QR code at participating businesses to collect stamps.</p>
                <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-3 py-1 rounded-full text-sm font-medium">
                  <Coffee className="h-4 w-4" />
                  Ready to scan
                </div>
              </div>
            </CardContent>
          </Card>

          <Tabs defaultValue="cards" className="w-full">
            <TabsList className="w-full grid grid-cols-2 mb-8">
              <TabsTrigger value="cards">My Loyalty Cards</TabsTrigger>
              <TabsTrigger value="rewards">Available Rewards ({rewards.filter(r => r.status === 'available').length})</TabsTrigger>
            </TabsList>
            
            <TabsContent value="cards" className="space-y-6">
              {cards.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="p-12 text-center">
                    <History className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-foreground mb-2">No active cards yet</h3>
                    <p className="text-muted-foreground">Visit participating businesses to start collecting stamps.</p>
                  </CardContent>
                </Card>
              ) : (
                cards.map(card => (
                  <Card key={card.id} className="overflow-hidden border-border/50">
                    <CardHeader className="pb-4 border-b bg-muted/20">
                      <div className="flex justify-between items-start">
                        <div>
                          <CardDescription className="font-medium text-primary mb-1">
                            {card.businesses?.business_name}
                          </CardDescription>
                          <CardTitle className="text-xl">{card.loyalty_programs?.name}</CardTitle>
                        </div>
                        <div className="bg-primary text-primary-foreground px-3 py-1 rounded-full text-sm font-bold font-mono">
                          {card.current_stamps} / {card.loyalty_programs?.stamp_target}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-6">
                      <div className="flex flex-wrap gap-3 justify-center mb-6">
                        {Array.from({ length: card.loyalty_programs?.stamp_target || 10 }).map((_, i) => {
                          const isStamped = i < card.current_stamps;
                          return (
                            <div 
                              key={i} 
                              className={`w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all ${
                                isStamped 
                                  ? 'bg-primary/10 border-primary text-primary shadow-sm' 
                                  : 'bg-muted border-dashed border-muted-foreground/30 text-transparent'
                              }`}
                            >
                              <Coffee className="h-5 w-5" />
                            </div>
                          );
                        })}
                      </div>
                      <p className="text-center text-sm text-muted-foreground">
                        {card.loyalty_programs?.stamp_target - card.current_stamps} more visits until your reward: <strong>{card.loyalty_programs?.reward_title}</strong>
                      </p>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>
            
            <TabsContent value="rewards" className="space-y-4">
              {rewards.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="p-12 text-center">
                    <Gift className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-foreground mb-2">No rewards yet</h3>
                    <p className="text-muted-foreground">Keep collecting stamps to unlock free rewards!</p>
                  </CardContent>
                </Card>
              ) : (
                rewards.map(reward => (
                  <Card key={reward.id} className={reward.status === 'available' ? 'border-primary/40 bg-primary/5' : 'opacity-60'}>
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                        <CardDescription>{reward.businesses?.business_name}</CardDescription>
                        {reward.status === 'available' ? (
                          <span className="bg-green-100 text-green-800 text-xs font-semibold px-2 py-0.5 rounded">Available</span>
                        ) : (
                          <span className="bg-gray-100 text-gray-800 text-xs font-semibold px-2 py-0.5 rounded">Redeemed</span>
                        )}
                      </div>
                      <CardTitle className="text-lg">{reward.reward_title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {reward.status === 'available' && (
                        <div className="mt-4 p-4 bg-white rounded-xl border text-center shadow-sm flex flex-col items-center">
                          <p className="text-xs text-muted-foreground mb-3 uppercase tracking-wider font-semibold">Scan to Redeem</p>
                          <QRCode 
                            value={`REWARD:${reward.reward_code}`} 
                            size={140}
                            level="H"
                            fgColor="hsl(var(--primary))"
                          />
                          <p className="font-mono text-2xl font-bold tracking-widest mt-4 bg-muted/30 px-4 py-1 rounded-md">{reward.reward_code}</p>
                        </div>
                      )}
                      {reward.status === 'redeemed' && (
                        <div className="mt-2 p-3 bg-muted/50 rounded border text-center">
                          <p className="text-sm font-medium text-muted-foreground">
                            Redeemed on {new Date(reward.redeemed_at).toLocaleDateString()}
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </>
  );
}