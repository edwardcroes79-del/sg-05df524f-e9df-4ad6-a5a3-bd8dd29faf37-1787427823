import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { SetupLiveProgram, SetupProgramDraft } from "@/components/admin-setup/types";

interface SetupProgramPanelProps {
  program: SetupProgramDraft;
  onChange: (patch: Partial<SetupProgramDraft>) => void;
  livePrograms: SetupLiveProgram[];
  targetProgramId: string;
  onTargetChange: (value: string) => void;
  canUseRewardExpiration: boolean;
  disabled?: boolean;
}

export function SetupProgramPanel({
  program,
  onChange,
  livePrograms,
  targetProgramId,
  onTargetChange,
  canUseRewardExpiration,
  disabled = false,
}: SetupProgramPanelProps) {
  return (
    <div className="space-y-5">
      <div className="space-y-1.5">
        <Label htmlFor="setup-target-program">Program to prepare</Label>
        <Select value={targetProgramId} onValueChange={onTargetChange} disabled={disabled}>
          <SelectTrigger id="setup-target-program">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="new">New loyalty program</SelectItem>
            {livePrograms.map((liveProgram) => (
              <SelectItem key={liveProgram.id} value={liveProgram.id}>
                {liveProgram.name || "Untitled program"}
                {liveProgram.active === false ? " (inactive)" : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          Choosing an existing program loads its current settings as a starting point. The live program is not changed.
        </p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="setup-program-name">Program name</Label>
        <Input
          id="setup-program-name"
          value={program.name}
          maxLength={120}
          disabled={disabled}
          onChange={(event) => onChange({ name: event.target.value })}
          placeholder="Coffee Club"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="setup-program-description">Program description</Label>
        <Textarea
          id="setup-program-description"
          value={program.description}
          maxLength={1000}
          rows={3}
          disabled={disabled}
          onChange={(event) => onChange({ description: event.target.value })}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="setup-stamp-target">Stamps required</Label>
          <Input
            id="setup-stamp-target"
            type="number"
            min={2}
            max={50}
            value={program.stamp_target || ""}
            disabled={disabled}
            onChange={(event) => onChange({ stamp_target: Number.parseInt(event.target.value, 10) || 0 })}
            className="tabular-nums"
          />
          <p className="text-xs text-muted-foreground">Between 2 and 50 stamps.</p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="setup-reward-expiration">Reward expiration (days)</Label>
          <Input
            id="setup-reward-expiration"
            type="number"
            min={1}
            max={365}
            value={program.reward_expiration_days ?? ""}
            disabled={disabled || !canUseRewardExpiration}
            onChange={(event) =>
              onChange({
                reward_expiration_days: event.target.value === "" ? null : Number.parseInt(event.target.value, 10) || null,
              })
            }
            placeholder="No expiration"
            className="tabular-nums"
          />
          <p className="text-xs text-muted-foreground">
            {canUseRewardExpiration ? "Leave empty for rewards that never expire. Maximum 365 days." : "Reward expiration is not included in this business's plan."}
          </p>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="setup-reward-title">Reward</Label>
        <Input
          id="setup-reward-title"
          value={program.reward_title}
          maxLength={120}
          disabled={disabled}
          onChange={(event) => onChange({ reward_title: event.target.value })}
          placeholder="Free coffee"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="setup-reward-description">Reward instructions</Label>
        <Textarea
          id="setup-reward-description"
          value={program.reward_description}
          maxLength={1000}
          rows={3}
          disabled={disabled}
          onChange={(event) => onChange({ reward_description: event.target.value })}
        />
      </div>
    </div>
  );
}