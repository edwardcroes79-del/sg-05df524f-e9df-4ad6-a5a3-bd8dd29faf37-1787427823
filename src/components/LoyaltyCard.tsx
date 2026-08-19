import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Coffee, Scissors, Car, Dumbbell, Utensils, Gift, Star, Check, Sparkles, Heart, Crown, CupSoda, ShoppingBag } from "lucide-react";
import { cn } from "@/lib/utils";

export const STAMP_ICONS: Record<string, React.ElementType> = {
  Coffee, Scissors, Car, Dumbbell, Utensils, Star, Gift, Sparkles, Heart, Crown, CupSoda, ShoppingBag
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
  color?: string; // fallback legacy primary color
  className?: string;
  customization?: TemplateCustomization;
}

// Hook to standardize extraction of template values vs fallbacks
function useTemplateData(props: LoyaltyCardProps) {
  const { customization, stampIcon, color, stampTarget } = props;
  
  const primaryColor = customization?.primary_color || color || "#F87171";
  const bgColor = customization?.bg_color || "var(--background)";
  const textColor = customization?.text_color || "var(--foreground)";
  const secondaryColor = customization?.secondary_color || `${primaryColor}15`;
  const logoUrl = customization?.card_logo_url;
  
  const Icon = STAMP_ICONS[customization?.stamp_icon || stampIcon || "Star"] || Star;
  const RewardIcon = STAMP_ICONS[customization?.reward_icon || "Gift"] || Gift;

  const stamps = Array.from({ length: stampTarget }, (_, i) => i);
  
  return { primaryColor, bgColor, textColor, secondaryColor, logoUrl, Icon, RewardIcon, stamps };
}

