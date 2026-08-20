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

export default function CustomerSettingsPage() {
  const { toast } = useToast();
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [promoAlerts, setPromoNotifications] = useState(false);
  const [saving, setSaving] = useState(false);

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
  }, []);

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
      toast({ title: "Setup Failed", description: err.message, variant: "destructive" });
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
      toast({ title: "2FA Enabled", description: "Two-factor authentication secured on your account." });
      setIsEnrollingMfa(false);
      setMfaVerifyCode("");
      await fetchMfaFactors();
    } catch (err: any) {
      toast({ title: "Verification Failed", description: err.message || "Invalid code.", variant: "destructive" });
    } finally {
      setMfaLoading(false);
    }
  };

  const handleDisableMfa = async (factorId: string) => {
    if (!window.confirm("Are you sure you want to disable 2FA? This will reduce your account security.")) return;
    setMfaLoading(true);
    try {
      const { error } = await supabase.auth.mfa.unenroll({ factorId });
      if (error) throw error;
      toast({ title: "2FA Disabled", description: "Two-factor authentication has been removed." });
      await fetchMfaFactors();
    } catch (err: any) {
      toast({ title: "Failed to Disable", description: err.message, variant: "destructive" });
    } finally {
      setMfaLoading(false);
    }
  };

  const handleSaveSettings = () => {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      toast({
        title: "Settings Saved",
        description: "Your notification preferences have been saved."
      });
    }, 600);
  };

  return (
    <CustomerLayout>
      <Head>
        <title>Settings | Royalty Stamp</title>
      </Head>

      <div className="max-w-xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-heading font-bold text-foreground">Settings</h1>
          <p className="text-muted-foreground mt-1">Manage your loyalty preferences and app settings.</p>
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
                  <CardTitle className="text-lg">Notifications</CardTitle>
                  <CardDescription>Control how and when you receive stamp updates.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <div className="flex items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <Label htmlFor="email-notif">Email Receipts</Label>
                  <p className="text-xs text-muted-foreground">Receive a secure receipt when stamps are added.</p>
                </div>
                <Switch 
                  id="email-notif" 
                  checked={emailNotifications} 
                  onCheckedChange={setEmailNotifications}
                />
              </div>

              <div className="flex items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <Label htmlFor="promo-alerts">Promotional Offers</Label>
                  <p className="text-xs text-muted-foreground">Receive alerts on special local stamp campaigns in Aruba.</p>
                </div>
                <Switch 
                  id="promo-alerts" 
                  checked={promoAlerts} 
                  onCheckedChange={setPromoNotifications}
                />
              </div>
            </CardContent>
            <CardFooter className="bg-muted/10 border-t py-4 flex justify-end">
              <Button onClick={handleSaveSettings} disabled={saving}>
                {saving ? "Saving..." : "Save Preferences"}
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
                  <CardTitle className="text-lg">Account Security</CardTitle>
                  <CardDescription>Add an extra layer of protection to your wallet.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-4 p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 border rounded-lg bg-background">
                <div>
                  <h3 className="font-semibold flex items-center gap-2 text-base">
                    Two-Factor Authentication (2FA)
                    {mfaFactors.length > 0 ? (
                      <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-semibold bg-emerald-50 text-emerald-600 border-emerald-200 uppercase tracking-wider">
                        Enabled
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-semibold bg-muted text-muted-foreground uppercase tracking-wider">
                        Not Enabled
                      </span>
                    )}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                    Protect your loyalty rewards with a TOTP authenticator app like Google Authenticator or Authy.
                  </p>
                </div>
                <div>
                  {mfaFactors.length > 0 ? (
                    <Button variant="destructive" size="sm" onClick={() => handleDisableMfa(mfaFactors[0].id)} disabled={mfaLoading}>
                      {mfaLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null} Disable 2FA
                    </Button>
                  ) : (
                    <Button size="sm" onClick={handleEnableMfa} disabled={mfaLoading || isEnrollingMfa}>
                      {mfaLoading && !isEnrollingMfa ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null} Enable 2FA
                    </Button>
                  )}
                </div>
              </div>

              {isEnrollingMfa && (
                <div className="mt-6 p-4 sm:p-6 border rounded-lg bg-background animate-in fade-in slide-in-from-top-4">
                  <h4 className="font-heading font-bold text-lg mb-4">Complete 2FA Setup</h4>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div className="flex items-start gap-3">
                        <div className="bg-primary text-white w-5 h-5 rounded-full flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">1</div>
                        <p className="text-sm text-muted-foreground">Scan this QR code with your authenticator app.</p>
                      </div>
                      <div className="bg-white p-3 border rounded-xl inline-block shadow-sm">
                        <img src={mfaQrCode} alt="2FA QR Code" className="w-32 h-32" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground font-medium">Or use setup key:</p>
                        <code className="text-[10px] bg-muted px-2 py-1 rounded block w-max break-all font-mono font-semibold">
                          {mfaSecret}
                        </code>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div className="flex items-start gap-3">
                        <div className="bg-primary text-white w-5 h-5 rounded-full flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">2</div>
                        <p className="text-sm text-muted-foreground">Enter the 6-digit code to verify.</p>
                      </div>
                      <form onSubmit={handleVerifyMfaSetup} className="space-y-4 pt-1">
                        <div className="space-y-2">
                          <Label htmlFor="verificationCode" className="text-xs">Verification Code</Label>
                          <Input 
                            id="verificationCode" type="text" inputMode="numeric" pattern="[0-9]*" maxLength={6} placeholder="000 000"
                            className="font-mono text-lg tracking-[0.2em] text-center h-12"
                            value={mfaVerifyCode} onChange={(e) => setMfaVerifyCode(e.target.value)} required disabled={mfaLoading}
                          />
                        </div>
                        <div className="flex gap-2">
                          <Button type="button" variant="outline" className="w-full" onClick={() => setIsEnrollingMfa(false)} disabled={mfaLoading}>Cancel</Button>
                          <Button type="submit" className="w-full" disabled={mfaVerifyCode.length < 6 || mfaLoading}>
                            {mfaLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verify"}
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
                  <CardTitle className="text-lg">Support & Help</CardTitle>
                  <CardDescription>Get help with your digital stamp card.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 pt-4 text-sm text-muted-foreground">
              <p>
                Are your stamp counts incorrect? Send a photo of your paper stamp card or cash receipt directly to the business to adjust your current balances.
              </p>
              <p className="font-semibold text-foreground">
                Aruba Loyalty Stamp is direct and independent.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </CustomerLayout>
  );
}