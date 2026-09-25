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
import { ArrowLeft, Save, ShieldAlert } from "lucide-react";

const EXPIRATION_PRESETS = ["7", "14", "30", "60", "90", "custom"] as const;
const MAX_REWARD_EXPIRATION_DAYS = 365;

export default function NewProgram() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [limitReached, setLimitLimitReached] = useState(false);
  const [maxPrograms, setMaxPrograms] = useState<number>(1);
  const [isStaff, setIsStaff] = useState(false);
  
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    stamp_target: "10",
    reward_title: "",
    reward_description: "",
    reward_expiration_option: "none",
    reward_expiration_custom_days: "",
  });

  const getRewardExpirationDays = () => {
    if (formData.reward_expiration_option === "none") return null;

    const rawValue = formData.reward_expiration_option === "custom"
      ? formData.reward_expiration_custom_days
      : formData.reward_expiration_option;

    const parsedValue = Number(rawValue);

    if (!Number.isInteger(parsedValue) || parsedValue < 1 || parsedValue > MAX_REWARD_EXPIRATION_DAYS) {
      throw new Error(`Reward expiration must be a whole number between 1 and ${MAX_REWARD_EXPIRATION_DAYS} days.`);
    }

    return parsedValue;
  };

  useEffect(() => {
    const checkLimitsAndBusiness = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", session.user.id)
        .maybeSingle();

      if (profile?.role === "business_staff") {
        setIsStaff(true);
        return;
      }

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
      const rewardExpirationDays = getRewardExpirationDays();

      const { error } = await supabase.from("loyalty_programs").insert({
        business_id: businessId,
        name: formData.name,
        description: formData.description,
        stamp_target: parseInt(formData.stamp_target, 10),
        reward_title: formData.reward_title,
        reward_description: formData.reward_description,
        reward_expiration_days: rewardExpirationDays,
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

  if (isStaff) {
    return (
      <DashboardLayout>
        <Head>
          <title>Access Denied | Dashboard</title>
        </Head>
        <div className="max-w-md mx-auto my-12 text-center p-6 border rounded-xl bg-card shadow-sm">
          <ShieldAlert className="w-12 h-12 text-destructive mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Access Denied</h2>
          <p className="text-muted-foreground mb-6">Only Business Owners can create new loyalty programs.</p>
          <Button onClick={() => router.push("/dashboard")}>Return to Dashboard</Button>
        </div>
      </DashboardLayout>
    );
  }

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

                <div className="space-y-3 rounded-xl border border-border bg-muted/20 p-4">
                  <div>
                    <Label htmlFor="reward_expiration_option">Reward Expiration</Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      Choose how long newly earned rewards remain valid. Existing rewards are not affected.
                    </p>
                  </div>
                  <select
                    id="reward_expiration_option"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    value={formData.reward_expiration_option}
                    onChange={(e) => setFormData({
                      ...formData,
                      reward_expiration_option: e.target.value,
                      reward_expiration_custom_days: e.target.value === "custom" ? formData.reward_expiration_custom_days : "",
                    })}
                  >
                    <option value="none">No expiration</option>
                    <option value="7">7 days</option>
                    <option value="14">14 days</option>
                    <option value="30">30 days</option>
                    <option value="60">60 days</option>
                    <option value="90">90 days</option>
                    <option value="custom">Custom number of days</option>
                  </select>

                  {formData.reward_expiration_option === "custom" && (
                    <div className="space-y-2">
                      <Label htmlFor="reward_expiration_custom_days">Custom expiration days</Label>
                      <Input
                        id="reward_expiration_custom_days"
                        type="number"
                        min="1"
                        max={MAX_REWARD_EXPIRATION_DAYS}
                        step="1"
                        required
                        placeholder="Enter 1 to 365 days"
                        value={formData.reward_expiration_custom_days}
                        onChange={(e) => setFormData({...formData, reward_expiration_custom_days: e.target.value})}
                      />
                      <p className="text-xs text-muted-foreground">
                        Must be a whole number between 1 and {MAX_REWARD_EXPIRATION_DAYS}.
                      </p>
                    </div>
                  )}
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