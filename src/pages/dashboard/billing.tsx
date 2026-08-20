import { useEffect, useState } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Check, CreditCard, Upload, Clock, CheckCircle, XCircle, AlertCircle, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle } from
"@/components/ui/dialog";

export default function BillingPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [isStaff, setIsStaff] = useState(false);
  const [business, setBusiness] = useState<any>(null);
  const [currentPlan, setCurrentPlan] = useState<any>(null);
  const [plans, setPlans] = useState<any[]>([]);
  const [pendingPayments, setPendingPayments] = useState<any[]>([]);
  const [bankAccount, setBankAccount] = useState<any>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // Check user role
      const { data: profile } = await supabase.
      from("profiles").
      select("role").
      eq("id", session.user.id).
      maybeSingle();

      if (profile?.role === "business_staff") {
        setIsStaff(true);
        setLoading(false);
        return;
      }

      // Fetch business
      const { data: businessData } = await supabase.
      from("businesses").
      select("*").
      eq("owner_id", session.user.id).
      single();

      if (!businessData) return;
      setBusiness(businessData);

      // Fetch current plan
      const { data: planData } = await supabase.
      from("subscription_plans").
      select("*").
      eq("id", businessData.subscription_plan || "starter").
      single();
      setCurrentPlan(planData);

      // Fetch all plans
      const { data: plansData } = await supabase.
      from("subscription_plans").
      select("*").
      order("price_awg", { ascending: true });
      setPlans(plansData || []);

      // Fetch pending payments
      const { data: paymentsData } = await supabase.
      from("subscription_payments").
      select("*").
      eq("business_id", businessData.id).
      order("created_at", { ascending: false });
      setPendingPayments(paymentsData || []);

      // Fetch bank account
      const { data: bankData } = await supabase.
      from("platform_bank_accounts").
      select("*").
      eq("is_active", true).
      single();
      setBankAccount(bankData);

      setLoading(false);
    } catch (error: any) {
      console.error("Error fetching billing data:", error);
      setLoading(false);
    }
  };

  const handlePlanChange = async (plan: any) => {
    if (!plan || plan.id === business?.subscription_plan) return;

    toast({
      title: "Admin approval required",
      description: "Plan changes are reviewed before activation. Your current entitlements remain unchanged until approval."
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <Clock className="h-4 w-4" />;
      case "approved":
        return <CheckCircle className="h-4 w-4" />;
      case "rejected":
        return <XCircle className="h-4 w-4" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  const getStatusVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case "pending":
        return "secondary";
      case "approved":
        return "default";
      case "rejected":
        return "destructive";
      default:
        return "outline";
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="space-y-8">
          <Skeleton className="h-12 w-64" />
          <div className="grid md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) =>
            <Skeleton key={i} className="h-96" />
            )}
          </div>
        </div>
      </DashboardLayout>);

  }

  if (isStaff) {
    return (
      <DashboardLayout>
        <Head>
          <title>Access Denied | Dashboard</title>
        </Head>
        <div className="max-w-md mx-auto my-12 text-center">
          <Card className="border-destructive/20 shadow-md">
            <CardHeader className="bg-destructive/5 border-b pb-4">
              <div className="w-12 h-12 bg-destructive/10 text-destructive rounded-full flex items-center justify-center mx-auto mb-2">
                <AlertCircle className="w-6 h-6" />
              </div>
              <CardTitle className="text-xl text-destructive">Access Denied</CardTitle>
              <CardDescription>You do not have permission to view Billing & Subscription.</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground leading-relaxed">
                Only Business Owners can manage subscription tiers, billing profiles, and view payment history. Please contact your administrator.
              </p>
            </CardContent>
            <CardFooter className="bg-muted/30 border-t justify-center py-4">
              <Button onClick={() => router.push("/dashboard")}>Return to Dashboard</Button>
            </CardFooter>
          </Card>
        </div>
      </DashboardLayout>);

  }

  return (
    <DashboardLayout>
      <Head>
        <title>Billing & Subscription | Dashboard</title>
      </Head>

      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-heading font-bold text-foreground">Billing & Subscription</h1>
          <p className="text-muted-foreground mt-1">Manage your subscription plan and view payment history.</p>
        </div>

        {/* Current Plan */}
        {currentPlan &&
        <Card className="border-primary/20 bg-primary/[0.02] shadow-sm relative overflow-hidden">
            {currentPlan.id === 'business' &&
          <div className="absolute top-0 right-0 bg-primary text-white text-[9px] font-bold uppercase tracking-widest px-3 py-1 rounded-bl">
                Pro Member
              </div>
          }
            {currentPlan.id === 'enterprise' &&
          <div className="absolute top-0 right-0 bg-amber-500 text-white text-[9px] font-bold uppercase tracking-widest px-3 py-1 rounded-bl font-serif">
                ★ VIP Enterprise
              </div>
          }
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-xl font-heading font-bold">
                  Active Subscription Plan
                  {currentPlan.id === 'business' &&
                <Badge className="bg-primary hover:bg-primary text-white text-[10px] font-bold uppercase tracking-wider">Pro Business</Badge>
                }
                  {currentPlan.id === 'enterprise' &&
                <Badge className="bg-amber-500 hover:bg-amber-600 text-white text-[10px] font-bold uppercase tracking-wider font-serif">★ Enterprise</Badge>
                }
                </CardTitle>
                <Badge variant="default" className="gap-1 bg-emerald-500 hover:bg-emerald-600 text-white font-bold">
                  <Check className="h-3.5 w-3.5" /> Activated
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <h3 className="text-3xl font-heading font-extrabold text-foreground">{currentPlan.name}</h3>
                <p className="text-3xl font-heading font-extrabold text-primary">
                  AWG {currentPlan.price_awg.toFixed(2)}
                  <span className="text-sm text-muted-foreground font-normal"> / month plus Caribbean tax rules</span>
                </p>
                <div className="pt-4 grid sm:grid-cols-2 gap-2 border-t border-dashed mt-4">
                  <p className="text-sm text-muted-foreground flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span>Up to <strong>{currentPlan.max_loyalty_programs === 9999 ? "Unlimited" : currentPlan.max_loyalty_programs}</strong> active loyalty programs</span>
                  </p>
                  <p className="text-sm text-muted-foreground flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span>Up to <strong>{currentPlan.max_customers === 999999 ? "Unlimited" : currentPlan.max_customers.toLocaleString()}</strong> active customer profiles</span>
                  </p>
                  <p className="text-sm text-muted-foreground flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span>Up to <strong>{currentPlan.max_staff || 1}</strong> authorized merchant staff accounts</span>
                  </p>
                  <p className="text-sm text-muted-foreground flex items-center gap-2">
                    <Check className={`h-4 w-4 shrink-0 ${currentPlan.includes_premium_templates ? "text-emerald-500" : "text-muted-foreground/30"}`} />
                    <span className={currentPlan.includes_premium_templates ? "font-semibold text-foreground" : "line-through opacity-50"}>
                      39 HD Design Presets & Templates {currentPlan.includes_premium_templates ? "✨" : "🔒"}
                    </span>
                  </p>
                  {currentPlan.features?.map((feature: string, idx: number) =>
                <p key={idx} className="text-sm text-muted-foreground flex items-center gap-2 sm:col-span-2">
                      <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                      <span>{feature}</span>
                    </p>
                )}
                </div>
              </div>
            </CardContent>
          </Card>
        }

        {/* Available Plans */}
        <div>
          <h2 className="text-xl font-heading font-semibold mb-4">Choose Your Growth Plan</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {plans.map((plan) => {
              const isCurrent = plan.id === business?.subscription_plan;
              const isBusiness = plan.id === "business";
              const isEnterprise = plan.id === "enterprise";
              const isTrial = plan.is_trial;

              return (
                <Card
                  key={plan.id}
                  className={`flex flex-col relative transition-all duration-300 overflow-hidden ${
                  isCurrent ?
                  "border-primary ring-2 ring-primary/20 shadow-md scale-[1.02] z-10 bg-primary/[0.01]" :
                  isEnterprise ?
                  "border-amber-500/30 hover:border-amber-500 bg-amber-500/[0.01] shadow-sm hover:shadow-md" :
                  isBusiness ?
                  "border-primary/20 hover:border-primary bg-primary/[0.005] shadow-sm hover:shadow-md" :
                  "border-border bg-background shadow-sm hover:border-muted-foreground/30"}`
                  }>
                  
                  {isBusiness &&
                  <span className="absolute top-0 right-0 bg-primary text-white text-[9px] font-bold tracking-widest px-3 py-1 rounded-bl uppercase">
                      Recommended
                    </span>
                  }
                  {isEnterprise &&
                  <span className="absolute top-0 right-0 bg-amber-500 text-white text-[9px] font-bold tracking-widest px-3 py-1 rounded-bl uppercase font-serif">
                      ★ Exclusive
                    </span>
                  }
                  <CardHeader className="pb-4 pt-6">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-xl font-heading font-extrabold">{plan.name}</CardTitle>
                      {isBusiness && <Badge variant="outline" className="border-primary text-primary bg-primary/5 font-bold">PRO</Badge>}
                      {isEnterprise && <Badge variant="outline" className="border-amber-500 text-amber-600 bg-amber-500/5 font-serif font-bold">★ VIP</Badge>}
                    </div>
                    <CardDescription className="pt-2">
                      <span className="text-3xl font-heading font-extrabold text-foreground">
                        AWG {plan.price_awg.toFixed(2)}
                      </span>
                      <span className="text-muted-foreground text-sm"> / month</span>
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3.5 flex-grow pb-6">
                    <p className="text-sm flex items-center gap-2.5">
                      <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                      <span><strong>{plan.max_loyalty_programs === 9999 ? "Unlimited" : plan.max_loyalty_programs}</strong> Loyalty Programs</span>
                    </p>
                    <p className="text-sm flex items-center gap-2.5">
                      <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                      <span><strong>{plan.max_customers === 999999 ? "Unlimited" : plan.max_customers.toLocaleString()}</strong> Active Customers</span>
                    </p>
                    <p className="text-sm flex items-center gap-2.5">
                      <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                      <span><strong>{plan.max_staff || 1}</strong> Staff Accounts</span>
                    </p>
                    
                    {/* Explicit visual Premium Templates checklist check */}
                    <p className="text-sm flex items-center gap-2.5 pt-2 border-t border-dashed">
                      <Check className={`h-4 w-4 shrink-0 ${plan.includes_premium_templates ? "text-emerald-500" : "text-muted-foreground/20"}`} />
                      <span className={plan.includes_premium_templates ? "font-semibold text-foreground" : "text-muted-foreground/60 line-through"}>
                        39 HD Design Presets {!plan.includes_premium_templates && "🔒"}
                      </span>
                    </p>
                    
                    {plan.features?.map((feature: string, idx: number) =>
                    <p key={idx} className="text-sm flex items-center gap-2.5">
                        <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                        <span>5,000 Active Customers</span>
                      </p>
                    )}
                  </CardContent>
                  <CardFooter className="pt-4 border-t bg-muted/10">
                    <Button
                      className={`w-full font-bold h-10 ${
                      isCurrent ?
                      "bg-muted text-muted-foreground border-border hover:bg-muted cursor-default" :
                      isEnterprise ?
                      "bg-amber-500 text-white hover:bg-amber-600 shadow-sm" :
                      "bg-primary text-white hover:bg-primary/95 shadow-sm"}`
                      }
                      variant={isCurrent ? "outline" : "default"}
                      disabled={isCurrent}
                      onClick={() => handlePlanChange(plan)}>
                      
                      {isCurrent ?
                      "Active Plan" :
                      plan.price_awg < (currentPlan?.price_awg || 0) ?
                      "Downgrade Plan" :
                      "Upgrade Plan"
                      }
                    </Button>
                  </CardFooter>
                </Card>);

            })}
          </div>
        </div>

        {/* Payment History */}
        {pendingPayments.length > 0 &&
        <div>
            <h2 className="text-xl font-heading font-semibold mb-4">Payment History</h2>
            <div className="space-y-4">
              {pendingPayments.map((payment) =>
            <Card key={payment.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">
                        {payment.metadata?.plan_name || "Subscription Payment"}
                      </CardTitle>
                      <Badge variant={getStatusVariant(payment.status)} className="gap-1">
                        {getStatusIcon(payment.status)}
                        {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
                      </Badge>
                    </div>
                    <CardDescription>
                      Reference: {payment.payment_reference}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid sm:grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Amount</p>
                        <p className="font-semibold">AWG {payment.amount.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Submitted</p>
                        <p className="font-semibold">{new Date(payment.created_at).toLocaleDateString()}</p>
                      </div>
                      {payment.reviewed_at &&
                  <div>
                          <p className="text-muted-foreground">Reviewed</p>
                          <p className="font-semibold">{new Date(payment.reviewed_at).toLocaleDateString()}</p>
                        </div>
                  }
                      {payment.admin_notes &&
                  <div className="sm:col-span-2">
                          <p className="text-muted-foreground">Admin Notes</p>
                          <p className="font-semibold">{payment.admin_notes}</p>
                        </div>
                  }
                    </div>
                  </CardContent>
                </Card>
            )}
            </div>
          </div>
        }
      </div>
    </DashboardLayout>);

}