// 1. Classic Template (The original robust design)
const ClassicTemplate = (props: LoyaltyCardProps) => {
  const { primaryColor, bgColor, textColor, secondaryColor, logoUrl, Icon, RewardIcon, stamps } = useTemplateData(props);

  return (
    <Card 
      className={cn("overflow-hidden border-2 relative", props.className)}
      style={{ borderColor: primaryColor, backgroundColor: bgColor, color: textColor }}
    >
      <div 
        className="absolute top-0 left-0 w-full h-2" 
        style={{ backgroundColor: primaryColor }} 
      />
      <CardHeader className="pb-4">
        <div className="flex justify-between items-start">
          <div>
            {logoUrl ? (
              <img src={logoUrl} alt={props.businessName} className="h-8 w-auto object-contain mb-2" />
            ) : (
              <p className="text-xs font-medium uppercase tracking-wider mb-1 opacity-70">
                {props.businessName}
              </p>
            )}
            <CardTitle className="text-xl font-heading">{props.programName}</CardTitle>
          </div>
          <div 
            className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 shadow-sm"
            style={{ backgroundColor: primaryColor, color: "#fff" }}
          >
            <RewardIcon className="w-5 h-5" />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-5 gap-3 mb-6">
          {stamps.map((index) => {
            const isStamped = index < props.currentStamps;
            return (
              <div
                key={index}
                className={cn(
                  "aspect-square rounded-full flex items-center justify-center border-2 transition-all duration-300",
                  isStamped ? "scale-100" : "scale-95 opacity-40 border-dashed"
                )}
                style={{
                  borderColor: isStamped ? primaryColor : "currentColor",
                  backgroundColor: isStamped ? secondaryColor : "transparent",
                  color: isStamped ? primaryColor : "currentColor"
                }}
              >
                {isStamped ? (
                  <Check className="w-5 h-5" strokeWidth={3} />
                ) : (
                  <Icon className="w-4 h-4 opacity-50" />
                )}
              </div>
            );
          })}
        </div>
        <div className="rounded-lg p-3 flex items-center justify-between" style={{ backgroundColor: secondaryColor }}>
          <div className="flex flex-col">
            <span className="text-sm font-medium">Reward: {props.rewardTitle}</span>
            <span className="text-xs opacity-70">
              {props.currentStamps >= props.stampTarget 
                ? "Reward Unlocked!" 
                : `${props.stampTarget - props.currentStamps} more stamps to go`}
            </span>
          </div>
          <div className="text-right">
            <span className="text-2xl font-bold font-heading tabular-nums" style={{ color: primaryColor }}>
              {props.currentStamps}
            </span>
            <span className="text-sm opacity-70">/{props.stampTarget}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// 2. Modern Template (Sleek, block-background header)
const ModernTemplate = (props: LoyaltyCardProps) => {
  const { primaryColor, bgColor, textColor, logoUrl, Icon, RewardIcon, stamps } = useTemplateData(props);

  return (
    <Card 
      className={cn("overflow-hidden border-0 shadow-lg relative", props.className)}
      style={{ backgroundColor: bgColor, color: textColor }}
    >
      <div className="px-6 py-8 flex justify-between items-center text-white" style={{ backgroundColor: primaryColor }}>
        <div>
          {logoUrl ? (
            <img src={logoUrl} alt={props.businessName} className="h-10 w-auto object-contain mb-2 drop-shadow-sm" />
          ) : (
            <p className="text-xs font-semibold uppercase tracking-wider mb-1 opacity-90">
              {props.businessName}
            </p>
          )}
          <CardTitle className="text-2xl font-heading">{props.programName}</CardTitle>
        </div>
        <RewardIcon className="w-8 h-8 opacity-90" />
      </div>
      <CardContent className="pt-8">
        <div className="flex flex-wrap gap-4 justify-center mb-8">
          {stamps.map((index) => {
            const isStamped = index < props.currentStamps;
            return (
              <div
                key={index}
                className={cn(
                  "w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300",
                  isStamped ? "shadow-md" : "opacity-30 border-2"
                )}
                style={{
                  backgroundColor: isStamped ? primaryColor : "transparent",
                  color: isStamped ? "#fff" : "currentColor"
                }}
              >
                {isStamped ? (
                  <Check className="w-6 h-6" strokeWidth={3} />
                ) : (
                  <Icon className="w-5 h-5" />
                )}
              </div>
            );
          })}
        </div>
        <div className="text-center border-t pt-4">
          <p className="text-sm font-medium uppercase tracking-wider opacity-70 mb-1">Current Reward</p>
          <p className="text-lg font-bold" style={{ color: primaryColor }}>{props.rewardTitle}</p>
        </div>
      </CardContent>
    </Card>
  );
};

// 3. Minimal Template (Clean, typography focused)
const MinimalTemplate = (props: LoyaltyCardProps) => {
  const { primaryColor, bgColor, textColor, logoUrl, Icon, stamps } = useTemplateData(props);

  return (
    <Card 
      className={cn("overflow-hidden border shadow-sm p-2", props.className)}
      style={{ backgroundColor: bgColor, color: textColor }}
    >
      <CardContent className="p-6">
        <div className="text-center mb-8">
          {logoUrl ? (
            <img src={logoUrl} alt={props.businessName} className="h-10 w-auto object-contain mx-auto mb-3" />
          ) : (
            <p className="text-xs tracking-widest uppercase opacity-60 mb-2">
              {props.businessName}
            </p>
          )}
          <CardTitle className="text-xl font-light mb-1">{props.programName}</CardTitle>
        </div>
        <div className="grid grid-cols-4 sm:grid-cols-5 gap-4 mb-8">
          {stamps.map((index) => {
            const isStamped = index < props.currentStamps;
            return (
              <div key={index} className="flex justify-center">
                <div
                  className={cn(
                    "w-10 h-10 border-b-2 flex items-center justify-center transition-all",
                    isStamped ? "opacity-100" : "opacity-20"
                  )}
                  style={{ borderColor: isStamped ? primaryColor : "currentColor" }}
                >
                  <Icon className="w-5 h-5" style={{ color: isStamped ? primaryColor : "currentColor" }} />
                </div>
              </div>
            );
          })}
        </div>
        <div className="text-center">
          <span className="text-sm opacity-60">Reward upon completion: </span>
          <span className="text-sm font-semibold">{props.rewardTitle}</span>
        </div>
      </CardContent>
    </Card>
  );
};

// 4. Luxury Template (Premium/elegant design)
const LuxuryTemplate = (props: LoyaltyCardProps) => {
  const { primaryColor, bgColor, textColor, logoUrl, Icon, stamps } = useTemplateData(props);

  return (
    <Card 
      className={cn("overflow-hidden border shadow-md rounded-none relative", props.className)}
      style={{ backgroundColor: bgColor, color: textColor }}
    >
      <div className="absolute inset-2 border border-current opacity-20 pointer-events-none" style={{ borderColor: primaryColor }} />
      <CardContent className="p-8">
        <div className="text-center mb-10">
          {logoUrl ? (
            <img src={logoUrl} alt={props.businessName} className="h-12 w-auto object-contain mx-auto mb-4" />
          ) : (
            <p className="text-xs uppercase tracking-[0.2em] mb-2 opacity-70">
              {props.businessName}
            </p>
          )}
          <CardTitle className="text-2xl" style={{ fontFamily: "serif" }}>{props.programName}</CardTitle>
        </div>
        <div className="flex flex-wrap gap-5 justify-center mb-10">
          {stamps.map((index) => {
            const isStamped = index < props.currentStamps;
            return (
              <div key={index} className="flex justify-center">
                <div
                  className={cn(
                    "w-12 h-12 rounded-full border flex items-center justify-center transition-all",
                    isStamped ? "opacity-100" : "opacity-30 border-dashed"
                  )}
                  style={{ 
                    borderColor: isStamped ? primaryColor : "currentColor",
                    backgroundColor: isStamped ? `${primaryColor}10` : "transparent"
                  }}
                >
                  <Icon className="w-5 h-5" style={{ color: isStamped ? primaryColor : "currentColor" }} />
                </div>
              </div>
            );
          })}
        </div>
        <div className="text-center border-t pt-6" style={{ borderColor: `${primaryColor}30` }}>
          <span className="text-xs uppercase tracking-widest opacity-60 block mb-1">Reward</span>
          <span className="text-base" style={{ fontFamily: "serif", color: primaryColor }}>{props.rewardTitle}</span>
        </div>
      </CardContent>
    </Card>
  );
};

// 5. Bold Template (High impact, solid colors, sharp edges)
const BoldTemplate = (props: LoyaltyCardProps) => {
  const { primaryColor, bgColor, textColor, logoUrl, Icon, stamps } = useTemplateData(props);

  return (
    <Card 
      className={cn("overflow-hidden border-4 shadow-none rounded-sm", props.className)}
      style={{ backgroundColor: bgColor, color: textColor, borderColor: textColor }}
    >
      <div className="p-5 border-b-4 flex justify-between items-end" style={{ borderColor: textColor, backgroundColor: primaryColor, color: bgColor }}>
        <div>
          {logoUrl ? (
            <img src={logoUrl} alt={props.businessName} className="h-10 w-auto object-contain mb-2" />
          ) : (
            <p className="text-xs font-bold uppercase tracking-wider opacity-90 mb-1">
              {props.businessName}
            </p>
          )}
          <CardTitle className="text-2xl font-black uppercase tracking-tight leading-none">{props.programName}</CardTitle>
        </div>
        <div className="text-3xl font-black tabular-nums leading-none">
          {props.currentStamps}/{props.stampTarget}
        </div>
      </div>
      <CardContent className="p-5">
        <div className="grid grid-cols-5 gap-2 mb-6">
          {stamps.map((index) => {
            const isStamped = index < props.currentStamps;
            return (
              <div key={index} className="flex justify-center aspect-square">
                <div
                  className={cn(
                    "w-full h-full border-4 flex items-center justify-center transition-all rounded-sm",
                    isStamped ? "opacity-100" : "opacity-20"
                  )}
                  style={{ 
                    borderColor: textColor,
                    backgroundColor: isStamped ? textColor : "transparent",
                    color: isStamped ? bgColor : textColor
                  }}
                >
                  <Icon className="w-6 h-6" strokeWidth={3} />
                </div>
              </div>
            );
          })}
        </div>
        <div className="p-3 flex justify-between items-center rounded-sm" style={{ backgroundColor: textColor, color: bgColor }}>
          <span className="font-black uppercase tracking-wide text-xs">REWARD</span>
          <span className="font-bold text-sm">{props.rewardTitle}</span>
        </div>
      </CardContent>
    </Card>
  );
};

// 6. Restaurant Template (Warm plate-inspired dining styling)
const RestaurantTemplate = (props: LoyaltyCardProps) => {
  const { primaryColor, bgColor, textColor, logoUrl, Icon, stamps } = useTemplateData(props);

  return (
    <Card 
      className={cn("overflow-hidden border-2 shadow-sm rounded-2xl relative border-dashed", props.className)}
      style={{ borderColor: primaryColor, backgroundColor: bgColor, color: textColor }}
    >
      <CardContent className="p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            {logoUrl ? (
              <img src={logoUrl} alt={props.businessName} className="h-10 w-auto object-contain mb-1" />
            ) : (
              <p className="text-xs font-bold uppercase tracking-[0.15em] opacity-80 mb-1" style={{ color: primaryColor }}>
                {props.businessName}
              </p>
            )}
            <CardTitle className="text-xl font-heading font-black">{props.programName}</CardTitle>
          </div>
          <div className="text-right">
            <span className="text-xs uppercase font-semibold tracking-wider block opacity-70">Plates Completed</span>
            <span className="text-2xl font-black tabular-nums">{props.currentStamps}/{props.stampTarget}</span>
          </div>
        </div>

        <div className="grid grid-cols-5 gap-3 mb-6">
          {stamps.map((index) => {
            const isStamped = index < props.currentStamps;
            return (
              <div key={index} className="flex justify-center aspect-square">
                <div
                  className={cn(
                    "w-full h-full rounded-full border-2 flex items-center justify-center transition-all duration-300 relative",
                    isStamped ? "opacity-100 shadow-sm" : "opacity-30 border-dashed"
                  )}
                  style={{ 
                    borderColor: isStamped ? primaryColor : "currentColor",
                    backgroundColor: isStamped ? `${primaryColor}15` : "transparent",
                    color: isStamped ? primaryColor : "currentColor"
                  }}
                >
                  {isStamped ? (
                    <Check className="w-5 h-5" strokeWidth={3} />
                  ) : (
                    <Icon className="w-5 h-5" />
                  )}
                  <div className="absolute inset-1 rounded-full border border-current opacity-10 pointer-events-none" />
                </div>
              </div>
            );
          })}
        </div>

        <div className="border-t-2 border-dashed pt-4 flex items-center justify-between" style={{ borderColor: `${primaryColor}30` }}>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider block opacity-60">Chef's Special Reward</span>
            <span className="text-sm font-bold">{props.rewardTitle}</span>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ backgroundColor: `${primaryColor}15`, color: primaryColor }}>
            Bon Appétit
          </span>
        </div>
      </CardContent>
    </Card>
  );
};

