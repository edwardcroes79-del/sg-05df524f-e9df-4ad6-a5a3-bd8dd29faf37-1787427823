import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { getURL } from "@/services/authService";
import { normalizeInternalReturnPath } from "@/lib/authSecurity";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Mail } from "lucide-react";
import { SEO } from "@/components/SEO";

export default function Register() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isConfirmationSent, setIsConfirmationSent] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);
  const router = useRouter();
  const { returnUrl } = router.query;
  const safeReturnUrl = normalizeInternalReturnPath(returnUrl);
  const { toast } = useToast();

  // Handle the countdown timer for the resend button
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (resendCooldown > 0) {
      timer = setTimeout(() => setResendCooldown((prev) => prev - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${getURL()}auth/login?confirmed=true${safeReturnUrl ? `&returnUrl=${encodeURIComponent(safeReturnUrl)}` : ""}`,
        }
      });

      if (error) {
        const isRateLimit = error.message.toLowerCase().includes("rate limit") || error.status === 429;
        
        if (isRateLimit) {
          // Check if the account was actually created but the email was rate-limited
          const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
          
          if (signInError && signInError.message.toLowerCase().includes("email not confirmed")) {
            // Account exists, but email is unconfirmed.
            setRegisteredEmail(email);
            setIsConfirmationSent(true);
            setResendCooldown(60);
            toast({
              title: "Account Already Created",
              description: "Your account exists but is unconfirmed. We've reached the email limit, please wait before requesting another email.",
            });
            return;
          }
          
          toast({
            title: "Email temporarily rate-limited",
            description: "Please wait a short time before requesting another confirmation email.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Registration Failed",
            description: error.message,
            variant: "destructive",
          });
        }
      } else {
        if (data.session) {
          toast({
            title: "Registration Successful",
            description: safeReturnUrl ? "Welcome! You can now join the loyalty program." : "Welcome! Let's get your business set up.",
          });
          if (safeReturnUrl) {
            await supabase.from("profiles").update({ role: "customer" }).eq("id", data.session.user.id);
            router.push(safeReturnUrl);
          } else {
            router.push("/onboarding");
          }
        } else {
          // Email confirmation is required
          setRegisteredEmail(email);
          setIsConfirmationSent(true);
        }
      }
    } catch (err: any) {
      toast({
        title: "An error occurred",
        description: err.message || "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (isConfirmationSent) {
    return (
      <div className="min-h-screen bg-background flex flex-col justify-center items-center p-4">
        <SEO title="Check Your Email - Aruba Royalty Stamp" description="Confirm your email to activate your account." />
        <Card className="w-full max-w-md border-border shadow-sm text-center pt-6">
          <CardHeader className="space-y-4 pb-2">
            <div className="mx-auto w-16 h-16 bg-primary/10 text-primary flex items-center justify-center rounded-full mb-2">
              <Mail className="w-8 h-8" />
            </div>
            <CardTitle className="text-2xl font-heading">Check Your Email</CardTitle>
            <CardDescription className="text-base">
              We've sent a confirmation email to:
              <br />
              <strong className="text-foreground mt-1 block">{registeredEmail}</strong>
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4 pb-6 space-y-6">
            <p className="text-sm text-muted-foreground">
              Please check your inbox (and spam folder) and click the confirmation link to activate your account.
            </p>
            
            <div className="space-y-3 pt-4">
              <Button 
                variant="outline" 
                className="w-full font-semibold"
                disabled={resendCooldown > 0}
                onClick={async () => {
                  setResendCooldown(60);
                  const { error } = await supabase.auth.resend({
                    type: 'signup',
                    email: registeredEmail,
                    options: {
                      emailRedirectTo: `${getURL()}auth/login?confirmed=true${safeReturnUrl ? `&returnUrl=${encodeURIComponent(safeReturnUrl)}` : ""}`
                    }
                  });
                  if (error) {
                    const isRateLimit = error.message.toLowerCase().includes("rate limit") || error.status === 429;
                    toast({ 
                      title: isRateLimit ? "Too Many Email Requests" : "Failed to resend", 
                      description: isRateLimit ? "Please wait a few minutes before trying again." : error.message, 
                      variant: "destructive" 
                    });
                  } else {
                    toast({ title: "Email resent", description: "Please check your inbox." });
                  }
                }}
              >
                {resendCooldown > 0 ? `Resend available in ${resendCooldown}s` : "Resend Confirmation Email"}
              </Button>
              <Button variant="ghost" className="w-full text-muted-foreground hover:text-foreground" asChild>
                <Link href="/auth/login">Return to Login</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center items-center p-4">
      <SEO title="Register Business - Aruba Royalty Stamp" description="Create an account to start your digital loyalty program in Aruba." />
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-block">
            <h1 className="font-heading text-3xl font-bold text-foreground">Royalty<span className="text-primary">Stamp</span></h1>
          </Link>
        </div>
        
        <Card className="border-border shadow-sm">
          <CardHeader>
            <CardTitle className="text-2xl font-heading text-foreground">
              {safeReturnUrl ? "Create Customer Account" : "Create Account"}
            </CardTitle>
            <CardDescription>
              {safeReturnUrl ? "Sign up to start earning rewards." : "Start turning your visitors into loyal customers today."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Business Email</Label>
                <Input 
                  id="email" 
                  type="email" 
                  placeholder="hello@yourbusiness.aw" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input 
                  id="password" 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required 
                  minLength={6}
                />
                <p className="text-xs text-muted-foreground mt-1">Must be at least 6 characters long.</p>
              </div>
              <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold mt-6" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating Account...
                  </>
                ) : (
                  safeReturnUrl ? "Create Customer Account" : "Create Account"
                )}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="justify-center border-t p-4 mt-4">
            <p className="text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link href={`/auth/login${safeReturnUrl ? `?returnUrl=${encodeURIComponent(safeReturnUrl)}` : ""}`} className="text-primary hover:underline font-medium">
                Sign in
              </Link>
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}