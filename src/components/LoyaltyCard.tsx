import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Coffee, Scissors, Car, Dumbbell, Utensils, Gift, Star, Check, Sparkles, Heart, Crown, CupSoda, ShoppingBag,
  Brush, Smile, Compass, Sun, Pizza, Flame, Sparkle, Shield
} from "lucide-react";
import { cn } from "@/lib/utils";

export const STAMP_ICONS: Record<string, React.ElementType> = {
  Coffee, Scissors, Car, Dumbbell, Utensils, Star, Gift, Sparkles, Heart, Crown, CupSoda, ShoppingBag,
  Brush, Smile, Compass, Sun, Pizza, Flame, Sparkle, Shield
};

export interface TemplateCustomization {
  template_id?: string;
  bg_color?: string;
  primary_color?: string;
  secondary_color?: string;
  text_color?: string;
  stamp_icon?: string;
  reward_icon?: string;
  card_logo_url?: string;
  card_bg_image_url?: string;
}

export interface LoyaltyCardProps {
  programName: string;
  businessName: string;
  stampTarget: number;
  currentStamps: number;
  stampIcon?: string;
  rewardTitle?: string;
  color?: string;
  className?: string;
  customization?: TemplateCustomization;
}

// 39 High-Definition Premium Design Theme Specifications
const THEME_REGISTRY: Record<string, {
  layout: "standard" | "modern" | "luxury" | "neon" | "gradient" | "glass" | "retro" | "pastel";
  bg: string;
  text: string;
  fontClass?: string;
  badgeText?: string;
}> = {
  // Industry Presets
  classic: { layout: "standard", bg: "bg-white", text: "text-slate-900", badgeText: "Classic" },
  modern: { layout: "modern", bg: "bg-slate-50", text: "text-slate-950", badgeText: "Modern" },
  minimal: { layout: "standard", bg: "bg-white", text: "text-slate-900", badgeText: "Minimal" },
  luxury: { layout: "luxury", bg: "bg-[#fdfbf7]", text: "text-[#1c1917]", fontClass: "font-serif", badgeText: "Premium" },
  bold: { layout: "modern", bg: "bg-slate-950", text: "text-white", badgeText: "Bold" },
  restaurant: { layout: "artistic" as any || "pastel", bg: "bg-[#fffbf5]", text: "text-[#431407]", badgeText: "Dining" },
  beauty: { layout: "luxury", bg: "bg-[#fff1f2]", text: "text-[#4c0519]", badgeText: "Salon" },
  automotive: { layout: "neon", bg: "bg-[#0f172a]", text: "text-[#f8fafc]", badgeText: "Garage" },
  fitness: { layout: "modern", bg: "bg-[#111827]", text: "text-white", badgeText: "Athletic" },
  cafe: { layout: "pastel", bg: "bg-[#fdf8f5]", text: "text-[#2d1500]", badgeText: "Café" },
  retail: { layout: "standard", bg: "bg-[#fafaf9]", text: "text-[#1c1917]", badgeText: "Retail" },
  barber: { layout: "luxury", bg: "bg-[#1e1b4b]", text: "text-slate-100", fontClass: "font-serif", badgeText: "Barber" },
  hairsalon: { layout: "luxury", bg: "bg-[#faf5ff]", text: "text-[#4a044e]", badgeText: "Hair Salon" },
  nailstudio: { layout: "luxury", bg: "bg-[#fff5f5]", text: "text-[#65052f]", badgeText: "Nail Lounge" },
  lashbrow: { layout: "luxury", bg: "bg-[#fdf2f8]", text: "text-[#6d073d]", badgeText: "Lash Studio" },
  spa: { layout: "luxury", bg: "bg-[#f0fdf4]", text: "text-[#064e3b]", badgeText: "Spa" },
  carwash: { layout: "modern", bg: "bg-[#0b1329]", text: "text-white", badgeText: "Car Wash" },
  garage: { layout: "modern", bg: "bg-[#18181b]", text: "text-[#f4f4f5]", badgeText: "Auto Garage" },
  bakery: { layout: "pastel", bg: "bg-[#fcf8f2]", text: "text-[#451a03]", badgeText: "Bakery" },
  foodpizza: { layout: "pastel", bg: "bg-[#fff8f6]", text: "text-[#7f1d1d]", badgeText: "Food & Pizza" },
  boutique: { layout: "luxury", bg: "bg-[#fafaf9]", text: "text-[#1c1917]", fontClass: "font-serif", badgeText: "Boutique" },

  // Styles
  dark: { layout: "neon", bg: "bg-[#090d16]", text: "text-slate-100", badgeText: "Dark" },
  colorful: { layout: "gradient", bg: "bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500", text: "text-white", badgeText: "Vibrant" },
  premiumblack: { layout: "neon", bg: "bg-[#09090b]", text: "text-[#f4f4f5]", badgeText: "Black Platinum" },
  glass: { layout: "glass", bg: "bg-slate-900/40", text: "text-white", badgeText: "Glassmorphism" },
  neon: { layout: "neon", bg: "bg-black", text: "text-[#f8fafc]", badgeText: "Neon Cyber" },
  retro: { layout: "retro", bg: "bg-[#fefae0]", text: "text-[#283618]", fontClass: "font-mono", badgeText: "Retro" },
  elegantscript: { layout: "luxury", bg: "bg-[#fcf8f2]", text: "text-[#1c1917]", fontClass: "font-serif", badgeText: "Elegant" },
  playful: { layout: "pastel", bg: "bg-[#ecfeff]", text: "text-[#083344]", badgeText: "Playful" },
  professional: { layout: "standard", bg: "bg-slate-50", text: "text-slate-900", badgeText: "Corporate" },
  monochrome: { layout: "standard", bg: "bg-white", text: "text-black", fontClass: "font-mono", badgeText: "Monochrome" },
  pastel: { layout: "pastel", bg: "bg-[#fdf4ff]", text: "text-[#4a044e]", badgeText: "Pastel Sweet" },
  boldgradient: { layout: "gradient", bg: "bg-gradient-to-r from-amber-500 to-rose-500", text: "text-white", badgeText: "Vivid Gradient" },

  // Aruba-inspired
  oceanbreeze: { layout: "modern", bg: "bg-[#f0fdfa]", text: "text-[#0f3c3a]", badgeText: "Ocean Breeze" },
  caribbeansunset: { layout: "gradient", bg: "bg-gradient-to-tr from-amber-500 via-rose-500 to-violet-600", text: "text-white", badgeText: "Caribbean Sunset" },
  islandminimal: { layout: "standard", bg: "bg-[#fafaf6]", text: "text-emerald-950", badgeText: "Island Minimal" },
  tropical: { layout: "pastel", bg: "bg-[#f0fdf4]", text: "text-emerald-950", badgeText: "Tropical" },
  arubaocean: { layout: "gradient", bg: "bg-gradient-to-br from-cyan-400 via-teal-500 to-blue-600", text: "text-white", badgeText: "Aruba Ocean" },
  arubasunset: { layout: "gradient", bg: "bg-gradient-to-br from-orange-400 via-pink-500 to-indigo-700", text: "text-white", badgeText: "Aruba Sunset" }
};

