import { useRef, useState } from "react";
import Image from "next/image";
import { Loader2, Lock, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { IconPicker } from "@/components/dashboard/IconPicker";
import { cn } from "@/lib/utils";
import { FREE_TEMPLATE_IDS, TEMPLATE_PRESETS, type TemplatePreset, type TemplatePresetStyle } from "@/lib/cardTemplatePresets";
import type { SetupAssetKind, SetupBrandingDraft, SetupProgramDraft } from "@/components/admin-setup/types";

type Category = "All" | TemplatePresetStyle;
const CATEGORIES: Category[] = ["All", "Industry", "Style", "Aruba"];

interface SetupDesignPanelProps {
  program: SetupProgramDraft;
  onChange: (patch: Partial<SetupProgramDraft>) => void;
  branding: SetupBrandingDraft;
  onBrandingChange: (patch: Partial<SetupBrandingDraft>) => void;
  hasPremiumTemplates: boolean;
  onUpload: (kind: SetupAssetKind, file: File) => Promise<string | null>;
  disabled?: boolean;
}

interface ColorFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  optional?: boolean;
  disabled?: boolean;
}

function ColorField({ id, label, value, onChange, optional = false, disabled = false }: ColorFieldProps) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          aria-label={label}
          value={/^#[0-9a-fA-F]{6}$/.test(value) ? value : "#000000"}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
          className="h-10 w-12 shrink-0 cursor-pointer rounded-md border border-input bg-background p-1"
        />
        <Input
          id={id}
          value={value}
          maxLength={7}
          disabled={disabled}
          placeholder={optional ? "Not set" : "#000000"}
          onChange={(event) => onChange(event.target.value)}
          className="font-mono"
        />
        {optional && value && (
          <Button type="button" variant="ghost" size="icon" disabled={disabled} onClick={() => onChange("")} aria-label={`Clear ${label}`}>
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

interface AssetFieldProps {
  label: string;
  kind: SetupAssetKind;
  value: string;
  onChange: (value: string) => void;
  onUpload: (kind: SetupAssetKind, file: File) => Promise<string | null>;
  disabled?: boolean;
}

function AssetField({ label, kind, value, onChange, onUpload, disabled = false }: AssetFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFile = async (file?: File) => {
    if (!file) return;
    setUploading(true);
    const url = await onUpload(kind, file);
    if (url) onChange(url);
    setUploading(false);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <div className="flex items-center gap-3 rounded-lg border bg-muted/20 p-2">
        <div className="relative h-12 w-20 shrink-0 overflow-hidden rounded-md border bg-background">
          {value ? (
            <Image src={value} alt={label} fill sizes="80px" className="object-contain" />
          ) : (
            <span className="flex h-full items-center justify-center text-[10px] text-muted-foreground">None</span>
          )}
        </div>
        <div className="flex flex-1 flex-wrap justify-end gap-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            className="hidden"
            onChange={(event) => void handleFile(event.target.files?.[0])}
          />
          <Button type="button" variant="outline" size="sm" disabled={disabled || uploading} onClick={() => inputRef.current?.click()}>
            {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
            Upload
          </Button>
          {value && (
            <Button type="button" variant="ghost" size="sm" disabled={disabled || uploading} onClick={() => onChange("")}>
              Remove
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export function SetupDesignPanel({
  program,
  onChange,
  branding,
  onBrandingChange,
  hasPremiumTemplates,
  onUpload,
  disabled = false,
}: SetupDesignPanelProps) {
  const [category, setCategory] = useState<Category>("All");
  const presets = TEMPLATE_PRESETS.filter((preset) => category === "All" || preset.style === category);

  const applyPreset = (preset: TemplatePreset) => {
    if (!FREE_TEMPLATE_IDS.includes(preset.id) && !hasPremiumTemplates) return;
    onChange({ template_id: preset.id, ...preset.defaults });
  };

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <h3 className="font-semibold text-foreground">Card template</h3>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((entry) => (
            <Button
              key={entry}
              type="button"
              size="sm"
              variant={category === entry ? "default" : "outline"}
              onClick={() => setCategory(entry)}
            >
              {entry}
            </Button>
          ))}
        </div>
        <div className="grid max-h-80 grid-cols-1 gap-2 overflow-y-auto pr-1 sm:grid-cols-2 xl:grid-cols-3">
          {presets.map((preset) => {
            const locked = !FREE_TEMPLATE_IDS.includes(preset.id) && !hasPremiumTemplates;
            const selected = program.template_id === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                disabled={disabled || locked}
                onClick={() => applyPreset(preset)}
                className={cn(
                  "flex items-center gap-3 rounded-lg border p-2 text-left text-sm transition-colors hover:border-primary",
                  selected && "border-primary bg-primary/5 ring-2 ring-primary/20",
                  locked && "cursor-not-allowed opacity-50 hover:border-border"
                )}
              >
                <span
                  className="h-8 w-8 shrink-0 rounded-md border"
                  style={{ background: `linear-gradient(135deg, ${preset.defaults.bg_color} 55%, ${preset.defaults.primary_color} 55%)` }}
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{preset.name}</span>
                  <span className="block truncate text-xs text-muted-foreground">{locked ? "Premium plan required" : preset.style}</span>
                </span>
                {locked && <Lock className="h-4 w-4 shrink-0 text-muted-foreground" />}
              </button>
            );
          })}
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="font-semibold text-foreground">Card colors</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <ColorField id="setup-bg-color" label="Background" value={program.bg_color} disabled={disabled} onChange={(value) => onChange({ bg_color: value })} />
          <ColorField id="setup-text-color" label="Text" value={program.text_color} disabled={disabled} onChange={(value) => onChange({ text_color: value })} />
          <ColorField id="setup-primary-color" label="Primary" value={program.primary_color} disabled={disabled} onChange={(value) => onChange({ primary_color: value })} />
          <ColorField id="setup-secondary-color" label="Secondary" value={program.secondary_color} optional disabled={disabled} onChange={(value) => onChange({ secondary_color: value })} />
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="font-semibold text-foreground">Icons</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Stamp icon</Label>
            <IconPicker value={program.stamp_icon} label="Stamp icon" onChange={(value) => onChange({ stamp_icon: value })} />
          </div>
          <div className="space-y-1.5">
            <Label>Reward icon</Label>
            <IconPicker value={program.reward_icon} label="Reward icon" onChange={(value) => onChange({ reward_icon: value })} />
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="font-semibold text-foreground">Card images</h3>
        <AssetField label="Card logo" kind="card_logo" value={program.card_logo_url} disabled={disabled} onUpload={onUpload} onChange={(value) => onChange({ card_logo_url: value })} />
        <AssetField label="Card banner" kind="card_banner" value={program.card_banner_url} disabled={disabled} onUpload={onUpload} onChange={(value) => onChange({ card_banner_url: value })} />
      </section>

      <section className="space-y-3">
        <h3 className="font-semibold text-foreground">Business branding</h3>
        <AssetField label="Business logo" kind="business_logo" value={branding.logo} disabled={disabled} onUpload={onUpload} onChange={(value) => onBrandingChange({ logo: value })} />
        <div className="grid gap-4 sm:grid-cols-2">
          <ColorField id="setup-brand-primary" label="Brand primary" value={branding.primary_color} optional disabled={disabled} onChange={(value) => onBrandingChange({ primary_color: value })} />
          <ColorField id="setup-brand-secondary" label="Brand secondary" value={branding.secondary_color} optional disabled={disabled} onChange={(value) => onBrandingChange({ secondary_color: value })} />
        </div>
      </section>
    </div>
  );
}