import { useEffect, useState } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save, ShieldCheck, ShieldAlert, Key } from "lucide-react";
import { useI18n } from "@/contexts/I18nProvider";

export default function SettingsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { t } = useI18n();
  const [loading, setLoading] = useState(true);
  const [isStaff, setIsStaff] = useState(false);
  const [saving, setSaving] = useState(false);
  const [business, setBusiness] = useState<any>(null);

  // 2FA States
  const [mfaFactors, setMfaFactors] = useState<any[]>([]);
  const [isEnrollingMfa, setIsEnrollingMfa] = useState(false);
  const [mfaQrCode, setMfaQrCode] = useState("");
  const [mfaSecret, setMfaSecret] = useState("");
  const [mfaFactorId, setMfaFactorId] = useState("");
  const [mfaVerifyCode, setMfaVerifyCode] = useState("");
  const [mfaLoading, setMfaLoading] = useState(false);

  const [formData, setFormData] = useState({
    business_name: "",
    description: "",
    phone: "",
    email: "",
    website: "",
    address: ""
  });

  useEffect(() => {
    fetchBusiness();
  }, []);

  const fetchBusiness = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      router.push("/auth/login");
      return;
    }

    // Check user role
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", session.user.id)
      .maybeSingle();

    if (profile?.role === "business_staff") {
      setIsStaff(true);
      setLoading(false);
      return;
    }

    // Use owner_id to securely fetch the isolated business data
    const { data, error } = await supabase
      .from("businesses")
      .select("*")
      .eq("owner_id", session.user.id)
      .single();

    if (error || !data) {
      router.push("/onboarding");
      return;
    }

    setBusiness(data);
    setFormData({
      business_name: data.business_name || "",
      description: data.description || "",
      phone: data.phone || "",
      email: data.email || "",
      website: data.website || "",
      address: data.address || ""
    });

    await fetchMfaFactors();
    setLoading(false);
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
        friendlyName: business?.business_name ? `${business.business_name} (Royalty Stamp)` : 'Business Admin (Royalty Stamp)'
      });
      if (error) throw error;
      
      setMfaQrCode(data.totp.qr_code);
      setMfaSecret(data.totp.secret);
      setMfaFactorId(data.id);
      setIsEnrollingMfa(true);
    } catch (err: any) {
      toast({
        title: t("dashboard.settings.setupFailed"),
        description: err.message,
        variant: "destructive"
      });
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

      const verify = await supabase.auth.mfa.verify({
        factorId: mfaFactorId,
        challengeId: challenge.data.id,
        code: mfaVerifyCode
      });

      if (verify.error) throw verify.error;

      toast({
        title: t("dashboard.settings.mfaEnabled"),
        description: t("dashboard.settings.mfaEnabledDescription"),
      });

      setIsEnrollingMfa(false);
      setMfaVerifyCode("");
      await fetchMfaFactors();
    } catch (err: any) {
      toast({
        title: t("dashboard.settings.verificationFailed"),
        description: err.message || t("dashboard.settings.invalidCode"),
        variant: "destructive"
      });
    } finally {
      setMfaLoading(false);
    }
  };

  const handleDisableMfa = async (factorId: string) => {
    if (!window.confirm(t("dashboard.settings.disableConfirm"))) return;
    
    setMfaLoading(true);
    try {
      const { error } = await supabase.auth.mfa.unenroll({ factorId });
      if (error) throw error;
      
      toast({
        title: t("dashboard.settings.mfaDisabled"),
        description: t("dashboard.settings.mfaDisabledDescription"),
      });
      
      await fetchMfaFactors();
    } catch (err: any) {
      toast({
        title: t("dashboard.settings.disableFailed"),
        description: err.message,
        variant: "destructive"
      });
    } finally {
      setMfaLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!business) return;
    
    setSaving(true);
    
    try {
      const { error } = await supabase
        .from("businesses")
        .update({
          business_name: formData.business_name,
          description: formData.description,
          phone: formData.phone,
          email: formData.email,
          website: formData.website,
          address: formData.address,
          updated_at: new Date().toISOString()
        })
        .eq("id", business.id);

      if (error) throw error;

      toast({
        title: t("dashboard.settings.savedTitle"),
        description: t("dashboard.settings.savedDescription"),
      });
      
      // Refresh local state to ensure it matches DB
      await fetchBusiness();
      
    } catch (err: any) {
      toast({
        title: t("dashboard.settings.saveFailed"),
        description: err.message || t("dashboard.settings.saveFailedDescription"),
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex h-full items-center justify-center min-h-[60vh]">
          <Loader2 className="animate-spin h-8 w-8 text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (isStaff) {
    return (
      <DashboardLayout>
        <Head>
          <title>{t("dashboard.accessDenied.title")} | Dashboard</title>
        </Head>
        <div className="max-w-md mx-auto my-12 text-center">
          <Card className="border-destructive/20 shadow-md">
            <CardHeader className="bg-destructive/5 border-b pb-4">
              <div className="w-12 h-12 bg-destructive/10 text-destructive rounded-full flex items-center justify-center mx-auto mb-2">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <CardTitle className="text-xl text-destructive">{t("dashboard.accessDenied.title")}</CardTitle>
              <CardDescription>{t("dashboard.settings.accessDeniedDescription")}</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground leading-relaxed">{t("dashboard.settings.accessDeniedBody")}</p>
            </CardContent>
            <CardFooter className="bg-muted/30 border-t justify-center py-4">
              <Button onClick={() => router.push("/dashboard")}>{t("dashboard.billing.returnToDashboard")}</Button>
            </CardFooter>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <Head>
        <title>{t("dashboard.settings.seoTitle")}</title>
      </Head>

      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-heading font-bold text-foreground">{t("dashboard.settings.title")}</h1>
          <p className="text-muted-foreground mt-1">{t("dashboard.settings.description")}</p>
        </div>

        <form onSubmit={handleSave}>
          <Card className="border-border shadow-sm">
            <CardHeader className="bg-muted/30 border-b">
              <CardTitle>{t("dashboard.settings.businessProfile")}</CardTitle>
              <CardDescription>{t("dashboard.settings.businessProfileDescription")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              <div className="space-y-2">
                <Label htmlFor="business_name">{t("dashboard.settings.businessName")} <span className="text-destructive">*</span></Label>
                <Input 
                  id="business_name" 
                  name="business_name"
                  value={formData.business_name}
                  onChange={handleInputChange}
                  required 
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">{t("dashboard.settings.descriptionLabel")}</Label>
                <Textarea 
                  id="description" 
                  name="description"
                  placeholder={t("dashboard.settings.descriptionPlaceholder")}
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={3} 
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="email">{t("dashboard.settings.publicEmail")}</Label>
                  <Input 
                    id="email" 
                    name="email"
                    type="email"
                    placeholder="hello@business.com"
                    value={formData.email}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">{t("dashboard.settings.phoneNumber")}</Label>
                  <Input 
                    id="phone" 
                    name="phone"
                    type="tel"
                    placeholder="+297 555 1234"
                    value={formData.phone}
                    onChange={handleInputChange}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="website">{t("dashboard.settings.website")}</Label>
                <Input 
                  id="website" 
                  name="website"
                  type="url"
                  placeholder="https://www.yourbusiness.com"
                  value={formData.website}
                  onChange={handleInputChange}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">{t("dashboard.settings.address")}</Label>
                <Textarea 
                  id="address" 
                  name="address"
                  placeholder="123 Main St, Oranjestad, Aruba"
                  value={formData.address}
                  onChange={handleInputChange}
                  rows={2} 
                />
              </div>
            </CardContent>
            <CardFooter className="bg-muted/30 border-t flex justify-end py-4">
              <Button type="submit" disabled={saving} className="min-w-[120px]">
                {saving ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {t("dashboard.settings.saving")}</>
                ) : (
                  <><Save className="mr-2 h-4 w-4" /> {t("dashboard.settings.saveChanges")}</>
                )}
              </Button>
            </CardFooter>
          </Card>
        </form>

        {/* Account Security Card (2FA) */}
        <Card className="border-border shadow-sm">
          <CardHeader className="bg-muted/10 border-b">
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-primary" />
              {t("dashboard.settings.security")}
            </CardTitle>
            <CardDescription>{t("dashboard.settings.securityDescription")}</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 border rounded-lg">
              <div>
                <h3 className="font-semibold flex items-center gap-2 text-lg">
                  {t("dashboard.settings.mfaTitle")}
                  {mfaFactors.length > 0 ? (
                    <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold bg-emerald-50 text-emerald-600 border-emerald-200">
                      {t("dashboard.settings.enabled")}
                    </span>
                  ) : (
                    <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold bg-muted text-muted-foreground">
                      {t("dashboard.settings.notEnabled")}
                    </span>
                  )}
                </h3>
                <p className="text-sm text-muted-foreground mt-1 max-w-md">
                  {t("dashboard.settings.mfaDescription")}
                </p>
              </div>
              <div>
                {mfaFactors.length > 0 ? (
                  <Button 
                    variant="destructive" 
                    onClick={() => handleDisableMfa(mfaFactors[0].id)}
                    disabled={mfaLoading}
                  >
                    {mfaLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    {t("dashboard.settings.disable2fa")}
                  </Button>
                ) : (
                  <Button 
                    onClick={handleEnableMfa}
                    disabled={mfaLoading || isEnrollingMfa}
                  >
                    {mfaLoading && !isEnrollingMfa ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    {t("dashboard.settings.enable2fa")}
                  </Button>
                )}
              </div>
            </div>

            {isEnrollingMfa && (
              <div className="mt-6 p-6 border rounded-lg bg-muted/20 animate-in fade-in slide-in-from-top-4">
                <h4 className="font-heading font-bold text-lg mb-4">{t("dashboard.settings.complete2fa")}</h4>
                
                <div className="grid md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="bg-primary text-white w-6 h-6 rounded-full flex items-center justify-center font-bold text-sm shrink-0 mt-0.5">1</div>
                      <p className="text-sm text-muted-foreground">{t("dashboard.settings.mfaStep1")}</p>
                    </div>
                    
                    <div className="bg-white p-4 border rounded-xl inline-block shadow-sm">
                      <img src={mfaQrCode} alt={t("dashboard.settings.qrAlt")} className="w-40 h-40" />
                    </div>

                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground font-medium">{t("dashboard.settings.manualKey")}</p>
                      <code className="text-xs bg-muted px-2 py-1 rounded block w-max break-all select-all font-mono font-semibold">
                        {mfaSecret}
                      </code>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="bg-primary text-white w-6 h-6 rounded-full flex items-center justify-center font-bold text-sm shrink-0 mt-0.5">2</div>
                      <p className="text-sm text-muted-foreground">{t("dashboard.settings.mfaStep2")}</p>
                    </div>

                    <form onSubmit={handleVerifyMfaSetup} className="space-y-4 pt-2">
                      <div className="space-y-2">
                        <Label htmlFor="verificationCode">{t("dashboard.settings.verificationCode")}</Label>
                        <Input 
                          id="verificationCode"
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          maxLength={6}
                          placeholder="000 000"
                          className="font-mono text-lg tracking-[0.25em] text-center"
                          value={mfaVerifyCode}
                          onChange={(e) => setMfaVerifyCode(e.target.value)}
                          required
                          disabled={mfaLoading}
                        />
                      </div>
                      
                      <div className="flex gap-2 pt-2">
                        <Button type="button" variant="outline" className="w-full" onClick={() => setIsEnrollingMfa(false)} disabled={mfaLoading}>
                          {t("dashboard.staff.cancel")}
                        </Button>
                        <Button type="submit" className="w-full" disabled={mfaVerifyCode.length < 6 || mfaLoading}>
                          {mfaLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Key className="h-4 w-4 mr-2" />}
                          {t("dashboard.settings.verifyEnable")}
                        </Button>
                      </div>
                    </form>
                    
                    <div className="bg-amber-500/10 border border-amber-500/20 p-3 rounded text-xs text-amber-700 mt-4 flex gap-2">
                      <ShieldAlert className="h-4 w-4 shrink-0" />
                      <p><strong>{t("dashboard.settings.backupOption")}</strong> {t("dashboard.settings.backupText")}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}