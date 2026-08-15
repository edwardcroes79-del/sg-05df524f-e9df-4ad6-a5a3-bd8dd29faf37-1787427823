import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Coffee, Scissors, Car, Dumbbell, Utensils, Gift, Star, Check } from "lucide-react";
import { cn } from "@/lib/utils";

const ICONS: Record<string, React.ElementType> = {
  Coffee,
  Scissors,
  Car,
  Dumbbell,
  Utensils,
  Star,
};

interface LoyaltyCardProps {
  programName: string;
  businessName: string;
  stampTarget: number;
  currentStamps: number;
  stampIcon?: string;
  rewardTitle?: string;
  color?: string;
  className?: string;
}

export function LoyaltyCard({
  programName,
  businessName,
  stampTarget,
  currentStamps,
  stampIcon = "Star",
  rewardTitle = "Free Reward",
  color = "#F87171", // default coral
  className,
}: LoyaltyCardProps) {
  const Icon = ICONS[stampIcon] || Star;
  
  // Create an array of stamps
  const stamps = Array.from({ length: stampTarget }, (_, i) => i);

  return (
    <Card 
      className={cn("overflow-hidden border-2 relative", className)}
      style={{ borderColor: color }}
    >
      <div 
        className="absolute top-0 left-0 w-full h-2" 
        style={{ backgroundColor: color }} 
      />
      <CardHeader className="pb-4">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
              {businessName}
            </p>
            <CardTitle className="text-xl font-heading">{programName}</CardTitle>
          </div>
          <div 
            className="w-10 h-10 rounded-full flex items-center justify-center text-white shrink-0 shadow-sm"
            style={{ backgroundColor: color }}
          >
            <Gift className="w-5 h-5" />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-5 gap-3 mb-6">
          {stamps.map((index) => {
            const isStamped = index < currentStamps;
            return (
              <div
                key={index}
                className={cn(
                  "aspect-square rounded-full flex items-center justify-center border-2 transition-all duration-300",
                  isStamped ? "scale-100" : "scale-95 opacity-40 bg-muted border-dashed"
                )}
                style={{
                  borderColor: isStamped ? color : "transparent",
                  backgroundColor: isStamped ? `${color}15` : undefined,
                  color: isStamped ? color : "currentColor"
                }}
              >
                {isStamped ? (
                  <Check className="w-5 h-5" strokeWidth={3} />
                ) : (
                  <Icon className="w-4 h-4 text-muted-foreground" />
                )}
              </div>
            );
          })}
        </div>
        
        <div className="bg-muted/50 rounded-lg p-3 flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-sm font-medium">Reward: {rewardTitle}</span>
            <span className="text-xs text-muted-foreground">
              {currentStamps >= stampTarget 
                ? "Reward Unlocked!" 
                : `${stampTarget - currentStamps} more stamps to go`}
            </span>
          </div>
          <div className="text-right">
            <span className="text-2xl font-bold font-heading tabular-nums" style={{ color }}>
              {currentStamps}
            </span>
            <span className="text-sm text-muted-foreground">/{stampTarget}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}