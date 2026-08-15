import { useEffect, useState } from "react";
import Head from "next/head";
import { CustomerLayout } from "@/components/customer/CustomerLayout";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { History, Calendar, Award, Star } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

export default function CustomerActivityPage() {
  const [loading, setLoading] = useState(true);
  const [activities, setActivities] = useState<any[]>([]);

  useEffect(() => {
    fetchActivity();
  }, []);

  const fetchActivity = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data: customerData } = await supabase
        .from("customers")
        .select("id")
        .eq("user_id", session.user.id)
        .single();

      if (customerData) {
        // Fetch stamp transactions
        const { data: stampsData } = await supabase
          .from("stamp_transactions")
          .select(`
            id,
            stamp_type,
            stamp_number,
            created_at,
            verification_method,
            loyalty_programs (name),
            businesses (business_name)
          `)
          .eq("customer_id", customerData.id)
          .order("created_at", { ascending: false });

        if (stampsData) setActivities(stampsData);
      }
    } catch (err) {
      console.error("Error fetching activity:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <CustomerLayout>
      <Head>
        <title>Activity History | Royalty Stamp</title>
      </Head>

      <div className="space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-heading font-bold text-foreground">Activity History</h1>
          <p className="text-muted-foreground mt-1">An immutable real-time log of all stamps earned or redeemed.</p>
        </div>

        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : activities.length === 0 ? (
          <Card className="border-dashed bg-card/50">
            <CardContent className="p-12 text-center">
              <History className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">No activity recorded yet</h3>
              <p className="text-muted-foreground max-w-sm mx-auto">
                Once you collect your first stamp or claim an unlocked reward, your transaction trail will appear here.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {activities.map((act) => (
              <Card key={act.id} className="border border-border/50 shadow-sm relative overflow-hidden hover:bg-muted/5 transition-colors">
                <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <div className={`p-2.5 rounded-full shrink-0 ${act.stamp_type === 'earned' ? 'bg-primary/10 text-primary' : 'bg-green-100 text-green-700'}`}>
                      {act.stamp_type === 'earned' ? (
                        <Star className="h-5 w-5" />
                      ) : (
                        <Award className="h-5 w-5" />
                      )}
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        {act.businesses?.business_name}
                      </p>
                      <h4 className="font-semibold text-foreground text-sm sm:text-base">
                        {act.stamp_type === 'earned' ? `Earned ${act.stamp_number} stamp(s)` : 'Reward Redeemed'}
                      </h4>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Program: <span className="font-medium text-foreground">{act.loyalty_programs?.name}</span>
                      </p>
                    </div>
                  </div>
                  <div className="text-left sm:text-right shrink-0">
                    <Badge variant="outline" className="bg-muted text-muted-foreground border-none font-medium capitalize text-xs">
                      {act.verification_method || 'QR Scan'}
                    </Badge>
                    <div className="flex items-center sm:justify-end gap-1.5 text-xs text-muted-foreground mt-1.5">
                      <Calendar className="h-3.5 w-3.5" />
                      <span>{new Date(act.created_at).toLocaleString()}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </CustomerLayout>
  );
}