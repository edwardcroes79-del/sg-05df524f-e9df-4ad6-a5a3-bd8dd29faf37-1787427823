import { useEffect, useState } from "react";
import Head from "next/head";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  ChevronRight
} from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

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
  
  // Selected Customer Modal State
  const [selectedCard, setSelectedCard] = useState<CustomerLoyaltyCard | null>(null);
  const [customerTransactions, setCustomerTransactions] = useState<any[]>([]);
  const [customerRewards, setCustomerRewards] = useState<any[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);

  useEffect(() => {
    fetchBusinessAndCustomers();
  }, []);

  const fetchBusinessAndCustomers = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // 1. Fetch current business
      const { data: businessData, error: bizError } = await supabase
        .from("businesses")
        .select("*")
        .eq("owner_id", session.user.id)
        .single();

      if (bizError || !businessData) {
        toast({
          title: "Business Not Found",
          description: "Please complete your onboarding first.",
          variant: "destructive",
        });
        return;
      }
      setBusiness(businessData);

      // 2. Fetch customers associated via loyalty cards
      const { data: cardsData, error: cardsError } = await supabase
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
        `)
        .eq("business_id", businessData.id);

      if (cardsError) throw cardsError;

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

  const handleViewCustomerDetails = async (card: CustomerLoyaltyCard) => {
    setSelectedCard(card);
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

        {/* Customer Detail Dialog */}
        {selectedCard && (
          <Dialog open={!!selectedCard} onOpenChange={(open) => !open && setSelectedCard(null)}>
            <DialogContent className="max-w-2xl bg-card border-border">
              <DialogHeader>
                <DialogTitle className="font-heading text-2xl font-bold flex items-center gap-2">
                  <Fingerprint className="text-primary w-6 h-6" /> Customer Overview
                </DialogTitle>
                <DialogDescription>
                  Detailed history and active rewards for this relationship.
                </DialogDescription>
              </DialogHeader>

              <div className="grid md:grid-cols-2 gap-5 py-4">
                {/* Profile Card Info */}
                <div className="space-y-4 border-r border-border pr-4">
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

                  <div className="p-3 bg-muted/40 rounded-lg border border-border space-y-1">
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
                </div>

                {/* History Tabs */}
                <div className="flex flex-col min-h-[300px] overflow-hidden">
                  <h4 className="font-heading font-semibold text-sm text-foreground flex items-center gap-1.5 mb-3">
                    <Sparkles className="w-4 h-4 text-primary animate-pulse" /> Activity &amp; Stamp Log
                  </h4>

                  {loadingDetails ? (
                    <div className="flex-1 flex items-center justify-center">
                      <Loader2 className="animate-spin w-6 h-6 text-primary" />
                    </div>
                  ) : (
                    <div className="flex-1 overflow-y-auto space-y-2 max-h-[250px] pr-1">
                      {customerTransactions.length === 0 ? (
                        <p className="text-center text-xs text-muted-foreground py-12">No stamp transactions found yet.</p>
                      ) : (
                        customerTransactions.map((tx) => (
                          <div key={tx.id} className="p-2.5 bg-muted/20 hover:bg-muted/40 transition-colors rounded border flex justify-between items-center text-xs">
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

                  {/* Rewards summary */}
                  <div className="mt-4 pt-3 border-t border-border flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">Rewards History:</span>
                    <div className="flex gap-1.5">
                      <Badge variant="outline" className="text-[10px] py-0 px-2 bg-emerald-50 text-emerald-700 border-emerald-200">
                        {customerRewards.filter(r => r.status === "available").length} Available
                      </Badge>
                      <Badge variant="outline" className="text-[10px] py-0 px-2 bg-muted text-muted-foreground">
                        {customerRewards.filter(r => r.status === "redeemed").length} Redeemed
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </DashboardLayout>
  );
}