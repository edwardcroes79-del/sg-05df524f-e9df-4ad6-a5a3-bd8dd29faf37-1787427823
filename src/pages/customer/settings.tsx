import { useState, useEffect } from "react";
import Head from "next/head";
import { CustomerLayout } from "@/components/customer/CustomerLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Settings, Shield, Bell, HelpCircle, ArrowUpRight, ShieldCheck, ShieldAlert, Loader2, Key } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/contexts/I18nProvider";

export default function CustomerSettingsPage() {
  const { toast } = useToast();
  const { t } = useI18n();
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [promoAlerts, setPromoNotifications] = useState(false);
  const [stampSounds, setStampSounds] = useState(true);
  const [saving, setSaving] = useState(false);
  const [preferencesLoading, setPreferencesLoading] = useState(true);

  // 2FA States
  const [mfaFactors, setMfaFactors] = useState<any[]>([]);
  const [isEnrollingMfa, setIsEnrollingMfa] = useState(false);
  const [mfaQrCode, setMfaQrCode] = useState("");
  const [mfaSecret, setMfaSecret] = useState("");
  const [mfaFactorId, setMfaFactorId] = useState("");
  const [mfaVerifyCode, setMfaVerifyCode] = useState("");
  const [mfaLoading, setMfaLoading] = useState(false);

  useEffect(() => {
    fetchMfaFactors();
    void fetchEmailReceiptPreference();
    const savedSoundPref = localStorage.getItem("stamp_sound_enabled");
    if (savedSoundPref !== null) {
      setStampSounds(savedSoundPref === "true");
    }
  }, []);

  const fetchEmailReceiptPreference = async () => {
    setPreferencesLoading(true);

    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;

      if (!token) {
        throw new Error(t("dashboard.scan.noActiveSession"));
      }

      const response = await fetch("/api/customer/email-receipts-preference", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result.error || t("customer.settings.preferencesLoadFailed"));
      }

      setEmailNotifications(Boolean(result.emailReceiptsEnabled));
    } catch (err: any) {
      toast({
        title: t("customer.settings.preferencesLoadFailed"),
        description: err.message || t("customer.settings.preferencesLoadFailedDescription"),
        variant: "destructive",
      });
    } finally {
      setPreferencesLoading(false);
    }
  };

  const fetchMfaFactors = async () => {
    const { data, error } = await supabase.auth.mfa.listFactors();
    if (!error && data) {
      setMfaFactors(data.totp.filter(f => f.status === 'verified') || []);
    }
  };

  const handleEnableMfa = async () => {
    setMfaLoading(true);
    try {
      // Clean up stale unverified factors to prevent duplicate error
      const { data: currentFactors } = await supabase.auth.mfa.listFactors();
      if (currentFactors?.totp) {
        const unverified = currentFactors.totp.filter(f => (f as any).status === 'unverified');
        for (const factor of unverified) {
          await supabase.auth.mfa.unenroll({ factorId: factor.id });
        }
      }

      const { data, error } = await supabase.auth.mfa.enroll({ 
        factorType: 'totp',
        friendlyName: 'Customer Wallet (Royalty Stamp)'
      });
      if (error) throw error;
      setMfaQrCode(data.totp.qr_code);
      setMfaSecret(data.totp.secret);
      setMfaFactorId(data.id);
      setIsEnrollingMfa(true);
    } catch (err: any) {
      toast({ title: t("customer.settings.setupFailed"), description: err.message, variant: "destructive" });
    } finally {
      setMfaLoading(false);
    }
  };

  const handleVerifyMfaSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setMfaLoading(true);
    try {
      const challenge = await supabase.auth.mfa.challenge({ factorId: mfaFactorId });
      if (challenge.error) throw challenge.error;
      const verify = await supabase.auth.mfa.verify({ factorId: mfaFactorId, challengeId: challenge.data.id, code: mfaVerifyCode });
      if (verify.error) throw verify.error;
      toast({ title: t("customer.settings.mfaEnabledTitle"), description: t("customer.settings.mfaEnabledDescription") });
      setIsEnrollingMfa(false);
      setMfaVerifyCode("");
      await fetchMfaFactors();
    } catch (err: any) {
      toast({ title: t("customer.settings.verificationFailed"), description: err.message || t("customer.settings.invalidCode"), variant: "destructive" });
    } finally {
      setMfaLoading(false);
    }
  };

  const handleDisableMfa = async (factorId: string) => {
    if (!window.confirm(t("customer.settings.disableConfirm"))) return;
    setMfaLoading(true);
    try {
      const { error } = await supabase.auth.mfa.unenroll({ factorId });
      if (error) throw error;
      toast({ title: t("customer.settings.mfaDisabledTitle"), description: t("customer.settings.mfaDisabledDescription") });
      await fetchMfaFactors();
    } catch (err: any) {
      toast({ title: t("customer.settings.disableFailed"), description: err.message, variant: "destructive" });
    } finally {
      setMfaLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    setSaving(true);

    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;

      if (!token) {
        throw new Error(t("dashboard.scan.noActiveSession"));
      }

      const response = await fetch("/api/customer/email-receipts-preference", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ emailReceiptsEnabled: emailNotifications }),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result.error || t("customer.settings.preferencesSaveFailed"));
      }

      setEmailNotifications(Boolean(result.emailReceiptsEnabled));
      toast({
        title: t("customer.settings.savedTitle"),
        description: t("customer.settings.savedDescription")
      });
    } catch (err: any) {
      toast({
        title: t("customer.settings.preferencesSaveFailed"),
        description: err.message || t("customer.settings.preferencesSaveFailedDescription"),
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <CustomerLayout>
      <Head>
        <title>{t("customer.settings.seoTitle")}</title>
      </Head>

      <div className="max-w-xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-heading font-bold text-foreground">{t("customer.settings.title")}</h1>
          <p className="text-muted-foreground mt-1">{t("customer.settings.description")}</p>
        </div>

        <div className="space-y-6">
          {/* Notifications Card */}
          <Card className="border border-border/50 shadow-sm">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 text-primary rounded-full">
                  <Bell className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-lg">{t("customer.settings.notificationsTitle")}</CardTitle>
                  <CardDescription>{t("customer.settings.notificationsDescription")}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <div className="flex items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <Label htmlFor="email-notif">{t("customer.settings.emailReceipts")}</Label>
                  <p className="text-xs text-muted-foreground">{t("customer.settings.emailReceiptsDescription")}</p>
                </div>
                <Switch 
                  id="email-notif" 
                  checked={emailNotifications} 
                  onCheckedChange={setEmailNotifications}
                  disabled={preferencesLoading || saving}
                />
              </div>

              <div className="flex items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <Label htmlFor="promo-alerts">{t("customer.settings.promotionalOffers")}</Label>
                  <p className="text-xs text-muted-foreground">{t("customer.settings.promotionalOffersDescription")}</p>
                </div>
                <Switch 
                  id="promo-alerts" 
                  checked={promoAlerts} 
                  onCheckedChange={setPromoNotifications}
                />
              </div>

              <div className="flex items-center justify-between gap-4 border-t pt-4 mt-2">
                <div className="space-y-0.5">
                  <Label htmlFor="stamp-sounds">{t("customer.settings.stampSounds")}</Label>
                  <p className="text-xs text-muted-foreground">{t("customer.settings.stampSoundsDescription")}</p>
                </div>
                <Switch 
                  id="stamp-sounds" 
                  checked={stampSounds} 
                  onCheckedChange={(val) => {
                    setStampSounds(val);
                    localStorage.setItem('stamp_sound_enabled', String(val));
                  }}
                />
              </div>
            </CardContent>
            <CardFooter className="bg-muted/10 border-t py-4 flex justify-end">
              <Button onClick={handleSaveSettings} disabled={saving || preferencesLoading}>
                {saving ? t("dashboard.settings.saving") : t("customer.settings.savePreferences")}
              </Button>
            </CardFooter>
          </Card>

          {/* Account Security Card */}
          <Card className="border border-border/50 shadow-sm bg-muted/10">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 text-primary rounded-full">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-lg">{t("customer.settings.securityTitle")}</CardTitle>
                  <CardDescription>{t("customer.settings.securityDescription")}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-4 p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 border rounded-lg bg-background">
                <div>
                  <h3 className="font-semibold flex items-center gap-2 text-base">
                    {t("customer.settings.mfaTitle")}
                    {mfaFactors.length > 0 ? (
                      <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-semibold bg-emerald-50 text-emerald-600 border-emerald-200 uppercase tracking-wider">
                        {t("customer.settings.enabled")}
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-semibold bg-muted text-muted-foreground uppercase tracking-wider">
                        {t("customer.settings.notEnabled")}
                      </span>
                    )}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                    {t("customer.settings.mfaDescription")}
                  </p>
                </div>
                <div>
                  {mfaFactors.length > 0 ? (
                    <Button variant="destructive" size="sm" onClick={() => handleDisableMfa(mfaFactors[0].id)} disabled={mfaLoading}>
                      {mfaLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null} {t("customer.settings.disable2fa")}
                    </Button>
                  ) : (
                    <Button size="sm" onClick={handleEnableMfa} disabled={mfaLoading || isEnrollingMfa}>
                      {mfaLoading && !isEnrollingMfa ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null} {t("customer.settings.enable2fa")}
                    </Button>
                  )}
                </div>
              </div>

              {isEnrollingMfa && (
                <div className="mt-6 p-4 sm:p-6 border rounded-lg bg-background animate-in fade-in slide-in-from-top-4">
                  <h4 className="font-heading font-bold text-lg mb-4">{t("customer.settings.complete2fa")}</h4>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div className="flex items-start gap-3">
                        <div className="bg-primary text-white w-5 h-5 rounded-full flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">1</div>
                        <p className="text-sm text-muted-foreground">{t("customer.settings.scanQr")}</p>
                      </div>
                      <div className="bg-white p-3 border rounded-xl inline-block shadow-sm">
                        <img src={mfaQrCode} alt={t("customer.settings.qrAlt")} className="w-32 h-32" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground font-medium">{t("customer.settings.setupKey")}</p>
                        <code className="text-[10px] bg-muted px-2 py-1 rounded block w-max break-all font-mono font-semibold">
                          {mfaSecret}
                        </code>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div className="flex items-start gap-3">
                        <div className="bg-primary text-white w-5 h-5 rounded-full flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">2</div>
                        <p className="text-sm text-muted-foreground">{t("customer.settings.enterCode")}</p>
                      </div>
                      <form onSubmit={handleVerifyMfaSetup} className="space-y-4 pt-1">
                        <div className="space-y-2">
                          <Label htmlFor="verificationCode" className="text-xs">{t("customer.settings.verificationCode")}</Label>
                          <Input 
                            id="verificationCode" type="text" inputMode="numeric" pattern="[0-9]*" maxLength={6} placeholder="000 000"
                            className="font-mono text-lg tracking-[0.2em] text-center h-12"
                            value={mfaVerifyCode} onChange={(e) => setMfaVerifyCode(e.target.value)} required disabled={mfaLoading}
                          />
                        </div>
                        <div className="flex gap-2">
                          <Button type="button" variant="outline" className="w-full" onClick={() => setIsEnrollingMfa(false)} disabled={mfaLoading}>{t("customer.settings.cancel")}</Button>
                          <Button type="submit" className="w-full" disabled={mfaVerifyCode.length < 6 || mfaLoading}>
                            {mfaLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : t("customer.settings.verify")}
                          </Button>
                        </div>
                      </form>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Help Center Card */}
          <Card className="border border-border/50 shadow-sm">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 text-primary rounded-full">
                  <HelpCircle className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-lg">{t("customer.settings.supportTitle")}</CardTitle>
                  <CardDescription>{t("customer.settings.supportDescription")}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 pt-4 text-sm text-muted-foreground">
              {t("customer.settings.supportBody")}
              <p className="font-semibold text-foreground">{t("customer.settings.supportTagline")}</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </CustomerLayout>
  );
}