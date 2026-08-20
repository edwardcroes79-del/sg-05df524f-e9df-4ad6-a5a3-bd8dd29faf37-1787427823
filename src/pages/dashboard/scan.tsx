import { useEffect, useState, useRef } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, XCircle, Loader2, Camera, Keyboard, RefreshCw, AlertTriangle, ChevronsUpDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export default function ScanQR() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [business, setBusiness] = useState<any>(null);
  const [programs, setPrograms] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [selectedProgramId, setSelectedProgramId] = useState<string>("");
  
  // Scanner state
  const [scanMode, setScanMode] = useState<"camera" | "manual">("camera");
  const [manualCode, setManualCode] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<string>("");
  const [customerSearchOpen, setCustomerSearchOpen] = useState(false);
  const [scanResult, setScanResult] = useState<{ success: boolean; message: string; reward_earned?: boolean; reward_title?: string } | null>(null);

  // Advanced camera control states
  const [cameras, setCameras] = useState<Array<{ id: string; label: string }>>([]);
  const [activeCameraId, setActiveCameraId] = useState<string>("");
  const [isScanning, setIsScanning] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const qrCodeInstanceRef = useRef<any>(null);

  useEffect(() => {
    fetchBusinessAndPrograms();
  }, []);

  const fetchBusinessAndPrograms = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/auth/login");
        return;
      }

      let resolvedBusinessId: string | null = null;

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
      } else {
        const { data: ownedBusiness, error: bizError } = await supabase
          .from("businesses")
          .select("id, business_name, subscription_plan")
          .eq("owner_id", session.user.id)
          .limit(1)
          .maybeSingle();

        if (bizError) throw bizError;
        if (ownedBusiness) {
          resolvedBusinessId = ownedBusiness.id;
        }
      }

      if (resolvedBusinessId) {
        // Set the minimal business object needed for the rest of the file
        setBusiness({ id: resolvedBusinessId });
        
        const { data: progs, error: progsError } = await supabase
          .from("loyalty_programs")
          .select("id, name, active")
          .eq("business_id", resolvedBusinessId)
          .eq("active", true);
          
        if (progsError) throw progsError;
          
        if (progs && progs.length > 0) {
          setPrograms(progs);
          setSelectedProgramId(progs[0].id);
        }

        // Fetch registered customers
        const { data: cards, error: cardsErr } = await supabase
          .from("customer_loyalty_cards")
          .select(`customer_id, customer:customers(id, name, email, phone)`)
          .eq("business_id", resolvedBusinessId);
          
        if (cardsErr) throw cardsErr;

        if (cards) {
          const uniqueCustomers = Array.from(
            new Map(cards.filter(c => c.customer).map(c => [c.customer_id, c.customer])).values()
          );
          setCustomers(uniqueCustomers as any[]);
        }
      }
    } catch (err) {
      console.error("Failed to load scanner context:", err);
    } finally {
      setLoading(false);
    }
  };

  // Secure Scanner Lifecycle Manager (with strict Rear/Back camera filtering)
  useEffect(() => {
    let active = true;
    
    const startScanner = async () => {
      if (scanMode !== "camera" || loading || programs.length === 0 || scanResult) {
        return;
      }
      
      try {
        const { Html5Qrcode } = await import("html5-qrcode");
        
        // Retrieve and prioritize Back/Rear cameras
        if (cameras.length === 0) {
          try {
            const devices = await Html5Qrcode.getCameras();
            if (active) {
              if (devices && devices.length > 0) {
                setCameras(devices);
                
                // Identify default Back/Rear/Environment Camera
                const backCamera = devices.find(device => 
                  device.label.toLowerCase().includes("back") || 
                  device.label.toLowerCase().includes("rear") || 
                  device.label.toLowerCase().includes("environment") ||
                  device.label.toLowerCase().includes("camera2")
                );
                
                const defaultCamId = backCamera ? backCamera.id : devices[0].id;
                setActiveCameraId(defaultCamId);
              } else {
                setCameraError("No video input cameras found on this device.");
              }
            }
          } catch (err: any) {
            if (active) {
              setCameraError("Camera permission denied. Please allow camera access in browser settings.");
              toast({
                title: "Camera Access Required",
                description: "Please enable camera permissions to scan your customer's QR loyalty cards.",
                variant: "destructive"
              });
            }
            return;
          }
        }
        
        const element = document.getElementById("qr-reader");
        if (!element || !active) return;
        
        // Stop any running scanner before starting a new session to prevent hardware collision
        if (qrCodeInstanceRef.current) {
          try {
            await qrCodeInstanceRef.current.stop();
          } catch (e) {
            // ignore if not running
          }
        }
        
        const html5QrCode = new Html5Qrcode("qr-reader");
        qrCodeInstanceRef.current = html5QrCode;
        
        const targetCam = activeCameraId || (cameras.length > 0 ? cameras[0].id : null);
        if (!targetCam && active) return;
        
        await html5QrCode.start(
          targetCam ? targetCam : { facingMode: "environment" },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 }
          },
          (decodedText: string) => {
            if (active) handleProcessQR(decodedText);
          },
          () => {
            // silent fail for periodic frame noise
          }
        );
        
        if (active) {
          setIsScanning(true);
          setCameraError(null);
        }
      } catch (err: any) {
        console.error("Scanner startup failed:", err);
        if (active) {
          setIsScanning(false);
          setCameraError("Failed to access selected camera. Try switching devices.");
        }
      }
    };
    
    startScanner();
    
    return () => {
      active = false;
      if (qrCodeInstanceRef.current) {
        const instance = qrCodeInstanceRef.current;
        if (instance.isScanning) {
          instance.stop().catch(console.error);
        }
      }
    };
  }, [scanMode, loading, programs.length, scanResult, activeCameraId, cameras.length]);

  const switchCamera = async () => {
    if (cameras.length <= 1) return;
    
    // Stop current scanning session
    if (qrCodeInstanceRef.current && qrCodeInstanceRef.current.isScanning) {
      try {
        await qrCodeInstanceRef.current.stop();
        setIsScanning(false);
      } catch (err) {
        console.error("Failed to stop previous camera:", err);
      }
    }
    
    const currentIndex = cameras.findIndex(c => c.id === activeCameraId);
    const nextIndex = (currentIndex + 1) % cameras.length;
    setActiveCameraId(cameras[nextIndex].id);
    
    toast({
      title: "Switched Camera",
      description: `Now scanning with: ${cameras[nextIndex].label || `Camera ${nextIndex + 1}`}`,
    });
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedCustomer) {
      handleProcessQR(`CUSTOMER:${selectedCustomer}`);
    } else if (manualCode) {
      handleProcessQR(manualCode);
    }
  };

  const handleProcessQR = async (qrData: string) => {
    if (processing) return;
    setProcessing(true);
    setScanResult(null);

    // Stop active camera feed while processing a code to prevent multiple inputs and freeze preview
    if (qrCodeInstanceRef.current && qrCodeInstanceRef.current.isScanning) {
      try {
        await qrCodeInstanceRef.current.stop();
        setIsScanning(false);
      } catch (err) {
        console.error("Failed to stop camera:", err);
      }
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("No active session");
      if (!business?.id) throw new Error("Missing business configuration");

      // Handle Reward Redemption
      if (qrData.startsWith("REWARD:") || (!qrData.startsWith("CUSTOMER:") && qrData.length <= 12)) {
        const rewardCode = qrData.startsWith("REWARD:") ? qrData.split(":")[1] : qrData;
        
        const { data, error } = await (supabase.rpc as any)("redeem_reward_tx", {
          p_reward_code: rewardCode,
          p_business_id: business.id,
          p_staff_user_id: session.user.id
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

      const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
      if (!uuidRegex.test(customerId)) {
        throw new Error("Invalid QR Code format. Please scan a Customer or Reward code.");
      }

      if (!selectedProgramId) {
        throw new Error("Missing loyalty program selection.");
      }

      const { data, error } = await (supabase.rpc as any)("issue_stamp_tx", {
        p_customer_id: customerId,
        p_business_id: business.id,
        p_loyalty_program_id: selectedProgramId
      });

      if (error) throw error;

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
      setManualCode("");
      setSelectedCustomer("");
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
                    <div className="rounded-xl overflow-hidden bg-black text-white relative min-h-[300px] flex flex-col items-center justify-center">
                      
                      {cameraError ? (
                        <div className="p-6 text-center max-w-sm flex flex-col items-center gap-3 z-20">
                          <AlertTriangle className="w-12 h-12 text-amber-500 animate-pulse" />
                          <h3 className="font-bold text-lg text-white">Camera Offline</h3>
                          <p className="text-sm text-slate-400 leading-normal">{cameraError}</p>
                          {cameras.length > 1 && (
                            <Button size="sm" onClick={switchCamera} className="mt-2 font-bold">
                              Try Another Camera
                            </Button>
                          )}
                        </div>
                      ) : (
                        <>
                          <div id="qr-reader" className="w-full h-full min-h-[300px] !border-none flex items-center justify-center relative" />
                          
                          {/* Sleek Overlay Viewfinder HUD */}
                          {isScanning && !processing && (
                            <div className="absolute inset-0 border-[30px] border-black/50 pointer-events-none flex items-center justify-center z-10">
                              <div className="w-[190px] h-[190px] border-2 border-dashed border-primary/85 rounded-lg relative shadow-[0_0_20px_rgba(20,250,200,0.1)]">
                                {/* Active scanner corner brackets */}
                                <div className="absolute -top-1 -left-1 w-4 h-4 border-t-4 border-l-4 border-primary" />
                                <div className="absolute -top-1 -right-1 w-4 h-4 border-t-4 border-r-4 border-primary" />
                                <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-4 border-l-4 border-primary" />
                                <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-4 border-r-4 border-primary" />
                              </div>
                            </div>
                          )}
                        </>
                      )}

                      {/* Camera Selection HUD Controls */}
                      {scanMode === "camera" && cameras.length > 1 && !cameraError && !processing && (
                        <Button 
                          type="button"
                          variant="outline" 
                          size="sm"
                          className="absolute bottom-4 right-4 bg-black/80 hover:bg-black border-white/20 hover:border-white/40 text-white z-20 font-bold gap-1.5 shadow-md h-9"
                          onClick={switchCamera}
                        >
                          <RefreshCw className="w-3.5 h-3.5" /> Switch Camera
                        </Button>
                      )}

                      {processing && (
                        <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center z-30">
                          <Loader2 className="h-10 w-10 text-primary animate-spin mb-4" />
                          <p className="font-bold text-lg text-white">Processing Stamp...</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <form onSubmit={handleManualSubmit} className="space-y-6 py-4">
                      <div className="space-y-4">
                        <div className="space-y-2 text-left">
                          <label className="text-sm font-medium">Search Registered Customers</label>
                          <Popover open={customerSearchOpen} onOpenChange={setCustomerSearchOpen}>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                role="combobox"
                                aria-expanded={customerSearchOpen}
                                className="w-full justify-between font-normal bg-background"
                                disabled={processing}
                              >
                                {selectedCustomer
                                  ? customers.find((c) => c.id === selectedCustomer)?.name || "Customer selected"
                                  : "Search by name, email, or phone..."}
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-full p-0 max-w-[calc(100vw-3rem)] sm:max-w-md" align="start">
                              <Command>
                                <CommandInput placeholder="Search customers..." />
                                <CommandList>
                                  <CommandEmpty>No registered customers found.</CommandEmpty>
                                  <CommandGroup>
                                    {customers.map((c: any) => (
                                      <CommandItem
                                        key={c.id}
                                        value={`${c.name} ${c.email || ''} ${c.phone || ''}`}
                                        onSelect={() => {
                                          setSelectedCustomer(c.id === selectedCustomer ? "" : c.id);
                                          setManualCode(""); // clear USB input if selecting from dropdown
                                          setCustomerSearchOpen(false);
                                        }}
                                      >
                                        <Check
                                          className={cn(
                                            "mr-2 h-4 w-4",
                                            selectedCustomer === c.id ? "opacity-100" : "opacity-0"
                                          )}
                                        />
                                        <div className="flex flex-col">
                                          <span>{c.name}</span>
                                          <span className="text-xs text-muted-foreground">
                                            {[c.email, c.phone].filter(Boolean).join(" • ")}
                                          </span>
                                        </div>
                                      </CommandItem>
                                    ))}
                                  </CommandGroup>
                                </CommandList>
                              </Command>
                            </PopoverContent>
                          </Popover>
                        </div>
                        
                        <div className="relative flex py-2 items-center">
                          <div className="flex-grow border-t border-border"></div>
                          <span className="flex-shrink-0 mx-4 text-muted-foreground text-xs font-medium uppercase tracking-wider">Or Scan Phone</span>
                          <div className="flex-grow border-t border-border"></div>
                        </div>

                        <div className="space-y-2 text-left">
                          <label className="text-sm font-medium">Hardware Scanner (USB)</label>
                          <Input 
                            placeholder="Point scanner and scan QR..." 
                            value={manualCode}
                            onChange={(e) => {
                              setManualCode(e.target.value);
                              setSelectedCustomer(""); // clear dropdown selection if typing
                            }}
                            disabled={processing}
                            autoFocus
                          />
                          <p className="text-xs text-muted-foreground">
                            Use a physical barcode scanner or type a Reward Code.
                          </p>
                        </div>
                      </div>
                      <Button type="submit" className="w-full" disabled={(!manualCode && !selectedCustomer) || processing}>
                        {processing ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...</> : "Issue Stamp"}
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