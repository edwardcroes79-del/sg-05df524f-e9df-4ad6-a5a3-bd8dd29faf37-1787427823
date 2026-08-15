import { useEffect, useState } from "react";
import Head from "next/head";
import { CustomerLayout } from "@/components/customer/CustomerLayout";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CreditCard, Coffee, MapPin } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function MyCardsPage() {
  const [loading, setLoading] = useState(true);
  const [cards, setCards] = useState<any[]>([]);

  useEffect(() => {
    fetchCards();
  }, []);

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
          <div className="grid gap-6">
            {cards.map((card) => (
              <Card key={card.id} className="overflow-hidden border border-border/60 shadow-sm relative hover:shadow-md transition-all">
                <div 
                  className="absolute top-0 left-0 w-2 h-full bg-primary" 
                  style={{ backgroundColor: card.businesses?.primary_color || "hsl(var(--primary))" }}
                />
                <CardHeader className="pb-4 border-b bg-muted/10 pl-6 sm:pl-8">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div>
                      <span className="text-xs font-semibold uppercase tracking-wider text-primary" style={{ color: card.businesses?.primary_color }}>
                        {card.businesses?.business_name}
                      </span>
                      <CardTitle className="text-xl mt-0.5">{card.loyalty_programs?.name}</CardTitle>
                      {card.businesses?.address && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                          <MapPin className="h-3.5 w-3.5" />
                          <span>{card.businesses.address}</span>
                        </div>
                      )}
                    </div>
                    <div className="self-start sm:self-center bg-primary/10 text-primary px-3 py-1.5 rounded-full text-sm font-bold font-mono" style={{ color: card.businesses?.primary_color, backgroundColor: `${card.businesses?.primary_color}15` }}>
                      {card.current_stamps} / {card.loyalty_programs?.stamp_target} Stamps
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-6 sm:p-8 pl-6 sm:pl-8">
                  <div className="flex flex-wrap gap-3 justify-center mb-6">
                    {Array.from({ length: card.loyalty_programs?.stamp_target || 10 }).map((_, i) => {
                      const isStamped = i < card.current_stamps;
                      return (
                        <div 
                          key={i} 
                          className={`w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all ${
                            isStamped 
                              ? 'border-primary text-primary bg-primary/5 shadow-inner' 
                              : 'bg-muted/30 border-dashed border-muted-foreground/20 text-transparent'
                          }`}
                          style={isStamped ? { borderColor: card.businesses?.primary_color, color: card.businesses?.primary_color, backgroundColor: `${card.businesses?.primary_color}10` } : {}}
                        >
                          <Coffee className="h-5 w-5" />
                        </div>
                      );
                    })}
                  </div>
                  <p className="text-center text-sm font-medium text-foreground">
                    {card.loyalty_programs?.stamp_target - card.current_stamps > 0 ? (
                      <>
                        Need <span className="font-bold text-primary" style={{ color: card.businesses?.primary_color }}>{card.loyalty_programs?.stamp_target - card.current_stamps}</span> more stamp(s) to win: <span className="font-bold">{card.loyalty_programs?.reward_title}</span>
                      </>
                    ) : (
                      <span className="text-green-600 font-bold">Reward Unlocked! Go to Rewards page to scan.</span>
                    )}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </CustomerLayout>
  );
}