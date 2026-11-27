import { useEffect, useRef, useState } from "react";
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
import { Loader2, Gift, Lock, Mail, User, ArrowLeft, ShieldCheck, Eye, EyeOff } from "lucide-react";
import { getMfaRouteRequirement, normalizeInternalReturnPath } from "@/lib/authSecurity";
import { LanguageSelector } from "@/components/LanguageSelector";
import { TurnstileVerification } from "@/components/TurnstileVerification";
import { useI18n } from "@/contexts/I18nProvider";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { ensureCustomerJoinForProgram, ensureCustomerRecord } from "@/services/customerMembershipService";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function getFriendlyCustomerAuthError(message: string) {
  const normalizedMessage = message.toLowerCase();

  if (normalizedMessage.includes("email not confirmed")) {
    return "This account still needs email confirmation. Please use your original verification email or reset your password to regain access.";
  }

  if (normalizedMessage.includes("invalid login credentials")) {
    return "Incorrect email or password. Please try again.";
  }

  if (
    normalizedMessage.includes("already been registered") ||
    normalizedMessage.includes("user already registered") ||
    normalizedMessage.includes("email address is already registered")
  ) {
    return "An account with this email already exists. Please sign in or reset your password.";
  }

  if (normalizedMessage.includes("password")) {
    return "Please choose a password with at least 6 characters.";
  }

  if (normalizedMessage.includes("email")) {
    return "Please enter a valid email address.";
  }

  return message;
}

function isDuplicateRegistrationError(message: string) {
  const normalizedMessage = message.toLowerCase();

  return (
    normalizedMessage.includes("already been registered") ||
    normalizedMessage.includes("user already registered") ||
    normalizedMessage.includes("email address is already registered")
  );
}

