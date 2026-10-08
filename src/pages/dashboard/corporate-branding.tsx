import { useEffect, useState, useRef } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save, Image as ImageIcon, Trash2, RotateCcw } from "lucide-react";
import { useI18n } from "@/contexts/I18nProvider";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

// Defaults mapped from backend
const DEFAULT_BRANDING = {
  primary_color: "#F43F5E",
  secondary_color: "#0F172A",
};

export default function CorporateBrandingPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { t } = useI18n();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [business, setBusiness] = useState<any>(null);
  
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [primaryColor, setPrimaryColor] = useState(DEFAULT_BRANDING.primary_color);
  const [secondaryColor, setSecondaryColor] = useState(DEFAULT_BRANDING.secondary_color);
  
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null);

  const [isResetOpen, setIsResetOpen] = useState(false);

  useEffect(() => {
    fetchBranding();
  }, []);

  const fetchBranding = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/auth/login");
        return;
      }

      // Quick pre-check for roles/ownership before hitting the API
      const { data: businessData } = await supabase
        .from("businesses")
        .select("id, business_name, subscription_plan, owner_id")
        .eq("owner_id", session.user.id)
        .maybeSingle();

      if (!businessData || businessData.subscription_plan !== "mega_plan") {
        router.push("/dashboard");
        return;
      }
      
      setBusiness(businessData);

      // Fetch from API
      const response = await fetch(`/api/business/corporate-branding?business_id=${businessData.id}`);
      
      if (!response.ok) {
        throw new Error(t("dashboard.corporateBranding.loadFailed"));
      }
      
      const { branding } = await response.json();
      
      if (branding) {
        setLogoUrl(branding.logo_url);
        setPrimaryColor(branding.primary_color || DEFAULT_BRANDING.primary_color);
        setSecondaryColor(branding.secondary_color || DEFAULT_BRANDING.secondary_color);
      }
    } catch (err: any) {
      console.error(err);
      toast({
        title: t("dashboard.customizer.toast.errorFetching"),
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    const file = e.target.files[0];
    
    if (!file.type.includes('png') && !file.type.includes('jpeg') && !file.type.includes('jpg')) {
      toast({
        title: t("dashboard.corporateBranding.invalidFileType"),
        variant: "destructive",
      });
      return;
    }
    
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: t("dashboard.corporateBranding.fileTooLarge"),
        variant: "destructive",
      });
      return;
    }
    
    setLogoFile(file);
    const objectUrl = URL.createObjectURL(file);
    setLogoPreviewUrl(objectUrl);
  };

  const handleRemoveLogo = () => {
    setLogoFile(null);
    setLogoPreviewUrl(null);
    setLogoUrl(null); // Also clear existing URL
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!business) return;
    
    setSaving(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      let base64Image: string | undefined;

      if (logoFile) {
        setUploading(true);
        base64Image = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(logoFile);
        });
      }

      const payload: any = {
        business_id: business.id,
        primaryColor: primaryColor,
        secondaryColor: secondaryColor,
      };

      if (base64Image) {
        const [mimeType, base64Data] = base64Image.split(',');
        payload.logo = {
          name: logoFile!.name,
          type: logoFile!.type,
          data: base64Data,
        };
      } else if (logoUrl === null) {
        // Explictly clear logo
        payload.logoUrl = null;
      }

      const response = await fetch("/api/business/corporate-branding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || t("dashboard.corporateBranding.saveFailed"));
      }

      toast({
        title: t("dashboard.corporateBranding.savedTitle"),
        description: t("dashboard.corporateBranding.savedDescription"),
      });

      if (result.branding) {
        setLogoUrl(result.branding.logo_url);
        setPrimaryColor(result.branding.primary_color || DEFAULT_BRANDING.primary_color);
        setSecondaryColor(result.branding.secondary_color || DEFAULT_BRANDING.secondary_color);
        
        // Clean up preview
        setLogoFile(null);
        setLogoPreviewUrl(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive"
      });
    } finally {
      setSaving(false);
      setUploading(false);
    }
  };

  const handleReset = async () => {
    setIsResetOpen(false);
    setPrimaryColor(DEFAULT_BRANDING.primary_color);
    setSecondaryColor(DEFAULT_BRANDING.secondary_color);
    handleRemoveLogo();
    
    // Auto-save the reset
    toast({
      title: "Defaults restored",
      description: "Click Save Branding to apply changes.",
    });
  };

  const currentLogoDisplay = logoPreviewUrl || logoUrl;

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex h-full items-center justify-center min-h-[60vh]">
          <Loader2 className="animate-spin h-8 w-8 text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <Head>
        <title>{t("dashboard.corporateBranding.seoTitle")}</title>
      </Head>

      <div className="max-w-5xl mx-auto space-y-6 pb-20">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-heading font-bold text-foreground">{t("dashboard.corporateBranding.title")}</h1>
            <p className="text-muted-foreground mt-1">{t("dashboard.corporateBranding.description")}</p>
          </div>
          <Button variant="outline" onClick={() => setIsResetOpen(true)} type="button" className="shrink-0">
            <RotateCcw className="w-4 h-4 mr-2" />
            {t("dashboard.corporateBranding.reset")}
          </Button>
        </div>

        <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader className="bg-muted/30 border-b">
                <CardTitle>{t("dashboard.corporateBranding.logoHeading")}</CardTitle>
                <CardDescription>{t("dashboard.corporateBranding.logoDescription")}</CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-center">
                  <div className="w-32 h-32 rounded-xl border-2 border-dashed border-border flex items-center justify-center bg-muted/20 relative overflow-hidden shrink-0">
                    {currentLogoDisplay ? (
                      <img 
                        src={currentLogoDisplay} 
                        alt="Business Logo" 
                        className="w-full h-full object-contain p-2"
                      />
                    ) : (
                      <div className="text-center p-4">
                        <ImageIcon className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-50" />
                        <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">{t("dashboard.corporateBranding.noLogo")}</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="space-y-4 flex-1">
                    <div className="space-y-2">
                      <Label htmlFor="logo_upload" className="sr-only">Logo Upload</Label>
                      <Input 
                        id="logo_upload" 
                        type="file" 
                        accept="image/png, image/jpeg" 
                        onChange={handleFileChange}
                        ref={fileInputRef}
                        className="cursor-pointer file:cursor-pointer file:bg-primary file:text-primary-foreground file:border-0 file:rounded file:px-4 file:py-1 file:mr-4 file:hover:bg-primary/90 hover:border-primary transition-colors"
                      />
                      <p className="text-xs text-muted-foreground">{t("dashboard.corporateBranding.logoHelp")}</p>
                    </div>
                    
                    {currentLogoDisplay && (
                      <Button type="button" variant="destructive" size="sm" onClick={handleRemoveLogo} className="w-max">
                        <Trash2 className="w-4 h-4 mr-2" />
                        {t("dashboard.customizer.logo.remove")}
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="bg-muted/30 border-b">
                <CardTitle>{t("dashboard.corporateBranding.colorsHeading")}</CardTitle>
                <CardDescription>{t("dashboard.corporateBranding.colorsDescription")}</CardDescription>
              </CardHeader>
              <CardContent className="pt-6 space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <Label htmlFor="primary_color" className="font-semibold">{t("dashboard.corporateBranding.primaryColor")}</Label>
                    <div className="flex items-center gap-3">
                      <div className="relative w-12 h-12 rounded-lg border-2 border-border overflow-hidden shadow-sm shrink-0">
                        <input
                          type="color"
                          id="primary_color"
                          value={primaryColor}
                          onChange={(e) => setPrimaryColor(e.target.value)}
                          className="absolute -top-2 -left-2 w-16 h-16 cursor-pointer"
                        />
                      </div>
                      <Input
                        type="text"
                        value={primaryColor.toUpperCase()}
                        onChange={(e) => {
                          const val = e.target.value;
                          setPrimaryColor(val);
                        }}
                        className="font-mono uppercase"
                        pattern="^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$"
                        maxLength={7}
                      />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label htmlFor="secondary_color" className="font-semibold">{t("dashboard.corporateBranding.secondaryColor")}</Label>
                    <div className="flex items-center gap-3">
                      <div className="relative w-12 h-12 rounded-lg border-2 border-border overflow-hidden shadow-sm shrink-0">
                        <input
                          type="color"
                          id="secondary_color"
                          value={secondaryColor}
                          onChange={(e) => setSecondaryColor(e.target.value)}
                          className="absolute -top-2 -left-2 w-16 h-16 cursor-pointer"
                        />
                      </div>
                      <Input
                        type="text"
                        value={secondaryColor.toUpperCase()}
                        onChange={(e) => {
                          const val = e.target.value;
                          setSecondaryColor(val);
                        }}
                        className="font-mono uppercase"
                        pattern="^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$"
                        maxLength={7}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="bg-muted/30 border-t py-4 justify-end">
                <Button type="submit" disabled={saving || uploading} size="lg" className="min-w-[160px]">
                  {saving || uploading ? (
                    <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> {uploading ? t("dashboard.corporateBranding.uploading") : t("dashboard.corporateBranding.saving")}</>
                  ) : (
                    <><Save className="mr-2 h-5 w-5" /> {t("dashboard.corporateBranding.save")}</>
                  )}
                </Button>
              </CardFooter>
            </Card>
          </div>

          <div className="lg:col-span-1 sticky top-6">
            <Card className="border-border shadow-md overflow-hidden">
              <CardHeader className="bg-muted/50 border-b pb-4">
                <CardTitle className="text-lg">{t("dashboard.corporateBranding.previewHeading")}</CardTitle>
                <CardDescription>{t("dashboard.corporateBranding.previewDescription")}</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {/* Live Preview Simulator */}
                <div className="bg-slate-100 p-6 flex items-center justify-center rounded-b-xl min-h-[400px]">
                  <div className="w-full max-w-[320px] bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200">
                    {/* Header */}
                    <div 
                      className="h-32 flex flex-col items-center justify-center p-6 relative"
                      style={{ backgroundColor: primaryColor }}
                    >
                      {currentLogoDisplay ? (
                        <div className="w-16 h-16 bg-white rounded-full p-2 shadow-md mb-2 flex items-center justify-center relative z-10">
                          <img src={currentLogoDisplay} alt="Logo" className="max-w-full max-h-full object-contain" />
                        </div>
                      ) : (
                        <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full mb-2 flex items-center justify-center border-2 border-white/40 shadow-sm relative z-10">
                          <span className="text-white font-bold text-xl">{business?.business_name?.charAt(0) || "B"}</span>
                        </div>
                      )}
                      
                      {/* Contrast text color helper logic based on primary bg */}
                      <span className="font-bold text-white relative z-10 text-center text-sm shadow-sm drop-shadow-md">
                        {business?.business_name || "Business Name"}
                      </span>
                      
                      {/* Subtle pattern overlay */}
                      <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '16px 16px' }}></div>
                    </div>
                    
                    {/* Body */}
                    <div className="p-6 text-center space-y-6">
                      <div className="space-y-1">
                        <h3 className="font-bold text-slate-800">
                          {t("dashboard.corporateBranding.previewCardTitle", { businessName: business?.business_name || "Business" })}
                        </h3>
                        <p className="text-xs text-slate-500">
                          {t("dashboard.corporateBranding.previewCardDescription")}
                        </p>
                      </div>
                      
                      {/* Mock stamp grid */}
                      <div className="grid grid-cols-5 gap-2">
                        {[1, 2, 3, 4, 5].map((i) => (
                          <div 
                            key={i} 
                            className="aspect-square rounded-full flex items-center justify-center border-2 transition-colors"
                            style={{ 
                              borderColor: i <= 3 ? primaryColor : secondaryColor,
                              backgroundColor: i <= 3 ? `${primaryColor}15` : 'transparent',
                              color: i <= 3 ? primaryColor : `${secondaryColor}60`
                            }}
                          >
                            <span className="text-xs font-bold">{i}</span>
                          </div>
                        ))}
                      </div>
                      
                      <div className="pt-2">
                        <Button 
                          className="w-full shadow-sm"
                          style={{ backgroundColor: primaryColor, color: 'white' }}
                        >
                          Join Program
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </form>
      </div>

      <Dialog open={isResetOpen} onOpenChange={setIsResetOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("dashboard.corporateBranding.resetConfirmTitle")}</DialogTitle>
            <DialogDescription className="pt-2">
              {t("dashboard.corporateBranding.resetConfirmDescription")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setIsResetOpen(false)}>{t("dashboard.corporateBranding.cancel")}</Button>
            <Button variant="destructive" onClick={handleReset}>{t("dashboard.corporateBranding.confirmReset")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}