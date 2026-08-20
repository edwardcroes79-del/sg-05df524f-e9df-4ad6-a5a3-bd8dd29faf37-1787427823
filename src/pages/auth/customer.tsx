import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import Link from "next/link";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Gift, Lock, Mail, User, ArrowLeft, ShieldCheck } from "lucide-react";

export default function CustomerAuth() {
  const router = useRouter();
  const { returnUrl } = router.query;
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);
  const [fetchingContext, setFetchingContext] = useState(false);
  
  // Dynamic business context parsed from the QR returnUrl
  const [businessName, setBusinessName] = useState("");
  const [programName, setProgramName] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [accentColor, setAccentColor] = useState("");

  // Input states
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [activeTab, setActiveTab] = useState("signin");

  // MFA States
  const [mfaRequired, setMfaRequired] = useState(false);
  const [mfaFactorId, setMfaFactorId] = useState("");
  const [mfaCode, setMfaCode] = useState("");

  useEffect(() => {
    if (!returnUrl) return;

    const fetchBusinessContext = async () => {
      setFetchingContext(true);
      try {
        const decodedUrl = decodeURIComponent(returnUrl as string);
        // Extracting slug and id from path: /join/[business_slug]/[program_id]
        const match = decodedUrl.match(/\/join\/([^/]+)\/([^/]+)/);
        if (match && match[1] && match[2]) {
          const slug = match[1];
          const programId = match[2];

          const { data: businessData } = await supabase
            .from("businesses")
            .select("id, business_name, logo")
            .eq("slug", slug)
            .single();

          if (businessData) {
            setBusinessName(businessData.business_name);
            setLogoUrl(businessData.logo || "");

            const { data: programData } = await supabase
              .from("loyalty_programs")
              .select("name, primary_color")
              .eq("id", programId)
              .single();

            if (programData) {
              setProgramName(programData.name);
              setAccentColor(programData.primary_color || "");
            }
          }
        }
      } catch (err) {
        console.error("Error fetching auth business context:", err);
      } finally {
        setFetchingContext(false);
      }
    };

    fetchBusinessContext();
  }, [returnUrl]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        toast({
          title: "Sign In Failed",
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
        title: "Welcome Back!",
        description: "Logged in successfully to your loyalty wallet.",
      });
      
      // Return back to join program QR page
      if (returnUrl) {
        router.push(returnUrl as string);
      } else {
        router.push("/customer");
      }
      
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message,
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
      
      if (returnUrl) {
        router.push(returnUrl as string);
      } else {
        router.push("/customer");
      }

    } catch (err: any) {
      toast({
        title: "Verification Failed",
        description: err.message || "Invalid two-factor authentication code.",
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast({
        title: "Name required",
        description: "Please enter your name to personalize your card.",
        variant: "destructive",
      });
      return;
    }
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name,
          }
        }
      });

      if (error) {
        toast({
          title: "Registration Failed",
          description: error.message,
          variant: "destructive",
        });
      } else {
        if (data.session) {
          // 1. Force role to 'customer' in the profile
          await supabase
            .from("profiles")
            .update({ role: "customer" })
            .eq("id", data.session.user.id);

          // 2. Pre-create customer record
          const { error: customerError } = await supabase
            .from("customers")
            .insert({
              user_id: data.session.user.id,
              name: name,
              email: email,
            });

          if (customerError) console.error("Error setting up customer record:", customerError);

          toast({
            title: "Account Created!",
            description: "Welcome! Your loyalty card is ready.",
          });

          if (returnUrl) {
            router.push(returnUrl as string);
          } else {
            router.push("/customer");
          }
        } else {
          toast({
            title: "Check your email",
            description: "We sent a confirmation link to verify your account.",
          });
        }
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>
          {businessName ? `Join ${businessName} Rewards` : "RoyaltyStamp Customer Login"}
        </title>
      </Head>
      <main className="min-h-screen flex items-center justify-center bg-muted/40 p-4">
        <div className="w-full max-w-md space-y-6">
          
          {/* Back to original program button if available */}
          {returnUrl && (
            <Link
              href={returnUrl as string}
              className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Program Details
            </Link>
          )}

          {/* Business branding context */}
          <div className="text-center space-y-4">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={businessName}
                className="w-20 h-20 mx-auto rounded-2xl object-cover border-2 shadow-sm"
                style={{ borderColor: accentColor || "hsl(var(--primary))" }}
              />
            ) : (
              <div 
                className="w-16 h-16 mx-auto rounded-2xl flex items-center justify-center text-white shadow-sm"
                style={{ backgroundColor: accentColor || "hsl(var(--primary))" }}
              >
                <Gift className="w-8 h-8" />
              </div>
            )}

            <div>
              <h1 className="text-2xl font-bold font-heading text-foreground">
                {businessName ? `${businessName} Rewards` : "RoyaltyStamp Wallet"}
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                {programName 
                  ? `Sign in or sign up to collect stamps for "${programName}"` 
                  : "Collect stamps and unlock rewards in Aruba"
                }
              </p>
            </div>
          </div>

          {!mfaRequired ? (
            <Card className="border shadow-sm">
              <CardContent className="p-6 pt-6">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                  <TabsList className="grid grid-cols-2 w-full mb-6">
                    <TabsTrigger value="signin">Sign In</TabsTrigger>
                    <TabsTrigger value="signup">New Account</TabsTrigger>
                  </TabsList>

                  {/* Sign In Form */}
                  <TabsContent value="signin">
                    <form onSubmit={handleSignIn} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="signin-email">Email Address</Label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="signin-email"
                            type="email"
                            placeholder="your.email@example.com"
                            className="pl-10"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            disabled={loading}
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <Label htmlFor="signin-password">Password</Label>
                          <Link 
                            href="/auth/reset-password" 
                            className="text-xs text-primary hover:underline"
                          >
                            Forgot Password?
                          </Link>
                        </div>
                        <div className="relative">
                          <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="signin-password"
                            type="password"
                            placeholder="••••••••"
                            className="pl-10"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            disabled={loading}
                          />
                        </div>
                      </div>

                      <Button 
                        type="submit" 
                        className="w-full h-11 text-base mt-2" 
                        disabled={loading || fetchingContext}
                        style={{ 
                          backgroundColor: accentColor || undefined, 
                          color: accentColor ? "#fff" : undefined 
                        }}
                      >
                        {loading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Signing In...
                          </>
                        ) : (
                          "Sign In to Earn Stamps"
                        )}
                      </Button>
                    </form>
                  </TabsContent>

                  {/* Create Customer Account Form */}
                  <TabsContent value="signup">
                    <form onSubmit={handleSignUp} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="signup-name">Your Full Name</Label>
                        <div className="relative">
                          <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="signup-name"
                            type="text"
                            placeholder="John Doe"
                            className="pl-10"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                            disabled={loading}
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="signup-email">Email Address</Label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="signup-email"
                            type="email"
                            placeholder="your.email@example.com"
                            className="pl-10"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            disabled={loading}
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="signup-password">Create Password</Label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="signup-password"
                            type="password"
                            placeholder="Minimum 6 characters"
                            className="pl-10"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            minLength={6}
                            disabled={loading}
                          />
                        </div>
                      </div>

                      <Button 
                        type="submit" 
                        className="w-full h-11 text-base mt-2" 
                        disabled={loading || fetchingContext}
                        style={{ 
                          backgroundColor: accentColor || undefined, 
                          color: accentColor ? "#fff" : undefined 
                        }}
                      >
                        {loading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Creating Account...
                          </>
                        ) : (
                          "Create Account & Collect Stamps"
                        )}
                      </Button>
                    </form>
                  </TabsContent>
                </Tabs>
              </CardContent>

              <CardFooter className="justify-center border-t p-4 text-xs text-muted-foreground">
                By continuing, you agree to the customer terms & rewards conditions.
              </CardFooter>
            </Card>
          ) : (
            <Card className="border shadow-sm">
              <CardHeader className="text-center pb-2">
                <div 
                  className="mx-auto w-12 h-12 rounded-full flex items-center justify-center mb-2 shadow-sm"
                  style={{ backgroundColor: accentColor || "hsl(var(--primary))" }}
                >
                  <ShieldCheck className="w-6 h-6 text-white" />
                </div>
                <CardTitle className="text-2xl font-heading text-foreground">Security Check</CardTitle>
                <CardDescription>Enter the 6-digit code from your authenticator app.</CardDescription>
              </CardHeader>
              <CardContent className="p-6 pt-2">
                <form onSubmit={handleVerifyMfa} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="customerMfaCode">Verification Code</Label>
                    <Input 
                      id="customerMfaCode" 
                      type="text" 
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={6}
                      placeholder="000000" 
                      className="text-center text-2xl tracking-[0.2em] font-mono py-6"
                      value={mfaCode}
                      onChange={(e) => setMfaCode(e.target.value)}
                      required 
                      disabled={loading}
                    />
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full h-11 text-base mt-2" 
                    disabled={loading || mfaCode.length < 6}
                    style={{ 
                      backgroundColor: accentColor || undefined, 
                      color: accentColor ? "#fff" : undefined 
                    }}
                  >
                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Verify Identity"}
                  </Button>
                  <Button type="button" variant="ghost" className="w-full h-11 text-base mt-1" onClick={() => {
                    setMfaRequired(false);
                    supabase.auth.signOut();
                  }} disabled={loading}>
                    Cancel
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Option for merchants to switch */}
          <div className="text-center text-xs text-muted-foreground">
            Are you a merchant?{" "}
            <Link href="/auth/login" className="text-primary hover:underline font-semibold">
              Business Login
            </Link>
          </div>
        </div>
      </main>
    </>
  );
}