function getJoinProgramIdFromReturnUrl(returnPath?: string | null) {
  if (!returnPath) {
    return null;
  }

  const legacyJoinMatch = returnPath.match(/^\/join\/[^/]+\/([^/?#]+)/);
  if (legacyJoinMatch?.[1]) {
    return legacyJoinMatch[1];
  }

  const simplifiedJoinMatch = returnPath.match(/^\/join\/([^/?#]+)/);
  return simplifiedJoinMatch?.[1] ?? null;
}

export default function CustomerAuth() {
  const router = useRouter();
  const { returnUrl } = router.query;
  const safeReturnUrl = normalizeInternalReturnPath(returnUrl);
  const { toast } = useToast();
  const { t } = useI18n();

  const [loading, setLoading] = useState(false);
  const [fetchingContext, setFetchingContext] = useState(false);
  const [businessName, setBusinessName] = useState("");
  const [programName, setProgramName] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [, setAccentColor] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [activeTab, setActiveTab] = useState("signin");
  const [isSuccess, setIsSuccess] = useState(false);
  const [showSignInPassword, setShowSignInPassword] = useState(false);
  const [showSignUpPassword, setShowSignUpPassword] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState("");
  const [turnstileResetSignal, setTurnstileResetSignal] = useState(0);
  const [mfaRequired, setMfaRequired] = useState(false);
  const [mfaFactorId, setMfaFactorId] = useState("");
  const [mfaCode, setMfaCode] = useState("");
  const isSubmitting = useRef(false);

  const resetTurnstileVerification = () => {
    setTurnstileToken("");
    setTurnstileResetSignal((current) => current + 1);
  };

  useEffect(() => {
    if (!safeReturnUrl) return;

    const fetchBusinessContext = async () => {
      setFetchingContext(true);

      try {
        const decodedUrl = safeReturnUrl;
        const legacyJoinMatch = decodedUrl.match(/\/join\/([^/]+)\/([^/]+)/);
        const simplifiedJoinMatch = decodedUrl.match(/\/join\/([^/?#]+)/);
        const quickStampMatch = decodedUrl.match(/\/quick-stamp\/([^/?#]+)/);

        if (legacyJoinMatch?.[1] && legacyJoinMatch?.[2]) {
          const slug = legacyJoinMatch[1];
          const programId = legacyJoinMatch[2];

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
              setProgramName(programData.name || "");
              setAccentColor(programData.primary_color || "");
            }
          }

          return;
        }

        if (simplifiedJoinMatch?.[1]) {
          const { data: programData } = await supabase
            .from("loyalty_programs")
            .select(`
              id,
              name,
              primary_color,
              businesses!inner (
                business_name,
                logo,
                primary_color
              )
            `)
            .eq("id", simplifiedJoinMatch[1])
            .maybeSingle();

          if (programData) {
            const business = Array.isArray(programData.businesses) ? programData.businesses[0] : programData.businesses;
            setBusinessName(business?.business_name || "");
            setLogoUrl(business?.logo || "");
            setProgramName(programData.name || "");
            setAccentColor(programData.primary_color || business?.primary_color || "");
          }

          return;
        }

        if (quickStampMatch?.[1]) {
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
      } catch (error) {
        console.error("Error fetching auth business context:", error);
      } finally {
        setFetchingContext(false);
      }
    };

    void fetchBusinessContext();
  }, [safeReturnUrl]);

  const routeSignedInUser = async (user: SupabaseUser | null | undefined) => {
    const userId = user?.id;

    if (!userId) {
      if (safeReturnUrl) {
        await router.push(safeReturnUrl);
      } else {
        await router.push("/customer");
      }
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role, is_super_admin")
      .eq("id", userId)
      .maybeSingle();

    const { data: customerRecord } = await supabase
      .from("customers")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();

    if (customerRecord || profile?.role === "customer") {
      const joinProgramId = getJoinProgramIdFromReturnUrl(safeReturnUrl);

      if (joinProgramId && user) {
        const joinResult = await ensureCustomerJoinForProgram({
          user,
          loyaltyProgramId: joinProgramId,
          nameOverride:
            String(user.user_metadata?.full_name || "").trim() ||
            String(user.user_metadata?.name || "").trim() ||
            undefined,
        });

        await router.push(`/customer/cards?cardId=${encodeURIComponent(joinResult.cardId)}`);
        return;
      }

      if (safeReturnUrl) {
        await router.push(safeReturnUrl);
      } else {
        await router.push("/customer");
      }
      return;
    }

    if (profile?.is_super_admin || profile?.role === "super_admin") {
      await router.push("/admin");
      return;
    }

    const { data: businessUser } = await supabase
      .from("business_users")
      .select("business_id")
      .eq("user_id", userId)
      .maybeSingle();

    if (businessUser?.business_id) {
      await router.push("/dashboard");
      return;
    }

    if (safeReturnUrl) {
      await router.push(safeReturnUrl);
    } else {
      await router.push("/customer");
    }
  };

  const recoverExistingCustomerAccess = async (normalizedEmail: string, submittedPassword: string, normalizedName: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password: submittedPassword,
    });

    if (error) {
      toast({
        title: t("auth.customer.registrationFailed"),
        description: getFriendlyCustomerAuthError(error.message),
        variant: "destructive",
      });
      return false;
    }

    if (data.user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role, is_super_admin")
        .eq("id", data.user.id)
        .maybeSingle();

      const canResumeCustomerSetup = !profile?.is_super_admin && (!profile?.role || profile.role === "customer");

      if (canResumeCustomerSetup) {
        await ensureCustomerRecord(data.user, normalizedName);
      }

      toast({
        title: "Account recovered",
        description: "Your account already existed. We signed you in and resumed your loyalty access.",
      });

      await routeSignedInUser(data.user);
      return true;
    }

    return false;
  };

  const handleSignIn = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        toast({
          title: t("auth.customer.signInFailed"),
          description: getFriendlyCustomerAuthError(error.message),
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      const requirement = await getMfaRouteRequirement();

      if (requirement.required && requirement.factorId) {
        setMfaFactorId(requirement.factorId);
        setMfaRequired(true);
        setLoading(false);
        return;
      }

      toast({
        title: t("auth.customer.welcomeBackTitle"),
        description: t("auth.customer.welcomeBackDescription"),
      });

      await routeSignedInUser(data.user);
    } catch (error) {
      toast({
        title: t("auth.customer.error"),
        description: error instanceof Error ? error.message : t("auth.customer.createFailed"),
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  const handleVerifyMfa = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);

    try {
      const challenge = await supabase.auth.mfa.challenge({ factorId: mfaFactorId });
      if (challenge.error) throw challenge.error;

      const verify = await supabase.auth.mfa.verify({
        factorId: mfaFactorId,
        challengeId: challenge.data.id,
        code: mfaCode,
      });

      if (verify.error) throw verify.error;

      toast({
        title: t("auth.mfa.successTitle"),
        description: t("auth.mfa.successDescription"),
      });

      const { data: currentUser } = await supabase.auth.getUser();
      await routeSignedInUser(currentUser.user);
    } catch (error) {
      toast({
        title: t("auth.mfa.failedTitle"),
        description: error instanceof Error ? error.message : t("auth.mfa.failedDescription"),
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  const handleSignUp = async (event: React.FormEvent) => {
    event.preventDefault();

    const normalizedName = name.trim();
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedName) {
      toast({
        title: t("auth.customer.nameRequired"),
        description: t("auth.customer.nameRequiredDescription"),
        variant: "destructive",
      });
      return;
    }

    if (!normalizedEmail || !EMAIL_PATTERN.test(normalizedEmail)) {
      toast({
        title: t("auth.customer.registrationFailed"),
        description: "Please enter a valid email address.",
        variant: "destructive",
      });
      return;
    }

    if (!password || password.length < 6) {
      toast({
        title: t("auth.customer.registrationFailed"),
        description: "Please choose a password with at least 6 characters.",
        variant: "destructive",
      });
      return;
    }

    if (!turnstileToken) {
      toast({
        title: t("auth.customer.registrationFailed"),
        description: "Please complete the security verification before creating your account.",
        variant: "destructive",
      });
      return;
    }

    if (isSubmitting.current) return;

    isSubmitting.current = true;
    setLoading(true);
    let authAccountCreated = false;

    try {
      const verificationResponse = await fetch("/api/auth/register-customer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: normalizedEmail,
          password,
          name: normalizedName,
          turnstileToken,
        }),
      });

      const verificationPayload = await verificationResponse.json().catch(() => ({}));

      if (!verificationResponse.ok) {
        resetTurnstileVerification();
        toast({
          title: t("auth.customer.registrationFailed"),
          description:
            typeof verificationPayload?.error === "string"
              ? verificationPayload.error
              : "Security verification could not be completed. Please try again.",
          variant: "destructive",
        });
        return;
      }

      const { data, error } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          data: {
            full_name: normalizedName,
            name: normalizedName,
            registration_type: "customer",
            role: "customer",
          },
        },
      });

      if (error) {
        if (isDuplicateRegistrationError(error.message)) {
          const recovered = await recoverExistingCustomerAccess(normalizedEmail, password, normalizedName);
          if (recovered) {
            return;
          }
        }

        resetTurnstileVerification();
        toast({
          title: t("auth.customer.registrationFailed"),
          description: getFriendlyCustomerAuthError(error.message),
          variant: "destructive",
        });
        return;
      }

      if (!data.user) {
        throw new Error("Your account could not be created. Please try again.");
      }

      authAccountCreated = true;
      await ensureCustomerRecord(data.user, normalizedName);

      if (data.session) {
        toast({
          title: t("auth.customer.accountCreatedTitle"),
          description: "You are now signed in. Opening your loyalty card...",
        });

        await routeSignedInUser(data.user);
        return;
      }

      setEmail(normalizedEmail);
      setIsSuccess(true);
      setPassword("");
      setName("");

      toast({
        title: t("auth.customer.accountCreatedTitle"),
        description: t("auth.customer.verifyEmailDescription"),
      });
    } catch (error) {
      if (authAccountCreated) {
        const recovered = await recoverExistingCustomerAccess(normalizedEmail, password, normalizedName);
        if (recovered) {
          return;
        }

        resetTurnstileVerification();
        toast({
          title: t("auth.customer.registrationFailed"),
          description: "Your account was created, but we could not finish setting up your loyalty access. Please sign in to continue.",
          variant: "destructive",
        });
        return;
      }

      resetTurnstileVerification();
      toast({
        title: t("auth.customer.error"),
        description: error instanceof Error ? getFriendlyCustomerAuthError(error.message) : "Registration could not be completed. Please check your connection and try again.",
        variant: "destructive",
      });
    } finally {
      isSubmitting.current = false;
      setLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>{businessName ? t("auth.customer.seoJoinTitle", { businessName }) : t("auth.customer.seoDefaultTitle")}</title>
      </Head>
      <main className="min-h-screen flex items-center justify-center bg-muted/40 p-4">
        <div className="relative w-full max-w-md space-y-6">
          <div className="absolute right-0 top-0">
            <LanguageSelector compact />
          </div>

          {safeReturnUrl && (
            <Link
              href={safeReturnUrl}
              className="inline-flex items-center text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t("auth.customer.backToProgram")}
            </Link>
          )}

          <div className="text-center space-y-4 pt-8">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={businessName}
                className="mx-auto h-20 w-20 rounded-2xl border-2 object-cover shadow-sm"
                style={{ borderColor: "hsl(var(--primary))" }}
              />
            ) : (
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
                <Gift className="h-8 w-8" />
              </div>
            )}

            <div>
              <h1 className="font-heading text-2xl font-bold text-foreground">{t("auth.customer.walletTitle")}</h1>
              <p className="mt-1 text-sm text-muted-foreground">{t("auth.customer.defaultPrompt")}</p>
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
                  <TabsList className="mb-6 grid w-full grid-cols-2">
                    <TabsTrigger value="signin">{t("auth.customer.signInTab")}</TabsTrigger>
                    <TabsTrigger value="signup">{t("auth.customer.newAccountTab")}</TabsTrigger>
                  </TabsList>

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
                            onChange={(event) => setEmail(event.target.value)}
                            required
                            disabled={loading}
                            autoComplete="email"
                            inputMode="email"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="signin-password">{t("auth.customer.password")}</Label>
                          <Link href="/auth/reset-password" className="text-xs text-primary hover:underline">
                            {t("auth.customer.forgotPassword")}
                          </Link>
                        </div>
                        <div className="relative">
                          <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="signin-password"
                            type={showSignInPassword ? "text" : "password"}
                            placeholder={t("auth.customer.password")}
                            className="pl-10 pr-10"
                            value={password}
                            onChange={(event) => setPassword(event.target.value)}
                            required
                            disabled={loading}
                            autoComplete="current-password"
                          />
                          <button
                            type="button"
                            className="absolute right-3 top-3 text-muted-foreground transition-colors hover:text-foreground"
                            onClick={() => setShowSignInPassword((current) => !current)}
                            aria-label={showSignInPassword ? "Hide password" : "Show password"}
                            disabled={loading}
                          >
                            {showSignInPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>

                      <Button
                        type="submit"
                        className="mt-2 h-11 w-full text-base"
                        disabled={loading || fetchingContext}
                      >
                        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        {t("auth.customer.signInCta")}
                      </Button>
                    </form>
                  </TabsContent>

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
                            onChange={(event) => setName(event.target.value)}
                            required
                            disabled={loading || isSuccess}
                            autoComplete="name"
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
                            onChange={(event) => setEmail(event.target.value)}
                            required
                            disabled={loading || isSuccess}
                            autoComplete="email"
                            inputMode="email"
                          />
                        </div>
                      </div>

                      {isSuccess ? (
                        <div className="rounded-md border border-green-200 bg-green-50 p-4 text-center text-sm text-green-700">
                          <ShieldCheck className="mx-auto mb-2 h-6 w-6 text-green-600" />
                          <p className="font-semibold">{t("auth.customer.accountCreatedTitle")}</p>
                          <p className="mt-1">{t("auth.customer.successMessage", { email })}</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <Label htmlFor="signup-password">{t("auth.customer.createPassword")}</Label>
                          <div className="relative">
                            <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <Input
                              id="signup-password"
                              type={showSignUpPassword ? "text" : "password"}
                              placeholder={t("auth.customer.passwordPlaceholder")}
                              className="pl-10 pr-10"
                              value={password}
                              onChange={(event) => setPassword(event.target.value)}
                              required
                              minLength={6}
                              disabled={loading}
                              autoComplete="new-password"
                            />
                            <button
                              type="button"
                              className="absolute right-3 top-3 text-muted-foreground transition-colors hover:text-foreground"
                              onClick={() => setShowSignUpPassword((current) => !current)}
                              aria-label={showSignUpPassword ? "Hide password" : "Show password"}
                              disabled={loading}
                            >
                              {showSignUpPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                          </div>
                          <p className="text-xs text-muted-foreground">Please use at least 6 characters.</p>
                        </div>
                      )}

                      {!isSuccess && (
                        <TurnstileVerification
                          action="customer_register"
                          disabled={loading || fetchingContext}
                          resetSignal={turnstileResetSignal}
                          onTokenChange={setTurnstileToken}
                        />
                      )}

                      <Button
                        type="submit"
                        className="mt-2 h-11 w-full text-base"
                        disabled={loading || isSuccess || fetchingContext || !turnstileToken}
                        style={isSuccess ? { backgroundColor: "#22c55e", color: "#fff" } : undefined}
                      >
                        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        {isSuccess ? t("auth.customer.checkEmail") : t("auth.customer.createAndCollect")}
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
              <CardHeader className="pb-2 text-center">
                <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 shadow-sm">
                  <ShieldCheck className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="font-heading text-2xl text-foreground">{t("auth.customer.securityCheck")}</CardTitle>
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
                      className="py-6 text-center font-mono text-2xl tracking-[0.2em]"
                      value={mfaCode}
                      onChange={(event) => setMfaCode(event.target.value)}
                      required
                      disabled={loading}
                    />
                  </div>
                  <Button
                    type="submit"
                    className="mt-2 h-11 w-full text-base"
                    disabled={loading || mfaCode.length < 6}
                  >
                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    {t("auth.customer.verifyIdentity")}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    className="mt-1 h-11 w-full text-base"
                    onClick={() => {
                      setMfaRequired(false);
                      void supabase.auth.signOut();
                    }}
                    disabled={loading}
                  >
                    {t("auth.customer.cancel")}
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}

          <div className="text-center text-xs text-muted-foreground">
            {t("auth.customer.merchantPrompt")}{" "}
            <Link href="/auth/login" className="font-semibold text-primary hover:underline">
              {t("auth.customer.businessLogin")}
            </Link>
          </div>
        </div>
      </main>
    </>
  );
}