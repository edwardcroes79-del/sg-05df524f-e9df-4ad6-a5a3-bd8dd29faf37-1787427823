import { useEffect, useState } from "react";
import Head from "next/head";
import { CustomerLayout } from "@/components/customer/CustomerLayout";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { CreditCard } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { LoyaltyCard } from "@/components/LoyaltyCard";

export default function MyCardsPage() {
  const [loading, setLoading] = useState(true);
  const [cards, setCards] = useState<any[]>([]);
  const [customerId, setCustomerId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchCards();
  }, []);

  useEffect(() => {
    if (!customerId) return;

    const channel = supabase.channel(`customer_cards_${customerId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'customer_loyalty_cards', filter: `customer_id=eq.${customerId}` },
        () => {
          fetchCards();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'loyalty_programs' },
        () => {
          // Whenever a program changes its branding, refresh the view
          fetchCards();
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'rewards', filter: `customer_id=eq.${customerId}` },
        () => {
          toast({
            title: "🎉 Reward Unlocked!",
            description: "You have completed a stamp card and earned a reward!",
            duration: 5000,
            className: "bg-green-500 text-white border-none",
          });
          fetchCards();
        }
      )
      .subscribe();

    return () => {
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
    </CustomerLayout>
  );
}