export function LoyaltyCard(props: LoyaltyCardProps) {
  const { customization, stampIcon, color, stampTarget, currentStamps, programName, businessName, rewardTitle } = props;
  const templateId = (customization?.template_id || "classic").toLowerCase();
  
  // Resolve Theme Specification
  const theme = THEME_REGISTRY[templateId] || THEME_REGISTRY.classic;
  
  const primaryColor = customization?.primary_color || color || "#F87171";
  const overrideBg = customization?.bg_color;
  const overrideText = customization?.text_color;
  
  // Resolve branding assets
  const Icon = STAMP_ICONS[customization?.stamp_icon || stampIcon || "Star"] || Star;
  const RewardIcon = STAMP_ICONS[customization?.reward_icon || "Gift"] || Gift;
  const stamps = Array.from({ length: stampTarget }, (_, i) => i);
  const logoUrl = customization?.card_logo_url;

  // Render Shell: standard, modern, luxury, neon, gradient, glass, retro, pastel
  return (
    <Card 
      className={cn(
        "overflow-hidden border-2 shadow-md relative transition-all duration-300 w-full max-w-md mx-auto",
        theme.layout === "standard" && "rounded-xl border-slate-200",
        theme.layout === "modern" && "rounded-lg border-transparent",
        theme.layout === "luxury" && "rounded-none p-1 border-current/20",
        theme.layout === "neon" && "rounded-2xl border-current/40 shadow-[0_0_15px_rgba(0,0,0,0.4)]",
        theme.layout === "gradient" && "rounded-3xl border-0 shadow-lg",
        theme.layout === "glass" && "rounded-2xl border-white/20 shadow-2xl backdrop-blur-md",
        theme.layout === "retro" && "rounded-none border-4 border-current",
        theme.layout === "pastel" && "rounded-[2rem] border-transparent shadow-sm",
        theme.fontClass,
        props.className
      )}
      style={{ 
        backgroundColor: overrideBg || undefined,
        color: overrideText || undefined,
        borderColor: !overrideBg && !overrideText ? primaryColor : undefined
      }}
    >
      {/* Glow Effects for premium layouts */}
      {theme.layout === "neon" && (
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.05),transparent)] pointer-events-none" />
      )}

      <CardContent className={cn(
        "p-6 flex flex-col justify-between h-full min-h-[220px]",
        theme.bg,
        overrideBg && "bg-transparent", // let inline style take precedence
        overrideText && "text-inherit"
      )}>
        {/* Header Block */}
        <div className="flex justify-between items-start mb-6">
          <div>
            {logoUrl ? (
              <img src={logoUrl} alt={businessName} className="h-8 w-auto object-contain mb-2 max-w-[120px]" />
            ) : (
              <p className="text-[10px] font-black uppercase tracking-[0.15em] opacity-80 mb-1" style={{ color: primaryColor }}>
                {businessName}
              </p>
            )}
            <h3 className="text-xl font-bold tracking-tight leading-tight">{programName}</h3>
          </div>
          
          <div className="flex flex-col items-end shrink-0 ml-4">
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-black/10 text-inherit">
              {theme.badgeText || "Loyalty"}
            </span>
            <span className="text-xs font-mono font-bold mt-1.5 opacity-80">
              STAMPS: {currentStamps}/{stampTarget}
            </span>
          </div>
        </div>

        {/* Stamps Progress Grid */}
        <div className="grid grid-cols-5 gap-2.5 mb-6">
          {stamps.map((index) => {
            const isStamped = index < currentStamps;
            return (
              <div key={index} className="aspect-square flex items-center justify-center">
                <div
                  className={cn(
                    "w-full h-full border flex items-center justify-center transition-all duration-300",
                    theme.layout === "standard" && "rounded-lg",
                    theme.layout === "modern" && "rounded-md",
                    theme.layout === "luxury" && "rounded-full border-current/30",
                    theme.layout === "neon" && "rounded-xl shadow-inner",
                    theme.layout === "gradient" && "rounded-full bg-white/20 border-white/30",
                    theme.layout === "glass" && "rounded-xl bg-white/5 border-white/10",
                    theme.layout === "retro" && "rounded-none border-2 border-current",
                    theme.layout === "pastel" && "rounded-2xl border-transparent",
                    isStamped ? "scale-105 shadow-sm opacity-100" : "opacity-30 border-dashed"
                  )}
                  style={{
                    borderColor: isStamped ? primaryColor : undefined,
                    backgroundColor: isStamped ? (theme.layout === "gradient" ? "rgba(255,255,255,0.9)" : `${primaryColor}20`) : undefined,
                    color: isStamped ? (theme.layout === "gradient" ? primaryColor : primaryColor) : undefined
                  }}
                >
                  {isStamped ? (
                    theme.layout === "gradient" ? <Icon className="w-5 h-5 fill-current" /> : <Check className="w-5 h-5" strokeWidth={3} />
                  ) : (
                    <Icon className="w-4 h-4 opacity-50" />
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer/Reward Section */}
        <div className="border-t pt-4 flex items-center justify-between gap-4 border-current/10">
          <div className="min-w-0">
            <span className="text-[9px] font-bold uppercase tracking-widest opacity-60 block">Target Reward</span>
            <span className="text-sm font-extrabold truncate block">{rewardTitle || "Unlocked Reward"}</span>
          </div>
          
          <div className="shrink-0 flex items-center justify-center w-9 h-9 rounded-full bg-black/5" style={{ color: primaryColor }}>
            <RewardIcon className="w-5 h-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}