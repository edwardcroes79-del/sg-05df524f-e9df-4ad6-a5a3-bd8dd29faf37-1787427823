import { useEffect, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { CustomerLayout } from "@/components/customer/CustomerLayout";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { CreditCard, Sparkles, Gift, Check, ArrowRight, X } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { LoyaltyCard } from "@/components/LoyaltyCard";
import { Button } from "@/components/ui/button";

export default function MyCardsPage() {
  const [loading, setLoading] = useState(true);
  const [cards, setCards] = useState<any[]>([]);
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [unlockedReward, setUnlockedReward] = useState<any | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchCards();
  }, []);

  useEffect(() => {
    if (!customerId) return;
    console.log("Starting Realtime subscription for customer:", customerId);

    const channel = supabase.channel(`customer_cards_${customerId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'customer_loyalty_cards', filter: `customer_id=eq.${customerId}` },
        (payload) => {
          console.log("🔥 REALTIME EVENT: customer_loyalty_cards UPDATE", payload);
          if (payload.new && payload.new.id) {
             setCards(prev => prev.map(card => card.id === payload.new.id ? { ...card, ...payload.new } : card));
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'customer_loyalty_cards', filter: `customer_id=eq.${customerId}` },
        (payload) => {
          console.log("🔥 REALTIME EVENT: customer_loyalty_cards INSERT", payload);
          fetchCards();
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'rewards', filter: `customer_id=eq.${customerId}` },
        (payload) => {
          console.log("🔥 REALTIME EVENT: rewards", payload);
          if (payload.new) {
            setUnlockedReward(payload.new);
          }
          fetchCards();
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'loyalty_programs' },
        (payload) => {
          console.log("🔥 REALTIME EVENT: loyalty_programs UPDATE", payload);
          fetchCards();
        }
      )
      .subscribe((status, err) => {
        console.log("Realtime Subscription Status:", status);
        if (err) console.error("Realtime Subscription Error:", err);
      });

    return () => {
      console.log("Cleaning up Realtime subscription...");
      supabase.removeChannel(channel);
    };
  }, [customerId]);

  const fetchCards = async () => {
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
        const { data: cardsData } = await supabase
          .from("customer_loyalty_cards")
          .select(`
            *,
            loyalty_programs (*),
            businesses (business_name, primary_color, address)
          `)
          .eq("customer_id", customerData.id);
        
        if (cardsData) setCards(cardsData);
      }
    } catch (err) {
      console.error("Error fetching cards:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <CustomerLayout>
      <Head>
        <title>My Cards | Royalty Stamp</title>
      </Head>

      <div className="space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-heading font-bold text-foreground">My Loyalty Cards</h1>
          <p className="text-muted-foreground mt-1">Track your stamp progress and upcoming rewards across all businesses.</p>
        </div>

        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        ) : cards.length === 0 ? (
          <Card className="border-dashed bg-card/50">
            <CardContent className="p-12 text-center">
              <CreditCard className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">No active cards yet</h3>
              <p className="text-muted-foreground max-w-sm mx-auto">
                Scan a loyalty program QR code at your favorite shop in Aruba to get your digital stamp card!
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-8 max-w-md mx-auto sm:max-w-none sm:grid-cols-2 lg:grid-cols-2">
            {cards.map((card) => (
              <LoyaltyCard
                key={card.id}
                programName={card.loyalty_programs?.name}
                businessName={card.businesses?.business_name}
                stampTarget={card.loyalty_programs?.stamp_target}
                currentStamps={card.current_stamps}
                stampIcon={card.loyalty_programs?.stamp_icon}
                rewardTitle={card.loyalty_programs?.reward_title}
                customization={{
                  template_id: card.loyalty_programs?.template_id,
                  bg_color: card.loyalty_programs?.bg_color,
                  primary_color: card.loyalty_programs?.primary_color,
                  secondary_color: card.loyalty_programs?.secondary_color,
                  text_color: card.loyalty_programs?.text_color,
                  stamp_icon: card.loyalty_programs?.stamp_icon,
                  reward_icon: card.loyalty_programs?.reward_icon,
                  card_logo_url: card.loyalty_programs?.card_logo_url,
                  card_bg_image_url: card.loyalty_programs?.card_bg_image_url
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Viewport-relative Centered Completion & Reward Unlocked Celebration Overlay */}
      {unlockedReward && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-background text-foreground border border-border p-6 sm:p-8 rounded-2xl shadow-2xl w-full max-w-md relative overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
            
            {/* Close Button */}
            <button 
              onClick={() => setUnlockedReward(null)}
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-muted text-muted-foreground transition-colors z-20"
              aria-label="Close celebration"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Celebration backdrop animations */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-30">
              <div className="absolute top-10 left-10 w-2 h-2 bg-primary rounded-full animate-ping" />
              <div className="absolute top-20 right-20 w-3 h-3 bg-yellow-400 rounded-full animate-bounce" />
              <div className="absolute bottom-10 left-1/3 w-2.5 h-2.5 bg-green-400 rounded-full animate-pulse" />
              <div className="absolute top-1/2 right-12 w-2 h-2 bg-blue-400 rounded-full animate-ping" />
            </div>

            <div className="flex flex-col items-center text-center space-y-6 relative z-10">
              {/* Pulsing visual seal */}
              <div className="relative">
                <div className="absolute inset-0 rounded-full bg-primary/20 animate-pulse scale-125" />
                <div className="w-20 h-20 rounded-full bg-primary flex items-center justify-center text-primary-foreground shadow-lg relative">
                  <Sparkles className="w-10 h-10 animate-spin" style={{ animationDuration: "12s" }} />
                  <Gift className="w-5 h-5 absolute" />
                </div>
              </div>

              <div className="space-y-2">
                <h2 className="text-3xl font-heading font-extrabold tracking-tight text-foreground">
                  Pabien! 🎉
                </h2>
                <p className="text-muted-foreground font-medium text-base">
                  You completed your loyalty stamp card!
                </p>
              </div>

              {/* Reward Presentation Card */}
              <div className="w-full bg-primary/10 border border-primary/20 p-5 rounded-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 transform translate-x-2 -translate-y-2 text-primary/10">
                  <Gift className="w-24 h-24" />
                </div>
                <div className="flex items-center gap-4 relative z-10 text-left">
                  <div className="w-12 h-12 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shrink-0">
                    <Check className="w-6 h-6" strokeWidth={3} />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-primary opacity-90">REWARD UNLOCKED</span>
                    <h3 className="font-heading font-bold text-lg text-foreground leading-tight">
                      {unlockedReward.reward_title || "Free Reward"}
                    </h3>
                  </div>
                </div>
              </div>

              <p className="text-xs text-muted-foreground max-w-xs leading-relaxed">
                Your reward voucher code has been successfully recorded in your profile. Present it to the merchant during your next checkout.
              </p>

              {/* View Reward Navigation Action */}
              <div className="w-full">
                <Link href="/customer/rewards" className="w-full">
                  <Button 
                    className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-6 rounded-xl shadow-md gap-2"
                    onClick={() => setUnlockedReward(null)}
                  >
                    View My Rewards
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
              </div>
            </div>

          </div>
        </div>
      )}
    </CustomerLayout>
  );
}