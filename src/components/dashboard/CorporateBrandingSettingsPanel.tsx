import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/contexts/I18nProvider";
import { getDefaultCorporateBranding } from "@/contexts/CorporateBrandingContext";
import { Image as ImageIcon, Loader2, RotateCcw, Save, Trash2 } from "lucide-react";

type CorporateBrandingBusiness = {
  id: string;
  business_name?: string | null;
  logo?: string | null;
  primary_color?: string | null;
  secondary_color?: string | null;
};

type CorporateBrandingSettingsPanelProps = {
  business: CorporateBrandingBusiness;
  onSaved?: (branding: {
    logo_url: string | null;
    primary_color: string | null;
    secondary_color: string | null;
  }) => void;
};

const DEFAULT_BRANDING = getDefaultCorporateBranding();

export function CorporateBrandingSettingsPanel({ business, onSaved }: CorporateBrandingSettingsPanelProps) {
  const { toast } = useToast();
  const { t } = useI18n();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(business.logo || null);
  const [primaryColor, setPrimaryColor] = useState(business.primary_color || DEFAULT_BRANDING.primary_color);
  const [secondaryColor, setSecondaryColor] = useState(business.secondary_color || DEFAULT_BRANDING.secondary_color);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null);
  const [isResetOpen, setIsResetOpen] = useState(false);

  useEffect(() => {
    setLogoUrl(business.logo || null);
    setPrimaryColor(business.primary_color || DEFAULT_BRANDING.primary_color);
    setSecondaryColor(business.secondary_color || DEFAULT_BRANDING.secondary_color);
    setLogoFile(null);
    setLogoPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, [business.id, business.logo, business.primary_color, business.secondary_color]);

  const currentLogoDisplay = logoPreviewUrl || logoUrl;

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || event.target.files.length === 0) return;

    const file = event.target.files[0];

    if (!file.type.includes("png") && !file.type.includes("jpeg") && !file.type.includes("jpg")) {
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
    setLogoPreviewUrl(URL.createObjectURL(file));
  };

  const handleRemoveLogo = () => {
    setLogoFile(null);
    setLogoPreviewUrl(null);
    setLogoUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const readLogoAsBase64 = async (file: File) => {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        resolve(String(reader.result || "").split(",")[1] || "");
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const applySavedBranding = (branding: {
    logo_url: string | null;
    primary_color: string | null;
    secondary_color: string | null;
  }) => {
    setLogoUrl(branding.logo_url);
    setPrimaryColor(branding.primary_color || DEFAULT_BRANDING.primary_color);
    setSecondaryColor(branding.secondary_color || DEFAULT_BRANDING.secondary_color);
    setLogoFile(null);
    setLogoPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    onSaved?.(branding);
  };

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error(t("dashboard.corporateBranding.notAuthenticated"));

      let base64Image: string | undefined;

      if (logoFile) {
        setUploading(true);
        base64Image = await readLogoAsBase64(logoFile);
      }

      const payload: {
        business_id: string;
        primaryColor: string;
        secondaryColor: string;
        logo?: { name: string; type: string; data: string };
        logoUrl?: null;
      } = {
        business_id: business.id,
        primaryColor,
        secondaryColor,
      };

      if (base64Image && logoFile) {
        payload.logo = {
          name: logoFile.name,
          type: logoFile.type,
          data: base64Image,
        };
      } else if (logoUrl === null) {
        payload.logoUrl = null;
      }

      const response = await fetch("/api/business/corporate-branding", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || t("dashboard.corporateBranding.saveFailed"));
      }

      if (result.branding) {
        applySavedBranding(result.branding);
      }

      toast({
        title: t("dashboard.corporateBranding.savedTitle"),
        description: t("dashboard.corporateBranding.savedDescription"),
      });
    } catch (error: any) {
      toast({
        title: t("dashboard.corporateBranding.saveFailed"),
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
      setUploading(false);
    }
  };

  const handleReset = async () => {
    setSaving(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error(t("dashboard.corporateBranding.notAuthenticated"));

      const response = await fetch("/api/business/corporate-branding", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          business_id: business.id,
          primaryColor: DEFAULT_BRANDING.primary_color,
          secondaryColor: DEFAULT_BRANDING.secondary_color,
          logoUrl: null,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || t("dashboard.corporateBranding.saveFailed"));
      }

      applySavedBranding(result.branding || {
        logo_url: null,
        primary_color: DEFAULT_BRANDING.primary_color,
        secondary_color: DEFAULT_BRANDING.secondary_color,
      });

      toast({
        title: t("dashboard.corporateBranding.savedTitle"),
        description: t("dashboard.corporateBranding.savedDescription"),
      });
    } catch (error: any) {
      toast({
        title: t("dashboard.corporateBranding.saveFailed"),
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
      setIsResetOpen(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-heading font-bold text-foreground">{t("dashboard.corporateBranding.title")}</h2>
          <p className="text-sm text-muted-foreground">{t("dashboard.corporateBranding.description")}</p>
        </div>
        <Button variant="outline" onClick={() => setIsResetOpen(true)} type="button" className="shrink-0">
          <RotateCcw className="mr-2 h-4 w-4" />
          {t("dashboard.corporateBranding.reset")}
        </Button>
      </div>

      <form onSubmit={handleSave} className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader className="border-b bg-muted/30">
              <CardTitle>{t("dashboard.corporateBranding.logoHeading")}</CardTitle>
              <CardDescription>{t("dashboard.corporateBranding.logoDescription")}</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
                <div className="relative flex h-32 w-32 shrink-0 items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-border bg-muted/20">
                  {currentLogoDisplay ? (
                    <img src={currentLogoDisplay} alt={t("dashboard.corporateBranding.logoAlt")} className="h-full w-full object-contain p-2" />
                  ) : (
                    <div className="p-4 text-center">
                      <ImageIcon className="mx-auto mb-2 h-8 w-8 text-muted-foreground opacity-50" />
                      <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{t("dashboard.corporateBranding.noLogo")}</span>
                    </div>
                  )}
                </div>

                <div className="flex-1 space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="corporate_logo_upload" className="sr-only">{t("dashboard.corporateBranding.logoHeading")}</Label>
                    <Input
                      id="corporate_logo_upload"
                      type="file"
                      accept="image/png, image/jpeg"
                      onChange={handleFileChange}
                      ref={fileInputRef}
                      className="cursor-pointer file:mr-4 file:cursor-pointer file:rounded file:border-0 file:bg-primary file:px-4 file:py-1 file:text-primary-foreground hover:border-primary"
                    />
                    <p className="text-xs text-muted-foreground">{t("dashboard.corporateBranding.logoHelp")}</p>
                  </div>

                  {currentLogoDisplay && (
                    <Button type="button" variant="destructive" size="sm" onClick={handleRemoveLogo}>
                      <Trash2 className="mr-2 h-4 w-4" />
                      {t("dashboard.customizer.logo.remove")}
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="border-b bg-muted/30">
              <CardTitle>{t("dashboard.corporateBranding.colorsHeading")}</CardTitle>
              <CardDescription>{t("dashboard.corporateBranding.colorsDescription")}</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-6 pt-6 sm:grid-cols-2">
              <div className="space-y-3">
                <Label htmlFor="corporate_primary_color" className="font-semibold">{t("dashboard.corporateBranding.primaryColor")}</Label>
                <div className="flex items-center gap-3">
                  <input id="corporate_primary_color" type="color" value={primaryColor} onChange={(event) => setPrimaryColor(event.target.value)} className="h-12 w-12 cursor-pointer rounded-lg border-2 border-border bg-transparent p-1" />
                  <Input value={primaryColor.toUpperCase()} onChange={(event) => setPrimaryColor(event.target.value)} className="font-mono uppercase" pattern="^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$" maxLength={7} />
                </div>
              </div>

              <div className="space-y-3">
                <Label htmlFor="corporate_secondary_color" className="font-semibold">{t("dashboard.corporateBranding.secondaryColor")}</Label>
                <div className="flex items-center gap-3">
                  <input id="corporate_secondary_color" type="color" value={secondaryColor} onChange={(event) => setSecondaryColor(event.target.value)} className="h-12 w-12 cursor-pointer rounded-lg border-2 border-border bg-transparent p-1" />
                  <Input value={secondaryColor.toUpperCase()} onChange={(event) => setSecondaryColor(event.target.value)} className="font-mono uppercase" pattern="^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$" maxLength={7} />
                </div>
              </div>
            </CardContent>
            <CardFooter className="justify-end border-t bg-muted/30 py-4">
              <Button type="submit" disabled={saving || uploading} size="lg" className="min-w-[160px]">
                {saving || uploading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    {uploading ? t("dashboard.corporateBranding.uploading") : t("dashboard.corporateBranding.saving")}
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-5 w-5" />
                    {t("dashboard.corporateBranding.save")}
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
        </div>

        <Card className="overflow-hidden border-border shadow-md lg:sticky lg:top-6">
          <CardHeader className="border-b bg-muted/50">
            <CardTitle className="text-lg">{t("dashboard.corporateBranding.previewHeading")}</CardTitle>
            <CardDescription>{t("dashboard.corporateBranding.previewDescription")}</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="flex min-h-[360px] items-center justify-center bg-slate-100 p-6">
              <div className="w-full max-w-[320px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
                <div className="relative flex h-32 flex-col items-center justify-center p-6" style={{ backgroundColor: primaryColor }}>
                  {currentLogoDisplay ? (
                    <div className="relative z-10 mb-2 flex h-16 w-16 items-center justify-center rounded-full bg-white p-2 shadow-md">
                      <img src={currentLogoDisplay} alt={t("dashboard.corporateBranding.logoAlt")} className="max-h-full max-w-full object-contain" />
                    </div>
                  ) : (
                    <div className="relative z-10 mb-2 flex h-16 w-16 items-center justify-center rounded-full border-2 border-white/40 bg-white/20 shadow-sm backdrop-blur-sm">
                      <span className="text-xl font-bold text-white">{business.business_name?.charAt(0) || "B"}</span>
                    </div>
                  )}
                  <span className="relative z-10 text-center text-sm font-bold text-white drop-shadow-md">
                    {business.business_name || t("dashboard.corporateBranding.previewBusinessFallback")}
                  </span>
                </div>

                <div className="space-y-6 p-6 text-center">
                  <div className="space-y-1">
                    <h3 className="font-bold text-slate-800">{t("dashboard.corporateBranding.previewCardTitle", { businessName: business.business_name || t("dashboard.corporateBranding.previewBusinessFallback") })}</h3>
                    <p className="text-xs text-slate-500">{t("dashboard.corporateBranding.previewCardDescription")}</p>
                  </div>

                  <div className="grid grid-cols-5 gap-2">
                    {[1, 2, 3, 4, 5].map((stamp) => (
                      <div key={stamp} className="flex aspect-square items-center justify-center rounded-full border-2" style={{ borderColor: stamp <= 3 ? primaryColor : secondaryColor, backgroundColor: stamp <= 3 ? `${primaryColor}15` : "transparent", color: stamp <= 3 ? primaryColor : `${secondaryColor}60` }}>
                        <span className="text-xs font-bold">{stamp}</span>
                      </div>
                    ))}
                  </div>

                  <Button className="w-full shadow-sm" style={{ backgroundColor: primaryColor, color: "white" }}>
                    {t("dashboard.corporateBranding.previewJoinProgram")}
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </form>

      <Dialog open={isResetOpen} onOpenChange={setIsResetOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("dashboard.corporateBranding.resetConfirmTitle")}</DialogTitle>
            <DialogDescription>{t("dashboard.corporateBranding.resetConfirmDescription")}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsResetOpen(false)}>{t("dashboard.corporateBranding.cancel")}</Button>
            <Button variant="destructive" onClick={handleReset} disabled={saving}>{t("dashboard.corporateBranding.confirmReset")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}