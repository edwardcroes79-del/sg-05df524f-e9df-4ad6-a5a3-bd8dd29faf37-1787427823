import { useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ShieldCheck } from "lucide-react";
import { SEO } from "@/components/SEO";
import { LanguageSelector } from "@/components/LanguageSelector";
import { useI18n } from "@/contexts/I18nProvider";

const CUSTOMER_LOGIN_PATH = "/auth/customer";
const BUSINESS_LOGIN_PATH = "/auth/login";
const MIN_PASSWORD_LENGTH = 6;

type LoginDestination = typeof CUSTOMER_LOGIN_PATH | typeof BUSINESS_LOGIN_PATH;

export default function UpdatePassword() {
  const router = useRouter();
  const { toast } = useToast();
  const { t } = useI18n();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const copy = (key: string, fallback: string) => {
    const translated = t(key);
    return translated === key ? fallback : translated;
  };

  const resolvePostResetLoginPath = async (): Promise<LoginDestination> => {
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;

    if (!user) {
      return BUSINESS_LOGIN_PATH;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role, is_super_admin")
      .eq("id", user.id)
      .maybeSingle();

    if (profile?.role === "customer") {
      return CUSTOMER_LOGIN_PATH;
    }

    if (profile?.is_super_admin || profile?.role === "super_admin" || profile?.role === "business_staff") {
      return BUSINESS_LOGIN_PATH;
    }

    const { data: customer } = await supabase
      .from("customers")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (customer?.id) {
      return CUSTOMER_LOGIN_PATH;
    }

    const { data: businessUser } = await supabase
      .from("business_users")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (businessUser?.id) {
      return BUSINESS_LOGIN_PATH;
    }

    return BUSINESS_LOGIN_PATH;
  };

  const handleUpdatePassword = async (event: React.FormEvent) => {
    event.preventDefault();

    if (loading) {
      return;
    }

    if (password.length < MIN_PASSWORD_LENGTH) {
      toast({
        title: copy("auth.update.passwordTooShort", "Password is too short"),
        description: copy("auth.update.passwordTooShortDescription", "Use at least 6 characters for your new password."),
        variant: "destructive",
      });
      return;
    }

    if (password !== confirmPassword) {
      toast({
        title: copy("auth.update.passwordsDoNotMatch", "Passwords do not match"),
        description: copy("auth.update.passwordsDoNotMatchDescription", "Enter the same password in both fields."),
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const destination = await resolvePostResetLoginPath();
      const { error } = await supabase.auth.updateUser({ password });

      if (error) {
        toast({
          title: copy("auth.update.failed", "Password update failed"),
          description: error.message || copy("auth.update.newLink", "Request a new password reset link and try again."),
          variant: "destructive",
        });
        return;
      }

      toast({
        title: copy("auth.update.updated", "Password updated"),
        description: copy("auth.update.updatedDescription", "Your password was updated. Please sign in again."),
      });

      await supabase.auth.signOut();
      router.push(destination);
    } catch (error: any) {
      toast({
        title: copy("auth.update.failed", "Password update failed"),
        description: error.message || copy("auth.update.newLink", "Request a new password reset link and try again."),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center items-center p-4">
      <SEO
        title={copy("auth.update.seoTitle", "Create a New Password | Royalty Stamp")}
        description={copy("auth.update.seoDescription", "Choose a new password for your Royalty Stamp account.")}
      />
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
          <CardHeader className="text-center">
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <CardTitle className="text-2xl font-heading text-foreground">
              {copy("auth.update.title", "Create a New Password")}
            </CardTitle>
            <CardDescription>{copy("auth.update.description", "Choose a new password for your account.")}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpdatePassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">{copy("auth.update.newPassword", "New Password")}</Label>
                <Input
                  id="password"
                  type="password"
                  minLength={MIN_PASSWORD_LENGTH}
                  placeholder={copy("auth.update.newPasswordPlaceholder", "Enter at least 6 characters")}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="new-password"
                  aria-describedby="password-help"
                  required
                  disabled={loading}
                />
                <p id="password-help" className="text-xs text-muted-foreground">
                  {copy("auth.update.passwordHelp", "Use at least 6 characters.")}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">{copy("auth.update.confirmPassword", "Confirm New Password")}</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  minLength={MIN_PASSWORD_LENGTH}
                  placeholder={copy("auth.update.confirmPasswordPlaceholder", "Re-enter your new password")}
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  autoComplete="new-password"
                  required
                  disabled={loading}
                />
              </div>

              <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {copy("auth.update.submitting", "Updating password...")}
                  </>
                ) : (
                  copy("auth.update.submit", "Update Password")
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}