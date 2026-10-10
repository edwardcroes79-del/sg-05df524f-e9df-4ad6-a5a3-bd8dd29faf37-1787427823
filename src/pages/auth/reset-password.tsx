import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { SEO } from "@/components/SEO";
import { LanguageSelector } from "@/components/LanguageSelector";
import { useI18n } from "@/contexts/I18nProvider";
import { TurnstileVerification } from "@/components/TurnstileVerification";

interface RecoveryResponse {
  success?: boolean;
  message?: string;
  error?: string;
}

export default function ResetPassword() {
  const [email, setEmail] = useState("");
  const [turnstileToken, setTurnstileToken] = useState("");
  const [turnstileResetSignal, setTurnstileResetSignal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const { toast } = useToast();
  const { t } = useI18n();

  const resetTurnstile = () => {
    setTurnstileToken("");
    setTurnstileResetSignal((current) => current + 1);
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!turnstileToken) {
      toast({
        title: t("auth.customer.securityCheckRequired"),
        description: t("auth.customer.pleaseCompleteSecurityCheck"),
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/auth/request-password-recovery", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          turnstileToken,
        }),
      });

      const result = (await response.json()) as RecoveryResponse;

      if (!response.ok) {
        toast({
          title: t("auth.reset.failed"),
          description: result.error || t("auth.register.tryAgain"),
          variant: "destructive",
        });
        resetTurnstile();
        return;
      }

      setSubmitted(true);
      setTurnstileToken("");
    } catch (err: any) {
      toast({
        title: t("auth.reset.error"),
        description: err.message || t("auth.register.tryAgain"),
        variant: "destructive",
      });
      resetTurnstile();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center items-center p-4">
      <SEO title={t("auth.reset.seoTitle")} />
      <div className="absolute top-4 right-4">
        <LanguageSelector compact />
      </div>
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-block">
            <h1 className="font-heading text-3xl font-bold text-foreground">Royalty<span className="text-primary">Stamp</span></h1>
          </Link>
        </div>
        
        <Card className="border-border shadow-sm">
          <CardHeader>
            <CardTitle className="text-2xl font-heading text-foreground">{t("auth.reset.title")}</CardTitle>
            <CardDescription>{t("auth.reset.description")}</CardDescription>
          </CardHeader>
          <CardContent>
            {submitted ? (
              <div className="text-center p-4">
                <p className="text-foreground mb-4">{t("auth.reset.checkEmail")}</p>
                <Button variant="outline" onClick={() => setSubmitted(false)} className="w-full">
                  {t("auth.reset.tryAnother")}
                </Button>
              </div>
            ) : (
              <form onSubmit={handleReset} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">{t("auth.reset.businessEmail")}</Label>
                  <Input 
                    id="email" 
                    type="email" 
                    placeholder={t("auth.reset.emailPlaceholder")}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required 
                    disabled={loading}
                  />
                </div>
                <TurnstileVerification
                  action="password_recovery"
                  disabled={loading}
                  resetSignal={turnstileResetSignal}
                  onTokenChange={setTurnstileToken}
                />
                <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold" disabled={loading}>
                  {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : t("auth.reset.sendLink")}
                </Button>
              </form>
            )}
          </CardContent>
          <CardFooter className="justify-center border-t p-4 mt-4">
            <p className="text-sm text-muted-foreground">
              {t("auth.reset.rememberPassword")}{" "}
              <Link href="/auth/login" className="text-primary hover:underline font-medium">
                {t("auth.register.signIn")}
              </Link>
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}