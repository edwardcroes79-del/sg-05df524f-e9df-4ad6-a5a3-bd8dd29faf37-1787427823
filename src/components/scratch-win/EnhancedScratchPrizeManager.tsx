import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { EnhancedPrize, EnhancedPrizeType } from "@/components/scratch-win/enhanced-builder-types";
import { prizeTypeLabels } from "@/components/scratch-win/enhanced-builder-types";

interface EnhancedScratchPrizeManagerProps {
  prizes: EnhancedPrize[];
  onChange: (prizes: EnhancedPrize[]) => void;
}

const prizeTypes = Object.keys(prizeTypeLabels) as EnhancedPrizeType[];

function createPrize(): EnhancedPrize {
  return {
    id: `demo-prize-${Date.now()}`,
    name: "",
    description: "",
    type: "free_item",
    quantity: 1,
    displayValue: "",
    expirationDays: 14
  };
}

export function EnhancedScratchPrizeManager({ prizes, onChange }: EnhancedScratchPrizeManagerProps) {
  const totalQuantity = prizes.reduce((sum, prize) => sum + Math.max(0, Number(prize.quantity) || 0), 0);

  const updatePrize = <Key extends keyof EnhancedPrize>(id: string, field: Key, value: EnhancedPrize[Key]) => {
    onChange(prizes.map((prize) => (prize.id === id ? { ...prize, [field]: value } : prize)));
  };

  const removePrize = (id: string) => {
    if (prizes.length === 1) return;
    onChange(prizes.filter((prize) => prize.id !== id));
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-muted/50 p-4">
        <div>
          <p className="font-semibold text-foreground">Prize inventory setup</p>
          <p className="text-sm text-muted-foreground">Local session only. No prize records or vouchers are created.</p>
        </div>
        <div className="rounded-full bg-background px-4 py-2 text-sm font-semibold text-foreground">
          {totalQuantity} demo prizes configured
        </div>
      </div>

      {prizes.map((prize, index) => (
        <Card key={prize.id} className="border-border bg-card">
          <CardContent className="space-y-4 p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="font-serif text-xl font-bold">Prize {index + 1}</p>
              <Button type="button" variant="outline" size="sm" onClick={() => removePrize(prize.id)} disabled={prizes.length === 1}>
                <Trash2 className="mr-2 h-4 w-4" aria-hidden="true" />
                Remove
              </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor={`${prize.id}-name`}>Prize name</Label>
                <Input id={`${prize.id}-name`} value={prize.name} onChange={(event) => updatePrize(prize.id, "name", event.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor={`${prize.id}-type`}>Prize type</Label>
                <select
                  id={`${prize.id}-type`}
                  className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
                  value={prize.type}
                  onChange={(event) => updatePrize(prize.id, "type", event.target.value as EnhancedPrizeType)}
                >
                  {prizeTypes.map((type) => (
                    <option key={type} value={type}>
                      {prizeTypeLabels[type]}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor={`${prize.id}-description`}>Prize description</Label>
              <Textarea
                id={`${prize.id}-description`}
                value={prize.description}
                onChange={(event) => updatePrize(prize.id, "description", event.target.value)}
                rows={2}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="grid gap-2">
                <Label htmlFor={`${prize.id}-quantity`}>Demo quantity</Label>
                <Input
                  id={`${prize.id}-quantity`}
                  type="number"
                  min="0"
                  value={prize.quantity}
                  onChange={(event) => updatePrize(prize.id, "quantity", Number(event.target.value))}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor={`${prize.id}-value`}>Optional display value</Label>
                <Input id={`${prize.id}-value`} value={prize.displayValue} onChange={(event) => updatePrize(prize.id, "displayValue", event.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor={`${prize.id}-expiration`}>Expiration period</Label>
                <Input
                  id={`${prize.id}-expiration`}
                  type="number"
                  min="0"
                  value={prize.expirationDays}
                  onChange={(event) => updatePrize(prize.id, "expirationDays", Number(event.target.value))}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}

      <Button type="button" variant="outline" onClick={() => onChange([...prizes, createPrize()])}>
        <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
        Add another demo prize
      </Button>
    </div>
  );
}