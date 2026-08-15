import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowRight } from "lucide-react";
import { LoyaltyCard } from "@/components/LoyaltyCard";

export default function JoinProgram() {
  const router = useRouter();
  const { business_slug, program_id } = router.query;
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [program, setProgram] = useState<any>(null);
  const [business, setBusiness] = useState<any>(null);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    if (!business_slug || !program_id) return;

    const checkSessionAndFetch = async () => {
      try {
        const bSlug = business_slug as string;
        const pId = program_id as string;
        
        const { data: { session } } = await supabase.auth.getSession();
        setUser(session?.user || null);

        // Fetch business and program details (publicly accessible info via an edge case, or assume RLS allows public read for programs)
        // Since we need to show it, we query directly. If RLS blocks, we might need a public view or public read policy on programs/businesses.
        const { data: bData, error: bError } = await supabase
          .from("businesses")
          .select("id, business_name, slug")
          .eq("slug", bSlug)
          .single();

        if (bError || !bData) throw new Error("Business not found");
        setBusiness(bData);

        const { data: pData, error: pError } = await supabase
          .from("loyalty_programs")
          .select("*")
          .eq("id", pId)
          .eq("business_id", bData.id)
          .single();

        if (pError || !pData) throw new Error("Program not found");
        setProgram(pData);

      } catch (err: any) {
        toast({ title: "Error", description: err.message, variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };

    checkSessionAndFetch();
  }, [business_slug, program_id]);

  const handleJoin = async () => {
    if (!user) {
      // Redirect to login/register with a returnUrl
      router.push(`/auth/register?returnUrl=${encodeURIComponent(router.asPath)}`);
      return;
    }

    setJoining(true);
    try {
      // Find or create customer record
      const { data: cData } = await supabase
        .from("customers")
        .select("id")
        .eq("user_id", user.id)
        .single();

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
        .single();

      if (!cardData) {
        // Create new card
        const { error: cardError } = await supabase
          .from("customer_loyalty_cards")
          .insert({
            customer_id: customerId,
            business_id: business.id,
            loyalty_program_id: program.id,
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
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!program || !business) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4 text-center">
        <h1 className="text-2xl font-bold font-heading">Program not found or is inactive.</h1>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Join {program.name} | {business.business_name}</title>
      </Head>
      <main className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <h1 className="text-3xl font-bold font-heading text-foreground mb-2">
              {business.business_name}
            </h1>
            <p className="text-muted-foreground">
              Invites you to join their loyalty program
            </p>
          </div>

          <LoyaltyCard
            programName={program.name}
            businessName={business.business_name}
            stampTarget={program.stamp_target}
            currentStamps={0}
            stampIcon={program.stamp_icon}
            rewardTitle={program.reward_title}
            color={program.card_color}
            className="shadow-xl"
          />

          <Card>
            <CardHeader>
              <CardTitle>How it works</CardTitle>
              <CardDescription>
                Collect {program.stamp_target} stamps to unlock {program.reward_title}.
              </CardDescription>
            </CardHeader>
            <CardFooter>
              <Button 
                className="w-full h-12 text-lg" 
                onClick={handleJoin} 
                disabled={joining}
              >
                {joining ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
                {user ? "Join Program & View Card" : "Login or Sign Up to Join"}
                {!joining && !user && <ArrowRight className="ml-2 h-5 w-5" />}
              </Button>
            </CardFooter>
          </Card>
        </div>
      </main>
    </>
  );
}