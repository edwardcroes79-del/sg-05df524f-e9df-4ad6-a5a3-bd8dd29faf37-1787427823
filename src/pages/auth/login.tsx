import { useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { SEO } from "@/components/SEO";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { returnUrl } = router.query;
  const { toast } = useToast();

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
          title: "Login Failed",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Welcome back!",
          description: "Successfully logged in.",
        });
        
        // If there's a returnUrl (like a QR scan destination), always honor it first
        if (returnUrl) {
          router.push(returnUrl as string);
          return;
        }

        // Check if business profile exists to route appropriately
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          // 1. Check strict backend profile roles
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

          // 2. Check business associations for normal dashboard routing
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
      }
    } catch (err: any) {
      toast({
        title: "An error occurred",
        description: err.message || "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center items-center p-4">
      <SEO title="Login - Aruba Royalty Stamp" description="Log in to manage your digital loyalty programs." />
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-block">
            <h1 className="font-heading text-3xl font-bold text-foreground">Royalty<span className="text-primary">Stamp</span></h1>
          </Link>
        </div>
        
        <Card className="border-border shadow-sm">
          <CardHeader>
            <CardTitle className="text-2xl font-heading text-foreground">Welcome Back</CardTitle>
            <CardDescription>Enter your credentials to access your business dashboard.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input 
                  id="email" 
                  type="email" 
                  placeholder="name@business.aw" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required 
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <Link href="/auth/reset-password" className="text-sm text-primary hover:underline font-medium">
                    Forgot password?
                  </Link>
                </div>
                <Input 
                  id="password" 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required 
                />
              </div>
              <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold" disabled={loading}>
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Sign In"}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="justify-center border-t p-4 mt-4">
            <p className="text-sm text-muted-foreground">
              Don't have an account?{" "}
              <Link href={`/auth/register${returnUrl ? `?returnUrl=${encodeURIComponent(returnUrl as string)}` : ''}`} className="text-primary hover:underline font-medium">
                {returnUrl ? "Create Customer Account" : "Register your business"}
              </Link>
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}