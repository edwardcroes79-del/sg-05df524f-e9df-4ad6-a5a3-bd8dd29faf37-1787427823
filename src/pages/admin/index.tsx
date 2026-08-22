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
import { Loader2, Shield, Building2, Users, CreditCard, Power, Edit2, Save, Ban, CheckCircle, Clock, XCircle, Eye, LogOut, Trash2, Globe, ShieldCheck, ShieldAlert, Key, Mail } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { buildMfaRedirect, getMfaRouteRequirement } from "@/lib/authSecurity";

export default function AdminDashboard() {
  const router = useRouter();
  const { toast } = useToast();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [globalStats, setGlobalStats] = useState({
    totalBusinesses: 0,
    activeSubscribers: 0,
    totalCustomers: 0,
    totalStamps: 0,
    activeTrials: 0,
    expiredTrials: 0,
  });

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      toast({
        title: "Logged Out",
        description: "Successfully signed out of the Super Admin Portal.",
      });
      router.push("/");
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
    max_staff: 1,
    is_active: true,
    is_trial: false,
    trial_days: 14,
    includes_premium_templates: false,
  });

  // Payment review states
  const [reviewingPayment, setReviewingPayment] = useState<any | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [processing, setProcessing] = useState(false);

  // Customer deletion states
  const [customerToDelete, setCustomerToDelete] = useState<any | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Business deletion states
  const [businessToDelete, setBusinessToDelete] = useState<any | null>(null);
  const [deletingBusiness, setDeletingBusiness] = useState(false);
  const [approving, setApproving] = useState<string | null>(null);
  const [retryingEmail, setRetryingEmail] = useState<string | null>(null);
  const [retryingAdminEmail, setRetryingAdminEmail] = useState<string | null>(null);

  // Website settings states
  const [footerSettings, setFooterSettings] = useState({
    aboutText: "",
    copyrightText: "",
  });
  const [savingSettings, setSavingSettings] = useState(false);

  // Website Pages state
  const [pages, setPages] = useState<any[]>([]);
  const [editingPage, setEditingPage] = useState<any | null>(null);
  const [savingPage, setSavingPage] = useState(false);

  // Bank Details state
  const [bankDetails, setBankDetails] = useState({
    bankName: "",
    accountHolder: "",
    accountNumber: "",
    iban: "",
    swiftBic: "",
    bankAddress: "",
    paymentReference: "",
    additionalInstructions: "",
  });
  const [savingBankDetails, setSavingBankDetails] = useState(false);

  // 2FA States
  const [mfaFactors, setMfaFactors] = useState<any[]>([]);
  const [pendingFactorId, setPendingFactorId] = useState<string | null>(null);
  const [isEnrollingMfa, setIsEnrollingMfa] = useState(false);
  const [mfaQrCode, setMfaQrCode] = useState("");
  const [mfaSecret, setMfaSecret] = useState("");
  const [mfaFactorId, setMfaFactorId] = useState("");
  const [mfaVerifyCode, setMfaVerifyCode] = useState("");
  const [mfaLoading, setMfaLoading] = useState(false);

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

      const mfaRequirement = await getMfaRouteRequirement();
      if (mfaRequirement.required) {
        router.replace(buildMfaRedirect(router.asPath));
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
      await fetchMfaFactors();
    } catch (err) {
      console.error(err);
      router.push("/dashboard");
    } finally {
      setLoading(false);
    }
  };

  const fetchMfaFactors = async () => {
    const { data, error } = await supabase.auth.mfa.listFactors();
    if (!error && data && data.totp) {
      setMfaFactors(data.totp.filter((f: any) => f.status === 'verified'));
      const unverified = data.totp.find((f: any) => f.status === 'unverified');
      setPendingFactorId(unverified ? unverified.id : null);
    }
  };

  const handleCancelPendingSetup = async (factorIdToCancel?: string) => {
    const targetId = factorIdToCancel || pendingFactorId;
    if (!targetId) return;
    setMfaLoading(true);
    try {
      const { error } = await supabase.auth.mfa.unenroll({ factorId: targetId });
      if (error) throw error;
      toast({ title: "Setup Canceled", description: "The pending 2FA setup was safely removed." });
      setPendingFactorId(null);
      setIsEnrollingMfa(false);
      await fetchMfaFactors();
    } catch (err: any) {
      toast({ title: "Failed to cancel", description: err.message, variant: "destructive" });
    } finally {
      setMfaLoading(false);
    }
  };

  const handleEnableMfa = async () => {
    setMfaLoading(true);
    try {
      const { data, error } = await supabase.auth.mfa.enroll({ 
        factorType: 'totp',
        friendlyName: 'Super Admin (Royalty Stamp)'
      });
      if (error) throw error;
      
      setMfaQrCode(data.totp.qr_code);
      setMfaSecret(data.totp.secret);
      setMfaFactorId(data.id);
      setPendingFactorId(data.id);
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

  const fetchAdminData = async () => {
    try {
      // 1. Fetch Subscription Plans
      const { data: plansData } = await supabase
        .from("subscription_plans")
        .select("id, name, price_awg, max_loyalty_programs, max_customers, max_staff, is_active, is_trial, trial_days, includes_premium_templates")
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
          owner_id,
          trial_start,
          trial_end,
          approval_email_status,
          approval_email_error,
          admin_notify_status,
          admin_notify_error
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

      // 4. Fetch Customers
      const { data: customersData } = await supabase
        .from("customers")
        .select("id, user_id, name, email, phone, avatar, created_at")
        .order("created_at", { ascending: false })
        .limit(100);
      setCustomers(customersData || []);

      // 5. Fetch Platform Stats
      const [
        { count: totalBiz },
        { count: totalCust },
        { count: totalStamps }
      ] = await Promise.all([
        supabase.from("businesses").select("*", { count: "exact", head: true }),
        supabase.from("customers").select("*", { count: "exact", head: true }),
        supabase.from("stamp_transactions").select("*", { count: "exact", head: true })
      ]);

      const trialPlanIds = (plansData || []).filter(p => p.is_trial).map(p => p.id);
      const now = new Date();
      let activeTrials = 0;
      let expiredTrials = 0;

      (bizData || []).forEach(biz => {
        if (biz.subscription_plan && trialPlanIds.includes(biz.subscription_plan)) {
          if (biz.trial_end && new Date(biz.trial_end) < now) {
            expiredTrials++;
          } else {
            activeTrials++;
          }
        }
      });

      setGlobalStats({
        totalBusinesses: totalBiz || 0,
        activeSubscribers: bizData?.filter(b => b.subscription_plan && b.status === "active").length || 0,
        totalCustomers: totalCust || 0,
        totalStamps: totalStamps || 0,
        activeTrials,
        expiredTrials,
      });

      // 6. Fetch Website/Footer Settings
      const { data: footerData } = await supabase
        .from("website_settings")
        .select("value")
        .eq("key", "footer")
        .maybeSingle();

      if (footerData && footerData.value) {
        const val = footerData.value as any;
        setFooterSettings({
          aboutText: val.aboutText || "",
          copyrightText: val.copyrightText || "",
        });
      }

      // 7. Fetch Website Pages
      const { data: pagesData } = await supabase
        .from("website_pages")
        .select("*")
        .order("title");
      if (pagesData) setPages(pagesData);

      // 8. Fetch Bank Details
      const { data: bankData } = await supabase
        .from("website_settings")
        .select("value")
        .eq("key", "bank_details")
        .maybeSingle();

      if (bankData && bankData.value) {
        const val = bankData.value as any;
        setBankDetails({
          bankName: val.bankName || "",
          accountHolder: val.accountHolder || "",
          accountNumber: val.accountNumber || "",
          iban: val.iban || "",
          swiftBic: val.swiftBic || "",
          bankAddress: val.bankAddress || "",
          paymentReference: val.paymentReference || "",
          additionalInstructions: val.additionalInstructions || "",
        });
      }

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

  const handleApproveBusiness = async (bizId: string) => {
    try {
      setApproving(bizId);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const response = await fetch("/api/admin/approve-business", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ businessId: bizId }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to approve business");
      }

      toast({
        title: "Business Approved",
        description: result.emailSent 
          ? "The business is now active and the approval email has been sent."
          : "The business is now active, but the approval email failed to send (SMTP timeout).",
        variant: result.emailSent ? "default" : "destructive",
      });

      await fetchAdminData();
    } catch (err: any) {
      toast({
        title: "Approval Failed",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setApproving(null);
    }
  };

  const handleRetryEmail = async (bizId: string) => {
    try {
      setRetryingEmail(bizId);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const response = await fetch("/api/admin/approve-business", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ businessId: bizId, retryEmail: true }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to resend email");
      }

      toast({
        title: "Retry Email",
        description: result.emailSent 
          ? "The approval email was successfully resent."
          : "The email failed to send again. Please check SMTP settings.",
        variant: result.emailSent ? "default" : "destructive",
      });

      await fetchAdminData();
    } catch (err: any) {
      toast({
        title: "Retry Failed",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setRetryingEmail(null);
    }
  };

  const handleRetryAdminNotification = async (bizId: string) => {
    try {
      setRetryingAdminEmail(bizId);
      
      const response = await fetch("/api/admin/notify-registration", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessId: bizId, retryEmail: true, origin: window.location.origin }),
      });

      const result = await response.json();

      if (!result.success || !result.emailSent) {
        throw new Error(result.error || "Failed to resend admin notification");
      }

      toast({
        title: "Notification Resent",
        description: "The admin notification was successfully resent.",
      });

      await fetchAdminData();
    } catch (err: any) {
      toast({
        title: "Retry Failed",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setRetryingAdminEmail(null);
    }
  };

  const handleChangePlan = async (bizId: string, planId: string) => {
    try {
      const selectedPlan = plans.find(p => p.id === planId);
      const updateData: any = { subscription_plan: planId };
      
      if (selectedPlan?.is_trial) {
        const now = new Date();
        const end = new Date();
        end.setDate(now.getDate() + (selectedPlan.trial_days || 14));
        updateData.trial_start = now.toISOString();
        updateData.trial_end = end.toISOString();
      }

      const { error } = await supabase
        .from("businesses")
        .update(updateData)
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
      max_staff: plan.max_staff || 1,
      is_active: plan.is_active ?? true,
      is_trial: plan.is_trial || false,
      trial_days: plan.trial_days || 14,
      includes_premium_templates: plan.includes_premium_templates || false,
    });
  };

  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlan) return;

    // Validate that it's not negative
    if (planFormData.max_staff < 0) {
      toast({ title: "Invalid Limit", description: "Staff limit cannot be negative.", variant: "destructive" });
      return;
    }

    try {
      const { error } = await supabase
        .from("subscription_plans")
        .update({
          name: planFormData.name,
          price_awg: planFormData.price_awg,
          max_loyalty_programs: planFormData.max_loyalty_programs,
          max_customers: planFormData.max_customers,
          max_staff: planFormData.max_staff,
          is_active: planFormData.is_active,
          is_trial: planFormData.is_trial,
          trial_days: planFormData.trial_days,
          includes_premium_templates: planFormData.includes_premium_templates,
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

  const handleDeleteCustomer = async () => {
    if (!customerToDelete) return;

    try {
      setDeleting(true);

      // Verify the current user is Super Admin
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: profile } = await supabase
        .from("profiles")
        .select("is_super_admin, role")
        .eq("id", user.id)
        .single();

      if (!profile?.is_super_admin && profile?.role !== 'super_admin') {
        throw new Error("Permission denied. Only Super Admins can delete customers.");
      }

      // 1. Delete associated stamp transactions
      await supabase
        .from("stamp_transactions")
        .delete()
        .eq("customer_id", customerToDelete.id);

      // 2. Delete associated rewards (cascade fkey is present but let's be safe)
      await supabase
        .from("rewards")
        .delete()
        .eq("customer_id", customerToDelete.id);

      // 3. Delete loyalty cards (cascade fkey is present but let's be safe)
      await supabase
        .from("customer_loyalty_cards")
        .delete()
        .eq("customer_id", customerToDelete.id);

      // 4. Delete payment transactions
      await supabase
        .from("payment_transactions")
        .delete()
        .eq("customer_id", customerToDelete.id);

      // 5. Delete customer record
      const { error: customerError } = await supabase
        .from("customers")
        .delete()
        .eq("id", customerToDelete.id);

      if (customerError) throw customerError;

      // 6. Delete user profile (which clears user presence)
      if (customerToDelete.user_id) {
        await supabase
          .from("profiles")
          .delete()
          .eq("id", customerToDelete.user_id);
      }

      toast({
        title: "Customer Deleted",
        description: `Successfully removed ${customerToDelete.name} and all related loyalty data from the platform.`,
      });

      setCustomerToDelete(null);
      await fetchAdminData();
    } catch (err: any) {
      toast({
        title: "Deletion Failed",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteBusiness = async () => {
    if (!businessToDelete) return;

    try {
      setDeletingBusiness(true);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const response = await fetch("/api/admin/delete-business", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ businessId: businessToDelete.id }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to delete business");
      }

      toast({
        title: "Business Deleted",
        description: `Successfully removed ${businessToDelete.business_name} and all related demo data.`,
      });

      setBusinessToDelete(null);
      await fetchAdminData();
    } catch (err: any) {
      toast({
        title: "Deletion Failed",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setDeletingBusiness(false);
    }
  };

  const handleSaveFooterSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSavingSettings(true);

      const { error } = await supabase
        .from("website_settings")
        .upsert({
          key: "footer",
          value: {
            aboutText: footerSettings.aboutText,
            copyrightText: footerSettings.copyrightText,
          },
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;

      toast({
        title: "Settings Saved",
        description: "Public Website footer content has been updated successfully.",
      });

      await fetchAdminData();
    } catch (err: any) {
      toast({
        title: "Error saving settings",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setSavingSettings(false);
    }
  };

  const handleSaveBankDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!bankDetails.bankName || !bankDetails.accountHolder || !bankDetails.accountNumber) {
      toast({
        title: "Missing Fields",
        description: "Bank Name, Account Holder, and Account Number are required.",
        variant: "destructive"
      });
      return;
    }

    try {
      setSavingBankDetails(true);

      const { error } = await supabase
        .from("website_settings")
        .upsert({
          key: "bank_details",
          value: bankDetails,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;

      toast({
        title: "Bank details saved successfully.",
        description: "The payment instructions have been updated and are ready for client upgrades.",
      });
    } catch (err: any) {
      toast({
        title: "Error saving bank details",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setSavingBankDetails(false);
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
          <TabsList className="bg-muted p-1 rounded-lg flex-wrap h-auto">
            <TabsTrigger value="merchants">Merchants & Subscriptions</TabsTrigger>
            <TabsTrigger value="payments">Payment Review</TabsTrigger>
            <TabsTrigger value="plans">Subscription Plans & Limits</TabsTrigger>
            <TabsTrigger value="customers">Customers</TabsTrigger>
            <TabsTrigger value="payment_settings">Payment Settings</TabsTrigger>
            <TabsTrigger value="website">Website Settings</TabsTrigger>
            <TabsTrigger value="security">Account Security</TabsTrigger>
          </TabsList>

          <TabsContent value="merchants">
            <Card>
              <CardHeader>
                <CardTitle>Aruban Merchants</CardTitle>
                <CardDescription>
                  Manage active business accounts, plan limits, and suspend/activate services.
                  <div className="flex gap-4 mt-3 font-medium text-sm">
                    <span className="text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-md border border-indigo-100 flex items-center gap-2">
                      <Clock className="h-4 w-4" /> Active Trials: {globalStats.activeTrials}
                    </span>
                    <span className="text-destructive bg-destructive/10 px-2.5 py-1 rounded-md border border-destructive/20 flex items-center gap-2">
                      <Ban className="h-4 w-4" /> Expired Trials: {globalStats.expiredTrials}
                    </span>
                  </div>
                </CardDescription>
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
                          <Badge 
                            variant={biz.status === "active" ? "default" : biz.status === "pending" ? "secondary" : "destructive"}
                            className={biz.status === "pending" ? "bg-amber-100 text-amber-800 hover:bg-amber-100" : ""}
                          >
                            {biz.status?.toUpperCase()}
                          </Badge>
                          {biz.status === "active" && biz.approval_email_status === "failed" && (
                            <div className="mt-1 text-[10px] text-destructive flex items-center gap-1 font-semibold" title={biz.approval_email_error || "Approval email failed to send"}>
                              <XCircle className="h-3 w-3" /> Approval Failed
                            </div>
                          )}
                          {biz.status === "active" && biz.approval_email_status === "sent" && (
                            <div className="mt-1 text-[10px] text-emerald-600 flex items-center gap-1 font-semibold">
                              <CheckCircle className="h-3 w-3" /> Approval Sent
                            </div>
                          )}
                          {biz.admin_notify_status === "failed" && (
                            <div className="mt-1 text-[10px] text-destructive flex items-center gap-1 font-semibold" title={biz.admin_notify_error || "Admin Notification failed to send"}>
                              <XCircle className="h-3 w-3" /> Admin Notif Failed
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="uppercase font-mono font-bold text-xs">{biz.subscription_plan || "None"}</div>
                          {biz.trial_end && plans.find(p => p.id === biz.subscription_plan)?.is_trial && (
                            <div className="text-[10px] mt-1.5 flex flex-col gap-0.5">
                              <span className="text-muted-foreground">Start: {new Date(biz.trial_start).toLocaleDateString()}</span>
                              {new Date() > new Date(biz.trial_end) ? (
                                <span className="text-destructive font-semibold">Expired: {new Date(biz.trial_end).toLocaleDateString()}</span>
                              ) : (
                                <span className="text-indigo-600 font-semibold">Ends: {new Date(biz.trial_end).toLocaleDateString()}</span>
                              )}
                            </div>
                          )}
                        </TableCell>
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

                          {biz.status === "pending" && (
                            <Button
                              variant="default"
                              size="sm"
                              className="gap-1 text-xs bg-emerald-600 hover:bg-emerald-700"
                              onClick={() => handleApproveBusiness(biz.id)}
                              disabled={approving === biz.id}
                            >
                              {approving === biz.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle className="h-3.5 w-3.5" />}
                              Approve
                            </Button>
                          )}

                          {biz.status === "active" && biz.approval_email_status === "failed" && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-1 text-xs"
                              onClick={() => handleRetryEmail(biz.id)}
                              disabled={retryingEmail === biz.id}
                            >
                              {retryingEmail === biz.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Mail className="h-3.5 w-3.5" />}
                              Retry Approval Email
                            </Button>
                          )}

                          {biz.admin_notify_status === "failed" && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-1 text-xs"
                              onClick={() => handleRetryAdminNotification(biz.id)}
                              disabled={retryingAdminEmail === biz.id}
                            >
                              {retryingAdminEmail === biz.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Mail className="h-3.5 w-3.5" />}
                              Retry Notif
                            </Button>
                          )}

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
                          <Button
                            variant="destructive"
                            size="sm"
                            className="gap-1 text-xs"
                            onClick={() => setBusinessToDelete(biz)}
                          >
                            <Trash2 className="h-3.5 w-3.5" /> Delete
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
                          Max Customers: {plan.max_customers === 999999 ? "Unlimited" : plan.max_customers} | 
                          Max Staff: {plan.max_staff || 1}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          {plan.is_trial && (
                            <Badge variant="secondary" className="text-xs bg-indigo-100 text-indigo-700">
                              Free Trial ({plan.trial_days} days)
                            </Badge>
                          )}
                          {!plan.is_active && (
                            <Badge variant="destructive" className="text-xs">
                              Disabled
                            </Badge>
                          )}
                          {plan.includes_premium_templates && (
                            <Badge variant="default" className="text-xs bg-amber-500 hover:bg-amber-600">
                              Premium Templates
                            </Badge>
                          )}
                        </div>
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

                      <div className="flex items-center gap-6 py-2">
                        <label className="flex items-center gap-2 text-sm">
                          <input 
                            type="checkbox" 
                            checked={planFormData.is_active}
                            onChange={(e) => setPlanFormData({...planFormData, is_active: e.target.checked})}
                          />
                          Active / Enabled
                        </label>
                        <label className="flex items-center gap-2 text-sm text-indigo-600 font-semibold">
                          <input 
                            type="checkbox" 
                            checked={planFormData.is_trial}
                            onChange={(e) => setPlanFormData({...planFormData, is_trial: e.target.checked})}
                          />
                          Is Free Trial
                        </label>
                        <label className="flex items-center gap-2 text-sm text-amber-600 font-semibold">
                          <input 
                            type="checkbox" 
                            checked={planFormData.includes_premium_templates}
                            onChange={(e) => setPlanFormData({...planFormData, includes_premium_templates: e.target.checked})}
                          />
                          Premium Templates
                        </label>
                      </div>

                      {planFormData.is_trial && (
                        <div className="space-y-2 bg-indigo-50 p-4 rounded-md border border-indigo-100">
                          <Label htmlFor="trialDays" className="text-indigo-700">Trial Duration (Days)</Label>
                          <Input
                            id="trialDays"
                            type="number"
                            min="1"
                            value={planFormData.trial_days}
                            onChange={(e) => setPlanFormData({ ...planFormData, trial_days: Number(e.target.value) })}
                            required={planFormData.is_trial}
                          />
                        </div>
                      )}

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="planMaxPrograms">Max Loyalty Programs</Label>
                          <Input
                            id="planMaxPrograms"
                            type="number"
                            min="1"
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
                            min="1"
                            value={planFormData.max_customers}
                            onChange={(e) => setPlanFormData({ ...planFormData, max_customers: Number(e.target.value) })}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="planMaxStaff">Max Staff Accounts</Label>
                          <Input
                            id="planMaxStaff"
                            type="number"
                            min="0"
                            value={planFormData.max_staff}
                            onChange={(e) => setPlanFormData({ ...planFormData, max_staff: Number(e.target.value) })}
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

          <TabsContent value="customers">
            <Card>
              <CardHeader>
                <CardTitle>Platform Customers & Users</CardTitle>
                <CardDescription>Manage, deactivate, and permanently delete registered test customer accounts and profiles.</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Customer Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Registered At</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {customers.map((cust) => (
                      <TableRow key={cust.id}>
                        <TableCell className="font-semibold">{cust.name}</TableCell>
                        <TableCell className="font-mono text-xs">{cust.email || "No Email"}</TableCell>
                        <TableCell className="text-xs">{cust.phone || "No Phone"}</TableCell>
                        <TableCell className="text-xs">{new Date(cust.created_at).toLocaleDateString()}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => setCustomerToDelete(cust)}
                            className="gap-1 text-xs"
                          >
                            <Trash2 className="h-3.5 w-3.5" /> Delete User
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {customers.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                          No customer profiles found on the platform.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="payment_settings">
            <Card>
              <form onSubmit={handleSaveBankDetails}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5 text-primary" /> Bank Transfer Details
                  </CardTitle>
                  <CardDescription>
                    Configure the platform's bank account information. This will be displayed to businesses when they select Bank Transfer to pay for subscription upgrades.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="bankName">Bank Name <span className="text-destructive">*</span></Label>
                      <Input id="bankName" value={bankDetails.bankName} onChange={(e) => setBankDetails({...bankDetails, bankName: e.target.value})} required disabled={savingBankDetails} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="accountHolder">Account Holder / Beneficiary <span className="text-destructive">*</span></Label>
                      <Input id="accountHolder" value={bankDetails.accountHolder} onChange={(e) => setBankDetails({...bankDetails, accountHolder: e.target.value})} required disabled={savingBankDetails} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="accountNumber">Account Number <span className="text-destructive">*</span></Label>
                      <Input id="accountNumber" value={bankDetails.accountNumber} onChange={(e) => setBankDetails({...bankDetails, accountNumber: e.target.value})} required disabled={savingBankDetails} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="iban">IBAN</Label>
                      <Input id="iban" value={bankDetails.iban} onChange={(e) => setBankDetails({...bankDetails, iban: e.target.value})} disabled={savingBankDetails} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="swiftBic">SWIFT/BIC</Label>
                      <Input id="swiftBic" value={bankDetails.swiftBic} onChange={(e) => setBankDetails({...bankDetails, swiftBic: e.target.value})} disabled={savingBankDetails} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="bankAddress">Bank Address</Label>
                      <Input id="bankAddress" value={bankDetails.bankAddress} onChange={(e) => setBankDetails({...bankDetails, bankAddress: e.target.value})} disabled={savingBankDetails} />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="paymentReference">Payment Reference Instructions</Label>
                    <Input id="paymentReference" placeholder="e.g. Business Name + Invoice Number" value={bankDetails.paymentReference} onChange={(e) => setBankDetails({...bankDetails, paymentReference: e.target.value})} disabled={savingBankDetails} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="additionalInstructions">Additional Payment Instructions</Label>
                    <textarea 
                      id="additionalInstructions" 
                      className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 text-foreground"
                      placeholder="Any other details the client should know..." 
                      value={bankDetails.additionalInstructions} 
                      onChange={(e) => setBankDetails({...bankDetails, additionalInstructions: e.target.value})} 
                      disabled={savingBankDetails} 
                    />
                  </div>
                </CardContent>
                <CardFooter className="flex justify-end gap-2">
                  <Button type="submit" disabled={savingBankDetails} className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90">
                    {savingBankDetails ? (
                      <><Loader2 className="h-4 w-4 animate-spin" /> Saving...</>
                    ) : (
                      <><Save className="h-4 w-4" /> Save Changes</>
                    )}
                  </Button>
                </CardFooter>
              </form>
            </Card>
          </TabsContent>

          <TabsContent value="website">
            <Card>
              <form onSubmit={handleSaveFooterSettings}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Globe className="h-5 w-5 text-primary" /> Public Website Customization
                  </CardTitle>
                  <CardDescription>Edit content displayed on the public Home Page of Aruba Royalty Stamp.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <h3 className="font-heading font-semibold text-lg border-b pb-2 text-foreground">Footer Settings</h3>
                    
                    <div className="space-y-2">
                      <Label htmlFor="aboutText">Company / Business Description</Label>
                      <textarea
                        id="aboutText"
                        className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 text-foreground"
                        placeholder="Describe the company/platform..."
                        value={footerSettings.aboutText}
                        onChange={(e) => setFooterSettings({ ...footerSettings, aboutText: e.target.value })}
                        required
                        disabled={savingSettings}
                      />
                      <p className="text-xs text-muted-foreground">Appears in the left section of the footer on the main Home Page.</p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="copyrightText">Copyright text</Label>
                      <Input
                        id="copyrightText"
                        value={footerSettings.copyrightText}
                        onChange={(e) => setFooterSettings({ ...footerSettings, copyrightText: e.target.value })}
                        required
                        disabled={savingSettings}
                        placeholder="© 2026 Aruba Royalty Stamp. All rights reserved.Made with Love in Aruba."
                      />
                      <p className="text-xs text-muted-foreground">The full copyright text line displayed at the very bottom of the Home Page.</p>
                    </div>

                    <h3 className="font-heading font-semibold text-lg border-b pb-2 text-foreground mt-8">Legal Pages</h3>
                    <div className="space-y-4">
                      {pages.map(page => (
                        <div key={page.slug} className="flex items-center justify-between p-4 border rounded-lg bg-card">
                          <div>
                            <p className="font-semibold">{page.title}</p>
                            <p className="text-xs text-muted-foreground">/{page.slug}</p>
                          </div>
                          <Button type="button" variant="outline" size="sm" onClick={() => setEditingPage(page)}>
                            Edit Page
                          </Button>
                        </div>
                      ))}
                      {pages.length === 0 && (
                        <p className="text-sm text-muted-foreground">No pages found. The database rows might still be initializing.</p>
                      )}
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-end gap-2">
                  <Button type="submit" disabled={savingSettings} className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90">
                    {savingSettings ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" /> Saving...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4" /> Save Footer Settings
                      </>
                    )}
                  </Button>
                </CardFooter>
              </form>
            </Card>
          </TabsContent>

          <TabsContent value="security">
            <Card className="border-border shadow-sm max-w-3xl">
              <CardHeader className="bg-muted/10 border-b">
                <CardTitle className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-primary" />
                  Super Admin Account Security
                </CardTitle>
                <CardDescription>Add an extra layer of protection to your Super Admin account. Highly recommended.</CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 border rounded-lg">
                  <div>
                    <h3 className="font-semibold flex items-center gap-2 text-lg">
                      Two-Factor Authentication (2FA)
                      {mfaFactors.length > 0 ? (
                        <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold bg-emerald-50 text-emerald-600 border-emerald-200">
                          🟢 2FA Enabled
                        </span>
                      ) : pendingFactorId ? (
                        <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold bg-amber-50 text-amber-600 border-amber-200">
                          🟡 Setup Pending
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold bg-muted text-muted-foreground">
                          ⚪ 2FA Disabled
                        </span>
                      )}
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1 max-w-md">
                      Protect your admin account with TOTP authenticator apps.
                    </p>
                  </div>
                  <div>
                    {mfaFactors.length > 0 ? (
                      <Button variant="destructive" onClick={() => handleDisableMfa(mfaFactors[0].id)} disabled={mfaLoading}>
                        {mfaLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null} Disable 2FA
                      </Button>
                    ) : pendingFactorId && !isEnrollingMfa ? (
                      <Button variant="outline" onClick={() => handleCancelPendingSetup()} disabled={mfaLoading}>
                        {mfaLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null} Cancel Pending Setup
                      </Button>
                    ) : !isEnrollingMfa ? (
                      <Button onClick={handleEnableMfa} disabled={mfaLoading}>
                        {mfaLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null} Enable 2FA
                      </Button>
                    ) : null}
                  </div>
                </div>

                {isEnrollingMfa && (
                  <div className="mt-6 p-6 border rounded-lg bg-muted/20 animate-in fade-in slide-in-from-top-4">
                    <h4 className="font-heading font-bold text-lg mb-4">Complete 2FA Setup</h4>
                    <div className="grid md:grid-cols-2 gap-8">
                      <div className="space-y-4">
                        <div className="flex items-start gap-3">
                          <div className="bg-primary text-white w-6 h-6 rounded-full flex items-center justify-center font-bold text-sm shrink-0 mt-0.5">1</div>
                          <p className="text-sm text-muted-foreground">Open your authenticator app and scan this QR code.</p>
                        </div>
                        <div className="bg-white p-4 border rounded-xl inline-block shadow-sm">
                          <img src={mfaQrCode} alt="2FA QR Code" className="w-40 h-40" />
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground font-medium">Or enter this setup key manually:</p>
                          <code className="text-xs bg-muted px-2 py-1 rounded block w-max break-all select-all font-mono font-semibold">
                            {mfaSecret}
                          </code>
                        </div>
                      </div>
                      <div className="space-y-4">
                        <div className="flex items-start gap-3">
                          <div className="bg-primary text-white w-6 h-6 rounded-full flex items-center justify-center font-bold text-sm shrink-0 mt-0.5">2</div>
                          <p className="text-sm text-muted-foreground">Enter the 6-digit code generated by your app to verify and enable 2FA.</p>
                        </div>
                        <form onSubmit={handleVerifyMfaSetup} className="space-y-4 pt-2">
                          <div className="space-y-2">
                            <Label htmlFor="verificationCode">Verification Code</Label>
                            <Input 
                              id="verificationCode" type="text" inputMode="numeric" pattern="[0-9]*" maxLength={6} placeholder="000 000"
                              className="font-mono text-lg tracking-[0.25em] text-center"
                              value={mfaVerifyCode} onChange={(e) => setMfaVerifyCode(e.target.value)} required disabled={mfaLoading}
                            />
                          </div>
                          <div className="flex gap-2 pt-2">
                            <Button type="button" variant="outline" className="w-full" onClick={() => {
                              setIsEnrollingMfa(false);
                              if (mfaFactorId) handleCancelPendingSetup(mfaFactorId);
                            }} disabled={mfaLoading}>Cancel Setup</Button>
                            <Button type="submit" className="w-full" disabled={mfaVerifyCode.length < 6 || mfaLoading}>
                              {mfaLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Key className="h-4 w-4 mr-2" />} Verify & Enable
                            </Button>
                          </div>
                        </form>
                        <div className="bg-amber-500/10 border border-amber-500/20 p-3 rounded text-xs text-amber-700 mt-4 flex gap-2">
                          <ShieldAlert className="h-4 w-4 shrink-0" />
                          <p><strong>Backup Option:</strong> Please save the manual setup key in a secure password manager. It can be used to recover access if you lose your authenticator app.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Delete Confirmation Dialog */}
      {customerToDelete && (
        <Dialog open={!!customerToDelete} onOpenChange={(open) => !open && setCustomerToDelete(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-destructive flex items-center gap-2">
                <Trash2 className="h-5 w-5" /> Delete this customer?
              </DialogTitle>
              <DialogDescription className="space-y-3 pt-2">
                <p>
                  You are about to permanently delete the test customer <strong className="text-foreground">{customerToDelete.name}</strong> 
                  {customerToDelete.email ? ` (${customerToDelete.email})` : ""}.
                </p>
                <p className="text-xs font-semibold text-destructive uppercase tracking-wider bg-destructive/10 p-2.5 rounded border border-destructive/20">
                  ⚠️ This action is irreversible. All stamp logs, active loyalty cards, and rewards earned by this customer will be permanently deleted from the database.
                </p>
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="flex gap-2 justify-end pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCustomerToDelete(null)}
                disabled={deleting}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={handleDeleteCustomer}
                disabled={deleting}
                className="gap-2"
              >
                {deleting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4" /> Confirm Delete
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Business Delete Confirmation Dialog */}
      {businessToDelete && (
        <Dialog open={!!businessToDelete} onOpenChange={(open) => !open && setBusinessToDelete(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-destructive flex items-center gap-2">
                <Trash2 className="h-5 w-5" /> Delete this business?
              </DialogTitle>
              <DialogDescription className="space-y-3 pt-2">
                <p>
                  You are about to permanently delete the test business <strong className="text-foreground">{businessToDelete.business_name}</strong>.
                </p>
                <p className="text-xs font-semibold text-destructive uppercase tracking-wider bg-destructive/10 p-2.5 rounded border border-destructive/20">
                  ⚠️ This action is irreversible. All related staff accounts, programs, loyalty cards, rewards, QR codes, and stamp transactions will be permanently deleted from the database.
                </p>
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="flex gap-2 justify-end pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setBusinessToDelete(null)}
                disabled={deletingBusiness}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={handleDeleteBusiness}
                disabled={deletingBusiness}
                className="gap-2"
              >
                {deletingBusiness ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4" /> Confirm Delete
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Edit Page Dialog */}
      {editingPage && (
        <Dialog open={!!editingPage} onOpenChange={(open) => !open && setEditingPage(null)}>
          <DialogContent className="sm:max-w-3xl max-h-[90vh] flex flex-col">
            <DialogHeader>
              <DialogTitle>Edit {editingPage.title}</DialogTitle>
              <DialogDescription>Modify the content of the /{editingPage.slug} page. Basic HTML tags are supported (h2, p, strong, ul, li).</DialogDescription>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto py-4 space-y-4">
              <div className="space-y-2">
                <Label>Page Title</Label>
                <Input 
                  value={editingPage.title} 
                  onChange={(e) => setEditingPage({...editingPage, title: e.target.value})} 
                />
              </div>
              <div className="space-y-2">
                <Label>Page Content (HTML)</Label>
                <textarea 
                  className="w-full min-h-[400px] p-3 border rounded-md font-mono text-sm bg-background text-foreground"
                  value={editingPage.content || ""}
                  onChange={(e) => setEditingPage({...editingPage, content: e.target.value})}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditingPage(null)} disabled={savingPage}>Cancel</Button>
              <Button type="button" onClick={async () => {
                try {
                  setSavingPage(true);
                  const { error } = await supabase.from("website_pages").update({
                    title: editingPage.title,
                    content: editingPage.content,
                    updated_at: new Date().toISOString()
                  }).eq("slug", editingPage.slug);
                  if (error) throw error;
                  toast({ title: "Page saved", description: "The page content has been updated successfully." });
                  setEditingPage(null);
                  fetchAdminData();
                } catch(e: any) {
                  toast({ title: "Error saving page", description: e.message, variant: "destructive" });
                } finally {
                  setSavingPage(false);
                }
              }} disabled={savingPage}>
                {savingPage ? "Saving..." : "Save Page"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}