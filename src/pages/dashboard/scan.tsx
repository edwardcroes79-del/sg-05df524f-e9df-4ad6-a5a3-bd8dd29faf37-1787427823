import { useEffect, useState, useRef } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { ScanLine, CheckCircle2, XCircle, Loader2, Camera, Keyboard } from "lucide-react";

export default function ScanQR() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [business, setBusiness] = useState<any>(null);
  const [programs, setPrograms] = useState<any[]>([]);
  const [selectedProgramId, setSelectedProgramId] = useState<string>("");
  
  // Scanner state
  const [scanMode, setScanMode] = useState<"camera" | "manual">("camera");
  const [manualCode, setManualCode] = useState("");
  const [scanResult, setScanResult] = useState<{ success: boolean; message: string; reward_earned?: boolean; reward_title?: string } | null>(null);

  useEffect(() => {
    fetchBusinessAndPrograms();
  }, []);

  const fetchBusinessAndPrograms = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      router.push("/auth/login");
      return;
    }

    // Get business ID (assuming owner for now, but in reality could be staff from business_users)
    const { data: businesses } = await supabase
      .from("businesses")
      .select("*")
      .eq("owner_id", session.user.id)
      .single();

    if (businesses) {
      setBusiness(businesses);
      
      const { data: progs } = await supabase
        .from("loyalty_programs")
        .select("*")
        .eq("business_id", businesses.id)
        .eq("active", true);
        
      if (progs && progs.length > 0) {
        setPrograms(progs);
        setSelectedProgramId(progs[0].id);
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    let scanner: any = null;
    
    const initScanner = async () => {
      if (scanMode === "camera" && !loading && programs.length > 0 && !scanResult) {
        // Dynamically import to prevent Next.js SSR crash (window is not defined)
        const { Html5QrcodeScanner } = await import("html5-qrcode");
        
        scanner = new Html5QrcodeScanner(
          "qr-reader",
          { fps: 10, qrbox: { width: 250, height: 250 } },
          false
        );
        
        scanner.render(onScanSuccess, onScanFailure);
      }
    };
    
    initScanner();

    return () => {
      if (scanner) {
        scanner.clear().catch(console.error);
      }
    };
  }, [scanMode, loading, programs.length, scanResult]);

  const onScanSuccess = (decodedText: string) => {
    // Expected format: "CUSTOMER:uuid" or "REWARD:code"
    handleProcessQR(decodedText);
  };

  const onScanFailure = (error: any) => {
    // Ignore frequent scan failures (just means no QR in view)
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode) return;
    handleProcessQR(manualCode);
  };

  const handleProcessQR = async (qrData: string) => {
    if (processing) return;
    setProcessing(true);
    setScanResult(null);

    try {
      if (!business?.id) throw new Error("Missing business configuration");

      // Handle Reward Redemption
      if (qrData.startsWith("REWARD:") || (!qrData.startsWith("CUSTOMER:") && qrData.length <= 12)) {
        const rewardCode = qrData.startsWith("REWARD:") ? qrData.split(":")[1] : qrData;
        
        const { data, error } = await (supabase.rpc as any)("redeem_reward_tx", {
          p_reward_code: rewardCode,
          p_business_id: business.id
        });

        if (error) throw error;
        
        const result = data as { success: boolean; message: string; reward_title?: string };
        setScanResult(result);
        
        toast({
          title: result.success ? "✅ Reward Redeemed" : "Redemption Failed",
          description: result.message,
          variant: result.success ? "default" : "destructive",
        });
        
        setProcessing(false);
        setManualCode("");
        return;
      }

      // Handle Customer Stamp
      let customerId = qrData;
      if (qrData.startsWith("CUSTOMER:")) {
        customerId = qrData.split(":")[1];
      }

      // Basic UUID validation for customer IDs
      const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
      if (!uuidRegex.test(customerId)) {
        throw new Error("Invalid QR Code format. Please scan a Customer or Reward code.");
      }

      if (!selectedProgramId) {
        throw new Error("Missing loyalty program selection.");
      }

      // Call secure RPC for stamps
      const { data, error } = await (supabase.rpc as any)("issue_stamp_tx", {
        p_customer_id: customerId,
        p_business_id: business.id,
        p_loyalty_program_id: selectedProgramId
      });

      if (error) throw error;

      // Type cast the JSON response
      const result = data as { success: boolean; message: string; reward_earned?: boolean };
      
      setScanResult(result);
      
      if (result.success) {
        toast({
          title: result.reward_earned ? "🎉 Reward Unlocked!" : "Stamp Added",
          description: result.message,
          variant: "default",
        });
      } else {
        toast({
          title: "Failed to issue stamp",
          description: result.message,
          variant: "destructive",
        });
      }
    } catch (err: any) {
      setScanResult({
        success: false,
        message: err.message || "Failed to process QR code"
      });
      toast({
        title: "Error",
        description: err.message || "Failed to process QR code",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
      setManualCode(""); // Reset manual input
    }
  };

  const resetScanner = () => {
    setScanResult(null);
  };

  if (loading) return <DashboardLayout><div className="flex h-full items-center justify-center"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div></DashboardLayout>;

  return (
    <DashboardLayout>
      <Head>
        <title>Issue Stamp | Aruba Royalty Stamp</title>
      </Head>
      
      <div className="max-w-xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-heading font-bold text-foreground">Issue Stamp</h1>
          <p className="text-muted-foreground mt-1">Scan a customer's QR code to add a stamp to their card.</p>
        </div>

        {programs.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center p-6">
                <p className="text-muted-foreground mb-4">You need an active loyalty program to issue stamps.</p>
                <Button onClick={() => router.push("/dashboard/programs/new")}>Create Program</Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-primary/20 shadow-sm overflow-hidden">
            <CardHeader className="bg-muted/30 border-b">
              <CardTitle className="text-lg">Select Program</CardTitle>
              <CardDescription>Which loyalty program are you stamping today?</CardDescription>
              <div className="mt-4">
                <Select value={selectedProgramId} onValueChange={setSelectedProgramId} disabled={processing || !!scanResult}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a program" />
                  </SelectTrigger>
                  <SelectContent>
                    {programs.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              {scanResult ? (
                <div className="p-8 text-center flex flex-col items-center">
                  {scanResult.success ? (
                    <>
                      <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6 shadow-sm">
                        <CheckCircle2 className="w-10 h-10" />
                      </div>
                      <h2 className="text-2xl font-bold text-foreground mb-2">Success!</h2>
                      <p className="text-muted-foreground text-lg mb-4">{scanResult.message}</p>
                      {scanResult.reward_earned && (
                        <div className="bg-primary/10 text-primary border border-primary/20 p-4 rounded-lg font-medium text-lg w-full mb-6">
                          🎉 Customer unlocked a reward!
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      <div className="w-20 h-20 bg-destructive/10 text-destructive rounded-full flex items-center justify-center mb-6 shadow-sm">
                        <XCircle className="w-10 h-10" />
                      </div>
                      <h2 className="text-2xl font-bold text-foreground mb-2">Failed</h2>
                      <p className="text-muted-foreground text-lg mb-6">{scanResult.message}</p>
                    </>
                  )}
                  <Button onClick={resetScanner} size="lg" className="w-full sm:w-auto mt-2">
                    Scan Next Customer
                  </Button>
                </div>
              ) : (
                <div className="p-6">
                  <div className="flex gap-2 mb-6">
                    <Button 
                      variant={scanMode === "camera" ? "default" : "outline"} 
                      className="flex-1"
                      onClick={() => setScanMode("camera")}
                    >
                      <Camera className="w-4 h-4 mr-2" /> Camera
                    </Button>
                    <Button 
                      variant={scanMode === "manual" ? "default" : "outline"} 
                      className="flex-1"
                      onClick={() => setScanMode("manual")}
                    >
                      <Keyboard className="w-4 h-4 mr-2" /> Manual / USB
                    </Button>
                  </div>

                  {scanMode === "camera" ? (
                    <div className="rounded-xl overflow-hidden bg-black text-white relative min-h-[300px] flex items-center justify-center">
                      <div id="qr-reader" className="w-full !border-none" />
                      {processing && (
                        <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center z-10">
                          <Loader2 className="h-10 w-10 text-white animate-spin mb-4" />
                          <p className="font-medium text-lg">Processing Stamp...</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <form onSubmit={handleManualSubmit} className="space-y-4 py-8">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Customer ID or Reward Code</label>
                        <Input 
                          placeholder="Scan with USB scanner or paste here..." 
                          value={manualCode}
                          onChange={(e) => setManualCode(e.target.value)}
                          autoFocus
                          disabled={processing}
                        />
                        <p className="text-xs text-muted-foreground">
                          Point your physical USB barcode scanner here and scan the customer's phone, or type a Reward Code directly.
                        </p>
                      </div>
                      <Button type="submit" className="w-full" disabled={!manualCode || processing}>
                        {processing ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...</> : "Submit"}
                      </Button>
                    </form>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}