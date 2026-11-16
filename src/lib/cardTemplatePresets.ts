export type TemplatePresetStyle = "Industry" | "Style" | "Aruba";

export interface TemplatePreset {
  id: string;
  name: string;
  desc: string;
  style: TemplatePresetStyle;
  defaults: {
    bg_color: string;
    text_color: string;
    primary_color: string;
    secondary_color: string;
    stamp_icon: string;
    reward_icon: string;
  };
}

export const TEMPLATE_PRESETS: TemplatePreset[] = [
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

  { id: "oceanbreeze", name: "Ocean Breeze", desc: "Relaxing tropical teal coast.", style: "Aruba", defaults: { bg_color: "#f0fdfa", text_color: "#0f3c3a", primary_color: "#0d9488", secondary_color: "#ccfbf1", stamp_icon: "Compass", reward_icon: "Gift" } },
  { id: "caribbeansunset", name: "Caribbean Sunset", desc: "Warm gold sun setting ocean.", style: "Aruba", defaults: { bg_color: "#1e1b4b", text_color: "#ffffff", primary_color: "#f59e0b", secondary_color: "#312e81", stamp_icon: "Sun", reward_icon: "Crown" } },
  { id: "islandminimal", name: "Island Minimal", desc: "Soft white sand beach layout.", style: "Aruba", defaults: { bg_color: "#fafaf6", text_color: "#111827", primary_color: "#059669", secondary_color: "#f0fdf4", stamp_icon: "Star", reward_icon: "Gift" } },
  { id: "tropical", name: "Tropical Escape", desc: "Rich lush forest green leaf.", style: "Aruba", defaults: { bg_color: "#f0fdf4", text_color: "#064e3b", primary_color: "#10b981", secondary_color: "#d1fae5", stamp_icon: "Heart", reward_icon: "Gift" } },
  { id: "arubaocean", name: "Aruba Ocean Blue", desc: "Deep transparent ocean reef.", style: "Aruba", defaults: { bg_color: "#ecfeff", text_color: "#083344", primary_color: "#06b6d4", secondary_color: "#cffafe", stamp_icon: "Sun", reward_icon: "Crown" } },
  { id: "arubasunset", name: "Aruba Sunset Coral", desc: "Sizzling rich pink/yellow sun.", style: "Aruba", defaults: { bg_color: "#fff7ed", text_color: "#451a03", primary_color: "#ec4899", secondary_color: "#ffedd5", stamp_icon: "Sun", reward_icon: "Crown" } }
];

export const FREE_TEMPLATE_IDS: readonly string[] = ["classic", "modern", "minimal"];

export const TEMPLATE_PRESET_IDS: readonly string[] = TEMPLATE_PRESETS.map((preset) => preset.id);

export function isPremiumTemplate(templateId: string) {
  return !FREE_TEMPLATE_IDS.includes(templateId);
}