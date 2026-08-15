import { useState, useEffect } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import Link from "next/link";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Save, Trash2, QrCode, Upload, RefreshCw, Sparkles } from "lucide-react";
import { LoyaltyCard } from "@/components/LoyaltyCard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function EditProgram() {
  const router = useRouter();
  const { id } = router.query;
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    stamp_target: "10",
    reward_title: "",
    reward_description: "",
    card_color: "#F87171",
    stamp_icon: "Star"
  });

  // Client Customization Settings
  const [customization, setCustomization] = useState({
    template_id: "classic",
    bg_color: "#ffffff",
    primary_color: "#F87171",
    secondary_color: "",
    text_color: "#1f2937",
    stamp_icon: "Star",
    reward_icon: "Gift",
    card_logo_url: "",
    card_bg_image_url: ""
  });

  const [businessName, setBusinessName] = useState("Your Business");

  useEffect(() => {
    if (id) fetchProgram();
  }, [id]);

  const fetchProgram = async () => {
    try {
      const { data, error } = await supabase
        .from("loyalty_programs")
        .select(`
          *,
          businesses (
            business_name
          )
        `)
        .eq("id", id as string)
        .single();

      if (error) throw error;
      
      setFormData({
        name: data.name,
        description: data.description || "",
        stamp_target: data.stamp_target.toString(),
        reward_title: data.reward_title,
        reward_description: data.reward_description || "",
        card_color: data.card_color || "#F87171",
        stamp_icon: data.stamp_icon || "Star"
      });

      if (data.businesses) {
        setBusinessName(data.businesses.business_name || "Your Business");
      }

      setCustomization({
        template_id: data.template_id || "classic",
        bg_color: data.bg_color || "#ffffff",
        primary_color: data.primary_color || data.card_color || "#F87171",
        secondary_color: data.secondary_color || "",
        text_color: data.text_color || "#1f2937",
        stamp_icon: data.stamp_icon || data.stamp_icon || "Star",
        reward_icon: data.reward_icon || "Gift",
        card_logo_url: data.card_logo_url || "",
        card_bg_image_url: data.card_bg_image_url || ""
      });
    } catch (error: any) {
      toast({
        title: "Error fetching program",
        description: error.message,
        variant: "destructive",
      });
      router.push("/dashboard/programs");
    } finally {
      setLoading(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    
    // Simple verification
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid file type",
        description: "Please upload an image file.",
        variant: "destructive",
      });
      return;
    }

    try {
      setUploading(true);
      const fileExt = file.name.split(".").pop();
      const fileName = `${id}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `logos/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("loyalty-assets")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("loyalty-assets")
        .getPublicUrl(filePath);

      setCustomization(prev => ({
        ...prev,
        card_logo_url: publicUrl
      }));

      toast({
        title: "Logo uploaded",
        description: "Your brand logo was successfully uploaded and cached.",
      });
    } catch (error: any) {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const removeLogo = () => {
    setCustomization(prev => ({
      ...prev,
      card_logo_url: ""
    }));
    toast({
      title: "Logo removed",
      description: "Logo has been removed from the active preview state.",
    });
  };

  const handleResetToDefaults = () => {
    const tid = customization.template_id.toLowerCase();
    let bg = "#ffffff";
    let text = "#1f2937";
    let prim = formData.card_color || "#F87171";
    const sec = "";

    if (tid === "bold") {
      bg = "#111827";
      text = "#ffffff";
      prim = "#fbbf24";
    } else if (tid === "elegant") {
      bg = "#fdfbf7";
      text = "#1c1917";
      prim = "#78350f";
    } else if (tid === "minimal") {
      bg = "#f9fafb";
      text = "#0f172a";
      prim = "#2563eb";
    }

    setCustomization(prev => ({
      ...prev,
      bg_color: bg,
      text_color: text,
      primary_color: prim,
      secondary_color: sec,
      stamp_icon: "Star",
      reward_icon: "Gift"
    }));

    toast({
      title: "Reset complete",
      description: "Customizations set back to template guidelines.",
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      const { error } = await supabase
        .from("loyalty_programs")
        .update({
          name: formData.name,
          description: formData.description,
          stamp_target: parseInt(formData.stamp_target, 10),
          reward_title: formData.reward_title,
          reward_description: formData.reward_description,
          card_color: customization.primary_color,
          stamp_icon: customization.stamp_icon,
          
          // Customization settings saved directly to real schema fields
          template_id: customization.template_id,
          bg_color: customization.bg_color,
          primary_color: customization.primary_color,
          secondary_color: customization.secondary_color,
          text_color: customization.text_color,
          reward_icon: customization.reward_icon,
          card_logo_url: customization.card_logo_url,
          card_bg_image_url: customization.card_bg_image_url,
          updated_at: new Date().toISOString()
        })
        .eq("id", id as string);

      if (error) throw error;

      toast({
        title: "Loyalty Card Updated",
        description: "Branding and rules successfully synchronized with customer cards.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      setDeleting(true);
      const { error } = await supabase
        .from("loyalty_programs")
        .delete()
        .eq("id", id as string);

      if (error) {
        if (error.code === '23503') {
           throw new Error("Cannot delete program because it has active cards/stamps. Pause it instead.");
        }
        throw error;
      }

      toast({
        title: "Deleted",
        description: "Loyalty program has been deleted.",
      });
      router.push("/dashboard/programs");
    } catch (error: any) {
      toast({
        title: "Error deleting",
        description: error.message,
        variant: "destructive",
      });
      setDeleting(false);
    }
  };

  // Synchronize base form values back to branding color
  const syncBaseColor = (color: string) => {
    setFormData(prev => ({ ...prev, card_color: color }));
    setCustomization(prev => ({ ...prev, primary_color: color }));
  };

  if (loading) return <DashboardLayout><div className="flex p-8 justify-center">Loading...</div></DashboardLayout>;

  return (
    <DashboardLayout>
      <Head>
        <title>Branding & Design Editor | Dashboard</title>
      </Head>

      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard/programs">
              <Button variant="outline" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-heading font-bold text-foreground">Branding & Card Customizer</h1>
              <p className="text-muted-foreground mt-1">Design a loyalty experience custom tailored to your business brand.</p>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Link href={`/dashboard/programs/${id}/qr`}>
              <Button variant="outline" size="sm" className="gap-2 border-primary text-primary hover:bg-primary/10">
                <QrCode className="h-4 w-4" /> Get QR Poster
              </Button>
            </Link>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm" className="gap-2">
                  <Trash2 className="h-4 w-4" /> Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete your loyalty program.
                    If customers already have stamps, you should PAUSE the program instead of deleting it.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    {deleting ? "Deleting..." : "Delete Program"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        <div className="grid lg:grid-cols-12 gap-8 items-start">
          
          {/* Card Preview Sidebar */}
          <div className="lg:col-span-5 space-y-4 lg:sticky lg:top-8">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Live Customer Preview</h2>
              <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 animate-pulse" /> Realtime Sync
              </span>
            </div>
            
            {/* Embedded custom renderer with dynamic customization state */}
            <div className="border border-border rounded-xl p-4 bg-muted/30">
              <LoyaltyCard 
                programName={formData.name || "Program Name"}
                businessName={businessName}
                stampTarget={parseInt(formData.stamp_target, 10) || 10}
                currentStamps={3} // mock count for designer representation
                stampIcon={customization.stamp_icon}
                rewardTitle={formData.reward_title || "Sample Reward"}
                customization={customization}
              />
              <p className="text-center text-xs text-muted-foreground mt-3 italic">
                * Real customer cards update automatically on scan. This is a design representation.
              </p>
            </div>
          </div>

          {/* Configuration Form Panel */}
          <div className="lg:col-span-7">
            <form onSubmit={handleSubmit}>
              <Card>
                <CardHeader className="pb-2">
                  <Tabs defaultValue="design" className="w-full">
                    <TabsList className="grid grid-cols-2 w-full">
                      <TabsTrigger value="design">Card Design & Template</TabsTrigger>
                      <TabsTrigger value="rules">Program Rules & Rewards</TabsTrigger>
                    </TabsList>

                    <TabsContent value="design" className="space-y-6 pt-6">
                      
                      {/* Template Selector */}
                      <div className="space-y-3">
                        <Label className="text-base font-semibold">Select Design Template</Label>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                          {[
                            { id: "classic", name: "Classic", desc: "Border, light bg" },
                            { id: "modern", name: "Modern", desc: "Vibrant top block" },
                            { id: "minimal", name: "Minimal", desc: "Understated typography" },
                            { id: "elegant", name: "Elegant", desc: "Serif, sophiscated" },
                            { id: "bold", name: "Bold", desc: "Stroke outlines" }
                          ].map((tmpl) => (
                            <button
                              key={tmpl.id}
                              type="button"
                              onClick={() => setCustomization(prev => ({ ...prev, template_id: tmpl.id }))}
                              className={`p-3 text-left rounded-lg border transition-all ${
                                customization.template_id === tmpl.id
                                  ? "border-primary bg-primary/5 ring-1 ring-primary"
                                  : "border-border bg-background hover:bg-muted/50"
                              }`}
                            >
                              <p className="font-bold text-sm text-foreground">{tmpl.name}</p>
                              <p className="text-xs text-muted-foreground">{tmpl.desc}</p>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Logo Upload */}
                      <div className="space-y-2 border-t pt-4">
                        <Label className="text-base font-semibold">Branded Logo Asset</Label>
                        <div className="flex flex-col sm:flex-row items-center gap-4 mt-2">
                          {customization.card_logo_url ? (
                            <div className="relative w-16 h-16 rounded-lg border bg-background overflow-hidden flex items-center justify-center">
                              <img src={customization.card_logo_url} alt="Logo Preview" className="object-contain max-w-full max-h-full" />
                            </div>
                          ) : (
                            <div className="w-16 h-16 rounded-lg border bg-muted/30 border-dashed flex items-center justify-center text-muted-foreground text-xs font-semibold">
                              No Logo
                            </div>
                          )}
                          
                          <div className="flex-1 space-y-1 w-full">
                            <div className="flex gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                className="relative cursor-pointer gap-2 h-9 w-full sm:w-auto"
                                disabled={uploading}
                              >
                                <Upload className="w-4 h-4" />
                                {uploading ? "Uploading..." : "Upload Business Logo"}
                                <input
                                  type="file"
                                  accept="image/*"
                                  onChange={handleLogoUpload}
                                  className="absolute inset-0 opacity-0 cursor-pointer"
                                />
                              </Button>
                              {customization.card_logo_url && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={removeLogo}
                                  className="text-destructive hover:bg-destructive/10"
                                >
                                  Remove Logo
                                </Button>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground">PNG/JPG up to 2MB. Square dimensions highly recommended.</p>
                          </div>
                        </div>
                      </div>

                      {/* Color Specifications */}
                      <div className="space-y-4 border-t pt-4">
                        <div className="flex justify-between items-center">
                          <Label className="text-base font-semibold">Branding Colors</Label>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={handleResetToDefaults}
                            className="text-xs text-muted-foreground gap-1 h-7"
                          >
                            <RefreshCw className="w-3.5 h-3.5" /> Reset to Template Defaults
                          </Button>
                        </div>

                        <div className="grid sm:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="primary_color">Primary Action / Theme</Label>
                            <div className="flex gap-2">
                              <Input 
                                id="primary_color" 
                                type="color" 
                                className="w-14 h-9 p-1"
                                value={customization.primary_color}
                                onChange={(e) => syncBaseColor(e.target.value)}
                              />
                              <Input 
                                type="text" 
                                value={customization.primary_color}
                                onChange={(e) => syncBaseColor(e.target.value)}
                                className="font-mono uppercase h-9"
                                pattern="^#[0-9A-Fa-f]{6}$"
                              />
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="bg_color">Card Background</Label>
                            <div className="flex gap-2">
                              <Input 
                                id="bg_color" 
                                type="color" 
                                className="w-14 h-9 p-1"
                                value={customization.bg_color}
                                onChange={(e) => setCustomization(prev => ({ ...prev, bg_color: e.target.value }))}
                              />
                              <Input 
                                type="text" 
                                value={customization.bg_color}
                                onChange={(e) => setCustomization(prev => ({ ...prev, bg_color: e.target.value }))}
                                className="font-mono uppercase h-9"
                                pattern="^#[0-9A-Fa-f]{6}$"
                              />
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="text_color">Text & Data Color</Label>
                            <div className="flex gap-2">
                              <Input 
                                id="text_color" 
                                type="color" 
                                className="w-14 h-9 p-1"
                                value={customization.text_color}
                                onChange={(e) => setCustomization(prev => ({ ...prev, text_color: e.target.value }))}
                              />
                              <Input 
                                type="text" 
                                value={customization.text_color}
                                onChange={(e) => setCustomization(prev => ({ ...prev, text_color: e.target.value }))}
                                className="font-mono uppercase h-9"
                                pattern="^#[0-9A-Fa-f]{6}$"
                              />
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label className="text-sm">Quick Presets</Label>
                            <div className="flex flex-wrap gap-1.5 mt-1">
                              {["#F87171", "#10B981", "#3B82F6", "#F59E0B", "#8B5CF6", "#1F2937"].map(p => (
                                <button
                                  key={p}
                                  type="button"
                                  onClick={() => syncBaseColor(p)}
                                  className="w-6 h-6 rounded-full border border-border"
                                  style={{ backgroundColor: p }}
                                />
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Icon Options */}
                      <div className="space-y-4 border-t pt-4">
                        <Label className="text-base font-semibold">Stamp & Reward Icons</Label>
                        <div className="grid sm:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="stamp_icon_select">Stamp Icon representation</Label>
                            <select 
                              id="stamp_icon_select"
                              className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                              value={customization.stamp_icon}
                              onChange={(e) => setCustomization(prev => ({ ...prev, stamp_icon: e.target.value }))}
                            >
                              <option value="Star">⭐ Star</option>
                              <option value="Coffee">☕ Coffee Cup</option>
                              <option value="Scissors">✂️ Scissors</option>
                              <option value="Utensils">🍴 Utensils</option>
                              <option value="Car">🚗 Car</option>
                              <option value="Dumbbell">🏋️ Dumbbell</option>
                              <option value="Heart">❤️ Heart</option>
                              <option value="Crown">👑 Crown</option>
                              <option value="ShoppingBag">🛍️ Shopping Bag</option>
                            </select>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="reward_icon_select">Reward Target Icon</Label>
                            <select 
                              id="reward_icon_select"
                              className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
                              value={customization.reward_icon}
                              onChange={(e) => setCustomization(prev => ({ ...prev, reward_icon: e.target.value }))}
                            >
                              <option value="Gift">🎁 Gift Box</option>
                              <option value="Crown">👑 Crown</option>
                              <option value="Coffee">☕ Coffee / Drink</option>
                              <option value="Utensils">🍴 Food Meal</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="rules" className="space-y-6 pt-6">
                      <div className="space-y-2">
                        <Label htmlFor="name">Program Name</Label>
                        <Input 
                          id="name" 
                          required 
                          value={formData.name}
                          onChange={(e) => setFormData({...formData, name: e.target.value})}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="description">Program Description</Label>
                        <Textarea 
                          id="description" 
                          value={formData.description}
                          onChange={(e) => setFormData({...formData, description: e.target.value})}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="stamp_target">Stamps Required for Reward</Label>
                        <Input 
                          id="stamp_target" 
                          type="number" 
                          min="2" 
                          max="50" 
                          required 
                          value={formData.stamp_target}
                          onChange={(e) => setFormData({...formData, stamp_target: e.target.value})}
                        />
                      </div>

                      <div className="pt-4 border-t border-border space-y-6">
                        <div>
                          <h3 className="text-lg font-heading font-semibold text-foreground">Reward Completion Terms</h3>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="reward_title">Reward Title</Label>
                          <Input 
                            id="reward_title" 
                            required 
                            value={formData.reward_title}
                            onChange={(e) => setFormData({...formData, reward_title: e.target.value})}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="reward_description">Reward Instructions / Expiration Rules</Label>
                          <Textarea 
                            id="reward_description" 
                            value={formData.reward_description}
                            onChange={(e) => setFormData({...formData, reward_description: e.target.value})}
                          />
                        </div>
                      </div>
                    </TabsContent>
                  </Tabs>
                </CardHeader>
                
                <CardContent className="pt-4 border-t">
                  <Button type="submit" disabled={saving} className="w-full sm:w-auto gap-2 bg-primary text-white hover:bg-primary/95">
                    {saving ? "Saving Customizations..." : <><Save className="h-4 w-4" /> Save Brand Customizations</>}
                  </Button>
                </CardContent>
              </Card>
            </form>
          </div>

        </div>
      </div>
    </DashboardLayout>
  );
}