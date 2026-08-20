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
import { ArrowLeft, Save, Trash2, QrCode, Upload, RefreshCw, Sparkles, Layout, Palette, Gift, Check, ShieldAlert } from "lucide-react";
import { LoyaltyCard } from "@/components/LoyaltyCard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

// 39 High-Definition Premium Design Presets
const TEMPLATE_PRESETS = [
  // Industry Presets
  { id: "classic", name: "Classic", desc: "Balanced standard layout.", style: "Industry", defaults: { bg_color: "#ffffff", text_color: "#1e293b", primary_color: "#F87171", secondary_color: "#e2e8f0", stamp_icon: "Star", reward_icon: "Gift" } },
  { id: "modern", name: "Modern", desc: "Contemporary aesthetic.", style: "Industry", defaults: { bg_color: "#f8fafc", text_color: "#0f172a", primary_color: "#0284c7", secondary_color: "#e2e8f0", stamp_icon: "Star", reward_icon: "Gift" } },
  { id: "minimal", name: "Minimal", desc: "Whitespace-focused design.", style: "Industry", defaults: { bg_color: "#ffffff", text_color: "#09090b", primary_color: "#18181b", secondary_color: "#f4f4f5", stamp_icon: "Star", reward_icon: "Gift" } },
  { id: "luxury", name: "Luxury Gold", desc: "Royal golden trim.", style: "Industry", defaults: { bg_color: "#fdfbf7", text_color: "#1c1917", primary_color: "#854d0e", secondary_color: "#fef3c7", stamp_icon: "Crown", reward_icon: "Crown" } },
  { id: "bold", name: "Bold Impact", desc: "High-contrast block colors.", style: "Industry", defaults: { bg_color: "#111827", text_color: "#ffffff", primary_color: "#f43f5e", secondary_color: "#1f2937", stamp_icon: "Flame", reward_icon: "Crown" } },
  { id: "restaurant", name: "Restaurant", desc: "Warm plate-inspired style.", style: "Industry", defaults: { bg_color: "#fffbf5", text_color: "#431407", primary_color: "#ea580c", secondary_color: "#ffedd5", stamp_icon: "Utensils", reward_icon: "Utensils" } },
  { id: "beauty", name: "Beauty Salon", desc: "Elegant soft blush rose.", style: "Industry", defaults: { bg_color: "#fff1f2", text_color: "#4c0519", primary_color: "#db2777", secondary_color: "#fce7f3", stamp_icon: "Sparkles", reward_icon: "Crown" } },
  { id: "automotive", name: "Automotive", desc: "Industrial metallic accents.", style: "Industry", defaults: { bg_color: "#0f172a", text_color: "#f8fafc", primary_color: "#06b6d4", secondary_color: "#1e293b", stamp_icon: "Car", reward_icon: "Gift" } },
  { id: "fitness", name: "Fitness Gym", desc: "Bold high-energy athletic.", style: "Industry", defaults: { bg_color: "#09090b", text_color: "#ffffff", primary_color: "#84cc16", secondary_color: "#18181b", stamp_icon: "Dumbbell", reward_icon: "Crown" } },
  { id: "cafe", name: "Café Roast", desc: "Rich latte espresso theme.", style: "Industry", defaults: { bg_color: "#fdf8f5", text_color: "#2d1500", primary_color: "#9a3412", secondary_color: "#fef08a", stamp_icon: "Coffee", reward_icon: "Coffee" } },
  { id: "retail", name: "Retail Mall", desc: "Clean modern box borders.", style: "Industry", defaults: { bg_color: "#fafaf9", text_color: "#1c1917", primary_color: "#0d9488", secondary_color: "#ccfbf1", stamp_icon: "ShoppingBag", reward_icon: "Gift" } },
  { id: "barber", name: "Barber Club", desc: "Vintage royal blue & leather.", style: "Industry", defaults: { bg_color: "#1e1b4b", text_color: "#ffffff", primary_color: "#f43f5e", secondary_color: "#312e81", stamp_icon: "Scissors", reward_icon: "Crown" } },
  { id: "hairsalon", name: "Hair Salon", desc: "Chic luxury hair care.", style: "Industry", defaults: { bg_color: "#faf5ff", text_color: "#4a044e", primary_color: "#c084fc", secondary_color: "#f3e8ff", stamp_icon: "Scissors", reward_icon: "Gift" } },
  { id: "nailstudio", name: "Nail Lounge", desc: "Delicate luxury nails theme.", style: "Industry", defaults: { bg_color: "#fff5f5", text_color: "#65052f", primary_color: "#f43f5e", secondary_color: "#ffe4e6", stamp_icon: "Brush", reward_icon: "Gift" } },
  { id: "lashbrow", name: "Lash & Brow", desc: "Premium bold pink glam.", style: "Industry", defaults: { bg_color: "#fdf2f8", text_color: "#6d073d", primary_color: "#ec4899", secondary_color: "#fce7f3", stamp_icon: "Sparkles", reward_icon: "Crown" } },
  { id: "spa", name: "Spa & Wellness", desc: "Calming forest wellness.", style: "Industry", defaults: { bg_color: "#f0fdf4", text_color: "#064e3b", primary_color: "#10b981", secondary_color: "#d1fae5", stamp_icon: "Heart", reward_icon: "Crown" } },
  { id: "carwash", name: "Car Wash", desc: "Bright glossy water splashes.", style: "Industry", defaults: { bg_color: "#0b1329", text_color: "#ffffff", primary_color: "#38bdf8", secondary_color: "#1e293b", stamp_icon: "Car", reward_icon: "Gift" } },
  { id: "garage", name: "Auto Garage", desc: "High-octane grease style.", style: "Industry", defaults: { bg_color: "#18181b", text_color: "#f4f4f5", primary_color: "#f97316", secondary_color: "#27272a", stamp_icon: "Car", reward_icon: "Shield" } },
  { id: "bakery", name: "Bakery", desc: "Soft cozy flour dough theme.", style: "Industry", defaults: { bg_color: "#fcf8f2", text_color: "#451a03", primary_color: "#d97706", secondary_color: "#fef3c7", stamp_icon: "Coffee", reward_icon: "Gift" } },
  { id: "foodpizza", name: "Food & Pizza", desc: "Yummy hot dynamic styling.", style: "Industry", defaults: { bg_color: "#fff8f6", text_color: "#7f1d1d", primary_color: "#ea580c", secondary_color: "#ffedd5", stamp_icon: "Pizza", reward_icon: "Utensils" } },
  { id: "boutique", name: "Boutique", desc: "Elegant high-fashion marble.", style: "Industry", defaults: { bg_color: "#fafaf9", text_color: "#1c1917", primary_color: "#78716c", secondary_color: "#f5f5f4", stamp_icon: "ShoppingBag", reward_icon: "Gift" } },

  // Style Presets
  { id: "dark", name: "Dark Night", desc: "Cyberpunk deep graphite.", style: "Style", defaults: { bg_color: "#090d16", text_color: "#f8fafc", primary_color: "#e11d48", secondary_color: "#1e293b", stamp_icon: "Star", reward_icon: "Crown" } },
  { id: "colorful", name: "Colorful Grad", desc: "Fluid energetic spectrum.", style: "Style", defaults: { bg_color: "#f5f3ff", text_color: "#4c1d95", primary_color: "#8b5cf6", secondary_color: "#ede9fe", stamp_icon: "Heart", reward_icon: "Gift" } },
  { id: "premiumblack", name: "Premium Black", desc: "Stealth charcoal carbon.", style: "Style", defaults: { bg_color: "#09090b", text_color: "#f4f4f5", primary_color: "#e4e4e7", secondary_color: "#27272a", stamp_icon: "Crown", reward_icon: "Crown" } },
  { id: "glass", name: "Glassmorphism", desc: "Glossy transparent sheet.", style: "Style", defaults: { bg_color: "#0f172a", text_color: "#ffffff", primary_color: "#38bdf8", secondary_color: "#1e293b", stamp_icon: "Sparkle", reward_icon: "Gift" } },
  { id: "neon", name: "Neon Active", desc: "Sleek synthwave glow.", style: "Style", defaults: { bg_color: "#000000", text_color: "#ffffff", primary_color: "#39ff14", secondary_color: "#18181b", stamp_icon: "Flame", reward_icon: "Crown" } },
  { id: "retro", name: "Vintage Retro", desc: "Warm cozy 1970s print.", style: "Style", defaults: { bg_color: "#fefae0", text_color: "#283618", primary_color: "#bc6c25", secondary_color: "#dda15e", stamp_icon: "Star", reward_icon: "Gift" } },
  { id: "elegantscript", name: "Elegant Script", desc: "Premium serif signature.", style: "Style", defaults: { bg_color: "#fcf8f2", text_color: "#1c1917", primary_color: "#7c2d12", secondary_color: "#ffedd5", stamp_icon: "Star", reward_icon: "Gift" } },
  { id: "playful", name: "Playful Fun", desc: "Bright energetic neon-blue.", style: "Style", defaults: { bg_color: "#ecfeff", text_color: "#083344", primary_color: "#06b6d4", secondary_color: "#cffafe", stamp_icon: "Smile", reward_icon: "Gift" } },
  { id: "professional", name: "Professional", desc: "Corporate business lines.", style: "Style", defaults: { bg_color: "#f8fafc", text_color: "#0f172a", primary_color: "#1e3a8a", secondary_color: "#e2e8f0", stamp_icon: "Shield", reward_icon: "Gift" } },
  { id: "monochrome", name: "Monochrome", desc: "High-contrast absolute black.", style: "Style", defaults: { bg_color: "#ffffff", text_color: "#000000", primary_color: "#000000", secondary_color: "#f3f4f6", stamp_icon: "Star", reward_icon: "Gift" } },
  { id: "pastel", name: "Pastel Sweet", desc: "Cozy lilac and lavender.", style: "Style", defaults: { bg_color: "#fdf4ff", text_color: "#4a044e", primary_color: "#d946ef", secondary_color: "#f5d0fe", stamp_icon: "Heart", reward_icon: "Gift" } },
  { id: "boldgradient", name: "Bold Gradient", desc: "Beautiful warm sunrise grad.", style: "Style", defaults: { bg_color: "#1e1b4b", text_color: "#ffffff", primary_color: "#f43f5e", secondary_color: "#312e81", stamp_icon: "Flame", reward_icon: "Crown" } },

  // Aruba-inspired Presets
  { id: "oceanbreeze", name: "Ocean Breeze", desc: "Relaxing tropical teal coast.", style: "Aruba", defaults: { bg_color: "#f0fdfa", text_color: "#0f3c3a", primary_color: "#0d9488", secondary_color: "#ccfbf1", stamp_icon: "Compass", reward_icon: "Gift" } },
  { id: "caribbeansunset", name: "Caribbean Sunset", desc: "Warm gold sun setting ocean.", style: "Aruba", defaults: { bg_color: "#1e1b4b", text_color: "#ffffff", primary_color: "#f59e0b", secondary_color: "#312e81", stamp_icon: "Sun", reward_icon: "Crown" } },
  { id: "islandminimal", name: "Island Minimal", desc: "Soft white sand beach layout.", style: "Aruba", defaults: { bg_color: "#fafaf6", text_color: "#111827", primary_color: "#059669", secondary_color: "#f0fdf4", stamp_icon: "Star", reward_icon: "Gift" } },
  { id: "tropical", name: "Tropical Escape", desc: "Rich lush forest green leaf.", style: "Aruba", defaults: { bg_color: "#f0fdf4", text_color: "#064e3b", primary_color: "#10b981", secondary_color: "#d1fae5", stamp_icon: "Heart", reward_icon: "Gift" } },
  { id: "arubaocean", name: "Aruba Ocean Blue", desc: "Deep transparent ocean reef.", style: "Aruba", defaults: { bg_color: "#ecfeff", text_color: "#083344", primary_color: "#06b6d4", secondary_color: "#cffafe", stamp_icon: "Sun", reward_icon: "Crown" } },
  { id: "arubasunset", name: "Aruba Sunset Coral", desc: "Sizzling rich pink/yellow sun.", style: "Aruba", defaults: { bg_color: "#fff7ed", text_color: "#451a03", primary_color: "#ec4899", secondary_color: "#ffedd5", stamp_icon: "Sun", reward_icon: "Crown" } }
];

