import { useState, useEffect } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import Link from "next/link";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Save } from "lucide-react";

export default function NewProgram() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [limitReached, setLimitLimitReached] = useState(false);
  const [maxPrograms, setMaxPrograms] = useState<number>(1);
  
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    stamp_target: "10",
    reward_title: "",
    reward_description: "",
  });

  useEffect(() => {
    const checkLimitsAndBusiness = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      
      const { data: business } = await supabase
        .from("businesses")
        .select("id, subscription_plan")
        .eq("owner_id", session.user.id)
        .single();
        
      if (business) {
        setBusinessId(business.id);
        
        // Count existing loyalty programs
        const { count } = await supabase
          .from("loyalty_programs")
          .select("id", { count: "exact", head: true })
          .eq("business_id", business.id);

        // Fetch plan limits
        const planId = business.subscription_plan || "starter";
        const { data: plan } = await supabase
          .from("subscription_plans")
          .select("max_loyalty_programs")
          .eq("id", planId)
          .single();

        const limit = plan?.max_loyalty_programs || 1;
        setMaxPrograms(limit);

        if (count !== null && count >= limit) {
          setLimitLimitReached(true);
        }
      }
    };
    checkLimitsAndBusiness();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessId) return;
    if (limitReached) {
      toast({
        title: "Limit Reached",
        description: `Your active plan allows a maximum of ${maxPrograms} loyalty programs. Please upgrade to create more.`,
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);
      const { error } = await supabase.from("loyalty_programs").insert({
        business_id: businessId,
        name: formData.name,
        description: formData.description,
        stamp_target: parseInt(formData.stamp_target, 10),
        reward_title: formData.reward_title,
        reward_description: formData.reward_description,
        active: true,
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Loyalty program created successfully.",
      });
      router.push("/dashboard/programs");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <Head>
        <title>Create Program | Dashboard</title>
      </Head>

      <div className="max-w-3xl mx-auto space-y-8">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/programs">
            <Button variant="outline" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-heading font-bold text-foreground">Create Loyalty Program</h1>
            <p className="text-muted-foreground mt-1">Design a new loyalty experience for your customers.</p>
          </div>
        </div>

        {limitReached && (
          <div className="p-4 bg-destructive/10 border border-destructive/20 text-destructive text-sm rounded-lg">
            ⚠️ <strong>Limit Reached:</strong> Your current subscription tier permits only <strong>{maxPrograms}</strong> loyalty program(s). To create more, please contact support or upgrade via your subscription.
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <Card className={limitReached ? "opacity-60 pointer-events-none" : ""}>
            <CardHeader>
              <CardTitle>Program Details</CardTitle>
              <CardDescription>Basic information about your loyalty card.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name">Program Name</Label>
                <Input 
                  id="name" 
                  placeholder="e.g., Free Coffee After 10" 
                  required 
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea 
                  id="description" 
                  placeholder="How does it work?" 
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="stamp_target">Stamps Required for Reward</Label>
                <Input 
                  id="stamp_target" 
                  type="number" 
                  min="2" 
                  max="50" 
                  required 
                  value={formData.stamp_target}
                  onChange={(e) => setFormData({...formData, stamp_target: e.target.value})}
                />
              </div>

              <div className="pt-4 border-t border-border space-y-6">
                <div>
                  <h3 className="text-lg font-heading font-semibold">Reward Configuration</h3>
                  <p className="text-sm text-muted-foreground">What do customers get when they complete the card?</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reward_title">Reward Title</Label>
                  <Input 
                    id="reward_title" 
                    placeholder="e.g., One Free Large Latte" 
                    required 
                    value={formData.reward_title}
                    onChange={(e) => setFormData({...formData, reward_title: e.target.value})}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reward_description">Reward Description / Terms</Label>
                  <Textarea 
                    id="reward_description" 
                    placeholder="Valid for any standard drink. Extras cost additional." 
                    value={formData.reward_description}
                    onChange={(e) => setFormData({...formData, reward_description: e.target.value})}
                  />
                </div>
              </div>

              <div className="pt-6">
                <Button type="submit" disabled={loading} className="w-full sm:w-auto gap-2">
                  {loading ? "Saving..." : <><Save className="h-4 w-4" /> Create Program</>}
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>
      </div>
    </DashboardLayout>
  );
}