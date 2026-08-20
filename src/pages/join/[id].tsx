import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { LoyaltyCard } from "@/components/LoyaltyCard";
import { Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function JoinProgramSimplified() {
  const router = useRouter();
  const { id } = router.query;
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [program, setProgram] = useState<any>(null);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    if (!router.isReady) return;
    if (!id) {
      setLoading(false);
      return;
    }

    const checkSessionAndFetch = async () => {
      try {
        const programId = id as string;
        
        const { data: { session } } = await supabase.auth.getSession();
        setUser(session?.user || null);

        // Single unified query: fetch the active program AND its associated active/trial business
        // Using only explicitly defined schema columns to prevent silent query crashes
        const { data: pData, error: pError } = await supabase
          .from("loyalty_programs")
          .select(`
            id, 
            business_id, 
            name, 
            description, 
            stamp_target, 
            reward_title, 
            reward_description, 
            stamp_icon, 
            card_color, 
            active,
            businesses!inner (
              id,
              business_name,
              slug,
              status
            )
          `)
          .eq("id", programId)
          .eq("active", true)
          .maybeSingle();

        if (pError) throw pError;
        
        // Ensure the business relationship resolved (acts as an implicit active/trial check due to RLS)
        if (!pData || !pData.businesses) {
          setLoading(false);
          return;
        }
        
        setProgram(pData);

      } catch (err: any) {
        toast({ title: "Error", description: err.message, variant: "destructive" });
        setLoading(false);
      }
    };

    checkSessionAndFetch();
  }, [router.isReady, id]);

  const handleJoin = async () => {
    if (!user) {
      router.push(`/auth/customer?returnUrl=${encodeURIComponent(router.asPath)}`);
      return;
    }

    setJoining(true);
    try {
      // Find or create customer record gracefully
      const { data: cData } = await supabase
        .from("customers")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      let customerId = cData?.id;
      if (!customerId) {
        const { data: newCustomer, error: cError } = await supabase
          .from("customers")
          .insert({
            user_id: user.id,
            name: user.email?.split("@")[0] || "Customer",
            email: user.email,
          })
          .select("id")
          .single();
        if (cError) throw cError;
        customerId = newCustomer.id;
      }

      // Check if card exists
      const { data: cardData } = await supabase
        .from("customer_loyalty_cards")
        .select("id")
        .eq("customer_id", customerId)
        .eq("loyalty_program_id", program.id)
        .maybeSingle();

      if (!cardData) {
        // Create new card
        const { error: cardError } = await supabase
          .from("customer_loyalty_cards")
          .insert({
            customer_id: customerId,
            business_id: program.business_id,
            loyalty_program_id: program.id,
            user_id: user.id,
            total_stamps: program.stamp_target
          });
        
        if (cardError) throw cardError;
      }

      toast({ title: "Success!", description: "You have joined the loyalty program." });
      router.push("/customer");
    } catch (err: any) {
      toast({ title: "Error joining program", description: err.message, variant: "destructive" });
    } finally {
      setJoining(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground font-medium">Looking up program...</p>
      </div>
    );
  }

  if (!program) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center space-y-6">
        <Head>
          <title>Program Not Found | Aruba Royalty Stamp</title>
        </Head>
        <div className="max-w-md space-y-4">
          <h1 className="text-3xl font-heading font-bold text-foreground">Program not found or is inactive</h1>
          <p className="text-muted-foreground">
            The loyalty program you are trying to join does not exist or is currently paused. Please check with the business for more details.
          </p>
          <Link href="/">
            <Button variant="outline" className="mt-4 gap-2">
              <ArrowLeft className="w-4 h-4" /> Return to Home
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // Extract the business object for easy access
  const business = Array.isArray(program.businesses) ? program.businesses[0] : program.businesses;

  return (
    <div className="min-h-screen bg-background py-12 px-4 sm:px-6 lg:px-8">
      <Head>
        <title>Join {program.name} | {business.business_name}</title>
      </Head>

      <div className="max-w-md mx-auto space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-heading font-bold tracking-tight text-foreground">Join {business.business_name}</h1>
          <p className="text-muted-foreground">Join their digital loyalty program and start earning rewards today.</p>
        </div>

        <div className="flex justify-center">
          <LoyaltyCard
            programName={program.name}
            programDescription={program.description || ""}
            businessName={business.business_name}
            stampTarget={program.stamp_target}
            currentStamps={0}
            stampIcon={program.stamp_icon || "Stamp"}
            rewardTitle={program.reward_title}
            rewardDescription={program.reward_description || ""}
            color={program.card_color || "#EF4444"}
            className="shadow-xl transform hover:scale-[1.02] transition-transform duration-300"
          />
        </div>

        <Card className="border-primary/20 bg-card">
          <CardHeader className="text-center">
            <CardTitle>Ready to get started?</CardTitle>
            <CardDescription>
              {user 
                ? "You are logged in and ready to join this program." 
                : "Create a free customer account or log in to add this card to your digital wallet."}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <Button 
              size="lg" 
              className="w-full font-bold text-md h-14" 
              onClick={handleJoin}
              disabled={joining}
            >
              {joining ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Processing...
                </>
              ) : user ? (
                "Add to My Wallet"
              ) : (
                "Log In / Register to Join"
              )}
            </Button>
            
            {!user && (
              <p className="text-xs text-center text-muted-foreground">
                By joining, you agree to our Terms of Service and Privacy Policy. No app download required.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}