// 7. Beauty Template (Elegant salon/lashes style with floating sparkle elements)
const BeautyTemplate = (props: LoyaltyCardProps) => {
  const { primaryColor, bgColor, textColor, logoUrl, Icon, stamps } = useTemplateData(props);

  return (
    <Card 
      className={cn("overflow-hidden border shadow-xl rounded-3xl relative", props.className)}
      style={{ backgroundColor: bgColor, color: textColor, borderColor: `${primaryColor}20` }}
    >
      <div 
        className="absolute -top-12 -right-12 w-32 h-32 rounded-full opacity-10 blur-xl pointer-events-none" 
        style={{ backgroundColor: primaryColor }} 
      />
      <CardContent className="p-8 relative">
        <div className="text-center mb-8">
          {logoUrl ? (
            <img src={logoUrl} alt={props.businessName} className="h-10 w-auto object-contain mx-auto mb-2" />
          ) : (
            <p className="text-[10px] uppercase tracking-[0.25em] font-light opacity-80 mb-1" style={{ color: primaryColor }}>
              {props.businessName}
            </p>
          )}
          <CardTitle className="text-2xl font-light tracking-wide">{props.programName}</CardTitle>
          <div className="w-8 h-[1px] bg-current mx-auto mt-3 opacity-30" style={{ backgroundColor: primaryColor }} />
        </div>

        <div className="flex flex-wrap gap-4 justify-center mb-8">
          {stamps.map((index) => {
            const isStamped = index < props.currentStamps;
            return (
              <div
                key={index}
                className={cn(
                  "w-11 h-11 rounded-full flex items-center justify-center transition-all duration-300 border",
                  isStamped ? "shadow-sm scale-105" : "opacity-30 border-dashed"
                )}
                style={{
                  borderColor: isStamped ? primaryColor : "currentColor",
                  backgroundColor: isStamped ? `${primaryColor}15` : "transparent",
                  color: isStamped ? primaryColor : "currentColor"
                }}
              >
                {isStamped ? (
                  <Sparkles className="w-4 h-4 animate-pulse" />
                ) : (
                  <Icon className="w-4 h-4" />
                )}
              </div>
            );
          })}
        </div>

        <div className="p-4 rounded-2xl text-center border border-dashed" style={{ backgroundColor: `${primaryColor}05`, borderColor: `${primaryColor}25` }}>
          <span className="text-[10px] uppercase tracking-widest opacity-60 block mb-1">Your Exclusive Treatment</span>
          <span className="text-sm font-semibold">{props.rewardTitle}</span>
        </div>
      </CardContent>
    </Card>
  );
};

