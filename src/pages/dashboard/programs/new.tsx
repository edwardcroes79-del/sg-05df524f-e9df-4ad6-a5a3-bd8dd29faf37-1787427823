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
  
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    stamp_target: "10",
    reward_title: "",
    reward_description: "",
  });

  useEffect(() => {
    const getBusiness = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data } = await supabase.from("businesses").select("id").eq("owner_id", session.user.id).single();
        if (data) setBusinessId(data.id);
      }
    };
    getBusiness();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessId) return;

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

        <form onSubmit={handleSubmit}>
          <Card>
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