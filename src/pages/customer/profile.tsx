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

export default function CustomerProfilePage() {
  const { toast } = useToast();
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
        title: "Validation Error",
        description: "Your full name is required.",
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
        title: "Profile Saved",
        description: "Your personal details have been updated successfully."
      });
    } catch (err: any) {
      toast({
        title: "Error Saving Profile",
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
        <title>My Profile | Royalty Stamp</title>
      </Head>

      <div className="max-w-xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-heading font-bold text-foreground">My Profile</h1>
          <p className="text-muted-foreground mt-1">Manage your basic customer information and contacts.</p>
        </div>

        <form onSubmit={handleSave}>
          <Card className="border border-border/50 shadow-sm">
            <CardHeader className="space-y-1">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 text-primary rounded-full">
                  <User className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-lg">Personal Details</CardTitle>
                  <CardDescription>This is used by merchants when issuing rewards.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <div className="space-y-1.5">
                <Label htmlFor="email">Email Address</Label>
                <Input 
                  id="email" 
                  value={customer.email} 
                  disabled 
                  className="bg-muted cursor-not-allowed text-muted-foreground" 
                />
                <p className="text-[11px] text-muted-foreground">Contact support to change your account email.</p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="name">Full Name</Label>
                <Input 
                  id="name" 
                  value={customer.name} 
                  onChange={(e) => setCustomer({ ...customer, name: e.target.value })} 
                  placeholder="e.g. Jean-Pierre" 
                  disabled={saving}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="phone">Phone Number</Label>
                <Input 
                  id="phone" 
                  value={customer.phone} 
                  onChange={(e) => setCustomer({ ...customer, phone: e.target.value })} 
                  placeholder="e.g. +297 599 1234" 
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
                Save Changes
              </Button>
            </CardFooter>
          </Card>
        </form>
      </div>
    </CustomerLayout>
  );
}