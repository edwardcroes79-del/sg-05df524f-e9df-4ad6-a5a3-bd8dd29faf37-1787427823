import { useEffect, useState } from "react";
import Head from "next/head";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
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
  AlertCircle
} from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

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

export default function CustomersDashboard() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [business, setBusiness] = useState<any>(null);
  const [cards, setCards] = useState<CustomerLoyaltyCard[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  
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

  const fetchBusinessAndCustomers = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", session.user.id)
        .maybeSingle();

      const isStaffUser = profile?.role === "business_staff";
      let resolvedBusinessId = null;

      // 1. Fetch current business ID securely based on role
      if (isStaffUser) {
        const { data: membership, error: membershipError } = await supabase
          .from("business_users")
          .select("business_id")
          .eq("user_id", session.user.id)
          .eq("status", "active")
          .limit(1)
          .maybeSingle();

        if (membershipError) throw membershipError;
        if (membership) resolvedBusinessId = membership.business_id;
      } else {
        const { data: businessData, error: bizError } = await supabase
          .from("businesses")
          .select("id")
          .eq("owner_id", session.user.id)
          .limit(1)
          .single();

        if (bizError) {
          toast({
            title: "Business Not Found",
            description: "Please complete your onboarding first.",
            variant: "destructive",
          });
          return;
        }
        if (businessData) resolvedBusinessId = businessData.id;
      }

      if (!resolvedBusinessId) {
        toast({
          title: "Access Error",
          description: "Could not resolve your business profile.",
          variant: "destructive",
        });
        return;
      }
      
      setBusiness({ id: resolvedBusinessId });

      // 2. Fetch customers associated via loyalty cards with pagination
      const startIndex = (currentPage - 1) * itemsPerPage;
      const endIndex = startIndex + itemsPerPage - 1;

      const { data: cardsData, error: cardsError, count } = await supabase
        .from("customer_loyalty_cards")
        .select(`
          id,
          current_stamps,
          total_stamps,
          rewards_earned,
          status,
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
        .range(startIndex, endIndex);

      if (cardsError) throw cardsError;

      setTotalCount(count || 0);
      // Type assert to verify the join conforms correctly
      const typedCards = (cardsData || []).filter(c => c.customer) as unknown as CustomerLoyaltyCard[];
      setCards(typedCards);
    } catch (err: any) {
      console.error("Error loading customers:", err);
      toast({
        title: "Query Failed",
        description: err.message || "Failed to load customer list.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
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
        title: "Details Error",
        description: "Failed to load history metrics.",
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

  // Secure One-Click Redemption handler
  const handleRedeemReward = async (reward: any) => {
    if (!selectedCard || redeemingId) return;

    try {
      setRedeemingId(reward.id);

      // Double redemption protection check
      const { data: checkReward, error: checkError } = await supabase
        .from("rewards")
        .select("status")
        .eq("id", reward.id)
        .single();

      if (checkError) throw checkError;

      if (checkReward?.status === "redeemed") {
        throw new Error("This reward has already been redeemed.");
      }

      // Update the real database record
      const { error: updateError } = await supabase
        .from("rewards")
        .update({
          status: "redeemed",
          redeemed_at: new Date().toISOString(),
        })
        .eq("id", reward.id);

      if (updateError) throw updateError;

      toast({
        title: "🎉 Award Redeemed!",
        description: `Successfully redeemed "${reward.reward_title}" for ${selectedCard.customer.name}.`,
        variant: "default",
      });

      // Refresh both modal details and the parent list metrics in the background (realtime-aligned)
      await loadHistoryAndRewards(selectedCard);
      await fetchBusinessAndCustomers();
      setRewardToRedeem(null);
    } catch (err: any) {
      toast({
        title: "Redemption Failed",
        description: err.message || "Failed to complete redemption.",
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
    return nameMatch || emailMatch || phoneMatch || programMatch;
  });

  return (
    <DashboardLayout>
      <Head>
        <title>Customers | Aruba Royalty Stamp</title>
      </Head>

      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-5">
          <div>
            <div className="flex items-center gap-2 text-primary font-semibold text-sm mb-1 uppercase tracking-wider">
              <Users className="h-4 w-4" /> Relationship Management
            </div>
            <h1 className="text-3xl font-heading font-bold text-foreground">Registered Customers</h1>
            <p className="text-muted-foreground">Monitor loyal customers, stamp progress, and issued rewards.</p>
          </div>
        </div>

        {/* Search Bar */}
        <Card className="border-border bg-card">
          <CardContent className="p-4 flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, phone number, or program..."
                className="pl-9 bg-background"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            {searchTerm && (
              <Button variant="ghost" onClick={() => setSearchTerm("")} className="gap-2">
                <X className="h-4 w-4" /> Clear Search
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Customers Table / Grid */}
        {loading ? (
          <div className="flex items-center justify-center p-12 min-h-[300px]">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="animate-spin w-8 h-8 text-primary" />
              <p className="text-muted-foreground text-sm font-medium">Retrieving customer relationships...</p>
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
                  {searchTerm ? "No Search Results" : "No Customers Found"}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {searchTerm 
                    ? "Try adjusting your query or keywords to locate the customer." 
                    : "When customers scan your program's QR code and register, they will securely appear here automatically."}
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
                    <TableHead>Customer Details</TableHead>
                    <TableHead>Loyalty Program</TableHead>
                    <TableHead className="text-center">Current Stamps</TableHead>
                    <TableHead className="text-center">Total Stamps</TableHead>
                    <TableHead className="text-center">Rewards</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
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
                            <span className="font-semibold text-foreground truncate">{card.customer.name}</span>
                            {card.customer.email && (
                              <span className="text-xs text-muted-foreground truncate">{card.customer.email}</span>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium text-sm text-foreground">
                            {card.loyalty_programs?.name || "Active Program"}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            Target: {card.loyalty_programs?.stamp_target || 10} stamps
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
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleViewCustomerDetails(card)} 
                          className="hover:bg-primary hover:text-white"
                        >
                          <Eye className="w-4 h-4 mr-1.5" /> View Details
                        </Button>
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
              Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, totalCount)} of {totalCount} customers
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setCurrentPage(prev => Math.max(1, prev - 1));
                  fetchBusinessAndCustomers();
                }}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setCurrentPage(prev => prev + 1);
                  fetchBusinessAndCustomers();
                }}
                disabled={currentPage * itemsPerPage >= totalCount}
              >
                Next
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
                  <Fingerprint className="text-primary w-6 h-6" /> Customer Overview
                </DialogTitle>
                <DialogDescription>
                  Detailed overview, activity log, and one-click rewards redemption.
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
                      <h4 className="font-heading font-bold text-lg text-foreground truncate">
                        {selectedCard.customer.name}
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        Customer since {new Date(selectedCard.customer.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2.5 pt-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Mail className="w-4 h-4 text-primary" />
                      <span className="truncate">{selectedCard.customer.email || "No email stored"}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Phone className="w-4 h-4 text-primary" />
                      <span>{selectedCard.customer.phone || "No phone stored"}</span>
                    </div>
                  </div>

                  <div className="p-4 bg-muted/40 rounded-lg border border-border space-y-2">
                    <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Active Program State</p>
                    <p className="font-bold text-sm text-foreground">{selectedCard.loyalty_programs?.name}</p>
                    <div className="flex justify-between items-center text-xs mt-2 pt-1 border-t">
                      <span className="text-muted-foreground">Current Stamps:</span>
                      <span className="font-bold text-primary">{selectedCard.current_stamps} / {selectedCard.loyalty_programs?.stamp_target || 10}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-muted-foreground">Total Stamps Issued:</span>
                      <span className="font-medium">{selectedCard.total_stamps}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-muted-foreground">Rewards Milestone:</span>
                      <span className="font-medium text-emerald-600">{selectedCard.rewards_earned} Earned</span>
                    </div>
                  </div>

                  {/* Stamp Transactions Section */}
                  <div className="space-y-3">
                    <h4 className="font-heading font-semibold text-sm text-foreground flex items-center gap-1.5 border-b pb-1">
                      <Clock className="w-4 h-4 text-primary" /> Stamp Activity Log
                    </h4>

                    {loadingDetails ? (
                      <div className="flex items-center justify-center py-6">
                        <Loader2 className="animate-spin w-5 h-5 text-primary" />
                      </div>
                    ) : (
                      <div className="overflow-y-auto space-y-2 max-h-[140px] pr-1">
                        {customerTransactions.length === 0 ? (
                          <p className="text-center text-xs text-muted-foreground py-6">No stamp transactions found yet.</p>
                        ) : (
                          customerTransactions.map((tx) => (
                            <div key={tx.id} className="p-2 bg-muted/20 hover:bg-muted/40 transition-colors rounded border flex justify-between items-center text-xs">
                              <div className="flex flex-col min-w-0">
                                <span className="font-semibold text-foreground">
                                  {tx.stamp_number > 0 ? `+${tx.stamp_number} Stamps` : `${tx.stamp_number} Stamps`}
                                </span>
                                <span className="text-[10px] text-muted-foreground">
                                  Method: {tx.verification_method || "Digital Code"}
                                </span>
                              </div>
                              <div className="text-right text-[10px] text-muted-foreground">
                                {new Date(tx.created_at).toLocaleDateString()}
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
                    <Gift className="w-4 h-4 text-primary" /> Customer Earned Rewards
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
                          <p>This customer has not earned any rewards yet.</p>
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
                                    Code: <strong className="text-foreground tracking-wider">{reward.reward_code}</strong>
                                  </span>
                                </div>
                              </div>

                              <Badge 
                                variant={reward.status === "available" ? "default" : "secondary"}
                                className="font-medium text-[10px] tracking-wide"
                              >
                                {reward.status === "available" ? "AVAILABLE" : "REDEEMED"}
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
                                    <Loader2 className="w-4 h-4 animate-spin" /> Redeeming...
                                  </>
                                ) : (
                                  <>
                                    <CheckCircle className="w-4 h-4" /> REDEEM AWARD
                                  </>
                                )}
                              </Button>
                            ) : (
                              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-2 pt-2 border-t border-muted">
                                <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                                <span>
                                  Redeemed on {new Date(reward.redeemed_at).toLocaleDateString()} at {new Date(reward.redeemed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
                    <span className="text-muted-foreground">Quick Status:</span>
                    <div className="flex gap-1.5 font-semibold">
                      <span className="text-primary">
                        {customerRewards.filter(r => r.status === "available").length} Available
                      </span>
                      <span className="text-muted-foreground">|</span>
                      <span>
                        {customerRewards.filter(r => r.status === "redeemed").length} Redeemed
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* Lightweight Confirmation Dialog for Redemption */}
        {rewardToRedeem && selectedCard && (
          <Dialog open={!!rewardToRedeem} onOpenChange={(open) => !open && setRewardToRedeem(null)}>
            <DialogContent className="sm:max-w-md bg-card border-border">
              <DialogHeader>
                <DialogTitle className="text-foreground flex items-center gap-2 font-heading font-bold text-xl">
                  <AlertCircle className="text-primary h-5 w-5" /> Redeem this award?
                </DialogTitle>
                <DialogDescription className="space-y-3 pt-2">
                  <div className="p-3.5 bg-muted/40 rounded-lg border border-border space-y-1.5 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground text-xs">Customer:</span>
                      <strong className="text-foreground">{selectedCard.customer.name}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground text-xs">Reward:</span>
                      <strong className="text-foreground">{rewardToRedeem.reward_title}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground text-xs">Voucher Code:</span>
                      <span className="font-mono text-xs text-primary font-bold tracking-wider">{rewardToRedeem.reward_code}</span>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground text-center">
                    This will mark the customer's voucher code as redeemed in the platform. It cannot be used again.
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
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={() => handleRedeemReward(rewardToRedeem)}
                  disabled={redeemingId !== null}
                  className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90 font-bold"
                >
                  {redeemingId === rewardToRedeem.id ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Redeeming...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4" /> Confirm Redeem
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