export default function EditProgram() {
  const router = useRouter();
  const { id } = router.query;
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [activeCategory, setActiveCategory] = useState<"All" | "Industry" | "Style" | "Aruba">("All");
  const [isStaff, setIsStaff] = useState(false);
  
  const [subscriptionPlan, setSubscriptionPlan] = useState<string>("starter");
  const [hasPremiumTemplates, setHasPremiumTemplates] = useState<boolean>(false);
  const [showUpgradeDialog, setShowUpgradeDialog] = useState<boolean>(false);
  const [lockedTemplateName, setLockedTemplateName] = useState<string>("");
  
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    stamp_target: "10",
    reward_title: "",
    reward_description: "",
    card_color: "#F87171",
    stamp_icon: "Star"
  });

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
  const [businessId, setBusinessId] = useState<string>("");

  useEffect(() => {
    if (id) fetchProgram();
  }, [id]);

  const fetchProgram = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", session.user.id)
          .maybeSingle();

        if (profile?.role === "business_staff") {
          setIsStaff(true);
          setLoading(false);
          return;
        }
      }

      const { data, error } = await supabase
        .from("loyalty_programs")
        .select(`
          *,
          businesses (
            business_name,
            subscription_plan
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
        const currentPlan = data.businesses.subscription_plan || "starter";
        setSubscriptionPlan(currentPlan);
        
        // Fetch plan entitlements directly
        const { data: planData } = await supabase
          .from("subscription_plans")
          .select("includes_premium_templates")
          .eq("id", currentPlan)
          .maybeSingle();
          
        setHasPremiumTemplates(planData?.includes_premium_templates || ["business", "enterprise"].includes(currentPlan));
      }

      setBusinessId(data.business_id);

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
    
    if (!businessId) {
      toast({ title: "Error", description: "Business context missing.", variant: "destructive" });
      return;
    }

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
      const filePath = `${businessId}/logos/${fileName}`;

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
        description: "Your brand logo was successfully uploaded.",
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
    setCustomization(prev => ({ ...prev, card_logo_url: "" }));
    toast({ title: "Logo removed", description: "Logo has been removed from active preview." });
  };

  const handleSelectTemplate = (preset: typeof TEMPLATE_PRESETS[0]) => {
    const isPremium = !["classic", "modern", "minimal"].includes(preset.id);
    if (isPremium && !hasPremiumTemplates) {
      setLockedTemplateName(preset.name);
      setShowUpgradeDialog(true);
      return;
    }

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
      title: `${preset.name} Theme Loaded`,
      description: "Default style guidelines loaded successfully.",
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
           throw new Error("Cannot delete program with active users. Pause it instead.");
        }
        throw error;
      }

      toast({ title: "Deleted", description: "Loyalty program deleted successfully." });
      router.push("/dashboard/programs");
    } catch (error: any) {
      toast({ title: "Error deleting", description: error.message, variant: "destructive" });
      setDeleting(false);
    }
  };

  const syncBaseColor = (color: string) => {
    setFormData(prev => ({ ...prev, card_color: color }));
    setCustomization(prev => ({ ...prev, primary_color: color }));
  };

  const filteredPresets = TEMPLATE_PRESETS.filter(preset => 
    activeCategory === "All" || preset.style === activeCategory
  );

  if (loading) return <DashboardLayout><div className="flex p-8 justify-center">Loading...</div></DashboardLayout>;

  if (isStaff) {
    return (
      <DashboardLayout>
        <Head>
          <title>Access Denied | Dashboard</title>
        </Head>
        <div className="max-w-md mx-auto my-12 text-center p-6 border rounded-xl bg-card shadow-sm">
          <ShieldAlert className="w-12 h-12 text-destructive mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Access Denied</h2>
          <p className="text-muted-foreground mb-6">Only Business Owners can modify branding and loyalty program settings.</p>
          <Button onClick={() => router.push("/dashboard/programs")}>Return to Programs</Button>
        </div>
      </DashboardLayout>
    );
  }

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
            
            <div className="border border-border rounded-xl p-4 bg-muted/30">
              <LoyaltyCard 
                programName={formData.name || "Program Name"}
                programDescription={formData.description}
                businessName={businessName}
                stampTarget={parseInt(formData.stamp_target, 10) || 10}
                currentStamps={3} 
                stampIcon={customization.stamp_icon}
                rewardTitle={formData.reward_title || "Sample Reward"}
                rewardDescription={formData.reward_description}
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
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div>
                            <Label className="text-base font-semibold">1. Choose a Design Preset Template</Label>
                            <p className="text-xs text-muted-foreground mt-0.5">Selecting a preset automatically loads design values optimized for layout readability.</p>
                          </div>
                        </div>

                        {/* Category Filter Chips */}
                        <div className="flex flex-wrap gap-1.5 border-b pb-2">
                          {(["All", "Industry", "Style", "Aruba"] as const).map(category => (
                            <button
                              key={category}
                              type="button"
                              onClick={() => setActiveCategory(category)}
                              className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                                activeCategory === category 
                                  ? "bg-primary text-white" 
                                  : "bg-muted text-muted-foreground hover:bg-muted/85"
                              }`}
                            >
                              {category === "Aruba" ? "🇦🇼 Aruba-inspired" : category}
                            </button>
                          ))}
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[360px] overflow-y-auto pr-1">
                          {filteredPresets.map((preset) => {
                            const isSelected = customization.template_id === preset.id;
                            const isPremium = !["classic", "modern", "minimal"].includes(preset.id);
                            const isLocked = isPremium && !hasPremiumTemplates;

                            return (
                              <button
                                key={preset.id}
                                type="button"
                                onClick={() => handleSelectTemplate(preset)}
                                className={`flex flex-col text-left rounded-xl border p-3 transition-all duration-200 relative ${
                                  isSelected
                                    ? "border-primary bg-primary/5 ring-2 ring-primary/40 shadow-sm"
                                    : isLocked
                                    ? "border-border bg-background/50 opacity-80 hover:bg-muted/10 hover:border-border"
                                    : "border-border bg-background hover:bg-muted/30 hover:border-muted-foreground/30"
                                }`}
                              >
                                <div className="flex items-center justify-between w-full mb-1">
                                  <span className="font-bold text-sm text-foreground flex items-center gap-1.5">
                                    {preset.name}
                                    {isSelected && <Check className="w-3.5 h-3.5 text-primary" strokeWidth={3} />}
                                    {isLocked && <span className="text-xs">🔒</span>}
                                  </span>
                                  <span className="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-muted/60 text-muted-foreground">
                                    {preset.style}
                                  </span>
                                </div>
                                <p className="text-[11px] text-muted-foreground flex-grow mt-0.5 leading-tight">
                                  {preset.desc}
                                </p>
                                {isPremium && (
                                  <span className={`text-[8px] font-bold px-1 py-0.2 rounded w-max mt-2 ${
                                    isLocked ? "bg-amber-500/10 text-amber-600 border border-amber-500/20" : "bg-primary/10 text-primary"
                                  }`}>
                                    {isLocked ? "Upgrade to Unlock" : "Premium Unlocked"}
                                  </span>
                                )}
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
                              <option value="Pizza">🍕 Pizza Slice</option>
                              <option value="Sun">☀️ Sun</option>
                              <option value="Smile">😊 Smile</option>
                              <option value="Brush">💅 Nail Brush</option>
                              <option value="Compass">🧭 Compass</option>
                              <option value="Flame">🔥 Fire</option>
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
                              <option value="Shield">🛡️ Security Shield</option>
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

      <Dialog open={showUpgradeDialog} onOpenChange={setShowUpgradeDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-heading font-bold text-amber-600">
              <Sparkles className="w-5 h-5" /> Premium Template
            </DialogTitle>
            <DialogDescription className="text-sm pt-2">
              The <strong className="text-foreground">{lockedTemplateName}</strong> template is available with <strong>Business</strong> and <strong>Enterprise</strong> plans. Upgrade now to unlock all 39 design templates and custom branding rules.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-col sm:flex-row gap-2 mt-4">
            <Button variant="outline" onClick={() => setShowUpgradeDialog(false)} className="w-full sm:w-auto">
              Maybe Later
            </Button>
            <Link href="/dashboard/billing" className="w-full sm:w-auto">
              <Button className="w-full bg-primary text-white hover:bg-primary/95 font-bold">
                Upgrade Plan
              </Button>
            </Link>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}