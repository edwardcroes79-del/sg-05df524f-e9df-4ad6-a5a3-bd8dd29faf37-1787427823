import { useEffect, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Settings2, Power, PowerOff, Edit, Gift } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/contexts/I18nProvider";

export default function LoyaltyPrograms() {
  const [programs, setPrograms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOwner, setIsOwner] = useState(false);
  const { toast } = useToast();
  const { t } = useI18n();

  useEffect(() => {
    fetchPrograms();
  }, []);

  const fetchPrograms = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      let resolvedBusinessId: string | null = null;
      let ownerAccess = false;

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
        ownerAccess = membership.role === "owner";
      } else {
        const { data: b, error: bizError } = await supabase
          .from("businesses")
          .select("id, owner_id")
          .eq("owner_id", session.user.id)
          .limit(1)
          .maybeSingle();
          
        if (bizError) throw bizError;
          
        if (b) {
          resolvedBusinessId = b.id;
          ownerAccess = true;
        }
      }

      setIsOwner(ownerAccess);

      if (!resolvedBusinessId) {
        setLoading(false);
        return;
      }

      const { data: programsData, error } = await supabase
        .from("loyalty_programs")
        .select("*")
        .eq("business_id", resolvedBusinessId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setPrograms(programsData || []);
    } catch (error: any) {
      toast({
        title: t("dashboard.programs.errorFetching"),
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleStatus = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from("loyalty_programs")
        .update({ active: !currentStatus })
        .eq("id", id);

      if (error) throw error;

      setPrograms(programs.map(p => p.id === id ? { ...p, active: !currentStatus } : p));
      toast({
        title: t("dashboard.programs.statusUpdated"),
        description: t("dashboard.programs.statusUpdatedDescription", {
          status: !currentStatus ? t("dashboard.programs.active").toLowerCase() : t("dashboard.programs.paused").toLowerCase(),
        }),
      });
    } catch (error: any) {
      toast({
        title: t("dashboard.programs.updateFailed"),
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <DashboardLayout>
      <Head>
        <title>{t("dashboard.programs.seoTitle")}</title>
      </Head>

      <div className="space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-heading font-bold text-foreground">{t("dashboard.programs.title")}</h1>
            <p className="text-muted-foreground mt-2">{t("dashboard.programs.description")}</p>
          </div>
          {isOwner && (
            <Link href="/dashboard/programs/new">
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                {t("dashboard.programs.create")}
              </Button>
            </Link>
          )}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <Card key={i}><CardContent className="p-6"><Skeleton className="h-32 w-full" /></CardContent></Card>
            ))}
          </div>
        ) : programs.length === 0 ? (
          <div className="text-center py-16 bg-muted/30 border border-dashed border-border rounded-lg">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <Gift className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-heading font-bold text-foreground mb-2">{t("dashboard.programs.emptyTitle")}</h3>
            <p className="text-muted-foreground max-w-md mx-auto mb-6">
              {t("dashboard.programs.emptyDescription")}
            </p>
            {isOwner && (
              <Link href="/dashboard/programs/new">
                <Button>{t("dashboard.programs.createFirst")}</Button>
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {programs.map((program) => (
              <Card key={program.id} className="flex flex-col">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-xl font-heading">{program.name}</CardTitle>
                    <Badge variant={program.active ? "default" : "secondary"}>
                      {program.active ? t("dashboard.programs.active") : t("dashboard.programs.paused")}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2">{program.description}</p>
                </CardHeader>
                <CardContent className="flex-1">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center py-2 border-b border-border">
                      <span className="text-sm text-muted-foreground">{t("dashboard.programs.stampTarget")}</span>
                      <span className="font-bold">{program.stamp_target} {t("dashboard.programs.stamps")}</span>
                    </div>
                    <div className="flex flex-col gap-1 py-2 border-b border-border">
                      <span className="text-sm text-muted-foreground">{t("dashboard.programs.reward")}</span>
                      <span className="font-medium text-primary">{program.reward_title}</span>
                    </div>
                  </div>
                </CardContent>
                {isOwner && (
                  <CardFooter className="flex gap-2 border-t border-border pt-4">
                    <Link href={`/dashboard/programs/${program.id}`} className="flex-1">
                      <Button variant="outline" className="w-full gap-2">
                        <Edit className="h-4 w-4" /> {t("dashboard.programs.edit")}
                      </Button>
                    </Link>
                    <Button 
                      variant={program.active ? "destructive" : "default"} 
                      className="flex-1 gap-2"
                      onClick={() => toggleStatus(program.id, program.active)}
                    >
                      {program.active ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
                      {program.active ? t("dashboard.programs.pause") : t("dashboard.programs.activate")}
                    </Button>
                  </CardFooter>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}