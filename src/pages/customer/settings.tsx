import { useState } from "react";
import Head from "next/head";
import { CustomerLayout } from "@/components/customer/CustomerLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Settings, Shield, Bell, HelpCircle, ArrowUpRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function CustomerSettingsPage() {
  const { toast } = useToast();
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [promoAlerts, setPromoNotifications] = useState(false);
  const [saving, setSaving] = useState(false);

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
          <Card className="border border-border/50 shadow-sm bg-muted/20">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 text-primary rounded-full">
                  <Shield className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-lg">Account Security</CardTitle>
                  <CardDescription>Authentication credentials management.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-4 text-center p-8">
              <p className="text-sm text-muted-foreground mb-4">
                Authentication and password adjustments are managed securely via Supabase Auth services.
              </p>
              <Button variant="outline" className="gap-2" onClick={() => toast({ title: "Coming Soon", description: "Secure password reset feature is currently being integrated." })}>
                Change Password
                <ArrowUpRight className="h-4 w-4" />
              </Button>
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