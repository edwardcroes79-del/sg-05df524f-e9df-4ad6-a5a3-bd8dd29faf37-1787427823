import { useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowLeft, ShieldCheck } from "lucide-react";
import { SEO } from "@/components/SEO";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  
  // MFA States
  const [mfaRequired, setMfaRequired] = useState(false);
  const [mfaFactorId, setMfaFactorId] = useState("");
  const [mfaCode, setMfaCode] = useState("");
  
  const router = useRouter();
  const { returnUrl } = router.query;
  const { toast } = useToast();

  const routeUser = async () => {
    if (returnUrl) {
      router.push(returnUrl as string);
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("is_super_admin, role")
        .eq("id", user.id)
        .maybeSingle();

      if (profile?.is_super_admin || profile?.role === 'super_admin') {
        router.push("/admin");
        return;
      }

      if (profile?.role === 'customer') {
        router.push("/customer");
        return;
      }

      const { data: businessUser } = await supabase
        .from("business_users")
        .select("business_id")
        .eq("user_id", user.id)
        .maybeSingle();
        
      if (businessUser?.business_id) {
        router.push("/dashboard");
      } else {
        router.push("/onboarding");
      }
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        toast({
          title: "Login Failed",
          description: error.message,
          variant: "destructive",
        });
        setLoading(false);
        return;
      } 
      
      // Check if MFA is required (AAL step up)
      const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (aal && aal.nextLevel === 'aal2' && aal.currentLevel === 'aal1') {
        const { data: factors } = await supabase.auth.mfa.listFactors();
        const totpFactor = factors?.totp.find((f: any) => f.status === 'verified');
        
        if (totpFactor) {
          setMfaFactorId(totpFactor.id);
          setMfaRequired(true);
          setLoading(false);
          return;
        }
      }

      toast({
        title: "Welcome back!",
        description: "Successfully logged in.",
      });
      
      await routeUser();
      
    } catch (err: any) {
      toast({
        title: "An error occurred",
        description: err.message || "Please try again later.",
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  const handleVerifyMfa = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const challenge = await supabase.auth.mfa.challenge({ factorId: mfaFactorId });
      if (challenge.error) throw challenge.error;

      const verify = await supabase.auth.mfa.verify({
        factorId: mfaFactorId,
        challengeId: challenge.data.id,
        code: mfaCode
      });

      if (verify.error) throw verify.error;

      toast({
        title: "Verification Successful",
        description: "Your identity has been verified.",
      });
      
      await routeUser();

    } catch (err: any) {
      toast({
        title: "Verification Failed",
        description: err.message || "Invalid two-factor authentication code.",
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center items-center p-4 relative">
      <div className="absolute top-4 left-4 md:top-8 md:left-8">
        <Link href="/">
          <Button variant="ghost" className="gap-2 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Button>
        </Link>
      </div>

      <SEO title="Login - Aruba Royalty Stamp" description="Log in to manage your digital loyalty programs." />
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-block">
            <h1 className="font-heading text-3xl font-bold text-foreground">Royalty<span className="text-primary">Stamp</span></h1>
          </Link>
        </div>
        
        {!mfaRequired ? (
          <Card className="border-border shadow-sm">
            <CardHeader>
              <CardTitle className="text-2xl font-heading text-foreground">Welcome Back</CardTitle>
              <CardDescription>Enter your credentials to access your business dashboard.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input 
                    id="email" 
                    type="email" 
                    placeholder="name@business.aw" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required 
                    disabled={loading}
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Password</Label>
                    <Link href="/auth/reset-password" className="text-sm text-primary hover:underline font-medium">
                      Forgot password?
                    </Link>
                  </div>
                  <Input 
                    id="password" 
                    type="password" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required 
                    disabled={loading}
                  />
                </div>
                <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold" disabled={loading}>
                  {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Sign In"}
                </Button>
              </form>
            </CardContent>
            <CardFooter className="justify-center border-t p-4 mt-4">
              <p className="text-sm text-muted-foreground">
                Don't have an account?{" "}
                <Link href={`/auth/register${returnUrl ? `?returnUrl=${encodeURIComponent(returnUrl as string)}` : ''}`} className="text-primary hover:underline font-medium">
                  {returnUrl ? "Create Customer Account" : "Register your business"}
                </Link>
              </p>
            </CardFooter>
          </Card>
        ) : (
          <Card className="border-border shadow-sm">
            <CardHeader className="text-center pb-2">
              <div className="mx-auto bg-primary/10 w-12 h-12 rounded-full flex items-center justify-center mb-2">
                <ShieldCheck className="w-6 h-6 text-primary" />
              </div>
              <CardTitle className="text-2xl font-heading text-foreground">Two-Factor Authentication</CardTitle>
              <CardDescription>Enter the 6-digit verification code generated by your authenticator app.</CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <form onSubmit={handleVerifyMfa} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="mfaCode">Verification Code</Label>
                  <Input 
                    id="mfaCode" 
                    type="text" 
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    placeholder="000000" 
                    className="text-center text-2xl tracking-widest font-mono py-6"
                    value={mfaCode}
                    onChange={(e) => setMfaCode(e.target.value)}
                    required 
                    disabled={loading}
                  />
                </div>
                <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold h-11" disabled={loading || mfaCode.length < 6}>
                  {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Verify Identity"}
                </Button>
                <Button type="button" variant="ghost" className="w-full" onClick={() => {
                  setMfaRequired(false);
                  supabase.auth.signOut();
                }} disabled={loading}>
                  Cancel and sign out
                </Button>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}