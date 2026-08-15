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
import { Loader2, Save } from "lucide-react";

export default function SettingsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [business, setBusiness] = useState<any>(null);

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
    setLoading(false);
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
        title: "Settings Saved",
        description: "Your business profile has been updated successfully.",
      });
      
      // Refresh local state to ensure it matches DB
      await fetchBusiness();
      
    } catch (err: any) {
      toast({
        title: "Failed to save",
        description: err.message || "An error occurred while saving settings.",
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

  return (
    <DashboardLayout>
      <Head>
        <title>Settings | Aruba Royalty Stamp</title>
      </Head>

      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-heading font-bold text-foreground">Settings</h1>
          <p className="text-muted-foreground mt-1">Manage your business profile and preferences.</p>
        </div>

        <form onSubmit={handleSave}>
          <Card className="border-border shadow-sm">
            <CardHeader className="bg-muted/30 border-b">
              <CardTitle>Business Profile</CardTitle>
              <CardDescription>This information will be displayed to your customers.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              <div className="space-y-2">
                <Label htmlFor="business_name">Business Name <span className="text-destructive">*</span></Label>
                <Input 
                  id="business_name" 
                  name="business_name"
                  value={formData.business_name}
                  onChange={handleInputChange}
                  required 
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea 
                  id="description" 
                  name="description"
                  placeholder="Briefly describe your business..."
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={3} 
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="email">Public Email</Label>
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
                  <Label htmlFor="phone">Phone Number</Label>
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
                <Label htmlFor="website">Website</Label>
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
                <Label htmlFor="address">Physical Address</Label>
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
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</>
                ) : (
                  <><Save className="mr-2 h-4 w-4" /> Save Changes</>
                )}
              </Button>
            </CardFooter>
          </Card>
        </form>
      </div>
    </DashboardLayout>
  );
}