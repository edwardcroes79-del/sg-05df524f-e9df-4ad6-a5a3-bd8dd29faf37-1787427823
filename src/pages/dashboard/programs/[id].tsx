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
import { ArrowLeft, Save, Trash2, QrCode, Upload, RefreshCw, Sparkles, Layout, Palette, Gift, Check } from "lucide-react";
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

// Design Template Definitions with distinct styled default variables
const TEMPLATE_PRESETS = [
  {
    id: "classic",
    name: "Classic",
    desc: "Clean professional border design with a balanced and subtle ivory/white background.",
    style: "Standard",
    defaults: {
      bg_color: "#ffffff",
      text_color: "#1f2937",
      primary_color: "#F87171",
      secondary_color: "#e5e7eb",
      stamp_icon: "Star",
      reward_icon: "Gift"
    }
  },
  {
    id: "modern",
    name: "Modern",
    desc: "Clean contemporary design.",
    style: "Contemporary",
    defaults: {
      bg_color: "#f3f4f6",
      text_color: "#111827",
      primary_color: "#10B981",
      secondary_color: "#d1fae5",
      stamp_icon: "Coffee",
      reward_icon: "Coffee"
    }
  },
  {
    id: "luxury",
    name: "Luxury",
    desc: "Premium/elegant design.",
    style: "Premium",
    defaults: {
      bg_color: "#fdfbf7",
      text_color: "#1c1917",
      primary_color: "#78350f",
      secondary_color: "#fef3c7",
      stamp_icon: "Heart",
      reward_icon: "Crown"
    }
  },
  {
    id: "minimal",
    name: "Minimal",
    desc: "Simple, clean design with strong whitespace.",
    style: "Minimalist",
    defaults: {
      bg_color: "#ffffff",
      text_color: "#0f172a",
      primary_color: "#2563eb",
      secondary_color: "#f1f5f9",
      stamp_icon: "ShoppingBag",
      reward_icon: "Crown"
    }
  }
];

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
        stamp_icon: data.stamp_icon || "Star",
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

  // Dynamically apply a template preset defaults to customization states
  const handleSelectTemplate = (preset: typeof TEMPLATE_PRESETS[0]) => {
    setCustomization(prev => ({
      ...prev,
      template_id: preset.id,
      bg_color: preset.defaults.bg_color,
      text_color: preset.defaults.text_color,
      primary_color: preset.defaults.primary_color,
      secondary_color: preset.defaults.secondary_color,
      stamp_icon: preset.defaults.stamp_icon,
      reward_icon: preset.defaults.reward_icon
    }));

    setFormData(prev => ({
      ...prev,
      card_color: preset.defaults.primary_color,
      stamp_icon: preset.defaults.stamp_icon
    }));

    toast({
      title: `${preset.name} Layout Active`,
      description: "Default style guidelines loaded into design editor.",
    });
  };

  const handleResetToDefaults = () => {
    const activePreset = TEMPLATE_PRESETS.find(p => p.id === customization.template_id.toLowerCase()) || TEMPLATE_PRESETS[0];
    handleSelectTemplate(activePreset);
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
        title: "Loyalty Card Theme Applied",
        description: "Your design customizations are now live and visible to all customers instantly.",
      });
    } catch (error: any) {
      toast({
        title: "Error applying design",
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

      <div className="max-w-6xl mx-auto space-y-8 pb-12">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
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
          <div className="lg:col-span-5 space-y-4 lg:sticky lg:top-8 order-first lg:order-last">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Live Customer Preview</h2>
              <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 animate-pulse" /> Realtime Sync
              </span>
            </div>
            
            {/* Realtime loyalty card visual rendering */}
            <div className="border border-border rounded-xl p-4 bg-muted/30">
              <LoyaltyCard 
                programName={formData.name || "Program Name"}
                businessName={businessName}
                stampTarget={parseInt(formData.stamp_target, 10) || 10}
                currentStamps={3} // Representative simulation total
                stampIcon={customization.stamp_icon}
                rewardTitle={formData.reward_title || "Sample Reward"}
                customization={customization}
              />
              <p className="text-center text-xs text-muted-foreground mt-3 italic">
                * Simulated representation. Real customer cards will display actual stamp counts on scan.
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
                      <TabsTrigger value="design" className="gap-2">
                        <Layout className="w-4 h-4" /> Card Design & Template
                      </TabsTrigger>
                      <TabsTrigger value="rules" className="gap-2">
                        <Palette className="w-4 h-4" /> Program Rules & Rewards
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="design" className="space-y-8 pt-6">
                      
                      {/* Premium Template Selector Gallery */}
                      <div className="space-y-4">
                        <div>
                          <Label className="text-base font-semibold">1. Choose a Design Preset Template</Label>
                          <p className="text-xs text-muted-foreground mt-0.5">Selecting a preset automatically loads design values optimized for layout readability.</p>
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {TEMPLATE_PRESETS.map((preset) => {
                            const isSelected = customization.template_id === preset.id;
                            return (
                              <button
                                key={preset.id}
                                type="button"
                                onClick={() => handleSelectTemplate(preset)}
                                className={`flex flex-col text-left rounded-xl border p-4 transition-all duration-200 ${
                                  isSelected
                                    ? "border-primary bg-primary/5 ring-2 ring-primary/40 shadow-sm"
                                    : "border-border bg-background hover:bg-muted/30 hover:border-muted-foreground/30"
                                }`}
                              >
                                <div className="flex items-center justify-between w-full mb-1">
                                  <span className="font-bold text-base text-foreground flex items-center gap-2">
                                    {preset.name}
                                    {isSelected && <Check className="w-4 h-4 text-primary" strokeWidth={3} />}
                                  </span>
                                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-muted/60 text-muted-foreground">
                                    {preset.style}
                                  </span>
                                </div>
                                <p className="text-xs text-muted-foreground flex-grow mt-1 leading-relaxed">
                                  {preset.desc}
                                </p>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Logo Asset Configuration */}
                      <div className="space-y-4 border-t pt-6">
                        <div>
                          <Label className="text-base font-semibold">2. Branded Logo Asset</Label>
                          <p className="text-xs text-muted-foreground mt-0.5">Your logo will represent your company cleanly in the upper sections of the card layouts.</p>
                        </div>
                        <div className="flex flex-col sm:flex-row items-center gap-4 mt-2 bg-muted/20 p-4 rounded-xl border">
                          {customization.card_logo_url ? (
                            <div className="relative w-16 h-16 rounded-lg border bg-background overflow-hidden flex items-center justify-center p-1 shrink-0">
                              <img src={customization.card_logo_url} alt="Logo Preview" className="object-contain max-w-full max-h-full" />
                            </div>
                          ) : (
                            <div className="w-16 h-16 rounded-lg border bg-muted/50 border-dashed flex items-center justify-center text-muted-foreground text-xs font-semibold shrink-0">
                              No Logo
                            </div>
                          )}
                          
                          <div className="flex-grow space-y-2 w-full text-center sm:text-left">
                            <div className="flex flex-wrap justify-center sm:justify-start gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="relative cursor-pointer gap-2 h-9"
                                disabled={uploading}
                              >
                                <Upload className="w-4 h-4" />
                                {uploading ? "Uploading..." : "Upload Brand Logo"}
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
                                  className="text-destructive hover:bg-destructive/10 h-9"
                                >
                                  Remove Logo
                                </Button>
                              )}
                            </div>
                            <p className="text-[11px] text-muted-foreground">Compatible with PNG, JPG up to 2MB. Symmetrical icons recommended.</p>
                          </div>
                        </div>
                      </div>

                      {/* Color Specifications */}
                      <div className="space-y-4 border-t pt-6">
                        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                          <div>
                            <Label className="text-base font-semibold">3. Branding Palette Color Editor</Label>
                            <p className="text-xs text-muted-foreground mt-0.5">Adjust custom accents on top of your selected template preset.</p>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={handleResetToDefaults}
                            className="text-xs text-muted-foreground gap-1 h-7 border border-dashed border-border hover:bg-muted self-start"
                          >
                            <RefreshCw className="w-3.5 h-3.5" /> Revert Custom Colors to Template Default
                          </Button>
                        </div>

                        <div className="grid sm:grid-cols-2 gap-4 bg-muted/10 p-4 rounded-xl border">
                          <div className="space-y-2">
                            <Label htmlFor="primary_color" className="text-sm font-medium">Primary Theme Action Color</Label>
                            <div className="flex gap-2">
                              <Input 
                                id="primary_color" 
                                type="color" 
                                className="w-14 h-9 p-1 shrink-0"
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
                            <Label htmlFor="bg_color" className="text-sm font-medium">Card Background Color</Label>
                            <div className="flex gap-2">
                              <Input 
                                id="bg_color" 
                                type="color" 
                                className="w-14 h-9 p-1 shrink-0"
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
                            <Label htmlFor="text_color" className="text-sm font-medium">Card Text & Numeric Data Color</Label>
                            <div className="flex gap-2">
                              <Input 
                                id="text_color" 
                                type="color" 
                                className="w-14 h-9 p-1 shrink-0"
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

                          <div className="space-y-2 flex flex-col justify-end pb-1">
                            <Label className="text-xs text-muted-foreground mb-1">Standard Brand Color Swatches</Label>
                            <div className="flex flex-wrap gap-1.5">
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
                      <div className="space-y-4 border-t pt-6">
                        <div>
                          <Label className="text-base font-semibold">4. Stamp Icon Representation</Label>
                          <p className="text-xs text-muted-foreground mt-0.5">Choose vector stamps that correspond beautifully to your business niche.</p>
                        </div>
                        
                        <div className="grid sm:grid-cols-2 gap-4 bg-muted/10 p-4 rounded-xl border">
                          <div className="space-y-2">
                            <Label htmlFor="stamp_icon_select" className="text-sm font-medium">Stamp Icon Representation</Label>
                            <select 
                              id="stamp_icon_select"
                              className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
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
                            <Label htmlFor="reward_icon_select" className="text-sm font-medium">Reward Target Icon</Label>
                            <select 
                              id="reward_icon_select"
                              className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
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
                        <div className="flex items-center gap-2 text-primary">
                          <Gift className="w-5 h-5" />
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
                    {saving ? "Applying Design Theme..." : <><Save className="h-4 w-4" /> Use This Template & Customizations</>}
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