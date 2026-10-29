import { useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { STAMP_ICONS } from "@/components/LoyaltyCard";

const ICON_CATEGORIES = [
  { name: "Food & Beverage", icons: ["Coffee", "Utensils", "Pizza", "CupSoda", "Cake", "Wine", "Beer", "IceCream", "Croissant", "Martini"] },
  { name: "Beauty & Wellness", icons: ["Scissors", "Brush", "Sparkles", "Droplet", "Flower"] },
  { name: "Automotive", icons: ["Car", "Wrench", "Settings", "Fuel", "Battery", "Bike"] },
  { name: "Retail", icons: ["ShoppingBag", "ShoppingCart", "Gift", "Tag", "Shirt", "Store"] },
  { name: "Travel", icons: ["Plane", "Tent", "Hotel", "Luggage", "Camera", "MapPin", "Palmtree", "Compass"] },
  { name: "Professional", icons: ["Briefcase", "Laptop", "Phone", "Calendar", "FileText", "Calculator"] },
  { name: "General", icons: ["Building", "Home", "Star", "Heart", "Trophy", "Medal", "Diamond", "Check", "Award", "Shield", "Smile", "Dumbbell"] },
  { name: "Rewards", icons: ["Crown", "Ticket", "Percent", "PartyPopper"] },
  { name: "Nature", icons: ["Sun", "Moon", "Leaf", "TreePine", "PawPrint", "Flame", "Sparkle"] },
  { name: "Social", icons: ["Mail", "MessageCircle", "Globe", "Link"] },
];

export function IconPicker({ 
  value, 
  onChange, 
  label 
}: { 
  value: string; 
  onChange: (val: string) => void;
  label: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [activeCat, setActiveCat] = useState("All");

  const allIcons = ICON_CATEGORIES.flatMap(c => c.icons);

  const filteredIcons = allIcons.filter(icon => {
    if (activeCat !== "All" && !ICON_CATEGORIES.find(c => c.name === activeCat)?.icons.includes(icon)) return false;
    if (search && !icon.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });
  
  const showNone = (activeCat === "All" && !search);

  const CurrentIcon = value === "None" ? null : (STAMP_ICONS[value] || STAMP_ICONS.Star);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button type="button" className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm hover:bg-muted/50 transition-colors">
          <span className="flex items-center gap-2">
            {CurrentIcon ? <CurrentIcon className="w-4 h-4" /> : <div className="w-4 h-4 border border-dashed rounded-full opacity-50" />}
            {value === "None" ? "No Icon" : (value || "Star")}
          </span>
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl h-[80vh] flex flex-col p-0 gap-0">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle>Select {label}</DialogTitle>
          <div className="relative mt-4">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search icons..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <ScrollArea className="w-full whitespace-nowrap mt-4">
            <div className="flex w-max space-x-2 pb-3">
              <button 
                onClick={() => setActiveCat("All")}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${activeCat === "All" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
              >
                All
              </button>
              {ICON_CATEGORIES.map(c => (
                <button 
                  key={c.name}
                  onClick={() => setActiveCat(c.name)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${activeCat === c.name ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
                >
                  {c.name}
                </button>
              ))}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </DialogHeader>
        <ScrollArea className="flex-1 p-6 pt-0">
          <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-7 gap-3">
            {showNone && (
               <button
                 type="button"
                 onClick={() => { onChange("None"); setOpen(false); }}
                 className={`flex flex-col items-center justify-center gap-2 p-3 rounded-xl border hover:border-primary hover:bg-primary/5 transition-all ${value === "None" ? "border-primary bg-primary/10 ring-2 ring-primary/20" : "border-border"}`}
               >
                 <div className="w-6 h-6 border-2 border-dashed rounded-full opacity-50" />
                 <span className="text-[10px] text-muted-foreground truncate w-full text-center">None</span>
               </button>
            )}
            {filteredIcons.map(icon => {
              const IconComp = STAMP_ICONS[icon];
              if (!IconComp) return null;
              return (
                <button
                  key={icon}
                  type="button"
                  onClick={() => { onChange(icon); setOpen(false); }}
                  className={`flex flex-col items-center justify-center gap-2 p-3 rounded-xl border hover:border-primary hover:bg-primary/5 transition-all ${value === icon ? "border-primary bg-primary/10 ring-2 ring-primary/20" : "border-border"}`}
                >
                  <IconComp className="w-6 h-6" />
                  <span className="text-[10px] text-muted-foreground truncate w-full text-center">{icon}</span>
                </button>
              );
            })}
          </div>
          {filteredIcons.length === 0 && !showNone && (
            <div className="text-center py-12 text-muted-foreground">
              No icons found matching "{search}"
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}