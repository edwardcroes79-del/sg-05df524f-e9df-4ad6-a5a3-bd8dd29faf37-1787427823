import { useEffect, useState } from "react";
import Head from "next/head";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { ReconcileMembersDialog } from "@/components/dashboard/ReconcileMembersDialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  Users, 
  Search, 
  Mail, 
  Phone, 
  Calendar, 
  Award, 
  Fingerprint, 
  Eye, 
  X, 
  Loader2, 
  Sparkles,
  CheckCircle,
  Gift,
  Clock,
  AlertCircle,
  Download,
  Upload,
  FileCheck,
  Crown
} from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useI18n } from "@/contexts/I18nProvider";

interface CustomerProfile {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  avatar: string | null;
  created_at: string;
}

interface CustomerLoyaltyCard {
  id: string;
  current_stamps: number;
  total_stamps: number;
  rewards_earned: number;
  status: string;
  is_vip: boolean | null;
  created_at: string;
  updated_at: string;
  customer: CustomerProfile;
  loyalty_programs?: {
    id: string;
    name: string;
    stamp_target: number;
    reward_title: string;
  } | null;
}

type ImportStatus = "valid" | "invalid" | "duplicate" | "existing" | "ambiguous";

interface ImportPreviewRow {
  rowNumber: number;
  memberName: string;
  emailAddress: string;
  phoneNumber: string;
  loyaltyProgram: string;
  status: ImportStatus;
  messages: string[];
}

interface ImportPreviewPayload {
  rows: ImportPreviewRow[];
  targetProgramId: string;
  targetProgramName: string;
  targetProgramRequired: boolean;
  programsInFile: string[];
  summary: Record<ImportStatus, number>;
  importToken: string;
}

interface LoyaltyProgramOption {
  id: string;
  name: string;
}

