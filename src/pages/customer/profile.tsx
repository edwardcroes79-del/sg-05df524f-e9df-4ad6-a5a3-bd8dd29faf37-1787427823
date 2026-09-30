import { useEffect, useState } from "react";
import Head from "next/head";
import { CustomerLayout } from "@/components/customer/CustomerLayout";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { User, Loader2, Save } from "lucide-react";
import { useI18n } from "@/contexts/I18nProvider";

export default function CustomerProfilePage() {
  const { toast } = useToast();
  const { t } = useI18n();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [customer, setCustomer] = useState<any>({
    id: "",
    name: "",
    email: "",
    phone: "",
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data: customerData } = await supabase
        .from("customers")
        .select("*")
        .eq("user_id", session.user.id)
        .single();

      if (customerData) {
        setCustomer({
          id: customerData.id,
          name: customerData.name || "",
          email: customerData.email || "",
          phone: customerData.phone || "",
        });
      }
    } catch (err) {
      console.error("Error fetching profile:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customer.name.trim()) {
      toast({
        title: t("customer.profile.validationTitle"),
        description: t("customer.profile.nameRequired"),
        variant: "destructive"
      });
      return;
    }

    try {
      setSaving(true);
      const { error } = await supabase
        .from("customers")
        .update({
          name: customer.name,
          phone: customer.phone,
        })
        .eq("id", customer.id);

      if (error) throw error;

      toast({
        title: t("customer.profile.savedTitle"),
        description: t("customer.profile.savedDescription")
      });
    } catch (err: any) {
      toast({
        title: t("customer.profile.saveErrorTitle"),
        description: err.message,
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <CustomerLayout>
        <div className="flex items-center justify-center p-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </CustomerLayout>
    );
  }

  return (
    <CustomerLayout>
      <Head>
        <title>{t("customer.profile.seoTitle")}</title>
      </Head>

      <div className="max-w-xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-heading font-bold text-foreground">{t("customer.profile.title")}</h1>
          <p className="text-muted-foreground mt-1">{t("customer.profile.description")}</p>
        </div>

        <form onSubmit={handleSave}>
          <Card className="border border-border/50 shadow-sm">
            <CardHeader className="space-y-1">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 text-primary rounded-full">
                  <User className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-lg">{t("customer.profile.personalDetails")}</CardTitle>
                  <CardDescription>{t("customer.profile.personalDetailsDescription")}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <div className="space-y-1.5">
                <Label htmlFor="email">{t("customer.profile.email")}</Label>
                <Input 
                  id="email" 
                  value={customer.email} 
                  disabled 
                  className="bg-muted cursor-not-allowed text-muted-foreground" 
                />
                <p className="text-[11px] text-muted-foreground">{t("customer.profile.emailHelp")}</p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="name">{t("customer.profile.fullName")}</Label>
                <Input 
                  id="name" 
                  value={customer.name} 
                  onChange={(e) => setCustomer({ ...customer, name: e.target.value })} 
                  placeholder={t("customer.profile.fullNamePlaceholder")}
                  disabled={saving}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="phone">{t("customer.profile.phone")}</Label>
                <Input 
                  id="phone" 
                  value={customer.phone} 
                  onChange={(e) => setCustomer({ ...customer, phone: e.target.value })} 
                  placeholder={t("customer.profile.phonePlaceholder")}
                  disabled={saving}
                />
              </div>
            </CardContent>
            <CardFooter className="bg-muted/10 border-t py-4 flex justify-end">
              <Button type="submit" disabled={saving} className="gap-2">
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                {t("customer.profile.saveChanges")}
              </Button>
            </CardFooter>
          </Card>
        </form>
      </div>
    </CustomerLayout>
  );
}