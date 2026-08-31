import { useEffect, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, QrCode, ArrowRight, Printer, RefreshCw, AlertCircle } from "lucide-react";
import QRCode from "react-qr-code";
import { useToast } from "@/hooks/use-toast";

export default function QRManagement() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [business, setBusiness] = useState<any>(null);
  const [programs, setPrograms] = useState<any[]>([]);
  const [qrCodes, setQrCodes] = useState<any[]>([]);
  const [userRole, setUserRole] = useState<"owner" | "staff" | null>(null);

  useEffect(() => {
    fetchQRData();
  }, []);

  const fetchQRData = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // 1. Resolve business & role
      let resolvedBusiness: any = null;
      let role: "owner" | "staff" | null = null;

      const { data: membership } = await supabase
        .from("business_users")
        .select("business_id, role, status")
        .eq("user_id", session.user.id)
        .eq("status", "active")
        .limit(1)
        .maybeSingle();

      if (membership?.business_id) {
        role = "staff";
        const { data: bData } = await supabase
          .from("businesses")
          .select("*")
          .eq("id", membership.business_id)
          .single();
        resolvedBusiness = bData;
      } else {
        const { data: bData } = await supabase
          .from("businesses")
          .select("*")
          .eq("owner_id", session.user.id)
          .maybeSingle();
        
        if (bData) {
          role = "owner";
          resolvedBusiness = bData;
        }
      }

      if (!resolvedBusiness) return;
      setBusiness(resolvedBusiness);
      setUserRole(role);

      // Fetch active loyalty programs
      const { data: pData } = await supabase
        .from("loyalty_programs")
        .select("*")
        .eq("business_id", resolvedBusiness.id)
        .eq("active", true);

      setPrograms(pData || []);

      // Fetch QR codes from database
      const { data: qData } = await supabase
        .from("qr_codes")
        .select(`
          *,
          loyalty_programs (
            id,
            name,
            card_color
          )
        `)
        .eq("business_id", resolvedBusiness.id);

      setQrCodes(qData || []);
    } catch (err: any) {
      console.error("Error fetching QR data:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateQR = async (programId: string) => {
    if (userRole === "staff") {
      toast({
        title: "Access Denied",
        description: "Staff are not permitted to generate new QR codes.",
        variant: "destructive",
      });
      return;
    }
    if (generating) return;
    setGenerating(true);

    try {
      // Validate that QR doesn't already exist for this program
      const existing = qrCodes.find(q => q.loyalty_program_id === programId);
      if (existing) {
        toast({
          title: "QR Code Exists",
          description: "A QR code has already been generated for this program.",
          variant: "destructive",
        });
        return;
      }

      // Code format: program ID
      const qrCodeString = `JOIN:${programId}`;

      const { data: newQR, error: qrError } = await supabase
        .from("qr_codes")
        .insert({
          business_id: business.id,
          loyalty_program_id: programId,
          code: qrCodeString,
          type: "join_program",
          active: true
        })
        .select(`
          *,
          loyalty_programs (
            id,
            name,
            card_color
          )
        `)
        .single();

      if (qrError) throw qrError;

      setQrCodes(prev => [newQR, ...prev]);
      toast({
        title: "Success",
        description: "QR Code created successfully.",
      });
    } catch (err: any) {
      toast({
        title: "Error creating QR Code",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex h-[400px] items-center justify-center">
          <Loader2 className="animate-spin h-8 w-8 text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  // Find active programs that don't have a generated QR Code yet
  const programsWithoutQR = programs.filter(
    prog => !qrCodes.some(q => q.loyalty_program_id === prog.id)
  );

  const isStaff = userRole === "staff";

  return (
    <DashboardLayout>
      <Head>
        <title>QR Codes Management | Aruba Royalty Stamp</title>
      </Head>

      <div className="space-y-8 max-w-5xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-heading font-bold text-foreground">QR Codes & Posters</h1>
            <p className="text-muted-foreground mt-2">
              {isStaff 
                ? "View and download scannable customer touchpoints created by the business owner."
                : "Manage scannable customer touchpoints to register and enroll users."}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={fetchQRData} className="gap-2 self-start md:self-auto">
            <RefreshCw className="h-4 w-4" /> Refresh Data
          </Button>
        </div>

        {/* Require Loyalty Program State for New Businesses */}
        {!isStaff && programs.length === 0 && qrCodes.length === 0 && (
          <Card className="border-amber-500/50 bg-amber-500/5 shadow-sm">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2 text-amber-700">
                <AlertCircle className="h-5 w-5" />
                <CardTitle className="text-lg">Action Required: Create a Loyalty Program</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm mb-4">
                You must have an active Loyalty Program before you can generate a QR code. Customers need a specific program to join when they scan your code.
              </p>
              <Link href="/dashboard/programs/new">
                <Button className="bg-amber-600 hover:bg-amber-700 text-white font-semibold">
                  Create Your First Program
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}

        {/* Generate Card Section (Hone for Owners only) */}
        {!isStaff && programsWithoutQR.length > 0 && (
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader>
              <CardTitle className="text-lg">Generate Missing QR Codes</CardTitle>
              <CardDescription>You have active loyalty programs without a dedicated join QR code.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {programsWithoutQR.map(prog => (
                <div key={prog.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border border-border bg-card rounded-lg gap-4">
                  <div>
                    <h3 className="font-semibold text-foreground">{prog.name}</h3>
                    <p className="text-xs text-muted-foreground mt-1">Collect {prog.stamp_target} stamps to win: {prog.reward_title}</p>
                  </div>
                  <Button 
                    onClick={() => handleGenerateQR(prog.id)} 
                    disabled={generating}
                    className="w-full sm:w-auto"
                  >
                    {generating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <QrCode className="h-4 w-4 mr-2" />}
                    Create QR Code
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* List Generated QR Codes */}
        {qrCodes.length === 0 ? (
          <Card className="p-8 text-center mt-6">
            <CardContent className="space-y-4 pt-6">
              <div className="bg-muted p-4 rounded-full w-16 h-16 flex items-center justify-center mx-auto">
                <QrCode className="h-8 w-8 text-muted-foreground" />
              </div>
              <div className="max-w-md mx-auto">
                <h3 className="text-lg font-semibold text-foreground">No QR Codes generated yet</h3>
                <p className="text-muted-foreground text-sm mt-1">
                  {isStaff
                    ? "No QR codes have been created by your business administrator yet."
                    : programs.length > 0 
                      ? "You have active programs! Use the section above to generate your first QR code."
                      : "Once you create an active loyalty program, you can generate QR codes here. Customers scan these to sign up and join your program."}
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {qrCodes.map(qr => {
              const programName = qr.loyalty_programs?.name || "Loyalty Program";
              const cardColor = qr.loyalty_programs?.card_color || "#EF4444";
              
              // Correct full application join URL using simplified public token structure
              const joinUrl = typeof window !== "undefined"
                ? `${window.location.origin}/join/${qr.loyalty_program_id}`
                : "";

              return (
                <Card key={qr.id} className="border border-border flex flex-col justify-between overflow-hidden shadow-sm">
                  <CardHeader className="border-b bg-muted/20 pb-4">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: cardColor }} />
                      <CardTitle className="text-base truncate">{programName}</CardTitle>
                    </div>
                    <CardDescription className="text-xs truncate">Scan to join the loyalty program</CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-col items-center justify-center py-8 bg-card">
                    <div className="bg-white p-4 rounded-xl shadow-inner border inline-block">
                      <QRCode 
                        value={joinUrl} 
                        size={160}
                        level="Q"
                        fgColor="#0F172A"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-4 select-all break-all text-center px-4 max-w-sm font-mono">
                      {joinUrl}
                    </p>
                  </CardContent>
                  <CardFooter className="border-t bg-muted/10 p-3 flex gap-2">
                    <Link href={`/dashboard/programs/${qr.loyalty_program_id}/qr`} className="flex-1">
                      <Button variant="outline" size="sm" className="w-full gap-2">
                        <Printer className="h-4 w-4" /> Poster / Print
                      </Button>
                    </Link>
                    <Link href={`/join/${qr.loyalty_program_id}`} target="_blank" className="flex-1">
                      <Button size="sm" className="w-full gap-1">
                        View Page <ArrowRight className="h-4 w-4" />
                      </Button>
                    </Link>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}