export default function CustomersDashboard() {
  const { toast } = useToast();
  const { t, language } = useI18n();
  const locale = language === "es" ? "es-ES" : "en-US";
  const [loading, setLoading] = useState(true);
  const [business, setBusiness] = useState<any>(null);
  const [canExportMembers, setCanExportMembers] = useState(false);
  const [canImportMembers, setCanImportMembers] = useState(false);
  const [canBulkRemoveMembers, setCanBulkRemoveMembers] = useState(false);
  const [canIdentifyVipMembers, setCanIdentifyVipMembers] = useState(false);
  const [checkingImportAccess, setCheckingImportAccess] = useState(false);
  const [exportingMembers, setExportingMembers] = useState(false);
  const [previewingImport, setPreviewingImport] = useState(false);
  const [confirmingImport, setConfirmingImport] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [reconcileDialogOpen, setReconcileDialogOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importProgramId, setImportProgramId] = useState("");
  const [importPreview, setImportPreview] = useState<ImportPreviewPayload | null>(null);
  const [importResult, setImportResult] = useState<any | null>(null);
  const [businessPrograms, setBusinessPrograms] = useState<LoyaltyProgramOption[]>([]);
  const [effectiveCustomerLimit, setEffectiveCustomerLimit] = useState<number | null>(null);
  const [currentMemberCount, setCurrentMemberCount] = useState(0);
  const [cards, setCards] = useState<CustomerLoyaltyCard[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [vipOnly, setVipOnly] = useState(false);
  const [vipUpdatingId, setVipUpdatingId] = useState<string | null>(null);
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const itemsPerPage = 50;
  
  // Selected Customer Modal State
  const [selectedCard, setSelectedCard] = useState<CustomerLoyaltyCard | null>(null);
  const [customerTransactions, setCustomerTransactions] = useState<any[]>([]);
  const [customerRewards, setCustomerRewards] = useState<any[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Redemption Action State
  const [rewardToRedeem, setRewardToRedeem] = useState<any | null>(null);
  const [redeemingId, setRedeemingId] = useState<string | null>(null);

  useEffect(() => {
    fetchBusinessAndCustomers();
  }, []);

  const loadCardsPage = async (resolvedBusinessId: string, page: number) => {
    const startIndex = (page - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage - 1;

    const { data: cardsData, error: cardsError, count } = await (supabase
      .from("customer_loyalty_cards") as any)
      .select(`
        id,
        current_stamps,
        total_stamps,
        rewards_earned,
        status,
        is_vip,
        created_at,
        updated_at,
        customer:customers (
          id,
          name,
          email,
          phone,
          avatar,
          created_at
        ),
        loyalty_programs (
          id,
          name,
          stamp_target,
          reward_title
        )
      `, { count: 'exact' })
      .eq("business_id", resolvedBusinessId)
      .eq("status", "active")
      .range(startIndex, endIndex);

    if (cardsError) throw cardsError;

    setTotalCount(count || 0);
    const typedCards = (cardsData || []).filter((c: any) => c.customer) as unknown as CustomerLoyaltyCard[];
    setCards(typedCards);
  };

  const checkBusinessEntitlement = async (businessId: string, key: string) => {
    const { data, error } = await (supabase.rpc as any)("get_business_boolean_entitlement", {
      p_business_id: businessId,
      p_key: key,
      p_fallback: false,
    });

    if (error) {
      console.error(`Unable to verify ${key} entitlement:`, error);
      return false;
    }

    return data === true;
  };

  const fetchBusinessAndCustomers = async (page: number = currentPage) => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      let resolvedBusinessId: string | null = null;

      const { data: ownedBusinesses, error: bizError } = await supabase
        .from("businesses")
        .select("id")
        .eq("owner_id", session.user.id)
        .order("created_at", { ascending: false });

      if (bizError) throw bizError;

      if (ownedBusinesses && ownedBusinesses.length > 0) {
        const entitlementResults = await Promise.all(
          ownedBusinesses.map(async (ownedBusiness) => {
            const { data: importEntitlement } = await (supabase.rpc as any)("get_business_boolean_entitlement", {
              p_business_id: ownedBusiness.id,
              p_key: "excel_member_import",
              p_fallback: false,
            });

            return {
              businessId: ownedBusiness.id,
              canImport: importEntitlement === true,
            };
          })
        );

        resolvedBusinessId = entitlementResults.find((result) => result.canImport)?.businessId || ownedBusinesses[0].id;
      } else {
        const { data: membership, error: membershipError } = await supabase
          .from("business_users")
          .select("business_id, role, status")
          .eq("user_id", session.user.id)
          .eq("status", "active")
          .limit(1)
          .maybeSingle();

        if (membershipError) throw membershipError;

        if (membership?.business_id) {
          resolvedBusinessId = membership.business_id;
        }
      }

      if (!resolvedBusinessId) {
        toast({
          title: t("dashboard.customers.accessError"),
          description: t("dashboard.customers.accessErrorDescription"),
          variant: "destructive",
        });
        return;
      }
      
      setBusiness({ id: resolvedBusinessId });

      const [
        exportAllowed,
        importAllowed,
        bulkRemovalAllowed,
        vipAllowed,
        programsResult,
        effectiveLimitResult,
        memberRowsResult,
      ] = await Promise.all([
        checkBusinessEntitlement(resolvedBusinessId, "excel_member_export"),
        checkBusinessEntitlement(resolvedBusinessId, "excel_member_import"),
        checkBusinessEntitlement(resolvedBusinessId, "bulk_member_removal"),
        checkBusinessEntitlement(resolvedBusinessId, "vip_member_identification"),
        supabase
          .from("loyalty_programs")
          .select("id, name")
          .eq("business_id", resolvedBusinessId)
          .eq("active", true)
          .order("created_at", { ascending: true }),
        (supabase.rpc as any)("get_business_effective_numeric_limit", {
          p_business_id: resolvedBusinessId,
          p_key: "max_customers",
          p_fallback: 300,
        }),
        supabase
          .from("customer_loyalty_cards")
          .select("customer_id")
          .eq("business_id", resolvedBusinessId)
          .eq("status", "active")
          .not("customer_id", "is", null),
        loadCardsPage(resolvedBusinessId, page),
      ]);

      setCanExportMembers(exportAllowed);
      setCanImportMembers(importAllowed);
      setCanBulkRemoveMembers(bulkRemovalAllowed);
      setCanIdentifyVipMembers(vipAllowed);

      if (programsResult.error) throw programsResult.error;
      setBusinessPrograms((programsResult.data || []) as LoyaltyProgramOption[]);

      setEffectiveCustomerLimit(Number(effectiveLimitResult.data ?? 300));
      setCurrentMemberCount(new Set((memberRowsResult.data || []).map((row: any) => row.customer_id)).size);
    } catch (err: any) {
      console.error("Error loading customers:", err);
      toast({
        title: t("dashboard.customers.queryFailed"),
        description: err.message || t("dashboard.customers.loadFailed"),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = async (nextPage: number) => {
    if (!business?.id) return;

    try {
      setLoading(true);
      setCurrentPage(nextPage);
      await loadCardsPage(business.id, nextPage);
    } catch (err: any) {
      console.error("Error loading customers page:", err);
      toast({
        title: t("dashboard.customers.queryFailed"),
        description: err.message || t("dashboard.customers.loadFailed"),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const resetImportWorkflow = () => {
    setImportFile(null);
    setImportProgramId("");
    setImportPreview(null);
    setImportResult(null);
  };

  const handleOpenImportDialog = async () => {
    if (checkingImportAccess || previewingImport || confirmingImport) return;

    if (!business?.id) {
      toast({
        title: "Import unavailable",
        description: "The business context is still loading. Please try again.",
        variant: "destructive",
      });
      return;
    }

    try {
      setCheckingImportAccess(true);

      const { data: importEntitlement, error: importEntitlementError } = await (supabase.rpc as any)("get_business_boolean_entitlement", {
        p_business_id: business.id,
        p_key: "excel_member_import",
        p_fallback: false,
      });

      if (importEntitlementError) throw importEntitlementError;

      const hasImportAccess = importEntitlement === true;
      setCanImportMembers(hasImportAccess);

      if (!hasImportAccess) {
        toast({
          title: "Import unavailable",
          description: "Excel member import is not enabled for this subscription plan.",
          variant: "destructive",
        });
        return;
      }

      resetImportWorkflow();
      setImportDialogOpen(true);
    } catch (err: any) {
      toast({
        title: "Import unavailable",
        description: err.message || "Unable to verify Excel member import access.",
        variant: "destructive",
      });
    } finally {
      setCheckingImportAccess(false);
    }
  };

  const getImportErrorMessage = (status: number, fallback: string) => {
    if (status === 401) return "Your session expired. Please sign in again and retry the import.";
    if (status === 403) return "Excel member import is not enabled for this subscription plan.";
    if (status === 413) return fallback || "This workbook is too large to import safely.";
    if (status >= 500) return "The import could not be processed right now. Please try again later.";
    return fallback || "The import could not be completed.";
  };

  const handlePreviewImport = async () => {
    if (previewingImport || !canImportMembers) return;

    if (!importFile) {
      toast({
        title: "Choose an Excel file",
        description: "Upload a Royalty Stamp .xlsx export before previewing the import.",
        variant: "destructive",
      });
      return;
    }

    if (!importFile.name.toLowerCase().endsWith(".xlsx")) {
      toast({
        title: "Unsupported file",
        description: "Upload a genuine .xlsx workbook.",
        variant: "destructive",
      });
      return;
    }

    if (!importProgramId) {
      toast({
        title: "Select a loyalty program",
        description: "Choose the target program for imported memberships before previewing.",
        variant: "destructive",
      });
      return;
    }

    try {
      setPreviewingImport(true);
      setImportPreview(null);
      setImportResult(null);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast({
          title: "Import unavailable",
          description: "Please sign in again before importing members.",
          variant: "destructive",
        });
        return;
      }

      const response = await fetch(`/api/business/member-import-preview?programId=${encodeURIComponent(importProgramId)}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        },
        body: importFile,
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        const fallback = typeof body?.error === "string" ? body.error : "";
        throw new Error(getImportErrorMessage(response.status, fallback));
      }

      const payload = await response.json();
      setImportPreview(payload.preview);
      setImportProgramId(payload.preview?.targetProgramId || importProgramId);

      toast({
        title: "Import preview ready",
        description: "Review the row summary before confirming. No members have been imported yet.",
      });
    } catch (err: any) {
      toast({
        title: "Import preview failed",
        description: err.message || "The workbook could not be previewed.",
        variant: "destructive",
      });
    } finally {
      setPreviewingImport(false);
    }
  };

  const handleConfirmImport = async () => {
    if (confirmingImport || !importPreview || !canImportMembers) return;

    try {
      setConfirmingImport(true);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast({
          title: "Import unavailable",
          description: "Please sign in again before confirming the import.",
          variant: "destructive",
        });
        return;
      }

      const response = await fetch("/api/business/member-import-confirm", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          targetProgramId: importPreview.targetProgramId,
          rows: importPreview.rows,
          importToken: importPreview.importToken,
        }),
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        const fallback = typeof payload?.error === "string" ? payload.error : "";
        throw new Error(getImportErrorMessage(response.status, fallback));
      }

      setImportResult(payload.result);
      toast({
        title: "Import complete",
        description: `${payload.result?.createdCount || 0} members imported, ${payload.result?.skippedCount || 0} skipped, ${payload.result?.failedCount || 0} failed.`,
      });
      await fetchBusinessAndCustomers();
    } catch (err: any) {
      toast({
        title: "Import failed",
        description: err.message || "The import could not be confirmed.",
        variant: "destructive",
      });
    } finally {
      setConfirmingImport(false);
    }
  };

  const extractDownloadFilename = (contentDisposition: string | null) => {
    if (!contentDisposition) return `royalty-stamp-members-${new Date().toISOString().slice(0, 10)}.xlsx`;

    const utf8Match = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);
    if (utf8Match?.[1]) return decodeURIComponent(utf8Match[1].replace(/"/g, ""));

    const quotedMatch = contentDisposition.match(/filename="([^"]+)"/i);
    if (quotedMatch?.[1]) return quotedMatch[1];

    const plainMatch = contentDisposition.match(/filename=([^;]+)/i);
    if (plainMatch?.[1]) return plainMatch[1].replace(/"/g, "").trim();

    return `royalty-stamp-members-${new Date().toISOString().slice(0, 10)}.xlsx`;
  };

  const getExportErrorMessage = (status: number, fallback: string) => {
    if (status === 401) return "Your session expired. Please sign in again and retry the export.";
    if (status === 403) return "Excel member export is not enabled for this subscription plan.";
    if (status === 413) return fallback || "This export is too large to download at once.";
    if (status >= 500) return "The export could not be prepared right now. Please try again later.";
    return fallback || "The export could not be completed.";
  };

  const handleExportMembers = async () => {
    if (exportingMembers || !canExportMembers) return;

    try {
      setExportingMembers(true);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast({
          title: "Export unavailable",
          description: "Please sign in again before exporting members.",
          variant: "destructive",
        });
        return;
      }

      const response = await fetch("/api/business/member-export", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        const contentType = response.headers.get("content-type") || "";
        const body = contentType.includes("application/json")
          ? await response.json().catch(() => null)
          : null;
        const fallback = typeof body?.error === "string" ? body.error : "";
        throw new Error(getExportErrorMessage(response.status, fallback));
      }

      const contentType = response.headers.get("content-type") || "";
      if (!contentType.includes("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")) {
        throw new Error("The server did not return a valid Excel workbook.");
      }

      const blob = await response.blob();
      const filename = extractDownloadFilename(response.headers.get("content-disposition"));
      const objectUrl = URL.createObjectURL(blob);

      try {
        const link = document.createElement("a");
        link.href = objectUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        link.remove();
      } finally {
        URL.revokeObjectURL(objectUrl);
      }

      toast({
        title: "Export started",
        description: `${filename} is downloading.`,
      });
    } catch (err: any) {
      toast({
        title: "Export failed",
        description: err.message || "The member export could not be completed.",
        variant: "destructive",
      });
    } finally {
      setExportingMembers(false);
    }
  };

  const loadHistoryAndRewards = async (card: CustomerLoyaltyCard) => {
    setLoadingDetails(true);
    try {
      // 1. Fetch latest transactions for this specific card
      const { data: txs, error: txsError } = await supabase
        .from("stamp_transactions")
        .select("*")
        .eq("loyalty_card_id", card.id)
        .order("created_at", { ascending: false });

      if (txsError) throw txsError;
      setCustomerTransactions(txs || []);

      // 2. Fetch rewards earned by this specific customer
      const { data: rws, error: rwsError } = await supabase
        .from("rewards")
        .select("*")
        .eq("customer_id", card.customer.id)
        .eq("business_id", business.id)
        .order("earned_at", { ascending: false });

      if (rwsError) throw rwsError;
      setCustomerRewards(rws || []);
    } catch (err: any) {
      toast({
        title: t("dashboard.customers.detailsError"),
        description: t("dashboard.customers.detailsErrorDescription"),
        variant: "destructive",
      });
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleViewCustomerDetails = async (card: CustomerLoyaltyCard) => {
    setSelectedCard(card);
    await loadHistoryAndRewards(card);
  };

  const handleToggleVip = async (card: CustomerLoyaltyCard) => {
    if (!canIdentifyVipMembers || vipUpdatingId) return;

    try {
      setVipUpdatingId(card.id);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast({
          title: "VIP update unavailable",
          description: "Please sign in again before changing VIP status.",
          variant: "destructive",
        });
        return;
      }

      const nextVipStatus = card.is_vip !== true;
      const response = await fetch("/api/business/member-vip", {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          membershipId: card.id,
          isVip: nextVipStatus,
        }),
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        const fallback = typeof payload?.error === "string" ? payload.error : "";
        throw new Error(fallback || "VIP status could not be updated.");
      }

      setCards((currentCards) => currentCards.map((currentCard) =>
        currentCard.id === card.id
          ? { ...currentCard, is_vip: payload.membership?.is_vip === true }
          : currentCard
      ));

      setSelectedCard((currentCard) =>
        currentCard?.id === card.id
          ? { ...currentCard, is_vip: payload.membership?.is_vip === true }
          : currentCard
      );

      toast({
        title: nextVipStatus ? "VIP member marked" : "VIP member removed",
        description: `${card.customer.name} is ${nextVipStatus ? "now marked as VIP" : "no longer marked as VIP"} for this membership.`,
      });
    } catch (err: any) {
      toast({
        title: "VIP update failed",
        description: err.message || "VIP status could not be updated.",
        variant: "destructive",
      });
    } finally {
      setVipUpdatingId(null);
    }
  };

  // Secure One-Click Redemption handler
  const handleRedeemReward = async (reward: any) => {
    if (!selectedCard || redeemingId || !business?.id) return;

    try {
      setRedeemingId(reward.id);

      const { data, error } = await (supabase.rpc as any)("redeem_reward_tx", {
        p_reward_code: reward.reward_code,
        p_business_id: business.id
      });

      if (error) throw error;

      const result = data as { success: boolean; message: string; reward_title?: string; reason?: string };
      const isRewardExpired = result.reason === "reward_expired" || result.message.includes("Reward Expired");

      if (!result.success) {
        toast({
          title: isRewardExpired ? t("dashboard.customers.rewardExpiredTitle") : t("dashboard.customers.redemptionFailed"),
          description: isRewardExpired ? t("dashboard.customers.rewardExpiredDescription") : result.message,
          variant: "destructive",
        });

        await loadHistoryAndRewards(selectedCard);
        setRewardToRedeem(null);
        return;
      }

      toast({
        title: t("dashboard.customers.awardRedeemedTitle"),
        description: t("dashboard.customers.awardRedeemedDescription", {
          rewardTitle: reward.reward_title,
          customerName: selectedCard.customer.name,
        }),
        variant: "default",
      });

      await loadHistoryAndRewards(selectedCard);
      await fetchBusinessAndCustomers();
      setRewardToRedeem(null);
    } catch (err: any) {
      toast({
        title: err.message?.includes("Reward Expired") ? t("dashboard.customers.rewardExpiredTitle") : t("dashboard.customers.redemptionFailed"),
        description: err.message?.includes("Reward Expired") ? t("dashboard.customers.rewardExpiredDescription") : err.message || t("dashboard.customers.redemptionFailedDescription"),
        variant: "destructive",
      });
    } finally {
      setRedeemingId(null);
    }
  };

  // Filter customers based on search query
  const filteredCards = cards.filter((card) => {
    const cust = card.customer;
    const nameMatch = cust.name.toLowerCase().includes(searchTerm.toLowerCase());
    const emailMatch = cust.email?.toLowerCase().includes(searchTerm.toLowerCase()) || false;
    const phoneMatch = cust.phone?.includes(searchTerm) || false;
    const programMatch = card.loyalty_programs?.name.toLowerCase().includes(searchTerm.toLowerCase()) || false;
    const vipMatch = !vipOnly || card.is_vip === true;
    return vipMatch && (nameMatch || emailMatch || phoneMatch || programMatch);
  });

  return (
    <DashboardLayout>
      <Head>
        <title>{t("dashboard.customers.seoTitle")}</title>
      </Head>

      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-5">
          <div>
            <div className="flex items-center gap-2 text-primary font-semibold text-sm mb-1 uppercase tracking-wider">
              <Users className="h-4 w-4" /> {t("dashboard.customers.kicker")}
            </div>
            <h1 className="text-3xl font-heading font-bold text-foreground">{t("dashboard.customers.title")}</h1>
            <p className="text-muted-foreground">{t("dashboard.customers.description")}</p>
            {effectiveCustomerLimit !== null && (
              <div className={`mt-3 inline-flex flex-wrap items-center gap-2 rounded-lg border px-3 py-2 text-sm ${
                currentMemberCount >= effectiveCustomerLimit && effectiveCustomerLimit < 999999
                  ? "border-amber-300 bg-amber-50 text-amber-800"
                  : "border-border bg-card text-muted-foreground"
              }`}>
                <span className="font-semibold text-foreground">
                  {currentMemberCount.toLocaleString()} / {effectiveCustomerLimit >= 999999 ? t("dashboard.customers.unlimited") : effectiveCustomerLimit.toLocaleString()} {t("dashboard.customers.members")}
                </span>
                <span>
                  {currentMemberCount >= effectiveCustomerLimit && effectiveCustomerLimit < 999999
                    ? t("dashboard.customers.capacityReached")
                    : t("dashboard.customers.capacityActive")}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Search Bar */}
        <Card className="border-border bg-card">
          <CardContent className="p-4 flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t("dashboard.customers.searchPlaceholder")}
                className="pl-9 bg-background"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
              {searchTerm && (
                <Button variant="ghost" onClick={() => setSearchTerm("")} className="gap-2">
                  <X className="h-4 w-4" /> {t("dashboard.customers.clearSearch")}
                </Button>
              )}
              {canIdentifyVipMembers && (
                <Button
                  type="button"
                  variant={vipOnly ? "default" : "outline"}
                  onClick={() => setVipOnly((current) => !current)}
                  className="gap-2 whitespace-nowrap"
                >
                  <Crown className="h-4 w-4" />
                  VIP only
                </Button>
              )}
              {canExportMembers && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleExportMembers}
                  disabled={exportingMembers}
                  className="gap-2 whitespace-nowrap"
                >
                  {exportingMembers ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                  {exportingMembers ? "Exporting..." : "Export to Excel"}
                </Button>
              )}
              <Button
                type="button"
                variant="outline"
                onClick={handleOpenImportDialog}
                disabled={checkingImportAccess || previewingImport || confirmingImport || !business?.id}
                className="gap-2 whitespace-nowrap"
              >
                {checkingImportAccess ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
                Import from Excel
              </Button>
              {canBulkRemoveMembers && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setReconcileDialogOpen(true)}
                  disabled={previewingImport || confirmingImport}
                  className="gap-2 whitespace-nowrap"
                >
                  <FileCheck className="h-4 w-4" />
                  Reconcile Members
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Customers Table / Grid */}
        {loading ? (
          <div className="flex items-center justify-center p-12 min-h-[300px]">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="animate-spin w-8 h-8 text-primary" />
              <p className="text-muted-foreground text-sm font-medium">{t("dashboard.customers.loading")}</p>
            </div>
          </div>
        ) : filteredCards.length === 0 ? (
          <Card className="border-dashed border-2 py-16 text-center">
            <CardContent className="flex flex-col items-center justify-center space-y-4">
              <div className="p-4 bg-primary/10 rounded-full text-primary">
                <Users className="h-10 w-10" />
              </div>
              <div className="max-w-md space-y-1">
                <h3 className="font-heading font-bold text-lg text-foreground">
                  {searchTerm ? t("dashboard.customers.noSearchTitle") : t("dashboard.customers.noCustomersTitle")}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {searchTerm 
                    ? t("dashboard.customers.noSearchDescription")
                    : t("dashboard.customers.noCustomersDescription")}
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="overflow-hidden border-border shadow-sm bg-card">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("dashboard.customers.table.customerDetails")}</TableHead>
                    <TableHead>{t("dashboard.customers.table.loyaltyProgram")}</TableHead>
                    <TableHead className="text-center">{t("dashboard.customers.table.currentStamps")}</TableHead>
                    <TableHead className="text-center">{t("dashboard.customers.table.totalStamps")}</TableHead>
                    <TableHead className="text-center">{t("dashboard.customers.table.rewards")}</TableHead>
                    <TableHead className="text-right">{t("dashboard.customers.table.actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCards.map((card) => (
                    <TableRow key={card.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-heading font-semibold text-sm">
                            {card.customer.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex flex-col min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-semibold text-foreground truncate">{card.customer.name}</span>
                              {card.is_vip === true && (
                                <Badge className="gap-1 bg-amber-100 text-amber-900 hover:bg-amber-100">
                                  <Crown className="h-3 w-3" />
                                  VIP
                                </Badge>
                              )}
                            </div>
                            {card.customer.email && (
                              <span className="text-xs text-muted-foreground truncate">{card.customer.email}</span>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium text-sm text-foreground">
                            {card.loyalty_programs?.name || t("dashboard.customers.activeProgramFallback")}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {t("dashboard.customers.targetStamps", { target: card.loyalty_programs?.stamp_target || 10 })}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center font-bold text-foreground">
                        {card.current_stamps} / {card.loyalty_programs?.stamp_target || 10}
                      </TableCell>
                      <TableCell className="text-center text-muted-foreground font-medium font-mono text-sm">
                        {card.total_stamps}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className="gap-1 bg-primary/5 text-primary border-primary/20">
                          <Award className="w-3.5 h-3.5" />
                          {card.rewards_earned}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {canIdentifyVipMembers && (
                            <Button
                              type="button"
                              variant={card.is_vip === true ? "outline" : "ghost"}
                              size="sm"
                              onClick={() => handleToggleVip(card)}
                              disabled={vipUpdatingId === card.id}
                              className="gap-1.5"
                            >
                              {vipUpdatingId === card.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Crown className="w-4 h-4" />
                              )}
                              {card.is_vip === true ? "Unmark VIP" : "Mark VIP"}
                            </Button>
                          )}
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleViewCustomerDetails(card)} 
                            className="hover:bg-primary hover:text-white"
                          >
                            <Eye className="w-4 h-4 mr-1.5" /> {t("dashboard.customers.viewDetails")}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>
        )}

        {/* Pagination Controls */}
        {!loading && filteredCards.length > 0 && totalCount > itemsPerPage && (
          <div className="flex items-center justify-between px-2">
            <p className="text-sm text-muted-foreground">
              {t("dashboard.customers.pagination", {
                start: ((currentPage - 1) * itemsPerPage) + 1,
                end: Math.min(currentPage * itemsPerPage, totalCount),
                total: totalCount,
              })}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => void handlePageChange(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
              >
                {t("dashboard.customers.previous")}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => void handlePageChange(currentPage + 1)}
                disabled={currentPage * itemsPerPage >= totalCount}
              >
                {t("dashboard.customers.next")}
              </Button>
            </div>
          </div>
        )}

        {/* Customer Detail Dialog with Dynamic Rewards Redemption List */}
        {selectedCard && (
          <Dialog open={!!selectedCard} onOpenChange={(open) => !open && setSelectedCard(null)}>
            <DialogContent className="max-w-3xl bg-card border-border overflow-y-auto max-h-[90vh]">
              <DialogHeader>
                <DialogTitle className="font-heading text-2xl font-bold flex items-center gap-2">
                  <Fingerprint className="text-primary w-6 h-6" /> {t("dashboard.customers.overviewTitle")}
                </DialogTitle>
                <DialogDescription>
                  {t("dashboard.customers.overviewDescription")}
                </DialogDescription>
              </DialogHeader>

              <div className="grid md:grid-cols-2 gap-6 py-4">
                {/* Profile Card Info */}
                <div className="space-y-4 md:border-r md:border-border md:pr-6">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-full bg-primary/20 text-primary flex items-center justify-center font-heading font-bold text-xl">
                      {selectedCard.customer.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="font-heading font-bold text-lg text-foreground truncate">
                          {selectedCard.customer.name}
                        </h4>
                        {selectedCard.is_vip === true && (
                          <Badge className="gap-1 bg-amber-100 text-amber-900 hover:bg-amber-100">
                            <Crown className="h-3 w-3" />
                            VIP
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {t("dashboard.customers.customerSince", { date: new Date(selectedCard.customer.created_at).toLocaleDateString(locale) })}
                      </p>
                    </div>
                  </div>

                  {canIdentifyVipMembers && (
                    <Button
                      type="button"
                      variant={selectedCard.is_vip === true ? "outline" : "default"}
                      onClick={() => handleToggleVip(selectedCard)}
                      disabled={vipUpdatingId === selectedCard.id}
                      className="w-full gap-2"
                    >
                      {vipUpdatingId === selectedCard.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Crown className="h-4 w-4" />
                      )}
                      {selectedCard.is_vip === true ? "Unmark VIP for this membership" : "Mark this membership as VIP"}
                    </Button>
                  )}

                  <div className="space-y-2.5 pt-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Mail className="w-4 h-4 text-primary" />
                      <span className="truncate">{selectedCard.customer.email || t("dashboard.customers.noEmail")}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Phone className="w-4 h-4 text-primary" />
                      <span>{selectedCard.customer.phone || t("dashboard.customers.noPhone")}</span>
                    </div>
                  </div>

                  <div className="p-4 bg-muted/40 rounded-lg border border-border space-y-2">
                    <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">{t("dashboard.customers.activeProgramState")}</p>
                    <p className="font-bold text-sm text-foreground">{selectedCard.loyalty_programs?.name}</p>
                    <div className="flex justify-between items-center text-xs mt-2 pt-1 border-t">
                      <span className="text-muted-foreground">{t("dashboard.customers.currentStampsLabel")}</span>
                      <span className="font-bold text-primary">{selectedCard.current_stamps} / {selectedCard.loyalty_programs?.stamp_target || 10}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-muted-foreground">{t("dashboard.customers.totalStampsIssued")}</span>
                      <span className="font-medium">{selectedCard.total_stamps}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-muted-foreground">{t("dashboard.customers.rewardsMilestone")}</span>
                      <span className="font-medium text-emerald-600">{selectedCard.rewards_earned} {t("dashboard.customers.earned")}</span>
                    </div>
                  </div>

                  {/* Stamp Transactions Section */}
                  <div className="space-y-3">
                    <h4 className="font-heading font-semibold text-sm text-foreground flex items-center gap-1.5 border-b pb-1">
                      <Clock className="w-4 h-4 text-primary" /> {t("dashboard.customers.stampActivityLog")}
                    </h4>

                    {loadingDetails ? (
                      <div className="flex items-center justify-center py-6">
                        <Loader2 className="animate-spin w-5 h-5 text-primary" />
                      </div>
                    ) : (
                      <div className="overflow-y-auto space-y-2 max-h-[140px] pr-1">
                        {customerTransactions.length === 0 ? (
                          <p className="text-center text-xs text-muted-foreground py-6">{t("dashboard.customers.noStampTransactions")}</p>
                        ) : (
                          customerTransactions.map((tx) => (
                            <div key={tx.id} className="p-2 bg-muted/20 hover:bg-muted/40 transition-colors rounded border flex justify-between items-center text-xs">
                              <div className="flex flex-col min-w-0">
                                <span className="font-semibold text-foreground">
                                  {tx.stamp_number > 0
                                    ? `+${t("dashboard.customers.stampCount", { count: tx.stamp_number })}`
                                    : t("dashboard.customers.stampCount", { count: tx.stamp_number })}
                                </span>
                                <span className="text-[10px] text-muted-foreground">
                                  {t("dashboard.customers.method", { method: tx.verification_method || t("dashboard.customers.digitalCode") })}
                                </span>
                              </div>
                              <div className="text-right text-[10px] text-muted-foreground">
                                {new Date(tx.created_at).toLocaleDateString(locale)}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Dynamic Customer Rewards List (One-Click Redemption panel) */}
                <div className="flex flex-col min-h-[300px] space-y-4">
                  <h4 className="font-heading font-semibold text-sm text-foreground flex items-center gap-1.5 border-b pb-1">
                    <Gift className="w-4 h-4 text-primary" /> {t("dashboard.customers.earnedRewards")}
                  </h4>

                  {loadingDetails ? (
                    <div className="flex-1 flex items-center justify-center">
                      <Loader2 className="animate-spin w-6 h-6 text-primary" />
                    </div>
                  ) : (
                    <div className="flex-1 overflow-y-auto space-y-3 max-h-[320px] pr-1">
                      {customerRewards.length === 0 ? (
                        <div className="text-center text-sm text-muted-foreground py-16 flex flex-col items-center justify-center space-y-2">
                          <Gift className="w-8 h-8 text-muted/50" />
                          <p>{t("dashboard.customers.noRewards")}</p>
                        </div>
                      ) : (
                        customerRewards.map((reward) => (
                          <div 
                            key={reward.id} 
                            className={`p-4 rounded-xl border transition-all ${
                              reward.status === "available" 
                                ? "bg-primary/5 border-primary/20 shadow-sm" 
                                : "bg-muted/30 border-border"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3 mb-3">
                              <div className="flex gap-2.5">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center mt-0.5 ${
                                  reward.status === "available" 
                                    ? "bg-primary/10 text-primary" 
                                    : "bg-muted text-muted-foreground"
                                }`}>
                                  <Gift className="w-4 h-4" />
                                </div>
                                <div className="flex flex-col">
                                  <span className="font-bold text-sm text-foreground">
                                    {reward.reward_title}
                                  </span>
                                  <span className="font-mono text-xs text-muted-foreground mt-0.5">
                                    {t("dashboard.customers.rewardCode")} <strong className="text-foreground tracking-wider">{reward.reward_code}</strong>
                                  </span>
                                </div>
                              </div>

                              <Badge 
                                variant={reward.status === "available" ? "default" : "secondary"}
                                className="font-medium text-[10px] tracking-wide"
                              >
                                {reward.status === "available" ? t("dashboard.customers.available") : t("dashboard.customers.redeemed")}
                              </Badge>
                            </div>

                            {reward.status === "available" ? (
                              <Button
                                className="w-full mt-1 bg-primary text-primary-foreground hover:bg-primary/90 font-bold py-2.5 rounded-lg flex items-center justify-center gap-1.5 shadow-sm text-xs"
                                onClick={() => setRewardToRedeem(reward)}
                                disabled={redeemingId !== null}
                              >
                                {redeemingId === reward.id ? (
                                  <>
                                    <Loader2 className="w-4 h-4 animate-spin" /> {t("dashboard.customers.redeeming")}
                                  </>
                                ) : (
                                  <>
                                    <CheckCircle className="w-4 h-4" /> {t("dashboard.customers.redeemAward")}
                                  </>
                                )}
                              </Button>
                            ) : (
                              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-2 pt-2 border-t border-muted">
                                <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                                <span>
                                  {t("dashboard.customers.redeemedOn", {
                                    date: new Date(reward.redeemed_at).toLocaleDateString(locale),
                                    time: new Date(reward.redeemed_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                                  })}
                                </span>
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {/* Summary Footer */}
                  <div className="pt-3 border-t border-border flex justify-between items-center text-xs">
                    <span className="text-muted-foreground">{t("dashboard.customers.quickStatus")}</span>
                    <div className="flex gap-1.5 font-semibold">
                      <span className="text-primary">
                        {t("dashboard.customers.availableCount", { count: customerRewards.filter(r => r.status === "available").length })}
                      </span>
                      <span className="text-muted-foreground">|</span>
                      <span>
                        {t("dashboard.customers.redeemedCount", { count: customerRewards.filter(r => r.status === "redeemed").length })}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {canImportMembers && (
          <Dialog open={importDialogOpen} onOpenChange={(open) => {
            setImportDialogOpen(open);
            if (!open) resetImportWorkflow();
          }}>
            <DialogContent className="max-w-4xl bg-card border-border overflow-y-auto max-h-[90vh]">
              <DialogHeader>
                <DialogTitle className="font-heading text-2xl font-bold flex items-center gap-2">
                  <Upload className="text-primary w-6 h-6" /> Import Members from Excel
                </DialogTitle>
                <DialogDescription>
                  Upload a Royalty Stamp .xlsx export, preview row results, then confirm. Selecting a file never imports members automatically.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-5 py-2">
                <div className="grid gap-4 md:grid-cols-[1fr_16rem]">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-foreground">Excel workbook</label>
                    <Input
                      type="file"
                      accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                      onChange={(event) => {
                        setImportFile(event.target.files?.[0] || null);
                        setImportPreview(null);
                        setImportResult(null);
                      }}
                      disabled={previewingImport || confirmingImport}
                    />
                    <p className="text-xs text-muted-foreground">Use the same column format as the Royalty Stamp member export. Extra columns are ignored.</p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-foreground">Target loyalty program</label>
                    <select
                      className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                      value={importProgramId}
                      onChange={(event) => {
                        setImportProgramId(event.target.value);
                        setImportPreview(null);
                        setImportResult(null);
                      }}
                      disabled={previewingImport || confirmingImport}
                    >
                      <option value="">Select program</option>
                      {businessPrograms.map((program) => (
                        <option key={program.id} value={program.id}>{program.name}</option>
                      ))}
                    </select>
                    <p className="text-xs text-muted-foreground">Imports are scoped to this business and selected program only.</p>
                  </div>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setImportDialogOpen(false);
                      resetImportWorkflow();
                    }}
                    disabled={previewingImport || confirmingImport}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    onClick={handlePreviewImport}
                    disabled={previewingImport || confirmingImport || !importFile || !importProgramId}
                    className="gap-2"
                  >
                    {previewingImport && <Loader2 className="h-4 w-4 animate-spin" />}
                    Preview Import
                  </Button>
                </div>

                {importPreview && (
                  <div className="space-y-4 rounded-xl border bg-muted/20 p-4">
                    <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                      <div>
                        <h3 className="font-heading font-bold text-foreground">Preview summary</h3>
                        <p className="text-sm text-muted-foreground">Target program: {importPreview.targetProgramName}</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {(["valid", "invalid", "duplicate", "existing", "ambiguous"] as ImportStatus[]).map((status) => (
                          <Badge key={status} variant={status === "valid" ? "default" : "outline"} className="capitalize">
                            {status}: {importPreview.summary[status] || 0}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div className="max-h-72 overflow-auto rounded-lg border bg-background">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Row</TableHead>
                            <TableHead>Member</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Notes</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {importPreview.rows.slice(0, 25).map((row) => (
                            <TableRow key={`${row.rowNumber}-${row.emailAddress || row.phoneNumber}`}>
                              <TableCell>{row.rowNumber}</TableCell>
                              <TableCell>{row.memberName || "—"}</TableCell>
                              <TableCell>{row.emailAddress || "—"}</TableCell>
                              <TableCell>
                                <Badge variant={row.status === "valid" ? "default" : "secondary"} className="capitalize">
                                  {row.status}
                                </Badge>
                              </TableCell>
                              <TableCell className="max-w-xs text-xs text-muted-foreground">
                                {row.messages.length > 0 ? row.messages.join(" ") : "Ready to import."}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>

                    {importPreview.rows.length > 25 && (
                      <p className="text-xs text-muted-foreground">Showing the first 25 preview rows of {importPreview.rows.length}.</p>
                    )}

                    <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setImportPreview(null)}
                        disabled={confirmingImport}
                      >
                        Choose another file
                      </Button>
                      <Button
                        type="button"
                        onClick={handleConfirmImport}
                        disabled={confirmingImport || (importPreview.summary.valid || 0) === 0}
                        className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
                      >
                        {confirmingImport && <Loader2 className="h-4 w-4 animate-spin" />}
                        Confirm Import
                      </Button>
                    </div>
                  </div>
                )}

                {importResult && (
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
                    <p className="font-semibold">Final result</p>
                    <p>{importResult.createdCount || 0} created, {importResult.skippedCount || 0} skipped, {importResult.failedCount || 0} failed.</p>
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
        )}

        {canBulkRemoveMembers && (
          <ReconcileMembersDialog
            open={reconcileDialogOpen}
            programs={businessPrograms}
            onOpenChange={setReconcileDialogOpen}
            onCompleted={() => fetchBusinessAndCustomers()}
          />
        )}

        {/* Lightweight Confirmation Dialog for Redemption */}
        {rewardToRedeem && selectedCard && (
          <Dialog open={!!rewardToRedeem} onOpenChange={(open) => !open && setRewardToRedeem(null)}>
            <DialogContent className="sm:max-w-md bg-card border-border">
              <DialogHeader>
                <DialogTitle className="text-foreground flex items-center gap-2 font-heading font-bold text-xl">
                  <AlertCircle className="text-primary h-5 w-5" /> {t("dashboard.customers.redeemConfirmTitle")}
                </DialogTitle>
                <DialogDescription className="space-y-3 pt-2">
                  <div className="p-3.5 bg-muted/40 rounded-lg border border-border space-y-1.5 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground text-xs">{t("dashboard.customers.customerLabel")}</span>
                      <strong className="text-foreground">{selectedCard.customer.name}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground text-xs">{t("dashboard.customers.rewardLabel")}</span>
                      <strong className="text-foreground">{rewardToRedeem.reward_title}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground text-xs">{t("dashboard.customers.voucherCode")}</span>
                      <span className="font-mono text-xs text-primary font-bold tracking-wider">{rewardToRedeem.reward_code}</span>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground text-center">
                    {t("dashboard.customers.redeemWarning")}
                  </p>
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="flex gap-2 justify-end pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setRewardToRedeem(null)}
                  disabled={redeemingId !== null}
                >
                  {t("dashboard.customers.cancel")}
                </Button>
                <Button
                  type="button"
                  onClick={() => handleRedeemReward(rewardToRedeem)}
                  disabled={redeemingId !== null}
                  className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90 font-bold"
                >
                  {redeemingId === rewardToRedeem.id ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> {t("dashboard.customers.redeeming")}
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4" /> {t("dashboard.customers.confirmRedeem")}
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </DashboardLayout>
  );
}