// 8. Automotive Template (Sleek carbon dark industrial styling)
const AutomotiveTemplate = (props: LoyaltyCardProps) => {
  const { primaryColor, bgColor, textColor, logoUrl, Icon, stamps } = useTemplateData(props);

  return (
    <Card 
      className={cn("overflow-hidden border-2 shadow-2xl rounded-xl relative", props.className)}
      style={{ backgroundColor: bgColor, color: textColor, borderColor: primaryColor }}
    >
      <div className="absolute top-0 left-0 h-full w-1.5" style={{ backgroundColor: primaryColor }} />
      <CardContent className="p-6 pl-8">
        <div className="flex justify-between items-start mb-6">
          <div>
            {logoUrl ? (
              <img src={logoUrl} alt={props.businessName} className="h-9 w-auto object-contain mb-1.5" />
            ) : (
              <p className="text-[11px] font-black uppercase tracking-wider opacity-85 mb-0.5" style={{ color: primaryColor }}>
                {props.businessName}
              </p>
            )}
            <CardTitle className="text-xl font-bold uppercase tracking-tight">{props.programName}</CardTitle>
          </div>
          <div className="bg-white/10 px-3 py-1.5 rounded border border-white/10 font-mono text-sm tracking-widest font-bold">
            {props.currentStamps}/{props.stampTarget}
          </div>
        </div>

        <div className="grid grid-cols-5 gap-2.5 mb-6">
          {stamps.map((index) => {
            const isStamped = index < props.currentStamps;
            return (
              <div key={index} className="aspect-square flex items-center justify-center">
                <div
                  className={cn(
                    "w-full h-full border-2 flex items-center justify-center transition-all duration-200 rounded-lg",
                    isStamped ? "scale-100 shadow-[0_0_10px_rgba(0,0,0,0.2)]" : "opacity-25"
                  )}
                  style={{ 
                    borderColor: isStamped ? primaryColor : "currentColor",
                    backgroundColor: isStamped ? primaryColor : "transparent",
                    color: isStamped ? "#0f172a" : "currentColor"
                  }}
                >
                  {isStamped ? (
                    <Car className="w-5 h-5 text-slate-900" />
                  ) : (
                    <Icon className="w-4 h-4" />
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="border-t pt-4 flex items-center justify-between" style={{ borderColor: `${primaryColor}20` }}>
          <div>
            <span className="text-[9px] font-bold uppercase tracking-wider block opacity-60">Completed Reward</span>
            <span className="text-sm font-bold uppercase tracking-tight">{props.rewardTitle}</span>
          </div>
          <span className="text-xs border px-3 py-1 rounded font-mono font-bold tracking-wider" style={{ borderColor: primaryColor, color: primaryColor }}>
            DRIVE SAFE
          </span>
        </div>
      </CardContent>
    </Card>
  );
};

// 9. Fitness Template (Energetic bold athletic design)
const FitnessTemplate = (props: LoyaltyCardProps) => {
  const { primaryColor, bgColor, textColor, logoUrl, Icon, stamps } = useTemplateData(props);

  return (
    <Card 
      className={cn("overflow-hidden border-4 shadow-none rounded-none relative", props.className)}
      style={{ backgroundColor: bgColor, color: textColor, borderColor: primaryColor }}
    >
      <div className="absolute top-0 right-0 w-24 h-full bg-current opacity-5 transform skew-x-12 translate-x-8 pointer-events-none" />
      <CardContent className="p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b-2 pb-4 mb-6" style={{ borderColor: `${primaryColor}20` }}>
          <div>
            {logoUrl ? (
              <img src={logoUrl} alt={props.businessName} className="h-8 w-auto object-contain mb-1.5" />
            ) : (
              <p className="text-xs font-black uppercase tracking-widest opacity-80" style={{ color: primaryColor }}>
                {props.businessName}
              </p>
            )}
            <CardTitle className="text-2xl font-black uppercase italic tracking-tight">{props.programName}</CardTitle>
          </div>
          <div className="text-sm font-bold uppercase italic tracking-wide shrink-0">
            Progress: <span className="text-xl font-black italic" style={{ color: primaryColor }}>{Math.round((props.currentStamps / props.stampTarget) * 100)}%</span>
          </div>
        </div>

        <div className="grid grid-cols-5 gap-3 mb-6">
          {stamps.map((index) => {
            const isStamped = index < props.currentStamps;
            return (
              <div key={index} className="aspect-square flex items-center justify-center">
                <div
                  className={cn(
                    "w-full h-full border-2 flex items-center justify-center transition-all duration-300 transform",
                    isStamped ? "scale-100 rotate-12 shadow-md" : "opacity-30 border-dashed"
                  )}
                  style={{ 
                    borderColor: isStamped ? primaryColor : "currentColor",
                    backgroundColor: isStamped ? primaryColor : "transparent",
                    color: isStamped ? "#111827" : "currentColor"
                  }}
                >
                  <Icon className={cn("w-5 h-5", isStamped && "animate-pulse")} />
                </div>
              </div>
            );
          })}
        </div>

        <div className="p-3 flex items-center justify-between rounded" style={{ backgroundColor: `${primaryColor}15` }}>
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider block opacity-70">Goal Unlock Reward</span>
            <span className="text-sm font-bold uppercase italic">{props.rewardTitle}</span>
          </div>
          <div className="text-right shrink-0">
            <span className="text-lg font-black italic tabular-nums">{props.currentStamps}</span>
            <span className="text-xs opacity-70">/{props.stampTarget}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Main Template Renderer
export function LoyaltyCard(props: LoyaltyCardProps) {
  const templateId = props.customization?.template_id || "classic";
  
  switch (templateId.toLowerCase()) {
    case "modern":
      return <ModernTemplate {...props} />;
    case "minimal":
      return <MinimalTemplate {...props} />;
    case "luxury":
      return <LuxuryTemplate {...props} />;
    case "bold":
      return <BoldTemplate {...props} />;
    case "restaurant":
      return <RestaurantTemplate {...props} />;
    case "beauty":
      return <BeautyTemplate {...props} />;
    case "automotive":
      return <AutomotiveTemplate {...props} />;
    case "fitness":
      return <FitnessTemplate {...props} />;
    case "classic":
    default:
      return <ClassicTemplate {...props} />;
  }
}