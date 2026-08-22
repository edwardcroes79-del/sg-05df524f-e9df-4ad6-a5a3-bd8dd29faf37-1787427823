import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle2 } from "lucide-react";
import { SEO } from "@/components/SEO";

export default function Onboarding() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const router = useRouter();
  const { toast } = useToast();
  
  // Form State
  const [businessName, setBusinessName] = useState("");
  const [description, setDescription] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#fb7185"); // Coral default
  
  const [programName, setProgramName] = useState("Loyalty Rewards");
  const [stampTarget, setStampTarget] = useState(10);
  const [rewardTitle, setRewardTitle] = useState("Free Item");

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/auth/login");
        return;
      }
      setEmail(user.email || "");
      
      // Check if already onboarded
      const { data: businessUser } = await supabase
        .from("business_users")
        .select("business_id")
        .eq("user_id", user.id)
        .maybeSingle();
        
      if (businessUser?.business_id) {
        router.push("/dashboard");
        return;
      }
      setCheckingAuth(false);
    };
    checkUser();
  }, [router]);

  const handleComplete = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No authenticated user");

      // 1. Create Business
      const { data: business, error: businessError } = await supabase
        .from("businesses")
        .insert({
          owner_id: user.id,
          business_name: businessName,
          slug: businessName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, ''),
          description,
          phone,
          email,
          primary_color: primaryColor,
          status: 'pending',
          subscription_plan: 'starter'
        })
        .select()
        .single();

      if (businessError) throw businessError;

      // 2. Assign Role in business_users
      const { error: roleError } = await supabase
        .from("business_users")
        .insert({
          business_id: business.id,
          user_id: user.id,
          role: "owner",
          status: "active"
        });

      if (roleError) throw roleError;

      // 3. Create First Loyalty Program
      const { error: programError } = await supabase
        .from("loyalty_programs")
        .insert({
          business_id: business.id,
          name: programName,
          stamp_target: stampTarget,
          reward_title: rewardTitle,
          active: true
        });

      if (programError) throw programError;

      toast({
        title: "Setup Complete!",
        description: "Your business is ready to issue stamps.",
      });
      
      router.push("/dashboard");

    } catch (err: any) {
      console.error(err);
      toast({
        title: "Setup Failed",
        description: err.message || "An error occurred during setup. Please try again.",
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  if (checkingAuth) {
    return <div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="animate-spin w-8 h-8 text-primary" /></div>;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center py-12 px-4">
      <SEO title="Business Onboarding - Aruba Royalty Stamp" />
      
      <div className="w-full max-w-2xl mb-8 flex justify-between items-center relative">
        <div className="absolute left-0 top-1/2 w-full h-1 bg-border -z-10 transform -translate-y-1/2"></div>
        <div className="absolute left-0 top-1/2 h-1 bg-primary -z-10 transform -translate-y-1/2 transition-all duration-300" style={{ width: `${(step - 1) * 50}%` }}></div>
        
        {[1, 2, 3].map((s) => (
          <div key={s} className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm border-4 ${step >= s ? 'bg-primary border-primary text-primary-foreground' : 'bg-background border-border text-muted-foreground'}`}>
            {step > s ? <CheckCircle2 className="w-5 h-5" /> : s}
          </div>
        ))}
      </div>

      <Card className="w-full max-w-2xl border-border shadow-sm">
        {step === 1 && (
          <>
            <CardHeader>
              <CardTitle className="text-2xl font-heading text-foreground">Business Details</CardTitle>
              <CardDescription>Tell us about your business in Aruba.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="businessName">Business Name <span className="text-destructive">*</span></Label>
                <Input id="businessName" placeholder="e.g. Palm Beach Cafe" value={businessName} onChange={(e) => setBusinessName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Short Description</Label>
                <Textarea id="description" placeholder="A cozy cafe on the beach..." value={description} onChange={(e) => setDescription(e.target.value)} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input id="phone" placeholder="+297 555-1234" value={phone} onChange={(e) => setPhone(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Contact Email <span className="text-destructive">*</span></Label>
                  <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
              </div>
            </CardContent>
            <CardFooter className="justify-end">
              <Button onClick={() => setStep(2)} disabled={!businessName || !email} className="font-semibold">Next Step</Button>
            </CardFooter>
          </>
        )}

        {step === 2 && (
          <>
            <CardHeader>
              <CardTitle className="text-2xl font-heading text-foreground">Brand Identity</CardTitle>
              <CardDescription>Set your brand colors so customers recognize you.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="primaryColor">Primary Brand Color</Label>
                <div className="flex gap-4 items-center">
                  <Input 
                    id="primaryColor" 
                    type="color" 
                    value={primaryColor} 
                    onChange={(e) => setPrimaryColor(e.target.value)} 
                    className="w-16 h-12 p-1 cursor-pointer"
                  />
                  <Input type="text" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className="font-mono uppercase w-32" />
                </div>
                <p className="text-sm text-muted-foreground mt-2">This color will be used for your stamps and primary buttons.</p>
              </div>
              <div className="p-6 border border-border rounded-lg bg-background flex flex-col items-center gap-4">
                <p className="text-sm font-medium">Preview</p>
                <div className="w-16 h-16 rounded-full flex items-center justify-center shadow-md" style={{ backgroundColor: primaryColor }}>
                  <div className="w-8 h-8 rounded-full bg-white opacity-20"></div>
                </div>
                <Button style={{ backgroundColor: primaryColor, color: '#fff' }} className="hover:opacity-90">Preview Button</Button>
              </div>
            </CardContent>
            <CardFooter className="justify-between">
              <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
              <Button onClick={() => setStep(3)} className="font-semibold">Next Step</Button>
            </CardFooter>
          </>
        )}

        {step === 3 && (
          <>
            <CardHeader>
              <CardTitle className="text-2xl font-heading text-foreground">First Loyalty Program</CardTitle>
              <CardDescription>What will your customers earn?</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="programName">Program Name</Label>
                <Input id="programName" value={programName} onChange={(e) => setProgramName(e.target.value)} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="stampTarget">Stamps Required for Reward</Label>
                  <Input id="stampTarget" type="number" min="1" max="20" value={stampTarget} onChange={(e) => setStampTarget(parseInt(e.target.value) || 10)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rewardTitle">Reward Title</Label>
                  <Input id="rewardTitle" placeholder="e.g. 1 Free Coffee" value={rewardTitle} onChange={(e) => setRewardTitle(e.target.value)} />
                </div>
              </div>
              <div className="mt-6 p-4 bg-muted/50 rounded-lg border border-border">
                <h4 className="font-semibold text-foreground mb-2">Summary</h4>
                <p className="text-sm text-foreground">
                  Customers at <strong style={{ color: primaryColor }}>{businessName}</strong> will need to collect <strong>{stampTarget} stamps</strong> to earn <strong>{rewardTitle}</strong>.
                </p>
              </div>
            </CardContent>
            <CardFooter className="justify-between">
              <Button variant="outline" onClick={() => setStep(2)} disabled={loading}>Back</Button>
              <Button onClick={handleComplete} disabled={loading} className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold">
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Complete Setup"}
              </Button>
            </CardFooter>
          </>
        )}
      </Card>
    </div>
  );
}