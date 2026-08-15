import { useEffect, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Shield, Building2, Users, CreditCard, Power, Edit2, Save, Ban, CheckCircle, Clock, XCircle, Eye, LogOut } from "lucide-react";

export default function AdminDashboard() {
  const router = useRouter();
  const { toast } = useToast();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [globalStats, setGlobalStats] = useState({
    totalBusinesses: 0,
    activeSubscribers: 0,
    totalCustomers: 0,
    totalStamps: 0,
  });

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      toast({
        title: "Logged Out",
        description: "Successfully signed out of the Super Admin Portal.",
      });
      router.push("/auth/login");
    } catch (err: any) {
      toast({
        title: "Logout Error",
        description: err.message,
        variant: "destructive",
      });
    }
  };

  // Edit states
  const [editingPlan, setEditingPlan] = useState<any | null>(null);
  const [planFormData, setPlanFormData] = useState({
    name: "",
    price_awg: 0,
    max_loyalty_programs: 0,
    max_customers: 0,
  });

  // Payment review states
  const [reviewingPayment, setReviewingPayment] = useState<any | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    checkAdmin();
  }, []);

  const checkAdmin = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/auth/login");
        return;
      }

      const { data: profile, error } = await supabase
        .from("profiles")
        .select("is_super_admin, role")
        .eq("id", user.id)
        .single();

      if (error || (!profile?.is_super_admin && profile?.role !== 'super_admin')) {
        setIsAdmin(false);
        router.push("/dashboard");
        return;
      }

      setIsAdmin(true);
      await fetchAdminData();
    } catch (err) {
      console.error(err);
      router.push("/dashboard");
    } finally {
      setLoading(false);
    }
  };

  const fetchAdminData = async () => {
    try {
      // 1. Fetch Subscription Plans
      const { data: plansData } = await supabase
        .from("subscription_plans")
        .select("*")
        .order("price_awg", { ascending: true });
      setPlans(plansData || []);

      // 2. Fetch Businesses
      const { data: bizData } = await supabase
        .from("businesses")
        .select(`
          id,
          business_name,
          slug,
          status,
          subscription_plan,
          created_at,
          owner_id
        `)
        .order("created_at", { ascending: false });
      setBusinesses(bizData || []);

      // 3. Fetch Payments
      const { data: paymentsData } = await supabase
        .from("subscription_payments")
        .select(`
          *,
          businesses!inner(business_name, slug)
        `)
        .order("created_at", { ascending: false });
      setPayments(paymentsData || []);

      // 4. Fetch Platform Stats
      const [
        { count: totalBiz },
        { count: totalCust },
        { count: totalStamps }
      ] = await Promise.all([
        supabase.from("businesses").select("*", { count: "exact", head: true }),
        supabase.from("customer_loyalty_cards").select("*", { count: "exact", head: true }),
        supabase.from("stamp_transactions").select("*", { count: "exact", head: true })
      ]);

      setGlobalStats({
        totalBusinesses: totalBiz || 0,
        activeSubscribers: bizData?.filter(b => b.subscription_plan && b.status === "active").length || 0,
        totalCustomers: totalCust || 0,
        totalStamps: totalStamps || 0,
      });
    } catch (err) {
      console.error("Error fetching admin data:", err);
    }
  };

  const handleToggleBusinessStatus = async (bizId: string, currentStatus: string) => {
    const nextStatus = currentStatus === "active" ? "suspended" : "active";
    try {
      const { error } = await supabase
        .from("businesses")
        .update({ status: nextStatus })
        .eq("id", bizId);

      if (error) throw error;

      toast({
        title: `Business ${nextStatus === "suspended" ? "Suspended" : "Activated"}`,
        description: "The status update has been successfully saved.",
      });

      await fetchAdminData();
    } catch (err: any) {
      toast({
        title: "Error updating status",
        description: err.message,
        variant: "destructive",
      });
    }
  };

  const handleChangePlan = async (bizId: string, planId: string) => {
    try {
      const { error } = await supabase
        .from("businesses")
        .update({ subscription_plan: planId })
        .eq("id", bizId);

      if (error) throw error;

      toast({
        title: "Subscription Updated",
        description: `Successfully changed plan to ${planId.toUpperCase()}`,
      });

      await fetchAdminData();
    } catch (err: any) {
      toast({
        title: "Error updating plan",
        description: err.message,
        variant: "destructive",
      });
    }
  };

  const handleEditPlanClick = (plan: any) => {
    setEditingPlan(plan);
    setPlanFormData({
      name: plan.name,
      price_awg: Number(plan.price_awg),
      max_loyalty_programs: plan.max_loyalty_programs,
      max_customers: plan.max_customers,
    });
  };

  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlan) return;

    try {
      const { error } = await supabase
        .from("subscription_plans")
        .update({
          name: planFormData.name,
          price_awg: planFormData.price_awg,
          max_loyalty_programs: planFormData.max_loyalty_programs,
          max_customers: planFormData.max_customers,
        })
        .eq("id", editingPlan.id);

      if (error) throw error;

      toast({
        title: "Plan Updated",
        description: `Successfully updated limits for ${planFormData.name} plan.`,
      });

      setEditingPlan(null);
      await fetchAdminData();
    } catch (err: any) {
      toast({
        title: "Error updating plan limits",
        description: err.message,
        variant: "destructive",
      });
    }
  };

  const handleApprovePayment = async (payment: any) => {
    if (!adminNotes.trim()) {
      toast({
        title: "Admin Notes Required",
        description: "Please add review notes before approving.",
        variant: "destructive",
      });
      return;
    }

    try {
      setProcessing(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Update payment status
      const { error: paymentError } = await supabase
        .from("subscription_payments")
        .update({
          status: "approved",
          admin_notes: adminNotes,
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", payment.id);

      if (paymentError) throw paymentError;

      // Update business subscription plan
      const { error: businessError } = await supabase
        .from("businesses")
        .update({
          subscription_plan: payment.plan_id,
          status: "active",
        })
        .eq("id", payment.business_id);

      if (businessError) throw businessError;

      toast({
        title: "Payment Approved",
        description: `${payment.businesses.business_name} has been upgraded to ${payment.plan_id.toUpperCase()} plan.`,
      });

      setReviewingPayment(null);
      setAdminNotes("");
      await fetchAdminData();
    } catch (err: any) {
      toast({
        title: "Approval Failed",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleRejectPayment = async (payment: any) => {
    if (!adminNotes.trim()) {
      toast({
        title: "Admin Notes Required",
        description: "Please add a rejection reason before rejecting.",
        variant: "destructive",
      });
      return;
    }

    try {
      setProcessing(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("subscription_payments")
        .update({
          status: "rejected",
          admin_notes: adminNotes,
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", payment.id);

      if (error) throw error;

      toast({
        title: "Payment Rejected",
        description: "The business has been notified of the rejection.",
      });

      setReviewingPayment(null);
      setAdminNotes("");
      await fetchAdminData();
    } catch (err: any) {
      toast({
        title: "Rejection Failed",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  if (loading || isAdmin === null) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="animate-spin w-8 h-8 text-primary" />
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Super Admin Panel | Aruba Royalty Stamp</title>
      </Head>

      <div className="min-h-screen bg-background p-6 md:p-12 space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-6">
          <div>
            <div className="flex items-center gap-2 text-primary font-semibold text-sm mb-1 uppercase tracking-wider">
              <Shield className="h-4 w-4" /> Super Admin Portal
            </div>
            <h1 className="text-4xl font-heading font-bold text-foreground">Platform Management</h1>
            <p className="text-muted-foreground mt-1">Configure subscription plans, monitor businesses, and manage limits.</p>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/dashboard">
              <Button variant="outline">Back to Merchant Dashboard</Button>
            </Link>
            <Button variant="destructive" onClick={handleLogout} className="gap-2">
              <LogOut className="h-4 w-4" /> Sign Out
            </Button>
          </div>
        </div>

        {/* Global Statistics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Merchants</CardTitle>
              <Building2 className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{globalStats.totalBusinesses}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Active Subscriptions</CardTitle>
              <CheckCircle className="h-4 w-4 text-emerald-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{globalStats.activeSubscribers}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Customers</CardTitle>
              <Users className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{globalStats.totalCustomers}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Stamps Issued</CardTitle>
              <CreditCard className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{globalStats.totalStamps}</div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="merchants" className="space-y-6">
          <TabsList className="bg-muted p-1 rounded-lg">
            <TabsTrigger value="merchants">Merchants & Subscriptions</TabsTrigger>
            <TabsTrigger value="payments">Payment Review</TabsTrigger>
            <TabsTrigger value="plans">Subscription Plans & Limits</TabsTrigger>
          </TabsList>

          <TabsContent value="merchants">
            <Card>
              <CardHeader>
                <CardTitle>Aruban Merchants</CardTitle>
                <CardDescription>Manage active business accounts, plan limits, and suspend/activate services.</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Business Name</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Plan</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {businesses.map((biz) => (
                      <TableRow key={biz.id}>
                        <TableCell className="font-semibold">{biz.business_name}</TableCell>
                        <TableCell>{new Date(biz.created_at).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <Badge variant={biz.status === "active" ? "default" : "destructive"}>
                            {biz.status?.toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell className="uppercase font-mono font-bold text-xs">{biz.subscription_plan || "None"}</TableCell>
                        <TableCell className="text-right flex items-center justify-end gap-2">
                          <select
                            className="bg-background border border-input rounded px-2 py-1 text-xs"
                            value={biz.subscription_plan || ""}
                            onChange={(e) => handleChangePlan(biz.id, e.target.value)}
                          >
                            <option value="">Select Plan</option>
                            {plans.map(p => (
                              <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                          </select>
                          <Button
                            variant={biz.status === "active" ? "destructive" : "default"}
                            size="sm"
                            className="gap-1 text-xs"
                            onClick={() => handleToggleBusinessStatus(biz.id, biz.status)}
                          >
                            {biz.status === "active" ? (
                              <>
                                <Ban className="h-3.5 w-3.5" /> Suspend
                              </>
                            ) : (
                              <>
                                <Power className="h-3.5 w-3.5" /> Activate
                              </>
                            )}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {businesses.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                          No merchants onboarded yet.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="payments">
            <Card>
              <CardHeader>
                <CardTitle>Payment Review Queue</CardTitle>
                <CardDescription>Review bank transfer payment proofs and approve/reject subscription upgrades.</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Business</TableHead>
                      <TableHead>Plan</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Reference</TableHead>
                      <TableHead>Submitted</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell className="font-semibold">{payment.businesses?.business_name || "Unknown"}</TableCell>
                        <TableCell className="uppercase font-mono text-xs">{payment.plan_id}</TableCell>
                        <TableCell className="font-semibold">AWG {payment.amount.toFixed(2)}</TableCell>
                        <TableCell className="font-mono text-xs">{payment.payment_reference}</TableCell>
                        <TableCell>{new Date(payment.created_at).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <Badge 
                            variant={
                              payment.status === "pending" ? "secondary" : 
                              payment.status === "approved" ? "default" : 
                              "destructive"
                            }
                            className="gap-1"
                          >
                            {payment.status === "pending" && <Clock className="h-3 w-3" />}
                            {payment.status === "approved" && <CheckCircle className="h-3 w-3" />}
                            {payment.status === "rejected" && <XCircle className="h-3 w-3" />}
                            {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {payment.status === "pending" && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setReviewingPayment(payment);
                                setAdminNotes("");
                              }}
                            >
                              <Eye className="h-4 w-4 mr-1" /> Review
                            </Button>
                          )}
                          {payment.status !== "pending" && (
                            <span className="text-xs text-muted-foreground">
                              Reviewed {new Date(payment.reviewed_at).toLocaleDateString()}
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                    {payments.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-6 text-muted-foreground">
                          No payment submissions yet.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Payment Review Dialog */}
            {reviewingPayment && (
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle>Review Payment: {reviewingPayment.businesses?.business_name}</CardTitle>
                  <CardDescription>Verify payment proof and approve or reject the subscription upgrade.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Business</p>
                        <p className="font-semibold">{reviewingPayment.businesses?.business_name}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Plan Upgrade</p>
                        <p className="font-semibold uppercase">{reviewingPayment.plan_id}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Amount</p>
                        <p className="font-bold text-xl">AWG {reviewingPayment.amount.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Payment Reference</p>
                        <p className="font-mono font-semibold">{reviewingPayment.payment_reference}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Submitted</p>
                        <p className="font-semibold">{new Date(reviewingPayment.created_at).toLocaleString()}</p>
                      </div>
                    </div>

                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Payment Proof</p>
                      {reviewingPayment.payment_proof_url ? (
                        <a 
                          href={reviewingPayment.payment_proof_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="block border rounded-lg overflow-hidden hover:border-primary transition-colors"
                        >
                          <img 
                            src={reviewingPayment.payment_proof_url} 
                            alt="Payment proof" 
                            className="w-full h-auto"
                          />
                          <p className="text-xs text-center py-2 bg-muted text-muted-foreground">Click to view full size</p>
                        </a>
                      ) : (
                        <div className="border rounded-lg p-8 text-center text-muted-foreground">
                          No proof uploaded
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="adminNotes">Admin Review Notes</Label>
                    <textarea
                      id="adminNotes"
                      className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      placeholder="Add notes about this payment verification..."
                      value={adminNotes}
                      onChange={(e) => setAdminNotes(e.target.value)}
                      disabled={processing}
                    />
                  </div>
                </CardContent>
                <CardFooter className="flex justify-end gap-2">
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setReviewingPayment(null);
                      setAdminNotes("");
                    }}
                    disabled={processing}
                  >
                    Cancel
                  </Button>
                  <Button 
                    variant="destructive"
                    onClick={() => handleRejectPayment(reviewingPayment)}
                    disabled={processing || !adminNotes.trim()}
                  >
                    {processing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <XCircle className="h-4 w-4 mr-2" />}
                    Reject Payment
                  </Button>
                  <Button 
                    onClick={() => handleApprovePayment(reviewingPayment)}
                    disabled={processing || !adminNotes.trim()}
                  >
                    {processing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                    Approve & Activate
                  </Button>
                </CardFooter>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="plans">
            <div className="grid md:grid-cols-2 gap-8">
              <Card>
                <CardHeader>
                  <CardTitle>Plan Configurations</CardTitle>
                  <CardDescription>Review and modify live subscription tiers and programmatic thresholds.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {plans.map((plan) => (
                    <div key={plan.id} className="p-4 border rounded-lg bg-muted/40 flex justify-between items-center">
                      <div>
                        <h4 className="font-heading font-semibold text-foreground flex items-center gap-2">
                          {plan.name} <span className="text-xs font-mono font-bold text-primary uppercase">({plan.id})</span>
                        </h4>
                        <p className="text-sm text-muted-foreground mt-1">Price: AWG {plan.price_awg}/mo</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Max Programs: {plan.max_loyalty_programs === 9999 ? "Unlimited" : plan.max_loyalty_programs} | 
                          Max Customers: {plan.max_customers === 999999 ? "Unlimited" : plan.max_customers}
                        </p>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => handleEditPlanClick(plan)}>
                        <Edit2 className="h-4 w-4 mr-1" /> Edit Limits
                      </Button>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {editingPlan && (
                <Card>
                  <form onSubmit={handleSavePlan}>
                    <CardHeader>
                      <CardTitle>Edit {editingPlan.name} Plan</CardTitle>
                      <CardDescription>Changes will instantly apply to all merchants subscribed to this tier.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="planName">Display Name</Label>
                        <Input
                          id="planName"
                          value={planFormData.name}
                          onChange={(e) => setPlanFormData({ ...planFormData, name: e.target.value })}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="planPrice">Price (AWG)</Label>
                        <Input
                          id="planPrice"
                          type="number"
                          value={planFormData.price_awg}
                          onChange={(e) => setPlanFormData({ ...planFormData, price_awg: Number(e.target.value) })}
                          required
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="planMaxPrograms">Max Loyalty Programs</Label>
                          <Input
                            id="planMaxPrograms"
                            type="number"
                            value={planFormData.max_loyalty_programs}
                            onChange={(e) => setPlanFormData({ ...planFormData, max_loyalty_programs: Number(e.target.value) })}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="planMaxCustomers">Max Customer Accounts</Label>
                          <Input
                            id="planMaxCustomers"
                            type="number"
                            value={planFormData.max_customers}
                            onChange={(e) => setPlanFormData({ ...planFormData, max_customers: Number(e.target.value) })}
                            required
                          />
                        </div>
                      </div>
                    </CardContent>
                    <CardFooter className="flex justify-end gap-2">
                      <Button type="button" variant="outline" onClick={() => setEditingPlan(null)}>
                        Cancel
                      </Button>
                      <Button type="submit" className="gap-2">
                        <Save className="h-4 w-4" /> Save Configuration
                      </Button>
                    </CardFooter>
                  </form>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}