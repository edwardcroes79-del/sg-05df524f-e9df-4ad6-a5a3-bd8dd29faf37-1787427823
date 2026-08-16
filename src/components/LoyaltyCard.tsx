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

// 4. Elegant Template (Serif, borders, sophisticated)
const ElegantTemplate = (props: LoyaltyCardProps) => {
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

// Main Template Renderer
export function LoyaltyCard(props: LoyaltyCardProps) {
  const templateId = props.customization?.template_id || "classic";
  
  switch (templateId.toLowerCase()) {
    case "modern":
      return <ModernTemplate {...props} />;
    case "minimal":
      return <MinimalTemplate {...props} />;
    case "elegant":
      return <ElegantTemplate {...props} />;
    case "bold":
      return <BoldTemplate {...props} />;
    // Other templates (coffee shop, beauty, restaurant, etc.) can be easily added as cases here
    case "classic":
    default:
      return <ClassicTemplate {...props} />;
  }
}