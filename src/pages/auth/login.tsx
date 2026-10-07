import { useEffect, useState } from "react";
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
import { LanguageSelector } from "@/components/LanguageSelector";
import { useI18n } from "@/contexts/I18nProvider";
import { getMfaRouteRequirement, normalizeInternalReturnPath } from "@/lib/authSecurity";

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
  const { t } = useI18n();
  const safeReturnUrl = normalizeInternalReturnPath(returnUrl);

  const routeUser = async () => {
    if (safeReturnUrl) {
      router.push(safeReturnUrl);
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

  useEffect(() => {
    if (!router.isReady) return;

    const prepareExistingMfaSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const requirement = await getMfaRouteRequirement();

      if (requirement.required && requirement.factorId) {
        setMfaFactorId(requirement.factorId);
        setMfaRequired(true);
        return;
      }

      if (router.query.mfa === "required") {
        await routeUser();
      }
    };

    prepareExistingMfaSession();
  }, [router.isReady, router.query.mfa]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        toast({
          title: t("auth.login.failed"),
          description: error.message,
          variant: "destructive",
        });
        setLoading(false);
        return;
      } 
      
      const requirement = await getMfaRouteRequirement();

      if (requirement.required && requirement.factorId) {
        setMfaFactorId(requirement.factorId);
        setMfaRequired(true);
        setLoading(false);
        return;
      }

      toast({
        title: t("auth.login.welcomeBackToast"),
        description: t("auth.login.success"),
      });
      
      await routeUser();
      
    } catch (err: any) {
      toast({
        title: t("auth.login.error"),
        description: err.message || t("auth.login.tryAgain"),
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
      
      await routeUser();

    } catch (err: any) {
      toast({
        title: t("auth.mfa.failedTitle"),
        description: err.message || t("auth.mfa.failedDescription"),
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
            {t("common.backToHome")}
          </Button>
        </Link>
      </div>
      <div className="absolute top-4 right-4 md:top-8 md:right-8">
        <LanguageSelector compact />
      </div>

      <SEO title={t("auth.login.seoTitle")} description={t("auth.login.seoDescription")} />
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-block">
            <h1 className="font-heading text-3xl font-bold text-foreground">RoyaltyStamp</h1>
          </Link>
        </div>
        
        {!mfaRequired ? (
          <Card className="border-border shadow-sm">
            <CardHeader>
              <CardTitle className="text-2xl font-heading text-foreground">{t("auth.login.welcome")}</CardTitle>
              <CardDescription>{t("auth.login.description")}</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">{t("auth.login.email")}</Label>
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
                    <Label htmlFor="password">{t("auth.login.password")}</Label>
                    <Link href="/auth/reset-password" className="text-sm text-primary hover:underline font-medium">
                      {t("auth.login.forgotPassword")}
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
                  {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : t("auth.login.signIn")}
                </Button>
              </form>
            </CardContent>
            <CardFooter className="justify-center border-t p-4 mt-4">
              <p className="text-sm text-muted-foreground">
                {t("auth.login.noAccount")}{" "}
                <Link href={`/auth/register${safeReturnUrl ? `?returnUrl=${encodeURIComponent(safeReturnUrl)}` : ""}`} className="text-primary hover:underline font-medium">
                  {safeReturnUrl ? t("auth.login.createCustomerAccount") : t("auth.login.registerBusiness")}
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
              <CardTitle className="text-2xl font-heading text-foreground">{t("auth.mfa.title")}</CardTitle>
              <CardDescription>{t("auth.mfa.description")}</CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <form onSubmit={handleVerifyMfa} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="mfaCode">{t("auth.mfa.code")}</Label>
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
                  {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : t("auth.mfa.verify")}
                </Button>
                <Button type="button" variant="ghost" className="w-full" onClick={() => {
                  setMfaRequired(false);
                  supabase.auth.signOut();
                }} disabled={loading}>
                  {t("common.cancelAndSignOut")}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}