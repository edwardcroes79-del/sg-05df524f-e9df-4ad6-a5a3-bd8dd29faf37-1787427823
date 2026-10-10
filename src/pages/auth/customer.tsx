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
import { getMfaRouteRequirement, normalizeInternalReturnPath } from "@/lib/authSecurity";
import { useRef } from "react";
import { LanguageSelector } from "@/components/LanguageSelector";
import { useI18n } from "@/contexts/I18nProvider";
import Script from "next/script";

declare global {
  interface Window {
    turnstile: any;
  }
}

export default function CustomerAuth() {
  const router = useRouter();
  const { returnUrl } = router.query;
  const safeReturnUrl = normalizeInternalReturnPath(returnUrl);
  const { toast } = useToast();
  const { t } = useI18n();

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
  const [isSuccess, setIsSuccess] = useState(false);

  // Turnstile states
  const [turnstileToken, setTurnstileToken] = useState<string>("");
  const turnstileRef = useRef<HTMLDivElement>(null);
  const turnstileWidgetId = useRef<string>("");

  const renderTurnstile = () => {
    if (typeof window === "undefined" || !window.turnstile || !turnstileRef.current) return;
    if (turnstileWidgetId.current) return;

    try {
      turnstileWidgetId.current = window.turnstile.render(turnstileRef.current, {
        sitekey: process.env.NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY,
        callback: (token: string) => setTurnstileToken(token),
        "expired-callback": () => setTurnstileToken(""),
        "error-callback": () => setTurnstileToken(""),
      });
    } catch (err) {
      console.error("Failed to render Turnstile:", err);
    }
  };

  useEffect(() => {
    if (activeTab === "signup") {
      renderTurnstile();
    } else {
      if (turnstileWidgetId.current && typeof window !== "undefined" && window.turnstile) {
        window.turnstile.remove(turnstileWidgetId.current);
        turnstileWidgetId.current = "";
        setTurnstileToken("");
      }
    }
  }, [activeTab]);

  useEffect(() => {
    return () => {
      if (turnstileWidgetId.current && typeof window !== "undefined" && window.turnstile) {
        window.turnstile.remove(turnstileWidgetId.current);
      }
    };
  }, []);

  // MFA States
  const [mfaRequired, setMfaRequired] = useState(false);
  const [mfaFactorId, setMfaFactorId] = useState("");
  const [mfaCode, setMfaCode] = useState("");

  const isSubmitting = useRef(false);

  useEffect(() => {
    if (!safeReturnUrl) return;

    const fetchBusinessContext = async () => {
      setFetchingContext(true);
      try {
        const decodedUrl = safeReturnUrl;
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

        const quickStampMatch = decodedUrl.match(/\/quick-stamp\/([^/?#]+)/);
        if (quickStampMatch && quickStampMatch[1]) {
          const { data: quickStampContext } = await (supabase as any).rpc("get_quick_stamp_qr_context", {
            p_token: quickStampMatch[1],
          });

          if (quickStampContext?.success) {
            setBusinessName(quickStampContext.business_name || "");
            setProgramName(quickStampContext.program_name || "");
            setLogoUrl(quickStampContext.business_logo || "");
            setAccentColor(quickStampContext.business_primary_color || "");
          }
        }
      } catch (err) {
        console.error("Error fetching auth business context:", err);
      } finally {
        setFetchingContext(false);
      }
    };

    fetchBusinessContext();
  }, [safeReturnUrl]);

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
          title: t("auth.customer.signInFailed"),
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
        title: t("auth.customer.welcomeBackTitle"),
        description: t("auth.customer.welcomeBackDescription"),
      });
      
      // Return back to join program QR page
      if (safeReturnUrl) {
        router.push(safeReturnUrl);
      } else {
        router.push("/customer");
      }
      
    } catch (err: any) {
      toast({
        title: t("auth.customer.error"),
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
        title: t("auth.mfa.successTitle"),
        description: t("auth.mfa.successDescription"),
      });
      
      if (safeReturnUrl) {
        router.push(safeReturnUrl);
      } else {
        router.push("/customer");
      }

    } catch (err: any) {
      toast({
        title: t("auth.mfa.failedTitle"),
        description: err.message || t("auth.mfa.failedDescription"),
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast({
        title: t("auth.customer.nameRequired"),
        description: t("auth.customer.nameRequiredDescription"),
        variant: "destructive",
      });
      return;
    }

    if (!turnstileToken) {
      toast({
        title: t("auth.customer.securityCheckRequired", "Security check required"),
        description: t("auth.customer.pleaseCompleteSecurityCheck", "Please complete the security check to continue."),
        variant: "destructive",
      });
      return;
    }

    if (isSubmitting.current) return;
    isSubmitting.current = true;
    setLoading(true);

    try {
      const response = await fetch("/api/auth/register-customer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          name,
          turnstileToken,
          returnUrl: safeReturnUrl,
          origin: typeof window !== "undefined" ? window.location.origin : ""
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        toast({
          title: t("auth.customer.registrationFailed"),
          description: result.error || t("auth.customer.createFailed"),
          variant: "destructive",
        });
        isSubmitting.current = false;
        setLoading(false);
      } else {
        // Strict Success State - Lock the form and prevent duplicate emails
        setIsSuccess(true);
        setPassword("");
        setName("");
        // Keep email state for the success message UI, but lock the form
        
        toast({
          title: t("auth.customer.accountCreatedTitle"),
          description: t("auth.customer.verifyEmailDescription"),
        });
        
        // We do NOT reset loading/isSubmitting here, intentionally leaving the form locked
      }
    } catch (err: any) {
      toast({
        title: t("auth.customer.error"),
        description: err.message,
        variant: "destructive",
      });
      isSubmitting.current = false;
      setLoading(false);
    } 
  };

  return (
    <>
      <Head>
        <title>
          {businessName ? t("auth.customer.seoJoinTitle", { businessName }) : t("auth.customer.seoDefaultTitle")}
        </title>
      </Head>
      <main className="min-h-screen flex items-center justify-center bg-muted/40 p-4">
        <div className="w-full max-w-md space-y-6">
          
          {/* Back to original program button if available */}
          {safeReturnUrl && (
            <Link
              href={safeReturnUrl}
              className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              {t("auth.customer.backToProgram")}
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
                {t("auth.customer.walletTitle")}
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                {t("auth.customer.defaultPrompt")}
              </p>
              {(businessName || programName) && (
                <p className="mt-2 text-xs font-medium text-muted-foreground">
                  {businessName ? t("auth.customer.businessRewardsTitle", { businessName }) : null}
                  {businessName && programName ? " · " : null}
                  {programName ? t("auth.customer.programPrompt", { programName }) : null}
                </p>
              )}
            </div>
          </div>

          {!mfaRequired ? (
            <Card className="border shadow-sm">
              <CardContent className="p-6 pt-6">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                  <TabsList className="grid grid-cols-2 w-full mb-6">
                    <TabsTrigger value="signin">{t("auth.customer.signInTab")}</TabsTrigger>
                    <TabsTrigger value="signup">{t("auth.customer.newAccountTab")}</TabsTrigger>
                  </TabsList>

                  {/* Sign In Form */}
                  <TabsContent value="signin">
                    <form onSubmit={handleSignIn} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="signin-email">{t("auth.customer.email")}</Label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="signin-email"
                            type="email"
                            placeholder={t("auth.customer.emailPlaceholder")}
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
                          <Label htmlFor="signin-password">{t("auth.customer.password")}</Label>
                          <Link 
                            href="/auth/reset-password" 
                            className="text-xs text-primary hover:underline"
                          >
                            {t("auth.customer.forgotPassword")}
                          </Link>
                        </div>
                        <div className="relative">
                          <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="signin-password"
                            type="password"
                            placeholder={t("auth.customer.signingIn")}
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
                            {t("auth.customer.signInCta")}
                          </>
                        ) : (
                          t("auth.customer.signInCta")
                        )}
                      </Button>
                    </form>
                  </TabsContent>

                  {/* Create Customer Account Form */}
                  <TabsContent value="signup">
                    <form onSubmit={handleSignUp} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="signup-name">{t("auth.customer.fullName")}</Label>
                        <div className="relative">
                          <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="signup-name"
                            type="text"
                            placeholder={t("auth.customer.namePlaceholder")}
                            className="pl-10"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                            disabled={loading || isSuccess}
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="signup-email">{t("auth.customer.email")}</Label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="signup-email"
                            type="email"
                            placeholder={t("auth.customer.emailPlaceholder")}
                            className="pl-10"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            disabled={loading || isSuccess}
                          />
                        </div>
                      </div>

                      {isSuccess ? (
                        <div className="p-4 bg-green-50 text-green-700 border border-green-200 rounded-md text-sm text-center">
                          <ShieldCheck className="w-6 h-6 mx-auto mb-2 text-green-600" />
                          <p className="font-semibold">{t("auth.customer.accountCreatedTitle")}</p>
                          <p className="mt-1">{t("auth.customer.successMessage", { email })}</p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor="signup-password">{t("auth.customer.createPassword")}</Label>
                            <div className="relative">
                              <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                              <Input
                                id="signup-password"
                                type="password"
                                placeholder={t("auth.customer.passwordPlaceholder")}
                                className="pl-10"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                minLength={6}
                                disabled={loading}
                              />
                            </div>
                          </div>

                          <div className="flex justify-center min-h-[65px]">
                            <div ref={turnstileRef}></div>
                          </div>
                        </div>
                      )}

                      <Button 
                        type="submit" 
                        className="w-full h-11 text-base mt-2" 
                        disabled={loading || isSuccess || fetchingContext}
                        style={{ 
                          backgroundColor: isSuccess ? "#22c55e" : (accentColor || undefined), 
                          color: (isSuccess || accentColor) ? "#fff" : undefined 
                        }}
                      >
                        {isSuccess ? (
                          t("auth.customer.checkEmail")
                        ) : loading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            {t("auth.customer.creatingAccount")}
                          </>
                        ) : (
                          t("auth.customer.createAndCollect")
                        )}
                      </Button>
                    </form>
                  </TabsContent>
                </Tabs>
              </CardContent>

              <CardFooter className="justify-center border-t p-4 text-xs text-muted-foreground">
                {t("auth.customer.terms")}
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
                <CardTitle className="text-2xl font-heading text-foreground">{t("auth.customer.securityCheck")}</CardTitle>
                <CardDescription>{t("auth.customer.securityDescription")}</CardDescription>
              </CardHeader>
              <CardContent className="p-6 pt-2">
                <form onSubmit={handleVerifyMfa} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="customerMfaCode">{t("auth.customer.verificationCode")}</Label>
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
                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : t("auth.customer.verifyIdentity")}
                  </Button>
                  <Button type="button" variant="ghost" className="w-full h-11 text-base mt-1" onClick={() => {
                    setMfaRequired(false);
                    supabase.auth.signOut();
                  }} disabled={loading}>
                    {t("auth.customer.cancel")}
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Option for merchants to switch */}
          <div className="text-center text-xs text-muted-foreground">
            {t("auth.customer.merchantPrompt")}{" "}
            <Link href="/auth/login" className="text-primary hover:underline font-semibold">
              {t("auth.customer.businessLogin")}
            </Link>
          </div>
          <div className="absolute top-4 right-4">
            <LanguageSelector compact />
          </div>
        </div>
        <Script 
          src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" 
          strategy="afterInteractive"
          onLoad={renderTurnstile}
        />
      </main>
    </>
  );
}